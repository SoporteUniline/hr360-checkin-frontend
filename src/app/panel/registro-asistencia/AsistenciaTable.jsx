import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  { key: "tipo", label: "Tipo", extra: false },
  { key: "fecha", label: "Fecha", extra: false },
  { key: "correccion", label: "Corrección", extra: true },
  { key: "entrada", label: "Entrada", extra: false },
  { key: "salida", label: "Salida", extra: false },
  { key: "hrs_debia", label: "Hrs debía", extra: false },
  { key: "hrs_trabajo", label: "Hrs trabajó", extra: false },
  { key: "hrs_diferencia", label: "Hrs +/-", extra: false },
  { key: "autorizado_por", label: "Autorizado", extra: true },
  { key: "asistio", label: "Asistió", extra: false },
  { key: "goce", label: "Goce", extra: false },
  { key: "pago_triple", label: "Pago triple", extra: true },
  { key: "domingo", label: "Domingo", extra: true },
  { key: "prima_dominical", label: "Prima dom.", extra: true },
  { key: "festivo", label: "Festivo", extra: true },
  { key: "porcentaje_festivo", label: "% festivo", extra: true },
  { key: "hrs_extra", label: "Hrs extra", extra: false },
  { key: "forma_pago", label: "Forma pago", extra: true },
  { key: "aut_extra", label: "Aut. extra", extra: true },
  { key: "hrs_comida", label: "Hrs comida", extra: true },
  { key: "notas", label: "Notas", extra: false },
  { key: "notas_extra", label: "Notas extra", extra: true },
  { key: "estado", label: "Estado", extra: false },
  { key: "estado_asistencia", label: "Estado asis.", extra: true },
  { key: "acciones", label: "Acciones", extra: false },
];

const EXTRA_COLUMN_KEYS = new Set(
  COLUMNAS_ASISTENCIA.filter((col) => col.extra).map((col) => col.key),
);

// Clases base para los th (header sticky dentro del contenedor con scroll)
const TH_STICKY = "sticky top-0 z-10 bg-gray-50";

