// Capturas del Centro de ayuda — bloque «Control de tiempo + Ausencias y permisos».
// Abre el sistema compilado con un backend SIMULADO (nada sale a internet; datos de demostración: «Uniline», «Laura Ríos»,
// «Ana Torres»…) y guarda capturas reales en public/ayuda/capturas/<módulo>/<nombre>.webp (1440×900 panel, 390×844
// celular, deviceScaleFactor 1). El PNG de Playwright se convierte a WebP (calidad 0.8) con el canvas de Chromium.
// Mismo estilo de API simulada que scripts/verify-monitor.mjs, verify-reloj-dia.mjs, verify-reloj-pantalla.mjs, etc.
//
// Uso:
//   NEXT_PUBLIC_RUTA_BACKEND=https://api.prueba.invalid/api npx next build
//   PLAYWRIGHT_MODULE_PATH=/opt/node22/lib/node_modules/playwright node scripts/capturas-ayuda/tiempo.mjs [filtro]
// `filtro` (opcional) solo toma las capturas cuyo nombre contiene alguno de los textos separados por coma
// (p. ej. «monitor» o «permisos/,vacaciones/»).
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import http from "node:http";
import { createRequire } from "node:module";
import { mkdir, writeFile, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { elegir } from "../lib/desplegable.mjs";

const REPO = process.cwd();
const require = createRequire(REPO + "/package.json");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const FILTRO = (process.argv[2] || "").split(",").filter(Boolean);
const SALIDA = path.join(REPO, "public/ayuda/capturas");
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const libre = async () => {
  const s = createServer();
  await new Promise((r) => s.listen(0, "127.0.0.1", r));
  const p = s.address().port;
  await new Promise((r) => s.close(r));
  return p;
};

// ── Fecha fija: miércoles 25/11/2026, 11:12 a. m. en CDMX ────────────────────────────────────────────────────────────
const F = "2026-11-25";
const AYER = "2026-11-24";
const AHORA = new Date(`${F}T17:12:00Z`);
const ZONA = "America/Mexico_City";
const t = (h, f = F) => `${f} ${h}:00`;

// ── Sesiones de demostración ─────────────────────────────────────────────────────────────────────────────────────────
const secreto = crypto.randomBytes(24).toString("hex");
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (p) => {
  const c = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ ...p, exp: Math.floor(Date.now() / 1000) + 3 * 3600 })}`;
  return `${c}.${crypto.createHmac("sha256", secreto).update(c).digest("base64url")}`;
};
const empresa = { id_empresa: 10, nombre: "Uniline", estado: "Activo", zona_horaria: ZONA };
const RH = { id_usuario: -1, id_empleado: 1, tipo_usuario: "Recruiter", id_empresa: 10, nombre: "Laura Ríos", correo: "laura.rios@uniline.demo", empresas: [10],
  empresas_detalle: [empresa], zona_horaria: ZONA };
// Jefa que entra a Mi espacio (app del empleado): aprueba a su equipo y ve su Monitor.
const JEFA = { id_usuario: 1, id_empleado: 1, tipo_usuario: "Empleado", esEmpleado: true, nombre: "Laura Ríos", id_empresa: 10, empresas: [10],
  empresas_detalle: [empresa], zona_horaria: ZONA };
const ANA = { id_usuario: 15, id_empleado: 15, tipo_usuario: "Empleado", esEmpleado: true, nombre: "Ana Torres", id_empresa: 10, empresas: [10],
  empresas_detalle: [empresa], zona_horaria: ZONA };

// ── Datos de demostración ────────────────────────────────────────────────────────────────────────────────────────────
// Monitor (mismo armado que verify-monitor.mjs).
let idm = 0;
const regM = (nombre, apellido, area, entra, sale, extra = {}) => ({
  id: ++idm, id_empleado: idm, id_empresa: 10, nombre, apellido_paterno: apellido, departamento: area, fecha: F, zona_horaria: ZONA,
  hora_entrada_programada: entra && `${entra}:00`, hora_salida_programada: sale && `${sale}:00`, tolerancia_entrada_min: 10, tolerancia_salida_min: 0,
  hrs_comida: [entra, sale].join() === "09:00,18:00" || [entra, sale].join() === "08:00,17:00" ? 1 : 0,
  entrada: null, salida: null, tipo_registro_nombre: "Sin checar", asistencia: 0, ...extra,
});
const tramos = (lista, abierta = null, f = F) => ({
  tramos_checadas: lista.map(([e, s]) => ({ entrada: t(e, f), salida: t(s, f) })), tramos_abiertos: abierta ? 1 : 0,
  entrada_tramo_abierto: abierta ? t(abierta, f) : null, entrada: t(lista[0]?.[0] ?? abierta, f),
  salida: lista.length && !abierta ? t(lista.at(-1)[1], f) : null, asistencia: 1,
});
const enComida = (salida) => ({ salida: t(salida), regreso: null, minutos: null, minutos_programados: 60 });
function datosMonitor() {
  idm = 0;
  return [
    regM("Alondra", "Munguía", "Ventas", "07:00", "14:00"),
    regM("Armando", "González", "Contaduría", "09:00", "18:00"),
    regM("Cristian", "Cano", "Producción", "08:00", "17:00", { ...tramos([["08:00", "10:05"]]), comida_checada: enComida("10:05") }),
    regM("Frida", "Serrano", "Marketing", "09:00", "18:00", tramos([], "09:18")),
    regM("Jesús", "Guzmán", "Sistemas", "09:00", "18:00", tramos([], "08:56")),
    regM("Valeria", "Castillo", "Marketing", "09:00", "18:00", tramos([], "08:49")),
    regM("Rosa", "Pérez", "Ventas", "07:00", "15:00", { ...tramos([["07:00", "10:30"]]), correccion: 1 }),
    regM("Beto", "Ruiz", "Ventas", "12:00", "20:00"),
    regM("Ana", "López", "Producción", "08:00", "17:00", { ...tramos([["08:00", "11:00"]]), comida_checada: enComida("11:00") }),
    regM("Gil", "Herrera", "Planta", null, null, { tipo_registro_nombre: "Día de Descanso" }),
    regM("Mario", "Gómez", "Almacén", "08:00", "17:00", { ...tramos([], "07:51"), horas_extra_autorizadas_dia: { hasta: "20:00", minutos: 180, motivo: "inventario" } }),
    regM("Lucía", "Torres", "Oficina", "09:00", "18:00", { tipo_registro_nombre: "Vacaciones" }),
    regM("Bruno", "Ríos", "Reparto", "08:00", "17:00", { ...tramos([["07:58", "10:00"]]),
      permisos_horas_dia: [{ id: 2, tipo_horas: "sale_regresa", hora_inicio: "10:00", hora_fin: "12:00", motivo: "cita médica" }] }),
    regM("Paco", "Díaz", "Planta", "08:00", "17:00", tramos([], "07:55")),
    regM("Irma", "Soto", "Planta", "08:00", "17:00", tramos([], "07:58")),
    regM("Mónica", "Ruiz", "Almacén", "05:00", "11:00", tramos([], "04:58")),
    regM("Sergio", "Vela", "Reparto", "07:00", "11:30", tramos([], "07:00")),
    regM("Elena", "Mora", "Oficina", "09:00", "18:00", { ...tramos([], "10:40"),
      permisos_horas_dia: [{ id: 3, tipo_horas: "llega_tarde", hora_inicio: "09:00", hora_fin: "10:30" }] }),
    regM("Sofía", "Méndez", "Caja", "06:00", "11:00", tramos([["05:55", "11:02"]])),
  ];
}

// Asistencias (mismo armado que verify-reloj-dia.mjs).
const NORMAL = { tipo: "normal", nombre: "Día normal", pago: "" };
const fila = (id, nombre, apellido, depto, o = {}) => ({
  id, id_empleado: id, id_empresa: 10, nombre, apellido_paterno: apellido, departamento: depto, unidad_negocio: "Uniline Centro", nip: String(1000 + id),
  fecha: F, zona_horaria: ZONA, hora_entrada_programada: "09:00:00", hora_salida_programada: "16:00:00",
  hora_salida_comida_programada: "13:00:00", hora_regreso_comida_programada: "14:00:00", tipo_registro_nombre: "Asistencia", id_tipo_permiso: 1,
  asistencia: 1, goce_sueldo: 1, entrada: null, salida: null, dia: NORMAL, checadas_vivas: 0, minutos_trabajados: null, minutos_programados: 360,
  minutos_comida: null, minutos_extra: 0, minutos_extra_por_autorizar: 0, motivos_resumen: "", estadoAsistencia: "Presente", ...o,
});
const filasAsistencia = () => [
  fila(501, "Alondra", "Munguía", "Ventas", { entrada: t("09:18"), salida: t("16:08"), checadas_vivas: 3, minutos_trabajados: 370, minutos_comida: 40,
    estado_calculado: { clave: "retardo", texto: "Retardo +18 min", atencion: true }, motivos_resumen: "1 corregido en reloj · Laura R.", checadas_corregidas: 1,
    correccion: 1, estadoAsistencia: "Tardanza" }),
  fila(502, "Armando", "González", "Contaduría", { id_tipo_permiso: 2, tipo_registro_nombre: "Sin checar", asistencia: 0,
    estado_calculado: { clave: "falta", texto: "Sin checadas", atencion: true }, estadoAsistencia: "Ausente" }),
  fila(503, "Juan", "Pérez", "Producción", { id_tipo_permiso: 2, tipo_registro_nombre: "Falta injustificada", asistencia: 0,
    estado_calculado: { clave: "falta", texto: "Falta injustificada", atencion: true }, estadoAsistencia: "Ausente", acta: { id: 77, estatus: "borrador" } }),
  fila(504, "Mario", "Gómez", "Almacén", { hora_entrada_programada: "08:00:00", hora_salida_programada: "17:00:00", minutos_programados: 480,
    entrada: t("07:51"), salida: t("20:02"), checadas_vivas: 3, minutos_trabajados: 671, minutos_comida: 60, minutos_extra: 0,
    minutos_extra_por_autorizar: 191, estado_extra: "pendiente", estado_calculado: { clave: "ok", texto: "Asistió", atencion: false } }),
  fila(507, "Diego", "León", "Administración", { entrada: t("08:55"), checadas_vivas: 1, estado_calculado: { clave: "sinsalida", texto: "Sin salida", atencion: true } }),
  fila(508, "Rosa", "Díaz", "Ventas", { entrada: t("09:00"), salida: t("16:00"), checadas_vivas: 3, minutos_trabajados: 390, minutos_comida: 30,
    hora_salida_comida_programada: "11:00:00", hora_regreso_comida_programada: "11:30:00", estado_calculado: { clave: "ok", texto: "Asistió", atencion: false } }),
  fila(509, "Tomás", "Ruiz", "Ventas", { entrada: t("09:00"), salida: t("16:00"), checadas_vivas: 1, minutos_trabajados: 420, minutos_comida: 0,
    hora_salida_comida_programada: null, hora_regreso_comida_programada: null, estado_calculado: { clave: "ok", texto: "Asistió", atencion: false } }),
  fila(510, "Frida", "Serrano", "Ventas", { entrada: t("08:56"), salida: null, checadas_vivas: 2, minutos_trabajados: 145, minutos_comida: 25,
    estado_calculado: { clave: "ok", texto: "Asistencia · en jornada", atencion: false } }),
  fila(511, "Lucía", "Torres", "Oficina", { id_tipo_permiso: 6, tipo_registro_nombre: "Vacaciones", asistencia: 0, goce_sueldo: 1,
    estado_calculado: { clave: "just", texto: "Vacaciones", atencion: false }, estadoAsistencia: "Vacaciones", estado: "Vacaciones" }),
];
const tiposPermiso = [
  { id: 1, nombre: "Asistencia", clave: "ASISTENCIA", cuenta_como_asistencia: 1, rol: "asistencia", captura: 1 },
  { id: 2, nombre: "Inasistencia", clave: "INASISTENCIA", cuenta_como_asistencia: 0, rol: "inasistencia", captura: 1, es_permiso: 1 },
  { id: 3, nombre: "Falta justificada", clave: "FALTA_JUSTIFICADA", cuenta_como_asistencia: 0, goce_sueldo: 0, cambia_al_aplicar: 1, rol: "heredado", captura: 0 },
  { id: 4, nombre: "Incapacidad IMSS", clave: "INCAPACIDAD", cuenta_como_asistencia: 0, fijo_ley: 1, goce_sueldo: 0, es_permiso: 1 },
  { id: 5, nombre: "Día de descanso", clave: "DESCANSO", cuenta_como_asistencia: 0, goce_sueldo: 1, fijo_ley: 1 },
  { id: 6, nombre: "Vacaciones", clave: "VACACIONES", cuenta_como_asistencia: 0, fijo_ley: 1, goce_sueldo: 1, descuenta_vacaciones: 1, es_permiso: 1 },
  { id: 31, nombre: "Entrada tarde", clave: "ENTRADA_TARDE", alcance: "entrada", rol: "entrada", captura: 1, es_permiso: 1, goce_sueldo: 1, horas_no_trabajadas: "reponen", cambia_al_aplicar: 1 },
  { id: 32, nombre: "Salida temprano", clave: "SALIDA_TEMPRANO", alcance: "salida", rol: "salida", captura: 1, es_permiso: 1, goce_sueldo: 1, horas_no_trabajadas: "reponen", cambia_al_aplicar: 1 },
  { id: 33, nombre: "Salir en medio turno", clave: "SALIR_MEDIO_TURNO", alcance: "medio", rol: "medio", captura: 1, es_permiso: 1, goce_sueldo: 1, horas_no_trabajadas: "reponen", cambia_al_aplicar: 1 },
];
const motivosPermiso = [
  { id: 1, nombre: "Visita al médico", global: true, activo: 1 }, { id: 2, nombre: "Permiso personal", global: true, activo: 1 },
  { id: 3, nombre: "Trámite", global: true, activo: 1 }, { id: 4, nombre: "Escuela de los hijos", global: true, activo: 1 },
  { id: 5, nombre: "Capacitación", global: true, activo: 1 }, { id: 6, nombre: "Otro", global: true, activo: 1 },
];
const motivosReloj = {
  permisos: [],
  correccion: [["olvido", "Olvidó checar"], ["reloj", "Falla del reloj"], ["captura", "Error de captura"], ["fuera", "Trabajó fuera de la sucursal"],
    ["duplicada", "Checada duplicada"], ["permiso", "Por el permiso del día"], ["remoto", "Trabajo remoto / home office"],
    ["comision", "Visita a cliente o comisión"], ["evento", "Capacitación o evento externo"], ["sin_dispositivo", "Sin dispositivo o reloj sin conexión"],
    ["otro", "Otro (escribe el motivo)"]].map(([clave, nombre]) => ({ clave, nombre })),
};
const parciales = tiposPermiso.filter((x) => x.alcance).map(({ id, nombre, alcance, rol }) => ({ id, nombre, alcance, rol, captura: 1, es_permiso: 1,
  goce: "con", horas: "reponen", cambia_al_aplicar: 1 }));
const autorizadores = [{ id: 3, nombre: "Laura Ríos (RH)" }, { id: 9, nombre: "Carlos Ruiz (jefe)" }];
const chec = (id, e, s, o = {}) => ({ id, entrada: e, salida: s, entrada_reloj: e, salida_reloj: s, concepto: "jornada", motivo: null,
  origen: "reloj", anulado: false, id_autoriza: null, autoriza_no: false, ...o });
const relojes = {
  501: { horario: { entrada: "09:00", salida: "16:00", salida_comida: "13:00", regreso_comida: "14:00" },
    registros: [chec(7001, t("09:18"), t("13:00")), chec(7002, t("13:00"), t("13:40"), { concepto: "comida" }), chec(7003, t("13:40"), t("16:08"))] },
  502: { horario: { entrada: "09:00", salida: "16:00", salida_comida: "13:00", regreso_comida: "14:00" }, registros: [] },
  504: { horario: { entrada: "08:00", salida: "17:00", salida_comida: "13:00", regreso_comida: "14:00" },
    registros: [chec(7101, t("07:51"), t("13:00")), chec(7102, t("13:00"), t("14:00"), { concepto: "comida" }), chec(7103, t("14:00"), t("20:02"))] },
  507: { horario: { entrada: "09:00", salida: "16:00", salida_comida: "13:00", regreso_comida: "14:00" }, registros: [chec(7151, t("08:55"), null)] },
  508: { horario: { entrada: "09:00", salida: "16:00", salida_comida: "11:00", regreso_comida: "11:30" }, tipos_parciales: parciales,
    registros: [chec(7401, t("09:00"), t("11:00")), chec(7402, t("11:00"), t("11:30"), { concepto: "comida" }), chec(7403, t("11:30"), t("16:00"))] },
  509: { horario: { entrada: "09:00", salida: "16:00", salida_comida: null, regreso_comida: null }, tipos_parciales: parciales,
    registros: [chec(7501, t("09:00"), t("16:00"))] },
  510: { horario: { entrada: "09:00", salida: "16:00", salida_comida: "11:00", regreso_comida: "11:30" },
    registros: [chec(7801, t("08:56"), t("11:21"), { tipo_cierre: "comida" }), chec(7802, t("11:46"), null)] },
};
function relojDe(idA) {
  const f = filasAsistencia().find((x) => x.id === idA) ?? filasAsistencia()[0];
  const r = relojes[idA] ?? { horario: relojes[502].horario, registros: [] };
  return { ok: true, migracion: true,
    asistencia: { id: idA, id_empleado: idA, nombre: `${f.nombre} ${f.apellido_paterno}`, departamento: f.departamento, fecha: f.fecha },
    horario: r.horario, dia: r.dia ?? NORMAL, registros: r.registros, motivos: motivosReloj, autorizadores,
    tipos_parciales: r.tipos_parciales ?? parciales, motivos_permiso: motivosPermiso, permiso_dia: null,
    resumen: { minutos_trabajados: f.minutos_trabajados ?? 0, minutos_comida: f.minutos_comida ?? 0, minutos_extra: f.minutos_extra,
      minutos_extra_por_autorizar: f.minutos_extra_por_autorizar, checadas_vivas: f.checadas_vivas, abierto: f.estado_calculado?.clave === "sinsalida",
      estado: f.estado_calculado, estado_calculado: f.estado_calculado, minutos_programados: f.minutos_programados } };
}

// Personas (catálogo de empleados de demostración).
const PERSONAS = [
  [1, "Laura", "Ríos", "Recursos Humanos", "Jefa de RH"], [15, "Ana", "Torres", "Ventas", "Asesora de ventas"], [16, "Iván", "Delgado", "Producción", "Operador"], [17, "Mariana", "López", "Oficina", "Analista"],
  [18, "Carlos", "Ramírez", "Almacén", "Almacenista"], [19, "Sofía", "Méndez", "Caja", "Cajera"], [20, "Jorge", "Ramírez", "Reparto", "Chofer"],
  [21, "Lucía", "Torres", "Oficina", "Auxiliar administrativa"], [22, "Bruno", "Ríos", "Reparto", "Repartidor"],
];
const empleados = PERSONAS.map(([id, nombre, ap, depto, puesto], i) => ({ id_empleado: id, id: id, nombre, apellido_paterno: ap, apellido_materno: "",
  nombre_empleado: `${nombre} ${ap}`, nombre_completo: `${nombre} ${ap}`, departamento: depto, puesto, nombre_puesto: puesto, unidad_negocio: "Uniline Centro",
  nombre_empresa: "Uniline", id_empresa: 10, estado: "Activo", correo: `${nombre.toLowerCase()}.${ap.toLowerCase()}@uniline.demo`.normalize("NFD").replace(/[̀-ͯ]/g, ""),
  nip: String(1001 + i), fecha_ingreso: `20${18 + (i % 6)}-0${1 + (i % 8)}-15`, dias_trabajo: "Lunes,Martes,Miércoles,Jueves,Viernes",
  id_autoriza_vacaciones: id === 1 ? null : 1, id_autoriza_permisos: id === 1 ? null : 1 }));
const equipo = empleados.filter((e) => e.id_empleado !== 1);

// Reporte de horas con la LFT (mismo armado que verify-reporte-horas.mjs).
const semana = { inicio: "2026-11-23", fin: "2026-11-29", limite: 2880, topeDoble: 540, trabajado: 3180, programado: 2880, autorizadas: 300, porAutorizar: 60,
  diasConExtra: 3, dobles: 300, triples: 0, alertas: ["Más de 4 h extra en un día"] };
const diaR = (fecha, min, ley, extra = {}) => ({ fecha, entrada: `${fecha} 08:00:00`, salida: `${fecha} ${String(8 + Math.round(min / 60) + 1).padStart(2, "0")}:00:00`,
  horasHM: `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`, minutosDia: min, hrsExtra: ley.estadoExtra === "autorizada",
  estado: min ? "Presente" : "Descanso", motivo: null, notas: null, movimientos: [], ley: { programado: 480, alertas: [], ...ley }, ...extra });
const reporteHoras = (e, conExtra) => ({ empleado: { ...e }, periodo: { inicio: "2026-11-23", fin: "2026-11-25" },
  dias: [diaR("2026-11-23", 600, conExtra ? { extraMin: 120, estadoExtra: "autorizada" } : { extraMin: 0, estadoExtra: "sin" },
    { comida: { salida: "2026-11-23 13:00:00", regreso: "2026-11-23 14:05:00", minutos: 65, minutos_programados: 60, excedente: 5 } }),
  diaR("2026-11-24", 780, conExtra ? { extraMin: 300, estadoExtra: "autorizada", alertas: ["Más de 4 h extra en un día"] } : { extraMin: 60, estadoExtra: "pendiente" }),
  diaR("2026-11-25", 480, { extraMin: 0, estadoExtra: "sin" })],
  resumen: { totalHoras: "31:00", horasExtrasLaboradas: conExtra ? "7:00" : "1:00", diasTrabajados: 3, promedioHoras: "10:20",
    comida: { minutos: 65, dias: 1, veces_excedio: 1, minutos_excedidos: 5 } },
  ley: conExtra ? { trabajado: 1860, programado: 1440, autorizadas: 420, dobles: 420, triples: 0, porAutorizar: 0, alertas: semana.alertas, semanas: [semana] }
    : { trabajado: 1560, programado: 1440, autorizadas: 0, dobles: 0, triples: 0, porAutorizar: 60, alertas: [], semanas: [{ ...semana, autorizadas: 0, dobles: 0, alertas: [] }] } });

// Permisos y vacaciones (solicitudes de demostración).
const sol = (id, idEmp, tipo, idTipo, desde, hasta, estado, o = {}) => {
  const e = empleados.find((x) => x.id_empleado === idEmp);
  return { id, folio: `P-${String(id).padStart(4, "0")}`, id_empleado: idEmp, id_empresa: 10, nombre_empleado: e.nombre_completo, empleado_nombre: e.nombre_completo,
    nombre: e.nombre, apellido_paterno: e.apellido_paterno, departamento: e.departamento, puesto: e.puesto, unidad_negocio: "Uniline Centro",
    tipo_permiso_nombre: tipo, tipo_permiso: tipo, id_tipo_permiso: idTipo, fecha_inicio: desde, fecha_fin: hasta, estado,
    descuenta_vacaciones: tipo === "Vacaciones" ? 1 : 0, motivo: o.motivo ?? "", notas: o.notas ?? "", motivo_permiso: o.motivo_permiso ?? null,
    marca_tiempo: `${desde} 09:00:00`, fecha_solicitud: "2026-11-20 10:15:00", modalidad: o.modalidad ?? "dias", ...o };
};
const solicitudes = [
  sol(301, 15, "Vacaciones", 6, "2026-12-21", "2026-12-24", "Pendiente", { motivo: "Viaje familiar" }),
  sol(302, 16, "Inasistencia", 2, "2026-11-27", "2026-11-27", "Pendiente", { motivo_permiso: "Trámite", motivo: "Trámite en el SAT" }),
  sol(303, 17, "Entrada tarde", 31, "2026-11-26", "2026-11-26", "Pendiente", { modalidad: "horas", tipo_horas: "llega_tarde", hora_fin: "11:00",
    tratamiento: "repone", motivo_permiso: "Visita al médico" }),
  sol(304, 18, "Vacaciones", 6, "2026-11-16", "2026-11-20", "Aprobado", { motivo: "Descanso" }),
  sol(305, 19, "Inasistencia", 2, "2026-11-10", "2026-11-10", "Rechazado", { motivo_permiso: "Permiso personal", notas: "Ese día hay inventario" }),
  sol(306, 21, "Vacaciones", 6, "2026-11-23", "2026-11-27", "Aprobado", { motivo: "Vacaciones de fin de año adelantadas" }),
  sol(307, 22, "Salida temprano", 32, "2026-11-25", "2026-11-25", "Aprobado", { modalidad: "horas", tipo_horas: "sale_antes", hora_inicio: "15:00",
    tratamiento: "rebaja", motivo_permiso: "Escuela de los hijos" }),
  sol(308, 20, "Incapacidad IMSS", 4, "2026-11-02", "2026-11-04", "Aprobado", { folio_imss: "AB123456" }),
];


// Turnos extra (mismo armado que verify-turnos-extra.mjs).
const turnoExtra = { id: 41, id_empresa: 10, nombre_empresa: "Uniline", nombre: "Doble turno · Producción", fecha: F, hora_inicio: "11:00", hora_fin: "19:00",
  tolerancia_min: 15, motivo: "Pedido urgente", estado: "programado", creado_por_nombre: "Laura Ríos", creado_en: `${AYER} 17:40:00`, personas: 3 };
const avisoGrave = { nivel: "grave", codigo: "JORNADA_12H", mensaje: "Con su turno 22:00–06:00 suma 13 h seguidas (máx. 12 h)" };
const personaExtra = (e, vivo, avisos = []) => ({ id_empleado: e.id_empleado, nombre_empleado: e.nombre_completo, departamento: "Producción", horario_dia: "22:00–06:00",
  avisos, grave: avisos.some((x) => x.nivel === "grave"), duracion: 480, dobles: 480, triples: 0, avisos_al_programar: avisos, vivo });
const detalleExtra = {
  turno: { ...turnoExtra, fase: "en_curso", duracion: 480 },
  personas: [
    personaExtra(equipo[1], { estado: "trabajando", llegoTarde: 0, entrada: t("10:58"), salida: null, salidaAnterior: t("06:02"), minutos: 14, dobles: 14, triples: 0 }, [avisoGrave]),
    personaExtra(equipo[3], { estado: "trabajando", llegoTarde: 20, entrada: t("11:20"), salida: null, salidaAnterior: t("06:05"), minutos: 0, dobles: 0, triples: 0 }),
    personaExtra(equipo[5], { estado: "por_llegar", llegoTarde: 0, entrada: null, salida: null, salidaAnterior: t("06:00"), minutos: 0, dobles: 0, triples: 0 }),
  ],
  resumen: { personas: 3, checaron: 2, sinLlegar: 1, minutos: 14, dobles: 14, triples: 0 },
};
const candidatosExtra = [
  { ...personaExtra(equipo[1], null, [avisoGrave, { nivel: "aviso", codigo: "EXTRA_4H", mensaje: "8 h extra en un día (máx. 4 h)" }]), salida_anterior: t("06:02"), semanaTrabajado: 1440, semanaExtraAutorizadas: 120 },
  { ...personaExtra(equipo[3], null, [{ nivel: "aviso", codigo: "EXTRA_4H", mensaje: "8 h extra en un día (máx. 4 h)" }]), salida_anterior: t("06:05") },
  { ...personaExtra(equipo[5], null, [{ nivel: "info", codigo: "DESCANSO", mensaje: "Es su día de descanso" }]), departamento: "Reparto", horario_dia: null, salida_anterior: null },
  { ...personaExtra(equipo[4], null, [{ nivel: "aviso", codigo: "NO_COMPLETO", mensaje: "Su horario 06:00–14:00 se empalma: no puede cubrir el turno completo" }]), departamento: "Caja", horario_dia: "06:00–14:00", salida_anterior: null },
];

// ── Respuestas del backend simulado (la misma función para el navegador y para las rutas de Next del servidor) ──────
function api(metodo, p, q, usuario, cuerpo) {
  if (p.endsWith("/users/verify/token")) return { user: usuario };
  if (p.includes("eventos-checada")) return null;
  if (p.endsWith("/checador/modulos/activos")) return {};
  if (p.endsWith("/checador/comunicados/popup") || p.endsWith("/comunicados/mi/popup")) return { ok: true, data: null };
  if (p.endsWith("/checador/clima/mis-encuestas")) return { ok: true, data: [] };
  if (p.endsWith("/checador/avisos/proximos")) return { ok: true, data: [] };
  if (/\/users\/imagen\//.test(p)) return {};
  if (/\/empresas\/id\/\d+\/slug$/.test(p)) return { slug: "uniline" };
  if (/\/empresas\/slug\/uniline$/.test(p)) return { id_empresa: 10, nombre: "Uniline", slug: "uniline", zona_horaria: ZONA };
  if (/\/empresas\/10$/.test(p)) return { ...empresa, url_imagen: null };
  if (p.endsWith("/checador/sucursales")) return { sucursales: [{ id_sucursal: 1, nombre: "Uniline Centro", id_empresa: 10 }] };
  if (p.endsWith("/checador/departamentos")) return { departamentos: ["Ventas", "Producción", "Oficina", "Almacén", "Reparto", "Caja"].map((n, i) => ({ id_departamento: i + 1, nombre_departamento: n, nombre: n })) };
  if (p.endsWith("/checador/tiposPermiso")) return { tiposPermiso, total: tiposPermiso.length };
  if (p.endsWith("/checador/motivos-permiso")) return { ok: true, motivos: motivosPermiso };
  if (p.endsWith("/checador/jornadas-legales/vigente")) return { ok: true, data: { minutos_ordinarios_semanales: 2880, vigencia_desde: "2026-01-01" } };
  if (p.endsWith("/checador/holidays/all") || /\/checador\/holidays\/\d+$/.test(p)) {
    const festivos = [["2026-01-01", "Año Nuevo"], ["2026-02-02", "Día de la Constitución"], ["2026-03-16", "Natalicio de Benito Juárez"],
      ["2026-05-01", "Día del Trabajo"], ["2026-09-16", "Día de la Independencia"], ["2026-11-16", "Día de la Revolución"], ["2026-12-25", "Navidad"]]
      .map(([fecha, descripcion], i) => ({ id: i + 1, id_festivo: i + 1, fecha, descripcion, empresa_nombre: "Uniline", unidad_negocio: "Uniline Centro", id_empresa: 10 }));
    return { festivos, total: festivos.length, totalPages: 1 };
  }
  if (p.endsWith("/checador/empleados/puestos")) return [...new Set(empleados.map((e) => e.puesto))].map((n) => ({ nombre_puesto: n }));
  if (p.endsWith("/checador/empleados/activos") || p.endsWith("/checador/empleados")) return { data: empleados, empleados, total: empleados.length, totalPages: 1 };
  // Monitor y Asistencias.
  if (p.endsWith("/checador/asistencias") && metodo === "GET") {
    let regs = q.get("fechaInicio") === AYER ? datosMonitor() : filasAsistencia();
    if (q.get("filtroTipoRegistro")) regs = regs.filter((r) => /vacaci/i.test(r.tipo_registro_nombre));
    return { registros: regs, total: regs.length, page: 1, aplicarPaginacion: false, total_empleados: regs.length, total_presentes: 6, total_tardanzas: 1,
      total_ausencias: 2, total_con_horas_extra: 1, pendientes_horas_extra: 1 };
  }
  if (p.endsWith("/checador/cuenta-horas")) return { ok: true, data: { 13: 90 } };
  let m = /\/checador\/asistencias\/(\d+)\/reloj$/.exec(p);
  if (m) return metodo === "PUT" ? { ok: true } : relojDe(Number(m[1]));
  if (p.endsWith("/checador/cuenta-horas/por-reponer")) {
    return { ok: true, data: { hoy: F, totales: { personas: 3, debe: 330, mas_30_dias: 1 }, mes: { repuesto: 120, rebajado: 60, condonado: 0 },
      autorizadores, filas: [
        { id_empleado: 17, nombre: "Mariana López", area: "Oficina", debe: 180, desde: "2026-10-14", dias: 42, permisos: 2, motivos: ["Visita al médico", "Trámite"],
          ultima_reposicion: { minutos: 60, fecha: "2026-11-12" } },
        { id_empleado: 22, nombre: "Bruno Ríos", area: "Reparto", debe: 90, desde: "2026-11-18", dias: 7, permisos: 1, motivos: ["Escuela de los hijos"], ultima_reposicion: null },
        { id_empleado: 16, nombre: "Iván Delgado", area: "Producción", debe: 60, desde: "2026-11-21", dias: 4, permisos: 1, motivos: ["Permiso personal"], ultima_reposicion: null },
      ] } };
  }
  m = /\/checador\/cuenta-horas\/(\d+)$/.exec(p);
  if (m) return { ok: true, data: { debe: 180, movimientos: [
    { tipo: "cargo", fecha: "2026-10-14", minutos: 120, texto: "Permiso · llega tarde", id_solicitud: 290 },
    { tipo: "reposicion", fecha: "2026-11-12", minutos: 60, texto: "Repuso" },
    { tipo: "cargo", fecha: "2026-11-19", minutos: 120, texto: "Permiso · sale y regresa", id_solicitud: 296 },
  ], cargos: [], reposiciones: [], cierres: [] } };
  if (p.endsWith("/checador/reportes/horas-ley")) {
    const [a, b] = equipo;
    return { ok: true, data: { reglas: [], reportes: [reporteHoras(a, true), reporteHoras(b, false)] } };
  }
  // Entradas y salidas.
  if (p.endsWith("/checador/reloj/asistencia")) {
    const mov = (id, e, entrada, salida, o = {}) => ({ id, id_movimiento: id, id_empleado: e.id_empleado, nombre: e.nombre, nombre_empleado: e.nombre_completo,
      apellido_paterno: e.apellido_paterno, puesto: e.puesto, departamento: e.departamento, unidad_negocio: "Uniline Centro", nombre_empresa: "Uniline",
      entrada, salida, entrada_corregida: null, salida_corregida: null, estado: salida ? "Cerrado" : "Abierto", fecha: F, ...o });
    const registros = [
      mov(9001, equipo[0], t("08:57"), t("13:02")), mov(9002, equipo[0], t("14:01"), null),
      mov(9003, equipo[1], t("07:55"), null), mov(9004, equipo[3], t("08:10"), t("10:30"), { entrada_corregida: t("08:00") }),
      mov(9005, equipo[4], t("05:55"), t("11:02")), mov(9006, equipo[5], t("07:02"), null),
    ];
    return { registros, total: registros.length, totalPages: 1, empleados: 5, jornadas_completas: 2, pendientes: 3 };
  }
  // Reloj de la empresa y app del empleado.
  if (p.endsWith("/registros-del-dia")) {
    return { registrosHoy: [
      { nip: "1001", nombre: "Ana Torres", entrada: t("08:57"), salida: null, estado: "Abierto" },
      { nip: "1004", nombre: "Carlos Ramírez", entrada: t("08:10"), salida: t("10:30"), estado: "Cerrado", tipo_cierre: "comida" },
      { nip: "1005", nombre: "Sofía Méndez", entrada: t("05:55"), salida: t("11:02"), estado: "Cerrado" },
    ], activosHoy: 2, totalRegistrosHoy: 3, zona_horaria: ZONA };
  }
  if (p.endsWith("/registros-del-dia-empleado")) return { registrosHoy: [{ id: 3, entrada: t("08:57"), salida: t("13:02"), estado: "Cerrado" }, { id: 4, entrada: t("14:01"), salida: null, estado: "Abierto" }], zona_horaria: ZONA };
  if (p.endsWith("/reloj/registrar") || p.endsWith("/reloj/registrar-facial")) {
    return { message: "Entrada registrada", movimiento: "Entrada registrada", empleado: { nombre: "Ana", apellido_paterno: "Torres" },
      puntualidad: { estado: "a_tiempo", minutos: 0 }, salida_programada: "18:00" };
  }
  // Configuración del checador.
  if (p.endsWith("/checador/config-checador")) return { ok: true, data: { tolerancia_entrada_min: 10, tolerancia_salida_min: 0, jornada_minima_horas: 7.5 },
    tolerancia_entrada_min: 10, tolerancia_salida_min: 0, jornada_minima_horas: 7.5 };
  // Turnos.
  if (p.endsWith("/checador/turnos")) {
    const d = (dia, entrada, salida, sc = "14:00:00", rc = "15:00:00") => ({ dia, entrada, salida, salida_comida: sc, regreso_comida: rc });
    const lv = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
    return { turnos: [
      { id_turno: 1, nombre: "Matutino", descripcion: "Oficina y ventas", activo: 1, dias: [...lv.map((x) => d(x, "09:00:00", "18:00:00")), d("Sábado", "09:00:00", "13:00:00", null, null)] },
      { id_turno: 2, nombre: "Vespertino", descripcion: "Tienda", activo: 1, dias: lv.map((x) => d(x, "14:00:00", "22:00:00", "18:00:00", "18:30:00")) },
      { id_turno: 3, nombre: "Nocturno", descripcion: "Producción", activo: 1, dias: lv.map((x) => d(x, "22:00:00", "06:00:00", null, null)) },
      { id_turno: 4, nombre: "Fin de semana", descripcion: "", activo: 0, dias: [d("Sábado", "08:00:00", "16:00:00"), d("Domingo", "08:00:00", "16:00:00")] },
    ], total: 4 };
  }
  m = /\/checador\/turnos\/(\d+)\/empleados$/.exec(p);
  if (m) return { empleados: empleados.slice(0, 4) };
  // Turnos extra (mismo contrato que verify-turnos-extra.mjs).
  if (p.endsWith("/checador/turnos-extra") && metodo === "GET") {
    return { ok: true, data: [turnoExtra, { ...turnoExtra, id: 42, nombre: "Inventario de fin de mes", fecha: "2026-11-28", hora_inicio: "08:00", hora_fin: "14:00",
      motivo: "Inventario", personas: 2 }], ahora: Math.floor(Date.parse(`${F}T00:00:00Z`) / 60000) + 11 * 60 + 12 };
  }
  if (p.endsWith("/checador/turnos-extra/candidatos")) return { ok: true, data: candidatosExtra };
  m = /\/checador\/turnos-extra\/(\d+)$/.exec(p);
  if (m) return { ok: true, data: detalleExtra };
  // Incidencias usa /checador/asistencias (arriba).
  // Reportes personalizados.
  if (p.endsWith("/checador/reportes-personalizados")) {
    return { ok: true, data: [
      { id: 1, id_empresa: 10, nombre: "Retardos de la quincena", descripcion: "Para revisar antes de la prenómina", fuente: "Asistencia",
        columnas: ["nombre", "apellido_paterno", "departamento", "fecha", "entrada", "salida", "estadoAsistencia"], filtros_defecto: { estadoAsistencia: ["Tardanza"] },
        agrupacion: "empleado", creado_por_nombre: "Laura Ríos" },
      { id: 2, id_empresa: 10, nombre: "Checadas con GPS", descripcion: "Entradas y salidas con ubicación", fuente: "Reloj Checador",
        columnas: ["nombre_empleado", "fecha", "entrada", "salida", "latitud_entrada", "longitud_entrada"], filtros_defecto: {}, agrupacion: "ninguna" },
    ] };
  }
  // Festivos arriba. Mapa de rutas.
  if (p.endsWith("/checador/mapa-rutas/empleados-activos")) return { ok: true, data: empleados.slice(0, 5).map((e) => ({ ...e, nombre_completo: e.nombre_completo })) };
  if (p.endsWith("/checador/mapa-rutas/movimientos")) {
    const e = equipo[0];
    const mov = (id, fecha, he, hs, lat, lng, lat2, lng2) => ({ id, fecha, empleado: e.nombre_completo, puesto: e.puesto, departamento: e.departamento,
      hora_entrada: he, hora_salida: hs, entrada: `${fecha} ${he}:00`, salida: hs ? `${fecha} ${hs}:00` : null, lat_entrada: lat, lng_entrada: lng, lat_salida: lat2, lng_salida: lng2 });
    return { ok: true, data: [
      mov(1, "2026-11-24", "08:55", "11:40", 19.4326, -99.1332, 19.4361, -99.1415), mov(2, "2026-11-24", "12:05", "14:10", 19.4206, -99.1630, 19.4201, -99.1628),
      mov(3, "2026-11-24", "14:40", "18:02", 19.4285, -99.1277, 19.4327, -99.1334),
      mov(4, "2026-11-25", "08:57", "13:02", 19.4326, -99.1332, 19.4326, -99.1333), mov(5, "2026-11-25", "14:01", null, 19.4327, -99.1331, null, null),
    ] };
  }
  // Vacaciones.
  if (p.endsWith("/checador/vacaciones/reporte")) {
    return equipo.map((e, i) => ({ id_empleado: e.id_empleado, nombre_completo: e.nombre_completo, departamento: e.departamento, unidad_negocio: "Uniline Centro",
      dias_cargados: [12, 14, 16, 12, 18, 12, 20, 14][i], dias_tomados: [4, 14, 6, 0, 10, 2, 8, 5][i],
      dias_disponibles: [8, 0, 10, 12, 8, 10, 12, 9][i], fecha_ingreso: e.fecha_ingreso }));
  }
  m = /\/checador\/vacaciones\/(cargados|tomados)\/(\d+)$/.exec(p);
  if (m) {
    if (m[1] === "cargados") return { periodos: [{ id: 1, anios: 2, dias: 14, fecha_inicio: "2024-01-15", fecha_fin: "2025-01-15", estado: "Usada" },
      { id: 2, anios: 3, dias: 16, fecha_inicio: "2025-01-15", fecha_fin: "2026-01-15", estado: "Activa" }], data: [] };
    return { data: [{ id: 1, fecha: "2026-11-16", notas: "Vacaciones" }, { id: 2, fecha: "2026-11-17", notas: "Vacaciones" }] };
  }
  m = /\/checador\/vacaciones\/saldo\/(\d+)$/.exec(p);
  if (m) return { saldo: { id_empleado: Number(m[1]), dias_cargados: 12, dias_tomados: 4, dias_disponibles: 8 } };
  if (p.endsWith("/checador/vacaciones/mi-saldo")) return { dias_disponibles: 8, dias_cargados: 12, dias_tomados: 4 };
  if (p.endsWith("/checador/vacaciones-ley")) {
    const ley = [[1, 12], [2, 14], [3, 16], [4, 18], [5, 20], [6, 22], [11, 24], [16, 26], [21, 28], [26, 30], [31, 32]];
    return ley.map(([anios, dias], i) => ({ id: i + 1, id_empresa: 10, unidad_negocio: "Uniline Centro", nombre_empresa: "Uniline", anios, dias,
      prima_vacacional: 25, dias_extra: 0, prima_extra: 0, total_dias: dias, total_prima: 25 }));
  }
  if (p.endsWith("/checador/vacaciones-periodo")) {
    return equipo.slice(0, 6).map((e, i) => ({ id: i + 1, id_empleado: e.id_empleado, nombre_completo: e.nombre_completo, nombre: e.nombre,
      apellido_paterno: e.apellido_paterno, departamento: e.departamento, unidad_negocio: "Uniline Centro", id_empresa: 10, anios: 2 + (i % 3), dias: [14, 16, 18][i % 3],
      fecha_inicio: `2025-0${1 + i}-15`, fecha_fin: `2026-0${1 + i}-15`, estado: i === 4 ? "Usada" : "Activa", fecha_ingreso: e.fecha_ingreso }));
  }
  // Permisos.
  if (p.endsWith("/checador/solicitudes-permiso") && metodo === "GET") {
    return { results: { data: solicitudes, total: solicitudes.length }, data: solicitudes, total: solicitudes.length,
      estadisticas: { total: 8, pendientes: 3, aprobados: 4, rechazados: 1, cancelados: 0 } };
  }
  if (p.endsWith("/checador/solicitudes-permiso/por-autorizar")) {
    const pend = solicitudes.filter((s) => s.estado === "Pendiente");
    return { results: pend, data: pend, total: pend.length };
  }
  m = /\/checador\/solicitudes-permiso\/empleado\/(\d+)$/.exec(p);
  if (m) {
    const id = Number(m[1]);
    const propias = id === 15
      ? [sol(311, 15, "Vacaciones", 6, "2026-12-21", "2026-12-24", "Pendiente", { motivo: "Viaje familiar" }),
        sol(312, 15, "Entrada tarde", 31, "2026-11-10", "2026-11-10", "Aprobado", { modalidad: "horas", tipo_horas: "llega_tarde", hora_fin: "10:30", motivo_permiso: "Visita al médico" }),
        sol(313, 15, "Vacaciones", 6, "2026-07-06", "2026-07-10", "Aprobado"),
        sol(314, 15, "Inasistencia", 2, "2026-06-12", "2026-06-12", "Rechazado", { motivo_permiso: "Permiso personal", notas: "Ese día hay inventario" })]
      : solicitudes.filter((s) => s.id_empleado === id);
    return { results: { data: propias, total: propias.length }, total: propias.length };
  }
  // Mi espacio.
  m = /\/checador\/empleados\/panel-empleado\/(\d+)\/detalle$/.exec(p);
  if (m) {
    const dias = ["2026-11-25", "2026-11-24", "2026-11-23", "2026-11-20", "2026-11-19", "2026-11-18"];
    return { empleado: { ...empleados[0] }, asistencias: { historial: dias.map((fecha, i) => ({ fecha, estado: i === 2 ? "Retardo" : "Presente" })) },
      entradas_salidas: { registros: dias.map((fecha, i) => ({ id: i + 1, fecha, hora_entrada: i === 2 ? "09:14" : "08:5" + (i % 9), hora_salida: i === 0 ? "-" : "18:0" + (i % 9),
        estado: i === 2 ? "Retardo" : "A tiempo" })) } };
  }
  if (p.endsWith("/checador/mi-espacio/rostro")) return { ok: true, data: { registrado: true, actualizado_en: "2026-10-02 10:20:00", fotos: 5 } };
  if (p.endsWith("/checador/mi-equipo/hoy")) {
    const equipo = datosMonitor().slice(2, 9).map((r) => ({ ...r, horas_extra_registradas: [] }));
    return { es_jefe: true, fecha: F, zona_horaria: ZONA, total_equipo: equipo.length, registros: equipo };
  }
  return {};
}

// Backend local para las rutas de Next que consultan al servidor (Solicitudes de mi equipo).
async function backendLocal() {
  const port = await libre();
  const srv = http.createServer((req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    const auth = String(req.headers.authorization || "");
    let usuario = RH;
    try {
      const carga = JSON.parse(Buffer.from(auth.replace(/^Bearer /, "").split(".")[1] || "", "base64url").toString());
      usuario = carga.tipo_usuario === "Empleado" ? (carga.id_usuario === 1 ? JEFA : ANA) : RH;
    } catch {}
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const p = url.pathname.replace(/^\/api/, "");
      const data = api(req.method, p, url.searchParams, usuario, body ? JSON.parse(body) : null);
      res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
      res.end(JSON.stringify(data ?? {}));
    });
  });
  await new Promise((r) => srv.listen(port, "127.0.0.1", r));
  return { srv, url: `http://127.0.0.1:${port}/api` };
}

