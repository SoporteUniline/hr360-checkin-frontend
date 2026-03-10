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
import { Plus, Pencil, Trash2, CreditCard, Users } from "lucide-react";

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
  return `$${Number(precio).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
}

function formatDate(val) {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("es-MX");
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function PlanesPage() {
  const [tab, setTab] = useState("tipos");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CreditCard className="w-5 h-5 text-slate-600" />
        <h1 className="text-xl font-bold text-slate-800">Planes y contrataciones</h1>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        <TabButton active={tab === "tipos"} onClick={() => setTab("tipos")}>
          Tipos de plan
        </TabButton>
        <TabButton active={tab === "contrataciones"} onClick={() => setTab("contrataciones")}>
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
  const [form, setForm] = useState({ usuarios_min: "", usuarios_max: "", precio_base: "" });
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
        usuarios_max: form.usuarios_max !== "" ? Number(form.usuarios_max) : null,
        precio_base: form.precio_base !== "" ? Number(form.precio_base) : null,
      };
      if (editing) {
        await axiosInstance.put(`/checador/tipo-planes/${editing.id}`, payload, { headers });
        enqueueSnackbar("Plan actualizado", { variant: "success" });
      } else {
        await axiosInstance.post(`/checador/tipo-planes`, payload, { headers });
        enqueueSnackbar("Plan creado", { variant: "success" });
      }
      setDialogOpen(false);
      mutate();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || "Error al guardar", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async (plan) => {
    if (!confirm(`¿Eliminar el plan "${labelPlan(plan)}"?`)) return;
    try {
      await axiosInstance.delete(`/checador/tipo-planes/${plan.id}`, { headers });
      enqueueSnackbar("Plan eliminado", { variant: "success" });
      mutate();
    } catch {
      enqueueSnackbar("Error al eliminar", { variant: "error" });
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
                <TableCell colSpan={5} className="text-center text-slate-400 py-10">
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
                        onClick={() => handleEliminar(plan)}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar plan" : "Nuevo plan"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Mín. empleados
                </label>
                <Input
                  type="number"
                  min={0}
                  placeholder="Ej. 1"
                  value={form.usuarios_min}
                  onChange={(e) => setForm((f) => ({ ...f, usuarios_min: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Máx. empleados
                </label>
                <Input
                  type="number"
                  min={0}
                  placeholder="Ej. 50"
                  value={form.usuarios_max}
                  onChange={(e) => setForm((f) => ({ ...f, usuarios_max: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Precio base (MXN)
              </label>
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="Ej. 599.00"
                value={form.precio_base}
                onChange={(e) => setForm((f) => ({ ...f, precio_base: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGuardar} disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
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

  const { data: planesData } = useSWR(`/checador/tipo-planes`, fetcherWithToken);
  const { data: empresasData } = useSWR(`/empresas?page=1&limit=200`, fetcherWithToken);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({
    id_empresa: "",   // selector UI; se convierte a usuario_id al guardar
    tipo_plan_id: "",
    empleados: "",
    fecha_inicio: "",
    fecha_fin: "",
    estado: "Activo",
    notas: "",
  });
  const [saving, setSaving] = useState(false);

  const contrataciones = data?.contrataciones || [];
  const planes = planesData?.tipo_planes || [];
  const empresas = empresasData?.data || [];

  const openEditar = (item) => {
    setSelected(item);
    setForm({
      id_empresa: String(item.id_empresa || ""),
      tipo_plan_id: item.tipo_plan_id ? String(item.tipo_plan_id) : "",
      empleados: item.empleados ?? "",
      fecha_inicio: item.fecha_inicio ? item.fecha_inicio.slice(0, 10) : "",
      fecha_fin: item.fecha_fin ? item.fecha_fin.slice(0, 10) : "",
      estado: item.estado || "Activo",
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
      enqueueSnackbar(err.response?.data?.error || "Error al crear", { variant: "error" });
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
          estado: form.estado,
          notas: form.notas || null,
        },
        { headers },
      );
      enqueueSnackbar("Contratación actualizada", { variant: "success" });
      setEditDialogOpen(false);
      mutate();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || "Error al actualizar", { variant: "error" });
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
              <TableHead className="text-center">Vigencia</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead className="text-center w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {contrataciones.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-400 py-10">
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
                      <p className="text-xs text-slate-400">{item.contrato_id}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {labelPlan(item)}
                  </TableCell>
                  <TableCell className="text-center text-slate-700 font-medium">
                    {item.empleados ?? "—"}
                  </TableCell>
                  <TableCell className="text-center text-slate-500 text-sm">
                    {item.fecha_inicio || item.fecha_fin
                      ? `${formatDate(item.fecha_inicio)} – ${formatDate(item.fecha_fin)}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        estadoColor[item.estado] || "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {item.estado || "—"}
                    </span>
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
    setForm((f) => ({ ...f, [key]: typeof e === "string" ? e : e.target.value }));

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
            <Select value={form.tipo_plan_id} onValueChange={set("tipo_plan_id")}>
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
              <Input type="date" value={form.fecha_inicio} onChange={set("fecha_inicio")} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Fecha fin
              </label>
              <Input type="date" value={form.fecha_fin} onChange={set("fecha_fin")} />
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
