"use client";

import { useRef, useState } from "react";
import {
  BriefcaseBusiness,
  MapPin,
  Clock3,
  Banknote,
  ArrowRight,
  Check,
  Upload,
  Building2,
  FileCheck2,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import useReclutamientoDemo from "@/hooks/useReclutamientoDemo";
import { uid, vacancyStatus, formatDate, money } from "@/lib/reclutamiento/model";
import { DemoBanner, EmptyState, Field } from "./RecruitmentUI";
import { RichDescription } from "./RichTextEditor";
import s from "./reclutamiento.module.css";

function ApplicationForm({ vacancy, onSubmit, error }) {
  const [values, setValues] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [consent, setConsent] = useState(false);
  const submitting = useRef(false);
  const form = useRef(null);
  const setValue = (id, value) => setValues((current) => ({ ...current, [id]: value }));
  const status = vacancyStatus(vacancy);
  const submit = (event) => {
    event.preventDefault();
    if (submitting.current) return;
    const errors = {};
    vacancy.questions.forEach((question) => {
      const value = values[question.id];
      if (
        question.required &&
        (value === undefined ||
          value === null ||
          (typeof value === "string" && !value.trim()) ||
          (Array.isArray(value) && !value.length))
      )
        errors[question.id] = "Completa esta respuesta.";
      if (question.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()))
        errors[question.id] = "Escribe un correo válido.";
      if (question.type === "tel" && value && value.replace(/\D/g, "").length < 8)
        errors[question.id] = "Escribe un teléfono de al menos 8 dígitos.";
    });
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      requestAnimationFrame(() => form.current?.querySelector('[aria-invalid="true"]')?.focus());
      return;
    }
    if (!consent) return;
    submitting.current = true;
    try {
      if (onSubmit(values)) setSubmitted(true);
    } finally {
      submitting.current = false;
    }
  };
  if (submitted)
    return (
      <div className={s.success} role="status">
        <FileCheck2 />
        <h2>¡Listo! Recibimos tu prueba</h2>
        <p className={s.muted}>
          La postulación de ejemplo ya aparece en Candidatos de esta vacante.
        </p>
        <p className={s.small}>
          No se envió ningún correo ni archivo. Puedes volver al panel para revisar el recorrido.
        </p>
      </div>
    );
  if (status !== "open")
    return (
      <div className={s.panelBody}>
        <EmptyState
          title={status === "draft" ? "Vista previa del borrador" : "Postulaciones no disponibles"}
          description={
            status === "draft"
              ? "Publica la prueba desde el panel para probar el envío del formulario."
              : "Esta vacante está pausada, cerrada o vencida. Su información sigue disponible para revisar el diseño."
          }
        />
      </div>
    );
  return (
    <div className={s.panelBody}>
      <h2 className={s.applyTitle}>Queremos conocerte</h2>
      <p className={s.muted}>Postúlate a este puesto en unos minutos.</p>
      <p className={s.small} style={{ marginTop: 5, marginBottom: 24 }}>
        * Respuestas obligatorias · Usa información ficticia
      </p>
      <form ref={form} className={s.stack} onSubmit={submit}>
        {error && (
          <p className={s.error} role="alert">
            {error}
          </p>
        )}
        {vacancy.questions.map((question) => (
          <Field
            key={question.id}
            label={`${question.label}${question.required ? " *" : " · opcional"}`}
            error={fieldErrors[question.id]}
          >
            {(props) => {
              const common = {
                ...props,
                required: question.required,
                value: values[question.id] ?? "",
                onChange: (event) => setValue(question.id, event.target.value),
              };
              if (question.type === "textarea")
                return <textarea {...common} maxLength={4000} rows={3} />;
              if (question.type === "select")
                return (
                  <select {...common}>
                    <option value="">Selecciona una opción</option>
                    {(question.options || []).map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                );
              if (question.type === "multiselect")
                return (
                  <div
                    {...props}
                    tabIndex={-1}
                    role="group"
                    aria-label={question.label}
                    className={s.stack}
                    style={{ gap: 8 }}
                  >
                    {(question.options || []).map((option) => (
                      <label key={option} className={s.check}>
                        <input
                          type="checkbox"
                          checked={(values[question.id] || []).includes(option)}
                          onChange={(event) =>
                            setValue(
                              question.id,
                              event.target.checked
                                ? [...(values[question.id] || []), option]
                                : (values[question.id] || []).filter((value) => value !== option)
                            )
                          }
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                );
              if (question.type === "file")
                return (
                  <div className={s.upload}>
                    <span className={s.row}>
                      <Upload size={16} />
                      PDF, DOC o DOCX · máximo 5 MB
                    </span>
                    <input
                      {...props}
                      type="file"
                      required={question.required}
                      accept=".pdf,.doc,.docx"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (
                          file &&
                          (file.size > 5 * 1024 * 1024 || !/\.(pdf|docx?)$/i.test(file.name))
                        ) {
                          event.target.value = "";
                          setValue(question.id, null);
                          setFieldErrors((current) => ({
                            ...current,
                            [question.id]: "Elige un PDF, DOC o DOCX de hasta 5 MB.",
                          }));
                          return;
                        }
                        setFieldErrors((current) => ({ ...current, [question.id]: "" }));
                        setValue(question.id, file ? { name: file.name, size: file.size } : null);
                      }}
                    />
                    <p style={{ marginTop: 7 }}>
                      En esta prueba se conserva solo el nombre. El archivo no se sube.
                    </p>
                  </div>
                );
              return (
                <input
                  {...common}
                  type={
                    ["email", "tel", "number", "date"].includes(question.type)
                      ? question.type
                      : "text"
                  }
                  maxLength={
                    question.type === "number" || question.type === "date" ? undefined : 500
                  }
                  autoComplete="off"
                />
              );
            }}
          </Field>
        ))}
        <label className={s.check}>
          <input
            type="checkbox"
            required
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
          />
          Entiendo que esta es una demostración y estoy usando datos ficticios.
        </label>
        <Button type="submit" className={s.primary} size="lg">
          Enviar postulación de prueba
          <ArrowRight size={16} />
        </Button>
        <p className={s.small}>
          En la versión final se mostrará el aviso de privacidad de la empresa antes de enviar.
        </p>
      </form>
    </div>
  );
}
export function VacancyPresentation({ data, vacancy, onSubmit, error }) {
  const branch = data.branches.find((item) => item.id === vacancy.branchId);
  const modality = data.modalities.find((item) => item.id === vacancy.modalityId);
  return (
    <>
      <header className={s.publicHero}>
        <div className={s.eyebrow}>Trabaja con nosotros</div>
        <h1>{vacancy.title || "Nombre del puesto"}</h1>
        <div className={s.publicFacts}>
          <span>
            <MapPin size={15} />
            {branch ? `${branch.name} · ${branch.address}` : "Trabajo remoto"}
          </span>
          <span>
            <BriefcaseBusiness size={15} />
            {modality?.name}
          </span>
          <span>
            <Clock3 size={15} />
            {vacancy.employmentType}
          </span>
          {vacancy.showSalary && vacancy.salaryFrom && (
            <span>
              <Banknote size={15} />
              {money(vacancy.salaryFrom)}
              {vacancy.salaryTo ? ` – ${money(vacancy.salaryTo)}` : ""} MXN / mes
            </span>
          )}
          {vacancy.closesOn && (
            <span>
              <CalendarDays size={15} />
              Cierre: {formatDate(vacancy.closesOn)}
            </span>
          )}
        </div>
        <div style={{ marginTop: 22 }}>
          <Button asChild className={s.primary}>
            <a href="#postulacion">
              Me interesa este puesto
              <ArrowRight size={15} />
            </a>
          </Button>
        </div>
      </header>
      <div className={s.publicGrid}>
        <section className={`${s.panel} ${s.publicDescription}`}>
          <h2>Acerca del puesto</h2>
          <RichDescription value={vacancy.description} />
          <div className={s.formHint} style={{ marginTop: 24 }}>
            <strong className={s.row}>
              <Check size={15} />
              Un proceso sencillo y cercano
            </strong>
            <p style={{ marginTop: 6 }}>
              Completa el formulario. El equipo revisará tu perfil y te contactará si avanza tu
              postulación.
            </p>
          </div>
        </section>
        <section id="postulacion" className={s.panel} style={{ scrollMarginTop: 24 }}>
          <ApplicationForm
            key={`${vacancy.id}-${vacancy.formVersion}`}
            vacancy={vacancy}
            onSubmit={onSubmit}
            error={error}
          />
        </section>
      </div>
    </>
  );
}
export default function PublicVacancy({ workspaceId, vacancyId }) {
  const { data, loaded, error, reload, update } = useReclutamientoDemo(null, workspaceId);
  const vacancy = data?.vacancies.find((item) => item.id === vacancyId);
  const apply = (values) =>
    update((latest) => {
      const current = latest.vacancies.find((item) => item.id === vacancyId);
      if (!current || vacancyStatus(current) !== "open")
        throw new Error("La vacante ya no recibe postulaciones. Actualiza la página.");
      if (current.formVersion !== vacancy.formVersion)
        throw new Error("El formulario cambió. Actualiza la página y revisa las preguntas nuevas.");
      const email = String(values.email || "")
        .trim()
        .toLowerCase();
      if (
        latest.candidates.some(
          (candidate) =>
            candidate.vacancyId === vacancyId && candidate.email.toLowerCase() === email
        )
      )
        throw new Error("Ya recibimos una prueba con este correo para esta vacante.");
      const at = new Date().toISOString();
      const candidate = {
        id: uid(),
        vacancyId,
        name: String(values.name).trim(),
        email,
        phone: String(values.phone).trim(),
        stage: "new",
        submittedAt: at,
        source: "Página de empleo · prueba",
        formVersion: current.formVersion,
        answers: current.questions.map((question) => ({
          id: question.id,
          label: question.label,
          type: question.type,
          value: values[question.id] ?? null,
        })),
        notes: [],
        activity: [{ id: uid(), text: "Postulación de prueba recibida", at }],
        hiring: { startDate: "", branchId: current.branchId, checklist: [] },
      };
      return { ...latest, candidates: [candidate, ...latest.candidates] };
    });
  return (
    <main className={`${s.root} ${s.publicRoot}`}>
      <nav className={s.publicNav} aria-label="Portal de empleo">
        <div className={s.wordmark}>
          <Building2 size={23} />
          {data?.company || "Portal de empleo"}
        </div>
        <span className={s.small}>
          Empleo con <strong>ADAMIA</strong>
        </span>
      </nav>
      <div className={s.publicWrap}>
        <DemoBanner publicView />
        {!loaded ? (
          <p role="status" className={s.loading}>
            Preparando la vacante…
          </p>
        ) : !vacancy ? (
          <div style={{ marginTop: 30 }}>
            <EmptyState
              title="Esta es una vista de prueba"
              description={
                error ||
                "Abre el enlace desde el mismo navegador donde creaste la vacante de ejemplo. La publicación real estará disponible al integrar el módulo."
              }
            >
              <Button variant="outline" onClick={reload}>
                Volver a intentar
              </Button>
            </EmptyState>
          </div>
        ) : (
          <VacancyPresentation data={data} vacancy={vacancy} onSubmit={apply} error={error} />
        )}
        <footer className={s.small} style={{ textAlign: "center", paddingTop: 32 }}>
          Diseño de reclutamiento · ADAMIA
        </footer>
      </div>
    </main>
  );
}
