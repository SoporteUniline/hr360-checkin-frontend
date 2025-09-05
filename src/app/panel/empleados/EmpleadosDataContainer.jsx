"use client";

import useEmpleadosData from "@/hooks/useEmpleadosData";
import EmpleadosTable from "./EmpleadosTable";
import TablePagination from "@/components/TablePagination";
import LoadingTable from "@/components/LoadingTable";
import ErrorPage from "@/components/ErrorPage";

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
}) {
  const { data, error, isLoading, mutate } = useEmpleadosData(
    idEmpresa,
    page,
    limit,
    filtroNombre,
    departamento,
    estado,
    fechaDesde
  );

  if (isLoading) return <LoadingTable rows={10} />;
  if (error)
    return (
      <ErrorPage message={error?.message || "Error al cargar empleados"} />
    );

  const empleados = data?.data || [];

  return {
    ui: (
      <>
        <EmpleadosTable
          empleados={empleados}
          abrirFormulario={abrirFormulario} // 🔑
          mutate={mutate}
          page={page}
          limit={limit}
        />
        <TablePagination
          page={page}
          limit={limit}
          total={data?.total || 0}
          onPageChange={setPage}
        />
      </>
    ),
    data,
    mutate,
  };
}
