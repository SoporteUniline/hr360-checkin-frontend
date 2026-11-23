// Asistencias → Hoy (23/11/2026): un estado por persona, precedencia, permisos, tolerancia, turno nocturno, varios tramos
// y comida pasada. Uso: node --test scripts/test-asistencias-hoy.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { minutosAbsolutos } from "../src/lib/fechaHora.mjs";
import {
  agruparHoy, describir, diaDesdeRegistro, diasDeHoy, duracionHoy, estadoHoy, resumenHoy, tipoDelDia,
} from "../src/lib/asistencia/hoy.mjs";

const HOY = "2026-11-23";
const AYER = "2026-11-22";
const a = (hora, fecha = HOY) => minutosAbsolutos(fecha, hora);
const t = (hora, fecha = HOY) => `${fecha} ${hora}:00`;
let n = 0;
// Horario 9:00–18:00 con comida 14:00–15:00 (8 h programadas), tolerancia de entrada 10 min.
const reg = (o = {}) => ({
  id: ++n, id_empleado: n, fecha: HOY, hora_entrada_programada: "09:00:00", hora_salida_programada: "18:00:00",
  hora_salida_comida_programada: "14:00:00", hora_regreso_comida_programada: "15:00:00",
  tolerancia_entrada_min: 10, tolerancia_salida_min: 0, tipo_registro_nombre: "Sin checar", entrada: null, salida: null, ...o,
});
const conTramos = (lista, abierta = null, extra = {}) => ({
  tramos_checadas: lista.map(([e, s]) => ({ entrada: t(e), salida: t(s) })), tramos_abiertos: abierta ? 1 : 0,
  entrada_tramo_abierto: abierta ? t(abierta) : null, entrada: t(lista[0]?.[0] ?? abierta), salida: lista.length ? t(lista.at(-1)[1]) : null, ...extra,
});
const estado = (registro, hora, fecha = HOY) => estadoHoy(diaDesdeRegistro(registro), a(hora, fecha));

test("sin checadas: por entrar → (tolerancia) → no ha llegado → faltó a media jornada", () => {
  const r = reg();
  assert.equal(estado(r, "08:30").estado, "por_entrar");
  assert.equal(estado(r, "08:30").grupo, "proximos");
  assert.equal(estado(r, "09:10").estado, "por_entrar", "dentro de la tolerancia (9:00 + 10)");
  const tarde = estado(r, "09:11");
  assert.deepEqual([tarde.estado, tarde.grupo, tarde.urgente, tarde.debiaEntrarHace], ["no_ha_llegado", "atencion", true, 11]);
  assert.equal(describir(estado(r, "11:12")).detalle, "Debía entrar hace 2 h 12 min");
  assert.equal(estado(r, "13:29").estado, "no_ha_llegado");
  const falto = estado(r, "13:30"); // mitad de 9:00–18:00
  assert.deepEqual([falto.estado, falto.grupo], ["falto", "atencion"]);
  assert.equal(describir(falto).detalle, "Sin checadas · pasó la mitad de su jornada");
  assert.equal(describir(falto).chip, "Faltó");
});

test("permiso «llega tarde» aprobado: corre la tolerancia hasta su hora_fin y la mitad de la jornada", () => {
  const r = reg({ permisos_horas_dia: [{ tipo_horas: "llega_tarde", hora_inicio: "09:00", hora_fin: "14:00" }] });
  assert.equal(estado(r, "13:45").estado, "por_entrar", "a las 13:45 sigue cubierto (antes: faltó)");
  assert.match(describir(estado(r, "13:45")).detalle, /^Llega con permiso 2:00 p\.m\. · en 15 min$/);
  assert.equal(estado(r, "14:05").estado, "por_entrar", "tolerancia después del permiso");
  assert.equal(estado(r, "14:20").estado, "no_ha_llegado");
  assert.match(describir(estado(r, "14:20")).detalle, /Permiso hasta 2:00 p\.m\. · Debía entrar hace 20 min/);
  assert.equal(estado(r, "15:59").estado, "no_ha_llegado");
  assert.equal(estado(r, "16:00").estado, "falto", "mitad de 14:00–18:00");
  // Llegó dentro del permiso: no cuenta como tarde.
  const llego = estado({ ...r, ...conTramos([], "13:50") }, "15:00");
  assert.deepEqual([llego.estado, llego.llegoTarde], ["trabajando", null]);
  // También con el campo de siempre (permiso_horas) si el backend aún no manda la lista.
  const viejo = reg({ permiso_horas: { tipo_horas: "llega_tarde", hora_fin: "11:00" } });
  assert.equal(estado(viejo, "10:30").estado, "por_entrar");
});

