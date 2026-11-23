"use client";

// Rejilla de agenda tipo Google Calendar: columnas por día, filas de 30 min con la hora a la izquierda, hoy resaltado,
// línea roja de «ahora», citas como bloques de color (lado a lado si se empalman) y horarios libres como bloques claros
// «disponible · N lugares». La usan «Entrevistas» (semana / día) y el selector de horarios del chat («Agendar» / «Mover»).
// Arrastrar una cita a un horario libre (ratón, pluma o toque largo) llama `onMover(cita, horario)`; la alternativa por
// teclado es el botón «Reagendar» de la cita.
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { carriles, etiquetaEstadoCita, horaTexto, textoLugares } from "@/lib/whatsapp/agenda.mjs";
import {
  LEYENDA, MINUTOS_FILA, aceptaCita, lineaAhora, mesCalendario, moverMes, nombreDia, posicionBloque, sePuedeMover,
} from "@/lib/whatsapp/calendario.mjs";

// Ancho de pantalla con matchMedia (se pinta una sola versión: rejilla o lista).
export function useAncho(consulta = "(min-width: 768px)") {
  return useSyncExternalStore(
    (avisar) => {
      const m = window.matchMedia(consulta);
      m.addEventListener("change", avisar);
      return () => m.removeEventListener("change", avisar);
    },
    () => window.matchMedia(consulta).matches,
    () => true,
  );
}

