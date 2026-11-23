// (23/11/2026) Imagen de un código QR generada en el navegador (qrcode-generator, sin dependencias). Sustituye a
// api.qrserver.com, que recibía el código de acceso (NIP) de cada empleado: ahora el dato no sale a ningún tercero
// y el QR funciona aunque ese servicio falle. Devuelve un data URL (GIF) listo para <img> o para dibujar en canvas.
import qrcode from "qrcode-generator";

export function qrComoDataUrl(texto, { celda = 8, margen = 2 } = {}) {
  const qr = qrcode(0, "M");
  qr.addData(String(texto ?? ""));
  qr.make();
  return qr.createDataURL(Math.max(1, Math.round(celda)), Math.max(0, Math.round(margen)));
}
