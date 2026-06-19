// src/app/panel/reportes-personalizados/page.jsx
// Panel principal de Reportes Personalizados — Adamia HR360
// Plantillas persistidas en BD (tabla reporte_plantillas) vía API REST.
// Relacionado con: reportesPersonalizadosApi.js, ReporteDialog, ReporteCard, ReporteResultados

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSnackbar } from "notistack";
import { useAuth } from "@/context/AuthContext";
import {
  Plus,
  ClipboardCheck,
  ClockArrowUp,
  Pencil,
  Trash2,
  BarChart3,
  ChevronRight,
  Loader2,
  Upload,
} from "lucide-react";

import ReporteDialog from "./components/ReporteDialog";
import ReporteCard from "./components/ReporteCard";
import ReporteResultados from "./components/ReporteResultados";
import AccesosRapidos from "@/components/AccesosRapidos";
import useReportePersonalizado from "@/hooks/useReportePersonalizado";
import {
  listarPlantillas,
  crearPlantilla,
  actualizarPlantilla,
  eliminarPlantilla,
} from "@/lib/reportesPersonalizadosApi";

const LS_KEY = "hr360_reportes_personalizados";

const ICONO_FUENTE = { asistencia: ClipboardCheck, reloj: ClockArrowUp };
const LABEL_FUENTE = { asistencia: "Asistencia", reloj: "Reloj Checador" };

function cargarPlantillasLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function limpiarPlantillasLocal() {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {}
}

function EstadoVacio({ onNuevo }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 gap-4 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
        <BarChart3 className="h-8 w-8 text-blue-400" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-1">Sin reportes creados</h3>
        <p className="text-sm text-gray-500 max-w-xs">
          Crea tu primer reporte personalizado eligiendo la fuente de datos y las columnas que
          necesitas.
        </p>
      </div>
      <Button onClick={onNuevo} className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white gap-2">
        <Plus className="h-4 w-4" />
        Crear primer reporte
      </Button>
    </motion.div>
  );
}

