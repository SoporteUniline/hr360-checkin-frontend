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
import {
  CalendarCheck2,
  ClipboardList,
  ClockArrowUp,
  Hourglass,
  Layers,
  RotateCcw,
  Users,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FiltrosGrid,
  CampoFiltro,
  SelectorBoton,
} from "@/components/filtros/CampoFiltro";
import RangoFechasModal, {
  etiquetaDeRango,
} from "@/components/filtros/RangoFechasModal";
import VistasGuardadas from "@/components/tabla/VistasGuardadas";
import ColumnasSelector, {
  cargarColumnasGuardadas,
} from "@/components/tabla/ColumnasSelector";
import { COLUMNAS_ENTRADAS } from "./EntradasSalidasTable";

dayjs.extend(utc);
dayjs.extend(timezone);

const LS_COLUMNAS_ENTRADAS = "entradas-columnas-visibles";

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
  // Agrupación y columnas visibles (patrón de Asistencias)
  const [agrupar, setAgrupar] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState(null);

  // Las columnas guardadas se cargan en cliente (localStorage no existe en SSR)
  useEffect(() => {
    setVisibleColumns(
      cargarColumnasGuardadas(COLUMNAS_ENTRADAS, LS_COLUMNAS_ENTRADAS),
    );
  }, []);

  const mostrarPendientes = desde && hasta && desde === hasta;

  // `fecha` se conserva porque otros componentes lo usan como "modo single-day".
  const fecha = desde && hasta && desde === hasta ? desde : "";
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

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

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit);
  };

  const handleResetFilters = () => {
    setEmpresaActiva("all");
    setDesde(today);
    setHasta(today);
    setFiltroNombre("");
    setPage(1);
    setRangoEtiqueta("Hoy");
    setAgrupar(null);
    setSortConfig(getDefaultSortConfig());
  };

  // ——— Vistas guardadas: serializar/aplicar el estado de la pantalla ———
  // Alcance: filtros de página (buscar, rango), agrupación y columnas
  // visibles. Los filtros de encabezado viven dentro de la tabla y no se
  // capturan (mismo criterio menos invasivo posible).
  const hayFiltrosParaVista = Boolean(
    filtroNombre || agrupar || rangoEtiqueta !== "Hoy",
  );

  const obtenerEstadoVista = () => ({
    desde,
    hasta,
    rangoEtiqueta,
    filtroNombre,
    agrupar,
    visibleColumns,
  });

  const aplicarEstadoVista = (v) => {
    if (!v) return;
    setDesde(v.desde ?? today);
    setHasta(v.hasta ?? today);
    setRangoEtiqueta(v.rangoEtiqueta || "Hoy");
    setFiltroNombre(v.filtroNombre || "");
    setAgrupar(v.agrupar || null);
    if (Array.isArray(v.visibleColumns) && v.visibleColumns.length >= 2) {
      setVisibleColumns(v.visibleColumns);
      try {
        window.localStorage.setItem(
          LS_COLUMNAS_ENTRADAS,
          JSON.stringify(v.visibleColumns),
        );
      } catch {
        // sin persistencia
      }
    }
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
    sortConfig,
    setSortConfig,
    onLimitChange: handleLimitChange,
    agrupar,
    visibleColumns,
  });

  return (
    <div className="space-y-5">
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
        className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${
          mostrarPendientes ? "lg:grid-cols-4" : "lg:grid-cols-3"
        }`}
      >
        <StatCard
          title={mostrarPendientes ? "Registros hoy" : "Registros"}
          value={data?.totalHoy || 0}
          icon={ClipboardList}
          accent="blue"
        />
        <StatCard
          title="Empleados únicos"
          value={data?.empleados || 0}
          icon={Users}
          accent="emerald"
        />
        <StatCard
          title="Jornadas completas"
          value={data?.jornadas_completas || 0}
          icon={CalendarCheck2}
          accent="amber"
        />
        {mostrarPendientes && (
          <StatCard
            title="Pendientes"
            value={data?.pendientes || 0}
            icon={Hourglass}
            accent="red"
          />
        )}
      </div>

      {/* Fila de filtros homologada */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <FiltrosGrid columnas={5}>
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

          <CampoFiltro etiqueta="Agrupar por">
            <Select
              value={agrupar || "none"}
              onValueChange={(v) => {
                setAgrupar(v === "none" ? null : v);
              }}
            >
              <SelectTrigger className="h-[38px] w-full whitespace-nowrap rounded-md border-gray-200 text-[13px] font-medium text-gray-700 [&>span]:flex [&>span]:items-center [&>span]:gap-1.5">
                <Layers className="h-4 w-4 shrink-0 text-gray-500" />
                <SelectValue placeholder="Agrupar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin agrupar</SelectItem>
                <SelectItem value="unidad">Unidad de negocio</SelectItem>
                <SelectItem value="departamento">Departamento</SelectItem>
                <SelectItem value="estado">Estado</SelectItem>
              </SelectContent>
            </Select>
          </CampoFiltro>

          <CampoFiltro etiqueta="Columnas">
            <div className="[&_button]:h-[38px] [&_button]:w-full [&_button]:rounded-md [&_button]:border-gray-200 [&_button]:text-[13px]">
              {Array.isArray(visibleColumns) && (
                <ColumnasSelector
                  columnas={COLUMNAS_ENTRADAS}
                  visibles={visibleColumns}
                  onChange={setVisibleColumns}
                  storageKey={LS_COLUMNAS_ENTRADAS}
                />
              )}
            </div>
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

      <VistasGuardadas
        hayFiltros={hayFiltrosParaVista}
        obtenerEstado={obtenerEstadoVista}
        onAplicar={aplicarEstadoVista}
        onLimpiar={handleResetFilters}
        storageKey="entradas-vistas"
      />

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
