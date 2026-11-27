"use client";

// Preguntas del puesto en grande (bolsa v2, 27/11/2026): Sí / No y opciones cortas como botones grandes (radios nativos),
// muchas opciones en una lista desplegable, varias respuestas con casillas grandes y lo demás en campos de 20 px.
// Mismas props que PreguntasVacante; el servidor vuelve a validar todo. Lo usan la solicitud corta de la vacante y el
// formulario de la entrevista por enlace (/postular/<token>).
import { faltantes } from "@/lib/reclutamiento/respuestas.mjs";

export { faltantes };

const BOTONES_MAX = 6;

export default function PreguntasGrandes({ preguntas = [], valores, onCambiar, errores = [], disabled, titulo = "Preguntas del puesto" }) {
  if (!preguntas.length) return null;
  const poner = (id, valor) => onCambiar({ ...valores, [id]: valor });
  return (
    <section className="bt2-preguntas" aria-labelledby="preguntas-vacante">
      {titulo ? <h3 id="preguntas-vacante">{titulo}</h3> : <span id="preguntas-vacante" className="sr-only">Preguntas</span>}
      {preguntas.map((p) => {
        const id = `pregunta-${p.id}`;
        const actual = valores[p.id];
        // El aviso se quita en cuanto se responde, sin esperar a volver a enviar.
        const vacia = actual == null || actual === "" || (Array.isArray(actual) && !actual.length);
        const error = errores.includes(p.id) && vacia;
        const idError = `${id}-error`;
        const etiqueta = <>{p.label}{p.required ? null : <span className="bt2-opcional"> (opcional)</span>}</>;
        const aviso = error ? <p id={idError} className="bt2-error">Responde esta pregunta.</p> : null;
        const opciones = Array.isArray(p.options) ? p.options : [];

        if (p.type === "multiselect") {
          const lista = Array.isArray(actual) ? actual : [];
          return (
            <fieldset key={p.id} id={id} className="bt2-pregunta" aria-describedby={error ? idError : undefined} aria-invalid={error || undefined}>
              <legend>{etiqueta}</legend>
              <div className="bt2-varias">
                {opciones.map((o) => (
                  <label key={o} className="bt2-casilla-op">
                    <input type="checkbox" disabled={disabled} checked={lista.includes(o)}
                      onChange={(e) => poner(p.id, e.target.checked ? [...lista, o] : lista.filter((x) => x !== o))} />
                    <span>{o}</span>
                  </label>
                ))}
              </div>
              {aviso}
            </fieldset>
          );
        }
        if (p.type === "select" && opciones.length <= BOTONES_MAX) {
          const dos = opciones.length === 2;
          return (
            <fieldset key={p.id} id={id} className="bt2-pregunta" aria-describedby={error ? idError : undefined} aria-invalid={error || undefined}>
              <legend>{etiqueta}</legend>
              <div className={`bt2-botones${dos ? " dos" : ""}`}>
                {opciones.map((o) => (
                  <label key={o} className="bt2-boton-op">
                    <input type="radio" name={id} value={o} disabled={disabled} checked={actual === o} onChange={() => poner(p.id, o)} />
                    <span>{o}</span>
                  </label>
                ))}
              </div>
              {aviso}
            </fieldset>
          );
        }
        const comun = { id, disabled, "aria-invalid": error || undefined, "aria-describedby": error ? idError : undefined };
        const valor = actual ?? "";
        let campo;
        if (p.type === "select") {
          campo = (
            <select {...comun} className="bt2-campo" value={valor} onChange={(e) => poner(p.id, e.target.value)}>
              <option value="">Elige una opción</option>
              {opciones.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          );
        } else if (p.type === "textarea") {
          campo = <textarea {...comun} className="bt2-campo alto" maxLength={2000} value={valor} onChange={(e) => poner(p.id, e.target.value)} />;
        } else {
          campo = (
            <input {...comun} className="bt2-campo" type={p.type === "number" ? "number" : p.type === "date" ? "date" : "text"}
              inputMode={p.type === "number" ? "decimal" : undefined} maxLength={p.type === "text" ? 2000 : undefined}
              value={valor} onChange={(e) => poner(p.id, e.target.value)} />
          );
        }
        return (
          <div key={p.id} className="bt2-pregunta">
            <label htmlFor={id} className="bt2-etiqueta">{etiqueta}</label>
            {campo}
            {aviso}
          </div>
        );
      })}
    </section>
  );
}
