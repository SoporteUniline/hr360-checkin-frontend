// Pruebas de las reglas puras de la agenda de entrevistas y recordatorios (R3). Uso: node --test scripts/test-whatsapp-agenda.mjs
import assert from "node:assert/strict";
import test from "node:test";
import {
  MODOS_AGENDA, textoModoAgenda, etiquetaEstadoCita, citaActiva, accionesCita, formatearMinutos, textoRecordatorio, leerRecordatorio,
  agregarRecordatorio, normalizarRecordatorios, horasDesdeMinutos, minutosDesdeHoras, marcadoresDesconocidos, renderizarTexto, insertarEnCursor,
  DATOS_EJEMPLO, TEXTOS_AGENTE, agendaEmpresaDesdeApi, validarAgendaEmpresa, avisoSinPlantilla, validarRangos, copiarDiaATodos, aDatetimeLocal, aTextoApi,
  agendaVacanteDesdeApi, validarAgendaVacante, rangoNuevo, partesTexto, sumarDias, inicioSemana, diasDeSemana, etiquetaSemana, etiquetaDiaLargo, horaTexto,
  fechaHoraCorta, agruparPorDia, rangoHorasCalendario, carriles, agruparHorarios, textoLugares, necesitaAprobacionAgenda, textoPlantillasMes, hoyMx,
} from "../src/lib/whatsapp/agenda.mjs";
import { mensajeErrorApi, MENSAJE_VENTANA } from "../src/lib/whatsapp/reglas.mjs";

test("quién agenda y estados de cita", () => {
  assert.deepEqual(MODOS_AGENDA.map((m) => m.valor), ["califica", "califica_y_alerta", "aprobacion"]);
  assert.equal(textoModoAgenda("aprobacion"), "Tú apruebas cada cita");
  assert.equal(textoModoAgenda("x"), "");
  assert.deepEqual(etiquetaEstadoCita("no_asistio"), { texto: "No asistió", tono: "rojo" });
  assert.equal(etiquetaEstadoCita("rara").texto, "Sin estado");
  assert.equal(citaActiva({ estado: "reagendada" }), true);
  assert.equal(citaActiva({ estado: "cancelada" }), false);
  assert.equal(citaActiva(null), false);
});

test("acciones por estado y día de la cita", () => {
  const hoy = "2026-11-23";
  assert.deepEqual(accionesCita({ estado: "agendada", inicio: "2026-11-25 10:00" }, hoy), { confirmar: true, reagendar: true, cancelar: true, asistencia: false });
  assert.deepEqual(accionesCita({ estado: "confirmada", inicio: "2026-11-23 10:00" }, hoy), { confirmar: false, reagendar: true, cancelar: true, asistencia: true });
  assert.deepEqual(accionesCita({ estado: "asistio", inicio: "2026-11-20 10:00" }, hoy), { confirmar: false, reagendar: false, cancelar: false, asistencia: false });
  assert.deepEqual(accionesCita({ estado: "cancelada", inicio: "2026-11-20 10:00" }, hoy), { confirmar: false, reagendar: false, cancelar: false, asistencia: false });
});

test("minutos → «24 h antes», «1 h 30 min», «30 min»", () => {
  assert.equal(formatearMinutos(1440), "24 h");
  assert.equal(formatearMinutos(90), "1 h 30 min");
  assert.equal(formatearMinutos(30), "30 min");
  assert.equal(formatearMinutos(0), "");
  assert.equal(formatearMinutos("x"), "");
  assert.equal(textoRecordatorio(1440), "24 h antes");
  assert.equal(textoRecordatorio(120), "2 h antes");
  assert.equal(textoRecordatorio(null), "");
});

