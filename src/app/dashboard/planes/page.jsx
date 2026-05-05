"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcherWithToken } from "@/lib/fetcher";
import axiosInstance from "@/lib/axios";
import Cookies from "js-cookie";
import { enqueueSnackbar } from "notistack";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import LoadingTable from "@/components/LoadingTable";
import ErrorPage from "@/components/ErrorPage";
import {
  Plus,
  Pencil,
  Trash2,
  CreditCard,
  Users,
  Link2,
  CheckCircle2,
  Copy,
  DollarSign,
  ReceiptText,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function labelPlan(plan) {
  if (!plan) return "—";
  const min = plan.usuarios_min ?? plan.plan_usuarios_min;
  const max = plan.usuarios_max ?? plan.plan_usuarios_max;
  if (min != null && max != null) return `${min} – ${max} empleados`;
  if (max != null) return `Hasta ${max} empleados`;
  return `Plan #${plan.id ?? plan.tipo_plan_id}`;
}

function labelPrecio(plan) {
  const precio = plan?.precio_base ?? plan?.plan_precio_base;
  if (precio == null) return "—";
  return `$${Number(precio).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
  })}`;
}

function formatDate(val) {
  if (!val) return "—";
  // Agregar T00:00:00 para evitar que "YYYY-MM-DD" se interprete como UTC y muestre un día antes
  const d = /^\d{4}-\d{2}-\d{2}$/.test(String(val).trim())
    ? new Date(`${val}T00:00:00`)
    : new Date(val);
  return d.toLocaleDateString("es-MX");
}

function toLocalDate(val) {
  if (!val) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(String(val).trim())
    ? new Date(`${val}T00:00:00`)
    : new Date(val);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function calcularPagoManualSugerido(item) {
  const precioMensual = Number(
    item?.precio_por_mes || item?.plan_precio_base || 0,
  );

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const fechaFin = toLocalDate(item?.fecha_fin);
  if (fechaFin) fechaFin.setHours(0, 0, 0, 0);

  const fechaCorteReal = fechaCorte(item?.fecha_fin, item?.estado);
  if (fechaCorteReal) fechaCorteReal.setHours(0, 0, 0, 0);

  const vigentePagado = fechaFin && fechaFin >= hoy;
  const enGracia =
    fechaFin && fechaFin < hoy && fechaCorteReal && hoy < fechaCorteReal;

  let periodoInicio;
  let periodoFin;
  let tipo;

  if (vigentePagado) {
    // Ya pagó el mes actual → se cobra el siguiente mes completo
    periodoInicio = new Date(
      fechaFin.getFullYear(),
      fechaFin.getMonth() + 1,
      1,
    );
    periodoFin = endOfMonth(periodoInicio);
    tipo = "renovacion";
  } else if (enGracia) {
    // Tiene acceso por gracia → se cobra el mes completo de gracia
    periodoInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    periodoFin = endOfMonth(hoy);
    tipo = "gracia";
  } else {
    // Ya pasó la gracia o no tiene fecha_fin → proporcional desde hoy a fin de mes
    periodoInicio = hoy;
    periodoFin = endOfMonth(hoy);
    tipo = "proporcional";
  }

  const diasDelMes = periodoFin.getDate();
  const diasACobrar = periodoFin.getDate() - periodoInicio.getDate() + 1;

  const montoSugerido =
    tipo === "proporcional"
      ? Number(((precioMensual / diasDelMes) * diasACobrar).toFixed(2))
      : precioMensual;

  return {
    precioMensual,
    periodoInicio,
    periodoFin,
    diasACobrar,
    diasDelMes,
    montoSugerido,
    tipo,
  };
}

function fechaCorte(fecha_fin, estado) {
  if (!fecha_fin) return null;
  if (estado === "Inactivo") return null;

  const base = new Date(`${fecha_fin}T00:00:00`);

  // Corte = primer día del mes siguiente DESPUÉS del mes de gracia
  return new Date(base.getFullYear(), base.getMonth() + 2, 1);
}

function estadoAcceso(item) {
  if (item.estado === "Inactivo") {
    return {
      label: "Inactivo",
      className: "bg-slate-100 text-slate-600",
    };
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const fechaFin = toLocalDate(item.fecha_fin);
  if (fechaFin) fechaFin.setHours(0, 0, 0, 0);

  const corte = fechaCorte(item.fecha_fin, item.estado);
  if (corte) corte.setHours(0, 0, 0, 0);

  if (!fechaFin) {
    return {
      label: "Sin fecha",
      className: "bg-slate-100 text-slate-500",
    };
  }

  if (fechaFin >= hoy) {
    return {
      label: "Pagado",
      className: "bg-green-100 text-green-700",
    };
  }

  if (corte && hoy < corte) {
    return {
      label: "En gracia",
      className: "bg-orange-100 text-orange-600",
    };
  }

  return {
    label: "Suspendido",
    className: "bg-red-100 text-red-600",
  };
}

function FechaCorteLabel({ fecha_fin, estado }) {
  const corte = fechaCorte(fecha_fin, estado);
  if (!corte) return <span className="text-slate-300">—</span>;

  const hoy = new Date();
  const diasRestantes = Math.ceil((corte - hoy) / (1000 * 60 * 60 * 24));
  const yaVencio = diasRestantes <= 0;
  const proxima = diasRestantes > 0 && diasRestantes <= 30;

  return (
    <div className="text-center">
      <p
        className={`text-xs font-medium ${
          yaVencio
            ? "text-red-600"
            : proxima
            ? "text-orange-500"
            : "text-slate-500"
        }`}
      >
        {corte.toLocaleDateString("es-MX")}
      </p>
      {!yaVencio && (
        <p
          className={`text-xs ${
            proxima ? "text-orange-400" : "text-slate-400"
          }`}
        >
          {diasRestantes === 1 ? "mañana" : `en ${diasRestantes} días`}
        </p>
      )}
      {yaVencio && <p className="text-xs text-red-400">servicio suspendido</p>}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function PlanesPage() {
  const [tab, setTab] = useState("tipos");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CreditCard className="w-5 h-5 text-slate-600" />
        <h1 className="text-xl font-bold text-slate-800">
          Planes y contrataciones
        </h1>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        <TabButton active={tab === "tipos"} onClick={() => setTab("tipos")}>
          Tipos de plan
        </TabButton>
        <TabButton
          active={tab === "contrataciones"}
          onClick={() => setTab("contrataciones")}
        >
          Contrataciones
        </TabButton>
      </div>

      {tab === "tipos" && <TiposTab />}
      {tab === "contrataciones" && <ContratacionesTab />}
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        active
          ? "border-slate-700 text-slate-800"
          : "border-transparent text-slate-500 hover:text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

// ── Tab: Tipos de Plan ────────────────────────────────────────────────────────

function TiposTab() {
  const token = Cookies.get("token");
  const headers = { Authorization: `Bearer ${token}` };

  const { data, isLoading, error, mutate } = useSWR(
    `/checador/tipo-planes`,
    fetcherWithToken,
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = crear, objeto = editar
  const [form, setForm] = useState({
    usuarios_min: "",
    usuarios_max: "",
    precio_base: "",
  });
  const [saving, setSaving] = useState(false);

  const planes = data?.tipo_planes || [];

  const openCrear = () => {
    setEditing(null);
    setForm({ usuarios_min: "", usuarios_max: "", precio_base: "" });
    setDialogOpen(true);
  };

  const openEditar = (plan) => {
    setEditing(plan);
    setForm({
      usuarios_min: plan.usuarios_min ?? "",
      usuarios_max: plan.usuarios_max ?? "",
      precio_base: plan.precio_base ?? "",
    });
    setDialogOpen(true);
  };

  const handleGuardar = async () => {
    setSaving(true);
    try {
      const payload = {
        usuarios_min: form.usuarios_min !== "" ? Number(form.usuarios_min) : 0,
        usuarios_max:
          form.usuarios_max !== "" ? Number(form.usuarios_max) : null,
        precio_base: form.precio_base !== "" ? Number(form.precio_base) : null,
      };
      if (editing) {
        await axiosInstance.put(
          `/checador/tipo-planes/${editing.id}`,
          payload,
          { headers },
        );
        enqueueSnackbar("Plan actualizado", { variant: "success" });
      } else {
        await axiosInstance.post(`/checador/tipo-planes`, payload, { headers });
        enqueueSnackbar("Plan creado", { variant: "success" });
      }
      setDialogOpen(false);
      mutate();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || "Error al guardar", {
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const [confirmEliminar, setConfirmEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState(null);

  const handleEliminar = async () => {
    setEliminando(true);
    setErrorEliminar(null);
    try {
      await axiosInstance.delete(
        `/checador/tipo-planes/${confirmEliminar.id}`,
        { headers },
      );
      enqueueSnackbar("Plan eliminado", { variant: "success" });
      setConfirmEliminar(null);
      mutate();
    } catch (err) {
      setErrorEliminar(
        err.response?.data?.error || "Error al eliminar el plan.",
      );
    } finally {
      setEliminando(false);
    }
  };

  if (isLoading) return <LoadingTable rows={5} />;
  if (error) return <ErrorPage message="Error al cargar los planes" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCrear} className="gap-2">
          <Plus className="w-4 h-4" />
          Nuevo plan
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Rango de empleados</TableHead>
              <TableHead className="text-center">Mín.</TableHead>
              <TableHead className="text-center">Máx.</TableHead>
              <TableHead className="text-center">Precio base</TableHead>
              <TableHead className="text-center w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {planes.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-slate-400 py-10"
                >
                  No hay planes registrados
                </TableCell>
              </TableRow>
            ) : (
              planes.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium text-slate-800">
                    {labelPlan(plan)}
                  </TableCell>
                  <TableCell className="text-center text-slate-600">
                    {plan.usuarios_min ?? "—"}
                  </TableCell>
                  <TableCell className="text-center text-slate-600">
                    {plan.usuarios_max ?? "—"}
                  </TableCell>
                  <TableCell className="text-center text-slate-600">
                    {labelPrecio(plan)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditar(plan)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setConfirmEliminar(plan)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog: Confirmar eliminación */}
      <Dialog
        open={!!confirmEliminar}
        onOpenChange={(v) => {
          if (!v) {
            setConfirmEliminar(null);
            setErrorEliminar(null);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Eliminar plan
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-slate-600">
              ¿Estás seguro de que deseas eliminar el plan{" "}
              <span className="font-semibold text-slate-800">
                {labelPlan(confirmEliminar)}
              </span>
              ?
            </p>
            {!errorEliminar && (
              <p className="text-xs text-slate-400">
                Esta acción no se puede deshacer.
              </p>
            )}
            {errorEliminar && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
                {errorEliminar}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmEliminar(null);
                setErrorEliminar(null);
              }}
            >
              Cancelar
            </Button>
            {!errorEliminar && (
              <Button
                variant="destructive"
                disabled={eliminando}
                onClick={handleEliminar}
              >
                {eliminando ? "Eliminando..." : "Sí, eliminar"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editing ? (
                <>
                  <Pencil className="w-4 h-4 text-slate-500" />
                  Editar plan
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-slate-500" />
                  Nuevo plan
                </>
              )}
            </DialogTitle>
            {editing && (
              <p className="text-sm text-slate-400 mt-0.5">
                {labelPlan(editing)}
              </p>
            )}
          </DialogHeader>

          <div className="py-2 space-y-5">
            {/* Rango de empleados */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Rango de empleados
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">
                    Mínimo
                  </label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="Ej. 1"
                    value={form.usuarios_min}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, usuarios_min: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">
                    Máximo
                  </label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="Ej. 50"
                    value={form.usuarios_max}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, usuarios_max: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* Precio */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Precio
              </p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                  $
                </span>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  className="pl-7"
                  value={form.precio_base}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, precio_base: e.target.value }))
                  }
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                  MXN / mes
                </span>
              </div>
            </div>

            {/* Preview */}
            {(form.usuarios_min || form.usuarios_max || form.precio_base) && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-600">
                <span className="font-medium text-slate-800">
                  {form.usuarios_min && form.usuarios_max
                    ? `${form.usuarios_min} – ${form.usuarios_max} empleados`
                    : form.usuarios_max
                    ? `Hasta ${form.usuarios_max} empleados`
                    : "—"}
                </span>
                {form.precio_base && (
                  <span className="ml-2 text-slate-400">·</span>
                )}
                {form.precio_base && (
                  <span className="ml-2 font-semibold text-slate-700">
                    $
                    {Number(form.precio_base).toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}{" "}
                    / mes
                  </span>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGuardar} disabled={saving}>
              {saving
                ? "Guardando..."
                : editing
                ? "Guardar cambios"
                : "Crear plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Tab: Contrataciones ───────────────────────────────────────────────────────

function ContratacionesTab() {
  const token = Cookies.get("token");
  const headers = { Authorization: `Bearer ${token}` };

  const [page, setPage] = useState(1);
  const limit = 15;

  const { data, isLoading, error, mutate } = useSWR(
    `/checador/contrataciones/admin?page=${page}&limit=${limit}`,
    fetcherWithToken,
  );

  const { data: planesData } = useSWR(
    `/checador/tipo-planes`,
    fetcherWithToken,
  );
  const { data: empresasData } = useSWR(
    `/empresas?page=1&limit=200`,
    fetcherWithToken,
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({
    id_empresa: "", // selector UI; se convierte a usuario_id al guardar
    tipo_plan_id: "",
    empleados: "",
    fecha_inicio: "",
    fecha_fin: "",
    estado: "Activo",
    notas: "",
  });
  const [saving, setSaving] = useState(false);
  const [generandoStripe, setGenerandoStripe] = useState(null);
  const [pagoManualDialog, setPagoManualDialog] = useState(null); // item seleccionado
  const [pagoManualForm, setPagoManualForm] = useState({
    monto: "",
    referencia: "",
  });
  const [guardandoPago, setGuardandoPago] = useState(false);
  const [pagosDialog, setPagosDialog] = useState(null);
  const [cargandoPagos, setCargandoPagos] = useState(false);
  const [pagosData, setPagosData] = useState(null);

  const contrataciones = data?.contrataciones || [];
  const planes = planesData?.tipo_planes || [];
  const empresas = empresasData?.data || [];

  const handlePagoManual = async () => {
    if (!pagoManualForm.monto) {
      enqueueSnackbar("El monto es requerido", { variant: "warning" });
      return;
    }
    setGuardandoPago(true);
    try {
      await axiosInstance.post(
        `/checador/contrataciones/admin/${pagoManualDialog.id}/pago-manual`,
        {
          monto: Number(pagoManualForm.monto),
          referencia: pagoManualForm.referencia,
        },
        { headers },
      );
      enqueueSnackbar("Pago registrado. Fecha extendida 1 mes.", {
        variant: "success",
      });
      setPagoManualDialog(null);
      mutate();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || "Error al registrar pago", {
        variant: "error",
      });
    } finally {
      setGuardandoPago(false);
    }
  };

  const handleVerPagos = async (item) => {
    setPagosDialog(item);
    setCargandoPagos(true);
    setPagosData(null);

    try {
      const { data } = await axiosInstance.get(
        `/checador/contrataciones/admin/${item.id}/pagos`,
        { headers },
      );

      setPagosData(data);
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || "Error al cargar pagos", {
        variant: "error",
      });
    } finally {
      setCargandoPagos(false);
    }
  };

  const handleGenerarEnlaceStripe = async (item) => {
    setGenerandoStripe(item.id);
    try {
      const { data: res } = await axiosInstance.post(
        `/stripe/generar-enlace/${item.id}`,
        {},
        { headers },
      );
      await navigator.clipboard.writeText(res.enlace_pago_stripe);
      enqueueSnackbar("Enlace de Stripe copiado al portapapeles", {
        variant: "success",
      });
      mutate();
    } catch (err) {
      enqueueSnackbar(
        err.response?.data?.message || "Error al generar enlace de Stripe",
        {
          variant: "error",
        },
      );
    } finally {
      setGenerandoStripe(null);
    }
  };

  const openEditar = (item) => {
    setSelected(item);
    setForm({
      id_empresa: String(item.id_empresa || ""),
      tipo_plan_id: item.tipo_plan_id ? String(item.tipo_plan_id) : "",
      empleados: item.empleados ?? "",
      fecha_inicio: item.fecha_inicio ? item.fecha_inicio.slice(0, 10) : "",
      fecha_fin: item.fecha_fin ? item.fecha_fin.slice(0, 10) : "",
      estado: item.estado || "Activo",
      precio_por_mes: item.precio_por_mes ?? "",
      notas: item.notas || "",
    });
    setEditDialogOpen(true);
  };

  const openCrear = () => {
    setForm({
      id_empresa: "",
      tipo_plan_id: "",
      empleados: "",
      fecha_inicio: "",
      fecha_fin: "",
      estado: "Activo",
      precio_por_mes: "",
      notas: "",
    });
    setDialogOpen(true);
  };

  const handleCrear = async () => {
    if (!form.id_empresa) {
      enqueueSnackbar("Selecciona una empresa", { variant: "warning" });
      return;
    }
    setSaving(true);
    try {
      await axiosInstance.post(
        `/checador/contrataciones/admin`,
        {
          id_empresa: Number(form.id_empresa),
          tipo_plan_id: form.tipo_plan_id ? Number(form.tipo_plan_id) : null,
          empleados: form.empleados !== "" ? Number(form.empleados) : null,
          fecha_inicio: form.fecha_inicio || null,
          fecha_fin: form.fecha_fin || null,
          estado: form.estado,
          notas: form.notas || null,
        },
        { headers },
      );
      enqueueSnackbar("Contratación creada", { variant: "success" });
      setDialogOpen(false);
      mutate();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || "Error al crear", {
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleActualizar = async () => {
    setSaving(true);
    try {
      await axiosInstance.put(
        `/checador/contrataciones/admin/${selected.id}`,
        {
          tipo_plan_id: form.tipo_plan_id ? Number(form.tipo_plan_id) : null,
          empleados: form.empleados !== "" ? Number(form.empleados) : null,
          fecha_inicio: form.fecha_inicio || null,
          fecha_fin: form.fecha_fin || null,
          precio_por_mes:
            form.precio_por_mes !== "" ? Number(form.precio_por_mes) : null,
          notas: form.notas || null,
        },
        { headers },
      );
      enqueueSnackbar("Contratación actualizada", { variant: "success" });
      setEditDialogOpen(false);
      mutate();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || "Error al actualizar", {
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const estadoColor = {
    Activo: "bg-green-100 text-green-700",
    Inactivo: "bg-slate-100 text-slate-600",
    Vencido: "bg-red-100 text-red-600",
    Demo: "bg-yellow-100 text-yellow-700",
  };

  if (isLoading) return <LoadingTable rows={8} />;
  if (error) return <ErrorPage message="Error al cargar las contrataciones" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">
          {data?.total ?? 0} contrataciones en total
        </span>
        <Button onClick={openCrear} className="gap-2">
          <Plus className="w-4 h-4" />
          Nueva contratación
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Empresa</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  Empleados
                </div>
              </TableHead>
              <TableHead className="text-center">$/mes</TableHead>
              <TableHead className="text-center">Servicio cubierto</TableHead>
              <TableHead className="text-center">Fecha de corte</TableHead>
              <TableHead className="text-center">Acceso</TableHead>
              <TableHead className="text-center">Stripe</TableHead>
              <TableHead className="text-center">Pago manual</TableHead>
              <TableHead className="text-center">Pagos</TableHead>
              <TableHead className="text-center w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {contrataciones.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-slate-400 py-10"
                >
                  No hay contrataciones registradas
                </TableCell>
              </TableRow>
            ) : (
              contrataciones.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-slate-800">
                        {item.nombre_empresa || item.empresa || "—"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {item.contrato_id}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {labelPlan(item)}
                  </TableCell>
                  <TableCell className="text-center text-slate-700 font-medium">
                    {item.empleados ?? "—"}
                  </TableCell>
                  <TableCell className="text-center text-slate-700 text-sm font-medium">
                    {item.precio_por_mes ? (
                      `$${Number(item.precio_por_mes).toLocaleString("es-MX", {
                        minimumFractionDigits: 2,
                      })}`
                    ) : item.plan_precio_base ? (
                      <span className="text-slate-400">
                        $
                        {Number(item.plan_precio_base).toLocaleString("es-MX", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-center text-slate-500 text-sm">
                    {item.fecha_inicio || item.fecha_fin
                      ? `${formatDate(item.fecha_inicio)} – ${formatDate(
                          item.fecha_fin,
                        )}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <FechaCorteLabel
                      fecha_fin={item.fecha_fin}
                      estado={item.estado}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    {(() => {
                      const acceso = estadoAcceso(item);

                      return (
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded-full ${acceso.className}`}
                        >
                          {acceso.label}
                        </span>
                      );
                    })()}
                  </TableCell>
                  {/* Columna Stripe: indica si ya tiene enlace o permite generar uno */}
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {/* <span
                        className={`text-[11px] font-semibold rounded-full px-2 py-1 ${
                          item.estado_suscripcion === "Activa"
                            ? "bg-green-100 text-green-700"
                            : item.estado_suscripcion === "PendientePago"
                            ? "bg-orange-100 text-orange-600"
                            : item.estado_suscripcion === "Vencida"
                            ? "bg-red-100 text-red-600"
                            : item.estado_suscripcion === "Cortesia"
                            ? "bg-blue-100 text-blue-600"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {item.estado_suscripcion || "Sin suscripción"}
                      </span> */}

                      {item.enlace_pago_stripe && (
                        <button
                          title="Copiar enlace guardado"
                          className="text-slate-400 hover:text-slate-700"
                          onClick={async () => {
                            await navigator.clipboard.writeText(
                              item.enlace_pago_stripe,
                            );
                            enqueueSnackbar("Enlace copiado", {
                              variant: "info",
                            });
                          }}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        title="Generar nuevo enlace Stripe"
                        disabled={generandoStripe === item.id}
                        onClick={() => handleGenerarEnlaceStripe(item)}
                      >
                        {generandoStripe === item.id ? (
                          <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin inline-block" />
                        ) : (
                          <Link2 className="w-4 h-4 text-slate-500" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                  {/* Pago manual */}
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Registrar pago manual"
                      onClick={() => {
                        const sugerido = calcularPagoManualSugerido(item);

                        setPagoManualForm({
                          monto: sugerido.montoSugerido || "",
                          referencia: "",
                        });

                        setPagoManualDialog({
                          ...item,
                          pagoSugerido: sugerido,
                        });
                      }}
                    >
                      <DollarSign className="w-4 h-4 text-slate-500" />
                    </Button>
                  </TableCell>

                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Ver historial de pagos"
                      onClick={() => handleVerPagos(item)}
                    >
                      <ReceiptText className="w-4 h-4 text-slate-500" />
                    </Button>
                  </TableCell>

                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditar(item)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {(data?.totalPages ?? 1) > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </Button>
          <span className="flex items-center text-sm text-slate-600">
            {page} / {data?.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= (data?.totalPages ?? 1)}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </Button>
        </div>
      )}

      {/* Dialog: Crear */}
      <ContratacionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Nueva contratación"
        form={form}
        setForm={setForm}
        planes={planes}
        empresas={empresas}
        showEmpresa
        saving={saving}
        onGuardar={handleCrear}
      />

      {/* Dialog: Editar */}
      <ContratacionDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        title="Editar contratación"
        form={form}
        setForm={setForm}
        planes={planes}
        empresas={empresas}
        showEmpresa={false}
        saving={saving}
        onGuardar={handleActualizar}
        subtitulo={selected?.nombre_empresa || selected?.empresa}
      />

      {/* Dialog: Pago manual */}
      <Dialog
        open={!!pagoManualDialog}
        onOpenChange={(v) => !v && setPagoManualDialog(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar pago manual</DialogTitle>
            {pagoManualDialog && (
              <p className="text-sm text-slate-500 mt-0.5">
                {pagoManualDialog.nombre_empresa ||
                  pagoManualDialog.empresa ||
                  `Contrato ${pagoManualDialog.contrato_id}`}
              </p>
            )}
          </DialogHeader>
          {pagoManualDialog?.pagoSugerido && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
              <p>
                <span className="font-semibold text-slate-700">Tipo:</span>{" "}
                {pagoManualDialog.pagoSugerido.tipo === "proporcional"
                  ? "Pago proporcional"
                  : pagoManualDialog.pagoSugerido.tipo === "gracia"
                  ? "Pago de mes en gracia"
                  : "Renovación mensual"}
              </p>
              <p>
                <span className="font-semibold text-slate-700">
                  Periodo sugerido:
                </span>{" "}
                {formatDate(pagoManualDialog.pagoSugerido.periodoInicio)} –{" "}
                {formatDate(pagoManualDialog.pagoSugerido.periodoFin)}
              </p>
              <p>
                <span className="font-semibold text-slate-700">
                  Monto sugerido:
                </span>{" "}
                $
                {Number(
                  pagoManualDialog.pagoSugerido.montoSugerido,
                ).toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                })}
              </p>
              {pagoManualDialog.pagoSugerido.tipo === "proporcional" && (
                <p className="text-slate-400">
                  Cálculo: {pagoManualDialog.pagoSugerido.diasACobrar} de{" "}
                  {pagoManualDialog.pagoSugerido.diasDelMes} días del mes.
                </p>
              )}
            </div>
          )}
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Monto recibido (MXN) *
              </label>
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="Ej. 4800.00"
                value={pagoManualForm.monto}
                onChange={(e) =>
                  setPagoManualForm((f) => ({ ...f, monto: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Referencia / Folio (opcional)
              </label>
              <Input
                placeholder="Ej. Transferencia SPEI, efectivo, etc."
                value={pagoManualForm.referencia}
                onChange={(e) =>
                  setPagoManualForm((f) => ({
                    ...f,
                    referencia: e.target.value,
                  }))
                }
              />
            </div>
            <p className="text-xs text-slate-400">
              El monto es editable. Al guardar, la vigencia se extenderá según
              la regla de corte mensual.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPagoManualDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={handlePagoManual} disabled={guardandoPago}>
              {guardandoPago ? "Guardando..." : "Registrar pago"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Historial de pagos */}
      <Dialog
        open={!!pagosDialog}
        onOpenChange={(v) => {
          if (!v) {
            setPagosDialog(null);
            setPagosData(null);
          }
        }}
      >
        <DialogContent className="w-[95vw] sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Historial de pagos</DialogTitle>
            {pagosDialog && (
              <p className="text-sm text-slate-500 mt-0.5">
                {pagosDialog.nombre_empresa ||
                  pagosDialog.empresa ||
                  `Contrato ${pagosDialog.contrato_id}`}
              </p>
            )}
          </DialogHeader>

          {cargandoPagos ? (
            <div className="py-10 text-center text-sm text-slate-400">
              Cargando pagos...
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Fecha</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Referencia</TableHead>
                    <TableHead>Periodo</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(pagosData?.pagos || []).length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-slate-400 py-8"
                      >
                        No hay pagos registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagosData.pagos.map((pago) => (
                      <TableRow key={pago.id}>
                        <TableCell className="text-sm text-slate-600">
                          {formatDate(pago.fecha_pago || pago.created_at)}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {pago.metodo_pago || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 max-w-[160px] truncate">
                          {pago.referencia || "—"}
                        </TableCell>

                        <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                          {pago.periodo_cubierto || "—"}
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold text-slate-700">
                          $
                          {Number(pago.monto || 0).toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                            {pago.estado || "—"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPagosDialog(null);
                setPagosData(null);
              }}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Dialog compartido para crear/editar contratación ─────────────────────────

function ContratacionDialog({
  open,
  onOpenChange,
  title,
  subtitulo,
  form,
  setForm,
  planes,
  empresas,
  showEmpresa,
  saving,
  onGuardar,
}) {
  const set = (key) => (e) =>
    setForm((f) => ({
      ...f,
      [key]: typeof e === "string" ? e : e.target.value,
    }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {subtitulo && (
            <p className="text-sm text-slate-500 mt-0.5">{subtitulo}</p>
          )}
        </DialogHeader>

        <div className="space-y-3 py-2">
          {showEmpresa && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Empresa *
              </label>
              <Select value={form.id_empresa} onValueChange={set("id_empresa")}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una empresa" />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map((e) => (
                    <SelectItem key={e.id_empresa} value={String(e.id_empresa)}>
                      {e.nombre_empresa}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              Tipo de plan
            </label>
            <Select
              value={form.tipo_plan_id}
              onValueChange={set("tipo_plan_id")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sin plan asignado" />
              </SelectTrigger>
              <SelectContent>
                {planes.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {labelPlan(p)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              Límite de empleados
            </label>
            <Input
              type="number"
              min={0}
              placeholder="Ej. 30"
              value={form.empleados}
              onChange={set("empleados")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Fecha inicio
              </label>
              <Input
                type="date"
                value={form.fecha_inicio}
                onChange={set("fecha_inicio")}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Fecha fin
              </label>
              <Input
                type="date"
                value={form.fecha_fin}
                onChange={set("fecha_fin")}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              Estado
            </label>
            <Select value={form.estado} onValueChange={set("estado")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Activo">Activo</SelectItem>
                <SelectItem value="Inactivo">Inactivo</SelectItem>
                <SelectItem value="Vencido">Vencido</SelectItem>
                <SelectItem value="Demo">Demo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              Precio especial por mes (MXN)
            </label>
            <Input
              type="number"
              min={0}
              step="0.01"
              placeholder="Dejar vacío para usar precio del plan"
              value={form.precio_por_mes}
              onChange={set("precio_por_mes")}
            />
            <p className="text-xs text-slate-400 mt-1">
              Si se configura, este precio sobrescribe el del plan para este
              cliente.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              Notas
            </label>
            <Input
              placeholder="Notas internas (opcional)"
              value={form.notas}
              onChange={set("notas")}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onGuardar} disabled={saving}>
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
