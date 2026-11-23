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
 * Formato homologado de todo PDF (23/11/2026): `dibujarPieAdamia` pone en cada
 * página el logotipo ADAMIA, «Generado con ADAMIA · fecha» y «Página X de Y».
 * El nombre del archivo descargado sale de `src/lib/nombreArchivo.mjs`.
 *
 * Relación:
 * - `src/lib/pdfMarcaAdamia.mjs` (helpers puros re-exportados aquí)
 * - `src/app/panel/reporte-horas/page.jsx` (primer documento con este tema)
 * - `src/lib/pdfUnifiedLayout.js` (permisos, aguinaldos, finiquitos, rutas)
 */

import { fetchImageAsDataUrl } from "@/lib/pdfCompanyLogo";

// Colores, logotipo, línea degradada, pie y encabezado homologados viven en un
// módulo puro (también lo usan las pruebas de Node).
export {
  ADAMIA,
  ADAMIA_LOGO_RATIO,
  lerpColor,
  gradientLine,
  mm,
  fechaHoraGeneracion,
  dibujarLogoAdamia,
  dibujarPieAdamia,
  dibujarEncabezadoAdamia,
} from "@/lib/pdfMarcaAdamia.mjs";

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

let marcaPromesa = null;
/**
 * Logotipo ADAMIA recortado y ligero (public/assets/adamia-pdf.png, 46 KB) para
 * el pie y el encabezado homologados. Se descarga una vez por sesión.
 */
export async function loadAdamiaMarca() {
  if (!marcaPromesa) {
    marcaPromesa = fetchImageAsDataUrl("/assets/adamia-pdf.png").then((d) => {
      if (!d) marcaPromesa = null; // reintenta la próxima vez
      return d;
    });
  }
  return await marcaPromesa;
}

/**
 * Lo necesario para el formato homologado: tipografía registrada en `doc` y
 * logotipo. Uso: `const { font, logo } = await prepararMarcaAdamia(doc);`
 */
export async function prepararMarcaAdamia(doc) {
  const [font, logo] = await Promise.all([applyAdamiaFont(doc), loadAdamiaMarca()]);
  return { font, logo };
}
