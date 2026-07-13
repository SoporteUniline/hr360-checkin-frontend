"use client";

/**
 * Tab "Documentos" — Expediente Digital del Empleado.
 * Soporta dos usos:
 *  1. Panel de empleados: <PanelEmpleadoDocumentos datosEmpleado={...} />
 *  2. Módulo empleados:   <PanelEmpleadoDocumentos idEmpleado={X} idEmpresa={Y} />
 * Relación:
 *  - API:     src/lib/expedienteApi.js
 *  - Backend: /api/checador/expediente/*
 */

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FolderOpen,
  UploadCloud,
  FileText,
  ImageIcon,
  File,
  Trash2,
  ExternalLink,
  Loader2,
  Search,
  AlertCircle,
  CheckCircle2,
  X,
  Clock,
  Shield,
  Settings2,
  Plus,
  RefreshCw,
  History,
  TriangleAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import { categoriasApi, documentosApi } from "@/lib/expedienteApi";

// ─── Constantes ───────────────────────────────────────────────────────────────
const TIPOS_ACEPTADOS = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
};

// Límite del lado cliente (debe coincidir con Multer en el backend)
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const ESTATUS_OPTS = [
  { value: "TODOS", label: "Todos los estatus" },
  { value: "VIGENTE", label: "Vigente" },
  { value: "NO_VENCE", label: "Sin vencimiento" },
  { value: "POR_VENCER", label: "Por vencer (30 días)" },
  { value: "VENCIDO", label: "Vencido" },
];

