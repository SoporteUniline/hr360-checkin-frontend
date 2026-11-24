/**
 * Marca ADAMIA para PDFs de jsPDF — módulo puro (sin fetch ni cookies), para
 * usarse igual en el navegador y en las pruebas de Node.
 *
 * Formato homologado:
 * - Encabezado: logotipo ADAMIA (o de la empresa), empresa y nombre del documento.
 * - Pie en CADA página: logotipo ADAMIA · «Generado con ADAMIA · <fecha y hora>»
 *   · nombre del documento y, a la derecha, «Página X de Y».
 *
 * Los helpers no dependen de la unidad del documento (mm o pt): las medidas se
 * dan en milímetros y se convierten con `doc.internal.scaleFactor`.
 *
 * `src/lib/pdfAdamiaTheme.js` re-exporta todo esto y agrega la carga de la
 * tipografía y del logotipo desde /public.
 */

export const ADAMIA = {
  blue: [37, 99, 235], // --adamia-blue #2563eb
  purple: [124, 58, 237], // --adamia-purple #7c3aed
  text: [31, 41, 55], // --adamia-text-primary #1f2937
  text2: [75, 85, 99], // --adamia-text-secondary #4b5563
  muted: [107, 114, 128], // #6b7280
  hairline: [229, 231, 235], // #e5e7eb
};

// Proporción del logotipo public/assets/adamia.png (2160 x 1000). El pie y el
// encabezado homologados usan public/assets/adamia-pdf.png (recortado, 640 x 182).
export const ADAMIA_LOGO_RATIO = 2160 / 1000;

export const lerpColor = (a, b, t) =>
  a.map((v, i) => Math.round(v + (b[i] - v) * t));

const PT_POR_MM = 72 / 25.4;

/** Convierte milímetros a la unidad con la que se creó el documento. */
export function mm(doc, valor) {
  const k = Number(doc?.internal?.scaleFactor) || PT_POR_MM;
  return (valor * PT_POR_MM) / k;
}

/**
 * Línea horizontal degradada azul → morado (identidad Adamia),
 * dibujada por segmentos. Coordenadas en la unidad del documento.
 */
export function gradientLine(doc, x1, x2, y, width) {
  const steps = 48;
  const seg = (x2 - x1) / steps;
  const overlap = Math.abs(seg) * 0.08;
  doc.setLineWidth(width);
  for (let i = 0; i < steps; i++) {
    doc.setDrawColor(...lerpColor(ADAMIA.blue, ADAMIA.purple, i / (steps - 1)));
    doc.line(x1 + i * seg, y, x1 + (i + 1) * seg + overlap, y);
  }
}

const dos = (n) => String(n).padStart(2, "0");

/** «23/11/2026 14:05» (hora local, 24 h): igual en navegador y Node. */
export function fechaHoraGeneracion(fecha = new Date()) {
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  return `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()} ${dos(d.getHours())}:${dos(d.getMinutes())}`;
}

function tamanoPagina(doc) {
  const size = doc.internal.pageSize;
  return { w: size.getWidth(), h: size.getHeight() };
}

/**
 * Pinta el logotipo ADAMIA (o «ADAMIA» en texto si no hay imagen). La proporción
 * se toma de la imagen (public/assets/adamia-pdf.png ya viene recortada).
 * Devuelve el ancho usado.
 */
export function dibujarLogoAdamia(doc, logo, x, y, altoMm, font = "helvetica") {
  const alto = mm(doc, altoMm);
  if (logo) {
    try {
      const props = doc.getImageProperties(logo);
      const ancho = (alto * props.width) / props.height;
      doc.addImage(logo, "PNG", x, y, ancho, alto, "adamia-logo", "FAST");
      return ancho;
    } catch {
      // Si la imagen no se puede incrustar, se usa la marca tipográfica.
    }
  }
  doc.setFont(font, "bold");
  doc.setFontSize(Math.max(7, altoMm * 2.2));
  doc.setTextColor(...ADAMIA.blue);
  doc.text("ADAMIA", x, y + alto * 0.78);
  return doc.getTextWidth("ADAMIA");
}

/**
 * Pie de página homologado en TODAS las páginas del documento.
 * Debe llamarse al final, cuando ya no se agregarán páginas.
 *
 * @param {import("jspdf").jsPDF} doc
 * @param {object} op
 * @param {string} [op.font="helvetica"]  Familia ya registrada (Poppins o helvetica).
 * @param {string|null} [op.logo]  DataURL del logotipo ADAMIA (public/assets/adamia-pdf.png).
 * @param {string} [op.documento]  Nombre del documento («Acta administrativa»).
 * @param {string} [op.detalle]  Dato breve extra (p. ej. «Folio #12»). Sin datos personales.
 * @param {Date} [op.fecha]  Fecha de generación (por omisión, ahora).
 * @param {number} [op.margenMm=20]  Margen lateral en mm.
 */