test("trabajando: a tiempo, dentro de tolerancia, llegó tarde +N (cuenta en «Llegaron tarde») y avance", () => {
  const aTiempo = estado(reg(conTramos([], "08:56")), "11:12");
  assert.deepEqual([aTiempo.estado, aTiempo.grupo, aTiempo.llegoTarde, aTiempo.trabajados, aTiempo.programados], ["trabajando", "trabajando", null, 136, 480]);
  const d = describir(aTiempo);
  assert.deepEqual([d.chip, d.detalle, d.jornada], ["Trabajando", "Entró 8:56 a.m. · a tiempo", "2 h 16 de 8 h"]);
  assert.equal(Math.round(d.avance * 100), 28);
  assert.equal(estado(reg(conTramos([], "09:10")), "11:00").llegoTarde, null, "9:10 está dentro de la tolerancia");
  const tarde = estado(reg(conTramos([], "09:18")), "11:12");
  assert.equal(tarde.llegoTarde, 18);
  const dt = describir(tarde);
  assert.deepEqual([dt.chip, dt.detalle, dt.resaltado, dt.tono], ["Llegó tarde", "Entró 9:18 a.m.", "+18 min", "naranja"]);
  // Pasó su salida y no ha checado.
  assert.match(describir(estado(reg(conTramos([], "09:00")), "18:20")).detalle, /debía salir hace 20 min$/);
});

test("varios tramos: suma lo cerrado + el tramo abierto desde su entrada; la primera entrada decide el retardo", () => {
  const r = reg(conTramos([["09:25", "11:00"], ["11:30", "13:00"]], "13:20"));
  const e = estado(r, "14:00");
  assert.equal(e.estado, "trabajando");
  assert.equal(e.trabajados, 95 + 90 + 40);
  assert.equal(e.llegoTarde, 25);
  assert.equal(e.primeraEntrada, a("09:25"));
});

test("en comida (botón «Salir a comer»): lleva N de M; si N > M es urgente «se pasó»", () => {
  const comida = (regreso = null) => ({ comida_checada: { salida: t("13:00"), regreso, minutos: null, minutos_programados: 60 } });
  const r = reg({ ...conTramos([["09:00", "13:00"]]), ...comida() });
  const e = estado(r, "13:40");
  assert.deepEqual([e.estado, e.grupo, e.urgente, e.llevaComida, e.minutosComida], ["en_comida", "comida", false, 40, 60]);
  assert.equal(describir(e).detalle, "Salió a comer 1:00 p.m. · lleva 40 de 60 min");
  const paso = estado(r, "14:07");
  assert.deepEqual([paso.estado, paso.grupo, paso.urgente, paso.sePasoComida], ["en_comida", "atencion", true, true]);
  assert.equal(describir(paso).chip, "En comida · se pasó");
  assert.equal(describir(paso).detalle, "Salió a comer 1:00 p.m. · lleva 67 de 60 min");
  // Regresó: tramo abierto → trabajando.
  const volvio = estado(reg({ ...conTramos([["09:00", "13:00"]], "13:55"), ...comida(t("13:55")) }), "15:00");
  assert.deepEqual([volvio.estado, volvio.trabajados], ["trabajando", 240 + 65]);
  // Ya pasó su hora de salida y no regresó: cuenta como salida (salió antes).
  assert.equal(estado(r, "18:30").estado, "salio_antes");
});

test("en comida sin botón: salida dentro de la comida del horario (o 30 min antes)", () => {
  const r = reg(conTramos([["09:00", "13:45"]]));
  const e = estado(r, "14:20");
  assert.deepEqual([e.estado, e.minutosComida, e.llevaComida], ["en_comida", 60, 35]);
  assert.equal(estado(reg(conTramos([["09:00", "12:00"]])), "12:30").estado, "salio_antes", "12:00 no es su comida");
});

