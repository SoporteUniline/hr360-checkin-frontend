"use client";

import useAsistenciaData from "@/hooks/useAsistenciaData";
import useEmpleadosData from "@/hooks/useEmpleadosData";
import useTiposPermisoData from "@/hooks/useTiposPermisoData";
import useAsistenciaActions from "@/hooks/useAsistenciaActions";
import AsistenciaTable from "./AsistenciaTable";
import TablePagination from "@/components/TablePagination";
import LoadingTable from "@/components/LoadingTable";
import ErrorPage from "@/components/ErrorPage";

export default function AsistenciaDataContainer({
  idEmpresa,
  fechaInicio,
  fechaFin,
  page,
  limit,
  debouncedFiltroEmpleado,
  filtroDepartamento,
  filtroTipoRegistro,
  filtroEstadoAsistencia,
  setPage,
  onLimitChange,
}) {
  const { data, error, isLoading, mutate } = useAsistenciaData(
    idEmpresa,
    fechaInicio,
    fechaFin,
    page,
    limit,
    debouncedFiltroEmpleado,
    filtroDepartamento,
    filtroTipoRegistro,
    filtroEstadoAsistencia
  );

  const { data: empleados } = useEmpleadosData(idEmpresa);
  const { data: tiposPermiso } = useTiposPermisoData();

  const registros = Array.isArray(data?.registros) ? data.registros : [];
  const totalPages = data?.totalPages || 1;
  const currentPage = data?.page || 1;

  const mostrarPaginacion = data?.aplicarPaginacion !== false;
  const totalRegistros = data?.total || 0;

  const onPageChange = (newPage) => {
    setPage(newPage);
  };

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

  if (isLoading) return <LoadingTable rows={10} />;
  if (error) {
    console.error(error);
    return <ErrorPage message="Error al cargar los registros de asistencia" />;
  }

  return {
    ui: (
      <>
        <AsistenciaTable
          filtrados={registros}
          fecha={fechaInicio}
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
        />

        {mostrarPaginacion && registros.length > 0 && (
          <TablePagination
            page={currentPage}
            limit={limit}
            total={totalRegistros}
            totalPages={totalPages}
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
    data,
    mutate,
  };
}
