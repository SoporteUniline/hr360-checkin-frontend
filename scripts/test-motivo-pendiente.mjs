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

test("un error del servidor no se presenta como falta de internet", async () => {
  const { errorDelServidor } = await import("../src/lib/reloj/motivoPendiente.mjs");
  assert.equal(errorDelServidor({ status: "pending", error: "No se pudo sincronizar.", httpStatus: 503 }), true);
  assert.equal(errorDelServidor({ status: "pending", error: "timeout of 15000ms exceeded" }), false, "sin respuesta: puede ser la red");
  assert.equal(errorDelServidor({ status: "pending", error: "" }), false);
  assert.equal(errorDelServidor({ status: "synced", error: "x", httpStatus: 503 }), false);
});

test("checada repetida (candado de 5 min): se muestra el aviso del servidor, no «Salida registrada»", async () => {
  const { textoChecada } = await import("../src/lib/reloj/motivoPendiente.mjs");
  assert.equal(textoChecada("ignorada", "Ya registraste tu entrada a las 16:20"), "Ya registraste tu entrada a las 16:20");
  assert.equal(textoChecada("ignorada"), "Ya estaba registrada hace menos de 5 minutos");
  assert.equal(textoChecada("entrada"), "Entrada registrada");
  assert.equal(textoChecada("salida"), "Salida registrada");
});

test("pregunta del candado en 12 h", async () => {
  const { preguntaRepetida } = await import("../src/lib/reloj/motivoPendiente.mjs");
  assert.equal(preguntaRepetida({ tipo: "salida", hora: "16:49" }), "Acabas de registrar tu salida a las 4:49 p.m.");
  assert.equal(preguntaRepetida({ tipo: "entrada", hora: "09:05" }), "Acabas de registrar tu entrada a las 9:05 a.m.");
  assert.equal(preguntaRepetida(null, "Ya registraste tu entrada a las 12:00"), "Ya registraste tu entrada a las 12:00");
});
