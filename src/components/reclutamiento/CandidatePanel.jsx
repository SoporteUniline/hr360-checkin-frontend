"use client";

import { useState } from "react";
import { CalendarDays, FileText, MessageSquare, UserCheck, CheckCircle2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { STAGES, uid, formatDate } from "@/lib/reclutamiento/model";
import { Badge, Field, Modal, PageSurface } from "./RecruitmentUI";
import s from "./reclutamiento.module.css";

const CHECKLIST = [
  ["data", "Datos del candidato revisados"],
  ["offer", "Oferta aceptada"],
  ["documents", "Documentación verificada"],
];
export default function CandidatePanel({
  candidate,
  vacancy,
  data,
  onChange,
  onClose,
  initialTab = "profile",
  embedded = false,
  onScheduleInterview,
}) {
  const Surface = embedded ? PageSurface : Modal;
  const [tab, setTab] = useState(initialTab);
  const [note, setNote] = useState("");
  const [interview, setInterview] = useState("");
  const [location, setLocation] = useState("");
  const [discard, setDiscard] = useState(false);
  const [error, setError] = useState("");
  const hiring = candidate.hiring;
  const save = (patch, activity) => {
    const ok = onChange(candidate.id, patch, activity);
    if (!ok) setError("No se pudo guardar el cambio. Revisa el almacenamiento de este navegador.");
    else setError("");
    return ok;
  };
  const addNote = () => {
    if (!note.trim()) return;
    if (
      save(
        {
          notes: [
            ...candidate.notes,
            { id: uid(), text: note.trim(), at: new Date().toISOString() },
          ],
        },
        "Nota interna agregada"
      )
    )
      setNote("");
  };
  const close = () => {
    if (note.trim() || interview || location.trim()) setDiscard(true);
    else onClose();
  };
  const ready =
    hiring.startDate && hiring.branchId && CHECKLIST.every(([id]) => hiring.checklist.includes(id));
  const hasOffer = candidate.stage === "offer";
  return (
    <Surface
      title="Expediente del candidato"
      description={`${vacancy?.title || "Vacante"} · ${candidate.source}`}
      onClose={close}
      footer={
        discard ? (
          <>
            <span className={s.small}>Tienes una nota o entrevista sin guardar.</span>
            <div className={s.row}>
              <Button variant="outline" onClick={() => setDiscard(false)}>
                Continuar
              </Button>
              <Button variant="destructive" onClick={onClose}>
                Salir sin guardar
              </Button>
            </div>
          </>
        ) : (
          <>
            <span className={s.small}>Prueba local · no se envían notificaciones</span>
            <Button variant="outline" onClick={close}>
              {embedded ? "Volver a candidatos" : "Cerrar"}
            </Button>
          </>
        )
      }
    >
      <div className={s.stack}>
        <div className={s.between}>
          <div className={s.candidateHero} style={{ marginBottom: 0 }}>
            <span className={s.avatar}>
              {candidate.name
                .split(/\s+/)
                .slice(0, 2)
                .map((word) => word[0])
                .join("")}
            </span>
            <div>
              <h3>{candidate.name}</h3>
              <p className={s.small}>Postulación del {formatDate(candidate.submittedAt)}</p>
            </div>
          </div>
          <Badge stage={candidate.stage} />
        </div>
        {error && (
          <p className={s.error} role="alert">
            {error}
          </p>
        )}
        <div className={s.formGrid}>
          <Field
            label="Etapa del proceso"
            hint={
              candidate.stage === "hired"
                ? "Contratación de ejemplo completada."
                : "Para contratar, pasa a Oferta y abre la pestaña Contratar."
            }
          >
            {(props) => (
              <select
                {...props}
                value={candidate.stage}
                disabled={candidate.stage === "hired"}
                onChange={(event) =>
                  save(
                    { stage: event.target.value },
                    `Etapa: ${STAGES.find((stage) => stage.id === event.target.value)?.singular}`
                  )
                }
              >
                {STAGES.map((stage) => (
                  <option key={stage.id} value={stage.id} disabled={stage.id === "hired"}>
                    {stage.singular}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <div className={s.field}>
            <span>Contacto</span>
            <p className={s.muted} style={{ overflowWrap: "anywhere" }}>
              {candidate.email}
              <br />
              {candidate.phone}
            </p>
          </div>
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className={s.mainTabs}>
            <TabsTrigger value="profile">
              <FileText size={14} />
              Respuestas
            </TabsTrigger>
            <TabsTrigger value="activity">
              <MessageSquare size={14} />
              Seguimiento
            </TabsTrigger>
            <TabsTrigger value="hiring">
              <UserCheck size={14} />
              Contratar
            </TabsTrigger>
          </TabsList>
          <TabsContent value="profile" className={s.tabContent}>
            <div className={s.stack}>
              <p className={s.small}>
                Formulario versión {candidate.formVersion}. Estas respuestas conservan las preguntas
                tal como se enviaron.
              </p>
              <dl className={s.answers}>
                {candidate.answers.map((answer) => (
                  <div key={answer.id}>
                    <dt>{answer.label}</dt>
                    <dd>
                      {answer.type === "file" ? (
                        answer.value?.name ? (
                          <>
                            <span className={s.row}>
                              <FileText size={15} />
                              {answer.value.name}
                            </span>
                            <span className={s.small}>
                              Solo nombre de prueba; archivo no almacenado.
                            </span>
                          </>
                        ) : (
                          "Sin archivo adjunto"
                        )
                      ) : Array.isArray(answer.value) ? (
                        answer.value.join(", ") || "Sin respuesta"
                      ) : (
                        String(answer.value ?? "") || "Sin respuesta"
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </TabsContent>
          <TabsContent value="activity" className={s.tabContent}>
            <div className={s.stack}>
              <section className={s.panel}>
                <div className={s.panelHead}>
                  <h3>Notas del equipo</h3>
                  <span className={s.small}>Internas</span>
                </div>
                <div className={`${s.panelBody} ${s.stack}`}>
                  <Field label="Agregar una nota">
                    {(props) => (
                      <textarea
                        {...props}
                        placeholder="Ej. Buen manejo de herramientas administrativas…"
                        value={note}
                        maxLength={3000}
                        onChange={(event) => setNote(event.target.value)}
                      />
                    )}
                  </Field>
                  <div className={s.row}>
                    <Button
                      onClick={addNote}
                      disabled={!note.trim()}
                      className={s.primary}
                      size="sm"
                    >
                      <Plus size={14} />
                      Guardar nota
                    </Button>
                  </div>
                  {[...candidate.notes].reverse().map((item) => (
                    <div key={item.id} className={s.note}>
                      {item.text}
                      <div className={s.small} style={{ marginTop: 7 }}>
                        {formatDate(item.at)}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
              <section className={s.panel}>
                <div className={s.panelHead}>
                  <h3>Programar entrevista de prueba</h3>
                  <CalendarDays size={17} />
                </div>
                <form
                  className={`${s.panelBody} ${s.stack}`}
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!interview) return;
                    if (new Date(interview).getTime() <= Date.now()) {
                      setError("La entrevista debe ser en una fecha y hora futuras.");
                      return;
                    }
                    if (
                      onScheduleInterview?.({
                        candidateId: candidate.id,
                        startsAt: new Date(interview).toISOString(),
                        duration: 30,
                        location: location.trim(),
                        interviewer: "Equipo de talento",
                        notes: "",
                      })
                    ) {
                      setInterview("");
                      setLocation("");
                      setError("");
                    } else
                      setError(
                        "No se pudo guardar la entrevista. Revisa los datos y vuelve a intentar."
                      );
                  }}
                >
                  <div className={s.formGrid}>
                    <Field label="Fecha y hora">
                      {(props) => (
                        <input
                          {...props}
                          type="datetime-local"
                          required
                          value={interview}
                          onChange={(event) => setInterview(event.target.value)}
                        />
                      )}
                    </Field>
                    <Field label="Lugar o medio">
                      {(props) => (
                        <input
                          {...props}
                          value={location}
                          maxLength={200}
                          placeholder="Ej. Videollamada"
                          onChange={(event) => setLocation(event.target.value)}
                        />
                      )}
                    </Field>
                  </div>
                  <div className={s.row}>
                    <Button
                      type="submit"
                      variant="outline"
                      disabled={["hired", "rejected"].includes(candidate.stage)}
                    >
                      Guardar entrevista
                    </Button>
                    <span className={s.small}>
                      Se registra en el historial; no envía invitaciones.
                    </span>
                  </div>
                </form>
              </section>
              <section className={s.stack}>
                <h3 className={s.personName}>Historial del proceso</h3>
                <div className={s.timeline}>
                  {[...candidate.activity].reverse().map((event) => (
                    <div key={event.id} className={s.timelineItem}>
                      {event.text}
                      <div className={s.small}>{formatDate(event.at)}</div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </TabsContent>
          <TabsContent value="hiring" className={s.tabContent}>
            {candidate.stage === "hired" ? (
              <div className={s.success}>
                <CheckCircle2 />
                <h3 className={s.applyTitle}>Contratación de ejemplo completada</h3>
                <p className={s.muted}>
                  Ingreso: {formatDate(hiring.startDate)} ·{" "}
                  {data.branches.find((branch) => branch.id === hiring.branchId)?.name}
                </p>
                <p className={s.small}>
                  No se creó un empleado real. La integración continuará con el alta y expediente
                  existentes.
                </p>
              </div>
            ) : (
              <div className={s.stack}>
                <div className={s.formHint}>
                  <strong>Prepara su llegada al equipo</strong>
                  <p>
                    Revisa estos datos antes de completar la contratación de prueba. El alta real de
                    empleado y el contrato se conectarán con los módulos existentes.
                  </p>
                </div>
                {!hasOffer && (
                  <div className={s.between}>
                    <p className={s.muted}>Primero confirma que el candidato está en Oferta.</p>
                    <Button
                      variant="outline"
                      onClick={() => save({ stage: "offer" }, "Etapa: Oferta")}
                    >
                      Mover a Oferta
                    </Button>
                  </div>
                )}
                <div className={s.formGrid}>
                  <Field label="Fecha de ingreso *">
                    {(props) => (
                      <input
                        {...props}
                        type="date"
                        value={hiring.startDate}
                        onChange={(event) =>
                          save({ hiring: { ...hiring, startDate: event.target.value } })
                        }
                      />
                    )}
                  </Field>
                  <Field label="Sucursal de alta *">
                    {(props) => (
                      <select
                        {...props}
                        value={hiring.branchId}
                        onChange={(event) =>
                          save({ hiring: { ...hiring, branchId: event.target.value } })
                        }
                      >
                        <option value="">Selecciona una sucursal</option>
                        {data.branches.map((branch) => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>
                </div>
                <div className={s.stack} style={{ gap: 12 }}>
                  {CHECKLIST.map(([id, label]) => (
                    <label className={s.check} key={id}>
                      <input
                        type="checkbox"
                        checked={hiring.checklist.includes(id)}
                        onChange={(event) =>
                          save({
                            hiring: {
                              ...hiring,
                              checklist: event.target.checked
                                ? [...hiring.checklist, id]
                                : hiring.checklist.filter((item) => item !== id),
                            },
                          })
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <div className={s.between}>
                  <span className={s.small}>
                    La preparación se guarda automáticamente en esta prueba.
                  </span>
                  <Button
                    className={s.primary}
                    disabled={!ready || !hasOffer}
                    onClick={() =>
                      save(
                        {
                          stage: "hired",
                          hiring: { ...hiring, completedAt: new Date().toISOString() },
                        },
                        "Contratación de ejemplo completada; no se creó un empleado real"
                      )
                    }
                  >
                    <UserCheck size={15} />
                    Completar contratación de prueba
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Surface>
  );
}
