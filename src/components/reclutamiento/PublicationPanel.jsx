"use client";

import { useState } from "react";
import { Copy, ExternalLink, Mail, Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { urlVacantePublica } from "@/lib/reclutamiento/adaptador.mjs";
import { vacancyStatus } from "@/lib/reclutamiento/model";
import { Field, FilterTabs } from "./RecruitmentUI";
import s from "./reclutamiento.module.css";

// Página pública real de la vacante (la misma de la bolsa de trabajo). Solo existe mientras está publicada.
export const previewPath = (vacancy) => urlVacantePublica(vacancy.slug);
export default function PublicationPanel({ vacancy, company, publishesBoard, onSave }) {
  const [emailType, setEmailType] = useState("candidate");
  const [config, setConfig] = useState(vacancy.notifications);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const live = vacancyStatus(vacancy) === "open";
  const url = `${typeof window !== "undefined" ? window.location.origin : ""}${previewPath(vacancy)}`;
  const change = (patch) => {
    setConfig((current) => ({ ...current, ...patch }));
    setSaved(false);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setError("");
    } catch {
      setError("No se pudo copiar automáticamente. Selecciona y copia el enlace de abajo.");
    }
  };
  return (
    <div className={s.detailGrid}>
      <div className={s.stack}>
        <section className={s.panel}>
          <div className={s.panelHead}>
            <h2 className={s.row}>
              <Link2 size={17} />
              Página de la vacante
            </h2>
          </div>
          <div className={`${s.panelBody} ${s.stack}`}>
            {live ? (
              <>
                <p className={s.muted}>
                  Comparte este enlace donde quieras: la página muestra el puesto y su formulario.
                </p>
                <div className={s.urlBox}>{url}</div>
                <div className={s.row}>
                  <Button className={s.primary} asChild>
                    <a href={previewPath(vacancy)} target="_blank" rel="noopener noreferrer">
                      <ExternalLink size={15} />
                      Abrir página de la vacante
                    </a>
                  </Button>
                  <Button variant="outline" onClick={copy}>
                    {copied ? <Check size={15} /> : <Copy size={15} />}
                    {copied ? "Enlace copiado" : "Copiar enlace"}
                  </Button>
                </div>
                <div className={s.formHint}>
                  {publishesBoard
                    ? "También aparece en la bolsa de trabajo de ADAMIA."
                    : "No aparece en la bolsa de trabajo de ADAMIA: tu empresa no la tiene activada (se activa en WhatsApp › Enlaces de vacantes)."}
                </div>
              </>
            ) : (
              <div className={s.formHint}>
                <strong>La página no está disponible.</strong> Publica o reabre la vacante para
                compartir su enlace y recibir postulaciones.
              </div>
            )}
          </div>
        </section>
        <section className={s.panel}>
          <div className={s.panelHead}>
            <h2 className={s.row}>
              <Mail size={17} />
              Notificaciones por correo
            </h2>
          </div>
          <form
            className={`${s.panelBody} ${s.stack}`}
            onSubmit={(event) => {
              event.preventDefault();
              if (
                config.toTeam &&
                config.email.trim() &&
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.email.trim())
              ) {
                setError("Escribe un correo válido para tu equipo.");
                return;
              }
              setSaving(true);
              onSave({ ...vacancy, notifications: { ...config, email: config.email.trim() } }).then(
                (answer) => {
                  setSaving(false);
                  if (answer?.ok) {
                    setSaved(true);
                    setError("");
                  } else setError(answer?.message || "No se guardó la configuración. Vuelve a intentar.");
                }
              );
            }}
          >
            <label className={s.check}>
              <input
                type="checkbox"
                checked={config.toTeam}
                onChange={(event) => change({ toTeam: event.target.checked })}
              />
              Avisar a mi equipo cuando llegue una postulación
            </label>
            <Field label="Correo para recibir avisos">
              {(props) => (
                <input
                  {...props}
                  type="email"
                  placeholder="Correo de la empresa"
                  disabled={!config.toTeam}
                  value={config.email}
                  onChange={(event) => change({ email: event.target.value })}
                />
              )}
            </Field>
            <label className={s.check}>
              <input
                type="checkbox"
                checked={config.toCandidate}
                onChange={(event) => change({ toCandidate: event.target.checked })}
              />
              Enviar confirmación de recepción al candidato
            </label>
            <div className={s.between}>
              <span className={s.small}>Se aplica a las próximas postulaciones.</span>
              <Button type="submit" variant="outline" loading={saving} disabled={saving}>
                {saved ? (
                  <>
                    <Check size={14} />
                    Guardado
                  </>
                ) : (
                  "Guardar avisos"
                )}
              </Button>
            </div>
          </form>
        </section>
        {error && (
          <p className={s.error} role="alert">
            {error}
          </p>
        )}
      </div>
      <section className={s.panel}>
        <div className={s.panelHead}>
          <h2>Así se vería el correo</h2>
        </div>
        <div className={`${s.panelBody} ${s.stack}`}>
          <FilterTabs
            label="Vista previa del correo"
            value={emailType}
            onChange={setEmailType}
            items={[
              { id: "candidate", label: "Al candidato" },
              { id: "team", label: "A tu equipo" },
            ]}
          />
          <div className={s.email}>
            <div className={s.mailHeader}>
              <strong>Para:</strong>{" "}
              {emailType === "candidate" ? "Correo del candidato" : config.email || "Correo de tu empresa"}
              <br />
              <strong>Asunto:</strong>{" "}
              {emailType === "candidate" ? "Confirmación de Postulación" : "Nueva postulación recibida"}
            </div>
            <div className={s.eyebrow}>{company}</div>
            <p className={s.muted}>
              {emailType === "candidate" ? (
                <>
                  Hola (nombre del candidato),
                  <br />
                  Gracias por postularte a la vacante: <strong>{vacancy.title}</strong>.
                </>
              ) : (
                <>
                  Se ha recibido una nueva postulación para la vacante:{" "}
                  <strong>{vacancy.title}</strong>.
                  <br />
                  Postulante: (nombre del candidato)
                </>
              )}
            </p>
            <p className={s.small} style={{ marginTop: 22 }}>
              {emailType === "candidate"
                ? config.toCandidate
                  ? "Se envía al recibir cada postulación."
                  : "Desactivado: no se envía."
                : config.toTeam
                ? "Se envía al recibir cada postulación."
                : "Desactivado: no se envía."}
            </p>
          </div>
          <p className={s.small}>Lo envía ADAMIA en nombre de tu empresa.</p>
        </div>
      </section>
    </div>
  );
}
