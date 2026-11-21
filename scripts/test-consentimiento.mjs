import { test } from "node:test";
import assert from "node:assert/strict";
import { estadoConsentimiento } from "../src/lib/legal/consentimientoRostro.mjs";

const ahora = Date.parse("2026-11-21T18:00:00Z");

test("sin solicitud: pendiente (no bloquea nada)", () => {
  assert.equal(estadoConsentimiento(null, ahora).tipo, "pendiente");
  assert.equal(estadoConsentimiento(null, ahora).etiqueta, "Consentimiento pendiente");
});

test("generado y vigente: esperando firma; abierto lo dice", () => {
  const s = { estatus: "pendiente", url_firma: "/firmar/abc", expires_at: "2026-12-20 18:00:00" };
  assert.equal(estadoConsentimiento(s, ahora).tipo, "esperando");
  assert.match(estadoConsentimiento({ ...s, estatus: "abierto" }, ahora).detalle, /ya abrió/);
});

test("enlace vencido: vuelve a pendiente para generar otro", () => {
  const r = estadoConsentimiento({ estatus: "pendiente", url_firma: "/firmar/abc", expires_at: "2026-11-01 00:00:00" }, ahora);
  assert.equal(r.tipo, "pendiente");
  assert.match(r.detalle, /venció/);
});

test("firmado con fecha en hora de México", () => {
  const r = estadoConsentimiento({ estatus: "firmado", signed_at: "2026-11-21 05:30:00" }, ahora);
  assert.equal(r.tipo, "firmado");
  assert.equal(r.detalle, "Firmado el 20 de noviembre de 2026.");
});
