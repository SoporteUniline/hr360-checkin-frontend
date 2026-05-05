"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import useSWR from "swr";
import { useAuth } from "@/context/AuthContext";
import { fetcherWithToken } from "@/lib/fetcher";
import { plantillasApi, docGeneradosApi } from "@/lib/gestionDocumentalApi";
import axios from "@/lib/axios";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Loader2,
  FileText,
  User,
  CheckCircle2,
  RefreshCw,
  Printer,
  Building2,
  Search,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSnackbar } from "notistack";
import { motion, AnimatePresence } from "framer-motion";
import { htmlToPdf } from "@/lib/htmlToPdf";
import { Combobox } from "@/components/Combobox";
import useUnidadesNegocio from "@/hooks/useUnidadesNegocio";

/* ─── Constantes ─── */
const PASOS = ["Plantilla", "Empleado", "Vista previa", "Listo"];

const CATEGORIA_COLORES = {
  Laboral:        "bg-blue-100 text-blue-700",
  Administrativo: "bg-amber-100 text-amber-700",
  Legal:          "bg-red-100 text-red-700",
  RRHH:           "bg-purple-100 text-purple-700",
  Otro:           "bg-gray-100 text-gray-700",
};

/* ─── Utilidades ─── */

/**
 * Convierte una fecha ISO "YYYY-MM-DD" (o con hora "YYYY-MM-DDT...")
 * al formato de día/mes/año "DD/MM/YYYY" para documentos.
 */
function formatearFecha(iso) {
  if (!iso) return "";
  const [yyyy, mm, dd] = String(iso).split("T")[0].split("-");
  if (!yyyy || !mm || !dd) return String(iso);
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Construye el mapa de variables usando los nombres de columna reales
 * de las tablas `empleados`, `nomina` y `empresas`.
 *
 * empleado → fila de `obtenerPorId` (incluye spread de nomina: sueldo, etc.)
 * empresa  → fila de `GET /api/empresas/:id` (nombre_empresa, nombre_duenio, direccion…)
 */
function buildVariables(empleado, empresa, hoy) {
  const meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const d = hoy || new Date();

  // Salario: campo `sueldo` de la tabla nomina (disponible tras getById)
  const salarioRaw = empleado.sueldo ?? empleado.salario ?? empleado.salario_base ?? null;
  const salarioFmt = salarioRaw
    ? `$${Number(salarioRaw).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`
    : "";

  return {
    "empleado.nombre":        `${empleado.nombre} ${empleado.apellido_paterno} ${empleado.apellido_materno || ""}`.trim(),
    "empleado.codigo":        empleado.codigo_empleado || String(empleado.id_empleado || ""),
    "empleado.puesto":        empleado.puesto || empleado.nombre_puesto || "",
    "empleado.departamento":  empleado.departamento || "",
    "empleado.fecha_ingreso": formatearFecha(empleado.fecha_ingreso),
    "empleado.salario":       salarioFmt,
    // La columna se llama `correo` en la BD, no `email`
    "empleado.email":         empleado.correo || empleado.email || "",
    "empleado.telefono":      empleado.telefono || "",
    "empleado.direccion":     empleado.direccion || "",
    "empleado.rfc":           empleado.rfc || "",
    "empleado.curp":          empleado.curp || "",
    // Campos de empresa — mapeados a columnas reales de la tabla `empresas`
    "empresa.nombre":         empresa?.nombre_empresa || empresa?.nombre || "",
    // `ciudad` no existe como columna; se toma de `nombre_duenio` ciudad si hay, o vacío
    "empresa.ciudad":         empresa?.ciudad || "",
    // El representante legal se guarda como `nombre_duenio` en la BD
    "empresa.representante":  empresa?.representante_legal || empresa?.nombre_duenio || "",
    "empresa.rfc":            empresa?.rfc || "",
    // El domicilio se llama `direccion` en la tabla empresas
    "empresa.domicilio":      empresa?.domicilio || empresa?.direccion || "",
    "fecha.dia":              String(d.getDate()).padStart(2, "0"),
    "fecha.mes":              meses[d.getMonth()],
    "fecha.anio":             String(d.getFullYear()),
    "fecha.completa":         `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`,
  };
}

/**
 * Elimina bloques de contenido que quedaron vacíos después de sustituir
 * las variables. Cubre dos casos:
 *  1. Etiquetas <p>/<li>/<td>/<th> cuyo texto visible es solo espacios.
 *  2. Etiquetas <p>/<li> que solo contienen un label "RFC:" sin valor.
 */
function limpiarCamposVacios(html) {
  let cleaned = String(html || "");

  // 1) Bloques completamente vacíos o con solo tags vacíos internos
  cleaned = cleaned.replace(
    /<(p|li|td|th)\b[^>]*>((?:\s|<br\s*\/?>|<[^>]+>\s*<\/[^>]+>)*)<\/\1>/gi,
    (match, _tag, inner) => {
      const text = inner.replace(/<[^>]+>/g, "").trim();
      return text === "" ? "" : match;
    },
  );

  // 2) Bloques con solo un label tipo "RFC: " / "<strong>CURP:</strong> " sin valor real
  cleaned = cleaned.replace(
    /<(p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi,
    (match, _tag, inner) => {
      const text = inner.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
      // Si el texto es solo "Palabra:" o "Palabra Palabra:" sin ningún otro contenido
      if (/^[A-ZÁÉÍÓÚÑa-záéíóúñ\s]{1,30}:\s*$/.test(text)) return "";
      return match;
    },
  );

  // 3) Limpiar <br> duplicados que pudieran quedar
  cleaned = cleaned.replace(/(<br\s*\/?>\s*){2,}/gi, "<br/>");

  return cleaned;
}

/** Reemplaza {{variable}} en HTML usando el mapa de variables y limpia campos vacíos */
function resolveTemplate(html, vars) {
  const source = String(html || "");
  if (!source.trim() || !vars) return source;
  const resolved = source.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const v = vars[key.trim()];
    // Si el valor existe y no es vacío, usarlo; de lo contrario, cadena vacía (no placeholder)
    return v !== undefined && v !== null && v !== "" ? v : "";
  });
  return limpiarCamposVacios(resolved);
}

