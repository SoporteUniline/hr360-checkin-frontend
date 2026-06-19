// src/hooks/useReportePersonalizado.js
// Hook centralizado para el módulo de Reportes Personalizados.
// Gestiona fetch de datos de Asistencia y Reloj Checador, transformación
// de columnas seleccionadas y agrupación de filas en el frontend.
// Se relaciona con: useAsistenciaData.js, useRelojChecador.js, pdfReportePersonalizado.js

import { useState, useCallback } from "react";
import axios from "@/lib/axios";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

// ─────────────────────────────────────────────────────────────────────────────
// Definición de columnas disponibles por tipo de reporte
// Cada columna tiene: key único, label para UI/PDF, accessor (ruta en el objeto)
// y un formatter opcional.
// ─────────────────────────────────────────────────────────────────────────────

export const COLUMNAS_ASISTENCIA = [
  // Datos del empleado
  { key: "nombre", label: "Nombre", grupo: "Empleado", defaultOn: true },
  { key: "apellido_paterno", label: "Apellido Paterno", grupo: "Empleado", defaultOn: true },
  { key: "apellido_materno", label: "Apellido Materno", grupo: "Empleado", defaultOn: false },
  { key: "nip", label: "Código", grupo: "Empleado", defaultOn: false },
  { key: "departamento", label: "Departamento", grupo: "Empleado", defaultOn: true },
  { key: "unidad_negocio", label: "Unidad de Negocio", grupo: "Empleado", defaultOn: false },
  // Tiempo
  { key: "fecha", label: "Fecha", grupo: "Tiempo", defaultOn: true },
  { key: "entrada", label: "Entrada", grupo: "Tiempo", defaultOn: true },
  { key: "salida", label: "Salida", grupo: "Tiempo", defaultOn: true },
  { key: "hrs_debia", label: "Hrs. Debía", grupo: "Tiempo", defaultOn: true },
  { key: "hrs_trabajo", label: "Hrs. Trabajó", grupo: "Tiempo", defaultOn: true },
  { key: "diferencia_horas", label: "Hrs. +/-", grupo: "Tiempo", defaultOn: false },
  // Estado
  { key: "estadoAsistencia", label: "Estado Asistencia", grupo: "Estado", defaultOn: true },
  { key: "estado", label: "Estado Registro", grupo: "Estado", defaultOn: false },
  { key: "tipo_registro_nombre", label: "Tipo de Registro", grupo: "Estado", defaultOn: false },
  { key: "correccion", label: "Corrección", grupo: "Estado", defaultOn: false },
  { key: "autorizado_por", label: "Autorizado por", grupo: "Estado", defaultOn: false },
  // Extras
  { key: "hrs_extra", label: "Horas Extra", grupo: "Extras", defaultOn: false },
  { key: "forma_pago_extras", label: "Forma de Pago Extras", grupo: "Extras", defaultOn: false },
  { key: "extras_autorizadas_por", label: "Extras Autorizadas por", grupo: "Extras", defaultOn: false },
  { key: "hrs_comida", label: "Horas Comida", grupo: "Extras", defaultOn: false },
  { key: "goce_sueldo", label: "Goce de Sueldo", grupo: "Extras", defaultOn: false },
  // Festivos
  { key: "es_festivo", label: "Es Festivo", grupo: "Festivos", defaultOn: false },
  { key: "es_domingo", label: "Es Domingo", grupo: "Festivos", defaultOn: false },
  { key: "pago_triple", label: "Pago Triple", grupo: "Festivos", defaultOn: false },
  { key: "prima_dominical", label: "Prima Dominical", grupo: "Festivos", defaultOn: false },
  { key: "porcentaje_dia_festivo", label: "% Día Festivo", grupo: "Festivos", defaultOn: false },
  // Notas
  { key: "notas", label: "Observaciones", grupo: "Notas", defaultOn: false },
  { key: "notas_hrs_extra", label: "Notas Hrs. Extra", grupo: "Notas", defaultOn: false },
];

