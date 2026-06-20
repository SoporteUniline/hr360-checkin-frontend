// ReporteCard.jsx
// Tarjeta de ejecución de una plantilla de reporte personalizado.
// Muestra los filtros runtime (empresa, fechas, agrupación, chips de estado),
// filtros avanzados expandibles y los botones Ejecutar / PDF / Excel.
// Al hacer clic en Ejecutar llama a fetchReporte del hook useReportePersonalizado.
// Relacionado con: page.jsx, ReporteResultados.jsx, useReportePersonalizado.js

"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/Combobox";
import {
  Play,
  FileDown,
  FileSpreadsheet,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  ClockArrowUp,
  Loader2,
} from "lucide-react";
import useUnidadesNegocio from "@/hooks/useUnidadesNegocio";
import { OPCIONES_AGRUPACION } from "@/hooks/useReportePersonalizado";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de fecha
// ─────────────────────────────────────────────────────────────────────────────

function getHoy() {
  return new Date().toISOString().slice(0, 10);
}

function getInicioMes() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// Chips de filtro disponibles por fuente
// ─────────────────────────────────────────────────────────────────────────────

const CHIPS_POR_FUENTE = {
  asistencia: {
    estadoAsistencia: {
      label: "Estado",
      opciones: ["Presente", "Ausente", "Tardanza"],
      colorActivo: {
        Presente: "bg-green-100 border-green-400 text-green-800",
        Ausente: "bg-red-100 border-red-400 text-red-800",
        Tardanza: "bg-yellow-100 border-yellow-500 text-yellow-800",
      },
    },
  },
  reloj: {
    estadoMovimiento: {
      label: "Estado",
      opciones: ["Abierto", "Cerrado"],
      colorActivo: {
        Abierto: "bg-orange-100 border-orange-400 text-orange-800",
        Cerrado: "bg-blue-100 border-blue-400 text-blue-800",
      },
    },
  },
};

const ICONO_FUENTE = {
  asistencia: ClipboardCheck,
  reloj: ClockArrowUp,
};

const LABEL_FUENTE = {
  asistencia: "Asistencia",
  reloj: "Reloj Checador",
};

// ─────────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────────

