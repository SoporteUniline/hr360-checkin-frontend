// Pruebas de src/lib/cambiosPendientes.mjs (23/11/2026): cuándo la ficha del empleado tiene cambios sin guardar y qué
// enlaces detiene la guardia de salida.
import test from "node:test";
import assert from "node:assert/strict";
import {
  camposCambiados,
  copiarValores,
  debeDetenerEnlace,
  decidirTrasGuardar,
  esVacio,
  hayCambiosPendientes,
  rutaInterna,
  valoresIguales,
} from "../src/lib/cambiosPendientes.mjs";

test("vacío es vacío venga como venga", () => {
  for (const v of [null, undefined, "", "sin-seleccion", [], {}, { a: "", b: null }]) assert.equal(esVacio(v), true, JSON.stringify(v));
  for (const v of [0, false, " ", "a", [1], { a: 1 }]) assert.equal(esVacio(v), false, JSON.stringify(v));
  assert.ok(valoresIguales(null, ""));
  assert.ok(valoresIguales(undefined, "sin-seleccion"));
  assert.ok(valoresIguales([], null));
  assert.ok(!valoresIguales("", "Juan"));
  assert.ok(!valoresIguales(0, ""), "0 no es vacío: es un dato");
});

test("normalizaciones de carga no cuentan como cambio: números, fechas", () => {
  assert.ok(valoresIguales(8, "8"));
  assert.ok(valoresIguales(12000, "12000.00"));
  assert.ok(valoresIguales("2024-01-15T00:00:00.000Z", "2024-01-15"));
  assert.ok(valoresIguales("2024-01-15T00:00:00Z", "2024-01-15"));
  assert.ok(!valoresIguales("2024-01-15", "2024-01-16"));
  assert.ok(!valoresIguales("0123", "123"), "dos textos se comparan tal cual (NIP)");
  assert.ok(!valoresIguales(8, "8a"));
  assert.ok(valoresIguales(true, true) && !valoresIguales(true, false) && !valoresIguales(false, "false"));
});

test("listas y objetos por contenido", () => {
  assert.ok(valoresIguales([1, 2], ["1", "2"].map(Number)));
  assert.ok(!valoresIguales([1, 2], [2, 1]), "el orden importa (horarios por día)");
  assert.ok(valoresIguales({ lat: 1, lng: 2 }, { lng: 2, lat: 1 }));
  assert.ok(valoresIguales({ a: 1, b: "" }, { a: 1 }), "clave vacía = clave ausente");
  assert.ok(!valoresIguales({ a: 1 }, { a: 2 }));
  assert.ok(!valoresIguales({ a: 1 }, [1]));
  const horarios = [{ dia: "Lunes", entrada: "09:00", salida: "18:00" }];
  assert.ok(valoresIguales(horarios, copiarValores(horarios)));
  assert.ok(!valoresIguales(horarios, [{ ...horarios[0], salida: "17:00" }]));
});

test("camposCambiados y hayCambiosPendientes", () => {
  const base = { nombre: "Ana", sueldo: 12000, horarios: [{ dia: "Lunes", entrada: "09:00" }], hrs_por_dia: "8.00", descriptor_facial: [] };
  const igual = { nombre: "Ana", sueldo: "12000", horarios: [{ dia: "Lunes", entrada: "09:00" }], hrs_por_dia: 8, descriptor_facial: [] };
  assert.deepEqual(camposCambiados(base, igual), []);
  assert.equal(hayCambiosPendientes({ base, actual: igual }), false, "abrir la ficha no marca cambios");
  const cambiado = { ...igual, nombre: "Ana María", hrs_por_dia: 9, descriptor_facial: [0.1] };
  assert.deepEqual(camposCambiados(base, cambiado), ["descriptor_facial", "hrs_por_dia", "nombre"]);
  const ignorar = ["hrs_por_dia", "descriptor_facial"];
  assert.deepEqual(camposCambiados(base, cambiado, ignorar), ["nombre"]);
  assert.equal(hayCambiosPendientes({ base, actual: { ...igual, hrs_por_dia: 9 }, ignorar }), false, "campos derivados no cuentan");
  assert.equal(hayCambiosPendientes({ base, actual: igual, ignorar, extras: [null, false] }), false);
  assert.equal(hayCambiosPendientes({ base, actual: igual, ignorar, extras: [false, true] }), true, "rostro o foto nueva cuentan");
  // Regresar el valor original deja la ficha sin cambios.
  assert.equal(hayCambiosPendientes({ base, actual: { ...cambiado, nombre: "Ana" }, ignorar }), false);
  // Campo nuevo con valor = cambio; campo nuevo vacío = no.
  assert.equal(hayCambiosPendientes({ base, actual: { ...igual, rfc: "XAXX010101000" } }), true);
  assert.equal(hayCambiosPendientes({ base, actual: { ...igual, rfc: "" } }), false);
});