export const COLUMNAS_RELOJ = [
  // Datos del empleado
  { key: "nombre_empleado", label: "Empleado", grupo: "Empleado", defaultOn: true },
  { key: "nip", label: "Código", grupo: "Empleado", defaultOn: false },
  { key: "empresa_nombre", label: "Empresa", grupo: "Empleado", defaultOn: false },
  { key: "departamento", label: "Departamento", grupo: "Empleado", defaultOn: true },
  // Tiempo
  { key: "fecha", label: "Fecha", grupo: "Tiempo", defaultOn: true },
  { key: "entrada", label: "Entrada", grupo: "Tiempo", defaultOn: true },
  { key: "salida", label: "Salida", grupo: "Tiempo", defaultOn: true },
  { key: "entrada_corregida", label: "Entrada Corregida", grupo: "Tiempo", defaultOn: false },
  { key: "salida_corregida", label: "Salida Corregida", grupo: "Tiempo", defaultOn: false },
  { key: "duracion", label: "Duración", grupo: "Tiempo", defaultOn: true },
  // Estado
  { key: "estado", label: "Estado", grupo: "Estado", defaultOn: true },
  { key: "tipo_cierre", label: "Tipo de Cierre", grupo: "Estado", defaultOn: false },
  // GPS
  { key: "latitud_entrada", label: "Lat. Entrada", grupo: "GPS", defaultOn: false },
  { key: "longitud_entrada", label: "Lon. Entrada", grupo: "GPS", defaultOn: false },
  { key: "latitud_salida", label: "Lat. Salida", grupo: "GPS", defaultOn: false },
  { key: "longitud_salida", label: "Lon. Salida", grupo: "GPS", defaultOn: false },
];

