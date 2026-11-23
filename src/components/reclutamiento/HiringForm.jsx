"use client";

// «Contratar» (03/12/2026; 04/12/2026 compartido con el chat de WhatsApp). Mismo formulario y reglas en Reclutamiento y
// en el chat: fecha de ingreso, sucursal, datos prellenados y lista de verificación. La contratación la hace el servidor
// en una transacción (crea o enlaza la ficha del empleado, ocupa un lugar y cierra la vacante al llenarse).
import { useState } from "react";
import { UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { aCuerpoContratacion, dividirNombre } from "@/lib/reclutamiento/adaptador.mjs";
import { Field } from "./RecruitmentUI";
import s from "./reclutamiento.module.css";

export const CHECKLIST = [
  ["data", "Datos del candidato revisados"],
  ["offer", "Oferta aceptada"],
  ["documents", "Documentación verificada"],
];

// actions: { savePreparation(id, patch), hire(id, cuerpo) → {ok, errors, message, result}, changeStage(id, stage) }.
// branches: sucursales [{id, name}]. vacancy: { unlimited, remaining } para avisar si ya no hay lugares.
// Reclutamiento le pasa las acciones de su contexto; el chat de WhatsApp, las de useAccionesPostulacion.
export default function HiringForm({ person, branches, vacancy, actions, onHired, compact = false }) {
  const { savePreparation, hire, changeStage } = actions;
  const names = dividirNombre(person.name);
  const [form, setForm] = useState(() => ({
    startDate: person.hiring.startDate,
    branchId: person.hiring.branchId || vacancy?.branchId || "",
    checklist: person.hiring.checklist,
    ...names,
    email: person.email,
    phone: person.phone,
  }));
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const hasOffer = person.stage === "offer";
  const full = vacancy && !vacancy.unlimited && vacancy.remaining === 0;
  const patch = (value, persist) => {
    setForm((current) => ({ ...current, ...value }));
    setErrors({});
    setMessage("");
    // Fecha, sucursal y lista se guardan al momento: cualquiera del equipo ve la preparación.
    if (persist) savePreparation(person.id, persist);
  };
  const ready =
    form.startDate &&
    form.branchId &&
    form.firstName.trim() &&
    form.lastName.trim() &&
    CHECKLIST.every(([id]) => form.checklist.includes(id));
  const submit = async () => {
    setBusy(true);
    const r = await hire(person.id, aCuerpoContratacion(form));
    setBusy(false);
    if (r.ok) onHired?.(r.result);
    else {
      setErrors(r.errors || {});
      setMessage(r.message);
    }
  };
  return (
    <div className={s.stack}>
      <div className={s.formHint} hidden={compact}>
        <strong>Prepara su llegada al equipo</strong>
        <p>
          Al completar la contratación se crea su ficha de empleado con estos datos (o se enlaza con
          la que ya tenga en tu empresa por correo o teléfono) y se ocupa un lugar de la vacante.
        </p>
      </div>
      {full && (
        <p className={s.error} role="alert">
          Ya se ocuparon todos los lugares de esta vacante. Edita la vacante y aumenta los lugares
          para contratar a alguien más.
        </p>
      )}
      {!hasOffer && (
        <div className={s.between}>
          <p className={s.muted}>Primero confirma que la persona está en Oferta.</p>
          <Button variant="outline" onClick={() => changeStage(person.id, "offer")}>
            Mover a Oferta
          </Button>
        </div>
      )}
      <div className={s.formGrid}>
        <Field label="Fecha de ingreso *" error={errors.startDate}>
          {(props) => (
            <input
              {...props}
              type="date"
              value={form.startDate}
              onChange={(event) =>
                patch({ startDate: event.target.value }, { fecha_ingreso: event.target.value })
              }
            />
          )}
        </Field>
        <Field
          label="Sucursal de alta *"
          error={errors.branchId}
          hint={branches.length ? undefined : "Da de alta tus sucursales en Catálogos."}
        >
          {(props) => (
            <select
              {...props}
              value={form.branchId}
              onChange={(event) =>
                patch(
                  { branchId: event.target.value },
                  { id_sucursal: event.target.value ? Number(event.target.value) : null }
                )
              }
            >
              <option value="">Selecciona una sucursal</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Nombre(s) *" error={errors.firstName}>
          {(props) => (
            <input
              {...props}
              value={form.firstName}
              maxLength={60}
              autoComplete="off"
              onChange={(event) => patch({ firstName: event.target.value })}
            />
          )}
        </Field>
        <Field label="Apellido paterno *" error={errors.lastName}>
          {(props) => (
            <input
              {...props}
              value={form.lastName}
              maxLength={60}
              autoComplete="off"
              onChange={(event) => patch({ lastName: event.target.value })}
            />
          )}
        </Field>
        <Field label="Apellido materno" error={errors.secondLastName}>
          {(props) => (
            <input
              {...props}
              value={form.secondLastName}
              maxLength={60}
              autoComplete="off"
              onChange={(event) => patch({ secondLastName: event.target.value })}
            />
          )}
        </Field>
        <Field
          label="Correo del empleado"
          error={errors.email}
          hint="Opcional. Debe ser distinto de una cuenta de usuario de ADAMIA."
        >
          {(props) => (
            <input
              {...props}
              type="email"
              inputMode="email"
              value={form.email}
              maxLength={150}
              onChange={(event) => patch({ email: event.target.value })}
            />
          )}
        </Field>
        <Field label="Teléfono" error={errors.phone}>
          {(props) => (
            <input
              {...props}
              type="tel"
              inputMode="tel"
              value={form.phone}
              maxLength={20}
              onChange={(event) => patch({ phone: event.target.value })}
            />
          )}
        </Field>
      </div>
      <div className={s.stack} style={{ gap: 12 }}>
        {CHECKLIST.map(([id, label]) => (
          <label className={s.check} key={id}>
            <input
              type="checkbox"
              checked={form.checklist.includes(id)}
              onChange={(event) => {
                const checklist = event.target.checked
                  ? [...form.checklist, id]
                  : form.checklist.filter((item) => item !== id);
                patch({ checklist }, { checklist });
              }}
            />
            {label}
          </label>
        ))}
      </div>
      {message && (
        <p className={s.error} role="alert">
          {message}
        </p>
      )}
      <div className={s.between}>
        <span className={s.small}>La fecha, la sucursal y la lista se guardan al cambiarlas.</span>
        <Button
          className={s.primary}
          disabled={!ready || !hasOffer || full || busy}
          loading={busy}
          onClick={submit}
        >
          <UserCheck size={15} />
          Completar contratación
        </Button>
      </div>
    </div>
  );
}
