import { test } from "node:test";
import assert from "node:assert/strict";
import { clasificarEnVivo, aMinutos, relativo } from "../src/lib/asistencia/enVivo.mjs";

const h = (t) => aMinutos(t);
const base = { entradaProg: h("09:00"), salidaProg: h("17:00"), entrada: null, salida: null, descanso: false, llegaHasta: null };
const ids = (g, k) => g[k].map((x) => x.id);

test("a las 8:30: por entrar, más tarde, descanso; a las 9:10: va tarde", () => {
  const filas = [
    { ...base, id: "ana" },
    { ...base, id: "beto", entradaProg: h("11:00"), salidaProg: h("19:00") },
    { ...base, id: "carla", descanso: true },
    { ...base, id: "dani", entradaProg: null, salidaProg: null },
  ];
  const g = clasificarEnVivo(filas, h("08:30"));
  assert.deepEqual([ids(g, "porEntrar"), ids(g, "masTarde"), ids(g, "descanso")], [["ana"], ["beto"], ["carla", "dani"]]);
  assert.equal(g.porEntrar[0].faltan, 30);
  const g2 = clasificarEnVivo(filas, h("09:10"));
  assert.deepEqual(ids(g2, "tarde"), ["ana"]);
  assert.equal(relativo(g2.tarde[0].faltan), "hace 10 min");
});

test("permiso de llegar tarde: no va tarde antes de su hora de permiso", () => {
  const g = clasificarEnVivo([{ ...base, id: "ana", llegaHasta: h("11:00") }], h("10:00"));
  assert.deepEqual(ids(g, "porEntrar"), ["ana"]);
});

test("en jornada, por salir, debía salir y ya salió", () => {
  const filas = [
    { ...base, id: "ana", entrada: h("08:58") },
    { ...base, id: "beto", entrada: h("09:00"), salidaProg: h("16:00") },
    { ...base, id: "carla", entrada: h("07:00"), salidaProg: h("15:00") },
    { ...base, id: "dani", entrada: h("09:00"), salida: h("14:00") },
  ];
  const g = clasificarEnVivo(filas, h("15:30"));
  assert.deepEqual([ids(g, "enJornada"), ids(g, "porSalir"), ids(g, "debioSalir"), ids(g, "salieron")], [["ana"], ["beto"], ["carla"], ["dani"]]);
  assert.equal(relativo(g.porSalir[0].faltan), "en 30 min");
  assert.equal(relativo(g.enJornada[0].faltan), "en 1 h 30 min");
});

test("no vino: ya pasó su salida sin checar", () => {
  const g = clasificarEnVivo([{ ...base, id: "ana" }], h("17:30"));
  assert.deepEqual(ids(g, "noVino"), ["ana"]);
});

test("turno nocturno 22:00 → 06:00", () => {
  const noche = { ...base, id: "nora", entradaProg: h("22:00"), salidaProg: h("06:00") };
  assert.deepEqual(ids(clasificarEnVivo([noche], h("21:30")), "porEntrar"), ["nora"]);
  assert.deepEqual(ids(clasificarEnVivo([{ ...noche, entrada: h("21:55") }], h("23:00")), "enJornada"), ["nora"]);
  assert.deepEqual(ids(clasificarEnVivo([{ ...noche, entrada: h("21:55") }], h("05:20")), "porSalir"), ["nora"], "de madrugada cuenta como el día siguiente");
});