test("leer y agregar recordatorios (orden, repetidos, límites)", () => {
  assert.deepEqual(leerRecordatorio("24", "horas"), { minutos: 1440, error: "" });
  assert.deepEqual(leerRecordatorio("1,5", "horas"), { minutos: 90, error: "" });
  assert.deepEqual(leerRecordatorio("45", "minutos"), { minutos: 45, error: "" });
  assert.match(leerRecordatorio("", "horas").error, /cuánto tiempo/);
  assert.match(leerRecordatorio("-2", "horas").error, /mayor que 0/);
  assert.match(leerRecordatorio("2", "minutos").error, /al menos 5 min/);
  assert.match(leerRecordatorio("200", "horas").error, /7 días/);
  let r = agregarRecordatorio([], 120);
  r = agregarRecordatorio(r.lista, 1440);
  assert.deepEqual(r, { lista: [1440, 120], error: "" });
  assert.match(agregarRecordatorio(r.lista, 120).error, /Ya tienes un recordatorio 2 h antes/);
  const lleno = [60, 120, 180, 240, 300];
  assert.match(agregarRecordatorio(lleno, 30).error, /Máximo 5/);
  assert.deepEqual(normalizarRecordatorios([120, "1440", 120, 2, null, 99999]), [1440, 120]);
  assert.deepEqual(normalizarRecordatorios(null), []);
});

test("horas ↔ minutos", () => {
  assert.equal(horasDesdeMinutos(120), "2");
  assert.equal(horasDesdeMinutos(90), "1.5");
  assert.equal(horasDesdeMinutos(null), "");
  assert.deepEqual(minutosDesdeHoras("2"), { valor: 120, error: "" });
  assert.deepEqual(minutosDesdeHoras("0"), { valor: 0, error: "" });
  assert.deepEqual(minutosDesdeHoras(""), { valor: null, error: "" });
  assert.match(minutosDesdeHoras("abc").error, /número de horas/);
  assert.match(minutosDesdeHoras("1000").error, /Máximo 720/);
});

test("marcadores: desconocidos, vista previa e inserción en el cursor", () => {
  assert.deepEqual(marcadoresDesconocidos("Hola {nombre}, {nombr} {nombr} {}"), ["{nombr}", "{}"]);
  assert.deepEqual(marcadoresDesconocidos("Hola {nombre} el {fecha}"), []);
  assert.equal(renderizarTexto("Hola {nombre}, te esperamos el {fecha} a las {hora}. {otro}"), `Hola ${DATOS_EJEMPLO.nombre}, te esperamos el ${DATOS_EJEMPLO.fecha} a las ${DATOS_EJEMPLO.hora}. {otro}`);
  assert.equal(renderizarTexto("{empresa}", { ...DATOS_EJEMPLO, empresa: "Uniline" }), "Uniline");
  assert.deepEqual(insertarEnCursor("Hola !", 5, 5, "{nombre}"), { texto: "Hola {nombre}!", cursor: 13 });
  assert.deepEqual(insertarEnCursor("Hola XX!", 5, 7, "{nombre}"), { texto: "Hola {nombre}!", cursor: 13 });
  assert.deepEqual(insertarEnCursor("Hola", undefined, undefined, " {nombre}"), { texto: "Hola {nombre}", cursor: 13 });
  for (const t of TEXTOS_AGENTE) assert.deepEqual(marcadoresDesconocidos(t.original), [], `texto original ${t.clave} sin marcadores raros`);
});

