// src/app/panel/registro-asistencia/page.jsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import useDebounce from "@/hooks/useDebounce";
import AsistenciaFilters from "./AsistenciaFilters";
import AsistenciaDataContainer from "./AsistenciaDataContainer";
import useEmpleadosData from "@/hooks/useEmpleadosData";
import useTiposPermisoData from "@/hooks/useTiposPermisoData";
import AsistenciaCards from "./AsistenciaCards";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

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
  const [departamentosUnicos, setDepartamentosUnicos] = useState([]);
  const [filtroTipoRegistro, setFiltroTipoRegistro] = useState("");
  const [tiposRegistroUnicos, setTiposRegistroUnicos] = useState([]);
  const [filtroEstadoAsistencia, setFiltroEstadoAsistencia] = useState("");

  const { dataUser } = useAuth();
  const idEmpresa = dataUser?.id_empresa;

  const { data: empleados } = useEmpleadosData(idEmpresa);
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

  const { ui, data } = AsistenciaDataContainer({
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
  });

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
      {ui}
    </div>
  );
}
