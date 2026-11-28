import { cn } from "@/lib/utils";

/**
 * Página de un formulario grande (28/11/2026; docs/sistema-diseno.md): fondo gris claro (#F9FAFB) de orilla a orilla,
 * el encabezado gris arriba, el contenido en medio y la barra de acciones pegada abajo. Ocupa todo el espacio del panel
 * (anula el relleno de .panel-modules-content de src/app/panel/layout.jsx con -m-5).
 *
 * Props:
 *   encabezado  <EncabezadoPagina completo … />
 *   barra       <BarraAccionesFormulario … /> (va fija abajo)
 *   children    el contenido: secciones, o <PasosGuiados> con sus secciones.
 *   ...resto    se pasa al contenedor (p. ej. data-vista="formulario-contrato" para las pruebas).
 *
 * Ejemplo:
 *   <PaginaFormulario data-vista="formulario-vacante"
 *     encabezado={<EncabezadoPagina completo volver={{ href: "/panel/reclutamiento", texto: "Vacantes" }} titulo="Vacante nueva" />}
 *     barra={<BarraAccionesFormulario cancelar={{ onClick: salir }} principal={{ texto: "Guardar", onClick: guardar }} />}>
 *     <SeccionFormulario titulo="Datos de la vacante">…</SeccionFormulario>
 *   </PaginaFormulario>
 */
export default function PaginaFormulario({ encabezado = null, barra = null, children, className = "", ...resto }) {
  return (
    <div className={cn("-m-5 flex min-h-[calc(100dvh-4rem)] flex-col bg-fondo-pagina text-cuerpo text-texto", className)} {...resto}>
      {encabezado}
      <div className="flex flex-1 flex-col gap-4 px-4 py-4 lg:gap-6 lg:px-12 lg:py-8">{children}</div>
      {barra}
    </div>
  );
}
