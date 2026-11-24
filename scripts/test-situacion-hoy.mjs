// Asistencias › Tabla con «Hoy»: grupos por situación del momento y «Agrupar» por defecto. Uso: node --test scripts/test-situacion-hoy.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { minutosAbsolutos } from "../src/lib/fechaHora.mjs";
import { diaDesdeRegistro, estadoHoy } from "../src/lib/asistencia/hoy.mjs";
import { grupoMonitor } from "../src/lib/asistencia/monitor.mjs";
import {
  AGRUPAR_SITUACION, GRUPOS_SITUACION, agruparEfectivo, agruparPorSituacion, eleccionAlCambiarPeriodo, esPeriodoHoy,
  estadoDeRegistro, situacionDeEstado,
} from "../src/lib/asistencia/situacionHoy.mjs";

const HOY = "2026-11-23";
const CDMX = "America/Mexico_City";
// 14:10 en CDMX (UTC−6 todo el año).
const AHORA = Date.parse(`${HOY}T20:10:00Z`);
const t = (hora) => `${HOY} ${hora}:00`;
let n = 0;
const reg = (o = {}) => ({
  id: ++n, id_empleado: n, fecha: HOY, zona_horaria: CDMX, hora_entrada_programada: "09:00:00", hora_salida_programada: "18:00:00",
  hora_salida_comida_programada: "14:00:00", hora_regreso_comida_programada: "15:00:00",
  tolerancia_entrada_min: 10, tolerancia_salida_min: 0, tipo_registro_nombre: "Sin checar", entrada: null, salida: null, ...o,
});
const conTramos = (lista, abierta = null) => ({
  tramos_checadas: lista.map(([e, s]) => ({ entrada: t(e), salida: t(s) })), tramos_abiertos: abierta ? 1 : 0,
  entrada_tramo_abierto: abierta ? t(abierta) : null, entrada: t(lista[0]?.[0] ?? abierta), salida: lista.length ? t(lista.at(-1)[1]) : null,
});

const filas = [
  reg({ nombre: "Descansa", tipo_registro_nombre: "Día de Descanso" }),
  reg({ nombre: "Trabaja", ...conTramos([], "08:55") }),
  reg({ nombre: "Faltó" }),
  reg({ nombre: "Tarde", ...conTramos([], "09:30") }),
  reg({ nombre: "Comida", ...conTramos([["09:00", "13:50"]]) }),
  reg({ nombre: "Comida pasada", ...conTramos([["09:00", "13:00"]]), comida_checada: { salida: t("13:00"), regreso: null, minutos_programados: 60 } }),
  reg({ nombre: "Salió", hora_entrada_programada: "06:00:00", hora_salida_programada: "14:00:00", ...conTramos([["06:00", "14:00"]]) }),
  reg({ nombre: "Próximo", hora_entrada_programada: "16:00:00", hora_salida_programada: "23:00:00" }),
  reg({ nombre: "Vacaciones", tipo_registro_nombre: "Vacaciones" }),
  reg({ nombre: "Antes", ...conTramos([["07:00", "12:00"]]), hora_salida_comida_programada: null, hora_regreso_comida_programada: null }),
  reg({ nombre: "Cita", ...conTramos([], "08:58"), permisos_horas_dia: [{ tipo_horas: "sale_regresa", hora_inicio: "16:00", hora_fin: "17:00" }] }),
  reg({ nombre: "Inventario", ...conTramos([], "08:50"), horas_extra_autorizadas_dia: { hasta: "21:00", motivo: "inventario" } }),
  reg({ nombre: "Trabaja 2", ...conTramos([], "08:59") }),
];
const nombres = (grupos) => grupos.map(([titulo, rs]) => [titulo, rs.map((r) => r.nombre)]);

test("grupos en el orden del Monitor anterior, sin vacíos y con el orden de la tabla dentro de cada uno", () => {
  assert.deepEqual(nombres(agruparPorSituacion(filas, CDMX, AHORA)), [
    ["Requieren atención", ["Faltó", "Tarde", "Comida pasada", "Antes"]],
    ["En comida", ["Comida"]],
    ["Trabajando", ["Trabaja", "Cita", "Inventario", "Trabaja 2"]],
    ["Por entrar", ["Próximo"]],
    ["Ya salieron", ["Salió"]],
    ["No laboran hoy", ["Descansa", "Vacaciones"]],
  ]);
  // Sin nadie en comida ni por entrar: esos encabezados no salen.
  const sinComida = filas.filter((r) => !["Comida", "Próximo"].includes(r.nombre));
  assert.deepEqual(agruparPorSituacion(sinComida, CDMX, AHORA).map(([g]) => g), ["Requieren atención", "Trabajando", "Ya salieron", "No laboran hoy"]);
  assert.deepEqual(agruparPorSituacion([], CDMX, AHORA), []);
  assert.deepEqual(GRUPOS_SITUACION.map((g) => g.titulo), ["Requieren atención", "En comida", "Trabajando", "Por entrar", "Ya salieron", "No laboran hoy"]);
});

