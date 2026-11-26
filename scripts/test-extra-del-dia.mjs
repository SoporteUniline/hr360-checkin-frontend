// Horas extra con la jornada diaria (aprobado por el dueño, 26/11/2026): «si es de 8 y tengo 10, son 2 extras».
// - src/lib/asistencia/extraDelDia.mjs: espejo exacto de la regla del servidor (services/horasExtraDia.js, mismos casos
//   en tests/horasExtraDia.test.cjs del backend).
// - Columna «Horas extra» (escritorio: extraFila) y móvil / tarjetas / Control (estadoHorasExtra): usan lo que manda el
//   servidor; sin esos campos, la misma regla aquí.
// - Reloj del día: cálculo en vivo y «Separar antes de la entrada».
import assert from "node:assert/strict";
import test from "node:test";
import { UMBRAL_EXTRA_MIN, extraDelDia } from "../src/lib/asistencia/extraDelDia.mjs";
import { UMBRAL_MINUTOS, estadoHorasExtra, resumenHorasExtra, ordenarPorHorasExtra } from "../src/lib/asistencia/horasExtra.mjs";
import { desdeApi, editado, errorDe, extraFila, resumen, separarExtra, separarExtraAntes, conAutoriza, resumenServidor } from "../src/lib/asistencia/relojDia.mjs";

const F = "2026-11-25";
const Z = "America/Mexico_City";
// Jornada de 8 h: 9:00 a 6:00 p.m. con comida de 2 a 3.
const horario = { entrada: "09:00", salida: "18:00", salida_comida: "14:00", regreso_comida: "15:00" };
const api = (id, entrada, salida, o = {}) => ({ id, entrada: entrada && `${F} ${entrada}:00`, salida: salida && `${F} ${salida}:00`,
  entrada_reloj: entrada && `${F} ${entrada}:00`, salida_reloj: salida && `${F} ${salida}:00`, concepto: "jornada", motivo: null,
  origen: "reloj", anulado: false, id_autoriza: null, autoriza_no: false, ...o });
const cargar = (lista) => desdeApi(lista, { fecha: F, zona: Z });
const real = () => cargar([api(1, "06:42", "14:00"), api(2, "14:00", "14:22", { concepto: "comida" }), api(3, "14:22", "18:02")]);

// Fila de GET /checador/asistencias tal como la manda el servidor (caso real del 25/11/2026).
const filaServidor = (o = {}) => ({
  id: 8, fecha: F, hora_entrada_programada: "09:00:00", hora_salida_programada: "18:00:00",
  hora_salida_comida_programada: "14:00:00", hora_regreso_comida_programada: "15:00:00",
  entrada: `${F} 06:42:00`, salida: `${F} 18:02:00`, hrs_extra: 0, horas_extra_registradas: [],
  minutos_trabajados: 658, minutos_programados: 480, minutos_extra: 0, minutos_extra_por_autorizar: 178,
  minutos_extra_detectadas: 178, minutos_extra_no_autorizadas: 0, minutos_extra_reposicion: 0, estado_extra: "pendiente", ...o,
});

test("un solo umbral de 30 min en todo el frontend (igual al servidor)", () => {
  assert.equal(UMBRAL_EXTRA_MIN, 30);
  assert.equal(UMBRAL_MINUTOS, UMBRAL_EXTRA_MIN);
});

test("regla espejo del servidor: mismos casos que tests/horasExtraDia.test.cjs", () => {
  assert.deepEqual(extraDelDia({ trabajados: 658, programados: 480 }),
    { detectadas: 178, autorizadas: 0, reposicion: 0, noAutorizadas: 0, porAutorizar: 178, estado: "pendiente" });
  assert.equal(extraDelDia({ trabajados: 480, programados: 480 }).porAutorizar, 0, "entró y salió 1 h tarde");
  assert.deepEqual([extraDelDia({ trabajados: 500, programados: 480 }).porAutorizar, extraDelDia({ trabajados: 500, programados: 480 }).estado], [0, "sin"]);
  assert.equal(extraDelDia({ trabajados: 240, programados: null }).porAutorizar, 240, "descanso");
  assert.equal(extraDelDia({ trabajados: 240, programados: null, conHorarioOtrosDias: false }).porAutorizar, 0, "sin ningún horario");
  assert.deepEqual([extraDelDia({ trabajados: 660, programados: 480, relojAutorizadas: 60 }).porAutorizar,
    extraDelDia({ trabajados: 660, programados: 480, relojAutorizadas: 60, relojNoAutorizadas: 120 }).porAutorizar], [120, 0]);
  assert.equal(extraDelDia({ trabajados: 658, programados: 480, hrsExtra: 1 }).autorizadas, 178, "autorización del día completo");
  assert.equal(extraDelDia({ trabajados: 658, programados: 480, notas: "No autorizadas por Laura" }).noAutorizadas, 178);
  assert.equal(extraDelDia({ trabajados: 658, programados: 480, registradas: [{ minutos: 60, forma_pago: "Pago de horas extras" }], hrsExtra: 1 })
    .porAutorizar, 118, "con registradas el día completo no tapa el resto");
});

