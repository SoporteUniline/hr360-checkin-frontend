// Piezas compartidas de páginas y formularios (28/11/2026, mockup aprobado). Guía con ejemplos: docs/sistema-diseno.md.
// Todas toman sus colores y tamaños de los tokens de src/app/globals.css.
//   Página grande (más de 6 campos o varias secciones): PaginaFormulario + EncabezadoPagina + SeccionFormulario +
//     CampoFormulario + BarraAccionesFormulario (y PasosGuiados si va por pasos).
//   Ventana (hasta 6 campos, una sola idea): VentanaChica + CampoFormulario.
export { default as EncabezadoPagina } from "./EncabezadoPagina";
export { default as PaginaFormulario } from "./PaginaFormulario";
export { default as SeccionFormulario } from "./SeccionFormulario";
export { default as CampoFormulario, CLASE_CONTROL, CLASE_CONTROL_ERROR, CLASE_TEXTO_LARGO, claseControl } from "./CampoFormulario";
export { default as BarraAccionesFormulario } from "./BarraAccionesFormulario";
export { default as PasosGuiados } from "./PasosGuiados";
export { default as EtiquetaEstado } from "./EtiquetaEstado";
export { default as VentanaChica } from "./VentanaChica";
