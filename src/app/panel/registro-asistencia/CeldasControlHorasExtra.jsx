"use client";

// Celdas extra de «Control de horas extra»: quién decidió, acumulado de la semana contra el
// tope al doble (LFT) y alertas del día. Lógica en lib/asistencia/controlHorasExtra.mjs.
import { TableCell } from "@/components/ui/table";
import { formatearMinutos } from "@/lib/asistencia/jornada.mjs";
import { quienCuando } from "@/lib/asistencia/historial.mjs";
import { alertasDia, quienDecidio, semanaExtra } from "@/lib/asistencia/controlHorasExtra.mjs";

export default function CeldasControlHorasExtra({ registro, control, zona }) {
  const decidio = quienDecidio(registro, zona);
  const semana = semanaExtra(registro, control.resumen, control.tope);
  const alertas = alertasDia(registro, control.resumen, { zona, tope: control.tope });
  const pct = control.tope ? Math.min(100, (semana.acumulado / control.tope) * 100) : 0;
  const cuando = registro.ultimo_cambio ? quienCuando(registro.ultimo_cambio) : null;
  return (
    <>
      <TableCell className="text-xs text-slate-600">
        {decidio.estado === "pendiente" ? (
          <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700">Pendiente</span>
        ) : (
          // Primero quien decidió las horas extra; el último cambio del registro puede ser de
          // otra persona (p. ej. editó una nota) y solo se usa si no se sabe quién decidió.
          <span className="font-semibold text-slate-800">{decidio.nombre || cuando || "—"}</span>
        )}
      </TableCell>
      <TableCell>
        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200" aria-hidden>
          <i className={`block h-full rounded-full ${semana.triples ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="mt-0.5 block text-[11px] text-slate-500">
          {formatearMinutos(semana.acumulado)} de {formatearMinutos(semana.tope)}
        </span>
      </TableCell>
      <TableCell className="min-w-[190px] !whitespace-normal text-[11px] leading-snug">
        {alertas.length ? (
          <div className="flex flex-col gap-0.5">
            {alertas.map((a) => <span key={a} className="font-semibold text-red-700">⚠ {a}</span>)}
          </div>
        ) : <span className="text-slate-300">—</span>}
      </TableCell>
    </>
  );
}
