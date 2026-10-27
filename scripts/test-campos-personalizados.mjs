import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCampos, camposVisibles, columnasCampos, opcionesCampo, coincideCampos, camposEnPestana, registroColumnasCampos } from "../src/lib/camposPersonalizados.mjs";
test("lee valores JSON, objetos y empleados anteriores sin campos", () => {
  assert.deepEqual(parseCampos(null), {});
  assert.deepEqual(parseCampos('{"cuadrilla":"A"}'), {
    cuadrilla: "A"
  });
  assert.deepEqual(parseCampos({
    cuadrilla: "B"
  }), {
    cuadrilla: "B"
  });
  for (const value of ["{", "null", "[]", "1"]) assert.deepEqual(parseCampos(value), {});
});
test("visibilidad independiente por ubicación, activación y empresa", () => {
  const fields = [{
    id: "a",
    id_empresa: 1,
    activo: true,
    formulario: true,
    filtros: false,
    listado: true
  }, {
    id: "b",
    id_empresa: 2,
    activo: true,
    formulario: false,
    filtros: true,
    listado: true
  }, {
    id: "c",
    id_empresa: 1,
    activo: false,
    formulario: true,
    filtros: true,
    listado: true
  }];
  assert.deepEqual(camposVisibles(fields, "formulario").map(f => f.id), ["a"]);
  assert.deepEqual(camposVisibles(fields, "filtros").map(f => f.id), ["b"]);
  assert.deepEqual(camposVisibles(fields, "listado", "1").map(f => f.id), ["a"]);
});

test("filtros de encabezado combinan opciones y tipos sobre todos los empleados", () => {
  const fields = [{ id: "n", id_empresa: 1, tipo: "numero", opciones: [], activo: true, listado: true, filtros: true }, { id: "t", id_empresa: 1, tipo: "texto", opciones: [], activo: true, listado: false, filtros: true }];
  const employees = [{ id_empresa: 1, campos_personalizados: { n: "0", t: "Uno" } }, { id_empresa: 1, campos_personalizados: { n: "10", t: "Dos" } }, { id_empresa: 2, campos_personalizados: { n: "99" } }];
  assert.deepEqual(opcionesCampo(fields[0], employees), ["0", "10"]);
  assert.deepEqual(opcionesCampo(fields[1], employees), ["Dos", "Uno"]);
  assert.equal(columnasCampos(fields).length, 2);
  assert.equal(coincideCampos(employees[0], { n: ["0", "10"], t: ["Uno"] }), true);
  assert.equal(coincideCampos(employees[1], { n: ["0", "10"], t: ["Uno"] }), false);
  assert.equal(coincideCampos(employees[0], {}), true);
});

test("distribuye los campos por pestaña y mantiene laborales para campos antiguos", () => {
  const fields = [
    { id: "a", activo: true, formulario: true },
    { id: "b", activo: true, formulario: true, pestana: "personales" },
    { id: "c", activo: false, formulario: true, pestana: "personales" },
    { id: "d", activo: true, formulario: false, pestana: "nomina" },
  ];
  assert.deepEqual(camposEnPestana(fields, "laborales").map(f => f.id), ["a"]);
  assert.deepEqual(camposEnPestana(fields, "personales").map(f => f.id), ["b"]);
  assert.deepEqual(camposEnPestana(fields, "nomina"), []);
});
test("todas las columnas activas están disponibles sin depender de listado", () => {
  const registry = registroColumnasCampos([{ id: "a", nombre: "Uno", activo: true, listado: false, filtros: false }, { id: "b", nombre: "Dos", activo: false, listado: true }]);
  assert.deepEqual(registry, [{ key: "campo:a", label: "Uno", extra: true }]);
});
test("los desplegables respetan el orden configurado y añaden históricos al final", () => {
  const field = { id: "a", id_empresa: 1, tipo: "seleccion", opciones: ["C", "A", "B"] };
  const employees = [{ id_empresa: 1, campos_personalizados: { a: "Anterior" } }];
  assert.deepEqual(opcionesCampo(field, employees), ["C", "A", "B", "Anterior"]);
});
