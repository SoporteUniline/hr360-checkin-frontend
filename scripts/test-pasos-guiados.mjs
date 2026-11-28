// Pruebas del sistema de diseño de formularios (28/11/2026): pasos guiados (src/lib/formulario/pasosGuiados.mjs) y la
// unión de clases con los tokens (src/lib/unirClases.mjs, lo que usa cn()).
// Uso: node --test scripts/test-pasos-guiados.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { avancePasos, estadoDePaso, pasosConEstado, vecinosDePaso, TEXTO_ESTADO } from "../src/lib/formulario/pasosGuiados.mjs";
import { unirClases, TOKENS_LETRA, TOKENS_RADIO, TOKENS_TAMANO } from "../src/lib/unirClases.mjs";
import { readFileSync } from "node:fs";

const PASOS = [
  { clave: "persona", texto: "Persona y puesto" },
  { clave: "sueldo", texto: "Sueldo y pago" },
  { clave: "jornada", texto: "Jornada y horario" },
  { clave: "prestaciones", texto: "Prestaciones" },
  { clave: "documento", texto: "Documento" },
];

test("avance: «Paso 2 de 5» es 40 % (como el mockup) y el último es 100 %", () => {
  assert.deepEqual(avancePasos(PASOS, "sueldo"), { numero: 2, total: 5, porcentaje: 40, texto: "Paso 2 de 5", titulo: "Sueldo y pago" });
  assert.equal(avancePasos(PASOS, "persona").porcentaje, 20);
  assert.equal(avancePasos(PASOS, "documento").porcentaje, 100);
});

test("avance: clave desconocida toma el primer paso; sin pasos no truena", () => {
  assert.equal(avancePasos(PASOS, "no-existe").numero, 1);
  assert.deepEqual(avancePasos([], "x"), { numero: 0, total: 0, porcentaje: 0, texto: "", titulo: "" });
  assert.equal(avancePasos([{ clave: "a", texto: "A" }, { clave: "b", texto: "B" }, { clave: "c", texto: "C" }], "a").porcentaje, 33);
});

test("estado: el actual gana a los errores; con errores «error»; visitado «listo»; si no, «pendiente»", () => {
  assert.equal(estadoDePaso({ clave: "sueldo", actual: "sueldo", errores: 2 }), "actual");
  assert.equal(estadoDePaso({ clave: "sueldo", actual: "persona", errores: 1, visitados: ["sueldo"] }), "error");
  assert.equal(estadoDePaso({ clave: "persona", actual: "sueldo", visitados: ["persona"] }), "listo");
  assert.equal(estadoDePaso({ clave: "jornada", actual: "sueldo", visitados: ["persona"] }), "pendiente");
  assert.equal(estadoDePaso({ clave: "jornada", actual: "sueldo", todosListos: true }), "listo", "al editar, todo lo guardado ya está listo");
});

test("pasosConEstado numera desde 1 y cuenta los errores por paso", () => {
  const r = pasosConEstado(PASOS, { actual: "sueldo", visitados: ["persona"], errores: { documento: 2 } });
  assert.deepEqual(r.map((p) => [p.numero, p.estado, p.errores]), [[1, "listo", 0], [2, "actual", 0], [3, "pendiente", 0], [4, "pendiente", 0], [5, "error", 2]]);
  assert.equal(TEXTO_ESTADO[r[1].estado], "Estás aquí");
});

test("vecinos: anterior y siguiente, null en los extremos", () => {
  assert.deepEqual(vecinosDePaso(PASOS, "persona"), { anterior: null, siguiente: "sueldo" });
  assert.deepEqual(vecinosDePaso(PASOS, "jornada"), { anterior: "sueldo", siguiente: "prestaciones" });
  assert.deepEqual(vecinosDePaso(PASOS, "documento"), { anterior: "prestaciones", siguiente: null });
});

test("cn(): los tokens del sistema le ganan a las clases de fábrica y no se confunden con colores", () => {
  assert.equal(unirClases("h-9 h-boton"), "h-boton");
  assert.equal(unirClases("h-boton h-8"), "h-8", "el className de quien usa el botón sigue mandando");
  assert.equal(unirClases("text-white text-boton"), "text-white text-boton", "text-boton es letra, no color: no borra text-white");
  assert.equal(unirClases("text-sm text-campo"), "text-campo");
  assert.equal(unirClases("rounded-md rounded-boton"), "rounded-boton");
  assert.equal(unirClases("size-9 size-icono"), "size-icono");
  assert.equal(unirClases("bg-primary bg-brand"), "bg-brand");
});

test("cada token registrado en cn() existe en globals.css (@theme) y al revés", () => {
  const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
  // Sin las sub-propiedades de Tailwind 4 (p. ej. --text-titulo-pagina--letter-spacing): no son un token aparte.
  const definidos = (prefijo) => [...css.matchAll(new RegExp(`--${prefijo}-([a-z]+(?:-[a-z]+)*):\\s*var\\(--adamia-`, "g"))].map((m) => m[1]).sort();
  assert.deepEqual(definidos("spacing"), [...TOKENS_TAMANO].sort());
  assert.deepEqual(definidos("text"), [...TOKENS_LETRA].sort());
  assert.deepEqual(definidos("radius"), [...TOKENS_RADIO].sort());
});
