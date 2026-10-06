"use client";
import { useEffect, useState } from "react";
import { useEvaluations } from "./EvaluationContext";
import {
  Heading,
  Panel,
  Field,
  Input,
  Textarea,
  Button,
  ActionLink,
  Badge,
  Progress,
  Empty,
  Notice,
  Errors,
  Confirm,
  Person,
} from "./ui";
import {
  PERSPECTIVES,
  progress,
  questions,
  validateAnswers,
  dateText,
  campaignStatus,
} from "@/lib/evaluaciones/model.mjs";
export function useUnsavedGuard(dirty) {
  useEffect(() => {
    if (!dirty) return;
    const unload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const click = (e) => {
      const target = e.target.closest(
        'a[href], [data-slot="sidebar-menu-button"]',
      );
      if (
        target &&
        !target.hasAttribute("download") &&
        !window.confirm(
          "Tienes cambios sin guardar. ¿Quieres salir de esta pantalla?",
        )
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const internal = (e) => {
      if (
        !window.confirm(
          "Tienes cambios sin guardar. ¿Quieres cambiar de perfil?",
        )
      )
        e.preventDefault();
    };
    window.addEventListener("evaluation-before-navigate", internal);
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("evaluation-before-navigate", internal);
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", click, true);
    };
  }, [dirty]);
}
export function AnswerControl({
  question: q,
  scale,
  value,
  onChange,
  disabled = false,
}) {
  if (q.type === "scale")
    return (
      <div className="ev-scale" role="group" aria-label={q.text}>
        {scale.map((s) => (
          <button
            type="button"
            key={s.value}
            aria-pressed={Number(value) === s.value}
            aria-label={`${q.text}: ${s.value}, ${s.label}`}
            title={s.description}
            disabled={disabled}
            onClick={() => onChange(s.value)}
          >
            <b>{s.value}</b>
            <span>{s.label}</span>
          </button>
        ))}
      </div>
    );
  if (q.type === "text")
    return (
      <Textarea
        label={q.text}
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Escribe tu respuesta…"
      />
    );
  if (q.type === "number")
    return (
      <Input
        type="number"
        step="any"
        min={q.min}
        max={q.max}
        label={`${q.text} (${q.min} a ${q.max})`}
        placeholder={`${q.min} a ${q.max}`}
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  const options =
    q.type === "boolean"
      ? [
          { id: true, label: "Sí" },
          { id: false, label: "No" },
        ]
      : q.options;
  return (
    <div role="radiogroup" aria-label={q.text}>
      {options.map((o) => (
        <label className="ev-option" key={String(o.id)}>
          <input
            type="radio"
            name={q.id}
            checked={value === o.id}
            onChange={() => onChange(o.id)}
            disabled={disabled}
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}
export function ResponseView({ id }) {
  const { state, actor, run, navigate } = useEvaluations(),
    assignment = state.assignments.find((a) => a.id === id);
  const [answers, setAnswers] = useState(assignment?.answers || {}),
    [comment, setComment] = useState(assignment?.comment || ""),
    [privateNote, setPrivateNote] = useState(assignment?.privateNote || ""),
    [categoryComments, setCategoryComments] = useState(
      assignment?.categoryComments || {},
    ),
    [section, setSection] = useState(0),
    [dirty, setDirty] = useState(false),
    [errors, setErrors] = useState([]),
    [confirm, setConfirm] = useState(false);
  useUnsavedGuard(dirty);
  if (!assignment || assignment.evaluatorId !== actor.id)
    return (
      <Empty
        title="Esta evaluación no está asignada a tu perfil"
        action={
          <ActionLink to="mis-pendientes">
            Mis evaluaciones pendientes
          </ActionLink>
        }
      />
    );
  const campaign = state.campaigns.find((c) => c.id === assignment.campaignId),
    person = state.people.find((p) => p.id === assignment.subjectId),
    template = assignment.template;
  const sent = assignment.status === "submitted",
    category = template.categories[section],
    count = progress({ ...assignment, answers });
  const locked = sent || campaignStatus(campaign) !== "active";
  const save = (submit) => {
    const issues = validateAnswers(template, answers, submit);
    setErrors(issues);
    if (issues.length) {
      setConfirm(false);
      const first = template.categories.findIndex(
        (c) =>
          validateAnswers({ ...template, categories: [c] }, answers, submit)
            .length,
      );
      if (first >= 0) setSection(first);
      return;
    }
    if (
      run(
        {
          type: submit ? "response.submit" : "response.save",
          id,
          answers,
          comment,
          privateNote,
          categoryComments,
        },
        submit
          ? "Evaluación enviada en la demostración"
          : "Borrador guardado en este navegador",
      )
    ) {
      setDirty(false);
      setConfirm(false);
      if (submit) navigate("mis-pendientes");
    }
  };
  return (
    <>
      <Heading
        title={
          sent
            ? "Evaluación completada"
            : `Evaluar a ${person.name.split(" ")[0]}`
        }
        description={campaign.name}
        back="mis-pendientes"
        actions={
          <Badge tone="blue">{PERSPECTIVES[assignment.perspective]}</Badge>
        }
      />
      <div className="ev-editor-grid">
        <div className="ev-stack">
          <Panel>
            <div className="ev-pad ev-stack">
              <Person person={person} />
              <div className="ev-category-row">
                <small>
                  {dateText(campaign.periodStart)} —{" "}
                  {dateText(campaign.periodEnd)}
                </small>
                <small>Fecha límite: {dateText(campaign.dueOn)}</small>
              </div>
              <Progress
                value={(count.answered / count.total) * 100}
                label={`${count.answered} de ${count.total} preguntas respondidas`}
              />
            </div>
          </Panel>
          {sent && (
            <Notice tone="green">
              Enviada el {dateText(assignment.submittedAt)}. Las respuestas
              quedan cerradas.
            </Notice>
          )}
          {!sent && locked && (
            <Notice tone="amber">
              La campaña está fuera de su periodo de respuesta. Puedes consultar
              el borrador, pero no modificarlo.
            </Notice>
          )}
          <Errors errors={errors} />
          <Panel
            title={`${section + 1}. ${category.name}`}
            description="Selecciona la respuesta que mejor describa el desempeño observado."
            actions={<Badge>{category.weight}%</Badge>}
          >
            <div className="ev-pad">
              {category.questions.map((q, i) => (
                <div className="ev-question" key={q.id}>
                  <div className="ev-question-title">
                    {i + 1}. {q.text}
                    {q.required && <span className="ev-text-red"> *</span>}
                  </div>
                  <AnswerControl
                    question={q}
                    scale={template.scale}
                    value={answers[q.id]}
                    disabled={locked}
                    onChange={(value) => {
                      setAnswers({ ...answers, [q.id]: value });
                      setDirty(true);
                    }}
                  />
                  {!q.required && (
                    <button
                      type="button"
                      className="ev-link mt-2 text-xs"
                      disabled={locked}
                      onClick={() => {
                        const next = { ...answers };
                        delete next[q.id];
                        setAnswers(next);
                        setDirty(true);
                      }}
                    >
                      Limpiar respuesta opcional
                    </button>
                  )}
                </div>
              ))}
              <Field label="Comentarios de esta categoría (opcional)">
                <Textarea
                  label="Comentarios de categoría"
                  value={categoryComments[category.id] || ""}
                  disabled={locked}
                  onChange={(e) => {
                    setCategoryComments({
                      ...categoryComments,
                      [category.id]: e.target.value,
                    });
                    setDirty(true);
                  }}
                />
              </Field>
            </div>
          </Panel>
          {section === template.categories.length - 1 && (
            <Panel title="Comentarios finales">
              <div className="ev-pad ev-stack">
                <Field
                  label="Fortalezas y oportunidades de mejora"
                  hint="RH podrá compartir este comentario según los permisos de la campaña."
                >
                  <Textarea
                    label="Comentarios finales"
                    value={comment}
                    disabled={locked}
                    onChange={(e) => {
                      setComment(e.target.value);
                      setDirty(true);
                    }}
                  />
                </Field>
                <Field
                  label="Nota privada para RH"
                  hint="Esta nota no se publica en el resultado del colaborador."
                >
                  <Textarea
                    label="Nota privada para RH"
                    value={privateNote}
                    disabled={locked}
                    onChange={(e) => {
                      setPrivateNote(e.target.value);
                      setDirty(true);
                    }}
                  />
                </Field>
              </div>
            </Panel>
          )}
          <div className="ev-footer">
            <Button
              variant="outline"
              disabled={section === 0}
              onClick={() => setSection(section - 1)}
            >
              Anterior
            </Button>
            <div className="ev-actions">
              {!locked && (
                <Button variant="outline" onClick={() => save(false)}>
                  Guardar borrador
                </Button>
              )}
              {section < template.categories.length - 1 ? (
                <Button onClick={() => setSection(section + 1)}>
                  Siguiente sección
                </Button>
              ) : (
                !locked && (
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      const issues = validateAnswers(template, answers, true);
                      setErrors(issues);
                      if (!issues.length) setConfirm(true);
                    }}
                  >
                    Enviar evaluación
                  </Button>
                )
              )}
            </div>
          </div>
        </div>
        <aside className="ev-stack ev-sticky">
          <Panel title="Secciones">
            <div className="ev-pad ev-stack">
              {template.categories.map((c, i) => {
                const amount = questions({
                  ...template,
                  categories: [c],
                }).filter(
                  (q) => answers[q.id] !== undefined && answers[q.id] !== "",
                ).length;
                return (
                  <button
                    type="button"
                    key={c.id}
                    className={`ev-category-row ${section === i ? "ev-link" : ""}`}
                    onClick={() => setSection(i)}
                    aria-current={section === i ? "step" : undefined}
                  >
                    <span>
                      {i + 1}. {c.name}
                    </span>
                    <small>
                      {amount}/{c.questions.length}
                    </small>
                  </button>
                );
              })}
            </div>
          </Panel>
          <Panel title="Guía de calificación">
            <div className="ev-pad ev-stack">
              {template.scale.map((s) => (
                <div key={s.value}>
                  <strong>
                    {s.value} · {s.label}
                  </strong>
                  <p>{s.description}</p>
                </div>
              ))}
            </div>
          </Panel>
          <Notice tone={dirty ? "amber" : "blue"}>
            {dirty
              ? "Tienes cambios sin guardar. Guarda el borrador antes de salir."
              : sent
                ? "Evaluación enviada."
                : "Puedes guardar un borrador y continuar después."}
          </Notice>
          {["peer", "ascending"].includes(assignment.perspective) && (
            <small>
              Los resultados de esta perspectiva se muestran conforme a la regla
              de confidencialidad de la campaña.
            </small>
          )}
        </aside>
      </div>
      <Confirm
        open={confirm}
        onOpenChange={setConfirm}
        title="Enviar evaluación"
        description="Revisa tus respuestas. Después de enviarla no podrás modificarlas."
        action="Confirmar envío"
        onConfirm={() => save(true)}
      />
    </>
  );
}
