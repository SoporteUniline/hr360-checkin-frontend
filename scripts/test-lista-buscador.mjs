// Pruebas de src/lib/formulario/listaConBuscador.mjs (28/11/2026): el buscador de las listas que vienen de un catálogo
// (persona, jefe, puesto, departamento, lugar de trabajo del contrato). La prueba en navegador está en
// scripts/verify-contratos.mjs.
// Uso: node --test scripts/test-lista-buscador.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
  MAXIMO_SIN_BUSCADOR, normalizar, filtrarOpciones, existeOpcion, etiquetaFueraDeCatalogo, opcionesParaMostrar, puedeOfrecerCrear, moverActiva,
} from "../src/lib/formulario/listaConBuscador.mjs";

const PUESTOS = ["Cajera", "Almacenista", "Jefa de Almacén", "Encargado de sucursal", "Técnico"].map((p) => ({ value: p, label: p }));

test("normaliza sin acentos, mayúsculas ni espacios de más", () => {
  assert.equal(normalizar("  José   ÑÚÑEZ "), "jose nunez");
  assert.equal(normalizar(null), "");
});

test("filtra sin importar acentos ni mayúsculas, y por palabras en cualquier orden", () => {
  assert.deepEqual(filtrarOpciones(PUESTOS, "almacen").map((o) => o.value), ["Almacenista", "Jefa de Almacén"]);
  assert.deepEqual(filtrarOpciones(PUESTOS, "TECNICO").map((o) => o.value), ["Técnico"]);
  assert.deepEqual(filtrarOpciones(PUESTOS, "sucursal encargado").map((o) => o.value), ["Encargado de sucursal"]);
  assert.deepEqual(filtrarOpciones(PUESTOS, "").length, PUESTOS.length, "vacío: todas");
  assert.deepEqual(filtrarOpciones(PUESTOS, "zzz"), []);
});

test("primero las que empiezan con lo escrito", () => {
  const ops = [{ value: 1, label: "Persona Dos Demo" }, { value: 2, label: "Dos Persona Demo" }];
  assert.deepEqual(filtrarOpciones(ops, "dos").map((o) => o.value), [2, 1]);
});

test("busca también en el detalle (p. ej. el puesto de la persona)", () => {
  const ops = [{ value: "15", label: "Persona Uno Demo", detalle: "Cajera" }, { value: "16", label: "Persona Dos Demo", detalle: "Almacenista" }];
  assert.deepEqual(filtrarOpciones(ops, "cajera").map((o) => o.value), ["15"]);
});

test("un valor guardado que ya no está en el catálogo se ve y se conserva", () => {
  const lista = opcionesParaMostrar(PUESTOS, "Vendedorx");
  assert.deepEqual(lista[0], { value: "Vendedorx", label: "Vendedorx (no está en el catálogo)", fueraDeCatalogo: true });
  assert.equal(etiquetaFueraDeCatalogo("Ventas"), "Ventas (no está en el catálogo)");
  assert.equal(opcionesParaMostrar(PUESTOS, "Cajera").length, PUESTOS.length, "si está en el catálogo, no se repite");
  assert.equal(opcionesParaMostrar(PUESTOS, "", { vacia: "Sin jefe directo" })[0].label, "Sin jefe directo");
});

test("«+ Crear» solo con texto, permiso y si no existe ya", () => {
  assert.equal(puedeOfrecerCrear(PUESTOS, "Supervisor", { sePuedeCrear: true }), true);
  assert.equal(puedeOfrecerCrear(PUESTOS, "cajera", { sePuedeCrear: true }), false, "ya existe (sin importar mayúsculas)");
  assert.equal(puedeOfrecerCrear(PUESTOS, "tecnico", { sePuedeCrear: true }), false, "ya existe (sin importar acentos)");
  assert.equal(puedeOfrecerCrear(PUESTOS, "   ", { sePuedeCrear: true }), false);
  assert.equal(puedeOfrecerCrear(PUESTOS, "Supervisor", { sePuedeCrear: false }), false, "sin permiso no se ofrece");
  assert.equal(existeOpcion(PUESTOS, "JEFA DE ALMACEN"), true);
});

test("las flechas mueven la opción activa y dan la vuelta", () => {
  assert.equal(moverActiva(-1, "ArrowDown", 3), 0);
  assert.equal(moverActiva(2, "ArrowDown", 3), 0);
  assert.equal(moverActiva(0, "ArrowUp", 3), 2);
  assert.equal(moverActiva(-1, "ArrowUp", 3), 2);
  assert.equal(moverActiva(1, "Home", 3), 0);
  assert.equal(moverActiva(0, "End", 3), 2);
  assert.equal(moverActiva(0, "ArrowDown", 0), -1);
});

test("listas de 7 opciones o menos sin buscador", () => {
  assert.equal(MAXIMO_SIN_BUSCADOR, 7);
});
