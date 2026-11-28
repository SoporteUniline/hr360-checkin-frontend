"use client";
import { CuentaHorasProvider } from "./CuentaHorasContext";
import useLocalClockEvents from '@/hooks/useLocalClockEvents';
import LocalClockCaptures from '@/components/Clock/LocalClockCaptures';

import useAsistenciaData from "@/hooks/useAsistenciaData";
import useEmpleadosData from "@/hooks/useEmpleadosData";
import useTiposPermisoData from "@/hooks/useTiposPermisoData";
import useAsistenciaActions from "@/hooks/useAsistenciaActions";
import AsistenciaTable from "./AsistenciaTable";
import RelojDiaDialog from "./RelojDiaDialog";
import AsistenciaMatriz from "./AsistenciaMatriz";
import VistaHoras from "./VistaHoras";
import TablePagination from "@/components/TablePagination";
import LoadingTable from "@/components/LoadingTable";
import ErrorPage from "@/components/ErrorPage";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetcherWithToken } from "@/lib/fetcher";
import useDepartamentosData from "@/hooks/useDepartamentosData";
import useRefrescoChecadas from "@/hooks/useRefrescoChecadas";
import { cargarPeriodoCompleto, cargarPeriodoDeUnaVez, parametrosPeriodo, tablaTraeTodoElPeriodo } from "@/lib/asistencia/consultaPeriodo.mjs";
import { conRefrescoAsistencias } from "@/lib/asistencia/refrescoAsistencias";
import { indiceFestivos as crearIndiceFestivos } from "@/lib/asistencia/calendario.mjs";
import useSWR from "swr";
import { useEmpresaTimezone } from "@/context/AuthContext";
import { resumenHorasExtra as resumenHorasExtraPeriodo } from "@/lib/asistencia/horasExtra.mjs";
import { resumenControl } from "@/lib/asistencia/controlHorasExtra.mjs";
import { sinSalidaAComer } from "@/lib/asistencia/jornada.mjs";

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
  sinComida = false,
  sinGoceDeSueldo,
  diasFestivos,
  requiereAutorizacion,
  sortConfig = DEFAULT_SORT_CONFIG,
  setSortConfig = () => {},
  agrupar = null,
  visibleColumns = null,
  vista = "lista",
  // «Control de horas extra»: { tope } activa sus columnas; estadosHorasExtra filtra desde las tarjetas.
  controlHorasExtra = null,
  estadosHorasExtra = null,
  ocultarRegistroMasivo = false,
}) {
  const { departamentos } = useDepartamentosData(idEmpresa);
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

  const { data, error, isLoading, mutate: mutateTabla } = useAsistenciaData(
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

  // Tras guardar se recarga TODO lo que depende de las asistencias (tabla, periodo, cuenta de horas, horas extra,
  // historial…), no solo la tabla: lib/asistencia/refrescoAsistencias.js. Con datos (cambio optimista) va a la tabla.
  const mutate = useMemo(() => conRefrescoAsistencias(mutateTabla), [mutateTabla]);
  // Checadas y cambios de otros (SSE), la cola sin conexión, el foco y el sondeo de respaldo: mismo refrescador.
  useRefrescoChecadas(idEmpresa);

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

  // Con "Todos los registros", o si el total cabe en la primera página (celular: páginas de 500), la tabla ya trae
  // el periodo completo: no se descarga dos veces. Mientras la tabla carga no se decide (no se pide nada extra).
  const mostrarTodos = tablaTraeTodoElPeriodo(data, { limit, page });

  // Periodo completo (tarjetas, filtros por columna, matriz): clave SWR propia que empieza con /checador/asistencias,
  // así el refrescador la recarga con lo demás. Solo se pide cuando la tabla respondió y NO trae todo el periodo,
  // y en una sola petición (antes: conteo + todo).
  const clavePeriodo = idEmpresa && data && !mostrarTodos
    ? ["/checador/asistencias#periodo", parametrosPeriodo(filtrosPeriodo).toString()]
    : null;
  const { data: periodo, error: errorPeriodo } = useSWR(clavePeriodo, () => cargarPeriodoDeUnaVez(fetcherWithToken, filtrosPeriodo), {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
    keepPreviousData: true,
  });
  const filterOptionsRows = useMemo(
    () => (errorPeriodo || !Array.isArray(periodo?.registros) ? [] : periodo.registros),
    [periodo, errorPeriodo],
  );

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
  const control = useMemo(
    () => (controlHorasExtra
      ? { tope: controlHorasExtra.tope, resumen: resumenControl(filasPeriodo, { zonaDe: (r) => r.zona_horaria || zonaEmpresa, tope: controlHorasExtra.tope, contexto: controlHorasExtra.contexto }) }
      : null),
    [controlHorasExtra, filasPeriodo, zonaEmpresa],
  );
  // Quienes no marcaron salida a comer (su horario tiene comida y solo hay un tramo).
  const totalSinComida = useMemo(() => filasPeriodo.filter(sinSalidaAComer).length, [filasPeriodo]);

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
    handleActualizarBase,
    handleRestoreOriginal,
    handleFieldChange,
    handleSaveClick,
  } = useAsistenciaActions(mutate);
  // El reloj del día: la forma de corregir horas en Asistencias (fila, icono, «Sí vino», horas extra por autorizar).
  const [relojDe, setRelojDe] = useState(null);
  const abrirDia = readOnly || controlHorasExtra ? handleEditClick : setRelojDe;

  // «Abrir en Asistencias» desde Control de horas extra: ?abrir=<id> abre su ventana de edición una vez.
  const searchParams = useSearchParams();
  // Desde la pestaña Horas: ?abrirEmpleado=<id_empleado>&fecha=YYYY-MM-DD abre el registro de ese día.
  const abrirId = searchParams?.get("abrir");
  const abrirEmpleado = searchParams?.get("abrirEmpleado");
  const abrirFecha = searchParams?.get("fecha");
  const abiertoRef = useRef(null);
  useEffect(() => {
    const clave = abrirId || (abrirEmpleado && `${abrirEmpleado}|${abrirFecha}`);
    if (!clave || abiertoRef.current === clave) return;
    const r = abrirId
      ? registros.find((x) => String(x.id) === String(abrirId))
      : registros.find((x) => String(x.id_empleado) === String(abrirEmpleado) && String(x.fecha ?? "").slice(0, 10) === abrirFecha);
    if (!r) return;
    abiertoRef.current = clave;
    abrirDia(r);
  }, [abrirId, abrirEmpleado, abrirFecha, registros, abrirDia]);


  // Devuelve { ui, ... } con un solo esqueleto hasta tener datos (y empresa): así la tabla no desaparece al
  // recargar, el error se ve y no se pinta «No hay registros» antes de saber la empresa.
  const sinDatosAun = !effectiveData && !localEvents.length && (isLoading || !idEmpresa);
  const base = { data: effectiveData, resumenHorasExtra, totalSinComida, control, cargando: true, localEvents, mutate };
  if (sinDatosAun) return { ...base, ui: <LoadingTable cols={9} rows={10} /> };
  if (error && (!localEvents.length || [401, 403].includes(error.response?.status))) {
    console.error(error);
    return { ...base, cargando: false, ui: <ErrorPage message="Error al cargar los registros de asistencia" /> };
  }

  return {
    ui: (
      <CuentaHorasProvider registros={registros}>
        {vista === "horas" ? (
          <VistaHoras
            idEmpresa={idEmpresa}
            fechaInicio={fechaInicio}
            fechaFin={fechaFin}
            filtroEmpleado={debouncedFiltroEmpleado || ""}
          />
        ) : vista === "matriz" ? (
          <><LocalClockCaptures events={localEvents} /><AsistenciaMatriz
            registros={filasPeriodo}
            fechaInicio={fechaInicio}
            fechaFin={fechaFin}
            cargando={isLoading && filasPeriodo.length === 0}
            idEmpresa={idEmpresa}
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
          handleActualizarBase={handleActualizarBase}
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
          soloSinComida={sinComida}
          control={control}
          estadosHorasExtra={estadosHorasExtra}
          ocultarRegistroMasivo={ocultarRegistroMasivo}
          onAbrirReloj={readOnly || controlHorasExtra ? null : setRelojDe}
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

        {relojDe ? (
          <RelojDiaDialog registro={relojDe} onCerrar={() => setRelojDe(null)} onGuardado={() => mutate()} />
        ) : null}

        {!mostrarPaginacion && !controlHorasExtra && registros.length > 0 && (
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
      </CuentaHorasProvider>
    ),
    data: effectiveData,
    resumenHorasExtra,
    totalSinComida,
    control,
    cargando: isLoading && !effectiveData,
    localEvents,
    mutate,
  };
}
