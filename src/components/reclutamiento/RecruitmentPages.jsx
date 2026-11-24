"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STAGES, VACANCY_STATUSES } from "@/lib/reclutamiento/model";
import { useRecruitment } from "./RecruitmentContext";
import { EmptyState } from "./RecruitmentUI";
import { RECRUITMENT_BASE as base, vacancyHref } from "./navigation";
import VacanciesView from "./VacanciesView";
import { InterruptorBolsa } from "@/components/whatsapp/EnlacesVacantes";
import VacancyDetail from "./VacancyDetail";
import CandidatesView from "./CandidatesView";
import CandidatePanel from "./CandidatePanel";
import CatalogDialog from "./CatalogDialog";
import s from "./reclutamiento.module.css";

export function VacanciesPage() {
  const { data, empresa, vacancyFilters, setVacancyFilters, action, openVacancy, createVacancy } =
    useRecruitment();
  const params = useSearchParams();
  const status = params.get("estado");
  const query = params.get("q");
  useEffect(() => {
    if (status || query)
      setVacancyFilters({
        query: query || "",
        status: VACANCY_STATUSES[status] ? status : "all",
        modality: "all",
        page: 1,
      });
  }, [status, query, setVacancyFilters]);
  // «Publicar mis vacantes en la bolsa de trabajo» a la vista, donde se crean las vacantes (antes solo estaba en
  // Conversaciones → Enlaces de vacantes, que sigue igual).
  return (
    <div className="space-y-3">
      {empresa ? <InterruptorBolsa idEmpresa={empresa} /> : null}
      <VacanciesView
        data={data}
        filters={vacancyFilters}
        setFilters={setVacancyFilters}
        onAction={action}
        onOpen={openVacancy}
        onCreate={createVacancy}
      />
    </div>
  );
}
export function VacancyRecord({ vacancyId }) {
  const { data, empresa, action, openCandidate, saveVacancy } = useRecruitment();
  const router = useRouter();
  const params = useSearchParams();
  const tab = ["vacancy", "form", "candidates", "publication", "whatsapp"].includes(params.get("seccion"))
    ? params.get("seccion")
    : "vacancy";
  const vacancy = data.vacancies.find((item) => item.id === vacancyId);
  if (!vacancy) return <MissingRecord href={`${base}/vacantes`} label="Volver a vacantes" />;
  return (
    <VacancyDetail
      vacancy={vacancy}
      data={data}
      empresa={empresa}
      tab={tab}
      setTab={(value) => router.replace(vacancyHref(vacancyId, value), { scroll: false })}
      onBack={() => router.push(`${base}/vacantes`)}
      onAction={action}
      onCandidate={openCandidate}
      onSave={(value) => saveVacancy(value, false, false)}
    />
  );
}
export function CandidatesPage({ hiring = false }) {
  const {
    data,
    candidateFilters,
    setCandidateFilters,
    hiringFilters,
    setHiringFilters,
    openCandidate,
  } = useRecruitment();
  const params = useSearchParams();
  const query = params.toString();
  const setFilters = hiring ? setHiringFilters : setCandidateFilters;
  useEffect(() => {
    if (!query) return;
    const search = new URLSearchParams(query);
    const stage = search.get("etapa");
    const days = search.get("dias");
    setFilters({
      search: "",
      stage: STAGES.some((item) => item.id === stage) ? stage : "all",
      vacancy: search.get("vacante") || "all",
      page: 1,
      sort: "recent",
      days: ["7", "30", "90"].includes(days) ? days : "all",
    });
  }, [query, setFilters]);
  return (
    <CandidatesView
      data={data}
      hiring={hiring}
      filters={hiring ? hiringFilters : candidateFilters}
      onFiltersChange={setFilters}
      onOpen={openCandidate}
    />
  );
}
export function CandidateRecord({ candidateId }) {
  const { data } = useRecruitment();
  const router = useRouter();
  const params = useSearchParams();
  const candidate =
    data.candidates.find((item) => item.id === candidateId) ||
    data.whatsappCandidates.find((item) => item.id === candidateId);
  if (!candidate) return <MissingRecord href={`${base}/candidatos`} label="Volver a candidatos" />;
  const tab = ["profile", "activity", "hiring"].includes(params.get("seccion"))
    ? params.get("seccion")
    : "profile";
  return (
    <div className={s.stack}>
      <Link href={`${base}/candidatos`} className={`${s.row} ${s.muted}`}>
        <ArrowLeft size={15} />
        Volver a candidatos
      </Link>
      <CandidatePanel
        key={`${candidateId}-${tab}`}
        embedded
        candidate={candidate}
        vacancy={data.vacancies.find((item) => item.id === candidate.vacancyId)}
        data={data}
        onClose={() => router.push(`${base}/candidatos`)}
        initialTab={tab}
      />
    </div>
  );
}
export function CatalogsPage() {
  const { data, addModality } = useRecruitment();
  return <CatalogDialog embedded data={data} onSave={addModality} />;
}
function MissingRecord({ href, label }) {
  return (
    <EmptyState
      title="No encontramos este registro"
      description="Puede que lo hayan quitado o que pertenezca a otra empresa. Consulta el listado para continuar."
    >
      <Button asChild variant="outline">
        <Link href={href}>{label}</Link>
      </Button>
    </EmptyState>
  );
}
