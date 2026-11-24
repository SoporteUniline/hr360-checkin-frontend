import test from "node:test";
import assert from "node:assert/strict";
import qrcode from "qrcode-generator";
import { qrComoDataUrl } from "../src/lib/qrImagen.mjs";

test("QR del código del empleado se genera localmente (sin servicios externos)", () => {
  const url = qrComoDataUrl("123456");
  assert.match(url, /^data:image\/gif;base64,[A-Za-z0-9+/=]+$/);
  assert.equal(qrComoDataUrl("123456"), url, "mismo código, misma imagen");
  assert.notEqual(qrComoDataUrl("654321"), url, "código distinto, imagen distinta");
  // El tamaño crece con la celda: sirve igual para la ficha (chico) y la credencial (grande).
  assert.ok(qrComoDataUrl("123456", { celda: 20 }).length > url.length);
  // Contenido: el mismo que codifica la librería para ese texto.
  const qr = qrcode(0, "M"); qr.addData("123456"); qr.make();
  assert.equal(url, qr.createDataURL(8, 2));
});
