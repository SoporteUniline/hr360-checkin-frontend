// Fotos de evidencia de Tareas y Checklists. (27/11/2026) Ya no se achican aparte: usan la conversión única de fotos
// (lib/imagenes/aWeb.mjs, uso «evidencia»: WebP de 1600 px y < 900 KB, enderezada, sin metadatos). Si la foto no se puede
// abrir (p. ej. HEIC en Chrome) lanza ErrorFoto con el mensaje para la persona. El servidor acepta JPG, PNG o WebP hasta 5 MB.
// Una foto que ya viene convertida (las pantallas la preparan al elegirla) se sube tal cual.
import { prepararFoto } from "../imagenes/aWeb.mjs";

export async function comprimirImagen(archivo) {
  if (typeof document === "undefined") return archivo;
  const r = await prepararFoto(archivo, "evidencia");
  return r.archivo;
}
