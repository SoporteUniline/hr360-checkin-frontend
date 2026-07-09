// src/lib/pdfReportePersonalizado.js
// Exportación a PDF del Reporte Personalizado usando html2canvas + jsPDF.
// Captura el contenedor completo como un único canvas con escala dinámica para
// evitar el límite de tamaño del navegador en reportes grandes.
// Estilo corporativo Adamia (ver pdfAdamiaTheme.js): sin rellenos de color,
// tipografía Poppins y acentos con el degradado azul → morado.
// Relacionado con: ReporteResultados.jsx, useReportePersonalizado.js

import { ADAMIA, gradientLine, applyAdamiaFont } from "@/lib/pdfAdamiaTheme";

/**
 * Exporta el contenido del div referenciado por `containerRef` a un PDF A4.
 *
 * @param {object} params
 * @param {React.RefObject} params.containerRef - Ref del div contenedor del reporte HTML
 * @param {string} params.tipoReporte - "asistencia" | "reloj"
 * @param {object} params.filtros - Filtros aplicados (para nombre de archivo)
 * @param {boolean} params.landscape - true = A4 horizontal (para reportes con muchas columnas)
 * @param {Function} params.onStart - Callback al iniciar la exportación
 * @param {Function} params.onEnd - Callback al finalizar (recibe error o null)
 */
