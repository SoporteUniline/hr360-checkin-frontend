"use client";

// Nómina sin timbrado R1: lista de periodos y alta de una nómina nueva. Backend: /checador/nomina
// (hr360-checkin-backend/docs/nomina-r1.md). RH calcula y envía; el dueño autoriza.
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import { Plus, Settings2, Wallet } from "lucide-react";
import axios from "@/lib/axios";
import EncabezadoPagina from "@/components/tabla/EncabezadoPagina";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Chip, SelectorEmpresa, mensajeError, useEmpresaNomina } from "@/components/nomina/comun";
import { ESTADOS, PERIODICIDADES, dinero, fechaCorta, periodoSugerido } from "@/lib/nomina/nomina.mjs";

const get = (url) => axios.get(url).then((r) => r.data);
const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());

export default function NominaPage() {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const empresa = useEmpresaNomina();
  const { data, error, isLoading } = useSWR(empresa.idEmpresa ? `/checador/nomina/periodos?empresa=${empresa.idEmpresa}` : null, get);
  const [nuevo, setNuevo] = useState(null);
  const [creando, setCreando] = useState(false);
  const periodos = data?.periodos ?? [];

  const abrirNuevo = () => setNuevo({ periodicidad: "Semanal", ...periodoSugerido("Semanal", hoy()) });
  const crear = async (e) => {
    e.preventDefault();
    setCreando(true);
    try {
      const r = await axios.post("/checador/nomina/periodos", { id_empresa: empresa.idEmpresa, periodicidad: nuevo.periodicidad, fecha_inicio: nuevo.inicio, fecha_fin: nuevo.fin });
      router.push(`/panel/nomina/${r.data.id}`);
    } catch (err) {
      enqueueSnackbar(mensajeError(err, "No se pudo crear la nómina."), { variant: "error" });
      setCreando(false);
    }
  };

  return (
    <div className="space-y-5 p-1">
      <EncabezadoPagina
        icono={Wallet}
        titulo="Nómina"
        subtitulo="Calcula, revisa y autoriza el pago de tu equipo. Recibos sin timbrar."
        acciones={
          <>
            <SelectorEmpresa {...empresa} />
            <Button variant="outline" size="sm" asChild><Link href="/panel/nomina/ajustes"><Settings2 className="size-4" /> Bonos y descuentos</Link></Button>
            <Button size="sm" onClick={abrirNuevo} disabled={!empresa.idEmpresa}><Plus className="size-4" /> Nueva nómina</Button>
          </>
        }
      />

      {error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{mensajeError(error, "No se pudieron cargar las nóminas.")}</p>
      ) : isLoading || !empresa.idEmpresa ? (
        <p className="text-sm text-gray-500">Cargando…</p>
      ) : periodos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center">
          <p className="font-semibold text-gray-900">Aún no hay nóminas.</p>
          <p className="mt-1 text-sm text-gray-500">Crea la primera: ADAMIA calcula días, horas extra, bonos y descuentos con la asistencia y tú revisas antes de autorizar.</p>
          <Button className="mt-4" onClick={abrirNuevo}><Plus className="size-4" /> Nueva nómina</Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full min-w-[760px] text-[13px] tabular-nums">
            <thead>
              <tr className="bg-gray-50 text-left text-[10.5px] uppercase tracking-wide text-gray-500">
                {["Periodo", "Pago", "Estado", "Personas", "Neto", "Transferencias", "Efectivo", ""].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {periodos.map((p) => {
                const e = ESTADOS[p.estado] ?? ESTADOS.borrador;
                return (
                  <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2.5 font-semibold text-gray-900">{fechaCorta(p.fecha_inicio)} – {fechaCorta(p.fecha_fin)}</td>
                    <td className="px-3 py-2.5">{p.periodicidad}</td>
                    <td className="px-3 py-2.5"><Chip tono={e.tono}>{e.texto}</Chip></td>
                    <td className="px-3 py-2.5">{p.empleados}</td>
                    <td className="px-3 py-2.5 font-semibold">{dinero(p.total_neto)}</td>
                    <td className="px-3 py-2.5">{dinero(p.total_transferencia)}</td>
                    <td className="px-3 py-2.5">{dinero(p.total_efectivo)}</td>
                    <td className="px-3 py-2.5 text-right"><Link className="font-semibold text-[#2c56e8] hover:underline" href={`/panel/nomina/${p.id}`}>Abrir</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={Boolean(nuevo)} onOpenChange={(v) => !v && setNuevo(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nueva nómina</DialogTitle></DialogHeader>
          {nuevo ? (
            <form onSubmit={crear} className="grid gap-4">
              <label className="grid gap-1.5 text-sm font-medium">
                Periodicidad
                <select className="h-10 rounded-lg border border-gray-300 px-2" value={nuevo.periodicidad} onChange={(e) => setNuevo({ periodicidad: e.target.value, ...periodoSugerido(e.target.value, hoy()) })}>
                  {PERIODICIDADES.map((p) => <option key={p}>{p}</option>)}
                </select>
                <span className="text-xs font-normal text-gray-500">Entran las personas con este periodo de pago en su ficha.</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1.5 text-sm font-medium">Del<input type="date" required className="h-10 rounded-lg border border-gray-300 px-2" value={nuevo.inicio} onChange={(e) => setNuevo({ ...nuevo, inicio: e.target.value })} /></label>
                <label className="grid gap-1.5 text-sm font-medium">Al<input type="date" required className="h-10 rounded-lg border border-gray-300 px-2" value={nuevo.fin} min={nuevo.inicio} onChange={(e) => setNuevo({ ...nuevo, fin: e.target.value })} /></label>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setNuevo(null)}>Cancelar</Button>
                <Button type="submit" disabled={creando}>{creando ? "Calculando…" : "Crear y calcular"}</Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