test("columna «Horas extra» (escritorio): caso real → «2 h 58 min por autorizar», no «—»", () => {
  assert.deepEqual(extraFila(filaServidor()), { tipo: "pendiente", texto: "2 h 58 min por autorizar" });
  assert.deepEqual(extraFila(filaServidor({ minutos_extra_por_autorizar: 0, minutos_extra_detectadas: 20, estado_extra: "sin" })),
    { tipo: "nada", texto: "—" }, "20 min de más: —");
  assert.deepEqual(extraFila(filaServidor({ minutos_extra: 138, minutos_extra_por_autorizar: 40 })).texto, "40 min por autorizar");
});

test("móvil, tarjetas, orden y Control usan lo mismo que la columna (lo del servidor)", () => {
  const info = estadoHorasExtra(filaServidor());
  assert.deepEqual([info.estado, info.minutos, info.servidor], ["pendiente", 178, true]);
  // El servidor manda aunque el cálculo local diera otra cosa (p. ej. sin tramos).
  assert.equal(estadoHorasExtra(filaServidor({ minutos_extra_por_autorizar: 0, minutos_extra: 178, estado_extra: "autorizada" })).estado, "autorizada");
  const no = estadoHorasExtra(filaServidor({ minutos_extra_por_autorizar: 0, minutos_extra_no_autorizadas: 178, estado_extra: "no_autorizada",
    notas_hrs_extra: "No autorizadas por Laura · salida del reloj 2026-11-25 18:02" }));
  assert.deepEqual([no.estado, no.minutos, no.salidaReloj], ["no_autorizada", 178, `${F} 18:02:00`]);
  const tarde = filaServidor({ minutos_extra_por_autorizar: 0, minutos_extra_detectadas: 0, estado_extra: "sin" });
  assert.equal(estadoHorasExtra(tarde).estado, "sin");
  assert.deepEqual(resumenHorasExtra([filaServidor(), tarde]), { total: 1, pendientes: 1, autorizadas: 0, noAutorizadas: 0, reposiciones: 0 });
  assert.deepEqual(ordenarPorHorasExtra([tarde, filaServidor()]).map((r) => r.estado_extra), ["pendiente", "sin"]);
});

test("sin campos del servidor: la misma regla diaria (llegar temprano cuenta; tarde/tarde se compensa)", () => {
  const sinServidor = { fecha: F, hora_entrada_programada: "09:00:00", hora_salida_programada: "18:00:00",
    hora_salida_comida_programada: "14:00:00", hora_regreso_comida_programada: "15:00:00", hrs_extra: 0,
    entrada: `${F} 06:42:00`, salida: `${F} 18:02:00`, minutos_trabajados_checadas: 658,
    tramos_checadas: [{ entrada: `${F} 06:42:00`, salida: `${F} 14:00:00` }, { entrada: `${F} 14:22:00`, salida: `${F} 18:02:00` }] };
  assert.deepEqual(estadoHorasExtra(sinServidor), { estado: "pendiente", minutos: 178 });
  const tarde = { ...sinServidor, entrada: `${F} 10:00:00`, salida: `${F} 19:00:00`, minutos_trabajados_checadas: 480,
    tramos_checadas: [{ entrada: `${F} 10:00:00`, salida: `${F} 14:00:00` }, { entrada: `${F} 15:00:00`, salida: `${F} 19:00:00` }] };
  assert.equal(estadoHorasExtra(tarde).estado, "sin");
  // Con horas extra registradas (1 h): el resto (1 h 58) queda por autorizar, no «autorizadas» del todo.
  const parcial = { ...sinServidor, horas_extra_registradas: [{ minutos: 60, forma_pago: "Pago de horas extras" }], hrs_extra: 1 };
  assert.deepEqual(estadoHorasExtra(parcial), { estado: "pendiente", minutos: 118, registradas: true });
});

