"use client";

import useRelojChecadorData from "@/hooks/useRelojChecador";
import useEntradaSalida from "@/hooks/useEntradaSalida";
import EntradasSalidasTable from "./EntradasSalidasTable";
import TablePagination from "@/components/TablePagination";
import LoadingTable from "@/components/LoadingTable";
import ErrorPage from "@/components/ErrorPage";

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
}) {
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
  );

  const registros = Array.isArray(data?.registros) ? data.registros : [];

  const totalHoy = registros.length;

  const {
    editingMovimientoId,
    editingMovimientoData,
    isSavingMovimiento,
    handleEditMovimientoClick,
    handleCancelMovimientoEdit,
    handleMovimientoFieldChange,
    handleSaveMovimientoClick,
  } = useEntradaSalida(mutate);

  if (isLoading) return <LoadingTable rows={10} />;
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
        />
        {/* IMPORTANTE (UX):
            Aunque una página venga vacía por cambios de filtros o desajustes temporales,
            dejamos la paginación visible si el backend reporta total > 0, para poder regresar. */}
        {(data?.total || 0) > 0 && (
          <TablePagination
            page={page}
            limit={limit}
            total={data?.total || 0}
            onPageChange={setPage}
          />
        )}
      </>
    ),
    data: {
      ...data,
      totalHoy,
    },
  };
}
