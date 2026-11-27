// (27/11/2026) «Que la foto se convierta a web inmediatamente, todo» (aprobado por el dueño). Al ELEGIR una foto, antes
// de subirla: se endereza (orientación EXIF), se reduce el lado mayor según su uso y se exporta a WebP (calidad 0.82),
// con respaldo a JPEG cuando el navegador no codifica WebP (Safari) y a PNG si trae transparencia y no hay WebP.
// Meta: que pese menos de 900 KB para pasar incluso el límite actual de nginx (1 MB); si no, baja calidad y tamaño por
// pasos. Además quita los metadatos (GPS, modelo del teléfono) porque el lienzo no los copia.
// Este archivo es PURO (sin DOM): tamaños, pasos, tipos, nombres, EXIF y el orden de la conversión, con pruebas en
// scripts/test-fotos-web.mjs. El dibujo en el lienzo vive aparte en ./lienzo.mjs (se inyecta) y el estado de React en
// ./usePrepararFoto.js. Quién lo usa y quién NO (rostro, firmas, foto del firmante, PDFs): docs/fotos-web.md.

export const LIMITE_BYTES = 900_000; // < 900 KB (decimal) con margen bajo 1 MB de nginx para los otros campos del formulario
export const CALIDAD_WEBP = 0.82;
const MB = 1024 * 1024;
/** Lo más pesado que se intenta abrir en el teléfono (una foto de 108 MP pesa ~25 MB). */
export const MAXIMO_ENTRADA = 40 * MB;

// formato: «web» = WebP (respaldo JPEG/PNG) · «compatible» = JPEG, o PNG si trae transparencia (nunca WebP): para lo que
// termina dentro de un PDF de jsPDF (logos: pdfCompanyLogo.js lee todo lo que no es JPEG como PNG) o va a WhatsApp
// (Meta acepta imágenes JPEG y PNG; WebP solo como sticker).
export const PERFILES = Object.freeze({
  portada: Object.freeze({ lado: 2000, formato: "web", calidad: CALIDAD_WEBP, maxBytes: LIMITE_BYTES }),
  publicacion: Object.freeze({ lado: 2000, formato: "web", calidad: CALIDAD_WEBP, maxBytes: LIMITE_BYTES }),
  evidencia: Object.freeze({ lado: 1600, formato: "web", calidad: CALIDAD_WEBP, maxBytes: LIMITE_BYTES }),
  // Foto de un documento (INE, comprobante, CV): más resolución y calidad para que se lea la letra chica.
  documento: Object.freeze({ lado: 2400, formato: "web", calidad: 0.85, maxBytes: LIMITE_BYTES }),
  perfil: Object.freeze({ lado: 1024, formato: "web", calidad: CALIDAD_WEBP, maxBytes: LIMITE_BYTES }),
  aviso: Object.freeze({ lado: 1600, formato: "web", calidad: CALIDAD_WEBP, maxBytes: LIMITE_BYTES }),
  // Activos: se manda como data URL dentro del JSON (base64 crece ~33 %) y el servidor la vuelve a optimizar (sharp).
  activo: Object.freeze({ lado: 1000, formato: "web", calidad: CALIDAD_WEBP, maxBytes: 500_000 }),
  logo: Object.freeze({ lado: 1200, formato: "compatible", calidad: 0.9, maxBytes: LIMITE_BYTES }),
  whatsapp: Object.freeze({ lado: 2000, formato: "compatible", calidad: CALIDAD_WEBP, maxBytes: LIMITE_BYTES }),
});

export const MENSAJES = Object.freeze({
  heic: "Esta foto está en formato HEIC; en el iPhone ve a Ajustes › Cámara › Formatos › Más compatible, o elige otra.",
  noEsFoto: "Elige una foto (JPG, PNG, WebP o HEIC).",
  noSeAbre: "No se pudo abrir esta foto. Elige otra o toma una nueva.",
  muyGrande: "Esta foto es demasiado grande para prepararla. Elige otra o toma una nueva.",
  muyPesada: "No se pudo dejar la foto lo bastante ligera. Elige otra más sencilla.",
});

