// Resguardo de activos y uniformes en PDF. Módulo puro (sin fetch): recibe el
// documento jsPDF, autoTable, la tipografía y los logotipos; así se prueba en
// Node (scripts/test-pdf-marca.mjs). Formato homologado ADAMIA:
// encabezado con logotipo ADAMIA (y el de la empresa), documento y empresa; pie
// «Generado con ADAMIA · fecha · Folio · Página X de Y» en cada página.
import { dibujarEncabezadoAdamia, dibujarPieAdamia } from "../pdfMarcaAdamia.mjs";
import { nombreArchivoPdf } from "../nombreArchivo.mjs";

export const TITULO_RESGUARDO = "Resguardo de activos y uniformes";
// Margen de las tablas: deja libre el pie (24 mm) en cada página.
const MARGEN = { left: 15, right: 15, top: 20, bottom: 24 };

/** Nombre del archivo: documento, folio, número de empleado y fecha (sin nombre). */
export function nombreArchivoResguardo(delivery) {
  return nombreArchivoPdf({
    documento: "Resguardo activos",
    folio: delivery.folio,
    empleado: delivery.employeeId,
    fecha: delivery.date,
  });
}

/**
 * @param {import("jspdf").jsPDF} doc  Carta en mm.
 * @param {Function} autoTable
 * @param {object} delivery
 * @param {{ name: string }} company
 * @param {{ font?: string, logo?: string|null, logoEmpresa?: string|null, fecha?: Date }} [marca]
 */
export function dibujarResguardo(doc, autoTable, delivery, company, { font = "helvetica", logo = null, logoEmpresa = null, fecha = new Date() } = {}) {
  const y0 = dibujarEncabezadoAdamia(doc, {
    font,
    logo,
    logoEmpresa,
    documento: TITULO_RESGUARDO,
    empresa: company.name,
    subtitulo: `Folio ${delivery.folio}`,
    margenMm: 15,
  }) - 2;
  autoTable(doc, {
    startY: y0,
    margin: MARGEN,
    head: [["Empresa", "Resguardo", "Fecha"]],
    body: [[company.name, delivery.folio, delivery.date]],
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [236, 243, 253], textColor: [40, 70, 120] },
  });
  autoTable(doc, {
    margin: MARGEN,
    startY: doc.lastAutoTable.finalY + 5,
    body: [
      ["Recibe", delivery.employee.name],
      ["Puesto", delivery.employee.role],
      ["Entrega", delivery.actor],
      ["Devolución prevista", delivery.due || "Al terminar la asignación"],
    ],
    theme: "striped",
    styles: { fontSize: 9, cellPadding: 3 },
  });
  autoTable(doc, {
    margin: MARGEN,
    startY: doc.lastAutoTable.finalY + 7,
    head: [["Artículo / variante", "Código / serie", "Cantidad"]],
    body: delivery.lines.map((l) => [
      `${l.snapshot.name}\n${l.snapshot.variant}`,
      `${l.snapshot.code}\n${l.snapshot.serial || ""}`,
      l.qty,
    ]),
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [236, 243, 253], textColor: [40, 70, 120] },
    columnStyles: { 2: { halign: "right" } },
  });
  autoTable(doc, {
    margin: MARGEN,
    startY: doc.lastAutoTable.finalY + 6,
    head: [["Condición y observaciones"]],
    body: [
      [delivery.note || "Sin observaciones"],
      [
        `Estado: ${
          delivery.status === "cancelled"
            ? "Entrega revertida"
            : delivery.acknowledgement === "accepted"
              ? "Recepción confirmada por el empleado"
              : delivery.acknowledgement === "difference"
                ? "Diferencia reportada"
                : "Pendiente de acuse"
        }`,
      ],
      [
        delivery.ackNote ||
          delivery.cancelReason ||
          "Sin observaciones adicionales.",
      ],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [236, 243, 253], textColor: [40, 70, 120] },
    theme: "grid",
  });
  let y = doc.lastAutoTable.finalY + 24;
  if (y > 240) {
    doc.addPage();
    y = 40;
  }
  doc.setDrawColor(180);
  doc.line(20, y, 90, y);
  doc.line(120, y, 195, y);
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text("Entrega · Recursos Humanos", 22, y + 6);
  doc.text("Recibe · Empleado", 122, y + 6);
  dibujarPieAdamia(doc, { font, logo, documento: TITULO_RESGUARDO, detalle: `Folio ${delivery.folio}`, fecha, margenMm: 15 });
  return doc;
}
