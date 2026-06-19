/**
 * test-reporte-campos.mjs
 *
 * Unit tests para las funciones de transformación del hook useReportePersonalizado.
 * Valida que cada campo del reporte se mapea y formatea correctamente.
 *
 * Ejecutar con:  node scripts/test-reporte-campos.mjs
 * Requiere Node.js >= 18 (usa node:test y node:assert nativos, sin instalar nada extra).
 *
 * Las funciones puras de transformación están duplicadas aquí para poder ejecutarse
 * fuera del entorno de Next.js (sin React, sin módulos @/).
 */

import { test } from "node:test";
import assert from "node:assert/strict";

// ─── Dependencia: dayjs (ya está en node_modules) ────────────────────────────
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

// ─── Copia de las funciones puras del hook (sin React ni axios) ───────────────

const DB_TIMEZONE = "America/Mexico_City";

function fmtBool(val) {
  if (val === null || val === undefined || val === "") return "—";
  return val ? "Sí" : "No";
}

function fmtTime(val, tz) {
  if (!val) return "—";
  try {
    const zona = tz || DB_TIMEZONE;
    const d = dayjs.tz(val, DB_TIMEZONE).tz(zona);
    return d.isValid() ? d.format("HH:mm") : "—";
  } catch {
    return "—";
  }
}

function fmtDate(val) {
  if (!val) return "—";
  try {
    const d = dayjs.tz(String(val).slice(0, 10), DB_TIMEZONE);
    return d.isValid() ? d.format("DD/MM/YYYY") : val;
  } catch {
    return val;
  }
}

function formatNombrePersona(nombre, apellidoPaterno, apellidoMaterno) {
  const partes = [nombre, apellidoPaterno, apellidoMaterno].filter(Boolean);
  return partes.length ? partes.join(" ") : "—";
}

function calcularHorasDebia(row) {
  if (!row.hora_entrada_programada || !row.hora_salida_programada) return 0;
  const entrada = dayjs(`2000-01-01 ${row.hora_entrada_programada}`);
  const salida = dayjs(`2000-01-01 ${row.hora_salida_programada}`);
  return Number((salida.diff(entrada, "minute") / 60).toFixed(2));
}

function calcularHorasTrabajadas(row, tz) {
  if (!row.entrada || !row.salida) return 0;
  const zona = tz || DB_TIMEZONE;
  const entrada = dayjs.tz(row.entrada, DB_TIMEZONE).tz(zona);
  const salida = dayjs.tz(row.salida, DB_TIMEZONE).tz(zona);
  const comida = Number(row.hrs_comida || 0);
  return Number((salida.diff(entrada, "minute") / 60 - comida).toFixed(2));
}

function formatDiferenciaHoras(horasDebia, horasTrabajo) {
  if (!horasDebia && !horasTrabajo) return "—";
  const diff = Number((horasTrabajo - horasDebia).toFixed(2));
  return diff > 0 ? `+${diff}` : String(diff);
}

function calcDuracion(entrada, salida, tz) {
  if (!entrada || !salida) return "—";
  try {
    const zona = tz || DB_TIMEZONE;
    const e = dayjs.tz(entrada, DB_TIMEZONE).tz(zona);
    const s = dayjs.tz(salida, DB_TIMEZONE).tz(zona);
    const diff = s.diff(e, "minute");
    if (diff <= 0) return "—";
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  } catch {
    return "—";
  }
}