export class ErrorFoto extends Error {
  constructor(codigo, mensaje = MENSAJES[codigo] ?? MENSAJES.noSeAbre) {
    super(mensaje);
    this.name = "ErrorFoto";
    this.codigo = codigo;
  }
}

/** Para el atributo accept de las entradas de foto: cualquier imagen (en el iPhone, con «image/*» la cámara entrega JPEG). */
export const ACEPTA_FOTOS = "image/*";
// Lo que se intenta abrir. GIF no (se perdería la animación) y SVG no (no es una foto).
export const TIPOS_ENTRADA = Object.freeze(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/avif", "image/bmp"]);
export const TIPOS_HEIC = Object.freeze(["image/heic", "image/heif"]);
const EXTENSION = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };
const CON_ALFA_POSIBLE = new Set(["image/png", "image/webp", "image/avif", "image/heic", "image/heif"]);

// ───────── tipo real por los bytes (el navegador a veces no lo dice: Android entrega «» o application/octet-stream) ─────────
const ascii = (b, desde, n) => String.fromCharCode(...b.subarray(desde, desde + n));
/** Uint8Array (los primeros bytes) → mime o null. */
export function tipoPorBytes(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes ?? []);
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && ascii(b, 1, 3) === "PNG") return "image/png";
  if (ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP") return "image/webp";
  if (ascii(b, 0, 3) === "GIF") return "image/gif";
  if (b[0] === 0x42 && b[1] === 0x4d) return "image/bmp";
  if (ascii(b, 0, 5) === "<?xml" || ascii(b, 0, 4) === "<svg") return "image/svg+xml";
  if (ascii(b, 4, 4) === "ftyp") {
    const tam = Math.min(b.length, ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0 || 32);
    const marcas = [];
    for (let i = 8; i + 4 <= tam; i += 4) if (i !== 12) marcas.push(ascii(b, i, 4));
    if (marcas.some((m) => m === "avif" || m === "avis")) return "image/avif";
    if (marcas.some((m) => ["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"].includes(m))) return "image/heic";
  }
  return null;
}
/** Tipo con el que se trabaja: el de los bytes y, si no se reconoce, el que dice el archivo (o su extensión). */
export function tipoDeFoto(bytes, archivo = {}) {
  const porBytes = tipoPorBytes(bytes);
  if (porBytes) return porBytes;
  const t = String(archivo.type ?? "").toLowerCase();
  if (t && t !== "application/octet-stream") return t;
  const ext = /\.([a-z0-9]+)$/i.exec(String(archivo.name ?? ""))?.[1]?.toLowerCase();
  return { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", heif: "image/heif", avif: "image/avif" }[ext] ?? (t || "");
}
export const esHeic = (tipo, nombre = "") => TIPOS_HEIC.includes(String(tipo ?? "").toLowerCase()) || /\.hei[cf]$/i.test(String(nombre ?? ""));

// ───────── orientación EXIF (JPEG) ─────────
/** Orientación 1–8 del EXIF de un JPEG (primeros ~64 KB). 1 si no tiene o no es JPEG. */
export function leerOrientacionExif(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes ?? []);
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return 1;
  let i = 2;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) return 1;
    const marca = b[i + 1];
    if (marca === 0xda || marca === 0xd9) return 1; // empezó la imagen: ya no hay EXIF
    const largo = (b[i + 2] << 8) | b[i + 3];
    if (marca === 0xe1 && ascii(b, i + 4, 4) === "Exif" && i + 10 + 8 <= b.length) {
      const t = i + 10; // inicio del TIFF
      const le = ascii(b, t, 2) === "II";
      const u16 = (p) => (le ? b[p] | (b[p + 1] << 8) : (b[p] << 8) | b[p + 1]);
      const u32 = (p) => (le ? (b[p] | (b[p + 1] << 8) | (b[p + 2] << 16) | (b[p + 3] << 24)) >>> 0 : ((b[p] << 24) | (b[p + 1] << 16) | (b[p + 2] << 8) | b[p + 3]) >>> 0);
      const ifd = t + u32(t + 4);
      if (ifd + 2 > b.length) return 1;
      const n = u16(ifd);
      for (let k = 0; k < n; k += 1) {
        const e = ifd + 2 + k * 12;
        if (e + 12 > b.length) return 1;
        if (u16(e) === 0x0112) { const o = u16(e + 8); return o >= 1 && o <= 8 ? o : 1; }
      }
      return 1;
    }
    i += 2 + largo;
  }
  return 1;
}
/** Medidas a lo derecho: con orientación 5–8 la foto está «acostada» y se intercambian. */
export const medidasOrientadas = (ancho, alto, orientacion = 1) => (orientacion >= 5 ? { ancho: alto, alto: ancho } : { ancho, alto });
/** Matriz [a, b, c, d, e, f] de ctx.setTransform para dibujar una imagen cruda de ancho×alto (ya escalada) a lo derecho. */
export function matrizOrientacion(orientacion, ancho, alto) {
  switch (orientacion) {
    case 2: return [-1, 0, 0, 1, ancho, 0];
    case 3: return [-1, 0, 0, -1, ancho, alto];
    case 4: return [1, 0, 0, -1, 0, alto];
    case 5: return [0, 1, 1, 0, 0, 0];
    case 6: return [0, 1, -1, 0, alto, 0];
    case 7: return [0, -1, -1, 0, alto, ancho];
    case 8: return [0, -1, 1, 0, 0, ancho];
    default: return [1, 0, 0, 1, 0, 0];
  }
}

