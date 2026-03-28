"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import Cookies from "js-cookie";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import {
  BellRing,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
  MonitorUp,
  Building2,
  MessageCircle,
} from "lucide-react";
import axios from "@/lib/axios";
import { fetcherWithToken, swr_config } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

dayjs.extend(utc);
dayjs.extend(timezone);

const API_PATH = "/checador/mensajes-sistema";
const TZ_MX = "America/Mexico_City";
const ICON_OPTIONS = [
  { value: "", label: "Sin icono" },
  { value: "🎉", label: "Promoción" },
  { value: "📢", label: "Aviso general" },
  { value: "⚠️", label: "Alerta" },
  { value: "🔧", label: "Mantenimiento" },
  { value: "🛠️", label: "Sistema" },
  { value: "🚀", label: "Lanzamiento" },
  { value: "💡", label: "Novedad" },
  { value: "✅", label: "Confirmación" },
  { value: "⏰", label: "Recordatorio" },
  { value: "📌", label: "Importante" },
  { value: "🔥", label: "Urgente" },
];

const URL_OPTIONS = [
  { value: "", label: "Sin enlace" },
  { value: "/contratar-plan", label: "Contratar plan" },
  { value: "/cotiza", label: "Cotiza" },
  { value: "/funcionalidades", label: "Funcionalidades" },
  { value: "/quienes-somos", label: "Sobre nosotros" },
  { value: "/contacto", label: "Contacto" },
  { value: "/login", label: "Iniciar sesión" },
  {
    value: "mailto:soporte@adamia.mx",
    label: "Enviar correo a soporte",
  },
];

const EMPTY_FORM = {
  tipo: "externa",
  formato: "banner",
  titulo: "",
  mensaje: "",
  color_fondo: "#7C3AED",
  color_texto: "#FFFFFF",
  icono: "🎉",
  imagen_url: "",
  boton_texto: "",
  boton_url: "",
  activa: true,
  mostrar_desde: "",
  mostrar_hasta: "",
};

function toDateTimeLocal(value) {
  if (!value) return "";
  const parsed = dayjs.utc(String(value).replace(" ", "T"));
  if (!parsed.isValid()) return "";
  return parsed.tz(TZ_MX).format("YYYY-MM-DDTHH:mm");
}

function toApiPayload(form) {
  const normalizeDateTime = (value) => {
    if (!value) return null;
    // Se envía sin zona; backend lo interpreta como hora CDMX.
    return String(value).replace("T", " ") + ":00";
  };

  return {
    ...form,
    imagen_url: form.imagen_url || null,
    boton_texto: form.boton_texto || null,
    boton_url: form.boton_url || null,
    mostrar_desde: normalizeDateTime(form.mostrar_desde),
    mostrar_hasta: normalizeDateTime(form.mostrar_hasta),
  };
}

function mapToForm(message) {
  return {
    tipo: message.tipo || "externa",
    formato: message.formato || "banner",
    titulo: message.titulo || "",
    mensaje: message.mensaje || "",
    color_fondo: message.color_fondo || "#7C3AED",
    color_texto: message.color_texto || "#FFFFFF",
    icono: message.icono || "",
    imagen_url: message.imagen_url || "",
    boton_texto: message.boton_texto || "",
    boton_url: message.boton_url || "",
    activa: !!message.activa,
    mostrar_desde: toDateTimeLocal(message.mostrar_desde),
    mostrar_hasta: toDateTimeLocal(message.mostrar_hasta),
  };
}

