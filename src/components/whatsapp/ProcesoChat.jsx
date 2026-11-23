"use client";

// Proceso de selección desde el chat de WhatsApp (04/12/2026). El candidato de WhatsApp es una postulación más (mismas
// rutas del panel y mismas reglas del servidor que Reclutamiento → Candidatos): etapa con selector rápido, sugerencia del
// agente (un clic), notas internas con su historial, «Contratar» con el mismo formulario y «Descartar» con motivo; después
// de contratar, descartar u ofrecer, «Avisarle por WhatsApp» con texto editable (solo se envía al confirmarlo).
// Escritorio: atajos Alt+Mayús+(E, N, A, C, D). Teléfono: se abre como hoja inferior con botones de 44 px.
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { mutate as mutarClave } from "swr";
import { ChevronRight, ExternalLink, Plus, Sparkles, UserCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAccionesPostulacion, usePostulacion } from "@/hooks/useReclutamiento";
import { cambiarEtapa, iniciarProcesoChat, rutaPostulacion } from "@/lib/reclutamiento/api";
import { ETAPA_A_VISTA, VISTA_A_ETAPA, mensajeError, urlEmpleado } from "@/lib/reclutamiento/adaptador.mjs";
import { ETAPAS_RAPIDAS, acciones, atajo, siguienteEtapa, textoAtajo, textoEtapa, textoSugerencia } from "@/lib/reclutamiento/procesoWhatsapp.mjs";
import { formatDate, formatDateTime } from "@/lib/reclutamiento/model";
import { Modal } from "@/components/reclutamiento/RecruitmentUI";
import HiringForm from "@/components/reclutamiento/HiringForm";
import { AvisoWhatsapp, DialogoDescartar } from "@/components/reclutamiento/ProcesoWhatsapp";
import { candidateHref } from "@/components/reclutamiento/navigation";
import r from "@/components/reclutamiento/reclutamiento.module.css";

const TONO = {
  nuevo: "bg-blue-50 text-blue-800 ring-blue-200",
  revision: "bg-violet-50 text-violet-800 ring-violet-200",
  entrevista: "bg-amber-50 text-amber-900 ring-amber-200",
  oferta: "bg-sky-50 text-sky-800 ring-sky-200",
  contratado: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  descartado: "bg-gray-100 text-gray-700 ring-gray-200",
};