// ───────── tamaños, formato y pasos ─────────
/** Medidas finales: el lado mayor a lo más `ladoMax`, sin agrandar nunca y sin cambiar la proporción. */
export function medidasDestino(ancho, alto, ladoMax) {
  const w = Math.max(1, Math.round(Number(ancho) || 1));
  const h = Math.max(1, Math.round(Number(alto) || 1));
  const escala = Math.min(1, ladoMax / Math.max(w, h));
  return { ancho: Math.max(1, Math.round(w * escala)), alto: Math.max(1, Math.round(h * escala)) };
}
/** Formato de salida según el uso, lo que el navegador sabe codificar y si la foto trae transparencia. */
export function elegirFormato({ formato = "web", soportaWebp = false, conAlfa = false } = {}) {
  if (formato === "web" && soportaWebp) return "image/webp";
  return conAlfa ? "image/png" : "image/jpeg";
}
const redondear = (x) => Math.round(x * 100) / 100;
/** Intentos en orden, del mejor al más ligero: primero baja la calidad, luego el tamaño. PNG ignora la calidad. */
export function pasosConversion(perfil) {
  const { lado, calidad } = perfil;
  const q = (menos) => redondear(Math.max(0.5, calidad - menos));
  const pasos = [[1, q(0)], [1, q(0.1)], [1, q(0.2)], [0.8, q(0.2)], [0.64, q(0.2)], [0.5, q(0.25)]];
  return pasos.map(([f, c]) => ({ lado: Math.max(320, Math.round(lado * f)), calidad: c }));
}
/** «IMG_0001.HEIC» + image/webp → «IMG_0001.webp». Sin nombre: «foto.webp». */
export function nombreConvertido(nombre, mime) {
  const ext = EXTENSION[mime] ?? "jpg";
  const base = String(nombre ?? "").split(/[\\/]/).pop().replace(/\.[a-z0-9]{1,5}$/i, "").trim();
  return `${base || "foto"}.${ext}`;
}
export const perfilDe = (uso) => {
  const p = PERFILES[uso];
  if (!p) throw new Error(`Uso de foto desconocido: ${uso}`);
  return p;
};
/** ¿Se puede subir la original tal cual? Ya está en el formato de salida (en los usos «compatibles», cualquier JPEG o
 *  PNG: no se recomprime un PNG chico a JPEG), a lo derecho, chica y ligera. */
