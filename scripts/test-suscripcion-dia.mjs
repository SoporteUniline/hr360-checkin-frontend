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
