"use client";

// Expediente del candidato (03/12/2026: datos reales). Postulaciones de la página: respuestas, notas, historial,
// etapa y «Contratar» (crea o enlaza su ficha de empleado). Candidatos de WhatsApp: resumen de la entrevista del
// agente y enlace a su conversación (su proceso sigue en la bandeja de WhatsApp).
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
import {
  aCuerpoContratacion,
  dividirNombre,
  mensajeError,
  urlConversacion,
  urlEmpleado,
} from "@/lib/reclutamiento/adaptador.mjs";
import { usePostulacion } from "@/hooks/useReclutamiento";
import { Badge, Field, Modal, PageSurface } from "./RecruitmentUI";
import { useRecruitment } from "./RecruitmentContext";
import { ENTREVISTAS_REAL } from "./navigation";
import s from "./reclutamiento.module.css";

const CHECKLIST = [
  ["data", "Datos del candidato revisados"],
  ["offer", "Oferta aceptada"],
  ["documents", "Documentación verificada"],
];
const initials = (name) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("");

function WhatsappCandidate({ candidate, vacancy, Surface, onClose, embedded }) {
  return (
    <Surface
      title="Candidato de WhatsApp"
      description={`${vacancy?.title || "Vacante"} · entrevista del asistente`}
      onClose={onClose}
      footer={
        <>
          <span className={s.small}>Su proceso continúa en la bandeja de WhatsApp.</span>
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
          <Button className={s.primary} asChild>
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

function HiringForm({ person, data, vacancy, onHired }) {
  const { savePreparation, hire, changeStage } = useRecruitment();
  const names = dividirNombre(person.name);
  const [form, setForm] = useState(() => ({
    startDate: person.hiring.startDate,
    branchId: person.hiring.branchId || vacancy?.branchId || "",
    checklist: person.hiring.checklist,
    ...names,
    email: person.email,
    phone: person.phone,
  }));
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const hasOffer = person.stage === "offer";
  const full = vacancy && !vacancy.unlimited && vacancy.remaining === 0;
  const patch = (value, persist) => {
    setForm((current) => ({ ...current, ...value }));
    setErrors({});
    setMessage("");
    // Fecha, sucursal y lista se guardan al momento: cualquiera del equipo ve la preparación.
    if (persist) savePreparation(person.id, persist);
  };
  const ready =
    form.startDate &&
    form.branchId &&
    form.firstName.trim() &&
    form.lastName.trim() &&
    CHECKLIST.every(([id]) => form.checklist.includes(id));
  const submit = async () => {
    setBusy(true);
    const r = await hire(person.id, aCuerpoContratacion(form));
    setBusy(false);
    if (r.ok) onHired?.(r.result);
    else {
      setErrors(r.errors || {});
      setMessage(r.message);
    }
  };
  return (
    <div className={s.stack}>
      <div className={s.formHint}>
        <strong>Prepara su llegada al equipo</strong>
        <p>
          Al completar la contratación se crea su ficha de empleado con estos datos (o se enlaza con
          la que ya tenga en tu empresa por correo o teléfono) y se ocupa un lugar de la vacante.
        </p>
      </div>
      {full && (
        <p className={s.error} role="alert">
          Ya se ocuparon todos los lugares de esta vacante. Edita la vacante y aumenta los lugares
          para contratar a alguien más.
        </p>
      )}
      {!hasOffer && (
        <div className={s.between}>
          <p className={s.muted}>Primero confirma que la persona está en Oferta.</p>
          <Button variant="outline" onClick={() => changeStage(person.id, "offer")}>
            Mover a Oferta
          </Button>
        </div>
      )}
      <div className={s.formGrid}>
        <Field label="Fecha de ingreso *" error={errors.startDate}>
          {(props) => (
            <input
              {...props}
              type="date"
              value={form.startDate}
              onChange={(event) =>
                patch({ startDate: event.target.value }, { fecha_ingreso: event.target.value })
              }
            />
          )}
        </Field>
        <Field
          label="Sucursal de alta *"
          error={errors.branchId}
          hint={data.branches.length ? undefined : "Da de alta tus sucursales en Catálogos."}
        >
          {(props) => (
            <select
              {...props}
              value={form.branchId}
              onChange={(event) =>
                patch(
                  { branchId: event.target.value },
                  { id_sucursal: event.target.value ? Number(event.target.value) : null }
                )
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
        <Field label="Nombre(s) *" error={errors.firstName}>
          {(props) => (
            <input
              {...props}
              value={form.firstName}
              maxLength={60}
              autoComplete="off"
              onChange={(event) => patch({ firstName: event.target.value })}
            />
          )}
        </Field>
        <Field label="Apellido paterno *" error={errors.lastName}>
          {(props) => (
            <input
              {...props}
              value={form.lastName}
              maxLength={60}
              autoComplete="off"
              onChange={(event) => patch({ lastName: event.target.value })}
            />
          )}
        </Field>
        <Field label="Apellido materno" error={errors.secondLastName}>
          {(props) => (
            <input
              {...props}
              value={form.secondLastName}
              maxLength={60}
              autoComplete="off"
              onChange={(event) => patch({ secondLastName: event.target.value })}
            />
          )}
        </Field>
        <Field
          label="Correo del empleado"
          error={errors.email}
          hint="Opcional. Debe ser distinto de una cuenta de usuario de ADAMIA."
        >
          {(props) => (
            <input
              {...props}
              type="email"
              inputMode="email"
              value={form.email}
              maxLength={150}
              onChange={(event) => patch({ email: event.target.value })}
            />
          )}
        </Field>
        <Field label="Teléfono" error={errors.phone}>
          {(props) => (
            <input
              {...props}
              type="tel"
              inputMode="tel"
              value={form.phone}
              maxLength={20}
              onChange={(event) => patch({ phone: event.target.value })}
            />
          )}
        </Field>
      </div>
      <div className={s.stack} style={{ gap: 12 }}>
        {CHECKLIST.map(([id, label]) => (
          <label className={s.check} key={id}>
            <input
              type="checkbox"
              checked={form.checklist.includes(id)}
              onChange={(event) => {
                const checklist = event.target.checked
                  ? [...form.checklist, id]
                  : form.checklist.filter((item) => item !== id);
                patch({ checklist }, { checklist });
              }}
            />
            {label}
          </label>
        ))}
      </div>
      {message && (
        <p className={s.error} role="alert">
          {message}
        </p>
      )}
      <div className={s.between}>
        <span className={s.small}>La fecha, la sucursal y la lista se guardan al cambiarlas.</span>
        <Button
          className={s.primary}
          disabled={!ready || !hasOffer || full || busy}
          loading={busy}
          onClick={submit}
        >
          <UserCheck size={15} />
          Completar contratación
        </Button>
      </div>
    </div>
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
  if (candidate.origin === "whatsapp")
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
  const { changeStage, addNote } = useRecruitment();
  const { detail, error: detailError, isLoading } = usePostulacion(candidate.id, candidate);
  const person = detail || candidate;
  const [tab, setTab] = useState(initialTab);
  const [note, setNote] = useState("");
  const [discard, setDiscard] = useState(false);
  const [savingStage, setSavingStage] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  useEffect(() => setTab(initialTab), [initialTab]);
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
            <span className={s.avatar}>{initials(person.name)}</span>
            <div>
              <h3>{person.name}</h3>
              <p className={s.small}>Postulación del {formatDate(person.submittedAt)}</p>
            </div>
          </div>
          <Badge stage={person.stage} />
        </div>
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
                onChange={async (event) => {
                  setSavingStage(true);
                  await changeStage(person.id, event.target.value);
                  setSavingStage(false);
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
                data={data}
                vacancy={vacancy}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Surface>
  );
}
