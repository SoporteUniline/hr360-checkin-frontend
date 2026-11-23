"use client";

// Expediente del candidato (03/12/2026: datos reales). Postulaciones de la página y de WhatsApp (04/12/2026, mismo
// proceso): respuestas, notas, historial, etapa y «Contratar» (crea o enlaza su ficha de empleado). Las de WhatsApp
// agregan la entrevista del agente, «Abrir chat», la sugerencia de etapa del agente (un clic) y avisarle por WhatsApp al
// contratar, descartar u ofrecer. Solo los de WhatsApp que aún no tienen proceso se ven en solo lectura.
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  FileText,
  MessageSquare,
  MessageCircle,
  UserCheck,
  CheckCircle2,
  Plus,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { STAGES, formatDate, formatDateTime } from "@/lib/reclutamiento/model";
import { mensajeError, urlConversacion, urlEmpleado } from "@/lib/reclutamiento/adaptador.mjs";
import { usePostulacion } from "@/hooks/useReclutamiento";
import { Badge, Field, Modal, PageSurface } from "./RecruitmentUI";
import { useRecruitment } from "./RecruitmentContext";
import HiringForm from "./HiringForm";
import { AvisoWhatsapp, DialogoDescartar, EntrevistaAgente, SugerenciaAgente } from "./ProcesoWhatsapp";
import { ENTREVISTAS_REAL } from "./navigation";
import s from "./reclutamiento.module.css";

const initials = (name) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("");

function WhatsappCandidate({ candidate, vacancy, Surface, onClose, embedded }) {
  const { startWhatsapp, openCandidate } = useRecruitment();
  const [starting, setStarting] = useState(false);
  const start = async () => {
    setStarting(true);
    const id = await startWhatsapp(candidate.interviewId);
    setStarting(false);
    if (id) openCandidate(id);
  };
  return (
    <Surface
      title="Candidato de WhatsApp"
      description={`${vacancy?.title || "Vacante"} · entrevista del asistente`}
      onClose={onClose}
      footer={
        <>
          <span className={s.small}>
            {candidate.canStart
              ? "Aceptó el aviso de privacidad: puedes llevarlo en el proceso de selección."
              : "Aún no acepta el aviso de privacidad; su conversación sigue en la bandeja de WhatsApp."}
          </span>
          <Button variant="outline" onClick={onClose}>
            {embedded ? "Volver a candidatos" : "Cerrar"}
          </Button>
        </>
      }
    >
      <div className={s.stack}>
        <div className={s.between}>
          <div className={s.candidateHero} style={{ marginBottom: 0 }}>
            <span className={s.avatar}>{initials(candidate.name)}</span>
            <div>
              <h3>{candidate.name}</h3>
              <p className={s.small}>Escribió el {formatDate(candidate.submittedAt)}</p>
            </div>
          </div>
          <span className={s.badge} data-tone={candidate.rating === "califica" ? "green" : candidate.rating === "no_califica" ? "neutral" : "amber"}>
            {candidate.ratingLabel}
          </span>
        </div>
        <dl className={s.answers}>
          <div>
            <dt>Teléfono</dt>
            <dd>{candidate.phone || "Sin teléfono"}</dd>
          </div>
          <div>
            <dt>Resumen de la entrevista</dt>
            <dd>{candidate.summary || "El asistente aún no termina la entrevista."}</dd>
          </div>
        </dl>
        <div className={s.row}>
          {candidate.canStart ? (
            <Button className={s.primary} onClick={start} loading={starting} disabled={starting} data-iniciar-proceso="">
              <Plus size={15} />
              Iniciar proceso
            </Button>
          ) : null}
          <Button className={candidate.canStart ? undefined : s.primary} variant={candidate.canStart ? "outline" : undefined} asChild>
            <Link href={urlConversacion(candidate.conversationId)}>
              <MessageCircle size={15} />
              Abrir conversación
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={ENTREVISTAS_REAL}>
              <CalendarDays size={15} />
              Ver agenda de entrevistas
            </Link>
          </Button>
        </div>
      </div>
    </Surface>
  );
}

export default function CandidatePanel({
  candidate,
  vacancy,
  data,
  onClose,
  initialTab = "profile",
  embedded = false,
}) {
  const Surface = embedded ? PageSurface : Modal;
  if (candidate.readOnly)
    return (
      <WhatsappCandidate
        candidate={candidate}
        vacancy={vacancy}
        Surface={Surface}
        onClose={onClose}
        embedded={embedded}
      />
    );
  return (
    <WebCandidate
      candidate={candidate}
      vacancy={vacancy}
      data={data}
      onClose={onClose}
      initialTab={initialTab}
      embedded={embedded}
      Surface={Surface}
    />
  );
}

