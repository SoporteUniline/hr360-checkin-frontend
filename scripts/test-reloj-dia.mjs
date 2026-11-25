// Pruebas de src/lib/asistencia/relojDia.mjs: «el día se corrige en el reloj».
import assert from "node:assert/strict";
import test from "node:test";
import {
  agregarComida, agregarRegistro, aMin, claseEstado, resumenServidor, conAutoriza, cuerpoPut, desdeApi, diaFila, durTexto, editado, errorDe, errores,
  erroresPorRenglon, estadoFila, extraFila, horarioNormal, minDeCampo, minutosProgramados, nuevoRenglon, ordenar,
  origenTexto, etiquetaQuitar, planMasivo, puedeComida, quitarORestaurar, requisitoEstado, resumen, separarExtra, textoConIcono, tiposEstadoDia, gruposEstadoDia,
  esMotivoOtro, errorMotivoOtro, motivoOtro, textoMotivoOtro, MAX_TEXTO_OTRO,
} from "../src/lib/asistencia/relojDia.mjs";
import { CAMPOS_HORA, ajustarPorPermiso, errorHoraPermiso, horasDeChecadas, horasPermiso, horasValidas } from "../src/lib/asistencia/horaPermiso.mjs";
import { minutosNoTrabajados } from "../src/lib/asistencia/tiposGoce.mjs";

const F = "2026-11-23";
const Z = "America/Mexico_City";
const horario = { entrada: "09:00", salida: "16:00", salida_comida: "13:00", regreso_comida: "14:00" };
const api = (id, entrada, salida, o = {}) => ({ id, entrada: entrada && `${F} ${entrada}:00`, salida: salida && `${F} ${salida}:00`,
  entrada_reloj: entrada && `${F} ${entrada}:00`, salida_reloj: salida && `${F} ${salida}:00`, concepto: "jornada", motivo: null,
  origen: "reloj", anulado: false, id_autoriza: null, autoriza_no: false, ...o });
const cargar = (lista) => desdeApi(lista, { fecha: F, zona: Z });

test("duración, horas y horario programado", () => {
  assert.equal(durTexto(380), "6 h 20 min");
  assert.equal(durTexto(45), "45 min");
  assert.equal(durTexto(120), "2 h");
  assert.equal(durTexto(0), "—");
  assert.equal(aMin("09:18"), 558);
  assert.equal(minutosProgramados(horario), 360);
  assert.equal(minutosProgramados({ entrada: "22:00", salida: "06:00" }), 480, "nocturno");
});

test("resumen: retardo, comida, trabajadas y extra sin separar", () => {
  const regs = cargar([api(1, "09:18", "13:00"), api(2, "13:00", "13:40", { concepto: "comida" }), api(3, "13:40", "16:08")]);
  const c = resumen(regs, horario);
  assert.equal(c.estado.texto, "Retardo +18 min");
  assert.equal(c.comida, 40);
  assert.equal(c.trabajadas, 222 + 148);
  assert.equal(c.sinSeparar, 0, "8 min después de la salida no se separa");
  const mario = cargar([api(1, "07:51", "13:00"), api(2, "13:00", "14:00", { concepto: "comida" }), api(3, "14:00", "20:02")]);
  const m = resumen(mario, { entrada: "08:00", salida: "17:00", salida_comida: "13:00", regreso_comida: "14:00" });
  assert.equal(m.sinSeparar, 182);
  assert.equal(m.extraPorAutorizar, 182);
  assert.equal(m.estado.texto, "Asistió");
});

test("resumen: sin salida, salió antes, permiso del catálogo y día sin checadas", () => {
  assert.equal(resumen(cargar([api(1, "08:55", null)]), horario).estado.clave, "sinsalida");
  assert.equal(resumen(cargar([api(1, "09:00", "10:30")]), horario).estado.texto, "Salió antes −5 h 30 min");
  const conPermiso = cargar([api(1, "09:24", "16:05", { motivo: "tp:31" })]);
  assert.deepEqual(resumen(conPermiso, horario).estado, { texto: "Entró tarde con permiso", clave: "just" });
  assert.equal(resumen([], horario, { estadoDia: { texto: "Vacaciones", clave: "vacaciones" } }).estado.texto, "Vacaciones");
  assert.equal(resumen(cargar([api(1, "09:05", "16:00")]), horario, { tolerancia: 0 }).estado.texto, "Retardo +5 min", "tolerancia de la empresa");
});