export async function exportReportePersonalizadoPDF({
  containerRef,
  tipoReporte,
  filtros = {},
  landscape = false,
  onStart,
  onEnd,
}) {
  if (!containerRef?.current) {
    onEnd?.("No hay contenido para exportar.");
    return;
  }

  onStart?.();

  try {
    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");

    // ── Configuración de página A4 (portrait o landscape) ───────────────────
    const pdf = new jsPDF({
      orientation: landscape ? "l" : "p",
      unit: "pt",
      format: "a4",
    });
    // Tipografía Poppins para los textos nativos (footer); fallback Helvetica.
    const FONT = await applyAdamiaFont(pdf);
    // pageWidth y pageHeight se toman del objeto jsPDF para que sean correctos
    // independientemente de la orientación.
    // Portrait:  pageWidth=595pt, pageHeight=842pt
    // Landscape: pageWidth=842pt, pageHeight=595pt
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    // Márgenes 2.5cm (2.5 * 28.35 ≈ 71pt)
    const marginTop = 71;
    const marginBottom = 71;
    const marginLeft = 71;
    const marginRight = 71;
    const imgWidth = pageWidth - marginLeft - marginRight;
    // Área reservada al pie de cada página para el footer
    const footerReserved = 42;
    const usablePageHeight = pageHeight - marginTop - marginBottom - footerReserved;

    // ── Escala dinámica para evitar el límite de tamaño del canvas ──────────
    // Browsers: límite ≈ 32,767 px por dimensión. Con scale:3 y 768 filas
    // (~20,000 px de alto) el canvas supera el límite y se devuelve en blanco.
    const rawHeight =
      containerRef.current.scrollHeight ||
      containerRef.current.offsetHeight ||
      1;
    // scale:1 para reportes grandes, scale:2 medios, scale:3 pequeños
    const scale = rawHeight > 10000 ? 1 : rawHeight > 5000 ? 2 : 3;

    // ── Puntos de corte seguros: fin de cada fila de tabla ──────────────────
    // Se calcula sobre el contenedor completo en el DOM clonado para que los
    // estilos PDF ya estén aplicados al medir.
    let safeBreakInfo = null;

    const computeSafeBreaks = (containerEl) => {
      const rect = containerEl.getBoundingClientRect();
      const containerTop = rect.top;
      const totalHeight = rect.height || 1;
      const domBreaks = [0];

      const rows = Array.from(containerEl.querySelectorAll("table tbody tr"));
      for (const row of rows) {
        const bottom = row.getBoundingClientRect().bottom - containerTop;
        if (bottom > domBreaks[domBreaks.length - 1] + 4) domBreaks.push(bottom);
      }

      const last = domBreaks[domBreaks.length - 1];
      if (last < totalHeight) domBreaks.push(totalHeight);

      return { domBreaks, totalHeight };
    };

    const captureOptions = {
      scale,
      backgroundColor: "#ffffff",
      useCORS: true,
      onclone: (doc) => {
        // 1) Eliminar hojas de estilo externas con colores modernos (oklch, etc.)
        const links = Array.from(
          doc.querySelectorAll('link[rel="stylesheet"], style'),
        );
        links.forEach((l) => l.parentNode?.removeChild(l));

        // 2) Inyectar CSS seguro para PDF (compatible con jsPDF / html2canvas)
        // Lenguaje visual Adamia: sin rellenos de color, tipografía Poppins,
        // acentos con el degradado azul (#2563eb) → morado (#7c3aed) y
        // filetes grises (#e5e7eb).
        // En landscape se reduce el font-size y padding de celdas para aprovechar
        // el ancho extra y que entren más columnas sin desbordamiento.
        const cellFontSize = landscape ? "7pt" : "8.5pt";
        const thFontSize = landscape ? "6.5pt" : "7.5pt";
        const cellPadding = landscape ? "5px 6px" : "6px 9px";
        const thPadding = landscape ? "6px 6px" : "7px 9px";

        const safeStyle = doc.createElement("style");
        safeStyle.textContent = `
          *{box-sizing:border-box}
          @page{size:A4 ${landscape ? "landscape" : "portrait"};margin:0}
          @font-face{font-family:"Poppins";src:url("/fonts/Poppins-Regular.ttf") format("truetype");font-weight:400;font-style:normal}
          @font-face{font-family:"Poppins";src:url("/fonts/Poppins-SemiBold.ttf") format("truetype");font-weight:600;font-style:normal}
          body{font-family:"Poppins",ui-sans-serif,system-ui,-apple-system,"Helvetica Neue",Helvetica,sans-serif;font-size:10.5pt;color:#1f2937;background:#ffffff;margin:0;padding:0}
          .pdf-topbar{display:flex;align-items:flex-start;justify-content:space-between;padding:0 0 14px 0}
          .pdf-topbar .brand{font-weight:600;font-size:16pt;color:#2563eb;letter-spacing:0;line-height:1}
          .pdf-topbar .right{line-height:1.35;text-align:right}
          .pdf-topbar .title{font-weight:600;font-size:11pt;color:#1f2937;margin-bottom:2px}
          .pdf-topbar .subtitle{font-size:8pt;color:#6b7280}
          .pdf-hr{height:2px;background:linear-gradient(90deg,#2563eb,#7c3aed);border:none;margin:0 0 18px 0;width:100%}
          .pdf-meta-grid{display:grid;grid-template-columns:1.1fr 1fr;gap:24px;margin:0 0 18px 0}
          .pdf-meta-box{background:transparent;border:none;border-left:2px solid #2563eb;border-radius:0;padding:2px 0 2px 12px}
          .box-title{font-size:7pt;color:#6b7280;text-transform:uppercase;font-weight:600;letter-spacing:1px;margin-bottom:8px}
          .pdf-meta-box .row{display:flex;justify-content:space-between;margin-bottom:4px}
          .pdf-meta-box .row .label{font-size:7pt;color:#6b7280;text-transform:uppercase;letter-spacing:0.6px;padding-top:2px}
          .pdf-meta-box .row .value{font-size:9pt;font-weight:600;color:#1f2937;text-align:right}
          .pdf-kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;background:transparent}
          .pdf-kpi-item{text-align:center;padding:12px 8px;border-left:1px solid #e5e7eb;background:transparent}
          .pdf-kpi-item:first-child{border-left:none}
          .pdf-kpi-item .k-label{font-size:7pt;color:#6b7280;text-transform:uppercase;font-weight:600;margin-bottom:6px;letter-spacing:1px}
          .pdf-kpi-item .k-value{font-size:15pt;font-weight:600;color:#2563eb;line-height:1.2}
          .pdf-kpi-item:nth-child(2) .k-value{color:#514fec}
          .pdf-kpi-item:nth-child(3) .k-value{color:#7c3aed}
          .pdf-section-title{font-size:9.5pt;font-weight:600;color:#1f2937;background:transparent;padding:6px 0 6px 10px;border-left:2px solid #2563eb;margin:14px 0 2px 0}
          table{width:100%;border-collapse:collapse;background:#ffffff}
          thead th{background:#ffffff;color:#1f2937;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;border:none;border-bottom:2px solid #2563eb;padding:${thPadding};text-align:left;font-size:${thFontSize}}
          tbody td{border:none;border-bottom:1px solid #e5e7eb;padding:${cellPadding};font-size:${cellFontSize};line-height:1.3;color:#1f2937;background:#ffffff}
          tbody tr{background:#ffffff}
          .pdf-badge{display:inline-block;padding:2px 7px;border-radius:4px;font-weight:600;font-size:8pt;border:1px solid #e5e7eb;background:transparent;color:#1f2937}
          .pdf-signatures{display:flex;justify-content:space-between;gap:40px;padding:24px 0;margin-top:20px;border-top:1px solid #e5e7eb}
          .pdf-signatures .slot{display:flex;flex-direction:column;align-items:center;gap:8px;flex:1;max-width:45%}
          .pdf-signatures .line{height:1px;background:#4b5563;width:100%;max-width:200px}
          .pdf-signatures .label{font-size:7pt;color:#6b7280;text-transform:uppercase;font-weight:600;letter-spacing:1px}
        `;
        doc.head.appendChild(safeStyle);

        // 3) Normalizar colores modernos en todos los elementos clonados
        const SAFE = {
          color: "#1f2937",
          backgroundColor: "#ffffff",
          borderColor: "#e5e7eb",
          outlineColor: "#e5e7eb",
          fill: "#1f2937",
          stroke: "#1f2937",
        };
        const props = [
          "color",
          "backgroundColor",
          "borderColor",
          "borderTopColor",
          "borderRightColor",
          "borderBottomColor",
          "borderLeftColor",
          "outlineColor",
          "fill",
          "stroke",
        ];
        const hasModern = (v) =>
          v &&
          (v.includes("oklch(") ||
            v.includes("lab(") ||
            v.startsWith("color(") ||
            v.includes("color-mix("));
        const win = doc.defaultView || window;

        doc.querySelectorAll("*").forEach((el) => {
          try {
            const cs = win.getComputedStyle(el);
            props.forEach((prop) => {
              const val = cs.getPropertyValue(prop);
              if (hasModern(val)) {
                el.style[prop] = SAFE[prop] ?? "#111827";
              }
            });
          } catch {}
        });

        // 4) Calcular puntos de corte seguros sobre el contenedor completo clonado
        // Usamos el clonado para medir con los estilos PDF ya aplicados.
        const clonedContainer = doc.querySelector(
          '[data-pdf-root="true"]',
        );
        if (clonedContainer) {
          safeBreakInfo = computeSafeBreaks(clonedContainer);
        }
      },
    };

    // ── Esperar a que Poppins esté cargada antes de rasterizar ──────────────
    // El @font-face vive en SeccionPDF (ReporteResultados.jsx); sin esta espera
    // html2canvas podría capturar con la fuente de fallback.
    try {
      if (typeof document !== "undefined" && document.fonts) {
        if (document.fonts.load) {
          await Promise.allSettled([
            document.fonts.load('400 12px "Poppins"'),
            document.fonts.load('600 12px "Poppins"'),
          ]);
        }
        await document.fonts.ready;
      }
    } catch {
      // Si la API de fuentes falla se captura con el fallback del sistema.
    }

    // ── Captura del contenedor completo como un único canvas ─────────────────
    const canvas = await html2canvas(containerRef.current, captureOptions);
    const canvasHeight = canvas.height;
    const sliceHeight = (canvas.width * usablePageHeight) / imgWidth;

    // ── Paginación inteligente usando los puntos de corte seguros ────────────
    const info = safeBreakInfo;
    let isFirst = true;

    if (!info || !info.domBreaks || info.domBreaks.length < 2) {
      // Fallback: cortes uniformes si no se obtuvieron puntos seguros
      let position = 0;
      while (position < canvasHeight) {
        const currentHeight = Math.min(sliceHeight, canvasHeight - position);
        const slice = document.createElement("canvas");
        slice.width = canvas.width;
        slice.height = currentHeight;
        const ctx = slice.getContext("2d");
        if (!ctx) break;

        ctx.drawImage(canvas, 0, position, canvas.width, currentHeight, 0, 0, canvas.width, currentHeight);

        const part = slice.toDataURL("image/png");
        if (!isFirst) pdf.addPage();
        pdf.addImage(part, "PNG", marginLeft, marginTop, imgWidth, (currentHeight * imgWidth) / canvas.width);

        isFirst = false;
        position += currentHeight;
      }
    } else {
      const { domBreaks, totalHeight } = info;
      const scaleY = canvasHeight / (totalHeight || 1);
      const safeBreaks = domBreaks.map((v) => Math.round(v * scaleY));

      let pageTop = 0;
      let breakIndex = 1;

      while (pageTop < canvasHeight) {
        const maxBottom = pageTop + sliceHeight;
        let pageBottom = canvasHeight;

        // Elegir el último punto seguro que entre en la página actual
        while (
          breakIndex < safeBreaks.length &&
          safeBreaks[breakIndex] <= maxBottom
        ) {
          pageBottom = safeBreaks[breakIndex];
          breakIndex++;
        }

        // Sin punto seguro disponible → cortar en el límite de página
        if (pageBottom <= pageTop) {
          pageBottom = Math.min(maxBottom, canvasHeight);
          if (pageBottom <= pageTop) break;
        }

        const currentHeight = pageBottom - pageTop;
        const slice = document.createElement("canvas");
        slice.width = canvas.width;
        slice.height = currentHeight;
        const ctx = slice.getContext("2d");
        if (!ctx) break;

        ctx.drawImage(canvas, 0, pageTop, canvas.width, currentHeight, 0, 0, canvas.width, currentHeight);

        const part = slice.toDataURL("image/png");
        if (!isFirst) pdf.addPage();
        pdf.addImage(part, "PNG", marginLeft, marginTop, imgWidth, (currentHeight * imgWidth) / canvas.width);

        isFirst = false;
        pageTop = pageBottom;
      }
    }

    // ── Footer Adamia en todas las páginas: línea degradada, marca y folio ───
    const totalPages = pdf.getNumberOfPages();

    if (totalPages > 0) {
      const footerAreaTop = pageHeight - marginBottom - footerReserved;

      for (let page = 1; page <= totalPages; page++) {
        pdf.setPage(page);
        const lineY = footerAreaTop + 8;
        const textY = footerAreaTop + 22;

        gradientLine(pdf, marginLeft, pageWidth - marginRight, lineY, 0.8);

        pdf.setFont(FONT, "bold");
        pdf.setFontSize(7.5);
        pdf.setTextColor(...ADAMIA.blue);
        pdf.text("Adamia", marginLeft, textY);
        const brandWidth = pdf.getTextWidth("Adamia");

        pdf.setFont(FONT, "normal");
        pdf.setTextColor(...ADAMIA.muted);
        pdf.text("  ·  Reportes Personalizados", marginLeft + brandWidth, textY);

        const rightText = `Página ${page} de ${totalPages}`;
        const textWidth = pdf.getTextWidth(rightText);
        pdf.text(rightText, pageWidth - marginRight - textWidth, textY);
      }
    }

    // ── Nombre del archivo ────────────────────────────────────────────────────
    const tipoLabel =
      tipoReporte === "asistencia" ? "asistencia" : "reloj_checador";
    const fi = filtros.fechaInicio
      ? filtros.fechaInicio.replace(/-/g, "_")
      : "inicio";
    const ff = filtros.fechaFin
      ? filtros.fechaFin.replace(/-/g, "_")
      : "fin";
    pdf.save(`reporte_${tipoLabel}_${fi}_al_${ff}.pdf`);

    onEnd?.(null);
  } catch (err) {
    console.error("[pdfReportePersonalizado]", err);
    onEnd?.(err?.message || "Error al generar el PDF.");
  }
}
