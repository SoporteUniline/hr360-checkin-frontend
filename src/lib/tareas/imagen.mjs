// Fotos de evidencia (23/11/2026): se achican en el celular antes de subir (máx. 1600 px, JPEG 80 %) para ahorrar datos
// y espacio. Si el navegador no puede (o ya es pequeña), se sube tal cual. El servidor acepta hasta 5 MB.
export async function comprimirImagen(archivo, { maximo = 1600, calidad = 0.8 } = {}) {
  if (typeof document === "undefined" || !archivo?.type?.startsWith("image/")) return archivo;
  try {
    const bitmap = await createImageBitmap(archivo);
    const escala = Math.min(1, maximo / Math.max(bitmap.width, bitmap.height));
    if (escala === 1 && archivo.size < 400 * 1024) return archivo;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", calidad));
    return blob && blob.size < archivo.size ? new File([blob], "foto.jpg", { type: "image/jpeg" }) : archivo;
  } catch {
    return archivo;
  }
}
