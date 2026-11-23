"use client";

// Reclutamiento y selección (03/12/2026: datos reales). Un solo estado compartido por todas las pantallas del módulo:
// el resumen de la empresa (SWR, /api/reclutamiento/panel/resumen) y las acciones que escriben en el servidor.
import { useCallback, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Plus, ChevronRight, Loader2 } from "lucide-react";
import { useSnackbar } from "notistack";
import { mutate as mutarClave } from "swr";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import EncabezadoPagina from "@/components/tabla/EncabezadoPagina";
import useReclutamiento from "@/hooks/useReclutamiento";
import * as api from "@/lib/reclutamiento/api";
import {
  VISTA_A_ETAPA,
  aCuerpoEtapa,
  aCuerpoVacante,
  aVacante,
  erroresDeCampos,
  mensajeError,
} from "@/lib/reclutamiento/adaptador.mjs";
import { STAGES } from "@/lib/reclutamiento/model";
import { ConfirmDialog, EmptyState } from "./RecruitmentUI";
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
  const empresa = dataUser?.id_empresa || null;
  const { data, error, isLoading, reload } = useReclutamiento(empresa);
  const [wizard, setWizard] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [working, setWorking] = useState(false);
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
  const success = useCallback(
    (message) => enqueueSnackbar(message, { variant: "success", autoHideDuration: 3000 }),
    [enqueueSnackbar]
  );
  const failure = useCallback(
    (cause, fallback) =>
      enqueueSnackbar(mensajeError(cause, fallback), { variant: "error", autoHideDuration: 6000 }),
    [enqueueSnackbar]
  );
  const openVacancy = (vacancyId, tab) => router.push(vacancyHref(vacancyId, tab));
  const openCandidate = (candidateId, tab) => router.push(candidateHref(candidateId, tab));
  // Después de escribir: el resumen se vuelve a pedir; el expediente toma la respuesta del servidor.
  const refresh = useCallback(() => reload(), [reload]);
  const keepDetail = (postulacion) => {
    if (postulacion?.id)
      mutarClave(api.rutaPostulacion(postulacion.id), { postulacion }, { revalidate: false });
  };

  // Devuelve { ok, errors, message } para que el asistente marque los campos que rechazó el servidor.
  const saveVacancy = async (value, publish, navigate = true) => {
    try {
      const body = aCuerpoVacante(value, publish);
      const saved = value.id
        ? await api.actualizarVacante(value.id, body)
        : await api.crearVacante(empresa, body);
      await refresh();
      if (navigate) {
        setWizard(null);
        openVacancy(String(saved.id), publish ? "publication" : "vacancy");
      }
      success(
        publish
          ? "Vacante publicada. Ya recibe postulaciones."
          : value.id
          ? "Cambios guardados."
          : "Borrador guardado."
      );
      return { ok: true };
    } catch (cause) {
      return {
        ok: false,
        errors: erroresDeCampos(cause),
        message: mensajeError(cause, "No se guardó la vacante. Intenta de nuevo."),
      };
    }
  };
  const action = async (type, vacancy) => {
    if (["edit", "form", "publish"].includes(type)) {
      setWizard({
        vacancy,
        initialStep: type === "form" ? 1 : type === "publish" && vacancy.status !== "draft" ? 2 : 0,
      });
      return;
    }
    if (type === "duplicate") {
      setWorking(true);
      try {
        const copy = await api.duplicarVacante(vacancy.id);
        await refresh();
        setWizard({ vacancy: aVacante(copy, data.modalities) });
        success("Borrador duplicado. Personalízalo para continuar.");
      } catch (cause) {
        failure(cause, "No se pudo duplicar la vacante.");
      } finally {
        setWorking(false);
      }
      return;
    }
    if (["pause", "close"].includes(type)) setConfirmation({ type, vacancy });
  };
  const confirmStatus = async () => {
    const { type, vacancy } = confirmation;
    setWorking(true);
    try {
      await api.cambiarEstadoVacante(vacancy.id, type === "pause" ? "pausar" : "cerrar");
      await refresh();
      setConfirmation(null);
      success(
        type === "pause" ? "Vacante pausada." : "Vacante cerrada. Se conservaron los candidatos."
      );
    } catch (cause) {
      failure(cause, "No se pudo cambiar el estado de la vacante.");
    } finally {
      setWorking(false);
    }
  };
  // Etapa de selección (no «hired»: eso es «Contratar»). true si se guardó.
  // Se ve al instante (sin esperar al servidor); si falla, regresa a la etapa anterior.
  // opciones (04/12/2026): { motivo } al descartar y { sugerencia: true } al aceptar la sugerencia del agente de WhatsApp.
  const changeStage = async (candidateId, stage, opciones) => {
    const etapa = VISTA_A_ETAPA[stage];
    try {
      await reload(
        async () => {
          keepDetail(await api.cambiarEtapa(candidateId, aCuerpoEtapa(stage, opciones)));
          return undefined;
        },
        {
          optimisticData: (current) =>
            current && {
              ...current,
              candidatos: current.candidatos.map((item) =>
                String(item.id) === String(candidateId) ? { ...item, etapa } : item
              ),
            },
          rollbackOnError: true,
          populateCache: false,
          revalidate: true,
        }
      );
      return true;
    } catch (cause) {
      failure(cause, "No se pudo cambiar la etapa.");
      return false;
    }
  };
  const addNote = async (candidateId, text) => {
    try {
      keepDetail(await api.agregarNota(candidateId, text));
      await refresh();
      return true;
    } catch (cause) {
      failure(cause, "No se guardó la nota.");
      return false;
    }
  };
  const savePreparation = async (candidateId, patch) => {
    try {
      keepDetail(await api.guardarPreparacion(candidateId, patch));
      await refresh();
      return true;
    } catch (cause) {
      failure(cause, "No se guardó la preparación del ingreso.");
      return false;
    }
  };
  // { ok, errors, message, result }
  const hire = async (candidateId, body) => {
    try {
      const result = await api.contratar(candidateId, body);
      keepDetail(result.postulacion);
      await refresh();
      success(
        result.empleado_existente
          ? "Contratación completada. Se enlazó con su ficha de empleado existente."
          : `Contratación completada. Se creó su ficha de empleado.${
              result.vacante_cerrada ? " La vacante se cerró: se ocuparon todos los lugares." : ""
            }`
      );
      return { ok: true, result };
    } catch (cause) {
      return {
        ok: false,
        errors: erroresDeCampos(cause),
        message: mensajeError(cause, "No se pudo completar la contratación."),
      };
    }
  };
  // Candidato de WhatsApp que aceptó el aviso pero aún no tiene proceso: un clic lo mete (04/12/2026). → id o null.
  const startWhatsapp = async (interviewId) => {
    try {
      const postulacion = await api.iniciarProcesoWhatsapp(interviewId);
      keepDetail(postulacion);
      await refresh();
      success("Listo: ya está en el proceso de selección como «Nuevo».");
      return String(postulacion.id);
    } catch (cause) {
      failure(cause, "No se pudo iniciar su proceso.");
      return null;
    }
  };
  const addModality = async (body) => {
    try {
      await api.crearModalidad(empresa, body);
      await refresh();
      success("Modalidad agregada al catálogo.");
      return { ok: true };
    } catch (cause) {
      return { ok: false, message: mensajeError(cause, "No se pudo guardar la modalidad.") };
    }
  };

  if (!isAuthChecked || (isLoading && !data))
    return (
      <div className={s.loading} role="status" aria-live="polite">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Cargando Reclutamiento y selección…
      </div>
    );
  if (!data)
    return (
      <div className={s.root}>
        <EmptyState
          title="No se pudo abrir Reclutamiento"
          description={
            !empresa
              ? "Necesitas una sesión de empresa para abrir este módulo."
              : mensajeError(error, "No se pudieron cargar tus vacantes. Intenta de nuevo.")
          }
        >
          {empresa && (
            <Button variant="outline" onClick={() => reload()}>
              Volver a intentar
            </Button>
          )}
        </EmptyState>
      </div>
    );
  const context = {
    data,
    empresa,
    error,
    working,
    success,
    failure,
    reload: refresh,
    saveVacancy,
    action,
    changeStage,
    addNote,
    savePreparation,
    hire,
    startWhatsapp,
    addModality,
    stageLabel: (id) => STAGES.find((item) => item.id === id)?.singular,
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
      <div className={`${s.root} ${s.stack}`} data-reclutamiento="">
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
        {error && (
          <div className={s.error} role="alert">
            {mensajeError(error, "No se pudo actualizar la información.")}{" "}
            <button className="underline" onClick={() => reload()}>
              Volver a intentar
            </button>
          </div>
        )}
        {data.incomplete && (
          <div className={s.formHint} role="status">
            Se muestran las 2,000 postulaciones más recientes. Usa los filtros de cada vacante para
            encontrar las anteriores.
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
            busy={working}
            onConfirm={confirmStatus}
            onClose={() => setConfirmation(null)}
          />
        )}
      </div>
    </RecruitmentContext.Provider>
  );
}