function transformarFilaAsistencia(row) {
  const tz = row.zona_horaria || null;
  const unidad = row.unidad_negocio || row.sucursal || row.empresa_nombre || "—";
  const horasDebia = calcularHorasDebia(row);
  const horasTrabajo = calcularHorasTrabajadas(row, tz);

  return {
    nombre: row.nombre || "—",
    apellido_paterno: row.apellido_paterno || "—",
    apellido_materno: row.apellido_materno || "—",
    nip: row.nip || row.codigo || "—",
    departamento: row.departamento || "—",
    unidad_negocio: unidad,
    fecha: fmtDate(row.fecha),
    entrada: fmtTime(row.entrada, tz),
    salida: fmtTime(row.salida, tz),
    hrs_debia: horasDebia ? String(horasDebia) : "—",
    hrs_trabajo: horasTrabajo ? String(horasTrabajo) : "—",
    diferencia_horas: formatDiferenciaHoras(horasDebia, horasTrabajo),
    estadoAsistencia: row.estadoAsistencia || "—",
    estado: row.estado || "—",
    tipo_registro_nombre: row.tipo_registro_nombre || "—",
    correccion: fmtBool(row.correccion),
    autorizado_por: formatNombrePersona(
      row.nombre_autorizador,
      row.apellido_paterno_autorizador,
      row.apellido_materno_autorizador,
    ),
    hrs_extra: fmtBool(row.hrs_extra),
    forma_pago_extras: row.forma_pago_extras || "—",
    extras_autorizadas_por: formatNombrePersona(
      row.nombre_extra_autorizador,
      row.apellido_paterno_extra_autorizador,
      row.apellido_materno_extra_autorizador,
    ),
    hrs_comida: row.hrs_comida != null ? String(row.hrs_comida) : "—",
    goce_sueldo: fmtBool(row.goce_sueldo),
    es_festivo: fmtBool(row.es_festivo),
    es_domingo: fmtBool(row.es_domingo),
    pago_triple: fmtBool(row.pago_triple),
    prima_dominical:
      row.prima_dominical != null && row.prima_dominical !== ""
        ? `${row.prima_dominical} %`
        : "—",
    porcentaje_dia_festivo:
      row.porcentaje_dia_festivo != null ? `${row.porcentaje_dia_festivo}%` : "—",
    notas: row.notas || "—",
    notas_hrs_extra: row.notas_hrs_extra || "—",
    _empleado_key: `${row.nombre || ""} ${row.apellido_paterno || ""} ${row.apellido_materno || ""}`.trim(),
    _departamento_key: row.departamento || "Sin departamento",
    _fecha_key: row.fecha ? row.fecha.slice(0, 10) : "—",
  };
}

function transformarFilaReloj(row) {
  const tz = row.zona_horaria || null;
  const entradaUsada = row.entrada_corregida || row.entrada;
  const salidaUsada = row.salida_corregida || row.salida;
  const nombreCompleto =
    row.nombre_empleado ||
    `${row.nombre || ""} ${row.apellido_paterno || ""} ${row.apellido_materno || ""}`.trim();

  return {
    nombre_empleado: nombreCompleto || "—",
    nip: row.nip || row.codigo || "—",
    empresa_nombre: row.nombre_empresa || row.empresa_nombre || "—",
    departamento: row.departamento || "—",
    fecha: fmtDate(row.fecha || entradaUsada),
    entrada: fmtTime(row.entrada, tz),
    salida: fmtTime(row.salida, tz),
    entrada_corregida: row.entrada_corregida ? fmtTime(row.entrada_corregida, tz) : "—",
    salida_corregida: row.salida_corregida ? fmtTime(row.salida_corregida, tz) : "—",
    duracion: calcDuracion(entradaUsada, salidaUsada, tz),
    estado: row.estado || "—",
    tipo_cierre: row.tipo_cierre || "—",
    latitud_entrada: row.latitud_entrada != null ? String(row.latitud_entrada) : "—",
    longitud_entrada: row.longitud_entrada != null ? String(row.longitud_entrada) : "—",
    latitud_salida: row.latitud_salida != null ? String(row.latitud_salida) : "—",
    longitud_salida: row.longitud_salida != null ? String(row.longitud_salida) : "—",
    _empleado_key: nombreCompleto || "—",
    _departamento_key: row.departamento || "Sin departamento",
    _fecha_key: row.fecha
      ? row.fecha.slice(0, 10)
      : entradaUsada
        ? dayjs.tz(entradaUsada, DB_TIMEZONE).format("YYYY-MM-DD")
        : "—",
  };
}