test("validación por renglón como el mockup: motivo, salida > entrada, encimados, autoriza y anular", () => {
  let regs = cargar([api(1, "09:18", "16:08")]);
  assert.deepEqual(errores(regs), {});
  regs = regs.map((r) => ({ ...r, ini: aMin("09:00") }));
  assert.equal(errorDe(regs[0], regs), "Cambiaste la hora: elige el motivo.");
  regs = regs.map((r) => ({ ...r, motivo: "olvido" }));
  assert.equal(errorDe(regs[0], regs), "");
  const mal = [{ ...regs[0], fin: aMin("08:00") }];
  assert.equal(errorDe(mal[0], mal), "La salida debe ser después de la entrada.");
  const enc = [...regs, { ...nuevoRenglon(aMin("15:00"), aMin("17:00")), motivo: "olvido" }];
  assert.equal(errorDe(enc[1], enc), "Se encima con otro registro.");
  const extra = [{ ...nuevoRenglon(aMin("16:10"), aMin("18:00"), "extra"), motivo: "olvido" }];
  assert.equal(errorDe(extra[0], extra), "Hora extra: falta quién autoriza.");
  assert.equal(errorDe({ ...extra[0], ...conAutoriza("no") }, extra), "");
  const anul = quitarORestaurar(cargar([api(1, "09:00", "16:00")]), "r1");
  assert.equal(errorDe(anul[0], anul), "Para anular una checada del reloj elige el motivo.");
  assert.equal(quitarORestaurar(anul, "r1")[0].anulado, false, "restaurar");
  const agregado = [nuevoRenglon(aMin("09:00"), null)];
  assert.equal(errorDe(agregado[0], agregado), "Falta la salida.");
  assert.equal(errorDe(cargar([api(1, "09:00", null)])[0], []), "", "lo del reloj sin salida y sin tocar puede quedar abierto");
  const quitado = quitarORestaurar(agregado, agregado[0].k);
  assert.equal(quitado.length, 0, "lo agregado y no guardado se quita (no se manda)");
  const guardado = cargar([api(9, "18:00", "19:00", { origen: "manual", motivo: "olvido" })]);
  const quitadoGuardado = quitarORestaurar(guardado, "r9");
  assert.equal(etiquetaQuitar(guardado[0]), "Quitar");
  assert.equal(cuerpoPut(quitadoGuardado, { fecha: F, zona: Z }).registros[0].anulado, true, "lo agregado ya guardado viaja con anulado: true");
});

test("cargar horario, agregar, comida y separar extra", () => {
  const h = horarioNormal(horario, "olvido");
  assert.deepEqual(h.map((r) => [r.ini, r.fin, r.concepto, r.motivo]), [[540, 780, "jornada", "olvido"], [780, 840, "comida", "olvido"], [840, 960, "jornada", "olvido"]]);
  assert.deepEqual(errores(h), {});
  assert.deepEqual(horarioNormal({ entrada: "22:00", salida: "06:00" }).map((r) => [r.ini, r.fin]), [[1320, 1800]], "nocturno al día siguiente");
  const uno = agregarRegistro([], horario);
  assert.deepEqual([uno[0].ini, uno[0].fin, uno[0].concepto], [540, 960, "jornada"]);
  const tras = agregarRegistro(cargar([api(1, "09:00", "16:00")]), horario);
  assert.deepEqual([tras[1].ini, tras[1].fin, tras[1].concepto], [960, null, "extra"]);
  const base = cargar([api(1, "09:00", "16:00")]);
  assert.equal(puedeComida(base), true);
  assert.deepEqual(agregarComida(base, horario).slice(-1).map((r) => [r.ini, r.fin, r.concepto]), [[780, 840, "comida"]]);
  const mario = cargar([api(1, "08:00", "20:02")]);
  const sep = separarExtra(mario, { entrada: "08:00", salida: "17:00" });
  assert.deepEqual(sep.map((r) => [r.ini, r.fin, r.concepto]), [[480, 1020, "jornada"], [1020, 1202, "extra"]]);
  assert.equal(editado(sep[0]), false, "separar no pide motivo");
  assert.equal(errorDe(sep[1], sep), "Hora extra: falta quién autoriza.");
  assert.equal(resumen(sep, { entrada: "08:00", salida: "17:00" }).extraPorAutorizar, 182);
});