test("agenda de la empresa: API → formulario → cuerpo", () => {
  const f = agendaEmpresaDesdeApi({ quien_agenda: "aprobacion", anticipacion_min_minutos: 240, dias_adelante: 10, horarios_a_ofrecer: 4, recordatorios: [120, 1440],
    pedir_confirmacion: false, permitir_cambios: true, ofrecer_alternas: true, plantilla_recordatorio: "recordatorio_entrevista", plantilla_seguimiento: null, plantilla_idioma: "es_MX",
    textos: { saludo: "Hola {nombre}" } });
  assert.equal(f.anticipacion_horas, "4");
  assert.deepEqual(f.recordatorios, [1440, 120]);
  assert.equal(f.textos.saludo, "Hola {nombre}");
  assert.equal(f.textos.despedida, "");
  const r = validarAgendaEmpresa({ ...f, textos: { ...f.textos, despedida: "  " } });
  assert.equal(r.valido, true);
  assert.deepEqual(r.cuerpo, {
    quien_agenda: "aprobacion", anticipacion_min_minutos: 240, dias_adelante: 10, horarios_a_ofrecer: 4, recordatorios: [1440, 120],
    pedir_confirmacion: false, permitir_cambios: true, ofrecer_alternas: true, plantilla_recordatorio: "recordatorio_entrevista", plantilla_seguimiento: null,
    plantilla_idioma: "es_MX", textos: { saludo: "Hola {nombre}" },
  });
  // Valores por omisión de un GET vacío.
  const vacio = agendaEmpresaDesdeApi({});
  assert.equal(vacio.quien_agenda, "califica");
  assert.equal(vacio.anticipacion_horas, "2");
  assert.equal(vacio.pedir_confirmacion, true);
  assert.equal(validarAgendaEmpresa(vacio).valido, true);
  // Errores.
  const malo = validarAgendaEmpresa({ ...f, anticipacion_horas: "", dias_adelante: "0", horarios_a_ofrecer: "2.5", plantilla_seguimiento: "Seguimiento Candidato",
    plantilla_idioma: "", textos: { saludo: "Hola {nombr}" } });
  assert.equal(malo.valido, false);
  assert.deepEqual(Object.keys(malo.errores).sort(), ["anticipacion_horas", "dias_adelante", "horarios_a_ofrecer", "plantilla_idioma", "plantilla_seguimiento", "textos"]);
  assert.match(malo.errores.textos.saludo, /no conoce \{nombr\}/);
  // Recordatorios sin plantilla: aviso, no error.
  assert.match(avisoSinPlantilla({ recordatorios: [120], plantilla_recordatorio: "" }), /24 h/);
  assert.equal(avisoSinPlantilla({ recordatorios: [], plantilla_recordatorio: "" }), "");
});

test("rangos del día: formato, orden y empalmes", () => {
  assert.equal(validarRangos([{ desde: "09:00", hasta: "13:00" }, { desde: "15:00", hasta: "18:00" }], "Lunes"), "");
  assert.equal(validarRangos([], "Lunes"), "");
  assert.match(validarRangos([{ desde: "09:00", hasta: "" }], "Lunes"), /Lunes: escribe la hora/);
  assert.match(validarRangos([{ desde: "13:00", hasta: "09:00" }], "Lunes"), /fin debe ser después/);
  assert.match(validarRangos([{ desde: "09:00", hasta: "13:00" }, { desde: "12:00", hasta: "14:00" }], "Lunes"), /09:00–13:00 y 12:00–14:00 se empalman/);
  assert.equal(validarRangos([{ desde: "09:00", hasta: "13:00" }, { desde: "13:00", hasta: "14:00" }], "Lunes"), "", "contiguos no se empalman");
  assert.match(validarRangos(Array.from({ length: 5 }, (_, i) => ({ desde: `0${i}:00`, hasta: `0${i}:30` })), "Lunes"), /máximo 4/);
  const h = copiarDiaATodos({ lun: [{ desde: "09:00", hasta: "13:00" }], mar: [] }, "lun");
  assert.deepEqual(h.dom, [{ desde: "09:00", hasta: "13:00" }]);
  assert.notEqual(h.dom[0], h.lun[0], "copias independientes");
  assert.deepEqual({ desde: rangoNuevo({ desde: "09:00", hasta: "13:00" }).desde, hasta: rangoNuevo({ desde: "09:00", hasta: "13:00" }).hasta }, { desde: "13:00", hasta: "15:00" });
  assert.equal(rangoNuevo({ desde: "20:00", hasta: "22:30" }).hasta, "23:59");
  assert.equal(rangoNuevo(null).desde, "09:00");
});

test("fecha y hora del API ↔ datetime-local", () => {
  assert.equal(aDatetimeLocal("2026-12-24 08:00"), "2026-12-24T08:00");
  assert.equal(aDatetimeLocal("basura"), "");
  assert.equal(aTextoApi("2026-12-24T08:00"), "2026-12-24 08:00");
  assert.equal(aTextoApi(""), "");
});