// ─── Datos de prueba ──────────────────────────────────────────────────────────

// Fila de asistencia con todos los datos completos
const rowAsistenciaCompleto = {
  id_empleado: 42,
  nombre: "Alondra",
  apellido_paterno: "Arlin",
  apellido_materno: "Pérez",
  nip: "EMP001",
  departamento: "Ventas",
  sucursal: null,
  empresa_nombre: "Uniline",
  fecha: "2026-06-14",
  // Guardado en DB como CDMX (UTC-6), entrada = 09:00 CDMX
  entrada: "2026-06-14 09:00:00",
  salida: "2026-06-14 17:30:00",
  zona_horaria: "America/Mexico_City",
  hora_entrada_programada: "09:00:00",
  hora_salida_programada: "17:00:00",
  asistencia: 1,
  estadoAsistencia: "Presente",
  estado: "Cerrado",
  tipo_registro_nombre: "Normal",
  correccion: 0,
  nombre_autorizador: "Carlos",
  apellido_paterno_autorizador: "Ramírez",
  apellido_materno_autorizador: "López",
  hrs_extra: 1,
  forma_pago_extras: "Pago",
  nombre_extra_autorizador: "Laura",
  apellido_paterno_extra_autorizador: "García",
  apellido_materno_extra_autorizador: null,
  hrs_comida: 0.5,
  goce_sueldo: 0,
  es_festivo: 0,
  es_domingo: 0,
  pago_triple: 0,
  prima_dominical: 25,
  porcentaje_dia_festivo: null,
  notas: "Sin novedad",
  notas_hrs_extra: "Proyecto urgente",
};

// Fila de asistencia sin horas (presente manual, sin checada)
const rowAsistenciaSinHoras = {
  id_empleado: 99,
  nombre: "Cristian",
  apellido_paterno: "Cano",
  apellido_materno: null,
  departamento: null,
  empresa_nombre: "Uniline",
  fecha: "2026-06-14",
  entrada: null,
  salida: null,
  zona_horaria: "America/Mexico_City",
  hora_entrada_programada: null,
  hora_salida_programada: null,
  asistencia: 1,
  estadoAsistencia: "Presente",
  estado: null,
  correccion: null,
  nombre_autorizador: null,
  apellido_paterno_autorizador: null,
  apellido_materno_autorizador: null,
  hrs_extra: 0,
  goce_sueldo: 0,
  es_festivo: 0,
  es_domingo: 0,
  pago_triple: 0,
  prima_dominical: null,
  hrs_comida: null,
  notas: null,
  notas_hrs_extra: null,
};

// Fila del reloj checador con correcciones
const rowRelojCompleto = {
  id_empleado: 42,
  nombre: "Luis",
  apellido_paterno: "Ángel",
  apellido_materno: "García",
  nombre_empresa: "Uniline",
  departamento: "Development",
  nip: "EMP002",
  fecha: "2026-06-14",
  entrada: "2026-06-14 08:55:00",
  salida: "2026-06-14 18:10:00",
  entrada_corregida: null,
  salida_corregida: "2026-06-14 18:00:00",
  zona_horaria: "America/Mexico_City",
  estado: "Cerrado",
  tipo_cierre: "Automático",
  latitud_entrada: 20.9674,
  longitud_entrada: -89.5926,
  latitud_salida: null,
  longitud_salida: null,
};

// ─── Tests: transformarFilaAsistencia — fila completa ─────────────────────────

test("Asistencia completa: nombre y apellidos son passthrough", () => {
  const r = transformarFilaAsistencia(rowAsistenciaCompleto);
  assert.equal(r.nombre, "Alondra");
  assert.equal(r.apellido_paterno, "Arlin");
  assert.equal(r.apellido_materno, "Pérez");
});

test("Asistencia completa: fecha formateada DD/MM/YYYY", () => {
  const r = transformarFilaAsistencia(rowAsistenciaCompleto);
  assert.equal(r.fecha, "14/06/2026");
});

