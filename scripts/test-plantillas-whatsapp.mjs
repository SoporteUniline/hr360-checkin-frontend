// Plantillas de WhatsApp (panel del administrador de ADAMIA): reglas de Meta repetidas en pantalla (mismos casos que
// tests/whatsappPlantillas.test.cjs del backend), ejemplos por variable, vista previa, versión nueva, filtro, cuerpo para
// la API y resumen de «Enviar a aprobación las que faltan».
import assert from "node:assert/strict";
import test from "node:test";
import * as P from "../src/lib/whatsapp/plantillasMeta.mjs";

const valida = (extra = {}) => ({
  nombre: "adamia_aviso_prueba", categoria: "UTILITY", idioma: "es_MX",
  cuerpo: "Hola {{1}}, tu trámite en {{2}} está listo. Entra a ADAMIA para verlo.", ejemplos: ["Ana", "Uniline"], pie: "", botones: [], encabezado: null, ...extra,
});
const msg = (f) => P.validar(f).map((e) => e.mensaje).join(" | ");

test("una plantilla válida no tiene errores", () => {
  assert.deepEqual(P.validar(valida({ encabezado: { texto: "Aviso para {{1}}", ejemplo: "Ana" }, botones: [{ tipo: "QUICK_REPLY", texto: "Enterado" }, { tipo: "URL", texto: "Abrir", url: "https://adamia.mx/x/{{1}}", ejemplo: "https://adamia.mx/x/abc" }] })), []);
});

test("nombre en minúsculas_con_guiones_bajos", () => {
  for (const nombre of ["Adamia_Aviso", "adamia-aviso", "1aviso", "aviso nuevo", ""]) assert.equal(P.validar(valida({ nombre }))[0]?.campo, "nombre", nombre);
});

test("variables consecutivas con ejemplo, sin empezar/terminar con variable ni juntas", () => {
  assert.match(msg(valida({ cuerpo: "Hola {{1}}, ve a {{3}} hoy.", ejemplos: ["a", "b"] })), /seguidas y en orden/);
  assert.match(msg(valida({ cuerpo: "Hola {{1}} y {{1}} hoy.", ejemplos: ["a"] })), /una sola vez/);
  assert.match(msg(valida({ cuerpo: "Hola {{nombre}}, listo.", ejemplos: [] })), /no es una variable válida/);
  assert.match(msg(valida({ ejemplos: ["Ana", ""] })), /Ejemplo de \{\{2\}\}: falta/);
  assert.match(msg(valida({ cuerpo: "{{1}}, listo.", ejemplos: ["a"] })), /empiece con una variable/);
  assert.match(msg(valida({ cuerpo: "Listo, {{1}}.", ejemplos: ["a"] })), /termine con una variable/);
  assert.match(msg(valida({ cuerpo: "Hola {{1}}{{2}} listo.", ejemplos: ["a", "b"] })), /juntas/);
  assert.match(msg(valida({ cuerpo: `Hola ${"x".repeat(1100)}`, ejemplos: [] })), /1024/);
});

test("encabezado, pie y botones", () => {
  assert.match(msg(valida({ encabezado: { texto: "Hola 🎉" } })), /emojis/);
  assert.match(msg(valida({ pie: "Hola {{1}}" })), /pie no admite variables/);
  assert.match(msg(valida({ botones: [{ tipo: "QUICK_REPLY", texto: "x".repeat(26) }] })), /pasa de 25/);
  assert.match(msg(valida({ botones: [{ tipo: "URL", texto: "Ir", url: "http://a.mx" }] })), /https/);
  assert.match(msg(valida({ botones: [{ tipo: "PHONE_NUMBER", texto: "Llamar", telefono: "55" }] })), /teléfono inválido/);
  assert.match(msg(valida({ botones: [{ tipo: "QUICK_REPLY", texto: "A" }, { tipo: "URL", texto: "Ir", url: "https://a.mx" }, { tipo: "QUICK_REPLY", texto: "B" }] })), /van juntas/);
});

