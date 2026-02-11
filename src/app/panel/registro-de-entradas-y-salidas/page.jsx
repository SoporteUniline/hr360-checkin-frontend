"use client";

import { useEffect, useState } from "react";
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
  const [empresaActiva, setEmpresaActiva] = useState(null);
  const idEmpresa = empresaActiva;
  // =========================
  // Filtro por fechas (desde/hasta)
  // - Retrocompatibilidad:
  //   - Si el rango es un solo día (desde === hasta) derivamos `fecha` para mantener
  //     el comportamiento anterior (tabla muestra solo horas y el título "del día").
  //   - Si es un rango real, `fecha` queda vacío y el backend filtra por `desde/hasta`.
  // =========================
  const today = dayjs().tz("America/Mexico_City").format("YYYY-MM-DD");
  const [desde, setDesde] = useState(today);
  const [hasta, setHasta] = useState(today);

  // `fecha` se conserva porque otros componentes lo usan como "modo single-day".
  const fecha = desde && hasta && desde === hasta ? desde : "";
  const [page, setPage] = useState(1);
  const limit = 10;
  const [filtroEmpleado, setFiltroEmpleado] = useState("");
  const filtroNombre = useDebounce(filtroEmpleado, 500);
  const [departamento, setDepartamento] = useState("");
  const [estado, setEstado] = useState("");

  const { dataUser } = useAuth();

  useEffect(() => {
    if (dataUser?.empresas?.length > 0 && !empresaActiva) {
      setEmpresaActiva("all");
    }
  }, [dataUser, empresaActiva]);

  console.log(dataUser);

  const handleResetFilters = () => {
    const today = dayjs().tz("America/Mexico_City").format("YYYY-MM-DD");
    setEmpresaActiva("all");
    setDesde(today);
    setHasta(today);
    setFiltroEmpleado("");
    setDepartamento("");
    setEstado("");
    setPage(1);
  };

  const { ui, data } = EntradasSalidasDataContainer({
    idEmpresa,
    fecha,
    desde,
    hasta,
    page,
    limit,
    filtroNombre,
    departamento,
    estado,
    setPage,
    empresaActiva,
    onResetFilters: handleResetFilters,
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
        empresaActiva={empresaActiva}
        setEmpresaActiva={setEmpresaActiva}
        empresas={dataUser?.empresas_detalle || []}
        filtroEmpleado={filtroEmpleado}
        setFiltroEmpleado={setFiltroEmpleado}
        fecha={fecha}
        // `setFecha` ya no se usa en este panel (ahora es desde/hasta),
        // pero lo dejamos por compatibilidad con la firma del componente.
        setFecha={() => {}}
        desde={desde}
        setDesde={setDesde}
        hasta={hasta}
        setHasta={setHasta}
        departamento={departamento}
        setDepartamento={setDepartamento}
        estado={estado}
        setEstado={setEstado}
        setPage={setPage}
        onResetFilters={handleResetFilters}
      />

      {ui}

      {/* Accesos Rápidos - Componente reutilizable (al final de la página) */}
      <AccesosRapidos />
    </div>
  );
}