test("Asistencia completa: entrada y salida en HH:mm con timezone CDMX", () => {
  const r = transformarFilaAsistencia(rowAsistenciaCompleto);
  assert.equal(r.entrada, "09:00", `Esperado 09:00, obtenido ${r.entrada}`);
  assert.equal(r.salida, "17:30", `Esperado 17:30, obtenido ${r.salida}`);
});

test("Asistencia completa: hrs_debia calculado desde horario programado (8h)", () => {
  const r = transformarFilaAsistencia(rowAsistenciaCompleto);
  // 09:00 a 17:00 = 8 horas
  assert.equal(r.hrs_debia, "8", `Esperado 8, obtenido ${r.hrs_debia}`);
});

test("Asistencia completa: hrs_trabajo restando comida (8.5 - 0.5 = 8)", () => {
  const r = transformarFilaAsistencia(rowAsistenciaCompleto);
  // 09:00 a 17:30 = 8.5h, menos 0.5h comida = 8h
  assert.equal(r.hrs_trabajo, "8", `Esperado 8, obtenido ${r.hrs_trabajo}`);
});

test("Asistencia completa: diferencia_horas con signo correcto", () => {
  const r = transformarFilaAsistencia(rowAsistenciaCompleto);
  // debia=8, trabajo=8 → diferencia=0
  assert.equal(r.diferencia_horas, "0", `Esperado 0, obtenido ${r.diferencia_horas}`);
});

test("Asistencia completa: autorizado_por es nombre completo concatenado", () => {
  const r = transformarFilaAsistencia(rowAsistenciaCompleto);
  assert.equal(r.autorizado_por, "Carlos Ramírez López");
});

test("Asistencia completa: extras_autorizadas_por maneja apellido_materno null", () => {
  const r = transformarFilaAsistencia(rowAsistenciaCompleto);
  assert.equal(r.extras_autorizadas_por, "Laura García");
});

test("Asistencia completa: prima_dominical muestra porcentaje, no Sí/No", () => {
  const r = transformarFilaAsistencia(rowAsistenciaCompleto);
  assert.equal(r.prima_dominical, "25 %", `Esperado "25 %", obtenido "${r.prima_dominical}"`);
});

test("Asistencia completa: estadoAsistencia es passthrough", () => {
  const r = transformarFilaAsistencia(rowAsistenciaCompleto);
  assert.equal(r.estadoAsistencia, "Presente");
});

test("Asistencia completa: flags booleanos muestran Sí/No", () => {
  const r = transformarFilaAsistencia(rowAsistenciaCompleto);
  assert.equal(r.correccion, "No");
  assert.equal(r.hrs_extra, "Sí");
  assert.equal(r.goce_sueldo, "No");
  assert.equal(r.es_festivo, "No");
  assert.equal(r.es_domingo, "No");
  assert.equal(r.pago_triple, "No");
});

test("Asistencia completa: notas passthrough", () => {
  const r = transformarFilaAsistencia(rowAsistenciaCompleto);
  assert.equal(r.notas, "Sin novedad");
  assert.equal(r.notas_hrs_extra, "Proyecto urgente");
});

test("Asistencia completa: porcentaje_dia_festivo null → '—'", () => {
  const r = transformarFilaAsistencia(rowAsistenciaCompleto);
  assert.equal(r.porcentaje_dia_festivo, "—");
});

test("Asistencia completa: claves de agrupación", () => {
  const r = transformarFilaAsistencia(rowAsistenciaCompleto);
  assert.equal(r._empleado_key, "Alondra Arlin Pérez");
  assert.equal(r._departamento_key, "Ventas");
  assert.equal(r._fecha_key, "2026-06-14");
});

// ─── Tests: transformarFilaAsistencia — presente sin horas ───────────────────

test("Asistencia sin horas: entrada y salida muestran '—'", () => {
  const r = transformarFilaAsistencia(rowAsistenciaSinHoras);
  assert.equal(r.entrada, "—");
  assert.equal(r.salida, "—");
});