test("PUT con el cuerpo exacto del contrato y errores del servidor por renglón", () => {
  let regs = cargar([api(7, "09:18", "16:08"), api(8, "16:30", "18:00", { concepto: "extra", id_autoriza: 3 })]);
  regs = regs.map((r) => (r.id === 7 ? { ...r, ini: aMin("09:00"), motivo: "olvido" } : r));
  regs = [...regs, { ...nuevoRenglon(aMin("18:00"), aMin("19:00"), "extra", "olvido"), ...conAutoriza("no") }];
  const orden = ordenar(regs);
  assert.deepEqual(cuerpoPut(orden, { fecha: F, zona: Z }), { registros: [
    { id: 7, entrada: `${F} 09:00:00`, salida: `${F} 16:08:00`, concepto: "jornada", motivo: "olvido", anulado: false, id_autoriza: null, autoriza_no: false },
    { id: 8, entrada: `${F} 16:30:00`, salida: `${F} 18:00:00`, concepto: "extra", motivo: null, anulado: false, id_autoriza: 3, autoriza_no: false },
    { entrada: `${F} 18:00:00`, salida: `${F} 19:00:00`, concepto: "extra", motivo: "olvido", anulado: false, id_autoriza: null, autoriza_no: true },
  ] });
  const porRenglon = erroresPorRenglon({ error: "Revisa", errores: [{ indice: 2, error: "Se encima." }] }, orden);
  assert.deepEqual(porRenglon, { [orden[2].k]: "Se encima." });
});

test("zona de la empresa y turno nocturno al ir y volver", () => {
  const tj = desdeApi([api(1, "09:00", "16:00")], { fecha: F, zona: "America/Tijuana" });
  assert.equal(tj[0].ini, 7 * 60, "09:00 CDMX son 07:00 en Tijuana");
  assert.deepEqual(cuerpoPut(tj, { fecha: F, zona: "America/Tijuana" }).registros[0].entrada, `${F} 09:00:00`);
  const noche = cargar([{ ...api(1, "22:00", null), salida: "2026-11-24 06:05:00", salida_reloj: "2026-11-24 06:05:00" }]);
  assert.equal(noche[0].fin, 1440 + 365);
  assert.equal(cuerpoPut(noche, { fecha: F, zona: Z }).registros[0].salida, "2026-11-24 06:05:00");
  assert.equal(minDeCampo("06:00", { referencia: 1320, nocturno: true }), 1440 + 360);
  assert.equal(minDeCampo("06:00", { referencia: 540, nocturno: false }), 360);
  assert.equal(origenTexto({ ...noche[0], ini: 1330 }), "reloj: 10:00 p.m.");
});

test("estado del día: catálogo sin asistencia, qué pide cada tipo y masivos", () => {
  const tipos = { tiposPermiso: [
    { id: 1, nombre: "Asistencia", cuenta_como_asistencia: 1 }, { id: 2, nombre: "Falta injustificada", cuenta_como_asistencia: 0 },
    { id: 3, nombre: "Falta justificada", cuenta_como_asistencia: "0" }, { id: 4, nombre: "Incapacidad IMSS", cuenta_como_asistencia: 0 },
    { id: 5, nombre: "Día de descanso", cuenta_como_asistencia: 0 }, { id: 6, nombre: "Borrado", cuenta_como_asistencia: 0, borrado: 1 },
  ] };
  assert.deepEqual(tiposEstadoDia(tipos).map((t) => t.id), [2, 3, 4, 5]);
  assert.deepEqual(tiposEstadoDia(tipos).map(requisitoEstado), [null, "motivo", "folio", null]);
  const filas = [{ id: 1, checadas_vivas: 0 }, { id: 2, checadas_vivas: 2, entrada: "x", salida: "y" },
    { id: 3, checadas_vivas: 1, entrada: "x", salida: null, estado_calculado: { clave: "sinsalida" } }, { id: 4, entrada: null, salida: null }];
  assert.deepEqual(planMasivo(filas, "estado").aplican.map((f) => f.id), [1, 4]);
  assert.deepEqual(planMasivo(filas, "estado").omitidos.map((o) => o.fila.id), [2, 3]);
  assert.deepEqual(planMasivo(filas, "horario").aplican.map((f) => f.id), [1, 3, 4]);
});

