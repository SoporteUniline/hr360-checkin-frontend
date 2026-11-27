// (27/11/2026) Parte del navegador de la conversión de fotos (./aWeb.mjs decide; aquí solo se abre, se dibuja y se
// codifica). Sin dependencias. Orientación: los navegadores actuales ya enderezan la foto al abrirla (EXIF); los viejos
// no. Se prueba UNA vez con un JPEG de 2×1 marcado «girar 90°»: si sale de 1×2, el navegador ya la endereza y aquí no se
// vuelve a girar (girarla dos veces la dejaría de lado).
import { matrizOrientacion, medidasOrientadas } from "./aWeb.mjs";

// JPEG de 2×1 px con EXIF Orientation = 6 (469 bytes).
const PRUEBA_ORIENTACION = "data:image/jpeg;base64,/9j/4QDIRXhpZgAASUkqAAgAAAAHABIBAwABAAAABgAAABoBBQABAAAAYgAAABsBBQABAAAAagAAACgBAwABAAAAAgAAADEBAgACAAAAeAAAABMCAwABAAAAAQAAAGmHBAABAAAAcgAAAAAAAAA4YwAA6AMAADhjAADoAwAABgAAkAcABAAAADAyMTABkQcABAAAAAECAwAAoAcABAAAADAxMDABoAMAAQAAAP//AAACoAQAAQAAAAIAAAADoAQAAQAAAAEAAAAAAAAA/9sAQwBQNzxGPDJQRkFGWlVQX3jIgnhubnj1r7mRyP///////////////////////////////////////////////////9sAQwFVWlp4aXjrgoLr/////////////////////////////////////////////////////////////////////////8AAEQgAAQACAwEiAAIRAQMRAf/EABUAAQEAAAAAAAAAAAAAAAAAAAAE/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwC0AH//2Q==";

const lienzoNuevo = (ancho, alto) => {
  if (typeof OffscreenCanvas !== "undefined" && typeof OffscreenCanvas.prototype.convertToBlob === "function") {
    try { return new OffscreenCanvas(ancho, alto); } catch { /* sigue con el de la página */ }
  }
  const c = document.createElement("canvas");
  c.width = ancho;
  c.height = alto;
  return c;
};
const aBlob = (c, mime, calidad) => (typeof c.convertToBlob === "function"
  ? c.convertToBlob({ type: mime, quality: calidad }).catch(() => null)
  : new Promise((resolve) => c.toBlob((b) => resolve(b), mime, calidad)));

/** Abre la imagen como ImageBitmap (o <img> si el navegador no tiene createImageBitmap para Blob). */
async function abrir(blob) {
  if (typeof createImageBitmap === "function") {
    try { return await createImageBitmap(blob, { imageOrientation: "from-image" }); } catch { /* algunos Safari no aceptan opciones */ }
    try { return await createImageBitmap(blob); } catch { /* cae a <img> */ }
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await (typeof img.decode === "function" ? img.decode() : new Promise((ok, mal) => { img.onload = ok; img.onerror = mal; }));
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}
const medidas = (fuente) => ({ ancho: fuente.naturalWidth || fuente.width, alto: fuente.naturalHeight || fuente.height });

let yaEndereza = null;
/** ¿El navegador ya aplica la orientación EXIF al abrir? (se mide una vez por sesión). */
export async function navegadorEndereza() {
  if (yaEndereza === null) {
    yaEndereza = (async () => {
      try {
        const binario = atob(PRUEBA_ORIENTACION.split(",")[1]);
        const bytes = Uint8Array.from(binario, (c) => c.charCodeAt(0));
        const f = await abrir(new Blob([bytes], { type: "image/jpeg" }));
        const { ancho, alto } = medidas(f);
        f.close?.();
        return ancho === 1 && alto === 2;
      } catch { return true; } // si la prueba falla no se gira a mano (lo normal hoy es que ya endereza)
    })();
  }
  return yaEndereza;
}

/** → { fuente, ancho, alto (a lo derecho), girar (orientación que falta aplicar a mano, 1 = ninguna) } */
export async function decodificar(archivo, orientacion = 1) {
  const fuente = await abrir(archivo);
  const crudas = medidas(fuente);
  if (!crudas.ancho || !crudas.alto) { fuente.close?.(); throw new Error("Imagen vacía"); }
  const girar = orientacion !== 1 && !(await navegadorEndereza()) ? orientacion : 1;
  return { fuente, ...medidasOrientadas(crudas.ancho, crudas.alto, girar), girar };
}

let webp = null;
/** ¿El navegador CODIFICA WebP? (Safari abre WebP pero su lienzo entrega PNG al pedirlo). */
export async function soportaWebp() {
  if (webp === null) {
    webp = (async () => {
      try {
        const c = lienzoNuevo(2, 2);
        c.getContext("2d").fillRect(0, 0, 2, 2); // OffscreenCanvas sin contexto no codifica (InvalidStateError)
        const b = await aBlob(c, "image/webp", 0.8);
        return b?.type === "image/webp";
      } catch { return false; }
    })();
  }
  return webp;
}

/** ¿Tiene pixeles transparentes? Se revisa en miniatura (64 px): basta para saber si la transparencia importa. */
export async function tieneAlfa({ fuente, ancho, alto }) {
  try {
    const lado = 64;
    const w = Math.max(1, Math.round((ancho / Math.max(ancho, alto)) * lado));
    const h = Math.max(1, Math.round((alto / Math.max(ancho, alto)) * lado));
    const c = lienzoNuevo(w, h);
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(fuente, 0, 0, w, h);
    const datos = ctx.getImageData(0, 0, w, h).data;
    for (let i = 3; i < datos.length; i += 4) if (datos[i] < 250) return true;
    return false;
  } catch { return true; } // ante la duda se conserva la transparencia
}

/** Dibuja a ancho×alto (a lo derecho) y codifica. → Blob o null. */
export async function codificar({ fuente, girar = 1 }, { ancho, alto, mime, calidad }) {
  const c = lienzoNuevo(ancho, alto);
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  // JPEG no tiene transparencia: fondo blanco en vez de negro.
  if (mime === "image/jpeg") { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, ancho, alto); }
  const crudo = medidasOrientadas(ancho, alto, girar); // medidas de la imagen antes de girarla
  ctx.setTransform(...matrizOrientacion(girar, crudo.ancho, crudo.alto));
  ctx.drawImage(fuente, 0, 0, crudo.ancho, crudo.alto);
  return aBlob(c, mime, calidad);
}

export function liberar(foto) {
  foto?.fuente?.close?.();
}
