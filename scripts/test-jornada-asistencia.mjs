import assert from "node:assert/strict";
import test from "node:test";
import { horaAMinutos, sumarDias } from "../src/lib/fechaHora.mjs";
import {
  formatearMinutos, minutosDescanso, minutosProgramados, minutosTrabajados,
  resumenJornada, salidaEsDiaSiguiente, sinSalidaAComer, hayComidaChecada, puedeAgregarComida,
} from "../src/lib/asistencia/jornada.mjs";

const reg = (o) => ({
  hora_entrada_programada: "08:00:00", hora_salida_programada: "17:00:00",
  entrada: "2026-11-13 08:00:00", salida: "2026-11-13 17:00:00", hrs_comida: 1, ...o,
});

// Horario 08:00–17:00 con comida 13:00–14:00 (no se paga): programado 8 h.
const comida = { hora_salida_comida_programada: "13:00:00", hora_regreso_comida_programada: "14:00:00" };
const tramos = (lista) => ({
  tramos_checadas: lista.map(([entrada, salida]) => ({ entrada, salida })),
  minutos_trabajados_checadas: lista.reduce((t, [e, s]) => t + (Date.parse(s.replace(" ", "T") + "Z") - Date.parse(e.replace(" ", "T") + "Z")) / 60000, 0),
  minutos_descanso_checadas: lista.length > 1
    ? lista.slice(1).reduce((t, [e], i) => t + (Date.parse(e.replace(" ", "T") + "Z") - Date.parse(lista[i][1].replace(" ", "T") + "Z")) / 60000, 0)
    : 0,
});

test("programado = horario − comida del horario", () => {
  assert.equal(minutosProgramados(reg({ ...comida, hrs_comida: null })), 480);
  // Sin comida en el horario se usa hrs_comida de la asistencia.
  assert.equal(minutosProgramados(reg({})), 480);
});

test("trabajado = suma de tramos; el hueco es descanso (9–11 y 11:30–14 → 4 h 30 min)", () => {
  const r = { ...reg(comida), entrada: "2026-11-13 09:00:00", salida: "2026-11-13 14:00:00",
    ...tramos([["2026-11-13 09:00:00", "2026-11-13 11:00:00"], ["2026-11-13 11:30:00", "2026-11-13 14:00:00"]]) };
  assert.equal(minutosTrabajados(r), 270);
  assert.equal(minutosDescanso(r), 30);
  assert.equal(sinSalidaAComer(r), false);
});

test("no marcó salida a comer: no se descuenta nada y se marca la alerta", () => {
  const r = { ...reg(comida), ...tramos([["2026-11-13 08:00:00", "2026-11-13 17:00:00"]]) };
  const j = resumenJornada(r);
  assert.equal(j.minutosTrabajados, 540);
  assert.equal(j.minutosDiferencia, 60);
  assert.equal(sinSalidaAComer(r), true);
  // Sin comida en el horario no hay alerta.
  assert.equal(sinSalidaAComer({ ...r, hora_salida_comida_programada: null }), false);
});

test("si la entrada o salida se editaron y ya no coinciden con los tramos, se usa salida − entrada", () => {
  const r = { ...reg(comida), salida: "2026-11-13 18:00:00", ...tramos([["2026-11-13 08:00:00", "2026-11-13 17:00:00"]]) };
  assert.equal(minutosTrabajados(r), 600);
  assert.equal(sinSalidaAComer(r), false);
  assert.equal(minutosDescanso(r), null);
});

test("sin tramos del backend: salida − entrada sin descontar comida (08:07–17:20 = 9 h 13 min)", () => {
  const r = resumenJornada(reg({ entrada: "2026-11-13 08:07:00", salida: "2026-11-13 17:20:00" }));
  assert.equal(r.minutosTrabajados, 553);
  assert.equal(r.minutosDiferencia, 73);
  assert.equal(formatearMinutos(r.minutosDiferencia, { signo: true }), "+1 h 13 min");
});

test("turno nocturno 22:00 → 05:00 da 7 h, nunca negativo", () => {
  const base = { hora_entrada_programada: "22:00", hora_salida_programada: "05:00", hrs_comida: 0 };
  assert.equal(minutosProgramados(base), 420);
  assert.equal(minutosTrabajados({ ...base, entrada: "2026-11-13 22:00:00", salida: "2026-11-14 05:00:00" }), 420);
});

test("registro viejo con la salida nocturna guardada en el mismo día se interpreta como día siguiente", () => {
  assert.equal(minutosTrabajados({ entrada: "2026-11-13 22:00:00", salida: "2026-11-13 05:00:00", hrs_comida: 0 }), 420);
});

test("sin salida o sin entrada no se inventan horas ni diferencia", () => {
  for (const o of [{ salida: null }, { entrada: null }, { salida: "" }]) {
    const r = resumenJornada(reg(o));
    assert.equal(r.minutosTrabajados, null);
    assert.equal(r.minutosDiferencia, null);
  }
});

