"use client";

// Monitor › Línea del día (maqueta aprobada Monitor.dc.html, vista «Línea del día»): una fila por persona con su barra
// sobre el eje de horas: lo programado tenue y lo real encima (trabajo, comida, se pasó, hora extra) y la línea de
// «ahora». Eje, tramos y posiciones en src/lib/asistencia/vistasMonitor.mjs; las filas llegan en el orden de urgencia
// (ordenUrgencia). Celular: el eje se desplaza a lo ancho dentro de su caja con avatar y nombre fijos; la página no desborda.
import { useEffect, useMemo, useRef } from "react";
import { NombreEmpleado } from "@/components/empleado/FichaEmpleado";
import { horaDe } from "@/lib/asistencia/hoy.mjs";
import { ejeLineaDia, estadoVista, lineaDia, posicionEnEje } from "@/lib/asistencia/vistasMonitor.mjs";
import { cn } from "@/lib/utils";
import { areaDe, Avatar, ChipEstado, nombreDe } from "./comunes";

const TRAMO = {
  azul: "bg-brand",
  gris: "bg-slate-400",
  violeta: "bg-violet-600",
  ambar: "bg-amber-400",
  rojo: "bg-red-600",
};
const SIN_SALIDA = "bg-[repeating-linear-gradient(135deg,#f87171_0_4px,#fecaca_4px_8px)]";
const LEYENDA = [
  ["Su horario", "bg-slate-200"],
  ["Trabajando", TRAMO.azul],
  ["Ya salió", TRAMO.gris],
  ["Comida", TRAMO.ambar],
  ["Se pasó de comida", TRAMO.rojo],
  ["Hora extra", TRAMO.violeta],
  ["Extra autorizada", "bg-violet-200"],
  ["Sin checar salida", SIN_SALIDA],
];
const ESTADO_TEXTO = {
  azul: "text-blue-700",
  violeta: "text-violet-700",
  amarillo: "text-yellow-800",
  rojo: "text-red-700",
  gris: "text-slate-500",
};
// Columnas: nombre fijo | eje | estado (en celular el estado va bajo el nombre).
const FILA = "grid grid-cols-[var(--nom)_minmax(0,1fr)] lg:grid-cols-[var(--nom)_minmax(0,1fr)_150px]";
const ancho = (a) => `max(${a}%, 3px)`;
// Marcas de hora que se enciman con la etiqueta de «ahora»: el eje tiene ~30 px/h en escritorio y 52 px/h en celular.
const cercaDeAhora = (abs, ahora) => {
  const d = ahora == null ? Infinity : Math.abs(abs - ahora);
  return d < 50 ? "invisible" : d < 80 ? "lg:invisible" : null;
};

function Fila({ r, eje, onAbrirDia }) {
  const reg = r.dia.registro;
  const nombre = nombreDe(reg);
  const estado = estadoVista(r);
  const l = lineaDia(r, eje);
  return (
    <li data-persona={nombre} data-estado={r.estado} className={cn(FILA, "group relative min-h-12 items-center border-t border-slate-100")}>
      {/* Fijo a la izquierda; deja pasar el toque al botón de la fila salvo en el nombre (abre la ficha). */}
      <div className="pointer-events-none sticky left-0 z-10 flex min-w-0 items-center gap-2 self-stretch bg-white px-3 py-1.5 group-hover:bg-slate-50">
        <Avatar registro={reg} tono={estado.tono} className="size-6 text-[10px] lg:size-7 lg:text-[11px]" />
        <span className="flex min-w-0 flex-col">
          <b data-nombre className="truncate text-[13px] font-semibold leading-tight text-slate-900">
            <span className="pointer-events-auto relative">
              <NombreEmpleado id={reg.id_empleado}>{nombre}</NombreEmpleado>
            </span>
          </b>
          <span className={cn("truncate text-[11.5px] leading-tight lg:hidden", ESTADO_TEXTO[estado.tono] ?? "text-slate-500")}>
            {estado.texto}
          </span>
          {areaDe(reg) ? <span className="hidden truncate text-[11.5px] leading-tight text-slate-500 lg:block">{areaDe(reg)}</span> : null}
        </span>
      </div>
      <div data-eje className="relative mx-2 h-5 rounded-md bg-slate-50">
        {eje.horas.map((h) => (
          <span key={h.abs} aria-hidden="true" className="absolute inset-y-0 w-px bg-slate-200/70" style={{ left: `${h.pos}%` }} />
        ))}
        {l.programada ? (
          <span
            data-programada
            title={`Horario ${horaDe(l.programada.desde)}–${horaDe(l.programada.hasta)}`}
            className="absolute inset-y-[6px] rounded bg-slate-200"
            style={{ left: `${l.programada.izq}%`, width: ancho(l.programada.ancho) }}
          />
        ) : null}
        {l.extraAutorizada ? (
          <span
            data-extra-autorizada
            title={`Extra autorizada hasta ${horaDe(l.extraAutorizada.hasta)}`}
            className="absolute inset-y-[6px] rounded bg-violet-200"
            style={{ left: `${l.extraAutorizada.izq}%`, width: ancho(l.extraAutorizada.ancho) }}
          />
        ) : null}
        {l.tramos.map((t, i) => (
          <span
            key={i}
            data-tramo={t.tipo}
            title={t.titulo}
            className={cn("absolute inset-y-[3px] rounded", t.tipo === "sin_salida" ? SIN_SALIDA : TRAMO[t.tono])}
            style={{ left: `${t.izq}%`, width: ancho(t.ancho) }}
          />
        ))}
        {l.ahora != null ? (
          <span
            data-ahora
            aria-hidden="true"
            className="absolute -inset-y-1 z-[1] w-0.5 -translate-x-1/2 bg-red-500"
            style={{ left: `${l.ahora}%` }}
          />
        ) : null}
      </div>
      <div className="hidden min-w-0 pr-3 lg:block">
        <ChipEstado estado={estado} />
      </div>
      <button
        type="button"
        onClick={() => onAbrirDia?.(reg)}
        aria-label={`Ver día de ${nombre} · ${estado.texto}`}
        className="absolute inset-0 z-[5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
      />
    </li>
  );
}

