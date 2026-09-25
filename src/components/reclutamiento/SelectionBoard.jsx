"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { GripVertical, ArrowUpRight, Users } from "lucide-react";
import { STAGES, matches, formatDate } from "@/lib/reclutamiento/model";
import { Badge, EmptyState, FilterTabs, Person, SearchInput } from "./RecruitmentUI";
import { useRecruitment } from "./RecruitmentContext";
import s from "./reclutamiento.module.css";
import m from "./module.module.css";

function CandidateCard({ candidate, vacancy, onOpen, onMove, handle }) {
  return (
    <>
      <div className={s.between}>
        <button onClick={() => onOpen(candidate.id)}>
          <Person candidate={candidate} />
        </button>
        {handle}
      </div>
      <p className={m.cardRole}>{vacancy?.title}</p>
      <div className={s.between}>
        <span className={m.cardDate}>{formatDate(candidate.submittedAt)}</span>
        <button
          className={s.iconButton}
          aria-label={`Abrir ${candidate.name}`}
          onClick={() => onOpen(candidate.id)}
        >
          <ArrowUpRight size={14} />
        </button>
      </div>
      <select
        className={s.select}
        aria-label={`Etapa de ${candidate.name}`}
        value={candidate.stage}
        disabled={candidate.stage === "hired"}
        onChange={(event) => onMove(candidate.id, event.target.value)}
      >
        {STAGES.map((stage) => (
          <option value={stage.id} key={stage.id}>
            {stage.id === "hired" && candidate.stage !== "hired"
              ? "Preparar contratación…"
              : stage.singular}
          </option>
        ))}
      </select>
    </>
  );
}
function DraggableCandidate(props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: props.candidate.id,
    disabled: props.candidate.stage === "hired",
  });
  return (
    <article ref={setNodeRef} className={m.candidateCard} data-dragging={isDragging}>
      <CandidateCard
        {...props}
        handle={
          props.candidate.stage !== "hired" ? (
            <button
              className={m.cardHandle}
              {...attributes}
              {...listeners}
              aria-label={`Mover a ${props.candidate.name}`}
            >
              <GripVertical size={16} />
            </button>
          ) : null
        }
      />
    </article>
  );
}
function StageColumn({ stage, candidates, data, onOpen, onMove }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  return (
    <section
      ref={setNodeRef}
      className={m.boardColumn}
      data-over={isOver}
      aria-label={`Etapa ${stage.label}`}
    >
      <div className={m.boardHead}>
        <Badge stage={stage.id} />
        <strong>{candidates.length}</strong>
      </div>
      {candidates.length ? (
        candidates.map((candidate) => (
          <DraggableCandidate
            key={candidate.id}
            candidate={candidate}
            vacancy={data.vacancies.find((item) => item.id === candidate.vacancyId)}
            onOpen={onOpen}
            onMove={onMove}
          />
        ))
      ) : (
        <p className={m.boardEmpty}>
          {stage.id === "hired"
            ? "Las contrataciones completadas aparecen aquí."
            : "Sin candidatos en esta etapa."}
        </p>
      )}
    </section>
  );
}
export default function SelectionBoard() {
  const { data, openCandidate, changeCandidate, success } = useRecruitment();
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [vacancyId, setVacancyId] = useState(params.get("vacante") || "all");
  const [mobileStage, setMobileStage] = useState("all");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const candidates = data.candidates.filter(
    (candidate) =>
      (vacancyId === "all" || candidate.vacancyId === vacancyId) &&
      matches(
        `${candidate.name} ${candidate.email} ${
          data.vacancies.find((item) => item.id === candidate.vacancyId)?.title
        }`,
        query
      )
  );
  const move = (id, stage) => {
    const candidate = data.candidates.find((item) => item.id === id);
    if (!candidate || candidate.stage === stage || candidate.stage === "hired") return;
    if (stage === "hired") {
      openCandidate(id, "hiring");
      return;
    }
    const label = STAGES.find((item) => item.id === stage)?.singular;
    if (label && changeCandidate(id, { stage }, `Etapa: ${label}`))
      success(`${candidate.name}: ${label}.`);
  };
  const cardProps = (candidate) => ({
    candidate,
    vacancy: data.vacancies.find((item) => item.id === candidate.vacancyId),
    onOpen: openCandidate,
    onMove: move,
  });
  return (
    <div className={s.stack}>
      <div className={s.filters}>
        <SearchInput
          value={query}
          onChange={setQuery}
          label="Buscar en selección"
          placeholder="Buscar candidato o vacante…"
        />
        <select
          aria-label="Vacante de selección"
          value={vacancyId}
          className={s.select}
          style={{ width: "auto", maxWidth: "100%" }}
          onChange={(event) => setVacancyId(event.target.value)}
        >
          <option value="all">Todas las vacantes</option>
          {data.vacancies.map((item) => (
            <option value={item.id} key={item.id}>
              {item.title}
            </option>
          ))}
        </select>
        <span className={s.small}>{candidates.length} candidatos</span>
      </div>
      <div className={s.formHint}>
        Mueve los perfiles entre etapas o usa el selector de cada tarjeta. Para contratar, se abre
        la revisión de ingreso antes de completar el proceso.
      </div>
      {!candidates.length ? (
        <EmptyState
          icon={Users}
          title="Sin candidatos con estos filtros"
          description="Prueba con otro nombre o selecciona otra vacante."
        />
      ) : (
        <>
          <DndContext
            sensors={sensors}
            onDragEnd={({ active, over }) => {
              if (over) move(active.id, over.id);
            }}
          >
            <div className={m.board} aria-label="Tablero de selección">
              {STAGES.map((stage) => (
                <StageColumn
                  key={stage.id}
                  stage={stage}
                  candidates={candidates.filter((candidate) => candidate.stage === stage.id)}
                  data={data}
                  onOpen={openCandidate}
                  onMove={move}
                />
              ))}
            </div>
          </DndContext>
          <div className={m.selectionMobile}>
            <FilterTabs
              label="Etapa de selección móvil"
              value={mobileStage}
              onChange={setMobileStage}
              items={[
                { id: "all", label: "Todos", count: candidates.length },
                ...STAGES.map((stage) => ({
                  ...stage,
                  count: candidates.filter((candidate) => candidate.stage === stage.id).length,
                })),
              ]}
            />
            {candidates
              .filter((candidate) => mobileStage === "all" || candidate.stage === mobileStage)
              .map((candidate) => (
                <article key={candidate.id} className={m.candidateCard}>
                  <Badge stage={candidate.stage} />
                  <CandidateCard {...cardProps(candidate)} />
                </article>
              ))}
            {!candidates.some(
              (candidate) => mobileStage === "all" || candidate.stage === mobileStage
            ) && <p className={m.boardEmpty}>No hay candidatos en esta etapa.</p>}
          </div>
        </>
      )}
    </div>
  );
}
