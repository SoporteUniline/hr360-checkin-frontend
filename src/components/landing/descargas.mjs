// Material para descargar del sitio público (27/11/2026): brochure comercial y tríptico en PDF.
// Una sola fuente para la portada, Cotizar y las pruebas (scripts/test-descargas.mjs revisa que el archivo exista, que
// las páginas y el peso que se anuncian coincidan con el PDF y que la miniatura tenga las medidas declaradas).
// Origen de los PDF y cómo actualizarlos: docs/pagina-inicio.md, «Versión 5».
// Peso en MB de 1024 × 1024 bytes con un decimal (como lo muestra Windows y el navegador al descargar).

export const DESCARGAS = [
  {
    id: "brochure",
    titulo: "Brochure comercial",
    resumen: "Todos los módulos de ADAMIA con pantallas reales, ADAMIA AI y la ley que respalda cada cálculo.",
    archivo: "/descargas/adamia-brochure-comercial.pdf",
    nombreDescarga: "ADAMIA - Brochure comercial.pdf",
    enlace: "el brochure comercial",
    paginas: 4,
    bytes: 2569400,
    portada: {
      src: "/descargas/adamia-brochure-comercial-portada.webp",
      ancho: 495,
      alto: 640,
      alt: "Portada del brochure comercial de ADAMIA: «Todo el día de tu equipo, en una sola plataforma», con el monitor de asistencia en la computadora y el checador con rostro en el celular.",
    },
  },
  {
    id: "triptico",
    titulo: "Tríptico",
    resumen: "ADAMIA en una hoja doblada en tres: ideal para imprimir y dejar en la oficina de RH o en una junta.",
    archivo: "/descargas/adamia-triptico.pdf",
    nombreDescarga: "ADAMIA - Tríptico.pdf",
    enlace: "el tríptico",
    paginas: 2,
    bytes: 2171688,
    portada: {
      src: "/descargas/adamia-triptico-portada.webp",
      ancho: 640,
      alto: 495,
      alt: "Cara exterior del tríptico de ADAMIA: la ley mexicana integrada en cada pantalla, ADAMIA AI como experta en la Ley Federal del Trabajo y la portada con el checador en el celular.",
    },
  },
];

export function pesoLegible(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// «PDF · 4 páginas · 2.5 MB» (el tríptico son 2 páginas: la cara de afuera y la de adentro).
export function detalleDescarga(d) {
  return `PDF · ${d.paginas} ${d.paginas === 1 ? "página" : "páginas"} · ${pesoLegible(d.bytes)}`;
}
