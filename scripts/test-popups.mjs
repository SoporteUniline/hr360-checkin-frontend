import { test } from "node:test";
import assert from "node:assert/strict";
import { paginaDe, elegirPopup, vistoReciente, esperaSegundos, esEnlaceExterno, leerHistorial, guardarVisto, CLAVE_HISTORIAL } from "../src/lib/popups/reglas.mjs";

test("página según la ruta", () => {
  assert.equal(paginaDe("/"), "inicio");
  assert.equal(paginaDe("/blog"), "blog");
  assert.equal(paginaDe("/blog/"), "blog");
  assert.equal(paginaDe("/blog/multas-registro-jornada-laboral"), "articulos");
  assert.equal(paginaDe("/panel"), null);
  assert.equal(paginaDe("/contacto"), null);
});

const DIA = 86400000;
const lista = [
  { id: 1, dispositivos: "celular", frecuencia_dias: 7 },
  { id: 2, dispositivos: "todos", frecuencia_dias: 7 },
  { id: 3, dispositivos: "escritorio", frecuencia_dias: 0 },
];

test("elige el primero que aplica al dispositivo y no se vio en su frecuencia", () => {
  const ahora = 100 * DIA;
  assert.equal(elegirPopup(lista, { ancho: 1440, ahora }).id, 2);
  assert.equal(elegirPopup(lista, { ancho: 390, ahora }).id, 1);
  assert.equal(elegirPopup(lista, { ancho: 1440, historial: { 2: ahora - 3 * DIA }, ahora }).id, 3);
  // Pasada la frecuencia vuelve a salir.
  assert.equal(elegirPopup(lista, { ancho: 1440, historial: { 2: ahora - 8 * DIA }, ahora }).id, 2);
  // Frecuencia 0: no se recuerda entre visitas, pero sí dentro de la misma visita.
  assert.equal(vistoReciente(lista[2], { 3: ahora }, ahora), false);
  assert.equal(elegirPopup(lista, { ancho: 1440, historial: { 2: ahora }, vistosEnVisita: [3], ahora }), null);
  assert.equal(elegirPopup([], { ancho: 1440 }), null);
});

test("nunca antes de 3 segundos; enlaces externos solo https", () => {
  assert.equal(esperaSegundos({ segundos: 1 }), 3);
  assert.equal(esperaSegundos({ segundos: 12 }), 12);
  assert.equal(esperaSegundos({}), 8);
  assert.equal(esEnlaceExterno("https://wa.me/52"), true);
  assert.equal(esEnlaceExterno("/cotiza"), false);
});

test("historial en el navegador: tolera datos dañados y almacenamiento bloqueado", () => {
  const mapa = new Map();
  const almacen = { getItem: (k) => mapa.get(k) ?? null, setItem: (k, v) => mapa.set(k, v) };
  guardarVisto(almacen, 5, 123);
  assert.deepEqual(leerHistorial(almacen), { 5: 123 });
  mapa.set(CLAVE_HISTORIAL, "{roto");
  assert.deepEqual(leerHistorial(almacen), {});
  const bloqueado = { getItem: () => { throw new Error("bloqueado"); }, setItem: () => { throw new Error("bloqueado"); } };
  assert.deepEqual(leerHistorial(bloqueado), {});
  assert.doesNotThrow(() => guardarVisto(bloqueado, 1));
});

test("botón a Contratar con el cupón ya escrito y «Válido hasta…»", async () => {
  const { enlaceConCupon, validoHasta } = await import("../src/lib/popups/reglas.mjs");
  assert.equal(enlaceConCupon("/contratar-plan", "BUENFIN2026"), "/contratar-plan?cupon=BUENFIN2026");
  assert.equal(enlaceConCupon("/contratar-plan?x=1", "A-1"), "/contratar-plan?x=1&cupon=A-1");
  assert.equal(enlaceConCupon("/cotiza", "BUENFIN2026"), "/cotiza");
  assert.equal(enlaceConCupon("/contratar-plan", null), "/contratar-plan");
  assert.equal(validoHasta("2026-11-30 23:59:00"), "30 de noviembre");
  assert.equal(validoHasta(null), null);
});
