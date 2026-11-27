"use client";
// Comentarios de una publicación (maqueta «Comentarios», aprobada 27/11/2026): texto plano ≤ 1000, una respuesta de
// nivel, «Me gusta» en comentarios, reportar (uno por persona), borrar el propio (borrado lógico). Si tiene una palabra
// bloqueada queda «en revisión» (solo su autor lo ve) hasta que RH lo publique. Sin anónimos.
// Backend: GET|POST /mi/:id/comentarios, DELETE /mi/comentarios/:id, POST /mi/comentarios/:id/me-gusta, POST …/reportar.
import { useState } from "react";
import useSWRInfinite from "swr/infinite";
import { Ventana } from "@/components/avisos/Ventana";
import axios from "@/lib/axios";
import { API_MI, LIMITES, errorDe, fechaHora, haceCuanto, hilos, validarComentario } from "@/lib/comunicados/comunicados.mjs";
import useMeGusta from "./useMeGusta";
import { Avatar, TextoPlano, botonPrimario, botonSecundario, entrada } from "./comun";

const get = (url) => axios.get(url).then((r) => r.data);
const urlMeGusta = (id) => `${API_MI}/comentarios/${encodeURIComponent(id)}/me-gusta`;
const accion = "inline-flex min-h-11 items-center rounded-lg px-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900";

function Escribir({ id, padre = null, alEnviar, alCancelar, autoFocus = false }) {
  const [texto, setTexto] = useState("");
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const campo = padre ? `respuesta-${padre.id}` : "nuevo-comentario";
  const enviar = async (e) => {
    e.preventDefault();
    const err = validarComentario(texto);
    if (err) { setError(err); return; }
    setEnviando(true); setError(null);
    try { await alEnviar(texto.trim(), padre?.id ?? null); setTexto(""); alCancelar?.(); }
    catch (x) { setError(errorDe(x, "No se pudo publicar tu comentario.")); }
    finally { setEnviando(false); }
  };
  return (
    <form onSubmit={enviar} className="grid gap-2" data-escribir={padre ? `respuesta-${padre.id}` : "comentario"}>
      <label htmlFor={campo} className="sr-only">{padre ? `Responder a ${padre.autor?.nombre ?? ""}` : "Escribe un comentario"}</label>
      <textarea id={campo} rows={2} maxLength={LIMITES.comentario} value={texto} autoFocus={autoFocus} onChange={(e) => { setTexto(e.target.value); setError(null); }}
        placeholder={padre ? "Escribe tu respuesta…" : "Escribe un comentario…"} aria-invalid={Boolean(error)} aria-describedby={`${campo}-ayuda`}
        className={`${entrada} min-h-12 py-2.5 text-base`} />
      <div className="flex flex-wrap items-center gap-2">
        <span id={`${campo}-ayuda`} className={`flex-1 text-[13px] ${error ? "text-red-700" : "text-slate-500"}`} aria-live="polite">{error ?? `${texto.length}/${LIMITES.comentario}`}</span>
        {alCancelar ? <button type="button" className={botonSecundario} onClick={alCancelar}>Cancelar</button> : null}
        <button type="submit" className={botonPrimario} disabled={enviando || !texto.trim()}>{enviando ? "Enviando…" : padre ? "Responder" : "Comentar"}</button>
      </div>
    </form>
  );
}

function Reportar({ comentario, alCerrar, alReportar }) {
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const ok = async () => { setEnviando(true); setError(null); try { await alReportar(motivo.trim()); alCerrar(); } catch (e) { setError(errorDe(e)); } finally { setEnviando(false); } };
  return (
    <Ventana abierta={Boolean(comentario)} onOpenChange={(o) => !o && alCerrar()} hoja titulo="Reportar comentario" descripcion="RH lo revisa. Quien lo escribió no sabe quién lo reportó.">
      <div className="grid gap-3 px-4 pb-5 pt-3 sm:px-6">
        <label htmlFor="reporte-motivo" className="text-sm font-semibold text-slate-800">¿Qué pasa con este comentario? (opcional)</label>
        <textarea id="reporte-motivo" rows={3} maxLength={LIMITES.motivo} value={motivo} onChange={(e) => setMotivo(e.target.value)} className={`${entrada} py-2`} />
        {error ? <p role="alert" className="text-[13px] text-red-700">{error}</p> : null}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className={botonSecundario} onClick={alCerrar}>Cancelar</button>
          <button type="button" className={`${botonPrimario} bg-red-600 hover:bg-red-700`} disabled={enviando} onClick={ok}>{enviando ? "Enviando…" : "Reportar"}</button>
        </div>
      </div>
    </Ventana>
  );
}

