// Pruebas de src/lib/asistencia/quePasoMotivo.mjs: «Dos campos: Qué pasó (tipo) y Motivo (por qué), con el goce en el
// motivo» (spec-quepaso-motivo, aprobado por Diego 24/11/2026). Ejemplos del dueño: «Inasistencia» sin motivo =
// injustificada (acta en borrador); «Inasistencia · Permiso personal · sin goce»; «Entrada tarde · Visita al médico ·
// 2 h · las repone». Tipos ocultos (captura 0) solo en el historial; íconos por rol.
import assert from "node:assert/strict";
import test from "node:test";
import { desdeApi } from "../src/lib/asistencia/relojDia.mjs";
import { minutosNoTrabajados } from "../src/lib/asistencia/tiposGoce.mjs";
import {
  ASISTENCIA, OTRO_MOTIVO, aplicado, camposSolicitud, capturaDe, claseDe, cuerpoEstadoDia, cuerpoPermisoDia, estadoMotivo, faltaPar,
  motivoGuardado, motivosCaptura, normalizarMotivo, opcionesMotivo, opcionesTipo, parDesdeFila, parDesdePermiso, parDesdeSolicitud,
  parVacio, reglas, rolDe, textoAplicado, textoEstadoFila, tiposCaptura, tiposPermisoCaptura,
} from "../src/lib/asistencia/quePasoMotivo.mjs";

// Catálogo como lo deja la migración 20261209 (con `rol` y `captura` del servidor).
const T = (id, nombre, rol, o = {}) => ({ id, nombre, rol, captura: 1, id_empresa: null, alcance: ["entrada", "salida", "medio"].includes(rol) ? rol : "dia",
  goce_sueldo: 0, fijo_ley: rol === "ley" ? 1 : 0, ...o });
const TIPOS = [
  T(1, "Asistencia", "asistencia", { goce_sueldo: 1 }),
  T(2, "Inasistencia", "inasistencia"),
  T(3, "Inasistencia Justificada", "heredado", { captura: 0 }),
  T(4, "Entrada tarde", "entrada", { goce_sueldo: 1 }),
  T(5, "Salida temprano", "salida", { goce_sueldo: 1 }),
  T(6, "Salir en medio turno", "medio", { goce_sueldo: 1 }),
  T(7, "Vacaciones", "ley", { goce_sueldo: 1, descuenta_vacaciones: 1 }),
  T(8, "Incapacidad IMSS", "ley"),
  T(9, "Sin Checar", "sistema", { captura: 0 }),
  T(10, "Visita al Médico", "heredado", { captura: 0, goce_sueldo: 0 }),
  T(11, "Home office", "propio", { id_empresa: 10, goce_sueldo: 1, es_permiso: 1 }),
];
const tipo = (id) => TIPOS.find((t) => t.id === id);
// Motivos efectivos de la empresa (GET /checador/motivos-permiso).
const M = (id, nombre, goce, horas, cambia = 1, o = {}) => ({ id, nombre, global: true, goce, horas, cambia_al_aplicar: cambia, personalizado: false, oculto: false, ...o });
const MOTIVOS = { ok: true, motivos: [
  M(1, "Visita al médico", "sin", "reponen"), M(2, "Permiso personal", "sin", "reponen"), M(3, "Permiso laboral", "con", "pagan", 0),
  M(4, "Capacitación", "con", "pagan", 1, { personalizado: true }), M(5, "Trámite", "sin", "reponen", 1, { oculto: true }),
  M(9, "Otro", "sin", "reponen"), M(20, "Junta escolar", "sin", "descuentan", 1, { global: false }),
] };
const F = "2026-11-23";
const horario = { entrada: "09:00", salida: "17:00", salida_comida: "13:00", regreso_comida: "14:00" };

