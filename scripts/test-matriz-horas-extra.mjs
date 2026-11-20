import assert from "node:assert/strict";
import test from "node:test";
import { diasDelPeriodo, enlaceAsistencia, matrizHorasExtra, moverPeriodo, periodoDe } from "../src/lib/asistencia/matrizHorasExtra.mjs";
import { duracionCorta } from "../src/lib/asistencia/jornada.mjs";

test("periodos: semana legal, quincenas, mes y moverse", () => {
  assert.deepEqual(periodoDe("semana", "2026-11-19"), { inicio: "2026-11-16", fin: "2026-11-22" });
  assert.deepEqual(periodoDe("quincena", "2026-11-19"), { inicio: "2026-11-16", fin: "2026-11-30" });
  assert.deepEqual(periodoDe("quincena", "2026-02-03"), { inicio: "2026-02-01", fin: "2026-02-15" });
  assert.deepEqual(periodoDe("mes", "2026-02-19"), { inicio: "2026-02-01", fin: "2026-02-28" });
  assert.deepEqual(moverPeriodo("quincena", { inicio: "2026-11-16", fin: "2026-11-30" }, 1), { inicio: "2026-12-01", fin: "2026-12-15" });
  assert.deepEqual(moverPeriodo("mes", { inicio: "2026-03-01", fin: "2026-03-31" }, -1), { inicio: "2026-02-01", fin: "2026-02-28" });
  assert.deepEqual(moverPeriodo("rango", { inicio: "2026-11-10", fin: "2026-11-12" }, 1), { inicio: "2026-11-13", fin: "2026-11-15" });
  assert.equal(diasDelPeriodo({ inicio: "2026-11-16", fin: "2026-11-22" }).length, 7);
});

const reg = (id, idEmp, nombre, fecha, salida, o = {}) => ({
  id, id_empleado: idEmp, nombre, apellido_paterno: "P", departamento: "Prod", fecha,
  hora_entrada_programada: "08:00:00", hora_salida_programada: "17:00:00", hrs_comida: 0,
  entrada: `${fecha} 08:00:00`, salida: `${fecha} ${salida}:00`, hrs_extra: 0, ...o,
});

test("matriz: celdas por persona y día, total que no suma las no autorizadas, orden con pendientes primero", () => {
  const dias = diasDelPeriodo(periodoDe("semana", "2026-11-19"));
  const filas = [
    reg(1, 10, "Gabriel", "2026-11-16", "19:42", { hrs_extra: 1 }), // 2:42 autorizada
    reg(2, 10, "Gabriel", "2026-11-18", "21:30"),                    // 4:30 por autorizar
    reg(3, 11, "Ivan", "2026-11-18", "17:00", { correccion: 1, valores_originales: JSON.stringify({ salida: "2026-11-18 23:59:00" }),
      notas_hrs_extra: "No autorizadas por Laura · salida del reloj 2026-11-18 23:59" }), // no autorizada
    reg(4, 12, "Sin", "2026-11-18", "17:05"),                        // sin horas extra
    reg(5, 13, "Fuera", "2026-11-25", "20:00"),                      // fuera del periodo
  ];
  const m = matrizHorasExtra(filas, { dias });
  assert.deepEqual(m.filas.map((f) => f.nombre), ["Gabriel P", "Ivan P"]);
  const gab = m.filas[0];
  assert.deepEqual([gab.celdas["2026-11-16"].minutos, gab.celdas["2026-11-16"].estado], [162, "autorizada"]);
  assert.deepEqual([gab.celdas["2026-11-18"].minutos, gab.celdas["2026-11-18"].estado], [270, "pendiente"]);
  assert.equal(gab.total, 432);
  const ivan = m.filas[1];
  assert.deepEqual([ivan.celdas["2026-11-18"].estado, ivan.celdas["2026-11-18"].minutos, ivan.total], ["no_autorizada", 419, 0]);
  assert.deepEqual(m.totalesDia["2026-11-18"], { minutos: 270, pendientes: 1 });
  assert.equal(m.total, 432);
  // Filtro por estado (tarjetas).
  assert.deepEqual(matrizHorasExtra(filas, { dias, estados: ["pendiente"] }).filas.map((f) => Object.keys(f.celdas)), [["2026-11-18"]]);
});

test("enlace a Asistencias y hora corta", () => {
  assert.equal(enlaceAsistencia(reg(9, 10, "Gabriel", "2026-11-18", "21:30")), "/panel/registro-asistencia?fecha=2026-11-18&empleado=Gabriel+P&abrir=9");
  assert.equal(duracionCorta(270), "4:30");
  assert.equal(duracionCorta(5), "0:05");
});

test("matriz: la celda no depende del orden de los registros (no autorizada leída antes que una autorizada)", () => {
  const dias = diasDelPeriodo(periodoDe("semana", "2026-11-19"));
  const noAut = reg(1, 10, "Gabriel", "2026-11-18", "17:00", { correccion: 1, valores_originales: JSON.stringify({ salida: "2026-11-18 20:00:00" }),
    notas_hrs_extra: "No autorizadas por Laura · salida del reloj 2026-11-18 20:00" });
  const aut = reg(2, 10, "Gabriel", "2026-11-18", "19:00", { hrs_extra: 1 });
  for (const orden of [[noAut, aut], [aut, noAut]]) {
    const celda = matrizHorasExtra(orden, { dias }).filas[0].celdas["2026-11-18"];
    assert.equal(celda.minutos, 120, "solo cuentan las autorizadas");
  }
});
