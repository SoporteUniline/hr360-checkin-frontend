"use client";

import { useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
  Plus,
  LockKeyhole,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { QUESTION_TYPES, uid } from "@/lib/reclutamiento/model";
import { Field } from "./RecruitmentUI";
import s from "./reclutamiento.module.css";

function QuestionRow({ question, index, count, onChange, onMove, onDelete, editing, onEdit }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
  });
  const typeLabel =
    QUESTION_TYPES.find(([type]) => type === question.type)?.[1] ||
    (question.type === "email" ? "Correo electrónico" : "Teléfono");
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={s.question}
      data-dragging={isDragging}
    >
      <button
        type="button"
        className={`${s.iconButton} ${s.grip}`}
        {...attributes}
        {...listeners}
        aria-label={`Arrastrar pregunta ${index + 1}: ${question.label}`}
      >
        <GripVertical size={17} />
      </button>
      <div className={s.questionBody}>
        <div className={s.questionLabel}>
          {index + 1}. {question.label || "Pregunta sin título"}{" "}
          {question.required && <span className={s.small}>*</span>}
        </div>
        <div className={`${s.row} ${s.small}`} style={{ gap: 6, marginTop: 4 }}>
          {typeLabel}
          <span>·</span>
          {question.required ? "Obligatoria" : "Opcional"}
          {question.base && (
            <>
              <span>·</span>
              <LockKeyhole size={11} /> Dato de contacto
            </>
          )}
        </div>
      </div>
      <div className={s.questionActions}>
        <button
          className={s.iconButton}
          type="button"
          disabled={index === 0}
          aria-label={`Subir pregunta ${index + 1}`}
          onClick={() => onMove(index, index - 1)}
        >
          <ArrowUp size={15} />
        </button>
        <button
          className={s.iconButton}
          type="button"
          disabled={index === count - 1}
          aria-label={`Bajar pregunta ${index + 1}`}
          onClick={() => onMove(index, index + 1)}
        >
          <ArrowDown size={15} />
        </button>
        <button
          className={s.iconButton}
          type="button"
          aria-label={`Editar pregunta ${index + 1}`}
          aria-expanded={editing}
          onClick={onEdit}
        >
          <Pencil size={15} />
        </button>
        <button
          className={s.iconButton}
          type="button"
          disabled={question.base}
          title={question.base ? "Los datos de contacto se conservan" : "Eliminar pregunta"}
          aria-label={`Eliminar pregunta ${index + 1}`}
          onClick={onDelete}
        >
          <Trash2 size={15} />
        </button>
      </div>
      {editing && (
        <div className={`${s.questionEdit} ${s.span2}`} style={{ flexBasis: "100%" }}>
          <div className={s.formGrid}>
            <Field label="Título de la pregunta">
              {(props) => (
                <input
                  {...props}
                  value={question.label}
                  maxLength={200}
                  onChange={(event) => onChange({ label: event.target.value })}
                />
              )}
            </Field>
            <Field label="Tipo de respuesta">
              {(props) => (
                <select
                  {...props}
                  value={question.type}
                  disabled={question.base}
                  onChange={(event) =>
                    onChange({
                      type: event.target.value,
                      options: question.options || ["Opción 1", "Opción 2"],
                    })
                  }
                >
                  {question.base && !QUESTION_TYPES.some(([type]) => type === question.type) && (
                    <option value={question.type}>{typeLabel}</option>
                  )}
                  {QUESTION_TYPES.map(([type, label]) => (
                    <option key={type} value={type}>
                      {label}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>
          {["select", "multiselect"].includes(question.type) && (
            <Field
              label="Opciones de respuesta"
              hint="Una opción por línea. Agrega al menos dos diferentes."
            >
              {(props) => (
                <textarea
                  {...props}
                  value={(question.options || []).join("\n")}
                  maxLength={2500}
                  onChange={(event) => onChange({ options: event.target.value.split("\n") })}
                />
              )}
            </Field>
          )}
          <div className={s.between}>
            <label className={s.check}>
              <input
                type="checkbox"
                checked={question.required}
                disabled={question.base}
                onChange={(event) => onChange({ required: event.target.checked })}
              />
              Respuesta obligatoria
            </label>
            <Button type="button" variant="outline" size="sm" onClick={onEdit}>
              <Check size={14} />
              Listo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
export default function QuestionBuilder({ questions, onChange }) {
  const [editing, setEditing] = useState(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const move = (from, to) => {
    if (to >= 0 && to < questions.length) onChange(arrayMove(questions, from, to));
  };
  const add = () => {
    const id = uid();
    onChange([...questions, { id, label: "Nueva pregunta", type: "text", required: false }]);
    setEditing(id);
  };
  return (
    <div className={s.stack}>
      <div className={s.between}>
        <div>
          <h3 className={s.personName}>Tu formulario, a tu manera</h3>
          <p className={s.muted}>
            Pide solo lo necesario. Un formulario corto recibe más respuestas.
          </p>
        </div>
        <span className={s.small}>{questions.length} / 30 preguntas</span>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={({ active, over }) => {
          if (over && active.id !== over.id)
            move(
              questions.findIndex((question) => question.id === active.id),
              questions.findIndex((question) => question.id === over.id)
            );
        }}
        accessibility={{
          screenReaderInstructions: {
            draggable:
              "Para mover una pregunta, presiona espacio, usa las flechas y presiona espacio otra vez. Escape cancela.",
          },
        }}
      >
        <SortableContext
          items={questions.map((question) => question.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className={s.stack} style={{ gap: 10 }}>
            {questions.map((question, index) => (
              <QuestionRow
                key={question.id}
                question={question}
                index={index}
                count={questions.length}
                editing={editing === question.id}
                onEdit={() => setEditing(editing === question.id ? null : question.id)}
                onMove={move}
                onDelete={() => onChange(questions.filter((item) => item.id !== question.id))}
                onChange={(patch) =>
                  onChange(
                    questions.map((item) =>
                      item.id === question.id ? { ...item, ...patch } : item
                    )
                  )
                }
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <Button variant="outline" type="button" onClick={add} disabled={questions.length >= 30}>
        <Plus size={16} />
        Agregar pregunta
      </Button>
      <div className={s.formHint}>
        Arrastra desde los puntos o usa las flechas para cambiar el orden. Nombre, correo y teléfono
        identifican al candidato y siempre se conservan. Los cambios nuevos no alteran las
        respuestas ya recibidas.
      </div>
    </div>
  );
}