const ESTATUS_BADGE = {
  VIGENTE: {
    label: "Vigente",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  NO_VENCE: {
    label: "Sin venc.",
    cls: "bg-gray-50 text-gray-600 border-gray-200",
  },
  POR_VENCER: {
    label: "Por vencer",
    cls: "bg-amber-50 text-amber-700 border-amber-100",
  },
  VENCIDO: { label: "Vencido", cls: "bg-red-50 text-red-700 border-red-100" },
};

// ─── Componente principal ─────────────────────────────────────────────────────
export default function PanelEmpleadoDocumentos({
  datosEmpleado,
  idEmpleado: idProp,
  idEmpresa: idEmpresaProp,
}) {
  const idEmpleado = idProp ?? datosEmpleado?.informacion_general?.id_empleado;
  const idEmpresa =
    idEmpresaProp ?? datosEmpleado?.informacion_general?.id_empresa;

  const [categorias, setCategorias] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [stats, setStats] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [tabFiltro, setTabFiltro] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [estatusFiltro, setEstatusFiltro] = useState("TODOS");
  const [modalSubir, setModalSubir] = useState(false);
  const [modalCats, setModalCats] = useState(false);
  const [modalBitacora, setModalBitacora] = useState(null);
  const [bitacoraData, setBitacoraData] = useState([]);
  const [docAEliminar, setDocAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [notif, setNotif] = useState(null);
  const [errorCarga, setErrorCarga] = useState(null);

  // ── Notificación flotante ──
  const mostrarNotif = useCallback((tipo, mensaje) => {
    setNotif({ tipo, mensaje });
    setTimeout(() => setNotif(null), 4500);
  }, []);

  // ── Cargar datos ──
  const cargarTodo = useCallback(async () => {
    if (!idEmpleado || !idEmpresa) return;
    setCargando(true);
    setErrorCarga(null);
    try {
      const catData = await categoriasApi
        .listarActivas(idEmpresa)
        .catch(async () => {
          await categoriasApi.inicializar(idEmpresa).catch(() => {});
          return categoriasApi.listarActivas(idEmpresa);
        });
      setCategorias(catData.categorias || []);

      const [docData, statsData] = await Promise.all([
        documentosApi.listar(idEmpleado, idEmpresa),
        documentosApi.stats(idEmpleado, idEmpresa),
      ]);
      setDocumentos(docData.documentos || []);
      setStats(statsData);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 500 || !status) {
        setErrorCarga(
          "Las tablas del expediente digital no existen aún. Ejecuta la migración 004 en la base de datos.",
        );
      } else {
        setErrorCarga(
          err?.response?.data?.error || err?.message || "Error desconocido",
        );
      }
    } finally {
      setCargando(false);
    }
  }, [idEmpleado, idEmpresa]);

  useEffect(() => {
    cargarTodo();
  }, [cargarTodo]);

  // ── Filtrado ──
  const documentosFiltrados = documentos.filter((d) => {
    if (tabFiltro === "alertas") {
      if (d.estatus !== "VENCIDO" && d.estatus !== "POR_VENCER") return false;
    } else if (tabFiltro !== "todos") {
      if (String(d.categoria_id) !== tabFiltro) return false;
    }
    if (
      estatusFiltro &&
      estatusFiltro !== "TODOS" &&
      d.estatus !== estatusFiltro
    )
      return false;
    if (
      busqueda &&
      !d.nombre_documento.toLowerCase().includes(busqueda.toLowerCase())
    )
      return false;
    return true;
  });

  const alertasCount = documentos.filter(
    (d) => d.estatus === "VENCIDO" || d.estatus === "POR_VENCER",
  ).length;

  // ── Eliminar ──
  const handleEliminar = async () => {
    if (!docAEliminar) return;
    setEliminando(true);
    try {
      await documentosApi.eliminar(docAEliminar.id);
      mostrarNotif("success", "Documento eliminado");
      setDocAEliminar(null);
      await cargarTodo();
    } catch {
      mostrarNotif("error", "Error al eliminar el documento");
    } finally {
      setEliminando(false);
    }
  };

  // ── Ver documento (registra VISUALIZADO en bitácora) ──
  const verDocumento = async (doc) => {
    window.open(doc.archivo_url, "_blank", "noopener,noreferrer");
    try {
      await documentosApi.obtener(doc.id);
    } catch {
      /* silencioso */
    }
  };

  // ── Bitácora ──
  const verBitacora = async (doc) => {
    setModalBitacora(doc);
    setBitacoraData(null);
    try {
      const data = await documentosApi.bitacora(doc.id);
      setBitacoraData(data.bitacora || []);
    } catch (err) {
      console.error("Error bitácora:", err?.response?.data || err.message);
      setBitacoraData(false);
    }
  };

  if (!idEmpleado || !idEmpresa) return null;

  return (
    <div className="space-y-4">
      {/* ── Notificación flotante ── */}
      {notif && (
        <div
          className={cn(
            "fixed bottom-6 right-4 left-4 sm:left-auto sm:w-auto z-[60] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-in slide-in-from-bottom-4",
            notif.tipo === "success"
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white",
          )}
        >
          {notif.tipo === "success" ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="flex-1">{notif.mensaje}</span>
          <button
            type="button"
            onClick={() => setNotif(null)}
            className="flex-shrink-0"
          >
            <X className="w-4 h-4 opacity-70 hover:opacity-100" />
          </button>
        </div>
      )}

      {/* ── Banner de error de configuración ── */}
      {errorCarga && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-0.5">
              Error al cargar el expediente
            </p>
            <p className="text-xs text-red-700">{errorCarga}</p>
            <button
              type="button"
              onClick={cargarTodo}
              className="mt-2 text-xs font-medium underline hover:no-underline"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      {/* ── Header del módulo ── */}
      <div className="bg-white border border-gray-200 rounded-[10px] p-3 sm:p-4">
        {/* Título + botones siempre en la misma fila */}
        <div className="flex items-center gap-2.5">
          <div className="bg-gradient-to-br from-[#2563eb] to-[#7c3aed] p-2 rounded-lg flex-shrink-0">
            <FolderOpen className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[12.5px] font-bold text-gray-900 leading-tight">
              Expediente digital
            </h3>
            <p className="text-[11px] text-gray-400 hidden sm:block">
              Documentos del empleado
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* En móvil solo icono, en desktop texto completo */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalCats(true)}
              className="h-8 w-8 sm:w-auto sm:px-3 p-0 sm:gap-1.5"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-xs">Categorías</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setModalSubir(true)}
              className="h-8 w-8 sm:w-auto sm:px-3 p-0 sm:gap-1.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-xs">Cargar</span>
            </Button>
          </div>
        </div>

        {/* ── KPIs: scroll horizontal en móvil, 5 columnas en desktop ── */}
        {stats && (
          <div className="mt-3 -mx-1 px-1 overflow-x-auto">
            <div className="flex gap-2 sm:grid sm:grid-cols-5">
              {[
                { label: "Cargados", value: stats.total },
                { label: "Vigentes", value: stats.vigentes },
                { label: "Por vencer", value: stats.por_vencer },
                { label: "Vencidos", value: stats.vencidos },
                { label: "Obligat.", value: stats.obligatorios },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="min-w-[72px] sm:min-w-0 flex-shrink-0 bg-white rounded-[10px] border border-gray-200 px-2 py-2"
                >
                  <div className="text-[10.5px] text-gray-500 uppercase font-semibold tracking-wide leading-tight truncate">
                    {label}
                  </div>
                  <div className="text-lg font-extrabold tabular-nums text-gray-900 leading-tight">
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Barra de completitud ── */}
        {stats && stats.obligatorios > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Completitud</span>
              <span className="font-semibold text-gray-700">
                {stats.completitud_pct}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#2563eb] to-[#7c3aed] transition-all"
                style={{ width: `${stats.completitud_pct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Banners de alerta ── */}
      {stats?.vencidos > 0 && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-800 px-3 py-2.5 rounded-lg text-sm font-medium">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            {stats.vencidos} documento{stats.vencidos !== 1 ? "s" : ""} vencido
            {stats.vencidos !== 1 ? "s" : ""} — requiere acción inmediata.
          </span>
        </div>
      )}
      {stats?.por_vencer > 0 && (
        <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2.5 rounded-lg text-sm font-medium">
          <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            {stats.por_vencer} documento{stats.por_vencer !== 1 ? "s" : ""} por
            vencer en los próximos 30 días.
          </span>
        </div>
      )}

      {/* ── Filtros de categoría (chips con scroll horizontal en móvil) ── */}
      <div className="overflow-x-auto pb-1 -mx-1 px-1">
        <div className="flex gap-1.5 w-max sm:w-auto sm:flex-wrap">
          <button
            type="button"
            onClick={() => setTabFiltro("todos")}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium border transition-colors whitespace-nowrap",
              tabFiltro === "todos"
                ? "bg-[#2563EB] text-white border-[#2563EB]"
                : "border-gray-200 text-gray-600 hover:border-[#2563EB] hover:text-[#2563EB]",
            )}
          >
            Todos ({documentos.length})
          </button>
          {alertasCount > 0 && (
            <button
              type="button"
              onClick={() => setTabFiltro("alertas")}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-colors whitespace-nowrap",
                tabFiltro === "alertas"
                  ? "bg-red-600 text-white border-red-600"
                  : "border-red-200 text-red-600 hover:bg-red-50",
              )}
            >
              <TriangleAlert className="w-3 h-3 inline mr-1 -mt-0.5" />
              Alertas ({alertasCount})
            </button>
          )}
          {categorias.map((cat) => {
            const count = documentos.filter(
              (d) => String(d.categoria_id) === String(cat.id),
            ).length;
            return (
              <button
                type="button"
                key={cat.id}
                onClick={() => setTabFiltro(String(cat.id))}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium border transition-colors whitespace-nowrap",
                  tabFiltro === String(cat.id)
                    ? "text-white border-transparent"
                    : "border-gray-200 text-gray-600 hover:opacity-80",
                )}
                style={
                  tabFiltro === String(cat.id)
                    ? { backgroundColor: cat.color, borderColor: cat.color }
                    : {}
                }
              >
                {cat.nombre} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Filtros secundarios ── */}
      <div className="flex flex-col gap-2">
        {/* Búsqueda (fila completa siempre) */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar documento..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9"
          />
        </div>
        {/* Select + botón refresh en la misma fila en móvil también */}
        <div className="flex gap-2">
          <Select value={estatusFiltro} onValueChange={setEstatusFiltro}>
            <SelectTrigger className="flex-1 sm:w-52 sm:flex-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ESTATUS_OPTS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={cargarTodo}
            title="Recargar"
            className="flex-shrink-0"
          >
            <RefreshCw className={cn("w-4 h-4", cargando && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* ── Lista de documentos ── */}
      <div className="bg-white border border-gray-200 rounded-[10px] overflow-hidden">
        <div className="p-0">
          {cargando ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" />
            </div>
          ) : documentosFiltrados.length === 0 ? (
            <div className="text-center py-16">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">
                No hay documentos
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {busqueda || estatusFiltro !== "TODOS" || tabFiltro !== "todos"
                  ? "Prueba con otros filtros"
                  : 'Sube el primer documento con el botón "Cargar"'}
              </p>
            </div>
          ) : (
            <>
              {/* ── Vista MÓVIL: tarjetas ── */}
              <div className="block md:hidden divide-y divide-gray-100">
                {documentosFiltrados.map((doc) => (
                  <div
                    key={doc.id}
                    className={cn(
                      "px-3 py-3",
                      doc.estatus === "VENCIDO" &&
                        "bg-red-50/50 border-l-2 border-l-red-400",
                      doc.estatus === "POR_VENCER" &&
                        "bg-amber-50/50 border-l-2 border-l-amber-400",
                    )}
                  >
                    {/* Fila 1: icono + nombre + botones */}
                    <div className="flex items-center gap-2">
                      <ArchivoIcono mimetype={doc.archivo_mime} />
                      <p className="flex-1 min-w-0 font-semibold text-sm text-gray-900 truncate">
                        {doc.nombre_documento}
                        {doc.obligatorio && (
                          <Shield
                            className="w-3 h-3 inline ml-1 text-blue-500"
                            title="Obligatorio"
                          />
                        )}
                      </p>
                      <div className="flex items-center flex-shrink-0 -mr-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="w-9 h-9 text-gray-400 active:text-[#2563EB]"
                          onClick={() => verDocumento(doc)}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="w-9 h-9 text-gray-400 active:text-gray-700"
                          onClick={() => verBitacora(doc)}
                        >
                          <History className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="w-9 h-9 text-gray-400 active:text-red-500"
                          onClick={() => setDocAEliminar(doc)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {/* Fila 2: categoría + estatus + fechas */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 pl-9">
                      <span
                        className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${doc.categoria_color}20`,
                          color: doc.categoria_color,
                        }}
                      >
                        {doc.categoria_nombre}
                      </span>
                      <span
                        className={cn(
                          "text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border",
                          ESTATUS_BADGE[doc.estatus]?.cls,
                        )}
                      >
                        {ESTATUS_BADGE[doc.estatus]?.label}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        Cargado {dayjs(doc.created_at).format("DD/MM/YY")}
                      </span>
                      {doc.vence && doc.fecha_vencimiento && (
                        <span className="text-[11px] text-gray-400">
                          · Vence{" "}
                          {dayjs(doc.fecha_vencimiento).format("DD/MM/YY")}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Vista DESKTOP: tabla ── */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {[
                        "Documento",
                        "Categoría",
                        "Archivo",
                        "Cargado",
                        "Vigencia",
                        "Estatus",
                        "Acciones",
                      ].map((col) => (
                        <th
                          key={col}
                          className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {documentosFiltrados.map((doc) => (
                      <tr
                        key={doc.id}
                        className={cn(
                          "border-b border-gray-50 last:border-0 transition-colors",
                          doc.estatus === "VENCIDO" && "bg-red-50/60",
                          doc.estatus === "POR_VENCER" && "bg-yellow-50/50",
                        )}
                      >
                        <td className="px-3 py-2.5 font-medium text-gray-900 max-w-[180px] truncate">
                          {doc.nombre_documento}
                          {doc.obligatorio && (
                            <Shield
                              className="w-3 h-3 inline ml-1 text-blue-500"
                              title="Obligatorio"
                            />
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: `${doc.categoria_color}20`,
                              color: doc.categoria_color,
                            }}
                          >
                            {doc.categoria_nombre}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <ArchivoIcono mimetype={doc.archivo_mime} />
                            <span className="text-xs text-gray-500 truncate max-w-[100px]">
                              {doc.archivo_nombre_original || "archivo"}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                          {dayjs(doc.created_at).format("DD/MM/YY")}
                        </td>
                        <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                          {doc.vence && doc.fecha_vencimiento ? (
                            dayjs(doc.fecha_vencimiento).format("DD/MM/YYYY")
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={cn(
                              "text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border",
                              ESTATUS_BADGE[doc.estatus]?.cls,
                            )}
                          >
                            {ESTATUS_BADGE[doc.estatus]?.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-0.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="w-7 h-7 text-gray-400 hover:text-[#2563EB]"
                              title="Ver documento"
                              onClick={() => verDocumento(doc)}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="w-7 h-7 text-gray-400 hover:text-gray-700"
                              title="Bitácora"
                              onClick={() => verBitacora(doc)}
                            >
                              <History className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="w-7 h-7 text-gray-400 hover:text-red-500"
                              title="Eliminar"
                              onClick={() => setDocAEliminar(doc)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Modal de subida ── */}
      <ModalSubirDocumento
        open={modalSubir}
        onClose={() => setModalSubir(false)}
        categorias={categorias}
        idEmpleado={idEmpleado}
        idEmpresa={idEmpresa}
        onSuccess={() => {
          setModalSubir(false);
          cargarTodo();
          mostrarNotif("success", "Documento subido correctamente");
        }}
      />

      {/* ── Modal de categorías ── */}
      <ModalCategorias
        open={modalCats}
        onClose={() => {
          setModalCats(false);
          cargarTodo();
        }}
        idEmpresa={idEmpresa}
        onSuccess={(msg) => mostrarNotif("success", msg)}
        onError={(msg) => mostrarNotif("error", msg)}
      />

      {/* ── Modal de bitácora ── */}
      <Dialog
        open={!!modalBitacora}
        onOpenChange={(o) => !o && setModalBitacora(null)}
      >
        <DialogContent className="max-w-lg w-[calc(100vw-2rem)] sm:w-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
              <History className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">
                Bitácora — {modalBitacora?.nombre_documento}
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-72 sm:max-h-80 overflow-y-auto space-y-2 text-sm">
            {bitacoraData === null ? (
              <p className="text-gray-400 text-center py-8 animate-pulse">
                Cargando...
              </p>
            ) : bitacoraData === false ? (
              <div className="text-center py-8">
                <p className="text-red-500 text-xs font-medium">
                  Error al cargar la bitácora
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  Revisa la consola del backend
                </p>
                <button
                  type="button"
                  onClick={() => verBitacora(modalBitacora)}
                  className="mt-3 text-xs text-blue-600 underline hover:no-underline"
                >
                  Reintentar
                </button>
              </div>
            ) : bitacoraData.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Sin registros</p>
            ) : (
              bitacoraData.map((b) => (
                <div
                  key={b.id}
                  className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0"
                >
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 whitespace-nowrap flex-shrink-0",
                      b.accion === "CARGADO" && "bg-blue-100 text-blue-700",
                      b.accion === "ELIMINADO" && "bg-red-100 text-red-700",
                      b.accion === "EDITADO" && "bg-yellow-100 text-yellow-700",
                      b.accion === "VISUALIZADO" && "bg-gray-100 text-gray-600",
                      b.accion === "DESCARGADO" &&
                        "bg-green-100 text-green-700",
                    )}
                  >
                    {b.accion}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700">{b.detalle || "—"}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {b.usuario_nombre || "Sistema"} ·{" "}
                      {dayjs(b.created_at).format("DD/MM/YY HH:mm")}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Confirm eliminar ── */}
      <AlertDialog
        open={!!docAEliminar}
        onOpenChange={(o) => !o && setDocAEliminar(null)}
      >
        <AlertDialogContent className="w-[calc(100vw-2rem)] sm:w-auto max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará permanentemente{" "}
              <strong>{docAEliminar?.nombre_documento}</strong>. Esta acción no
              se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel
              disabled={eliminando}
              className="w-full sm:w-auto"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEliminar}
              disabled={eliminando}
              className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
            >
              {eliminando && (
                <Loader2 className="w-4 h-4 animate-spin mr-1 inline" />
              )}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Modal: Subir Documento ───────────────────────────────────────────────────
function ModalSubirDocumento({
  open,
  onClose,
  categorias,
  idEmpleado,
  idEmpresa,
  onSuccess,
}) {
  const [archivo, setArchivo] = useState(null);
  const [categoriaId, setCategoriaId] = useState("");
  const [nombreDoc, setNombreDoc] = useState("");
  const [notas, setNotas] = useState("");
  const [tieneVencimiento, setTieneVencimiento] = useState(false);
  const [fechaVenc, setFechaVenc] = useState("");
  const [fechaEmision, setFechaEmision] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState(0);
  // Error visible DENTRO del modal (no notificación flotante)
  const [errorModal, setErrorModal] = useState(null);

  const reset = () => {
    setArchivo(null);
    setCategoriaId("");
    setNombreDoc("");
    setNotas("");
    setTieneVencimiento(false);
    setFechaVenc("");
    setFechaEmision("");
    setProgreso(0);
    setErrorModal(null);
  };

  const mostrarError = (msg) => {
    setErrorModal(msg);
    // Scroll al banner de error automáticamente
    setTimeout(() => {
      document
        .getElementById("modal-error-banner")
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 50);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (accepted, rejected) => {
      setErrorModal(null);
      if (rejected.length > 0) {
        const err = rejected[0].errors[0];
        if (err.code === "file-too-large") {
          mostrarError(
            "El archivo supera el límite de 10 MB. Comprime el archivo o usa uno más pequeño.",
          );
        } else if (err.code === "file-invalid-type") {
          mostrarError(
            "Tipo de archivo no permitido. Solo se aceptan: PDF, JPG, PNG, WEBP, DOC, DOCX.",
          );
        } else {
          mostrarError(
            "No se pudo cargar el archivo. Verifica que sea un formato válido.",
          );
        }
        return;
      }
      if (accepted[0]) {
        setArchivo(accepted[0]);
        if (!nombreDoc) setNombreDoc(accepted[0].name.replace(/\.[^.]+$/, ""));
      }
    },
    accept: TIPOS_ACEPTADOS,
    maxSize: MAX_BYTES,
    multiple: false,
  });

  const handleSubir = async () => {
    // Validaciones visibles dentro del modal
    if (!archivo)
      return mostrarError("Selecciona un archivo antes de continuar.");
    if (!categoriaId)
      return mostrarError("Debes seleccionar una categoría para el documento.");
    if (!nombreDoc.trim())
      return mostrarError("Escribe el nombre del documento.");
    if (tieneVencimiento && !fechaVenc)
      return mostrarError("Ingresa la fecha de vencimiento.");

    setErrorModal(null);
    const fd = new FormData();
    fd.append("file", archivo);
    fd.append("empresa_id", idEmpresa);
    fd.append("categoria_id", categoriaId);
    fd.append("nombre_documento", nombreDoc.trim());
    fd.append("vence", tieneVencimiento ? "1" : "0");
    fd.append("fecha_vencimiento", tieneVencimiento ? fechaVenc : "");
    fd.append("fecha_emision", fechaEmision);
    fd.append("notas", notas);

    setSubiendo(true);
    try {
      await documentosApi.subir(idEmpleado, fd, setProgreso);
      reset();
      onSuccess();
    } catch (err) {
      const status = err?.response?.status;
      if (status === 413) {
        mostrarError(
          "El archivo es demasiado grande para el servidor. El límite configurado en el servidor es inferior al tamaño del archivo. Contacta al administrador o usa un archivo más pequeño.",
        );
      } else if (status === 400) {
        mostrarError(
          err?.response?.data?.error ||
            "Datos inválidos. Revisa los campos e inténtalo de nuevo.",
        );
      } else if (status === 403) {
        mostrarError(
          "No tienes permisos para subir documentos a este empleado.",
        );
      } else {
        mostrarError(
          err?.response?.data?.error ||
            "Ocurrió un error al subir el archivo. Verifica tu conexión e inténtalo de nuevo.",
        );
      }
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-lg max-h-[92dvh] flex flex-col p-0 gap-0">
        {/* Cabecera fija */}
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
            <UploadCloud className="w-4 h-4 flex-shrink-0" /> Cargar documento
          </DialogTitle>
        </DialogHeader>

        {/* Cuerpo con scroll propio */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5">
          {/* ── Banner de error interno ── */}
          {errorModal && (
            <div
              id="modal-error-banner"
              className="flex items-start gap-2.5 bg-red-50 border border-red-300 text-red-800 px-3 py-2.5 rounded-lg"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-xs mb-0.5">
                  No se pudo continuar
                </p>
                <p className="text-xs leading-relaxed">{errorModal}</p>
              </div>
              <button
                type="button"
                onClick={() => setErrorModal(null)}
                className="flex-shrink-0"
              >
                <X className="w-4 h-4 text-red-400 hover:text-red-700" />
              </button>
            </div>
          )}

          {/* Dropzone */}
          {!archivo ? (
            <div
              {...getRootProps()}
              className={cn(
                "border border-dashed rounded-[10px] p-4 text-center cursor-pointer transition-all",
                isDragActive
                  ? "border-[#2563eb] bg-blue-50"
                  : "border-gray-300 hover:border-[#2563eb] hover:bg-blue-50/30",
              )}
            >
              <input {...getInputProps()} />
              <UploadCloud className="w-7 h-7 mx-auto mb-1.5 text-gray-400" />
              <p className="text-sm text-gray-600 font-medium">
                {isDragActive
                  ? "Suelta el archivo aquí"
                  : "Toca para seleccionar archivo"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                PDF, JPG, PNG, WEBP, DOC, DOCX · máx. 10 MB
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3 border border-[#2563eb] rounded-[10px] p-3 bg-blue-50/30">
              <ArchivoIcono mimetype={archivo.type} size="lg" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{archivo.name}</p>
                <p className="text-xs text-gray-400">
                  {formatTamano(archivo.size)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setArchivo(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Categoría */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-gray-600">
              Categoría <span className="text-red-500">*</span>
            </Label>
            <Select
              value={categoriaId}
              onValueChange={(v) => {
                setCategoriaId(v);
                setErrorModal(null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar categoría…" />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    <span className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full inline-block flex-shrink-0"
                        style={{ backgroundColor: c.color }}
                      />
                      {c.nombre}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Nombre */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-gray-600">
              Nombre del documento <span className="text-red-500">*</span>
            </Label>
            <Input
              value={nombreDoc}
              onChange={(e) => setNombreDoc(e.target.value)}
              placeholder="Ej: INE 2026 vigente"
            />
          </div>

          {/* Vencimiento */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="tiene-venc"
              checked={tieneVencimiento}
              onChange={(e) => setTieneVencimiento(e.target.checked)}
              className="rounded w-4 h-4 cursor-pointer"
            />
            <Label htmlFor="tiene-venc" className="text-sm cursor-pointer">
              Este documento tiene fecha de vencimiento
            </Label>
          </div>
          {tieneVencimiento && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase text-gray-600">
                  Fecha vencimiento <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={fechaVenc}
                  onChange={(e) => setFechaVenc(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase text-gray-600">
                  Fecha emisión
                </Label>
                <Input
                  type="date"
                  value={fechaEmision}
                  onChange={(e) => setFechaEmision(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Notas */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-gray-600">
              Notas
            </Label>
            <Textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Observaciones adicionales…"
              className="resize-none h-16"
              maxLength={500}
            />
          </div>

          {/* Progreso de subida */}
          {subiendo && (
            <div className="space-y-1">
              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#2563eb] to-[#7c3aed] transition-all"
                  style={{ width: `${progreso}%` }}
                />
              </div>
              <p className="text-xs text-right text-gray-500">{progreso}%</p>
            </div>
          )}
        </div>

        {/* Footer fijo al fondo del modal */}
        <div className="flex-shrink-0 border-t border-gray-100 px-4 py-3 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              reset();
              onClose();
            }}
            disabled={subiendo}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubir}
            disabled={subiendo || !archivo}
            className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white w-full sm:w-auto"
          >
            {subiendo ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Subiendo…
              </>
            ) : (
              "Subir documento"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Modal: Configurar Categorías ─────────────────────────────────────────────
function ModalCategorias({ open, onClose, idEmpresa, onSuccess, onError }) {
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [nueva, setNueva] = useState({
    nombre: "",
    descripcion: "",
    color: "#2563EB",
  });
  const [creando, setCreando] = useState(false);

  const cargar = useCallback(async () => {
    if (!idEmpresa) return;
    setCargando(true);
    try {
      const data = await categoriasApi.listarTodas(idEmpresa);
      setCategorias(data.categorias || []);
    } finally {
      setCargando(false);
    }
  }, [idEmpresa]);

  useEffect(() => {
    if (open) cargar();
  }, [open, cargar]);

  const handleCrear = async () => {
    if (!nueva.nombre.trim())
      return onError("El nombre de la categoría es requerido");
    setCreando(true);
    try {
      await categoriasApi.crear(idEmpresa, nueva);
      setNueva({ nombre: "", descripcion: "", color: "#2563EB" });
      onSuccess("Categoría creada");
      cargar();
    } catch (err) {
      onError(err?.response?.data?.error || "Error al crear categoría");
    } finally {
      setCreando(false);
    }
  };

  const handleToggle = async (cat) => {
    try {
      await categoriasApi.actualizar(cat.id, { activo: cat.activo ? 0 : 1 });
      cargar();
    } catch {
      onError("Error al actualizar la categoría");
    }
  };

  const handleEliminar = async (cat) => {
    if (cat.es_sistema)
      return onError("Las categorías del sistema no se pueden eliminar");
    try {
      await categoriasApi.eliminar(cat.id);
      onSuccess("Categoría desactivada");
      cargar();
    } catch {
      onError("Error al eliminar la categoría");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" /> Configurar categorías
          </DialogTitle>
        </DialogHeader>

        {/* Lista de categorías */}
        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
          {cargando ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-[#2563EB]" />
            </div>
          ) : (
            categorias.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 bg-gray-50"
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium truncate block">
                    {cat.nombre}
                  </span>
                  {cat.es_sistema && (
                    <span className="text-[10px] text-gray-400">
                      Sistema (no eliminable)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggle(cat)}
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium transition-colors",
                      cat.activo
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200",
                    )}
                  >
                    {cat.activo ? "Activa" : "Inactiva"}
                  </button>
                  {!cat.es_sistema && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6 text-gray-400 hover:text-red-500"
                      onClick={() => handleEliminar(cat)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Formulario nueva categoría */}
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Nueva categoría
          </p>
          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Nombre</Label>
              <Input
                value={nueva.nombre}
                onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })}
                placeholder="Ej: Permisos"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Color</Label>
              <input
                type="color"
                value={nueva.color}
                onChange={(e) => setNueva({ ...nueva, color: e.target.value })}
                className="w-12 h-9 rounded-md cursor-pointer border border-gray-200 p-0.5"
              />
            </div>
          </div>
          <Input
            value={nueva.descripcion}
            onChange={(e) =>
              setNueva({ ...nueva, descripcion: e.target.value })
            }
            placeholder="Descripción (opcional)"
          />
          <Button
            type="button"
            onClick={handleCrear}
            disabled={creando}
            size="sm"
            className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white w-full"
          >
            {creando ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <Plus className="w-4 h-4 mr-1" />
            )}
            Crear categoría
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ArchivoIcono({ mimetype, size = "sm" }) {
  const cls = size === "lg" ? "w-9 h-9" : "w-7 h-7";
  const ic = size === "lg" ? "w-4 h-4" : "w-3.5 h-3.5";
  if (typeof mimetype === "string" && mimetype.includes("pdf")) {
    return (
      <div
        className={cn(
          "rounded-lg flex items-center justify-center bg-red-100 flex-shrink-0",
          cls,
        )}
      >
        <FileText className={cn("text-red-600", ic)} />
      </div>
    );
  }
  if (typeof mimetype === "string" && mimetype.startsWith("image/")) {
    return (
      <div
        className={cn(
          "rounded-lg flex items-center justify-center bg-green-100 flex-shrink-0",
          cls,
        )}
      >
        <ImageIcon className={cn("text-green-600", ic)} />
      </div>
    );
  }
  return (
    <div
      className={cn(
        "rounded-lg flex items-center justify-center bg-blue-100 flex-shrink-0",
        cls,
      )}
    >
      <File className={cn("text-blue-600", ic)} />
    </div>
  );
}

function formatTamano(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
