import assert from "node:assert/strict";
import test from "node:test";
import { diaSemana, fechaISO, hhmm, horaAMinutos, lunesDe, marcaEnMinutos, minutosAbsolutos, minutosAHora, semanaDe, sinAcentos, sumarDias } from "../src/lib/fechaHora.mjs";
import { faseTurno, salioAntes } from "../src/lib/asistencia/turnosExtra.mjs";
import { duracionCorta, formatearMinutos } from "../src/lib/asistencia/jornada.mjs";

test("fechas de calendario: sin zona horaria, cruzan mes y año, nunca lanzan error", () => {
  assert.equal(fechaISO("2026-11-13 08:00:00"), "2026-11-13");
  assert.equal(fechaISO("13/11/2026"), null);
  assert.equal(sumarDias("2026-11-30", 1), "2026-12-01");
  assert.equal(sumarDias("2026-12-31 23:00:00", 1), "2027-01-01");
  assert.equal(sumarDias("2026-03-01", -1), "2026-02-28");
  assert.equal(sumarDias("x", 1), null);
  assert.equal(sumarDias("2026-11-13", NaN), null);
  assert.equal(diaSemana("2026-11-22"), 0);
  assert.equal(lunesDe("2026-11-22"), "2026-11-16", "domingo pertenece a la semana que empezó el lunes");
  assert.equal(lunesDe("2026-11-16"), "2026-11-16");
  assert.deepEqual(semanaDe("2026-11-19"), { inicio: "2026-11-16", fin: "2026-11-22" });
  assert.equal(lunesDe(null), null);
});

test("horas del día: HH:mm ↔ minutos", () => {
  assert.equal(horaAMinutos("08:30:00"), 510);
  assert.equal(horaAMinutos("8:30"), 510);
  assert.equal(horaAMinutos("24:00"), null);
  assert.equal(horaAMinutos(""), null);
  assert.equal(minutosAHora(510), "08:30");
  assert.equal(minutosAHora(1500), "01:00");
  assert.equal(minutosAHora(-30), "23:30");
  assert.equal(minutosAHora(undefined), null);
  assert.equal(hhmm("8:05:00"), "08:05");
  assert.equal(hhmm(null), null);
  assert.equal(sinAcentos(" Miércoles "), "miercoles");
});

test("duraciones: texto largo y corto", () => {
  assert.equal(formatearMinutos(210), "3 h 30 min");
  assert.equal(duracionCorta(570), "9:30");
  assert.equal(duracionCorta(-45), "−0:45");
  assert.equal(duracionCorta(0), "—");
  assert.equal(duracionCorta(0, { cero: "0:00" }), "0:00");
  assert.equal(duracionCorta(null), "—");
});

test("marcas en minutos: misma escala para «fecha + hora» y «fecha hora»", () => {
  assert.equal(marcaEnMinutos("2026-11-13 08:30:00"), minutosAbsolutos("2026-11-13", "08:30"));
  assert.equal(marcaEnMinutos("2026-11-14 00:00") - marcaEnMinutos("2026-11-13 22:00"), 120);
  assert.equal(marcaEnMinutos("2026-11-13T14:30:00Z"), Date.parse("2026-11-13T14:30:00Z") / 60000);
  assert.equal(marcaEnMinutos(""), null);
  assert.equal(minutosAbsolutos("2026-11-13", ""), null);
  assert.equal(formatearMinutos("540"), "9 h", "números que llegan como texto");
  assert.equal(formatearMinutos(""), "—");
});

test("turnos extra: sin hora de inicio no se toma como medianoche", () => {
  const ayer = { salida_anterior: "2026-11-12 23:00:00" };
  assert.equal(salioAntes(ayer, "2026-11-13", ""), false);
  assert.equal(salioAntes(ayer, "2026-11-13", "06:00"), true);
  assert.equal(faseTurno({ fecha: "2026-11-13", hora_inicio: null, hora_fin: "18:00" }, minutosAbsolutos("2026-11-13", "12:00")), "programado");
  assert.equal(faseTurno({ fecha: "2026-11-13", hora_inicio: "10:00", hora_fin: "18:00" }, minutosAbsolutos("2026-11-13", "12:00")), "en_curso");
});
