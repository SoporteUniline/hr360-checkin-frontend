// Piezas compartidas de páginas y formularios (28/11/2026, mockup aprobado). Guía con ejemplos: docs/sistema-diseno.md.
// Todas toman sus colores y tamaños de los tokens de src/app/globals.css.
//   Página grande (más de 6 campos o varias secciones): PaginaFormulario + EncabezadoPagina + SeccionFormulario +
//     CampoFormulario + BarraAccionesFormulario (y PasosGuiados si va por pasos).
//   Página a todo el ancho (mockup v3, el contrato): PaginaFormulario ancho="completo" + PestanasPasos (pasos arriba) +
//     SeccionFormulario columnas="auto" + ResumenFormulario (a la derecha desde 1200 px).
//   Formulario largo en UNA SOLA HOJA (28/11/2026, el contrato): PaginaFormulario ancho="completo" + IndiceSecciones
//     (índice a la izquierda) + SeccionFormulario columnas="auto" una debajo de otra + ResumenFormulario. Campos «en
//     línea» (solo línea abajo) con <EstiloCampos variante="linea">.
//   Lista de un catálogo o de más de 7 opciones: ListaConBuscador (con «+ Crear» en ventana chica si es catálogo).
//   Ventana (hasta 6 campos, una sola idea): VentanaChica + CampoFormulario.
export { default as EncabezadoPagina } from "./EncabezadoPagina";
export { default as PaginaFormulario } from "./PaginaFormulario";
export { default as SeccionFormulario, CAMPO_ANCHO, RENGLON_COMPLETO } from "./SeccionFormulario";
export {
  default as CampoFormulario, CLASE_CONTROL, CLASE_CONTROL_ERROR, CLASE_CONTROL_LINEA, CLASE_CONTROL_LINEA_ERROR, CLASE_TEXTO_LARGO,
  CLASE_TEXTO_LARGO_LINEA, claseControl, EstiloCampos, useVarianteCampo,
} from "./CampoFormulario";
export { default as ListaConBuscador } from "./ListaConBuscador";
export { default as IndiceSecciones, anclaSeccion, irASeccion } from "./IndiceSecciones";
export { default as BarraAccionesFormulario } from "./BarraAccionesFormulario";
export { default as PasosGuiados, AvancePasosMovil } from "./PasosGuiados";
export { default as PestanasPasos } from "./PestanasPasos";
export { default as ResumenFormulario } from "./ResumenFormulario";
export { default as EtiquetaEstado } from "./EtiquetaEstado";
export { default as VentanaChica } from "./VentanaChica";
export { Lista, Dato, Nota } from "./PiezasFormulario";
