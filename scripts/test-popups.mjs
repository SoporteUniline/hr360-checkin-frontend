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

test("lada y celular: México +52 por defecto con 10 dígitos; otros países con su longitud", async () => {
  const { LADAS, LADA_PREDETERMINADA, ladaDe, soloDigitos, celularValido, celularInternacional, datosContactoValidos } = await import("../src/lib/popups/reglas.mjs");
  assert.equal(LADA_PREDETERMINADA, "MX");
  assert.equal(LADAS[0].iso, "MX");
  assert.equal(ladaDe("MX").codigo, "52");
  assert.equal(ladaDe("US").codigo, "1");
  assert.equal(ladaDe("ZZ").iso, "MX", "una lada desconocida vuelve a México");
  assert.equal(new Set(LADAS.map((l) => l.iso)).size, LADAS.length, "sin países repetidos");
  assert.equal(soloDigitos("55 1234-5678"), "5512345678");
  assert.equal(celularValido("MX", "55 1234 5678"), true);
  assert.equal(celularValido("MX", "551234567"), false, "9 dígitos no");
  assert.equal(celularValido("MX", "55123456789"), false, "11 dígitos no");
  assert.equal(celularValido("MX", ""), false);
  assert.equal(celularValido("US", "(212) 555-0199"), true);
  assert.equal(celularValido("ES", "612345678"), true);
  assert.equal(celularValido("ES", "6123456789"), false);
  assert.equal(celularInternacional("MX", "55 1234 5678"), "+525512345678");
  assert.equal(celularInternacional("US", "212-555-0199"), "+12125550199");
  const ok = { nombre: "Ana López", iso: "MX", celular: "5512345678", acepta: true };
  assert.equal(datosContactoValidos(ok), true);
  assert.equal(datosContactoValidos({ ...ok, nombre: " A " }), false, "nombre de al menos 2 letras");
  assert.equal(datosContactoValidos({ ...ok, celular: "55123" }), false);
  assert.equal(datosContactoValidos({ ...ok, acepta: false }), false, "sin aceptar el aviso no se envía");
});

test("mensaje de WhatsApp para el equipo de ventas", async () => {
  const { mensajeContacto, enlaceWhatsApp } = await import("../src/lib/popups/reglas.mjs");
  const m = mensajeContacto({ nombre: "  Ana López ", iso: "MX", celular: "55 1234 5678", titulo: "Conoce ADAMIA", cupon: "BUENFIN26" });
  assert.match(m, /llamada/);
  assert.match(m, /Nombre: Ana López\n/);
  assert.match(m, /Celular: \+52 5512345678/);
  assert.match(m, /Promoción: Conoce ADAMIA \(cupón BUENFIN26\)/);
  assert.doesNotMatch(mensajeContacto({ nombre: "Ana", iso: "MX", celular: "5512345678", titulo: "X" }), /cupón/);
  assert.match(enlaceWhatsApp("hola y adiós"), /^https:\/\/wa\.me\/523171288029\?text=hola%20y%20adi%C3%B3s$/);
});
