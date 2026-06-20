// src/lib/pdfReportePersonalizado.js
// Exportación a PDF del Reporte Personalizado usando html2canvas + jsPDF.
// Captura el contenedor completo como un único canvas con escala dinámica para
// evitar el límite de tamaño del navegador en reportes grandes.
// Relacionado con: ReporteResultados.jsx, useReportePersonalizado.js

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
        // En landscape se reduce el font-size y padding de celdas para aprovechar
        // el ancho extra y que entren más columnas sin desbordamiento.
        const cellFontSize = landscape ? "7pt" : "8.5pt";
        const cellPadding = landscape ? "5px 6px" : "6px 9px";
        const thPadding = landscape ? "6px 6px" : "7px 9px";

        const safeStyle = doc.createElement("style");
        safeStyle.textContent = `
          *{box-sizing:border-box}
          @page{size:A4 ${landscape ? "landscape" : "portrait"};margin:0}
          body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,"Helvetica Neue";font-size:10.5pt;color:#111827;background:#ffffff;margin:0;padding:0}
          .pdf-topbar{display:flex;align-items:flex-start;justify-content:space-between;padding:0 0 12px 0;margin-bottom:12px}
          .pdf-topbar .brand{font-weight:800;font-size:16pt;color:#111827;letter-spacing:0;line-height:1}
          .pdf-topbar .right{line-height:1.3;text-align:right}
          .pdf-topbar .title{font-weight:600;font-size:11pt;color:#111827;margin-bottom:2px}
          .pdf-topbar .subtitle{font-size:9pt;color:#6b7280}
          .pdf-hr{height:1px;background:#d1d5db;margin:0 0 16px 0;width:100%}
          .pdf-meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:0 0 16px 0}
          .pdf-meta-box{border:1px solid #d1d5db;padding:12px 14px;border-radius:2px}
          .pdf-meta-box .box-title{font-size:8pt;color:#6b7280;text-transform:uppercase;font-weight:700;letter-spacing:0.5px;margin-bottom:8px}
          .pdf-meta-box .row{display:flex;justify-content:space-between;margin-bottom:4px}
          .pdf-meta-box .row .label{font-size:9pt;color:#6b7280}
          .pdf-meta-box .row .value{font-size:9pt;font-weight:600;color:#111827;text-align:right}
          .pdf-kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border:1px solid #d1d5db;border-radius:2px;overflow:hidden}
          .pdf-kpi-item{text-align:center;padding:10px 8px;border-right:1px solid #d1d5db;background:#f3f4f6}
          .pdf-kpi-item:last-child{border-right:none}
          .pdf-kpi-item .k-label{font-size:7pt;color:#6b7280;text-transform:uppercase;font-weight:600;margin-bottom:5px;letter-spacing:0.5px}
          .pdf-kpi-item .k-value{font-size:15pt;font-weight:700;color:#111827;line-height:1.2}
          .pdf-section-title{font-size:10pt;font-weight:700;color:#1f2937;background:#f3f4f6;padding:6px 10px;border-left:3px solid #2563eb;margin:12px 0 0 0}
          table{width:100%;border-collapse:collapse}
          thead th{background:#1f2937;color:#ffffff;font-weight:700;border:1px solid #1f2937;padding:${thPadding};text-align:left;font-size:${cellFontSize}}
          tbody td{border:1px solid #e5e7eb;padding:${cellPadding};font-size:${cellFontSize};line-height:1.3}
          tbody tr:nth-child(odd){background:#fafafa}
          tbody tr:nth-child(even){background:#ffffff}
          .pdf-badge{display:inline-block;padding:2px 7px;border-radius:4px;font-weight:600;font-size:8pt;border:1px solid #e5e7eb;background:#f9fafb;color:#111827}
          .pdf-signatures{display:flex;justify-content:space-between;gap:40px;padding:24px 0;margin-top:20px;border-top:1px solid #e5e7eb}
          .pdf-signatures .slot{display:flex;flex-direction:column;align-items:center;gap:8px;flex:1;max-width:45%}
          .pdf-signatures .line{height:1px;background:#111827;width:100%;max-width:200px}
          .pdf-signatures .label{font-size:8pt;color:#6b7280;text-transform:uppercase;font-weight:600;letter-spacing:0.5px}
        `;
        doc.head.appendChild(safeStyle);

        // 3) Normalizar colores modernos en todos los elementos clonados
        const SAFE = {
          color: "#111827",
          backgroundColor: "#ffffff",
          borderColor: "#e5e7eb",
          outlineColor: "#e5e7eb",
          fill: "#111827",
          stroke: "#111827",
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

    // ── Footer en todas las páginas con numeración correcta ──────────────────
    const totalPages = pdf.getNumberOfPages();
    const tipoLabelFooter =
      tipoReporte === "asistencia" ? "Asistencia" : "Reloj Checador";

    if (totalPages > 0) {
      const footerAreaTop = pageHeight - marginBottom - footerReserved;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(107, 114, 128);
      pdf.setDrawColor(209, 213, 219);
      pdf.setLineWidth(0.5);

      for (let page = 1; page <= totalPages; page++) {
        pdf.setPage(page);
        const lineY = footerAreaTop + 8;
        const textY = footerAreaTop + 22;

        pdf.line(marginLeft, lineY, pageWidth - marginRight, lineY);
        pdf.text(`Reporte de ${tipoLabelFooter}`, marginLeft, textY);

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