export default function MensajesSistemaPage() {
  const { data, isLoading, mutate } = useSWR(API_PATH, fetcherWithToken, swr_config);
  const mensajes = data || [];

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [waOpen, setWaOpen] = useState(false);
  const [waSending, setWaSending] = useState(false);
  const [waLoadingRecipients, setWaLoadingRecipients] = useState(false);
  const [waRecipients, setWaRecipients] = useState([]);
  const [waMode, setWaMode] = useState("todos");
  const [waSearch, setWaSearch] = useState("");
  const [waSelectedIds, setWaSelectedIds] = useState([]);
  const [waError, setWaError] = useState("");
  const [waResult, setWaResult] = useState(null);
  const [waMessage, setWaMessage] = useState(null);

  const selectedUrlPreset = useMemo(() => {
    const current = form.boton_url || "";
    const preset = URL_OPTIONS.find((option) => option.value === current);
    return preset ? preset.value : "__custom__";
  }, [form.boton_url]);

  const stats = useMemo(() => {
    const total = mensajes.length;
    const activos = mensajes.filter((m) => m.activa).length;
    const externas = mensajes.filter((m) => m.tipo === "externa").length;
    const internas = mensajes.filter((m) => m.tipo === "interna").length;
    return { total, activos, externas, internas };
  }, [mensajes]);

  const filteredRecipients = useMemo(() => {
    const q = waSearch.trim().toLowerCase();
    if (!q) return waRecipients;
    return waRecipients.filter((item) => {
      const name = String(item.nombre_empresa || "").toLowerCase();
      const owner = String(item.nombre_duenio || "").toLowerCase();
      const phone = String(item.celular || "").toLowerCase();
      return name.includes(q) || owner.includes(q) || phone.includes(q);
    });
  }, [waRecipients, waSearch]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError("");
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (message) => {
    setForm(mapToForm(message));
    setEditingId(message.id);
    setError("");
    setOpen(true);
  };

  const tokenHeader = () => ({
    headers: { Authorization: `Bearer ${Cookies.get("token")}` },
  });

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = toApiPayload(form);

      if (editingId) {
        await axios.put(`${API_PATH}/${editingId}`, payload, tokenHeader());
      } else {
        await axios.post(API_PATH, payload, tokenHeader());
      }

      setOpen(false);
      resetForm();
      mutate();
    } catch (e) {
      setError(e.response?.data?.error || "No se pudo guardar el mensaje.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await axios.delete(`${API_PATH}/${deleting}`, tokenHeader());
      setDeleting(null);
      mutate();
    } catch {
      setDeleting(null);
    }
  };

  const handleToggle = async (id, activa) => {
    try {
      await axios.patch(`${API_PATH}/${id}/estado`, { activa }, tokenHeader());
      mutate();
    } catch {
      // Se mantiene silencioso para no interrumpir el flujo de configuración.
    }
  };

  const loadRecipients = async () => {
    setWaLoadingRecipients(true);
    setWaError("");
    try {
      const response = await axios.get(
        `${API_PATH}/whatsapp/destinatarios`,
        tokenHeader(),
      );
      setWaRecipients(Array.isArray(response?.data) ? response.data : []);
    } catch (e) {
      setWaRecipients([]);
      setWaError(
        e?.response?.data?.error || "No se pudo cargar el listado de destinatarios.",
      );
    } finally {
      setWaLoadingRecipients(false);
    }
  };

  const openWhatsAppDialog = async (message) => {
    setWaMessage(message);
    setWaMode("todos");
    setWaSearch("");
    setWaSelectedIds([]);
    setWaResult(null);
    setWaError("");
    setWaOpen(true);
    await loadRecipients();
  };

  const toggleCompany = (id) => {
    setWaSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const selectAllFiltered = () => {
    const ids = filteredRecipients.map((item) => item.id_empresa);
    setWaSelectedIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const clearSelected = () => setWaSelectedIds([]);

  const sendWhatsApp = async () => {
    if (!waMessage?.id) return;
    if (waMode === "seleccionados" && waSelectedIds.length === 0) {
      setWaError("Debes elegir al menos una empresa para el envío.");
      return;
    }

    setWaSending(true);
    setWaError("");
    setWaResult(null);
    try {
      const payload =
        waMode === "seleccionados"
          ? { modo: waMode, empresa_ids: waSelectedIds }
          : { modo: waMode };
      const response = await axios.post(
        `${API_PATH}/${waMessage.id}/enviar-whatsapp`,
        payload,
        tokenHeader(),
      );
      setWaResult(response?.data || null);
    } catch (e) {
      setWaError(
        e?.response?.data?.error || "No fue posible enviar el mensaje por WhatsApp.",
      );
    } finally {
      setWaSending(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-4 sm:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#2563EB] p-2.5 rounded-lg">
              <BellRing className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Mensajes del sistema</h1>
              <p className="text-sm text-gray-600">
                Configura mensajes para la landing (externa) y para el panel interno.
              </p>
            </div>
          </div>

          <Button
            onClick={openCreate}
            className="bg-[#2563EB] hover:bg-[#1d4ed8] w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo mensaje
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <SimpleStat title="Total" value={stats.total} />
        <SimpleStat title="Activos" value={stats.activos} />
        <SimpleStat title="Externos" value={stats.externas} />
        <SimpleStat title="Internos" value={stats.internas} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mensajes configurados</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-gray-500">Cargando mensajes...</p>
          ) : mensajes.length === 0 ? (
            <p className="text-sm text-gray-500">Aún no hay mensajes creados.</p>
          ) : (
            <div className="space-y-3">
              {mensajes.map((m) => (
                <div key={m.id} className="rounded-xl border p-3 sm:p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{m.titulo}</span>
                        <Badge variant="outline">
                          {m.tipo === "externa" ? (
                            <span className="inline-flex items-center gap-1">
                              <MonitorUp className="h-3.5 w-3.5" />
                              Externa
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <Building2 className="h-3.5 w-3.5" />
                              Interna
                            </span>
                          )}
                        </Badge>
                        <Badge variant="secondary">{m.formato}</Badge>
                      </div>
                      <p className="text-sm text-gray-600">{m.mensaje}</p>
                    </div>

                    <div className="w-full md:w-auto space-y-2">
                      <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 md:border-none md:px-0 md:py-0">
                        <span className="text-xs font-semibold text-slate-600 md:hidden">
                          Activo
                        </span>
                        <Switch
                          checked={!!m.activa}
                          onCheckedChange={(val) => handleToggle(m.id, val)}
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-2 md:justify-end">
                        <Button
                          variant="outline"
                          onClick={() => openWhatsAppDialog(m)}
                          className="w-full sm:w-auto"
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Enviar WhatsApp
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => openEdit(m)}
                          className="w-full sm:w-auto"
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => setDeleting(m.id)}
                          className="w-full sm:w-auto"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar mensaje" : "Crear mensaje del sistema"}
            </DialogTitle>
            <DialogDescription>
              Define dónde aparece, diseño visual, colores y ventana de publicación.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Tipo">
              <select
                className="w-full border rounded-md h-10 px-3 text-sm"
                value={form.tipo}
                onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
              >
                <option value="externa">Externa (landing)</option>
                <option value="interna">Interna (panel)</option>
              </select>
            </Field>

            <Field label="Formato">
              <select
                className="w-full border rounded-md h-10 px-3 text-sm"
                value={form.formato}
                onChange={(e) => setForm((f) => ({ ...f, formato: e.target.value }))}
              >
                <option value="banner">Banner (tarjeta)</option>
                <option value="banda">Banda (tira superior)</option>
              </select>
            </Field>

            <Field label="Título">
              <Input
                value={form.titulo}
                onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                placeholder="Promoción de septiembre"
              />
            </Field>

            <Field label="Icono">
              <div className="space-y-2">
                <select
                  className="w-full border rounded-md h-10 px-3 text-sm"
                  value={form.icono}
                  onChange={(e) => setForm((f) => ({ ...f, icono: e.target.value }))}
                >
                  {ICON_OPTIONS.map((option) => (
                    <option key={option.label} value={option.value}>
                      {option.value ? `${option.value} ${option.label}` : option.label}
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                  {ICON_OPTIONS.filter((i) => i.value).map((option) => {
                    const selected = form.icono === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        title={option.label}
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            icono: option.value,
                          }))
                        }
                        className={`h-9 rounded-md border text-lg transition ${
                          selected
                            ? "border-blue-600 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        {option.value}
                      </button>
                    );
                  })}
                </div>
              </div>
            </Field>

            <div className="md:col-span-2">
              <Field label="Mensaje">
                <Textarea
                  value={form.mensaje}
                  onChange={(e) => setForm((f) => ({ ...f, mensaje: e.target.value }))}
                  rows={3}
                  placeholder="Texto principal del mensaje..."
                />
              </Field>
            </div>

            <Field label="Color fondo">
              <div className="flex items-center gap-2">
                <Input
                  value={form.color_fondo}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, color_fondo: e.target.value }))
                  }
                />
                <input
                  type="color"
                  value={form.color_fondo}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, color_fondo: e.target.value }))
                  }
                  className="h-10 w-12 rounded border"
                />
              </div>
            </Field>

            <Field label="Color texto">
              <div className="flex items-center gap-2">
                <Input
                  value={form.color_texto}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, color_texto: e.target.value }))
                  }
                />
                <input
                  type="color"
                  value={form.color_texto}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, color_texto: e.target.value }))
                  }
                  className="h-10 w-12 rounded border"
                />
              </div>
            </Field>

            <Field label="Imagen URL (opcional)">
              <div className="space-y-2">
                <Input
                  value={form.imagen_url}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, imagen_url: e.target.value }))
                  }
                  placeholder="https://..."
                />
                <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900 leading-relaxed">
                  <strong>Recomendación visual para banner:</strong> usa imagen
                  horizontal <strong>16:9</strong> (ideal{" "}
                  <strong>1200x675 px</strong>), formato <strong>JPG o WEBP</strong>{" "}
                  y peso menor a <strong>300 KB</strong> para que cargue rápido y
                  se vea estético.
                </div>
              </div>
            </Field>

            <Field label="Texto botón (opcional)">
              <Input
                value={form.boton_texto}
                onChange={(e) =>
                  setForm((f) => ({ ...f, boton_texto: e.target.value }))
                }
                placeholder="Aprovechar descuento"
              />
            </Field>

            <Field label="URL botón (opcional)">
              <div className="space-y-2">
                <select
                  className="w-full border rounded-md h-10 px-3 text-sm"
                  value={selectedUrlPreset}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "__custom__") return;
                    setForm((f) => ({ ...f, boton_url: value }));
                  }}
                >
                  {URL_OPTIONS.map((option) => (
                    <option key={option.label} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                  <option value="__custom__">URL personalizada...</option>
                </select>

                <Input
                  value={form.boton_url}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, boton_url: e.target.value }))
                  }
                  placeholder="/contratar-plan o https://..."
                />

                <p className="text-xs text-gray-500">
                  Tip: usa{" "}
                  <code className="rounded bg-gray-100 px-1 py-0.5">
                    mailto:soporte@adamia.mx
                  </code>{" "}
                  para abrir el correo a soporte.
                </p>
              </div>
            </Field>

            <Field label="Mostrar desde">
              <Input
                type="datetime-local"
                value={form.mostrar_desde}
                onChange={(e) =>
                  setForm((f) => ({ ...f, mostrar_desde: e.target.value }))
                }
              />
            </Field>

            <Field label="Mostrar hasta">
              <Input
                type="datetime-local"
                value={form.mostrar_hasta}
                onChange={(e) =>
                  setForm((f) => ({ ...f, mostrar_hasta: e.target.value }))
                }
              />
            </Field>

            <div className="md:col-span-2 rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Switch
                  checked={!!form.activa}
                  onCheckedChange={(val) => setForm((f) => ({ ...f, activa: val }))}
                />
                <span className="text-sm font-medium">Mensaje activo</span>
              </div>
            </div>

            <div className="md:col-span-2">
              <Field label="Vista previa">
                <MessagePreview form={form} />
              </Field>
            </div>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
              className="w-full sm:w-auto"
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#2563EB] hover:bg-[#1d4ed8] w-full sm:w-auto"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={waOpen} onOpenChange={setWaOpen}>
        <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enviar mensaje por WhatsApp</DialogTitle>
            <DialogDescription>
              {waMessage?.titulo
                ? `Mensaje seleccionado: "${waMessage.titulo}".`
                : "Selecciona destinatarios para enviar este mensaje por WhatsApp."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setWaMode("todos")}
                className={`rounded-lg border px-4 py-3 text-left text-sm transition ${
                  waMode === "todos"
                    ? "border-blue-600 bg-blue-50 text-blue-900"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <p className="font-semibold">Enviar a todos</p>
                <p className="text-xs opacity-80">
                  Empresas activas con teléfono registrado.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setWaMode("seleccionados")}
                className={`rounded-lg border px-4 py-3 text-left text-sm transition ${
                  waMode === "seleccionados"
                    ? "border-blue-600 bg-blue-50 text-blue-900"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <p className="font-semibold">Elegir destinatarios</p>
                <p className="text-xs opacity-80">
                  Selecciona empresas específicas para este envío.
                </p>
              </button>
            </div>

            <div className="rounded-lg border p-3 bg-slate-50">
              <p className="text-xs text-gray-600">
                Destinatarios disponibles:{" "}
                <strong>{waRecipients.length}</strong> | Seleccionados:{" "}
                <strong>{waSelectedIds.length}</strong>
              </p>
            </div>

            {waMode === "seleccionados" ? (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder="Buscar por empresa, dueño o teléfono..."
                    value={waSearch}
                    onChange={(e) => setWaSearch(e.target.value)}
                  />
                  <Button type="button" variant="outline" onClick={selectAllFiltered}>
                    Seleccionar visibles
                  </Button>
                  <Button type="button" variant="outline" onClick={clearSelected}>
                    Limpiar
                  </Button>
                </div>

                <div className="max-h-64 overflow-y-auto rounded-lg border bg-white">
                  {waLoadingRecipients ? (
                    <p className="p-3 text-sm text-gray-500">Cargando empresas...</p>
                  ) : filteredRecipients.length === 0 ? (
                    <p className="p-3 text-sm text-gray-500">
                      No hay coincidencias para la búsqueda.
                    </p>
                  ) : (
                    <div className="divide-y">
                      {filteredRecipients.map((item) => {
                        const checked = waSelectedIds.includes(item.id_empresa);
                        return (
                          <label
                            key={item.id_empresa}
                            className="flex items-start gap-3 p-3 text-sm cursor-pointer hover:bg-slate-50"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleCompany(item.id_empresa)}
                              className="mt-0.5"
                            />
                            <div>
                              <p className="font-medium text-gray-900">
                                {item.nombre_empresa}
                              </p>
                              <p className="text-xs text-gray-600">
                                {item.nombre_duenio || "Sin dueño"} - {item.celular}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {waError ? (
              <p className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {waError}
              </p>
            ) : null}

            {waResult ? (
              <div className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800 space-y-1">
                <p>
                  Enviados: <strong>{waResult.enviados}</strong> /{" "}
                  {waResult.total_objetivo}
                </p>
                <p>
                  Fallidos: <strong>{waResult.fallidos}</strong>
                </p>
                {Array.isArray(waResult.errores) && waResult.errores.length > 0 ? (
                  <div className="max-h-24 overflow-y-auto rounded bg-white/70 p-2 text-xs">
                    {waResult.errores.map((err) => (
                      <p key={`${err.id_empresa}-${err.empresa}`}>
                        {err.empresa}: {err.error}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setWaOpen(false)}
              disabled={waSending}
              className="w-full sm:w-auto"
            >
              Cerrar
            </Button>
            <Button
              onClick={sendWhatsApp}
              disabled={waSending || waLoadingRecipients}
              className="bg-[#2563EB] hover:bg-[#1d4ed8] w-full sm:w-auto"
            >
              {waSending ? "Enviando..." : "Enviar mensaje"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar mensaje</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará definitivamente el mensaje seleccionado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function SimpleStat({ title, value }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-xs uppercase tracking-wide text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

function MessagePreview({ form }) {
  const style = {
    backgroundColor: form.color_fondo || "#7C3AED",
    color: form.color_texto || "#FFFFFF",
  };

  const tituloPreview = form.titulo?.trim() || "Título del mensaje";
  const mensajePreview =
    form.mensaje?.trim() || "Aquí se mostrará el contenido del mensaje.";
  const ctaPreview = form.boton_texto?.trim();

  if (form.formato === "banda") {
    return (
      <div
        className="rounded-lg border border-white/20 px-3 py-2 shadow-sm"
        style={style}
      >
        <div className="flex items-center gap-2 text-sm">
          <span>{form.icono || "•"}</span>
          <span className="font-semibold truncate">{tituloPreview}</span>
          <span className="opacity-90 truncate">{mensajePreview}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden border shadow-sm">
      <div className="h-24 bg-gray-100">
        {form.imagen_url ? (
          <div
            className="h-full w-full bg-cover bg-center"
            style={{ backgroundImage: `url('${form.imagen_url}')` }}
          />
        ) : null}
      </div>
      <div className="p-4 space-y-3" style={style}>
        <div className="text-xs uppercase tracking-wide font-semibold opacity-90">
          Anuncio importante
        </div>
        <div className="text-lg font-bold leading-tight">
          {form.icono ? `${form.icono} ` : ""}
          {tituloPreview}
        </div>
        <p className="text-sm opacity-95">{mensajePreview}</p>
        {ctaPreview ? (
          <div className="flex justify-center pt-1">
            <button
              type="button"
              className="h-10 rounded-xl bg-white px-6 text-sm font-bold text-slate-800 shadow"
            >
              {ctaPreview}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
