"use client";

import useEmpleadosData from "@/hooks/useEmpleadosData";
import EmpleadosTable from "./EmpleadosTable";
import TablePagination from "@/components/TablePagination";
import LoadingTable from "@/components/LoadingTable";
import ErrorPage from "@/components/ErrorPage";
import { useEffect, useState } from "react";
import { fetcherWithToken } from "@/lib/fetcher";

export default function EmpleadosDataContainer({
  idEmpresa,
  page,
  limit,
  filtroNombre,
  departamento,
  estado,
  setPage,
  abrirFormulario,
  fechaDesde,
  resetFilters,
  visibleColumns,
  limpiarFiltrosToken,
  refreshSincronizacionToken,
  onEmployeeChanged,
}) {
  const [filterOptionsRows, setFilterOptionsRows] = useState([]);
  const [headerFilterMeta, setHeaderFilterMeta] = useState({
    active: false,
    total: 0,
  });
  const [cachedData, setCachedData] = useState(null);

  const { data, error, isLoading, mutate } = useEmpleadosData(
    idEmpresa,
    page,
    limit,
    filtroNombre,
    departamento,
    estado,
    fechaDesde,
  );

  useEffect(() => {
    if (data) setCachedData(data);
  }, [data]);

  useEffect(() => {
    let isCancelled = false;

    const loadFilterOptionsRows = async () => {
      if (!idEmpresa) {
        if (!isCancelled) setFilterOptionsRows([]);
        return;
      }

      try {
        const countParams = new URLSearchParams({
          empresa: String(idEmpresa),
          page: "1",
          limit: "1",
        });

        if (filtroNombre) countParams.append("nombre", filtroNombre);
        if (departamento) countParams.append("departamento", departamento);
        if (estado) countParams.append("estado", estado);
        if (fechaDesde) countParams.append("fechaDesde", fechaDesde);

        const countData = await fetcherWithToken(
          `/checador/empleados?${countParams.toString()}`,
        );

        const total = Number(countData?.total || 0);

        if (total === 0) {
          if (!isCancelled) setFilterOptionsRows([]);
          return;
        }

        const allParams = new URLSearchParams(countParams);
        allParams.set("limit", String(total));

        const allData = await fetcherWithToken(
          `/checador/empleados?${allParams.toString()}`,
        );

        if (!isCancelled) {
          setFilterOptionsRows(
            Array.isArray(allData?.data) ? allData.data : [],
          );
        }
      } catch (fetchError) {
        if (!isCancelled) setFilterOptionsRows([]);
      }
    };

    loadFilterOptionsRows();

    return () => {
      isCancelled = true;
    };
  }, [
    idEmpresa,
    filtroNombre,
    departamento,
    estado,
    fechaDesde,
    refreshSincronizacionToken,
  ]);

  const effectiveData = data || cachedData;

  useEffect(() => {
    if (!headerFilterMeta.active) return;
    const totalPages = Math.max(1, Math.ceil(headerFilterMeta.total / limit));
    if (page > totalPages) setPage(1);
  }, [headerFilterMeta, page, limit, setPage]);

  if (isLoading && !effectiveData) return <LoadingTable rows={10} />;
  if (error)
    return (
      <ErrorPage message={error?.message || "Error al cargar empleados"} />
    );

  const empleados = effectiveData?.data || [];

  return {
    ui: (
      <>
        <EmpleadosTable
          empleados={empleados}
          filterOptionsRows={filterOptionsRows}
          abrirFormulario={abrirFormulario} // 🔑
          mutate={mutate}
          page={page}
          limit={limit}
          resetFilters={resetFilters}
          onHeaderFilteringMetaChange={setHeaderFilterMeta}
          visibleColumns={visibleColumns}
          limpiarFiltrosToken={limpiarFiltrosToken}
          onEmployeeChanged={onEmployeeChanged}
        />
        <TablePagination
          page={page}
          limit={limit}
          total={
            headerFilterMeta.active
              ? headerFilterMeta.total
              : effectiveData?.total || 0
          }
          onPageChange={setPage}
        />
      </>
    ),
    data: effectiveData,
    mutate,
  };
}
