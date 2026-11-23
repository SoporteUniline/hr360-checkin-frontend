"use client";

// App del empleado → Tareas (PROTOTIPO con datos de ejemplo, 23/11/2026). Se ve como lo vería Ana Torres (encargada de
// turno): su checklist de hoy hasta arriba, sus tareas por estado, el detalle con pasos, foto y comentarios, y «Mandar a
// revisión». El checklist se llena punto por punto, con foto donde se pide, y se envía a su jefe.
import { useState } from "react";
import { ArrowLeft, Camera, Check, ChevronRight, ListChecks } from "lucide-react";
import { avancePasos, motivoNoMover } from "@/lib/tareas/reglas.mjs";
import { calificarRespuestas, motivoNoEnviar } from "@/lib/tareas/preguntas.mjs";
import { CampoRespuesta } from "./Preguntas";
import { TareasProvider, useTareas } from "./store";
import { AvisoPrototipo, Barra, ChipPrioridad, fechaRelativa } from "./comun";

const YO = 1; // En el prototipo, la app se ve como Ana Torres.
const ahoraHHMM = () => new Intl.DateTimeFormat("en-GB", { timeZone: "America/Mexico_City", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());

function BotonFoto({ etiqueta = "Tomar foto", alTomar }) {
  return (
    <label className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-amber-400 bg-amber-50 px-3 text-[13px] font-semibold text-amber-900">
      <Camera className="size-4" /> {etiqueta}
      <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) alTomar(URL.createObjectURL(f)); }} />
    </label>
  );
}