test("salió antes vs ya salió: con y sin permiso «sale antes» / «sale y regresa»; tolerancia de salida", () => {
  const temprano = conTramos([["09:00", "14:00"], ["15:00", "16:10"]]);
  const sin = estado(reg(temprano), "16:30");
  assert.deepEqual([sin.estado, sin.grupo, sin.urgente, sin.faltaron], ["salio_antes", "atencion", true, 110]);
  assert.equal(describir(sin).detalle, "Salió 4:10 p.m. · faltaron 1 h 50 min");
  assert.equal(describir(sin).chip, "Salió antes");

  const conPermiso = estado(reg({ ...temprano, permisos_horas_dia: [{ tipo_horas: "sale_antes", hora_inicio: "16:00", hora_fin: "18:00" }] }), "16:30");
  assert.deepEqual([conPermiso.estado, conPermiso.grupo, conPermiso.conPermiso], ["ya_salio", "salieron", "sale_antes"]);
  assert.equal(describir(conPermiso).chip, "Salió con permiso");
  // Permiso desde las 17:00 no cubre una salida a las 16:10.
  assert.equal(estado(reg({ ...temprano, permisos_horas_dia: [{ tipo_horas: "sale_antes", hora_inicio: "17:00" }] }), "16:30").estado, "salio_antes");

  // Sale y regresa 16:00–17:00: cubre mientras dura (+ tolerancia de entrada); si no regresó, salió antes.
  const regresa = reg({ ...temprano, permisos_horas_dia: [{ tipo_horas: "sale_regresa", hora_inicio: "16:00", hora_fin: "17:00" }] });
  assert.equal(estado(regresa, "16:45").estado, "ya_salio");
  assert.equal(estado(regresa, "17:30").estado, "salio_antes");
  // Sale y regresa que termina con su jornada: cubre.
  const hastaElFinal = reg({ ...temprano, permisos_horas_dia: [{ tipo_horas: "sale_regresa", hora_inicio: "16:00", hora_fin: "18:00" }] });
  assert.equal(estado(hastaElFinal, "18:30").estado, "ya_salio");

  // A su hora: ya salió, con diferencia.
  const completa = estado(reg(conTramos([["08:58", "14:00"], ["15:00", "18:02"]])), "18:30");
  assert.equal(completa.estado, "ya_salio");
  assert.equal(describir(completa).detalle, "8:58 a.m. → 6:02 p.m.");
  assert.equal(describir(completa).jornada, "8 h 04 de 8 h · +4 min");
  // Tolerancia de salida de la empresa: 5 min antes cuenta como a su hora.
  assert.equal(estado(reg({ ...conTramos([["09:00", "17:56"]]), tolerancia_salida_min: 5 }), "18:10").estado, "ya_salio");
  assert.equal(estado(reg({ ...conTramos([["09:00", "17:54"]]), tolerancia_salida_min: 5 }), "18:10").estado, "salio_antes");
});

test("ya salió con comida del botón: «entrada → salida · comida … · diferencia»", () => {
  const r = reg({
    hora_entrada_programada: "00:00:00", hora_salida_programada: "08:00:00", hora_salida_comida_programada: null, hora_regreso_comida_programada: null,
    ...conTramos([["00:16", "00:30"], ["00:59", "07:23"]]), comida_checada: { salida: t("00:30"), regreso: t("00:59"), minutos: 29, minutos_programados: 30 },
  });
  const e = estado(r, "11:12");
  assert.equal(e.estado, "salio_antes", "salió 7:23 antes de las 8:00 sin permiso");
  const ya = estado({ ...r, tolerancia_salida_min: 40 }, "11:12");
  assert.equal(ya.estado, "ya_salio");
  const d = describir(ya);
  assert.equal(d.detalle, "12:16 a.m. → 7:23 a.m. · comida 12:30 a.m.–12:59 a.m.");
  assert.equal(d.jornada, "6 h 38 de 8 h · −1 h 22");
});