// ── Navegador ───────────────────────────────────────────────────────────────────────────────────────────────────────
const local = await backendLocal();
const portNext = await libre();
const base = `http://127.0.0.1:${portNext}`;
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(portNext), "-H", "127.0.0.1"], {
  stdio: "ignore", detached: true, env: { ...process.env, JWT_SECRET: secreto, ADAMIA_DEMO_INTERNAL_API: local.url },
});
// Cámara simulada: un cuadro neutro (fondo gris azulado con un óvalo claro), en lugar del patrón verde de prueba de Chromium.
async function videoNeutro() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "ayuda-camara-"));
  const W = 640, H = 480;
  const y = Buffer.alloc(W * H), u = Buffer.alloc((W / 2) * (H / 2), 128), v = Buffer.alloc((W / 2) * (H / 2), 134);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const dx = (i - W / 2) / 120, dy = (j - H / 2 + 10) / 160;
    y[j * W + i] = dx * dx + dy * dy < 1 ? 196 : 92 + Math.round((j / H) * 30);
  }
  const marco = Buffer.concat([Buffer.from("FRAME\n"), y, u, v]);
  const archivo = path.join(dir, "camara.y4m");
  await writeFile(archivo, Buffer.concat([Buffer.from(`YUV4MPEG2 W${W} H${H} F10:1 Ip A1:1 C420jpeg\n`), ...Array(10).fill(marco)]));
  return archivo;
}
const browser = await chromium.launch({ args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream",
  `--use-file-for-fake-video-capture=${await videoNeutro()}`] });
