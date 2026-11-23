"use client";

// Preguntas propias de la vacante (03/12/2026, Reclutamiento real): las define RH en el asistente del panel. El
// servidor las vuelve a validar y guarda la respuesta con el texto de la pregunta tal como se envió.
import { faltantes } from "@/lib/reclutamiento/respuestas.mjs";

const CAMPO = "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 md:text-sm min-h-11";

export { faltantes };

export default function PreguntasVacante({ preguntas = [], valores, onCambiar, errores = [], disabled }) {
  if (!preguntas.length) return null;
  const poner = (id, valor) => onCambiar({ ...valores, [id]: valor });
  return (
    <section className="space-y-4 pb-2" aria-labelledby="preguntas-vacante">
      <h3 id="preguntas-vacante" className="text-lg font-bold text-slate-700">Preguntas del puesto</h3>
      {preguntas.map((p) => {
        const id = `pregunta-${p.id}`;
        const valorActual = valores[p.id];
        // El aviso se quita en cuanto se responde (antes seguía en rojo hasta volver a enviar).
        const error = errores.includes(p.id) && (valorActual == null || valorActual === "" || (Array.isArray(valorActual) && !valorActual.length));
        const comun = { id, disabled, "aria-invalid": error || undefined, "aria-describedby": error ? `${id}-error` : undefined };
        const valor = valores[p.id] ?? (p.type === "multiselect" ? [] : "");
        return (
          <div key={p.id} className="grid gap-1.5">
            {p.type === "multiselect" ? (
              <fieldset className="grid gap-2" aria-describedby={comun["aria-describedby"]}>
                <legend className="text-sm font-medium text-slate-700">{p.label}{p.required ? " *" : ""}</legend>
                {p.options.map((o) => (
                  <label key={o} className="flex min-h-11 items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" className="size-4" disabled={disabled} checked={valor.includes(o)}
                      onChange={(e) => poner(p.id, e.target.checked ? [...valor, o] : valor.filter((x) => x !== o))} />
                    {o}
                  </label>
                ))}
              </fieldset>
            ) : (
              <>
                <label htmlFor={id} className="text-sm font-medium text-slate-700">{p.label}{p.required ? " *" : ""}</label>
                {p.type === "select" ? (
                  <select {...comun} className={CAMPO} value={valor} onChange={(e) => poner(p.id, e.target.value)}>
                    <option value="">Selecciona una opción</option>
                    {p.options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : p.type === "textarea" ? (
                  <textarea {...comun} className={`${CAMPO} min-h-24`} maxLength={2000} value={valor} onChange={(e) => poner(p.id, e.target.value)} />
                ) : (
                  <input {...comun} className={CAMPO} type={p.type === "number" ? "number" : p.type === "date" ? "date" : "text"}
                    inputMode={p.type === "number" ? "decimal" : undefined} maxLength={p.type === "text" ? 2000 : undefined}
                    value={valor} onChange={(e) => poner(p.id, e.target.value)} />
                )}
              </>
            )}
            {error ? <p id={`${id}-error`} className="text-sm text-red-600">Responde esta pregunta.</p> : null}
          </div>
        );
      })}
    </section>
  );
}