function Borrar({ comentario, alCerrar, alBorrar }) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const ok = async () => { setEnviando(true); setError(null); try { await alBorrar(); alCerrar(); } catch (e) { setError(errorDe(e)); } finally { setEnviando(false); } };
  return (
    <Ventana abierta={Boolean(comentario)} onOpenChange={(o) => !o && alCerrar()} hoja titulo="Borrar tu comentario">
      <div className="grid gap-3 px-4 pb-5 pt-3 sm:px-6">
        <p className="text-sm text-slate-700">Ya no se verá en el muro.</p>
        {error ? <p role="alert" className="text-[13px] text-red-700">{error}</p> : null}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className={botonSecundario} onClick={alCerrar}>Cancelar</button>
          <button type="button" className={`${botonPrimario} bg-red-600 hover:bg-red-700`} disabled={enviando} onClick={ok}>{enviando ? "Borrando…" : "Borrar"}</button>
        </div>
      </div>
    </Ventana>
  );
}

function Comentario({ c, raiz, tz, megusta, puede, alResponder, alReportar, alBorrar }) {
  const autor = c.autor?.nombre || "Empleado";
  if (c.borrado || c.estado === "borrado") return <p className="py-2 pl-12 text-[13px] italic text-slate-500">Comentario eliminado</p>;
  const n = Number(c.reacciones) || 0;
  return (
    <div className="flex gap-3" data-comentario={c.id}>
      <Avatar nombre={autor} />
      <div className="min-w-0 flex-1">
        <div className={`rounded-2xl px-3 py-2 ${c.estado === "retenido" ? "border border-amber-200 bg-amber-50" : "bg-slate-100"}`}>
          <p className="text-[13px] font-bold text-slate-900">{autor}</p>
          <TextoPlano className="text-[15px] leading-snug text-slate-800">{c.texto}</TextoPlano>
          {c.estado === "retenido" ? <p className="mt-1 text-[13px] font-semibold text-amber-900">En revisión: se publicará cuando RH lo revise.</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-1 text-[13px] text-slate-500">
          <span className="px-2" title={fechaHora(c.creado_en, { tz })}>{haceCuanto(c.creado_en, { tz })}</span>
          {c.estado !== "retenido" ? (
            <button type="button" className={`${accion} ${c.me_gusta ? "text-[#2563EB]" : ""}`} aria-pressed={Boolean(c.me_gusta)} disabled={megusta.ocupado(c.id)} onClick={() => megusta.alternar(c)}
              aria-label={`Me gusta${n ? `, ${n}` : ""}`} data-me-gusta-comentario={c.id}>Me gusta{n ? ` (${n})` : ""}</button>
          ) : null}
          {puede && c.estado !== "retenido" ? <button type="button" className={accion} onClick={() => alResponder(raiz)}>Responder</button> : null}
          {c.propio ? <button type="button" className={accion} onClick={() => alBorrar(c)}>Borrar</button> : <button type="button" className={accion} onClick={() => alReportar(c)}>Reportar</button>}
        </div>
      </div>
    </div>
  );
}

export default function Comentarios({ id, permite = true, tz, alCambiarTotal }) {
  const llave = (i, previa) => (i === 0 ? `${API_MI}/${encodeURIComponent(id)}/comentarios` : previa?.siguiente ? `${API_MI}/${encodeURIComponent(id)}/comentarios?cursor=${encodeURIComponent(previa.siguiente)}` : null);
  const { data, error, isLoading, size, setSize, mutate } = useSWRInfinite(llave, get, { revalidateOnMount: true, revalidateAll: true, revalidateOnFocus: false, shouldRetryOnError: false });
  const megusta = useMeGusta(urlMeGusta);
  const [respondiendo, setRespondiendo] = useState(null);
  const [reportando, setReportando] = useState(null);
  const [borrando, setBorrando] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const primera = data?.[0];
  const puede = permite && primera?.puede_comentar !== false;
  const lista = hilos((data ?? []).flatMap((p) => p?.items ?? [])).map((c) => ({ ...megusta.aplicar(c), respuestas: (c.respuestas ?? []).map(megusta.aplicar) }));
  const hayMas = Boolean(data?.[data.length - 1]?.siguiente);

  const enviar = async (texto, padreId) => {
    const r = await axios.post(`${API_MI}/${encodeURIComponent(id)}/comentarios`, { texto, padre_id: padreId });
    setMensaje(r.data?.estado === "retenido" ? "Tu comentario quedó en revisión: se publicará cuando RH lo revise." : null);
    await mutate();
    alCambiarTotal?.(1);
  };
  const reportar = async (motivo) => {
    const r = await axios.post(`${API_MI}/comentarios/${encodeURIComponent(reportando.id)}/reportar`, { motivo });
    setMensaje(r.data?.ya_reportado ? "Ya lo habías reportado. RH lo revisará." : "Gracias. RH revisará el comentario.");
    if (r.data?.oculto) await mutate();
  };
  const borrar = async () => {
    await axios.delete(`${API_MI}/comentarios/${encodeURIComponent(borrando.id)}`);
    setMensaje("Borraste tu comentario.");
    await mutate();
    alCambiarTotal?.(-1);
  };
  const props = { tz, megusta, puede, alResponder: setRespondiendo, alReportar: setReportando, alBorrar: setBorrando };

  return (
    <section id="comentarios" aria-labelledby="comentarios-titulo" className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4" data-comentarios>
      <h2 id="comentarios-titulo" className="text-[17px] font-extrabold text-slate-900">Comentarios</h2>
      {mensaje ? <p role="status" className="rounded-xl bg-blue-50 p-3 text-[13px] text-blue-900">{mensaje}</p> : null}
      {megusta.error ? <p role="alert" className="text-[13px] text-red-700">{megusta.error}</p> : null}
      {error ? <p role="alert" className="text-sm text-red-800">{errorDe(error, "No se pudieron cargar los comentarios.")}</p> : null}
      {isLoading && !data ? <p role="status" className="text-sm text-slate-500">Cargando comentarios…</p> : null}
      {data && !lista.length ? <p className="text-[15px] text-slate-600">{puede ? "Sé el primero en comentar." : "Sin comentarios."}</p> : null}
      <ul className="grid gap-4">
        {lista.map((c) => (
          <li key={c.id} className="grid gap-3">
            <Comentario c={c} raiz={c} {...props} />
            {c.respuestas?.length || respondiendo?.id === c.id ? (
              <ul className="ml-12 grid gap-3 border-l-2 border-slate-100 pl-3">
                {c.respuestas.map((r) => <li key={r.id}><Comentario c={r} raiz={c} {...props} /></li>)}
                {respondiendo?.id === c.id ? <li><Escribir id={id} padre={c} autoFocus alEnviar={enviar} alCancelar={() => setRespondiendo(null)} /></li> : null}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
      {hayMas ? <button type="button" className={botonSecundario} onClick={() => setSize(size + 1)}>Ver más comentarios</button> : null}
      {puede ? <Escribir id={id} alEnviar={enviar} />
        : <p className="rounded-xl bg-slate-50 p-3 text-[13px] text-slate-600">{primera?.suspendido_hasta ? `Recursos Humanos pausó tus comentarios hasta el ${fechaHora(primera.suspendido_hasta, { tz })}.` : "Los comentarios están cerrados en esta publicación."}</p>}
      <Reportar comentario={reportando} alCerrar={() => setReportando(null)} alReportar={reportar} />
      <Borrar comentario={borrando} alCerrar={() => setBorrando(null)} alBorrar={borrar} />
    </section>
  );
}
