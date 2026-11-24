// Monitor: tarjetas, grupos (uno por persona) y la razón en texto de cada fila. Uso: node --test scripts/test-monitor.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { minutosAbsolutos } from "../src/lib/fechaHora.mjs";
import { diaDesdeRegistro, estadoHoy, salidaExtraDe } from "../src/lib/asistencia/hoy.mjs";
import {
  agruparMonitor, grupoMonitor, pieTarjeta, razonMonitor, resumenMonitor, saldraTarde, textoPermisoHoras,
} from "../src/lib/asistencia/monitor.mjs";

const HOY = "2026-11-23";
const a = (hora) => minutosAbsolutos(HOY, hora);
const t = (hora) => `${HOY} ${hora}:00`;
let n = 0;
// Horario 9:00–18:00 con comida 14:00–15:00 (8 h programadas), tolerancia de entrada 10 min.
const reg = (o = {}) => ({
  id: ++n, id_empleado: n, fecha: HOY, hora_entrada_programada: "09:00:00", hora_salida_programada: "18:00:00",
  hora_salida_comida_programada: "14:00:00", hora_regreso_comida_programada: "15:00:00",
  tolerancia_entrada_min: 10, tolerancia_salida_min: 0, tipo_registro_nombre: "Sin checar", entrada: null, salida: null, ...o,
});
const conTramos = (lista, abierta = null) => ({
  tramos_checadas: lista.map(([e, s]) => ({ entrada: t(e), salida: t(s) })), tramos_abiertos: abierta ? 1 : 0,
  entrada_tramo_abierto: abierta ? t(abierta) : null, entrada: t(lista[0]?.[0] ?? abierta), salida: lista.length ? t(lista.at(-1)[1]) : null,
});
const estado = (registro, hora) => ({ ...estadoHoy(diaDesdeRegistro(registro), a(hora)), nombre: registro.nombre });

test("grupos en orden: atención → permiso → saldrán tarde → comida → jornada → por entrar → salieron → no laboran", () => {
  const filas = [
    reg({ nombre: "Faltó" }), // 14:10 > 13:30 → faltó
    reg({ nombre: "No llega", hora_entrada_programada: "12:00:00", hora_salida_programada: "20:00:00" }),
    reg({ nombre: "Trabaja", ...conTramos([], "08:55") }),
    reg({ nombre: "Tarde", ...conTramos([], "09:30") }),
    reg({ nombre: "Comida pasada", ...conTramos([["09:00", "13:00"]]), comida_checada: { salida: t("13:00"), regreso: null, minutos_programados: 60 } }),
    reg({ nombre: "Comida", ...conTramos([["09:00", "13:50"]]) }),
    reg({ nombre: "Antes", ...conTramos([["07:00", "12:00"]]), hora_salida_comida_programada: null, hora_regreso_comida_programada: null }),
    reg({ nombre: "Salió", hora_entrada_programada: "06:00:00", hora_salida_programada: "14:00:00", ...conTramos([["06:00", "14:00"]]) }),
    reg({ nombre: "Próximo", hora_entrada_programada: "16:00:00", hora_salida_programada: "23:00:00" }),
    reg({ nombre: "Descansa", tipo_registro_nombre: "Día de Descanso" }),
    reg({ nombre: "Vacaciones", tipo_registro_nombre: "Vacaciones" }),
    reg({ nombre: "Cita", ...conTramos([], "08:58"), permisos_horas_dia: [{ tipo_horas: "sale_regresa", hora_inicio: "16:00", hora_fin: "17:00" }] }),
    reg({ nombre: "Inventario", ...conTramos([], "08:50"), horas_extra_autorizadas_dia: { hasta: "21:00", motivo: "inventario" } }),
  ].map((r) => estado(r, "14:10"));
  const grupos = agruparMonitor(filas, (r) => r.nombre);
  assert.deepEqual(grupos.map((g) => [g.clave, g.filas.map((r) => r.nombre)]), [
    ["atencion", ["Faltó", "No llega", "Antes", "Comida pasada", "Tarde"]],
    ["permiso", ["Vacaciones", "Cita"]],
    ["saldran_tarde", ["Inventario"]],
    ["comida", ["Comida"]],
    ["jornada", ["Trabaja"]],
    ["proximos", ["Próximo"]],
    ["salieron", ["Salió"]],
    ["no_laboran", ["Descansa"]],
  ]);
  assert.equal(grupos.find((g) => g.clave === "no_laboran").plegado, true);
  assert.equal(grupos.find((g) => g.clave === "jornada").limite, 8);

  const s = resumenMonitor(filas);
  assert.deepEqual(s.cuenta, { jornada: 6, tarde: 1, no_han_llegado: 2, permiso: 2, en_comida: 2, saldran_tarde: 1, por_entrar: 1 });
  assert.deepEqual([s.programadosHoy, s.promedioTarde, s.faltaron, s.permisoHoras, s.permisoDia, s.comidaExcedida, s.minutosExtra],
    [11, 30, 1, 1, 1, 1, 180]);
  assert.equal(pieTarjeta("jornada", s), "de 11 programados");
  assert.equal(pieTarjeta("tarde", s), "promedio +30 min");
  assert.equal(pieTarjeta("no_han_llegado", s), "1 ya a media jornada");
  assert.equal(pieTarjeta("permiso", s), "1 por horas · 1 todo el día");
  assert.equal(pieTarjeta("en_comida", s), "1 excedida");
  assert.equal(pieTarjeta("saldran_tarde", s), "3 h extra autorizadas");
  assert.equal(pieTarjeta("por_entrar", s), "la próxima a las 4:00 p.m.");
});

