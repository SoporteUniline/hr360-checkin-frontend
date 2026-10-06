"use client";
import { useState, useId, cloneElement } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Search,
  Inbox,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useEvaluations } from "./EvaluationContext";
import { scoreText } from "@/lib/evaluaciones/model.mjs";
export { Button };
export function ActionLink({ to, children, primary = false, ...props }) {
  const { href } = useEvaluations();
  return (
    <Button
      asChild
      variant={primary ? "default" : "outline"}
      className={primary ? "bg-blue-600 text-white hover:bg-blue-700" : ""}
    >
      <Link href={href(to)} {...props}>
        {children}
      </Link>
    </Button>
  );
}
export function Heading({ title, description, actions, back }) {
  return (
    <header className="ev-heading">
      {" "}
      <div>
        {back !== undefined && (
          <ActionLink to={back}>
            <ArrowLeft size={14} /> Volver
          </ActionLink>
        )}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="ev-actions">{actions}</div>
    </header>
  );
}
export function Panel({
  title,
  description,
  actions,
  children,
  className = "",
}) {
  return (
    <section className={`ev-panel ${className}`}>
      {(title || actions) && (
        <div className="ev-panel-head">
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
export function Field({ label, hint, children, className = "" }) {
  const id = useId();
  const control =
    children?.type === Input ||
    children?.type === Select ||
    children?.type === Textarea;
  return (
    <div className={`ev-field ${className}`}>
      <label htmlFor={control ? id : undefined}>{label}</label>
      <div>{control ? cloneElement(children, { id }) : children}</div>
      {hint && <small>{hint}</small>}
    </div>
  );
}

export function Input({ label, ...props }) {
  return <input aria-label={label} className="ev-input" {...props} />;
}
export function Select({ label, children, ...props }) {
  return (
    <select aria-label={label} className="ev-input" {...props}>
      {children}
    </select>
  );
}
export function Textarea({ label, ...props }) {
  return (
    <textarea
      aria-label={label}
      className="ev-input ev-textarea"
      maxLength={4000}
      {...props}
    />
  );
}
export function Toggle({ label, hint, checked, onChange, disabled = false }) {
  return (
    <label className="ev-toggle">
      <div>
        <strong>{label}</strong>
        {hint && <p>{hint}</p>}
      </div>
      <input
        type="checkbox"
        role="switch"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
    </label>
  );
}
export function Badge({ children, tone = "gray" }) {
  return <span className={`ev-badge ev-${tone}`}>{children}</span>;
}
const STATES = {
  active: ["Activa", "blue"],
  scheduled: ["Programada", "blue"],
  draft: ["Borrador", "gray"],
  closed: ["Cerrada", "gray"],
  pending: ["Pendiente", "amber"],
  submitted: ["Completada", "green"],
  in_progress: ["En proceso", "blue"],
  completed: ["Completado", "green"],
  overdue: ["Vencida", "red"],
};
export function Status({ value }) {
  const [label, tone] = STATES[value] || [value, "gray"];
  return <Badge tone={tone}>{label}</Badge>;
}
export function Metrics({ items }) {
  return (
    <div className="ev-metrics">
      {items.map(({ label, value, detail, tone }) => (
        <div className="ev-metric" key={label}>
          <span>{label}</span>
          <strong className={tone ? `ev-text-${tone}` : ""}>{value}</strong>
          <small>{detail}</small>
        </div>
      ))}
    </div>
  );
}
export function Progress({ value = 0, label }) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div className="ev-progress-wrap">
      {label && (
        <div>
          {label}
          <span>{Math.round(safe)}%</span>
        </div>
      )}
      <div
        className="ev-progress"
        role="progressbar"
        aria-label={label || "Avance"}
        aria-valuenow={safe}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <i style={{ width: `${safe}%` }} />
      </div>
    </div>
  );
}
export function Empty({
  title = "Sin resultados",
  description = "Prueba con otros filtros.",
  action,
}) {
  return (
    <div className="ev-empty">
      <Inbox size={26} />
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Notice({ children, tone = "blue" }) {
  return (
    <div
      className={`ev-notice ev-${tone}`}
      role={tone === "red" ? "alert" : undefined}
    >
      {children}
    </div>
  );
}
export function Errors({ errors = [] }) {
  return (
    errors.length > 0 && (
      <Notice tone="red">
        <strong>Revisa lo siguiente:</strong>
        <ul>
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </Notice>
    )
  );
}
export function SearchInput({
  value,
  onChange,
  placeholder = "Buscar en todos los registros…",
}) {
  return (
    <div className="ev-search">
      <Search size={16} />
      <Input
        type="search"
        label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
export function Segments({ items, value, onChange, label = "Vistas" }) {
  return (
    <div className="ev-segments" aria-label={label}>
      {items.map((item) => (
        <button
          type="button"
          key={item.value}
          aria-pressed={value === item.value}
          onClick={() => onChange(item.value)}
        >
          {item.label}
          {item.count !== undefined && <span>{item.count}</span>}
        </button>
      ))}
    </div>
  );
}
export function DataTable({
  columns,
  rows,
  empty = "No hay registros para estos filtros.",
  pageSize = 8,
}) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize)),
    current = Math.min(page, pages);
  return (
    <>
      <div className="ev-table-scroll">
        <table className="ev-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows
              .slice((current - 1) * pageSize, current * pageSize)
              .map((row) => (
                <tr key={row.id}>
                  {columns.map((c) => (
                    <td key={c.key} data-label={c.label}>
                      {c.render ? c.render(row) : row[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {!rows.length ? (
        <Empty description={empty} />
      ) : (
        <div className="ev-pagination">
          <span>
            {rows.length} registros · Página {current} de {pages}
          </span>
          <div>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Página anterior"
              disabled={current <= 1}
              onClick={() => setPage(current - 1)}
            >
              <ChevronLeft size={15} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Página siguiente"
              disabled={current >= pages}
              onClick={() => setPage(current + 1)}
            >
              <ChevronRight size={15} />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
export function Person({ person }) {
  return (
    <div className="ev-person">
      <span className="ev-avatar">
        {person.name
          .split(" ")
          .slice(0, 2)
          .map((n) => n[0])
          .join("")}
      </span>
      <div>
        <strong>{person.name}</strong>
        <small>
          {person.position} · {person.area}
        </small>
      </div>
    </div>
  );
}
export function ScoreBar({ label, score }) {
  return (
    <div className="ev-scorebar">
      <div>
        <span>{label}</span>
        <strong>
          {scoreText(score)} <small>/ 5</small>
        </strong>
      </div>
      <Progress value={score === null ? 0 : (score / 5) * 100} />
    </div>
  );
}
export function Confirm({
  open,
  onOpenChange,
  title,
  description,
  action = "Confirmar",
  onConfirm,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onConfirm}>{action}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="ev-dialog max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
export function Reorder({ index, total, onMove, label }) {
  return (
    <div className="ev-reorder">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={`Subir ${label}`}
        disabled={index === 0}
        onClick={() => onMove(index, index - 1)}
      >
        <ArrowUp size={14} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={`Bajar ${label}`}
        disabled={index === total - 1}
        onClick={() => onMove(index, index + 1)}
      >
        <ArrowDown size={14} />
      </Button>
    </div>
  );
}
export function moveItem(items, from, to) {
  const next = [...items];
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
}
export function downloadCsv(name, content) {
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