function WebCandidate({ candidate, vacancy, data, onClose, initialTab, embedded, Surface }) {
  const recruitment = useRecruitment();
  const { changeStage, addNote } = recruitment;
  const { detail, error: detailError, isLoading } = usePostulacion(candidate.id, candidate);
  const person = detail || candidate;
  const wa = person.origin === "whatsapp" ? person.whatsapp : null;
  const [tab, setTab] = useState(initialTab);
  const [note, setNote] = useState("");
  const [discard, setDiscard] = useState(false);
  const [savingStage, setSavingStage] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [askDiscard, setAskDiscard] = useState(false);
  // Aviso por WhatsApp pendiente de confirmar (después de contratar, descartar u ofrecer).
  const [notice, setNotice] = useState(null);
  useEffect(() => setTab(initialTab), [initialTab]);
  const moveTo = async (stage, options) => {
    setSavingStage(true);
    const ok = await changeStage(person.id, stage, options);
    setSavingStage(false);
    if (ok && wa && (stage === "offer" || stage === "rejected")) setNotice(stage === "offer" ? "oferta" : "descartado");
    return ok;
  };
  const noticeData = {
    nombre: person.name,
    vacante: vacancy?.title,
    empresa: data.company,
    fechaIngreso: person.hiring.startDate,
    sucursal: data.branches.find((branch) => branch.id === person.hiring.branchId)?.name,
  };
  const saveNote = async () => {
    if (!note.trim()) return;
    setSavingNote(true);
    if (await addNote(person.id, note.trim())) setNote("");
    setSavingNote(false);
  };
  const close = () => {
    if (note.trim()) setDiscard(true);
    else onClose();
  };
  const hired = person.stage === "hired";
  return (
    <Surface
      title="Expediente del candidato"
      description={`${vacancy?.title || "Vacante"} · ${person.source}`}
      onClose={close}
      footer={
        discard ? (
          <>
            <span className={s.small}>Tienes una nota sin guardar.</span>
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
            <span className={s.small}>Los cambios los ve todo tu equipo.</span>
            <div className={s.row}>
              {wa?.conversationId ? (
                <Button variant="outline" asChild>
                  <Link href={urlConversacion(wa.conversationId)} data-abrir-chat="">
                    <MessageCircle size={15} />
                    Abrir chat
                  </Link>
                </Button>
              ) : null}
              <Button variant="outline" onClick={close}>
                {embedded ? "Volver a candidatos" : "Cerrar"}
              </Button>
            </div>
          </>
        )
      }
    >
      <div className={s.stack}>
        <div className={s.between}>
          <div className={s.candidateHero} style={{ marginBottom: 0 }}>
            <span className={s.avatar}>{initials(person.name)}</span>
            <div>
              <h3>{person.name}</h3>
              <p className={s.small}>
                {wa ? "Llegó por WhatsApp el" : "Postulación del"} {formatDate(person.submittedAt)}
              </p>
            </div>
          </div>
          <Badge stage={person.stage} />
        </div>
        {wa?.suggestion && !hired ? (
          <SugerenciaAgente
            suggestion={wa.suggestion}
            busy={savingStage}
            onAccept={() => moveTo(wa.suggestion.stage, { sugerencia: true })}
          />
        ) : null}
        {notice && wa ? (
          <AvisoWhatsapp
            key={notice}
            tipo={notice}
            conversationId={wa.conversationId}
            windowOpen={wa.windowOpen}
            template={wa.template}
            datos={noticeData}
            onDone={(sent) => { if (!sent) setNotice(null); }}
          />
        ) : null}
        {detailError && (
          <p className={s.error} role="alert">
            {mensajeError(detailError, "No se pudo cargar el expediente completo.")}
          </p>
        )}
        <div className={s.formGrid}>
          <Field
            label="Etapa del proceso"
            hint={
              hired
                ? "Contratación completada."
                : "Para contratar, pasa a Oferta y abre la pestaña Contratar."
            }
          >
            {(props) => (
              <select
                {...props}
                value={person.stage}
                disabled={hired || savingStage}
                onChange={(event) => {
                  // Descartar pide el motivo (opcional) antes de guardar.
                  if (event.target.value === "rejected") setAskDiscard(true);
                  else moveTo(event.target.value);
                }}
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
              {person.email || "Sin correo"}
              <br />
              {person.phone || "Sin teléfono"}
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
            {wa ? <div style={{ marginBottom: 16 }}><EntrevistaAgente whatsapp={wa} /></div> : null}
            {!detail && isLoading ? (
              <p className={`${s.row} ${s.muted}`} role="status">
                <Loader2 className="size-4 animate-spin" /> Cargando respuestas…
              </p>
            ) : (
              <div className={s.stack}>
                <p className={s.small}>
                  Formulario versión {person.formVersion}. Estas respuestas conservan las preguntas
                  tal como se enviaron.
                </p>
                <dl className={s.answers}>
                  {person.answers.map((answer) => (
                    <div key={answer.id}>
                      <dt>{answer.label}</dt>
                      <dd>
                        {answer.type === "file"
                          ? answer.value
                            ? "Currículum recibido (se consulta en el expediente de la postulación)."
                            : "Sin archivo adjunto"
                          : Array.isArray(answer.value)
                          ? answer.value.join(", ") || "Sin respuesta"
                          : String(answer.value ?? "") || "Sin respuesta"}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </TabsContent>
          <TabsContent value="activity" className={s.tabContent}>
            <div className={s.stack}>
              <section className={s.panel}>
                <div className={s.panelHead}>
                  <h3>Notas del equipo</h3>
                  <span className={s.small}>Internas · el candidato no las ve</span>
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
                      onClick={saveNote}
                      disabled={!note.trim() || savingNote}
                      loading={savingNote}
                      className={s.primary}
                      size="sm"
                    >
                      <Plus size={14} />
                      Guardar nota
                    </Button>
                  </div>
                  {[...person.notes].reverse().map((item) => (
                    <div key={item.id} className={s.note}>
                      {item.text}
                      <div className={s.small} style={{ marginTop: 7 }}>
                        {item.author ? `${item.author} · ` : ""}
                        {formatDateTime(item.at)}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
              <section className={s.panel}>
                <div className={s.panelHead}>
                  <h3>Entrevistas</h3>
                  <CalendarDays size={17} />
                </div>
                <div className={`${s.panelBody} ${s.stack}`}>
                  <p className={s.muted}>
                    Las entrevistas se agendan en la agenda de WhatsApp de la vacante. Mueve a la
                    persona a «Entrevista» para llevar el seguimiento aquí.
                  </p>
                  <div className={s.row}>
                    <Button variant="outline" asChild>
                      <Link href={ENTREVISTAS_REAL}>
                        <ExternalLink size={14} />
                        Abrir agenda de entrevistas
                      </Link>
                    </Button>
                  </div>
                </div>
              </section>
              <section className={s.stack}>
                <h3 className={s.personName}>Historial del proceso</h3>
                <div className={s.timeline}>
                  {[...person.activity].reverse().map((event) => (
                    <div key={event.id} className={s.timelineItem}>
                      {event.text}
                      <div className={s.small}>
                        {event.author ? `${event.author} · ` : ""}
                        {formatDateTime(event.at)}
                      </div>
                    </div>
                  ))}
                  {!person.activity.length && (
                    <p className={s.muted}>{isLoading ? "Cargando historial…" : "Sin movimientos."}</p>
                  )}
                </div>
              </section>
            </div>
          </TabsContent>
          <TabsContent value="hiring" className={s.tabContent}>
            {hired ? (
              <div className={s.success}>
                <CheckCircle2 />
                <h3 className={s.applyTitle}>Contratación completada</h3>
                <p className={s.muted}>
                  Ingreso: {formatDate(person.hiring.startDate)}
                  {data.branches.find((branch) => branch.id === person.hiring.branchId)
                    ? ` · ${data.branches.find((branch) => branch.id === person.hiring.branchId).name}`
                    : ""}
                </p>
                {person.hiring.employeeId && (
                  <>
                    <p className={s.small}>
                      {person.hiring.existingEmployee
                        ? "Se enlazó con su ficha de empleado existente."
                        : "Se creó su ficha de empleado."}{" "}
                      {person.employee?.name ? `${person.employee.name} · ${person.employee.status}` : ""}
                    </p>
                    <Button variant="outline" asChild>
                      <Link href={urlEmpleado(person.hiring.employeeId)}>
                        <ExternalLink size={14} />
                        Ver ficha del empleado
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <HiringForm
                key={`${person.id}-${person.stage}`}
                person={person}
                branches={data.branches}
                vacancy={vacancy}
                actions={recruitment}
                onHired={() => wa && setNotice("contratado")}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
      {askDiscard ? (
        <DialogoDescartar
          name={person.name}
          whatsapp={Boolean(wa)}
          onClose={() => setAskDiscard(false)}
          onConfirm={(motivo) => moveTo("rejected", { motivo })}
        />
      ) : null}
    </Surface>
  );
}
