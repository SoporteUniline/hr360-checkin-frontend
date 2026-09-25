"use client";

import { useId } from "react";
import { FlaskConical, Search, X, Inbox, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { VACANCY_STATUSES, STAGES } from "@/lib/reclutamiento/model";
import s from "./reclutamiento.module.css";

export function DemoBanner({ publicView = false }) {
  return (
    <div className={s.demo}>
      <FlaskConical size={17} />
      <div>
        <strong>Vista de diseño · datos de ejemplo.</strong>{" "}
        {publicView
          ? "Esta prueba funciona en este navegador. No envía correos ni postulaciones reales."
          : "Tus pruebas se guardan solo en este navegador. No modifican empleados ni envían correos."}{" "}
        Usa datos ficticios.
      </div>
    </div>
  );
}
export function Badge({ status, stage }) {
  const item = stage ? STAGES.find((value) => value.id === stage) : VACANCY_STATUSES[status];
  return (
    <span className={s.badge} data-tone={item?.tone || "neutral"}>
      {item?.singular || item?.label || status}
    </span>
  );
}
export function Field({ label, error, hint, children, className = "" }) {
  // Children is a render function so label, description and control share IDs.
  const id = useId();
  return (
    <div className={`${s.field} ${className}`}>
      <label htmlFor={id}>{label}</label>
      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": error || hint ? `${id}-help` : undefined,
      })}
      {error || hint ? (
        <span id={`${id}-help`} className={error ? s.fieldError : s.small}>
          {error || hint}
        </span>
      ) : null}
    </div>
  );
}
export function SearchInput({ value, onChange, label, placeholder }) {
  return (
    <div className={s.search}>
      <Search size={17} />
      <input
        type="search"
        aria-label={label}
        placeholder={placeholder || label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {value && (
        <button type="button" aria-label="Borrar búsqueda" onClick={() => onChange("")}>
          <X size={14} />
        </button>
      )}
    </div>
  );
}
export function EmptyState({ title, description, children, icon: Icon = Inbox }) {
  return (
    <div className={s.empty}>
      <Icon size={28} />
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function FilterTabs({ items, value, onChange, label }) {
  return (
    <div className={s.filterTabs} role="group" aria-label={label}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={value === item.id}
          onClick={() => onChange(item.id)}
        >
          {item.label}
          {item.count !== undefined && <span className={s.count}>{item.count}</span>}
        </button>
      ))}
    </div>
  );
}
export function Pagination({ page, total, size = 6, onChange }) {
  const pages = Math.max(1, Math.ceil(total / size));
  return (
    <div className={s.pagination}>
      <span role="status">
        {total
          ? `${(page - 1) * size + 1}–${Math.min(page * size, total)} de ${total} resultados`
          : "0 resultados"}
      </span>
      <div className={s.row}>
        <button
          className={s.iconButton}
          aria-label="Página anterior"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft size={16} />
        </button>
        <span>
          Página {page} de {pages}
        </span>
        <button
          className={s.iconButton}
          aria-label="Página siguiente"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
export function Modal({
  title,
  description,
  children,
  footer,
  onClose,
  className = "",
  beforeBody,
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className={`${s.dialog} ${s.root} ${className}`}>
        <DialogHeader className={s.dialogHeader}>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {beforeBody}
        <div className={s.dialogBody}>{children}</div>
        {footer && <div className={s.dialogFooter}>{footer}</div>}
      </DialogContent>
    </Dialog>
  );
}
export function ConfirmDialog({ title, description, confirmLabel, onConfirm, onClose }) {
  return (
    <Modal
      title={title}
      description={description}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button className={s.primary} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className={s.muted}>Los candidatos y su historial se conservarán.</p>
    </Modal>
  );
}
export function Person({ candidate }) {
  return (
    <div className={s.person}>
      <span className={s.avatar} aria-hidden="true">
        {candidate.name
          .split(/\s+/)
          .slice(0, 2)
          .map((word) => word[0])
          .join("")}
      </span>
      <div>
        <div className={s.personName}>{candidate.name}</div>
        <div className={s.small}>{candidate.email}</div>
      </div>
    </div>
  );
}
