import assert from "node:assert/strict";
import test from "node:test";
import { planComida, planHora, planHorasExtra, planNota, planTipo } from "../src/lib/asistencia/masivo.mjs";

const F = "2026-11-18";
const base = (o = {}) => ({
  id: 1, fecha: F, nombre: "Ana", apellido_paterno: "Torres", id_tipo_permiso: 14, tipo_registro_nombre: "Asistencia",
  hora_entrada_programada: "08:00:00", hora_salida_programada: "17:00:00",
  hora_salida_comida_programada: "13:00:00", hora_regreso_comida_programada: "14:00:00",
  entrada: `${F} 08:02:00`, salida: `${F} 17:05:00`, notas: null, hrs_extra: 0, ...o,
});
const auto = base({ id: 2, nombre: "Iván", salida: `${F} 23:59:00`, notas: "Salida cerrada automáticamente por el sistema" });
const noche = base({ id: 3, nombre: "Luis", hora_entrada_programada: "22:00:00", hora_salida_programada: "06:00:00",
  hora_salida_comida_programada: null, hora_regreso_comida_programada: null, entrada: `${F} 22:01:00`, salida: `2026-11-19 06:02:00` });
const sinHorario = base({ id: 4, nombre: "Sin", hora_entrada_programada: null, hora_salida_programada: null });

test("corregir salida a la del horario: cierres automáticos, nocturno y sin horario", () => {
  const p = planHora([auto, noche, sinHorario, base({ id: 5, salida: `${F} 17:00:00` })], { campo: "salida", modo: "horario" });
  assert.deepEqual(p.aplicar.map((a) => [a.registro.id, a.cambios.salida, a.antes, a.despues]), [
    [2, `${F} 17:00:00`, "Salida 23:59", "Salida 17:00 (horario)"],
    [3, "2026-11-19 06:00:00", "Salida 06:02", "Salida 06:00 (horario)"],
  ]);
  assert.deepEqual(p.omitir.map((o) => [o.registro.id, o.motivo]), [[4, "no tiene horario ese día"], [5, "ya tiene salida 17:00"]]);
});

test("otra hora: nocturno pasa al día siguiente; no deja salida antes de la entrada; valida la hora", () => {
  const p = planHora([noche, auto], { campo: "salida", modo: "otra", hora: "05:30" });
  assert.equal(p.aplicar[0].cambios.salida, "2026-11-19 05:30:00");
  assert.deepEqual(p.omitir.map((o) => o.motivo), []);
  assert.equal(p.aplicar[1].cambios.salida, `2026-11-19 05:30:00`); // 05:30 < 08:02 → día siguiente
  const e = planHora([auto], { campo: "entrada", modo: "otra", hora: "23:59" });
  assert.match(e.omitir[0].motivo, /antes de la entrada/);
  assert.ok(planHora([auto], { modo: "otra", hora: "25:00" }).error);
});

test("entrada del horario y zona del empleado (Tijuana)", () => {
  const p = planHora([base({ entrada: `${F} 08:15:00` })], { campo: "entrada", modo: "horario" });
  assert.equal(p.aplicar[0].cambios.entrada, `${F} 08:00:00`);
  const tj = planHora([base({ entrada: `${F} 10:05:00`, salida: `${F} 19:30:00` })], { campo: "salida", modo: "horario", zonaDe: () => "America/Tijuana" });
  assert.equal(tj.aplicar[0].cambios.salida, `${F} 19:00:00`); // 17:00 Tijuana = 19:00 CDMX
  assert.equal(tj.aplicar[0].antes, "Salida 17:30");
});

test("tipo de registro: asistió y goce según el tipo, nota se agrega, omite si ya lo es", () => {
  const falta = { id: 3, nombre: "Falta injustificada", cuenta_como_asistencia: 0, goce_sueldo: 0 };
  const p = planTipo([auto, base({ id: 9, id_tipo_permiso: 3 })], { tipo: falta, nota: "paro de línea" });
  assert.deepEqual(p.aplicar[0].cambios, { id_tipo_permiso: 3, asistencia: 0, goce_sueldo: 0, notas: "Salida cerrada automáticamente por el sistema · paro de línea" });
  assert.equal(p.aplicar[0].despues, "Falta injustificada · «paro de línea»");
  assert.equal(p.omitir[0].motivo, "ya es Falta injustificada");
  assert.ok(planTipo([auto], {}).error);
});