export default function ReporteCard({
  plantilla,
  onEditar,
  onEliminar,
  onEjecutar,
  onExportarPDF,
  onExportarExcel,
  ejecutando,
  exportandoPDF,
  exportandoExcel,
}) {
  const { options: unidadesOptions, isLoading: loadingUnidades } = useUnidadesNegocio();

  // Filtros runtime — se pre-llenan con los valores por defecto de la plantilla
  const [empresa, setEmpresa] = useState("all");
  const [desde, setDesde] = useState(getInicioMes());
  const [hasta, setHasta] = useState(getHoy());
  const [agrupacion, setAgrupacion] = useState("ninguna");
  const [chipsActivos, setChipsActivos] = useState(
    plantilla.filtrosDefecto || { estadoAsistencia: [], estadoMovimiento: [] },
  );
  const [filtrosAvanzados, setFiltrosAvanzados] = useState(false);
  const [empleado, setEmpleado] = useState("");
  const [departamento, setDepartamento] = useState("");

  // Opciones de empresa derivadas de unidades de negocio
  const empresasOptions = useMemo(() => {
    const map = new Map();
    unidadesOptions.forEach((u) => {
      if (!map.has(u.id_empresa)) {
        map.set(u.id_empresa, {
          value: String(u.id_empresa),
          label: u.empresa_nombre,
        });
      }
    });
    return [{ value: "all", label: "Todas las empresas" }, ...Array.from(map.values())];
  }, [unidadesOptions]);

  // Toggle chip de filtro
  const toggleChip = (campo, valor) => {
    setChipsActivos((prev) => {
      const actuales = prev[campo] || [];
      const existe = actuales.includes(valor);
      return {
        ...prev,
        [campo]: existe ? actuales.filter((v) => v !== valor) : [...actuales, valor],
      };
    });
  };

  // Construir objeto de filtros para pasar al hook
  const getFiltros = () => {
    const opcion = empresasOptions.find((o) => o.value === empresa);
    return {
      empresa,
      empresaNombre: opcion?.label || "Todas las empresas",
      fechaInicio: desde,
      fechaFin: hasta,
      empleado,
      departamento,
      // Arrays: si hay varios chips el hook filtra en frontend
      estadoAsistencia: chipsActivos.estadoAsistencia || [],
      estadoMovimiento: chipsActivos.estadoMovimiento || [],
    };
  };

  const handleEjecutar = () => {
    onEjecutar(getFiltros(), agrupacion);
  };

  const chipsConfig = CHIPS_POR_FUENTE[plantilla.fuente] || {};
  const IconoFuente = ICONO_FUENTE[plantilla.fuente] || ClipboardCheck;

  return (
    <Card className="shadow-sm border-gray-200 bg-white">
      <CardContent className="p-4 sm:p-5">
        {/* ── Encabezado de la tarjeta ── */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <IconoFuente className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base leading-tight">{plantilla.nombre}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Fuente: {LABEL_FUENTE[plantilla.fuente]}
                {plantilla.descripcion && ` · ${plantilla.descripcion}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onEditar}
              className="h-8 px-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
            >
              <Pencil className="h-3.5 w-3.5 mr-1" />
              Editar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onEliminar}
              className="h-8 px-2 text-gray-400 hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* ── Fila principal de filtros + botones de acción ── */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Filtros */}
          <div className="flex-1 space-y-3">
            {/* Empresa */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-gray-500 font-medium">Empresa</Label>
                <Combobox
                  options={empresasOptions}
                  value={empresa}
                  onChange={setEmpresa}
                  placeholder={loadingUnidades ? "Cargando..." : "Todas las empresas"}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500 font-medium">Desde</Label>
                <Input
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  className="bg-gray-50 border-gray-200 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500 font-medium">Hasta</Label>
                <Input
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  className="bg-gray-50 border-gray-200 text-sm"
                />
              </div>
            </div>

            {/* Agrupar por + Chips de estado */}
            <div className="flex flex-wrap items-start gap-4">
              <div className="space-y-1 min-w-[180px]">
                <Label className="text-xs text-gray-500 font-medium">Agrupar por</Label>
                <Combobox
                  options={OPCIONES_AGRUPACION}
                  value={agrupacion}
                  onChange={setAgrupacion}
                  placeholder="Sin agrupación"
                />
              </div>

              {/* Chips de filtro */}
              {Object.entries(chipsConfig).map(([campo, cfg]) => (
                <div key={campo} className="space-y-1">
                  <Label className="text-xs text-gray-500 font-medium">{cfg.label}</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {cfg.opciones.map((opcion) => {
                      const activo = (chipsActivos[campo] || []).includes(opcion);
                      const colorCls = activo
                        ? (cfg.colorActivo?.[opcion] || "bg-blue-100 border-blue-400 text-blue-800")
                        : "bg-white border-gray-300 text-gray-600 hover:border-gray-400";
                      return (
                        <button
                          key={opcion}
                          type="button"
                          onClick={() => toggleChip(campo, opcion)}
                          className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${colorCls}`}
                        >
                          {opcion}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Filtros avanzados expandibles */}
            <button
              onClick={() => setFiltrosAvanzados((v) => !v)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
            >
              {filtrosAvanzados ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
              {filtrosAvanzados ? "Ocultar filtros avanzados" : "Mostrar filtros avanzados"}
            </button>

            {filtrosAvanzados && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 pl-4 border-l-2 border-blue-100">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500 font-medium">Empleado (nombre)</Label>
                  <Input
                    type="text"
                    placeholder="Buscar por nombre..."
                    value={empleado}
                    onChange={(e) => setEmpleado(e.target.value)}
                    className="bg-gray-50 border-gray-200 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500 font-medium">Departamento</Label>
                  <Input
                    type="text"
                    placeholder="Filtrar por departamento..."
                    value={departamento}
                    onChange={(e) => setDepartamento(e.target.value)}
                    className="bg-gray-50 border-gray-200 text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── Botones de acción ── */}
          <div className="flex lg:flex-col gap-2 justify-end flex-shrink-0">
            <Button
              onClick={handleEjecutar}
              disabled={ejecutando}
              className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white gap-1.5 min-w-[110px]"
              size="sm"
            >
              {ejecutando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Ejecutar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onExportarPDF}
              disabled={exportandoPDF}
              className="border-gray-300 text-gray-700 hover:bg-gray-50 gap-1.5"
            >
              {exportandoPDF ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileDown className="h-3.5 w-3.5" />
              )}
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onExportarExcel}
              disabled={exportandoExcel}
              className="border-green-300 text-green-700 hover:bg-green-50 gap-1.5"
            >
              {exportandoExcel ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-3.5 w-3.5" />
              )}
              Excel
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