// ─────────────────────────────────────────────────────────────────────────────
// Opciones de agrupación disponibles
// ─────────────────────────────────────────────────────────────────────────────
export const OPCIONES_AGRUPACION = [
  { value: "ninguna", label: "Sin agrupación" },
  { value: "empleado", label: "Por empleado" },
  { value: "departamento", label: "Por departamento" },
  { value: "fecha", label: "Por fecha (día)" },
  { value: "semana", label: "Por semana" },
  { value: "mes", label: "Por mes" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de formato — alineados con AsistenciaRow y EntradasSalidasRow
// ─────────────────────────────────────────────────────────────────────────────

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

// Indexa movimientos del reloj por empleado + fecha para enriquecer asistencias
function indexarMovimientos(movimientos) {
  const idx = new Map();
  movimientos.forEach((m) => {
    const entradaRef = m.entrada_corregida || m.entrada;
    if (!entradaRef || !m.id_empleado) return;
    const fecha = dayjs.tz(entradaRef, DB_TIMEZONE).format("YYYY-MM-DD");
    const key = `${m.id_empleado}_${fecha}`;
    if (!idx.has(key)) idx.set(key, []);
    idx.get(key).push(m);
  });
  idx.forEach((movs) => {
    movs.sort((a, b) => {
      const ea = a.entrada_corregida || a.entrada;
      const eb = b.entrada_corregida || b.entrada;
      return dayjs.tz(ea, DB_TIMEZONE).diff(dayjs.tz(eb, DB_TIMEZONE));
    });
  });
  return idx;
}

function extraerEntradaSalidaMovimientos(movs) {
  if (!movs?.length) return { entrada: null, salida: null };
  const first = movs[0];
  const last = movs[movs.length - 1];
  const entrada = first.entrada_corregida || first.entrada || null;
  let salida = last.salida_corregida || last.salida || null;
  if (!salida) {
    for (let i = movs.length - 1; i >= 0; i -= 1) {
      const s = movs[i].salida_corregida || movs[i].salida;
      if (s) {
        salida = s;
        break;
      }
    }
  }
  return { entrada, salida };
}

function enriquecerFilaAsistencia(row, idxMovimientos) {
  if (row.entrada && row.salida) return row;
  const fechaKey = row.fecha ? String(row.fecha).slice(0, 10) : null;
  if (!fechaKey || !row.id_empleado) return row;
  const movs = idxMovimientos.get(`${row.id_empleado}_${fechaKey}`);
  if (!movs?.length) return row;
  const { entrada, salida } = extraerEntradaSalidaMovimientos(movs);
  return {
    ...row,
    entrada: row.entrada || entrada,
    salida: row.salida || salida,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Transformadores de filas crudas del API → filas normalizadas
// ─────────────────────────────────────────────────────────────────────────────

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
    porcentaje_dia_festivo: row.porcentaje_dia_festivo != null ? `${row.porcentaje_dia_festivo}%` : "—",
    notas: row.notas || "—",
    notas_hrs_extra: row.notas_hrs_extra || "—",
    // Claves para agrupación (sin formato)
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
    // Claves para agrupación (sin formato)
    _empleado_key: nombreCompleto || "—",
    _departamento_key: row.departamento || "Sin departamento",
    _fecha_key: row.fecha
      ? row.fecha.slice(0, 10)
      : entradaUsada
        ? dayjs.tz(entradaUsada, DB_TIMEZONE).format("YYYY-MM-DD")
        : "—",
  };
}

// Exportaciones para pruebas y depuración (no usar en producción directamente)
export { transformarFilaAsistencia as _transformarAsistencia, transformarFilaReloj as _transformarReloj };

// ─────────────────────────────────────────────────────────────────────────────
// Función de agrupación de filas ya transformadas
// ─────────────────────────────────────────────────────────────────────────────

export function agruparFilas(filas, agrupacion) {
  if (!agrupacion || agrupacion === "ninguna") {
    return [{ key: null, label: null, filas }];
  }

  const mapa = new Map();

  filas.forEach((fila) => {
    let clave;
    let etiqueta;

    if (agrupacion === "empleado") {
      clave = fila._empleado_key;
      etiqueta = fila._empleado_key;
    } else if (agrupacion === "departamento") {
      clave = fila._departamento_key;
      etiqueta = fila._departamento_key;
    } else if (agrupacion === "fecha") {
      clave = fila._fecha_key;
      etiqueta = fila.fecha; // ya formateado DD/MM/YYYY
    } else if (agrupacion === "semana") {
      // Agrupar por semana (lunes a domingo) usando cálculo nativo
      const d = dayjs(fila._fecha_key);
      if (d.isValid()) {
        const diaSemana = d.day() === 0 ? 7 : d.day(); // 1=lun ... 7=dom
        const lunes = d.subtract(diaSemana - 1, "day");
        const domingo = lunes.add(6, "day");
        clave = lunes.format("YYYY-MM-DD");
        etiqueta = `Semana del ${lunes.format("DD/MM")} al ${domingo.format("DD/MM/YYYY")}`;
      } else {
        clave = fila._fecha_key;
        etiqueta = clave;
      }
    } else if (agrupacion === "mes") {
      const d = dayjs(fila._fecha_key);
      if (d.isValid()) {
        clave = d.format("YYYY-MM");
        // Nombre del mes en español usando Intl (nativo, sin plugins)
        const fecha = new Date(fila._fecha_key + "T00:00:00Z");
        const mesNombre = fecha.toLocaleDateString("es-MX", { month: "long", year: "numeric", timeZone: "UTC" });
        etiqueta = mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1);
      } else {
        clave = fila._fecha_key;
        etiqueta = clave;
      }
    } else {
      clave = "todos";
      etiqueta = null;
    }

    if (!mapa.has(clave)) {
      mapa.set(clave, { key: clave, label: etiqueta, filas: [] });
    }
    mapa.get(clave).filas.push(fila);
  });

  return Array.from(mapa.values());
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch paginado — el API devuelve { registros, totalPages }
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 500;

function extraerRegistros(data) {
  if (Array.isArray(data?.registros)) return data.registros;
  if (Array.isArray(data?.asistencias)) return data.asistencias;
  if (Array.isArray(data?.movimientos)) return data.movimientos;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

async function fetchAllRegistros(endpoint, baseParams) {
  const firstParams = new URLSearchParams(baseParams);
  firstParams.set("page", "1");
  firstParams.set("limit", String(PAGE_SIZE));

  const firstRes = await axios.get(`${endpoint}?${firstParams.toString()}`);
  let allRows = extraerRegistros(firstRes.data);
  const totalPages = Number(firstRes.data?.totalPages || 1);

  for (let page = 2; page <= totalPages; page += 1) {
    const pageParams = new URLSearchParams(baseParams);
    pageParams.set("page", String(page));
    pageParams.set("limit", String(PAGE_SIZE));
    const pageRes = await axios.get(`${endpoint}?${pageParams.toString()}`);
    allRows = allRows.concat(extraerRegistros(pageRes.data));
  }

  return allRows;
}

function filtrarPorEstadosAsistencia(filas, estados) {
  if (!estados?.length) return filas;
  const set = new Set(estados);
  return filas.filter((f) => set.has(f.estadoAsistencia));
}

function filtrarPorEstadosMovimiento(filas, estados) {
  if (!estados?.length) return filas;
  const set = new Set(estados);
  return filas.filter((f) => set.has(f.estado));
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook principal
// ─────────────────────────────────────────────────────────────────────────────

export default function useReportePersonalizado() {
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ultimosFiltros, setUltimosFiltros] = useState(null);

  // Obtiene datos del API de Asistencias o Reloj Checador según el tipo.
  // Descarga TODOS los registros (sin paginación) para el PDF/Excel.
  const fetchReporte = useCallback(async ({ tipoReporte, filtros }) => {
    setLoading(true);
    setError(null);
    setDatos([]);

    try {
      let filasCrudas = [];

      // Normalizar filtros de estado: array o string legacy "A,B"
      const estadosAsistencia = Array.isArray(filtros.estadoAsistencia)
        ? filtros.estadoAsistencia
        : filtros.estadoAsistencia
          ? String(filtros.estadoAsistencia).split(",").filter(Boolean)
          : [];
      const estadosMovimiento = Array.isArray(filtros.estadoMovimiento)
        ? filtros.estadoMovimiento
        : filtros.estadoMovimiento
          ? String(filtros.estadoMovimiento).split(",").filter(Boolean)
          : [];

      if (tipoReporte === "asistencia") {
        const baseParams = new URLSearchParams({
          empresa: String(filtros.empresa || "all"),
        });
        if (filtros.fechaInicio) baseParams.append("fechaInicio", filtros.fechaInicio);
        if (filtros.fechaFin) baseParams.append("fechaFin", filtros.fechaFin);
        if (filtros.empleado) baseParams.append("filtroEmpleado", filtros.empleado);
        if (filtros.departamento) baseParams.append("filtroDepartamento", filtros.departamento);
        if (filtros.tipoRegistro) baseParams.append("filtroTipoRegistro", filtros.tipoRegistro);
        // Backend solo acepta un estado; con varios chips filtramos en frontend
        if (estadosAsistencia.length === 1) {
          baseParams.append("filtroEstadoAsistencia", estadosAsistencia[0]);
        }

        const movParams = new URLSearchParams({
          empresa: String(filtros.empresa || "all"),
        });
        if (filtros.fechaInicio) movParams.append("desde", filtros.fechaInicio);
        if (filtros.fechaFin) movParams.append("hasta", filtros.fechaFin);
        if (filtros.empleado) movParams.append("nombre", filtros.empleado);
        if (filtros.departamento) movParams.append("departamento", filtros.departamento);

        const [asistenciasCrudas, movimientosCrudos] = await Promise.all([
          fetchAllRegistros("/checador/asistencias", baseParams),
          fetchAllRegistros("/checador/reloj/asistencia", movParams),
        ]);

        const idxMovimientos = indexarMovimientos(movimientosCrudos);
        filasCrudas = asistenciasCrudas
          .map((row) => enriquecerFilaAsistencia(row, idxMovimientos))
          .map(transformarFilaAsistencia);
        if (estadosAsistencia.length > 1) {
          filasCrudas = filtrarPorEstadosAsistencia(filasCrudas, estadosAsistencia);
        }
      } else {
        const baseParams = new URLSearchParams({
          empresa: String(filtros.empresa || "all"),
        });
        if (filtros.fechaInicio) baseParams.append("desde", filtros.fechaInicio);
        if (filtros.fechaFin) baseParams.append("hasta", filtros.fechaFin);
        if (filtros.empleado) baseParams.append("nombre", filtros.empleado);
        if (filtros.departamento) baseParams.append("departamento", filtros.departamento);
        if (estadosMovimiento.length === 1) {
          baseParams.append("estado", estadosMovimiento[0]);
        }

        filasCrudas = await fetchAllRegistros("/checador/reloj/asistencia", baseParams);
        filasCrudas = filasCrudas.map(transformarFilaReloj);
        if (estadosMovimiento.length > 1) {
          filasCrudas = filtrarPorEstadosMovimiento(filasCrudas, estadosMovimiento);
        }
      }

      setDatos(filasCrudas);
      setUltimosFiltros({ tipoReporte, filtros });
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Error al obtener los datos del reporte.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Filtra las columnas activas y devuelve solo los valores seleccionados para cada fila
  const aplicarColumnas = useCallback((filas, columnasActivas) => {
    return filas.map((fila) => {
      const filtrada = {};
      columnasActivas.forEach((col) => {
        filtrada[col.key] = fila[col.key] ?? "—";
      });
      return filtrada;
    });
  }, []);

  return {
    datos,
    loading,
    error,
    ultimosFiltros,
    fetchReporte,
    aplicarColumnas,
  };
}
