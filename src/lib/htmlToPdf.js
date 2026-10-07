/**
 * htmlToPdf — Convierte HTML a PDF usando html2canvas + jsPDF.
 *
 * Renderiza el contenido dentro de un <iframe> aislado para evitar que
 * html2canvas herede los estilos globales del proyecto (Tailwind CSS v4
 * usa `oklch()`, que html2canvas no soporta y lanza error).
 *
 * Estética corporativa Adamia (ver src/lib/pdfAdamiaTheme.js):
 * - Tipografía Poppins dentro del iframe (public/fonts) con fallback sans.
 * - Encabezado y pie vectoriales (nítidos, no rasterizados) dibujados con
 *   jsPDF sobre cada página: marca, título del documento, línea degradada
 *   azul → morado y numeración "Página X de N".
 *
 * @param {string} html       - HTML a renderizar (contenido_html del documento)
 * @param {string} filename   - Nombre del archivo sin extensión
 */

import { calcularPaginasPdf } from "@/lib/documentos/paginacionPdf";

import {
  ADAMIA,
  ADAMIA_LOGO_RATIO,
  applyAdamiaFont,
  gradientLine,
  loadAdamiaLogo,
} from "@/lib/pdfAdamiaTheme";

export async function htmlToPdf(
  html,
  filename = "documento",
  { download = true } = {},
) {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  return new Promise((resolve, reject) => {
    // ── 1. Crear iframe aislado (sin CSS del proyecto) ──
    const iframe = document.createElement("iframe");
    iframe.style.cssText = [
      "position:fixed",
      "top:0",
      "left:-9999px",
      "width:794px",   // ~A4 a 96 dpi
      "height:1px",    // se expande con el contenido
      "border:none",
      "visibility:hidden",
    ].join(";");
    document.body.appendChild(iframe);

    // Limpieza segura — evita el error si ya fue removido
    const cleanup = () => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    };

    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

    iframeDoc.open();
    iframeDoc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @font-face {
      font-family: "Poppins";
      src: url("/fonts/Poppins-Regular.ttf") format("truetype");
      font-weight: 400;
      font-style: normal;
    }
    @font-face {
      font-family: "Poppins";
      src: url("/fonts/Poppins-SemiBold.ttf") format("truetype");
      font-weight: 600;
      font-style: normal;
    }
    * { background-color: transparent !important; }
    html, body {
      margin: 0; padding: 0;
      background: #ffffff !important;
      font-family: "Poppins", -apple-system, "Segoe UI", Arial, sans-serif;
      font-size: 13px;
      line-height: 1.65;
      color: #1f2937;
      width: 794px;
      box-sizing: border-box;
    }
    body { padding: 48px 60px; }
    table { width: 100%; border-collapse: collapse; }
    td, th { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
    th {
      border-bottom: 2px solid #2563eb;
      font-weight: 600;
      text-align: left;
      color: #1f2937;
    }
    p { margin: 0 0 10px; }
    h1, h2, h3 { margin: 0 0 12px; color: #1f2937; font-weight: 600; }
    strong, b { font-weight: 600; }
  </style>
</head>
<body>${html}</body>
</html>`);
    iframeDoc.close();

    // ── 2. Handler único — se desregistra antes de ejecutarse ──
    const handleLoad = async () => {
      iframe.onload = null; // evitar doble ejecución
      try {
        const body = iframeDoc.body;

        // Expandir el iframe al alto real del contenido
        iframe.style.height = `${body.scrollHeight}px`;

        // Esperar a que Poppins termine de cargar antes de rasterizar
        try {
          await iframeDoc.fonts.ready;
        } catch {
          /* noop — navegador sin Font Loading API */
        }

        // Pequeña pausa para que el layout termine
        await new Promise((r) => setTimeout(r, 120));

        const canvas = await html2canvas(body, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          width: 794,
          windowWidth: 794,
          scrollX: 0,
          scrollY: 0,
        });

        // ── 3. Generar PDF con paginación + marco corporativo Adamia ──
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
        const FONT = await applyAdamiaFont(pdf);
        const logo = await loadAdamiaLogo(); // DataURL o null (fallback texto)

        const pageW = pdf.internal.pageSize.getWidth();   // 210 mm
        const pageH = pdf.internal.pageSize.getHeight();  // 297 mm
        const margin = 10;
        const headerBand = 18; // reservado arriba (marca + línea degradada)
        const footerBand = 16; // reservado abajo (línea + numeración)
        const contentTop = headerBand;
        const contentH = pageH - headerBand - footerBand; // alto útil por página

        const imgW = pageW - margin * 2;
        const pxPorMm = canvas.width / imgW;
        const escala = canvas.width / 794;
        const origen = body.getBoundingClientRect().top;
        const region = (rect) => [Math.max(0, Math.floor((rect.top - origen) * escala) - 2), Math.ceil((rect.bottom - origen) * escala) + 2];
        // html2canvas no aplica break-inside. Respetamos bloques y líneas al cortar el canvas.
        const bloques = [...body.querySelectorAll("p, tr, h1, h2, h3, [style*='break-inside:avoid']")].map((elemento) => {
          const rect = elemento.getBoundingClientRect();
          if (/^H[1-3]$/.test(elemento.tagName) && elemento.nextElementSibling) {
            const siguiente = elemento.nextElementSibling.getBoundingClientRect();
            return region({ top: rect.top, bottom: Math.min(siguiente.bottom, siguiente.top + 24) });
          }
          return region(rect);
        });
        const lineas = [];
        const walker = iframeDoc.createTreeWalker(body, 4); // NodeFilter.SHOW_TEXT
        let nodo;
        while ((nodo = walker.nextNode())) {
          if (!nodo.textContent.trim()) continue;
          const rango = iframeDoc.createRange();
          rango.selectNodeContents(nodo);
          for (const rect of rango.getClientRects()) if (rect.height) lineas.push(region(rect));
        }
        for (const elemento of body.querySelectorAll("img, svg")) lineas.push(region(elemento.getBoundingClientRect()));
        const paginas = calcularPaginasPdf(canvas.height, Math.floor(contentH * pxPorMm), bloques, lineas);
        const totalPages = paginas.length;

        // Título del documento en el encabezado (recortado si es muy largo)
        const fitTitle = (text, maxW) => {
          pdf.setFont(FONT, "normal");
          pdf.setFontSize(8);
          let t = String(text || "");
          if (pdf.getTextWidth(t) <= maxW) return t;
          while (t.length > 1 && pdf.getTextWidth(`${t}…`) > maxW) {
            t = t.slice(0, -1);
          }
          return `${t}…`;
        };

        const drawHeader = () => {
          let brandRightEdge = margin;
          if (logo) {
            const logoH = 6;
            const logoW = logoH * ADAMIA_LOGO_RATIO;
            pdf.addImage(logo, "PNG", margin, 5.2, logoW, logoH);
            brandRightEdge = margin + logoW;
          } else {
            pdf.setFont(FONT, "bold");
            pdf.setFontSize(11);
            pdf.setTextColor(...ADAMIA.blue);
            pdf.text("Adamia", margin, 10);
            brandRightEdge = margin + pdf.getTextWidth("Adamia");
          }
          const title = fitTitle(filename, pageW - margin - brandRightEdge - 6);
          pdf.setFont(FONT, "normal");
          pdf.setFontSize(8);
          pdf.setTextColor(...ADAMIA.muted);
          pdf.text(title, pageW - margin, 10, { align: "right" });
          gradientLine(pdf, margin, pageW - margin, 14, 0.55);
        };

        const drawFooter = (page) => {
          const lineY = pageH - footerBand + 3;
          const textY = lineY + 4.5;
          gradientLine(pdf, margin, pageW - margin, lineY, 0.35);
          pdf.setFont(FONT, "bold");
          pdf.setFontSize(7.5);
          pdf.setTextColor(...ADAMIA.blue);
          pdf.text("Adamia", margin, textY);
          const brandW = pdf.getTextWidth("Adamia");
          pdf.setFont(FONT, "normal");
          pdf.setTextColor(...ADAMIA.muted);
          pdf.text("  ·  Gestión Documental", margin + brandW, textY);
          pdf.text(`Página ${page} de ${totalPages}`, pageW - margin, textY, {
            align: "right",
          });
        };

        for (let page = 0; page < totalPages; page++) {
          if (page > 0) pdf.addPage();

          const { inicio, fin } = paginas[page];
          const recorte = document.createElement("canvas");
          recorte.width = canvas.width;
          recorte.height = fin - inicio;
          recorte.getContext("2d").drawImage(canvas, 0, inicio, canvas.width, fin - inicio, 0, 0, canvas.width, fin - inicio);
          pdf.addImage(recorte.toDataURL("image/png"), "PNG", margin, contentTop, imgW, (fin - inicio) / pxPorMm, undefined, "FAST");
          recorte.width = recorte.height = 0;

          drawHeader();
          drawFooter(page + 1);
        }

        const blob = pdf.output("blob");

        if (download) {
          pdf.save(`${filename}.pdf`);
        }

        resolve(blob);
      } catch (err) {
        reject(err);
      } finally {
        cleanup();
      }
    };

    iframe.onload = handleLoad;

    // Fallback: si el iframe ya cargó antes de asignar onload
    if (
      iframeDoc.readyState === "complete" ||
      iframeDoc.readyState === "interactive"
    ) {
      handleLoad();
    }
  });
}
