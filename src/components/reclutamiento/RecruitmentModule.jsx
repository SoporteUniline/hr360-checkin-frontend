"use client";

import { useState } from "react";
import {
  BriefcaseBusiness,
  CalendarDays,
  Layers,
  Plus,
  UserCheck,
  Users,
  Inbox,
} from "lucide-react";
import { useSnackbar } from "notistack";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import EncabezadoPagina from "@/components/tabla/EncabezadoPagina";
import useReclutamientoDemo from "@/hooks/useReclutamientoDemo";
import { clone, uid, vacancyStatus } from "@/lib/reclutamiento/model";
import { ConfirmDialog, DemoBanner, EmptyState } from "./RecruitmentUI";
import VacanciesView from "./VacanciesView";
import VacancyWizard from "./VacancyWizard";
import VacancyDetail from "./VacancyDetail";
import CandidatesView from "./CandidatesView";
import CandidatePanel from "./CandidatePanel";
import CatalogDialog from "./CatalogDialog";
import s from "./reclutamiento.module.css";

export default function RecruitmentModule() {
  const { dataUser, isAuthChecked } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const userId = dataUser?.id_usuario || dataUser?.correo;
  const scope = userId ? `${dataUser.id_empresa || "sin-empresa"}:${userId}` : null;
  const { id, data, loaded, error, reload, update } = useReclutamientoDemo(scope);
  const [view, setView] = useState("vacancies");
  const [candidateStage, setCandidateStage] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [detailTab, setDetailTab] = useState("vacancy");
  const [wizard, setWizard] = useState(null);
  const [candidatePanel, setCandidatePanel] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [catalogs, setCatalogs] = useState(false);
  const [filters, setFilters] = useState({ query: "", status: "all", modality: "all", page: 1 });
  const success = (message) => enqueueSnackbar(message, { variant: "success" });
  const vacancy = data?.vacancies.find((item) => item.id === selectedId);
  const candidate = data?.candidates.find((item) => item.id === candidatePanel?.id);
  const saveVacancy = (value, publish, closeWizard = true) => {
    const ok = update((current) => ({
      ...current,
      vacancies: current.vacancies.some((item) => item.id === value.id)
        ? current.vacancies.map((item) =>
            item.id === value.id ? { ...value, updatedAt: new Date().toISOString() } : item
          )
        : [{ ...value, updatedAt: new Date().toISOString() }, ...current.vacancies],
    }));
    if (ok) {
      if (closeWizard) {
        setWizard(null);
        setSelectedId(value.id);
        setDetailTab(publish ? "publication" : "vacancy");
      }
      success(
        publish ? "Vacante publicada en la demostración." : "Cambios guardados en este navegador."
      );
    }
    return ok;
  };
  const action = (type, value) => {
    if (["edit", "form", "publish"].includes(type)) {
      setWizard({
        vacancy: value,
        initialStep: type === "form" ? 1 : type === "publish" && value.status !== "draft" ? 2 : 0,
      });
      return;
    }
    if (type === "duplicate") {
      const copy = {
        ...clone(value),
        id: uid(),
        title: `${value.title} · copia`,
        status: "draft",
        createdAt: new Date().toISOString(),
        publishedAt: null,
        closesOn: "",
        formVersion: 1,
      };
      if (update((current) => ({ ...current, vacancies: [copy, ...current.vacancies] }))) {
        setWizard({ vacancy: copy });
        success("Borrador duplicado. Personalízalo para continuar.");
      }
      return;
    }
    if (type === "pause" || type === "close") setConfirmation({ type, vacancy: value });
  };
  const confirmStatus = () => {
    const { type, vacancy: target } = confirmation;
    if (
      update((current) => ({
        ...current,
        vacancies: current.vacancies.map((item) =>
          item.id === target.id
            ? {
                ...item,
                status: type === "pause" ? "paused" : "closed",
                updatedAt: new Date().toISOString(),
              }
            : item
        ),
      }))
    ) {
      setConfirmation(null);
      success(
        type === "pause"
          ? "Vacante pausada. Puedes reabrirla cuando quieras."
          : "Vacante cerrada. Se conservaron los candidatos."
      );
    }
  };
  const changeCandidate = (candidateId, patch, activity) =>
    update((current) => ({
      ...current,
      candidates: current.candidates.map((item) =>
        item.id === candidateId
          ? {
              ...item,
              ...patch,
              activity: activity
                ? [...item.activity, { id: uid(), text: activity, at: new Date().toISOString() }]
                : item.activity,
            }
          : item
      ),
    }));
  const openCandidate = (candidateId, tab = "profile") =>
    setCandidatePanel({ id: candidateId, tab });
  const openVacancy = (vacancyId, tab = "vacancy") => {
    setSelectedId(vacancyId);
    setDetailTab(tab);
  };
  const goCandidates = (stage) => {
    setSelectedId(null);
    setCandidateStage(stage);
    setView("candidates");
  };
  if (!isAuthChecked || (scope && !loaded))
    return (
      <div className={s.loading} role="status">
        Preparando Reclutamiento…
      </div>
    );
  if (!data)
    return (
      <div className={s.root}>
        <EmptyState
          title="No se pudo abrir la demostración"
          description={error || "Necesitas una sesión de empresa para abrir este módulo."}
        >
          <Button variant="outline" onClick={reload}>
            Volver a intentar
          </Button>
        </EmptyState>
      </div>
    );
  const openCount = data.vacancies.filter((item) => vacancyStatus(item) === "open").length;
  const newCount = data.candidates.filter((item) => item.stage === "new").length;
  const interviewCount = data.candidates.filter((item) => item.stage === "interview").length;
  const offerCount = data.candidates.filter((item) => item.stage === "offer").length;
  return (
    <div className={`${s.root} ${s.stack}`}>
      <div className={s.pageHead}>
        <EncabezadoPagina
          icono={BriefcaseBusiness}
          titulo="Reclutamiento"
          subtitulo="Del primer contacto al primer día. Todo tu proceso, en un solo lugar."
        />
        <Button className={s.primary} onClick={() => setWizard({ vacancy: null })}>
          <Plus size={16} />
          Nueva vacante
        </Button>
      </div>
      <DemoBanner />
      {error && (
        <div className={s.error} role="alert">
          {error}{" "}
          <button onClick={reload} className="underline">
            Volver a intentar
          </button>
        </div>
      )}
      {vacancy ? (
        <VacancyDetail
          vacancy={vacancy}
          data={data}
          workspaceId={id}
          tab={detailTab}
          setTab={setDetailTab}
          onBack={() => setSelectedId(null)}
          onAction={action}
          onCandidate={openCandidate}
          onSave={(value) => saveVacancy(value, false, false)}
        />
      ) : (
        <>
          <div className={s.metrics}>
            <button
              className={s.metric}
              onClick={() => {
                setView("vacancies");
                setFilters((current) => ({ ...current, status: "open", page: 1 }));
              }}
            >
              <div>
                Vacantes publicadas
                <BriefcaseBusiness className={s.metricIcon} />
              </div>
              <strong>{openCount}</strong>
              <small>Recibiendo postulaciones</small>
            </button>
            <button className={s.metric} onClick={() => goCandidates("new")}>
              <div>
                Candidatos nuevos
                <Inbox className={s.metricIcon} />
              </div>
              <strong>{newCount}</strong>
              <small>Pendientes de revisar</small>
            </button>
            <button className={s.metric} onClick={() => goCandidates("interview")}>
              <div>
                En entrevista
                <CalendarDays className={s.metricIcon} />
              </div>
              <strong>{interviewCount}</strong>
              <small>Continúa la conversación</small>
            </button>
            <button className={s.metric} onClick={() => setView("hiring")}>
              <div>
                Listos para oferta
                <UserCheck className={s.metricIcon} />
              </div>
              <strong>{offerCount}</strong>
              <small>Prepara su incorporación</small>
            </button>
          </div>
          <Tabs
            value={view}
            onValueChange={(value) => {
              setView(value);
              setCandidateStage("all");
            }}
          >
            <TabsList className={s.mainTabs}>
              <TabsTrigger value="vacancies">
                <BriefcaseBusiness size={15} />
                Vacantes
              </TabsTrigger>
              <TabsTrigger value="candidates">
                <Users size={15} />
                Candidatos <span className={s.count}>{data.candidates.length}</span>
              </TabsTrigger>
              <TabsTrigger value="hiring">
                <UserCheck size={15} />
                Contrataciones
              </TabsTrigger>
            </TabsList>
            <TabsContent value="vacancies" className={s.tabContent}>
              <VacanciesView
                data={data}
                filters={filters}
                setFilters={setFilters}
                onAction={action}
                onOpen={openVacancy}
                onCreate={() => setWizard({ vacancy: null })}
              />
            </TabsContent>
            <TabsContent value="candidates" className={s.tabContent}>
              <CandidatesView
                key={candidateStage}
                data={data}
                initialStage={candidateStage}
                onOpen={openCandidate}
              />
            </TabsContent>
            <TabsContent value="hiring" className={s.tabContent}>
              <CandidatesView data={data} hiring onOpen={openCandidate} />
            </TabsContent>
          </Tabs>
          <div className={s.between}>
            <span className={s.small}>
              Selecciona una vacante para revisar su formulario y publicación.
            </span>
            <Button variant="ghost" size="sm" onClick={() => setCatalogs(true)}>
              <Layers size={14} />
              Catálogos de la vacante
            </Button>
          </div>
        </>
      )}
      {wizard && (
        <VacancyWizard
          initialStep={wizard.initialStep}
          vacancy={wizard.vacancy}
          data={data}
          onSave={saveVacancy}
          onClose={() => setWizard(null)}
        />
      )}
      {candidate && (
        <CandidatePanel
          key={candidate.id}
          candidate={candidate}
          vacancy={data.vacancies.find((item) => item.id === candidate.vacancyId)}
          data={data}
          onChange={changeCandidate}
          onClose={() => setCandidatePanel(null)}
          initialTab={candidatePanel.tab}
        />
      )}
      {confirmation && (
        <ConfirmDialog
          title={confirmation.type === "pause" ? "¿Pausar esta vacante?" : "¿Cerrar esta vacante?"}
          description={`“${confirmation.vacancy.title}” dejará de recibir postulaciones. Puedes reabrirla después.`}
          confirmLabel={confirmation.type === "pause" ? "Pausar vacante" : "Cerrar vacante"}
          onConfirm={confirmStatus}
          onClose={() => setConfirmation(null)}
        />
      )}
      {catalogs && (
        <CatalogDialog
          data={data}
          onSave={(modality) =>
            update((current) => ({ ...current, modalities: [...current.modalities, modality] }))
          }
          onClose={() => setCatalogs(false)}
        />
      )}
    </div>
  );
}
