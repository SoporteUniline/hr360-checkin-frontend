import assert from "node:assert/strict";
import test from "node:test";
import { resumenSemana, semanaInicial, semanasDelRango } from "../src/lib/asistencia/semanaHoras.mjs";

test("semanas completas del rango (lunes a domingo)", () => {
  assert.deepEqual(semanasDelRango("2027-01-21", "2027-01-21"), [{ inicio: "2027-01-18", fin: "2027-01-24" }]);
  assert.equal(semanasDelRango("2027-01-01", "2027-01-31").length, 5);
  assert.deepEqual(semanaInicial(semanasDelRango("2027-01-01", "2027-01-31"), "2027-01-21"), { inicio: "2027-01-18", fin: "2027-01-24" });
  assert.deepEqual(semanaInicial(semanasDelRango("2026-12-01", "2026-12-31"), "2027-01-21"), { inicio: "2026-12-28", fin: "2027-01-03" });
});

const semana = { inicio: "2027-01-18", fin: "2027-01-24" };
const reporte = (trabajado, porDia = 480) => ({
  ley: { semanas: [{ inicio: "2027-01-18", fin: "2027-01-24", limite: 2760, topeDoble: 540, trabajado, programado: 2400, autorizadas: 60, dobles: 60, triples: 0, porAutorizar: 30, alertas: [] }] },
  dias: ["2027-01-18", "2027-01-19", "2027-01-20", "2027-01-21", "2027-01-22"].map((fecha, i) => ({
    fecha, minutosDia: i < 4 ? trabajado / 4 : 0, ley: { programado: porDia, extraMin: 0, alertas: i === 1 ? ["Más de 4 h extra"] : [] },
  })),
});

test("semana en curso: lo que falta de su horario y si va a pasar de 46 h", () => {
  const r = resumenSemana(reporte(2460), semana, "2027-01-21"); // 41 h, falta el viernes (8 h)
  assert.equal(r.enCurso, true);
  assert.equal(r.restante, 480);
  assert.equal(r.proyeccion, 2940);
  assert.equal(r.nivel, "va-a-pasar");
  assert.deepEqual(r.alertas, ["Más de 4 h extra"]);
  assert.equal(r.dias.length, 7);
});

test("ya se excedió, dentro del límite y semana pasada sin proyección", () => {
  assert.equal(resumenSemana(reporte(2800), semana, "2027-01-21").nivel, "excede");
  assert.equal(resumenSemana(reporte(1920), semana, "2027-01-21").nivel, "ok");
  const pasada = resumenSemana(reporte(2460), semana, "2027-02-10");
  assert.equal(pasada.restante, 0);
  assert.equal(pasada.nivel, "ok");
});

test("duracionCorta y orden de la tabla", async () => {
  const { ordenarFilas } = await import("../src/lib/asistencia/semanaHoras.mjs");
  const { duracionCorta } = await import("../src/lib/asistencia/jornada.mjs");
  assert.equal(duracionCorta(570), "9:30");
  assert.equal(duracionCorta(2805), "46:45");
  assert.equal(duracionCorta(0), "—");
  const f = (nombre, trabajado, alertas = []) => ({ r: { empleado: { nombre_empleado: nombre } }, s: { trabajado, autorizadas: 0, porAutorizar: 0, alertas } });
  const filas = [f("Beto", 100), f("Ana", 300), f("Carla", 100, ["x"])];
  assert.deepEqual(ordenarFilas(filas).map((x) => x.r.empleado.nombre_empleado), ["Ana", "Beto", "Carla"]);
  assert.deepEqual(ordenarFilas(filas, "nombre", "asc").map((x) => x.r.empleado.nombre_empleado), ["Ana", "Beto", "Carla"]);
  assert.deepEqual(ordenarFilas(filas, "alertas", "desc").map((x) => x.r.empleado.nombre_empleado), ["Carla", "Ana", "Beto"]);
});
