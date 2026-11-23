"use client";

// Revisar checklists enviados (prototipo 23/11/2026). El jefe ve cada respuesta con su puntaje y foto, y puede CORREGIRLA
// (decisión A del dueño): la calificación se recalcula y queda «Respondió X → corregido a Y por Fulano». Aprobar, o
// regresar para corregir con comentario.
import { useMemo, useState } from "react";
import { Check, Pencil, RotateCcw } from "lucide-react";
import { aplicarCorrecciones, calificarRespuestas, esCalificable, puntajePregunta, textoRespuesta } from "@/lib/tareas/preguntas.mjs";
import { cumplimientoPorPersona, fotoVigente } from "@/lib/tareas/reglas.mjs";
import { masDias } from "@/lib/tareas/demo.mjs";
import { useTareas } from "./store";
import { CampoRespuesta, ChipPuntaje, IconoTipo } from "./Preguntas";
import { Avatar, botonSecundario, campo, colorCalificacion, fechaDia } from "./comun";

function Foto({ url, fecha, hoy }) {
  if (!url) return null;
  if (!fotoVigente(fecha, hoy)) return <span className="text-[11px] text-slate-400">Foto borrada (más de 3 meses)</span>;
  return url.startsWith("blob:") ? <img src={url} alt="Foto de evidencia" className="h-12 w-16 rounded-md object-cover" /> : <span className="grid h-12 w-16 place-items-center rounded-md bg-slate-300 text-[10px] text-slate-700">Foto</span>;
}