test("Asistencia sin horas: hrs_debia es '—' (sin horario programado)", () => {
  const r = transformarFilaAsistencia(rowAsistenciaSinHoras);
  assert.equal(r.hrs_debia, "—");
});

test("Asistencia sin horas: hrs_trabajo es '—'", () => {
  const r = transformarFilaAsistencia(rowAsistenciaSinHoras);
  assert.equal(r.hrs_trabajo, "—");
});

test("Asistencia sin horas: diferencia_horas es '—'", () => {
  const r = transformarFilaAsistencia(rowAsistenciaSinHoras);
  assert.equal(r.diferencia_horas, "—");
});

test("Asistencia sin horas: autorizado_por es '—' (todos null)", () => {
  const r = transformarFilaAsistencia(rowAsistenciaSinHoras);
  assert.equal(r.autorizado_por, "—");
});

test("Asistencia sin horas: estadoAsistencia sigue siendo 'Presente'", () => {
  const r = transformarFilaAsistencia(rowAsistenciaSinHoras);
  assert.equal(r.estadoAsistencia, "Presente");
});

test("Asistencia sin horas: departamento null → '—'", () => {
  const r = transformarFilaAsistencia(rowAsistenciaSinHoras);
  assert.equal(r.departamento, "—");
});

test("Asistencia sin horas: prima_dominical null → '—'", () => {
  const r = transformarFilaAsistencia(rowAsistenciaSinHoras);
  assert.equal(r.prima_dominical, "—");
});

test("Asistencia sin horas: apellido_materno null usa '—' en campo pero no contamina clave empleado", () => {
  const r = transformarFilaAsistencia(rowAsistenciaSinHoras);
  assert.equal(r.apellido_materno, "—");
  assert.equal(r._empleado_key, "Cristian Cano");
});

// ─── Tests: diferencia_horas con distintos escenarios ─────────────────────────

test("Diferencia positiva: trabajó más de lo que debía", () => {
  const rowExtra = {
    ...rowAsistenciaCompleto,
    salida: "2026-06-14 18:00:00",
    hrs_comida: 0,
  };
  const r = transformarFilaAsistencia(rowExtra);
  // 09:00 a 18:00 = 9h, debia 8h → +1
  assert.equal(r.diferencia_horas, "+1", `Esperado "+1", obtenido "${r.diferencia_horas}"`);
});

test("Diferencia negativa: trabajó menos de lo que debía", () => {
  const rowCorto = {
    ...rowAsistenciaCompleto,
    salida: "2026-06-14 16:00:00",
    hrs_comida: 0,
  };
  const r = transformarFilaAsistencia(rowCorto);
  // 09:00 a 16:00 = 7h, debia 8h → -1
  assert.equal(r.diferencia_horas, "-1", `Esperado "-1", obtenido "${r.diferencia_horas}"`);
});

// ─── Tests: transformarFilaReloj ──────────────────────────────────────────────

test("Reloj: nombre_empleado concatenado desde nombre/apellidos", () => {
  const r = transformarFilaReloj(rowRelojCompleto);
  assert.equal(r.nombre_empleado, "Luis Ángel García");
});

test("Reloj: empresa_nombre desde campo nombre_empresa del API", () => {
  const r = transformarFilaReloj(rowRelojCompleto);
  assert.equal(r.empresa_nombre, "Uniline");
});

test("Reloj: entrada en HH:mm con timezone CDMX", () => {
  const r = transformarFilaReloj(rowRelojCompleto);
  assert.equal(r.entrada, "08:55", `Esperado 08:55, obtenido ${r.entrada}`);
});

test("Reloj: salida usa salida original (no corregida) en columna entrada/salida", () => {
  const r = transformarFilaReloj(rowRelojCompleto);
  assert.equal(r.salida, "18:10", `Esperado 18:10, obtenido ${r.salida}`);
});

