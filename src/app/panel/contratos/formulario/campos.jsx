// Campos grandes y legibles del formulario del contrato (docs/vistas-de-detalle.md): etiqueta de 16 px en negritas,
// control de 48 px, ayuda en #4B5563 y el error debajo, ligado con aria-describedby.

export const CONTROL =
  "block w-full min-h-12 rounded-[12px] border bg-white px-3 text-[17px] text-[#111827] lg:text-[16px] focus:outline-none focus:ring-2 focus:ring-[#2C56E8] disabled:bg-[#F3F5FA] disabled:text-[#374151]";

/** Un campo: etiqueta, control (children recibe props de accesibilidad), ayuda y error. */
export function Campo({ id, etiqueta, ayuda = null, error = null, children, className = "" }) {
  const describe = [ayuda ? `${id}-ayuda` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  const props = { id, "aria-describedby": describe, "aria-invalid": error ? true : undefined, className: `${CONTROL} ${error ? "border-[#B91C1C]" : "border-[#CBD3E3]"}` };
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`} data-campo={id}>
      <label htmlFor={id} className="text-[17px] font-semibold text-[#111827] lg:text-[16px]">{etiqueta}</label>
      {typeof children === "function" ? children(props) : children}
      {ayuda ? <p id={`${id}-ayuda`} className="m-0 text-[17px] text-[#4B5563] lg:text-[16px]">{ayuda}</p> : null}
      {error ? <p id={`${id}-error`} className="m-0 text-[17px] font-semibold text-[#B91C1C] lg:text-[16px]">{error}</p> : null}
    </div>
  );
}

/** Lista desplegable nativa (grande en el celular). Si el valor guardado no está en la lista, aparece como «guardado». */
export function Lista({ opciones, valor, onCambio, vacio = null, ...props }) {
  const enLista = !valor || opciones.some((o) => o.value === valor);
  return (
    <select {...props} value={valor ?? ""} onChange={(e) => onCambio(e.target.value)}>
      {vacio !== null || !valor ? <option value="">{vacio ?? "Elige una opción"}</option> : null}
      {enLista ? null : <option value={valor}>{valor} (guardado)</option>}
      {opciones.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

/** Un dato de solo lectura (etiqueta gris oscuro, valor en negritas). */
export function Dato({ etiqueta, children }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-[17px] text-[#374151] lg:text-[16px]">{etiqueta}</span>
      <span className="break-words font-bold text-[#111827]">{children}</span>
    </div>
  );
}

/** Nota azul (explicación) o de aviso (naranja). */
export function Nota({ tono = "info", className = "", children, ...props }) {
  const estilo = tono === "aviso" ? "bg-[#FFF7ED] text-[#9A3412]" : tono === "error" ? "bg-[#FEF2F2] text-[#991B1B]" : "bg-[#EEF2FF] text-[#1E3A8A]";
  return <p className={`m-0 rounded-xl px-3 py-2.5 text-[17px] lg:text-[16px] ${estilo} ${className}`} {...props}>{children}</p>;
}
