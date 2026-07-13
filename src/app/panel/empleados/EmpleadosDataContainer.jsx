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
        const pageSize = 500;
        const baseParams = new URLSearchParams({
          empresa: String(idEmpresa),
          page: "1",
          limit: String(pageSize),
        });

        if (filtroNombre) baseParams.append("nombre", filtroNombre);
        if (departamento) baseParams.append("departamento", departamento);
        if (estado) baseParams.append("estado", estado);
        if (fechaDesde) baseParams.append("fechaDesde", fechaDesde);

        const firstData = await fetcherWithToken(
          `/checador/empleados?${baseParams.toString()}`,
        );

        let allRows = Array.isArray(firstData?.data) ? firstData.data : [];
        const total = Number(firstData?.total || allRows.length);
        const totalPages = Math.max(1, Math.ceil(total / pageSize));

        for (let currentPage = 2; currentPage <= totalPages; currentPage += 1) {
          const pageParams = new URLSearchParams(baseParams);
          pageParams.set("page", String(currentPage));
          const pageData = await fetcherWithToken(
            `/checador/empleados?${pageParams.toString()}`,
          );
          if (Array.isArray(pageData?.data)) {
            allRows = [...allRows, ...pageData.data];
          }
        }

        if (!isCancelled) setFilterOptionsRows(allRows);
      } catch (fetchError) {
        if (!isCancelled) setFilterOptionsRows([]);
      }
    };

    loadFilterOptionsRows();

    return () => {
      isCancelled = true;
    };
  }, [idEmpresa, filtroNombre, departamento, estado, fechaDesde]);

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
