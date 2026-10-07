"use client";

import { Suspense, useState, useMemo, useRef, useCallback, useEffect } from "react";
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
import { useRouter, useSearchParams } from "next/navigation";
import { useSnackbar } from "notistack";
import { motion, AnimatePresence } from "framer-motion";
import { htmlToPdf } from "@/lib/htmlToPdf";
import { Combobox } from "@/components/Combobox";
import useUnidadesNegocio from "@/hooks/useUnidadesNegocio";
import CatalogoAdamia from "@/components/documentos/CatalogoAdamia";
import FormularioFormatoRRHH from "@/components/documentos/FormularioFormatoRRHH";
import { obtenerFormatoRRHH, detectarFormatoBase, completarDatosFormato, validarDatosFormato, renderFormatoRRHH, prepararBaseFormato } from "@/lib/documentos/formatosRRHH";
import { empresasDocumentales, escapeDocumentText, guardarCopiaPlantilla } from "@/lib/plantillasAdamia";

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
    "empleado.nombre":        [empleado.nombre, empleado.apellido_paterno, empleado.apellido_materno].filter(Boolean).join(" "),
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
    return v !== undefined && v !== null && v !== "" ? escapeDocumentText(v) : "";
  });
  return limpiarCamposVacios(resolved);
}

/* ─── Stepper ─── */
function Stepper({ paso }) {
  return (
    <div className="flex flex-wrap items-center gap-y-2">
      {PASOS.map((label, i) => (
        <div key={label} className="flex items-center">
          <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-full text-xs font-medium transition-all ${
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
            <div className={`w-2 sm:w-6 h-px mx-1 ${i < paso ? "bg-green-300" : "bg-gray-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Página ─── */
export default function GenerarDocumentoPage() {
  return <Suspense fallback={<p className="p-5 text-sm text-slate-500">Cargando generador...</p>}><GeneradorPorEmpresa /></Suspense>;
}

function GeneradorPorEmpresa() {
  const { dataUser } = useAuth();
  const params = useSearchParams();
  const empresas = empresasDocumentales(dataUser);
  const [elegida, setElegida] = useState("");
  const solicitada = elegida || params.get("empresa");
  const empresa = solicitada || empresas[0]?.id;
  if (!dataUser) return <p className="p-5 text-sm text-slate-500">Cargando sesión...</p>;
  if (!empresas.some((e) => e.id === empresa)) return <p role="alert" className="p-5 text-sm text-red-700">La empresa solicitada no está disponible en tu sesión.</p>;
  return <div className="space-y-5">
    {empresas.length > 1 ? <div className="max-w-sm space-y-1.5"><Label htmlFor="empresa-generador">Empresa del documento</Label><select id="empresa-generador" className="h-10 w-full rounded-md border bg-white px-3 text-sm" value={empresa} onChange={(e) => setElegida(e.target.value)}>{empresas.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></div> : null}
    <GenerarDocumentoContent key={`${empresa}-${params.get("formato") || ""}`} empresa={empresa} formatoInicial={params.get("formato") || ""} plantillaInicial={!elegida ? params.get("plantilla") || "" : ""} codigoInicial={!elegida ? params.get("codigo") || "" : ""} />
  </div>;
}

function GenerarDocumentoContent({ empresa, plantillaInicial, codigoInicial, formatoInicial }) {
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();
  const previewRef = useRef(null);

  const { options: unidadOptions, byId: unidadById } = useUnidadesNegocio();

  const [paso, setPaso] = useState(formatoInicial ? 1 : 0);
  const formatoCatalogo = obtenerFormatoRRHH(formatoInicial);
  const [datosFormato, setDatosFormato] = useState({});
  const [sinAlta, setSinAlta] = useState(false);
  const [nombreCandidato, setNombreCandidato] = useState("");
  const [errorFormato, setErrorFormato] = useState("");
  const [unidadCalculo, setUnidadCalculo] = useState("");
  const [generating, setGenerating] = useState(false);
  const [docGuardado, setDocGuardado] = useState(null);

  /* Selecciones */
  const [plantillaId, setPlantillaId] = useState(plantillaInicial);
  const [plantillaCompleta, setPlantillaCompleta] = useState(null);
  const [cargandoPlantilla, setCargandoPlantilla] = useState(false);
  const [empleadoId, setEmpleadoId] = useState("");
  const [empleadoCompleto, setEmpleadoCompleto] = useState(null);
  const [empresaData, setEmpresaData] = useState(null);
  const [searchEmp, setSearchEmp] = useState("");
  const [busquedaEmpleados, setBusquedaEmpleados] = useState("");
  const [paginaEmpleados, setPaginaEmpleados] = useState(1);
  const [notas, setNotas] = useState("");
  const [codigoFiltro, setCodigoFiltro] = useState(codigoInicial);
  const [erroresDatos, setErroresDatos] = useState({});
  const errorDatos = Object.values(erroresDatos).filter(Boolean).join(" ");
  const generandoRef = useRef(false);

  /* SWR — plantillas activas (lista sin contenido_html para no sobrecargar) */
  const { data: plantillasData, error: errorPlantillas } = useSWR(
    formatoInicial ? null : `/checador/gestion-documental/plantillas?${new URLSearchParams({ empresa, activo: "1", ...(codigoFiltro ? { search: codigoFiltro } : {}) })}`,
    fetcherWithToken,
    { revalidateOnFocus: false },
  );
  const plantillas = plantillasData?.data || [];
  const plantillaResumen = plantillas.find((p) => String(p.id_plantilla) === String(plantillaId));
  const idPlantillaDisponible = plantillaResumen?.id_plantilla;

  /* Cargar plantilla completa (con contenido_html) al seleccionar */
  useEffect(() => {
    let vigente = true;
    setPlantillaCompleta(null);
    setErroresDatos((prev) => ({ ...prev, plantilla: "" }));
    if (!idPlantillaDisponible) {
      setCargandoPlantilla(false);
      return;
    }
    setCargandoPlantilla(true);
    plantillasApi.getById(idPlantillaDisponible)
      .then((data) => {
        if (!vigente) return;
        if (data.id_empresa != null && String(data.id_empresa) !== empresa) throw new Error("La plantilla pertenece a otra empresa.");
        setPlantillaCompleta(data);
      })
      .catch(() => { if (vigente) setErroresDatos((prev) => ({ ...prev, plantilla: "No se pudo cargar la plantilla. Vuelve a seleccionarla o recarga la página." })); })
      .finally(() => { if (vigente) setCargandoPlantilla(false); });
    return () => { vigente = false; };
  }, [idPlantillaDisponible, empresa]);

  const formato = formatoCatalogo || detectarFormatoBase(plantillaCompleta);
  const plantillaSeleccionada = formato || plantillaCompleta || plantillaResumen;
  const baseAlterada = !formato && Boolean(plantillaCompleta?.contenido_html?.includes("<!-- ADAMIA:rh:"));
  const esCandidato = Boolean(formato?.candidato && sinAlta);

  /* Cargar empleado completo (con nómina: sueldo, etc.) al seleccionar */
  useEffect(() => {
    let vigente = true;
    setEmpleadoCompleto(null);
    setErroresDatos((prev) => ({ ...prev, empleado: "" }));
    if (!empleadoId) return;
    axios.get(`/checador/empleados/${empleadoId}`)
      .then((res) => {
        if (!vigente) return;
        if (res.data.id_empresa != null && String(res.data.id_empresa) !== empresa) throw new Error("El empleado pertenece a otra empresa.");
        setEmpleadoCompleto(res.data);
      })
      .catch(() => { if (vigente) setErroresDatos((prev) => ({ ...prev, empleado: "No se pudieron cargar los datos del empleado. Vuelve a seleccionarlo o recarga la página." })); });
    return () => { vigente = false; };
  }, [empleadoId, empresa]);

  /* La empresa del documento es la misma que la de la plantilla y el empleado. */
  useEffect(() => {
    let vigente = true;
    axios.get(`/empresas/${empresa}`)
      .then((res) => { if (vigente) setEmpresaData(res.data); })
      .catch(() => { if (vigente) setErroresDatos((prev) => ({ ...prev, empresa: "No se pudieron cargar los datos de la empresa. Recarga la página antes de generar el documento." })); });
    return () => { vigente = false; };
  }, [empresa]);

  // Búsqueda y paginación de servidor: incluye empleados fuera de las primeras filas.
  useEffect(() => {
    const timer = setTimeout(() => { setBusquedaEmpleados(searchEmp.trim()); setPaginaEmpleados(1); }, 250);
    return () => clearTimeout(timer);
  }, [searchEmp]);
  const { data: empData, error: errorEmpleados, isLoading: cargandoEmpleados } = useSWR(
    `/checador/empleados?${new URLSearchParams({ empresa, limit: "50", page: String(paginaEmpleados), ...(busquedaEmpleados ? { nombre: busquedaEmpleados } : {}) })}`,
    fetcherWithToken,
    { revalidateOnFocus: false },
  );
  const empleados = useMemo(() => Array.isArray(empData?.data) ? empData.data : Array.isArray(empData) ? empData : [], [empData]);
  // empleadoSel: datos del listado (para mostrar nombre/puesto en la UI)
  const empleadoSel = empleados.find((e) => String(e.id_empleado) === String(empleadoId));
  // empleadoFinal: datos completos con nómina para resolver variables
  const empleadoFinal = useMemo(() => esCandidato ? { nombre: nombreCandidato.trim() } : empleadoCompleto || empleadoSel, [esCandidato, nombreCandidato, empleadoCompleto, empleadoSel]);
  const variables = useMemo(() => empleadoFinal ? buildVariables(empleadoFinal, empresaData) : {}, [empleadoFinal, empresaData]);
  const datosCompletos = useMemo(() => formato ? completarDatosFormato(formato, datosFormato, variables) : {}, [formato, datosFormato, variables]);
  const contextoListo = Boolean((formato || plantillaCompleta) && !baseAlterada && (esCandidato ? nombreCandidato.trim() : empleadoCompleto) && empresaData);
  const cambiarEmpleado = (id) => { setEmpleadoId(id); setDatosFormato({}); setErrorFormato(""); setNotas(""); };

  /* ─── Vista previa del documento ─── */
  const htmlPreview = useMemo(() => {
    if (!plantillaSeleccionada || !empleadoFinal) return "";
    if (formato) return renderFormatoRRHH(formato, datosCompletos, variables);
    const contenido = plantillaSeleccionada.contenido_html || "";
    if (!contenido.trim()) return "<p style='color:#9ca3af;'>Esta plantilla no tiene contenido.</p>";
    // Usar exclusivamente los datos cargados de la empresa seleccionada.
    const empresaFinal = empresaData;
    const vars = buildVariables(empleadoFinal, empresaFinal);
    return resolveTemplate(contenido, vars);
  }, [plantillaSeleccionada, empleadoFinal, empresaData, formato, datosCompletos, variables]);

  /* ─── Guardar documento ─── */
  const handleGenerar = useCallback(async () => {
    if (generandoRef.current || !contextoListo) return;
    const invalid = formato ? validarDatosFormato(formato, datosCompletos) : "";
    if (invalid || !variables["empresa.nombre"] || !variables["empleado.nombre"]) {
      setErrorFormato(invalid || "Revisa el nombre de la empresa y de la persona destinataria.");
      return;
    }
    generandoRef.current = true;
    setGenerating(true);
    setErrorFormato("");
    try {
      const contenido_html = formato ? renderFormatoRRHH(formato, datosCompletos, variables) : resolveTemplate(plantillaSeleccionada.contenido_html || "", variables);
      const nombre_documento = `${plantillaSeleccionada.nombre} — ${variables["empleado.nombre"]}`;
      if (esCandidato) {
        setDocGuardado({ nombre_documento, contenido_html, soloPDF: true });
      } else {
        // La plantilla compartida no contiene beneficiarios, series ni datos del documento individual.
        const idBase = formato ? (await guardarCopiaPlantilla(plantillasApi, empresa, prepararBaseFormato(formato))).id_plantilla : plantillaId;
        const result = await docGeneradosApi.crear(
          { empresa },
          { id_plantilla: idBase, id_empleado: empleadoId, nombre_documento, contenido_html, variables_usadas: variables, notas },
        );
        setDocGuardado({ ...result, nombre_documento, contenido_html });
      }
      setPaso(3);
      enqueueSnackbar(esCandidato ? "Documento preparado para descargar" : "Documento generado correctamente", { variant: "success" });
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || "Error al generar el documento";
      setErrorFormato(msg);
      enqueueSnackbar(msg, { variant: "error" });
    } finally {
      setGenerating(false);
      generandoRef.current = false;
    }
  }, [contextoListo, formato, datosCompletos, variables, plantillaSeleccionada, esCandidato, plantillaId, empleadoId, empresa, notas, enqueueSnackbar]);

  /* ─── Descargar PDF ─── */
  const handleDescargarPDF = useCallback(async () => {
    if (!htmlPreview) return;
    const nombreArchivo = docGuardado?.nombre_documento || plantillaSeleccionada?.nombre || "documento";
    try {
      await htmlToPdf(docGuardado?.contenido_html || htmlPreview, nombreArchivo);
      enqueueSnackbar("PDF descargado correctamente", { variant: "success" });
    } catch (err) {
      console.error("PDF error:", err);
      enqueueSnackbar("Error al generar el PDF", { variant: "error" });
    }
  }, [htmlPreview, docGuardado, plantillaSeleccionada, enqueueSnackbar]);

  const handleImprimir = () => window.print();

  if (formatoInicial && !formatoCatalogo) return <p role="alert" className="rounded-lg border p-5 text-sm text-red-700">El formato solicitado no existe. Vuelve al catálogo de Plantillas ADAMIA.</p>;

  return (
    <div className="flex flex-col gap-6 w-full min-w-0 max-w-7xl mx-auto">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{formato?.nombre || "Generar documento"}</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Completa los pasos para generar y descargar el documento
            </p>
          </div>
        </div>
        <Stepper paso={paso} />
      </div>
      {(errorDatos || errorPlantillas) && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorDatos || "No se pudieron cargar las plantillas de la empresa."}</p>}

      {baseAlterada && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Esta base ADAMIA fue modificada. Revisa su contenido en Mis plantillas y restaura la base antes de usar el formulario guiado. Para crear un formato propio, utiliza una nueva plantilla sin el marcador de base ADAMIA.</p>}
      {formato && paso < 3 && <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-600"><p>{formato.aviso || "Revisa el contenido y las condiciones específicas antes de generar y solicitar las firmas."}</p><p>La firma digital del sistema corresponde al empleado. {formato.firmas === "empresa" ? "Este documento requiere la firma del responsable de la empresa; la firma del empleado no la sustituye." : "Completa también la firma del representante de la empresa"}{formato.firmaExtra ? " y de quien recibe el puesto." : formato.firmas !== "empresa" ? "." : ""}</p></div>}
      <AnimatePresence mode="wait">
        {/* ─── PASO 0: Seleccionar plantilla ─── */}
        {paso === 0 && (
          <motion.div key="paso0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
            <div className="mb-6"><CatalogoAdamia compact empresa={empresa} /></div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-1">Selecciona una plantilla</h2>
              <p className="text-xs text-gray-400 mb-5">Elige la plantilla que deseas usar para generar el documento</p>
              {codigoFiltro ? <Button variant="ghost" className="mb-3 text-blue-700" onClick={() => { setCodigoFiltro(""); setPlantillaId(""); }}>Ver todas mis plantillas</Button> : null}

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
                      onClick={() => { setPlantillaId(String(p.id_plantilla)); setDatosFormato({}); setErrorFormato(""); setSinAlta(false); }}
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
                disabled={!plantillaCompleta || cargandoPlantilla || baseAlterada}
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

              {formato?.candidato && <div className="mb-5 space-y-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sinAlta} onChange={(e) => { setSinAlta(e.target.checked); cambiarEmpleado(""); setNombreCandidato(""); }} /> Candidato sin alta en ADAMIA</label>{esCandidato && <div className="space-y-2"><Label htmlFor="nombre-candidato">Nombre completo del candidato</Label><Input id="nombre-candidato" value={nombreCandidato} maxLength={200} onChange={(e) => setNombreCandidato(e.target.value)} /><p className="text-xs leading-5 text-slate-500">Podrás descargar el PDF. Para guardarlo en un expediente y solicitar firma digital, primero registra a la persona como empleado.</p></div>}</div>}
              {!esCandidato && <>
              {!formato && <>
              {/* Unidad de negocio */}
              <div className="mb-4 space-y-1">
                <Label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  Unidad de negocio
                </Label>
                <Combobox
                  options={unidadOptions.filter((item) => String(item.id_empresa) === empresa)}
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

              </>}
              {/* Buscar */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  className="pl-9"
                  placeholder="Buscar empleado por nombre..."
                  aria-label="Buscar empleado por nombre"
                  value={searchEmp}
                  onChange={(e) => setSearchEmp(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                {empleados.map((emp) => (
                  <button
                    key={emp.id_empleado}
                    type="button"
                    onClick={() => cambiarEmpleado(String(emp.id_empleado))}
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
                {empleados.length === 0 && (
                  <div className="col-span-full py-8 text-center text-gray-400 text-sm">
                    {cargandoEmpleados ? "Buscando empleados…" : errorEmpleados ? "No se pudieron cargar los empleados. Intenta de nuevo." : "No se encontraron empleados"}
                  </div>
                )}
              </div>

              {empleadoCompleto && <p className="mt-3 text-xs text-blue-700">Seleccionado: {variables["empleado.nombre"]}</p>}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span>Página {paginaEmpleados}</span><div className="flex gap-2"><Button type="button" variant="ghost" size="sm" disabled={paginaEmpleados <= 1 || cargandoEmpleados} onClick={() => setPaginaEmpleados((p) => p - 1)}>Página anterior</Button><Button type="button" variant="ghost" size="sm" disabled={empleados.length < 50 || cargandoEmpleados} onClick={() => setPaginaEmpleados((p) => p + 1)}>Página siguiente</Button></div></div>
              </>}
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
              <Button variant="outline" onClick={() => formatoInicial ? router.push("/panel/gestion-documental/plantillas") : setPaso(0)} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Anterior
              </Button>
              <Button
                className="bg-[#2563EB] hover:bg-blue-700 text-white gap-2"
                disabled={!contextoListo || cargandoPlantilla}
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
                <span>{variables["empleado.nombre"]}</span>
              </div>
            </div>

            <div className={formato ? "grid items-start gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]" : ""}>
            {formato && <FormularioFormatoRRHH formato={formato} datos={datosCompletos} disabled={generating} onChange={(key, value) => { setDatosFormato((prev) => ({ ...prev, [key]: value })); setErrorFormato(""); }} />}
            {/* Documento */}
            <div className="min-w-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden xl:sticky xl:top-5">
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
                  className="p-4 sm:p-8 text-sm text-gray-800 leading-relaxed min-h-[300px] max-h-[720px] overflow-auto prose prose-sm max-w-none"
                  style={{ fontFamily: "Georgia, serif" }}
                  dangerouslySetInnerHTML={{ __html: htmlPreview }}
                />
              )}
            </div>

            </div>
            {errorFormato && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorFormato}</p>}
            <div className="flex flex-wrap justify-between gap-3 mt-4">
              <Button disabled={generating} variant="outline" onClick={() => setPaso(1)} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Anterior
              </Button>
              <Button
                className="bg-[#2563EB] hover:bg-blue-700 text-white gap-2"
                onClick={handleGenerar}
                disabled={generating || !contextoListo}
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {esCandidato ? "Preparar documento" : "Generar documento"}
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
              <h2 className="text-xl font-bold text-gray-900">{docGuardado.soloPDF ? "Documento preparado" : "¡Documento generado!"}</h2>
              <p className="text-sm text-gray-500 mt-1">{docGuardado.nombre_documento}</p>
              {docGuardado.folio && <Badge variant="outline" className="mt-2 font-mono text-xs border-gray-300">{docGuardado.folio}</Badge>}
              {docGuardado.soloPDF && <p className="mt-2 max-w-xl text-sm text-amber-800">Descarga el PDF antes de salir. Esta propuesta no se ha guardado en un expediente porque el candidato aún no es empleado registrado.</p>}
            </div>

            {/* Documento para descargar */}
            <div className="w-full max-w-2xl bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div
                ref={previewRef}
                className="p-4 sm:p-10 text-sm text-gray-800 leading-relaxed prose prose-sm max-w-none max-h-96 overflow-auto"
                style={{ fontFamily: "Georgia, serif" }}
                dangerouslySetInnerHTML={{ __html: docGuardado.contenido_html }}
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
              {!docGuardado.soloPDF && <Button variant="outline" className="gap-2" onClick={() => router.push(`/panel/gestion-documental/documentos?empresa=${encodeURIComponent(empresa)}`)}>Ver todos los documentos</Button>}
              <Button
                variant="ghost"
                className="gap-2 text-gray-500"
                onClick={() => {
                  setPaso(formatoInicial ? 1 : 0);
                  setDatosFormato({});
                  setErrorFormato("");
                  setSinAlta(false);
                  setNombreCandidato("");
                  setPlantillaId("");
                  setEmpleadoId("");
                  setNotas("");
                  setDocGuardado(null);
                  setUnidadCalculo("");
                  setCodigoFiltro("");
                  setErroresDatos({});
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
