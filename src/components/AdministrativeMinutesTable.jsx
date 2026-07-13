"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetcherWithToken } from "@/lib/fetcher";
import dayjs from "dayjs";
import "dayjs/locale/es";
import React, { useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Trash2 } from "lucide-react";
import HeaderMultiFilter from "@/components/tabla/HeaderMultiFilter";
import ActiveFilterChips from "@/components/tabla/ActiveFilterChips";

dayjs.locale("es");

/**
 * Tabla de Actas Administrativas.
 *
 * Relación:
 * - Usada por `src/app/panel/actas-administrativas/page.jsx`.
 * - Los botones "Ver/Editar/Eliminar" se manejan en el padre para centralizar modales y refetch.
 */
export const AdministrativeTable = ({
  actas,
  page,
  limit,
  onView,
  onEdit,
  onDelete,
  onPageChange,
  onHeaderFilterMetaChange,
}) => {
  const [filterOptionsRows, setFilterOptionsRows] = useState([]);
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState([]);
  const [folioSeleccionado, setFolioSeleccionado] = useState([]);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState([]);
  const [tipoActaSeleccionado, setTipoActaSeleccionado] = useState([]);
  const [gravedadSeleccionada, setGravedadSeleccionada] = useState([]);
  const [fechaSeleccionada, setFechaSeleccionada] = useState([]);
  const [estatusSeleccionado, setEstatusSeleccionado] = useState([]);

  const safeActas = Array.isArray(actas) ? actas : [];
  const sourceRows = useMemo(
    () =>
      Array.isArray(filterOptionsRows) && filterOptionsRows.length > 0
        ? filterOptionsRows
        : safeActas,
    [filterOptionsRows, safeActas],
  );

  const normalize = (value) => String(value || "").trim();
  const employeeLabel = (row) =>
    normalize(
      `${row.nombre_empleado || ""} ${row.apellido_paterno_empleado || ""} ${
        row.apellido_materno_empleado || ""
      }`,
    );
  const formattedDate = (value) =>
    value ? dayjs(value).format("DD/MM/YYYY") : "";
  const uniqueOptions = (values) =>
    [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));

  const empresaOptions = useMemo(
    () =>
      uniqueOptions(
        sourceRows.map((row) =>
          normalize(
            row.unidad_negocio || row.nombre_sucursal || row.nombre_empresa,
          ),
        ),
      ),
    [sourceRows],
  );
  const folioOptions = useMemo(
    () => uniqueOptions(sourceRows.map((row) => normalize(row.folio))),
    [sourceRows],
  );
  const empleadoOptions = useMemo(
    () => uniqueOptions(sourceRows.map((row) => employeeLabel(row))),
    [sourceRows],
  );
  const tipoActaOptions = useMemo(
    () => uniqueOptions(sourceRows.map((row) => normalize(row.nombre_tipo_acta))),
    [sourceRows],
  );
  const gravedadOptions = useMemo(
    () =>
      uniqueOptions(
        sourceRows.map((row) => normalize(row.gravedad_tipo?.toUpperCase())),
      ),
    [sourceRows],
  );
  const fechaOptions = useMemo(
    () => uniqueOptions(sourceRows.map((row) => formattedDate(row.fecha_incidente))),
    [sourceRows],
  );
  const estatusOptions = useMemo(
    () => uniqueOptions(sourceRows.map((row) => normalize(row.estatus))),
    [sourceRows],
  );

  const filteredRowsAll = useMemo(
    () =>
      sourceRows.filter((row) => {
        const passEmpresa =
          empresaSeleccionada.length === 0 ||
          empresaSeleccionada.includes(
            normalize(row.unidad_negocio || row.nombre_sucursal || row.nombre_empresa),
          );
        const passFolio =
          folioSeleccionado.length === 0 ||
          folioSeleccionado.includes(normalize(row.folio));
        const passEmpleado =
          empleadoSeleccionado.length === 0 ||
          empleadoSeleccionado.includes(employeeLabel(row));
        const passTipoActa =
          tipoActaSeleccionado.length === 0 ||
          tipoActaSeleccionado.includes(normalize(row.nombre_tipo_acta));
        const passGravedad =
          gravedadSeleccionada.length === 0 ||
          gravedadSeleccionada.includes(normalize(row.gravedad_tipo?.toUpperCase()));
        const passFecha =
          fechaSeleccionada.length === 0 ||
          fechaSeleccionada.includes(formattedDate(row.fecha_incidente));
        const passEstatus =
          estatusSeleccionado.length === 0 ||
          estatusSeleccionado.includes(normalize(row.estatus));

        return (
          passEmpresa &&
          passFolio &&
          passEmpleado &&
          passTipoActa &&
          passGravedad &&
          passFecha &&
          passEstatus
        );
      }),
    [
      sourceRows,
      empresaSeleccionada,
      folioSeleccionado,
      empleadoSeleccionado,
      tipoActaSeleccionado,
      gravedadSeleccionada,
      fechaSeleccionada,
      estatusSeleccionado,
    ],
  );

  const hasActiveHeaderFilters =
    empresaSeleccionada.length > 0 ||
    folioSeleccionado.length > 0 ||
    empleadoSeleccionado.length > 0 ||
    tipoActaSeleccionado.length > 0 ||
    gravedadSeleccionada.length > 0 ||
    fechaSeleccionada.length > 0 ||
    estatusSeleccionado.length > 0;

  const displayedRows = useMemo(() => {
    if (!hasActiveHeaderFilters) return safeActas;
    const offset = (page - 1) * limit;
    return filteredRowsAll.slice(offset, offset + limit);
  }, [hasActiveHeaderFilters, safeActas, filteredRowsAll, page, limit]);

  const clearAllHeaderFilters = () => {
    setEmpresaSeleccionada([]);
    setFolioSeleccionado([]);
    setEmpleadoSeleccionado([]);
    setTipoActaSeleccionado([]);
    setGravedadSeleccionada([]);
    setFechaSeleccionada([]);
    setEstatusSeleccionado([]);
  };

  useEffect(() => {
    onHeaderFilterMetaChange?.({
      active: hasActiveHeaderFilters,
      total: filteredRowsAll.length,
    });
  }, [hasActiveHeaderFilters, filteredRowsAll.length, onHeaderFilterMetaChange]);

  useEffect(() => {
    if (!hasActiveHeaderFilters) return;
    const totalPages = Math.max(1, Math.ceil(filteredRowsAll.length / limit));
    if (page > totalPages) onPageChange?.(1);
  }, [hasActiveHeaderFilters, filteredRowsAll.length, page, limit, onPageChange]);

  useEffect(() => {
    onPageChange?.(1);
  }, [
    empresaSeleccionada,
    folioSeleccionado,
    empleadoSeleccionado,
    tipoActaSeleccionado,
    gravedadSeleccionada,
    fechaSeleccionada,
    estatusSeleccionado,
    limit,
    onPageChange,
  ]);

  useEffect(() => {
    let isCancelled = false;

    const loadFilterOptionsRows = async () => {
      try {
        const pageSize = 500;
        const firstUrl = `/checador/administrativeMinutes?page=1&limit=${pageSize}`;
        const firstData = await fetcherWithToken(firstUrl);
        let allRows = Array.isArray(firstData?.data) ? firstData.data : [];
        const totalRows = Number(firstData?.total || allRows.length);
        const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

        for (let currentPage = 2; currentPage <= totalPages; currentPage += 1) {
          const pageData = await fetcherWithToken(
            `/checador/administrativeMinutes?page=${currentPage}&limit=${pageSize}`,
          );
          if (Array.isArray(pageData?.data)) {
            allRows = [...allRows, ...pageData.data];
          }
        }

        if (!isCancelled) setFilterOptionsRows(allRows);
      } catch (_) {
        if (!isCancelled) setFilterOptionsRows([]);
      }
    };

    loadFilterOptionsRows();

    return () => {
      isCancelled = true;
    };
  }, []);

  const hasRows = displayedRows.length > 0;
  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        
        <ActiveFilterChips
          groups={[
            {
              category: "Unidad de negocio",
              values: empresaSeleccionada,
              options: empresaOptions,
              onChange: setEmpresaSeleccionada,
            },
            {
              category: "Folio",
              values: folioSeleccionado,
              options: folioOptions,
              onChange: setFolioSeleccionado,
            },
            {
              category: "Empleado",
              values: empleadoSeleccionado,
              options: empleadoOptions,
              onChange: setEmpleadoSeleccionado,
            },
            {
              category: "Tipo",
              values: tipoActaSeleccionado,
              options: tipoActaOptions,
              onChange: setTipoActaSeleccionado,
            },
            {
              category: "Gravedad",
              values: gravedadSeleccionada,
              options: gravedadOptions,
              onChange: setGravedadSeleccionada,
            },
            {
              category: "Fecha",
              values: fechaSeleccionada,
              options: fechaOptions,
              onChange: setFechaSeleccionada,
            },
            {
              category: "Estado",
              values: estatusSeleccionado,
              options: estatusOptions,
              onChange: setEstatusSeleccionado,
            },
          ]}
          onClearAll={clearAllHeaderFilters}
        />

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 hover:bg-gray-50">
                <TableHead className="font-semibold text-gray-700 uppercase text-xs">
                  <HeaderMultiFilter
                    selected={folioSeleccionado}
                    onChange={setFolioSeleccionado}
                    options={folioOptions}
                    placeholder="Folio"
                  />
                </TableHead>
                <TableHead className="font-semibold text-gray-700 uppercase text-xs">
                  <HeaderMultiFilter
                    selected={empresaSeleccionada}
                    onChange={setEmpresaSeleccionada}
                    options={empresaOptions}
                    placeholder="Unidad de negocio"
                  />
                </TableHead>
                <TableHead className="font-semibold text-gray-700 uppercase text-xs">
                  <HeaderMultiFilter
                    selected={empleadoSeleccionado}
                    onChange={setEmpleadoSeleccionado}
                    options={empleadoOptions}
                    placeholder="Empleado"
                  />
                </TableHead>
                <TableHead className="font-semibold text-gray-700 uppercase text-xs">
                  <HeaderMultiFilter
                    selected={tipoActaSeleccionado}
                    onChange={setTipoActaSeleccionado}
                    options={tipoActaOptions}
                    placeholder="Tipo de acta"
                  />
                </TableHead>
                <TableHead className="font-semibold text-gray-700 uppercase text-xs">
                  <HeaderMultiFilter
                    selected={gravedadSeleccionada}
                    onChange={setGravedadSeleccionada}
                    options={gravedadOptions}
                    placeholder="Gravedad"
                  />
                </TableHead>
                <TableHead className="font-semibold text-gray-700 uppercase text-xs text-center">
                  <HeaderMultiFilter
                    selected={fechaSeleccionada}
                    onChange={setFechaSeleccionada}
                    options={fechaOptions}
                    placeholder="Fecha incidente"
                  />
                </TableHead>
                <TableHead className="font-semibold text-gray-700 uppercase text-xs text-center">
                  <HeaderMultiFilter
                    selected={estatusSeleccionado}
                    onChange={setEstatusSeleccionado}
                    options={estatusOptions}
                    placeholder="Estado"
                  />
                </TableHead>
                <TableHead className="font-semibold text-gray-700 uppercase text-xs text-right">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {!hasRows ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-gray-500 py-10"
                  >
                    No hay registros de actas administrativas.
                  </TableCell>
                </TableRow>
              ) : null}

              {displayedRows.map((acta) => (
                <TableRow
                  key={acta.id_acta}
                  className="hover:bg-gray-50 border-b border-gray-100"
                >
                  <TableCell className="font-bold">{acta.folio}</TableCell>
                  <TableCell>
                    {acta.unidad_negocio || acta.nombre_sucursal || acta.nombre_empresa || "-"}
                  </TableCell>
                  <TableCell>
                    {acta.nombre_empleado} {acta.apellido_paterno_empleado}{" "}
                    {acta.apellido_materno_empleado}
                  </TableCell>
                  <TableCell>{acta.nombre_tipo_acta}</TableCell>
                  <TableCell>
                    <span
                      className={`px-3 py-1 rounded-2xl text-xs font-semibold ${
                        acta.gravedad_tipo === "grave"
                          ? "bg-red-200 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {acta.gravedad_tipo?.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell>
                    {dayjs(acta.fecha_incidente).format("DD/MM/YYYY")}
                  </TableCell>
                  <TableCell className="capitalize text-center">
                    <span
                      className={`px-3 py-1 rounded-2xl text-xs font-semibold ${
                        acta.estatus === "elaborada"
                          ? "bg-blue-200 text-blue-800"
                          : acta.estatus === "cerrada"
                          ? "bg-red-200 text-red-800"
                          : acta.estatus === "notificada"
                          ? "bg-emerald-200 text-emerald-800"
                          : "bg-purple-200 text-purple-800"
                      }`}
                    >
                      {acta.estatus}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {/*
                  Botones estilo "Finiquitos y liquidaciones":
                  - Ver (Eye)
                  - Editar (Edit3)
                  - Eliminar (Trash2)

                  Relación:
                  - UX equivalente a `src/app/panel/finiquitos-y-liquidaciones/page.jsx`
                */}
                    <div className="flex justify-end items-center gap-2">
                      <button
                        onClick={() => onEdit?.(acta)}
                        className="p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4 text-[#2563EB]" />
                      </button>
                      <button
                        onClick={() => onView?.(acta)}
                        className="p-2 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                        title="Ver"
                      >
                        <Eye className="h-4 w-4 text-green-600" />
                      </button>
                      <button
                        onClick={() => onDelete?.(acta)}
                        className="p-2 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
};

export default AdministrativeTable;
