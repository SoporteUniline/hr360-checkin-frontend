"use client";

// App del empleado → Tareas. Arriba sus checklists de hoy (y los que su jefe le regresó);
// abajo sus tareas por estado. Detalle con pasos, foto y comentarios, y «Mandar a revisión». El checklist se llena
// pregunta por pregunta, con fotos y firma que se suben al momento; el servidor califica.
import { useState } from "react";
import axios from "@/lib/axios";
import useSWR from "swr";
import { ArrowLeft, Camera, Check, ChevronRight, ListChecks } from "lucide-react";
import { avancePasos, motivoNoMover } from "@/lib/tareas/reglas.mjs";
import { calificarRespuestas, motivoNoEnviar } from "@/lib/tareas/preguntas.mjs";
import { dePreguntaApi } from "@/lib/tareas/api.mjs";
import { CampoRespuesta } from "./Preguntas";
import { TareasProvider, errorDe, useTareas } from "./store";
import { Barra, ChipPrioridad, FotoSegura, fechaRelativa } from "./comun";

const vacia = (r) => !r || (!r.na && (r.valor == null || r.valor === "" || (Array.isArray(r.valor) && !r.valor.length)));

function DetalleTarea({ id, alVolver }) {
  const { tareas, proyecto, hoy, marcarPaso, comentar, moverTarea, subirFotoTarea } = useTareas();
  const t = tareas.find((x) => x.id === id);
  const [texto, setTexto] = useState("");
  const [aviso, setAviso] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  if (!t) return <button type="button" onClick={alVolver} className="text-sm font-semibold text-brand">Volver</button>;
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
        <p className={`text-sm ${fecha.vencida ? "font-semibold text-red-700" : "text-slate-500"}`}>{fecha.texto}</p>
        {t.descripcion ? <p className="whitespace-pre-line text-sm text-slate-600">{t.descripcion}</p> : null}
      </div>
      {t.pasos.length ? (
        <section aria-label="Pasos" className="overflow-hidden rounded-2xl border border-slate-200">
          <h2 className="flex items-center justify-between bg-slate-50 px-4 py-2.5 text-[13px] font-bold">Pasos <span className="text-slate-500">{avance.hechos} de {avance.total}</span></h2>
          {t.pasos.map((p) => (
            <label key={p.id} className="flex min-h-[52px] items-center gap-3 border-t border-slate-100 px-4 text-[15px]">
              <input type="checkbox" disabled={!editable} className="size-[22px] accent-green-600" checked={p.hecho} onChange={() => marcarPaso(t, p, !p.hecho)} />
              <span className={p.hecho ? "text-slate-400 line-through" : ""}>{p.texto}</span>
            </label>
          ))}
        </section>
      ) : null}
      {t.pideFoto || t.fotos.length ? (
        <section aria-label="Evidencia" className="space-y-2">
          <h2 className="text-[13px] font-bold">Foto de evidencia</h2>
          <div className="flex flex-wrap items-center gap-2">
            {t.fotos.map((f, i) => <FotoSegura key={f} llave={f} alt={`Evidencia ${i + 1}`} className="size-20 rounded-xl object-cover" />)}
            {editable ? (
              <label className={`inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-amber-400 bg-amber-50 px-3 text-[13px] font-semibold text-amber-900 ${subiendo ? "opacity-60" : ""}`}>
                <Camera className="size-4" /> {subiendo ? "Subiendo…" : "Tomar foto"}
                <input type="file" accept="image/*" capture="environment" className="sr-only" disabled={subiendo}
                  onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; setSubiendo(true); await subirFotoTarea(t, f); setSubiendo(false); }} />
              </label>
            ) : null}
          </div>
        </section>
      ) : null}
      <section aria-label="Comentarios" className="space-y-2">
        <h2 className="text-[13px] font-bold">Comentarios</h2>
        {t.comentarios.map((c, i) => <p key={i} className="rounded-xl bg-slate-100 px-3 py-2 text-sm"><b>{c.de}:</b> {c.texto}</p>)}
        <div className="flex gap-2">
          <input aria-label="Escribe un comentario" className="min-h-11 flex-1 rounded-xl border border-slate-300 px-3 text-base" placeholder="Escribe un comentario…" value={texto} onChange={(e) => setTexto(e.target.value)} />
          <button type="button" disabled={!texto.trim()} onClick={async () => { const v = texto.trim(); setTexto(""); const r = await comentar(t, v); if (!r.ok) setTexto(v); }} className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm font-semibold disabled:opacity-50">Enviar</button>
        </div>
      </section>
      {aviso ? <p role="status" className="rounded-xl bg-green-50 p-3 text-sm text-green-800">{aviso}</p> : null}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-slate-200 bg-white px-5 py-3">
        <div className="mx-auto max-w-3xl">
          {editable ? (
            <>
              <button type="button" disabled={Boolean(motivo)} onClick={async () => { const r = await moverTarea(t, "revision"); if (r.ok) setAviso("Listo, tu jefe ya puede revisarla."); }} className="min-h-12 w-full rounded-xl bg-blue-600 text-base font-bold text-white disabled:bg-blue-300">Mandar a revisión</button>
              {motivo ? <p className="mt-1 text-center text-[12.5px] text-slate-500">{motivo}</p> : null}
            </>
          ) : <p className="text-center text-sm font-semibold text-slate-600">{t.estado === "revision" ? "En revisión con tu jefe" : "Terminada ✓"}</p>}
        </div>
      </div>
    </div>
  );
}

