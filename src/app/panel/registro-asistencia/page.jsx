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
    limit
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

  // Derivar el estado de asistencia para cada registro
  const registrosConEstadoCalculado = registros.map((reg) => {
    let estadoAsistencia = "Desconocido"; // Valor por defecto para casos no cubiertos

    // Primero, verificar si es un día libre (no hay hora programada)
    if (
      reg.hora_entrada_programada === null ||
      reg.hora_entrada_programada === undefined
    ) {
      estadoAsistencia = "Día Libre";
    }
    // Si no es día libre, entonces evaluamos los otros estados
    else if (reg.asistencia === 1) {
      // Si hay asistencia (asistencia = 1)
      estadoAsistencia = "Presente";
      // Si hay hora de entrada registrada, comparamos con la programada
      if (reg.entrada) {
        const entradaReal = dayjs(reg.entrada);
        const [h, m, s] = reg.hora_entrada_programada.split(":").map(Number);
        const horaProgramada = dayjs(reg.fecha).hour(h).minute(m).second(s);

        if (entradaReal.isAfter(horaProgramada)) {
          estadoAsistencia = "Tardanza";
        }
      }
    } else if (reg.asistencia === 0 || reg.asistencia === null) {
      // Si asistencia es 0, puede ser Ausente o Permiso
      // if (reg.id_tipo_permiso !== null && reg.id_tipo_permiso !== undefined) {
      //   estadoAsistencia = "Permiso";
      // } else {
      estadoAsistencia = "Ausente";
      // }
    }

    return { ...reg, estadoAsistencia: estadoAsistencia }; // Usar el nuevo nombre
  });

  const totalPages = data?.totalPages || 1;
  const currentPage = data?.currentPage || 1;

  const filtrados = registrosConEstadoCalculado.filter((r) => {
    // Filtrar por nombre de empleado
    const nombreCompleto = `${r.nombre} ${r.apellido_paterno} ${
      r.apellido_materno || ""
    }`.toLowerCase();
    const coincideEmpleado = nombreCompleto.includes(
      filtroEmpleado.toLowerCase()
    );

    // Filtrar por departamento
    const coincideDepartamento =
      !filtroDepartamento || r.departamento === filtroDepartamento;

    // Filtrar por tipo de registro
    const coincideTipoRegistro =
      !filtroTipoRegistro || r.tipo_registro_clave === filtroTipoRegistro;

    // Nuevo: Filtrar por estado de asistencia calculado
    const coincideEstadoAsistencia =
      !filtroEstadoAsistencia || r.estadoAsistencia === filtroEstadoAsistencia; // Usar el nuevo nombre

    return (
      coincideEmpleado &&
      coincideDepartamento &&
      coincideTipoRegistro &&
      coincideEstadoAsistencia
    );
  });

  console.log(filtrados);

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
        filtrados={filtrados}
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
