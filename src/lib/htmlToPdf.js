/**
 * htmlToPdf — Convierte HTML a PDF usando html2canvas + jsPDF.
 *
 * Renderiza el contenido dentro de un <iframe> aislado para evitar que
 * html2canvas herede los estilos globales del proyecto (Tailwind CSS v4
 * usa `oklch()`, que html2canvas no soporta y lanza error).
 *
 * @param {string} html       - HTML a renderizar (contenido_html del documento)
 * @param {string} filename   - Nombre del archivo sin extensión
 */
export async function htmlToPdf(html, filename = "documento") {
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
    * { background-color: transparent !important; }
    html, body {
      margin: 0; padding: 0;
      background: #ffffff !important;
      font-family: Georgia, serif;
      font-size: 14px;
      line-height: 1.6;
      color: #1f2937;
      width: 794px;
      box-sizing: border-box;
    }
    body { padding: 60px; }
    table { width: 100%; border-collapse: collapse; }
    td, th { padding: 6px 8px; }
    p { margin: 0 0 10px; }
    h1, h2, h3 { margin: 0 0 12px; }
    strong { font-weight: 700; }
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

        // ── 3. Generar PDF con paginación ──
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const pageW = pdf.internal.pageSize.getWidth();   // 210 mm
        const pageH = pdf.internal.pageSize.getHeight();  // 297 mm
        const margin = 10;
        const imgW = pageW - margin * 2;
        const imgH = (canvas.height * imgW) / canvas.width;

        let posY = margin;
        let heightLeft = imgH;
        pdf.addImage(imgData, "PNG", margin, posY, imgW, imgH);
        heightLeft -= pageH - margin;

        while (heightLeft > 0) {
          pdf.addPage();
          posY = -(imgH - heightLeft) - margin;
          pdf.addImage(imgData, "PNG", margin, posY, imgW, imgH);
          heightLeft -= pageH;
        }

        pdf.save(`${filename}.pdf`);
        resolve();
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
