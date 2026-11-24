// Pruebas de src/lib/asistencia/tiposGoce.mjs y src/lib/actasEstatus.mjs: «Tipos de registro: qué pasó, por qué y
// cuánto se paga». Incluye los 3 ejemplos del dueño (spec-tipos-goce): entrada 11:00 por visita al médico con goce y
// 2 h que se reponen; falta injustificada sin goce; falta justificada por permiso personal sin goce.
import assert from "node:assert/strict";
import test from "node:test";
import { desdeApi, resumen } from "../src/lib/asistencia/relojDia.mjs";
import {
  ALCANCE_TXT, OTRO, alcanceDe, aplicarTipo, camposSolicitud, cuerpoEstadoDia, cuerpoPermisoDia, errorPermiso, goceDe, gruposFila,
  listaMotivos, minutosNoTrabajados, motivoAOpcion, motivoFinal, normalizarTipo, permisoFila, permisoInicial, puedeCambiar, razonFijo,
  textoNoTrabajadas, textoNomina, textoResumen, tiposParaPermiso,
} from "../src/lib/asistencia/tiposGoce.mjs";
import { AVISO_AUDIENCIA, ESTATUS_ACTA, actaFila, avisosRespuesta, claseEstatus, etiquetaEstatus } from "../src/lib/actasEstatus.mjs";

const F = "2026-11-23";
const Z = "America/Mexico_City";
// Diego: 9:00 a.m.–5:00 p.m. con 1 h de comida (7 h programadas), como el mockup.
const horario = { entrada: "09:00", salida: "17:00", salida_comida: "13:00", regreso_comida: "14:00" };
const api = (id, e, s, o = {}) => ({ id, entrada: `${F} ${e}:00`, salida: s && `${F} ${s}:00`, entrada_reloj: `${F} ${e}:00`,
  salida_reloj: s && `${F} ${s}:00`, concepto: "jornada", motivo: null, origen: "reloj", anulado: false, ...o });
const cargar = (l) => desdeApi(l, { fecha: F, zona: Z });

const CATALOGO = [
  { id: 1, nombre: "✅ Asistencia", cuenta_como_asistencia: 1, goce_sueldo: 1, alcance: "dia", fijo_ley: 0, cambia_al_aplicar: 0 },
  { id: 2, nombre: "❌ Falta injustificada", cuenta_como_asistencia: 0, goce_sueldo: 0, alcance: "dia", fijo_ley: 1, cambia_al_aplicar: 0 },
  { id: 3, nombre: "📝 Falta justificada", cuenta_como_asistencia: 0, goce_sueldo: 0, alcance: "dia", fijo_ley: 0, cambia_al_aplicar: 1 },
  { id: 4, nombre: "⌚ Entrada después de tiempo", cuenta_como_asistencia: 1, goce_sueldo: 1, alcance: "entrada", horas_no_trabajadas: "reponen", fijo_ley: 0, cambia_al_aplicar: 1, es_permiso: 1 },
  { id: 5, nombre: "⏳ Salida antes de tiempo", cuenta_como_asistencia: 1, goce_sueldo: 1, alcance: "salida", horas_no_trabajadas: "descuentan", fijo_ley: 0, cambia_al_aplicar: 0, es_permiso: 1 },
  { id: 6, nombre: "🚶 Salida entre jornada", cuenta_como_asistencia: 1, goce_sueldo: 1, alcance: "medio", horas_no_trabajadas: "pagan", fijo_ley: 0, cambia_al_aplicar: 1, es_permiso: 1 },
  { id: 7, nombre: "🏖️ Vacaciones", cuenta_como_asistencia: 0, goce_sueldo: 1, alcance: "dia", fijo_ley: 1, descuenta_vacaciones: 1 },
  { id: 8, nombre: "❌ Sin Checar", cuenta_como_asistencia: 0, goce_sueldo: 0, alcance: "dia" },
  { id: 9, nombre: "🤖 Cerrado por Sistema", cuenta_como_asistencia: 0, alcance: "dia" },
  { id: 10, nombre: "🚫 Suspensión disciplinaria", cuenta_como_asistencia: 0, goce_sueldo: 0, alcance: "dia", fijo_ley: 1 },
];
const tipo = (id) => CATALOGO.find((t) => t.id === id);
const MOTIVOS = [{ id: 1, nombre: "Visita al médico", global: true }, { id: 2, nombre: "Permiso personal", global: true },
  { id: 6, nombre: "Otro", global: true }, { id: 20, nombre: "Junta escolar", global: false }];

