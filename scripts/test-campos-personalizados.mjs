import { test } from "node:test";
import assert from "node:assert/strict";
import { camposEnPosicion, posicionesCampo, vistaOrdenCampo } from "../src/lib/camposPersonalizados.mjs";
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

test("ubica después del campo elegido y ordena sin mezclar pestañas ni campos ocultos", () => {
  const base = { activo: true, formulario: true, pestana: "personales", despues_de: "nombre" };
  const fields = [
    { ...base, id: "segundo", orden: 2 },
    { ...base, id: "primero", orden: 1 },
    { ...base, id: "oculto", activo: false },
    { ...base, id: "filtro", formulario: false },
    { ...base, id: "otra", pestana: "nomina" },
    { ...base, id: "correo", despues_de: "correo" },
  ];
  assert.deepEqual(camposEnPosicion(fields, "personales", "nombre").map(f => f.id), ["primero", "segundo"]);
  assert.deepEqual(camposEnPosicion(fields, "personales", "correo").map(f => f.id), ["correo"]);
  assert.deepEqual(fields.slice(0, 2).map(f => f.id), ["segundo", "primero"]);
});

test("campos antiguos o con referencia retirada siguen visibles al final", () => {
  const fields = [
    { id: "antiguo", activo: true, formulario: true },
    { id: "retirado", activo: true, formulario: true, despues_de: "ya_no_existe" },
  ];
  assert.deepEqual(camposEnPosicion(fields, "laborales", "fin").map(f => f.id), ["antiguo", "retirado"]);
  assert.ok(posicionesCampo("personales").some(p => p.value === "nombre"));
  assert.ok(!posicionesCampo("nomina").some(p => p.value === "nombre"));
});

test("la vista previa conserva el orden y permite subir o bajar sin números", () => {
  const base = { activo: true, formulario: true, id_empresa: 5, pestana: "personales", despues_de: "nombre" };
  const fields = [{ ...base, id: "a", nombre: "A", orden: 0 }, { ...base, id: "b", nombre: "B", orden: 1 }, { ...base, id: "c", nombre: "C", orden: 2 }];
  const draft = { ...base, nombre: "B editado" };
  assert.deepEqual(vistaOrdenCampo(fields, draft, "b").map(f => f.id), ["a", "b", "c"]);
  assert.deepEqual(vistaOrdenCampo(fields, draft, "b", "a").map(f => f.id), ["b", "a", "c"]);
  assert.deepEqual(vistaOrdenCampo(fields, draft, "b", null).map(f => f.id), ["a", "c", "b"]);
  assert.deepEqual(vistaOrdenCampo(fields, draft, null).map(f => f.id), ["a", "b", "c", "__actual__"]);
  assert.deepEqual(vistaOrdenCampo(fields, { ...draft, despues_de: "correo" }, "b").map(f => f.id), ["b"]);
  assert.deepEqual(vistaOrdenCampo(fields, { ...draft, id_empresa: 9 }, null).map(f => f.id), ["__actual__"]);
});