test("razón de cada fila en texto", () => {
  const texto = (r, hora) => razonMonitor(estado(r, hora)).texto;
  assert.equal(texto(reg(conTramos([], "09:18")), "10:42"), "Llegó 18 min tarde");
  assert.equal(razonMonitor(estado(reg(conTramos([], "09:18")), "10:42")).tono, "naranja");
  assert.equal(texto(reg(), "10:42"), "No ha llegado · debía entrar hace 1 h 42 min");
  assert.equal(texto(reg(), "14:00"), "Faltó · sin checadas a media jornada");
  const comida = { ...conTramos([["09:00", "13:00"]]), comida_checada: { salida: t("13:00"), regreso: null, minutos_programados: 30 } };
  assert.equal(texto(reg(comida), "13:52"), "En comida 52 de 30 min");
  assert.equal(texto(reg(comida), "13:20"), "En comida 20 de 30 min");
  assert.equal(texto(reg(conTramos([["09:00", "16:10"]])), "16:30"), "Salió antes · 4:10 p.m. · faltaron 1 h 50 min");
  assert.equal(texto(reg(conTramos([], "08:55")), "10:42"), "A tiempo");
  assert.equal(texto(reg(conTramos([["08:58", "18:02"]])), "18:30"), "Salió 6:02 p.m.");
  assert.equal(texto(reg({ hora_entrada_programada: "12:00:00", hora_salida_programada: "20:00:00" }), "10:42"), "Entra 12:00 p.m. · en 1 h 18 min");
  assert.equal(texto(reg({ tipo_registro_nombre: "Vacaciones" }), "10:42"), "Vacaciones");
  assert.equal(texto(reg({ tipo_registro_nombre: "Día de Descanso" }), "10:42"), "Día de Descanso");
});

