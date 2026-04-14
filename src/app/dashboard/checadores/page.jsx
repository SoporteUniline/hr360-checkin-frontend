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
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import LoadingTable from "@/components/LoadingTable";
import ErrorPage from "@/components/ErrorPage";
import { Plus, Trash2, Monitor, Pencil } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CheckadoresPage() {
  const token = Cookies.get("token");
  const headers = { Authorization: `Bearer ${token}` };

  const { data: checadoresData, error, isLoading, mutate } = useSWR(
    `/checador/dispositivos`,
    fetcherWithToken,
  );

  const { data: empresasData } = useSWR(`/empresas?page=1&limit=200`, fetcherWithToken);

  const [filtroEmpresa, setFiltroEmpresa] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ sn: "", id_empresa: "" });
  const [saving, setSaving] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editEmpresa, setEditEmpresa] = useState("");

  const checadores = checadoresData?.checadores || [];
  const empresas = empresasData?.data || [];

  const filtrados =
    filtroEmpresa && filtroEmpresa !== "all"
      ? checadores.filter((c) => String(c.id_empresa) === filtroEmpresa)
      : checadores;

  const handleToggle = async (item) => {
    try {
      await axiosInstance.put(
        `/checador/dispositivos/${item.id}/toggle`,
        { activo: !item.activo },
        { headers },
      );
      mutate();
    } catch {
      enqueueSnackbar("Error al cambiar estado", { variant: "error" });
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`¿Eliminar el checador con SN ${item.sn}?`)) return;
    try {
      await axiosInstance.delete(`/checador/dispositivos/${item.id}`, { headers });
      enqueueSnackbar("Checador eliminado", { variant: "success" });
      mutate();
    } catch {
      enqueueSnackbar("Error al eliminar", { variant: "error" });
    }
  };

  const handleEditarGuardar = async () => {
    if (!editEmpresa) {
      enqueueSnackbar("Selecciona una empresa", { variant: "warning" });
      return;
    }
    setSaving(true);
    try {
      await axiosInstance.put(
        `/checador/dispositivos/${editItem.id}`,
        { id_empresa: editEmpresa },
        { headers },
      );
      enqueueSnackbar("Checador actualizado correctamente", { variant: "success" });
      setEditItem(null);
      mutate();
    } catch {
      enqueueSnackbar("Error al actualizar", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleCrear = async () => {
    if (!form.sn.trim() || !form.id_empresa) {
      enqueueSnackbar("Número de serie y empresa son requeridos", { variant: "warning" });
      return;
    }
    setSaving(true);
    try {
      await axiosInstance.post(
        `/checador/dispositivos`,
        { sn: form.sn.trim(), id_empresa: form.id_empresa },
        { headers },
      );
      enqueueSnackbar("Checador registrado correctamente", { variant: "success" });
      setDialogOpen(false);
      setForm({ sn: "", id_empresa: "" });
      mutate();
    } catch (err) {
      const msg = err.response?.data?.error || "Error al registrar";
      enqueueSnackbar(msg, { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <LoadingTable rows={8} />;
  if (error) return <ErrorPage message="Error al cargar los checadores" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Monitor className="w-5 h-5 text-slate-600" />
          <h1 className="text-xl font-bold text-slate-800">Checadores (Dispositivos)</h1>
          <span className="text-sm text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            {filtrados.length}
          </span>
        </div>
        <div className="flex gap-3">
          <Select value={filtroEmpresa} onValueChange={setFiltroEmpresa}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Filtrar por empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las empresas</SelectItem>
              {empresas.map((e) => (
                <SelectItem key={e.id_empresa} value={String(e.id_empresa)}>
                  {e.nombre_empresa}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Agregar checador
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Número de serie (SN)</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead className="text-center">Activo</TableHead>
              <TableHead className="text-center w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-slate-400 py-10">
                  No hay checadores registrados
                </TableCell>
              </TableRow>
            ) : (
              filtrados.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono font-semibold text-slate-700">
                    {item.sn}
                  </TableCell>
                  <TableCell className="text-slate-600">{item.nombre_empresa}</TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={!!item.activo}
                      onCheckedChange={() => handleToggle(item)}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                        onClick={() => { setEditItem(item); setEditEmpresa(String(item.id_empresa)); }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(item)}
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

      <Dialog open={!!editItem} onOpenChange={(open) => { if (!open) setEditItem(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar checador — {editItem?.sn}</DialogTitle>
          </DialogHeader>

          <div className="py-2">
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              Empresa
            </label>
            <Select value={editEmpresa} onValueChange={setEditEmpresa}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una empresa" />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                {empresas.map((e) => (
                  <SelectItem key={e.id_empresa} value={String(e.id_empresa)}>
                    {e.nombre_empresa}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>
              Cancelar
            </Button>
            <Button onClick={handleEditarGuardar} disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar checador</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Número de serie del dispositivo (SN)
              </label>
              <Input
                placeholder="Ej. BKMS231700123"
                value={form.sn}
                onChange={(e) => setForm((f) => ({ ...f, sn: e.target.value.toUpperCase() }))}
              />
              <p className="text-xs text-slate-400 mt-1">
                Se encuentra en la etiqueta trasera del dispositivo ZKTeco.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Empresa
              </label>
              <Select
                value={form.id_empresa}
                onValueChange={(v) => setForm((f) => ({ ...f, id_empresa: v }))}
              >
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCrear} disabled={saving}>
              {saving ? "Guardando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
