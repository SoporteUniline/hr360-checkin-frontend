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
import {
  FiltrosGrid,
  CampoFiltro,
  SelectorBoton,
} from "@/components/filtros/CampoFiltro";
import RangoFechasModal, {
  etiquetaDeRango,
} from "@/components/filtros/RangoFechasModal";

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
  const [filtroNombre, setFiltroNombre] = useState(
    searchParams.get("empleado") || "",
  );
  // Filtros homologados Adamia: modal de rango de fechas + etiqueta del botón.
  const [rangoOpen, setRangoOpen] = useState(false);
  const [rangoEtiqueta, setRangoEtiqueta] = useState(() =>
    etiquetaDeRango(initialDate, initialDate),
  );
  const mostrarPendientes = desde && hasta && desde === hasta;

  // `fecha` se conserva porque otros componentes lo usan como "modo single-day".
  const fecha = desde && hasta && desde === hasta ? desde : "";
  const [page, setPage] = useState(1);
  const limit = 10;

  const getDefaultSortConfig = () => ({
    sortBy: "fechaEntrada",
    sortOrder: "desc",
  });

  const [sortConfig, setSortConfig] = useState(getDefaultSortConfig);
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
    setRangoEtiqueta("Hoy");
    setSortConfig(getDefaultSortConfig());
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
    sortConfig,
    setSortConfig,
  });

  return (
    <div className="space-y-6">
      {/* Encabezado compacto homologado Adamia */}
      <div>
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#2563eb] to-[#7c3aed] shadow-[0_8px_18px_rgba(37,99,235,0.3)]">
            <ClockArrowUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-gray-900">
              Entradas y salidas
            </h1>
            <p className="text-[12.5px] text-gray-500">
              Consulta y corrige registros de reloj checador por rango de
              fechas.
            </p>
          </div>
        </div>
        <div className="mt-3 h-[2.5px] rounded bg-gradient-to-r from-[#2563eb] to-[#7c3aed]" />
      </div>

      <div
        className={`grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 ${
          mostrarPendientes ? "lg:grid-cols-4" : "lg:grid-cols-3"
        }`}
      >
        <StatCard
          title={mostrarPendientes ? "Registros hoy" : "Registros"}
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
        {mostrarPendientes && (
          <StatCard
            title="Pendientes"
            value={data?.pendientes || 0}
            borderColor="border-red-500"
          />
        )}
      </div>

      {/* Fila de filtros homologada */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <FiltrosGrid columnas={4}>
          <CampoFiltro etiqueta="Empleado">
            <Input
              type="text"
              placeholder="Buscar empleado..."
              value={filtroNombre}
              onChange={(e) => {
                setFiltroNombre(e.target.value);
                setPage(1);
              }}
              className="h-[38px] rounded-md border-gray-200 text-[13px]"
            />
          </CampoFiltro>

          <CampoFiltro etiqueta="Rango de fechas">
            <SelectorBoton
              valor={rangoEtiqueta}
              activo
              onClick={() => setRangoOpen(true)}
            />
          </CampoFiltro>

          <CampoFiltro>
            <Button
              onClick={handleResetFilters}
              variant="ghost"
              className="h-[38px] w-full rounded-md font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
          </CampoFiltro>
        </FiltrosGrid>
      </div>

      <RangoFechasModal
        open={rangoOpen}
        onOpenChange={setRangoOpen}
        fechaInicio={desde}
        fechaFin={hasta}
        onAplicar={({ inicio, fin, etiqueta }) => {
          setDesde(inicio);
          setHasta(fin);
          setRangoEtiqueta(etiqueta);
          setPage(1);
        }}
      />

      {ui}

      {/* Accesos Rápidos - Componente reutilizable (al final de la página) */}
      <AccesosRapidos />
    </div>
  );
}
