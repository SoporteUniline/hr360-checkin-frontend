"use client";

import { createContext, useContext } from "react";
import { cn } from "@/lib/utils";

/**
 * Clases del control de un campo (input, select o textarea) según el mockup v3: 42 px de alto en escritorio (56 en
 * celular), letra de 16 px (18 en celular), borde #D1D5DB y radio de 8 px (10 en celular). Con error: borde rojo de
 * 2 px. Todo sale de los tokens (h-campo, text-campo, rounded-boton, px-relleno-campo). Úsalas si armas el control tú.
 * (28/11/2026) El relleno de los lados es el token `px-relleno-campo` (16 / 12 px), sin `lg:px-*`: así un campo con
 * ícono a la izquierda pone `pl-12` y lo conserva en todas las pantallas (antes la lupa quedaba encima del texto).
 */
export const CLASE_CONTROL =
  "block w-full min-w-0 h-campo rounded-boton border border-borde-campo bg-white px-relleno-campo text-campo text-texto placeholder:text-texto-deshabilitado focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:cursor-not-allowed disabled:bg-franja disabled:text-texto-secundario";
export const CLASE_CONTROL_ERROR = "border-2 border-peligro focus:border-peligro focus:ring-peligro/25";

/**
 * (28/11/2026, pedido del dueño en el contrato: «no quiero que pongas cuadro envolviendo los valores, solo línea abajo,
 * del tamaño del texto») Campo EN LÍNEA: sin caja, solo una línea gris de 1 px abajo (#D1D5DB), fondo transparente, sin
 * radio ni relleno a los lados (el valor queda alineado con la etiqueta). 40 px de alto en escritorio y 48 en celular
 * (h-campo-linea), letra de 16 / 18 px. Al enfocar la línea pasa a azul de 2 px; con error, a rojo de 2 px. El segundo
 * píxel es una sombra interior: así el campo no brinca al enfocarlo.
 */
export const CLASE_CONTROL_LINEA =
  "block w-full min-w-0 h-campo-linea rounded-none border-0 border-b border-borde-campo bg-transparent px-0 text-campo text-texto placeholder:text-texto-deshabilitado focus:border-brand focus:shadow-[inset_0_-1px_0_0_var(--adamia-blue)] focus:outline-none disabled:cursor-not-allowed disabled:border-dashed disabled:text-texto-secundario";
export const CLASE_CONTROL_LINEA_ERROR =
  "border-peligro shadow-[inset_0_-1px_0_0_var(--adamia-peligro)] focus:border-peligro focus:shadow-[inset_0_-1px_0_0_var(--adamia-peligro)]";
/** Para <textarea>: crece con el texto. */
export const CLASE_TEXTO_LARGO = "h-auto min-h-28 py-3";
/** Para <textarea> en línea: empieza de un renglón (como los demás campos) y crece con lo que se escribe. */
export const CLASE_TEXTO_LARGO_LINEA = "h-auto min-h-campo-linea max-h-60 resize-none py-2 leading-normal [field-sizing:content]";

/** Clases de un control. variante: "caja" (por omisión, el campo de siempre) o "linea" (solo línea abajo). */
export const claseControl = (error = null, extra = "", variante = "caja") =>
  variante === "linea"
    ? cn(CLASE_CONTROL_LINEA, error ? CLASE_CONTROL_LINEA_ERROR : "", extra)
    : cn(CLASE_CONTROL, error ? CLASE_CONTROL_ERROR : "", extra);

// Variante de los campos de todo un formulario (para no repetirla en cada campo). Hoy solo el contrato usa «linea»: el
// dueño quiere evaluarla ahí antes de llevarla a las demás pantallas.
const VarianteCampo = createContext("caja");
/** <EstiloCampos variante="linea">…</EstiloCampos>: todos los CampoFormulario (y Dato) de adentro toman esa variante. */
export function EstiloCampos({ variante = "caja", children }) {
  return <VarianteCampo.Provider value={variante}>{children}</VarianteCampo.Provider>;
}
/** La variante de los campos donde se está pintando ("caja" o "linea"). */
export const useVarianteCampo = () => useContext(VarianteCampo);

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
 *   variante     "caja" o "linea" (por omisión, la de <EstiloCampos>, y si no hay, "caja"). El control recibe además
 *                data-variante="linea" para que la lista nativa dibuje su flecha (globals.css).
 *   className    clases del contenedor (p. ej. `md:col-span-2` para ocupar todo el renglón).
 *   children     una FUNCIÓN que recibe las props del control ({ id, className, aria-describedby, aria-invalid,
 *                aria-required, data-variante }) y regresa el control. Así el control queda grande y accesible sin
 *                repetir clases. También acepta un nodo normal (entonces tú pones el id y las clases, p. ej. con claseControl()).
 *
 * Ejemplo:
 *   <CampoFormulario id="ct-puesto" etiqueta="Puesto" obligatorio ayuda="Así aparece en el contrato." error={errorDe("puesto")}>
 *     {(p) => <input {...p} value={puesto} onChange={(e) => setPuesto(e.target.value)} />}
 *   </CampoFormulario>
 */
export default function CampoFormulario({ id, etiqueta, obligatorio = false, ayuda = null, error = null, variante = null, className = "", children }) {
  const deFormulario = useVarianteCampo();
  const v = variante ?? deFormulario;
  const linea = v === "linea";
  const idAyuda = `${id}-ayuda`;
  const idError = `${id}-error`;
  const describe = error ? idError : ayuda ? idAyuda : undefined;
  const props = {
    id,
    className: claseControl(error, "", v),
    "aria-describedby": describe,
    "aria-invalid": error ? true : undefined,
    "aria-required": obligatorio || undefined,
    "data-variante": linea ? "linea" : undefined,
  };
  return (
    <div className={cn("flex min-w-0 flex-col", linea ? "gap-1" : "gap-2 lg:gap-1.5", className)} data-campo={id}>
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
