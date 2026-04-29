"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { plantillasApi, iaApi } from "@/lib/gestionDocumentalApi";
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
import {
  ArrowLeft,
  Save,
  Eye,
  EyeOff,
  Tag,
  Info,
  Loader2,
  FileText,
  Wand2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import { useSnackbar } from "notistack";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Variables disponibles del sistema ─── */
const VARIABLES_SISTEMA = [
  {
    grupo: "Empleado",
    vars: [
      "empleado.nombre", "empleado.codigo", "empleado.puesto",
      "empleado.departamento", "empleado.fecha_ingreso", "empleado.salario",
      "empleado.email", "empleado.telefono", "empleado.rfc", "empleado.curp",
    ],
  },
  {
    grupo: "Empresa",
    vars: [
      "empresa.nombre", "empresa.representante",
    ],
  },
  {
    grupo: "Fecha",
    vars: ["fecha.dia", "fecha.mes", "fecha.anio", "fecha.completa"],
  },
];

const CATEGORIAS = [
  { value: "Laboral",        label: "Laboral" },
  { value: "Administrativo", label: "Administrativo" },
  { value: "Legal",          label: "Legal" },
  { value: "RRHH",           label: "RRHH" },
  { value: "Otro",           label: "Otro" },
];

/* ─── Barra de herramientas del editor ─── */
const HERRAMIENTAS = [
  { cmd: "undo",                label: "↩" },
  { cmd: "redo",                label: "↪" },
  { cmd: "separator" },
  { cmd: "h1",                  label: "H1", tag: "h1" },
  { cmd: "h2",                  label: "H2", tag: "h2" },
  { cmd: "h3",                  label: "H3", tag: "h3" },
  { cmd: "separator" },
  { cmd: "bold",                label: "B",  className: "font-bold" },
  { cmd: "italic",              label: "I",  className: "italic" },
  { cmd: "underline",           label: "U",  className: "underline" },
  { cmd: "strikeThrough",       label: "S",  className: "line-through" },
  { cmd: "separator" },
  { cmd: "insertUnorderedList", label: "≡•" },
  { cmd: "insertOrderedList",   label: "≡1" },
  { cmd: "separator" },
  { cmd: "justifyLeft",         label: "⬛◻◻" },
  { cmd: "justifyCenter",       label: "◻⬛◻" },
  { cmd: "justifyRight",        label: "◻◻⬛" },
  { cmd: "justifyFull",         label: "⬛⬛⬛" },
  { cmd: "separator" },
  { cmd: "removeFormat",        label: "Tx" },
  { cmd: "insertHorizontalRule", label: "—" },
];

function EditorToolbar({ editorRef }) {
  const exec = (cmd, tag) => {
    editorRef.current?.focus();
    if (tag) {
      document.execCommand("formatBlock", false, tag);
    } else {
      document.execCommand(cmd, false, null);
    }
  };

  return (
    /* overflow-x-auto permite scroll horizontal en móvil sin romper el layout */
    <div className="overflow-x-auto">
      <div className="flex items-center gap-0.5 p-2 border-b border-gray-100 bg-gray-50/80 min-w-max">
        {HERRAMIENTAS.map((h, i) =>
          h.cmd === "separator" ? (
            <div key={`sep-${i}`} className="w-px h-5 bg-gray-200 mx-1 shrink-0" />
          ) : (
            <button
              key={h.cmd}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); exec(h.cmd, h.tag); }}
              className={`px-2 py-1 text-xs rounded hover:bg-white hover:shadow-sm transition-all text-gray-700 select-none shrink-0 ${h.className || ""}`}
            >
              {h.label}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

/* ─── Chip de variable ─── */
function VariableChip({ variable, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(variable)}
      className="inline-flex items-center gap-1 text-xs font-mono bg-blue-50 hover:bg-blue-100 text-[#2563EB] border border-blue-200 rounded-md px-2 py-0.5 transition-colors"
      title={`Insertar {{${variable}}}`}
    >
      <Tag className="w-3 h-3" />
      {variable}
    </button>
  );
}

/* ─── Panel Variables Disponibles (desplegable) ─── */
function PanelVariables({ onInsert }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header toggle — mismo patrón que PanelIA */}
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="bg-blue-50 p-1.5 rounded-lg">
            <Wand2 className="w-4 h-4 text-[#2563EB]" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-800">Variables disponibles</p>
            <p className="text-[11px] text-blue-500">Clic para insertar en el documento</p>
          </div>
        </div>
        {abierto
          ? <ChevronUp className="w-4 h-4 text-gray-400" />
          : <ChevronDown className="w-4 h-4 text-gray-400" />
        }
      </button>

      <AnimatePresence>
        {abierto && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 flex flex-col gap-3 border-t border-gray-100">
              <p className="text-[11px] text-gray-400 mt-3">
                Toca una variable para insertarla automáticamente en el cursor del editor.
              </p>
              {VARIABLES_SISTEMA.map((grupo) => (
                <div key={grupo.grupo}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                    {grupo.grupo}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {grupo.vars.map((v) => (
                      <VariableChip key={v} variable={v} onClick={onInsert} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Panel Asistente IA ─── */
function PanelIA({ onApply, categoria, nombre }) {
  const { enqueueSnackbar } = useSnackbar();
  const [abierto, setAbierto] = useState(false);
  const [descripcion, setDescripcion] = useState("");
  const [generando, setGenerando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const ejemplos = [
    "Carta de trabajo que certifique que el empleado labora en la empresa con su puesto y salario",
    "Carta de constancia de empleo para trámites bancarios",
  ];

  const handleGenerar = async () => {
    if (!descripcion.trim()) return;
    setGenerando(true);
    setResultado(null);
    try {
      const data = await iaApi.generarPlantilla({ descripcion, categoria, nombre });
      setResultado(data);
    } catch (err) {
      const msg = err?.response?.data?.error || "Error al conectar con la IA";
      enqueueSnackbar(msg, { variant: "error" });
    } finally {
      setGenerando(false);
    }
  };

  const handleAplicar = () => {
    if (resultado?.html) {
      onApply(resultado.html, resultado.variables || "");
      setResultado(null);
      setDescripcion("");
      enqueueSnackbar("Contenido de IA aplicado al editor", { variant: "success" });
    }
  };

  return (
    <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-purple-100 shadow-sm overflow-hidden">
      {/* Header toggle */}
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-purple-50/80 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="bg-purple-100 p-1.5 rounded-lg">
            <Sparkles className="w-4 h-4 text-[#7c3aed]" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-800">Asistente IA</p>
            <p className="text-[11px] text-purple-500">Genera la plantilla automáticamente</p>
          </div>
        </div>
        {abierto
          ? <ChevronUp className="w-4 h-4 text-purple-400" />
          : <ChevronDown className="w-4 h-4 text-purple-400" />
        }
      </button>

      <AnimatePresence>
        {abierto && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 flex flex-col gap-3 border-t border-purple-100">
              {/* Ejemplos rápidos */}
              <div className="mt-3">
                <p className="text-[11px] font-semibold text-purple-500 uppercase tracking-wider mb-2">
                  Ejemplos rápidos
                </p>
                <div className="flex flex-col gap-1.5">
                  {ejemplos.map((ej) => (
                    <button
                      key={ej}
                      type="button"
                      onClick={() => setDescripcion(ej)}
                      className="text-left text-xs text-gray-600 bg-white/70 hover:bg-white border border-purple-100 rounded-lg px-3 py-2 transition-colors line-clamp-2"
                    >
                      {ej}
                    </button>
                  ))}
                </div>
              </div>

              {/* Campo de descripción */}
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-600 font-medium">
                  Describe qué documento necesitas
                </Label>
                <Textarea
                  placeholder="Ej: Carta de trabajo formal que certifique el puesto, salario y antigüedad del empleado para trámites externos..."
                  rows={4}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="resize-none text-sm bg-white border-purple-200 focus-visible:ring-purple-400"
                />
                <p className="text-[10px] text-gray-400">
                  Sé específico. La IA usará las variables disponibles automáticamente.
                </p>
              </div>

              <Button
                type="button"
                onClick={handleGenerar}
                disabled={generando || !descripcion.trim()}
                className="w-full bg-[#7c3aed] hover:bg-purple-700 text-white gap-2"
              >
                {generando
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando...</>
                  : <><Sparkles className="w-4 h-4" /> Generar con IA</>
                }
              </Button>

              {/* Vista previa del resultado IA */}
              <AnimatePresence>
                {resultado && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col gap-2"
                  >
                    <div className="bg-white rounded-lg border border-purple-200 p-3 max-h-48 overflow-y-auto">
                      <p className="text-[10px] font-semibold text-purple-500 uppercase tracking-wider mb-2">
                        Vista previa del resultado
                      </p>
                      <div
                        className="text-xs text-gray-700 prose prose-xs max-w-none"
                        dangerouslySetInnerHTML={{ __html: resultado.html }}
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={handleAplicar}
                      variant="outline"
                      className="w-full border-purple-300 text-purple-700 hover:bg-purple-50 gap-2"
                    >
                      <Wand2 className="w-4 h-4" />
                      Aplicar al editor
                    </Button>
                    <p className="text-[10px] text-amber-600 flex items-start gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                      Esto reemplazará el contenido actual del editor
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Página principal ─── */
export default function EditorPlantillaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { dataUser } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const id = searchParams.get("id");
  const esEdicion = Boolean(id);

  const editorRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(esEdicion);
  const [preview, setPreview] = useState(false);

  const [form, setForm] = useState({
    codigo: "",
    nombre: "",
    descripcion: "",
    categoria: "Laboral",
    variables: "",
    contenido_html: "",
  });

  const setField = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  /* ─── Sincronizar estado → DOM cuando se monta el editor ─── */
  // Se dispara cada vez que `preview` cambia de true→false (re-mount del div editable)
  useEffect(() => {
    if (!preview && editorRef.current) {
      editorRef.current.innerHTML = form.contenido_html || "";
    }
    // Solo cuando cambia preview; no incluir form.contenido_html para no sobreescribir el cursor
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview]);

  /* ─── Cargar plantilla al editar ─── */
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    plantillasApi.getById(id)
      .then((data) => {
        const html = data.contenido_html || "";
        setForm({
          codigo:         data.codigo || "",
          nombre:         data.nombre || "",
          descripcion:    data.descripcion || "",
          categoria:      data.categoria || "Laboral",
          variables:      data.variables || "",
          contenido_html: html,
        });
      })
      .catch(() => enqueueSnackbar("Error al cargar la plantilla", { variant: "error" }))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* Cuando termina de cargar, inyectar HTML en el editor */
  useEffect(() => {
    if (!loading && editorRef.current && form.contenido_html) {
      editorRef.current.innerHTML = form.contenido_html;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  /* ─── Insertar variable en el cursor del editor ─── */
  const insertarVariable = useCallback((variable) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    document.execCommand("insertText", false, `{{${variable}}}`);
    // Sincronizar explícitamente el estado tras el execCommand
    const nuevoHtml = el.innerHTML;
    setForm((prev) => {
      const existentes = prev.variables
        ? prev.variables.split(",").map((v) => v.trim()).filter(Boolean)
        : [];
      const vars = existentes.includes(variable)
        ? prev.variables
        : [...existentes, variable].join(", ");
      return { ...prev, variables: vars, contenido_html: nuevoHtml };
    });
  }, []);

  /* ─── Aplicar HTML generado por IA ─── */
  const aplicarIA = useCallback((html, variables) => {
    if (editorRef.current) {
      editorRef.current.innerHTML = html;
    }
    setForm((prev) => ({
      ...prev,
      contenido_html: html,
      variables: variables || prev.variables,
    }));
  }, []);

  /* ─── Guardar ─── */
  const handleSave = useCallback(async () => {
    // Leer directamente del DOM para capturar el estado más reciente
    const contenido_html = editorRef.current?.innerHTML || form.contenido_html;
    if (!form.codigo.trim() || !form.nombre.trim() || !form.categoria) {
      enqueueSnackbar("Completa los campos requeridos: código, nombre y categoría", { variant: "warning" });
      return;
    }
    if (!contenido_html.trim() || contenido_html === "<br>") {
      enqueueSnackbar("El contenido del documento no puede estar vacío", { variant: "warning" });
      return;
    }

    setSaving(true);
    const payload = { ...form, contenido_html };
    const empresa = dataUser?.empresas?.[0] || "all";

    try {
      if (esEdicion) {
        await plantillasApi.actualizar(id, payload);
        enqueueSnackbar("Plantilla actualizada correctamente", { variant: "success" });
      } else {
        await plantillasApi.crear({ empresa }, payload);
        enqueueSnackbar("Plantilla creada correctamente", { variant: "success" });
      }
      router.push("/panel/gestion-documental/plantillas");
    } catch (err) {
      const msg = err?.response?.data?.error || "Error al guardar la plantilla";
      enqueueSnackbar(msg, { variant: "error" });
    } finally {
      setSaving(false);
    }
  }, [form, esEdicion, id, dataUser, enqueueSnackbar, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      {/* ── Header — responsive: en móvil apila título y botones ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2 truncate">
              <FileText className="w-5 h-5 text-[#2563EB] shrink-0" />
              {esEdicion ? "Editar plantilla" : "Nueva plantilla"}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">
              Usa{" "}
              <code className="bg-blue-50 text-[#2563EB] px-1 rounded font-mono text-xs">
                {"{{variable}}"}
              </code>{" "}
              para insertar datos dinámicos
            </p>
          </div>
        </div>

        {/* Botones: en móvil ocupan todo el ancho dividido en dos columnas */}
        <div className="flex items-center gap-2 sm:shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 flex-1 sm:flex-none"
            onClick={() => {
              if (!preview && editorRef.current) {
                setField("contenido_html", editorRef.current.innerHTML);
              }
              setPreview((v) => !v);
            }}
          >
            {preview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span className="hidden xs:inline">{preview ? "Editar" : "Vista previa"}</span>
            <span className="xs:hidden">{preview ? "Editar" : "Preview"}</span>
          </Button>
          <Button
            size="sm"
            className="bg-[#2563EB] hover:bg-blue-700 text-white gap-1.5 flex-1 sm:flex-none"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Panel izquierdo ── */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-1 flex flex-col gap-4"
        >
          {/* Información */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Info className="w-4 h-4 text-[#2563EB]" />
              Información
            </h2>

            <div className="space-y-1">
              <Label htmlFor="codigo" className="text-xs text-gray-600">
                Código <span className="text-red-500">*</span>
              </Label>
              <Input
                id="codigo"
                placeholder="ej: carta_trabajo"
                value={form.codigo}
                onChange={(e) =>
                  setField("codigo", e.target.value.toLowerCase().replace(/\s+/g, "_"))
                }
                className="font-mono text-sm"
              />
              <p className="text-[10px] text-gray-400">Sin espacios. Ej: carta_trabajo</p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="nombre" className="text-xs text-gray-600">
                Nombre <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nombre"
                placeholder="ej: Carta de Trabajo"
                value={form.nombre}
                onChange={(e) => setField("nombre", e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="categoria" className="text-xs text-gray-600">
                Categoría <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.categoria}
                onValueChange={(v) => setField("categoria", v)}
              >
                <SelectTrigger id="categoria">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="descripcion" className="text-xs text-gray-600">
                Descripción
              </Label>
              <Textarea
                id="descripcion"
                placeholder="Describe para qué se usa esta plantilla..."
                rows={2}
                value={form.descripcion}
                onChange={(e) => setField("descripcion", e.target.value)}
                className="resize-none text-sm"
              />
            </div>
          </div>

          {/* Panel IA */}
          <PanelIA
            onApply={aplicarIA}
            categoria={form.categoria}
            nombre={form.nombre}
          />

          {/* Variables disponibles — panel desplegable */}
          <PanelVariables onInsert={insertarVariable} />
        </motion.div>

        {/* ── Panel derecho: editor ── */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2"
        >
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col min-h-[400px] sm:min-h-[600px]">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">
                Contenido del documento{" "}
                <span className="text-red-500">*</span>
              </h2>
              {preview && (
                <Badge
                  variant="secondary"
                  className="text-[10px] bg-amber-50 text-amber-700 border-amber-200"
                >
                  Modo vista previa
                </Badge>
              )}
            </div>

            {/* Editor editable — siempre en el DOM, visible/oculto con CSS para no perder contenido */}
            <div className={preview ? "hidden" : "flex flex-col flex-1"}>
              <EditorToolbar editorRef={editorRef} />
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                className="flex-1 p-4 sm:p-5 text-sm text-gray-800 leading-relaxed focus:outline-none min-h-[320px] sm:min-h-[500px]"
                style={{ fontFamily: "Georgia, serif" }}
                onInput={(e) => {
                  // Sincronizar siempre que el usuario escribe
                  setField("contenido_html", e.currentTarget.innerHTML);
                }}
              />
            </div>

            {/* Vista previa */}
            {preview && (
              <div
                className="flex-1 p-4 sm:p-8 text-sm text-gray-800 leading-relaxed prose prose-sm max-w-none"
                style={{ fontFamily: "Georgia, serif" }}
                dangerouslySetInnerHTML={{
                  __html: form.contenido_html.replace(
                    /\{\{([^}]+)\}\}/g,
                    '<span class="bg-blue-100 text-blue-700 px-1 rounded font-mono text-xs border border-blue-200">{{$1}}</span>',
                  ),
                }}
              />
            )}
          </div>

          <p className="text-xs text-gray-400 mt-2 px-1">
            💡 Las variables{" "}
            <code className="bg-gray-100 px-1 rounded font-mono">
              {"{{empleado.nombre}}"}
            </code>{" "}
            se reemplazan automáticamente al generar el documento.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
