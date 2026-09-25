"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Plus, ChevronRight } from "lucide-react";
import { useSnackbar } from "notistack";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import EncabezadoPagina from "@/components/tabla/EncabezadoPagina";
import useReclutamientoDemo from "@/hooks/useReclutamientoDemo";
import { clone, uid, formatDateTime } from "@/lib/reclutamiento/model";
import { ConfirmDialog, DemoBanner, EmptyState } from "./RecruitmentUI";
import VacancyWizard from "./VacancyWizard";
import { RecruitmentContext } from "./RecruitmentContext";
import {
  RECRUITMENT_BASE,
  RECRUITMENT_NAV,
  isRecruitmentNavActive,
  vacancyHref,
  candidateHref,
} from "./navigation";
import s from "./reclutamiento.module.css";
import m from "./module.module.css";

export default function RecruitmentModule({ children }) {
  const { dataUser, isAuthChecked } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();
  const pathname = usePathname();
  const userId = dataUser?.id_usuario || dataUser?.correo;
  const scope = userId ? `${dataUser.id_empresa || "sin-empresa"}:${userId}` : null;
  const { id, data, loaded, error, reload, update } = useReclutamientoDemo(scope);
  const [wizard, setWizard] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [vacancyFilters, setVacancyFilters] = useState({
    query: "",
    status: "all",
    modality: "all",
    page: 1,
  });
  const [candidateFilters, setCandidateFilters] = useState({
    search: "",
    stage: "all",
    vacancy: "all",
    page: 1,
    sort: "recent",
  });
  const [hiringFilters, setHiringFilters] = useState({
    search: "",
    stage: "all",
    vacancy: "all",
    page: 1,
    sort: "recent",
  });
  const section =
    RECRUITMENT_NAV.find((item) => isRecruitmentNavActive(pathname, item)) || RECRUITMENT_NAV[0];
  const success = (message) =>
    enqueueSnackbar(message, { variant: "success", autoHideDuration: 3000 });
  const openVacancy = (vacancyId, tab) => router.push(vacancyHref(vacancyId, tab));
  const openCandidate = (candidateId, tab) => router.push(candidateHref(candidateId, tab));
  const saveVacancy = (value, publish, navigate = true) => {
    const ok = update((current) => ({
      ...current,
      vacancies: current.vacancies.some((item) => item.id === value.id)
        ? current.vacancies.map((item) =>
            item.id === value.id ? { ...value, updatedAt: new Date().toISOString() } : item
          )
        : [{ ...value, updatedAt: new Date().toISOString() }, ...current.vacancies],
    }));
    if (ok) {
      if (navigate) {
        setWizard(null);
        openVacancy(value.id, publish ? "publication" : "vacancy");
      }
      success(
        publish ? "Vacante publicada en la demostración." : "Cambios guardados en este navegador."
      );
    }
    return ok;
  };
  const action = (type, vacancy) => {
    if (["edit", "form", "publish"].includes(type)) {
      setWizard({
        vacancy,
        initialStep: type === "form" ? 1 : type === "publish" && vacancy.status !== "draft" ? 2 : 0,
      });
      return;
    }
    if (type === "duplicate") {
      const copy = {
        ...clone(vacancy),
        id: uid(),
        title: `${vacancy.title} · copia`,
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
    if (["pause", "close"].includes(type)) setConfirmation({ type, vacancy });
  };
  const confirmStatus = () => {
    const { type, vacancy } = confirmation;
    if (
      update((current) => ({
        ...current,
        vacancies: current.vacancies.map((item) =>
          item.id === vacancy.id
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
        type === "pause" ? "Vacante pausada." : "Vacante cerrada. Se conservaron los candidatos."
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
  const scheduleInterview = (appointment) => {
    const ok = update((current) => {
      const candidate = current.candidates.find((item) => item.id === appointment.candidateId);
      if (!candidate || ["hired", "rejected"].includes(candidate.stage))
        throw new Error("Selecciona un candidato con un proceso activo.");
      if (
        !Number.isFinite(new Date(appointment.startsAt).getTime()) ||
        new Date(appointment.startsAt).getTime() <= Date.now()
      )
        throw new Error("La entrevista debe ser en una fecha y hora futuras.");
      const existing = current.interviews.find((item) => item.id === appointment.id);
      if (existing && existing.status !== "scheduled")
        throw new Error("Esta entrevista ya terminó o fue cancelada.");
      const saved = {
        ...appointment,
        id: appointment.id || uid(),
        status: "scheduled",
        duration: Number(appointment.duration) || 30,
      };
      const event = {
        id: uid(),
        at: new Date().toISOString(),
        text: `${existing ? "Entrevista reprogramada" : "Entrevista programada"}: ${formatDateTime(
          saved.startsAt
        )} · ${saved.location || "Medio por definir"} (prueba)`,
      };
      return {
        ...current,
        interviews: existing
          ? current.interviews.map((item) => (item.id === saved.id ? saved : item))
          : [...current.interviews, saved],
        candidates: current.candidates.map((item) =>
          item.id === candidate.id
            ? {
                ...item,
                stage: ["new", "review"].includes(item.stage) ? "interview" : item.stage,
                activity: [...item.activity, event],
              }
            : item
        ),
      };
    });
    if (ok) success("Entrevista guardada en la agenda de prueba.");
    return ok;
  };
  const changeInterviewStatus = (interviewId, status) =>
    update((current) => {
      const interview = current.interviews.find((item) => item.id === interviewId);
      if (
        !interview ||
        interview.status !== "scheduled" ||
        !["completed", "cancelled"].includes(status)
      )
        throw new Error("La entrevista ya fue actualizada. Revisa su estado.");
      return {
        ...current,
        interviews: current.interviews.map((item) =>
          item.id === interviewId ? { ...item, status } : item
        ),
        candidates: current.candidates.map((item) =>
          item.id === interview.candidateId
            ? {
                ...item,
                activity: [
                  ...item.activity,
                  {
                    id: uid(),
                    at: new Date().toISOString(),
                    text: `Entrevista del ${formatDateTime(interview.startsAt)} ${
                      status === "completed" ? "realizada" : "cancelada"
                    } (prueba)`,
                  },
                ],
              }
            : item
        ),
      };
    });
  if (!isAuthChecked || (scope && !loaded))
    return (
      <div className={s.loading} role="status">
        Preparando Reclutamiento y selección…
      </div>
    );
  if (!data)
    return (
      <div className={s.root}>
        <EmptyState
          title="No se pudo abrir el módulo"
          description={error || "Necesitas una sesión de empresa para abrir este módulo."}
        >
          <Button variant="outline" onClick={reload}>
            Volver a intentar
          </Button>
        </EmptyState>
      </div>
    );
  const context = {
    id,
    data,
    error,
    update,
    success,
    saveVacancy,
    action,
    changeCandidate,
    scheduleInterview,
    changeInterviewStatus,
    openCandidate,
    openVacancy,
    createVacancy: () => setWizard({ vacancy: null }),
    vacancyFilters,
    setVacancyFilters,
    candidateFilters,
    setCandidateFilters,
    hiringFilters,
    setHiringFilters,
  };
  return (
    <RecruitmentContext.Provider value={context}>
      <div className={`${s.root} ${s.stack}`}>
        <div className={m.breadcrumb}>
          <Link href={RECRUITMENT_BASE}>Reclutamiento y selección</Link>
          <ChevronRight size={12} />
          <span>{section.label}</span>
        </div>
        <div className={s.pageHead}>
          <EncabezadoPagina
            icono={section.icon}
            titulo={section.title}
            subtitulo={section.description}
          />
          <Button className={s.primary} onClick={context.createVacancy}>
            <Plus size={16} />
            Nueva vacante
          </Button>
        </div>
        <nav className={m.mobileNav} aria-label="Secciones de reclutamiento">
          {RECRUITMENT_NAV.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              aria-current={isRecruitmentNavActive(pathname, item) ? "page" : undefined}
            >
              <item.icon size={15} />
              {item.label}
            </Link>
          ))}
        </nav>
        <DemoBanner />
        {error && (
          <div className={s.error} role="alert">
            {error}{" "}
            <button className="underline" onClick={reload}>
              Volver a intentar
            </button>
          </div>
        )}
        {children}
        {wizard && (
          <VacancyWizard
            initialStep={wizard.initialStep}
            vacancy={wizard.vacancy}
            data={data}
            onSave={saveVacancy}
            onClose={() => setWizard(null)}
          />
        )}
        {confirmation && (
          <ConfirmDialog
            title={
              confirmation.type === "pause" ? "¿Pausar esta vacante?" : "¿Cerrar esta vacante?"
            }
            description={`“${confirmation.vacancy.title}” dejará de recibir postulaciones. Puedes reabrirla después.`}
            confirmLabel={confirmation.type === "pause" ? "Pausar vacante" : "Cerrar vacante"}
            onConfirm={confirmStatus}
            onClose={() => setConfirmation(null)}
          />
        )}
      </div>
    </RecruitmentContext.Provider>
  );
}