test("fila de la tabla: estado, día y horas extra (con respaldo de campos viejos)", () => {
  assert.deepEqual(estadoFila({ estado_calculado: { clave: "retardo", texto: "Retardo +18 min" } }), { texto: "Retardo +18 min", clave: "retardo" });
  assert.deepEqual(estadoFila({ estadoAsistencia: "Ausente" }), { texto: "Ausente", clave: "falta" });
  assert.equal(claseEstado("sinsalida"), "bg-amber-50 text-amber-800");
  assert.deepEqual(resumenServidor({ minutos_trabajados: 371, minutos_comida: 40, minutos_extra: 0, minutos_extra_por_autorizar: 0,
    checadas_vivas: 3, estado: { clave: "ok", texto: "Asistió", atencion: false } }).estado, { texto: "Asistió", clave: "ok" });
  assert.equal(resumenServidor(undefined), null);
  assert.equal(diaFila({ dia: { tipo: "domingo", nombre: "Domingo", pago: "Prima dominical 25% (art. 71)" } }).pago, "Prima dominical 25% (art. 71)");
  assert.equal(diaFila({ es_festivo: 1 }).tipo, "festivo_oficial");
  assert.deepEqual(extraFila({ minutos_extra: 182, minutos_extra_por_autorizar: 182 }), { tipo: "pendiente", texto: "3 h 02 min por autorizar" });
  assert.deepEqual(extraFila({ minutos_extra: 60, minutos_extra_por_autorizar: 0 }), { tipo: "autorizada", texto: "1 h autorizadas" });
  assert.equal(extraFila({}).tipo, "nada");
});

test("estado como texto con icono, sin repetir el emoji del catálogo", () => {
  assert.equal(textoConIcono("Asistió", "ok"), "✅ Asistió");
  assert.equal(textoConIcono("Falta injustificada", "falta"), "❌ Falta injustificada");
  assert.equal(textoConIcono("❌ Sin Checar", "falta"), "❌ Sin Checar");
  assert.equal(textoConIcono("Retardo +18 min", "retardo"), "🕒 Retardo +18 min");
  assert.equal(textoConIcono("Algo", ""), "Algo");
});

test("fila sin checadas: todos los tipos del catálogo; los que cuentan como asistencia van al reloj", () => {
  const cat = [
    { id: 1, nombre: "✅ Asistencia", cuenta_como_asistencia: 1 }, { id: 2, nombre: "❌ Sin Checar", cuenta_como_asistencia: 0 },
    { id: 3, nombre: "🤖 Cerrado por Sistema", cuenta_como_asistencia: 0 }, { id: 4, nombre: "Visita al médico", cuenta_como_asistencia: 1 },
    { id: 5, nombre: "⌚ Entrada después de tiempo", cuenta_como_asistencia: 1 }, { id: 6, nombre: "🏖️ Vacaciones", cuenta_como_asistencia: 0, descuenta_vacaciones: 1 },
    { id: 7, nombre: "🚫 Suspensión Disciplinaria", cuenta_como_asistencia: 0 },
  ];
  const g = gruposEstadoDia(cat);
  assert.deepEqual(g.sinHoras.map((t) => t.id), [2, 6, 7]);
  assert.deepEqual(g.conHoras.map((t) => t.id), [4, 5]);
  assert.deepEqual(g.sinHoras.map(requisitoEstado), [null, null, "motivo"]);
});

// ——— (24/11/2026) Hora obligatoria del permiso parcial y motivo de corrección «Otro» ———
const tramo = (rs) => rs.filter((r) => !r.anulado).map((r) => [r.ini, r.fin, r.concepto, r.motivo]).sort((a, b) => a[0] - b[0]);
const hm = (h) => aMin(h);