export function sirveLaOriginal({ tipo, mime, orientacion, ancho, alto, tamano, perfil }) {
  const formatoBueno = tipo === mime || (perfil.formato === "compatible" && (tipo === "image/jpeg" || tipo === "image/png"));
  return formatoBueno && orientacion === 1 && Math.max(ancho, alto) <= perfil.lado && tamano <= perfil.maxBytes;
}

/**
 * Convierte una foto elegida a formato web. `lienzo` es el adaptador del navegador (./lienzo.mjs) — en las pruebas, uno
 * falso. → { archivo: File, antes, despues, ancho, alto, tipo, convertida } o lanza ErrorFoto (con mensaje para la persona).
 */
export async function prepararFoto(archivo, uso, { lienzo } = {}) {
  const perfil = perfilDe(uso);
  if (!archivo || typeof archivo.slice !== "function") throw new ErrorFoto("noEsFoto");
  if (!lienzo) lienzo = await import("./lienzo.mjs");
  const cabeza = new Uint8Array(await archivo.slice(0, 128 * 1024).arrayBuffer());
  const tipo = tipoDeFoto(cabeza, archivo);
  if (!TIPOS_ENTRADA.includes(tipo)) throw new ErrorFoto(esHeic(tipo, archivo.name) ? "heic" : "noEsFoto");
  if (archivo.size > MAXIMO_ENTRADA) throw new ErrorFoto("muyGrande");
  const orientacion = tipo === "image/jpeg" ? leerOrientacionExif(cabeza) : 1;

  let foto;
  try {
    foto = await lienzo.decodificar(archivo, orientacion);
  } catch {
    throw new ErrorFoto(esHeic(tipo, archivo.name) ? "heic" : "noSeAbre");
  }
  try {
    const conAlfa = CON_ALFA_POSIBLE.has(tipo) ? await lienzo.tieneAlfa(foto) : false;
    const mime = elegirFormato({ formato: perfil.formato, soportaWebp: await lienzo.soportaWebp(), conAlfa });
    if (sirveLaOriginal({ tipo, mime, orientacion, ancho: foto.ancho, alto: foto.alto, tamano: archivo.size, perfil })) {
      return { archivo, antes: archivo.size, despues: archivo.size, ancho: foto.ancho, alto: foto.alto, tipo, convertida: false };
    }
    for (const paso of pasosConversion(perfil)) {
      const medidas = medidasDestino(foto.ancho, foto.alto, paso.lado);
      const blob = await lienzo.codificar(foto, { ...medidas, mime, calidad: paso.calidad });
      if (!blob) throw new ErrorFoto("noSeAbre");
      // Safari viejo entrega PNG si no sabe el formato pedido: se toma el tipo REAL del resultado.
      const real = blob.type || mime;
      if (blob.size <= perfil.maxBytes) {
        const nuevo = new File([blob], nombreConvertido(archivo.name, real), { type: real, lastModified: Date.now() });
        return { archivo: nuevo, antes: archivo.size, despues: nuevo.size, ...medidas, tipo: real, convertida: true };
      }
    }
    throw new ErrorFoto("muyPesada");
  } finally {
    try { lienzo.liberar?.(foto); } catch { /* liberar nunca rompe la conversión */ }
  }
}

/** Varias fotos (muro): convierte una por una y junta los errores. → { listas: [{ original, ...resultado }], errores: [texto] } */
export async function prepararFotos(archivos, uso, opciones = {}) {
  const listas = [];
  const errores = [];
  for (const original of [...(archivos ?? [])]) {
    try { listas.push({ original, ...(await prepararFoto(original, uso, opciones)) }); }
    catch (e) {
      if (!(e instanceof ErrorFoto)) console.error("[fotos] no se pudo preparar la foto", e);
      errores.push(`«${original?.name || "foto"}»: ${e instanceof ErrorFoto ? e.message : MENSAJES.noSeAbre}`);
    }
  }
  return { listas, errores };
}