// `personas`: ya filtradas y en orden; `todos`: el día completo (el eje no brinca al filtrar).
export default function LineaDia({ personas, todos, onAbrirDia }) {
  const ahora = todos[0]?.ahora ?? null;
  const eje = useMemo(() => ejeLineaDia(todos, ahora), [todos, ahora]);
  const posAhora = posicionEnEje(ahora, eje);
  // Si el eje no cabe (celular, o un turno nocturno de ayer alarga el día), se abre con «ahora» a la vista (a 2/3 del
  // ancho, para ver lo que acaba de pasar). Solo al abrir o si cambia el día: no pelea con el desplazamiento de la persona.
  const caja = useRef(null);
  const marcaAhora = useRef(null);
  const desde = eje?.desde;
  const hasta = eje?.hasta;
  useEffect(() => {
    const el = caja.current;
    const marca = marcaAhora.current;
    if (!el || !marca || el.scrollWidth <= el.clientWidth) return;
    const x = marca.getBoundingClientRect().left - el.getBoundingClientRect().left + el.scrollLeft;
    el.scrollLeft = Math.max(0, x - el.clientWidth * (2 / 3));
  }, [desde, hasta]);
  if (!eje) return null;
  const horas = Math.round((eje.hasta - eje.desde) / 60);
  return (
    <div role="region" aria-label="Línea del día" className="min-w-0 rounded-[14px] border border-slate-200 bg-white">
      <div ref={caja} data-eje-scroll className="overflow-x-auto overscroll-x-contain rounded-t-[14px]">
        <div
          style={{ "--horas": horas }}
          className="min-w-[calc(140px_+_var(--horas)*52px)] pb-1 [--nom:140px] lg:min-w-[calc(370px_+_var(--horas)*28px)] lg:[--nom:220px]"
        >
          <div aria-hidden="true" className={cn(FILA, "pt-2 text-[11px] text-slate-500")}>
            <span className="sticky left-0 z-10 bg-white px-3 font-semibold text-slate-600">Persona</span>
            <span data-horas className="relative mx-2 h-5">
              {eje.horas.map((h) => (
                <span
                  key={h.abs}
                  style={{ left: `${h.pos}%` }}
                  className={cn("absolute top-0 -translate-x-1/2 whitespace-nowrap tabular-nums", cercaDeAhora(h.abs, ahora))}
                >
                  {h.texto}
                </span>
              ))}
              {posAhora != null ? (
                <span
                  ref={marcaAhora}
                  data-ahora-eje
                  className="absolute -top-0.5 z-[1] -translate-x-1/2 whitespace-nowrap rounded bg-red-500 px-1 text-[10.5px] font-semibold leading-4 text-white"
                  style={{ left: `${posAhora}%` }}
                >
                  {horaDe(ahora)}
                </span>
              ) : null}
            </span>
          </div>
          <ul>
            {personas.map((r) => (
              <Fila key={r.dia.id} r={r} eje={eje} onAbrirDia={onAbrirDia} />
            ))}
          </ul>
        </div>
      </div>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 px-3 py-2 text-[11.5px] text-slate-600">
        {LEYENDA.map(([texto, clase]) => (
          <span key={texto} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className={cn("h-2 w-3.5 rounded-sm", clase)} />
            {texto}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-3 w-0.5 bg-red-500" />
          Ahora
        </span>
      </p>
    </div>
  );
}
