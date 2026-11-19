import assert from "node:assert/strict";
import test from "node:test";
import { etiquetaOrigen, fechaCorta, quienCuando } from "../src/lib/asistencia/historial.mjs";

test("quién y cuándo en una línea", () => {
  assert.equal(quienCuando({ nombre_usuario: "Laura Gómez", creado_en: "2026-11-18 19:45:12.000000" }), "Laura Gómez · 18/11 19:45");
  assert.equal(quienCuando({ creado_en: "2026-11-18T08:05:00" }), "Usuario sin nombre · 18/11 08:05");
  assert.equal(quienCuando(null), "");
  assert.equal(fechaCorta("x"), "");
});

test("origen legible", () => {
  assert.equal(etiquetaOrigen("reloj"), "Reloj checador");
  assert.equal(etiquetaOrigen("comida"), "Comida agregada");
  assert.equal(etiquetaOrigen("otro"), "otro");
});