test("no laboran hoy: descanso, vacaciones, permiso de día, incapacidad, festivo y sin horario (sin checadas)", () => {
  const casos = [
    [{ tipo_registro_nombre: "Día de Descanso" }, "descanso", "Día de Descanso"],
    [{ tipo_registro_nombre: "🌴 Vacaciones" }, "vacaciones", "Vacaciones"],
    [{ tipo_registro_nombre: "Permiso con goce" }, "permiso", "Permiso con goce"],
    [{ tipo_registro_nombre: "Incapacidad IMSS" }, "incapacidad", "Incapacidad IMSS"],
    [{ tipo_registro_nombre: "Día Festivo Oficial" }, "festivo", "Día Festivo Oficial"],
    [{ hora_entrada_programada: null, hora_salida_programada: null }, "sin_horario", "Sin horario hoy"],
  ];
  for (const [o, clase, chip] of casos) {
    const e = estado(reg(o), "16:00");
    assert.deepEqual([e.estado, e.grupo, e.urgente ?? false], [clase, "no_laboran", false], JSON.stringify(o));
    assert.equal(describir(e).chip, chip);
  }
  assert.equal(tipoDelDia({ tipo_registro_nombre: "Asistencia" }).clase, "normal");
  assert.equal(tipoDelDia({ tipo_registro_clave: "Sin Checar" }).clase, "normal");
  // Precedencia: con día de descanso a media jornada NO es «Faltó».
  assert.notEqual(estado(reg({ tipo_registro_nombre: "Día de Descanso" }), "17:00").estado, "falto");
  // Si checó en su descanso cuenta lo que checó, sin retardo ni «salió antes».
  const vino = estado(reg({ tipo_registro_nombre: "Día de Descanso", ...conTramos([["10:00", "12:00"]]) }), "13:00");
  assert.deepEqual([vino.estado, vino.llegoTarde], ["ya_salio", null]);
});

test("turno nocturno 22:00 → 06:00 (salida al día siguiente) y elección ayer/hoy", () => {
  const noche = (o = {}) => reg({ fecha: AYER, id_empleado: 50, hora_entrada_programada: "22:00:00", hora_salida_programada: "06:00:00",
    hora_salida_comida_programada: "02:00:00", hora_regreso_comida_programada: "02:30:00", ...o });
  // Sin checadas: a las 23:00 de ayer no ha llegado; a las 02:00 (mitad) faltó.
  assert.equal(estado(noche(), "21:30", AYER).estado, "por_entrar");
  assert.equal(estado(noche(), "23:00", AYER).estado, "no_ha_llegado");
  assert.equal(estado(noche(), "02:00", HOY).estado, "falto");
  // Entró 22:05 ayer y sigue: trabajando de madrugada, con su avance.
  const abierto = noche({ tramos_checadas: [], tramos_abiertos: 1, entrada: t("22:05", AYER), entrada_tramo_abierto: t("22:05", AYER) });
  const e = estado(abierto, "05:00", HOY);
  assert.deepEqual([e.estado, e.trabajados, e.llegoTarde], ["trabajando", 415, null]);
  // Comida de madrugada (02:00–02:30 del horario) sin botón.
  const comiendo = noche({ tramos_checadas: [{ entrada: t("22:00", AYER), salida: t("02:05") }], tramos_abiertos: 0 });
  assert.equal(estado(comiendo, "02:20", HOY).estado, "en_comida");
  // Permiso «sale antes» desde las 04:00 (madrugada = día siguiente del turno).
  const salio = noche({ tramos_checadas: [{ entrada: t("22:00", AYER), salida: t("04:10") }], tramos_abiertos: 0,
    permisos_horas_dia: [{ tipo_horas: "sale_antes", hora_inicio: "04:00", hora_fin: "06:00" }] });
  assert.equal(estado(salio, "05:00", HOY).estado, "ya_salio");
  assert.equal(estado({ ...salio, permisos_horas_dia: [] }, "05:00", HOY).estado, "salio_antes");

  // Elección: a las 05:00 se muestra el turno de ayer (sigue); a las 07:00, el de hoy.
  const hoyNoche = noche({ id: 999, fecha: HOY });
  const dias = [diaDesdeRegistro(abierto), diaDesdeRegistro(hoyNoche), diaDesdeRegistro(reg({ fecha: AYER, id_empleado: 60 })), diaDesdeRegistro(reg({ id_empleado: 60 }))];
  const cinco = diasDeHoy(dias, HOY, a("05:00"));
  assert.deepEqual(cinco.map((d) => [d.idEmpleado, d.fecha]), [[50, AYER], [60, HOY]]);
  const cerrado = diaDesdeRegistro(noche({ tramos_checadas: [{ entrada: t("22:00", AYER), salida: t("06:00") }], tramos_abiertos: 0 }));
  assert.deepEqual(diasDeHoy([cerrado, diaDesdeRegistro(hoyNoche)], HOY, a("07:00")).map((d) => d.fecha), [HOY]);
  // Turno abierto de ayer aunque ya pasó su hora: se sigue mostrando ayer (no checó salida).
  assert.deepEqual(diasDeHoy([diaDesdeRegistro(abierto), diaDesdeRegistro(hoyNoche)], HOY, a("09:00")).map((d) => d.fecha), [AYER]);
});

