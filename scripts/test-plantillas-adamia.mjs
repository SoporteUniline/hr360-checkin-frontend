import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ACUSE_POLITICAS, crearHtmlAcusePoliticas, empresasDocumentales,
  prepararPlantillaPoliticas, guardarCopiaPoliticas, validarAcusePoliticas,
} from "../src/lib/plantillasAdamia.js";

const datos = {
  lugar: "Sucursal Centro, Jalisco",
  medio: "Copia impresa entregada al empleado",
  contacto: "Recursos Humanos · rh@example.test",
  politicas: [{ nombre: "Política de asistencia", version: "v2 · 01/10/2026", referencia: "Manual de personal, páginas 3–8" }],
};

test("el acuse identifica documentos y versiones sin renunciar a derechos", () => {
  const html = crearHtmlAcusePoliticas(datos);
  assert.match(html, /Política de asistencia/);
  assert.match(html, /v2 · 01\/10\/2026/);
  assert.match(html, /no implica renuncia a derechos/);
  assert.match(html, /no sustituye su formación, depósito/);
  assert.match(html, /actualizaciones deberán comunicarse por separado/);
  assert.match(html, /No es un formato oficial/);
  assert.equal(ACUSE_POLITICAS.version, "1.0");
});

test("campos libres no inyectan HTML ni variables de otro empleado", () => {
  const html = crearHtmlAcusePoliticas({ ...datos, lugar: '<img src=x onerror="alert(1)">{{empleado.salario}}' });
  assert.doesNotMatch(html, /<img|onerror="|\{\{empleado.salario\}\}/);
  assert.match(html, /&lt;img/);
  assert.match(html, /&#123;/);
});

test("impide guardar documentos sin identificación suficiente", () => {
  assert.ok(validarAcusePoliticas({ ...datos, politicas: [] }));
  for (const campo of ["nombre", "version", "referencia"]) {
    assert.ok(validarAcusePoliticas({ ...datos, politicas: [{ ...datos.politicas[0], [campo]: "  " }] }));
  }
  assert.equal(validarAcusePoliticas(datos), "");
});

test("solo muestra empresas asignadas y nunca admite all como empresa de escritura", async () => {
  assert.deepEqual(empresasDocumentales({ empresas: [1, "all", 2], id_empresa: 1, empresas_detalle: [{ id_empresa: 99, nombre: "Ajena" }] }).map((e) => e.id), ["1", "2"]);
  await assert.rejects(prepararPlantillaPoliticas("all", datos));
  await assert.rejects(prepararPlantillaPoliticas("0", datos));
});

test("identificador estable por contenido y distinto para cada empresa/versión", async () => {
  const a = await prepararPlantillaPoliticas(1, datos);
  const b = await prepararPlantillaPoliticas(1, datos);
  const c = await prepararPlantillaPoliticas(2, datos);
  const d = await prepararPlantillaPoliticas(1, { ...datos, politicas: [{ ...datos.politicas[0], version: "v3" }] });
  assert.equal(a.codigo, b.codigo);
  assert.notEqual(a.codigo, c.codigo);
  assert.notEqual(a.codigo, d.codigo);
  assert.deepEqual(a.variables.split(", ").sort(), ["empresa.nombre", "fecha.completa", "empleado.nombre", "empleado.codigo", "empleado.puesto", "empleado.departamento"].sort());
});

function fakeApi({ timeout = false } = {}) {
  const docs = [];
  let creates = 0;
  return {
    docs, get creates() { return creates; },
    async listar({ empresa, search }) { return { data: docs.filter((d) => String(d.id_empresa) === String(empresa) && d.codigo === search) }; },
    async getById(id) { return docs.find((d) => d.id_plantilla === id); },
    async crear({ empresa }, payload) {
      creates++;
      docs.push({ ...payload, id_empresa: empresa, id_plantilla: docs.length + 1, activo: 1 });
      if (timeout) throw new Error("Timeout después de guardar");
    },
  };
}

test("doble uso y reintento no crean otra copia cuando ya se confirmó la misma", async () => {
  const api = fakeApi();
  const payload = await prepararPlantillaPoliticas(1, datos);
  const first = await guardarCopiaPoliticas(api, 1, payload);
  const second = await guardarCopiaPoliticas(api, 1, payload);
  assert.equal(first.id_plantilla, second.id_plantilla);
  assert.equal(api.creates, 1);
});

test("recupera el guardado tras timeout sin volver a insertar", async () => {
  const api = fakeApi({ timeout: true });
  const result = await guardarCopiaPoliticas(api, 1, await prepararPlantillaPoliticas(1, datos));
  assert.equal(result.id_plantilla, 1);
  assert.equal(api.creates, 1);
});

test("no sobrescribe una plantilla modificada o de otra empresa", async () => {
  const api = fakeApi();
  const payload = await prepararPlantillaPoliticas(1, datos);
  await guardarCopiaPoliticas(api, 1, payload);
  api.docs[0].contenido_html = "Personalización del cliente";
  await assert.rejects(guardarCopiaPoliticas(api, 1, payload), /modificada/);
  assert.equal(api.creates, 1);
  const apiAjena = { listar: async () => ({ data: [{ codigo: payload.codigo, id_plantilla: 9 }] }), getById: async () => ({ id_empresa: 2 }) };
  await assert.rejects(guardarCopiaPoliticas(apiAjena, 1, payload), /no pertenece/);
});