export default function AsistenciaTable({
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
  handleFieldChange,
  handleSaveClick,
  mutateAsistencia,
  mostrarCamposExtras,
  abrirFormulario,
  onResetFilters,
  empresaActiva,
  filterOptionsRows,
  page = 1,
  limit = 10,
  onHeaderFilteringMetaChange,
  sortConfig,
  setSortConfig,
  setPage,
  visibleColumns,
  onRowClick,
  agrupar = null,
}) {
  // Para el Excel usamos la zona de la primera empresa visible (o la activa como fallback)
  const fallbackTimezone = useEmpresaTimezone(empresaActiva);
  const userTimezone = filtrados?.[0]?.zona_horaria || fallbackTimezone;
  const DB_TIMEZONE = "America/Mexico_City";
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState([]);
  const [unidadSeleccionada, setUnidadSeleccionada] = useState([]);
  const [departamentoSeleccionado, setDepartamentoSeleccionado] = useState([]);
  const [tipoSeleccionado, setTipoSeleccionado] = useState([]);
  const [estadoSeleccionado, setEstadoSeleccionado] = useState([]);
  const [asistioSeleccionado, setAsistioSeleccionado] = useState([]);
  const [goceSeleccionado, setGoceSeleccionado] = useState([]);
  const [horasExtraSeleccionado, setHorasExtraSeleccionado] = useState([]);
  const [festivoSeleccionado, setFestivoSeleccionado] = useState([]);
  const [autorizacionSeleccionada, setAutorizacionSeleccionada] = useState([]);
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
      if (col.key === "acciones" && readOnly) return false;
      return colVisible(col.key);
    }).length || 1;

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
  const toYesNo = (value) => (value === 1 || value === true ? "Sí" : "No");
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
  const estadoOptions = useMemo(
    () => uniqueOptions(optionSourceRows.map((registro) => registro.estado)),
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
        optionSourceRows.map((registro) => toYesNo(registro.hrs_extra)),
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
        optionSourceRows.map((registro) => registro.estadoAsistencia),
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

  const filteredRowsAll = useMemo(
    () =>
      optionSourceRows.filter((registro) => {
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
        const pasaEstado =
          estadoSeleccionado.length === 0 ||
          estadoSeleccionado.includes(registro.estado);
        const pasaAsistio =
          asistioSeleccionado.length === 0 ||
          asistioSeleccionado.includes(toYesNo(registro.asistencia));
        const pasaGoce =
          goceSeleccionado.length === 0 ||
          goceSeleccionado.includes(toYesNo(registro.goce_sueldo));
        const pasaHorasExtra =
          horasExtraSeleccionado.length === 0 ||
          horasExtraSeleccionado.includes(toYesNo(registro.hrs_extra));
        const pasaFestivo =
          festivoSeleccionado.length === 0 ||
          festivoSeleccionado.includes(toYesNo(registro.es_festivo));
        const pasaAutorizacion =
          autorizacionSeleccionada.length === 0 ||
          autorizacionSeleccionada.includes(toAutorizacion(registro));
        const pasaEstadoAsistencia =
          estadoAsistenciaSeleccionado.length === 0 ||
          estadoAsistenciaSeleccionado.includes(registro.estadoAsistencia);

        return (
          pasaEmpleado &&
          pasaUnidad &&
          pasaDepartamento &&
          pasaTipo &&
          pasaEstado &&
          pasaAsistio &&
          pasaGoce &&
          pasaHorasExtra &&
          pasaFestivo &&
          pasaAutorizacion &&
          pasaEstadoAsistencia
        );
      }),
    [
      optionSourceRows,
      empleadoSeleccionado,
      unidadSeleccionada,
      departamentoSeleccionado,
      tipoSeleccionado,
      estadoSeleccionado,
      asistioSeleccionado,
      goceSeleccionado,
      horasExtraSeleccionado,
      festivoSeleccionado,
      autorizacionSeleccionada,
      estadoAsistenciaSeleccionado,
    ],
  );

  const hasActiveHeaderFilters =
    empleadoSeleccionado.length > 0 ||
    unidadSeleccionada.length > 0 ||
    departamentoSeleccionado.length > 0 ||
    tipoSeleccionado.length > 0 ||
    estadoSeleccionado.length > 0 ||
    asistioSeleccionado.length > 0 ||
    goceSeleccionado.length > 0 ||
    horasExtraSeleccionado.length > 0 ||
    festivoSeleccionado.length > 0 ||
    autorizacionSeleccionada.length > 0 ||
    estadoAsistenciaSeleccionado.length > 0;

  const displayedRows = useMemo(() => {
    if (!hasActiveHeaderFilters) return filtrados;
    const offset = (page - 1) * limit;
    return filteredRowsAll.slice(offset, offset + limit);
  }, [hasActiveHeaderFilters, filtrados, page, limit, filteredRowsAll]);

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
          return registro.estadoAsistencia || "Sin estado";
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
    setEstadoSeleccionado([]);
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
    { header: "Código", key: "nip" },
    { header: "Departamento", key: "departamento" },
    { header: "Tipo de Registro", key: "tipo_registro_nombre" },
    { header: "Fecha", key: "fecha" },
    { header: "Corrección", key: "correccion" },
    { header: "Entrada", key: "entrada" },
    { header: "Salida", key: "salida" },
    { header: "Autorizado por", key: "autorizado_por" },
    { header: "¿Asistió?", key: "asistencia" },
    { header: "¿Goce de Sueldo?", key: "goce_sueldo" },
    { header: "¿Pago Triple?", key: "pago_triple" },
    { header: "¿Es domingo?", key: "es_domingo" },
    { header: "Prima Dominical", key: "prima_dominical" },
    { header: "Es Festivo", key: "es_festivo" },
    { header: "Porcentaje Día Festivo", key: "porcentaje_dia_festivo" },
    { header: "¿Trabajó horas extra?", key: "hrs_extra" },
    { header: "Forma de pago horas extra", key: "forma_pago_extras" },
    { header: "Horas extras autorizadas por", key: "extras_autorizadas_por" },
    { header: "Horas de comida", key: "hrs_comida" },
    { header: "Observaciones", key: "notas" },
    { header: "Notas horas extra", key: "notas_hrs_extra" },
    { header: "Estado", key: "estado" },
    { header: "Estado Asistencia", key: "estadoAsistencia" },
  ];

  const exportData = (hasActiveHeaderFilters ? filteredRowsAll : filtrados).map(
    (r) => ({
      nombre: r.nombre,
      apellido_paterno: r.apellido_paterno,
      apellido_materno: r.apellido_materno,
      unidad_negocio: r.unidad_negocio || r.sucursal || r.empresa_nombre,
      nip: r.nip,
      departamento: r.departamento,
      tipo_registro_nombre: r.tipo_registro_nombre,
      fecha: r.fecha
        ? dayjs.tz(r.fecha, DB_TIMEZONE).tz(userTimezone).format("DD/MM/YYYY")
        : "-",

      correccion: r.correcion ? "Sí" : "No",
      entrada: r.entrada
        ? dayjs
            .tz(r.entrada, DB_TIMEZONE)
            .tz(userTimezone)
            .format("DD/MM/YYYY HH:mm:ss")
        : "-",

      salida: r.salida
        ? dayjs
            .tz(r.salida, DB_TIMEZONE)
            .tz(userTimezone)
            .format("DD/MM/YYYY HH:mm:ss")
        : "-",

      autorizado_por: r.autorizado_por ?? "-",
      asistencia: r.asistencia ? "Sí" : "No",
      goce_sueldo: r.goce_sueldo ? "Sí" : "No",
      pago_triple: r.pago_triple ? "Sí" : "No",
      es_domingo: r.es_domingo ? "Sí" : "No",
      prima_dominical: r.prima_dominical ?? "-",
      es_festivo: r.es_festivo ? "Sí" : "No",
      porcentaje_dia_festivo: r.porcentaje_dia_festivo ?? "-",
      hrs_extra: r.hrs_extra ? "Sí" : "No",
      forma_pago_extras: r.forma_pago_extras ?? "-",
      extras_autorizadas_por: r.extras_autorizadas_por ?? "-",
      hrs_comida: r.hrs_comida ?? "-",
      notas: r.notas ?? "-",
      notas_hrs_extra: r.notas_hrs_extra ?? "-",
      estado: r.estado ?? "-",
      estadoAsistencia: r.estadoAsistencia,
    }),
  );

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

  const renderAsistenciaRow = (reg) => (
    <AsistenciaRow
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
      handleFieldChange={handleFieldChange}
      handleSaveClick={handleSaveClick}
      mutateAsistencia={mutateAsistencia}
      mostrarCamposExtras={mostrarCamposExtras}
      empresaActiva={empresaActiva}
      colVisible={colVisible}
      onRowClick={onRowClick}
    />
  );

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        {!readOnly ? (
          <div className="px-6 py-4 border-b border-gray-100 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
              <Button
                onClick={() =>
                  exportToExcel(exportData, columns, "Reporte_Asistencias", {
                    sheetName: "Asistencias",
                    headerColor: "2563EB",
                  })
                }
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Exportar Excel
              </Button>

              <Button
                onClick={abrirFormulario}
                className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-md"
              >
                <Plus className="h-4 w-4 mr-2" />
                Registrar asistencia masiva
              </Button>

              {/* <Button
                onClick={onResetFilters}
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Limpiar
              </Button> */}
            </div>
          </div>
        ) : (
          <div className="px-6 py-4 border-b border-gray-100"></div>
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
              category: "Estado",
              values: estadoSeleccionado,
              options: estadoOptions,
              onChange: setEstadoSeleccionado,
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
              category: "Hrs extra",
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
                  {
                    category: "Estado asis.",
                    values: estadoAsistenciaSeleccionado,
                    options: estadoAsistenciaOptions,
                    onChange: setEstadoAsistenciaSeleccionado,
                  },
                ]
              : []),
          ]}
          onClearAll={clearAllTableFilters}
        />

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 hover:bg-gray-50">
                {colVisible("empleado") && (
                  <TableHead
                    className={`${TH_STICKY} font-semibold text-gray-700 uppercase text-xs`}
                  >
                    <div className="flex items-center gap-1">
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
                    className={`${TH_STICKY} font-semibold text-gray-700 uppercase text-xs`}
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
                    className={`${TH_STICKY} font-semibold text-gray-700 uppercase text-xs`}
                  >
                    Código
                  </TableHead>
                )}
                {colVisible("departamento") && (
                  <TableHead
                    className={`${TH_STICKY} font-semibold text-gray-700 uppercase text-xs`}
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
                {colVisible("tipo") && (
                  <TableHead
                    className={`${TH_STICKY} font-semibold text-gray-700 uppercase text-xs`}
                  >
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleSort("tipoRegistro")}
                        className="flex items-center"
                      >
                        TIPO
                        {renderSortIcon("tipoRegistro")}
                      </button>

                      <HeaderMultiFilter
                        selected={tipoSeleccionado}
                        onChange={setTipoSeleccionado}
                        options={tipoOptions}
                        placeholder=""
                      />
                    </div>
                  </TableHead>
                )}
                {colVisible("fecha") && (
                  <TableHead
                    onClick={() => handleSort("fecha")}
                    className={`${TH_STICKY} font-semibold text-gray-700 uppercase text-xs text-center cursor-pointer select-none`}
                  >
                    <div className="flex items-center justify-center">
                      Fecha
                      {renderSortIcon("fecha")}
                    </div>
                  </TableHead>
                )}
                {colVisible("correccion") && (
                  <TableHead
                    className={`${TH_STICKY} font-semibold text-gray-700 uppercase text-xs text-center`}
                  >
                    Corrección
                  </TableHead>
                )}
                {colVisible("entrada") && (
                  <TableHead
                    onClick={() => handleSort("entrada")}
                    className={`${TH_STICKY} font-semibold text-gray-700 uppercase text-xs text-center cursor-pointer select-none`}
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
                    className={`${TH_STICKY} font-semibold text-gray-700 uppercase text-xs text-center cursor-pointer select-none`}
                  >
                    <div className="flex items-center justify-center">
                      Salida
                      {renderSortIcon("salida")}
                    </div>
                  </TableHead>
                )}
                {colVisible("hrs_debia") && (
                  <TableHead
                    className={`${TH_STICKY} font-semibold text-gray-700 uppercase text-xs text-center`}
                  >
                    Hrs debía
                  </TableHead>
                )}

                {colVisible("hrs_trabajo") && (
                  <TableHead
                    className={`${TH_STICKY} font-semibold text-gray-700 uppercase text-xs text-center`}
                  >
                    Hrs trabajó
                  </TableHead>
                )}

                {colVisible("hrs_diferencia") && (
                  <TableHead
                    className={`${TH_STICKY} font-semibold text-gray-700 uppercase text-xs text-center`}
                  >
                    Hrs +/-
                  </TableHead>
                )}
                {colVisible("autorizado_por") && (
                  <TableHead
                    className={`${TH_STICKY} font-semibold text-gray-700 uppercase text-xs text-center`}
                  >
                    <HeaderMultiFilter
                      selected={autorizacionSeleccionada}
                      onChange={setAutorizacionSeleccionada}
                      options={autorizacionOptions}
                      placeholder="Autorizado"
                    />
                  </TableHead>
                )}
                {colVisible("asistio") && (
                  <TableHead
                    className={`${TH_STICKY} font-semibold text-gray-700 uppercase text-xs text-center`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleSort("asistencia")}
                        className="flex items-center"
                      >
                        ASISTIÓ
                        {renderSortIcon("asistencia")}
                      </button>

                      <HeaderMultiFilter
                        selected={asistioSeleccionado}
                        onChange={setAsistioSeleccionado}
                        options={asistioOptions}
                        placeholder=""
                      />
                    </div>
                  </TableHead>
                )}
                {colVisible("goce") && (
                  <TableHead
                    className={`${TH_STICKY} font-semibold text-gray-700 uppercase text-xs text-center`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleSort("goceSueldo")}
                        className="flex items-center"
                      >
                        GOCE
                        {renderSortIcon("goceSueldo")}
                      </button>

                      <HeaderMultiFilter
                        selected={goceSeleccionado}
                        onChange={setGoceSeleccionado}
                        options={goceOptions}
                        placeholder=""
                      />
                    </div>
                  </TableHead>
                )}
                {colVisible("pago_triple") && (
                  <TableHead
                    className={`${TH_STICKY} font-semibold text-gray-700 uppercase text-xs text-center`}
                  >
                    Pago triple
                  </TableHead>
                )}
                {colVisible("domingo") && (
                  <TableHead
                    className={`${TH_STICKY} font-semibold text-gray-700 uppercase text-xs text-center`}
                  >
                    Domingo
                  </TableHead>
                )}
                {colVisible("prima_dominical") && (
                  <TableHead
                    className={`${TH_STICKY} font-semibold text-gray-700 uppercase text-xs text-center`}
                  >
                    Prima dom.
                  </TableHead>
                )}
                {colVisible("festivo") && (
                  <TableHead
                    className={`${TH_STICKY} font-semibold text-gray-700 uppercase text-xs text-center`}
                  >
                    <HeaderMultiFilter
                      selected={festivoSeleccionado}
                      onChange={setFestivoSeleccionado}
                      options={festivoOptions}
                      placeholder="Festivo"
                    />
                  </TableHead>
                )}
                {colVisible("porcentaje_festivo") && (
                  <TableHead
                    className={`${TH_STICKY} font-semibold text-gray-700 uppercase text-xs text-center`}
                  >
                    % festivo
                  </TableHead>
                )}
                {colVisible("hrs_extra") && (
                  <TableHead
                    className={`${TH_STICKY} font-semibold text-gray-700 uppercase text-xs text-center`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleSort("horasExtra")}
                        className="flex items-center"
                      >
                        HRS EXTRA
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
                {colVisible("forma_pago") && (
                  <TableHead
                    className={`${TH_STICKY} font-semibold text-gray-700 uppercase text-xs text-center`}
                  >
                    Forma pago
                  </TableHead>
                )}
                {colVisible("aut_extra") && (
                  <TableHead
                    className={`${TH_STICKY} font-semibold text-gray-700 uppercase text-xs text-center`}
                  >
                    Aut. extra
                  </TableHead>
                )}
                {colVisible("hrs_comida") && (
                  <TableHead
                    className={`${TH_STICKY} font-semibold text-gray-700 uppercase text-xs text-center`}
                  >
                    Hrs comida
                  </TableHead>
                )}
                {colVisible("notas") && (
                  <TableHead
                    className={`${TH_STICKY} font-semibold text-gray-700 uppercase text-xs text-center`}
                  >
                    Notas
                  </TableHead>
                )}
                {colVisible("notas_extra") && (
                  <TableHead
                    className={`${TH_STICKY} font-semibold text-gray-700 uppercase text-xs text-center`}
                  >
                    Notas extra
                  </TableHead>
                )}
                {colVisible("estado") && (
                  <TableHead
                    className={`${TH_STICKY} font-semibold text-gray-700 uppercase text-xs text-center`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleSort("estado")}
                        className="flex items-center"
                      >
                        ESTADO
                        {renderSortIcon("estado")}
                      </button>

                      <HeaderMultiFilter
                        selected={estadoSeleccionado}
                        onChange={setEstadoSeleccionado}
                        options={estadoOptions}
                        placeholder=""
                      />
                    </div>
                  </TableHead>
                )}
                {colVisible("estado_asistencia") && (
                  <TableHead
                    className={`${TH_STICKY} font-semibold text-gray-700 uppercase text-xs text-center`}
                  >
                    <HeaderMultiFilter
                      selected={estadoAsistenciaSeleccionado}
                      onChange={setEstadoAsistenciaSeleccionado}
                      options={estadoAsistenciaOptions}
                      placeholder="Estado asis."
                    />
                  </TableHead>
                )}
                {!readOnly && colVisible("acciones") && (
                  <TableHead className="sticky right-0 top-0 bg-gray-50 z-20 text-center font-semibold text-gray-700 uppercase text-xs">
                    Acciones
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={visibleColumnCount}
                    className="text-center py-10 text-gray-500"
                  >
                    No hay registros para los filtros seleccionados.
                  </TableCell>
                </TableRow>
              ) : groupedRows ? (
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
                        className="bg-[#f4f7fd] hover:bg-[#f4f7fd] cursor-pointer select-none border-b border-gray-100"
                      >
                        <TableCell
                          colSpan={visibleColumnCount}
                          className="py-2"
                        >
                          <div className="flex items-center gap-2">
                            <ChevronDown
                              className={`h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200 ${
                                isCollapsed ? "-rotate-90" : ""
                              }`}
                            />
                            <span className="font-semibold text-[13px] text-gray-900">
                              {groupName}
                            </span>
                            <span className="text-xs text-gray-500">
                              · {rows.length} empleado
                              {rows.length === 1 ? "" : "s"}
                            </span>
                            {agrupar !== "estado" && (
                              <span className="ml-auto text-xs text-[#2563EB] font-bold">
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
      </div>
    </>
  );
}