export function ChipEtapa({ etapa, className = "" }) {
  if (!etapa) return null;
  return (
    <span data-etapa={etapa} className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${TONO[etapa] ?? TONO.nuevo} ${className}`}>
      {textoEtapa(etapa)}
    </span>
  );
}

// Aceptar la sugerencia del agente con un clic (también desde el aviso del hilo, junto a la cita).
async function aceptarSugerencia(idPostulacion, etapa) {
  const postulacion = await cambiarEtapa(idPostulacion, { etapa, sugerencia: true });
  mutarClave(rutaPostulacion(idPostulacion), { postulacion }, { revalidate: false });
  return postulacion;
}

// Aviso en el hilo, junto a la cita: «El agente sugiere pasar a Entrevista · Pasar» (p. ej. al agendar). En escritorio
// ancho (≥1280 px) no se repite: la misma sugerencia está arriba en la columna del candidato.
export function BannerSugerencia({ proceso, onCambio }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const texto = textoSugerencia(proceso?.sugerencia);
  if (!texto || !proceso?.id_postulacion) return null;
  const etapa = proceso.sugerencia.etapa;
  const aceptar = async () => {
    setBusy(true);
    setError("");
    try {
      await aceptarSugerencia(proceso.id_postulacion, etapa);
      await onCambio?.(`Etapa: ${textoEtapa(etapa)}.`);
    } catch (e) {
      setError(mensajeError(e, "No se pudo cambiar la etapa."));
      await onCambio?.();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div role="status" data-banner-sugerencia={etapa} className="flex flex-wrap xl:hidden items-center gap-2 border-b border-violet-200 bg-violet-50 px-3 py-2 text-[13px] text-violet-950 md:px-4">
      <Sparkles className="size-4 shrink-0 text-violet-600" aria-hidden="true" />
      <span className="min-w-0 flex-1 font-medium">{texto}</span>
      <Button type="button" size="sm" onClick={aceptar} loading={busy} className="min-h-11 bg-violet-700 hover:bg-violet-800 md:min-h-8">
        Pasar a {textoEtapa(etapa)}
      </Button>
      {error ? <p role="alert" className="w-full text-[12.5px] text-red-700">{error}</p> : null}
    </div>
  );
}

const enCampo = (el) => Boolean(el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)));

// proceso: hilo.proceso (o null). puedeIniciar: aceptó el aviso pero aún no tiene proceso. conversacion: la del hilo.
// onCambio(anuncio?): refrescar la conversación y la lista. atajos: escuchar los atajos de teclado (una sola instancia).
// enHoja: dentro de la hoja inferior (su encabezado ya dice «Proceso de selección»).
export default function ProcesoChat({ proceso, puedeIniciar = false, conversacion, empresa = "", onCambio, atajos = false, enHoja = false }) {
  const idPostulacion = proceso?.id_postulacion ?? null;
  const { detail, error: errorDetalle, mutate: recargarDetalle } = usePostulacion(idPostulacion);
  // El hilo se consulta cada 3 s: si cambió la etapa o la sugerencia (p. ej. al agendar una cita), se trae el expediente.
  const firmaHilo = `${proceso?.etapa ?? ""}|${proceso?.sugerencia?.etapa ?? ""}`;
  useEffect(() => { if (idPostulacion) recargarDetalle(); }, [firmaHilo, idPostulacion, recargarDetalle]);
  const alCambiar = useCallback(() => onCambio?.(), [onCambio]);
  const accionesApi = useAccionesPostulacion(idPostulacion, { alCambiar });
  const [moviendo, setMoviendo] = useState(null);
  const [error, setError] = useState("");
  const [nota, setNota] = useState("");
  const [guardandoNota, setGuardandoNota] = useState(false);
  const [contratar, setContratar] = useState(false);
  const [descartar, setDescartar] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [iniciando, setIniciando] = useState(false);
  const raiz = useRef(null);
  const campoNota = useRef(null);

  const etapaActual = detail ? VISTA_A_ETAPA[detail.stage] : proceso?.etapa;
  const puede = acciones(etapaActual);
  // Con el expediente cargado manda el expediente (lo que respondió el servidor tras cada cambio); antes, la del hilo.
  const sugerencia = detail
    ? detail.whatsapp?.suggestion ? { etapa: VISTA_A_ETAPA[detail.whatsapp.suggestion.stage] } : null
    : proceso?.sugerencia ?? null;

  const mover = useCallback(async (etapa, opciones) => {
    if (!idPostulacion || moviendo) return false;
    setMoviendo(etapa);
    setError("");
    const res = await accionesApi.changeStage(idPostulacion, ETAPA_A_VISTA[etapa], opciones);
    setMoviendo(null);
    if (!res.ok) { setError(res.message); return false; }
    onCambio?.(`Etapa: ${textoEtapa(etapa)}.`);
    if (etapa === "oferta" || etapa === "descartado") setAviso(etapa);
    return true;
  }, [accionesApi, idPostulacion, moviendo, onCambio]);

  const guardarNota = async () => {
    const texto = nota.trim();
    if (!texto || !idPostulacion) return;
    setGuardandoNota(true);
    setError("");
    const res = await accionesApi.addNote(idPostulacion, texto);
    setGuardandoNota(false);
    if (res.ok) { setNota(""); onCambio?.("Nota guardada."); } else setError(res.message);
  };

  const iniciar = async () => {
    setIniciando(true);
    setError("");
    try {
      await iniciarProcesoChat(conversacion.id);
      await onCambio?.("Ya está en el proceso de selección como «Nuevo».");
    } catch (e) {
      setError(mensajeError(e, "No se pudo iniciar su proceso."));
    } finally {
      setIniciando(false);
    }
  };

  // Atajos de escritorio (solo la instancia visible que los pide; nunca mientras se escribe en un campo).
  useEffect(() => {
    if (!atajos || !idPostulacion) return undefined;
    const alTeclear = (e) => {
      const accion = atajo({ code: e.code, altKey: e.altKey, shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, metaKey: e.metaKey, enCampo: enCampo(e.target) });
      if (!accion || !raiz.current?.offsetParent) return;
      e.preventDefault();
      if (accion === "nota") campoNota.current?.focus();
      else if (accion === "siguiente" && puede.mover && siguienteEtapa(etapaActual)) mover(siguienteEtapa(etapaActual));
      else if (accion === "sugerencia" && sugerencia?.etapa) mover(sugerencia.etapa, { sugerencia: true });
      else if (accion === "contratar" && puede.contratar) setContratar(true);
      else if (accion === "descartar" && puede.descartar) setDescartar(true);
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [atajos, idPostulacion, etapaActual, puede.mover, puede.contratar, puede.descartar, sugerencia?.etapa, mover]);

  if (!proceso) {
    return (
      <section ref={raiz} aria-label="Proceso de selección" data-proceso-chat="sin-proceso" className="grid gap-2 rounded-xl border border-gray-200 bg-white p-3 text-[13px] text-gray-700">
        <h3 className="text-[12px] font-bold uppercase tracking-wide text-gray-500">Proceso de selección</h3>
        {puedeIniciar ? (
          <>
            <p>Aceptó el aviso de privacidad. Llévalo en el mismo proceso que las postulaciones de la página.</p>
            <Button type="button" onClick={iniciar} loading={iniciando} startIcon={<Plus className="size-4" />} className="min-h-11 md:min-h-9" data-iniciar-proceso="">
              Iniciar proceso
            </Button>
          </>
        ) : (
          <p>Entra al proceso como «Nuevo» en cuanto acepte el aviso de privacidad y empiece la entrevista.</p>
        )}
        {error ? <p role="alert" className="text-[12.5px] text-red-700">{error}</p> : null}
      </section>
    );
  }

  const empleado = detail?.hiring?.employeeId ?? null;
  const notas = detail ? [...detail.notes].reverse() : [];
  const historial = detail ? [...detail.activity].reverse() : [];
  return (
    <section ref={raiz} aria-label="Proceso de selección" data-proceso-chat={etapaActual} className="grid gap-3 rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className={enHoja ? "sr-only" : "text-[12px] font-bold uppercase tracking-wide text-gray-500"}>Proceso de selección</h3>
        {enHoja ? <span className="text-[12.5px] font-semibold text-gray-600">Etapa actual</span> : null}
        <ChipEtapa etapa={etapaActual} className="px-2.5 py-1 text-[12.5px]" />
        <Link href={candidateHref(idPostulacion)} className="ml-auto inline-flex min-h-11 items-center gap-1 text-[12.5px] font-semibold text-blue-700 underline-offset-2 hover:underline md:min-h-0">
          Reclutamiento <ExternalLink className="size-3.5" aria-hidden="true" />
        </Link>
      </div>

      {sugerencia?.etapa && puede.mover ? (
        <div role="status" data-sugerencia={sugerencia.etapa} className="grid gap-2 rounded-lg bg-violet-50 p-2.5 text-[13px] text-violet-950">
          <p className="flex items-start gap-1.5 font-semibold"><Sparkles className="mt-0.5 size-4 shrink-0 text-violet-600" aria-hidden="true" />{textoSugerencia(sugerencia)}</p>
          {detail?.whatsapp?.suggestion?.reason ? <p className="text-[12.5px]">{detail.whatsapp.suggestion.reason}</p> : null}
          <Button type="button" size="sm" onClick={() => mover(sugerencia.etapa, { sugerencia: true })} loading={moviendo === sugerencia.etapa}
            title={atajos ? textoAtajo("sugerencia") : undefined} className="min-h-11 bg-violet-700 hover:bg-violet-800 md:min-h-8">
            Pasar a {textoEtapa(sugerencia.etapa)}
          </Button>
        </div>
      ) : null}

      {puede.mover ? (
        <div role="group" aria-label="Cambiar etapa" className="grid grid-cols-2 gap-1.5">
          {ETAPAS_RAPIDAS.map((e) => {
            const actual = e === etapaActual;
            return (
              <button key={e} type="button" aria-pressed={actual} disabled={actual || Boolean(moviendo)} onClick={() => mover(e)}
                data-mover-a={e}
                title={atajos && e === siguienteEtapa(etapaActual) ? textoAtajo("siguiente") : undefined}
                className={`inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border px-2 text-[13px] font-semibold transition-colors md:min-h-9 ${
                  actual ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 bg-white text-gray-800 hover:bg-gray-50 disabled:opacity-60"}`}>
                {moviendo === e ? "Guardando…" : textoEtapa(e)}
                {!actual && e === siguienteEtapa(etapaActual) ? <ChevronRight className="size-3.5" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {puede.contratar ? (
          <Button type="button" onClick={() => setContratar(true)} startIcon={<UserCheck className="size-4" />} data-abrir-contratar=""
            title={atajos ? textoAtajo("contratar") : undefined} className="min-h-11 flex-1 bg-emerald-700 hover:bg-emerald-800 md:min-h-9">
            Contratar
          </Button>
        ) : null}
        {puede.descartar ? (
          <Button type="button" variant="outline" onClick={() => setDescartar(true)} startIcon={<XCircle className="size-4 text-red-600" />} data-abrir-descartar=""
            title={atajos ? textoAtajo("descartar") : undefined} className="min-h-11 flex-1 md:min-h-9">
            Descartar
          </Button>
        ) : null}
      </div>
      {etapaActual === "descartado" ? (
        <p className="text-[12.5px] text-gray-600">El agente ya no lo entrevista. Si vuelve a escribir, la conversación te pedirá atención. Para retomarlo, elige otra etapa.</p>
      ) : null}
      {etapaActual === "contratado" ? (
        <div className="grid gap-1.5 rounded-lg bg-emerald-50 p-2.5 text-[13px] text-emerald-900" data-contratado="">
          <p className="font-semibold">Contratado{detail?.hiring?.startDate ? ` · ingresa el ${formatDate(detail.hiring.startDate)}` : ""}.</p>
          <p className="text-[12.5px]">El agente ya no lo entrevista; si escribe, la conversación te pedirá atención.</p>
          {empleado ? (
            <Link href={urlEmpleado(empleado)} data-ver-empleado={empleado} className="inline-flex min-h-11 items-center gap-1 font-semibold text-emerald-800 underline underline-offset-2 md:min-h-0">
              Ver ficha del empleado{detail?.employee?.name ? ` (${detail.employee.name})` : ""} <ExternalLink className="size-3.5" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      ) : null}

      {error || errorDetalle ? <p role="alert" className="text-[12.5px] text-red-700">{error || mensajeError(errorDetalle, "No se pudo cargar el proceso.")}</p> : null}

      {aviso && detail?.whatsapp ? (
        <div className={r.root}>
          <AvisoWhatsapp key={aviso} compact tipo={aviso} conversationId={conversacion?.id} windowOpen={conversacion?.ventana_abierta !== false} template={detail.whatsapp.template}
            datos={{
              nombre: detail.name, vacante: detail.vacancy?.title || conversacion?.vacante?.titulo, empresa,
              fechaIngreso: detail.hiring.startDate, sucursal: detail.branches.find((b) => b.id === detail.hiring.branchId)?.name,
            }}
            onDone={(enviado) => { if (enviado) onCambio?.("Aviso enviado por WhatsApp."); else setAviso(null); }} />
        </div>
      ) : null}

      <div className="grid gap-1.5">
        <label htmlFor={`nota-${idPostulacion}`} className="text-[12px] font-bold uppercase tracking-wide text-gray-500">
          Notas internas <span className="font-normal normal-case tracking-normal text-gray-500">· el candidato no las ve</span>
        </label>
        <textarea id={`nota-${idPostulacion}`} ref={campoNota} value={nota} maxLength={3000} rows={2} onChange={(e) => setNota(e.target.value)}
          placeholder={atajos ? `Escribe una nota (${textoAtajo("nota")})` : "Escribe una nota"}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); guardarNota(); } }}
          className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:text-[13px]" />
        <Button type="button" size="sm" variant="outline" onClick={guardarNota} loading={guardandoNota} disabled={!nota.trim()} data-guardar-nota=""
          startIcon={<Plus className="size-4" />} className="min-h-11 justify-self-start md:min-h-8">
          Guardar nota
        </Button>
        {notas.length ? (
          <ul className="grid gap-1.5" aria-label="Notas del equipo">
            {notas.slice(0, 3).map((n) => (
              <li key={n.id} data-nota="" className="rounded-lg bg-amber-50 p-2 text-[13px] text-gray-800 [overflow-wrap:anywhere]">
                {n.text}
                <span className="mt-1 block text-[11.5px] text-gray-500">{n.author ? `${n.author} · ` : ""}{formatDateTime(n.at)}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {notas.length > 3 ? <Link href={candidateHref(idPostulacion, "activity")} className="text-[12.5px] font-semibold text-blue-700">Ver las {notas.length} notas</Link> : null}
      </div>

      {historial.length ? (
        <details className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-[13px]">
          <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-gray-700 md:min-h-8">Historial ({historial.length})</summary>
          <ol className="mt-1 grid gap-1.5 pb-1" aria-label="Historial del proceso">
            {historial.map((h) => (
              <li key={h.id} className="text-[12.5px] text-gray-700 [overflow-wrap:anywhere]">
                {h.text}
                <span className="block text-[11.5px] text-gray-500">{h.author ? `${h.author} · ` : ""}{formatDateTime(h.at)}</span>
              </li>
            ))}
          </ol>
        </details>
      ) : null}

      {atajos ? (
        <p className="hidden text-[11.5px] text-gray-500 xl:block">Atajos: Alt+Mayús+E siguiente etapa · N nota · A aceptar sugerencia · C contratar · D descartar</p>
      ) : null}

      {contratar && detail ? (
        <Modal title="Contratar" description={`${detail.name} · ${detail.vacancy?.title || conversacion?.vacante?.titulo || "Vacante"}`} onClose={() => setContratar(false)}>
          <HiringForm key={`${detail.id}-${detail.stage}`} person={detail} branches={detail.branches} vacancy={detail.vacancy} actions={accionesApi} compact
            onHired={() => { setContratar(false); setAviso("contratado"); onCambio?.("Contratación completada."); }} />
        </Modal>
      ) : null}
      {descartar && detail ? (
        <DialogoDescartar name={detail.name} whatsapp onClose={() => setDescartar(false)} onConfirm={(motivo) => mover("descartado", { motivo })} />
      ) : null}
    </section>
  );
}
