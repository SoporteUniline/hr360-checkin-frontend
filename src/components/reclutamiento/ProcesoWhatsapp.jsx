"use client";

// Piezas del proceso de selección de un candidato de WhatsApp, compartidas por Reclutamiento (expediente) y
// el chat de WhatsApp: sugerencia del agente (un clic), aviso por WhatsApp con texto editable (nunca sin que RH pulse
// «Enviar aviso»; respeta la ventana de 24 h), descartar con motivo y la entrevista del agente.
import { useState } from "react";
import { Bot, Check, MessageCircle, Send, Sparkles, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { avisarPorWhatsapp } from "@/lib/reclutamiento/api";
import { mensajeError } from "@/lib/reclutamiento/adaptador.mjs";
import { avisoValido, cuerpoAviso, modoAviso, textoAviso } from "@/lib/reclutamiento/procesoWhatsapp.mjs";
import { STAGES } from "@/lib/reclutamiento/model";
import { Field, Modal } from "./RecruitmentUI";
import s from "./reclutamiento.module.css";

const TITULO_AVISO = {
  contratado: "¿Avisarle por WhatsApp que quedó contratado?",
  descartado: "¿Avisarle por WhatsApp que no continúa?",
  oferta: "¿Avisarle por WhatsApp de la oferta?",
};
const ETIQUETA_PUNTAJE = [
  ["comunicacion", "Comunicación"],
  ["actitud", "Actitud"],
  ["experiencia", "Experiencia"],
  ["confiabilidad", "Confiabilidad"],
  ["disponibilidad", "Disponibilidad"],
];
const SEVERIDAD = { ok: "✓", alerta: "!", descarta: "✕" };

// Sugerencia del agente: un clic para aceptarla. stage: etapa de pantalla (review, interview, rejected).
export function SugerenciaAgente({ suggestion, onAccept, busy = false, shortcut = "" }) {
  if (!suggestion?.stage) return null;
  const nombre = STAGES.find((x) => x.id === suggestion.stage)?.singular || suggestion.stage;
  return (
    <div className={s.formHint} role="status" data-sugerencia={suggestion.stage}>
      <strong style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Sparkles size={15} aria-hidden="true" /> El agente sugiere pasar a «{nombre}»
      </strong>
      {suggestion.reason ? <p>{suggestion.reason}</p> : null}
      <div className={s.row} style={{ marginTop: 8 }}>
        <Button size="sm" className={`${s.primary} ${s.touch}`} onClick={onAccept} loading={busy} disabled={busy} title={shortcut || undefined}>
          <Check size={14} /> Pasar a {nombre}
        </Button>
      </div>
    </div>
  );
}

// Aviso por WhatsApp después de contratar, descartar u ofrecer. El texto se prellena y RH lo edita; solo se envía al
// pulsar «Enviar aviso». Ventana cerrada: solo la plantilla de seguimiento (si existe); sin ella, se explica y no se envía.
// compact: en la columna angosta del chat (menos relleno).
export function AvisoWhatsapp({ tipo, conversationId, windowOpen, template, datos, onDone, compact = false }) {
  const relleno = compact ? { padding: 12 } : undefined;
  const modo = modoAviso({ ventanaAbierta: windowOpen, plantilla: template });
  const [texto, setTexto] = useState(() => textoAviso(tipo, datos));
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [enviado, setEnviado] = useState(false);
  const enviar = async () => {
    setEnviando(true);
    setError("");
    try {
      await avisarPorWhatsapp(conversationId, cuerpoAviso({ tipo, texto, via: modo.via }));
      setEnviado(true);
      onDone?.(true);
    } catch (e) {
      setError(mensajeError(e, "No se pudo enviar el aviso por WhatsApp."));
    } finally {
      setEnviando(false);
    }
  };
  if (enviado) {
    return (
      <p className={s.formHint} role="status" data-aviso-enviado={tipo}>
        <MessageCircle size={14} aria-hidden="true" style={{ display: "inline", marginRight: 6, verticalAlign: "-2px" }} />
        Aviso enviado por WhatsApp{modo.via === "plantilla" ? " (plantilla de seguimiento)" : ""}.
      </p>
    );
  }
  return (
    <section className={s.panel} data-aviso-whatsapp={tipo} aria-label="Avisarle por WhatsApp">
      <div className={s.panelHead} style={relleno}>
        <h3>{TITULO_AVISO[tipo]}</h3>
        <MessageCircle size={17} aria-hidden="true" style={{ flexShrink: 0 }} />
      </div>
      <div className={`${s.panelBody} ${s.stack}`} style={compact ? { padding: 12, gap: 12 } : undefined}>
        <p className={s.small}>{modo.nota}</p>
        {modo.via === "texto" ? (
          <Field label="Mensaje (puedes editarlo)">
            {(props) => <textarea {...props} value={texto} maxLength={4096} rows={5} onChange={(e) => setTexto(e.target.value)} />}
          </Field>
        ) : null}
        {error ? <p className={s.error} role="alert">{error}</p> : null}
        <div className={s.row}>
          {modo.via ? (
            <Button className={`${s.primary} ${s.touch}`} onClick={enviar} loading={enviando} disabled={enviando || !avisoValido({ via: modo.via, texto })}>
              <Send size={14} /> {modo.via === "plantilla" ? "Enviar plantilla" : "Enviar aviso"}
            </Button>
          ) : null}
          <Button variant="outline" className={s.touch} onClick={() => onDone?.(false)} disabled={enviando}>
            {modo.via ? "Ahora no" : "Entendido"}
          </Button>
        </div>
      </div>
    </section>
  );
}

// Descartar con motivo (opcional; queda en el historial). onConfirm(motivo) → true si se guardó.
export function DialogoDescartar({ name, onConfirm, onClose, whatsapp = false }) {
  const [motivo, setMotivo] = useState("");
  const [busy, setBusy] = useState(false);
  const confirmar = async () => {
    setBusy(true);
    const ok = await onConfirm(motivo.trim());
    setBusy(false);
    if (ok) onClose();
  };
  return (
    <Modal
      title={`¿Descartar a ${name}?`}
      description={whatsapp ? "Deja de avanzar en el proceso y el agente ya no lo entrevista. Si vuelve a escribir, la conversación te pedirá atención." : "Deja de avanzar en el proceso. Puedes regresarlo después."}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button variant="destructive" onClick={confirmar} loading={busy} disabled={busy} data-confirmar-descarte="">
            <XCircle size={14} /> Descartar
          </Button>
        </>
      }
    >
      <Field label="Motivo (opcional)" hint="Solo lo ve tu equipo; queda en el historial.">
        {(props) => <textarea {...props} value={motivo} maxLength={300} rows={3} placeholder="Ej. No tiene licencia vigente" onChange={(e) => setMotivo(e.target.value)} />}
      </Field>
    </Modal>
  );
}