function LlenarChecklist({ item, alVolver }) {
  const { enviarChecklist, subirArchivoEnvio, firmarConPinEnvio } = useTareas();
  const { envio, checklist } = item;
  // ¿Puede firmar con su PIN? (firma guardada + PIN en Mi espacio). Si falla la consulta, solo se ofrece dibujar.
  const { data: miFirma } = useSWR("/checador/mi-espacio/firma", (url) => axios.get(url).then((r) => r.data));
  const firmaPin = miFirma?.tiene_firma && miFirma?.tiene_pin
    ? { disponible: true, bloqueadoHasta: miFirma.bloqueado_hasta ?? null, firmar: (pin) => firmarConPinEnvio(envio.id, pin) }
    : null;
  const preguntas = checklist.preguntas.map(dePreguntaApi);
  const [respuestas, setRespuestas] = useState(() => (envio.estado === "regresado" ? Object.fromEntries((envio.respuestas ?? []).map((r) => [r.id_pregunta, r.respuesta])) : {}));
  const [nota, setNota] = useState(envio.nota ?? "");
  const [resultado, setResultado] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const contestadas = preguntas.filter((p) => !vacia(respuestas[p.id])).length;
  const motivo = motivoNoEnviar({ preguntas }, respuestas);
  const calif = calificarRespuestas(preguntas, respuestas);
  const terminado = resultado || envio.estado === "por_revisar" || envio.estado === "aprobado";
  const corregidas = (envio.respuestas ?? []).filter((r) => r.corregida);
  if (terminado) return (
    <div className="space-y-4">
      <button type="button" onClick={alVolver} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-slate-600"><ArrowLeft className="size-4" /> Mis tareas</button>
      <div role="status" className="rounded-2xl border border-green-200 bg-green-50 p-5 text-green-900">
        <p className="flex items-center gap-2 text-lg font-bold"><Check className="size-5" /> Checklist enviado</p>
        <p className="mt-1 text-sm">{envio.estado === "aprobado" && !resultado ? `Tu jefe lo aprobó con ${envio.calificacion}%.` : resultado?.estado === "aprobado" ? `Quedó aprobado con ${resultado.calificacion}%.` : "Tu jefe lo va a revisar. Te avisaremos si hay algo que corregir."}</p>
        {!resultado && corregidas.length ? <p className="mt-2 text-sm">Tu jefe corrigió: {corregidas.map((r) => `«${r.pregunta_texto}» de ${r.corregida.antes} a ${r.corregida.despues}`).join("; ")}.</p> : null}
      </div>
    </div>
  );
  return (
    <div className="space-y-4 pb-40">
      <button type="button" onClick={alVolver} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-slate-600"><ArrowLeft className="size-4" /> Mis tareas</button>
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{checklist.nombre}</h1>
        <p className="mt-1 text-sm text-slate-500">Antes de las {checklist.hora_limite}{checklist.revisa === "nadie" ? "" : " · lo revisa tu jefe"}</p>
        {envio.estado === "regresado" ? (
          <div className="mt-2 rounded-xl bg-red-50 p-3 text-sm text-red-800">
            <b>Tu jefe lo regresó.</b> {envio.comentario_revisor}
            {corregidas.length ? <span className="mt-1 block">Corrigió: {corregidas.map((r) => `«${r.pregunta_texto}» de ${r.corregida.antes} a ${r.corregida.despues}`).join("; ")}.</span> : null}
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-3"><Barra porcentaje={(contestadas / Math.max(1, preguntas.length)) * 100} color="bg-green-600" alto="h-2" /><b className="shrink-0 text-sm tabular-nums">{contestadas} de {preguntas.length}</b></div>
      <ol className="space-y-3">
        {preguntas.map((p, i) => (
          <li key={p.id} className="space-y-3 rounded-2xl border border-slate-200 p-4">
            <p className="text-[15.5px] font-semibold leading-snug">{i + 1}. {p.texto}{p.obligatoria ? <span className="ml-1 text-red-600" aria-label="obligatoria">*</span> : null}</p>
            <CampoRespuesta grande pregunta={p} respuesta={respuestas[p.id]} onChange={(r) => setRespuestas((x) => ({ ...x, [p.id]: r }))}
              subir={(archivo, opciones) => subirArchivoEnvio(envio.id, archivo, opciones)} firmaPin={firmaPin} />
          </li>
        ))}
      </ol>
      <label className="block text-[13px] font-semibold text-slate-700">Nota para tu jefe (opcional)
        <textarea rows={2} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-base" placeholder="Ej. el refrigerador 3 hace ruido" value={nota} onChange={(e) => setNota(e.target.value)} />
      </label>
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-slate-200 bg-white px-5 py-3">
        <div className="mx-auto max-w-3xl">
          <button type="button" disabled={Boolean(motivo) || enviando} onClick={async () => { setEnviando(true); const r = await enviarChecklist(envio.id, respuestas, nota); setEnviando(false); if (r.ok) setResultado(r.data); }}
            className="min-h-12 w-full rounded-xl bg-blue-600 text-base font-bold text-white disabled:bg-blue-300">{enviando ? "Enviando…" : `Enviar terminado${calif != null ? ` · ${calif}%` : ""}`}</button>
          <p className="mt-1 text-center text-[12.5px] text-slate-500">{motivo ?? "Lo que no contestes cuenta como 0 %."}</p>
        </div>
      </div>
    </div>
  );
}

function Lista({ alAbrirTarea, alAbrirChecklist }) {
  const { tareas, misChecklists, hoy, proyecto } = useTareas();
  const [filtro, setFiltro] = useState("abiertas");
  const grupos = { abiertas: tareas.filter((t) => t.estado === "por_hacer" || t.estado === "en_proceso"), revision: tareas.filter((t) => t.estado === "revision"), hechas: tareas.filter((t) => t.estado === "hecho") };
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mis tareas</h1>
        <p className="mt-1 text-sm text-slate-500">{grupos.abiertas.length} por hacer · {misChecklists.length} {misChecklists.length === 1 ? "checklist" : "checklists"}</p>
      </div>
      {misChecklists.map((item) => {
        const { envio, checklist: c } = item;
        const pendiente = envio.estado === "pendiente" || envio.estado === "regresado";
        const estado = envio.estado === "pendiente" ? `Antes de las ${c.hora_limite} · ${c.preguntas.length} preguntas` : envio.estado === "regresado" ? `Tu jefe lo regresó${envio.fecha !== hoy ? ` (${envio.fecha.slice(8)}/${envio.fecha.slice(5, 7)})` : ""}: corrígelo` : envio.estado === "por_revisar" ? "Enviado · en revisión" : envio.estado === "aprobado" ? `Aprobado · ${envio.calificacion}%` : "No enviado";
        return (
          <button key={envio.id} type="button" onClick={() => alAbrirChecklist(item)}
            className={`flex w-full items-center gap-3 rounded-2xl p-4 text-left ${pendiente ? (envio.estado === "regresado" ? "bg-red-600 text-white" : "bg-blue-600 text-white") : "border border-slate-200 bg-white"}`}>
            <span className={`grid size-10 place-items-center rounded-xl ${pendiente ? "bg-white/20" : "bg-green-50 text-green-700"}`}><ListChecks className="size-5" /></span>
            <span className="min-w-0 flex-1"><b className="block">{c.nombre}</b><span className={`block text-[13px] ${pendiente ? "text-white/90" : "text-slate-500"}`}>{estado}</span></span>
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
        {[...grupos[filtro]].sort((a, b) => (a.fecha || "9").localeCompare(b.fecha || "9")).map((t) => {
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
  const { cargando, error } = useTareas();
  const [vista, setVista] = useState({ tipo: "lista" });
  if (error) {
    const inactivo = error?.response?.data?.codigo === "MODULO_INACTIVO";
    return <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">{inactivo ? "Tu empresa todavía no usa Tareas en ADAMIA." : errorDe(error, "No se pudieron cargar tus tareas. Intenta de nuevo.")}</div>;
  }
  if (cargando) return <p role="status" className="text-sm text-slate-500">Cargando tus tareas…</p>;
  return (
    <div className="space-y-4">
      {vista.tipo === "lista" ? <Lista alAbrirTarea={(id) => setVista({ tipo: "tarea", id })} alAbrirChecklist={(item) => setVista({ tipo: "checklist", item })} /> : null}
      {vista.tipo === "tarea" ? <DetalleTarea id={vista.id} alVolver={() => setVista({ tipo: "lista" })} /> : null}
      {vista.tipo === "checklist" ? <LlenarChecklist item={vista.item} alVolver={() => setVista({ tipo: "lista" })} /> : null}
    </div>
  );
}

export default function MisTareasApp() {
  return <TareasProvider modo="empleado"><Contenido /></TareasProvider>;
}