function DetalleTarea({ id, alVolver }) {
  const { tareas, despachar, persona, proyecto, hoy } = useTareas();
  const t = tareas.find((x) => x.id === id);
  const [texto, setTexto] = useState("");
  const [aviso, setAviso] = useState("");
  if (!t) return null;
  const avance = avancePasos(t.pasos);
  const fecha = fechaRelativa(t.fecha, hoy, t.estado === "hecho");
  const motivo = motivoNoMover(t, "revision", "persona");
  const editable = t.estado === "por_hacer" || t.estado === "en_proceso";
  return (
    <div className="space-y-4 pb-28">
      <button type="button" onClick={alVolver} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-slate-600"><ArrowLeft className="size-4" /> Mis tareas</button>
      <div className="space-y-1.5">
        <span className="flex flex-wrap gap-1.5 text-xs"><ChipPrioridad prioridad={t.prioridad} />{proyecto(t.proyecto) ? <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">{proyecto(t.proyecto).nombre}</span> : null}</span>
        <h1 className="text-2xl font-extrabold tracking-tight">{t.titulo}</h1>
        <p className={`text-sm ${fecha.vencida ? "font-semibold text-red-700" : "text-slate-500"}`}>Te la asignó Diego · {fecha.texto}</p>
        {t.descripcion ? <p className="text-sm text-slate-600">{t.descripcion}</p> : null}
      </div>
      {t.pasos.length ? (
        <section aria-label="Pasos" className="overflow-hidden rounded-2xl border border-slate-200">
          <h2 className="flex items-center justify-between bg-slate-50 px-4 py-2.5 text-[13px] font-bold">Pasos <span className="text-slate-500">{avance.hechos} de {avance.total}</span></h2>
          {t.pasos.map((p) => (
            <label key={p.id} className="flex min-h-[52px] items-center gap-3 border-t border-slate-100 px-4 text-[15px]">
              <input type="checkbox" disabled={!editable} className="size-[22px] accent-green-600" checked={p.hecho} onChange={() => { despachar({ tipo: "paso", id: t.id, paso: p.id }); if (t.estado === "por_hacer") despachar({ tipo: "mover", id: t.id, estado: "en_proceso" }); }} />
              <span className={p.hecho ? "text-slate-400 line-through" : ""}>{p.texto}</span>
            </label>
          ))}
        </section>
      ) : null}
      {t.pideFoto ? (
        <section aria-label="Evidencia" className="space-y-2">
          <h2 className="text-[13px] font-bold">Foto de evidencia</h2>
          <div className="flex flex-wrap items-center gap-2">
            {t.fotos.map((f, i) => (f.startsWith("blob:") ? <img key={i} src={f} alt={`Evidencia ${i + 1}`} className="size-20 rounded-xl object-cover" /> : <span key={i} className="grid size-20 place-items-center rounded-xl bg-slate-200 text-[11px] text-slate-600">Foto {i + 1}</span>))}
            {editable ? <BotonFoto alTomar={(url) => despachar({ tipo: "foto", id: t.id, url })} /> : null}
          </div>
        </section>
      ) : null}
      <section aria-label="Comentarios" className="space-y-2">
        <h2 className="text-[13px] font-bold">Comentarios</h2>
        {t.comentarios.map((c, i) => <p key={i} className="rounded-xl bg-slate-100 px-3 py-2 text-sm"><b>{c.de}:</b> {c.texto}</p>)}
        <div className="flex gap-2">
          <input aria-label="Escribe un comentario" className="min-h-11 flex-1 rounded-xl border border-slate-300 px-3 text-base" placeholder="Escribe un comentario…" value={texto} onChange={(e) => setTexto(e.target.value)} />
          <button type="button" disabled={!texto.trim()} onClick={() => { despachar({ tipo: "comentar", id: t.id, de: persona(YO).nombre, texto: texto.trim() }); setTexto(""); }} className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm font-semibold disabled:opacity-50">Enviar</button>
        </div>
      </section>
      {aviso ? <p role="status" className="rounded-xl bg-green-50 p-3 text-sm text-green-800">{aviso}</p> : null}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-slate-200 bg-white px-5 py-3">
        <div className="mx-auto max-w-3xl">
          {editable ? (
            <>
              <button type="button" disabled={Boolean(motivo)} onClick={() => { despachar({ tipo: "mover", id: t.id, estado: "revision" }); setAviso("Listo, tu jefe ya puede revisarla."); }} className="min-h-12 w-full rounded-xl bg-blue-600 text-base font-bold text-white disabled:bg-blue-300">Mandar a revisión</button>
              {motivo ? <p className="mt-1 text-center text-[12.5px] text-slate-500">{motivo}</p> : null}
            </>
          ) : <p className="text-center text-sm font-semibold text-slate-600">{t.estado === "revision" ? "En revisión con tu jefe" : "Terminada ✓"}</p>}
        </div>
      </div>
    </div>
  );
}

function LlenarChecklist({ id, alVolver }) {
  const { checklist, envios, despachar, hoy, persona } = useTareas();
  const ck = checklist(id);
  const previo = envios.find((e) => e.checklist === id && e.persona === YO && e.fecha === hoy && e.estado !== "no_enviado");
  const [respuestas, setRespuestas] = useState(() => (previo?.estado === "regresado" ? { ...previo.respuestas } : {}));
  const [enviado, setEnviado] = useState(previo?.estado === "por_revisar" || previo?.estado === "aprobado");
  const contestadas = ck.preguntas.filter((p) => { const r = respuestas[p.id]; return r?.na || (r?.valor != null && r.valor !== "" && !(Array.isArray(r.valor) && !r.valor.length)); }).length;
  const motivo = motivoNoEnviar(ck, respuestas);
  const calif = calificarRespuestas(ck.preguntas, respuestas);
  if (enviado) return (
    <div className="space-y-4">
      <button type="button" onClick={alVolver} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-slate-600"><ArrowLeft className="size-4" /> Mis tareas</button>
      <div role="status" className="rounded-2xl border border-green-200 bg-green-50 p-5 text-green-900">
        <p className="flex items-center gap-2 text-lg font-bold"><Check className="size-5" /> Checklist enviado</p>
        <p className="mt-1 text-sm">{previo?.estado === "aprobado" ? `Tu jefe lo aprobó con ${previo.calificacion}%.` : "Tu jefe lo va a revisar. Te avisaremos si hay algo que corregir."}</p>
        {previo?.cambios?.length ? <p className="mt-2 text-sm">Tu jefe corrigió: {previo.cambios.map((c) => `«${c.texto}» de ${c.antes} a ${c.despues}`).join("; ")}.</p> : null}
      </div>
    </div>
  );
  return (
    <div className="space-y-4 pb-40">
      <button type="button" onClick={alVolver} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-slate-600"><ArrowLeft className="size-4" /> Mis tareas</button>
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{ck.nombre}</h1>
        <p className="mt-1 text-sm text-slate-500">{persona(YO).sucursal} · antes de las {ck.hora} · lo revisa Diego</p>
        {previo?.estado === "regresado" ? (
          <div className="mt-2 rounded-xl bg-red-50 p-3 text-sm text-red-800">
            <b>Tu jefe lo regresó.</b> {previo.comentarioJefe}
            {previo.cambios?.length ? <span className="mt-1 block">Corrigió: {previo.cambios.map((c) => `«${c.texto}» de ${c.antes} a ${c.despues}`).join("; ")}.</span> : null}
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-3"><Barra porcentaje={(contestadas / ck.preguntas.length) * 100} color="bg-green-600" alto="h-2" /><b className="shrink-0 text-sm tabular-nums">{contestadas} de {ck.preguntas.length}</b></div>
      <ol className="space-y-3">
        {ck.preguntas.map((p, i) => (
          <li key={p.id} className="space-y-3 rounded-2xl border border-slate-200 p-4">
            <p className="text-[15.5px] font-semibold leading-snug">{i + 1}. {p.texto}{p.obligatoria ? <span className="ml-1 text-red-600" aria-label="obligatoria">*</span> : null}</p>
            <CampoRespuesta grande pregunta={p} respuesta={respuestas[p.id]} onChange={(r) => setRespuestas((x) => ({ ...x, [p.id]: r }))} />
          </li>
        ))}
      </ol>
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-slate-200 bg-white px-5 py-3">
        <div className="mx-auto max-w-3xl">
          <button type="button" disabled={Boolean(motivo)} onClick={() => { despachar({ tipo: "enviarChecklist", checklist: ck.id, persona: YO, fecha: hoy, respuestas, hora: ahoraHHMM() }); setEnviado(true); }}
            className="min-h-12 w-full rounded-xl bg-blue-600 text-base font-bold text-white disabled:bg-blue-300">Enviar terminado{calif != null ? ` · ${calif}%` : ""}</button>
          <p className="mt-1 text-center text-[12.5px] text-slate-500">{motivo ?? "Lo que no contestes cuenta como 0 %."}</p>
        </div>
      </div>
    </div>
  );
}

function Lista({ alAbrirTarea, alAbrirChecklist }) {
  const { tareas, checklists, envios, hoy, proyecto } = useTareas();
  const [filtro, setFiltro] = useState("abiertas");
  const mias = tareas.filter((t) => t.persona === YO);
  const grupos = { abiertas: mias.filter((t) => t.estado === "por_hacer" || t.estado === "en_proceso"), revision: mias.filter((t) => t.estado === "revision"), hechas: mias.filter((t) => t.estado === "hecho") };
  const misChecklists = checklists.filter((c) => c.personas.includes(YO) && c.frecuencia === "Diario");
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mis tareas</h1>
        <p className="mt-1 text-sm text-slate-500">{grupos.abiertas.length} por hacer · {misChecklists.length} checklists hoy</p>
      </div>
      {misChecklists.map((c) => {
        const e = envios.find((x) => x.checklist === c.id && x.persona === YO && x.fecha === hoy && x.estado !== "no_enviado");
        const estado = !e ? `Antes de las ${c.hora} · ${c.preguntas.length} preguntas` : e.estado === "regresado" ? "Tu jefe lo regresó: corrígelo" : e.estado === "por_revisar" ? "Enviado · en revisión" : `Aprobado · ${e.calificacion}%`;
        const pendiente = !e || e.estado === "regresado";
        return (
          <button key={c.id} type="button" onClick={() => alAbrirChecklist(c.id)}
            className={`flex w-full items-center gap-3 rounded-2xl p-4 text-left ${pendiente ? "bg-blue-600 text-white" : "border border-slate-200 bg-white"}`}>
            <span className={`grid size-10 place-items-center rounded-xl ${pendiente ? "bg-white/20" : "bg-green-50 text-green-700"}`}><ListChecks className="size-5" /></span>
            <span className="min-w-0 flex-1"><b className="block">{c.nombre}</b><span className={`block text-[13px] ${pendiente ? "text-blue-50" : "text-slate-500"}`}>{estado}</span></span>
            <ChevronRight className="size-5 shrink-0" />
          </button>
        );
      })}
      <div role="tablist" aria-label="Filtrar tareas" className="flex gap-2 overflow-x-auto">
        {[["abiertas", "Por hacer"], ["revision", "En revisión"], ["hechas", "Hechas"]].map(([k, txt]) => (
          <button key={k} type="button" role="tab" aria-selected={filtro === k} onClick={() => setFiltro(k)}
            className={`min-h-10 whitespace-nowrap rounded-full px-4 text-[13px] font-semibold ${filtro === k ? "bg-[#080d36] text-white" : "border border-slate-200 bg-white text-slate-700"}`}>{txt} · {grupos[k].length}</button>
        ))}
      </div>
      <ul className="space-y-3">
        {grupos[filtro].sort((a, b) => a.fecha.localeCompare(b.fecha)).map((t) => {
          const f = fechaRelativa(t.fecha, hoy, t.estado === "hecho");
          const a = avancePasos(t.pasos);
          return (
            <li key={t.id}>
              <button type="button" onClick={() => alAbrirTarea(t.id)} className={`w-full space-y-2 rounded-2xl border bg-white p-4 text-left ${f.vencida ? "border-red-200" : "border-slate-200"}`}>
                <span className="flex items-center justify-between gap-2 text-xs"><ChipPrioridad prioridad={t.prioridad} /><span className={`font-semibold ${f.vencida ? "text-red-700" : "text-slate-500"}`}>{f.texto}</span></span>
                <b className="block text-base">{t.titulo}</b>
                {proyecto(t.proyecto) ? <span className="block text-[12.5px] text-slate-500">{proyecto(t.proyecto).nombre}</span> : null}
                {a.total ? <span className="flex items-center gap-2"><Barra porcentaje={a.porcentaje} /><span className="shrink-0 text-[12.5px] text-slate-500">{a.hechos} de {a.total} pasos</span></span> : null}
              </button>
            </li>
          );
        })}
        {!grupos[filtro].length ? <li className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Nada por aquí.</li> : null}
      </ul>
    </div>
  );
}

function Contenido() {
  const [vista, setVista] = useState({ tipo: "lista" });
  return (
    <div className="space-y-4">
      <AvisoPrototipo />
      {vista.tipo === "lista" ? <Lista alAbrirTarea={(id) => setVista({ tipo: "tarea", id })} alAbrirChecklist={(id) => setVista({ tipo: "checklist", id })} /> : null}
      {vista.tipo === "tarea" ? <DetalleTarea id={vista.id} alVolver={() => setVista({ tipo: "lista" })} /> : null}
      {vista.tipo === "checklist" ? <LlenarChecklist id={vista.id} alVolver={() => setVista({ tipo: "lista" })} /> : null}
    </div>
  );
}

export default function MisTareasApp() {
  return <TareasProvider><Contenido /></TareasProvider>;
}