test("Reloj: salida_corregida se muestra en su columna propia", () => {
  const r = transformarFilaReloj(rowRelojCompleto);
  assert.equal(r.salida_corregida, "18:00", `Esperado 18:00, obtenido ${r.salida_corregida}`);
});

test("Reloj: entrada_corregida null → '—'", () => {
  const r = transformarFilaReloj(rowRelojCompleto);
  assert.equal(r.entrada_corregida, "—");
});

test("Reloj: duracion usa salida_corregida sobre salida original (08:55 a 18:00 = 09:05)", () => {
  const r = transformarFilaReloj(rowRelojCompleto);
  assert.equal(r.duracion, "09:05", `Esperado 09:05, obtenido ${r.duracion}`);
});

test("Reloj: fecha formateada DD/MM/YYYY", () => {
  const r = transformarFilaReloj(rowRelojCompleto);
  assert.equal(r.fecha, "14/06/2026");
});

test("Reloj: latitud/longitud con valor → string", () => {
  const r = transformarFilaReloj(rowRelojCompleto);
  assert.equal(r.latitud_entrada, "20.9674");
  assert.equal(r.longitud_entrada, "-89.5926");
});

test("Reloj: latitud/longitud null → '—'", () => {
  const r = transformarFilaReloj(rowRelojCompleto);
  assert.equal(r.latitud_salida, "—");
  assert.equal(r.longitud_salida, "—");
});

test("Reloj: clave empleado para agrupación", () => {
  const r = transformarFilaReloj(rowRelojCompleto);
  assert.equal(r._empleado_key, "Luis Ángel García");
});

test("Reloj: sin datos nombre_empleado pero con nombre_empresa inexistente → usa empresa_nombre", () => {
  const rowSoloEmpresaNombre = {
    ...rowRelojCompleto,
    nombre_empresa: null,
    empresa_nombre: "Corporativo ABC",
  };
  const r = transformarFilaReloj(rowSoloEmpresaNombre);
  assert.equal(r.empresa_nombre, "Corporativo ABC");
});

// ─── Tests: helpers individuales ─────────────────────────────────────────────

test("fmtBool: 1 → 'Sí', 0 → 'No', null → '—'", () => {
  assert.equal(fmtBool(1), "Sí");
  assert.equal(fmtBool(0), "No");
  assert.equal(fmtBool(null), "—");
  assert.equal(fmtBool(undefined), "—");
  assert.equal(fmtBool(""), "—");
});

test("fmtDate: fecha solo-fecha se muestra sin desfase de timezone", () => {
  assert.equal(fmtDate("2026-06-14"), "14/06/2026");
  assert.equal(fmtDate("2026-01-01"), "01/01/2026");
  assert.equal(fmtDate(null), "—");
});

test("fmtTime: null/undefined → '—'", () => {
  assert.equal(fmtTime(null), "—");
  assert.equal(fmtTime(undefined), "—");
  assert.equal(fmtTime(""), "—");
});

test("fmtTime: convierte correctamente desde CDMX", () => {
  // 09:00 guardado en CDMX (que es UTC-6 en horario estándar)
  const val = "2026-06-14 09:00:00";
  assert.equal(fmtTime(val, "America/Mexico_City"), "09:00");
});

test("calcDuracion: entrada null → '—'", () => {
  assert.equal(calcDuracion(null, "2026-06-14 17:00:00"), "—");
});

test("calcDuracion: entrada después de salida → '—'", () => {
  assert.equal(calcDuracion("2026-06-14 18:00:00", "2026-06-14 17:00:00"), "—");
});

test("calcDuracion: 1h 30m correcto", () => {
  const e = "2026-06-14 09:00:00";
  const s = "2026-06-14 10:30:00";
  assert.equal(calcDuracion(e, s), "01:30");
});

test("formatNombrePersona: omite partes null/undefined", () => {
  assert.equal(formatNombrePersona("Laura", "García", null), "Laura García");
  assert.equal(formatNombrePersona(null, null, null), "—");
  assert.equal(formatNombrePersona("Juan", null, "Pérez"), "Juan Pérez");
});
