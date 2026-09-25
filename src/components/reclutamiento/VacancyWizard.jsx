"use client";

import { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Check,
  MapPin,
  BriefcaseBusiness,
  Eye,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  clone,
  newVacancy,
  vacancyErrors,
  questionErrors,
  localDate,
} from "@/lib/reclutamiento/model";
import { Field, Modal } from "./RecruitmentUI";
import RichTextEditor, { RichDescription } from "./RichTextEditor";
import QuestionBuilder from "./QuestionBuilder";
import s from "./reclutamiento.module.css";

export default function VacancyWizard({ vacancy, data, onSave, onClose, initialStep = 0 }) {
  const initial = useRef(clone(vacancy || newVacancy()));
  const [draft, setDraft] = useState(initial.current);
  const [step, setStep] = useState(initialStep);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [discard, setDiscard] = useState(false);
  const patch = (value) => {
    setDraft((current) => ({ ...current, ...value }));
    setErrors((current) =>
      Object.fromEntries(
        Object.entries(current).filter(
          ([key]) => !(key in value) && !(key === "email" && value.notifications)
        )
      )
    );
    setFormError("");
  };
  const modality = data.modalities.find((item) => item.id === draft.modalityId);
  const branch = data.branches.find((item) => item.id === draft.branchId);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial.current);
  const close = () => {
    if (dirty) setDiscard(true);
    else onClose();
  };
  const validate = () => {
    const next = vacancyErrors(draft, data.modalities);
    setErrors(next);
    return next;
  };
  const nextStep = (target) => {
    setFormError("");
    if (target > 0) {
      const next = validate();
      if (Object.keys(next).some((key) => key !== "email")) {
        setStep(0);
        setFormError("Revisa los campos señalados para continuar.");
        return;
      }
    }
    if (target > 1) {
      const message = questionErrors(draft.questions);
      if (message) {
        setStep(1);
        setFormError(message);
        return;
      }
    }
    setStep(target);
  };
  const save = (publish) => {
    if (!draft.title.trim()) {
      setErrors({ title: "Escribe al menos el nombre del puesto para guardarlo." });
      setStep(0);
      return;
    }
    if (publish) {
      const next = validate();
      if (Object.keys(next).length) {
        setStep(next.email && Object.keys(next).length === 1 ? 2 : 0);
        setFormError("Revisa los campos señalados antes de publicar.");
        return;
      }
      const message = questionErrors(draft.questions);
      if (message) {
        setStep(1);
        setFormError(message);
        return;
      }
    }
    // Incluso al guardar, una vacante ya publicada debe seguir siendo válida.
    if (!publish && initial.current.status === "open") {
      const next = validate();
      const message = questionErrors(draft.questions);
      if (Object.keys(next).length || message) {
        setStep(message ? 1 : 0);
        setFormError(message || "Completa los datos de la vacante publicada.");
        return;
      }
    }
    const questions = draft.questions.map((question) => ({
      ...question,
      label: question.label.trim(),
      ...(question.options
        ? { options: question.options.map((option) => option.trim()).filter(Boolean) }
        : {}),
    }));
    const changed = JSON.stringify(questions) !== JSON.stringify(initial.current.questions);
    const result = {
      ...draft,
      title: draft.title.trim(),
      questions,
      openings: Number(draft.openings) || 1,
      formVersion: initial.current.formVersion + (changed && vacancy ? 1 : 0),
      status: publish ? "open" : draft.status,
      ...(publish ? { publishedAt: draft.publishedAt || new Date().toISOString() } : {}),
    };
    if (!onSave(result, publish))
      setFormError(
        "No se guardó el cambio. Revisa el espacio disponible en tu navegador y vuelve a intentar."
      );
  };
  const controls = (
    <>
      <button
        type="button"
        onClick={step ? () => setStep(step - 1) : close}
        className={`${s.row} ${s.muted}`}
      >
        <ArrowLeft size={15} />
        {step ? "Atrás" : "Cancelar"}
      </button>
      <div className={s.row}>
        <Button type="button" variant="outline" onClick={() => save(false)}>
          <Save size={14} />
          <span>{vacancy ? "Guardar" : "Guardar borrador"}</span>
        </Button>
        {step < 2 ? (
          <Button className={s.primary} onClick={() => nextStep(step + 1)}>
            Siguiente
            <ArrowRight size={14} />
          </Button>
        ) : (
          <Button className={s.primary} onClick={() => save(true)}>
            <Rocket size={14} />
            {vacancy?.status === "open" ? "Guardar publicación" : "Publicar prueba"}
          </Button>
        )}
      </div>
    </>
  );
  return (
    <Modal
      title={vacancy ? "Editar vacante" : "Crea tu próxima vacante"}
      description="Tres pasos sencillos. Puedes guardar un borrador y continuar después."
      onClose={close}
      beforeBody={
        <nav className={s.steps} aria-label="Pasos para crear vacante">
          {["Datos del puesto", "Formulario", "Publicación"].map((label, index) => (
            <button
              key={label}
              type="button"
              aria-current={index === step ? "step" : undefined}
              onClick={() => nextStep(index)}
            >
              <span>{index < step ? <Check size={12} /> : index + 1}</span>
              {label}
            </button>
          ))}
        </nav>
      }
      footer={
        discard ? (
          <>
            <span className={s.small}>¿Salir sin guardar los cambios?</span>
            <div className={s.row}>
              <Button variant="outline" onClick={() => setDiscard(false)}>
                Seguir editando
              </Button>
              <Button variant="destructive" onClick={onClose}>
                Salir sin guardar
              </Button>
            </div>
          </>
        ) : (
          controls
        )
      }
    >
      <div className={s.stack}>
        {formError && (
          <div role="alert" className={s.error}>
            {formError}
          </div>
        )}
        {step === 0 && (
          <>
            <div className={s.formGrid}>
              <Field label="Nombre del puesto *" error={errors.title} className={s.span2}>
                {(props) => (
                  <input
                    {...props}
                    autoFocus
                    value={draft.title}
                    maxLength={120}
                    placeholder="Ej. Auxiliar administrativo"
                    onChange={(event) => patch({ title: event.target.value })}
                  />
                )}
              </Field>
              <Field label="Modalidad *" error={errors.modalityId}>
                {(props) => (
                  <select
                    {...props}
                    value={draft.modalityId}
                    onChange={(event) => patch({ modalityId: event.target.value })}
                  >
                    {data.modalities.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Field
                label={`Sucursal${modality?.requiresBranch ? " *" : " · opcional"}`}
                error={errors.branchId}
                hint={
                  modality?.requiresBranch
                    ? "La ubicación pública se toma de esta sucursal."
                    : "En modalidad remota puedes omitir la sucursal."
                }
              >
                {(props) => (
                  <select
                    {...props}
                    value={draft.branchId}
                    onChange={(event) => patch({ branchId: event.target.value })}
                  >
                    <option value="">Selecciona una sucursal</option>
                    {data.branches.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Field label="Tipo de jornada">
                {(props) => (
                  <select
                    {...props}
                    value={draft.employmentType}
                    onChange={(event) => patch({ employmentType: event.target.value })}
                  >
                    {[
                      "Tiempo completo",
                      "Medio tiempo",
                      "Por proyecto",
                      "Prácticas profesionales",
                    ].map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                )}
              </Field>
              <Field label="Lugares disponibles *" error={errors.openings}>
                {(props) => (
                  <input
                    {...props}
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="999"
                    value={draft.openings}
                    onChange={(event) => patch({ openings: event.target.value })}
                  />
                )}
              </Field>
              <Field
                label="Fecha de cierre · opcional"
                error={errors.closesOn}
                hint="Después de esta fecha dejará de recibir postulaciones de prueba."
              >
                {(props) => (
                  <input
                    {...props}
                    type="date"
                    min={localDate()}
                    value={draft.closesOn}
                    onChange={(event) => patch({ closesOn: event.target.value })}
                  />
                )}
              </Field>
              <div className={s.field}>
                <span>Sueldo</span>
                <label className={s.check}>
                  <input
                    type="checkbox"
                    checked={draft.showSalary}
                    onChange={(event) => patch({ showSalary: event.target.checked })}
                  />
                  Mostrar rango de sueldo mensual
                </label>
                <span className={s.small}>En pesos mexicanos (MXN).</span>
              </div>
              {draft.showSalary && (
                <>
                  <Field label="Desde · MXN al mes" error={errors.salaryFrom}>
                    {(props) => (
                      <input
                        {...props}
                        type="number"
                        min="1"
                        inputMode="decimal"
                        value={draft.salaryFrom}
                        placeholder="12000"
                        onChange={(event) => patch({ salaryFrom: event.target.value })}
                      />
                    )}
                  </Field>
                  <Field label="Hasta · opcional">
                    {(props) => (
                      <input
                        {...props}
                        type="number"
                        min={draft.salaryFrom || 1}
                        inputMode="decimal"
                        value={draft.salaryTo}
                        placeholder="15000"
                        onChange={(event) => patch({ salaryTo: event.target.value })}
                      />
                    )}
                  </Field>
                </>
              )}
              <Field
                label="Acerca del puesto *"
                error={errors.description}
                hint="Cuenta qué hará la persona, qué necesita y qué ofrece tu empresa."
                className={s.span2}
              >
                {(props) => (
                  <RichTextEditor
                    {...props}
                    value={draft.description}
                    onChange={(description) => patch({ description })}
                  />
                )}
              </Field>
            </div>
            <div className={s.formHint}>
              Los catálogos de esta vista contienen ejemplos. En la integración, Sucursal usará la
              tabla existente y Modalidad su catálogo independiente.
            </div>
          </>
        )}
        {step === 1 && (
          <QuestionBuilder
            questions={draft.questions}
            onChange={(questions) => patch({ questions })}
          />
        )}
        {step === 2 && (
          <>
            <div className={s.demo}>
              <Eye size={18} />
              <div>
                <strong>Así está quedando tu vacante.</strong> Al publicar esta prueba podrás abrir
                el formulario completo. Todavía no recibe postulaciones reales.
              </div>
            </div>
            <div className={s.panel}>
              <div className={s.panelHead}>
                <div>
                  <div className={s.eyebrow}>{data.company}</div>
                  <h3 style={{ marginTop: 7, fontSize: 21 }}>{draft.title}</h3>
                  <div className={`${s.row} ${s.small}`} style={{ marginTop: 10 }}>
                    <MapPin size={13} />
                    {branch?.name || "Trabajo remoto"}
                    <BriefcaseBusiness size={13} />
                    {modality?.name} · {draft.employmentType}
                  </div>
                </div>
              </div>
              <div className={s.panelBody}>
                <RichDescription value={draft.description} />
                <p className={s.small}>
                  {draft.questions.length} preguntas ·{" "}
                  {draft.questions.filter((question) => question.required).length} obligatorias
                </p>
              </div>
            </div>
            <div className={s.formGrid}>
              <div className={s.span2}>
                <h3 className={s.personName}>Avisos de nuevas postulaciones</h3>
                <p className={s.muted}>Deja preparada la configuración de correo.</p>
              </div>
              <Field label="Correo de tu equipo" error={errors.email}>
                {(props) => (
                  <input
                    {...props}
                    type="email"
                    disabled={!draft.notifications.toTeam}
                    value={draft.notifications.email}
                    onChange={(event) =>
                      patch({
                        notifications: { ...draft.notifications, email: event.target.value },
                      })
                    }
                  />
                )}
              </Field>
              <div className={s.stack} style={{ gap: 10, justifyContent: "center" }}>
                <label className={s.check}>
                  <input
                    type="checkbox"
                    checked={draft.notifications.toTeam}
                    onChange={(event) =>
                      patch({
                        notifications: { ...draft.notifications, toTeam: event.target.checked },
                      })
                    }
                  />
                  Avisar al equipo
                </label>
                <label className={s.check}>
                  <input
                    type="checkbox"
                    checked={draft.notifications.toCandidate}
                    onChange={(event) =>
                      patch({
                        notifications: {
                          ...draft.notifications,
                          toCandidate: event.target.checked,
                        },
                      })
                    }
                  />
                  Confirmar recepción al candidato
                </label>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
