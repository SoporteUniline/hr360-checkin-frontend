"use client";

// Revisar checklists enviados (23/11/2026, conectado a la API). El revisor ve cada respuesta con su puntaje y foto, y
// puede CORREGIRLA (decisión A del dueño): la calificación se recalcula al momento y queda «Respondió X → corregido a Y».
// El servidor vuelve a calcular todo al aprobar o regresar.
import { useMemo, useState } from "react";
import useSWR from "swr";
import { Check, Pencil, RotateCcw } from "lucide-react";
import axios from "@/lib/axios";
import { aplicarCorrecciones, calificarRespuestas, esCalificable, puntajePregunta, textoRespuesta } from "@/lib/tareas/preguntas.mjs";
import { dePreguntaApi } from "@/lib/tareas/api.mjs";
import { useTareas } from "./store";
import { CampoRespuesta, ChipPuntaje, IconoTipo } from "./Preguntas";
import { Avatar, FotoSegura, botonSecundario, campo, colorCalificacion, fechaDia } from "./comun";

const get = (url) => axios.get(url).then((r) => r.data);

function Panel({ idEnvio, alTerminar }) {
  const { persona, hoy, revisarEnvio } = useTareas();
  const { data, error } = useSWR(`/checador/tareas/envios/${idEnvio}`, get);
  const envio = data?.envio;
  // Preguntas como estaban al responder (texto, tipo y peso guardados) con sus opciones; y lo que respondió.
  const { preguntas, base } = useMemo(() => {
    const rs = envio?.respuestas ?? [];
    return {
      preguntas: rs.map((r) => ({ ...(r.pregunta ? dePreguntaApi(r.pregunta) : { opciones: [] }), id: r.id_pregunta, texto: r.pregunta_texto, tipo: r.tipo, peso: r.peso })),
      base: Object.fromEntries(rs.map((r) => [r.id_pregunta, r.respuesta])),
    };
  }, [envio]);
  const [correcciones, setCorrecciones] = useState({});
  const [abierta, setAbierta] = useState(null);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  if (error) return <p role="alert" className="text-sm text-red-700">No se pudo abrir este checklist.</p>;
  if (!envio) return <p role="status" className="text-sm text-slate-500">Abriendo…</p>;
  const { finales, cambios } = aplicarCorrecciones(preguntas, base, correcciones);
  const calif = calificarRespuestas(preguntas, finales);
  const p = persona(envio.id_empleado) ?? { nombre: "", ini: "?" };
  const nombre = p.nombre.split(" ")[0];
  const revisar = async (aprobar) => {
    setEnviando(true);
    const r = await revisarEnvio(envio, { aprobar, comentario, correcciones: Object.fromEntries(cambios.map((c) => [c.pregunta, correcciones[c.pregunta]])) });
    setEnviando(false);
    if (r.ok) alTerminar(aprobar ? `Aprobado con ${r.data?.envio?.calificacion ?? calif}%${cambios.length ? ` (corregiste ${cambios.length})` : ""}.` : `Regresado a ${nombre} con tu comentario.`);
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <Avatar persona={p} tam="size-10" />
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-extrabold text-[#080d36]">{envio.checklist_nombre ?? "Checklist"}{p.sucursal ? ` · ${p.sucursal}` : ""}</h3>
          <p className="text-[13px] text-slate-600">Lo envió <b>{p.nombre}</b> {fechaDia(envio.fecha, hoy).toLowerCase()} {envio.a_tiempo ? <span className="font-semibold text-green-700">(a tiempo)</span> : <span className="font-semibold text-amber-700">(tarde)</span>}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-center">
          <p className={`text-2xl font-extrabold tabular-nums ${colorCalificacion(calif)}`} data-calificacion>{calif ?? "—"}%</p>
          <p className="text-[11.5px] text-slate-500">{cambios.length ? <>con tus correcciones · <s>{envio.calificacion_persona}%</s></> : "calificación"}</p>
        </div>
      </div>

      <ol className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {preguntas.map((pg, i) => {
          const rBase = base[pg.id];
          const cambio = cambios.find((c) => c.pregunta === pg.id);
          const puntaje = puntajePregunta(pg, finales[pg.id]);
          const llave = pg.tipo === "foto" || pg.tipo === "firma" ? rBase?.valor : rBase?.foto;
          return (
            <li key={pg.id} className={`space-y-2 px-3.5 py-3 ${puntaje != null && puntaje < 100 ? "bg-red-50/50" : ""}`}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span className="flex min-w-0 flex-[1_1_240px] items-center gap-2 text-sm">
                  <IconoTipo tipo={pg.tipo} className="size-4 shrink-0 text-slate-400" />
                  <span className="font-medium">{i + 1}. {pg.texto}</span>
                  {esCalificable(pg) ? <span className="text-[11px] font-semibold text-slate-400">peso {pg.peso}</span> : null}
                </span>
                <span className="text-sm">
                  {cambio ? <><s className="text-slate-400">{cambio.antes}</s> → <b className="text-[#080d36]">{cambio.despues}</b></> : <b className="text-[#080d36]">{pg.tipo === "foto" || pg.tipo === "firma" ? (llave ? "" : "Sin contestar") : textoRespuesta(pg, rBase)}</b>}
                </span>
                {llave ? <FotoSegura llave={llave} alt={pg.tipo === "firma" ? `Firma: ${pg.texto}` : `Foto: ${pg.texto}`} className={pg.tipo === "firma" ? "h-12 rounded-md border border-slate-200 bg-white object-contain" : "h-12 w-16 rounded-md object-cover"} /> : null}
                {esCalificable(pg) ? <ChipPuntaje valor={puntaje} /> : null}
                {esCalificable(pg) && pg.tipo !== "foto" && pg.opciones !== undefined ? (
                  abierta === pg.id
                    ? <button type="button" onClick={() => setAbierta(null)} className="min-h-9 rounded-lg px-2 text-[12.5px] font-semibold text-brand">Listo</button>
                    : <button type="button" onClick={() => setAbierta(pg.id)} aria-label={`Corregir «${pg.texto}»`} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[12.5px] font-semibold text-slate-600 hover:border-slate-300"><Pencil className="size-3.5" /> Corregir</button>
                ) : null}
              </div>
              {cambio ? <p className="text-[12px] text-amber-800">Respondió «{cambio.antes}»; tú lo corriges a «{cambio.despues}».</p> : null}
              {abierta === pg.id ? (
                <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
                  <CampoRespuesta pregunta={{ ...pg, pideFoto: false }} respuesta={finales[pg.id]} onChange={(r) => setCorrecciones((c) => ({ ...c, [pg.id]: r }))} />
                  {cambio ? <button type="button" onClick={() => setCorrecciones((c) => { const x = { ...c }; delete x[pg.id]; return x; })} className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-semibold text-slate-600"><RotateCcw className="size-3.5" /> Dejar lo que respondió</button> : null}
                </div>
              ) : null}
            </li>
          );
        })}
        {envio.nota ? <li className="bg-slate-50 px-3.5 py-2.5 text-sm"><b>Nota de {nombre}:</b> {envio.nota}</li> : null}
      </ol>

      <label className="block text-[12.5px] font-semibold text-slate-700">Comentario para {nombre} (obligatorio si lo regresas)
        <textarea rows={2} className={`mt-1 ${campo} h-auto py-2`} value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Ej. En la foto el comedor no se ve limpio." />
      </label>
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className={botonSecundario} disabled={!comentario.trim() || enviando} onClick={() => revisar(false)}>Regresar para corregir</button>
        <button type="button" disabled={enviando} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-green-600 px-4 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50" onClick={() => revisar(true)}><Check className="size-4" /> {enviando ? "Guardando…" : `Aprobar con ${calif ?? 0}%`}</button>
      </div>
    </div>
  );
}

export default function Revisar({ alCambiar }) {
  const { idEmpresa, persona, hoy } = useTareas();
  const desde = new Date(Date.parse(`${hoy}T12:00:00Z`) - 30 * 86400000).toISOString().slice(0, 10);
  const { data, isLoading, mutate } = useSWR(`/checador/tareas/envios?empresa=${idEmpresa}&desde=${desde}&hasta=${hoy}&estado=por_revisar`, get);
  const pendientes = useMemo(() => data?.envios ?? [], [data]);
  const [elegido, setElegido] = useState(null);
  const [aviso, setAviso] = useState("");
  const actual = pendientes.find((e) => e.id === elegido) ?? pendientes[0];
  const avisoEl = aviso ? <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{aviso}</p> : null;
  if (isLoading) return <p role="status" className="text-sm text-slate-500">Cargando…</p>;
  if (!pendientes.length) return (
    <div className="space-y-3">{avisoEl}<div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center"><p className="font-semibold">No hay checklists por revisar</p><p className="text-sm text-slate-500">Cuando alguien envíe uno, aparece aquí.</p></div></div>
  );
  return (
    <div className="space-y-3">
      {avisoEl}
      <div className="flex flex-wrap items-start gap-4">
        <ul aria-label="Por revisar" className="min-w-0 flex-[1_1_260px] space-y-2">
          {pendientes.map((e) => (
            <li key={e.id}>
              <button type="button" aria-current={e.id === actual?.id ? "true" : undefined} onClick={() => setElegido(e.id)}
                className={`flex w-full items-center gap-2.5 rounded-xl border bg-white p-3 text-left ${e.id === actual?.id ? "border-brand ring-2 ring-blue-100" : "border-slate-200 hover:border-blue-300"}`}>
                <Avatar persona={persona(e.id_empleado) ?? { nombre: e.persona, ini: "?" }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold">{e.checklist}</span>
                  <span className="block text-[12px] text-slate-500">{e.persona} · {fechaDia(e.fecha, hoy)}{e.a_tiempo ? "" : " · tarde"}</span>
                </span>
                <span className={`text-sm font-bold tabular-nums ${colorCalificacion(e.calificacion)}`}>{e.calificacion}%</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="min-w-0 flex-[999_1_620px]">
          {actual ? <Panel key={actual.id} idEnvio={actual.id} alTerminar={(t) => { setAviso(t); setElegido(null); mutate(); alCambiar?.(); }} /> : null}
        </div>
      </div>
    </div>
  );
}