test("alcance: del servidor y, si falta, por nombre como la migración", () => {
  assert.equal(alcanceDe({ alcance: "salida", nombre: "x" }), "salida");
  assert.equal(alcanceDe({ nombre: "⌚ Entrada después de tiempo" }), "entrada");
  assert.equal(alcanceDe({ nombre: "Llega tarde" }), "entrada");
  assert.equal(alcanceDe({ nombre: "Salida antes de tiempo" }), "salida");
  assert.equal(alcanceDe({ nombre: "Salida entre jornada" }), "medio");
  assert.equal(alcanceDe({ nombre: "Permiso por horas" }), "medio");
  assert.equal(alcanceDe({ nombre: "Visita al médico" }), "dia");
  assert.equal(ALCANCE_TXT.entrada, "Parte del día · al entrar");
});

test("tipo normalizado: goce, horas solo en parciales, 🔒 fijo_ley con su razón", () => {
  assert.deepEqual(normalizarTipo(tipo(4)), { id: 4, nombre: "⌚ Entrada después de tiempo", alcance: "entrada", parcial: true, goce: "con",
    horas: "reponen", cambia: true, fijo: false, razon: null });
  assert.equal(normalizarTipo(tipo(3)).horas, null, "día completo sin horas no trabajadas");
  assert.equal(normalizarTipo({ id: 11, nombre: "Salida entre jornada" }).horas, "reponen", "default reponen");
  assert.equal(normalizarTipo({ id: 12, nombre: "Nuevo" }).cambia, true, "sin la columna: se cambia (default 1)");
  assert.deepEqual(razonFijo(tipo(2)), { etiqueta: "Regla", nota: "También baja la parte proporcional del descanso semanal (art. 72)" });
  assert.equal(razonFijo(tipo(10)).nota, "Máximo 8 días y debe ser oída antes (art. 423)");
  assert.equal(razonFijo(tipo(3)), null);
  assert.equal(normalizarTipo({ ...tipo(7), cambia_al_aplicar: 1 }).cambia, false, "un fijo de ley nunca se cambia");
  assert.equal(goceDe(1), "con"); assert.equal(goceDe("0"), "sin"); assert.equal(goceDe("sin"), "sin"); assert.equal(goceDe(null), null);
});

test("qué se puede cambiar al aplicar", () => {
  assert.deepEqual(puedeCambiar(tipo(4)), { goce: true, horas: true });
  assert.deepEqual(puedeCambiar(tipo(5)), { goce: false, horas: false }, "no se cambia al aplicar");
  assert.deepEqual(puedeCambiar(tipo(3)), { goce: true, horas: false }, "día completo: solo goce");
  assert.deepEqual(puedeCambiar(tipo(2)), { goce: false, horas: false }, "fijo de ley");
});

test("grupos de la fila sin checadas: «No vino» día completo sin los del sistema; «Sí vino» los parciales", () => {
  const g = gruposFila(CATALOGO);
  assert.deepEqual(g.noVino.map((t) => t.id), [2, 3, 7, 10]);
  assert.deepEqual(g.siVino.map((t) => t.id), [4, 5, 6]);
  assert.deepEqual(gruposFila({ tiposPermiso: [{ id: 1, nombre: "Algo", borrado: 1 }] }).noVino, []);
});

test("motivos: catálogo sin «Otro» (va como «Otro…» con texto) y de vuelta al valor guardado", () => {
  assert.deepEqual(listaMotivos({ motivos: MOTIVOS }).map((m) => m.nombre), ["Visita al médico", "Permiso personal", "Junta escolar"]);
  assert.deepEqual(motivoAOpcion("Permiso personal", MOTIVOS), { opcion: "Permiso personal", texto: "" });
  assert.deepEqual(motivoAOpcion("Boda de su hermana", MOTIVOS), { opcion: OTRO, texto: "Boda de su hermana" });
  assert.deepEqual(motivoAOpcion("", MOTIVOS), { opcion: "", texto: "" });
  assert.equal(motivoFinal({ opcion: OTRO, texto: "  Boda  " }), "Boda");
  assert.equal(motivoFinal({ opcion: "Trámite", texto: "x" }), "Trámite");
});