test("ejemplos siguen al cuerpo, siguiente variable y vista previa", () => {
  assert.deepEqual(P.ajustarEjemplos("Hola {{1}} y {{2}}.", ["Ana"]), ["Ana", ""]);
  assert.deepEqual(P.ajustarEjemplos("Hola.", ["Ana"]), []);
  assert.equal(P.siguienteVariable("Hola {{1}} y {{2}}"), "{{3}}");
  assert.equal(P.siguienteVariable(""), "{{1}}");
  assert.equal(P.llenar("Hola {{1}}, de {{2}}.", ["Ana", ""]), "Hola Ana, de {{2}}.");
});

test("formulario desde una plantilla y versión nueva", () => {
  const p = { nombre: "adamia_x", categoria: "MARKETING", idioma: "es_MX", cuerpo: "Hola {{1}}.", ejemplos: ["Ana"], pie: "", botones: [{ tipo: "QUICK_REPLY", texto: "Ok" }], encabezado: { texto: "[image]", formato: "IMAGE" } };
  const f = P.formularioDesde(p);
  assert.equal(f.nombre, "adamia_x");
  assert.equal(f.encabezado, null, "un encabezado de imagen no pasa al formulario");
  assert.equal(P.formularioDesde(p, { version: true }).nombre, "adamia_x_v2");
  assert.equal(P.siguienteVersion("adamia_x_v2"), "adamia_x_v3");
  f.botones[0].texto = "Cambio";
  assert.equal(p.botones[0].texto, "Ok", "no comparte referencias");
});

test("cuerpo para la API: limpio, un ejemplo por variable y botones según su tipo", () => {
  const api = P.paraApi(valida({ nombre: " adamia_x ", ejemplos: [" Ana ", "Uniline", "sobra"], encabezado: { texto: "Aviso", ejemplo: "x" }, botones: [{ tipo: "URL", texto: "Ir", url: "https://a.mx", ejemplo: "", telefono: "1" }, { tipo: "QUICK_REPLY", texto: "Ok", url: "x" }] }));
  assert.equal(api.nombre, "adamia_x");
  assert.deepEqual(api.ejemplos, ["Ana", "Uniline"]);
  assert.deepEqual(api.encabezado, { texto: "Aviso", ejemplo: "" });
  assert.deepEqual(api.botones, [{ tipo: "URL", texto: "Ir", url: "https://a.mx", ejemplo: "" }, { tipo: "QUICK_REPLY", texto: "Ok" }]);
});

test("filtro por categoría, estado y texto; conteo por estado", () => {
  const lista = [
    { nombre: "adamia_a", categoria: "UTILITY", estado: "aprobada", cuerpo: "Hola encuesta" },
    { nombre: "adamia_b", categoria: "MARKETING", estado: "rechazada", cuerpo: "Feliz cumpleaños" },
    { nombre: "adamia_c", categoria: "UTILITY", estado: "pendiente", cuerpo: "Evaluación" },
  ];
  assert.deepEqual(P.filtrar(lista, { categoria: "UTILITY" }).map((p) => p.nombre), ["adamia_a", "adamia_c"]);
  assert.deepEqual(P.filtrar(lista, { estado: "rechazada" }).map((p) => p.nombre), ["adamia_b"]);
  assert.deepEqual(P.filtrar(lista, { texto: "CUMPLE" }).map((p) => p.nombre), ["adamia_b"]);
  assert.deepEqual(P.conteoEstados(lista), { aprobada: 1, rechazada: 1, pendiente: 1 });
});

test("chips y resumen del envío de faltantes", () => {
  assert.equal(P.chipEstado("pendiente").texto, "En revisión");
  assert.equal(P.chipEstado("raro").texto, "Sin estado");
  assert.equal(P.chipSituacion("falta").texto, "Falta en Zernio");
  assert.equal(P.textoCategoria("MARKETING"), "Marketing");
  assert.equal(P.resumenEnvio({ creadas: [1, 2], ya_existian: [1], difieren: [1], errores: [], sin_cuenta: [] }), "2 enviada(s) a aprobación de Meta · 1 ya existía(n) · 1 difiere(n) (revísalas a mano).");
  assert.equal(P.resumenEnvio({ creadas: [], ya_existian: [], difieren: [], errores: [], sin_cuenta: [] }), "No había nada que enviar.");
  assert.deepEqual(P.faltantes([{ situacion: "falta" }, { situacion: "coincide" }]).length, 1);
  assert.equal(P.errorDe({ response: { data: { error: "Zernio/Meta rechazó la plantilla: x" } } }), "Zernio/Meta rechazó la plantilla: x");
});
