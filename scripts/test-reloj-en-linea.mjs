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

// (26/11/2026) «Voy a comer»: la siguiente checada lleva accion = salida_comida; la regla la decide el servidor.
test("«Voy a comer»: agrega salida_comida solo si está prendido y la checada no trae acción; cuenta 30 s", async () => {
  const { conVoyAComer, segundosRestantes, DURACION_VOY_A_COMER_S } = await import("../src/lib/reloj/voyAComer.mjs");
  const codigo = { id_empresa: 7, codigo: "1234" };
  assert.deepEqual(conVoyAComer(codigo, true), { id_empresa: 7, codigo: "1234", accion: "salida_comida" });
  assert.equal(conVoyAComer(codigo, false), codigo, "apagado: la checada va igual");
  const elegida = { ...codigo, accion: "cerrar_turno" };
  assert.equal(conVoyAComer(elegida, true), elegida, "lo que eligió en la pregunta del servidor manda");
  const rostro = { id_empresa: 7, descriptor_facial: [0.1], modo: "app" };
  assert.deepEqual(conVoyAComer(rostro, true), { ...rostro, accion: "salida_comida" });
  assert.equal(DURACION_VOY_A_COMER_S, 30);
  assert.equal(segundosRestantes(31000, 1000), 30);
  assert.equal(segundosRestantes(31000, 30500), 1);
  assert.equal(segundosRestantes(31000, 31000), 0);
  assert.equal(segundosRestantes(31000, 40000), 0);
});
