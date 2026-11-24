// Pruebas de src/lib/miCuenta.mjs (24/11/2026): rol visible, recomendaciones de contraseña (guía, no bloqueo) y la
// validación de siempre del cambio de contraseña (ambos campos y que coincidan).
import test from "node:test";
import assert from "node:assert/strict";
import {
  errorCambioContrasena,
  estadoConfirmacion,
  etiquetaRol,
  nombreEmpresaActiva,
  recomendacionesContrasena,
} from "../src/lib/miCuenta.mjs";

test("rol con nombre legible; desconocido se muestra tal cual", () => {
  assert.equal(etiquetaRol("Recruiter"), "Administrador del panel");
  assert.equal(etiquetaRol("User"), "Administrador del panel");
  assert.equal(etiquetaRol("Admin"), "Administrador general");
  assert.equal(etiquetaRol("Supervisor"), "Supervisor");
  assert.equal(etiquetaRol(undefined), "");
});

test("recomendaciones se evalúan en vivo", () => {
  const cumple = (v) => Object.fromEntries(recomendacionesContrasena(v).map((r) => [r.id, r.cumple]));
  assert.deepEqual(cumple(""), { largo: false, "letras-numeros": false, simbolo: false });
  assert.deepEqual(cumple("abc"), { largo: false, "letras-numeros": false, simbolo: false });
  assert.deepEqual(cumple("abcdefg1"), { largo: true, "letras-numeros": true, simbolo: false });
  assert.deepEqual(cumple("Peña#2026"), { largo: true, "letras-numeros": true, simbolo: true });
  assert.equal(cumple("con espacio 1").simbolo, false, "el espacio no cuenta como símbolo");
});

test("validación de siempre: ambos campos y que coincidan (las recomendaciones no bloquean)", () => {
  assert.equal(errorCambioContrasena({ password: "", confirmPassword: "" }), "Por favor completa ambos campos.");
  assert.equal(errorCambioContrasena({ password: "abc", confirmPassword: "" }), "Por favor completa ambos campos.");
  assert.equal(errorCambioContrasena({ password: "abc", confirmPassword: "abd" }), "Las contraseñas no coinciden.");
  assert.equal(errorCambioContrasena({ password: "abc", confirmPassword: "abc" }), null, "corta pero coincide: se envía como antes");
  assert.equal(errorCambioContrasena(), "Por favor completa ambos campos.");
});

test("estado de la confirmación", () => {
  assert.equal(estadoConfirmacion("a", ""), "vacio");
  assert.equal(estadoConfirmacion("abc", "abc"), "coincide");
  assert.equal(estadoConfirmacion("abc", "ab"), "no-coincide");
});

test("nombre de la empresa activa", () => {
  const u = { id_empresa: 10, empresas_detalle: [{ id_empresa: 10, nombre: "Norte" }, { id_empresa: 11, nombre: "Sur" }] };
  assert.equal(nombreEmpresaActiva(u), "Norte");
  assert.equal(nombreEmpresaActiva(u, 11), "Sur");
  assert.equal(nombreEmpresaActiva(u, "11"), "Sur");
  assert.equal(nombreEmpresaActiva({ id_empresa: 3 }), "");
  assert.equal(nombreEmpresaActiva(null), "");
});
