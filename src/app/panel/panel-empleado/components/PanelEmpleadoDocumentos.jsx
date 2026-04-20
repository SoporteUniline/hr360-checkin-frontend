"use client";

/**
 * Tab "Documentos" — Expediente Digital del Empleado.
 * Especificación completa según brief del jefe.
 * Soporta dos usos:
 *  1. Panel de empleados: <PanelEmpleadoDocumentos datosEmpleado={...} />
 *  2. Módulo empleados:   <PanelEmpleadoDocumentos idEmpleado={X} idEmpresa={Y} />
 * Relación:
 *  - API:     src/lib/expedienteApi.js
 *  - Backend: /api/checador/expediente/*
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FolderOpen, UploadCloud, FileText, ImageIcon, File,
  Trash2, ExternalLink, Loader2, Search, AlertCircle,
  CheckCircle2, X, Clock, Shield, Settings2, Plus,
  RefreshCw, History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import { categoriasApi, documentosApi } from "@/lib/expedienteApi";

// ─── Constantes ──────────────────────────────────────────────────────────────
const TIPOS_ACEPTADOS = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
};

const ESTATUS_OPTS = [
  { value: "TODOS",      label: "Todos los estatus" },
  { value: "VIGENTE",    label: "Vigente" },
  { value: "NO_VENCE",   label: "Sin vencimiento" },
  { value: "POR_VENCER", label: "Por vencer (30 días)" },
  { value: "VENCIDO",    label: "Vencido" },
];

const ESTATUS_BADGE = {
  VIGENTE:    { label: "Vigente",        cls: "bg-green-100 text-green-800 border-green-200" },
  NO_VENCE:   { label: "Sin venc.",      cls: "bg-gray-100 text-gray-700 border-gray-200" },
  POR_VENCER: { label: "Por vencer",     cls: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  VENCIDO:    { label: "Vencido",        cls: "bg-red-100 text-red-800 border-red-200" },
};

// ─── Componente principal ─────────────────────────────────────────────────────
export default function PanelEmpleadoDocumentos({ datosEmpleado, idEmpleado: idProp, idEmpresa: idEmpresaProp }) {
  const idEmpleado = idProp ?? datosEmpleado?.informacion_general?.id_empleado;
  const idEmpresa  = idEmpresaProp ?? datosEmpleado?.informacion_general?.id_empresa;

  // ── Estado ──
  const [categorias,   setCategorias]   = useState([]);
  const [documentos,   setDocumentos]   = useState([]);
  const [stats,        setStats]        = useState(null);
  const [cargando,     setCargando]     = useState(true);
  const [tabFiltro,    setTabFiltro]    = useState("todos");
  const [busqueda,     setBusqueda]     = useState("");
  const [estatusFiltro, setEstatusFiltro] = useState("TODOS");
  const [modalSubir,   setModalSubir]   = useState(false);
  const [modalCats,    setModalCats]    = useState(false);
  const [modalBitacora, setModalBitacora] = useState(null);
  const [bitacoraData,  setBitacoraData]  = useState([]);
  const [docAEliminar, setDocAEliminar] = useState(null);
  const [eliminando,   setEliminando]   = useState(false);
  const [notif,        setNotif]        = useState(null);
  const [errorCarga,   setErrorCarga]   = useState(null);

  // ─── Notificación flotante ────────────────────────────────────────────────
  const mostrarNotif = useCallback((tipo, mensaje) => {
    setNotif({ tipo, mensaje });
    setTimeout(() => setNotif(null), 4000);
  }, []);

  // ─── Cargar datos ─────────────────────────────────────────────────────────
  const cargarTodo = useCallback(async () => {
    if (!idEmpleado || !idEmpresa) return;
    setCargando(true);
    setErrorCarga(null);
    try {
      // Primero asegurar que existen las categorías de sistema
      const catData = await categoriasApi.listarActivas(idEmpresa).catch(async () => {
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
      const msg = err?.response?.data?.error || err?.message || "Error desconocido";
      const status = err?.response?.status;
      if (status === 500 || !status) {
        setErrorCarga("Las tablas del expediente digital no existen aún. Ejecuta la migración 004 en la base de datos.");
      } else {
        setErrorCarga(msg);
      }
    } finally {
      setCargando(false);
    }
  }, [idEmpleado, idEmpresa]);

  useEffect(() => { cargarTodo(); }, [cargarTodo]);

  // ─── Filtrado de documentos ───────────────────────────────────────────────
  const documentosFiltrados = documentos.filter((d) => {
    if (tabFiltro === "alertas") {
      if (d.estatus !== "VENCIDO" && d.estatus !== "POR_VENCER") return false;
    } else if (tabFiltro !== "todos") {
      if (String(d.categoria_id) !== tabFiltro) return false;
    }
    if (estatusFiltro && estatusFiltro !== "TODOS" && d.estatus !== estatusFiltro) return false;
    if (busqueda && !d.nombre_documento.toLowerCase().includes(busqueda.toLowerCase())) return false;
    return true;
  });

  const alertasCount = documentos.filter((d) =>
    d.estatus === "VENCIDO" || d.estatus === "POR_VENCER"
  ).length;

  // ─── Eliminar ─────────────────────────────────────────────────────────────
  const handleEliminar = async () => {
    if (!docAEliminar) return;
    setEliminando(true);
    try {
      await documentosApi.eliminar(docAEliminar.id);
      mostrarNotif("success", "Documento eliminado");
      setDocAEliminar(null);
      await cargarTodo();
    } catch {
      mostrarNotif("error", "Error al eliminar documento");
    } finally {
      setEliminando(false);
    }
  };

  // ─── Ver documento (registra VISUALIZADO en bitácora y abre la URL) ──────────
  const verDocumento = async (doc) => {
    // Abre el archivo de inmediato para que el usuario no espere
    window.open(doc.archivo_url, "_blank", "noopener,noreferrer");
    // Llama al backend en segundo plano para registrar la visualización
    try {
      await documentosApi.obtener(doc.id);
    } catch (err) {
      console.warn("No se pudo registrar visualización en bitácora:", err);
    }
  };

  // ─── Bitácora ──────────────────────────────────────────────────────────────
  const verBitacora = async (doc) => {
    setModalBitacora(doc);
    setBitacoraData(null); // null = cargando
    try {
      const data = await documentosApi.bitacora(doc.id);
      setBitacoraData(data.bitacora || []);
    } catch (err) {
      console.error("Error al obtener bitácora:", err?.response?.data || err.message);
      // false indica error (distinto de [] = vacío y null = cargando)
      setBitacoraData(false);
    }
  };

  if (!idEmpleado || !idEmpresa) return null;

  return (
    <div className="space-y-4">
      {/* ── Notificación flotante ── */}
      {notif && (
        <div className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-in slide-in-from-bottom-4",
          notif.tipo === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
        )}>
          {notif.tipo === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{notif.mensaje}</span>
          <button type="button" onClick={() => setNotif(null)}><X className="w-4 h-4 opacity-70 hover:opacity-100" /></button>
        </div>
      )}

      {/* ── Banner de error de configuración ── */}
      {errorCarga && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-0.5">Error al cargar el expediente</p>
            <p className="text-xs text-red-700">{errorCarga}</p>
            <button type="button" onClick={cargarTodo}
              className="mt-2 text-xs font-medium underline hover:no-underline">
              Reintentar
            </button>
          </div>
        </div>
      )}

      {/* ── Header del módulo ── */}
      <div className="bg-gradient-to-br from-blue-50 via-white to-blue-50 border-2 border-blue-100 rounded-xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-[#2563EB] to-[#1d4ed8] p-3 rounded-lg shadow-md">
              <FolderOpen className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">Expediente digital</h3>
              <p className="text-xs sm:text-sm text-gray-500">Define y carga los documentos del empleado.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setModalCats(true)} className="text-xs gap-1">
              <Settings2 className="w-3.5 h-3.5" /> Categorías
            </Button>
            <Button type="button" size="sm" onClick={() => setModalSubir(true)}
              className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-xs gap-1">
              <Plus className="w-3.5 h-3.5" /> Cargar documento
            </Button>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4">
            {[
              { label: "Cargados",    value: stats.total,      cls: "text-gray-900" },
              { label: "Vigentes",    value: stats.vigentes,   cls: "text-green-700" },
              { label: "Por vencer",  value: stats.por_vencer, cls: "text-yellow-700" },
              { label: "Vencidos",    value: stats.vencidos,   cls: "text-red-700" },
              { label: "Pendientes",  value: stats.obligatorios, cls: "text-blue-700" },
            ].map(({ label, value, cls }) => (
              <Card key={label} className="overflow-hidden">
                <CardContent className="p-3 text-center">
                  <div className={cn("text-2xl font-extrabold", cls)}>{value}</div>
                  <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wide mt-0.5">{label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ── Barra de completitud ── */}
        {stats && stats.obligatorios > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Completitud del expediente (obligatorios)</span>
              <span className="font-semibold">{stats.completitud_pct}%</span>
            </div>
            <Progress value={stats.completitud_pct} className="h-2" />
          </div>
        )}
      </div>

      {/* ── Banners de alerta ── */}
      {stats?.vencidos > 0 && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-800 px-4 py-2.5 rounded-lg text-sm font-medium">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {stats.vencidos} documento{stats.vencidos !== 1 ? "s" : ""} vencido{stats.vencidos !== 1 ? "s" : ""} — requiere acción inmediata.
        </div>
      )}
      {stats?.por_vencer > 0 && (
        <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2.5 rounded-lg text-sm font-medium">
          <Clock className="w-4 h-4 flex-shrink-0" />
          {stats.por_vencer} documento{stats.por_vencer !== 1 ? "s" : ""} por vencer en los próximos 30 días.
        </div>
      )}

      {/* ── Filtros de categoría (chips) ── */}
      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={() => setTabFiltro("todos")}
          className={cn("px-3 py-1 rounded-full text-xs font-medium border transition-colors",
            tabFiltro === "todos" ? "bg-[#2563EB] text-white border-[#2563EB]" : "border-gray-200 text-gray-600 hover:border-[#2563EB] hover:text-[#2563EB]")}>
          Todos ({documentos.length})
        </button>
        {alertasCount > 0 && (
          <button type="button" onClick={() => setTabFiltro("alertas")}
            className={cn("px-3 py-1 rounded-full text-xs font-medium border transition-colors",
              tabFiltro === "alertas" ? "bg-red-600 text-white border-red-600" : "border-red-200 text-red-600 hover:bg-red-50")}>
            ⚠ Alertas ({alertasCount})
          </button>
        )}
        {categorias.map((cat) => {
          const count = documentos.filter((d) => String(d.categoria_id) === String(cat.id)).length;
          return (
            <button type="button" key={cat.id} onClick={() => setTabFiltro(String(cat.id))}
              className={cn("px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                tabFiltro === String(cat.id)
                  ? "text-white border-transparent"
                  : "border-gray-200 text-gray-600 hover:opacity-80")}
              style={tabFiltro === String(cat.id)
                ? { backgroundColor: cat.color, borderColor: cat.color }
                : {}}>
              {cat.nombre} ({count})
            </button>
          );
        })}
      </div>

      {/* ── Filtros secundarios ── */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Buscar documento..." value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)} className="pl-9" />
        </div>
        <Select value={estatusFiltro} onValueChange={setEstatusFiltro}>
          <SelectTrigger className="sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ESTATUS_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" size="icon" onClick={cargarTodo} title="Recargar">
          <RefreshCw className={cn("w-4 h-4", cargando && "animate-spin")} />
        </Button>
      </div>

      {/* ── Tabla de documentos ── */}
      <Card>
        <CardContent className="p-0">
          {cargando ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" />
            </div>
          ) : documentosFiltrados.length === 0 ? (
            <div className="text-center py-16">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">No hay documentos</p>
              <p className="text-xs text-gray-400 mt-1">
                {busqueda || estatusFiltro || tabFiltro !== "todos"
                  ? "Prueba con otros filtros"
                  : "Sube el primer documento con el botón \"Cargar documento\""}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {["Documento", "Categoría", "Archivo", "Cargado", "Vigencia", "Estatus", "Acciones"].map((col) => (
                      <th key={col} className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {documentosFiltrados.map((doc) => (
                    <tr key={doc.id}
                      className={cn("border-b border-gray-50 last:border-0 transition-colors",
                        doc.estatus === "VENCIDO"    && "bg-red-50/60",
                        doc.estatus === "POR_VENCER" && "bg-yellow-50/50"
                      )}>
                      <td className="px-3 py-2.5 font-medium text-gray-900 max-w-[180px] truncate">
                        {doc.nombre_documento}
                        {doc.obligatorio ? (
                          <Shield className="w-3 h-3 inline ml-1 text-blue-500" title="Obligatorio" />
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: `${doc.categoria_color}20`, color: doc.categoria_color }}>
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
                        {doc.vence && doc.fecha_vencimiento
                          ? dayjs(doc.fecha_vencimiento).format("DD/MM/YYYY")
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                          ESTATUS_BADGE[doc.estatus]?.cls)}>
                          {ESTATUS_BADGE[doc.estatus]?.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-0.5">
                          <Button type="button" variant="ghost" size="icon" className="w-7 h-7 text-gray-400 hover:text-[#2563EB]"
                            title="Ver documento" onClick={() => verDocumento(doc)}>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="w-7 h-7 text-gray-400 hover:text-gray-700"
                            title="Bitácora" onClick={() => verBitacora(doc)}>
                            <History className="w-3.5 h-3.5" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="w-7 h-7 text-gray-400 hover:text-red-500"
                            title="Eliminar" onClick={() => setDocAEliminar(doc)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Modal de subida ── */}
      <ModalSubirDocumento
        open={modalSubir}
        onClose={() => setModalSubir(false)}
        categorias={categorias}
        idEmpleado={idEmpleado}
        idEmpresa={idEmpresa}
        onSuccess={() => { setModalSubir(false); cargarTodo(); mostrarNotif("success", "Documento subido correctamente"); }}
        onError={(msg) => mostrarNotif("error", msg)}
      />

      {/* ── Modal de categorías ── */}
      <ModalCategorias
        open={modalCats}
        onClose={() => { setModalCats(false); cargarTodo(); }}
        idEmpresa={idEmpresa}
        onSuccess={(msg) => mostrarNotif("success", msg)}
        onError={(msg) => mostrarNotif("error", msg)}
      />

      {/* ── Modal de bitácora ── */}
      <Dialog open={!!modalBitacora} onOpenChange={(o) => !o && setModalBitacora(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-4 h-4" /> Bitácora — {modalBitacora?.nombre_documento}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto space-y-2 text-sm">
            {bitacoraData === null ? (
              <p className="text-gray-400 text-center py-8 animate-pulse">Cargando...</p>
            ) : bitacoraData === false ? (
              <div className="text-center py-8">
                <p className="text-red-500 text-xs font-medium">Error al cargar la bitácora</p>
                <p className="text-gray-400 text-xs mt-1">Revisa la consola del backend para más detalles</p>
                <button type="button" onClick={() => verBitacora(modalBitacora)}
                  className="mt-3 text-xs text-blue-600 underline hover:no-underline">
                  Reintentar
                </button>
              </div>
            ) : bitacoraData.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Sin registros</p>
            ) : bitacoraData.map((b) => (
              <div key={b.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 whitespace-nowrap",
                  b.accion === "CARGADO"    && "bg-blue-100 text-blue-700",
                  b.accion === "ELIMINADO"  && "bg-red-100 text-red-700",
                  b.accion === "EDITADO"    && "bg-yellow-100 text-yellow-700",
                  b.accion === "VISUALIZADO" && "bg-gray-100 text-gray-600",
                  b.accion === "DESCARGADO" && "bg-green-100 text-green-700",
                )}>
                  {b.accion}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700">{b.detalle || "—"}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {b.usuario_nombre || "Sistema"} · {dayjs(b.created_at).format("DD/MM/YY HH:mm")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Confirm eliminar ── */}
      <AlertDialog open={!!docAEliminar} onOpenChange={(o) => !o && setDocAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará permanentemente <strong>{docAEliminar?.nombre_documento}</strong>. Esta acción no puede deshacerse.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleEliminar} disabled={eliminando}
              className="bg-red-600 hover:bg-red-700">
              {eliminando ? <Loader2 className="w-4 h-4 animate-spin mr-1 inline" /> : null} Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Modal: Subir Documento ───────────────────────────────────────────────────
function ModalSubirDocumento({ open, onClose, categorias, idEmpleado, idEmpresa, onSuccess, onError }) {
  const [archivo,          setArchivo]          = useState(null);
  const [categoriaId,      setCategoriaId]      = useState("");
  const [nombreDoc,        setNombreDoc]        = useState("");
  const [descripcion,      setDescripcion]      = useState("");
  const [tieneVencimiento, setTieneVencimiento] = useState(false);
  const [fechaVenc,        setFechaVenc]        = useState("");
  const [fechaEmision,     setFechaEmision]     = useState("");
  const [notas,            setNotas]            = useState("");
  const [subiendo,         setSubiendo]         = useState(false);
  const [progreso,         setProgreso]         = useState(0);

  const reset = () => {
    setArchivo(null); setCategoriaId(""); setNombreDoc(""); setDescripcion("");
    setTieneVencimiento(false); setFechaVenc(""); setFechaEmision(""); setNotas(""); setProgreso(0);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (accepted, rejected) => {
      if (rejected.length > 0) {
        const e = rejected[0].errors[0];
        onError(e.code === "file-too-large" ? "Archivo supera 10 MB" : "Tipo no permitido (PDF, imágenes, Word)");
        return;
      }
      if (accepted[0]) {
        setArchivo(accepted[0]);
        if (!nombreDoc) setNombreDoc(accepted[0].name.replace(/\.[^.]+$/, ""));
      }
    },
    accept: TIPOS_ACEPTADOS,
    maxSize: 10 * 1024 * 1024,
    multiple: false,
  });

  const handleSubir = async () => {
    if (!archivo)       return onError("Selecciona un archivo");
    if (!categoriaId)   return onError("Selecciona una categoría");
    if (!nombreDoc.trim()) return onError("Escribe el nombre del documento");
    if (tieneVencimiento && !fechaVenc) return onError("Ingresa la fecha de vencimiento");

    const fd = new FormData();
    fd.append("file",             archivo);
    fd.append("empresa_id",       idEmpresa);
    fd.append("categoria_id",     categoriaId);
    fd.append("nombre_documento", nombreDoc.trim());
    fd.append("descripcion",      descripcion);
    fd.append("vence",            tieneVencimiento ? "1" : "0");
    fd.append("fecha_vencimiento", tieneVencimiento ? fechaVenc : "");
    fd.append("fecha_emision",    fechaEmision);
    fd.append("notas",            notas);

    setSubiendo(true);
    try {
      await documentosApi.subir(idEmpleado, fd, setProgreso);
      reset();
      onSuccess();
    } catch (err) {
      onError(err?.response?.data?.error || "Error al subir el archivo");
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UploadCloud className="w-4 h-4" /> Cargar documento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Dropzone */}
          {!archivo ? (
            <div {...getRootProps()} className={cn(
              "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
              isDragActive ? "border-[#2563EB] bg-blue-50" : "border-gray-200 hover:border-[#2563EB] hover:bg-blue-50/30"
            )}>
              <input {...getInputProps()} />
              <UploadCloud className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600 font-medium">Arrastra o haz clic para seleccionar</p>
              <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG, WEBP, DOC, DOCX — máx. 10 MB</p>
            </div>
          ) : (
            <div className="flex items-center gap-3 border-2 border-[#2563EB] rounded-xl p-3 bg-blue-50/30">
              <ArchivoIcono mimetype={archivo.type} size="lg" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{archivo.name}</p>
                <p className="text-xs text-gray-400">{formatTamano(archivo.size)}</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setArchivo(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Categoría */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold uppercase text-gray-600">
              Categoría <span className="text-red-500">*</span>
            </Label>
            <Select value={categoriaId} onValueChange={setCategoriaId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar categoría" />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: c.color }} />
                      {c.nombre}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Nombre */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold uppercase text-gray-600">
              Nombre del documento <span className="text-red-500">*</span>
            </Label>
            <Input value={nombreDoc} onChange={(e) => setNombreDoc(e.target.value)} placeholder="Ej: INE 2026 vigente" />
          </div>

          {/* Vencimiento */}
          <div className="flex items-center gap-2">
            <input type="checkbox" id="tiene-venc" checked={tieneVencimiento}
              onChange={(e) => setTieneVencimiento(e.target.checked)} className="rounded" />
            <Label htmlFor="tiene-venc" className="text-sm cursor-pointer">Este documento tiene fecha de vencimiento</Label>
          </div>
          {tieneVencimiento && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold uppercase text-gray-600">
                  Fecha vencimiento <span className="text-red-500">*</span>
                </Label>
                <Input type="date" value={fechaVenc} onChange={(e) => setFechaVenc(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold uppercase text-gray-600">Fecha emisión</Label>
                <Input type="date" value={fechaEmision} onChange={(e) => setFechaEmision(e.target.value)} />
              </div>
            </div>
          )}

          {/* Descripción y Notas */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold uppercase text-gray-600">Notas</Label>
            <Textarea value={notas} onChange={(e) => setNotas(e.target.value)}
              placeholder="Observaciones adicionales..." className="resize-none h-16" maxLength={500} />
          </div>

          {subiendo && (
            <div className="space-y-1">
              <Progress value={progreso} className="h-2" />
              <p className="text-xs text-right text-gray-500">{progreso}%</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }} disabled={subiendo}>Cancelar</Button>
          <Button type="button" onClick={handleSubir} disabled={subiendo || !archivo}
            className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white">
            {subiendo ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Subiendo…</> : "Subir documento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Modal: Configurar Categorías ─────────────────────────────────────────────
function ModalCategorias({ open, onClose, idEmpresa, onSuccess, onError }) {
  const [categorias, setCategorias] = useState([]);
  const [cargando,   setCargando]   = useState(false);
  const [nueva,      setNueva]      = useState({ nombre: "", descripcion: "", color: "#2563EB" });
  const [creando,    setCreando]    = useState(false);

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

  useEffect(() => { if (open) cargar(); }, [open, cargar]);

  const handleCrear = async () => {
    if (!nueva.nombre.trim()) return onError("El nombre es requerido");
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
      onError("Error al actualizar categoría");
    }
  };

  const handleEliminar = async (cat) => {
    if (cat.es_sistema) return onError("Las categorías de sistema no se pueden eliminar");
    try {
      await categoriasApi.eliminar(cat.id);
      onSuccess("Categoría desactivada");
      cargar();
    } catch {
      onError("Error al eliminar categoría");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" /> Configurar categorías
          </DialogTitle>
        </DialogHeader>

        {/* Lista */}
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {cargando ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-[#2563EB]" /></div>
          ) : categorias.map((cat) => (
            <div key={cat.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 bg-gray-50">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium truncate block">{cat.nombre}</span>
                {cat.es_sistema && (
                  <span className="text-[10px] text-gray-400">Sistema (no eliminable)</span>
                )}
              </div>
              <div className="flex items-center gap-1">
              <button type="button" onClick={() => handleToggle(cat)}
                className={cn("text-xs px-2 py-0.5 rounded-full font-medium transition-colors",
                  cat.activo ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200")}>
                {cat.activo ? "Activa" : "Inactiva"}
              </button>
                {!cat.es_sistema && (
                  <Button type="button" variant="ghost" size="icon" className="w-6 h-6 text-gray-400 hover:text-red-500"
                    onClick={() => handleEliminar(cat)}>
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Formulario nueva categoría */}
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Nueva categoría
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Nombre</Label>
              <Input value={nueva.nombre} onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })}
                placeholder="Ej: Permisos" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Color</Label>
              <input type="color" value={nueva.color}
                onChange={(e) => setNueva({ ...nueva, color: e.target.value })}
                className="w-full h-9 rounded-md cursor-pointer border border-gray-200" />
            </div>
          </div>
          <Input value={nueva.descripcion} onChange={(e) => setNueva({ ...nueva, descripcion: e.target.value })}
            placeholder="Descripción (opcional)" />
          <Button type="button" onClick={handleCrear} disabled={creando} size="sm"
            className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white w-full">
            {creando ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
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
  const ic  = size === "lg" ? "w-4 h-4" : "w-3.5 h-3.5";
  if (mimetype === "application/pdf" || (typeof mimetype === "string" && mimetype.includes("pdf"))) {
    return <div className={cn("rounded-lg flex items-center justify-center bg-red-100 flex-shrink-0", cls)}><FileText className={cn("text-red-600", ic)} /></div>;
  }
  if (typeof mimetype === "string" && mimetype.startsWith("image/")) {
    return <div className={cn("rounded-lg flex items-center justify-center bg-green-100 flex-shrink-0", cls)}><ImageIcon className={cn("text-green-600", ic)} /></div>;
  }
  return <div className={cn("rounded-lg flex items-center justify-center bg-blue-100 flex-shrink-0", cls)}><File className={cn("text-blue-600", ic)} /></div>;
}

function formatTamano(bytes) {
  if (!bytes) return "";
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
