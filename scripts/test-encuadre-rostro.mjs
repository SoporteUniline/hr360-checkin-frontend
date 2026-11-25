// Encuadre de la cara (src/lib/reloj/encuadreRostro.mjs): «Acércate» y «Aléjate» contra lo que se ve en pantalla.
import { test } from "node:test";
import assert from "node:assert/strict";
import { encuadreRostro, altoVisible, CARA_MINIMA } from "../src/lib/reloj/encuadreRostro.mjs";

const video = { videoW: 640, videoH: 480 };

test("sin datos del área visible se mide contra el cuadro completo (como antes)", () => {
  assert.equal(altoVisible(640, 480, 0, 0), 480);
  assert.equal(encuadreRostro({ box: { height: 60 }, ...video }), "lejos"); // 12.5 %
  assert.equal(encuadreRostro({ box: { height: 200 }, ...video }), "ok"); // 42 %
  assert.equal(CARA_MINIMA, 0.22);
});

test("cámara del kiosco (1012×868, más angosta que 4:3): se ve todo el alto", () => {
  assert.equal(altoVisible(640, 480, 1012, 868), 480);
  // Cara que llena el óvalo (65 % del alto) → la caja del detector ≈ 45 % del alto: se reconoce.
  assert.equal(encuadreRostro({ box: { x: 200, y: 100, width: 220, height: 216 }, ...video, vistaW: 1012, vistaH: 868 }), "ok");
});

test("cámara ancha y baja: la cara que llena el óvalo ya no pide «Acércate»", () => {
  // 1148×358: con object-cover se ve solo el 41 % del alto del cuadro.
  const visible = altoVisible(640, 480, 1148, 358);
  assert.ok(Math.abs(visible - 199.6) < 1, String(visible));
  const caja = { x: 260, y: 170, width: 100, height: 100 }; // 21 % del cuadro, 50 % de lo visible
  assert.equal(encuadreRostro({ box: caja, ...video }), "lejos", "contra el cuadro completo pediría «Acércate»");
  assert.equal(encuadreRostro({ box: caja, ...video, vistaW: 1148, vistaH: 358 }), "ok");
});

test("demasiado cerca: cara cortada por el borde o más grande que lo visible", () => {
  assert.equal(encuadreRostro({ box: { x: 100, y: -40, width: 300, height: 380 }, ...video, vistaW: 1012, vistaH: 868 }), "cerca");
  assert.equal(encuadreRostro({ box: { x: 500, y: 60, width: 200, height: 300 }, ...video, vistaW: 1012, vistaH: 868 }), "cerca");
  assert.equal(encuadreRostro({ box: { x: 120, y: 5, width: 400, height: 470 }, ...video, vistaW: 1012, vistaH: 868 }), "cerca");
  // Grande y completa (a un brazo): ok.
  assert.equal(encuadreRostro({ box: { x: 150, y: 40, width: 330, height: 400 }, ...video, vistaW: 1012, vistaH: 868 }), "ok");
});
