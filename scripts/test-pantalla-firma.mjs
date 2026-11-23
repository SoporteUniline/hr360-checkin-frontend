import test from "node:test";
import assert from "node:assert/strict";
import { esCelularParaFirmar } from "../src/lib/firma/pantallaFirma.mjs";

test("pantalla completa en horizontal solo en celular", () => {
  assert.equal(esCelularParaFirmar({ tactil: true, ancho: 390, alto: 844 }), true, "iPhone");
  assert.equal(esCelularParaFirmar({ tactil: true, ancho: 844, alto: 390 }), true, "iPhone ya girado");
  assert.equal(esCelularParaFirmar({ tactil: true, ancho: 412, alto: 915 }), true, "Android");
  assert.equal(esCelularParaFirmar({ tactil: false, ancho: 1440, alto: 900 }), false, "computadora");
  assert.equal(esCelularParaFirmar({ tactil: false, ancho: 390, alto: 844 }), false, "ventana chica con mouse");
  assert.equal(esCelularParaFirmar({ tactil: true, ancho: 1024, alto: 1366 }), false, "tableta grande: en la página");
});