test("comida: solo a quien no checó salida a comer y dentro de su jornada", () => {
  const sinComida = base({ id: 6, tramos_checadas: [{ entrada: `${F} 08:02:00`, salida: `${F} 17:05:00` }], minutos_trabajados_checadas: 543, minutos_descanso_checadas: 0 });
  const conComida = base({ id: 7, tramos_checadas: [{ entrada: `${F} 08:02:00`, salida: `${F} 13:00:00` }, { entrada: `${F} 14:00:00`, salida: `${F} 17:05:00` }], minutos_trabajados_checadas: 483, minutos_descanso_checadas: 60 });
  const p = planComida([sinComida, conComida, noche], { modo: "horario" });
  assert.deepEqual(p.aplicar.map((a) => [a.registro.id, a.comida]), [[6, { salida_comida: `${F} 13:00:00`, regreso_comida: `${F} 14:00:00` }]]);
  assert.deepEqual(p.omitir.map((o) => o.registro.id), [7, 3]);
  assert.match(p.omitir[1].motivo, /no tiene comida/);
  const otra = planComida([sinComida], { modo: "otra", de: "18:00", a: "18:30" });
  assert.match(otra.omitir[0].motivo, /fuera de su jornada/);
  assert.ok(planComida([sinComida], { modo: "otra", de: "14:00", a: "13:30" }).error);
});

test("observación: agregar al final o reemplazar; no duplica", () => {
  const p = planNota([auto, base()], { texto: "Corte de luz" });
  assert.deepEqual(p.aplicar.map((a) => a.cambios.notas), ["Salida cerrada automáticamente por el sistema · Corte de luz", "Corte de luz"]);
  const r = planNota([auto], { texto: "Corte de luz", modo: "reemplazar" });
  assert.equal(r.aplicar[0].cambios.notas, "Corte de luz");
  assert.equal(planNota([base({ notas: "Corte de luz" })], { texto: "Corte de luz" }).omitir.length, 1);
  assert.ok(planNota([auto], { texto: "  " }).error);
});

test("horas extra: solo pendientes; autorizar o no autorizar (salida al horario)", () => {
  const extra = base({ id: 8, salida: `${F} 18:42:00` });
  // Sin tiempo de más: 08:02–16:05 son 8 h 3 min de 8 h programadas (comida de 13 a 14 en su horario).
  const p = planHorasExtra([extra, base({ salida: `${F} 16:05:00` }), base({ id: 10, salida: `${F} 19:00:00`, hrs_extra: 1 })], { decision: "autorizar", forma: "Tiempo por tiempo", idAutorizador: 7 });
  assert.deepEqual(p.aplicar.map((a) => a.registro.id), [8]);
  assert.deepEqual(p.aplicar[0].cambios, { hrs_extra: 1, forma_pago_extras: "Tiempo por tiempo", extras_autorizadas_por: 7 });
  assert.equal(p.omitir.length, 2);
  const no = planHorasExtra([extra], { decision: "no", quien: "Laura Gómez" });
  assert.equal(no.aplicar[0].cambios.salida, `${F} 17:00:00`);
  assert.match(no.aplicar[0].cambios.notas_hrs_extra, /No autorizadas por Laura Gómez · salida del reloj 2026-11-18 18:42/);
});

test("entrada y salida juntas; sin entrada no se manda solo la salida", () => {
  const vacio = base({ id: 20, entrada: null, salida: null });
  const soloSalida = planHora([vacio], { campo: "salida", modo: "horario" });
  assert.equal(soloSalida.omitir[0].motivo, "no tiene entrada: usa «Entrada y salida»");
  const ambas = planHora([vacio, auto, noche], { campo: "ambas", modo: "horario" });
  assert.deepEqual(ambas.aplicar.map((a) => [a.registro.id, a.cambios, a.despues]), [
    [20, { entrada: `${F} 08:00:00`, salida: `${F} 17:00:00` }, "08:00 – 17:00 (horario)"],
    [2, { entrada: `${F} 08:00:00`, salida: `${F} 17:00:00` }, "08:00 – 17:00 (horario)"],
    [3, { entrada: `${F} 22:00:00`, salida: "2026-11-19 06:00:00" }, "22:00 – 06:00 (horario)"],
  ]);
  assert.equal(ambas.aplicar[0].antes, "— – —");
  const otra = planHora([vacio], { campo: "ambas", modo: "otra", horaEntrada: "22:00", horaSalida: "06:00" });
  assert.deepEqual(otra.aplicar[0].cambios, { entrada: `${F} 22:00:00`, salida: "2026-11-19 06:00:00" });
  assert.ok(planHora([vacio], { campo: "ambas", modo: "otra", horaEntrada: "08:00" }).error);
  const igual = planHora([base({ entrada: `${F} 08:00:00`, salida: `${F} 17:00:00` })], { campo: "ambas", modo: "horario" });
  assert.equal(igual.omitir[0].motivo, "ya tiene esa entrada y salida");
});
