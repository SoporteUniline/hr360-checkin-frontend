import Cookies from "js-cookie";

/**
 * Utilidades de PDF (jsPDF) para pintar el "logo/marca" de la empresa.
 *
 * Objetivo:
 * - En algunos módulos (Permisos, Mapa de Rutas) generamos PDF con `jsPDF` (no HTML->imagen).
 * - El usuario pidió mostrar el logo de la empresa en el encabezado, similar al estilo del PDF
 *   de "Reporte de Horas" donde se ve "Adamia" como texto (branding tipográfico).
 *
 * Enfoque:
 * - Si la empresa tiene `url_imagen`, intentamos descargarla y convertirla a DataURL para `doc.addImage`.
 * - Si NO hay imagen o falla, pintamos un fallback tipográfico (iniciales) dentro de un recuadro.
 *
 * Relación:
 * - `src/app/panel/permisos/PermisoViewDialog.jsx` (PDF de permiso)
 * - `src/app/panel/mapa-de-rutas/page.jsx` (Exportar Reporte a PDF)
 */

/**
 * Convierte una imagen remota/local a DataURL (base64).
 * - Usa token (cookie `token`) como Bearer por si el backend requiere Authorization.
 * - Si el URL es público, igual funciona.
 */
export async function fetchImageAsDataUrl(url) {
  if (!url) return null;
  try {
    /**
     * Importante (CORS):
     * - Muchas `url_imagen` vienen de S3 u otro dominio. Si mandamos headers (Authorization),
     *   eso fuerza preflight y puede fallar aunque la imagen se vea en un <img>.
     * - Por eso intentamos primero SIN headers. Solo si es mismo-origen, intentamos con token.
     */
    const tryFetch = async (withAuth = false) => {
      const token = Cookies.get("token");
      const headers =
        withAuth && token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(url, { method: "GET", headers, mode: "cors" });
      return res;
    };

    // 1) Intento sin headers (más compatible)
    let res = await tryFetch(false);

    // 2) Si falla y es mismo origen, intentamos con Authorization (por si el backend lo requiere)
    if (!res.ok) {
      try {
        const absolute = new URL(url, window.location.href);
        const sameOrigin = absolute.origin === window.location.origin;
        if (sameOrigin) {
          res = await tryFetch(true);
        }
      } catch {
        // Si URL inválida, no reintentamos con auth
      }
    }

    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ""));
      reader.readAsDataURL(blob);
    });
    return dataUrl || null;
  } catch {
    return null;
  }
}

/**
 * Obtiene iniciales cortas a partir del nombre de la empresa.
 * - Ej: "Uniline Innovacion en la Nube" => "UI"
 * - Ej: "Adamia" => "HR"
 */
export function getCompanyInitials(nombreEmpresa, maxChars = 3) {
  const s = String(nombreEmpresa || "").trim();
  if (!s) return "HR";
  const words = s.replace(/\s+/g, " ").split(" ").filter(Boolean);
  const initials = words
    .slice(0, maxChars)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return initials || s.slice(0, maxChars).toUpperCase();
}

/**
 * Dibuja un logo tipográfico (iniciales) centrado dentro de una caja.
 */
export function drawTextLogo(doc, text, box) {
  const t = String(text || "").trim();
  if (!t) return false;

  try {
    // Tamaño ajustado a una caja típica (ej. 26x14mm).
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    const centerX = box.x + box.boxW / 2;
    // Y aproximado al baseline para verse centrado verticalmente.
    const centerY = box.y + box.boxH / 2 + 5;
    doc.text(t, centerX, centerY, { align: "center" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Intenta agregar el logo de empresa a un PDF.
 * - Si hay DataURL, intenta `addImage` ajustando proporción.
 * - Si falla o no hay imagen, usa fallback tipográfico (iniciales de empresa).
 *
 * @returns {boolean} true si se dibujó algo (imagen o texto).
 */
export function tryAddCompanyMarkToPdf(doc, { logoDataUrl, companyName }, box) {
  // 1) Intentar imagen
  const dataUrl = typeof logoDataUrl === "string" ? logoDataUrl : null;
  if (dataUrl && dataUrl.startsWith("data:image/")) {
    try {
      const isJpg =
        dataUrl.startsWith("data:image/jpeg") ||
        dataUrl.startsWith("data:image/jpg");
      const fmt = isJpg ? "JPEG" : "PNG";

      // Fit: respetar proporción y centrar en la caja.
      // Nota: jsPDF no expone dimensiones de la imagen sin plugins; usamos "contain" por heurística:
      // - dibujamos ocupando toda la caja (que suele ser horizontal), la mayoría de logos se ve bien.
      doc.addImage(dataUrl, fmt, box.x, box.y, box.boxW, box.boxH);
      return true;
    } catch {
      // continúa al fallback tipográfico
    }
  }

  // 2) Fallback tipográfico (similar a "Adamia" en Reporte de Horas)
  const initials = getCompanyInitials(companyName, 3);
  return drawTextLogo(doc, initials, box);
}
