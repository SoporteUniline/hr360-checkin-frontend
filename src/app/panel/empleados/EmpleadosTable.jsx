"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Pencil, Eye, Mail, Phone, UserPlus } from "lucide-react";
import EstadoEmpleadoDialog from "./EstadoEmpleadoDialog";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { formatDateDMY } from "@/lib/formatDate";
import { useEffect, useMemo, useState } from "react";
import HeaderMultiFilter from "@/components/tabla/HeaderMultiFilter";
import ActiveFilterChips from "@/components/tabla/ActiveFilterChips";

dayjs.locale("es");

// Registro de columnas renderizables de la tabla de empleados, en orden de
// aparición. La columna Acciones es fija (siempre visible) y no se registra.
export const COLUMNAS_EMPLEADOS = [
  { key: "empleado", label: "Empleado" },
  { key: "puesto", label: "Puesto" },
  { key: "unidad", label: "Unidad de negocio" },
  { key: "departamento", label: "Departamento" },
  { key: "contacto", label: "Contacto" },
  { key: "ingreso", label: "Ingreso" },
  { key: "estado", label: "Estado" },
];

const getFotoPerfilUrl = (foto) => {
  if (!foto) return null;

  if (foto.startsWith("http://") || foto.startsWith("https://")) {
    return foto;
  }

  return null;
};

// Función auxiliar para iniciales
const getInitials = (nombreCompleto = "") => {
  const parts = nombreCompleto.split(" ");
  return parts
    .map((p) => p[0]?.toUpperCase() || "")
    .slice(0, 2)
    .join("");
};

// Función para generar color de fondo basado en iniciales
const getAvatarColor = (nombreCompleto = "") => {
  const colors = [
    "bg-blue-500",
    "bg-purple-500",
    "bg-green-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-teal-500",
  ];
  const charCode = nombreCompleto.charCodeAt(0) || 0;
  return colors[charCode % colors.length];
};

// Evita llaves duplicadas en render cuando llegan registros repetidos.
const dedupeEmployeesById = (rows = []) => {
  const uniqueMap = new Map();

  rows.forEach((row) => {
    if (!row) return;
    const employeeId = row.id_empleado;
    if (!employeeId) return;

    if (!uniqueMap.has(employeeId)) {
      uniqueMap.set(employeeId, row);
      return;
    }

    const existingRow = uniqueMap.get(employeeId);
    uniqueMap.set(employeeId, {
      ...existingRow,
      ...row,
      unidad_negocio: existingRow?.unidad_negocio || row?.unidad_negocio,
    });
  });

  return Array.from(uniqueMap.values());
};