test("agenda de la vacante: API → formulario → cuerpo (cupo, varios rangos, bloqueo, null vs valor)", () => {
  const api = {
    activa: true, modalidad: "presencial", direccion: "Av. Industrial 120", referencia: "Puerta 3", enlace_video: "", entrevistador: "Laura", que_llevar: "INE",
    duracion_minutos: 30, cupo_por_horario: 3,
    horario: { lun: [{ desde: "09:00", hasta: "13:00" }, { desde: "15:00", hasta: "18:00" }], mar: [], mie: [], jue: [], vie: [{ desde: "09:00", hasta: "12:00" }], sab: [], dom: [] },
    bloqueos: [{ desde: "2026-12-24 00:00", hasta: "2026-12-25 23:59", motivo: "Navidad" }],
    quien_agenda: null, anticipacion_min_minutos: null, dias_adelante: 14,
  };
  const f = agendaVacanteDesdeApi(api);
  assert.equal(f.usa_anticipacion_empresa, true);
  assert.equal(f.usa_dias_empresa, false);
  assert.equal(f.dias_adelante, "14");
  assert.equal(f.quien_agenda, "");
  assert.equal(f.horario.lun.length, 2);
  assert.equal(f.bloqueos[0].desde, "2026-12-24T00:00");
  const r = validarAgendaVacante(f);
  assert.equal(r.valido, true, JSON.stringify(r.errores));
  assert.deepEqual(r.cuerpo, { ...api, horario: { ...api.horario }, quien_agenda: null, anticipacion_min_minutos: null, dias_adelante: 14 });
  // Override con valor y quitar el de días.
  const r2 = validarAgendaVacante({ ...f, quien_agenda: "aprobacion", usa_anticipacion_empresa: false, anticipacion_horas: "48", usa_dias_empresa: true });
  assert.equal(r2.cuerpo.quien_agenda, "aprobacion");
  assert.equal(r2.cuerpo.anticipacion_min_minutos, 2880);
  assert.equal(r2.cuerpo.dias_adelante, null);
  // Rangos se mandan ordenados.
  const r3 = validarAgendaVacante({ ...f, horario: { ...f.horario, lun: [{ desde: "15:00", hasta: "18:00" }, { desde: "09:00", hasta: "13:00" }] } });
  assert.deepEqual(r3.cuerpo.horario.lun.map((x) => x.desde), ["09:00", "15:00"]);
  // Errores.
  const malo = validarAgendaVacante({
    ...f, direccion: "", cupo_por_horario: "0", duracion_minutos: "5", enlace_video: "http://zoom.us/j/1",
    horario: { ...f.horario, lun: [{ desde: "09:00", hasta: "13:00" }, { desde: "12:00", hasta: "14:00" }] },
    bloqueos: [{ clave: "b1", desde: "2026-12-25T10:00", hasta: "2026-12-25T09:00", motivo: "" }],
    usa_anticipacion_empresa: false, anticipacion_horas: "",
  });
  assert.equal(malo.valido, false);
  assert.deepEqual(Object.keys(malo.errores).sort(), ["anticipacion_horas", "bloqueos", "cupo_por_horario", "direccion", "duracion_minutos", "enlace_video", "horario"]);
  assert.match(malo.errores.horario.lun, /se empalman/);
  assert.match(malo.errores.bloqueos.b1, /después del inicio/);
  // Video exige enlace https; agenda apagada no exige dirección ni horarios.
  assert.match(validarAgendaVacante({ ...f, modalidad: "video", enlace_video: "" }).errores.enlace_video, /videollamada/);
  const apagada = validarAgendaVacante({ ...agendaVacanteDesdeApi({}), activa: false });
  assert.equal(apagada.valido, true, JSON.stringify(apagada.errores));
  assert.match(validarAgendaVacante({ ...agendaVacanteDesdeApi({}), activa: true, direccion: "X" }).errores.horario.general, /al menos un horario/);
});