let conversor = null;

async function aWebp(png) {
  if (!conversor) conversor = await (await browser.newContext()).newPage();
  const dataUrl = await conversor.evaluate(async (b64png) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64png}`;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    c.getContext("2d").drawImage(img, 0, 0);
    return c.toDataURL("image/webp", 0.8);
  }, png.toString("base64"));
  return Buffer.from(dataUrl.split(",")[1], "base64");
}

async function contexto({ movil = false, usuario = RH, init = null } = {}) {
  const ctx = await browser.newContext({
    viewport: movil ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: movil, hasTouch: movil,
    locale: "es-MX", timezoneId: ZONA, permissions: ["camera", "geolocation"], geolocation: { latitude: 19.4326, longitude: -99.1332, accuracy: 10 },
  });
  await ctx.addCookies([{ name: "token", value: jwt({ tipo_usuario: usuario.tipo_usuario, id_usuario: usuario.id_usuario }), url: base }]);
  // Sin avisos de bienvenida, recorridos ni pop-ups de una sola vez; pantalla del reloj encendida.
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("adamia-asistencia-col-comida", "1");
      localStorage.setItem("adamia-asistencia-col-goce-editado-v2", "1");
      localStorage.setItem("adamia-asistencia-col-motivo-v2", "1");
      localStorage.setItem("adamia-asistencia-col-reloj", "1");
    } catch {}
    Object.defineProperty(navigator, "wakeLock", { configurable: true, value: { request: async () => ({ release: async () => {}, addEventListener() {} }) } });
  });
  if (init) await ctx.addInitScript(init);
  const cors = { "Access-Control-Allow-Origin": base, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "authorization,content-type",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS" };
  await ctx.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.pathname.startsWith("/api/empresas/check")) return route.fulfill({ status: 200, json: { hasActivePlan: true, slug: "uniline" } });
    if (url.origin === base) return route.continue();
    if (url.hostname !== "api.prueba.invalid") return route.abort(); // nada sale a internet (mapas, fuentes externas…)
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const p = url.pathname.replace(/^\/api/, "");
    let cuerpo = null;
    try { cuerpo = req.postDataJSON(); } catch {}
    const data = api(req.method(), p, url.searchParams, usuario, cuerpo);
    if (data === null) return route.abort();
    return route.fulfill({ status: 200, contentType: "application/json", headers: cors, body: JSON.stringify(data) });
  });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(AHORA);
  return { ctx, page };
}

// Una captura: abre la ruta, prepara la pantalla y guarda la imagen (completa o recortada a un elemento).
const resultados = [];
async function captura(nombre, { ruta, movil = false, usuario = RH, preparar = null, recorte = null, espera = 2500, init = null, completa = false }) {
  if (FILTRO.length && !FILTRO.some((f) => nombre.includes(f))) return;
  const { ctx, page } = await contexto({ movil, usuario, init });
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 140)));
  try {
    await page.goto(base + ruta, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    await dormir(espera);
    if (preparar) await preparar(page);
    await dormir(700);
    const objetivo = recorte ? (typeof recorte === "function" ? recorte(page) : page.locator(recorte).first()) : null;
    const png = objetivo?.clip ? await page.screenshot({ clip: await objetivo.clip() })
      : objetivo ? await objetivo.screenshot({ timeout: 15000 }) : await page.screenshot({ fullPage: completa });
    const webp = await aWebp(png);
    const archivo = path.join(SALIDA, `${nombre}.webp`);
    await mkdir(path.dirname(archivo), { recursive: true });
    await writeFile(archivo, webp);
    resultados.push(`ok   ${nombre}.webp ${Math.round(webp.length / 1024)} KB${errores.length ? ` · JS: ${errores.join(" | ")}` : ""}`);
  } catch (e) {
    resultados.push(`FALLA ${nombre}: ${String(e.message).split("\n")[0]}`);
  } finally {
    await ctx.close();
  }
}
const clic = async (page, loc) => { await loc.first().click({ timeout: 15000 }); await dormir(600); };

try {
  for (let i = 0; ; i++) { try { if ((await fetch(base + "/login")).status) break; } catch {} if (i > 400) throw new Error("Next no arrancó"); await dormir(150); }

  // ── Monitor ──
  await captura("monitor/monitor-tabla", { ruta: "/panel/monitor" });
  await captura("monitor/monitor-filtro-no-han-llegado", { ruta: "/panel/monitor", preparar: (pg) => clic(pg, pg.locator('[data-contador="no_ha_llegado"]')) });
  await captura("monitor/monitor-linea-del-dia", { ruta: "/panel/monitor", preparar: (pg) => clic(pg, pg.locator('[data-vista="linea"]')) });
  await captura("monitor/monitor-celular", { ruta: "/panel/monitor", movil: true });
  await captura("monitor/monitor-de-mi-equipo-celular", { ruta: "/empleado/panel/monitor-equipo", movil: true, usuario: JEFA });

  // ── Asistencias ──
  await captura("asistencias/asistencias-registros", { ruta: "/panel/registro-asistencia" });
  await captura("asistencias/asistencias-rango-de-fechas", { ruta: "/panel/registro-asistencia",
    preparar: (pg) => clic(pg, pg.getByRole("button", { name: /^Hoy/ })), recorte: '[role="dialog"]' });
  await captura("asistencias/asistencias-matriz", { ruta: "/panel/registro-asistencia", preparar: (pg) => clic(pg, pg.getByRole("button", { name: "Matriz" })) });
  await captura("asistencias/reloj-del-dia", { ruta: "/panel/registro-asistencia",
    preparar: (pg) => clic(pg, pg.getByRole("button", { name: "Abrir el reloj de Alondra Munguía" })), recorte: "[data-reloj-dia]" });
  await captura("asistencias/reloj-del-dia-cambio-de-hora", { ruta: "/panel/registro-asistencia",
    preparar: async (pg) => {
      await clic(pg, pg.getByRole("button", { name: "Abrir el reloj de Alondra Munguía" }));
      await pg.locator('[data-renglon="1"] input[aria-label="Entrada"]').fill("09:00");
      await dormir(400);
    }, recorte: "[data-reloj-dia]" });
  await captura("asistencias/reloj-del-dia-sin-checadas", { ruta: "/panel/registro-asistencia",
    preparar: (pg) => clic(pg, pg.getByRole("button", { name: "Abrir el reloj de Armando González" })), recorte: "[data-reloj-dia]" });
  await captura("asistencias/reloj-del-dia-hora-extra", { ruta: "/panel/registro-asistencia",
    preparar: (pg) => clic(pg, pg.getByRole("button", { name: "Abrir el reloj de Mario Gómez" })), recorte: "[data-reloj-dia]" });
  await captura("asistencias/reloj-del-dia-comida", { ruta: "/panel/registro-asistencia",
    preparar: (pg) => clic(pg, pg.getByRole("button", { name: "Abrir el reloj de Frida Serrano" })), recorte: "[data-reloj-dia]" });
  await captura("asistencias/reloj-del-dia-separar-extra", { ruta: "/panel/registro-asistencia",
    preparar: async (pg) => {
      await clic(pg, pg.getByRole("button", { name: "Abrir el reloj de Mario Gómez" }));
      await clic(pg, pg.getByRole("button", { name: /^Separar .* como hora extra$/ }));
    }, recorte: "[data-reloj-dia]" });
  await captura("asistencias/reloj-del-dia-permiso-del-dia", { ruta: "/panel/registro-asistencia",
    preparar: async (pg) => {
      await clic(pg, pg.getByRole("button", { name: "Abrir el reloj de Tomás Ruiz" }));
      const dlg = pg.locator("[data-reloj-dia]");
      await elegir(dlg.locator('[data-permiso-dia] [role=combobox]').first(), { label: "Salida temprano" });
      await dlg.getByLabel("¿A qué hora salió?").fill("14:00");
      await dormir(300);
      await elegir(dlg.locator('[data-permiso-dia] [role=combobox]').nth(1), { label: "Visita al médico" });
    }, recorte: "[data-reloj-dia]" });
  await captura("asistencias/que-paso-en-la-fila", { ruta: "/panel/registro-asistencia",
    preparar: async (pg) => {
      await elegir(pg.locator('[data-fila-asistencia="502"] [role=combobox]').first(), { label: "Inasistencia" });
      await dormir(300);
      await elegir(pg.locator('[data-fila-asistencia="502"] [role=combobox]').nth(1), { label: "Visita al médico" });
    },
    recorte: (pg) => ({ clip: async () => {
      const b = await pg.locator('[data-fila-asistencia="502"]').boundingBox();
      return { x: 270, y: Math.max(0, b.y - 60), width: 1170, height: b.height + 150 };
    } }) });
  await captura("asistencias/acciones-masivas", { ruta: "/panel/registro-asistencia",
    preparar: async (pg) => {
      await clic(pg, pg.getByRole("checkbox", { name: "Elegir a Armando González" }));
      await clic(pg, pg.getByRole("checkbox", { name: "Elegir a Juan Pérez" }));
      await clic(pg, pg.getByRole("checkbox", { name: "Elegir a Diego León" }));
    } });
  await captura("asistencias/acciones-masivas-marcar-como", { ruta: "/panel/registro-asistencia",
    preparar: async (pg) => {
      await clic(pg, pg.getByRole("checkbox", { name: "Elegir a Armando González" }));
      await clic(pg, pg.getByRole("checkbox", { name: "Elegir a Diego León" }));
      await clic(pg, pg.getByRole("button", { name: "Marcar como…" }));
      await pg.getByLabel("Estado para los seleccionados").selectOption({ label: "Día de descanso" }).catch(() => {});
      await pg.getByLabel("Motivo (obligatorio)").fill("Cambio de descanso autorizado");
    }, recorte: '[role="dialog"]' });
  await captura("asistencias/horas-de-ley", { ruta: "/panel/registro-asistencia?vista=horas" });
  await captura("asistencias/horas-por-reponer", { ruta: "/panel/registro-asistencia?vista=reponer" });
  await captura("asistencias/horas-por-reponer-registrar", { ruta: "/panel/registro-asistencia?vista=reponer",
    preparar: (pg) => clic(pg, pg.getByRole("button", { name: "Registrar reposición" })), recorte: '[role="dialog"]' });
  await captura("asistencias/asistencias-celular", { ruta: "/panel/registro-asistencia", movil: true });
  await captura("asistencias/tipos-de-registro", { ruta: "/panel/catalogos/tipos-registro" });
  await captura("asistencias/motivos-de-permiso", { ruta: "/panel/catalogos/tipos-registro",
    recorte: (pg) => pg.locator("section, div").filter({ has: pg.getByText("Motivos (por qué)", { exact: true }) }).last() });
  await captura("asistencias/entradas-y-salidas", { ruta: "/panel/registro-de-entradas-y-salidas" });
  await captura("asistencias/mis-asistencias-celular", { ruta: "/empleado/panel/asistencias", movil: true, usuario: ANA });

  // ── Reloj checador ──
  const kiosco = { ruta: "/uniline", espera: 5000 };
  await captura("reloj-checador/kiosco-rostro", kiosco);
  await captura("reloj-checador/kiosco-codigo", { ...kiosco, preparar: async (pg) => {
    await clic(pg, pg.getByRole("button", { name: /^Código$/ }));
    for (const k of ["1", "0", "0", "1"]) await pg.getByRole("button", { name: k, exact: true }).click();
  } });
  await captura("reloj-checador/kiosco-qr", { ...kiosco, preparar: (pg) => clic(pg, pg.getByRole("button", { name: /^QR$/ })) });
  await captura("reloj-checador/kiosco-voy-a-comer", { ...kiosco, preparar: async (pg) => { await clic(pg, pg.getByRole("button", { name: /^Código$/ })); await clic(pg, pg.locator('[aria-label="Voy a comer"]')); } });
  await captura("reloj-checador/kiosco-resultado", { ...kiosco, preparar: async (pg) => {
    await clic(pg, pg.getByRole("button", { name: /^Código$/ }));
    for (const k of ["1", "0", "0", "1"]) await pg.getByRole("button", { name: k, exact: true }).click();
    await pg.getByRole("button", { name: "Checar", exact: true }).click();
    await pg.getByText(/¡Listo, /).first().waitFor({ timeout: 15000 });
  } });
  await captura("reloj-checador/kiosco-celular", { ...kiosco, movil: true });
  await captura("reloj-checador/reloj-del-empleado-celular", { ruta: "/empleado/reloj-checador", movil: true, usuario: ANA, espera: 5000 });
  await captura("reloj-checador/configuracion-del-checador", { ruta: "/panel/configuracion-checador", completa: true });
  await captura("reloj-checador/mi-rostro-celular", { ruta: "/empleado/panel/mi-rostro", movil: true, usuario: ANA });

  // ── Turnos y turnos extra ──
  await captura("turnos/turnos-lista", { ruta: "/panel/turnos" });
  await captura("turnos/turno-nuevo", { ruta: "/panel/turnos", preparar: (pg) => clic(pg, pg.getByRole("button", { name: "Nuevo turno" })), recorte: '[role="dialog"]' });
  await captura("turnos/asignar-empleados", { ruta: "/panel/turnos", preparar: (pg) => clic(pg, pg.getByTitle("Asignar empleados")), recorte: '[role="dialog"]' });
  await captura("turnos-extra/turnos-extra", { ruta: "/panel/turnos-extra" });
  await captura("turnos-extra/turno-extra-nuevo", { ruta: "/panel/turnos-extra",
    preparar: (pg) => clic(pg, pg.getByRole("button", { name: "Nuevo turno extra" })), recorte: '[role="dialog"]' });

  // ── Incidencias y reportes ──
  await captura("incidencias/centro-de-incidencias", { ruta: "/panel/incidencias" });
  await captura("incidencias/incidencias-detalle", { ruta: "/panel/incidencias",
    preparar: async (pg) => { await clic(pg, pg.getByText("Mario Gómez", { exact: true })); await pg.mouse.wheel(0, 420); } });
  await captura("reporte-horas/reporte-de-horas", { ruta: "/panel/reporte-horas", espera: 5000 });
  await captura("reportes-personalizados/reportes-personalizados", { ruta: "/panel/reportes-personalizados" });
  await captura("reportes-personalizados/reporte-nuevo", { ruta: "/panel/reportes-personalizados",
    preparar: (pg) => clic(pg, pg.getByRole("button", { name: /Nuevo reporte/ })), recorte: '[role="dialog"]' });
  await captura("reportes-personalizados/reporte-ejecutar", { ruta: "/panel/reportes-personalizados",
    preparar: (pg) => clic(pg, pg.getByText("Retardos de la quincena").first()) });
  await captura("festivos/dias-festivos", { ruta: "/panel/festivos" });
  await captura("festivos/festivo-nuevo", { ruta: "/panel/festivos", preparar: (pg) => clic(pg, pg.getByRole("button", { name: /^Nuevo$/ })), recorte: '[role="dialog"]' });
  const buscarRuta = async (pg) => {
    await pg.getByPlaceholder("Buscar empleado...").first().fill("Ana");
    await dormir(400);
    await pg.getByText("Ana Torres", { exact: true }).first().dispatchEvent("mousedown");
    await clic(pg, pg.getByRole("button", { name: "Buscar", exact: true }));
    await dormir(800);
  };
  await captura("mapa-de-rutas/mapa-de-rutas", { ruta: "/panel/mapa-de-rutas", preparar: buscarRuta });
  await captura("mapa-de-rutas/mapa-de-rutas-reporte", { ruta: "/panel/mapa-de-rutas",
    preparar: async (pg) => { await buscarRuta(pg); await clic(pg, pg.getByRole("tab", { name: /Reporte/ })); } });

  // ── Vacaciones ──
  await captura("vacaciones/panel-de-vacaciones", { ruta: "/panel/vacaciones" });
  await captura("vacaciones/panel-de-vacaciones-detalle", { ruta: "/panel/vacaciones", preparar: (pg) => clic(pg, pg.locator("tr", { hasText: "Mariana López" }).locator("td").nth(1)) });
  await captura("vacaciones/vacaciones-masivas", { ruta: "/panel/vacaciones", preparar: (pg) => clic(pg, pg.getByRole("button", { name: "Masivas" })) });
  await captura("vacaciones/vacaciones-por-ley", { ruta: "/panel/vacaciones/por-ley" });
  await captura("vacaciones/vacaciones-por-periodo", { ruta: "/panel/vacaciones/por-periodo" });
  await captura("vacaciones/planeacion-de-vacaciones", { ruta: "/panel/vacaciones/planeacion" });
  await captura("vacaciones/registro-de-vacaciones", { ruta: "/panel/vacaciones/registro" });
  await captura("vacaciones/mis-solicitudes-celular", { ruta: "/empleado/panel/solicitudes", movil: true, usuario: ANA });
  await captura("vacaciones/nueva-solicitud-celular", { ruta: "/empleado/panel/solicitudes", movil: true, usuario: ANA,
    preparar: (pg) => clic(pg, pg.getByRole("button", { name: "Nueva solicitud" })), recorte: '[role="dialog"]' });

  // ── Permisos ──
  await captura("permisos/permisos-tabla", { ruta: "/panel/permisos" });
  const nuevoPermiso = async (pg, tipo, motivo) => {
    await clic(pg, pg.getByRole("button", { name: "Nuevo permiso" }));
    const dlg = pg.locator('[role="dialog"]');
    await clic(pg, dlg.getByRole("combobox").first());
    await clic(pg, pg.getByRole("option", { name: "Uniline" }));
    await elegir(dlg.getByLabel("Qué pasó"), { label: tipo });
    if (motivo) await elegir(dlg.getByLabel("Motivo"), { label: motivo });
    await clic(pg, dlg.locator("li", { hasText: "Ana Torres" }).locator("input"));
    await clic(pg, dlg.locator("li", { hasText: "Iván Delgado" }).locator("input"));
  };
  await captura("permisos/permiso-nuevo", { ruta: "/panel/permisos",
    preparar: async (pg) => {
      await nuevoPermiso(pg, "Inasistencia", "Visita al médico");
      const dlg = pg.locator('[role="dialog"]');
      await dlg.locator('input[type="date"]').first().fill("2026-11-27");
      await dlg.locator('input[type="date"]').nth(1).fill("2026-11-27");
    }, recorte: '[role="dialog"]' });
  await captura("permisos/permiso-por-horas", { ruta: "/panel/permisos",
    preparar: async (pg) => {
      await nuevoPermiso(pg, "Entrada tarde", "Visita al médico");
      const dlg = pg.locator('[role="dialog"]');
      await dlg.locator('input[type="date"]').first().fill("2026-11-27");
      await dlg.getByLabel("Hasta qué hora").fill("11:00").catch(() => {});
    }, recorte: '[role="dialog"]' });
  await captura("permisos/permiso-detalle", { ruta: "/panel/permisos",
    preparar: (pg) => clic(pg, pg.getByTitle("Ver").nth(3)), recorte: '[role="dialog"]' });
  await captura("permisos/permisos-calendario", { ruta: "/panel/permisos", preparar: (pg) => clic(pg, pg.getByRole("button", { name: "Calendario" })) });

  // ── Solicitudes de mi equipo ──
  await captura("solicitudes-equipo/solicitudes-de-mi-equipo", { ruta: "/panel/solicitudes-equipo", espera: 4000 });
  await captura("solicitudes-equipo/solicitud-detalle", { ruta: "/panel/solicitudes-equipo", espera: 4000,
    preparar: async (pg) => { await clic(pg, pg.getByRole("button", { name: /Ana Torres/ })); await dormir(2500); } });
  await captura("solicitudes-equipo/solicitudes-de-mi-equipo-celular", { ruta: "/empleado/panel/solicitudes-equipo", movil: true, usuario: JEFA, espera: 4000 });
} finally {
  console.log(resultados.join("\n"));
  await browser.close();
  local.srv.close();
  try { process.kill(-next.pid); } catch { next.kill(); }
}
