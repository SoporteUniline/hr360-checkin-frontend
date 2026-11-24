import assert from "node:assert/strict";
import test from "node:test";
import { diaParaLeer, resultadosHoy } from "../src/lib/asistencia/hoyEquipo.mjs";

const base = (o) => ({ id: 1, id_empleado: 11, nombre: "Ana", apellido_paterno: "Prueba", fecha: "2026-11-23", zona_horaria: "America/Mexico_City",
  hora_entrada_programada: "09:00:00", hora_salida_programada: "16:00:00", tipo_registro_nombre: "Asistencia", ...o });

test("mismo estado que el Monitor de RH: trabajando, no ha llegado y en comida", () => {
  const ahora = new Date("2026-11-23T17:00:00Z"); // 11:00 en CDMX
  const registros = [
    base({ entrada: "2026-11-23 09:05:00", tramos_checadas: [], tramos_abiertos: 1, entrada_tramo_abierto: "2026-11-23 09:05:00" }),
    base({ id: 2, id_empleado: 12, nombre: "Beto" }),
    base({ id: 3, id_empleado: 13, nombre: "Caro", entrada: "2026-11-23 09:00:00", salida: "2026-11-23 10:45:00",
      hora_salida_comida_programada: "10:45:00", hora_regreso_comida_programada: "11:15:00",
      tramos_checadas: [{ entrada: "2026-11-23 09:00:00", salida: "2026-11-23 10:45:00" }], tramos_abiertos: 0,
      comida_checada: { salida: "2026-11-23 10:45:00", regreso: null, minutos: null } }),
  ];
  const estados = Object.fromEntries(resultadosHoy(registros, "America/Mexico_City", ahora).map((r) => [r.dia.registro.nombre, r.estado]));
  assert.deepEqual(estados, { Ana: "trabajando", Beto: "no_ha_llegado", Caro: "en_comida" });
});

test("día en modo lectura: tramos, comida manual con quién, permisos y horas extra", () => {
  const r = base({
    entrada: "2026-11-23 09:18:00", salida: "2026-11-23 19:00:00",
    tramos_checadas: [{ entrada: "2026-11-23 09:18:00", salida: "2026-11-23 14:00:00" }, { entrada: "2026-11-23 14:30:00", salida: "2026-11-23 16:08:00" }],
    comida_checada: { salida: "2026-11-23 14:00:00", regreso: "2026-11-23 14:30:00", minutos: 30, manual: true, agrego: { nombre_usuario: "Laura Méndez" } },
    permisos_horas_dia: [{ tipo_horas: "llega_tarde", hora_inicio: "09:00", hora_fin: "09:30" }],
    horas_extra_registradas: [{ desde: "2026-11-23 16:00:00", hasta: "2026-11-23 19:00:00", minutos: 180, motivo: "Inventario" }],
  });
  const d = diaParaLeer(r, "America/Mexico_City");
  assert.equal(d.horario, "9:00 a.m. – 4:00 p.m.");
  assert.deepEqual(d.tramos, [{ entrada: "9:18 a.m.", salida: "2:00 p.m." }, { entrada: "2:30 p.m.", salida: "4:08 p.m." }]);
  assert.deepEqual(d.comida, { rango: "2:00 p.m. – 2:30 p.m.", minutos: "30 min", origen: "manual", agrego: "Laura Méndez" });
  assert.deepEqual(d.permisos, ["Llega tarde 9:00 a.m.–9:30 a.m."]);
  assert.deepEqual(d.horasExtra, [{ rango: "4:00 p.m. – 7:00 p.m.", minutos: "3 h", motivo: "Inventario" }]);
  const abierto = diaParaLeer(base({ entrada: "2026-11-23 09:05:00", tramos_checadas: [], tramos_abiertos: 1 }), "America/Mexico_City");
  assert.deepEqual(abierto.tramos, [{ entrada: "9:05 a.m.", salida: null }], "sin duplicar la entrada abierta");
});