export default function EmpleadosTable({
  empleados,
  filterOptionsRows,
  abrirFormulario,
  mutate,
  page,
  limit,
  resetFilters,
  onHeaderFilteringMetaChange,
  visibleColumns,
  limpiarFiltrosToken,
}) {
  const [nombreSeleccionado, setNombreSeleccionado] = useState([]);
  const [puestoSeleccionado, setPuestoSeleccionado] = useState([]);
  const [unidadNegocioSeleccionada, setUnidadNegocioSeleccionada] = useState(
    [],
  );
  const [departamentoSeleccionado, setDepartamentoSeleccionado] = useState([]);
  const [estadoSeleccionado, setEstadoSeleccionado] = useState([]);

  // Visibilidad de columnas: si `visibleColumns` viene (no vacío) manda;
  // si no, todas las columnas del registro se muestran (comportamiento previo).
  const visibleSet =
    Array.isArray(visibleColumns) && visibleColumns.length > 0
      ? new Set(visibleColumns)
      : null;
  const colVisible = (key) => (visibleSet ? visibleSet.has(key) : true);

  // "Acciones" siempre visible: +1 al conteo para el colSpan del estado vacío.
  const visibleColumnCount =
    COLUMNAS_EMPLEADOS.filter((c) => colVisible(c.key)).length + 1;

  const sourceRows = useMemo(() => {
    const baseRows =
      filterOptionsRows?.length > 0 ? filterOptionsRows : empleados || [];
    return dedupeEmployeesById(baseRows);
  }, [filterOptionsRows, empleados]);

  const getNombreCompleto = (emp) =>
    `${emp.nombre || ""} ${emp.apellido_paterno || ""} ${
      emp.apellido_materno || ""
    }`
      .trim()
      .replace(/\s+/g, " ");

  const uniqueOptions = (values) =>
    [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));

  const nombreOptions = useMemo(
    () => uniqueOptions(sourceRows.map((emp) => getNombreCompleto(emp))),
    [sourceRows],
  );
  const puestoOptions = useMemo(
    () => uniqueOptions(sourceRows.map((emp) => emp.puesto)),
    [sourceRows],
  );
  const unidadNegocioOptions = useMemo(
    () =>
      uniqueOptions(
        sourceRows.map(
          (emp) => emp.unidad_negocio || String(emp.sucursal || ""),
        ),
      ),
    [sourceRows],
  );
  const departamentoOptions = useMemo(
    () => uniqueOptions(sourceRows.map((emp) => emp.departamento)),
    [sourceRows],
  );
  const estadoOptions = useMemo(
    () => uniqueOptions(sourceRows.map((emp) => emp.estado)),
    [sourceRows],
  );

  const filteredRowsAll = useMemo(
    () =>
      sourceRows.filter((emp) => {
        const nombre = getNombreCompleto(emp);
        const passNombre =
          nombreSeleccionado.length === 0 ||
          nombreSeleccionado.includes(nombre);
        const passPuesto =
          puestoSeleccionado.length === 0 ||
          puestoSeleccionado.includes(emp.puesto);
        const unidadNegocioEmpleado =
          emp.unidad_negocio || String(emp.sucursal || "");
        const passUnidadNegocio =
          unidadNegocioSeleccionada.length === 0 ||
          unidadNegocioSeleccionada.includes(unidadNegocioEmpleado);
        const passDepartamento =
          departamentoSeleccionado.length === 0 ||
          departamentoSeleccionado.includes(emp.departamento);
        const passEstado =
          estadoSeleccionado.length === 0 ||
          estadoSeleccionado.includes(emp.estado);
        return (
          passNombre &&
          passPuesto &&
          passUnidadNegocio &&
          passDepartamento &&
          passEstado
        );
      }),
    [
      sourceRows,
      nombreSeleccionado,
      puestoSeleccionado,
      unidadNegocioSeleccionada,
      departamentoSeleccionado,
      estadoSeleccionado,
    ],
  );

  const hasActiveHeaderFilters =
    nombreSeleccionado.length > 0 ||
    puestoSeleccionado.length > 0 ||
    unidadNegocioSeleccionada.length > 0 ||
    departamentoSeleccionado.length > 0 ||
    estadoSeleccionado.length > 0;

  const displayedRows = useMemo(() => {
    if (!hasActiveHeaderFilters) return dedupeEmployeesById(empleados || []);
    const offset = (page - 1) * limit;
    return filteredRowsAll.slice(offset, offset + limit);
  }, [hasActiveHeaderFilters, empleados, page, limit, filteredRowsAll]);

  useEffect(() => {
    onHeaderFilteringMetaChange?.({
      active: hasActiveHeaderFilters,
      total: filteredRowsAll.length,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActiveHeaderFilters, filteredRowsAll.length]); // ⚠️ onHeaderFilteringMetaChange excluido: es setHeaderFilterMeta, estable, pero al ser llamado como función causa loop

  const clearAllHeaderFilters = () => {
    setNombreSeleccionado([]);
    setPuestoSeleccionado([]);
    setUnidadNegocioSeleccionada([]);
    setDepartamentoSeleccionado([]);
    setEstadoSeleccionado([]);
  };

  // El botón "Limpiar" del toolbar (page.jsx) incrementa este token para
  // limpiar también los filtros de encabezado, que viven en este componente.
  useEffect(() => {
    if (!limpiarFiltrosToken) return;
    clearAllHeaderFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limpiarFiltrosToken]);

  const encabezadoTabla = (
    <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-100">
      <h2 className="text-lg font-semibold text-gray-900">
        Lista de empleados
      </h2>
      <Button
        onClick={() => abrirFormulario(null, false, false)}
        className="h-9 rounded-md bg-gradient-to-br from-[#2563eb] to-[#4f46e5] font-semibold text-white shadow-[0_8px_20px_rgba(37,99,235,0.32)] hover:opacity-95"
      >
        <UserPlus className="w-4 h-4 mr-2" />
        Nuevo empleado
      </Button>
    </div>
  );

  if (!empleados || empleados.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        {encabezadoTabla}
        <div className="p-10 text-center text-gray-500">
          No hay empleados o búsqueda sin resultados.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
      {/* Header de la tabla */}
      {encabezadoTabla}
      <ActiveFilterChips
        groups={[
          {
            category: "Nombre",
            values: nombreSeleccionado,
            options: nombreOptions,
            onChange: setNombreSeleccionado,
          },
          {
            category: "Puesto",
            values: puestoSeleccionado,
            options: puestoOptions,
            onChange: setPuestoSeleccionado,
          },
          {
            category: "Unidad de negocio",
            values: unidadNegocioSeleccionada,
            options: unidadNegocioOptions,
            onChange: setUnidadNegocioSeleccionada,
          },
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
        onClearAll={clearAllHeaderFilters}
      />

      {/* Tabla */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 hover:bg-gray-50">
              {colVisible("empleado") && (
                <TableHead className="font-semibold text-gray-700 uppercase text-xs">
                  <HeaderMultiFilter
                    selected={nombreSeleccionado}
                    onChange={setNombreSeleccionado}
                    options={nombreOptions}
                    placeholder="Nombre"
                  />
                </TableHead>
              )}
              {colVisible("puesto") && (
                <TableHead className="font-semibold text-gray-700 uppercase text-xs">
                  <HeaderMultiFilter
                    selected={puestoSeleccionado}
                    onChange={setPuestoSeleccionado}
                    options={puestoOptions}
                    placeholder="Puesto"
                  />
                </TableHead>
              )}
              {colVisible("unidad") && (
                <TableHead className="font-semibold text-gray-700 uppercase text-xs text-center">
                  <HeaderMultiFilter
                    selected={unidadNegocioSeleccionada}
                    onChange={setUnidadNegocioSeleccionada}
                    options={unidadNegocioOptions}
                    placeholder="Unidad de negocio"
                  />
                </TableHead>
              )}
              {colVisible("departamento") && (
                <TableHead className="font-semibold text-gray-700 uppercase text-xs text-center">
                  <HeaderMultiFilter
                    selected={departamentoSeleccionado}
                    onChange={setDepartamentoSeleccionado}
                    options={departamentoOptions}
                    placeholder="Depto."
                  />
                </TableHead>
              )}
              {colVisible("contacto") && (
                <TableHead className="font-semibold text-gray-700 uppercase text-xs">
                  Contacto
                </TableHead>
              )}
              {colVisible("ingreso") && (
                <TableHead className="font-semibold text-gray-700 uppercase text-xs">
                  Ingreso
                </TableHead>
              )}
              {colVisible("estado") && (
                <TableHead className="font-semibold text-gray-700 uppercase text-xs text-center">
                  <HeaderMultiFilter
                    selected={estadoSeleccionado}
                    onChange={setEstadoSeleccionado}
                    options={estadoOptions}
                    placeholder="Estado"
                  />
                </TableHead>
              )}
              <TableHead className="font-semibold text-gray-700 uppercase text-xs text-center sticky right-0 bg-gray-50 z-10">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={visibleColumnCount}
                  className="text-center py-2 text-muted-foreground"
                >
                  No hay empleados o búsqueda sin resultados.
                </TableCell>
              </TableRow>
            ) : (
              displayedRows.map((emp) => {
                const nombreCompleto = ` ${emp.apellido_paterno ?? ""} ${
                  emp.apellido_materno ?? ""
                } ${emp.nombre}`.trim();

                return (
                  <TableRow
                    className="cursor-pointer hover:bg-gray-50 border-b border-gray-100"
                    key={emp.id_empleado}
                    onClick={() => abrirFormulario(emp, false, true)}
                  >
                    {colVisible("empleado") && (
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 ring-2 ring-gray-100">
                            {getFotoPerfilUrl(emp.foto_perfil) ? (
                              <AvatarImage
                                src={getFotoPerfilUrl(emp.foto_perfil)}
                                alt={nombreCompleto}
                              />
                            ) : null}
                            <AvatarFallback
                              className={`${getAvatarColor(
                                nombreCompleto,
                              )} text-white font-semibold text-sm`}
                            >
                              {getInitials(nombreCompleto)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">
                              {nombreCompleto}
                            </span>
                            {emp?.nip ? (
                              <span className="text-xs text-gray-500">
                                Código: {emp.nip}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                    )}
                    {colVisible("puesto") && (
                      <TableCell className="text-gray-700 font-medium">
                        {emp.puesto}
                      </TableCell>
                    )}
                    {colVisible("unidad") && (
                      <TableCell className="text-center">
                        {emp.unidad_negocio || emp.sucursal ? (
                          <span className="text-sm text-gray-700">
                            {emp.unidad_negocio || emp.sucursal}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                    )}
                    {colVisible("departamento") && (
                      <TableCell className="text-center">
                        {emp.departamento ? (
                          <span className="text-sm text-gray-700">
                            {emp.departamento}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                    )}
                    {colVisible("contacto") && (
                      <TableCell>
                        <div className="flex flex-col gap-1.5">
                          {emp?.correo ? (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="w-4 h-4 text-[#2563EB] flex-shrink-0" />
                              <a
                                href={`mailto:${emp.correo}`}
                                className="text-[#2563EB] hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {emp.correo}
                              </a>
                            </div>
                          ) : null}
                          {emp?.telefono ? (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              <span>{emp.telefono}</span>
                            </div>
                          ) : null}
                        </div>
                      </TableCell>
                    )}
                    {colVisible("ingreso") && (
                      <TableCell className="text-gray-700">
                        {emp.fecha_ingreso
                          ? formatDateDMY(dayjs(emp.fecha_ingreso))
                          : "-"}
                      </TableCell>
                    )}
                    {colVisible("estado") && (
                      <TableCell>
                        <div className="flex justify-center">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              emp.estado === "Activo"
                                ? "bg-[#2563EB] text-white"
                                : "bg-gray-200 text-gray-600"
                            }`}
                          >
                            {emp.estado}
                          </span>
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="sticky right-0 bg-white z-10">
                      <div className="flex justify-center items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            abrirFormulario(emp, true, false);
                          }}
                          className="p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4 text-[#2563EB]" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            abrirFormulario(emp, false, true);
                          }}
                          className="p-2 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                          title="Ver detalles"
                        >
                          <Eye className="h-4 w-4 text-green-600" />
                        </button>
                        <div onClick={(e) => e.stopPropagation()}>
                          <EstadoEmpleadoDialog
                            item={emp}
                            limit={limit}
                            page={page}
                            mutate={mutate}
                          />
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