test("rol: el del servidor; si no viene, por nombre exacto y alcance (como la migración)", () => {
  assert.equal(rolDe(tipo(4)), "entrada");
  assert.equal(rolDe({ nombre: "✅ Asistencia" }), "asistencia");
  assert.equal(rolDe({ nombre: "❌ Inasistencia Injustificada" }), "inasistencia");
  assert.equal(rolDe({ nombre: "Falta injustificada", fijo_ley: 1 }), "inasistencia", "la regla de la falta no la vuelve «ley»");
  assert.equal(rolDe({ nombre: "❌ Sin Checar" }), "sistema");
  assert.equal(rolDe({ nombre: "🤖 Cerrado por Sistema" }), "sistema");
  assert.equal(rolDe({ nombre: "🏖️ Vacaciones", fijo_ley: 1 }), "ley");
  assert.equal(rolDe({ nombre: "⌚ Entrada después de tiempo" }), "entrada");
  assert.equal(rolDe({ nombre: "Salida antes de tiempo" }), "salida");
  assert.equal(rolDe({ nombre: "Salida entre jornada" }), "medio");
  assert.equal(rolDe({ nombre: "Salir en medio turno" }), "medio");
  assert.equal(rolDe({ nombre: "Salida temprano" }), "salida");
  assert.equal(rolDe({ nombre: "Llega tarde", alcance: "entrada", id_empresa: 10 }), "propio");
  assert.equal(rolDe({ nombre: "Visita al Médico" }), "heredado");
  assert.equal(rolDe({ nombre: "Entrada tarde", rol: "inventado", alcance: "entrada" }), "entrada", "un rol desconocido usa el respaldo");
});

test("captura: los ocultos (captura 0) no se ofrecen; sin el campo, todo menos lo del sistema", () => {
  assert.equal(capturaDe(tipo(3)), false);
  assert.equal(capturaDe(tipo(2)), true);
  assert.equal(capturaDe({ nombre: "Visita al Médico" }), true, "servidor viejo: como antes");
  assert.equal(capturaDe({ nombre: "Sin Checar" }), false);
  assert.equal(capturaDe({ nombre: "X", captura: "0" }), false);
  assert.equal(capturaDe({ nombre: "X", borrado: 1 }), false);
});

test("Qué pasó: Asistencia, Inasistencia, parciales, propios y ley; los ocultos solo si ya están guardados", () => {
  const ids = (l) => l.map((t) => t.id);
  assert.deepEqual(ids(tiposCaptura(TIPOS)), [2, 4, 5, 6, 11, 7, 8]);
  assert.deepEqual(opcionesTipo(tiposCaptura(TIPOS)).map((o) => o.label),
    ["Asistencia", "Inasistencia", "Entrada tarde", "Salida temprano", "Salir en medio turno", "Home office", "Vacaciones 🔒", "Incapacidad IMSS 🔒"]);
  assert.equal(opcionesTipo(tiposCaptura(TIPOS))[0].value, ASISTENCIA);
  assert.deepEqual(ids(tiposCaptura(TIPOS, { conChecadas: true })), [4, 5, 6], "con checadas: solo los parciales");
  const conViejo = tiposCaptura(TIPOS, { actual: 10 });
  assert.equal(conViejo.at(-1).id, 10);
  assert.equal(conViejo.at(-1)._historial, true, "el registro viejo se ve tal cual");
  assert.deepEqual(ids(tiposCaptura(TIPOS, { actual: 9 })), [2, 4, 5, 6, 11, 7, 8], "«Sin checar» nunca es opción");
  assert.deepEqual(ids(tiposPermisoCaptura(TIPOS)), [2, 4, 5, 6, 11], "Permisos (RH)");
  assert.deepEqual(ids(tiposPermisoCaptura(TIPOS, { conVacaciones: true })), [2, 4, 5, 6, 11, 7], "Permisos (empleado): también vacaciones");
  assert.deepEqual(TIPOS.map(claseDe), ["asistencia", "inasistencia", "dia", "parcial", "parcial", "parcial", "ley", "ley", "sistema", "dia", "dia"]);
});

