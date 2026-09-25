"use client";

import { useMemo, useState } from "react";
import { Download, ArrowUpRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STAGES, matches, formatDate, downloadCsv } from "@/lib/reclutamiento/model";
import { Badge, EmptyState, FilterTabs, Pagination, Person, SearchInput } from "./RecruitmentUI";
import s from "./reclutamiento.module.css";

export default function CandidatesView({
  data,
  vacancyId,
  onOpen,
  hiring = false,
  initialStage = "all",
}) {
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState(initialStage);
  const [vacancy, setVacancy] = useState("all");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("recent");
  const vacancyById = useMemo(
    () => new Map(data.vacancies.map((item) => [item.id, item])),
    [data.vacancies]
  );
  const all = data.candidates.filter(
    (candidate) =>
      (!vacancyId || candidate.vacancyId === vacancyId) &&
      (!hiring || ["offer", "hired"].includes(candidate.stage))
  );
  const filtered = all
    .filter(
      (candidate) =>
        (stage === "all" || candidate.stage === stage) &&
        (vacancy === "all" || candidate.vacancyId === vacancy) &&
        matches(
          `${candidate.name} ${candidate.email} ${candidate.phone} ${
            vacancyById.get(candidate.vacancyId)?.title
          }`,
          search
        )
    )
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name, "es")
        : sort === "oldest"
        ? a.submittedAt.localeCompare(b.submittedAt)
        : b.submittedAt.localeCompare(a.submittedAt)
    );
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 8)));
  const rows = filtered.slice((currentPage - 1) * 8, currentPage * 8);
  const stages = hiring ? STAGES.filter((item) => ["offer", "hired"].includes(item.id)) : STAGES;
  const resetFilter = (setter, value) => {
    setter(value);
    setPage(1);
  };
  const exportRows = () =>
    downloadCsv(
      hiring ? "contrataciones-prueba.csv" : "candidatos-prueba.csv",
      ["Nombre", "Correo", "Teléfono", "Vacante", "Etapa", "Postulación", "Ingreso"],
      filtered.map((candidate) => [
        candidate.name,
        candidate.email,
        candidate.phone,
        vacancyById.get(candidate.vacancyId)?.title,
        STAGES.find((item) => item.id === candidate.stage)?.singular,
        formatDate(candidate.submittedAt),
        candidate.hiring.startDate || "",
      ])
    );
  return (
    <div className={s.stack}>
      {hiring && (
        <div className={s.formHint}>
          <strong>De la oferta al primer día.</strong> Aquí aparecen las personas en Oferta y las
          contrataciones completadas. Abre un perfil para revisar los requisitos de ingreso.
        </div>
      )}
      <div className={s.between}>
        <FilterTabs
          label="Etapas de candidatos"
          value={stage}
          onChange={(value) => resetFilter(setStage, value)}
          items={[
            { id: "all", label: "Todos", count: all.length },
            ...stages.map((item) => ({
              ...item,
              count: all.filter((candidate) => candidate.stage === item.id).length,
            })),
          ]}
        />
      </div>
      <div className={s.filters}>
        <SearchInput
          value={search}
          onChange={(value) => resetFilter(setSearch, value)}
          label="Buscar en todos los candidatos"
          placeholder="Buscar nombre, correo o vacante…"
        />
        {!vacancyId && (
          <select
            className={s.select}
            style={{ width: "auto", maxWidth: "100%" }}
            aria-label="Filtrar por vacante"
            value={vacancy}
            onChange={(event) => resetFilter(setVacancy, event.target.value)}
          >
            <option value="all">Todas las vacantes</option>
            {data.vacancies.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        )}
        <select
          className={s.select}
          style={{ width: "auto" }}
          aria-label="Orden de candidatos"
          value={sort}
          onChange={(event) => resetFilter(setSort, event.target.value)}
        >
          <option value="recent">Más recientes</option>
          <option value="oldest">Más antiguos</option>
          <option value="name">Nombre A–Z</option>
        </select>
        <Button variant="outline" size="sm" onClick={exportRows} disabled={!filtered.length}>
          <Download size={14} />
          Descargar
        </Button>
      </div>
      {!filtered.length ? (
        <EmptyState
          icon={Users}
          title={
            search || stage !== "all" || vacancy !== "all"
              ? "Sin resultados con estos filtros"
              : hiring
              ? "Tus próximas contrataciones estarán aquí"
              : "Aquí comienza tu próximo equipo"
          }
          description={
            search || stage !== "all" || vacancy !== "all"
              ? "Prueba con otro nombre o limpia los filtros para ver a todos."
              : hiring
              ? "Cuando avances a una persona a Oferta podrás preparar su ingreso."
              : "Abre la vista pública de una vacante y envía una postulación de prueba."
          }
        >
          {(search || stage !== "all" || vacancy !== "all") && (
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setStage("all");
                setVacancy("all");
                setPage(1);
              }}
            >
              Limpiar filtros
            </Button>
          )}
        </EmptyState>
      ) : (
        <div className={s.panel}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Candidato</th>
                <th>Vacante</th>
                <th>Etapa</th>
                <th>{hiring ? "Ingreso" : "Postulación"}</th>
                <th>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((candidate) => (
                <tr key={candidate.id}>
                  <td>
                    <button onClick={() => onOpen(candidate.id, hiring ? "hiring" : "profile")}>
                      <Person candidate={candidate} />
                    </button>
                  </td>
                  <td>{vacancyById.get(candidate.vacancyId)?.title}</td>
                  <td>
                    <Badge stage={candidate.stage} />
                  </td>
                  <td>
                    {hiring
                      ? candidate.hiring.startDate
                        ? formatDate(candidate.hiring.startDate)
                        : "Por definir"
                      : formatDate(candidate.submittedAt)}
                  </td>
                  <td>
                    <button
                      className={s.iconButton}
                      aria-label={`Abrir expediente de ${candidate.name}`}
                      onClick={() => onOpen(candidate.id, hiring ? "hiring" : "profile")}
                    >
                      <ArrowUpRight size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className={s.candidateCards}>
            {rows.map((candidate) => (
              <button
                key={candidate.id}
                onClick={() => onOpen(candidate.id, hiring ? "hiring" : "profile")}
              >
                <Person candidate={candidate} />
                <span className={s.small}>{vacancyById.get(candidate.vacancyId)?.title}</span>
                <span className={s.between} style={{ width: "100%" }}>
                  <Badge stage={candidate.stage} />
                  <span className={s.small}>
                    {hiring && candidate.hiring.startDate
                      ? `Ingreso ${formatDate(candidate.hiring.startDate)}`
                      : formatDate(candidate.submittedAt)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      <Pagination page={currentPage} total={filtered.length} size={8} onChange={setPage} />
    </div>
  );
}
