"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import StatCard from "@/components/StatCard";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import EntradasSalidasDataContainer from "./EntradasSalidasDataContainer";
import AccesosRapidos from "@/components/AccesosRapidos";
import { ClockArrowUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

dayjs.extend(utc);
dayjs.extend(timezone);

export default function RegistroEntradasSalidas() {
  const searchParams = useSearchParams();
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
  const initialDate = searchParams.get("fecha") || today;
  const [desde, setDesde] = useState(initialDate);
  const [hasta, setHasta] = useState(initialDate);
  const [filtroNombre, setFiltroNombre] = useState(searchParams.get("empleado") || "");

  // `fecha` se conserva porque otros componentes lo usan como "modo single-day".
  const fecha = desde && hasta && desde === hasta ? desde : "";
  const [page, setPage] = useState(1);
  const limit = 10;

  const { dataUser } = useAuth();

  useEffect(() => {
    if (dataUser?.empresas?.length > 0 && !empresaActiva) {
      setEmpresaActiva("all");
    }
  }, [dataUser, empresaActiva]);

  const handleResetFilters = () => {
    setEmpresaActiva("all");
    setDesde(today);
    setHasta(today);
    setFiltroNombre("");
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
    departamento: "",
    estado: "",
    setPage,
    empresaActiva,
    onResetFilters: handleResetFilters,
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
            <h1 className="text-lg font-bold text-gray-900">
              Entradas y salidas
            </h1>
            <p className="text-sm text-gray-600">
              Consulta y corrige registros de reloj checador por rango de
              fechas.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Registros hoy"
          value={data?.totalHoy || 0}
          borderColor="border-[#2563EB]"
        />
        <StatCard
          title="Empleados únicos"
          value={data?.empleados || 0}
          borderColor="border-emerald-500"
        />
        <StatCard
          title="Jornadas completas"
          value={data?.jornadas_completas || 0}
          borderColor="border-amber-500"
        />
        <StatCard
          title="Pendientes"
          value={data?.pendientes || 0}
          borderColor="border-red-500"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Empleado</label>
            <Input
              type="text"
              placeholder="Buscar empleado..."
              value={filtroNombre}
              onChange={(e) => { setFiltroNombre(e.target.value); setPage(1); }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Desde</label>
            <Input
              type="date"
              value={desde}
              onChange={(event) => {
                setDesde(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Hasta</label>
            <Input
              type="date"
              value={hasta}
              onChange={(event) => {
                setHasta(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="flex justify-start lg:justify-end">
            <Button
              onClick={handleResetFilters}
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
          </div>
        </div>
      </div>

      {ui}

      {/* Accesos Rápidos - Componente reutilizable (al final de la página) */}
      <AccesosRapidos />
    </div>
  );
}
