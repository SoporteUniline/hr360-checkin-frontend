"use client";

import {
  ArrowUpRight,
  BriefcaseBusiness,
  Clock3,
  Copy,
  Download,
  MapPin,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  Users,
  Archive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  VACANCY_STATUSES,
  matches,
  vacancyStatus,
  formatDate,
  downloadCsv,
} from "@/lib/reclutamiento/model";
import { Badge, EmptyState, FilterTabs, Pagination, SearchInput } from "./RecruitmentUI";
import s from "./reclutamiento.module.css";

export function VacancyActions({ vacancy, onAction }) {
  const status = vacancyStatus(vacancy);
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button className={s.iconButton} aria-label={`Acciones de ${vacancy.title}`}>
          <MoreHorizontal size={19} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onAction("edit", vacancy)}>
          <Pencil size={14} />
          Editar vacante
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAction("duplicate", vacancy)}>
          <Copy size={14} />
          Duplicar como borrador
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {status === "open" ? (
          <DropdownMenuItem onSelect={() => onAction("pause", vacancy)}>
            <Pause size={14} />
            Pausar postulaciones
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => onAction("publish", vacancy)}>
            <Play size={14} />
            {status === "draft" ? "Revisar y publicar" : "Revisar y reabrir"}
          </DropdownMenuItem>
        )}
        {!["closed", "draft"].includes(status) && (
          <DropdownMenuItem onSelect={() => onAction("close", vacancy)}>
            <Archive size={14} />
            Cerrar vacante
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
export default function VacanciesView({ data, filters, setFilters, onAction, onOpen, onCreate }) {
  const { query, status, modality, page } = filters;
  const patch = (value) => setFilters((current) => ({ ...current, page: 1, ...value }));
  const filtered = data.vacancies
    .filter(
      (vacancy) =>
        (status === "all" || vacancyStatus(vacancy) === status) &&
        (modality === "all" || vacancy.modalityId === modality) &&
        matches(
          `${vacancy.title} ${
            data.branches.find((branch) => branch.id === vacancy.branchId)?.name || "remoto"
          } ${data.modalities.find((item) => item.id === vacancy.modalityId)?.name}`,
          query
        )
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 6)));
  const rows = filtered.slice((currentPage - 1) * 6, currentPage * 6);
  const items = [
    { id: "all", label: "Todas", count: data.vacancies.length },
    ...Object.keys(VACANCY_STATUSES).map((id) => ({
      id,
      label: {
        open: "Publicadas",
        draft: "Borradores",
        paused: "Pausadas",
        closed: "Cerradas",
        expired: "Vencidas",
      }[id],
      count: data.vacancies.filter((vacancy) => vacancyStatus(vacancy) === id).length,
    })),
  ];
  const exportRows = () =>
    downloadCsv(
      "vacantes-prueba.csv",
      ["Vacante", "Estado", "Sucursal", "Modalidad", "Lugares", "Candidatos", "Cierre"],
      filtered.map((vacancy) => [
        vacancy.title,
        VACANCY_STATUSES[vacancyStatus(vacancy)].label,
        data.branches.find((branch) => branch.id === vacancy.branchId)?.name || "",
        data.modalities.find((item) => item.id === vacancy.modalityId)?.name,
        vacancy.openings,
        data.candidates.filter((candidate) => candidate.vacancyId === vacancy.id).length,
        vacancy.closesOn,
      ])
    );
  return (
    <div className={s.stack}>
      <FilterTabs
        label="Estado de las vacantes"
        items={items}
        value={status}
        onChange={(value) => patch({ status: value })}
      />
      <div className={s.filters}>
        <SearchInput
          label="Buscar en todas las vacantes"
          placeholder="Buscar puesto, sucursal o modalidad…"
          value={query}
          onChange={(value) => patch({ query: value })}
        />
        <select
          aria-label="Filtrar por modalidad"
          className={s.select}
          style={{ width: "auto" }}
          value={modality}
          onChange={(event) => patch({ modality: event.target.value })}
        >
          <option value="all">Todas las modalidades</option>
          {data.modalities.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <Button variant="outline" size="sm" onClick={exportRows} disabled={!filtered.length}>
          <Download size={14} />
          Descargar
        </Button>
      </div>
      {!filtered.length ? (
        <EmptyState
          icon={BriefcaseBusiness}
          title={
            data.vacancies.length
              ? "No encontramos vacantes con estos filtros"
              : "Tu próximo equipo empieza aquí"
          }
          description={
            data.vacancies.length
              ? "Busca otro puesto o limpia los filtros para ver todas las vacantes."
              : "Crea una vacante, prepara tu formulario y revisa la página que compartirás."
          }
        >
          {data.vacancies.length ? (
            <Button
              variant="outline"
              onClick={() => patch({ query: "", status: "all", modality: "all" })}
            >
              Limpiar filtros
            </Button>
          ) : (
            <Button className={s.primary} onClick={onCreate}>
              <Plus size={15} />
              Crear mi primera vacante
            </Button>
          )}
        </EmptyState>
      ) : (
        <div className={s.vacancyGrid}>
          {rows.map((vacancy) => {
            const candidates = data.candidates.filter(
              (candidate) => candidate.vacancyId === vacancy.id
            );
            const newCount = candidates.filter((candidate) => candidate.stage === "new").length;
            const branch = data.branches.find((item) => item.id === vacancy.branchId);
            return (
              <article key={vacancy.id} className={s.vacancyCard}>
                <div className={s.between}>
                  <Badge status={vacancyStatus(vacancy)} />
                  <VacancyActions vacancy={vacancy} onAction={onAction} />
                </div>
                <h3>
                  <button className={s.titleButton} onClick={() => onOpen(vacancy.id)}>
                    {vacancy.title}
                  </button>
                </h3>
                <div className={s.jobFacts}>
                  <span>
                    <MapPin size={13} />
                    {branch?.name || "Sin sucursal · remoto"}
                  </span>
                  <span>
                    <BriefcaseBusiness size={13} />
                    {data.modalities.find((item) => item.id === vacancy.modalityId)?.name} ·{" "}
                    {vacancy.employmentType}
                  </span>
                  <span>
                    <Clock3 size={13} />
                    {vacancy.closesOn
                      ? `Cierra ${formatDate(vacancy.closesOn)}`
                      : "Sin fecha límite"}
                  </span>
                </div>
                <div className={s.cardBottom}>
                  <div className={s.row}>
                    <span className={s.small}>
                      {vacancy.openings}{" "}
                      {Number(vacancy.openings) === 1 ? "lugar disponible" : "lugares disponibles"}
                    </span>
                    {newCount > 0 && (
                      <span className={s.badge} data-tone="blue">
                        {newCount} {newCount === 1 ? "nuevo" : "nuevos"}
                      </span>
                    )}
                  </div>
                  <div className={s.cardFoot}>
                    <button onClick={() => onOpen(vacancy.id, "candidates")}>
                      <Users size={15} />
                      {candidates.length} candidatos
                    </button>
                    <button onClick={() => onOpen(vacancy.id)}>
                      Ver vacante
                      <ArrowUpRight size={14} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <Pagination
        total={filtered.length}
        page={currentPage}
        onChange={(value) => patch({ page: value })}
      />
    </div>
  );
}
