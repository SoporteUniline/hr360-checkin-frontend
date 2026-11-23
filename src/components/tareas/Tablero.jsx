"use client";

// Tablero (kanban) de tareas del equipo (prototipo 23/11/2026). Arrastra una tarjeta a otra columna (o ábrela y usa
// «Mover a»). Filtros: proyecto, persona, texto y solo vencidas. A la derecha, «Mi equipo hoy» con quién vino y su carga.
import { useMemo, useState } from "react";
import { Camera, MessageSquare, Search } from "lucide-react";
import { COLUMNAS, avancePasos, motivoNoMover } from "@/lib/tareas/reglas.mjs";
import { useTareas } from "./store";
import { Avatar, Barra, ChipPrioridad, campo, campoBase, fechaRelativa } from "./comun";

function Tarjeta({ t, alAbrir }) {
  const { persona, proyecto, hoy } = useTareas();
  const avance = avancePasos(t.pasos);
  const fecha = fechaRelativa(t.fecha, hoy, t.estado === "hecho");
  const pry = proyecto(t.proyecto);
  return (
    <li>
      <button type="button" draggable onDragStart={(e) => { e.dataTransfer.setData("text/plain", String(t.id)); e.dataTransfer.effectAllowed = "move"; }} onClick={() => alAbrir(t)} aria-label={`${t.titulo}, ${persona(t.persona)?.nombre}, ${fecha.texto}`}
        className={`w-full cursor-grab space-y-2 rounded-xl border bg-white p-3 text-left shadow-[0_1px_2px_rgba(15,23,42,0.05)] hover:border-blue-300 active:cursor-grabbing ${fecha.vencida ? "border-red-200" : "border-slate-200"}`}>
        <span className="flex flex-wrap items-center gap-1.5">
          <ChipPrioridad prioridad={t.prioridad} />
          {pry ? <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700"><span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: pry.color }} />{pry.nombre}</span> : null}
        </span>
        <span className="block text-[13.5px] font-semibold leading-snug text-[#080d36]">{t.titulo}</span>
        {avance.total ? <span className="flex items-center gap-2"><Barra porcentaje={avance.porcentaje} /><span className="shrink-0 text-[11.5px] tabular-nums text-slate-500">{avance.hechos}/{avance.total}</span></span> : null}
        <span className="flex items-center gap-2 text-[12px]">
          <Avatar persona={persona(t.persona)} tam="size-6" />
          <span className="truncate font-medium text-slate-700">{persona(t.persona)?.nombre.split(" ")[0]}</span>
          {t.pideFoto ? <Camera className={`size-3.5 ${t.fotos.length ? "text-green-600" : "text-slate-400"}`} aria-label={t.fotos.length ? "Con foto" : "Pide foto"} /> : null}
          {t.comentarios.length ? <span className="inline-flex items-center gap-0.5 text-slate-500"><MessageSquare className="size-3.5" />{t.comentarios.length}</span> : null}
          <span className={`ml-auto shrink-0 font-semibold ${fecha.vencida ? "text-red-700" : "text-slate-500"}`}>{fecha.texto}</span>
        </span>
      </button>
    </li>
  );
}

function EquipoHoy({ tareas }) {
  const { personas, envios, hoy } = useTareas();
  const tono = { verde: "bg-green-500", rojo: "bg-red-500", gris: "bg-slate-400" };
  return (
    <aside aria-label="Mi equipo hoy" className="space-y-1 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-bold text-[#080d36]">Mi equipo hoy</h2>
      <p className="pb-1 text-[12px] text-slate-500">Quién vino (por sus checadas) y lo que trae abierto.</p>
      {personas.map((p) => {
        const abiertas = tareas.filter((t) => t.persona === p.id && t.estado !== "hecho");
        const vencidas = abiertas.filter((t) => t.fecha < hoy).length;
        const paraHoy = abiertas.filter((t) => t.fecha === hoy).length;
        const checklistHoy = envios.find((e) => e.persona === p.id && e.fecha === hoy && e.estado !== "no_enviado");
        return (
          <div key={p.id} className="flex items-center gap-2.5 border-t border-slate-100 py-2">
            <span className="relative"><Avatar persona={p} tam="size-8" /><span className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-white ${tono[p.tono]}`} /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold">{p.nombre}</span>
              <span className={`block truncate text-[11.5px] ${p.tono === "rojo" ? "font-semibold text-red-700" : "text-slate-500"}`}>{p.hoy}{checklistHoy ? " · checklist enviado" : ""}</span>
            </span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${vencidas ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-700"}`}>
              {abiertas.length ? `${abiertas.length}${vencidas ? ` · ${vencidas} venc.` : ""}` : "Al día"}
            </span>
            {p.tono === "rojo" && paraHoy ? <span className="sr-only">Tiene {paraHoy} para hoy y no vino</span> : null}
          </div>
        );
      })}
      {personas.filter((p) => p.tono === "rojo" && tareas.some((t) => t.persona === p.id && t.fecha === hoy && t.estado !== "hecho")).map((p) => (
        <p key={p.id} className="mt-2 rounded-lg bg-orange-50 px-3 py-2 text-[12.5px] text-orange-900">{p.nombre.split(" ")[0]} no checó hoy y tiene tareas para hoy. Ábrelas y cámbiales el responsable.</p>
      ))}
    </aside>
  );
}

