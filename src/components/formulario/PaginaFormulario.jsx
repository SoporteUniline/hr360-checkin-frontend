import { cn } from "@/lib/utils";

/**
 * Página de un formulario grande (28/11/2026; docs/sistema-diseno.md): fondo gris claro (#F9FAFB) de orilla a orilla,
 * el encabezado gris arriba, el contenido en medio y la barra de acciones pegada abajo. Ocupa todo el espacio del panel
 * (anula el relleno de .panel-modules-content de src/app/panel/layout.jsx con -m-5).
 *
 * Props:
 *   encabezado  <EncabezadoPagina completo … /> (y, si va por pestañas, <PestanasPasos …/> justo debajo).
 *   barra       <BarraAccionesFormulario … /> (va fija abajo)
 *   resumen     (28/11/2026, mockup v3) <ResumenFormulario … />: desde 1200 px va en una columna de 320 px a la
 *               derecha; con menos, como bloque plegable debajo del contenido. Opcional.
 *   indice      (28/11/2026, contrato en una sola hoja) <IndiceSecciones … />: desde 1200 px va en una columna de
 *               232 px a la izquierda; con menos, como fila compacta de pastillas arriba, pegada al bajar. Opcional.
 *   ancho       "normal" (por omisión, márgenes de 48 px) o "completo" (mockup v3: márgenes de 32 px y el contenido
 *               ocupa todo el ancho; úsalo con SeccionFormulario columnas="auto").
 *   children    el contenido: secciones, o <PasosGuiados> con sus secciones.
 *   ...resto    se pasa al contenedor (p. ej. data-vista="formulario-contrato" para las pruebas).
 *
 * Ejemplo:
 *   <PaginaFormulario data-vista="formulario-vacante" ancho="completo"
 *     encabezado={<EncabezadoPagina completo volver={{ href: "/panel/reclutamiento", texto: "Vacantes" }} titulo="Vacante nueva" />}
 *     resumen={<ResumenFormulario filas={[{ etiqueta: "Puesto", valor: puesto }]} faltan={faltan} />}
 *     barra={<BarraAccionesFormulario cancelar={{ onClick: salir }} principal={{ texto: "Guardar", onClick: guardar }} />}>
 *     <SeccionFormulario titulo="Datos de la vacante" columnas="auto">…</SeccionFormulario>
 *   </PaginaFormulario>
 */
export default function PaginaFormulario({ encabezado = null, barra = null, resumen = null, indice = null, ancho = "normal", children, className = "", ...resto }) {
  const completo = ancho === "completo";
  const margen = completo ? "px-4 py-4 lg:px-8 lg:py-6" : "px-4 py-4 lg:px-12 lg:py-8";
  return (
    <div className={cn("-m-5 flex min-h-[calc(100dvh-4rem)] flex-col bg-fondo-pagina text-cuerpo text-texto", className)} data-ancho={ancho} {...resto}>
      {encabezado}
      {resumen || indice ? (
        <div className={cn("flex flex-1 flex-col gap-4 min-[75rem]:flex-row min-[75rem]:items-start min-[75rem]:gap-5", margen)}>
          {indice}
          <div className="flex min-w-0 flex-1 flex-col gap-4 lg:gap-5" data-contenido-formulario>{children}</div>
          {resumen}
        </div>
      ) : (
        <div className={cn("flex flex-1 flex-col gap-4 lg:gap-6", margen)}>{children}</div>
      )}
      {barra}
    </div>
  );
}
