import { test } from "node:test";
import assert from "node:assert/strict";
import { DOMParser } from "@xmldom/xmldom";
import {
  FORMATOS_PUESTO,
  baseParaPuesto,
  codigoDocumentoPuesto,
  crearDocumentoPuesto,
  guardarDocumentoPuesto,
  limpiarDocumentoPuesto,
  perteneceDocumentoPuesto,
  seccionPuesto,
} from "../src/lib/documentos/puestos.js";

class Parser {
  parseFromString(html) {
    return new DOMParser().parseFromString(
      `<html><body>${html}</body></html>`,
      "text/html"
    );
  }
}
const puesto = { id_puesto: 8, nombre_puesto: "Community Manager" };
const empresa = {
  nombre: "Empresa de prueba",
  logo: "https://example.test/logo.png",
};
const codigo = codigoDocumentoPuesto(1, 8, "perfil");
const payload = {
  codigo,
  nombre: "Perfil",
  categoria: "RRHH",
  contenido_html: "<p>Contenido inicial</p>",
};

test("conserva los campos de los tres formatos y presenta su contenido en tablas", () => {
  const required = {
    perfil: [
      "Puesto",
      "Plazas",
      "Área",
      "Supervisor",
      "Sexo",
      "Edad",
      "Estado civil",
      "Jornada laboral",
      "Días de trabajo",
      "Horario",
      "Misión del puesto",
      "Objetivos del puesto",
      "Formación académica",
      "Programas especializados requeridos",
      "Conocimientos sobre ofimática",
      "Idiomas",
      "Experiencia",
      "Habilidades",
      "Esfuerzos",
      "Condiciones",
    ],
    descripcion: [
      "Nombre del puesto",
      "Jefe inmediato",
      "Áreas a su cargo",
      "No. de personas a su cargo",
      "Puestos que le reportan",
      "Misión",
      "Funciones del puesto",
      "Relaciones internas",
      "Relaciones externas",
      "Decisiones que puede tomar",
      "Reportes que elabora",
      "Periodicidad",
      "Destino",
    ],
    actividades: [
      "Puesto",
      "Hora de inicio",
      "Hora de término",
      "Inicio del turno",
      "Medio turno",
      "Término del turno",
    ],
  };
  for (const formato of FORMATOS_PUESTO) {
    const html = crearDocumentoPuesto(formato.id, puesto, empresa);
    for (const field of required[formato.id])
      assert.ok(html.includes(field), `${formato.id}: ${field}`);
    assert.match(html, /<table/);
    assert.match(html, /Community Manager/);
    assert.match(html, /example.test\/logo.png/);
    assert.doesNotMatch(html, /<style|<script/);
    assert.equal(
      limpiarDocumentoPuesto(limpiarDocumentoPuesto(html, Parser), Parser),
      limpiarDocumentoPuesto(html, Parser)
    );
  }
});

test("usa contenido distinto para finanzas, tecnología y operación sin inventar horarios", () => {
  assert.match(baseParaPuesto("Administrador financiero").mision, /financiera/);
  assert.match(baseParaPuesto("Desarrollador web").mision, /tecnológicas/);
  assert.match(baseParaPuesto("Operador de almacén").mision, /operativas/);
  assert.match(
    crearDocumentoPuesto("perfil", puesto, empresa),
    /Por confirmar con la empresa/
  );
});

test("recupera texto y tablas de los borradores anteriores", () => {
  const html = crearDocumentoPuesto("descripcion", puesto, empresa, {
    mision: "Misión redactada por el usuario",
    funciones: [
      {
        Función: "Atender mensajes",
        "Resultado esperado": "Seguimiento completo",
      },
    ],
    reportes: [
      {
        Nombre: "Reporte propio",
        Periodicidad: "Diaria",
        Destino: "Dirección",
      },
    ],
    indicadores: [{ Indicador: "Respuestas", Meta: "Meta propia" }],
  });
  for (const text of [
    "Misión redactada por el usuario",
    "Atender mensajes",
    "Seguimiento completo",
    "Reporte propio",
    "Meta propia",
  ])
    assert.ok(html.includes(text));
});

