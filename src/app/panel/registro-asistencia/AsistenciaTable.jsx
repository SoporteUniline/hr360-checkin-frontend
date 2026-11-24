import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import LocalClockRows from '@/components/Clock/LocalClockRows';
import AsistenciaRow from "./AsistenciaRow";
import { Button } from "@/components/ui/button";
import { Plus, FileSpreadsheet } from "lucide-react";
import { exportToExcel } from "@/utils/exportExcelJS";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useEmpresaTimezone } from "@/context/AuthContext";
import { Fragment, useEffect, useMemo, useState } from "react";
import HeaderMultiFilter from "@/components/tabla/HeaderMultiFilter";
import ActiveFilterChips from "@/components/tabla/ActiveFilterChips";
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronDown } from "lucide-react";
import { calcularResumenJornada, formatearMinutos } from "@/utils/asistenciaHoras";
import { resumenCambios } from "@/lib/asistencia/cambios.mjs";
import { crearFormateadorCambios } from "./CeldaEditado";
import { useSnackbar } from "notistack";
import useHorasExtra from "@/hooks/useHorasExtra";
import AccionesMasivas from "./AccionesMasivas";
import { diaFila, estadoFila } from "@/lib/asistencia/relojDia.mjs";
import { minutosDescanso, sinSalidaAComer } from "@/lib/asistencia/jornada.mjs";
import { ahoraBase, textoComida } from "@/lib/reporte/comida.mjs";
import {
  ETIQUETAS_ESTADO, cambiosAutorizar, cambiosNoAutorizar, cambiosQuitar,
  estadoHorasExtra, etiquetaHorasExtra, ordenarPorHorasExtra,
} from "@/lib/asistencia/horasExtra.mjs";

dayjs.extend(utc);
dayjs.extend(timezone);

// Registro de columnas renderizables de la tabla de asistencias, en orden de
// aparición. `extra: true` marca las columnas controladas por
// `mostrarCamposExtras` (campos extras).
export const COLUMNAS_ASISTENCIA = [
  { key: "empleado", label: "Empleado", extra: false },
  { key: "unidad", label: "Unidad", extra: false },
  { key: "codigo", label: "Código", extra: true },
  { key: "departamento", label: "Departamento", extra: false },
  { key: "fecha", label: "Fecha", extra: false },
  { key: "entrada", label: "Entrada", extra: false },
  { key: "salida", label: "Salida", extra: false },
  { key: "jornada", label: "Trabajadas", extra: false },
  { key: "comida", label: "Comida", extra: false },
  { key: "hrs_extra", label: "Horas extra", extra: false },
  { key: "dia", label: "Día (festivo / domingo)", extra: false },
  { key: "estado_asistencia", label: "Estado · motivo", extra: false },
  { key: "reloj", label: "Reloj", extra: false },
  { key: "notas", label: "Observaciones", extra: true },
];
// Columnas nuevas del reloj: se muestran una vez aunque haya columnas guardadas (ver page.jsx).
export const COLUMNAS_RELOJ_NUEVAS = ["dia", "estado_asistencia", "reloj"];

const EXTRA_COLUMN_KEYS = new Set(
  COLUMNAS_ASISTENCIA.filter((col) => col.extra).map((col) => col.key),
);

// Clases base para los th (header sticky dentro del contenedor con scroll)
const TH_STICKY = "sticky top-0 z-10 h-10 whitespace-nowrap bg-slate-50 align-middle text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500";

