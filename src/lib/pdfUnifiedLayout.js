/**
 * Layout unificado de PDFs (jsPDF) para módulos del panel.
 *
 * Objetivo:
 * - Replicar el estilo "claro" ya usado en Permisos y Mapa de Rutas:
 *   - Hoja A4
 *   - Cajas con borde
 *   - Encabezado con marca (logo/empresa) + título
 *   - KPI a la derecha (ej: TOTAL / TOTAL A PAGAR)
 *   - Firmas + footer con paginación
 *
 * Relación:
 * - `src/app/panel/permisos/PermisoViewDialog.jsx`
 * - `src/app/panel/mapa-de-rutas/page.jsx`
 * - `src/app/panel/aguinaldos/*`
 * - `src/app/panel/finiquitos-y-liquidaciones/*`
 */

import dayjs from "dayjs";
import { tryAddCompanyMarkToPdf } from "@/lib/pdfCompanyLogo";

export const PDF_A4 = {
  pageWidth: 210,
  pageHeight: 297,
  margin: 20,
};

/**
 * Crea un contexto estándar A4.
 */
export function createPdfContext({ doc }) {
  const { pageWidth, pageHeight, margin } = PDF_A4;
  return {
    doc,
    pageWidth,
    pageHeight,
    margin,
    contentWidth: pageWidth - margin * 2,
    y: margin,
  };
}

/**
 * Asegura espacio vertical antes de escribir; agrega página si es necesario.
 * - Reserva un bloque inferior para firmas + footer.
 */
export function ensureSpace(ctx, neededHeightMm, reservedBottom = 65) {
  const { doc, pageHeight, margin } = ctx;
  if (ctx.y + neededHeightMm > pageHeight - margin - reservedBottom) {
    doc.addPage();
    ctx.y = margin;
  }
}

/**
 * Encabezado estilo Permisos:
 * - Caja con borde
 * - Marca de empresa a la izquierda (logo o iniciales)
 * - Título
 * - Sublineas (opcional)
 * - KPI a la derecha (label + value)
 */
export function drawHeaderBox(ctx, { title, linesLeft = [], kpiLabel, kpiValue, companyName, logoDataUrl }) {
  const { doc, pageWidth, margin, contentWidth } = ctx;
  const boxH = 34;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1);
  doc.rect(margin, ctx.y, contentWidth, boxH, "S");

  doc.setTextColor(0, 0, 0);

  const logoBox = { x: margin + 6, y: ctx.y + 6, boxW: 26, boxH: 14 };
  const hasMark = tryAddCompanyMarkToPdf(doc, { logoDataUrl, companyName }, logoBox);
  const textX = hasMark ? logoBox.x + logoBox.boxW + 4 : margin + 6;

  // Título
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(String(title || "").toUpperCase(), textX, ctx.y + 10);

  // Líneas a la izquierda (folio/estado/tipo/fecha...)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const baseY = ctx.y + 17;
  const lineGap = 6;
  (linesLeft || []).slice(0, 3).forEach((t, idx) => {
    doc.text(String(t || "—"), textX, baseY + idx * lineGap);
  });

  // KPI a la derecha
  if (kpiLabel) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(String(kpiLabel).toUpperCase(), pageWidth - margin - 6, ctx.y + 10, { align: "right" });
  }
  if (kpiValue !== undefined && kpiValue !== null) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(String(kpiValue), pageWidth - margin - 6, ctx.y + 23, { align: "right" });
  }

  ctx.y += boxH + 8;
}

/**
 * Caja simple con título + filas key/value (2 columnas).
 * - `rows`: Array<[label, value]>
 */