test("reloj en vivo: caso real 2 h 58 por autorizar y «Separar 2 h 18 antes de las 9:00 a.m.»", () => {
  const c = resumen(real(), horario);
  assert.deepEqual([c.trabajadas, c.programadas, c.extraPorAutorizar, c.extraAutorizada, c.sinSeparar, c.sinSepararAntes],
    [658, 480, 178, 0, 0, 138]);
  const sep = separarExtraAntes(real(), horario);
  const extra = sep.find((r) => r.concepto === "extra");
  assert.deepEqual([sep[0].ini, sep[0].fin, extra.ini, extra.fin], [540, 840, 402, 540]);
  assert.equal(editado(sep[0]), false, "separar no pide motivo");
  assert.equal(editado(extra), false);
  assert.equal(errorDe(extra, sep, horario), "Hora extra: falta quién autoriza.");
  const aut = sep.map((r) => (r.concepto === "extra" ? { ...r, ...conAutoriza("16") } : r));
  const d = resumen(aut, horario);
  assert.deepEqual([d.extraAutorizada, d.extraPorAutorizar, d.sinSepararAntes], [138, 40, 0], "quedan 40 min dentro de la jornada");
  // Después de separar, mover la hora sí pide motivo.
  assert.equal(editado({ ...sep[0], ini: 530 }), true);
});

test("reloj en vivo: entró y salió 1 h tarde = 0 y no ofrece separar; 20 min = —; descanso; nocturno", () => {
  const tarde = resumen(cargar([api(1, "10:00", "14:00"), api(2, "14:00", "15:00", { concepto: "comida" }), api(3, "15:00", "19:00")]), horario);
  assert.deepEqual([tarde.extraPorAutorizar, tarde.sinSeparar], [0, 0]);
  const veinte = resumen(cargar([api(1, "08:40", "14:00"), api(2, "14:00", "15:00", { concepto: "comida" }), api(3, "15:00", "18:00")]), horario);
  assert.deepEqual([veinte.extraDetectadas, veinte.extraPorAutorizar], [20, 0]);
  assert.equal(resumen(cargar([api(1, "10:00", "14:00")]), { entrada: null, salida: null }).extraPorAutorizar, 240, "descanso");
  assert.equal(resumen(cargar([api(1, "10:00", "14:00")]), { entrada: null, salida: null }, { extraDia: { con_horario_otros_dias: false } })
    .extraPorAutorizar, 0, "sin ningún horario");
  const noche = resumen(cargar([{ ...api(1, "21:00", null), salida: "2026-11-26 07:30:00", salida_reloj: "2026-11-26 07:30:00" }]),
    { entrada: "22:00", salida: "06:00" });
  assert.deepEqual([noche.trabajadas, noche.programadas, noche.extraPorAutorizar, noche.sinSeparar, noche.sinSepararAntes], [630, 480, 150, 90, 60]);
});

test("reloj en vivo: tramo extra a mano, autorizadas parciales y lo decidido fuera del reloj (extra_dia)", () => {
  const dia = cargar([api(1, "09:00", "14:00"), api(2, "14:00", "14:00", { concepto: "comida", salida: `${F} 15:00:00`, salida_reloj: `${F} 15:00:00` }),
    api(3, "15:00", "18:00"), api(4, "19:00", "21:00", { concepto: "extra", origen: "manual", id_autoriza: 16 })]);
  assert.deepEqual([resumen(dia, horario).extraAutorizada, resumen(dia, horario).extraPorAutorizar], [120, 0]);
  // Autorizado el día completo en Control de horas extra (sin renglones de extra): todo autorizado.
  const c = resumen(real(), horario, { extraDia: { registradas: [], hrs_extra: 1, forma_pago_extras: "Pago de horas extras" } });
  assert.deepEqual([c.extraAutorizada, c.extraPorAutorizar], [178, 0]);
  // Registrada 1 h en el panel del día (fuera del reloj): el resto sigue por autorizar.
  const r = resumen(real(), horario, { extraDia: { registradas: [{ minutos: 60, forma_pago: "Pago de horas extras" }], hrs_extra: 1 } });
  assert.deepEqual([r.extraAutorizada, r.extraPorAutorizar], [60, 118]);
  // Separada después de la salida (sale 7:00 p.m.) y autorizada.
  const sale = cargar([api(1, "07:00", "14:00"), api(2, "14:00", "15:00", { concepto: "comida" }), api(3, "15:00", "19:00")]);
  const sep = separarExtra(sale, horario).map((x) => (x.concepto === "extra" ? { ...x, ...conAutoriza("16") } : x));
  assert.deepEqual([resumen(sep, horario).extraAutorizada, resumen(sep, horario).extraPorAutorizar], [60, 120]);
});

test("lo del servidor en el reloj (sin cambios): trae la jornada programada", () => {
  const s = resumenServidor({ minutos_trabajados: 658, minutos_programados: 480, minutos_extra: 0, minutos_extra_por_autorizar: 178, checadas_vivas: 3 });
  assert.deepEqual([s.trabajadas, s.programadas, s.extraPorAutorizar], [658, 480, 178]);
});