function TarjetaPlantilla({ plantilla, onAbrir, onEditar, onEliminar }) {
  const Icono = ICONO_FUENTE[plantilla.fuente] || ClipboardCheck;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
    >
      <Card className="cursor-pointer border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 bg-white">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Icono className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm leading-tight">{plantilla.nombre}</h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  {LABEL_FUENTE[plantilla.fuente]}
                  {plantilla.empresaNombre ? ` · ${plantilla.empresaNombre}` : ""}
                </p>
              </div>
            </div>
            <div className="flex gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditar();
                }}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEliminar();
                }}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {plantilla.descripcion && (
            <p className="text-xs text-gray-500 mb-3 line-clamp-2">{plantilla.descripcion}</p>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {plantilla.columnas?.length || 0} columna
              {plantilla.columnas?.length !== 1 ? "s" : ""}
            </span>
            <button
              onClick={onAbrir}
              className="flex items-center gap-1 text-xs text-blue-600 font-medium hover:text-blue-800 transition-colors"
            >
              Ejecutar <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function ReportesPersonalizadosPage() {
  const { enqueueSnackbar } = useSnackbar();
  const { dataUser } = useAuth();
  const { datos, loading, error, fetchReporte } = useReportePersonalizado();

  const [plantillas, setPlantillas] = useState([]);
  const [cargandoPlantillas, setCargandoPlantillas] = useState(true);
  const [tabActiva, setTabActiva] = useState("mis-reportes");
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [plantillaEditar, setPlantillaEditar] = useState(null);
  const [ejecuciones, setEjecuciones] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [mostrarImportBanner, setMostrarImportBanner] = useState(false);
  const [importando, setImportando] = useState(false);

  // Ref para acceder a las funciones de exportación de ReporteResultados
  const resultadosRef = useRef(null);

  const empresaDefault =
    dataUser?.empresas_detalle?.[0]?.id_empresa || dataUser?.id_empresa || null;

  const recargarPlantillas = useCallback(async () => {
    setCargandoPlantillas(true);
    try {
      const data = await listarPlantillas("all");
      setPlantillas(data);

      const locales = cargarPlantillasLocal();
      if (data.length === 0 && locales.length > 0) {
        setMostrarImportBanner(true);
      } else {
        setMostrarImportBanner(false);
      }
    } catch (err) {
      enqueueSnackbar(
        err?.response?.data?.error || "Error al cargar plantillas de reporte",
        { variant: "error" },
      );
    } finally {
      setCargandoPlantillas(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    if (dataUser) recargarPlantillas();
  }, [dataUser, recargarPlantillas]);

  const plantillaActiva =
    plantillas.find((p) => String(p.id) === String(tabActiva)) || null;

  const handleGuardarPlantilla = useCallback(
    async (payload) => {
      setGuardando(true);
      try {
        let guardada;
        if (plantillaEditar?.id) {
          guardada = await actualizarPlantilla(plantillaEditar.id, {
            nombre: payload.nombre,
            descripcion: payload.descripcion,
            fuente: payload.fuente,
            columnas: payload.columnas,
            filtrosDefecto: payload.filtrosDefecto,
            agrupacionDefecto: payload.agrupacionDefecto || "ninguna",
          });
        } else {
          guardada = await crearPlantilla(payload.idEmpresa, {
            nombre: payload.nombre,
            descripcion: payload.descripcion,
            fuente: payload.fuente,
            columnas: payload.columnas,
            filtrosDefecto: payload.filtrosDefecto,
            agrupacionDefecto: payload.agrupacionDefecto || "ninguna",
          });
        }

        await recargarPlantillas();
        setDialogAbierto(false);
        setPlantillaEditar(null);
        setTabActiva(String(guardada.id));
        enqueueSnackbar(
          plantillaEditar ? "Reporte actualizado." : "Reporte creado correctamente.",
          { variant: "success" },
        );
      } catch (err) {
        enqueueSnackbar(
          err?.response?.data?.error || "Error al guardar el reporte",
          { variant: "error" },
        );
      } finally {
        setGuardando(false);
      }
    },
    [plantillaEditar, recargarPlantillas, enqueueSnackbar],
  );

  const handleEliminarPlantilla = useCallback(
    async (id) => {
      try {
        await eliminarPlantilla(id);
        if (String(tabActiva) === String(id)) setTabActiva("mis-reportes");
        setEjecuciones((prev) => {
          const copia = { ...prev };
          delete copia[id];
          return copia;
        });
        await recargarPlantillas();
        enqueueSnackbar("Reporte eliminado.", { variant: "info" });
      } catch (err) {
        enqueueSnackbar(
          err?.response?.data?.error || "Error al eliminar el reporte",
          { variant: "error" },
        );
      }
    },
    [tabActiva, recargarPlantillas, enqueueSnackbar],
  );

  const handleImportarLocal = useCallback(async () => {
    if (!empresaDefault) {
      enqueueSnackbar("No hay empresa disponible para importar.", { variant: "warning" });
      return;
    }

    const locales = cargarPlantillasLocal();
    if (!locales.length) return;

    setImportando(true);
    try {
      for (const local of locales) {
        await crearPlantilla(empresaDefault, {
          nombre: local.nombre,
          descripcion: local.descripcion || "",
          fuente: local.fuente || "asistencia",
          columnas: local.columnas || [],
          filtrosDefecto: local.filtrosDefecto || {
            estadoAsistencia: [],
            estadoMovimiento: [],
          },
          agrupacionDefecto: local.agrupacionDefecto || "ninguna",
        });
      }
      limpiarPlantillasLocal();
      setMostrarImportBanner(false);
      await recargarPlantillas();
      enqueueSnackbar("Reportes importados correctamente.", { variant: "success" });
    } catch (err) {
      enqueueSnackbar(
        err?.response?.data?.error || "Error al importar reportes del navegador",
        { variant: "error" },
      );
    } finally {
      setImportando(false);
    }
  }, [empresaDefault, recargarPlantillas, enqueueSnackbar]);

  const abrirEditar = (plantilla) => {
    setPlantillaEditar(plantilla);
    setDialogAbierto(true);
  };

  const abrirNuevo = () => {
    setPlantillaEditar(null);
    setDialogAbierto(true);
  };

  const handleEjecutar = useCallback(
    async (filtros, agrupacion) => {
      if (!plantillaActiva) return;
      setEjecuciones((prev) => ({
        ...prev,
        [plantillaActiva.id]: { filtros, agrupacion },
      }));
      await fetchReporte({ tipoReporte: plantillaActiva.fuente, filtros });
    },
    [plantillaActiva, fetchReporte],
  );

  const ejecucionActiva = plantillaActiva ? ejecuciones[plantillaActiva.id] : null;

  return (
    <div className="space-y-0">
      {mostrarImportBanner && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-3">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm text-amber-900">
              Tienes reportes guardados en este navegador. ¿Deseas importarlos al servidor?
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMostrarImportBanner(false)}
                className="border-amber-300 text-amber-800"
              >
                Omitir
              </Button>
              <Button
                size="sm"
                onClick={handleImportarLocal}
                disabled={importando}
                className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
              >
                {importando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Importar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Barra de pestañas + acción principal */}
      <div className="border-b border-gray-200 bg-white px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="overflow-x-auto flex-1 min-w-0">
            <div className="flex gap-0 min-w-max">
              <button
                onClick={() => setTabActiva("mis-reportes")}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  tabActiva === "mis-reportes"
                    ? "border-[#2563EB] text-[#2563EB]"
                    : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
                }`}
              >
                <BarChart3 className="h-4 w-4" />
                Mis reportes
              </button>

              {plantillas.map((p) => {
                const Icono = ICONO_FUENTE[p.fuente] || ClipboardCheck;
                return (
                  <button
                    key={p.id}
                    onClick={() => setTabActiva(String(p.id))}
                    className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      String(tabActiva) === String(p.id)
                        ? "border-[#2563EB] text-[#2563EB]"
                        : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
                    }`}
                  >
                    <Icono className="h-4 w-4" />
                    {p.nombre}
                  </button>
                );
              })}
            </div>
          </div>

          <Button
            onClick={abrirNuevo}
            className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white gap-2 flex-shrink-0"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nuevo reporte</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {cargandoPlantillas ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
            <p className="text-sm text-gray-500">Cargando reportes...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {tabActiva === "mis-reportes" && (
              <motion.div
                key="mis-reportes"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
              >
                {plantillas.length === 0 ? (
                  <EstadoVacio onNuevo={abrirNuevo} />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {plantillas.map((p) => (
                      <TarjetaPlantilla
                        key={p.id}
                        plantilla={p}
                        onAbrir={() => setTabActiva(String(p.id))}
                        onEditar={() => abrirEditar(p)}
                        onEliminar={() => handleEliminarPlantilla(p.id)}
                      />
                    ))}
                    <motion.button
                      onClick={abrirNuevo}
                      whileHover={{ y: -2 }}
                      transition={{ duration: 0.15 }}
                      className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50/40 transition-all duration-200 p-8 text-gray-400 hover:text-blue-600 cursor-pointer min-h-[120px]"
                    >
                      <Plus className="h-7 w-7" />
                      <span className="text-sm font-medium">Nuevo reporte</span>
                    </motion.button>
                  </div>
                )}
              </motion.div>
            )}

            {tabActiva !== "mis-reportes" && plantillaActiva && (
              <motion.div
                key={tabActiva}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                <ReporteCard
                  plantilla={plantillaActiva}
                  onEditar={() => abrirEditar(plantillaActiva)}
                  onEliminar={() => handleEliminarPlantilla(plantillaActiva.id)}
                  onEjecutar={handleEjecutar}
                  onExportarPDF={() => resultadosRef.current?.exportPDF()}
                  onExportarExcel={() => resultadosRef.current?.exportExcel()}
                  ejecutando={loading}
                  exportandoPDF={false}
                  exportandoExcel={false}
                />

                {(ejecucionActiva || loading || error) && (
                  <ReporteResultados
                    ref={resultadosRef}
                    plantilla={plantillaActiva}
                    filtros={ejecucionActiva?.filtros || null}
                    agrupacion={ejecucionActiva?.agrupacion || "ninguna"}
                    datos={datos}
                    loading={loading}
                    error={error}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Accesos Rápidos - al final de la página, como en otros módulos del panel */}
        <AccesosRapidos />
      </div>

      <ReporteDialog
        open={dialogAbierto}
        onClose={() => {
          setDialogAbierto(false);
          setPlantillaEditar(null);
        }}
        plantillaEditar={plantillaEditar}
        onGuardar={handleGuardarPlantilla}
        guardando={guardando}
        empresas={dataUser?.empresas_detalle || []}
        empresaDefault={empresaDefault}
      />
    </div>
  );
}
