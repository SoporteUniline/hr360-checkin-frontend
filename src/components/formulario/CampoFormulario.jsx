import { cn } from "@/lib/utils";

/**
 * Clases del control de un campo (input, select o textarea) según el mockup v3: 42 px de alto en escritorio (56 en
 * celular), letra de 16 px (18 en celular), borde #D1D5DB y radio de 8 px (10 en celular). Con error: borde rojo de
 * 2 px. Todo sale de los tokens (h-campo, text-campo, rounded-boton). Úsalas si armas el control tú.
 */
export const CLASE_CONTROL =
  "block w-full min-w-0 h-campo rounded-boton border border-borde-campo bg-white px-4 text-campo lg:px-3 text-texto placeholder:text-texto-deshabilitado focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:cursor-not-allowed disabled:bg-franja disabled:text-texto-secundario";
export const CLASE_CONTROL_ERROR = "border-2 border-peligro focus:border-peligro focus:ring-peligro/25";
/** Para <textarea>: crece con el texto. */
export const CLASE_TEXTO_LARGO = "h-auto min-h-28 py-3";

export const claseControl = (error = null, extra = "") => cn(CLASE_CONTROL, error ? CLASE_CONTROL_ERROR : "", extra);

/**
 * Campo de formulario (28/11/2026, mockup aprobado; docs/sistema-diseno.md): etiqueta arriba (15 px en escritorio y
 * 17 en celular, peso 600, ligada con htmlFor/id), el control, y abajo la ayuda (gris) o el error (rojo). El error se anuncia al lector de pantalla con
 * aria-describedby y aria-invalid.
 *
 * Props:
 *   id           id del control (obligatorio: liga la etiqueta, la ayuda y el error).
 *   etiqueta     texto de la etiqueta.
 *   obligatorio  agrega el asterisco rojo y aria-required.
 *   ayuda        texto gris debajo (opcional).
 *   error        mensaje de error (opcional). Si hay error, la ayuda no se muestra.
 *   className    clases del contenedor (p. ej. `md:col-span-2` para ocupar todo el renglón).
 *   children     una FUNCIÓN que recibe las props del control ({ id, className, aria-describedby, aria-invalid,
 *                aria-required }) y regresa el control. Así el control queda grande y accesible sin repetir clases.
 *                También acepta un nodo normal (entonces tú pones el id y las clases, p. ej. con claseControl()).
 *
 * Ejemplo:
 *   <CampoFormulario id="ct-puesto" etiqueta="Puesto" obligatorio ayuda="Así aparece en el contrato." error={errorDe("puesto")}>
 *     {(p) => <input {...p} value={puesto} onChange={(e) => setPuesto(e.target.value)} />}
 *   </CampoFormulario>
 */
export default function CampoFormulario({ id, etiqueta, obligatorio = false, ayuda = null, error = null, className = "", children }) {
  const idAyuda = `${id}-ayuda`;
  const idError = `${id}-error`;
  const describe = error ? idError : ayuda ? idAyuda : undefined;
  const props = {
    id,
    className: claseControl(error),
    "aria-describedby": describe,
    "aria-invalid": error ? true : undefined,
    "aria-required": obligatorio || undefined,
  };
  return (
    <div className={cn("flex min-w-0 flex-col gap-2 lg:gap-1.5", className)} data-campo={id}>
      <label htmlFor={id} className="text-etiqueta font-semibold text-texto">
        {etiqueta}
        {obligatorio ? <span className="text-peligro-texto" aria-hidden="true"> *</span> : null}
      </label>
      {typeof children === "function" ? children(props) : children}
      {error
        ? <p id={idError} data-chico className="m-0 text-ayuda font-medium text-peligro-texto">{error}</p>
        : ayuda ? <p id={idAyuda} data-chico className="m-0 text-ayuda text-texto-secundario">{ayuda}</p> : null}
    </div>
  );
}