test("la tabla dice lo mismo que el Monitor (mismo estadoHoy y grupoMonitor)", () => {
  // Los grupos del Monitor que la tabla no tiene («Con permiso», «Saldrán tarde») caen en el de su estado del momento.
  const porEstado = { trabajando: "trabajando", salieron: "salieron", no_laboran: "no_laboran", comida: "comida", proximos: "por_entrar" };
  const vistos = new Set();
  const equivale = { atencion: "atencion", comida: "comida", jornada: "trabajando", proximos: "por_entrar", salieron: "salieron", no_laboran: "no_laboran" };
  for (const r of filas) {
    const monitor = estadoHoy(diaDesdeRegistro(r), minutosAbsolutos(HOY, "14:10"));
    const tabla = estadoDeRegistro(r, CDMX, AHORA);
    assert.equal(tabla.estado, monitor.estado, r.nombre);
    const g = grupoMonitor(monitor);
    if (g in equivale) assert.equal(situacionDeEstado(tabla), equivale[g], r.nombre);
    else {
      vistos.add(g);
      assert.equal(situacionDeEstado(tabla), porEstado[monitor.grupo], `${r.nombre} (${g})`);
    }
  }
  assert.deepEqual([...vistos].sort(), ["permiso", "saldran_tarde"], "el caso de prueba cubre los grupos que la tabla no tiene");
});

test("la checada de la base (hora de CDMX) se pasa a la zona de la empresa de la fila", () => {
  // Tijuana va 2 h atrás de CDMX en noviembre: entró 10:55 CDMX = 8:55 en Tijuana; a las 12:10 de Tijuana trabaja a tiempo.
  const tj = reg({ nombre: "Tijuana", zona_horaria: "America/Tijuana", ...conTramos([], "10:55") });
  const e = estadoDeRegistro(tj, CDMX, AHORA);
  assert.equal(e.estado, "trabajando");
  assert.equal(e.llegoTarde, null);
  assert.deepEqual(nombres(agruparPorSituacion([tj], CDMX, AHORA)), [["Trabajando", ["Tijuana"]]]);
});

test("«Situación de hoy» es el valor por defecto solo con el periodo Hoy", () => {
  assert.equal(esPeriodoHoy(HOY, HOY, HOY), true);
  assert.equal(esPeriodoHoy("2026-11-17", HOY, HOY), false, "semana");
  assert.equal(esPeriodoHoy("2026-11-01", "2026-11-30", HOY), false, "mes");
  assert.equal(esPeriodoHoy("2026-11-22", "2026-11-22", HOY), false, "ayer");
  assert.equal(agruparEfectivo(undefined, true), AGRUPAR_SITUACION);
  assert.equal(agruparEfectivo(undefined, false), null, "otro periodo no se divide");
  assert.equal(agruparEfectivo(AGRUPAR_SITUACION, false), null, "aunque venga elegida (vista guardada)");
  assert.equal(agruparEfectivo(null, true), null, "«Sin agrupar» se respeta en Hoy");
  assert.equal(agruparEfectivo("departamento", true), "departamento");
  assert.equal(agruparEfectivo("departamento", false), "departamento");
});

test("al cambiar de periodo, «Sin agrupar» y «Situación de hoy» vuelven al valor por defecto; las demás se quedan", () => {
  assert.equal(eleccionAlCambiarPeriodo(null), undefined);
  assert.equal(eleccionAlCambiarPeriodo(AGRUPAR_SITUACION), undefined);
  assert.equal(eleccionAlCambiarPeriodo(undefined), undefined);
  assert.equal(eleccionAlCambiarPeriodo("unidad"), "unidad");
  // Hoy → semana → Hoy con «Sin agrupar» elegido en Hoy: vuelve a dividirse.
  assert.equal(agruparEfectivo(eleccionAlCambiarPeriodo(eleccionAlCambiarPeriodo(null)), true), AGRUPAR_SITUACION);
});
