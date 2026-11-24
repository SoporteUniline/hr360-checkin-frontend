// PDF de la matriz de asistencia (empleados × días) de registro-asistencia.
// Módulo puro (prueba en Node: scripts/test-pdf-marca.mjs). Formato homologado
// ADAMIA: encabezado con logotipo, documento, empresa y periodo;
// pie «Generado con ADAMIA · fecha · Página X de Y» en cada página; la tabla
// deja libre la franja del pie.
import { dibujarEncabezadoAdamia, dibujarPieAdamia } from "../pdfMarcaAdamia.mjs";

export const TITULO_MATRIZ = "Reporte de asistencia";

/**
 * @param {import("jspdf").jsPDF} doc  A4 horizontal en mm.
 * @param {Function} autoTable
 * @param {object} p
 * @param {Array<import("dayjs").Dayjs>} p.dias
 * @param {Array<{nombre: string, diasMap: object, presentes: number, faltas: number, total: number, pctAusencia: number}>} p.empleados
 * @param {object} p.celdas  Tipo de día → { code, rgb, fill }.
 * @param {string[]} p.letras  Letra del día de la semana (0 = domingo).
 * @param {string} p.periodo  «Del 01/11/2026 al 15/11/2026».
 * @param {string} [p.empresaNombre]
 * @param {string} [p.font]
 * @param {string|null} [p.logo]
 */
export function dibujarMatrizAsistencia(doc, autoTable, { dias, empleados, celdas, letras, periodo, empresaNombre = "", font = "helvetica", logo = null }) {
  const startY = dibujarEncabezadoAdamia(doc, {
    font,
    logo,
    documento: TITULO_MATRIZ,
    empresa: empresaNombre,
    subtitulo: periodo,
    margenMm: 10,
    yMm: 7,
  }) - 2;

  const head = [
    [
      "No.",
      "Nombre completo",
      ...dias.map((d) => `${d.format("DD")}\n${letras[d.day()]}`),
      "Pres.",
      "Faltas",
      "Total",
      "% Aus.",
    ],
  ];
  const tipoDe = (emp, d) => emp.diasMap[d.format("YYYY-MM-DD")] || "sin";
  const body = empleados.map((emp, i) => [
    i + 1,
    emp.nombre,
    ...dias.map((d) => celdas[tipoDe(emp, d)].code),
    emp.presentes,
    emp.faltas,
    emp.total,
    `${emp.pctAusencia}%`,
  ]);

  const first = 2;
  const last = dias.length + 1;
  autoTable(doc, {
    head,
    body,
    startY,
    theme: "grid",
    // Margen inferior: deja libre el pie de página homologado.
    margin: { top: 12, left: 10, right: 10, bottom: 18 },
    styles: { fontSize: 5.5, halign: "center", cellPadding: 0.6 },
    headStyles: { fillColor: [31, 41, 55], fontSize: 5.5 },
    columnStyles: { 1: { halign: "left", cellWidth: 32 } },
    didParseCell: (data) => {
      if (data.section !== "body") return;
      if (data.column.index >= first && data.column.index <= last) {
        const c = celdas[tipoDe(empleados[data.row.index], dias[data.column.index - first])];
        data.cell.styles.textColor = c.rgb;
        if (c.fill) data.cell.styles.fillColor = c.fill;
        data.cell.styles.fontStyle = "bold";
      }
    },
  });
  dibujarPieAdamia(doc, { font, logo, documento: TITULO_MATRIZ, detalle: periodo, margenMm: 10 });
  return doc;
}
