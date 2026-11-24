// Imagen de un código QR generada en el navegador (qrcode-generator): el NIP de acceso no sale a ningún tercero y el
// QR no depende de un servicio externo. Devuelve un data URL (GIF) listo para <img> o para dibujar en canvas.
import qrcode from "qrcode-generator";

export function qrComoDataUrl(texto, { celda = 8, margen = 2 } = {}) {
  const qr = qrcode(0, "M");
  qr.addData(String(texto ?? ""));
  qr.make();
  return qr.createDataURL(Math.max(1, Math.round(celda)), Math.max(0, Math.round(margen)));
}
