"use client";

import useRelojChecadorData from "@/hooks/useRelojChecador";
import useEntradaSalida from "@/hooks/useEntradaSalida";
import EntradasSalidasTable from "./EntradasSalidasTable";
import EntradasDetalleSheet from "./EntradasDetalleSheet";
import TablePagination from "@/components/TablePagination";
import LoadingTable from "@/components/LoadingTable";
import ErrorPage from "@/components/ErrorPage";
import { useEffect, useRef, useState } from "react";
import { fetcherWithToken } from "@/lib/fetcher";

export default function EntradasSalidasDataContainer({
  idEmpresa,
  fecha,
  // Nuevo filtro por rango (desde/hasta). Si vienen definidos, el hook construirá el query string.
  // Se relaciona con:
  // - `src/hooks/useRelojChecador.js` (construcción del URL)
  // - backend `checadorController.obtenerAsistenciaPorFecha` (query params `desde/hasta`)
  desde,
  hasta,
  page,
  limit,
  filtroNombre,
  departamento,
  estado,
  setPage,
  empresaActiva,
  onResetFilters,
  sortConfig,
  setSortConfig,
  onLimitChange,
  agrupar = null,
  visibleColumns = null,
}) {
  const [filterOptionsRows, setFilterOptionsRows] = useState([]);
  const [headerFilterMeta, setHeaderFilterMeta] = useState({
    active: false,
    total: 0,
  });
  const [cachedData, setCachedData] = useState(null);

  const { data, error, isLoading, mutate } = useRelojChecadorData(
    idEmpresa,
    fecha,
    null,
    filtroNombre,
    page,
    limit,
    departamento,
    estado,
    desde,
    hasta,
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
      if (value !== undefined && value !== null && value !== "") {
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
          limit: String(pageSize),
        });
        const hasRange = Boolean(desde || hasta);

        if (!hasRange && fecha) baseParams.append("fecha", fecha);
        appendIf(baseParams, "desde", desde);
        appendIf(baseParams, "hasta", hasta);
        appendIf(baseParams, "nombre", filtroNombre);
        appendIf(baseParams, "departamento", departamento);
        appendIf(baseParams, "estado", estado);

        const firstParams = new URLSearchParams(baseParams);
        firstParams.set("page", "1");
        const firstData = await fetcherWithToken(
          `/checador/reloj/asistencia?${firstParams.toString()}`,
        );

        let allRows = Array.isArray(firstData?.registros)
          ? firstData.registros
          : [];
        const totalPages = Number(firstData?.totalPages || 1);

        for (let currentPage = 2; currentPage <= totalPages; currentPage += 1) {
          const pageParams = new URLSearchParams(baseParams);
          pageParams.set("page", String(currentPage));
          const pageData = await fetcherWithToken(
            `/checador/reloj/asistencia?${pageParams.toString()}`,
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
  }, [idEmpresa, fecha, desde, hasta, filtroNombre, departamento, estado]);

  const effectiveData = data || cachedData;

  useEffect(() => {
    if (data) setCachedData(data);
  }, [data]);

  const registros = Array.isArray(effectiveData?.registros)
    ? effectiveData.registros
    : [];

  const totalRegistros = effectiveData?.total ?? 0;

  const {
    editingMovimientoId,
    editingMovimientoData,
    isSavingMovimiento,
    handleEditMovimientoClick,
    handleCancelMovimientoEdit,
    handleMovimientoFieldChange,
    handleSaveMovimientoClick,
  } = useEntradaSalida(mutate);

  // Panel lateral de detalle (clic en una fila)
  const [registroDetalle, setRegistroDetalle] = useState(null);

  useEffect(() => {
    if (!headerFilterMeta.active) return;
    const totalPages = Math.max(1, Math.ceil(headerFilterMeta.total / limit));
    if (page > totalPages) setPage(1);
  }, [headerFilterMeta, page, limit, setPage]);

  if (isLoading && !effectiveData) return <LoadingTable rows={10} />;
  if (error) {
    console.error(error);
    return (
      <ErrorPage message="Error al cargar los registros de entradas y salidas" />
    );
  }

  return {
    ui: (
      <>
        <EntradasSalidasTable
          registros={registros}
          filterOptionsRows={filterOptionsRows}
          page={page}
          limit={limit}
          sortConfig={sortConfig}
          setSortConfig={setSortConfig}
          setPage={setPage}
          onHeaderFilteringMetaChange={setHeaderFilterMeta}
          fecha={fecha}
          editingMovimientoId={editingMovimientoId}
          editingMovimientoData={editingMovimientoData}
          isSavingMovimiento={isSavingMovimiento}
          handleEditMovimientoClick={handleEditMovimientoClick}
          handleCancelMovimientoEdit={handleCancelMovimientoEdit}
          handleMovimientoFieldChange={handleMovimientoFieldChange}
          handleSaveMovimientoClick={handleSaveMovimientoClick}
          empresaActiva={empresaActiva}
          onResetFilters={onResetFilters}
          agrupar={agrupar}
          visibleColumns={visibleColumns}
          onRowClick={(registro) => setRegistroDetalle(registro)}
        />

        <EntradasDetalleSheet
          registro={registroDetalle}
          open={Boolean(registroDetalle)}
          onOpenChange={(abierto) => {
            if (!abierto) setRegistroDetalle(null);
          }}
          onCorregir={handleEditMovimientoClick}
          empresaActiva={empresaActiva}
        />
        {/* IMPORTANTE (UX):
            Aunque una página venga vacía por cambios de filtros o desajustes temporales,
            dejamos la paginación visible si el backend reporta total > 0, para poder regresar. */}
        {(effectiveData?.total || 0) > 0 && (
          <TablePagination
            page={page}
            limit={limit}
            total={
              headerFilterMeta.active
                ? headerFilterMeta.total
                : effectiveData?.total || 0
            }
            onPageChange={setPage}
            onLimitChange={onLimitChange}
          />
        )}
      </>
    ),
    data: {
      ...effectiveData,
      totalHoy: totalRegistros,
    },
  };
}
