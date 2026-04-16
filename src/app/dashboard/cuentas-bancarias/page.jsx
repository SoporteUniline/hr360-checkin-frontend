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
import { Plus, Trash2, Pencil, Landmark } from "lucide-react";
import LoadingTable from "@/components/LoadingTable";
import ErrorPage from "@/components/ErrorPage";

const FORM_EMPTY = { banco: "", titular: "", clabe: "", cuenta: "" };

export default function CuentasBancariasPage() {
  const token = Cookies.get("token");
  const headers = { Authorization: `Bearer ${token}` };

  const { data, error, isLoading, mutate } = useSWR(
    "/checador/cuentas-bancarias",
    fetcherWithToken,
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(FORM_EMPTY);
  const [saving, setSaving] = useState(false);

  const cuentas = data?.cuentas || [];

  const abrirCrear = () => {
    setEditItem(null);
    setForm(FORM_EMPTY);
    setDialogOpen(true);
  };

  const abrirEditar = (item) => {
    setEditItem(item);
    setForm({
      banco: item.banco || "",
      titular: item.titular || "",
      clabe: item.clabe || "",
      cuenta: item.cuenta || "",
    });
    setDialogOpen(true);
  };

  const handleGuardar = async () => {
    if (!form.banco.trim() || !form.titular.trim()) {
      enqueueSnackbar("Banco y titular son requeridos", { variant: "warning" });
      return;
    }
    setSaving(true);
    try {
      if (editItem) {
        await axiosInstance.put(
          `/checador/cuentas-bancarias/${editItem.id}`,
          form,
          { headers },
        );
        enqueueSnackbar("Cuenta actualizada correctamente", { variant: "success" });
      } else {
        await axiosInstance.post("/checador/cuentas-bancarias", form, { headers });
        enqueueSnackbar("Cuenta registrada correctamente", { variant: "success" });
      }
      setDialogOpen(false);
      mutate();
    } catch {
      enqueueSnackbar("Error al guardar", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (item) => {
    try {
      await axiosInstance.put(
        `/checador/cuentas-bancarias/${item.id}/toggle`,
        { activa: !item.activa },
        { headers },
      );
      mutate();
    } catch {
      enqueueSnackbar("Error al cambiar estado", { variant: "error" });
    }
  };

  const handleEliminar = async (item) => {
    if (!confirm(`¿Eliminar la cuenta de ${item.banco}?`)) return;
    try {
      await axiosInstance.delete(`/checador/cuentas-bancarias/${item.id}`, { headers });
      enqueueSnackbar("Cuenta eliminada", { variant: "success" });
      mutate();
    } catch {
      enqueueSnackbar("Error al eliminar", { variant: "error" });
    }
  };

  if (isLoading) return <LoadingTable rows={5} />;
  if (error) return <ErrorPage message="Error al cargar las cuentas bancarias" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Landmark className="w-5 h-5 text-slate-600" />
          <h1 className="text-xl font-bold text-slate-800">Cuentas bancarias</h1>
          <span className="text-sm text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            {cuentas.length}
          </span>
        </div>
        <Button onClick={abrirCrear} className="gap-2">
          <Plus className="w-4 h-4" />
          Agregar cuenta
        </Button>
      </div>

      <p className="text-sm text-slate-500">
        Las cuentas activas aparecen en los correos de facturación mensual.
      </p>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Banco</TableHead>
              <TableHead>Titular</TableHead>
              <TableHead>CLABE</TableHead>
              <TableHead>No. de cuenta</TableHead>
              <TableHead className="text-center">Activa</TableHead>
              <TableHead className="text-center w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {cuentas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-400 py-10">
                  No hay cuentas bancarias registradas
                </TableCell>
              </TableRow>
            ) : (
              cuentas.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-semibold text-slate-700">{item.banco}</TableCell>
                  <TableCell className="text-slate-600">{item.titular}</TableCell>
                  <TableCell className="font-mono text-slate-600">{item.clabe || "—"}</TableCell>
                  <TableCell className="font-mono text-slate-600">{item.cuenta || "—"}</TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={!!item.activa}
                      onCheckedChange={() => handleToggle(item)}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                        onClick={() => abrirEditar(item)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleEliminar(item)}
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
            <DialogTitle>{editItem ? "Editar cuenta bancaria" : "Agregar cuenta bancaria"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Banco *</label>
              <Input
                placeholder="Ej. BBVA, Banamex, HSBC"
                value={form.banco}
                onChange={(e) => setForm((f) => ({ ...f, banco: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Titular *</label>
              <Input
                placeholder="Nombre del titular de la cuenta"
                value={form.titular}
                onChange={(e) => setForm((f) => ({ ...f, titular: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">CLABE interbancaria</label>
              <Input
                placeholder="18 dígitos"
                maxLength={18}
                value={form.clabe}
                onChange={(e) => setForm((f) => ({ ...f, clabe: e.target.value.replace(/\D/g, "") }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">No. de cuenta</label>
              <Input
                placeholder="Número de cuenta"
                value={form.cuenta}
                onChange={(e) => setForm((f) => ({ ...f, cuenta: e.target.value }))}
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
