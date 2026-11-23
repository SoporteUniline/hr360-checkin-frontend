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

test("rotado 90°: el toque cae donde el dedo toca en el lienzo girado", async () => {
  const { puntoEnLienzo, estiloRotado } = await import("../src/lib/firma/pantallaFirma.mjs");
  // Sin rotar: relativo directo.
  assert.deepEqual(puntoEnLienzo({ clientX: 100, clientY: 50 }, { left: 0, top: 0, right: 200, width: 200, height: 100 }), { x: 0.5, y: 0.5 });
  // Celular 390×844 en vertical; el lienzo rotado ocupa la caja de pantalla left 0..390, top 0..844.
  const rect = { left: 0, right: 390, top: 0, width: 390, height: 844 };
  // El inicio del lienzo (su esquina superior izquierda) se ve arriba a la DERECHA de la pantalla.
  assert.deepEqual(puntoEnLienzo({ clientX: 390, clientY: 0 }, rect, true), { x: 0, y: 0 });
  // Bajar por la pantalla = avanzar a lo largo del lienzo (x); ir a la izquierda = bajar en el lienzo (y).
  assert.deepEqual(puntoEnLienzo({ clientX: 390, clientY: 844 }, rect, true), { x: 1, y: 0 });
  assert.deepEqual(puntoEnLienzo({ clientX: 0, clientY: 0 }, rect, true), { x: 0, y: 1 });
  assert.deepEqual(puntoEnLienzo({ clientX: 195, clientY: 422 }, rect, true), { x: 0.5, y: 0.5 });
  assert.deepEqual(estiloRotado(390, 844), { position: "absolute", top: 0, left: "390px", width: "844px", height: "390px", transform: "rotate(90deg)", transformOrigin: "top left" });
});
