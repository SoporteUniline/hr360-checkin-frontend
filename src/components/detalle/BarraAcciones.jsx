import Link from "next/link";
import { Loader2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// (28/11/2026) Cada tipo de acción usa una variante del botón global (src/components/ui/button.jsx), así comparten
// color, alto (38 px en escritorio, 48 en celular) y radio con todo el sistema (docs/sistema-diseno.md).
const VARIANTE = {
  primaria: "default",
  contorno: "outline",
  normal: "outline",
  texto: "ghost",
  peligro: "destructive-outline",
};

/** Un botón de acción con texto (38 px en escritorio, ≥ 48 en celular). accion: { clave, texto, onClick, href, tipo, deshabilitada, ayuda, cargando } */
export function BotonAccion({ accion, className = "" }) {
  const clase = cn(buttonVariants({ variant: VARIANTE[accion.tipo ?? "normal"] ?? "outline" }), "min-h-boton whitespace-normal", className);
  const contenido = (
    <>
      {accion.cargando ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : null}
      {accion.texto}
    </>
  );
  if (accion.href && !accion.deshabilitada) {
    return <Link href={accion.href} className={`${clase} no-underline`} data-accion={accion.clave}>{contenido}</Link>;
  }
  return (
    <button type="button" className={clase} onClick={accion.onClick} disabled={accion.deshabilitada || accion.cargando} title={accion.ayuda} data-accion={accion.clave}>
      {contenido}
    </button>
  );
}

/**
 * Barra de acciones de la vista de detalle (escritorio y tableta): UNA principal, las demás con contorno o normales y
 * al final, separadas, las secundarias tipo texto («Editar datos»). En celular se usa BarraAccionesMovil.
 */
export default function BarraAcciones({ acciones = [], etiqueta = "Acciones" }) {
  const visibles = acciones.filter(Boolean);
  const principales = visibles.filter((a) => a.tipo !== "texto");
  const secundarias = visibles.filter((a) => a.tipo === "texto");
  return (
    <div role="toolbar" aria-label={etiqueta} className="hidden flex-wrap items-center gap-2.5 lg:flex">
      {principales.map((a) => <BotonAccion key={a.clave} accion={a} />)}
      <span className="flex-1" />
      {secundarias.map((a) => <BotonAccion key={a.clave} accion={a} />)}
    </div>
  );
}