test("captura manual sin tramos del reloj: usa entrada/salida de la asistencia", () => {
  assert.equal(estado(reg({ entrada: t("09:00") }), "10:00").estado, "trabajando");
  assert.equal(estado(reg({ entrada: t("09:00"), salida: t("18:00") }), "18:30").estado, "ya_salio");
});

test("resumen de tarjetas y grupos en orden (lo urgente primero)", () => {
  const ahora = a("14:10");
  const filas = [
    reg({ nombre: "Faltó" }), // 14:10 > 13:30 → faltó
    reg({ nombre: "No llega", hora_entrada_programada: "12:00:00", hora_salida_programada: "20:00:00" }), // 2 h 10 tarde, mitad 16:00
    reg({ nombre: "Trabaja", ...conTramos([], "08:55") }),
    reg({ nombre: "Tarde", ...conTramos([], "09:30") }),
    reg({ nombre: "Comida pasada", ...conTramos([["09:00", "13:00"]]), comida_checada: { salida: t("13:00"), regreso: null, minutos_programados: 60 } }),
    reg({ nombre: "Comida", ...conTramos([["09:00", "13:50"]]) }),
    reg({ nombre: "Antes", ...conTramos([["07:00", "12:00"]]), hora_salida_comida_programada: null, hora_regreso_comida_programada: null }),
    reg({ nombre: "Salió", hora_entrada_programada: "06:00:00", hora_salida_programada: "14:00:00", ...conTramos([["06:00", "14:00"]]) }),
    reg({ nombre: "Próximo", hora_entrada_programada: "16:00:00", hora_salida_programada: "23:00:00" }),
    reg({ nombre: "Descansa", tipo_registro_nombre: "Día de Descanso" }),
  ].map((r) => ({ r, e: estadoHoy(diaDesdeRegistro(r), ahora) }));
  const res = filas.map((x) => ({ ...x.e, nombre: x.r.nombre }));
  const s = resumenHoy(res);
  assert.deepEqual(s.cuenta, { trabajando: 2, tarde: 1, no_ha_llegado: 1, en_comida: 2, ya_salio: 1, salio_antes: 1, falto: 1 });
  assert.deepEqual([s.programadosHoy, s.promedioTarde, s.comidaExcedida, s.atencion, s.noLaboran], [9, 30, 1, 4, 1]);
  const grupos = agruparHoy(res, (r) => r.nombre);
  assert.deepEqual(grupos.map((g) => [g.clave, g.filas.map((r) => r.nombre)]), [
    ["atencion", ["Faltó", "No llega", "Antes", "Comida pasada"]],
    ["comida", ["Comida"]],
    ["trabajando", ["Trabaja", "Tarde"]],
    ["proximos", ["Próximo"]],
    ["salieron", ["Salió"]],
    ["no_laboran", ["Descansa"]],
  ]);
});

test("formato corto de la barra", () => {
  assert.deepEqual([duracionHoy(125), duracionHoy(480), duracionHoy(45), duracionHoy(-82), duracionHoy(4, { signo: true }), duracionHoy(null)],
    ["2 h 05", "8 h", "45 min", "−1 h 22", "+4 min", "—"]);
});

test("hora actual y fecha en la zona de la empresa", async () => {
  const { ahoraEn, textoFechaHoy } = await import("../src/lib/asistencia/hoy.mjs");
  const d = new Date("2026-11-23T17:12:00Z"); // 11:12 en CDMX
  assert.deepEqual(ahoraEn("America/Mexico_City", d), { hoy: HOY, hora: "11:12", abs: a("11:12") });
  assert.deepEqual(ahoraEn("America/Mexico_City", new Date("2026-11-23T06:30:00Z")).hora, "00:30");
  assert.equal(textoFechaHoy("America/Mexico_City", d), "Lunes 23 de noviembre");
  assert.equal(textoFechaHoy("America/Mexico_City", d, { corto: true }), "Lun 23 nov");
});
