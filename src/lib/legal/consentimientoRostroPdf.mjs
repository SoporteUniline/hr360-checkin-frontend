// PDF del consentimiento para usar el rostro al checar (se manda a firmar; ver
// src/app/panel/empleados/tabs/ConsentimientoRostro.jsx). Módulo puro: recibe el
// documento jsPDF ya creado, la tipografía y el logotipo, para probarlo en Node
// (scripts/test-pdf-marca.mjs). Formato homologado ADAMIA:
// encabezado con logotipo, documento y empresa; pie «Generado con ADAMIA ·
// fecha · Página X de Y». El contenido (texto legal y datos) no cambia.
import { CONSENTIMIENTO_BIOMETRICO as C } from "./documentos.js";
import { ADAMIA, dibujarEncabezadoAdamia, dibujarPieAdamia } from "../pdfMarcaAdamia.mjs";

export const TITULO_CONSENTIMIENTO_PDF = "Consentimiento de uso del rostro";

/**
 * @param {import("jspdf").jsPDF} doc  Documento carta en mm.
 * @param {{ nombre: string, empresa: string, font?: string, logo?: string|null, fecha?: Date }} p
 */
export function dibujarConsentimientoRostro(doc, { nombre, empresa, font = "helvetica", logo = null, fecha = new Date() }) {
  const margen = 20;
  const ancho = doc.internal.pageSize.getWidth() - margen * 2;
  const limite = doc.internal.pageSize.getHeight() - 24; // deja libre el pie
  let y = dibujarEncabezadoAdamia(doc, { font, logo, documento: TITULO_CONSENTIMIENTO_PDF, empresa, margenMm: margen });

  doc.setFont(font, "bold").setFontSize(14).setTextColor(...ADAMIA.text);
  doc.text(C.titulo, margen, y);
  y += 10;
  doc.setFont(font, "normal").setFontSize(10.5);
  const lineas = [
    `Empresa (responsable de mis datos): ${empresa}`,
    `Empleado: ${nombre}`,
    `Fecha de emisión: ${fecha.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}`,
    "",
    ...C.texto,
    "",
    `${C.acepto}. Firmo este documento de forma electrónica.`,
    "",
    `Versión del texto: ${C.version}.`,
  ];
  for (const l of lineas) {
    const partes = l ? doc.splitTextToSize(l, ancho) : [""];
    const alto = partes.length * 5.5 + (l ? 2 : 0);
    if (y + alto > limite) {
      doc.addPage();
      y = 24;
    }
    doc.text(partes, margen, y);
    y += alto;
  }
  dibujarPieAdamia(doc, { font, logo, documento: TITULO_CONSENTIMIENTO_PDF, fecha, margenMm: margen });
  return doc;
}
