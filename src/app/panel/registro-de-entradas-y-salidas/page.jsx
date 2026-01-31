"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import EntradasSalidasFilters from "./EntradasSalidasFilter";
import StatCard from "@/components/StatCard";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import useDebounce from "@/hooks/useDebounce";
import EntradasSalidasDataContainer from "./EntradasSalidasDataContainer";
import AccesosRapidos from "@/components/AccesosRapidos";
import { ClockArrowUp } from "lucide-react";

dayjs.extend(utc);
dayjs.extend(timezone);

export default function RegistroEntradasSalidas() {
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

  const idEmpresa = dataUser?.id_empresa;

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
  });

  return (
    <div className="space-y-6">
      {/* Header ADAMIA */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <div className="bg-[#2563EB] p-2.5 rounded-lg">
            <ClockArrowUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Entradas y salidas</h1>
            <p className="text-sm text-gray-600">
              Consulta y corrige registros de reloj checador por rango de fechas.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Registros hoy" value={data?.totalHoy || 0} borderColor="border-[#2563EB]" />
        <StatCard title="Empleados únicos" value={data?.empleados || 0} borderColor="border-emerald-500" />
        <StatCard
          title="Jornadas completas"
          value={data?.jornadas_completas || 0}
          borderColor="border-amber-500"
        />
        <StatCard title="Pendientes" value={data?.pendientes || 0} borderColor="border-red-500" />
      </div>

      <EntradasSalidasFilters
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
      />

      {ui}

      {/* Accesos Rápidos - Componente reutilizable (al final de la página) */}
      <AccesosRapidos />
    </div>
  );
}