function Panel({ envio, alTerminar }) {
  const { checklist, persona, despachar, envios, hoy, jefe } = useTareas();
  const ck = checklist(envio.checklist);
  const base = envio.respuestasPersona ?? envio.respuestas ?? {};
  const [correcciones, setCorrecciones] = useState({});
  const [abierta, setAbierta] = useState(null);
  const [comentario, setComentario] = useState("");
  const { finales, cambios } = aplicarCorrecciones(ck.preguntas, base, correcciones);
  const calif = calificarRespuestas(ck.preguntas, finales);
  const original = calificarRespuestas(ck.preguntas, base);
  const p = persona(envio.persona);
  const historial = cumplimientoPorPersona(envios.filter((e) => e.persona === envio.persona), { desde: masDias(hoy, -7), hasta: masDias(hoy, -1) })[0];
  const nombre = p.nombre.split(" ")[0];
  const revisar = (aprobar) => {
    despachar({ tipo: "revisar", id: envio.id, correcciones, aprobar, comentario, por: jefe.nombre });
    alTerminar(aprobar ? `Aprobado con ${calif}%${cambios.length ? ` (corregiste ${cambios.length})` : ""}.` : `Regresado a ${nombre} con tu comentario.`);
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <Avatar persona={p} tam="size-10" />
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-extrabold text-[#080d36]">{ck.nombre} · {p.sucursal}</h3>
          <p className="text-[13px] text-slate-600">Lo envió <b>{p.nombre}</b> {fechaDia(envio.fecha, hoy).toLowerCase()} a las {envio.hora} {envio.aTiempo ? <span className="font-semibold text-green-700">(a tiempo)</span> : <span className="font-semibold text-amber-700">(tarde: límite {ck.hora})</span>}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-center">
          <p className={`text-2xl font-extrabold tabular-nums ${colorCalificacion(calif)}`} data-calificacion>{calif ?? "—"}%</p>
          <p className="text-[11.5px] text-slate-500">{cambios.length ? <>con tus correcciones · <s>{original}%</s></> : "calificación"}</p>
        </div>
      </div>

      <ol className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {ck.preguntas.map((pg, i) => {
          const rBase = base[pg.id];
          const rFinal = finales[pg.id];
          const cambio = cambios.find((c) => c.pregunta === pg.id);
          const puntaje = puntajePregunta(pg, rFinal);
          return (
            <li key={pg.id} className={`space-y-2 px-3.5 py-3 ${puntaje != null && puntaje < 100 ? "bg-red-50/50" : ""}`}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span className="flex min-w-0 flex-[1_1_240px] items-center gap-2 text-sm">
                  <IconoTipo tipo={pg.tipo} className="size-4 shrink-0 text-slate-400" />
                  <span className="font-medium">{i + 1}. {pg.texto}</span>
                  {esCalificable(pg) ? <span className="text-[11px] font-semibold text-slate-400">peso {pg.peso}</span> : null}
                </span>
                <span className="text-sm">
                  {cambio ? <><s className="text-slate-400">{cambio.antes}</s> → <b className="text-[#080d36]">{cambio.despues}</b></> : <b className="text-[#080d36]">{textoRespuesta(pg, rBase)}</b>}
                </span>
                {pg.tipo === "firma" ? (rBase?.valor?.startsWith?.("blob:") ? <img src={rBase.valor} alt={`Firma: ${pg.texto}`} className="h-12 rounded-md border border-slate-200 bg-white object-contain" /> : null) : <Foto url={pg.tipo === "foto" ? rBase?.valor : rBase?.foto} fecha={envio.fecha} hoy={hoy} />}
                {esCalificable(pg) ? <ChipPuntaje valor={puntaje} /> : null}
                {esCalificable(pg) && pg.tipo !== "foto" ? (
                  abierta === pg.id ? (
                    <button type="button" onClick={() => setAbierta(null)} className="min-h-9 rounded-lg px-2 text-[12.5px] font-semibold text-brand">Listo</button>
                  ) : (
                    <button type="button" onClick={() => setAbierta(pg.id)} aria-label={`Corregir «${pg.texto}»`} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[12.5px] font-semibold text-slate-600 hover:border-slate-300"><Pencil className="size-3.5" /> Corregir</button>
                  )
                ) : null}
              </div>
              {cambio ? <p className="text-[12px] text-amber-800">Respondió «{cambio.antes}»; tú lo corriges a «{cambio.despues}».</p> : null}
              {abierta === pg.id ? (
                <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
                  <CampoRespuesta pregunta={{ ...pg, pideFoto: false }} respuesta={rFinal} onChange={(r) => setCorrecciones((c) => ({ ...c, [pg.id]: r }))} />
                  {cambio ? <button type="button" onClick={() => setCorrecciones((c) => { const x = { ...c }; delete x[pg.id]; return x; })} className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-semibold text-slate-600"><RotateCcw className="size-3.5" /> Dejar lo que respondió</button> : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      {envio.cambios?.length && envio.estado !== "por_revisar" ? <p className="text-[12.5px] text-slate-500">Antes: {envio.cambios.map((c) => `«${c.texto}» ${c.antes} → ${c.despues}`).join(" · ")}</p> : null}
      <label className="block text-[12.5px] font-semibold text-slate-700">Comentario para {nombre} (obligatorio si lo regresas)
        <textarea rows={2} className={`mt-1 ${campo} h-auto py-2`} value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Ej. En la foto el comedor no se ve limpio." />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        {historial ? <p className="text-[12.5px] text-slate-500">Últimos 7 días: {historial.promedio ?? "—"}% promedio · {historial.aTiempo} a tiempo · {historial.tarde} tarde · {historial.noEnviados} sin enviar</p> : null}
        <span className="ml-auto flex gap-2">
          <button type="button" className={botonSecundario} disabled={!comentario.trim()} onClick={() => revisar(false)}>Regresar para corregir</button>
          <button type="button" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-green-600 px-4 text-sm font-semibold text-white hover:bg-green-700" onClick={() => revisar(true)}><Check className="size-4" /> Aprobar con {calif}%</button>
        </span>
      </div>
    </div>
  );
}

export default function Revisar() {
  const { envios, checklist, persona, hoy } = useTareas();
  const pendientes = useMemo(() => envios.filter((e) => e.estado === "por_revisar").sort((a, b) => a.fecha.localeCompare(b.fecha)), [envios]);
  const [elegido, setElegido] = useState(null);
  const [aviso, setAviso] = useState("");
  const actual = pendientes.find((e) => e.id === elegido) ?? pendientes[0];
  const avisoEl = aviso ? <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{aviso}</p> : null;
  if (!pendientes.length) return (
    <div className="space-y-3">{avisoEl}<div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center"><p className="font-semibold">No hay checklists por revisar</p><p className="text-sm text-slate-500">Cuando alguien envíe uno, aparece aquí.</p></div></div>
  );
  return (
    <div className="space-y-3">
      {avisoEl}
      <div className="flex flex-wrap items-start gap-4">
        <ul aria-label="Por revisar" className="min-w-0 flex-[1_1_260px] space-y-2">
          {pendientes.map((e) => {
            const p = persona(e.persona);
            return (
              <li key={e.id}>
                <button type="button" aria-current={e.id === actual?.id ? "true" : undefined} onClick={() => setElegido(e.id)}
                  className={`flex w-full items-center gap-2.5 rounded-xl border bg-white p-3 text-left ${e.id === actual?.id ? "border-brand ring-2 ring-blue-100" : "border-slate-200 hover:border-blue-300"}`}>
                  <Avatar persona={p} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold">{checklist(e.checklist).nombre}</span>
                    <span className="block text-[12px] text-slate-500">{p.nombre} · {fechaDia(e.fecha, hoy)} {e.hora}{e.aTiempo ? "" : " · tarde"}</span>
                  </span>
                  <span className={`text-sm font-bold tabular-nums ${colorCalificacion(e.calificacion)}`}>{e.calificacion}%</span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="min-w-0 flex-[999_1_620px]">{actual ? <Panel key={actual.id} envio={actual} alTerminar={(t) => { setAviso(t); setElegido(null); }} /> : null}</div>
      </div>
    </div>
  );
}
