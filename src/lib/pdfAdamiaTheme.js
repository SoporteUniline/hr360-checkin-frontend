/**
 * Tema corporativo ADAMIA para PDFs (jsPDF).
 *
 * Lenguaje visual (aprobado en Reporte de Horas):
 * - Sin rellenos de color: solo líneas de acento con el degradado
 *   azul (#2563eb) → morado (#7c3aed) de la marca.
 * - Tipografía Poppins (public/fonts, licencia OFL) con fallback a Helvetica.
 * - Logotipo oficial (public/assets/adamia.png) con fallback tipográfico.
 *
 * Los helpers son agnósticos de unidades (pt o mm): reciben el `doc` y
 * coordenadas en la unidad con la que se creó el documento.
 *
 * Relación:
 * - `src/app/panel/reporte-horas/page.jsx` (primer documento con este tema)
 * - `src/lib/pdfUnifiedLayout.js` (permisos, aguinaldos, finiquitos, rutas)
 */

import { fetchImageAsDataUrl } from "@/lib/pdfCompanyLogo";

// Colorimetría oficial ADAMIA (ver variables --adamia-* en globals.css)
export const ADAMIA = {
  blue: [37, 99, 235], // --adamia-blue #2563eb
  purple: [124, 58, 237], // --adamia-purple #7c3aed
  text: [31, 41, 55], // --adamia-text-primary #1f2937
  text2: [75, 85, 99], // --adamia-text-secondary #4b5563
  muted: [107, 114, 128], // #6b7280
  hairline: [229, 231, 235], // #e5e7eb
};

// Proporción del logotipo public/assets/adamia.png (2160 x 1000)
export const ADAMIA_LOGO_RATIO = 2160 / 1000;

export const lerpColor = (a, b, t) =>
  a.map((v, i) => Math.round(v + (b[i] - v) * t));

/**
 * Descarga un TTF del mismo origen y lo devuelve en base64 (o null).
 */
async function loadFontB64(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const s = String(reader.result || "");
        const i = s.indexOf(",");
        resolve(i >= 0 ? s.slice(i + 1) : null);
      };
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Registra Poppins (normal + bold) en el documento.
 * @returns {Promise<string>} nombre de la familia a usar con doc.setFont
 *   ("Poppins" o "helvetica" si la descarga falla).
 */
export async function applyAdamiaFont(doc) {
  const [reg, semi] = await Promise.all([
    loadFontB64("/fonts/Poppins-Regular.ttf"),
    loadFontB64("/fonts/Poppins-SemiBold.ttf"),
  ]);
  if (reg && semi) {
    doc.addFileToVFS("Poppins-Regular.ttf", reg);
    doc.addFont("Poppins-Regular.ttf", "Poppins", "normal");
    doc.addFileToVFS("Poppins-SemiBold.ttf", semi);
    doc.addFont("Poppins-SemiBold.ttf", "Poppins", "bold");
    return "Poppins";
  }
  return "helvetica";
}

/**
 * Obtiene el logotipo Adamia como DataURL (o null si falla).
 */
export async function loadAdamiaLogo() {
  return await fetchImageAsDataUrl("/assets/adamia.png");
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
