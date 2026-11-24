"use client";

// Monitor › Lista (maqueta aprobada Monitor.dc.html, vista «Lista»): un renglón compacto por persona con nombre, área,
// horario, la línea y los chips del Tablero (fichaTablero) y su estado. En el orden de urgencia del Tablero.
// Celular: una tarjeta por persona (nombre y estado arriba; horario, línea y chips debajo), sin desbordes.
import { NombreEmpleado } from "@/components/empleado/FichaEmpleado";
import { fichaTablero } from "@/lib/asistencia/tablero.mjs";
import { estadoVista, horarioVista } from "@/lib/asistencia/vistasMonitor.mjs";
import { cn } from "@/lib/utils";
import { areaDe, Avatar, ChipEstado, Chips, chipsPersona, nombreDe } from "./comunes";

function Renglon({ r, debe, onAbrirDia }) {
  const reg = r.dia.registro;
  const nombre = nombreDe(reg);
  const f = fichaTablero(r);
  const estado = estadoVista(r);
  return (
    <li
      data-persona={nombre}
      data-estado={r.estado}
      className={cn(
        "relative grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 rounded-xl border border-slate-200 bg-white p-3",
        "hover:border-blue-200 lg:grid-cols-[230px_150px_minmax(0,1fr)_150px] lg:rounded-none lg:border-0 lg:border-t lg:border-slate-100",
        "lg:px-4 lg:py-2.5 lg:first:border-t-0 lg:hover:bg-slate-50"
      )}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <Avatar registro={reg} tono={f.tono} />
        <span className="flex min-w-0 flex-col">
          <b data-nombre className="truncate text-[13.5px] font-semibold leading-tight text-slate-900">
            <span className="relative z-10">
              <NombreEmpleado id={reg.id_empleado}>{nombre}</NombreEmpleado>
            </span>
          </b>
          {areaDe(reg) ? <span className="truncate text-[12px] text-slate-500">{areaDe(reg)}</span> : null}
        </span>
      </span>
      <span data-horario className="col-span-2 text-[12px] tabular-nums text-slate-500 lg:col-span-1 lg:text-[12.5px] lg:text-slate-600">
        {horarioVista(r)}
      </span>
      <span className="col-span-2 flex min-w-0 flex-col gap-1 lg:col-span-1 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-2">
        <span data-linea className="text-[12.5px] leading-snug text-slate-700">
          {f.linea}
        </span>
        <Chips chips={chipsPersona(f, debe)} />
      </span>
      <span className="col-start-2 row-start-1 justify-self-end lg:col-start-auto lg:row-start-auto lg:justify-self-start">
        <ChipEstado estado={estado} />
      </span>
      <button
        type="button"
        onClick={() => onAbrirDia?.(reg)}
        aria-label={`Ver día de ${nombre}`}
        className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand lg:rounded-none"
      />
    </li>
  );
}

export default function ListaHoy({ personas, cuentas, onAbrirDia }) {
  return (
    <ul
      role="list"
      aria-label="Lista de hoy"
      className="flex flex-col gap-2 lg:gap-0 lg:overflow-hidden lg:rounded-[14px] lg:border lg:border-slate-200 lg:bg-white"
    >
      {personas.map((r) => (
        <Renglon key={r.dia.id} r={r} onAbrirDia={onAbrirDia} debe={Number(cuentas[Number(r.dia.registro.id_empleado)]) || 0} />
      ))}
    </ul>
  );
}
