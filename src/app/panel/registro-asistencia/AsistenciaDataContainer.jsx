"use client";
import useLocalClockEvents from '@/hooks/useLocalClockEvents';
import LocalClockCaptures from '@/components/Clock/LocalClockCaptures';

import useAsistenciaData from "@/hooks/useAsistenciaData";
import useEmpleadosData from "@/hooks/useEmpleadosData";
import useTiposPermisoData from "@/hooks/useTiposPermisoData";
import useAsistenciaActions from "@/hooks/useAsistenciaActions";
import AsistenciaTable from "./AsistenciaTable";
import AsistenciaMatriz from "./AsistenciaMatriz";
import TablePagination from "@/components/TablePagination";
import LoadingTable from "@/components/LoadingTable";
import ErrorPage from "@/components/ErrorPage";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetcherWithToken } from "@/lib/fetcher";
import useDepartamentosData from "@/hooks/useDepartamentosData";
import { useSnackbar } from "notistack";
import { cargarPeriodoCompleto, LIMITE_TODOS } from "@/lib/asistencia/consultaPeriodo.mjs";
import { indiceFestivos as crearIndiceFestivos } from "@/lib/asistencia/calendario.mjs";
import useSWR from "swr";
import { useEmpresaTimezone } from "@/context/AuthContext";
import { resumenHorasExtra as resumenHorasExtraPeriodo } from "@/lib/asistencia/horasExtra.mjs";

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
  agrupar = null,
  visibleColumns = null,
  vista = "lista",
}) {
  const { departamentos } = useDepartamentosData(idEmpresa);
  const [filterOptionsRows, setFilterOptionsRows] = useState([]);
  const [headerFilterMeta, setHeaderFilterMeta] = useState({
    active: false,
    total: 0,
  });
  const [cachedData, setCachedData] = useState(null);
  const localEvents = useLocalClockEvents({ company: idEmpresa, from: fechaInicio, to: fechaFin, search: debouncedFiltroEmpleado });

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
    // «Horas extra» se filtra en pantalla por estado (por autorizar, autorizadas,
    // no autorizadas); el filtro del servidor solo conocía hrs_extra = 1.
    false,
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
  useEffect(() => {
    // Solo recarga cuando cambió la cola de checadas; preparar el reloj ('perfil') no cambia datos
    // (antes provocaba una segunda descarga completa del periodo al abrir la vista).
    const refresh = (event) => {
      if (event?.detail?.motivo === 'perfil') return;
      if (navigator.onLine && window.__adamiaOffline !== true) void mutateRef.current().catch(() => {});
    };
    window.addEventListener('adamia-queue', refresh);
    return () => window.removeEventListener('adamia-queue', refresh);
  }, []);

  // SSE: actualización en tiempo real cuando llega una checada.
  // Además de refrescar, se notifica con un toast discreto (máx. 1 cada 8 s
  // para no saturar en horas pico de entrada).
  const { enqueueSnackbar } = useSnackbar();
  const lastToastRef = useRef(0);
  useEffect(() => {
    if (!idEmpresa) return;
    const es = new EventSource(
      `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/reloj/eventos-checada?id_empresa=${idEmpresa}`,
    );
    es.addEventListener("checada", () => {
      mutateRef.current();
      const ahora = Date.now();
      if (ahora - lastToastRef.current > 8000) {
        lastToastRef.current = ahora;
        enqueueSnackbar("Nueva checada recibida — registros actualizados", {
          variant: "success",
          autoHideDuration: 3500,
        });
      }
    });
    es.onerror = () => {};
    return () => es.close();
  }, [idEmpresa, enqueueSnackbar]);

  // Filtros activos del periodo: los usan las opciones por columna y Exportar.
  const filtrosPeriodo = {
    idEmpresa,
    fechaInicio,
    fechaFin,
    filtroEmpleado: debouncedFiltroEmpleado,
    filtroDepartamento,
    filtroTipoRegistro,
    filtroEstadoAsistencia,
    soloPresentes,
    soloAusentes,
    sinGoceDeSueldo,
    diasFestivos,
    requiereAutorizacion,
  };
  const cargarPeriodoParaExportar = () => cargarPeriodoCompleto(fetcherWithToken, filtrosPeriodo);

  // Con "Todos los registros" la tabla ya trae el periodo completo: no se descarga dos veces.
  const mostrarTodos = Number(limit) >= LIMITE_TODOS;

  useEffect(() => {
    let isCancelled = false;
    if (mostrarTodos) return undefined;

    const loadFilterOptionsRows = async () => {
      try {
        const { registros } = await cargarPeriodoCompleto(fetcherWithToken, filtrosPeriodo);
        if (!isCancelled) setFilterOptionsRows(registros);
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
    sinGoceDeSueldo,
    diasFestivos,
    requiereAutorizacion,
    mostrarTodos,
  ]);

  const { data: empleados } = useEmpleadosData(idEmpresa);
  // Catálogo de Festivos: marca y valida "Festivo" en cada registro.
  const { data: festivosData } = useSWR(
    idEmpresa ? `/checador/holidays/${idEmpresa}` : null,
    fetcherWithToken,
    { revalidateOnFocus: false },
  );
  const indiceFestivos = useMemo(() => crearIndiceFestivos(festivosData), [festivosData]);
  const { data: tiposPermiso } = useTiposPermisoData();

  const effectiveData = data;

  // useEffect(() => {
  //   if (data) setCachedData(data);
  // }, [data]);

  const registros = Array.isArray(effectiveData?.registros)
    ? effectiveData.registros
    : [];
  // Filas del periodo completo para los filtros por columna y la matriz.
  const filasPeriodo = mostrarTodos ? registros : filterOptionsRows;
  const currentPage = effectiveData?.page || page || 1;
  const zonaEmpresa = useEmpresaTimezone(empresaActiva);
  const resumenHorasExtra = useMemo(
    () => resumenHorasExtraPeriodo(filasPeriodo, (r) => r.zona_horaria || zonaEmpresa),
    [filasPeriodo, zonaEmpresa],
  );

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
    isSaving,
    handleEditClick,
    handleCancelEdit,
    handleRestoreOriginal,
    handleFieldChange,
    handleSaveClick,
  } = useAsistenciaActions(mutate);


  if (isLoading && !effectiveData && !localEvents.length) return <LoadingTable rows={10} />;
  if (error && (!localEvents.length || [401, 403].includes(error.response?.status))) {
    console.error(error);
    return <ErrorPage message="Error al cargar los registros de asistencia" />;
  }

  return {
    ui: (
      <>
        {vista === "matriz" ? (
          <><LocalClockCaptures events={localEvents} /><AsistenciaMatriz
            registros={filasPeriodo}
            fechaInicio={fechaInicio}
            fechaFin={fechaFin}
            cargando={isLoading && filasPeriodo.length === 0}
          /></>
        ) : (
        <>
        <AsistenciaTable
          localEvents={localEvents}
          filtrados={registros}
          filterOptionsRows={filasPeriodo}
          cargarPeriodoParaExportar={cargarPeriodoParaExportar}
          indiceFestivos={indiceFestivos}
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
          handleRestoreOriginal={handleRestoreOriginal}
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
          agrupar={agrupar}
          visibleColumns={visibleColumns}
          soloHorasExtra={horasExtra}
          footer={
            mostrarPaginacion && registros.length > 0 ? (
              <TablePagination
                page={currentPage}
                limit={limit}
                total={
                  headerFilterMeta.active
                    ? headerFilterMeta.total
                    : totalRegistros
                }
                onPageChange={onPageChange}
                onLimitChange={onLimitChange}
              />
            ) : null
          }
        />

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
        )}
      </>
    ),
    data: effectiveData,
    resumenHorasExtra,
    localEvents,
    mutate,
  };
}
