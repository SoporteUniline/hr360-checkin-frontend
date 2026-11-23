"use client";

// Nómina sin timbrado R1: lista de periodos y alta de una nómina nueva. Backend: /checador/nomina
// (hr360-checkin-backend/docs/nomina-r1.md). RH calcula y envía; el dueño autoriza.
import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import { Plus } from "lucide-react";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Chip, Kpi, SelectorEmpresa, mensajeError, useEmpresaNomina } from "@/components/nomina/comun";
import { ModuloNomina, Tabla, FilaEnlace, CeldaEnlace, celda, Cargando, ErrorCarga, Vacio } from "@/components/nomina/ModuloNomina";
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
    <ModuloNomina acciones={<><SelectorEmpresa {...empresa} /><Button onClick={abrirNuevo} disabled={!empresa.idEmpresa}><Plus className="size-4" /> Nueva nómina</Button></>}>
      {error ? (
        <ErrorCarga error={error} texto="No se pudieron cargar las nóminas." />
      ) : isLoading || !empresa.idEmpresa ? (
        <Cargando />
      ) : periodos.length === 0 ? (
        <Vacio titulo="Aún no hay nóminas." texto="Crea la primera: ADAMIA calcula días, horas extra, bonos y descuentos con la asistencia y tú revisas antes de autorizar.">
          <Button onClick={abrirNuevo}><Plus className="size-4" /> Nueva nómina</Button>
        </Vacio>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi titulo="Por autorizar" valor={periodos.filter((p) => p.estado === "por_autorizar").length} clase={periodos.some((p) => p.estado === "por_autorizar") ? "text-amber-700" : "text-gray-900"} />
            <Kpi titulo="En borrador" valor={periodos.filter((p) => p.estado === "borrador").length} />
            <Kpi titulo="Autorizadas" valor={periodos.filter((p) => p.estado === "autorizado").length} />
            <Kpi titulo="Última autorizada" valor={(() => { const u = periodos.find((p) => p.estado === "autorizado"); return u ? dinero(u.total_neto) : "—"; })()} clase="text-brand" />
          </div>
          <Tabla columnas={[{ titulo: "Periodo" }, { titulo: "Pago" }, { titulo: "Estado" }, { titulo: "Personas" }, { titulo: "Neto" }, { titulo: "Transferencias" }, { titulo: "Efectivo" }]}>
            {periodos.map((p) => {
              const e = ESTADOS[p.estado] ?? ESTADOS.borrador;
              const href = `/panel/nomina/${p.id}`;
              const periodo = `${fechaCorta(p.fecha_inicio)} – ${fechaCorta(p.fecha_fin)}`;
              return (
                <FilaEnlace key={p.id} href={href} etiqueta={`Nómina ${periodo}`}>
                  <CeldaEnlace href={href}>{periodo}</CeldaEnlace>
                  <td className={celda}>{p.periodicidad}</td>
                  <td className={celda}><Chip tono={e.tono}>{e.texto}</Chip></td>
                  <td className={celda}>{p.empleados}</td>
                  <td className={`${celda} font-semibold`}>{dinero(p.total_neto)}</td>
                  <td className={celda}>{dinero(p.total_transferencia)}</td>
                  <td className={celda}>{dinero(p.total_efectivo)}</td>
                </FilaEnlace>
              );
            })}
          </Tabla>
        </>
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
    </ModuloNomina>
  );
}
