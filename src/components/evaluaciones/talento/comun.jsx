"use client";
// Piezas compartidas de las vistas de talento (docs/evaluaciones/talento.md).
import { useEvaluations, useEvaluationQuery } from "../EvaluationContext";
import "./talento.css";

const hoyMx = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());
export { hoyMx };

// Acción con el servidor: un solo envío a la vez (perform), aviso de éxito y del `warning` / `notice` que mande la API.
export function useTalento() {
  const ctx = useEvaluations();
  async function enviar(method, path, body, mensaje) {
    let respuesta = null;
    const ok = await ctx.perform(async () => {
      respuesta = await ctx.api.send(method, path, body);
      return respuesta ?? true;
    }, mensaje);
    if (ok && respuesta?.warning) ctx.notify(respuesta.warning, "warning");
    if (ok && respuesta?.notice) ctx.notify(respuesta.notice, "info");
    return ok ? respuesta : null;
  }
  const yo = ctx.capabilities?.employeeId != null ? Number(ctx.capabilities.employeeId) : null;
  return { ...ctx, enviar, yo, esRh: ctx.capabilities?.profile === "hr", esStaff: ["hr", "direction"].includes(ctx.capabilities?.profile) };
}

// Compañeros activos de la empresa (para elegir persona). Solo nombre, área y jefe.
export function useCompaneros() {
  const q = useEvaluationQuery("/colleagues");
  return q.data || [];
}

export function SelectPersona({ label, value, onChange, people, excluir = null, vacio = "Elige a la persona" }) {
  return (
    <label className="tl-label">
      {label}
      <select className="ev-input" value={value ?? ""} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}>
        <option value="">{vacio}</option>
        {people.filter((p) => Number(p.id) !== Number(excluir)).map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}{p.area ? ` · ${p.area}` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Elegir({ label, value, onChange, items }) {
  return (
    <div className="tl-label" role="group" aria-label={label}>
      {label}
      <div className="tl-choice">
        {items.map((it) => (
          <button type="button" key={it.value} aria-pressed={value === it.value} onClick={() => onChange(it.value)}>
            <strong>{it.label}</strong>
            {it.hint ? <><br /><span className="tl-muted">{it.hint}</span></> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

export const fecha = (v) => (v ? new Date(String(v).length <= 10 ? `${v}T12:00:00` : v).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }) : "—");
