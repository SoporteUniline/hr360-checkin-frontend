"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CalendarDays,
  Clock3,
  MapPin,
  UserRound,
  Plus,
  Pencil,
  Check,
  X,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime, matches, interviewStatus, downloadCsv } from "@/lib/reclutamiento/model";
import { useRecruitment } from "./RecruitmentContext";
import { Field, Modal, SearchInput, FilterTabs, EmptyState, Pagination } from "./RecruitmentUI";
import s from "./reclutamiento.module.css";
import m from "./module.module.css";

const STATUSES = [
  { id: "scheduled", label: "Próximas" },
  { id: "pending", label: "Por registrar" },
  { id: "completed", label: "Realizadas" },
  { id: "cancelled", label: "Canceladas" },
];
function InterviewDialog({ appointment, data, onClose, onSave }) {
  const [candidateId, setCandidateId] = useState(appointment?.candidateId || "");
  const [startsAt, setStartsAt] = useState(() => {
    if (!appointment?.startsAt) return "";
    const date = new Date(appointment.startsAt);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [duration, setDuration] = useState(appointment?.duration || 30);
  const [location, setLocation] = useState(appointment?.location || "Videollamada");
  const [interviewer, setInterviewer] = useState(appointment?.interviewer || "Equipo de talento");
  const [notes, setNotes] = useState(appointment?.notes || "");
  const [error, setError] = useState("");
  const eligible = data.candidates.filter(
    (candidate) => !["hired", "rejected"].includes(candidate.stage)
  );
  return (
    <Modal
      title={appointment ? "Reprogramar entrevista" : "Agenda una conversación"}
      description="Selecciona el candidato y define cuándo se conocerán."
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="recruitment-interview" className={s.primary}>
            <CalendarDays size={15} />
            Guardar entrevista
          </Button>
        </>
      }
    >
      <form
        id="recruitment-interview"
        className={s.stack}
        onSubmit={(event) => {
          event.preventDefault();
          if (!startsAt || new Date(startsAt).getTime() <= Date.now()) {
            setError("Elige una fecha y hora futuras.");
            return;
          }
          if (
            onSave({
              id: appointment?.id,
              candidateId,
              startsAt: new Date(startsAt).toISOString(),
              duration: Number(duration),
              location: location.trim(),
              interviewer: interviewer.trim(),
              notes: notes.trim(),
            })
          )
            onClose();
          else setError("No se guardó la entrevista. Revisa los datos y vuelve a intentar.");
        }}
      >
        {error && (
          <p className={s.error} role="alert">
            {error}
          </p>
        )}
        <Field label="Candidato *">
          {(props) => (
            <select
              {...props}
              required
              value={candidateId}
              disabled={Boolean(appointment)}
              onChange={(event) => setCandidateId(event.target.value)}
            >
              <option value="">Selecciona un candidato</option>
              {eligible.map((candidate) => (
                <option value={candidate.id} key={candidate.id}>
                  {candidate.name} ·{" "}
                  {data.vacancies.find((vacancy) => vacancy.id === candidate.vacancyId)?.title}
                </option>
              ))}
            </select>
          )}
        </Field>
        <div className={s.formGrid}>
          <Field label="Fecha y hora *">
            {(props) => (
              <input
                {...props}
                required
                type="datetime-local"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
              />
            )}
          </Field>
          <Field label="Duración">
            {(props) => (
              <select
                {...props}
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
              >
                {[15, 30, 45, 60, 90].map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes} minutos
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Lugar o medio *">
            {(props) => (
              <input
                {...props}
                required
                maxLength={200}
                value={location}
                onChange={(event) => setLocation(event.target.value)}
              />
            )}
          </Field>
          <Field label="Entrevistador">
            {(props) => (
              <input
                {...props}
                maxLength={120}
                value={interviewer}
                onChange={(event) => setInterviewer(event.target.value)}
              />
            )}
          </Field>
        </div>
        <Field label="Notas para la entrevista">
          {(props) => (
            <textarea
              {...props}
              value={notes}
              maxLength={2000}
              placeholder="Temas que te gustaría conversar…"
              onChange={(event) => setNotes(event.target.value)}
            />
          )}
        </Field>
        <p className={s.formHint}>
          Esta agenda es de prueba. Guarda la cita y su historial; las invitaciones por correo se
          habilitarán en la integración.
        </p>
      </form>
    </Modal>
  );
}
export default function InterviewsPage() {
  const { data, scheduleInterview, changeInterviewStatus, openCandidate, success } =
    useRecruitment();
  const params = useSearchParams();
  const [status, setStatus] = useState(
    STATUSES.some((item) => item.id === params.get("estado")) ? params.get("estado") : "scheduled"
  );
  const [vacancyId, setVacancyId] = useState(params.get("vacante") || "all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [cancel, setCancel] = useState(null);
  const all = data.interviews
    .map((item) => ({
      ...item,
      candidate: data.candidates.find((candidate) => candidate.id === item.candidateId),
    }))
    .filter(
      (item) =>
        item.candidate &&
        (vacancyId === "all" || item.candidate.vacancyId === vacancyId) &&
        matches(
          `${item.candidate.name} ${item.location} ${item.interviewer} ${
            data.vacancies.find((vacancy) => vacancy.id === item.candidate.vacancyId)?.title
          }`,
          query
        )
    );
  const filtered = all
    .filter((item) => status === "all" || interviewStatus(item) === status)
    .sort((a, b) =>
      ["completed", "cancelled"].includes(status)
        ? b.startsAt.localeCompare(a.startsAt)
        : a.startsAt.localeCompare(b.startsAt)
    );
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 6)));
  const setFilter = (setter, value) => {
    setter(value);
    setPage(1);
  };
  return (
    <div className={s.stack}>
      <div className={m.sectionToolbar}>
        <FilterTabs
          label="Estado de entrevistas"
          items={[
            ...STATUSES.map((item) => ({
              ...item,
              count: all.filter((interview) => interviewStatus(interview) === item.id).length,
            })),
            { id: "all", label: "Todas", count: all.length },
          ]}
          value={status}
          onChange={(value) => setFilter(setStatus, value)}
        />
        <Button className={s.primary} onClick={() => setEditing({ appointment: null })}>
          <Plus size={15} />
          Agendar entrevista
        </Button>
      </div>
      <div className={s.filters}>
        <SearchInput
          label="Buscar entrevistas"
          placeholder="Buscar candidato, vacante o entrevistador…"
          value={query}
          onChange={(value) => setFilter(setQuery, value)}
        />
        <select
          className={s.select}
          style={{ width: "auto", maxWidth: "100%" }}
          aria-label="Vacante de entrevistas"
          value={vacancyId}
          onChange={(event) => setFilter(setVacancyId, event.target.value)}
        >
          <option value="all">Todas las vacantes</option>
          {data.vacancies.map((item) => (
            <option value={item.id} key={item.id}>
              {item.title}
            </option>
          ))}
        </select>
        <Button
          variant="outline"
          size="sm"
          disabled={!filtered.length}
          onClick={() =>
            downloadCsv(
              "entrevistas-prueba.csv",
              ["Candidato", "Fecha y hora", "Minutos", "Lugar", "Entrevistador", "Estado"],
              filtered.map((item) => [
                item.candidate.name,
                formatDateTime(item.startsAt),
                item.duration,
                item.location,
                item.interviewer,
                STATUSES.find((state) => state.id === interviewStatus(item))?.label,
              ])
            )
          }
        >
          <Download size={14} />
          Descargar
        </Button>
      </div>
      {!filtered.length ? (
        <EmptyState
          icon={CalendarDays}
          title="Tu agenda está despejada"
          description="No hay entrevistas con estos filtros. Agenda una conversación para dar el siguiente paso."
        />
      ) : (
        filtered.slice((currentPage - 1) * 6, currentPage * 6).map((item) => (
          <article key={item.id} className={m.interviewCard}>
            <div className={m.dateTile}>
              <strong>{new Date(item.startsAt).getDate()}</strong>
              <span>{new Date(item.startsAt).toLocaleDateString("es-MX", { month: "short" })}</span>
            </div>
            <div className={m.interviewInfo}>
              <div className={s.between}>
                <button onClick={() => openCandidate(item.candidateId, "activity")}>
                  <h3>{item.candidate.name}</h3>
                </button>
                <span className={m.interviewStatus} data-status={interviewStatus(item)}>
                  {STATUSES.find((state) => state.id === interviewStatus(item))?.label}
                </span>
              </div>
              <p className={s.muted}>
                {data.vacancies.find((vacancy) => vacancy.id === item.candidate.vacancyId)?.title}
              </p>
              <div className={m.interviewMeta}>
                <span>
                  <Clock3 size={13} />
                  {formatDateTime(item.startsAt)} · {item.duration} min
                </span>
                <span>
                  <MapPin size={13} />
                  {item.location || "Por definir"}
                </span>
                <span>
                  <UserRound size={13} />
                  {item.interviewer || "Sin asignar"}
                </span>
              </div>
              {item.notes && (
                <p
                  className={s.small}
                  style={{ marginTop: 13, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                >
                  {item.notes}
                </p>
              )}
            </div>
            {item.status === "scheduled" && (
              <div className={m.interviewActions}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (changeInterviewStatus(item.id, "completed"))
                      success("Entrevista marcada como realizada.");
                  }}
                >
                  <Check size={14} />
                  Marcar realizada
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={["hired", "rejected"].includes(item.candidate.stage)}
                  onClick={() => setEditing({ appointment: item })}
                >
                  <Pencil size={13} />
                  Reprogramar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setCancel(item)}>
                  <X size={13} />
                  Cancelar cita
                </Button>
              </div>
            )}
          </article>
        ))
      )}
      <Pagination total={filtered.length} page={currentPage} onChange={setPage} />
      {editing && (
        <InterviewDialog
          appointment={editing.appointment}
          data={data}
          onSave={scheduleInterview}
          onClose={() => setEditing(null)}
        />
      )}
      {cancel && (
        <Modal
          title="¿Cancelar esta entrevista?"
          description={`${cancel.candidate.name} · ${formatDateTime(cancel.startsAt)}`}
          onClose={() => setCancel(null)}
          footer={
            <>
              <Button variant="outline" onClick={() => setCancel(null)}>
                Conservar cita
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (changeInterviewStatus(cancel.id, "cancelled")) {
                    setCancel(null);
                    success("Entrevista cancelada. El historial se conserva.");
                  }
                }}
              >
                Cancelar entrevista
              </Button>
            </>
          }
        >
          <p className={s.muted}>El candidato conserva su etapa y su expediente.</p>
        </Modal>
      )}
    </div>
  );
}
