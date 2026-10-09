"use client";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Package } from "lucide-react";
import EncabezadoPagina from "@/components/tabla/EncabezadoPagina";
import { useActivos } from "./ActivosProvider";
export const ROOT = "/panel/control-activos";
export function ResourceLink({ to = "", children, ...props }) {
  const ctx = useActivos();
  const separator = to.includes("?") ? "&" : "?";
  return (
    <Link
      href={`${ctx?.self ? "/empleado/panel/mis-recursos" : ROOT}${ctx?.self && to === "/resguardos" ? "" : to}${separator}empresa=${ctx?.company.id || ""}`}
      {...props}
    >
      {children}
    </Link>
  );
}
export function Heading({ title, subtitle, children }) {
  return (
    <div className="mb-5">
      <EncabezadoPagina icono={Package} titulo={title} subtitulo={subtitle} />
      {children && (
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          {children}
        </div>
      )}
    </div>
  );
}
export function Badge({ children, tone = "blue" }) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-800",
    gray: "bg-slate-100 text-slate-600",
    red: "bg-red-50 text-red-700",
  };
  return (
    <span
      className={`inline-flex rounded-md px-2 py-1 text-[11px] font-semibold ${colors[tone]}`}
    >
      {children}
    </span>
  );
}
export function Panel({ title, actions, children }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-800">{title}</h2>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}
export function Field({ label, children, hint }) {
  return (
    <label className="grid content-start gap-1.5 text-xs font-medium text-slate-600">
      {label}
      {children}
      {hint && <span className="font-normal text-slate-400">{hint}</span>}
    </label>
  );
}
export function Select({ children, ...props }) {
  return (
    <select
      {...props}
      className={`h-10 w-full min-w-0 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 ${
        props.className || ""
      }`}
    >
      {children}
    </select>
  );
}
export function Textarea(props) {
  return (
    <textarea
      {...props}
      className="min-h-24 w-full rounded-md border border-slate-200 p-3 text-sm text-slate-800"
    />
  );
}
export function Empty({ children = "No hay registros para mostrar." }) {
  return (
    <div className="p-8 text-center text-sm text-slate-500">{children}</div>
  );
}
export function Stats({ items }) {
  return (
    <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map(([label, value]) => (
        <div
          key={label}
          className="rounded-lg border border-slate-200 bg-white px-4 py-4"
        >
          <div className="text-xs text-slate-500">{label}</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-800">
            {value}
          </div>
        </div>
      ))}
    </div>
  );
}
export function Table({ headers, children }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left text-[13px]">
        <thead className="bg-blue-50/60 text-[11px] uppercase tracking-wide text-slate-500">
          <tr>
            {headers.map((h) => (
              <th key={h} className="whitespace-nowrap px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 [&_td]:px-4 [&_td]:py-3.5 [&_td]:align-middle">
          {children}
        </tbody>
      </table>
    </div>
  );
}
export function SearchBox({ value, onChange, placeholder = "Buscar…" }) {
  return (
    <div className="relative w-full sm:max-w-sm">
      <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
      <Input
        className="bg-white pl-9"
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
export function matches(query, ...values) {
  const normalize = (s) =>
    String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  return normalize(values.join(" ")).includes(normalize(query));
}
export function PagedRows({ rows, render, columns }) {
  const [page, setPage] = useState(0);
  const count = Math.ceil(rows.length / 10);
  const actual = Math.min(page, Math.max(0, count - 1));
  return (
    <>
      {rows.length ? (
        rows.slice(actual * 10, actual * 10 + 10).map(render)
      ) : (
        <tr>
          <td colSpan={columns}>
            <Empty />
          </td>
        </tr>
      )}
      {count > 1 && (
        <tr>
          <td colSpan={columns}>
            <div className="flex items-center justify-end gap-3 text-xs">
              <Button
                size="sm"
                variant="outline"
                disabled={!actual}
                onClick={() => setPage(actual - 1)}
              >
                Anterior
              </Button>
              {actual + 1} / {count}
              <Button
                size="sm"
                variant="outline"
                disabled={actual === count - 1}
                onClick={() => setPage(actual + 1)}
              >
                Siguiente
              </Button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
export const money = (value) =>
  Number(value || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });
export function dateLabel(value) {
  if (!value) return "Sin fecha";
  return new Date(value + "T12:00:00").toLocaleDateString("es-MX");
}
export function downloadCsv(name, rows) {
  const cell = (v) =>
    '"' +
    String(v ?? "")
      .replace(/^[=+@-]/, "'$&")
      .replace(/"/g, '""') +
    '"';
  const blob = new Blob(
    ["\uFEFF" + rows.map((r) => r.map(cell).join(",")).join("\r\n")],
    { type: "text/csv;charset=utf-8" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