test("permisos por horas: texto con motivo; cuenta en «Con permiso» aunque ya haya salido con él", () => {
  const p = (tipo_horas, hora_inicio, hora_fin, motivo) => ({ tipo_horas, hora_inicio, hora_fin, motivo });
  const cita = reg({ ...conTramos([["07:58", "10:00"]]), hora_entrada_programada: "08:00:00", hora_salida_programada: "17:00:00",
    permisos_horas_dia: [p("sale_regresa", "10:00", "12:00", "cita médica")] });
  const e = estado(cita, "10:42");
  assert.equal(grupoMonitor(e), "permiso");
  assert.equal(razonMonitor(e).texto, "Permiso 10:00 a.m.–12:00 p.m. · cita médica · salió 10:00 a.m.");
  assert.equal(textoPermisoHoras({ tipo: "llega_tarde", fin: "11:00" }), "Permiso para llegar a las 11:00 a.m.");
  assert.equal(textoPermisoHoras({ tipo: "sale_antes", inicio: "16:00", motivo: "trámite" }), "Permiso para salir a las 4:00 p.m. · trámite");
  // Sin motivo (el backend aún no lo manda) el texto queda sin «· …».
  const sinMotivo = estado(reg({ ...conTramos([], "08:55"), permisos_horas_dia: [p("sale_antes", "16:00", null)] }), "10:42");
  assert.equal(razonMonitor(sinMotivo).texto, "Permiso para salir a las 4:00 p.m.");
  // Lo urgente gana: con permiso para salir a las 16:00 pero se fue a las 12:00 sin cubrirlo.
  const antes = estado(reg({ ...conTramos([["09:00", "12:00"]]), permisos_horas_dia: [p("sale_antes", "16:00", null)] }), "13:30");
  assert.equal(grupoMonitor(antes), "atencion");
});

test("saldrán tarde: horas extra autorizadas antes de que ocurran", () => {
  const extra = { hasta: "20:00", minutos: 120, motivo: "inventario" };
  const e = estado(reg({ ...conTramos([], "08:51"), horas_extra_autorizadas_dia: extra }), "10:42");
  assert.ok(saldraTarde(e));
  assert.equal(razonMonitor(e).texto, "Saldrá 8:00 p.m. · 2 h extra · inventario");
  // Sin minutos: los calcula contra su salida (18:00 → 21:00).
  const sinMinutos = estado(reg({ ...conTramos([], "08:51"), horas_extra_autorizadas_dia: { hasta: "21:00" } }), "10:42");
  assert.equal(razonMonitor(sinMinutos).texto, "Saldrá 9:00 p.m. · 3 h extra");
  // El aviso «debía salir» cuenta desde la hora autorizada.
  assert.equal(estado(reg({ ...conTramos([], "08:51"), horas_extra_autorizadas_dia: extra }), "19:00").debiaSalirHace, null);
  assert.equal(estado(reg({ ...conTramos([], "08:51"), horas_extra_autorizadas_dia: extra }), "20:30").debiaSalirHace, 30);
  // Ya salió: no «saldrá tarde».
  const salio = estado(reg({ ...conTramos([["08:51", "20:01"]]), horas_extra_autorizadas_dia: extra }), "20:30");
  assert.equal(saldraTarde(salio), false);
  assert.equal(grupoMonitor(salio), "salieron");
  // Turno nocturno: la hora autorizada de madrugada es del día siguiente.
  const noche = estado(reg({ hora_entrada_programada: "22:00:00", hora_salida_programada: "06:00:00", hora_salida_comida_programada: null,
    hora_regreso_comida_programada: null, ...conTramos([], "21:58"), horas_extra_autorizadas_dia: { hasta: "08:00" } }), "23:00");
  assert.equal(razonMonitor(noche).texto, "Saldrá 8:00 a.m. · 2 h extra");
  // Campo ausente o ilegible: sin «Saldrán tarde».
  assert.equal(salidaExtraDe(undefined), null);
  assert.equal(salidaExtraDe({ hasta: "tarde" }), null);
  assert.deepEqual(salidaExtraDe({ hasta: "20:00:00", minutos: "90", motivo: "  " }), { hasta: "20:00", minutos: 90, motivo: null });
});

test("enlaces viejos a «Hoy / En vivo» llevan al Monitor", async () => {
  const { esVistaEnVivo, RUTA_MONITOR } = await import("../src/lib/asistencia/vistasAsistencia.mjs");
  assert.equal(RUTA_MONITOR, "/panel/monitor");
  for (const v of ["envivo", "EnVivo", "en-vivo", "hoy", " hoy "]) assert.equal(esVistaEnVivo(v), true, v);
  for (const v of [null, "", "registros", "horas", "matriz"]) assert.equal(esVistaEnVivo(v), false, String(v));
});