test("minutos no trabajados por alcance (entrada, salida, en medio sin comida)", () => {
  const entra11 = cargar([api(1, "11:00", "13:00"), api(2, "13:00", "14:00", { concepto: "comida" }), api(3, "14:00", "17:00")]);
  assert.equal(minutosNoTrabajados("entrada", entra11, horario), 120);
  assert.equal(minutosNoTrabajados("dia", entra11, horario), 0);
  const sale15 = cargar([api(1, "09:00", "13:00"), api(2, "13:00", "14:00", { concepto: "comida" }), api(3, "14:00", "15:00")]);
  assert.equal(minutosNoTrabajados("salida", sale15, horario), 120);
  // Sale 10:00 y regresa 12:00, comida checada 13–14: solo cuentan las 2 h del hueco.
  const medio = cargar([api(1, "09:00", "10:00"), api(2, "12:00", "13:00"), api(3, "13:00", "14:00", { concepto: "comida" }), api(4, "14:00", "17:00")]);
  assert.equal(minutosNoTrabajados("medio", medio, horario), 120);
  // Sin checar la comida: el hueco 12:00–14:30 descuenta la comida del horario (13–14) → 1 h 30 min.
  const sinComida = cargar([api(1, "09:00", "12:00"), api(2, "14:30", "17:00")]);
  assert.equal(minutosNoTrabajados("medio", sinComida, horario), 90);
  assert.equal(minutosNoTrabajados("salida", cargar([api(1, "09:00", null)]), horario), 0, "sin salida todavía");
  assert.equal(minutosNoTrabajados("entrada", cargar([api(1, "08:50", "17:00")]), horario), 0, "llegar antes no es negativo");
  assert.equal(minutosNoTrabajados("entrada", [], horario), 0);
  assert.equal(minutosNoTrabajados("entrada", entra11, null), 0, "sin horario");
});

test("textos: resumen bajo el estado, horas no trabajadas y nómina en una línea", () => {
  assert.equal(textoResumen({ motivo: "Visita al médico", goce: "con", horas: "reponen", minutos: 120, parcial: true }),
    "Visita al médico · 2 h · las repone · con goce");
  assert.equal(textoResumen({ motivo: "Permiso personal", goce: 0 }), "Permiso personal · sin goce");
  assert.equal(textoNoTrabajadas(120, "reponen"), "2 h no trabajadas · se reponen");
  assert.equal(textoNoTrabajadas(0, "reponen"), "Sin horas no trabajadas");
  assert.equal(textoNomina({ parcial: true, goce: "con", horas: "reponen", minutos: 120 }), "Día con goce · 2 h a su cuenta de horas");
  assert.equal(textoNomina({ parcial: true, goce: "con", horas: "descuentan", minutos: 90 }), "Día con goce · se descuentan 1 h 30 min");
  assert.equal(textoNomina({ parcial: true, goce: "con", horas: "pagan", minutos: 60 }), "Día con goce · 1 h se pagan");
  assert.equal(textoNomina({ parcial: true, goce: "sin", horas: "reponen", minutos: 60 }), "Día sin goce: solo se pagan las horas trabajadas");
  assert.equal(textoNomina({ parcial: false, goce: "sin" }), "Día no pagado (sin goce)");
  assert.equal(textoNomina({ parcial: false, goce: "con" }), "Día pagado (con goce)");
});

