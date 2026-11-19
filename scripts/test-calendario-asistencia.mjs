import assert from "node:assert/strict";
import test from "node:test";
import {
  avisoCalendario, correccionesCalendario, esDomingo, esFestivoSegunCatalogo, indiceFestivos,
} from "../src/lib/asistencia/calendario.mjs";

test("domingo según la fecha (15 nov 2026 es domingo)", () => {
  assert.equal(esDomingo("2026-11-15"), true);
  assert.equal(esDomingo("2026-11-16T06:00:00.000Z"), false);
  assert.equal(esDomingo(null), null);
});

const catalogo = [
  { fecha: "2026-11-16", nombre: "Revolución" },                       // sin unidad: todas
  { fecha: "2026-12-12T00:00:00", nombre: "Virgen", unidad_negocio: "Matriz" },
];

test("festivo según el catálogo, por unidad o general", () => {
  const i = indiceFestivos({ festivos: catalogo });
  assert.equal(esFestivoSegunCatalogo({ fecha: "2026-11-16", unidad_negocio: "Uniline" }, i), true);
  assert.equal(esFestivoSegunCatalogo({ fecha: "2026-12-12", unidad_negocio: "Matriz" }, i), true);
  assert.equal(esFestivoSegunCatalogo({ fecha: "2026-12-12", unidad_negocio: "Uniline" }, i), false);
  assert.equal(esFestivoSegunCatalogo({ fecha: "2026-11-16" }, null), null, "sin catálogo no se decide");
});

test("avisos cuando lo guardado no coincide", () => {
  const i = indiceFestivos(catalogo);
  assert.deepEqual(avisoCalendario({ fecha: "2026-11-16", es_domingo: 1, es_festivo: 0 }, i).map((a) => a.texto), [
    "Marcado como domingo pero no lo es", "Es festivo según el catálogo pero no está marcado",
  ]);
  assert.deepEqual(avisoCalendario({ fecha: "2026-11-17", es_domingo: "0", es_festivo: "1" }, i).map((a) => a.texto), [
    "Marcado como festivo pero no está en el catálogo de Festivos",
  ]);
  assert.deepEqual(avisoCalendario({ fecha: "2026-11-15", es_domingo: true, es_festivo: 0 }, i), []);
});

test("al editar: domingo se corrige; festivo solo se activa, nunca se quita", () => {
  const i = indiceFestivos(catalogo);
  assert.deepEqual(correccionesCalendario({ fecha: "2026-11-16", es_domingo: 1, es_festivo: 0 }, i), { es_domingo: 0, es_festivo: 1 });
  assert.deepEqual(correccionesCalendario({ fecha: "2026-11-17", es_domingo: 0, es_festivo: 1 }, i), {});
  assert.deepEqual(correccionesCalendario({ fecha: "2026-11-15", es_domingo: 0, es_festivo: 0 }, null), { es_domingo: 1 });
});