test("copiarValores no comparte referencias", () => {
  const original = { a: [{ b: 1 }], c: { d: "x" } };
  const copia = copiarValores(original);
  copia.a[0].b = 2;
  copia.c.d = "y";
  assert.deepEqual(original, { a: [{ b: 1 }], c: { d: "x" } });
});

test("qué enlaces detiene la guardia", () => {
  const comun = { origen: "https://app.adamia.mx", actual: "https://app.adamia.mx/panel/empleados" };
  assert.equal(debeDetenerEnlace({ ...comun, href: "/panel/nomina" }), true);
  assert.equal(debeDetenerEnlace({ ...comun, href: "https://app.adamia.mx/panel/nomina?x=1" }), true);
  assert.equal(debeDetenerEnlace({ ...comun, href: "/panel/empleados?id=5" }), true, "otra ficha de la misma pantalla también");
  assert.equal(debeDetenerEnlace({ ...comun, href: "https://otro.mx/x" }), false, "otro origen");
  assert.equal(debeDetenerEnlace({ ...comun, href: "mailto:a@b.mx" }), false);
  assert.equal(debeDetenerEnlace({ ...comun, href: "tel:5555555555" }), false);
  assert.equal(debeDetenerEnlace({ ...comun, href: "blob:https://app.adamia.mx/abc" }), false);
  assert.equal(debeDetenerEnlace({ ...comun, href: "#seccion" }), false, "ancla de la misma página");
  assert.equal(debeDetenerEnlace({ ...comun, href: "/panel/nomina", target: "_blank" }), false);
  assert.equal(debeDetenerEnlace({ ...comun, href: "/panel/nomina", target: "_self" }), true);
  assert.equal(debeDetenerEnlace({ ...comun, href: "/doc.pdf", descarga: true }), false);
  assert.equal(debeDetenerEnlace({ ...comun, href: "/panel/nomina", boton: 1 }), false, "rueda = otra pestaña");
  for (const t of ["meta", "ctrl", "shift", "alt"]) assert.equal(debeDetenerEnlace({ ...comun, href: "/panel/nomina", teclas: { [t]: true } }), false, t);
  assert.equal(debeDetenerEnlace({ ...comun, href: "" }), false);
  assert.equal(debeDetenerEnlace({ ...comun, href: "/x", actual: "no es url" }), false);
});

test("rutaInterna y decisión tras guardar", () => {
  assert.equal(rutaInterna("https://app.adamia.mx/panel/nomina?a=1#b", "https://app.adamia.mx/panel"), "/panel/nomina?a=1#b");
  assert.equal(rutaInterna("/panel/x", "https://app.adamia.mx/panel"), "/panel/x");
  assert.equal(decidirTrasGuardar(true), "salir");
  assert.equal(decidirTrasGuardar(false), "quedarse", "si falla la validación o el servidor, se queda");
  assert.equal(decidirTrasGuardar(undefined), "quedarse");
});
