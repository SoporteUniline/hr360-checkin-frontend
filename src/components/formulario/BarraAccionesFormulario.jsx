import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Barra de acciones de un formulario en página (28/11/2026, mockup aprobado; docs/sistema-diseno.md), pegada abajo.
 *   Escritorio: Cancelar a la izquierda; a la derecha el aviso («Borrador guardado…»), Atrás, Siguiente y la principal.
 *   Celular:    la principal a todo lo ancho (56 px) y debajo Atrás / Siguiente / Cancelar en un renglón.
 * Es UN solo juego de botones (no uno por tamaño de pantalla): el acomodo cambia con `order` y `lg:contents`.
 *
 * Cada acción es un objeto { texto, onClick, cargando, deshabilitado, clave } o null para no mostrarla:
 *   principal   azul (38 px en escritorio, 56 en celular). Por defecto texto «Guardar», clave «guardar». Acepta
 *               type="submit", form="id-del-form" y flecha: true («Continuar →», para avanzar de paso).
 *   cancelar    gris con contorno. Por defecto «Cancelar».
 *   atras       gris con contorno con flecha. Por defecto «Atrás».
 *   siguiente   gris con contorno con flecha (para moverse entre pasos sin guardar; opcional).
 * aviso: texto o nodo chico junto a los botones (p. ej. «Borrador guardado hace 1 min» o «Tienes cambios sin guardar»).
 * Cada botón deja data-accion="<clave>" para las pruebas.
 * enRenglon (28/11/2026, contrato en una sola hoja): solo Cancelar y la principal, también EN UN RENGLÓN en celular
 *   (Cancelar a la izquierda y la principal ocupando el resto), con el aviso arriba en una línea: la barra fija ocupa
 *   menos pantalla. El aviso puede ser un nodo (p. ej. con color de estado).
 *
 * Ejemplo:
 *   <BarraAccionesFormulario
 *     cancelar={{ onClick: salir }}
 *     atras={paso > 1 ? { onClick: anterior } : null}
 *     principal={{ texto: "Continuar", flecha: true, onClick: continuar, cargando: guardando }}
 *     aviso="Borrador guardado hace 1 min" />
 */
export default function BarraAccionesFormulario({ principal, cancelar = null, atras = null, siguiente = null, aviso = null, etiqueta = "Acciones del formulario", enRenglon = false, className = "" }) {
  if (enRenglon) {
    return (
      <div role="toolbar" aria-label={etiqueta} data-barra-formulario
        className={cn("sticky bottom-0 z-20 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-borde bg-white px-4 pb-4 pt-2.5 lg:flex-nowrap lg:gap-4 lg:px-12 lg:py-3", className)}>
        {cancelar ? (
          <Button type="button" variant="outline" onClick={cancelar.onClick} disabled={cancelar.deshabilitado} data-accion={cancelar.clave ?? "cancelar"} className="order-1 h-boton-principal lg:order-1 lg:h-boton">
            {cancelar.texto ?? "Cancelar"}
          </Button>
        ) : null}
        {aviso ? <div data-chico data-aviso-barra className="order-0 w-full text-[15px] text-texto-secundario lg:order-2 lg:ml-auto lg:w-auto lg:text-right">{aviso}</div> : null}
        {principal ? (
          <Button type={principal.type ?? "button"} form={principal.form} size="lg" onClick={principal.onClick} disabled={principal.deshabilitado}
            loading={principal.cargando} data-accion={principal.clave ?? "guardar"} className={cn("order-2 flex-1 lg:order-3 lg:flex-none", !aviso && "lg:ml-auto")}>
            {principal.texto ?? "Guardar"}
          </Button>
        ) : null}
      </div>
    );
  }
  const boton = (accion, { clave, texto, orden, icono = null, alFinal = false }) => (
    <Button
      type="button"
      variant="outline"
      onClick={accion.onClick}
      disabled={accion.deshabilitado}
      loading={accion.cargando}
      data-accion={accion.clave ?? clave}
      className={cn("flex-1 lg:flex-none", orden)}
    >
      {alFinal ? null : icono}
      {accion.texto ?? texto}
      {alFinal ? icono : null}
    </Button>
  );
  return (
    <div
      role="toolbar"
      aria-label={etiqueta}
      data-barra-formulario
      className={cn("sticky bottom-0 z-20 flex flex-col gap-2.5 border-t border-borde bg-white px-4 pb-5 pt-3 lg:flex-row lg:items-center lg:gap-4 lg:px-12 lg:py-4", className)}
    >
      {aviso ? <span data-chico className="order-0 text-center text-[15px] text-texto-secundario lg:order-2 lg:text-right">{aviso}</span> : null}
      {principal ? (
        <Button
          type={principal.type ?? "button"}
          form={principal.form}
          size="lg"
          onClick={principal.onClick}
          disabled={principal.deshabilitado}
          loading={principal.cargando}
          data-accion={principal.clave ?? "guardar"}
          className="order-1 w-full lg:order-5 lg:w-auto"
        >
          {principal.texto ?? "Guardar"}
          {principal.flecha ? <ArrowRight aria-hidden="true" /> : null}
        </Button>
      ) : null}
      <div className="order-2 flex gap-2.5 lg:contents">
        {atras ? boton(atras, { clave: "atras", texto: "Atrás", orden: "lg:order-3", icono: <ArrowLeft aria-hidden="true" /> }) : null}
        {siguiente ? boton(siguiente, { clave: "siguiente", texto: "Siguiente", orden: "lg:order-4", icono: <ArrowRight aria-hidden="true" />, alFinal: true }) : null}
        {cancelar ? boton(cancelar, { clave: "cancelar", texto: "Cancelar", orden: "lg:order-1 lg:mr-auto" }) : null}
      </div>
    </div>
  );
}
