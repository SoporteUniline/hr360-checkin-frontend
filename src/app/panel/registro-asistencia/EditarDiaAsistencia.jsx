"use client";

// El reloj del día (RelojDiaDialog) para una persona y una fecha, abierto desde otra pantalla (Nómina).
// Busca la asistencia de ese día y abre la misma ventana con la que se corrige en Asistencias y el Monitor: el día solo
// se corrige en el reloj. `onCerrar(huboCambios)` dice si se guardó algo para que la pantalla que la abrió recalcule.
import { useMemo, useRef } from "react";
import useSWR from "swr";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetcherWithToken } from "@/lib/fetcher";
import RelojDiaDialog from "./RelojDiaDialog";

export default function EditarDiaAsistencia({ idEmpresa, idEmpleado, nombre, fecha, onCerrar }) {
  const params = new URLSearchParams({ empresa: String(idEmpresa), page: "1", limit: "50", fechaInicio: fecha, fechaFin: fecha, filtroEmpleado: nombre ?? "" });
  const { data, error, isLoading } = useSWR(idEmpresa && fecha ? `/checador/asistencias?${params}` : null, fetcherWithToken, { revalidateOnFocus: false });
  const registro = useMemo(
    () => (Array.isArray(data?.registros) ? data.registros : []).find((r) => Number(r.id_empleado) === Number(idEmpleado) && String(r.fecha ?? "").slice(0, 10) === fecha) ?? null,
    [data, idEmpleado, fecha],
  );
  const cambio = useRef(false);

  if (!registro) {
    const fechaMx = String(fecha).split("-").reverse().join("/");
    const mensaje = error ? "No se pudo cargar la asistencia de ese día." : isLoading || !data ? "Cargando la asistencia…" : "Ese día no tiene registro en Asistencias para esta persona.";
    return (
      <Dialog open onOpenChange={(v) => !v && onCerrar(cambio.current)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{nombre}</DialogTitle>
            <DialogDescription>{fechaMx}</DialogDescription>
          </DialogHeader>
          <p role={error ? "alert" : "status"} className="text-sm text-slate-600">{mensaje}</p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <RelojDiaDialog registro={registro} onCerrar={() => onCerrar(cambio.current)}
      onGuardado={() => { cambio.current = true; }} />
  );
}
