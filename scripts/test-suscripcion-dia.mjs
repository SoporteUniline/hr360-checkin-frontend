// Validación de suscripción del reloj una vez al día (src/lib/reloj/suscripcionDia.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { hoyMx, validadaHoy, guardarValidada, olvidarValidada } from "../src/lib/reloj/suscripcionDia.mjs";

const memoria = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };

test("el día es el de Ciudad de México", () => {
  assert.equal(hoyMx(new Date("2026-11-22T05:30:00Z")), "2026-11-21"); // 23:30 del 21 en CDMX
  assert.equal(hoyMx(new Date("2026-11-22T06:10:00Z")), "2026-11-22");
});

test("se guarda hoy y mañana se vuelve a validar", () => {
  const storage = memoria();
  const hoy = new Date("2026-11-21T18:00:00Z");
  assert.equal(validadaHoy("empresa:7", { ahora: hoy, storage }), null, "la primera vez valida");
  guardarValidada("empresa:7", { idEmpresa: 7 }, { ahora: hoy, storage });
  assert.equal(validadaHoy("empresa:7", { ahora: new Date("2026-11-22T05:59:00Z"), storage }).idEmpresa, 7, "el resto del día entra directo");
  assert.equal(validadaHoy("empresa:7", { ahora: new Date("2026-11-22T06:01:00Z"), storage }), null, "pasada la medianoche valida otra vez");
  assert.equal(validadaHoy("empresa:8", { ahora: hoy, storage }), null, "cada empresa por separado");
  olvidarValidada("empresa:7", { storage });
  assert.equal(validadaHoy("empresa:7", { ahora: hoy, storage }), null);
});

test("datos dañados o sin almacenamiento: valida como antes", () => {
  const storage = memoria();
  storage.setItem("adamia-reloj-suscripcion:empresa:7", "{no es json");
  assert.equal(validadaHoy("empresa:7", { storage }), null);
  const roto = { getItem: () => { throw new Error("privado"); }, setItem: () => { throw new Error("privado"); } };
  assert.equal(validadaHoy("empresa:7", { storage: roto }), null);
  assert.doesNotThrow(() => guardarValidada("empresa:7", {}, { storage: roto }));
});

test("validada en los últimos 7 días: abre directo y se revalida en segundo plano", async () => {
  const { validadaReciente } = await import("../src/lib/reloj/suscripcionDia.mjs");
  const storage = memoria();
  guardarValidada("slug:demo", { idEmpresa: 7 }, { ahora: new Date("2026-11-15T18:00:00Z"), storage });
  assert.equal(validadaReciente("slug:demo", { ahora: new Date("2026-11-22T18:00:00Z"), storage }).idEmpresa, 7, "7 días después aún abre");
  assert.equal(validadaReciente("slug:demo", { ahora: new Date("2026-11-23T18:00:00Z"), storage }), null, "8 días después valida antes de abrir");
  assert.equal(validadaHoy("slug:demo", { ahora: new Date("2026-11-22T18:00:00Z"), storage }), null, "hoy sí se vuelve a consultar");
  storage.setItem("adamia-reloj-suscripcion:slug:demo", JSON.stringify({ activa: false, fecha: "2026-11-22", idEmpresa: 7 }));
  assert.equal(validadaReciente("slug:demo", { ahora: new Date("2026-11-22T18:00:00Z"), storage }), null, "inactiva nunca abre directo");
  storage.setItem("adamia-reloj-suscripcion:slug:demo", JSON.stringify({ activa: true, fecha: "2026-12-01", idEmpresa: 7 }));
  assert.equal(validadaReciente("slug:demo", { ahora: new Date("2026-11-22T18:00:00Z"), storage }), null, "fecha futura no cuenta");
});
