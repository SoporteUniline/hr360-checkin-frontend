import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import EntradasSalidasRow from "./EntradasSalidasRow";
import { exportToExcel } from "@/utils/exportExcelJS";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet } from "lucide-react";
import { useEmpresaTimezone } from "@/context/AuthContext";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useEffect, useMemo, useState } from "react";
import HeaderMultiFilter from "@/components/tabla/HeaderMultiFilter";
import ActiveFilterChips from "@/components/tabla/ActiveFilterChips";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

dayjs.extend(utc);
dayjs.extend(timezone);

export default function EntradasSalidasTable({
  registros,
  fecha,
  editingMovimientoId,
  editingMovimientoData,
  isSavingMovimiento,
  handleEditMovimientoClick,
  handleCancelMovimientoEdit,
  handleMovimientoFieldChange,
  handleSaveMovimientoClick,
  onResetFilters,
  empresaActiva,
  filterOptionsRows,
  page = 1,
  limit = 10,
  onHeaderFilteringMetaChange,
  sortConfig,
  setSortConfig,
  setPage,
}) {
  const fallbackTimezone = useEmpresaTimezone(empresaActiva);
  const userTimezone = registros?.[0]?.zona_horaria || fallbackTimezone;
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState([]);
  const [unidadSeleccionada, setUnidadSeleccionada] = useState([]);
  const [departamentoSeleccionado, setDepartamentoSeleccionado] = useState([]);
  const [estadoSeleccionado, setEstadoSeleccionado] = useState([]);

  const optionSourceRows = useMemo(
    () => (Array.isArray(filterOptionsRows) ? filterOptionsRows : registros),
    [filterOptionsRows, registros],
  );

  const getEmpleadoNombre = (registro) =>
    [registro.nombre, registro.apellido_paterno, registro.apellido_materno]
      .filter(Boolean)
      .join(" ")
      .trim();

  const getDepartamentoSucursal = (registro) =>
    `${registro.departamento || "-"} / ${registro.sucursal || "-"}`;

  const uniqueOptions = (values) =>
    [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));

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
            registro.nombre_empresa,
        ),
      ),
    [optionSourceRows],
  );
  const departamentoOptions = useMemo(
    () =>
      uniqueOptions(
        optionSourceRows.map((registro) => getDepartamentoSucursal(registro)),
      ),
    [optionSourceRows],
  );
  const estadoOptions = useMemo(
    () => uniqueOptions(optionSourceRows.map((registro) => registro.estado)),
    [optionSourceRows],
  );

  const filteredRowsAll = useMemo(
    () =>
      optionSourceRows.filter((registro) => {
        const nombreEmpleado = getEmpleadoNombre(registro);
        const departamentoSucursal = getDepartamentoSucursal(registro);

        const pasaEmpleado =
          empleadoSeleccionado.length === 0 ||
          empleadoSeleccionado.includes(nombreEmpleado);
        const unidadRegistro =
          registro.unidad_negocio ||
          registro.sucursal ||
          registro.nombre_empresa;
        const pasaUnidad =
          unidadSeleccionada.length === 0 ||
          unidadSeleccionada.includes(unidadRegistro);
        const pasaDepartamento =
          departamentoSeleccionado.length === 0 ||
          departamentoSeleccionado.includes(departamentoSucursal);
        const pasaEstado =
          estadoSeleccionado.length === 0 ||
          estadoSeleccionado.includes(registro.estado);

        return pasaEmpleado && pasaUnidad && pasaDepartamento && pasaEstado;
      }),
    [
      optionSourceRows,
      empleadoSeleccionado,
      unidadSeleccionada,
      departamentoSeleccionado,
      estadoSeleccionado,
    ],
  );

  const hasActiveHeaderFilters =
    empleadoSeleccionado.length > 0 ||
    unidadSeleccionada.length > 0 ||
    departamentoSeleccionado.length > 0 ||
    estadoSeleccionado.length > 0;

  const displayedRows = useMemo(() => {
    if (!hasActiveHeaderFilters) return registros;
    const offset = (page - 1) * limit;
    return filteredRowsAll.slice(offset, offset + limit);
  }, [hasActiveHeaderFilters, registros, page, limit, filteredRowsAll]);

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
    setEstadoSeleccionado([]);

    onResetFilters?.();
  };

  const handleExportExcel = async () => {
    const columns = [
      { header: "Nombre", key: "nombre", width: 25 },
      { header: "Apellido Paterno", key: "apellido_paterno", width: 20 },
      { header: "Apellido Materno", key: "apellido_materno", width: 20 },
      { header: "Unidad de negocio", key: "unidad_negocio", width: 20 },
      { header: "Puesto", key: "puesto", width: 25 },
      { header: "Departamento", key: "departamento", width: 20 },
      { header: "Sucursal", key: "sucursal", width: 20 },
      { header: "Entrada", key: "entrada", width: 22 },
      { header: "Entrada corregida", key: "entrada_corregida", width: 22 },
      { header: "Salida", key: "salida", width: 22 },
      { header: "Salida corregida", key: "salida_corregida", width: 22 },
      { header: "Estado", key: "estado", width: 15 },
    ];

    const data = (hasActiveHeaderFilters ? filteredRowsAll : registros).map(
      (r) => ({
        nombre: r.nombre,
        apellido_paterno: r.apellido_paterno,
        apellido_materno: r.apellido_materno,
        unidad_negocio: r.unidad_negocio || r.sucursal || r.nombre_empresa,
        puesto: r.puesto,
        departamento: r.departamento,
        sucursal: r.sucursal,
        entrada: r.entrada
          ? dayjs
              .tz(r.entrada, "America/Mexico_City")
              .tz(userTimezone)
              .format("DD/MM/YYYY HH:mm:ss")
          : "-",
        entrada_corregida: r.entrada_corregida
          ? dayjs
              .tz(r.entrada_corregida, "America/Mexico_City")
              .tz(userTimezone)
              .format("DD/MM/YYYY HH:mm:ss")
          : "-",
        salida: r.salida
          ? dayjs
              .tz(r.salida, "America/Mexico_City")
              .tz(userTimezone)
              .format("DD/MM/YYYY HH:mm:ss")
          : "-",
        salida_corregida: r.salida_corregida
          ? dayjs
              .tz(r.salida_corregida, "America/Mexico_City")
              .tz(userTimezone)
              .format("DD/MM/YYYY HH:mm:ss")
          : "-",
        estado: r.estado,
      }),
    );

    await exportToExcel(data, columns, "Entradas_Salidas", {
      sheetName: "Registros",
      headerColor: "2563EB",
    });
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

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex justify-end">
            <Button
              onClick={handleExportExcel}
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Exportar Excel
            </Button>
          </div>
        </div>
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
              category: "Estado",
              values: estadoSeleccionado,
              options: estadoOptions,
              onChange: setEstadoSeleccionado,
            },
          ]}
          onClearAll={clearAllTableFilters}
        />

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 hover:bg-gray-50">
                <TableHead className="font-semibold text-gray-700 uppercase text-xs">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleSort("empleado")}
                      className="flex items-center uppercase"
                    >
                      Empleado
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
                {empresaActiva === "all" && (
                  <TableHead className="font-semibold text-gray-700 uppercase text-xs">
                    <HeaderMultiFilter
                      selected={unidadSeleccionada}
                      onChange={setUnidadSeleccionada}
                      options={unidadNegocioOptions}
                      placeholder="Unidad de negocio"
                    />
                  </TableHead>
                )}
                <TableHead className="font-semibold text-gray-700 uppercase text-xs">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleSort("departamento")}
                      className="flex items-center uppercase"
                    >
                      Departamento
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
                {/* IMPORTANTE (UX): aunque filtremos 1 solo día (desde===hasta), siempre mostramos la fecha */}
                <TableHead
                  onClick={() => handleSort("fechaEntrada")}
                  className="cursor-pointer"
                >
                  <div className="flex items-center justify-center">
                    Fecha de entrada
                    {renderSortIcon("fechaEntrada")}
                  </div>
                </TableHead>
                <TableHead
                  onClick={() => handleSort("horaEntrada")}
                  className="font-semibold text-gray-700 uppercase text-xs text-center cursor-pointer select-none"
                >
                  <div className="flex items-center justify-center">
                    Hora entrada
                    {renderSortIcon("horaEntrada")}
                  </div>
                </TableHead>
                <TableHead
                  onClick={() => handleSort("horaSalida")}
                  className="font-semibold text-gray-700 uppercase text-xs text-center cursor-pointer select-none"
                >
                  <div className="flex items-center justify-center">
                    Hora salida
                    {renderSortIcon("horaSalida")}
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-gray-700 uppercase text-xs text-center">
                  Entrada corregida
                </TableHead>
                <TableHead className="font-semibold text-gray-700 uppercase text-xs text-center">
                  Salida corregida
                </TableHead>
                <TableHead
                  onClick={() => handleSort("horasRegistro")}
                  className="font-semibold text-gray-700 uppercase text-xs text-center cursor-pointer select-none"
                >
                  <div className="flex items-center justify-center">
                    Hrs registro
                    {renderSortIcon("horasRegistro")}
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-gray-700 uppercase text-xs text-center">
                  <HeaderMultiFilter
                    selected={estadoSeleccionado}
                    onChange={setEstadoSeleccionado}
                    options={estadoOptions}
                    placeholder="Estado"
                  />
                </TableHead>
                <TableHead className="sticky right-0 bg-gray-50 z-10 text-center font-semibold text-gray-700 uppercase text-xs">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={empresaActiva === "all" ? 11 : 10}
                    className="text-center py-10 text-gray-500"
                  >
                    No hay registros para los filtros seleccionados.
                  </TableCell>
                </TableRow>
              ) : (
                displayedRows.map((reg) => (
                  <EntradasSalidasRow
                    key={reg.id}
                    registro={reg}
                    fecha={fecha}
                    isEditing={editingMovimientoId === reg.id}
                    editingRowData={editingMovimientoData}
                    isSaving={isSavingMovimiento}
                    handleEditMovimientoClick={handleEditMovimientoClick}
                    handleCancelMovimientoEdit={handleCancelMovimientoEdit}
                    handleMovimientoFieldChange={handleMovimientoFieldChange}
                    handleSaveMovimientoClick={handleSaveMovimientoClick}
                    empresaActiva={empresaActiva}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
