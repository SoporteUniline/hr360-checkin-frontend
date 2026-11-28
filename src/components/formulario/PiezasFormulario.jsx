"use client";

import { cn } from "@/lib/utils";
import { useVarianteCampo } from "./CampoFormulario";

// Piezas chicas de los formularios en página (28/11/2026; docs/sistema-diseno.md). Nacieron en el contrato
// (src/app/panel/contratos/formulario/campos.jsx, que las reexporta) y las usan también el permiso y el acta.
//   Lista  lista desplegable nativa (en el celular abre la del teléfono, grande). Va dentro de CampoFormulario:
//          <CampoFormulario id="x" etiqueta="Empresa">{(p) => <Lista {...p} opciones={[{ value, label }]} valor={v} onCambio={setV} />}</CampoFormulario>
//   Dato   un dato de solo lectura con su etiqueta arriba.
//   Nota   explicación (gris claro), aviso (ámbar) o error (rojo): el color solo dice estado.

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

/**
 * Un dato de solo lectura (etiqueta arriba como la de un campo, valor en negritas). Con campos «en línea»
 * (<EstiloCampos variante="linea">) mide lo mismo que ellos para que el renglón quede parejo. `ayuda`: una línea gris abajo.
 */
export function Dato({ etiqueta, ayuda = null, className = "", children, ...props }) {
  const linea = useVarianteCampo() === "linea";
  return (
    <div className={cn("flex min-w-0 flex-col", linea ? "gap-1" : "gap-2", className)} {...props}>
      <span className="text-etiqueta font-semibold text-texto">{etiqueta}</span>
      <span className={cn("flex items-center break-words font-bold text-texto", linea ? "min-h-campo-linea" : "min-h-campo")}>{children}</span>
      {ayuda ? <span data-chico className="text-ayuda text-texto-secundario">{ayuda}</span> : null}
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
