// src/components/ControlAsistencia.jsx
"use client";

import { useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useAuth } from "@/context/AuthContext";
import ErrorPage from "@/components/ErrorPage";
import LoadingTable from "@/components/LoadingTable";
import AsistenciaTable from "./AsistenciaTable";
import AsistenciaFilters from "./AsistenciaFilters";
import useAsistenciaData from "@/hooks/useAsistenciaData";
import useEmpleadosData from "@/hooks/useEmpleadosData";
import useTiposPermisoData from "@/hooks/useTiposPermisoData";
import useAsistenciaActions from "@/hooks/useAsistenciaActions";
import TablePagination from "@/components/TablePagination";

dayjs.extend(utc);
dayjs.extend(timezone);

export default function ControlAsistencia() {
  const [fecha, setFecha] = useState(
    dayjs().tz("America/Mexico_City").format("YYYY-MM-DD")
  );
  const [page, setPage] = useState(1);
  const limit = 10;
  const [filtroEmpleado, setFiltroEmpleado] = useState("");

  const { dataUser } = useAuth();

  // Hooks para cargar datos
  const { data, error, isLoading, mutate } = useAsistenciaData(
    dataUser?.id_empresa,
    fecha,
    page,
    limit
  );
  const { data: empleados } = useEmpleadosData(dataUser?.id_empresa);
  const { data: tiposPermiso } = useTiposPermisoData();

  const registros = Array.isArray(data?.registros) ? data.registros : [];
  const totalPages = data?.totalPages || 1;
  const currentPage = data?.currentPage || 1;

  const filtrados = registros.filter((r) =>
    `${r.nombre} ${r.apellido_paterno} ${r.apellido_materno || ""}`
      .toLowerCase()
      .includes(filtroEmpleado.toLowerCase())
  );

  const onPageChange = (newPage) => {
    setPage(newPage);
  };

  // Hook para la lógica de edición y guardado
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
  } = useAsistenciaActions(mutate); // Pasa 'mutate' para revalidar la tabla

  if (isLoading) return <LoadingTable rows={10} />;
  if (error) {
    console.error(error);
    return <ErrorPage message="Error al cargar los registros de asistencia" />;
  }

  return (
    <div>
      <AsistenciaFilters
        filtroEmpleado={filtroEmpleado}
        setFiltroEmpleado={setFiltroEmpleado}
        fecha={fecha}
        setFecha={setFecha}
        setPage={setPage}
      />

      <AsistenciaTable
        filtrados={filtrados}
        fecha={fecha}
        editingRowId={editingRowId}
        editingRowData={editingRowData}
        isSaving={isSaving}
        empleados={empleados?.data}
        tiposPermiso={tiposPermiso?.data}
        handleEditClick={handleEditClick}
        handleCancelEdit={handleCancelEdit}
        handleFieldChange={handleFieldChange}
        handleSaveClick={handleSaveClick}
      />

      {filtrados.length > 0 && (
        <TablePagination
          page={page}
          limit={limit}
          total={data?.total || 0}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
