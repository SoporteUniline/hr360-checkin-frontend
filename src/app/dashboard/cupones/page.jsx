"use client";

import { useState } from "react";
import useSWR from "swr";
import Cookies from "js-cookie";
import { enqueueSnackbar } from "notistack";
import {
  Gift,
  Pencil,
  Plus,
  TicketPercent,
  Users,
} from "lucide-react";

import axiosInstance from "@/lib/axios";
import { fetcherWithToken } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import LoadingTable from "@/components/LoadingTable";
import ErrorPage from "@/components/ErrorPage";

const FORM_EMPTY = {
  codigo: "",
  precio_por_empleado: "",
  meses_duracion: "",
  activo: true,
};

const money = (value) =>
  Number(value || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });

export default function CuponesPage() {
  const token = Cookies.get("token");
  const headers = { Authorization: `Bearer ${token}` };

  const { data, error, isLoading, mutate } = useSWR(
    "/checador/cupones",
    fetcherWithToken,
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(FORM_EMPTY);
  const [saving, setSaving] = useState(false);
  const [changingId, setChangingId] = useState(null);

  const cupones = Array.isArray(data) ? data : [];

  const activos = cupones.filter((cupon) => cupon.activo).length;
  const usos = cupones.reduce(
    (total, cupon) => total + Number(cupon.usos || 0),
    0,
  );

  const abrirCrear = () => {
    setEditItem(null);
    setForm(FORM_EMPTY);
    setDialogOpen(true);
  };

  const abrirEditar = (item) => {
    setEditItem(item);
    setForm({
      codigo: item.codigo || "",
      precio_por_empleado: String(item.precio_por_empleado ?? ""),
      meses_duracion: String(item.meses_duracion ?? ""),
      activo: Boolean(item.activo),
    });
    setDialogOpen(true);
  };

  const handleGuardar = async () => {
    const codigo = form.codigo.trim().toUpperCase();
    const precio = Number(form.precio_por_empleado);
    const meses = Number(form.meses_duracion);

    if (!codigo) {
      enqueueSnackbar("Ingresa el código del cupón.", {
        variant: "warning",
      });
      return;
    }

    if (
      form.precio_por_empleado === "" ||
      !Number.isFinite(precio) ||
      precio < 0
    ) {
      enqueueSnackbar(
        "Ingresa un precio por empleado válido.",
        { variant: "warning" },
      );
      return;
    }

    if (
      form.meses_duracion === "" ||
      !Number.isInteger(meses) ||
      meses < 1
    ) {
      enqueueSnackbar(
        "La duración debe ser de al menos 1 mes.",
        { variant: "warning" },
      );
      return;
    }

    const payload = {
      codigo,
      precio_por_empleado: precio,
      meses_duracion: meses,
      activo: Boolean(form.activo),
    };

    setSaving(true);

    try {
      if (editItem) {
        await axiosInstance.put(
          `/checador/cupones/${editItem.id}`,
          payload,
          { headers },
        );

        enqueueSnackbar("Cupón actualizado correctamente.", {
          variant: "success",
        });
      } else {
        await axiosInstance.post(
          "/checador/cupones",
          payload,
          { headers },
        );

        enqueueSnackbar("Cupón creado correctamente.", {
          variant: "success",
        });
      }

      setDialogOpen(false);
      setEditItem(null);
      setForm(FORM_EMPTY);
      await mutate();
    } catch (error) {
      enqueueSnackbar(
        error.response?.data?.message ||
          "No fue posible guardar el cupón.",
        { variant: "error" },
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (item) => {
    setChangingId(item.id);

    try {
      await axiosInstance.patch(
        `/checador/cupones/${item.id}/estado`,
        { activo: !item.activo },
        { headers },
      );

      enqueueSnackbar(
        item.activo
          ? "Cupón desactivado correctamente."
          : "Cupón activado correctamente.",
        { variant: "success" },
      );

      await mutate();
    } catch (error) {
      enqueueSnackbar(
        error.response?.data?.message ||
          "No fue posible cambiar el estado del cupón.",
        { variant: "error" },
      );
    } finally {
      setChangingId(null);
    }
  };

  if (isLoading) return <LoadingTable rows={5} />;

  if (error) {
    return <ErrorPage message="Error al cargar los cupones" />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <TicketPercent className="h-5 w-5 text-slate-600" />
            <h1 className="text-xl font-bold text-slate-800">
              Cupones
            </h1>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-sm text-slate-500">
              {cupones.length}
            </span>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Administra promociones para nuevas contrataciones de ADAMIA.
          </p>
        </div>

        <Button onClick={abrirCrear} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo cupón
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Cupones registrados"
          value={cupones.length}
          icon={<Gift className="h-5 w-5" />}
        />

        <MetricCard
          label="Cupones activos"
          value={activos}
          icon={<TicketPercent className="h-5 w-5" />}
        />

        <MetricCard
          label="Usos acumulados"
          value={usos}
          icon={<Users className="h-5 w-5" />}
        />
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Código</TableHead>
              <TableHead>Precio por empleado</TableHead>
              <TableHead>Duración</TableHead>
              <TableHead className="text-center">Usos</TableHead>
              <TableHead className="text-center">Activo</TableHead>
              <TableHead className="w-20 text-center">
                Acción
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {cupones.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-slate-400"
                >
                  No hay cupones registrados.
                </TableCell>
              </TableRow>
            ) : (
              cupones.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-sm font-semibold text-slate-700">
                      {item.codigo}
                    </span>
                  </TableCell>

                  <TableCell className="font-semibold text-slate-700">
                    {money(item.precio_por_empleado)}
                    <span className="ml-1 font-normal text-slate-400">
                      / empleado
                    </span>
                  </TableCell>

                  <TableCell className="text-slate-600">
                    {item.meses_duracion}{" "}
                    {Number(item.meses_duracion) === 1
                      ? "mes"
                      : "meses"}
                  </TableCell>

                  <TableCell className="text-center text-slate-600">
                    {item.usos || 0}
                  </TableCell>

                  <TableCell className="text-center">
                    <Switch
                      checked={Boolean(item.activo)}
                      disabled={changingId === item.id}
                      onCheckedChange={() => handleToggle(item)}
                    />
                  </TableCell>

                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                      onClick={() => abrirEditar(item)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
        Los cambios realizados a un cupón solo afectan futuras
        contrataciones. Las promociones que ya fueron aplicadas conservan
        el precio y duración originales.
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editItem ? "Editar cupón" : "Nuevo cupón"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Código *
              </label>
              <Input
                value={form.codigo}
                maxLength={50}
                autoComplete="off"
                placeholder="Ingresa el código del cupón"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    codigo: event.target.value.toUpperCase(),
                  }))
                }
              />
              <p className="mt-1 text-xs text-slate-400">
                El cliente ingresará este código al contratar.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Precio por empleado *
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="Ingresa el precio mensual"
                value={form.precio_por_empleado}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    precio_por_empleado: event.target.value,
                  }))
                }
              />
              <p className="mt-1 text-xs text-slate-400">
                Precio mensual por cada empleado durante la promoción.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Duración *
              </label>
              <Input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                placeholder="Ingresa la cantidad de meses"
                value={form.meses_duracion}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    meses_duracion: event.target.value,
                  }))
                }
              />
              <p className="mt-1 text-xs text-slate-400">
                Cantidad de meses durante los que se aplicará el precio
                promocional.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium text-slate-700">
                  Cupón activo
                </p>
                <p className="text-xs text-slate-400">
                  Permite utilizarlo en nuevas contrataciones.
                </p>
              </div>

              <Switch
                checked={form.activo}
                onCheckedChange={(checked) =>
                  setForm((current) => ({
                    ...current,
                    activo: checked,
                  }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>

            <Button onClick={handleGuardar} disabled={saving}>
              {saving
                ? "Guardando..."
                : editItem
                  ? "Guardar cambios"
                  : "Crear cupón"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricCard({ label, value, icon }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="mb-2 flex items-center justify-between text-slate-500">
        <p className="text-xs font-medium uppercase">{label}</p>
        {icon}
      </div>
      <p className="text-xl font-semibold text-slate-800">{value}</p>
    </div>
  );
}