/* ─── Stepper ─── */
function Stepper({ paso }) {
  return (
    <div className="flex items-center gap-0">
      {PASOS.map((label, i) => (
        <div key={label} className="flex items-center">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            i === paso
              ? "bg-[#2563EB] text-white shadow-sm"
              : i < paso
              ? "bg-green-50 text-green-700"
              : "bg-gray-100 text-gray-400"
          }`}>
            {i < paso
              ? <CheckCircle2 className="w-3.5 h-3.5" />
              : <span className="w-4 h-4 rounded-full bg-current/20 flex items-center justify-center text-[10px] leading-none">{i + 1}</span>
            }
            {label}
          </div>
          {i < PASOS.length - 1 && (
            <div className={`w-6 h-px mx-1 ${i < paso ? "bg-green-300" : "bg-gray-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Página ─── */
export default function GenerarDocumentoPage() {
  const { dataUser } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();
  const previewRef = useRef(null);

  const { options: unidadOptions, byId: unidadById } = useUnidadesNegocio();

  const empresa = dataUser?.empresas?.[0] || "all";
  const [paso, setPaso] = useState(0);
  const [unidadCalculo, setUnidadCalculo] = useState("");
  const [generating, setGenerating] = useState(false);
  const [docGuardado, setDocGuardado] = useState(null);

  /* Selecciones */
  const [plantillaId, setPlantillaId] = useState("");
  const [plantillaCompleta, setPlantillaCompleta] = useState(null);
  const [cargandoPlantilla, setCargandoPlantilla] = useState(false);
  const [empleadoId, setEmpleadoId] = useState("");
  const [empleadoCompleto, setEmpleadoCompleto] = useState(null);
  const [empresaData, setEmpresaData] = useState(null);
  const [searchEmp, setSearchEmp] = useState("");
  const [notas, setNotas] = useState("");

  /* SWR — plantillas activas (lista sin contenido_html para no sobrecargar) */
  const { data: plantillasData } = useSWR(
    `/checador/gestion-documental/plantillas?empresa=${empresa}&activo=1`,
    fetcherWithToken,
    { revalidateOnFocus: false },
  );
  const plantillas = plantillasData?.data || [];
  const plantillaResumen = plantillas.find((p) => String(p.id_plantilla) === String(plantillaId));

  /* Cargar plantilla completa (con contenido_html) al seleccionar */
  useEffect(() => {
    if (!plantillaId) {
      setPlantillaCompleta(null);
      return;
    }
    setCargandoPlantilla(true);
    plantillasApi.getById(plantillaId)
      .then((data) => setPlantillaCompleta(data))
      .catch(() => setPlantillaCompleta(null))
      .finally(() => setCargandoPlantilla(false));
  }, [plantillaId]);

  const plantillaSeleccionada = plantillaCompleta || plantillaResumen;

  /* Cargar empleado completo (con nómina: sueldo, etc.) al seleccionar */
  useEffect(() => {
    if (!empleadoId) {
      setEmpleadoCompleto(null);
      return;
    }
    axios.get(`/checador/empleados/${empleadoId}`)
      .then((res) => setEmpleadoCompleto(res.data))
      .catch(() => setEmpleadoCompleto(null));
  }, [empleadoId]);

  /* Cargar datos de empresa según la unidad de negocio seleccionada,
     o la primera empresa del token si no hay unidad elegida */
  useEffect(() => {
    const idEmpresa = unidadCalculo
      ? unidadById[unidadCalculo]?.id_empresa
      : empresa !== "all"
        ? empresa
        : dataUser?.empresas?.[0];
    if (!idEmpresa) return;
    axios.get(`/empresas/${idEmpresa}`)
      .then((res) => setEmpresaData(res.data))
      .catch(() => setEmpresaData(null));
  }, [unidadCalculo, unidadById, empresa, dataUser]);

  /* SWR — empleados */
  const { data: empData } = useSWR(
    `/checador/empleados?empresa=${empresa}&limit=200`,
    fetcherWithToken,
    { revalidateOnFocus: false },
  );
  const empleados = empData?.data || empData || [];
  const empleadosFiltrados = useMemo(() => {
    if (!searchEmp.trim()) return empleados;
    const q = searchEmp.toLowerCase();
    return empleados.filter((e) =>
      `${e.nombre} ${e.apellido_paterno} ${e.apellido_materno || ""}`.toLowerCase().includes(q) ||
      (e.codigo_empleado || "").toLowerCase().includes(q),
    );
  }, [empleados, searchEmp]);
  // empleadoSel: datos del listado (para mostrar nombre/puesto en la UI)
  const empleadoSel = empleados.find((e) => String(e.id_empleado) === String(empleadoId));
  // empleadoFinal: datos completos con nómina para resolver variables
  const empleadoFinal = empleadoCompleto || empleadoSel;

  /* ─── Vista previa del documento ─── */
  const htmlPreview = useMemo(() => {
    if (!plantillaSeleccionada || !empleadoFinal) return "";
    const contenido = plantillaSeleccionada.contenido_html || "";
    if (!contenido.trim()) return "<p style='color:#9ca3af;'>Esta plantilla no tiene contenido.</p>";
    // empresaFinal: datos completos de empresa (fallback a empresas_detalle del token)
    const empresaFinal = empresaData || dataUser?.empresas_detalle?.[0];
    const vars = buildVariables(empleadoFinal, empresaFinal);
    return resolveTemplate(contenido, vars);
  }, [plantillaSeleccionada, empleadoFinal, empresaData, dataUser]);

  /* ─── Guardar documento ─── */
  const handleGenerar = useCallback(async () => {
    if (!plantillaId || !empleadoId) return;
    setGenerating(true);
    try {
      const empresaFinal = empresaData || dataUser?.empresas_detalle?.[0];
      const vars = buildVariables(empleadoFinal, empresaFinal);
      const contenido_html = resolveTemplate(plantillaSeleccionada.contenido_html || "", vars);
      const nombre_documento = `${plantillaSeleccionada.nombre} — ${vars["empleado.nombre"]}`;

      const empresaId = empresa !== "all" ? empresa : dataUser?.empresas?.[0];
      const result = await docGeneradosApi.crear(
        { empresa: empresaId },
        { id_plantilla: plantillaId, id_empleado: empleadoId, nombre_documento, contenido_html, variables_usadas: vars, notas },
      );
      setDocGuardado({ ...result, nombre_documento });
      setPaso(3);
      enqueueSnackbar("Documento generado correctamente", { variant: "success" });
    } catch (err) {
      const msg = err?.response?.data?.error || "Error al generar el documento";
      enqueueSnackbar(msg, { variant: "error" });
    } finally {
      setGenerating(false);
    }
  }, [plantillaId, empleadoId, plantillaSeleccionada, empleadoFinal, empresaData, dataUser, empresa, notas, enqueueSnackbar]);

  /* ─── Descargar PDF ─── */
  const handleDescargarPDF = useCallback(async () => {
    if (!htmlPreview) return;
    const nombreArchivo = docGuardado?.nombre_documento || plantillaSeleccionada?.nombre || "documento";
    try {
      await htmlToPdf(htmlPreview, nombreArchivo);
      enqueueSnackbar("PDF descargado correctamente", { variant: "success" });
    } catch (err) {
      console.error("PDF error:", err);
      enqueueSnackbar("Error al generar el PDF", { variant: "error" });
    }
  }, [htmlPreview, docGuardado, plantillaSeleccionada, enqueueSnackbar]);

  const handleImprimir = () => window.print();

  const puedeAvanzar = [
    Boolean(plantillaId),
    Boolean(empleadoId),
    true,
    true,
  ];

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Generar documento</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Completa los pasos para generar y descargar el documento
            </p>
          </div>
        </div>
        <Stepper paso={paso} />
      </div>

      <AnimatePresence mode="wait">
        {/* ─── PASO 0: Seleccionar plantilla ─── */}
        {paso === 0 && (
          <motion.div key="paso0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-1">Selecciona una plantilla</h2>
              <p className="text-xs text-gray-400 mb-5">Elige la plantilla que deseas usar para generar el documento</p>

              {plantillas.length === 0 ? (
                <div className="flex flex-col items-center py-12 gap-4">
                  <div className="bg-blue-50 p-4 rounded-xl">
                    <FileText className="w-8 h-8 text-[#2563EB]" />
                  </div>
                  <div className="text-center">
                    <p className="text-gray-700 font-medium">No hay plantillas disponibles</p>
                    <p className="text-sm text-gray-400">Crea al menos una plantilla primero</p>
                  </div>
                  <Button
                    variant="outline"
                    className="gap-2 border-[#2563EB] text-[#2563EB]"
                    onClick={() => router.push("/panel/gestion-documental/plantillas")}
                  >
                    Ir a Plantillas
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {plantillas.map((p) => (
                    <button
                      key={p.id_plantilla}
                      type="button"
                      onClick={() => setPlantillaId(String(p.id_plantilla))}
                      className={`text-left rounded-xl border-2 p-4 transition-all duration-150 hover:shadow-md ${
                        plantillaId === String(p.id_plantilla)
                          ? "border-[#2563EB] bg-blue-50 shadow-md"
                          : "border-gray-100 hover:border-blue-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`p-1.5 rounded-lg ${plantillaId === String(p.id_plantilla) ? "bg-[#2563EB]" : "bg-gray-100"}`}>
                          <FileText className={`w-4 h-4 ${plantillaId === String(p.id_plantilla) ? "text-white" : "text-gray-500"}`} />
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORIA_COLORES[p.categoria] || "bg-gray-100 text-gray-600"}`}>
                          {p.categoria}
                        </span>
                      </div>
                      <p className="font-semibold text-sm text-gray-900">{p.nombre}</p>
                      <p className="text-[11px] text-gray-400 font-mono mt-0.5">{p.codigo}</p>
                      {p.descripcion && (
                        <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{p.descripcion}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end mt-4">
              <Button
                className="bg-[#2563EB] hover:bg-blue-700 text-white gap-2"
                disabled={!plantillaId}
                onClick={() => setPaso(1)}
              >
                Siguiente <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* ─── PASO 1: Seleccionar empleado ─── */}
        {paso === 1 && (
          <motion.div key="paso1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-1">Selecciona un empleado</h2>
              <p className="text-xs text-gray-400 mb-4">
                Las variables del documento se llenarán con los datos de este empleado
              </p>

              {/* Unidad de negocio */}
              <div className="mb-4 space-y-1">
                <Label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  Unidad de negocio
                </Label>
                <Combobox
                  options={unidadOptions}
                  value={unidadCalculo}
                  onChange={(val) => {
                    setUnidadCalculo(val);
                  }}
                  placeholder="Selecciona la unidad de negocio..."
                />
                {unidadCalculo && unidadById[unidadCalculo] && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    Empresa: <span className="font-medium text-gray-600">{unidadById[unidadCalculo].empresa_nombre}</span>
                  </p>
                )}
              </div>

              {/* Buscar */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  className="pl-9"
                  placeholder="Buscar empleado por nombre o código..."
                  value={searchEmp}
                  onChange={(e) => setSearchEmp(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                {empleadosFiltrados.map((emp) => (
                  <button
                    key={emp.id_empleado}
                    type="button"
                    onClick={() => setEmpleadoId(String(emp.id_empleado))}
                    className={`text-left flex items-center gap-3 rounded-lg border-2 p-3 transition-all ${
                      empleadoId === String(emp.id_empleado)
                        ? "border-[#2563EB] bg-blue-50"
                        : "border-gray-100 hover:border-blue-200"
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      empleadoId === String(emp.id_empleado) ? "bg-[#2563EB] text-white" : "bg-gray-100 text-gray-600"
                    }`}>
                      {emp.nombre?.[0]}{emp.apellido_paterno?.[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {emp.nombre} {emp.apellido_paterno} {emp.apellido_materno || ""}
                      </p>
                      <p className="text-[11px] text-gray-400">{emp.puesto || emp.departamento || "—"}</p>
                    </div>
                  </button>
                ))}
                {empleadosFiltrados.length === 0 && (
                  <div className="col-span-2 py-8 text-center text-gray-400 text-sm">
                    No se encontraron empleados
                  </div>
                )}
              </div>

              {/* Notas */}
              <div className="mt-5 space-y-1">
                <Label className="text-xs text-gray-600">Notas adicionales (opcional)</Label>
                <Textarea
                  rows={2}
                  placeholder="Observaciones internas sobre este documento..."
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  className="resize-none text-sm"
                />
              </div>
            </div>

            <div className="flex justify-between mt-4">
              <Button variant="outline" onClick={() => setPaso(0)} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Anterior
              </Button>
              <Button
                className="bg-[#2563EB] hover:bg-blue-700 text-white gap-2"
                disabled={!empleadoId || cargandoPlantilla}
                onClick={() => setPaso(2)}
              >
                {cargandoPlantilla
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Cargando plantilla…</>
                  : <>Vista previa <ArrowRight className="w-4 h-4" /></>
                }
              </Button>
            </div>
          </motion.div>
        )}

        {/* ─── PASO 2: Vista previa ─── */}
        {paso === 2 && (
          <motion.div key="paso2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
            {/* Info selección */}
            <div className="flex flex-wrap items-center gap-3 mb-4 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-blue-800">
                <FileText className="w-4 h-4" />
                <span className="font-medium">{plantillaSeleccionada?.nombre}</span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-2 text-sm text-blue-800">
                <User className="w-4 h-4" />
                <span>{empleadoSel?.nombre} {empleadoSel?.apellido_paterno}</span>
              </div>
            </div>

            {/* Documento */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/60">
                <span className="text-xs font-medium text-gray-500">Vista previa del documento</span>
                <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                  Previsualización
                </Badge>
              </div>
              {cargandoPlantilla ? (
                <div className="flex items-center justify-center min-h-[200px] gap-3 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Cargando contenido de la plantilla…</span>
                </div>
              ) : (
                <div
                  className="p-10 text-sm text-gray-800 leading-relaxed min-h-[500px] max-h-[600px] overflow-y-auto prose prose-sm max-w-none"
                  style={{ fontFamily: "Georgia, serif" }}
                  dangerouslySetInnerHTML={{ __html: htmlPreview }}
                />
              )}
            </div>

            <div className="flex justify-between mt-4">
              <Button variant="outline" onClick={() => setPaso(1)} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Anterior
              </Button>
              <Button
                className="bg-[#2563EB] hover:bg-blue-700 text-white gap-2"
                onClick={handleGenerar}
                disabled={generating}
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Generar documento
              </Button>
            </div>
          </motion.div>
        )}

        {/* ─── PASO 3: Listo ─── */}
        {paso === 3 && docGuardado && (
          <motion.div
            key="paso3"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-6 py-10"
          >
            <div className="bg-green-50 p-5 rounded-2xl">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900">¡Documento generado!</h2>
              <p className="text-sm text-gray-500 mt-1">{docGuardado.nombre_documento}</p>
              <Badge variant="outline" className="mt-2 font-mono text-xs border-gray-300">
                {docGuardado.folio}
              </Badge>
            </div>

            {/* Documento para descargar */}
            <div className="w-full max-w-2xl bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div
                ref={previewRef}
                className="p-10 text-sm text-gray-800 leading-relaxed prose prose-sm max-w-none max-h-96 overflow-y-auto"
                style={{ fontFamily: "Georgia, serif" }}
                dangerouslySetInnerHTML={{ __html: htmlPreview }}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 justify-center">
              <Button
                className="bg-[#2563EB] hover:bg-blue-700 text-white gap-2"
                onClick={handleDescargarPDF}
              >
                <Download className="w-4 h-4" />
                Descargar PDF
              </Button>
              <Button variant="outline" className="gap-2" onClick={handleImprimir}>
                <Printer className="w-4 h-4" />
                Imprimir
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => router.push("/panel/gestion-documental/documentos")}
              >
                Ver todos los documentos
              </Button>
              <Button
                variant="ghost"
                className="gap-2 text-gray-500"
                onClick={() => {
                  setPaso(0);
                  setPlantillaId("");
                  setEmpleadoId("");
                  setNotas("");
                  setDocGuardado(null);
                  setUnidadCalculo("");
                }}
              >
                <RefreshCw className="w-4 h-4" />
                Generar otro
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