test("Salida temprano: sin hora (horario normal completo) no deja guardar; a las 2:00 p.m. ajusta la última salida", () => {
  const normal = horarioNormal(horario, "olvido");
  const min0 = minutosNoTrabajados("salida", normal, horario);
  assert.equal(min0, 0);
  const horas0 = horasPermiso({}, "salida", normal, horario);
  assert.deepEqual(horas0, { desde: "", hasta: "" });
  assert.equal(errorHoraPermiso({ nombre: "Salida temprano", alcance: "salida", horas: horas0, horario, minutos: min0 }),
    "Salida temprano: indica a qué hora salió (debe ser antes de las 4:00 p.m.)");
  const aj = ajustarPorPermiso(normal, "salida", { desde: "15:00" }, horario);
  assert.deepEqual(tramo(aj), [[hm("09:00"), hm("13:00"), "jornada", "olvido"], [hm("13:00"), hm("14:00"), "comida", "olvido"],
    [hm("14:00"), hm("15:00"), "jornada", "permiso"]]);
  assert.equal(minutosNoTrabajados("salida", aj, horario), 60);
  assert.equal(errorHoraPermiso({ nombre: "Salida temprano", alcance: "salida", horas: { desde: "15:00" }, horario, minutos: 60 }), "");
  // Sin checadas: horario normal ya ajustado, salida a las 2:00 p.m. (justo al regresar de comer: no hay tramo después).
  assert.deepEqual(tramo(ajustarPorPermiso([], "salida", { desde: "14:00" }, horario)),
    [[hm("09:00"), hm("13:00"), "jornada", "permiso"], [hm("13:00"), hm("14:00"), "comida", "permiso"]]);
  // Fuera de la jornada: error aunque haya minutos.
  assert.match(errorHoraPermiso({ nombre: "Salida temprano", alcance: "salida", horas: { desde: "17:00" }, horario, minutos: 60 }), /antes de las 4:00 p\.m\./);
  assert.equal(horasValidas("salida", { desde: "16:30" }, horario), false);
  // El motivo que el usuario eligió se respeta.
  const elegido = normal.map((r, i) => (i === 2 ? { ...r, motivo: "fuera", motivoElegido: true } : r));
  const aj2 = ajustarPorPermiso(elegido, "salida", { desde: "15:30" }, horario);
  assert.deepEqual(tramo(aj2).at(-1), [hm("14:00"), hm("15:30"), "jornada", "fuera"]);
});

test("sin checadas: se carga el horario normal ya ajustado; Entrada tarde 11:00 ajusta la entrada", () => {
  const aj = ajustarPorPermiso([], "entrada", { hasta: "11:00" }, horario);
  assert.deepEqual(tramo(aj), [[hm("11:00"), hm("13:00"), "jornada", "permiso"], [hm("13:00"), hm("14:00"), "comida", "permiso"],
    [hm("14:00"), hm("16:00"), "jornada", "permiso"]]);
  assert.equal(minutosNoTrabajados("entrada", aj, horario), 120);
  // Del reloj: la checada se corrige (no se borra) con el motivo «permiso».
  const reloj = cargar([api(1, "09:05", "13:00"), api(2, "13:00", "14:00", { concepto: "comida" }), api(3, "14:00", "16:00")]);
  const aj2 = ajustarPorPermiso(reloj, "entrada", { hasta: "11:00" }, horario);
  assert.deepEqual(aj2.find((r) => r.id === 1), { ...reloj[0], ini: hm("11:00"), motivo: "permiso" });
  assert.deepEqual(horasDeChecadas("entrada", aj2, horario), { hasta: "11:00" });
  assert.equal(ajustarPorPermiso(reloj, "entrada", { hasta: "08:00" }, horario), reloj, "fuera de la jornada no ajusta");
});

test("Salir en medio turno 12:00–1:00 parte el renglón que cubre ese rango", () => {
  const sinComida = { entrada: "09:00", salida: "16:00" };
  const reloj = cargar([api(1, "09:00", "16:00")]);
  const aj = ajustarPorPermiso(reloj, "medio", { desde: "12:00", hasta: "13:00" }, sinComida);
  assert.deepEqual(tramo(aj), [[hm("09:00"), hm("12:00"), "jornada", "permiso"], [hm("13:00"), hm("16:00"), "jornada", "permiso"]]);
  assert.equal(minutosNoTrabajados("medio", aj, sinComida), 60);
  assert.deepEqual(horasDeChecadas("medio", aj, sinComida), { desde: "12:00", hasta: "13:00" });
  assert.equal(horasValidas("medio", { desde: "13:00", hasta: "12:00" }, sinComida), false);
  assert.match(errorHoraPermiso({ nombre: "Salir en medio turno", alcance: "medio", horas: { desde: "", hasta: "" }, horario: sinComida, minutos: 0 }),
    /^Salir en medio turno: indica a qué hora salió y a qué hora regresó \(entre las 9:00 a\.m\. y las 4:00 p\.m\.\)$/);
  assert.deepEqual(CAMPOS_HORA.medio.map(([, e]) => e), ["Salió a las", "Regresó a las"]);
});

