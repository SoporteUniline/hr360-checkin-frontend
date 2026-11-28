import { useRef } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { pasosConEstado } from "@/lib/formulario/pasosGuiados.mjs";
import { AvancePasosMovil } from "./PasosGuiados";

// Círculo del número según el estado del paso (24 px; el mockup v3 lo dibuja de 22 con número de 13, pero la letra
// mínima del sistema es de 15).
const CIRCULO = {
  listo: "bg-paso-listo text-white",
  actual: "bg-brand text-white",
  error: "bg-peligro text-white",
  pendiente: "bg-borde text-estado-neutro-texto",
};
const TEXTO = {
  listo: "text-estado-exito-texto",
  actual: "font-bold text-seleccion-texto",
  error: "text-peligro-texto",
  pendiente: "text-estado-neutro-texto",
};

/**
 * Pasos de un formulario grande como PESTAÑAS horizontales (28/11/2026, mockup v3 aprobado; docs/sistema-diseno.md).
 * Van debajo del encabezado gris, de orilla a orilla, para que el contenido use todo el ancho (antes la lista de pasos
 * ocupaba 280 px a la izquierda).
 *   Escritorio (lg): una franja blanca con una pestaña por paso: ✓ verde si está listo, el número en azul y subrayado
 *                    si es el actual, gris si falta llegar. Si al paso le faltan datos lleva la pastilla roja «Falta N».
 *                    Con clic (o con las flechas ← → del teclado) se va a cualquier paso.
 *   Celular:         la barra «Paso 2 de 5 · Sueldo y pago» con el porcentaje (AvancePasosMovil), sin pestañas.
 * Las reglas (estado de cada paso) son las de PasosGuiados: src/lib/formulario/pasosGuiados.mjs, con pruebas.
 *
 * Props:
 *   pasos        [{ clave, texto }] en orden.
 *   actual       clave del paso que se ve.
 *   visitados    claves de los pasos por los que ya se pasó (salen como listos si no les falta nada).
 *   errores      { [clave]: cuántos datos faltan o hay que corregir } → pastilla «Falta N».
 *   todosListos  true al editar algo que ya estaba completo.
 *   alElegir     (clave) => void: ir a ese paso.
 *   idPanel      id del contenedor del contenido (para aria-controls). Ponle ese id y role="tabpanel" al contenido.
 *
 * Ejemplo:
 *   <PaginaFormulario encabezado={<><EncabezadoPagina completo … />
 *     <PestanasPasos pasos={PASOS} actual={paso} visitados={visitados} errores={{ sueldo: 1 }} alElegir={irAPaso} idPanel="contenido-paso" /></>}>
 *     <div id="contenido-paso" role="tabpanel">{contenido[paso]}</div>
 *   </PaginaFormulario>
 */
export default function PestanasPasos({ pasos, actual, visitados = [], errores = {}, todosListos = false, alElegir = () => {}, idPanel = undefined, className = "" }) {
  const lista = pasosConEstado(pasos, { actual, visitados, errores, todosListos });
  const refs = useRef({});
  // Teclado (patrón de pestañas WAI-ARIA): ← → mueven a la pestaña vecina, Inicio y Fin a la primera y la última.
  const alTeclear = (e, i) => {
    const destino = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: lista.length - 1 }[e.key];
    if (destino === undefined) return;
    e.preventDefault();
    const paso = lista[(destino + lista.length) % lista.length];
    alElegir(paso.clave);
    refs.current[paso.clave]?.focus();
  };
  return (
    <>
      <AvancePasosMovil pasos={pasos} actual={actual} className="px-4 pt-4" />
      <div
        role="tablist"
        aria-label="Pasos"
        data-pasos-pestanas
        className={cn("hidden gap-1 overflow-x-auto border-b border-borde bg-white px-8 lg:flex", className)}
      >
        {lista.map((paso, i) => {
          const esActual = paso.estado === "actual";
          const faltan = paso.errores;
          return (
            <button
              key={paso.clave}
              ref={(el) => { refs.current[paso.clave] = el; }}
              type="button"
              role="tab"
              id={`pestana-${paso.clave}`}
              aria-selected={esActual}
              aria-controls={idPanel}
              tabIndex={esActual ? 0 : -1}
              data-paso={paso.clave}
              data-estado-paso={paso.estado}
              onClick={() => (esActual ? null : alElegir(paso.clave))}
              onKeyDown={(e) => alTeclear(e, i)}
              className={cn(
                "flex h-[50px] shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap border-b-[3px] px-4 text-[15px] font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-brand/40",
                esActual ? "border-brand" : "border-transparent hover:border-borde-campo",
                TEXTO[paso.estado],
              )}
            >
              <span aria-hidden="true" data-chico className={cn("flex size-6 shrink-0 items-center justify-center rounded-full text-[15px] font-bold", CIRCULO[paso.estado])}>
                {paso.estado === "listo" ? <Check className="size-3.5" strokeWidth={3.5} /> : paso.estado === "error" ? "!" : paso.numero}
              </span>
              {paso.texto}
              {faltan > 0 ? (
                <span data-chico data-estado="error" data-falta={faltan} className="rounded-full bg-estado-error px-2.5 py-0.5 text-[15px] font-bold leading-tight text-estado-error-texto">
                  Falta {faltan}
                </span>
              ) : null}
              <span className="sr-only">{esActual ? " (estás aquí)" : paso.estado === "listo" ? " (listo)" : ""}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