test("Motivo: visibles con su configuración, «Otro…» al final; si el catálogo no trae «Otro» se ofrece igual", () => {
  assert.deepEqual(opcionesMotivo(MOTIVOS).map((o) => o.label),
    ["Visita al médico", "Permiso personal", "Permiso laboral", "Capacitación", "Junta escolar", "Otro…"]);
  assert.equal(opcionesMotivo(MOTIVOS).at(-1).value, "9");
  const m = normalizarMotivo(MOTIVOS.motivos[2]);
  assert.deepEqual([m.goce, m.horas, m.cambia, m.global], ["con", "pagan", false, true]);
  assert.equal(normalizarMotivo({ id: 30, nombre: "Boda", activo: false }).oculto, true, "propio desactivado = oculto");
  const sinOtro = motivosCaptura([{ id: 1, nombre: "Visita al médico", global: true }]);
  assert.equal(sinOtro.at(-1).id, OTRO_MOTIVO);
  assert.equal(normalizarMotivo({ id: 1, nombre: "X" }).cambia, true, "servidor viejo: RH puede cambiar el goce");
  assert.deepEqual(motivoGuardado(MOTIVOS, { id: 2 }), { motivo: "2", texto: "" });
  assert.deepEqual(motivoGuardado(MOTIVOS, { nombre: "permiso personal" }), { motivo: "2", texto: "" }, "por nombre si no hay id");
  assert.deepEqual(motivoGuardado(MOTIVOS, { id: 9, nombre: "Cita en el banco" }), { motivo: "9", texto: "Cita en el banco" });
  assert.deepEqual(motivoGuardado(MOTIVOS, { nombre: "Cita en el banco" }), { motivo: "9", texto: "Cita en el banco" }, "texto libre = «Otro…»");
});

test("ejemplo 1: Inasistencia sin motivo = injustificada · sin goce · acta en borrador · cuerpo solo con el tipo", () => {
  const par = parVacio(2);
  const r = reglas(tipo(2), null);
  assert.deepEqual([r.motivoVisible, r.vacioMotivo, r.acta, r.goce, r.goceCambia, r.abreReloj], [true, "Injustificada", true, "sin", false, false]);
  assert.equal(faltaPar(par, tipo(2), MOTIVOS), "");
  assert.deepEqual(cuerpoEstadoDia(par, tipo(2), MOTIVOS), { id_tipo_permiso: 2 });
  assert.match(textoAplicado(par, tipo(2), MOTIVOS), /acta en borrador/);
  assert.equal(estadoMotivo({ id_tipo_permiso: 2, goce_sueldo: 0, motivo_permiso: null }, TIPOS), "❌ Inasistencia injustificada");
});

test("ejemplo 2: Inasistencia · Permiso personal · sin goce (goce del motivo; RH lo cambia si el motivo lo permite)", () => {
  const par = { ...parVacio(2), motivo: "2" };
  const { r, goce } = aplicado(par, tipo(2), MOTIVOS);
  assert.deepEqual([r.acta, goce, r.goceCambia], [false, "sin", true]);
  assert.deepEqual(cuerpoEstadoDia(par, tipo(2), MOTIVOS), { id_tipo_permiso: 2, id_motivo: 2, goce: "sin" });
  assert.deepEqual(cuerpoEstadoDia({ ...par, goce: "con" }, tipo(2), MOTIVOS), { id_tipo_permiso: 2, id_motivo: 2, goce: "con" });
  // Permiso laboral: con goce y no se cambia al aplicar → 🔒 y el cuerpo no lleva goce (lo pone el servidor).
  const laboral = { ...parVacio(2), motivo: "3", goce: "sin" };
  assert.deepEqual([aplicado(laboral, tipo(2), MOTIVOS).goce, aplicado(laboral, tipo(2), MOTIVOS).r.goceCambia], ["con", false]);
  assert.deepEqual(cuerpoEstadoDia(laboral, tipo(2), MOTIVOS), { id_tipo_permiso: 2, id_motivo: 3 });
  // «Otro…» con texto: id de «Otro» + el texto; sin texto no se guarda.
  assert.equal(faltaPar({ ...parVacio(2), motivo: "9" }, tipo(2), MOTIVOS), "Escribe el motivo.");
  assert.deepEqual(cuerpoEstadoDia({ ...parVacio(2), motivo: "9", texto: " Cita en el banco " }, tipo(2), MOTIVOS),
    { id_tipo_permiso: 2, id_motivo: 9, motivo_permiso: "Cita en el banco", goce: "sin" });
  assert.equal(estadoMotivo({ id_tipo_permiso: 2, goce_sueldo: 0, motivo_permiso: "Permiso personal" }, TIPOS), "📝 Inasistencia · Permiso personal · sin goce");
  // Guardado → par (el goce elegido distinto al del motivo se conserva).
  assert.deepEqual(parDesdeFila({ id_tipo_permiso: 2, id_motivo_permiso: 2, motivo_permiso: "Permiso personal", goce_sueldo: 1 }, TIPOS, MOTIVOS),
    { ...parVacio(2), motivo: "2", goce: "con" });
  assert.deepEqual(parDesdeFila({ id_tipo_permiso: 9 }, TIPOS, MOTIVOS), parVacio(), "sin checar: sin tipo elegido");
});

