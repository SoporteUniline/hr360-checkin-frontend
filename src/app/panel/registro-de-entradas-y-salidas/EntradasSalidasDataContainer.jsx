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
  page,
  limit,
  filtroNombre,
  departamento,
  estado,
  setPage,
}) {
  const { data, error, isLoading, mutate } = useRelojChecadorData(
    idEmpresa,
    fecha,
    null,
    filtroNombre,
    page,
    limit,
    departamento,
    estado
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
        />
        {registros.length > 0 && (
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
