"use client";

import { useState } from "react";
import { Copy, ExternalLink, Mail, Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FilterTabs } from "./RecruitmentUI";
import s from "./reclutamiento.module.css";

export const previewPath = (workspaceId, vacancyId) =>
  `/reclutamiento-demo/${encodeURIComponent(workspaceId)}/${encodeURIComponent(vacancyId)}`;
export default function PublicationPanel({ workspaceId, vacancy, onSave }) {
  const [emailType, setEmailType] = useState("candidate");
  const [config, setConfig] = useState(vacancy.notifications);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const url = `${typeof window !== "undefined" ? window.location.origin : ""}${previewPath(
    workspaceId,
    vacancy.id
  )}`;
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
            <p className={s.muted}>Revisa cómo verán el puesto y el formulario desde su celular.</p>
            <div className={s.urlBox}>{url}</div>
            <div className={s.row}>
              <Button className={s.primary} asChild>
                <a
                  href={previewPath(workspaceId, vacancy.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink size={15} />
                  Abrir vista pública
                </a>
              </Button>
              <Button variant="outline" onClick={copy}>
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? "Enlace copiado" : "Copiar enlace de prueba"}
              </Button>
            </div>
            <div className={s.formHint}>
              <strong>Enlace de demostración.</strong> Las vacantes personalizadas y sus respuestas
              solo están disponibles en este navegador. La URL para compartir con candidatos reales
              se habilitará con la integración.
            </div>
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
              if (config.toTeam && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.email.trim())) {
                setError("Escribe un correo válido para tu equipo.");
                return;
              }
              if (
                onSave({ ...vacancy, notifications: { ...config, email: config.email.trim() } })
              ) {
                setSaved(true);
                setError("");
              } else setError("No se guardó la configuración. Vuelve a intentar.");
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
                  required={config.toTeam}
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
              <span className={s.small}>Configuración de prueba. No envía correos.</span>
              <Button type="submit" variant="outline">
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
              {emailType === "candidate" ? "candidato@example.test" : config.email || "Tu equipo"}
              <br />
              <strong>Asunto:</strong>{" "}
              {emailType === "candidate" ? "Recibimos tu postulación" : "Nueva postulación"}
            </div>
            <div className={s.eyebrow}>Empresa de ejemplo</div>
            <h4>
              {emailType === "candidate"
                ? "¡Gracias por tu interés!"
                : "Conoce a tu próximo talento"}
            </h4>
            <p className={s.muted}>
              {emailType === "candidate" ? (
                <>
                  Recibimos tu postulación para <strong>{vacancy.title}</strong>. Nuestro equipo
                  revisará tu perfil y te contactará si avanzas a la siguiente etapa.
                </>
              ) : (
                <>
                  Llegó una postulación para <strong>{vacancy.title}</strong>. Entra a Reclutamiento
                  para consultar las respuestas y dar seguimiento al candidato.
                </>
              )}
            </p>
            <p className={s.small} style={{ marginTop: 22 }}>
              Este es un ejemplo del contenido. No se ha enviado.
            </p>
          </div>
          <p className={s.small}>
            El remitente, los enlaces y el envío se configurarán con el servicio de correo de la
            empresa.
          </p>
        </div>
      </section>
    </div>
  );
}
