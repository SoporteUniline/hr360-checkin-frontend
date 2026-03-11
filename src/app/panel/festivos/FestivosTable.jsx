"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Trash2 } from "lucide-react";
import useSWR from "swr";
import { fetcherWithToken, swr_config } from "@/lib/fetcher";
import { useEffect, useMemo, useState } from "react";
import TablePagination from "@/components/TablePagination";
import HeaderMultiFilter from "../registro-asistencia/HeaderMultiFilter";
import ActiveFilterChips from "../registro-asistencia/ActiveFilterChips";

function formatDateDMYLocal(dateStr) {
  if (!dateStr) return "-";

  const [year, month, day] = dateStr.split("T")[0].split("-");

  if (!year || !month || !day) return "-";

  return `${day}/${month}/${year}`;
}

export default function FestivosTable({
  id_empresa,
  swrKey,
  onEdit,
  onDelete,
  onLoad,
}) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [filterOptionsRows, setFilterOptionsRows] = useState([]);
  const [headerFilterMeta, setHeaderFilterMeta] = useState({
    active: false,
    total: 0,
  });
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState([]);
  const [fechaSeleccionada, setFechaSeleccionada] = useState([]);
  const [descripcionSeleccionada, setDescripcionSeleccionada] = useState([]);

  const url = swrKey
    ? `${swrKey}${swrKey.includes("?") ? "&" : "?"}page=${page}&limit=${limit}`
    : null;

  const { data, error, isLoading } = useSWR(url, fetcherWithToken, swr_config);

  const festivos = Array.isArray(data?.festivos) ? data.festivos : [];
  const sourceRows = useMemo(
    () =>
      Array.isArray(filterOptionsRows) && filterOptionsRows.length > 0
        ? filterOptionsRows
        : festivos,
    [filterOptionsRows, festivos],
  );

  const uniqueOptions = (values) =>
    [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));

  const empresaOptions = useMemo(
    () => uniqueOptions(sourceRows.map((row) => row.empresa_nombre)),
    [sourceRows],
  );
  const fechaOptions = useMemo(
    () =>
      uniqueOptions(
        sourceRows.map((row) =>
          row.fecha ? formatDateDMYLocal(row.fecha) : null,
        ),
      ),
    [sourceRows],
  );
  const descripcionOptions = useMemo(
    () => uniqueOptions(sourceRows.map((row) => row.descripcion)),
    [sourceRows],
  );

  const filteredRowsAll = useMemo(
    () =>
      sourceRows.filter((row) => {
        const empresa = row.empresa_nombre;
        const fecha = row.fecha ? formatDateDMYLocal(row.fecha) : null;
        const descripcion = row.descripcion;
        const passEmpresa =
          empresaSeleccionada.length === 0 ||
          empresaSeleccionada.includes(empresa);
        const passFecha =
          fechaSeleccionada.length === 0 || fechaSeleccionada.includes(fecha);
        const passDescripcion =
          descripcionSeleccionada.length === 0 ||
          descripcionSeleccionada.includes(descripcion);
        return passEmpresa && passFecha && passDescripcion;
      }),
    [
      sourceRows,
      empresaSeleccionada,
      fechaSeleccionada,
      descripcionSeleccionada,
    ],
  );

  const hasActiveHeaderFilters =
    empresaSeleccionada.length > 0 ||
    fechaSeleccionada.length > 0 ||
    descripcionSeleccionada.length > 0;

  const displayedRows = useMemo(() => {
    if (!hasActiveHeaderFilters) return festivos;
    const offset = (page - 1) * limit;
    return filteredRowsAll.slice(offset, offset + limit);
  }, [hasActiveHeaderFilters, festivos, page, limit, filteredRowsAll]);

  const clearAllHeaderFilters = () => {
    setEmpresaSeleccionada([]);
    setFechaSeleccionada([]);
    setDescripcionSeleccionada([]);
  };

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
        let allRows = Array.isArray(firstData?.festivos) ? firstData.festivos : [];
        const totalRows = Number(firstData?.total || allRows.length);
        const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

        for (let currentPage = 2; currentPage <= totalPages; currentPage += 1) {
          const pageUrl = `${swrKey}${
            swrKey.includes("?") ? "&" : "?"
          }page=${currentPage}&limit=${pageSize}`;
          const pageData = await fetcherWithToken(pageUrl);
          if (Array.isArray(pageData?.festivos)) {
            allRows = [...allRows, ...pageData.festivos];
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

  useEffect(() => {
    if (onLoad) {
      onLoad(festivos);
    }
  }, [festivos, onLoad]);

  if (isLoading) return <p>Cargando...</p>;
  if (error) return <p>Error al cargar festivos</p>;
  if (festivos.length === 0)
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-10 text-center text-sm text-gray-600">
        No se encontraron días festivos.
      </div>
    );

  return (
    <>
      <Card className="p-0 overflow-hidden border-gray-100">
        
        <ActiveFilterChips
          groups={[
            {
              category: "Empresa",
              values: empresaSeleccionada,
              options: empresaOptions,
              onChange: setEmpresaSeleccionada,
            },
            {
              category: "Fecha",
              values: fechaSeleccionada,
              options: fechaOptions,
              onChange: setFechaSeleccionada,
            },
            {
              category: "Descripción",
              values: descripcionSeleccionada,
              options: descripcionOptions,
              onChange: setDescripcionSeleccionada,
            },
          ]}
          onClearAll={clearAllHeaderFilters}
        />
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-xs font-semibold uppercase text-gray-600">
                    <HeaderMultiFilter
                      selected={empresaSeleccionada}
                      onChange={setEmpresaSeleccionada}
                      options={empresaOptions}
                      placeholder="Empresa"
                    />
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-gray-600">
                    <HeaderMultiFilter
                      selected={fechaSeleccionada}
                      onChange={setFechaSeleccionada}
                      options={fechaOptions}
                      placeholder="Fecha"
                    />
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-gray-600">
                    <HeaderMultiFilter
                      selected={descripcionSeleccionada}
                      onChange={setDescripcionSeleccionada}
                      options={descripcionOptions}
                      placeholder="Descripción"
                    />
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase text-gray-600">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedRows.map((festivo) => (
                  <TableRow key={festivo.id} className="hover:bg-zinc-50">
                    <TableCell>{festivo.empresa_nombre || "-"}</TableCell>
                    <TableCell>
                      {festivo.fecha ? formatDateDMYLocal(festivo.fecha) : "-"}
                    </TableCell>
                    <TableCell>{festivo.descripcion}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-2">
                        <button
                          onClick={() => onEdit(festivo, festivos)}
                          className="p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4 text-[#2563EB]" />
                        </button>
                        <button
                          onClick={() => onDelete(festivo.id)}
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
                    <TableCell colSpan={4} className="py-8 text-center text-gray-500">
                      No hay días festivos para los filtros seleccionados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <TablePagination
        page={page}
        limit={limit}
        total={headerFilterMeta.active ? headerFilterMeta.total : data?.total}
        onPageChange={setPage}
      />
    </>
  );
}