test("ejemplo 1: Diego entra 11:00 · Entrada después de tiempo · Visita al médico · con goce · 2 h se reponen", () => {
  const regs = cargar([api(1, "11:00", "13:00"), api(2, "13:00", "14:00", { concepto: "comida" }), api(3, "14:00", "17:00")]);
  const t = tipo(4);
  const p = { ...aplicarTipo(t), motivo: "Visita al médico" };
  assert.deepEqual(p, { id_tipo: "4", motivo: "Visita al médico", goce: "con", horas: "reponen" });
  assert.equal(errorPermiso(p), "");
  const min = minutosNoTrabajados(normalizarTipo(t).alcance, regs, horario);
  assert.equal(min, 120);
  assert.equal(textoNoTrabajadas(min, p.horas), "2 h no trabajadas · se reponen");
  assert.equal(textoNomina({ parcial: true, goce: p.goce, horas: p.horas, minutos: min }), "Día con goce · 2 h a su cuenta de horas");
  assert.deepEqual(cuerpoPermisoDia(p, t), { id_tipo: 4, motivo: "Visita al médico", goce: "con", horas: "reponen" });
  // RH elige «se descuentan» (el tipo lo permite).
  assert.deepEqual(cuerpoPermisoDia({ ...p, horas: "descuentan" }, t), { id_tipo: 4, motivo: "Visita al médico", goce: "con", horas: "descuentan" });
  // Con el permiso, el reloj dice «Entró tarde con permiso» en lugar de «Retardo».
  assert.equal(resumen(regs, horario).estado.clave, "retardo");
  assert.deepEqual(resumen(regs, horario, { permiso: { alcance: "entrada" } }).estado, { texto: "Entró tarde con permiso", clave: "just" });
  assert.deepEqual(permisoFila({ permiso_dia: { tipo: "⌚ Entrada después de tiempo", motivo: "Visita al médico", goce: "con", horas: "reponen", minutos: 120 } }),
    { tipo: "⌚ Entrada después de tiempo", detalle: "Visita al médico · 2 h · las repone · con goce" });
});

test("ejemplo 2: Falta injustificada · no vino · sin goce (fija, sin motivo ni goce en el cuerpo)", () => {
  const t = tipo(2);
  assert.ok(gruposFila(CATALOGO).noVino.includes(t));
  assert.deepEqual(puedeCambiar(t), { goce: false, horas: false });
  assert.deepEqual(cuerpoEstadoDia(t, { goce: "con", requisito: null }), { id_tipo_permiso: 2 }, "goce ignorado: no se cambia al aplicar");
  assert.equal(textoNomina({ parcial: false, goce: normalizarTipo(t).goce }), "Día no pagado (sin goce)");
});

test("ejemplo 3: Falta justificada · Permiso personal · sin goce", () => {
  const t = tipo(3);
  assert.deepEqual(cuerpoEstadoDia(t, { motivo: "Permiso personal", goce: "sin", requisito: "motivo" }),
    { id_tipo_permiso: 3, motivo: "Permiso personal", motivo_permiso: "Permiso personal", goce: "sin" });
  assert.deepEqual(cuerpoEstadoDia(t, { motivo: "Permiso personal", goce: "con", requisito: "motivo" }).goce, "con", "RH puede darle goce");
  assert.deepEqual(permisoFila({ motivo_permiso: "Permiso personal", goce_sueldo: 0 }), { tipo: "", detalle: "Permiso personal · sin goce" });
});

test("tipo que no se cambia al aplicar: el cuerpo no lleva goce ni horas", () => {
  const p = { ...aplicarTipo(tipo(5)), motivo: "Trámite", goce: "sin", horas: "pagan" };
  assert.deepEqual(cuerpoPermisoDia(p, tipo(5)), { id_tipo: 5, motivo: "Trámite" });
  assert.equal(cuerpoPermisoDia(null, tipo(5)), null);
  assert.equal(errorPermiso({ id_tipo: "5", motivo: "" }), "Elige el motivo del permiso.");
});

test("permiso guardado en el reloj → sección «Permiso del día»", () => {
  const parciales = CATALOGO.filter((t) => t.alcance !== "dia");
  assert.deepEqual(permisoInicial({ id_tipo: 6, motivo: "Trámite", goce: "con", horas: "pagan", minutos_no_trabajados: 60 }, parciales),
    { id_tipo: "6", motivo: "Trámite", goce: "con", horas: "pagan" });
  assert.deepEqual(permisoInicial(null, parciales, 4), { id_tipo: "4", motivo: "", goce: "con", horas: "reponen" });
  assert.equal(permisoInicial(null, parciales), null);
});

