import assert from "node:assert/strict";
import test from "node:test";
import { motivoPendiente } from "../src/lib/reloj/motivoPendiente.mjs";

test("explica por qué una checada sigue en el dispositivo", () => {
  assert.equal(motivoPendiente({ status: "synced" }, true), "");
  assert.equal(motivoPendiente({ status: "pending" }, false), "Sin conexión: se sube sola al volver internet.");
  assert.equal(motivoPendiente({ status: "pending", error: "No se pudo sincronizar.", httpStatus: 503, errorCode: "ER_BAD_FIELD_ERROR" }, true),
    "No se pudo sincronizar. (HTTP 503 · ER_BAD_FIELD_ERROR)");
  assert.equal(motivoPendiente({ status: "pending", error: "timeout of 15000ms exceeded" }, true), "timeout of 15000ms exceeded (sin respuesta del servidor)");
  assert.match(motivoPendiente({ status: "pending", error: "" }, true), /otra checada anterior/);
});