test("elimina scripts, estilos globales, eventos y URLs ejecutables conservando formato", () => {
  const dirty =
    '<style>body{display:none}</style><script>alert(1)</script><section class="puesto-section otra" onclick="attack()"><h3>Título</h3><table><tbody><tr><td style="text-align: center; position:fixed; background:url(https://evil.test)"><strong>Texto</strong><u>Subrayado</u></td></tr></tbody></table><img src="javascript:alert(1)"/><iframe src="https://evil.test"></iframe></section>';
  const html = limpiarDocumentoPuesto(dirty, Parser);
  assert.doesNotMatch(
    html,
    /script|style>|onclick|javascript|iframe|position|evil.test|otra/
  );
  assert.match(html, /text-align: center/);
  assert.match(html, /<strong>Texto<\/strong>/);
  assert.match(html, /<u>Subrayado<\/u>/);
  assert.match(html, /puesto-section/);
  assert.doesNotMatch(
    crearDocumentoPuesto(
      "perfil",
      { ...puesto, nombre_puesto: '<img src="x" onerror="attack()">' },
      { nombre: "<script>alert(1)</script>", logo: "javascript:attack()" }
    ),
    /<script|src="javascript|onerror="/
  );
  assert.match(seccionPuesto("<script>", [["<img>"]]), /&lt;script&gt;/);
});

function apiDoble({ createTimeout = false } = {}) {
  const docs = [];
  let writes = 0;
  return {
    docs,
    get writes() {
      return writes;
    },
    async listar({ empresa, search }) {
      return {
        data: docs.filter(
          (d) => String(d.id_empresa) === String(empresa) && d.codigo === search
        ),
      };
    },
    async getById(id) {
      return structuredClone(docs.find((d) => d.id_plantilla === id));
    },
    async crear({ empresa }, data) {
      writes++;
      docs.push({
        ...data,
        id_empresa: empresa,
        id_plantilla: docs.length + 1,
      });
      if (createTimeout) throw new Error("timeout");
    },
    async actualizar(id, data) {
      writes++;
      Object.assign(
        docs.find((d) => d.id_plantilla === id),
        data
      );
    },
  };
}

test("asocia el código a empresa y puesto y rechaza empresas diferentes", async () => {
  assert.notEqual(codigo, codigoDocumentoPuesto(2, 8, "perfil"));
  assert.notEqual(codigo, codigoDocumentoPuesto(1, 9, "perfil"));
  assert.throws(() => codigoDocumentoPuesto("all", 8, "perfil"));
  const api = apiDoble();
  await assert.rejects(guardarDocumentoPuesto(api, 2, payload), /empresa/);
  assert.equal(api.writes, 0);
  assert.equal(
    perteneceDocumentoPuesto({ codigo, id_empresa: 2 }, 1, codigo),
    false
  );
  const hostile = {
    async listar() {
      return { data: [{ codigo, id_plantilla: 9 }] };
    },
    async getById() {
      return { codigo, id_empresa: 2 };
    },
  };
  await assert.rejects(guardarDocumentoPuesto(hostile, 1, payload), /empresa/);
});

test("crea, confirma, reabre y actualiza una copia con la API existente", async () => {
  const api = apiDoble();
  const created = await guardarDocumentoPuesto(api, 1, payload);
  assert.equal(created.id_empresa, 1);
  const updated = await guardarDocumentoPuesto(
    api,
    1,
    { ...payload, contenido_html: "<p>Versión adaptada</p>" },
    created
  );
  assert.equal(updated.contenido_html, "<p>Versión adaptada</p>");
  assert.equal(api.docs.length, 1);
  assert.equal(api.writes, 2);
});

test("no duplica documentos si crear se confirma después de un timeout", async () => {
  const api = apiDoble({ createTimeout: true });
  const saved = await guardarDocumentoPuesto(api, 1, payload);
  await guardarDocumentoPuesto(api, 1, payload);
  assert.equal(saved.contenido_html, payload.contenido_html);
  assert.equal(api.writes, 1);
});

test("detecta cambios concurrentes antes de sobrescribir la versión de otra persona", async () => {
  const api = apiDoble();
  const previous = await guardarDocumentoPuesto(api, 1, payload);
  api.docs[0].contenido_html = "<p>Otra persona ya cambió el documento</p>";
  await assert.rejects(
    guardarDocumentoPuesto(
      api,
      1,
      { ...payload, contenido_html: "<p>Mi edición</p>" },
      previous
    ),
    /versión nueva/
  );
  assert.equal(api.writes, 1);
});
