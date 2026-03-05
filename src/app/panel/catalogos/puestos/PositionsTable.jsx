"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Trash2 } from "lucide-react";
import useSWR, { mutate } from "swr";
import { fetcherWithToken, swr_config } from "@/lib/fetcher";
import { useEffect, useMemo, useState } from "react";
import TablePagination from "@/components/TablePagination";
import HeaderMultiFilter from "../../registro-asistencia/HeaderMultiFilter";
import ActiveFilterChips from "../../registro-asistencia/ActiveFilterChips";

export default function PositionsTable({
  id_empresa,
  swrKey,
  onEdit,
  onDelete,
  onTotalChange,
  onLoad,
}) {
  const showEmpresa = id_empresa === "all";

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filterOptionsRows, setFilterOptionsRows] = useState([]);
  const [headerFilterMeta, setHeaderFilterMeta] = useState({
    active: false,
    total: 0,
  });
  const [nombreSeleccionado, setNombreSeleccionado] = useState([]);
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState([]);
  const url = swrKey
    ? `${swrKey}${swrKey.includes("?") ? "&" : "?"}page=${page}&limit=${limit}`
    : null;
  const { data, error, isLoading } = useSWR(url, fetcherWithToken, swr_config);

  const positions = Array.isArray(data?.puestos) ? data.puestos : [];
  const sourceRows = useMemo(
    () =>
      Array.isArray(filterOptionsRows) && filterOptionsRows.length > 0
        ? filterOptionsRows
        : positions,
    [filterOptionsRows, positions],
  );

  const uniqueOptions = (values) =>
    [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));

  const nombreOptions = useMemo(
    () => uniqueOptions(sourceRows.map((row) => row.nombre_puesto)),
    [sourceRows],
  );
  const empresaOptions = useMemo(
    () => uniqueOptions(sourceRows.map((row) => row.empresa_nombre)),
    [sourceRows],
  );

  const filteredRowsAll = useMemo(
    () =>
      sourceRows.filter((row) => {
        const passNombre =
          nombreSeleccionado.length === 0 ||
          nombreSeleccionado.includes(row.nombre_puesto);
        const passEmpresa =
          !showEmpresa ||
          empresaSeleccionada.length === 0 ||
          empresaSeleccionada.includes(row.empresa_nombre);
        return passNombre && passEmpresa;
      }),
    [sourceRows, nombreSeleccionado, empresaSeleccionada, showEmpresa],
  );

  const hasActiveHeaderFilters =
    nombreSeleccionado.length > 0 ||
    (showEmpresa && empresaSeleccionada.length > 0);

  const displayedRows = useMemo(() => {
    if (!hasActiveHeaderFilters) return positions;
    const offset = (page - 1) * limit;
    return filteredRowsAll.slice(offset, offset + limit);
  }, [hasActiveHeaderFilters, positions, page, limit, filteredRowsAll]);

  const clearAllHeaderFilters = () => {
    setNombreSeleccionado([]);
    setEmpresaSeleccionada([]);
  };

  useEffect(() => {
    if (data?.total && onTotalChange) {
      onTotalChange(data.total);
    }
  }, [data?.total, onTotalChange]);

  useEffect(() => {
    if (onLoad) {
      onLoad(sourceRows);
    }
  }, [sourceRows, onLoad]);

  useEffect(() => {
    setPage(1);
  }, [id_empresa]);

  useEffect(() => {
    setHeaderFilterMeta({
      active: hasActiveHeaderFilters,
      total: filteredRowsAll.length,
    });
  }, [hasActiveHeaderFilters, filteredRowsAll.length]);

  useEffect(() => {
    if (!headerFilterMeta.active) return;
    const totalPages = Math.max(1, Math.ceil(headerFilterMeta.total / limit));
    if (page > totalPages) setPage(1);
  }, [headerFilterMeta, page, limit]);

  useEffect(() => {
    setPage(1);
  }, [nombreSeleccionado, empresaSeleccionada, limit]);

  useEffect(() => {
    setNombreSeleccionado([]);
    setEmpresaSeleccionada([]);
  }, [id_empresa]);

  useEffect(() => {
    let isCancelled = false;

    const loadFilterOptionsRows = async () => {
      if (!swrKey) {
        if (!isCancelled) setFilterOptionsRows([]);
        return;
      }

      try {
        const pageSize = 500;
        const firstUrl = `${swrKey}${
          swrKey.includes("?") ? "&" : "?"
        }page=1&limit=${pageSize}`;
        const firstData = await fetcherWithToken(firstUrl);
        let allRows = Array.isArray(firstData?.puestos) ? firstData.puestos : [];
        const totalRows = Number(firstData?.total || allRows.length);
        const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

        for (let currentPage = 2; currentPage <= totalPages; currentPage += 1) {
          const pageUrl = `${swrKey}${
            swrKey.includes("?") ? "&" : "?"
          }page=${currentPage}&limit=${pageSize}`;
          const pageData = await fetcherWithToken(pageUrl);
          if (Array.isArray(pageData?.puestos)) {
            allRows = [...allRows, ...pageData.puestos];
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
  }, [swrKey]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10">
        <div className="text-center text-gray-500">Cargando puestos...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10">
        <div className="text-center text-red-500">Error al cargar puestos</div>
      </div>
    );
  }

  if (positions.length === 0 && !hasActiveHeaderFilters) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10">
        <div className="text-center text-gray-500">
          No se encontraron puestos.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            Lista de puestos
          </h2>
        </div>
        <ActiveFilterChips
          groups={[
            {
              category: "Nombre",
              values: nombreSeleccionado,
              options: nombreOptions,
              onChange: setNombreSeleccionado,
            },
            ...(showEmpresa
              ? [
                  {
                    category: "Empresa",
                    values: empresaSeleccionada,
                    options: empresaOptions,
                    onChange: setEmpresaSeleccionada,
                  },
                ]
              : []),
          ]}
          onClearAll={clearAllHeaderFilters}
        />
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 hover:bg-gray-50">
                <TableHead className="font-semibold text-gray-700 uppercase text-xs">
                  <HeaderMultiFilter
                    selected={nombreSeleccionado}
                    onChange={setNombreSeleccionado}
                    options={nombreOptions}
                    placeholder="Nombre"
                  />
                </TableHead>
                {showEmpresa && (
                  <TableHead className="font-semibold text-gray-700 uppercase text-xs">
                    <HeaderMultiFilter
                      selected={empresaSeleccionada}
                      onChange={setEmpresaSeleccionada}
                      options={empresaOptions}
                      placeholder="Empresa"
                    />
                  </TableHead>
                )}
                <TableHead className="font-semibold text-gray-700 uppercase text-xs text-right">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedRows.map((puesto) => (
                <TableRow
                  key={puesto.id_puesto}
                  className="hover:bg-gray-50 border-b border-gray-100"
                >
                  <TableCell className="font-medium text-gray-900">
                    {puesto.nombre_puesto}
                  </TableCell>
                  {showEmpresa && (
                    <TableCell>{puesto.empresa_nombre}</TableCell>
                  )}
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center gap-2">
                      <button
                        onClick={() => onEdit(puesto, positions)}
                        className="p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4 text-[#2563EB]" />
                      </button>
                      <button
                        onClick={() => onDelete(puesto.id_puesto, key)}
                        className="p-2 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {displayedRows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={showEmpresa ? 3 : 2}
                    className="py-8 text-center text-gray-500"
                  >
                    No hay puestos para los filtros seleccionados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <TablePagination
        page={page}
        limit={limit}
        total={headerFilterMeta.active ? headerFilterMeta.total : data?.total}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />
    </>
  );
}
