import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { avancePasos, pasosConEstado, TEXTO_ESTADO } from "@/lib/formulario/pasosGuiados.mjs";

// Círculo del número según el estado del paso.
const CIRCULO = {
  listo: "bg-paso-listo text-white",
  actual: "bg-brand text-white",
  error: "bg-peligro text-white",
  pendiente: "bg-franja text-estado-neutro-texto",
};

/**
 * Barra de avance para celular: «Paso 2 de 5 · Sueldo y pago», el porcentaje y una barra azul. La usan PasosGuiados
 * (lista a la izquierda) y PestanasPasos (pestañas arriba). Se esconde desde 1024 px (lg).
 * Ejemplo: <AvancePasosMovil pasos={PASOS} actual="sueldo" />
 */
export function AvancePasosMovil({ pasos, actual, className = "" }) {
  const avance = avancePasos(pasos, actual);
  return (
    <div data-pasos-movil className={cn("flex flex-col gap-2.5 lg:hidden", className)}>
      <div className="flex items-baseline justify-between gap-3 font-semibold text-texto">
        <span>{avance.texto} · {avance.titulo}</span>
        <span className="shrink-0 text-texto-secundario">{avance.porcentaje} %</span>
      </div>
      <div role="progressbar" aria-label="Avance del formulario" aria-valuemin={0} aria-valuemax={100} aria-valuenow={avance.porcentaje} className="h-2 rounded-full bg-borde">
        <div className="h-2 rounded-full bg-brand transition-[width]" style={{ width: `${avance.porcentaje}%` }} />
      </div>
    </div>
  );
}

/**
 * Pasos guiados de un formulario grande (28/11/2026, mockup aprobado; docs/sistema-diseno.md).
 *   Escritorio (lg): la lista de pasos a la izquierda (listo en verde con ✓, el actual en azul «Estás aquí», los demás
 *                    «Pendiente», con errores en rojo «Falta corregir») y el contenido del paso a la derecha.
 *   Celular:         arriba «Paso 2 de 5 · Sueldo y pago» con el porcentaje y una barra azul.
 * (28/11/2026, mockup v3) Para un formulario que debe usar todo el ancho, los mismos pasos van como PESTAÑAS arriba:
 * PestanasPasos (lo usa el contrato). Esta versión con la lista a la izquierda la siguen usando el acta y otros.
 * Las reglas (estado de cada paso, porcentaje) están en src/lib/formulario/pasosGuiados.mjs, con pruebas.
 *
 * Props:
 *   pasos        [{ clave, texto }] en orden.
 *   actual       clave del paso que se está llenando.
 *   visitados    claves de los pasos por los que ya se pasó (salen como «Listo»).
 *   errores      { [clave]: número de errores } (salen en rojo).
 *   todosListos  true al editar algo que ya estaba completo (todos los pasos salen como «Listo»).
 *   alElegir     (clave) => void. Si se pasa, cada paso de la lista es un botón para saltar a él.
 *   children     el contenido del paso actual (normalmente una o varias SeccionFormulario).
 *
 * Ejemplo:
 *   <PasosGuiados pasos={PASOS} actual={paso} visitados={visitados} errores={erroresPorPaso} alElegir={irAPaso}>
 *     {contenido[paso]}
 *   </PasosGuiados>
 */
export default function PasosGuiados({ pasos, actual, visitados = [], errores = {}, todosListos = false, alElegir = null, children }) {
  const lista = pasosConEstado(pasos, { actual, visitados, errores, todosListos });
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-8">
      <AvancePasosMovil pasos={pasos} actual={actual} />

      <ol data-pasos-lista aria-label="Pasos" className="m-0 hidden w-[280px] shrink-0 list-none flex-col gap-2 p-0 lg:flex">
        {lista.map((paso) => {
          const esActual = paso.estado === "actual";
          const contenido = (
            <>
              <span aria-hidden="true" className={cn("flex size-8 shrink-0 items-center justify-center rounded-full font-bold", CIRCULO[paso.estado])}>
                {paso.estado === "listo" ? <Check className="size-5" strokeWidth={3} /> : paso.estado === "error" ? "!" : paso.numero}
              </span>
              <span className="flex min-w-0 flex-col text-left">
                <span className={cn("font-semibold text-texto", esActual && "font-bold text-seleccion-texto")}>{paso.texto}</span>
                <span data-chico className={cn("text-[15px] text-texto-secundario", paso.estado === "error" && "font-medium text-peligro-texto")}>
                  {TEXTO_ESTADO[paso.estado]}{paso.estado === "error" ? ` (${paso.errores})` : ""}
                </span>
              </span>
            </>
          );
          const caja = cn(
            "flex w-full items-center gap-3.5 rounded-xl border px-4 py-3.5",
            esActual ? "border-2 border-brand bg-seleccion" : paso.estado === "error" ? "border-peligro-borde bg-white" : "border-borde bg-white",
          );
          return (
            <li key={paso.clave} data-paso={paso.clave} data-estado-paso={paso.estado} aria-current={esActual ? "step" : undefined}>
              {alElegir && !esActual ? (
                <button type="button" onClick={() => alElegir(paso.clave)} className={cn(caja, "cursor-pointer hover:border-borde-campo")}>
                  {contenido}
                </button>
              ) : <div className={caja}>{contenido}</div>}
            </li>
          );
        })}
      </ol>

      {/* key={actual}: cada paso es un árbol NUEVO. Sin la llave React reusaba los mismos <input> de un paso en el
          siguiente (mismo lugar, mismo tipo) y, con campos sin control (register de react-hook-form), al regresar se
          veía lo del otro paso: «Lugar» con el cargo y «Hora» vacía, aunque se guardaba otra cosa (INC-012). */}
      <div key={actual} data-paso-contenido={actual} className="flex min-w-0 max-w-[820px] flex-1 flex-col gap-4 lg:gap-6">{children}</div>
    </div>
  );
}