test("días de ley: sin motivo, goce fijo del tipo; la incapacidad pide folio", () => {
  const r = reglas(tipo(8), null);
  assert.deepEqual([r.motivoVisible, r.folio, r.goce, r.goceCambia], [false, true, "sin", false]);
  assert.equal(faltaPar(parVacio(8), tipo(8), MOTIVOS), "Escribe el folio de la incapacidad.");
  assert.deepEqual(cuerpoEstadoDia({ ...parVacio(8), folio: " AB-12 ", motivo: "2" }, tipo(8), MOTIVOS), { id_tipo_permiso: 8, folio: "AB-12" },
    "un motivo que quedó de antes no viaja");
  assert.deepEqual(cuerpoEstadoDia(parVacio(7), tipo(7), MOTIVOS), { id_tipo_permiso: 7 });
  assert.equal(estadoMotivo({ id_tipo_permiso: 7 }, TIPOS), "📅 Vacaciones");
  assert.equal(estadoMotivo({ id_tipo_permiso: 7 }, TIPOS, { ley: false }), null);
});

test("ejemplo 3: Entrada tarde · Visita al médico · 2 h · las repone (reloj con permiso)", () => {
  const regs = desdeApi([{ id: 1, entrada: `${F} 11:00:00`, salida: `${F} 13:00:00`, concepto: "jornada", origen: "reloj", anulado: false },
    { id: 2, entrada: `${F} 13:00:00`, salida: `${F} 14:00:00`, concepto: "comida", origen: "reloj", anulado: false },
    { id: 3, entrada: `${F} 14:00:00`, salida: `${F} 17:00:00`, concepto: "jornada", origen: "reloj", anulado: false }], { fecha: F, zona: "America/Mexico_City" });
  assert.equal(minutosNoTrabajados("entrada", regs, horario), 120);
  const par = { ...parVacio(4), motivo: "1" };
  const { r, goce, horas } = aplicado(par, tipo(4), MOTIVOS);
  assert.deepEqual([r.clase, r.abreReloj, goce, horas, r.horasCambian], ["parcial", true, "con", "reponen", true]);
  assert.deepEqual(cuerpoPermisoDia(par, tipo(4), MOTIVOS), { id_tipo: 4, id_motivo: 1, motivo: "Visita al médico", horas: "reponen" });
  assert.deepEqual(cuerpoPermisoDia({ ...par, horas: "descuentan" }, tipo(4), MOTIVOS), { id_tipo: 4, id_motivo: 1, motivo: "Visita al médico", horas: "descuentan" });
  // Sin motivo no hay permiso: retardo como siempre (permiso_dia null).
  assert.equal(cuerpoPermisoDia(parVacio(4), tipo(4), MOTIVOS), null);
  assert.equal(reglas(tipo(4), null).vacioMotivo, "Sin permiso");
  // Motivo que no se cambia al aplicar: no viajan horas.
  assert.deepEqual(cuerpoPermisoDia({ ...parVacio(5), motivo: "3", horas: "reponen" }, tipo(5), MOTIVOS), { id_tipo: 5, id_motivo: 3, motivo: "Permiso laboral" });
  assert.equal(cuerpoPermisoDia({ ...parVacio(2), motivo: "1" }, tipo(2), MOTIVOS), null, "un tipo de día completo no es permiso del día");
  // Lista: «⌚ Entrada tarde · Visita al médico · 2 h · las repone».
  const fila = { checadas_vivas: 3, permiso_dia: { id_tipo: 4, tipo: "Entrada tarde", id_motivo: 1, motivo: "Visita al médico", goce: "con", horas: "reponen", minutos: 120, alcance: "entrada" } };
  assert.equal(estadoMotivo(fila, TIPOS), "⌚ Entrada tarde · Visita al médico · 2 h · las repone");
  assert.equal(estadoMotivo(fila), "⌚ Entrada tarde · Visita al médico · 2 h · las repone", "sin catálogo: rol por el alcance");
  assert.equal(estadoMotivo({ permiso_dia: { tipo: "⏳ Salida antes de tiempo", motivo: "Trámite", horas: "descuentan", minutos_no_trabajados: 90, alcance: "salida" } }),
    "⏳ Salida antes de tiempo · Trámite · 1 h 30 min · se descuentan");
  // Guardado → par del reloj.
  assert.deepEqual(parDesdePermiso(fila.permiso_dia, MOTIVOS), { ...parVacio(4), motivo: "1" });
  assert.deepEqual(parDesdePermiso({ id_tipo: 4, motivo: "Visita al médico", horas: "descuentan" }, MOTIVOS), { ...parVacio(4), motivo: "1", horas: "descuentan" });
  assert.equal(parDesdePermiso(null, MOTIVOS), null);
});