export default function Tablero({ alAbrir, proyectoFijo = null, sinEquipo = false }) {
  const { tareas, proyectos, personas, persona, despachar, hoy } = useTareas();
  const [filtroProyecto, setFiltroProyecto] = useState(proyectoFijo ? String(proyectoFijo) : "todos");
  const [filtroPersona, setFiltroPersona] = useState("todos");
  const [texto, setTexto] = useState("");
  const [soloVencidas, setSoloVencidas] = useState(false);
  const [sobre, setSobre] = useState(null);
  const [aviso, setAviso] = useState("");

  const visibles = useMemo(() => tareas.filter((t) => {
    if (filtroProyecto === "sueltas" ? t.proyecto != null : filtroProyecto !== "todos" && String(t.proyecto) !== filtroProyecto) return false;
    if (filtroPersona !== "todos" && String(t.persona) !== filtroPersona) return false;
    if (soloVencidas && !(t.estado !== "hecho" && t.fecha < hoy)) return false;
    const q = texto.trim().toLowerCase();
    return !q || t.titulo.toLowerCase().includes(q) || persona(t.persona)?.nombre.toLowerCase().includes(q);
  }), [tareas, filtroProyecto, filtroPersona, soloVencidas, texto, hoy, persona]);
  const vencidas = tareas.filter((t) => t.estado !== "hecho" && t.fecha < hoy).length;

  const soltar = (e, destino) => {
    e.preventDefault();
    setSobre(null);
    const t = tareas.find((x) => x.id === Number(e.dataTransfer.getData("text/plain")));
    if (!t) return;
    const motivo = motivoNoMover(t, destino, "jefe");
    if (motivo) { setAviso(motivo); return; }
    setAviso(destino === "hecho" && t.estado !== "hecho" ? `«${t.titulo}» quedó como hecha.` : "");
    despachar({ tipo: "mover", id: t.id, estado: destino });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[220px] max-w-xs flex-1">
          <span className="sr-only">Buscar tarea o persona</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input className={`${campo} pl-9`} placeholder="Buscar tarea o persona…" value={texto} onChange={(e) => setTexto(e.target.value)} />
        </label>
        {!proyectoFijo ? (
          <select aria-label="Proyecto" className={campoBase} value={filtroProyecto} onChange={(e) => setFiltroProyecto(e.target.value)}>
            <option value="todos">Todos los proyectos</option>
            <option value="sueltas">Solo tareas sueltas</option>
            {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        ) : null}
        <select aria-label="Persona" className={campoBase} value={filtroPersona} onChange={(e) => setFiltroPersona(e.target.value)}>
          <option value="todos">Todo el equipo</option>
          {personas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <button type="button" aria-pressed={soloVencidas} onClick={() => setSoloVencidas((v) => !v)}
          className={`min-h-10 rounded-lg border px-3 text-sm font-semibold ${soloVencidas ? "border-red-600 bg-red-600 text-white" : "border-red-200 bg-red-50 text-red-700"}`}>Vencidas · {vencidas}</button>
      </div>
      {aviso ? <p role="status" className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900">{aviso}</p> : null}

      <div className="flex flex-wrap items-start gap-4">
        <div className="grid min-w-0 flex-[999_1_720px] grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {COLUMNAS.map((c) => {
            const lista = visibles.filter((t) => t.estado === c.clave).sort((a, b) => a.fecha.localeCompare(b.fecha));
            return (
              <section key={c.clave} aria-label={c.texto}
                onDragOver={(e) => { e.preventDefault(); setSobre(c.clave); }} onDragLeave={() => setSobre((v) => (v === c.clave ? null : v))} onDrop={(e) => soltar(e, c.clave)}
                className={`flex min-h-[420px] flex-col gap-2 rounded-xl p-2.5 transition-colors ${sobre === c.clave ? "bg-blue-50 ring-2 ring-blue-300" : "bg-slate-100/80"}`}>
                <h3 className="flex items-center gap-2 px-1 py-0.5 text-[11.5px] font-bold uppercase tracking-[0.06em] text-slate-600">
                  <span className="size-2 rounded-[3px]" style={{ backgroundColor: c.color }} />{c.texto}<b className="ml-auto text-sm tabular-nums text-[#080d36]">{lista.length}</b>
                </h3>
                <ul className="flex flex-col gap-2">{lista.map((t) => <Tarjeta key={t.id} t={t} alAbrir={alAbrir} />)}</ul>
                {!lista.length ? <p className="px-1 py-6 text-center text-[12px] text-slate-400">Arrastra aquí</p> : null}
              </section>
            );
          })}
        </div>
        {!sinEquipo ? <div className="min-w-0 flex-[1_1_270px]"><EquipoHoy tareas={tareas} /></div> : null}
      </div>
    </div>
  );
}