test("motivo de corrección «Otro»: viaja como «otro: <texto>», al menos 3 letras, 34 como máximo", () => {
  assert.equal(motivoOtro("Junta en planta"), "otro: Junta en planta");
  assert.equal(motivoOtro("x".repeat(50)).length, 40);
  assert.equal(esMotivoOtro("otro: algo") && esMotivoOtro("otro") && !esMotivoOtro("otros"), true);
  assert.equal(textoMotivoOtro("otro: Junta"), "Junta");
  assert.equal(errorMotivoOtro("otro: ab"), "Escribe el motivo (al menos 3 letras).");
  assert.equal(errorMotivoOtro("otro: Junta"), "");
  const r = { ...nuevoRenglon(540, 600, "jornada", "otro: "), k: "x" };
  assert.equal(errorDe(r, [r]), "Escribe el motivo (al menos 3 letras).");
  const ok = { ...r, motivo: "otro:  Junta en planta " };
  assert.equal(errorDe(ok, [ok]), "");
  assert.equal(cuerpoPut([ok], { fecha: F, zona: Z }).registros[0].motivo, "otro: Junta en planta");
  assert.equal(MAX_TEXTO_OTRO, 34);
});

// (25/11/2026) «Salir a comer» del reloj: la pausa siguiente se dibuja como comida (sin renglón «comida»).
test("pausaComidaTras: la pausa después de un tramo cerrado con «Salir a comer»", async () => {
  const { pausaComidaTras } = await import("../src/lib/asistencia/relojDia.mjs");
  const F = "2026-11-24";
  const base = (id, e, s, o = {}) => ({ id, entrada: e, salida: s, entrada_reloj: e, salida_reloj: s, concepto: "jornada", origen: "reloj", ...o });
  const orden = ordenar(desdeApi([base(1, `${F} 08:56:00`, `${F} 11:21:00`, { tipo_cierre: "comida" }), base(2, `${F} 11:46:00`, null)], { fecha: F }));
  assert.deepEqual(pausaComidaTras(orden, 0), { desde: 11 * 60 + 21, hasta: 11 * 60 + 46, minutos: 25 });
  assert.equal(pausaComidaTras(orden, 1), null, "el tramo abierto no es comida");
  const sinRegreso = ordenar(desdeApi([base(1, `${F} 08:56:00`, `${F} 11:21:00`, { tipo_cierre: "comida" })], { fecha: F }));
  assert.deepEqual(pausaComidaTras(sinRegreso, 0), { desde: 11 * 60 + 21, hasta: null, minutos: null });
  const conRenglon = ordenar(desdeApi([base(1, `${F} 09:00:00`, `${F} 13:00:00`, { tipo_cierre: "comida" }),
    base(2, `${F} 13:00:00`, `${F} 14:00:00`, { concepto: "comida" }), base(3, `${F} 14:00:00`, `${F} 18:00:00`)], { fecha: F }));
  assert.equal(pausaComidaTras(conRenglon, 0), null, "con renglón de comida no se repite");
  const normal = ordenar(desdeApi([base(1, `${F} 09:00:00`, `${F} 14:00:00`), base(2, `${F} 14:00:00`, null)], { fecha: F }));
  assert.equal(pausaComidaTras(normal, 0), null, "una salida normal no es comida");
});

// (25/11/2026) «No fue comida»: marcó «Salir a comer» en su última salida por error.
test("quitarComida: el tramo deja de ser comida y el PUT pide quitar la marca", async () => {
  const { quitarComida, pausaComidaTras } = await import("../src/lib/asistencia/relojDia.mjs");
  const F = "2026-11-24";
  const base = (id, e, s, o = {}) => ({ id, entrada: e, salida: s, entrada_reloj: e, salida_reloj: s, concepto: "jornada", origen: "reloj", ...o });
  const regs = desdeApi([base(1, `${F} 18:45:00`, `${F} 20:44:00`, { tipo_cierre: "comida" })], { fecha: F });
  assert.ok(pausaComidaTras(ordenar(regs), 0), "antes: hay comida");
  const sin = quitarComida(regs, regs[0].k);
  assert.equal(pausaComidaTras(ordenar(sin), 0), null, "después: ya no");
  assert.deepEqual(cuerpoPut(sin, { fecha: F }).registros[0].quitar_comida, true);
  assert.equal("quitar_comida" in cuerpoPut(regs, { fecha: F }).registros[0], false, "sin tocar no se manda");
});