export default function AsistenciaTable({
  localEvents = [],
  filtrados,
  departamentosCatalogo,
  fecha,
  readOnly = false, // Si true, oculta acciones/botones (vista informativa)
  editingRowId,
  editingRowData,
  isSaving,
  empleados,
  tiposPermiso,
  handleEditClick,
  handleCancelEdit,
  handleActualizarBase,
  handleRestoreOriginal,
  handleFieldChange,
  handleSaveClick,
  mutateAsistencia,
  mostrarCamposExtras,
  abrirFormulario,
  onResetFilters,
  empresaActiva,
  filterOptionsRows,
  cargarPeriodoParaExportar,
  indiceFestivos = null,
  page = 1,
  limit = 10,
  onHeaderFilteringMetaChange,
  sortConfig,
  setSortConfig,
  setPage,
  visibleColumns,
  onRowClick,
  agrupar = null,
  footer = null,
  soloHorasExtra = false,
  soloSinComida = false,
  // «Control de horas extra»: columnas Decidió / Semana / Alertas y filtro de estados desde las tarjetas.
  control = null,
  estadosHorasExtra = null,
  ocultarRegistroMasivo = false,
  onAbrirReloj = null,
}) {
  // Para el Excel usamos la zona de la primera empresa visible (o la activa como fallback)
  const fallbackTimezone = useEmpresaTimezone(empresaActiva);
  const userTimezone = filtrados?.[0]?.zona_horaria || fallbackTimezone;
  const DB_TIMEZONE = "America/Mexico_City";
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState([]);
  const [unidadSeleccionada, setUnidadSeleccionada] = useState([]);
  const [departamentoSeleccionado, setDepartamentoSeleccionado] = useState([]);
  const [tipoSeleccionado, setTipoSeleccionado] = useState([]);
  const [asistioSeleccionado, setAsistioSeleccionado] = useState([]);
  const [goceSeleccionado, setGoceSeleccionado] = useState([]);
  const [horasExtraSeleccionado, setHorasExtraSeleccionado] = useState([]);
  useEffect(() => {
    if (Array.isArray(estadosHorasExtra)) setHorasExtraSeleccionado(estadosHorasExtra);
  }, [estadosHorasExtra]);
  const [festivoSeleccionado, setFestivoSeleccionado] = useState([]);
  const [autorizacionSeleccionada, setAutorizacionSeleccionada] = useState([]);
  const [correccionSeleccionada, setCorreccionSeleccionada] = useState([]);
  const [estadoAsistenciaSeleccionado, setEstadoAsistenciaSeleccionado] =
    useState([]);
  const [collapsedGroups, setCollapsedGroups] = useState(() => new Set());

  // Visibilidad de columnas: si `visibleColumns` viene (no vacío) manda sobre
  // `mostrarCamposExtras`; si no, se conserva el comportamiento actual.
  const visibleSet =
    Array.isArray(visibleColumns) && visibleColumns.length > 0
      ? new Set(visibleColumns)
      : null;
  const colVisible = (key) => {
    if (visibleSet) return visibleSet.has(key);
    return EXTRA_COLUMN_KEYS.has(key) ? Boolean(mostrarCamposExtras) : true;
  };

  const visibleColumnCount =
    COLUMNAS_ASISTENCIA.filter((col) => {
      if (col.key === "unidad" && empresaActiva !== "all") return false;
      return colVisible(col.key);
    }).length + (control ? 3 : 0) || 1;

  const optionSourceRows = useMemo(
    () => (Array.isArray(filterOptionsRows) ? filterOptionsRows : filtrados),
    [filterOptionsRows, filtrados],
  );

  const getEmpleadoNombre = (registro) =>
    [registro.nombre, registro.apellido_paterno, registro.apellido_materno]
      .filter(Boolean)
      .join(" ")
      .trim();

  const uniqueOptions = (values) =>
    [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const zonaDe = (registro) => registro.zona_horaria || fallbackTimezone;
  // Vistas guardadas antes de los estados de horas extra usan "Sí" / "No".
  const ETIQUETA_HX_ANTERIOR = { Sí: ETIQUETAS_ESTADO.autorizada, No: ETIQUETAS_ESTADO.sin };
  const toYesNo = (value) => (value === 1 || value === true ? "Sí" : "No");
  const toCorreccion = (registro) =>
    Boolean(Number(registro.correccion)) ? "Editado" : "Sin editar";

  const correccionOptions = ["Editado", "Sin editar"];

  const toAutorizacion = (registro) =>
    registro.autorizado_por || registro.nombre_autorizador
      ? "Con autorización"
      : "Sin autorización";

  const empleadoOptions = useMemo(
    () =>
      uniqueOptions(
        optionSourceRows.map((registro) => getEmpleadoNombre(registro)),
      ),
    [optionSourceRows],
  );
  const unidadNegocioOptions = useMemo(
    () =>
      uniqueOptions(
        optionSourceRows.map(
          (registro) =>
            registro.unidad_negocio ||
            registro.sucursal ||
            registro.empresa_nombre,
        ),
      ),
    [optionSourceRows],
  );
  const departamentoOptions = useMemo(() => {
    if (departamentosCatalogo && departamentosCatalogo.length > 0) {
      return [...new Set(departamentosCatalogo.map((d) => d.nombre))].sort();
    }
    return uniqueOptions(
      optionSourceRows.map((registro) => registro.departamento),
    );
  }, [departamentosCatalogo, optionSourceRows]);
  const tipoOptions = useMemo(
    () =>
      uniqueOptions(
        optionSourceRows.map((registro) => registro.tipo_registro_nombre),
      ),
    [optionSourceRows],
  );
  const asistioOptions = useMemo(
    () =>
      uniqueOptions(
        optionSourceRows.map((registro) => toYesNo(registro.asistencia)),
      ),
    [optionSourceRows],
  );
  const goceOptions = useMemo(
    () =>
      uniqueOptions(
        optionSourceRows.map((registro) => toYesNo(registro.goce_sueldo)),
      ),
    [optionSourceRows],
  );
  const horasExtraOptions = useMemo(
    () =>
      uniqueOptions(
        optionSourceRows.map((registro) => etiquetaHorasExtra(registro, zonaDe(registro))),
      ),
    [optionSourceRows],
  );
  const festivoOptions = useMemo(
    () =>
      uniqueOptions(
        optionSourceRows.map((registro) => toYesNo(registro.es_festivo)),
      ),
    [optionSourceRows],
  );
  const estadoAsistenciaOptions = useMemo(
    () =>
      uniqueOptions(
        optionSourceRows.map((registro) => estadoFila(registro).texto),
      ),
    [optionSourceRows],
  );
  const autorizacionOptions = useMemo(
    () =>
      uniqueOptions(
        optionSourceRows.map((registro) => toAutorizacion(registro)),
      ),
    [optionSourceRows],
  );

  // Filtros por columna: se aplican igual a la vista y a lo que se exporta.
  const pasaFiltrosEncabezado = (registro) => {
    const nombreEmpleado = getEmpleadoNombre(registro);
    const pasaEmpleado =
      empleadoSeleccionado.length === 0 ||
      empleadoSeleccionado.includes(nombreEmpleado);
    const unidadRegistro =
      registro.unidad_negocio ||
      registro.sucursal ||
      registro.empresa_nombre;
    const pasaUnidad =
      unidadSeleccionada.length === 0 ||
      unidadSeleccionada.includes(unidadRegistro);
    const pasaDepartamento =
      departamentoSeleccionado.length === 0 ||
      departamentoSeleccionado.includes(registro.departamento);
    const pasaTipo =
      tipoSeleccionado.length === 0 ||
      tipoSeleccionado.includes(registro.tipo_registro_nombre);
    const pasaCorreccion =
      correccionSeleccionada.length === 0 ||
      correccionSeleccionada.map(
        // Vistas guardadas antes del cambio de nombre usan "Corregida" / "Sin corregir".
        (v) => ({ Corregida: "Editado", "Sin corregir": "Sin editar" })[v] ?? v,
      ).includes(toCorreccion(registro));
    const pasaAsistio =
      asistioSeleccionado.length === 0 ||
      asistioSeleccionado.includes(toYesNo(registro.asistencia));
    const pasaGoce =
      goceSeleccionado.length === 0 ||
      goceSeleccionado.includes(toYesNo(registro.goce_sueldo));
    const estadoExtra = horasExtraSeleccionado.length || soloHorasExtra
      ? etiquetaHorasExtra(registro, zonaDe(registro))
      : null;
    const pasaHorasExtra =
      (horasExtraSeleccionado.length === 0 ||
        horasExtraSeleccionado.map((v) => ETIQUETA_HX_ANTERIOR[v] ?? v).includes(estadoExtra)) &&
      (!soloHorasExtra || estadoExtra !== ETIQUETAS_ESTADO.sin) &&
      (!soloSinComida || sinSalidaAComer(registro));
    const pasaFestivo =
      festivoSeleccionado.length === 0 ||
      festivoSeleccionado.includes(toYesNo(registro.es_festivo));
    const pasaAutorizacion =
      autorizacionSeleccionada.length === 0 ||
      autorizacionSeleccionada.includes(toAutorizacion(registro));
    const pasaEstadoAsistencia =
      estadoAsistenciaSeleccionado.length === 0 ||
      estadoAsistenciaSeleccionado.includes(estadoFila(registro).texto);

    return (
      pasaEmpleado &&
      pasaUnidad &&
      pasaDepartamento &&
      pasaTipo &&
      pasaCorreccion &&
      pasaAsistio &&
      pasaGoce &&
      pasaHorasExtra &&
      pasaFestivo &&
      pasaAutorizacion &&
      pasaEstadoAsistencia
    );
  };
  const filteredRowsAll = useMemo(
    () => optionSourceRows.filter(pasaFiltrosEncabezado),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      optionSourceRows,
      empleadoSeleccionado,
      unidadSeleccionada,
      departamentoSeleccionado,
      tipoSeleccionado,
      correccionSeleccionada,
      asistioSeleccionado,
      goceSeleccionado,
      horasExtraSeleccionado,
      festivoSeleccionado,
      autorizacionSeleccionada,
      estadoAsistenciaSeleccionado,
      soloHorasExtra,
      soloSinComida,
    ],
  );

  const hasActiveHeaderFilters =
    empleadoSeleccionado.length > 0 ||
    unidadSeleccionada.length > 0 ||
    departamentoSeleccionado.length > 0 ||
    tipoSeleccionado.length > 0 ||
    correccionSeleccionada.length > 0 ||
    asistioSeleccionado.length > 0 ||
    goceSeleccionado.length > 0 ||
    horasExtraSeleccionado.length > 0 ||
    soloHorasExtra ||
    soloSinComida ||
    festivoSeleccionado.length > 0 ||
    autorizacionSeleccionada.length > 0 ||
    estadoAsistenciaSeleccionado.length > 0;

  // «Horas extra» se ordena en pantalla por estado y minutos (el servidor solo sabe ordenar por Sí/No).
  const ordenarExtras = sortConfig?.sortBy === "horasExtra";
  const displayedRows = useMemo(() => {
    const ordenar = (rows) =>
      ordenarExtras ? ordenarPorHorasExtra(rows, { zonaDe, orden: sortConfig.sortOrder }) : rows;
    if (!hasActiveHeaderFilters) return ordenar(filtrados);
    const offset = (page - 1) * limit;
    return ordenar(filteredRowsAll).slice(offset, offset + limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActiveHeaderFilters, filtrados, page, limit, filteredRowsAll, ordenarExtras, sortConfig?.sortOrder]);

  // Agrupación de los renglones YA calculados para la página (no altera
  // filtrado ni paginación). Conserva el orden de aparición.
  const groupedRows = useMemo(() => {
    if (!agrupar) return null;
    const getGroupName = (registro) => {
      switch (agrupar) {
        case "unidad":
          return (
            registro.unidad_negocio ||
            registro.sucursal ||
            registro.empresa_nombre ||
            "Sin unidad"
          );
        case "departamento":
          return registro.departamento || "Sin departamento";
        case "tipo":
          return registro.tipo_registro_nombre || "Sin tipo";
        case "estado":
          return estadoFila(registro).texto || "Sin estado";
        default:
          return "Sin grupo";
      }
    };
    const map = new Map();
    for (const registro of displayedRows) {
      const name = getGroupName(registro);
      if (!map.has(name)) map.set(name, []);
      map.get(name).push(registro);
    }
    return [...map.entries()];
  }, [agrupar, displayedRows]);

  const toggleGroup = (name) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  useEffect(() => {
    onHeaderFilteringMetaChange?.({
      active: hasActiveHeaderFilters,
      total: filteredRowsAll.length,
    });
  }, [
    hasActiveHeaderFilters,
    filteredRowsAll.length,
    onHeaderFilteringMetaChange,
  ]);

  const clearAllTableFilters = () => {
    setEmpleadoSeleccionado([]);
    setUnidadSeleccionada([]);
    setDepartamentoSeleccionado([]);
    setTipoSeleccionado([]);
    setCorreccionSeleccionada([]);
    setAsistioSeleccionado([]);
    setGoceSeleccionado([]);
    setHorasExtraSeleccionado([]);
    setFestivoSeleccionado([]);
    setAutorizacionSeleccionada([]);
    setEstadoAsistenciaSeleccionado([]);
  };

  const columns = [
    { header: "Nombre", key: "nombre" },
    { header: "Apellido Paterno", key: "apellido_paterno" },
    { header: "Apellido Materno", key: "apellido_materno" },
    { header: "Unidad de negocio", key: "unidad_negocio" },
    { header: "Departamento", key: "departamento" },
    { header: "Tipo de Registro", key: "tipo_registro_nombre" },
    { header: "Fecha", key: "fecha" },
    { header: "Editado", key: "correccion" },
    { header: "Cambios (antes → después)", key: "cambios", width: 45 },
    { header: "Entrada", key: "entrada" },
    { header: "Salida", key: "salida" },
    { header: "Jornada", key: "jornada" },
    { header: "Comida (botón «Salir a comer»)", key: "comida_checada" },
    { header: "Balance del día", key: "hrs_diferencia" },
    { header: "Autorizado por", key: "autorizado_por" },
    { header: "¿Asistió?", key: "asistencia" },
    { header: "¿Goce de Sueldo?", key: "goce_sueldo" },
    { header: "¿Pago Triple?", key: "pago_triple" },
    { header: "¿Es domingo?", key: "es_domingo" },
    { header: "Prima Dominical", key: "prima_dominical" },
    { header: "Es Festivo", key: "es_festivo" },
    { header: "Porcentaje Día Festivo", key: "porcentaje_dia_festivo" },
    { header: "Horas extra (estado)", key: "estado_horas_extra" },
    { header: "Tiempo trabajado de más", key: "minutos_horas_extra" },
    { header: "¿Horas extra autorizadas?", key: "hrs_extra" },
    { header: "Forma de pago horas extra", key: "forma_pago_extras" },
    { header: "Horas extras autorizadas por", key: "extras_autorizadas_por" },
    { header: "Descanso tomado", key: "hrs_comida" },
    { header: "No marcó salida a comer", key: "sin_salida_comida" },
    { header: "Observaciones", key: "notas" },
    { header: "Notas horas extra", key: "notas_hrs_extra" },
    { header: "Estado", key: "estadoAsistencia" },
    { header: "Día", key: "dia" },
    { header: "Trabajadas (min)", key: "minutos_trabajados" },
    { header: "Comida (min)", key: "minutos_comida" },
    { header: "Extra (min)", key: "minutos_extra" },
    { header: "Extra por autorizar (min)", key: "minutos_extra_por_autorizar" },
    { header: "Motivos", key: "motivos_resumen", width: 40 },
  ];

  const aFilaExcel = (r) => {
    const rowTimezone = r.zona_horaria || fallbackTimezone;

    const { jornada, minutosDiferencia } = calcularResumenJornada(r);
    const extra = estadoHorasExtra(r, rowTimezone);
    const fmt = crearFormateadorCambios({ tiposPermiso, empleados, zona: rowTimezone });
    // "0" llega como texto en algunos campos: se evalúa como número, no como texto.
    const siNo = (v) => (Number(v) ? "Sí" : "No");

    return {
      nombre: r.nombre,
      apellido_paterno: r.apellido_paterno,
      apellido_materno: r.apellido_materno,
      unidad_negocio: r.unidad_negocio || r.sucursal || r.empresa_nombre,
      departamento: r.departamento,
      tipo_registro_nombre: r.tipo_registro_nombre,

      fecha: r.fecha
        ? dayjs.tz(r.fecha, DB_TIMEZONE).tz(rowTimezone).format("DD/MM/YYYY")
        : "-",

      correccion: siNo(r.correccion),
    cambios: resumenCambios(r, fmt) || (siNo(r.correccion) === "Sí" ? "Sin detalle guardado" : "-"),

      entrada: r.entrada
        ? dayjs
            .tz(r.entrada, DB_TIMEZONE)
            .tz(rowTimezone)
            .format("DD/MM/YYYY HH:mm")
        : "-",

      salida: r.salida
        ? dayjs
            .tz(r.salida, DB_TIMEZONE)
            .tz(rowTimezone)
            .format("DD/MM/YYYY HH:mm")
        : "-",

      jornada,
      hrs_diferencia: formatearMinutos(minutosDiferencia, { signo: true }),

      autorizado_por: fmt("autorizado_por", r.autorizado_por),
      asistencia: siNo(r.asistencia),
      goce_sueldo: siNo(r.goce_sueldo),
      pago_triple: siNo(r.pago_triple),
      es_domingo: siNo(r.es_domingo),
      prima_dominical: r.prima_dominical ?? "-",
      es_festivo: siNo(r.es_festivo),
      porcentaje_dia_festivo: r.porcentaje_dia_festivo ?? "-",
      estado_horas_extra: ETIQUETAS_ESTADO[extra.estado],
      minutos_horas_extra: extra.minutos > 0 ? formatearMinutos(extra.minutos) : "-",
      hrs_extra: siNo(r.hrs_extra),
      forma_pago_extras: r.forma_pago_extras ?? "-",
      extras_autorizadas_por: fmt("extras_autorizadas_por", r.extras_autorizadas_por),
      hrs_comida: minutosDescanso(r) != null ? formatearMinutos(minutosDescanso(r)) : r.hrs_comida ?? "-",
      sin_salida_comida: sinSalidaAComer(r) ? "Sí" : "No",
      comida_checada: textoComida(r.comida_checada, undefined, ahoraBase()) || "-",
      notas: r.notas ?? "-",
      notas_hrs_extra: r.notas_hrs_extra ?? "-",
      estadoAsistencia: estadoFila(r).texto,
      dia: [diaFila(r).nombre, diaFila(r).pago].filter(Boolean).join(" · "),
      minutos_trabajados: r.minutos_trabajados ?? "-",
      minutos_comida: r.minutos_comida ?? "-",
      minutos_extra: r.minutos_extra ?? "-",
      minutos_extra_por_autorizar: r.minutos_extra_por_autorizar ?? "-",
      motivos_resumen: r.motivos_resumen || "-",
    };
  };

  // Exporta TODO el periodo con los filtros activos (no solo la página visible).
  const { enqueueSnackbar } = useSnackbar();
  const [exportando, setExportando] = useState(false);
  const exportarPeriodo = async () => {
    if (exportando) return;
    setExportando(true);
    try {
      const { registros, total, completo } = cargarPeriodoParaExportar
        ? await cargarPeriodoParaExportar()
        : { registros: filtrados, total: filtrados.length, completo: true };
      if (!completo) {
        enqueueSnackbar(`El servidor devolvió ${registros.length} de ${total} registros. No se exportó para no entregar un archivo incompleto.`, { variant: "error" });
        return;
      }
      const filas = registros.filter(pasaFiltrosEncabezado);
      if (!filas.length) {
        enqueueSnackbar("No hay registros en el periodo con estos filtros.", { variant: "info" });
        return;
      }
      await exportToExcel(filas.map(aFilaExcel), columns, "Reporte_Asistencias", {
        sheetName: "Asistencias",
        headerColor: "2563EB",
      });
      enqueueSnackbar(`Se exportaron ${filas.length} registros del periodo.`, { variant: "success" });
    } catch (error) {
      enqueueSnackbar("No se pudo exportar: no se descargó el periodo completo. Intenta de nuevo.", { variant: "error" });
    } finally {
      setExportando(false);
    }
  };

  const handleSort = (sortBy) => {
    setSortConfig((prev) => ({
      sortBy,
      sortOrder:
        prev.sortBy === sortBy && prev.sortOrder === "desc" ? "asc" : "desc",
    }));

    setPage?.(1);
  };

  const renderSortIcon = (column) => {
    if (sortConfig.sortBy !== column) {
      return <ArrowUpDown className="h-3 w-3 ml-1 text-gray-400" />;
    }

    return sortConfig.sortOrder === "asc" ? (
      <ArrowUp className="h-3 w-3 ml-1 text-blue-600" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1 text-blue-600" />
    );
  };

  // --- Horas extra: decisiones de un clic y masivas ---
  const hx = useHorasExtra(mutateAsistencia);
  const [seleccionados, setSeleccionados] = useState(() => new Set());
  const nombreCorto = (r) => `${r.nombre ?? ""} ${r.apellido_paterno ?? ""}`.trim();
  const limpiarSeleccion = () => setSeleccionados(new Set());
  const accionesHorasExtra = readOnly ? null : {
    guardando: hx.guardando,
    seleccionados,
    seleccionar: (id, v) => setSeleccionados((prev) => {
      const s = new Set(prev);
      if (v) s.add(id); else s.delete(id);
      return s;
    }),
    autorizar: (r, { forma, notas } = {}) =>
      hx.guardar(
        [{ registro: r, cambios: cambiosAutorizar({ forma, notas, idAutorizador: hx.usuario.idEmpleado }) }],
        `${nombreCorto(r)}: horas extra autorizadas.`,
      ),
    noAutorizar: (r) =>
      hx.guardar(
        [{ registro: r, cambios: cambiosNoAutorizar(r, { quien: hx.usuario.nombre, zona: zonaDe(r) }) }],
        `${nombreCorto(r)}: no autorizadas. Se paga hasta la salida del horario; la checada real se conserva.`,
      ),
    quitar: (r) =>
      hx.guardar([{ registro: r, cambios: cambiosQuitar(r, zonaDe(r)) }], `${nombreCorto(r)}: decisión quitada.`),
  };
  // Selección para acciones masivas (casilla en cada fila). Solo filas que siguen cargadas.
  const filasSeleccionadas = readOnly ? [] : optionSourceRows.filter((r) => seleccionados.has(r.id));
  const visiblesSeleccionables = readOnly ? [] : (displayedRows ?? []).filter((r) => r?.id != null);
  const marcadasVisibles = visiblesSeleccionables.filter((r) => seleccionados.has(r.id)).length;
  const todasVisiblesMarcadas = visiblesSeleccionables.length > 0 && marcadasVisibles === visiblesSeleccionables.length;
  const alternarVisibles = (v) => setSeleccionados((prev) => {
    const s = new Set(prev);
    for (const r of visiblesSeleccionables) { if (v) s.add(r.id); else s.delete(r.id); }
    return s;
  });

  const renderAsistenciaRow = (reg) => (
    <AsistenciaRow
      indiceFestivos={indiceFestivos}
      key={reg.id}
      registro={reg}
      fecha={fecha}
      readOnly={readOnly}
      isEditing={editingRowId === reg.id}
      editingRowData={editingRowData}
      isSaving={isSaving}
      empleados={empleados}
      tiposPermiso={tiposPermiso}
      handleEditClick={handleEditClick}
      handleCancelEdit={handleCancelEdit}
      handleActualizarBase={handleActualizarBase}
      handleRestoreOriginal={handleRestoreOriginal}
      handleFieldChange={handleFieldChange}
      handleSaveClick={handleSaveClick}
      mutateAsistencia={mutateAsistencia}
      mostrarCamposExtras={mostrarCamposExtras}
      empresaActiva={empresaActiva}
      colVisible={colVisible}
      onRowClick={onRowClick}
      horasExtra={accionesHorasExtra}
      control={control}
      seleccion={readOnly ? null : { marcado: seleccionados.has(reg.id), alternar: (v) => accionesHorasExtra.seleccionar(reg.id, v) }}
      onAbrirReloj={readOnly ? null : onAbrirReloj}
    />
  );

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {!readOnly ? (
          <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button
                onClick={exportarPeriodo}
                disabled={exportando}
                variant="outline"
                className="rounded-xl border-slate-200 text-slate-600 shadow-none hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                {exportando ? "Exportando periodo…" : "Exportar Excel"}
              </Button>

              {!ocultarRegistroMasivo && (
              <Button
                onClick={abrirFormulario}
                className="rounded-xl bg-blue-600 text-white shadow-sm hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Registrar asistencia masiva
              </Button>
              )}

              {/* <Button
                onClick={onResetFilters}
                variant="outline"
                className="rounded-xl border-slate-200 text-slate-600 shadow-none hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Limpiar
              </Button> */}
            </div>
          </div>
        ) : (
          <div className="border-b border-slate-100 px-4 py-3 sm:px-5"></div>
        )}
        <ActiveFilterChips
          groups={[
            {
              category: "Empleado",
              values: empleadoSeleccionado,
              options: empleadoOptions,
              onChange: setEmpleadoSeleccionado,
            },
            ...(empresaActiva === "all"
              ? [
                  {
                    category: "Unidad de negocio",
                    values: unidadSeleccionada,
                    options: unidadNegocioOptions,
                    onChange: setUnidadSeleccionada,
                  },
                ]
              : []),
            {
              category: "Departamento",
              values: departamentoSeleccionado,
              options: departamentoOptions,
              onChange: setDepartamentoSeleccionado,
            },
            {
              category: "Tipo",
              values: tipoSeleccionado,
              options: tipoOptions,
              onChange: setTipoSeleccionado,
            },
            {
              category: "Editado",
              values: correccionSeleccionada,
              options: correccionOptions,
              onChange: setCorreccionSeleccionada,
            },
            {
              category: "Asistió",
              values: asistioSeleccionado,
              options: asistioOptions,
              onChange: setAsistioSeleccionado,
            },
            {
              category: "Goce",
              values: goceSeleccionado,
              options: goceOptions,
              onChange: setGoceSeleccionado,
            },
            {
              category: "Horas extra",
              values: horasExtraSeleccionado,
              options: horasExtraOptions,
              onChange: setHorasExtraSeleccionado,
            },

            ...(mostrarCamposExtras
              ? [
                  {
                    category: "Festivo",
                    values: festivoSeleccionado,
                    options: festivoOptions,
                    onChange: setFestivoSeleccionado,
                  },
                  {
                    category: "Autorización",
                    values: autorizacionSeleccionada,
                    options: autorizacionOptions,
                    onChange: setAutorizacionSeleccionada,
                  },
                ]
              : []),
            {
              category: "Estado",
              values: estadoAsistenciaSeleccionado,
              options: estadoAsistenciaOptions,
              onChange: setEstadoAsistenciaSeleccionado,
            },
          ]}
          onClearAll={clearAllTableFilters}
        />

        <div className="overflow-x-auto [scrollbar-color:#cbd5e1_transparent] [scrollbar-width:thin]">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50 [&_th]:text-[10px] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-[0.05em] [&_th]:text-slate-500 [&_th_button]:text-[10px] [&_th_button]:font-semibold [&_th_button]:uppercase [&_th_button]:tracking-[0.05em]">
                {colVisible("empleado") && (
                  <TableHead
                    className={`${TH_STICKY} left-0 z-20 text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500 shadow-[8px_0_8px_-8px_rgba(15,23,42,0.18)]`}
                  >
                    <div className="flex items-center gap-1">
                      {!readOnly && (
                        <input
                          type="checkbox"
                          aria-label="Elegir todos los mostrados"
                          title="Elegir todos los mostrados"
                          checked={todasVisiblesMarcadas}
                          ref={(el) => { if (el) el.indeterminate = marcadasVisibles > 0 && !todasVisiblesMarcadas; }}
                          onChange={(e) => alternarVisibles(e.target.checked)}
                          className="mr-1.5 h-4 w-4 cursor-pointer accent-blue-600"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => handleSort("empleado")}
                        className="flex items-center"
                      >
                        EMPLEADO
                        {renderSortIcon("empleado")}
                      </button>

                      <HeaderMultiFilter
                        selected={empleadoSeleccionado}
                        onChange={setEmpleadoSeleccionado}
                        options={empleadoOptions}
                        placeholder=""
                      />
                    </div>
                  </TableHead>
                )}
                {empresaActiva === "all" && colVisible("unidad") && (
                  <TableHead
                    className={`${TH_STICKY} text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500`}
                  >
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleSort("unidadNegocio")}
                        className="flex items-center"
                      >
                        UNIDAD
                        {renderSortIcon("unidadNegocio")}
                      </button>

                      <HeaderMultiFilter
                        selected={unidadSeleccionada}
                        onChange={setUnidadSeleccionada}
                        options={unidadNegocioOptions}
                        placeholder=""
                      />
                    </div>
                  </TableHead>
                )}
                {colVisible("codigo") && (
                  <TableHead
                    className={`${TH_STICKY} text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500`}
                  >
                    Código
                  </TableHead>
                )}
                {colVisible("departamento") && (
                  <TableHead
                    className={`${TH_STICKY} text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500`}
                  >
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleSort("departamento")}
                        className="flex items-center"
                      >
                        DEPARTAMENTO
                        {renderSortIcon("departamento")}
                      </button>

                      <HeaderMultiFilter
                        selected={departamentoSeleccionado}
                        onChange={setDepartamentoSeleccionado}
                        options={departamentoOptions}
                        placeholder=""
                      />
                    </div>
                  </TableHead>
                )}
                {colVisible("fecha") && (
                  <TableHead
                    onClick={() => handleSort("fecha")}
                    className={`${TH_STICKY} cursor-pointer select-none text-center`}
                  >
                    <div className="flex items-center justify-center">
                      Fecha
                      {renderSortIcon("fecha")}
                    </div>
                  </TableHead>
                )}
                {colVisible("entrada") && (
                  <TableHead
                    onClick={() => handleSort("entrada")}
                    className={`${TH_STICKY} cursor-pointer select-none text-center`}
                  >
                    <div className="flex items-center justify-center">
                      Entrada
                      {renderSortIcon("entrada")}
                    </div>
                  </TableHead>
                )}
                {colVisible("salida") && (
                  <TableHead
                    onClick={() => handleSort("salida")}
                    className={`${TH_STICKY} cursor-pointer select-none text-center`}
                  >
                    <div className="flex items-center justify-center">
                      Salida
                      {renderSortIcon("salida")}
                    </div>
                  </TableHead>
                )}
                {colVisible("jornada") && <TableHead className={TH_STICKY}>Trabajadas</TableHead>}
                {colVisible("comida") && <TableHead className={`${TH_STICKY} text-center`}>Comida</TableHead>}
                {colVisible("hrs_extra") && (
                  <TableHead className={TH_STICKY}>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => handleSort("horasExtra")} className="flex items-center">
                        HORAS EXTRA
                        {renderSortIcon("horasExtra")}
                      </button>
                      <HeaderMultiFilter
                        selected={horasExtraSeleccionado}
                        onChange={setHorasExtraSeleccionado}
                        options={horasExtraOptions}
                        placeholder=""
                      />
                    </div>
                  </TableHead>
                )}
                {control && (
                  <>
                    <TableHead className={TH_STICKY}>Decidió</TableHead>
                    <TableHead className={TH_STICKY}>Semana</TableHead>
                    <TableHead className={TH_STICKY}>Alertas</TableHead>
                  </>
                )}
                {colVisible("dia") && <TableHead className={TH_STICKY}>Día</TableHead>}
                {colVisible("notas") && <TableHead className={TH_STICKY}>Observaciones</TableHead>}
                {colVisible("estado_asistencia") && (
                  <TableHead className={`${TH_STICKY} min-w-[250px]`}>
                    <div className="flex items-center gap-1">
                      <span>ESTADO · MOTIVO</span>
                      <HeaderMultiFilter
                        selected={estadoAsistenciaSeleccionado}
                        onChange={setEstadoAsistenciaSeleccionado}
                        options={estadoAsistenciaOptions}
                        placeholder=""
                      />
                    </div>
                  </TableHead>
                )}
                {colVisible("reloj") && <TableHead className={`${TH_STICKY} text-center`}>Reloj</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              <LocalClockRows events={localEvents} columns={visibleColumnCount} timezone={userTimezone} />
              {displayedRows.length === 0 ? (localEvents.length ? null : (
                <TableRow>
                  <TableCell
                    colSpan={visibleColumnCount}
                    className="py-12 text-center text-sm text-slate-400"
                  >
                    No hay registros para los filtros seleccionados.
                  </TableCell>
                </TableRow>
              )) : groupedRows ? (
                groupedRows.map(([groupName, rows]) => {
                  const isCollapsed = collapsedGroups.has(groupName);
                  const porcentajeAsistencia =
                    rows.length > 0
                      ? Math.round(
                          (rows.filter((r) => r.estadoAsistencia !== "Ausente")
                            .length /
                            rows.length) *
                            100,
                        )
                      : 0;
                  return (
                    <Fragment key={groupName}>
                      <TableRow
                        onClick={() => toggleGroup(groupName)}
                        className="cursor-pointer select-none border-b border-slate-100 bg-blue-50/40 hover:bg-blue-50/60"
                      >
                        <TableCell
                          colSpan={visibleColumnCount}
                          className="py-2"
                        >
                          <div className="flex items-center gap-2">
                            <ChevronDown
                              className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                                isCollapsed ? "-rotate-90" : ""
                              }`}
                            />
                            <span className="text-[13px] font-semibold text-slate-800">
                              {groupName}
                            </span>
                            <span className="text-xs text-slate-400">
                              · {rows.length} empleado
                              {rows.length === 1 ? "" : "s"}
                            </span>
                            {agrupar !== "estado" && (
                              <span className="ml-auto text-xs font-bold text-blue-600">
                                {porcentajeAsistencia}% asistencia
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      {!isCollapsed && rows.map(renderAsistenciaRow)}
                    </Fragment>
                  );
                })
              ) : (
                displayedRows.map(renderAsistenciaRow)
              )}
            </TableBody>
          </Table>
        </div>

        {footer && (
          <div className="border-t border-slate-100 bg-white">
            {footer}
          </div>
        )}
      </div>
      {!readOnly && (
        <AccionesMasivas
          filas={filasSeleccionadas}
          tiposPermiso={tiposPermiso}
          onLimpiar={limpiarSeleccion}
          onGuardado={mutateAsistencia}
        />
      )}
    </>
  );
}
