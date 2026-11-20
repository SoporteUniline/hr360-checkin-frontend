import assert from "node:assert/strict";
import test from "node:test";
import { alertasDia, moverSemana, quienDecidio, resumenControl, semanaExtra, topeRespaldo } from "../src/lib/asistencia/controlHorasExtra.mjs";
import { lunesDe, semanaDe } from "../src/lib/fechaHora.mjs";

const reg = (o) => ({ id_empleado: 1, fecha: "2026-11-16", hora_entrada_programada: "08:00:00", hora_salida_programada: "17:00:00", entrada: "2026-11-16 08:00:00", hrs_extra: 0, ...o });
const aut = (fecha, salida, o = {}) => reg({ fecha, entrada: `${fecha} 08:00:00`, salida: `${fecha} ${salida}:00`, hrs_extra: 1, nombre_extra_autorizador: "Laura", apellido_paterno_extra_autorizador: "Gómez", ...o });

test("semana legal y tope de respaldo", () => {
  assert.equal(lunesDe("2026-11-22"), "2026-11-16");
  assert.deepEqual(semanaDe("2026-11-19"), { inicio: "2026-11-16", fin: "2026-11-22" });
  assert.deepEqual(moverSemana(semanaDe("2026-11-19"), -1), { inicio: "2026-11-09", fin: "2026-11-15" });
  assert.equal(topeRespaldo("2027-01-04"), 540);
  assert.equal(topeRespaldo("2028-03-01"), 600);
});

test("resumen: por autorizar, autorizadas (doble/triple), no autorizadas y alertas", () => {
  const filas = [
    aut("2026-11-16", "21:00"), // 4 h
    aut("2026-11-17", "21:00"), // 4 h
    aut("2026-11-18", "22:30"), // 5 h 30 → más de 4 h; semana 13 h 30 → 4 h 30 al triple
    reg({ id_empleado: 2, salida: "2026-11-16 18:15:00" }), // 1 h 15 por autorizar
    reg({ id_empleado: 3, salida: "2026-11-16 17:00:00", correccion: 1, valores_originales: JSON.stringify({ salida: "2026-11-16 23:59:00" }), notas_hrs_extra: "No autorizadas por Laura Gómez · salida del reloj 2026-11-16 23:59" }),
    reg({ id_empleado: 4, salida: "2026-11-16 17:05:00" }), // sin horas extra
  ];
  const r = resumenControl(filas, { tope: 540 });
  assert.deepEqual([r.pendiente.minutos, r.pendiente.registros, r.pendiente.personas], [75, 1, 1]);
  assert.deepEqual([r.autorizada.minutos, r.autorizada.dobles, r.autorizada.triples], [810, 540, 270]);
  assert.deepEqual([r.no_autorizada.minutos, r.no_autorizada.registros], [419, 1]);
  assert.equal(r.alertas, 2);
  assert.deepEqual(semanaExtra(filas[0], r), { acumulado: 810, tope: 540, triples: 270 });
  assert.deepEqual(alertasDia(filas[2], r), ["Más de 4 h extra en el día", "Pasa de 9 h en la semana: 4 h 30 min al triple"]);
});

test("quién decidió", () => {
  assert.deepEqual(quienDecidio(aut("2026-11-16", "19:00")), { estado: "autorizada", nombre: "Laura Gómez" });
  assert.equal(quienDecidio(reg({ salida: "2026-11-16 18:15:00" })).estado, "pendiente");
  const no = quienDecidio(reg({ salida: "2026-11-16 17:00:00", correccion: 1, valores_originales: JSON.stringify({ salida: "2026-11-16 23:59:00" }), notas_hrs_extra: "No autorizadas por Diego León · salida del reloj 2026-11-16 23:59" }));
  assert.deepEqual([no.estado, no.nombre], ["no_autorizada", "Diego León"]);
});

test("quincena/mes que empieza a media semana: el tope semanal usa toda la semana (contexto)", () => {
  // Semana 16–22 nov: lun 16 y mar 17 fuera del periodo con 4 h autorizadas cada uno (8 h); el periodo empieza el miércoles 18 con 3 h.
  const contexto = [aut("2026-11-16", "21:00"), aut("2026-11-17", "21:00")];
  const periodo = [aut("2026-11-18", "20:00")];
  const sin = resumenControl(periodo, { tope: 540 });
  assert.deepEqual([sin.autorizada.dobles, sin.autorizada.triples], [180, 0], "sin contexto se veía todo al doble");
  const con = resumenControl(periodo, { tope: 540, contexto });
  assert.deepEqual([con.autorizada.minutos, con.autorizada.registros], [180, 1], "los totales son solo del periodo");
  assert.deepEqual([con.autorizada.dobles, con.autorizada.triples], [60, 120]);
  assert.equal(semanaExtra(periodo[0], con.resumen ?? con, 540).acumulado, 660, "la columna Semana ve la semana completa");
});
