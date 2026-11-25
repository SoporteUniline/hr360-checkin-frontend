// Chips de la confirmación al checar (src/lib/reloj/confirmacion.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { chipsConfirmacion } from "../src/lib/reloj/confirmacion.mjs";

const textos = (data) => chipsConfirmacion(data).map((c) => `${c.texto}|${c.tono}`);

test("entrada: «A tiempo» verde y «Tu salida» con la hora en 12 h", () => {
  assert.deepEqual(textos({ message: "Entrada registrada", puntualidad: { estado: "a_tiempo", minutos: 0 }, salida_programada: "18:00" }),
    ["A tiempo|verde", "Tu salida: 6:00 p.m.|neutro"]);
});

test("entrada con retardo: «Retardo · 12 min» ámbar", () => {
  assert.deepEqual(textos({ message: "Entrada registrada", puntualidad: { estado: "retardo", minutos: 12 }, salida_programada: "18:00" }),
    ["Retardo · 12 min|ambar", "Tu salida: 6:00 p.m.|neutro"]);
});

test("salida antes: «Salió antes · 30 min» ámbar, sin «Tu salida»", () => {
  assert.deepEqual(textos({ message: "Salida registrada", puntualidad: { estado: "salio_antes", minutos: 30 }, salida_programada: "18:00" }),
    ["Salió antes · 30 min|ambar"]);
  assert.deepEqual(textos({ message: "Salida registrada", salida_programada: "18:00" }), [], "salida a tiempo: nada");
});

test("salir a comer: «Regresa a las 2:30 p.m.»", () => {
  assert.deepEqual(textos({ message: "Salida a comer registrada. ¡Buen provecho!", salida_programada: "18:00", regreso_comida: "14:30" }),
    ["Regresa a las 2:30 p.m.|neutro"]);
  assert.deepEqual(textos({ message: "Salida a comer registrada. ¡Buen provecho!", regreso_comida: null }), []);
});

test("sin horario, regreso de comida sin puntualidad y permiso", () => {
  assert.deepEqual(textos({ message: "Entrada registrada", puntualidad: { estado: "sin_horario", minutos: null }, salida_programada: null }), []);
  assert.deepEqual(textos({ message: "Entrada registrada", salida_programada: "18:00" }), ["Tu salida: 6:00 p.m.|neutro"]);
  assert.deepEqual(textos({ message: "Entrada registrada", puntualidad: { estado: "a_tiempo", minutos: 25, con_permiso: true } }), ["Entró con permiso|verde"]);
});

test("servidor viejo, pendiente o datos raros: nada", () => {
  assert.deepEqual(chipsConfirmacion({ message: "Entrada registrada" }), []);
  assert.deepEqual(chipsConfirmacion({ pending: true, puntualidad: { estado: "retardo", minutos: 5 } }), []);
  assert.deepEqual(chipsConfirmacion(null), []);
  assert.deepEqual(textos({ puntualidad: { estado: "retardo", minutos: null }, salida_programada: "mañana" }), []);
  assert.deepEqual(textos({ puntualidad: "retardo" }), []);
});
