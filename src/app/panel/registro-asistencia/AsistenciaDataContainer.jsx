"use client";

import useAsistenciaData from "@/hooks/useAsistenciaData";
import useEmpleadosData from "@/hooks/useEmpleadosData";
import useTiposPermisoData from "@/hooks/useTiposPermisoData";
import useAsistenciaActions from "@/hooks/useAsistenciaActions";
import AsistenciaTable from "./AsistenciaTable";
import TablePagination from "@/components/TablePagination";
import LoadingTable from "@/components/LoadingTable";
import ErrorPage from "@/components/ErrorPage";
import { useEffect, useRef, useState } from "react";
import { fetcherWithToken } from "@/lib/fetcher";
import useDepartamentosData from "@/hooks/useDepartamentosData";

const DEFAULT_SORT_CONFIG = {
  sortBy: "fecha",
  sortOrder: "desc",
};

export default function AsistenciaDataContainer({
  idEmpresa,
  empresaActiva,
  fechaInicio,
  fechaFin,
  page,
  limit,
  readOnly = false,
  debouncedFiltroEmpleado,
  filtroDepartamento,
  filtroTipoRegistro,
  filtroEstadoAsistencia,
  setPage,
  onLimitChange,
  mostrarCamposExtras,
  abrirFormulario,
  onResetFilters,
  soloPresentes,
  soloAusentes,
  horasExtra,
  sinGoceDeSueldo,
  diasFestivos,
  requiereAutorizacion,
  sortConfig = DEFAULT_SORT_CONFIG,
  setSortConfig = () => {},
}) {
  const { departamentos } = useDepartamentosData(idEmpresa);
  const [filterOptionsRows, setFilterOptionsRows] = useState([]);
  const [headerFilterMeta, setHeaderFilterMeta] = useState({
    active: false,
    total: 0,
  });
  const [cachedData, setCachedData] = useState(null);

  const handleResetAll = () => {
    setSortConfig(DEFAULT_SORT_CONFIG);
    setPage(1);
    onResetFilters?.();
  };

  const { data, error, isLoading, mutate } = useAsistenciaData(
    idEmpresa,
    fechaInicio,
    fechaFin,
    page,
    limit,
    debouncedFiltroEmpleado,
    filtroDepartamento,
    filtroTipoRegistro,
    filtroEstadoAsistencia,
    soloPresentes,
    soloAusentes,
    horasExtra,
    sinGoceDeSueldo,
    diasFestivos,
    requiereAutorizacion,
    sortConfig.sortBy,
    sortConfig.sortOrder,
  );

  // Ref para siempre tener el mutate más reciente sin recrear el EventSource
  const mutateRef = useRef(mutate);
  useEffect(() => {
    mutateRef.current = mutate;
  }, [mutate]);

  // SSE: actualización en tiempo real cuando llega una checada
  useEffect(() => {
    if (!idEmpresa) return;
    const es = new EventSource(
      `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/reloj/eventos-checada?id_empresa=${idEmpresa}`,
    );
    es.addEventListener("checada", () => mutateRef.current());
    es.onerror = () => {};
    return () => es.close();
  }, [idEmpresa]);

  useEffect(() => {
    let isCancelled = false;

    const appendIf = (params, key, value) => {
      if (value === undefined || value === null) return;

      if (Array.isArray(value)) {
        if (value.length > 0) {
          params.append(key, JSON.stringify(value));
        }
        return;
      }

      if (value !== "") {
        params.append(key, String(value));
      }
    };

    const loadFilterOptionsRows = async () => {
      if (!idEmpresa) {
        if (!isCancelled) setFilterOptionsRows([]);
        return;
      }

      try {
        const pageSize = 500;
        const baseParams = new URLSearchParams({
          empresa: String(idEmpresa),
          fechaInicio: fechaInicio || "",
          fechaFin: fechaFin || "",
          limit: String(pageSize),
        });

        appendIf(baseParams, "filtroEmpleado", debouncedFiltroEmpleado);
        appendIf(baseParams, "filtroDepartamento", filtroDepartamento);
        appendIf(baseParams, "filtroTipoRegistro", filtroTipoRegistro);
        appendIf(baseParams, "filtroEstadoAsistencia", filtroEstadoAsistencia);
        if (soloPresentes) baseParams.append("soloPresentes", "1");
        if (soloAusentes) baseParams.append("soloAusentes", "1");
        if (horasExtra) baseParams.append("horasExtra", "1");
        if (sinGoceDeSueldo) baseParams.append("sinGoceDeSueldo", "0");
        if (diasFestivos) baseParams.append("diasFestivos", "1");
        if (requiereAutorizacion)
          baseParams.append("requiereAutorizacion", "1");

        const firstParams = new URLSearchParams(baseParams);
        firstParams.set("page", "1");
        const firstData = await fetcherWithToken(
          `/checador/asistencias?${firstParams.toString()}`,
        );

        let allRows = Array.isArray(firstData?.registros)
          ? firstData.registros
          : [];
        const totalPages = Number(firstData?.totalPages || 1);

        for (let currentPage = 2; currentPage <= totalPages; currentPage += 1) {
          const pageParams = new URLSearchParams(baseParams);
          pageParams.set("page", String(currentPage));
          const pageData = await fetcherWithToken(
            `/checador/asistencias?${pageParams.toString()}`,
          );
          if (Array.isArray(pageData?.registros)) {
            allRows = [...allRows, ...pageData.registros];
          }
        }

        if (!isCancelled) {
          setFilterOptionsRows(allRows);
        }
      } catch (fetchError) {
        if (!isCancelled) {
          setFilterOptionsRows([]);
        }
      }
    };

    loadFilterOptionsRows();

    return () => {
      isCancelled = true;
    };
  }, [
    idEmpresa,
    fechaInicio,
    fechaFin,
    debouncedFiltroEmpleado,
    filtroDepartamento,
    filtroTipoRegistro,
    filtroEstadoAsistencia,
    soloPresentes,
    soloAusentes,
    horasExtra,
    sinGoceDeSueldo,
    diasFestivos,
    requiereAutorizacion,
  ]);

  const { data: empleados } = useEmpleadosData(idEmpresa);
  const { data: tiposPermiso } = useTiposPermisoData();

  const effectiveData = data || cachedData;

  useEffect(() => {
    if (data) setCachedData(data);
  }, [data]);

  const registros = Array.isArray(effectiveData?.registros)
    ? effectiveData.registros
    : [];
  const currentPage = effectiveData?.page || page || 1;

  const mostrarPaginacion = effectiveData?.aplicarPaginacion !== false;
  const totalRegistros = effectiveData?.total || 0;

  const onPageChange = (newPage) => {
    setPage(newPage);
  };

  useEffect(() => {
    if (!headerFilterMeta.active) return;
    const totalPages = Math.max(1, Math.ceil(headerFilterMeta.total / limit));
    if (page > totalPages) setPage(1);
  }, [headerFilterMeta, page, limit, setPage]);

  const {
    editingRowId,
    setEditingRowId,
    editingRowData,
    setEditingRowData,
    isSaving,
    handleEditClick,
    handleCancelEdit,
    handleFieldChange,
    handleSaveClick,
  } = useAsistenciaActions(mutate);

  if (isLoading && !effectiveData) return <LoadingTable rows={10} />;
  if (error) {
    console.error(error);
    return <ErrorPage message="Error al cargar los registros de asistencia" />;
  }

  return {
    ui: (
      <>
        <AsistenciaTable
          filtrados={registros}
          filterOptionsRows={filterOptionsRows}
          page={page}
          limit={limit}
          onHeaderFilteringMetaChange={setHeaderFilterMeta}
          fecha={fechaInicio}
          readOnly={readOnly}
          editingRowId={editingRowId}
          editingRowData={editingRowData}
          isSaving={isSaving}
          empleados={empleados?.data}
          tiposPermiso={tiposPermiso}
          handleEditClick={handleEditClick}
          handleCancelEdit={handleCancelEdit}
          handleFieldChange={handleFieldChange}
          handleSaveClick={handleSaveClick}
          mutateAsistencia={mutate}
          mostrarCamposExtras={mostrarCamposExtras}
          abrirFormulario={abrirFormulario}
          onResetFilters={handleResetAll}
          empresaActiva={empresaActiva}
          departamentosCatalogo={departamentos}
          sortConfig={sortConfig}
          setSortConfig={setSortConfig}
          setPage={setPage}
        />

        {mostrarPaginacion && registros.length > 0 && (
          <TablePagination
            page={currentPage}
            limit={limit}
            total={
              headerFilterMeta.active ? headerFilterMeta.total : totalRegistros
            }
            onPageChange={onPageChange}
            onLimitChange={onLimitChange}
          />
        )}

        {!mostrarPaginacion && registros.length > 0 && (
          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded text-center">
            <p className="text-gray-600">
              Mostrando <strong>{registros.length}</strong> registros de{" "}
              <strong>{totalRegistros}</strong> totales
              {fechaInicio &&
                fechaFin &&
                ` para el rango de fechas seleccionado`}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              La paginación está desactivada para rangos de fechas mayores a un
              día
            </p>
          </div>
        )}
      </>
    ),
    data: effectiveData,
    mutate,
  };
}
