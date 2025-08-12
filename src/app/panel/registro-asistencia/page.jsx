// src/app/panel/registro-asistencia/page.jsx
"use client";

import { useState, useEffect } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useAuth } from "@/context/AuthContext";
import ErrorPage from "@/components/ErrorPage";
import LoadingTable from "@/components/LoadingTable";
import AsistenciaTable from "./AsistenciaTable";
import AsistenciaFilters from "./AsistenciaFilters";
import AsistenciaCards from "./AsistenciaCards";
import useAsistenciaData from "@/hooks/useAsistenciaData";
import useEmpleadosData from "@/hooks/useEmpleadosData";
import useTiposPermisoData from "@/hooks/useTiposPermisoData";
import useAsistenciaActions from "@/hooks/useAsistenciaActions";
import TablePagination from "@/components/TablePagination";
import useDebounce from "@/hooks/useDebounce";

dayjs.extend(utc);
dayjs.extend(timezone);

export default function ControlAsistencia() {
  const [fechaInicio, setFechaInicio] = useState(
    dayjs().tz("America/Mexico_City").format("YYYY-MM-DD")
  );
  const [fechaFin, setFechaFin] = useState(
    dayjs().tz("America/Mexico_City").format("YYYY-MM-DD")
  );
  const [page, setPage] = useState(1);
  const limit = 10;
  const [filtroEmpleado, setFiltroEmpleado] = useState("");
  const debouncedFiltroEmpleado = useDebounce(filtroEmpleado, 500);
  const [filtroDepartamento, setFiltroDepartamento] = useState("");
  const [departamentosUnicos, setDepartamentosUnicos] = useState([]); // Nuevo estado para departamentos únicos
  const [filtroTipoRegistro, setFiltroTipoRegistro] = useState("");
  const [tiposRegistroUnicos, setTiposRegistroUnicos] = useState([]);
  const [filtroEstadoAsistencia, setFiltroEstadoAsistencia] = useState("");

  const { dataUser } = useAuth();

  // Hooks para cargar datos
  const { data, error, isLoading, mutate } = useAsistenciaData(
    dataUser?.id_empresa,
    fechaInicio,
    fechaFin,
    page,
    limit,
    debouncedFiltroEmpleado,
    filtroDepartamento,
    filtroTipoRegistro,
    filtroEstadoAsistencia
  );
  const { data: empleados } = useEmpleadosData(dataUser?.id_empresa);
  const { data: tiposPermiso } = useTiposPermisoData();

  useEffect(() => {
    if (empleados?.data) {
      const uniqueDepartamentos = [
        ...new Set(empleados.data.map((emp) => emp.departamento)),
      ];
      setDepartamentosUnicos(uniqueDepartamentos.filter(Boolean).sort());
    }
  }, [empleados]);

  useEffect(() => {
    if (tiposPermiso?.data) {
      const uniqueTipos = tiposPermiso.data.map((tipo) => ({
        clave: tipo.clave,
        nombre: tipo.nombre,
      }));
      const distinctTipos = Array.from(
        new Map(uniqueTipos.map((item) => [item.clave, item])).values()
      );
      setTiposRegistroUnicos(
        distinctTipos.sort((a, b) => a.nombre.localeCompare(b.nombre))
      );
    }
  }, [tiposPermiso]);

  const registros = Array.isArray(data?.registros) ? data.registros : [];

  // console.log(registros);

  const totalPages = data?.totalPages || 1;
  const currentPage = data?.currentPage || 1;

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
      <AsistenciaCards totals={data} />
      <AsistenciaFilters
        filtroEmpleado={filtroEmpleado}
        setFiltroEmpleado={setFiltroEmpleado}
        fechaInicio={fechaInicio}
        setFechaInicio={setFechaInicio}
        fechaFin={fechaFin}
        setFechaFin={setFechaFin}
        setPage={setPage}
        filtroDepartamento={filtroDepartamento}
        setFiltroDepartamento={setFiltroDepartamento}
        departamentos={departamentosUnicos}
        filtroTipoRegistro={filtroTipoRegistro}
        setFiltroTipoRegistro={setFiltroTipoRegistro}
        tiposRegistro={tiposRegistroUnicos}
        filtroEstadoAsistencia={filtroEstadoAsistencia}
        setFiltroEstadoAsistencia={setFiltroEstadoAsistencia}
      />

      <AsistenciaTable
        filtrados={registros}
        fecha={fechaInicio}
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

      {registros.length > 0 && (
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