export const COLOR_ESTADO = {
  azul: "border-blue-300 bg-blue-100 text-blue-950 hover:bg-blue-200 border-l-blue-600",
  verde: "border-emerald-300 bg-emerald-100 text-emerald-950 hover:bg-emerald-200 border-l-emerald-600",
  rojo: "border-red-300 bg-red-100 text-red-950 hover:bg-red-200 border-l-red-600",
  gris: "border-gray-300 bg-gray-50 text-gray-500 line-through hover:bg-gray-100 border-l-gray-400",
};
const PUNTO = { azul: "bg-blue-500", verde: "bg-emerald-500", rojo: "bg-red-500", gris: "bg-gray-400" };
const horaEtiqueta = (h) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "a.m." : "p.m."}`;

export function Leyenda({ conLibres = false }) {
  return (
    <ul aria-label="Colores de la agenda" className="grid gap-1.5 text-[12.5px] text-gray-700" data-leyenda>
      {LEYENDA.map((l) => (
        <li key={l.estado} className="flex items-center gap-2"><span aria-hidden="true" className={`size-2.5 rounded-full ${PUNTO[l.tono]}`} /> {l.texto}</li>
      ))}
      {conLibres ? <li className="flex items-center gap-2"><span aria-hidden="true" className="size-2.5 rounded-sm border border-dashed border-emerald-500 bg-emerald-50" /> Horario disponible</li> : null}
    </ul>
  );
}

// Minicalendario del mes para saltar a una fecha. `conCitas`: días con entrevistas (punto bajo el número).
export function MiniMes({ dia, hoy, onElegir, conCitas = new Set() }) {
  const [mes, setMes] = useState(() => moverMes(dia, 0));
  useEffect(() => { setMes(moverMes(dia, 0)); }, [dia]);
  const m = mesCalendario(mes);
  return (
    <div className="grid gap-2" data-mini-mes>
      <div className="flex items-center gap-1">
        <p className="min-w-0 flex-1 text-[13.5px] font-bold capitalize text-gray-900" aria-live="polite">{m.titulo}</p>
        <button type="button" onClick={() => setMes(moverMes(mes, -1))} aria-label="Mes anterior" className="grid size-9 place-items-center rounded-full text-gray-600 hover:bg-gray-100"><ChevronLeft className="size-4" /></button>
        <button type="button" onClick={() => setMes(moverMes(mes, 1))} aria-label="Mes siguiente" className="grid size-9 place-items-center rounded-full text-gray-600 hover:bg-gray-100"><ChevronRight className="size-4" /></button>
      </div>
      <div role="grid" aria-label={`Calendario de ${m.titulo}`} className="grid gap-0.5 text-center text-[12px]">
        <div role="row" className="grid grid-cols-7 text-[11px] font-semibold text-gray-500">
          {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => <span key={i} role="columnheader" aria-hidden="true">{d}</span>)}
        </div>
        {m.semanas.map((s) => (
          <div key={s[0].clave} role="row" className="grid grid-cols-7">
            {s.map((d) => {
              const elegido = d.clave === dia;
              return (
                <span key={d.clave} role="gridcell">
                  <button type="button" onClick={() => onElegir(d.clave)} aria-label={nombreDia(d.clave)} aria-pressed={elegido} aria-current={d.clave === hoy ? "date" : undefined}
                    data-mini-dia={d.clave}
                    className={`relative mx-auto grid size-8 place-items-center rounded-full tabular-nums ${elegido ? "bg-blue-600 font-bold text-white" : d.clave === hoy ? "font-bold text-blue-700 ring-1 ring-blue-300" : d.delMes ? "text-gray-800 hover:bg-gray-100" : "text-gray-400 hover:bg-gray-100"}`}>
                    {d.numero}
                    {conCitas.has(d.clave) && !elegido ? <span aria-hidden="true" className="absolute bottom-0.5 size-1 rounded-full bg-blue-500" /> : null}
                  </button>
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CalendarioAgenda({
  dias, hoy, ahora, citas = [], horarios = [], desde = 8, hasta = 19, altoHora = 80, marca = "data-calendario-semana", maxAlto = "calc(100dvh - 20rem)",
  onCita, onHorario, onMover, onDia, modoElegir = false, seleccionado = "", etiquetaGrupo = "Horarios",
}) {
  const nombre = useId();
  const horas = Array.from({ length: hasta - desde }, (_, i) => desde + i);
  const alto = horas.length * altoHora;
  const porDia = useMemo(() => {
    const m = new Map(dias.map((d) => [d.clave, { citas: [], horarios: [] }]));
    for (const c of citas) m.get(String(c.inicio).slice(0, 10))?.citas.push(c);
    for (const h of horarios) m.get(String(h.inicio).slice(0, 10))?.horarios.push(h);
    return m;
  }, [dias, citas, horarios]);
  const libresPorInicio = useMemo(() => new Map(horarios.map((h) => [String(h.inicio), h])), [horarios]);
  const caja = useRef(null);
  // Al abrir, la rejilla baja a la primera cita u horario (o a las 8) como Google Calendar.
  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const primero = [...citas, ...horarios].map((x) => posicionBloque(x.inicio, x.fin, desde, altoHora).top).sort((a, b) => a - b)[0];
    el.scrollTop = Math.max(0, (primero ?? 0) - altoHora / 2);
  }, [dias[0]?.clave, desde, horarios.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // ——— Arrastrar y soltar ———
  const [fantasma, setFantasma] = useState(null);
  const arrastre = useRef(null);
  const evitarClic = useRef(false);
  const horarioBajo = (x, y) => {
    const el = document.elementsFromPoint(x, y).find((n) => n.hasAttribute?.("data-horario-libre"));
    return el ? libresPorInicio.get(el.getAttribute("data-horario-libre")) ?? null : null;
  };
  useEffect(() => () => arrastre.current?.limpiar?.(), []);
  const empezar = (e, cita) => {
    if (!onMover || !sePuedeMover(cita) || (e.pointerType === "mouse" && e.button !== 0)) return;
    // Sin esto el navegador empieza a seleccionar texto y desplaza la rejilla mientras se arrastra.
    if (e.pointerType !== "touch") e.preventDefault();
    const a = { x: e.clientX, y: e.clientY, cita, activo: false, tipo: e.pointerType, reloj: null };
    const mover = (ev) => {
      if (!a.activo) {
        const lejos = Math.hypot(ev.clientX - a.x, ev.clientY - a.y);
        if (a.tipo === "touch") { if (lejos > 10) a.limpiar(); return; }
        if (lejos < 6) return;
        a.activo = true;
      }
      ev.preventDefault();
      const destino = horarioBajo(ev.clientX, ev.clientY);
      setFantasma({ cita, x: ev.clientX, y: ev.clientY, destino: destino?.inicio ?? null, valido: aceptaCita(destino, cita) });
    };
    const soltar = (ev) => {
      a.limpiar();
      if (!a.activo) return;
      evitarClic.current = true;
      setTimeout(() => { evitarClic.current = false; }, 50);
      setFantasma(null);
      const destino = horarioBajo(ev.clientX, ev.clientY);
      if (aceptaCita(destino, cita)) onMover(cita, destino);
    };
    const cancelar = () => { a.limpiar(); setFantasma(null); };
    a.limpiar = () => {
      clearTimeout(a.reloj);
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      window.removeEventListener("pointercancel", cancelar);
      arrastre.current = null;
    };
    // En pantallas táctiles se activa con un toque largo para no estorbar el desplazamiento.
    if (a.tipo === "touch") a.reloj = setTimeout(() => { a.activo = true; setFantasma({ cita, x: a.x, y: a.y, destino: null, valido: false }); }, 350);
    arrastre.current = a;
    window.addEventListener("pointermove", mover, { passive: false });
    window.addEventListener("pointerup", soltar);
    window.addEventListener("pointercancel", cancelar);
  };

  const columnas = { gridTemplateColumns: `3.5rem repeat(${dias.length}, minmax(0, 1fr))` };
  const props = { [marca]: true };
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white" {...props}>
      <div className="grid border-b border-gray-200 bg-white" style={columnas}>
        <span aria-hidden="true" />
        {dias.map((d) => {
          const esHoy = d.clave === hoy;
          const contenido = (
            <>
              <span className={`text-[11px] font-semibold uppercase ${esHoy ? "text-blue-700" : "text-gray-500"}`}>{d.corto}</span>
              <span className={`grid size-8 place-items-center rounded-full text-[17px] tabular-nums ${esHoy ? "bg-blue-600 font-bold text-white" : "text-gray-800"}`}>{d.numero}</span>
            </>
          );
          return (
            <div key={d.clave} className="flex justify-center border-l border-gray-200 py-1.5" data-encabezado-dia={d.clave}>
              {onDia ? (
                <button type="button" onClick={() => onDia(d.clave)} aria-label={`Ver el ${nombreDia(d.clave)}`} className="flex flex-col items-center rounded-lg px-2 hover:bg-gray-100">{contenido}</button>
              ) : <span className="flex flex-col items-center">{contenido}</span>}
            </div>
          );
        })}
      </div>
      <div ref={caja} className="grid overflow-y-auto" style={{ ...columnas, maxHeight: maxAlto }}>
        <div className="relative" style={{ height: alto }} aria-hidden="true">
          {horas.map((h, i) => (
            <span key={h} className="absolute right-2 -translate-y-1/2 text-[11px] text-gray-500" style={{ top: i * altoHora }}>{i ? horaEtiqueta(h) : ""}</span>
          ))}
        </div>
        {dias.map((d) => {
          const datos = porDia.get(d.clave) ?? { citas: [], horarios: [] };
          const c = carriles(datos.citas);
          const ahoraTop = lineaAhora(ahora ?? new Date(), d.clave, desde, hasta, altoHora);
          const esHoy = d.clave === hoy;
          return (
            <div key={d.clave} role={modoElegir ? "radiogroup" : "list"} aria-label={`${etiquetaGrupo}: ${nombreDia(d.clave)}`}
              data-dia-calendario={d.clave} data-dia-horarios={modoElegir ? d.clave : undefined} data-hoy={esHoy ? "" : undefined}
              className={`relative border-l border-gray-200 ${esHoy ? "bg-blue-50/40" : ""}`} style={{ height: alto }}>
              {horas.flatMap((h, i) => [
                <span key={`${h}`} aria-hidden="true" className="absolute inset-x-0 border-t border-gray-200" style={{ top: i * altoHora }} />,
                <span key={`${h}m`} aria-hidden="true" className="absolute inset-x-0 border-t border-dashed border-gray-100" style={{ top: i * altoHora + (altoHora * MINUTOS_FILA) / 60 }} />,
              ])}
              {datos.horarios.map((h) => {
                const p = posicionBloque(h.inicio, h.fin, desde, altoHora);
                const lleno = h.libres <= 0;
                const lugares = textoLugares(h.libres, h.capacidad);
                const estilo = { top: p.top + 1, height: Math.max(p.alto - 2, 18) };
                const destacado = fantasma?.destino === h.inicio;
                const base = `absolute inset-x-1 flex flex-col justify-center overflow-hidden rounded-md border px-1.5 text-left text-[11px] leading-tight ${
                  lleno ? "border-gray-200 bg-gray-50 text-gray-400" : "border-dashed border-emerald-400 bg-emerald-50/80 text-emerald-900 hover:bg-emerald-100"
                } ${destacado ? (fantasma.valido ? "ring-2 ring-emerald-500" : "ring-2 ring-red-400") : ""}`;
                const contenido = (
                  <>
                    <span className="truncate font-semibold tabular-nums">{horaTexto(h.inicio)}</span>
                    <span className="truncate">{modoElegir ? lugares : lleno ? "Lleno" : `Disponible · ${lugares}`}</span>
                  </>
                );
                const marcas = { "data-horario": h.inicio, "data-ocupados": h.ocupados, "data-capacidad": h.capacidad, ...(lleno ? { "data-horario-lleno": h.inicio } : { "data-horario-libre": h.inicio }) };
                if (modoElegir) {
                  return (
                    <label key={h.inicio} {...marcas} style={estilo}
                      className={`${base} ${lleno ? "cursor-not-allowed" : "cursor-pointer"} has-[:checked]:border-solid has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-600 has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-400`}>
                      <input type="radio" name={nombre} value={h.inicio} checked={seleccionado === h.inicio} disabled={lleno} onChange={() => onHorario?.(h)}
                        aria-label={`${horaTexto(h.inicio)}, ${lugares}`} className="sr-only" />
                      {contenido}
                    </label>
                  );
                }
                if (lleno || !onHorario) return <div key={h.inicio} role="listitem" {...marcas} style={estilo} className={base}>{contenido}</div>;
                return (
                  <div key={h.inicio} role="listitem" className="contents">
                    <button type="button" {...marcas} style={estilo} onClick={() => onHorario(h)} aria-label={`Agendar aquí: ${nombreDia(d.clave)}, ${horaTexto(h.inicio)}, ${lugares}`} className={base}>
                      {contenido}
                    </button>
                  </div>
                );
              })}
              {datos.citas.map((cita) => {
                const p = posicionBloque(cita.inicio, cita.fin, desde, altoHora);
                const { carril, total } = c[cita.id] ?? { carril: 0, total: 1 };
                const tono = etiquetaEstadoCita(cita.estado).tono;
                const nombreC = cita.candidato?.nombre || "Candidato";
                const arrastrable = !!onMover && sePuedeMover(cita);
                return (
                  <div key={cita.id} role="listitem" className="absolute z-10 px-0.5"
                    style={{ top: p.top, height: Math.max(p.alto, 22), left: `${(carril / total) * 100}%`, width: `${100 / total}%` }}>
                    <button type="button" data-bloque-cita={cita.id} data-inicio={cita.inicio}
                      onClick={() => { if (!evitarClic.current) onCita?.(cita); }}
                      onPointerDown={(e) => empezar(e, cita)}
                      aria-label={`${nombreC}, ${horaTexto(cita.inicio)}, ${cita.vacante?.titulo || "sin vacante"}, ${etiquetaEstadoCita(cita.estado).texto}`}
                      aria-roledescription={arrastrable ? "cita que se puede arrastrar" : undefined}
                      className={`flex size-full flex-col overflow-hidden rounded-md border border-l-4 px-1.5 py-0.5 text-left text-[11.5px] leading-tight shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${COLOR_ESTADO[tono]} ${
                        arrastrable ? "cursor-grab touch-none select-none active:cursor-grabbing" : ""} ${cita.moviendo ? "animate-pulse opacity-70" : ""} ${fantasma?.cita?.id === cita.id ? "opacity-40" : ""}`}>
                      <span className="truncate font-semibold">{nombreC}</span>
                      <span className="truncate tabular-nums">{horaTexto(cita.inicio)}{p.minutos >= 45 && cita.fin ? ` – ${horaTexto(cita.fin)}` : ""}</span>
                      {p.alto >= 52 ? <span className="truncate opacity-80">{cita.vacante?.titulo}</span> : null}
                    </button>
                  </div>
                );
              })}
              {ahoraTop !== null ? (
                <div aria-hidden="true" data-linea-ahora className="pointer-events-none absolute inset-x-0 z-20 flex items-center" style={{ top: ahoraTop }}>
                  <span className="-ml-1.5 size-3 rounded-full bg-red-600" />
                  <span className="h-0.5 flex-1 bg-red-600" />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      {fantasma ? (
        <div aria-hidden="true" className={`pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-lg px-2.5 py-1.5 text-[12px] font-semibold shadow-lg ${fantasma.valido ? "bg-emerald-700 text-white" : "bg-gray-800 text-white"}`}
          style={{ left: fantasma.x, top: fantasma.y - 8 }} data-fantasma>
          {fantasma.cita.candidato?.nombre || "Cita"} → {fantasma.destino ? horaTexto(fantasma.destino) : "suelta en un horario libre"}
        </div>
      ) : null}
    </div>
  );
}