test("Permisos a futuro: tipos que se piden y campos de la solicitud (RH y empleado)", () => {
  assert.deepEqual(tiposParaPermiso(CATALOGO).map((t) => t.id), [3, 4, 5, 6]);
  // Caso del dueño: falta justificada, permiso personal, sin goce.
  assert.deepEqual(camposSolicitud(tipo(3), { motivo: "Permiso personal", goce: "sin" }), { motivo_permiso: "Permiso personal", goce: "sin" });
  assert.deepEqual(camposSolicitud(tipo(4), { motivo: "Visita al médico", goce: "con", horas: "descuentan" }),
    { motivo_permiso: "Visita al médico", goce: "con", horas_no_trabajadas: "descuentan", tipo_horas: "llega_tarde", tratamiento: "rebaja" });
  assert.deepEqual(camposSolicitud(tipo(5), { motivo: "Trámite", goce: "sin", horas: "pagan" }),
    { motivo_permiso: "Trámite", horas_no_trabajadas: "descuentan", tipo_horas: "sale_antes", tratamiento: "rebaja" }, "bloqueado: lo del tipo");
  assert.deepEqual(camposSolicitud(tipo(6), { motivo: "Trámite", horas: "pagan" }).tratamiento, undefined, "«se pagan» sin tratamiento viejo");
  assert.deepEqual(camposSolicitud(tipo(3), { motivo: "Permiso personal", goce: "con", rh: false }), { motivo_permiso: "Permiso personal" },
    "el empleado no decide el goce");
});

test("actas: estatus nuevos con etiqueta, enlace desde la fila y aviso del art. 423", () => {
  assert.deepEqual(ESTATUS_ACTA.map((e) => e.value), ["borrador", "elaborada", "notificada", "cerrada", "cancelada"]);
  assert.equal(etiquetaEstatus("BORRADOR"), "Borrador");
  assert.equal(etiquetaEstatus("cancelada"), "Cancelada");
  assert.match(claseEstatus("borrador"), /slate/);
  assert.deepEqual(actaFila({ acta: { id: 77, estatus: "borrador" } }), { texto: "📄 Acta en borrador", href: "/panel/actas-administrativas?acta=77", estatus: "borrador" });
  assert.equal(actaFila({ acta: { id: 77, estatus: "elaborada" } }).texto, "📄 Acta elaborada");
  assert.equal(actaFila({ acta: null }), null);
  assert.match(AVISO_AUDIENCIA, /oída[\s\S]*art\. 423/);
  assert.deepEqual(avisosRespuesta({ aviso: "Se creó un acta en borrador." }), ["Se creó un acta en borrador."]);
  assert.deepEqual(avisosRespuesta({ avisos: ["A", { texto: "B" }, "A", ""] }), ["A", "B"]);
  assert.deepEqual(avisosRespuesta({ ok: true }), []);
});

test("ejemplo real del backend (GET /:id/reloj con permiso_dia): mismo cálculo y mismo cuerpo", async () => {
  const { readFile } = await import("node:fs/promises");
  const r = JSON.parse(await readFile(new URL("./fixtures/reloj-tipos-goce.json", import.meta.url), "utf8"));
  const regs = desdeApi(r.registros, { fecha: r.asistencia.fecha, zona: Z });
  const p = permisoInicial(r.permiso_dia, r.tipos_parciales);
  assert.deepEqual(p, { id_tipo: "44", motivo: "Visita al médico", goce: "con", horas: "reponen" });
  const t = r.tipos_parciales.find((x) => x.id === 44);
  // Sin comida checada (hueco 13–14): para «entrada» solo cuenta la llegada; igual que el servidor.
  assert.equal(minutosNoTrabajados(normalizarTipo(t).alcance, regs, r.horario), r.permiso_dia.minutos_no_trabajados);
  assert.deepEqual(cuerpoPermisoDia(p, t), { id_tipo: 44, motivo: "Visita al médico", goce: "con", horas: "reponen" });
  assert.equal(resumen(regs, r.horario, { permiso: { alcance: r.permiso_dia.alcance } }).estado.texto, r.resumen.estado.texto);
  assert.deepEqual(listaMotivos(r.motivos_permiso).map((m) => m.nombre), ["Visita al médico", "Permiso personal", "Trámite"]);
});
