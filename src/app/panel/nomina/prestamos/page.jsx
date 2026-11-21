"use client";

// Nómina → Préstamos (R2). RH o el dueño aprueba lo que piden los empleados (D-9), registra préstamos y abonos en
// efectivo. El descuento sale solo en cada nómina cuando la persona ya firmó su acuerdo. Backend: /checador/nomina/prestamos.
import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import { ArrowLeft, HandCoins, Plus } from "lucide-react";
import axios from "@/lib/axios";
import EncabezadoPagina from "@/components/tabla/EncabezadoPagina";
import { Button } from "@/components/ui/button";
import { Chip, Kpi, SelectorEmpresa, mensajeError, useEmpresaNomina } from "@/components/nomina/comun";
import RegistrarPrestamo from "@/components/nomina/RegistrarPrestamo";
import DetallePrestamo from "@/components/nomina/DetallePrestamo";
import { PRESTAMO, avancePrestamo, dinero } from "@/lib/nomina/nomina.mjs";

const get = (url) => axios.get(url).then((r) => r.data);
const FILTROS = [["", "Todos"], ["solicitado", "Por aprobar"], ["por_firmar", "Por firmar"], ["vigente", "Vigentes"], ["liquidado", "Pagados"]];

export default function PrestamosPage() {
  const { enqueueSnackbar } = useSnackbar();
  const empresa = useEmpresaNomina();
  const [filtro, setFiltro] = useState("");
  const [registrar, setRegistrar] = useState(false);
  const [detalle, setDetalle] = useState(null);
  const { data, error, isLoading, mutate } = useSWR(empresa.idEmpresa ? `/checador/nomina/prestamos?empresa=${empresa.idEmpresa}` : null, get);
  const todos = useMemo(() => data?.prestamos ?? [], [data]);
  const lista = filtro ? todos.filter((p) => p.estado === filtro) : todos;
  const cuenta = (e) => todos.filter((p) => p.estado === e).length;
  const porCobrar = todos.filter((p) => ["vigente", "por_firmar"].includes(p.estado)).reduce((t, p) => t + Number(p.saldo), 0);

  return (
    <div className="space-y-5 p-1">
      <EncabezadoPagina
        icono={HandCoins}
        titulo="Préstamos"
        subtitulo="Sin intereses. Se descuentan en la nómina cuando la persona firma su acuerdo."
        acciones={
          <>
            <SelectorEmpresa {...empresa} />
            <Button variant="outline" size="sm" asChild><Link href="/panel/nomina"><ArrowLeft className="size-4" /> Nómina</Link></Button>
            <Button size="sm" onClick={() => setRegistrar(true)} disabled={!empresa.idEmpresa}><Plus className="size-4" /> Registrar préstamo</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi titulo="Por aprobar" valor={cuenta("solicitado")} nota="Pedidos desde Mi espacio" clase={cuenta("solicitado") ? "text-amber-700" : "text-gray-900"} />
        <Kpi titulo="Por firmar" valor={cuenta("por_firmar")} nota="Aún no se descuentan" />
        <Kpi titulo="Vigentes" valor={cuenta("vigente")} />
        <Kpi titulo="Por cobrar" valor={dinero(porCobrar)} clase="text-[#2c56e8]" />
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por estado">
        {FILTROS.map(([v, t]) => (
          <button key={v || "todos"} type="button" aria-pressed={filtro === v} onClick={() => setFiltro(v)} className={`rounded-full border px-3 py-1 text-[12.5px] font-semibold ${filtro === v ? "border-[#2c56e8] bg-[#2c56e8] text-white" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}`}>
            {t}{v ? ` (${cuenta(v)})` : ""}
          </button>
        ))}
      </div>

      {error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{mensajeError(error, "No se pudieron cargar los préstamos.")}</p>
      ) : isLoading || !empresa.idEmpresa ? (
        <p className="text-sm text-gray-500">Cargando…</p>
      ) : lista.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center">
          <p className="font-semibold text-gray-900">{filtro ? "No hay préstamos en este estado." : "Aún no hay préstamos."}</p>
          <p className="mt-1 text-sm text-gray-500">Las personas pueden pedirlos desde Mi espacio, o regístralos tú.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full min-w-[820px] text-[13px] tabular-nums">
            <thead>
              <tr className="bg-gray-50 text-left text-[10.5px] uppercase tracking-wide text-gray-500">
                {["Persona", "Prestado", "Abono por nómina", "Saldo", "Avance", "Estado", ""].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => {
                const e = PRESTAMO[p.estado] ?? PRESTAMO.solicitado;
                const av = avancePrestamo(p);
                return (
                  <tr key={p.id} className="cursor-pointer border-t border-gray-100 hover:bg-gray-50" onClick={() => setDetalle(p.id)}>
                    <td className="px-3 py-2.5">
                      <button type="button" className="text-left font-semibold text-gray-900 hover:underline" onClick={(ev) => { ev.stopPropagation(); setDetalle(p.id); }}>{p.empleado}</button>
                      <p className="text-[11.5px] text-gray-500">P-{p.id}{p.motivo ? ` · ${p.motivo}` : ""}</p>
                    </td>
                    <td className="px-3 py-2.5">{dinero(p.monto)}</td>
                    <td className="px-3 py-2.5">{dinero(p.abono)}</td>
                    <td className="px-3 py-2.5 font-semibold">{dinero(p.saldo)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100"><div className="h-full bg-[#2c56e8]" style={{ width: `${av.porcentaje}%` }} /></div>
                        <span className="text-[11.5px] text-gray-500">{av.porcentaje} %</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5"><Chip tono={e.tono}>{e.texto}</Chip></td>
                    <td className="px-3 py-2.5 text-right font-semibold text-[#2c56e8]">{p.estado === "solicitado" ? "Revisar" : "Ver"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <RegistrarPrestamo
        abierto={registrar}
        idEmpresa={empresa.idEmpresa}
        onCerrar={() => setRegistrar(false)}
        onListo={(r) => {
          setRegistrar(false);
          mutate();
          enqueueSnackbar(r.aviso_acuerdo ?? "Préstamo registrado. Se envió el acuerdo para que lo firme en Mi espacio.", { variant: r.aviso_acuerdo ? "warning" : "success" });
          setDetalle(r.id);
        }}
      />
      <DetallePrestamo id={detalle} onCerrar={() => setDetalle(null)} onCambio={() => mutate()} />
    </div>
  );
}
