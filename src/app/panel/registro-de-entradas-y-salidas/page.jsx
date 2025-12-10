"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import EntradasSalidasFilters from "./EntradasSalidasFilter";
import { StatCard } from "@/components/Cards";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import useDebounce from "@/hooks/useDebounce";
import EntradasSalidasDataContainer from "./EntradasSalidasDataContainer";
import AccesosRapidos from "@/components/AccesosRapidos";

dayjs.extend(utc);
dayjs.extend(timezone);

export default function RegistroEntradasSalidas() {
  const [fecha, setFecha] = useState(
    dayjs().tz("America/Mexico_City").format("YYYY-MM-DD")
  );
  const [page, setPage] = useState(1);
  const limit = 10;
  const [filtroEmpleado, setFiltroEmpleado] = useState("");
  const filtroNombre = useDebounce(filtroEmpleado, 500);
  const [departamento, setDepartamento] = useState("");
  const [estado, setEstado] = useState("");

  const { dataUser } = useAuth();
  const idEmpresa = dataUser?.id_empresa;

  const { ui, data } = EntradasSalidasDataContainer({
    idEmpresa,
    fecha,
    page,
    limit,
    filtroNombre,
    departamento,
    estado,
    setPage,
  });

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Registros hoy" count={data?.totalHoy || 0} />
        <StatCard title="Empleados únicos" count={data?.empleados || 0} />
        <StatCard
          title="Jornadas completas"
          count={data?.jornadas_completas || 0}
        />
        <StatCard title="Pendientes" count={data?.pendientes || 0} />
      </div>

      <EntradasSalidasFilters
        filtroEmpleado={filtroEmpleado}
        setFiltroEmpleado={setFiltroEmpleado}
        fecha={fecha}
        setFecha={setFecha}
        departamento={departamento}
        setDepartamento={setDepartamento}
        estado={estado}
        setEstado={setEstado}
        setPage={setPage}
      />

      {ui}
      
      {/* Accesos Rápidos - Componente reutilizable (al final de la página) */}
      <AccesosRapidos />
    </div>
  );
}
