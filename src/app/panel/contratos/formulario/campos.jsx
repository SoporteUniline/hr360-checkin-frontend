// Piezas chicas del formulario del contrato. (28/11/2026) El campo es el del sistema de diseño
// (src/components/formulario/CampoFormulario.jsx: etiqueta de 16 px en 600, control de 52/56 px, ayuda o error abajo);
// aquí quedan solo la lista desplegable, el dato de solo lectura y la nota, que son propios de este formulario.
import { cn } from "@/lib/utils";

export { default as Campo } from "@/components/formulario/CampoFormulario";

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

/** Un dato de solo lectura (etiqueta arriba como la de un campo, valor en negritas). */
export function Dato({ etiqueta, children }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="text-etiqueta font-semibold text-texto">{etiqueta}</span>
      <span className="flex min-h-campo items-center break-words font-bold text-texto">{children}</span>
    </div>
  );
}

// Explicación: recuadro gris claro (como el resumen del mockup), sin color decorativo. Aviso y error: colores de estado.
const TONO_NOTA = {
  info: "border border-borde bg-fondo-pagina text-texto",
  aviso: "bg-estado-aviso text-estado-aviso-texto",
  error: "bg-estado-error text-estado-error-texto",
};

/** Nota: explicación (gris claro), aviso (ámbar) o error (rojo). */
export function Nota({ tono = "info", className = "", children, ...props }) {
  return <p className={cn("m-0 rounded-boton px-4 py-3 text-cuerpo", TONO_NOTA[tono] ?? TONO_NOTA.info, className)} {...props}>{children}</p>;
}