test("semana, días y horas como texto de México", () => {
  assert.deepEqual(partesTexto("2026-11-23 16:05"), { anio: 2026, mes: 10, dia: 23, semana: 1, hora: 16, minuto: 5 });
  assert.equal(partesTexto("2026-02-30"), null);
  assert.equal(sumarDias("2026-11-30", 1), "2026-12-01");
  assert.equal(sumarDias("2026-12-31", 1), "2027-01-01");
  assert.equal(inicioSemana("2026-11-29"), "2026-11-23", "domingo → lunes anterior");
  assert.equal(inicioSemana("2026-11-23"), "2026-11-23");
  assert.deepEqual(diasDeSemana("2026-11-23").map((d) => `${d.corto} ${d.numero}`), ["lun 23", "mar 24", "mié 25", "jue 26", "vie 27", "sáb 28", "dom 29"]);
  assert.equal(etiquetaSemana("2026-11-23"), "23 – 29 nov 2026");
  assert.equal(etiquetaSemana("2026-11-30"), "30 nov – 6 dic 2026");
  assert.equal(etiquetaSemana("2026-12-28"), "28 dic 2026 – 3 ene 2027");
  assert.equal(etiquetaDiaLargo("2026-11-23", "2026-11-23"), "Hoy · lunes 23 de noviembre");
  assert.equal(etiquetaDiaLargo("2026-11-24", "2026-11-23"), "Mañana · martes 24 de noviembre");
  assert.equal(etiquetaDiaLargo("2026-12-01", "2026-11-23"), "martes 1 de diciembre");
  assert.equal(horaTexto("2026-11-23 00:30"), "12:30 a.m.");
  assert.equal(horaTexto("2026-11-23 16:05"), "4:05 p.m.");
  assert.equal(fechaHoraCorta("2026-11-30 10:00"), "lun 30 nov · 10:00 a.m.");
  assert.equal(hoyMx(new Date("2026-11-24T05:30:00Z")), "2026-11-23", "11:30 p.m. del 23 en México");
});

test("agrupar citas por día, rango del calendario y carriles por empalme", () => {
  const citas = [
    { id: 1, inicio: "2026-11-24 10:00", fin: "2026-11-24 10:30" },
    { id: 2, inicio: "2026-11-23 09:00", fin: "2026-11-23 09:30" },
    { id: 3, inicio: "2026-11-24 09:00", fin: "2026-11-24 09:30" },
    { id: 4, inicio: "malo" },
  ];
  const g = agruparPorDia(citas, ["2026-11-23", "2026-11-24", "2026-11-25"]);
  assert.deepEqual(g.map((d) => [d.clave, d.citas.map((c) => c.id)]), [["2026-11-23", [2]], ["2026-11-24", [3, 1]], ["2026-11-25", []]]);
  assert.deepEqual(agruparPorDia(citas).map((d) => d.clave), ["2026-11-23", "2026-11-24"]);
  assert.deepEqual(rangoHorasCalendario(citas), { desde: 8, hasta: 19 });
  assert.deepEqual(rangoHorasCalendario([{ inicio: "2026-11-23 06:30", fin: "2026-11-23 07:00" }, { inicio: "2026-11-23 20:00", fin: "2026-11-23 21:15" }]), { desde: 6, hasta: 22 });
  const c = carriles([
    { id: "a", inicio: "2026-11-23 10:00", fin: "2026-11-23 11:00" },
    { id: "b", inicio: "2026-11-23 10:30", fin: "2026-11-23 11:00" },
    { id: "c", inicio: "2026-11-23 11:00", fin: "2026-11-23 11:30" },
  ]);
  assert.deepEqual(c, { a: { carril: 0, total: 2 }, b: { carril: 1, total: 2 }, c: { carril: 0, total: 1 } });
});

test("horarios disponibles agrupados con lugares", () => {
  const g = agruparHorarios([
    { inicio: "2026-11-24 09:30", fin: "2026-11-24 10:00", capacidad: 3, ocupados: 1 },
    { inicio: "2026-11-24 09:00", fin: "2026-11-24 09:30", capacidad: 3, ocupados: 3 },
    { inicio: "2026-11-25 09:00", fin: "2026-11-25 09:30", capacidad: 1, ocupados: 0 },
  ]);
  assert.deepEqual(g.map((d) => [d.clave, d.horarios.map((h) => `${h.inicio.slice(11)}:${h.libres}`)]), [["2026-11-24", ["09:00:0", "09:30:2"]], ["2026-11-25", ["09:00:1"]]]);
  assert.equal(textoLugares(0, 3), "Lleno");
  assert.equal(textoLugares(1, 1), "Libre");
  assert.equal(textoLugares(1, 3), "Queda 1 lugar");
  assert.equal(textoLugares(2, 3), "Quedan 2 lugares");
});

