import { cn } from "@/lib/utils";

// Fondo y texto de cada tono (tokens --adamia-estado-* de globals.css). Contraste ≥ 4.5:1.
const TONOS = {
  exito: "bg-estado-exito text-estado-exito-texto",
  aviso: "bg-estado-aviso text-estado-aviso-texto",
  error: "bg-estado-error text-estado-error-texto",
  info: "bg-estado-info text-estado-info-texto",
  neutro: "bg-estado-neutro text-estado-neutro-texto",
};

/**
 * Etiqueta de estado (28/11/2026, mockup aprobado; docs/sistema-diseno.md). El color SOLO dice estado:
 *   exito  verde  · correcto, vigente, aprobado        aviso  ámbar · por vencer, pendiente de algo
 *   error  rojo   · vencido, rechazado, con problema   info   azul  · en proceso, en revisión
 *   neutro gris   · borrador, sin estado
 *
 * Props: tono ("exito" | "aviso" | "error" | "info" | "neutro"), children o texto (lo que dice), className.
 * Ejemplo: <EtiquetaEstado tono="aviso">Por vencer</EtiquetaEstado>
 */
export default function EtiquetaEstado({ tono = "neutro", texto = null, children, className = "", ...resto }) {
  return (
    <span data-chico data-estado={tono} className={cn("inline-flex items-center whitespace-nowrap rounded-full px-3.5 py-1.5 text-[15px] font-semibold leading-tight", TONOS[tono] ?? TONOS.neutro, className)} {...resto}>
      {children ?? texto}
    </span>
  );
}
