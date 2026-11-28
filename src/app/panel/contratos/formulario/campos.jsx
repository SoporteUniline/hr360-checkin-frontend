// Piezas chicas del formulario del contrato. (28/11/2026) El campo es el del sistema de diseño
// (src/components/formulario/CampoFormulario.jsx: etiqueta de 16 px en 600, control de 52/56 px, ayuda o error abajo).
// La lista desplegable, el dato de solo lectura y la nota pasaron a src/components/formulario/PiezasFormulario.jsx para
// que también las usen el permiso y el acta en página; aquí se reexportan para no cambiar el contrato.
export { default as Campo } from "@/components/formulario/CampoFormulario";
export { Lista, Dato, Nota } from "@/components/formulario/PiezasFormulario";