export function dibujarPieAdamia(doc, { font = "helvetica", logo = null, documento = "", detalle = "", fecha = new Date(), margenMm = 20 } = {}) {
  const total = doc.internal.getNumberOfPages();
  const generado = `Generado con ADAMIA · ${fechaHoraGeneracion(fecha)}`;
  const extra = [documento, detalle].map((s) => String(s || "").trim()).filter(Boolean).join(" · ");
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    const { w, h } = tamanoPagina(doc);
    const x1 = mm(doc, margenMm);
    const x2 = w - mm(doc, margenMm);
    const lineaY = h - mm(doc, 14);
    const textoY = h - mm(doc, 8.6);
    gradientLine(doc, x1, x2, lineaY, mm(doc, 0.35));

    const logoW = dibujarLogoAdamia(doc, logo, x1, textoY - mm(doc, 2.6), 3.2, font);
    const xTexto = x1 + logoW + mm(doc, 2.5);
    const paginaTxt = `Página ${p} de ${total}`;

    doc.setFont(font, "normal");
    doc.setFontSize(7);
    doc.setTextColor(...ADAMIA.muted);
    const anchoPagina = doc.getTextWidth(paginaTxt);
    doc.text(paginaTxt, x2, textoY, { align: "right" });

    const disponible = x2 - anchoPagina - mm(doc, 4) - xTexto;
    let linea = extra ? `${generado} · ${extra}` : generado;
    if (doc.getTextWidth(linea) > disponible) {
      // Helvetica estándar de jsPDF no dibuja «…»: ahí se usan tres puntos.
      const puntos = font === "helvetica" ? "..." : "…";
      while (linea.length > generado.length && doc.getTextWidth(`${linea}${puntos}`) > disponible) linea = linea.slice(0, -1);
      linea = `${linea.trimEnd()}${puntos}`;
    }
    doc.text(linea, xTexto, textoY);
  }
  doc.setPage(total);
}

/**
 * Encabezado homologado para documentos sencillos: logotipo ADAMIA a la
 * izquierda (y, si se da, el de la empresa); a la derecha nombre del documento
 * y empresa; línea degradada.
 * Devuelve la Y (unidad del documento) donde puede empezar el contenido.
 */
export function dibujarEncabezadoAdamia(doc, { font = "helvetica", logo = null, logoEmpresa = null, documento = "", empresa = "", subtitulo = "", margenMm = 20, yMm = 12 } = {}) {
  const { w } = tamanoPagina(doc);
  const x1 = mm(doc, margenMm);
  const x2 = w - mm(doc, margenMm);
  const y = mm(doc, yMm);
  const anchoAdamia = dibujarLogoAdamia(doc, logo, x1, y + mm(doc, 1), 8, font);
  let finLogos = x1 + anchoAdamia;
  if (logoEmpresa) {
    // Logotipo de la empresa junto al de ADAMIA (máx. 26 × 10 mm), separado por una línea fina.
    try {
      const props = doc.getImageProperties(logoEmpresa);
      const escala = Math.min(mm(doc, 26) / props.width, mm(doc, 10) / props.height);
      const xEmpresa = x1 + anchoAdamia + mm(doc, 6);
      doc.setDrawColor(...ADAMIA.hairline);
      doc.setLineWidth(mm(doc, 0.2));
      doc.line(xEmpresa - mm(doc, 3), y, xEmpresa - mm(doc, 3), y + mm(doc, 10));
      doc.addImage(logoEmpresa, props.fileType || "PNG", xEmpresa, y, props.width * escala, props.height * escala);
      finLogos = xEmpresa + props.width * escala;
    } catch {
      // Sin logotipo de empresa: el nombre queda en el texto del encabezado.
    }
  }

  doc.setFont(font, "bold");
  doc.setFontSize(12.5);
  doc.setTextColor(...ADAMIA.text);
  const anchoTexto = Math.max(mm(doc, 50), x2 - finLogos - mm(doc, 6));
  const titulo = doc.splitTextToSize(String(documento || ""), anchoTexto);
  doc.text(titulo, x2, y + mm(doc, 4.2), { align: "right" });
  let yTexto = y + mm(doc, 4.2) + mm(doc, 5) * (titulo.length - 1);

  doc.setFont(font, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...ADAMIA.muted);
  for (const linea of [empresa, subtitulo].map((s) => String(s || "").trim()).filter(Boolean)) {
    yTexto += mm(doc, 4.6);
    doc.text(doc.splitTextToSize(linea, anchoTexto)[0], x2, yTexto, { align: "right" });
  }
  const lineaY = Math.max(y + mm(doc, 14), yTexto + mm(doc, 3.5));
  gradientLine(doc, x1, x2, lineaY, mm(doc, 0.55));
  doc.setTextColor(...ADAMIA.text);
  return lineaY + mm(doc, 8);
}
