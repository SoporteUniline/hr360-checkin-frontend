"use client";

// Nómina → Préstamos (R2). RH o el dueño aprueba lo que piden los empleados (D-9), registra préstamos y abonos en
// efectivo. El descuento sale solo en cada nómina cuando la persona ya firmó su acuerdo. Clic en el renglón → su detalle.
// (27/11/2026) «Registrar préstamo» abre su página (/panel/nomina/prestamos/nuevo), ya no una ventana.
import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Plus } from "lucide-react";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Chip, Kpi, SelectorEmpresa, useEmpresaNomina } from "@/components/nomina/comun";
import { ModuloNomina, Tabla, FilaEnlace, celda, Cargando, ErrorCarga, Vacio } from "@/components/nomina/ModuloNomina";
import { NombreEmpleado } from "@/components/empleado/FichaEmpleado";
import { PRESTAMO, avancePrestamo, dinero } from "@/lib/nomina/nomina.mjs";

const get = (url) => axios.get(url).then((r) => r.data);
const FILTROS = [["", "Todos"], ["solicitado", "Por aprobar"], ["por_firmar", "Por firmar"], ["vigente", "Vigentes"], ["liquidado", "Pagados"]];

export default function PrestamosPage() {
  const empresa = useEmpresaNomina();
  const [filtro, setFiltro] = useState("");
  const { data, error, isLoading } = useSWR(empresa.idEmpresa ? `/checador/nomina/prestamos?empresa=${empresa.idEmpresa}` : null, get);
  const todos = useMemo(() => data?.prestamos ?? [], [data]);
  const lista = filtro ? todos.filter((p) => p.estado === filtro) : todos;
  const cuenta = (e) => todos.filter((p) => p.estado === e).length;
  const porCobrar = todos.filter((p) => ["vigente", "por_firmar"].includes(p.estado)).reduce((t, p) => t + Number(p.saldo), 0);

  return (
    <ModuloNomina acciones={<><SelectorEmpresa {...empresa} />{empresa.idEmpresa
        ? <Button asChild className="min-h-12 text-base"><Link href={`/panel/nomina/prestamos/nuevo?empresa=${empresa.idEmpresa}`}><Plus className="size-4" /> Registrar préstamo</Link></Button>
        : <Button disabled className="min-h-12 text-base"><Plus className="size-4" /> Registrar préstamo</Button>}</>}>
      {error ? <ErrorCarga error={error} texto="No se pudieron cargar los préstamos." /> : isLoading || !empresa.idEmpresa ? <Cargando /> : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi titulo="Por aprobar" valor={cuenta("solicitado")} nota="Pedidos desde Mi espacio" clase={cuenta("solicitado") ? "text-amber-700" : "text-gray-900"} />
            <Kpi titulo="Por firmar" valor={cuenta("por_firmar")} nota="Aún no se descuentan" />
            <Kpi titulo="Vigentes" valor={cuenta("vigente")} />
            <Kpi titulo="Por cobrar" valor={dinero(porCobrar)} clase="text-brand" />
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por estado">
            {FILTROS.map(([v, t]) => (
              <button key={v || "todos"} type="button" aria-pressed={filtro === v} onClick={() => setFiltro(v)} className={`rounded-full border px-3 py-1.5 text-[12.5px] font-semibold ${filtro === v ? "border-brand bg-brand text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>
                {t}{v ? ` (${cuenta(v)})` : ""}
              </button>
            ))}
          </div>
          {lista.length === 0 ? (
            <Vacio titulo={filtro ? "No hay préstamos en este estado." : "Aún no hay préstamos."} texto="Las personas pueden pedirlos desde Mi espacio, o regístralos tú." />
          ) : (
            <Tabla minimo={780} columnas={[{ titulo: "Persona" }, { titulo: "Prestado" }, { titulo: "Abono por nómina" }, { titulo: "Saldo" }, { titulo: "Avance" }, { titulo: "Estado" }]}>
              {lista.map((p) => {
                const e = PRESTAMO[p.estado] ?? PRESTAMO.solicitado;
                const av = avancePrestamo(p);
                const href = `/panel/nomina/prestamos/${p.id}`;
                return (
                  <FilaEnlace key={p.id} href={href} etiqueta={`Préstamo de ${p.empleado}`}>
                    <td className={celda}>
                      <span className="font-semibold text-[#080d36]"><NombreEmpleado id={p.id_empleado}>{p.empleado}</NombreEmpleado></span>
                      <p className="text-[11.5px] text-slate-500">P-{p.id}{p.motivo ? ` · ${p.motivo}` : ""}</p>
                    </td>
                    <td className={celda}>{dinero(p.monto)}</td>
                    <td className={celda}>{dinero(p.abono)}</td>
                    <td className={`${celda} font-semibold`}>{dinero(p.saldo)}</td>
                    <td className={celda}>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-brand" style={{ width: `${av.porcentaje}%` }} /></div>
                        <span className="text-[11.5px] text-slate-500">{av.porcentaje} %</span>
                      </div>
                    </td>
                    <td className={celda}><Chip tono={e.tono}>{e.texto}</Chip></td>
                  </FilaEnlace>
                );
              })}
            </Tabla>
          )}
        </>
      )}
    </ModuloNomina>
  );
}