test("«Aprobar para agendar» según motivo, modo y cita", () => {
  const alerta = { calificacion: "con_alerta", requiere_atencion: false };
  assert.equal(necesitaAprobacionAgenda(alerta, "califica", null), true);
  assert.equal(necesitaAprobacionAgenda(alerta, "califica_y_alerta", null), false);
  assert.equal(necesitaAprobacionAgenda({ calificacion: "califica", requiere_atencion: true, motivo_atencion: "Espera tu aprobación para agendar" }, "aprobacion", null), true);
  assert.equal(necesitaAprobacionAgenda({ calificacion: "califica", requiere_atencion: true, motivo_atencion: "Pidió hablar con una persona" }, "aprobacion", null), false);
  assert.equal(necesitaAprobacionAgenda({ requiere_atencion: true, motivo_codigo: "aprobar_agenda" }, "califica", null), true);
  assert.equal(necesitaAprobacionAgenda(alerta, "califica", { estado: "agendada" }), false, "con cita activa no se ofrece");
  assert.equal(necesitaAprobacionAgenda(alerta, "califica", { estado: "cancelada" }), true);
  assert.equal(necesitaAprobacionAgenda({ ...alerta, agenda_aprobada: true }, "califica", null), false);
  assert.equal(necesitaAprobacionAgenda(null, "califica", null), false);
});

test("plantillas del mes y errores del API de agenda", () => {
  assert.equal(textoPlantillasMes({ plantillas_mes: 7 }), "7 plantillas enviadas este mes");
  assert.equal(textoPlantillasMes({ plantillas_mes: 1 }), "1 plantilla enviada este mes");
  assert.equal(textoPlantillasMes({ plantillas_mes: 0 }), "0 plantillas enviadas este mes");
  assert.equal(textoPlantillasMes({}), null);
  const err = (status, data) => ({ response: { status, data } });
  assert.match(mensajeErrorApi(err(409, { codigo: "WA_SIN_CUPO", error: "x" })), /ya se llenó/);
  assert.match(mensajeErrorApi(err(409, { codigo: "WA_VENTANA_ABIERTA" })), /escríbele directamente/);
  assert.match(mensajeErrorApi(err(409, { codigo: "WA_SIN_PLANTILLA" })), /Agenda y recordatorios/);
  assert.match(MENSAJE_VENTANA, /Enviar seguimiento/);
});

test("selector de horarios: causa cuando no hay horarios", async () => {
  const { agendaConfigurada, causaSinHorarios, MENSAJE_SIN_MIGRACION_AGENDA, MENSAJE_AGENDA_SIN_CONFIGURAR } = await import("../src/lib/whatsapp/agenda.mjs");
  const vacio = { lun: [], mar: [], mie: [], jue: [], vie: [], sab: [], dom: [] };
  assert.equal(agendaConfigurada({ activa: true, horario: { ...vacio, lun: [{ desde: "09:00", hasta: "13:00" }] } }), true);
  assert.equal(agendaConfigurada({ activa: false, horario: { ...vacio, lun: [{ desde: "09:00", hasta: "13:00" }] } }), false);
  assert.equal(agendaConfigurada({ activa: true, horario: vacio }), false);
  assert.equal(agendaConfigurada(null), false);
  const sinMig = { response: { status: 503, data: { codigo: "SIN_MIGRACION" } } };
  assert.equal(causaSinHorarios({ errorHorarios: sinMig, agenda: { activa: false } }), "sin_migracion");
  assert.equal(causaSinHorarios({ errorAgenda: sinMig }), "sin_migracion");
  assert.equal(causaSinHorarios({ agenda: { activa: false, horario: vacio } }), "sin_agenda");
  assert.equal(causaSinHorarios({ agenda: { activa: true, horario: vacio } }), "sin_agenda");
  assert.equal(causaSinHorarios({ agenda: { activa: true, horario: { ...vacio, vie: [{ desde: "09:00", hasta: "10:00" }] } } }), null);
  assert.equal(causaSinHorarios({ errorHorarios: { response: { status: 500, data: {} } } }), null);
  assert.equal(causaSinHorarios(), null);
  assert.equal(MENSAJE_SIN_MIGRACION_AGENDA, "Falta correr la migración de la agenda (R3)");
  assert.equal(MENSAJE_AGENDA_SIN_CONFIGURAR, "La agenda de esta vacante no está configurada");
});