test("sin horario programado: se muestran trabajadas, no diferencia", () => {
  const r = resumenJornada(reg({ hora_entrada_programada: null }));
  assert.equal(r.minutosProgramados, null);
  assert.equal(r.minutosTrabajados, 540);
  assert.equal(r.minutosDiferencia, null);
  assert.equal(r.jornada, "-");
});

test("sin comida capturada no se descuenta nada", () => {
  const r = resumenJornada(reg({ hrs_comida: 0 }));
  assert.equal(r.minutosProgramados, 540);
  assert.equal(r.minutosTrabajados, 540);
});

test("un día corto no se vuelve negativo por la comida", () => {
  assert.equal(minutosTrabajados(reg({ entrada: "2026-11-13 08:00:00", salida: "2026-11-13 08:30:00" })), 30);
});

test("acepta fechas ISO con zona (como las serializa MySQL)", () => {
  assert.equal(minutosTrabajados({ entrada: "2026-11-13T14:00:00.000Z", salida: "2026-11-13T23:30:00.000Z", hrs_comida: 0.5 }), 570);
});

test("formato legible en horas y minutos, sin decimales", () => {
  assert.equal(formatearMinutos(510), "8 h 30 min");
  assert.equal(formatearMinutos(480), "8 h");
  assert.equal(formatearMinutos(45), "45 min");
  assert.equal(formatearMinutos(0), "0 min");
  assert.equal(formatearMinutos(-10), "−10 min");
  assert.equal(formatearMinutos(-95, { signo: true }), "−1 h 35 min");
  assert.equal(formatearMinutos(0, { signo: true }), "0 min");
  assert.equal(formatearMinutos(null), "—");
});

test("captura nocturna: salida menor o igual a la entrada cae al día siguiente", () => {
  assert.equal(salidaEsDiaSiguiente("22:00", "05:00"), true);
  assert.equal(salidaEsDiaSiguiente("08:00", "17:00"), false);
  assert.equal(salidaEsDiaSiguiente("08:00", "08:00"), true);
  assert.equal(sumarDias("2026-12-31", 1), "2027-01-01");
  assert.equal(sumarDias("2026-11-13T00:00:00", 1), "2026-11-14");
  assert.equal(horaAMinutos("25:00"), null);
});

test("en comida (o ya regresó de comer) no sale «No marcó salida a comer»", () => {
  // Alondra: entró, checó salida a comer a las 11:34 y sigue comiendo → un solo tramo, pero sí marcó su comida.
  const r = { ...reg(comida), salida: "2026-11-13 11:34:00", ...tramos([["2026-11-13 08:00:00", "2026-11-13 11:34:00"]]) };
  assert.equal(sinSalidaAComer(r), true, "sin dato de comida, un tramo sigue alertando");
  assert.equal(sinSalidaAComer({ ...r, comida_checada: { salida: "2026-11-13 11:34:00", regreso: null, minutos: null } }), false);
  assert.equal(sinSalidaAComer({ ...r, comida_checada: { salida: "2026-11-13 11:34:00", regreso: "2026-11-13 12:30:00", minutos: 56 } }), false);
});

test("agregar comida: solo sin comida y sin una pausa real dentro de su comida", () => {
  const unTramo = { ...reg(comida), ...tramos([["2026-11-13 08:00:00", "2026-11-13 17:00:00"]]) };
  assert.equal(puedeAgregarComida(unTramo), true);
  assert.equal(puedeAgregarComida({ ...unTramo, salida: null }), false, "sin salida no se ofrece");
  const checada = { ...unTramo, comida_checada: { salida: "2026-11-13 13:00:00", regreso: "2026-11-13 13:30:00" } };
  assert.equal(hayComidaChecada(checada), true);
  assert.equal(puedeAgregarComida(checada), false, "comida checada en el reloj");
  assert.equal(puedeAgregarComida({ ...checada, comida_checada: { ...checada.comida_checada, manual: true } }), false, "comida manual");
  // Caso real: salió 11:03 y regresó 11:25 sin marcarlo; su comida es 11:00–11:30.
  const alondra = { ...reg({ hora_salida_comida_programada: "11:00:00", hora_regreso_comida_programada: "11:30:00" }),
    ...tramos([["2026-11-13 09:18:00", "2026-11-13 11:03:00"], ["2026-11-13 11:25:00", "2026-11-13 16:08:00"]]) };
  assert.equal(puedeAgregarComida(alondra), false);
  // Una pausa fuera de su comida (15:00–15:20) no cuenta.
  const banco = { ...reg(comida), ...tramos([["2026-11-13 08:00:00", "2026-11-13 15:00:00"], ["2026-11-13 15:20:00", "2026-11-13 17:00:00"]]) };
  assert.equal(puedeAgregarComida(banco), true);
  assert.equal(puedeAgregarComida({ ...banco, hora_salida_comida_programada: null }), false, "sin comida en el horario, cualquier pausa");
});
