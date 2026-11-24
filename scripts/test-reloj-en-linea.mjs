import assert from "node:assert/strict";
import test from "node:test";
import { registrarEnLinea } from "../src/lib/reloj/registrarEnLinea.mjs";

function navegador(t, onLine) {
  const original = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { onLine } });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, "navigator", original);
    else delete globalThis.navigator;
  });
}

test("envía código, QR y rostro a las rutas en línea con los datos originales", async t => {
  navegador(t, true);
  const calls = [];
  const response = { data: { requiereDecision: true, opciones: ["salida_temporal", "cerrar_turno"] } };
  const api = { post: async (...args) => { calls.push(args); return response; } };
  const codigo = { id_empresa: 7, codigo: "1234" };
  const rostro = { id_empresa: 7, descriptor_facial: [0.12], accion: "cerrar_turno" };
  assert.equal(await registrarEnLinea(api, codigo), response);
  assert.equal(await registrarEnLinea(api, rostro), response);
  assert.deepEqual(calls, [
    ["/checador/reloj/registrar", codigo],
    ["/checador/reloj/registrar-facial", rostro],
  ]);
});

test("sin internet rechaza la captura antes de llamar al servidor", async t => {
  navegador(t, false);
  const api = { post: () => assert.fail("No debe enviar solicitudes sin conexión") };
  await assert.rejects(registrarEnLinea(api, { codigo: "1234" }), /Necesitas conexión/);
});

test("una conexión caída durante el envío devuelve el error sin guardar una captura", async t => {
  navegador(t, true);
  const failure = new Error("Network Error");
  const api = { post: async () => { throw failure; } };
  await assert.rejects(registrarEnLinea(api, { codigo: "1234" }), error => error === failure);
});

test("la confirmación de una checada repetida conserva los datos y pide una hora nueva", async t => {
  navegador(t, true);
  const api = { post: async () => ({ data: { ignorada: true, rebote: { tipo: "entrada", hora: "09:00:00" } } }) };
  const { data } = await registrarEnLinea(api, { id_empresa: 7, codigo: "1234", captured_at: "2026-11-24T15:00:00.000Z" });
  assert.equal(data.repetida, true);
  assert.match(data.pregunta, /Acabas de registrar tu entrada/);
  assert.deepEqual(data.reintentar, { id_empresa: 7, codigo: "1234", repetir: true });
});

test("kiosco «Código y cara»: la cara y el código van juntos en un solo POST a registrar-facial", async t => {
  navegador(t, true);
  const calls = [];
  const api = { post: async (...args) => { calls.push(args); return { data: { success: true } }; } };
  const cuerpo = { id_empresa: 7, codigo: "1234", descriptor_facial: Array(128).fill(0.1), captured_at: "2026-11-24T15:00:00.000Z" };
  await registrarEnLinea(api, cuerpo);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "/checador/reloj/registrar-facial");
  assert.equal(calls[0][1].codigo, "1234");
  assert.equal(calls[0][1].descriptor_facial.length, 128);
});