test("historial: un tipo oculto se muestra tal cual (estado de siempre), sin ícono por nombre", () => {
  const viejo = { id_tipo_permiso: 10, tipo_registro_nombre: "Visita al Médico", estado_calculado: { texto: "Visita al Médico", clave: "just" } };
  assert.equal(estadoMotivo(viejo, TIPOS), null);
  assert.equal(textoEstadoFila(viejo, TIPOS, viejo.estado_calculado), "📝 Visita al Médico");
  assert.equal(textoEstadoFila({ tipo_registro_nombre: "Asistencia" }, TIPOS, { texto: "Asistió", clave: "ok" }), "✅ Asistió");
});

test("Permisos: el par y los campos de la solicitud (RH decide el goce si se puede; el empleado no)", () => {
  const par = { ...parVacio(2), motivo: "2", goce: "con" };
  assert.deepEqual(camposSolicitud(par, tipo(2), MOTIVOS), { id_motivo_permiso: 2, goce: "con" });
  assert.deepEqual(camposSolicitud(par, tipo(2), MOTIVOS, { rh: false }), { id_motivo_permiso: 2 });
  assert.deepEqual(camposSolicitud({ ...parVacio(2), motivo: "9", texto: "Boda de mi hermana" }, tipo(2), MOTIVOS, { rh: false }),
    { id_motivo_permiso: 9, motivo_permiso: "Boda de mi hermana" });
  assert.deepEqual(camposSolicitud({ ...parVacio(4), motivo: "1", horas: "descuentan" }, tipo(4), MOTIVOS),
    { id_motivo_permiso: 1, horas_no_trabajadas: "descuentan", tipo_horas: "llega_tarde", tratamiento: "rebaja" });
  assert.deepEqual(camposSolicitud({ ...parVacio(4), motivo: "1", horas: "descuentan" }, tipo(4), MOTIVOS, { rh: false }),
    { id_motivo_permiso: 1, horas_no_trabajadas: "reponen", tipo_horas: "llega_tarde", tratamiento: "repone" }, "el empleado no cambia las horas");
  assert.equal(faltaPar(parVacio(2), tipo(2), MOTIVOS, { motivoObligatorio: true }), "Elige el motivo del permiso.");
  assert.equal(faltaPar(parVacio(7), tipo(7), MOTIVOS, { motivoObligatorio: true }), "", "vacaciones sin motivo");
  assert.deepEqual(parDesdeSolicitud({ id_tipo_permiso: 2, id_motivo_permiso: 2, motivo_permiso: "Permiso personal", goce: "sin" }, MOTIVOS),
    { ...parVacio(2), motivo: "2", goce: "sin" });
});