export function drawKeyValueBox(ctx, { title, rows = [] }) {
  const { doc, margin, contentWidth } = ctx;
  const paddingX = 6;
  const titleY = 8;
  const startY = 16;
  const lineH = 7;
  const minH = 26;

  const safeRows = (rows || []).filter(Boolean);
  const boxH = Math.max(minH, startY + safeRows.length * lineH + 2);

  ensureSpace(ctx, boxH + 6);

  doc.setLineWidth(0.5);
  doc.rect(margin, ctx.y, contentWidth, boxH, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(String(title || "").toUpperCase(), margin + paddingX, ctx.y + titleY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  safeRows.forEach((r, i) => {
    const y = ctx.y + startY + i * lineH;
    const label = String(r[0] ?? "").trim();
    const value = String(r[1] ?? "—").trim() || "—";
    doc.setFont("helvetica", "normal");
    doc.text(`${label}:`, margin + paddingX, y);
    doc.setFont("helvetica", "bold");
    doc.text(value, margin + paddingX + 32, y);
  });

  ctx.y += boxH + 8;
}

/**
 * Caja de texto multilínea (motivo/observaciones).
 */
export function drawMultilineBox(ctx, { title, text }) {
  const { doc, margin, contentWidth } = ctx;
  const paddingX = 6;
  const safeText = text && String(text).trim() ? String(text).trim() : "—";
  const lines = doc.splitTextToSize(safeText, contentWidth - 12);
  const lineHeight = 5;
  const boxH = Math.min(120, 14 + lines.length * lineHeight);

  ensureSpace(ctx, boxH + 6);

  doc.setLineWidth(0.5);
  doc.rect(margin, ctx.y, contentWidth, boxH, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(String(title || "").toUpperCase(), margin + paddingX, ctx.y + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(lines, margin + paddingX, ctx.y + 15);

  ctx.y += boxH + 8;
}

/**
 * Caja con filas "label" a la izquierda y "valor" alineado a la derecha.
 * - Útil para listados de conceptos con montos: evita que el texto del label se encime con el valor.
 *
 * @param {object} ctx
 * @param {object} options
 * @param {string} options.title
 * @param {Array<[string, string]>} options.rows
 * @param {number} options.valueColWidth - ancho reservado para la columna de valores (mm)
 */
export function drawRightValueRowsBox(ctx, { title, rows = [], valueColWidth = 55 }) {
  const { doc, margin, contentWidth } = ctx;
  const paddingX = 6;
  const startY = 16;
  const lineH = 6;
  const minH = 28;

  const safeRows = (rows || []).filter(Boolean);

  // Área disponible para el label (izquierda) dejando una columna fija para el valor (derecha).
  const labelMaxW = Math.max(30, contentWidth - valueColWidth - paddingX * 3);

  // Calcular alturas por fila (si el label se parte en varias líneas).
  const rowsLayout = safeRows.map(([label, value]) => {
    const labelText = String(label ?? "").trim();
    const valueText = String(value ?? "—").trim() || "—";
    const labelLines = doc.splitTextToSize(labelText, labelMaxW);
    const height = Math.max(1, labelLines.length) * lineH;
    return { labelLines, valueText, height };
  });

  const contentH = rowsLayout.reduce((acc, r) => acc + r.height, 0);
  const boxH = Math.max(minH, startY + contentH + 4);

  ensureSpace(ctx, boxH + 6);

  doc.setLineWidth(0.5);
  doc.rect(margin, ctx.y, contentWidth, boxH, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(String(title || "").toUpperCase(), margin + paddingX, ctx.y + 8);

  let y = ctx.y + startY;
  const valueXRight = margin + contentWidth - paddingX;

  rowsLayout.forEach((r) => {
    // Label (izquierda)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(r.labelLines, margin + paddingX, y);

    // Value (derecha, alineado)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(r.valueText, valueXRight, y, { align: "right" });

    y += r.height;
  });

  ctx.y += boxH + 8;
}

/**
 * Dibuja firmas y footer en todas las páginas (igual que Permisos).
 */
export function drawSignaturesAndFooter(
  doc,
  { empleadoName = "", empresaLabel = "Uniline Innovacion en la Nube", footerLeft = "Sistema HR360", signaturesOn = "all" }
) {
  const { pageWidth, pageHeight, margin } = PDF_A4;
  const totalPages = doc.internal.getNumberOfPages();
  const fechaGenerado = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
  const horaGenerado = new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Firmas (por defecto en todas las páginas; para finiquitos se usa solo en la última)
    const shouldDrawSignatures = signaturesOn === "all" ? true : p === totalPages;
    if (shouldDrawSignatures) {
      const yFirmas = pageHeight - 55;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);

      doc.line(margin + 10, yFirmas, margin + 70, yFirmas);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("FIRMA DEL TRABAJADOR", margin + 40, yFirmas + 6, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(String(empleadoName).slice(0, 45) || "—", margin + 40, yFirmas + 11, { align: "center" });

      doc.line(pageWidth - margin - 70, yFirmas, pageWidth - margin - 10, yFirmas);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("REPRESENTANTE DE LA EMPRESA", pageWidth - margin - 40, yFirmas + 6, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(String(empresaLabel).slice(0, 45), pageWidth - margin - 40, yFirmas + 11, { align: "center" });
    }

    // Footer
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(
      `Generado el ${fechaGenerado} a las ${horaGenerado} | ${footerLeft} | Página ${p} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  }
}

/**
 * Utilidad para moneda MXN.
 */
export function fmtMoneyMXN(value) {
  const n = Number(value || 0);
  return `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`;
}

/**
 * Utilidad fecha (YYYY-MM-DD -> "D de mes de YYYY").
 */
export function fmtFechaLargaISO(iso) {
  if (!iso) return "—";
  try {
    return new Date(`${dayjs(iso).format("YYYY-MM-DD")}T00:00:00`).toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return String(iso);
  }
}