// Lo que obtuvo el agente en la entrevista por WhatsApp: calificación, resumen, puntajes y respuestas.
export function EntrevistaAgente({ whatsapp }) {
  if (!whatsapp) return null;
  return (
    <section className={s.panel} data-entrevista-agente="">
      <div className={s.panelHead}>
        <h3>Entrevista del agente por WhatsApp</h3>
        <span className={s.badge} data-tone={whatsapp.rating === "califica" ? "green" : whatsapp.rating === "no_califica" ? "neutral" : "amber"}>{whatsapp.ratingLabel}</span>
      </div>
      <div className={`${s.panelBody} ${s.stack}`}>
        <p className={s.muted} style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
          <Bot size={14} aria-hidden="true" style={{ display: "inline", marginRight: 6 }} />
          {whatsapp.summary || "El agente aún no termina la entrevista."}
        </p>
        {whatsapp.scores ? (
          <dl className={s.answers} aria-label="Puntajes de la entrevista">
            {ETIQUETA_PUNTAJE.filter(([k]) => whatsapp.scores[k] != null).map(([k, label]) => (
              <div key={k}>
                <dt>{label}</dt>
                <dd>{whatsapp.scores[k]} de 5</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {whatsapp.answers?.length ? (
          <dl className={s.answers} aria-label="Respuestas de la entrevista">
            {whatsapp.answers.map((a, i) => (
              <div key={i} data-severidad={a.severity}>
                <dt>{a.question}</dt>
                <dd>{SEVERIDAD[a.severity] ? `${SEVERIDAD[a.severity]} ` : ""}{a.answer || "Sin respuesta"}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </section>
  );
}
