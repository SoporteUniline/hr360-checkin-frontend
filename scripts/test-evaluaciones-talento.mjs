// Reglas de pantalla de talento (src/lib/evaluaciones/talento.mjs) y pestañas por alcance (vistas.mjs).
// Permisos, dinero y aislamiento se prueban en el backend (tests/desempenoTalentoBd.test.cjs).
import test from "node:test";
import assert from "node:assert/strict";
import {
  periodosDe, mesesParaAvance, nombreMes, estadoObjetivos, cajas, rangoFila, scoreSugerido, pesos, problemasReglas, textoVisibilidad,
} from "../src/lib/evaluaciones/talento.mjs";
import { vistasVisibles, SCOPE_DE_RUTA } from "../src/lib/evaluaciones/vistas.mjs";

test("periodos y meses para registrar avance (no futuros, dentro del periodo)", () => {
  assert.deepEqual(periodosDe(2026).map((p) => p.value), ["2026", "2026-S1", "2026-S2", "2026-T1", "2026-T2", "2026-T3", "2026-T4"]);
  assert.deepEqual(mesesParaAvance("2026-01-01", "2026-06-30", "2026-03-15"), ["2026-03", "2026-02", "2026-01"]);
  assert.deepEqual(mesesParaAvance("2026-11-01", "2027-02-28", "2027-05-01"), ["2027-02", "2027-01", "2026-12", "2026-11"]);
  assert.deepEqual(mesesParaAvance("2027-01-01", "2027-12-31", "2026-12-01"), []);
  assert.equal(nombreMes("2026-09"), "septiembre 2026");
});

test("estado del juego de objetivos: mínimo 3, máximo 5, pesos 100", () => {
  assert.match(estadoObjetivos([]).texto, /de 3 a 5/);
  assert.match(estadoObjetivos([{ weight: 50, status: "borrador" }]).texto, /Agrega 2 objetivos/);
  const tres = [40, 30, 30].map((weight) => ({ weight, status: "borrador" }));
  assert.equal(estadoObjetivos(tres).ready, true);
  assert.match(estadoObjetivos(tres).texto, /jefe los apruebe/);
  assert.match(estadoObjetivos([...tres, { weight: 10, status: "borrador" }]).texto, /suman 110/);
  const cinco = [20, 20, 20, 20, 20].map((weight) => ({ weight, status: "aprobado" }));
  assert.equal(estadoObjetivos(cinco).canAdd, false);
  assert.equal(estadoObjetivos([...cinco, { weight: 5, status: "cancelado" }]).texto, "Aprobados.");
});

test("9-box: cada persona en su casilla y las que no tienen potencial aparte", () => {
  const { boxes, unplaced } = cajas([
    { employeeId: 1, performanceLevel: 3, potentialLevel: 3 },
    { employeeId: 2, performanceLevel: 1, potentialLevel: 2 },
    { employeeId: 3, performanceLevel: 2, potentialLevel: null },
  ]);
  assert.equal(boxes.length, 9);
  assert.equal(boxes[0].key, "3-1", "arriba a la izquierda: desempeño alto, potencial bajo");
  assert.equal(boxes.find((b) => b.key === "3-3").people[0].employeeId, 1);
  assert.equal(boxes.find((b) => b.key === "1-2").name, "Dilema");
  assert.deepEqual(unplaced.map((e) => e.employeeId), [3]);
});

test("calificación sugerida al mover de fila: queda dentro del rango del servidor", () => {
  const cuts = { low: 3, high: 4 };
  assert.deepEqual(rangoFila(1, cuts), { min: 1, max: 2.99 });
  assert.deepEqual(rangoFila(3, cuts), { min: 4, max: 5 });
  assert.equal(scoreSugerido(3.5, 3, cuts), 4);
  assert.equal(scoreSugerido(3.5, 1, cuts), 2.99);
  assert.equal(scoreSugerido(3.5, 2, cuts), 3.5);
});

test("reglas del bono: encimadas, porcentaje y nombre", () => {
  assert.deepEqual(problemasReglas([{ name: "A", min: 4, max: 5, type: "porcentaje", value: 10 }, { name: "B", min: 3, max: 3.99, type: "fijo", value: 1000 }]), []);
  assert.match(problemasReglas([{ name: "A", min: 3, max: 4.5, type: "fijo", value: 1 }, { name: "B", min: 4.5, max: 5, type: "fijo", value: 1 }]).join(), /se enciman/);
  assert.match(problemasReglas([{ name: "", min: 4, max: 5, type: "porcentaje", value: 120 }]).join(), /nombre.*porcentaje/);
  assert.match(pesos(1500), /1,500\.00/);
});

test("pestañas de talento según lo que permite el servidor", () => {
  const rh = { flags: { canViewCampaigns: true }, scopes: ["campaigns", "templates", "settings", "objectives", "feedback", "calibration", "bonus"] };
  assert.deepEqual(vistasVisibles(rh).map((v) => v.path), ["campanas", "plantillas", "objetivos", "calibracion", "reconocimientos", "configuracion"]);
  const jefe = { flags: {}, scopes: ["assignments", "team", "results", "objectives", "oneonones", "feedback"] };
  assert.deepEqual(vistasVisibles(jefe).map((v) => v.path), ["mis-pendientes", "equipo", "mis-evaluaciones", "objetivos", "uno-a-uno", "reconocimientos"]);
  const designado = { ...jefe, scopes: [...jefe.scopes, "calibration"] };
  assert.ok(vistasVisibles(designado).some((v) => v.path === "calibracion"));
  assert.equal(SCOPE_DE_RUTA["uno-a-uno"], "oneonones");
  assert.equal(textoVisibilidad("jefe"), "Solo su jefe");
});
