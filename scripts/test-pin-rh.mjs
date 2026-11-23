import test from "node:test";
import assert from "node:assert/strict";
import { estadoPinRh } from "../src/lib/firma/pinRh.mjs";

const ahora = new Date("2026-11-23T20:00:00Z");

test("sin PIN: no hay acciones; con firma y PIN activo: puede firmar con PIN", () => {
  const s = estadoPinRh({ tiene_firma: false, tiene_pin: false }, ahora);
  assert.deepEqual([s.pin.texto, s.firma.texto, s.puedeDesbloquear, s.puedeRestablecer, s.puedeFirmarConPin], ["Sin PIN", "Sin firma guardada", false, false, false]);
  const a = estadoPinRh({ tiene_firma: true, tiene_pin: true, intentos_fallidos: 0 }, ahora);
  assert.deepEqual([a.pin.texto, a.pin.tono, a.puedeDesbloquear, a.puedeRestablecer, a.puedeFirmarConPin], ["Activo", "verde", false, true, true]);
});

test("bloqueado: rojo, con hora, se puede desbloquear; ya vencido: activo", () => {
  const b = estadoPinRh({ tiene_firma: true, tiene_pin: true, bloqueado_hasta: "2026-11-23T20:12:00Z" }, ahora);
  assert.deepEqual([b.pin.texto, b.pin.tono, b.puedeDesbloquear, b.puedeFirmarConPin], ["Bloqueado", "rojo", true, false]);
  assert.match(b.pin.detalle, /hasta las 2:12/);
  const v = estadoPinRh({ tiene_firma: true, tiene_pin: true, bloqueado_hasta: "2026-11-23T19:59:00Z" }, ahora);
  assert.equal(v.pin.texto, "Activo");
});

test("intentos fallidos sin bloqueo: aviso ámbar y se pueden reiniciar", () => {
  const s = estadoPinRh({ tiene_firma: true, tiene_pin: true, intentos_fallidos: 3 }, ahora);
  assert.deepEqual([s.pin.tono, s.pin.detalle, s.puedeDesbloquear], ["ambar", "3 intentos fallidos recientes.", true]);
});
