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
import {
  Plus,
  Trash2,
  Monitor,
  Pencil,
  ScanFace,
  RadioTower,
  CheckCircle2,
  CircleAlert,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CheckadoresPage() {
  const token = Cookies.get("token");
  const headers = { Authorization: `Bearer ${token}` };

  const {
    data: zktecoData,
    error: zktecoError,
    isLoading: zktecoLoading,
    mutate: mutateZkteco,
  } = useSWR("/checador/dispositivos", fetcherWithToken);

  const {
    data: hikvisionData,
    error: hikvisionError,
    isLoading: hikvisionLoading,
    mutate: mutateHikvision,
  } = useSWR("/hikvision/dispositivos", fetcherWithToken);

  const {
    data: hikvisionDetectedData,
    error: hikvisionDetectedError,
    isLoading: hikvisionDetectedLoading,
    mutate: mutateHikvisionDetected,
  } = useSWR("/hikvision/dispositivos/detectados", fetcherWithToken);

  const { data: empresasData } = useSWR(
    `/empresas?page=1&limit=200`,
    fetcherWithToken,
  );

  const [filtroEmpresa, setFiltroEmpresa] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ sn: "", id_empresa: "" });
  const [saving, setSaving] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editEmpresa, setEditEmpresa] = useState("");
  const [activeTab, setActiveTab] = useState("zkteco");

  const [hikvisionDialogOpen, setHikvisionDialogOpen] = useState(false);
  const [hikvisionEditItem, setHikvisionEditItem] = useState(null);

  const [hikvisionForm, setHikvisionForm] = useState({
    device_serial: "",
    id_empresa: "",
    nombre: "",
  });

  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    type: null,
    item: null,
  });

  const [deleting, setDeleting] = useState(false);

  const zktecoDevices = zktecoData?.checadores || [];
  const hikvisionDevices = hikvisionData?.checadores || [];
  const hikvisionDetected = hikvisionDetectedData?.checadores || [];
  const empresas = empresasData?.data || [];

  const filteredZkteco =
    filtroEmpresa !== "all"
      ? zktecoDevices.filter(
          (device) => String(device.id_empresa) === filtroEmpresa,
        )
      : zktecoDevices;

  const filteredHikvision =
    filtroEmpresa !== "all"
      ? hikvisionDevices.filter(
          (device) => String(device.id_empresa) === filtroEmpresa,
        )
      : hikvisionDevices;

  const unconfiguredHikvision = hikvisionDetected.filter(
    (device) => !device.configurado_id,
  );

  const handleToggle = async (item) => {
    try {
      await axiosInstance.put(
        `/checador/dispositivos/${item.id}/toggle`,
        { activo: !item.activo },
        { headers },
      );
      mutateZkteco();
    } catch {
      enqueueSnackbar("Error al cambiar estado", { variant: "error" });
    }
  };

  const handleDelete = (item) => {
    setDeleteDialog({
      open: true,
      type: "zkteco",
      item,
    });
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
      enqueueSnackbar("Checador actualizado correctamente", {
        variant: "success",
      });
      setEditItem(null);
      mutateZkteco();
    } catch {
      enqueueSnackbar("Error al actualizar", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleCrear = async () => {
    if (!form.sn.trim() || !form.id_empresa) {
      enqueueSnackbar("Número de serie y empresa son requeridos", {
        variant: "warning",
      });
      return;
    }
    setSaving(true);
    try {
      await axiosInstance.post(
        `/checador/dispositivos`,
        { sn: form.sn.trim(), id_empresa: form.id_empresa },
        { headers },
      );
      enqueueSnackbar("Checador registrado correctamente", {
        variant: "success",
      });
      setDialogOpen(false);
      setForm({ sn: "", id_empresa: "" });
      mutateZkteco();
    } catch (err) {
      const msg = err.response?.data?.error || "Error al registrar";
      enqueueSnackbar(msg, { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const refreshHikvision = async () => {
    await Promise.all([mutateHikvision(), mutateHikvisionDetected()]);
  };

  const openDetectedHikvisionDialog = (device) => {
    setHikvisionEditItem(null);
    setHikvisionForm({
      device_serial: device.device_serial || "",
      id_empresa: "",
      nombre: device.device_name || "",
    });
    setHikvisionDialogOpen(true);
  };

  const openHikvisionEditDialog = (device) => {
    setHikvisionEditItem(device);
    setHikvisionForm({
      device_serial: device.device_serial || "",
      id_empresa: String(device.id_empresa || ""),
      nombre: device.nombre || device.device_name || "",
    });
    setHikvisionDialogOpen(true);
  };

  const handleSaveHikvision = async () => {
    if (!hikvisionForm.device_serial.trim() || !hikvisionForm.id_empresa) {
      enqueueSnackbar("Selecciona el dispositivo y la empresa", {
        variant: "warning",
      });
      return;
    }

    setSaving(true);

    try {
      const payload = {
        device_serial: hikvisionForm.device_serial.trim().toUpperCase(),
        id_empresa: hikvisionForm.id_empresa,
        nombre: hikvisionForm.nombre.trim() || null,
      };

      if (hikvisionEditItem) {
        await axiosInstance.put(
          `/hikvision/dispositivos/${hikvisionEditItem.id}`,
          {
            id_empresa: payload.id_empresa,
            nombre: payload.nombre,
          },
          { headers },
        );

        enqueueSnackbar("Checador Hikvision actualizado", {
          variant: "success",
        });
      } else {
        await axiosInstance.post("/hikvision/dispositivos", payload, {
          headers,
        });

        enqueueSnackbar("Checador Hikvision asignado correctamente", {
          variant: "success",
        });
      }

      setHikvisionDialogOpen(false);
      setHikvisionEditItem(null);
      setHikvisionForm({
        device_serial: "",
        id_empresa: "",
        nombre: "",
      });

      await refreshHikvision();
    } catch (err) {
      enqueueSnackbar(
        err.response?.data?.error || "Error al guardar el checador Hikvision",
        { variant: "error" },
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleHikvision = async (device) => {
    try {
      await axiosInstance.put(
        `/hikvision/dispositivos/${device.id}/toggle`,
        { activo: !device.activo },
        { headers },
      );

      await refreshHikvision();
    } catch (err) {
      enqueueSnackbar(
        err.response?.data?.error || "Error al cambiar el estado",
        { variant: "error" },
      );
    }
  };

  const handleDeleteHikvision = (device) => {
    setDeleteDialog({
      open: true,
      type: "hikvision",
      item: device,
    });
  };

  const handleConfirmDelete = async () => {
    const { type, item } = deleteDialog;

    if (!item || !type) return;

    setDeleting(true);

    try {
      if (type === "zkteco") {
        await axiosInstance.delete(`/checador/dispositivos/${item.id}`, {
          headers,
        });

        enqueueSnackbar("Checador ZKTeco eliminado", {
          variant: "success",
        });

        await mutateZkteco();
      } else {
        await axiosInstance.delete(`/hikvision/dispositivos/${item.id}`, {
          headers,
        });

        enqueueSnackbar("Checador Hikvision desasignado", {
          variant: "success",
        });

        await refreshHikvision();
      }

      setDeleteDialog({
        open: false,
        type: null,
        item: null,
      });
    } catch (error) {
      enqueueSnackbar(
        error.response?.data?.error || "Error al eliminar el checador",
        { variant: "error" },
      );
    } finally {
      setDeleting(false);
    }
  };

  const currentCount =
    activeTab === "zkteco" ? filteredZkteco.length : filteredHikvision.length;

  const currentLoading =
    activeTab === "zkteco"
      ? zktecoLoading
      : hikvisionLoading || hikvisionDetectedLoading;

  const currentError =
    activeTab === "zkteco"
      ? zktecoError
      : hikvisionError || hikvisionDetectedError;

  const formatDateTime = (value) => {
    if (!value) return "Sin eventos";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (currentLoading) {
    return <LoadingTable rows={8} />;
  }

  if (currentError) {
    return <ErrorPage message="Error al cargar los checadores" />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Monitor className="h-5 w-5 text-slate-600" />

          <h1 className="text-xl font-bold text-slate-800">
            Checadores (Dispositivos)
          </h1>

          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-sm text-slate-500">
            {currentCount}
          </span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Select value={filtroEmpresa} onValueChange={setFiltroEmpresa}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="Filtrar por empresa" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">Todas las empresas</SelectItem>

              {empresas.map((empresa) => (
                <SelectItem
                  key={empresa.id_empresa}
                  value={String(empresa.id_empresa)}
                >
                  {empresa.nombre_empresa}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {activeTab === "zkteco" ? (
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Agregar ZKTeco
            </Button>
          ) : (
            <Button
              onClick={() => {
                setHikvisionEditItem(null);
                setHikvisionForm({
                  device_serial: "",
                  id_empresa: "",
                  nombre: "",
                });
                setHikvisionDialogOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Agregar Hikvision
            </Button>
          )}
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="zkteco" className="gap-2">
            <RadioTower className="h-4 w-4" />
            ZKTeco
          </TabsTrigger>

          <TabsTrigger value="hikvision" className="gap-2">
            <ScanFace className="h-4 w-4" />
            Hikvision
            {unconfiguredHikvision.length > 0 && (
              <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700">
                {unconfiguredHikvision.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ================================================================
            ZKTECO
        ================================================================= */}
        <TabsContent value="zkteco" className="space-y-4">
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Número de serie (SN)</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead className="text-center">Activo</TableHead>
                  <TableHead className="w-24 text-center" />
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredZkteco.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-10 text-center text-slate-400"
                    >
                      No hay checadores ZKTeco registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredZkteco.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono font-semibold text-slate-700">
                        {item.sn}
                      </TableCell>

                      <TableCell className="text-slate-600">
                        {item.nombre_empresa}
                      </TableCell>

                      <TableCell className="text-center">
                        <Switch
                          checked={Boolean(item.activo)}
                          onCheckedChange={() => handleToggle(item)}
                        />
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                            onClick={() => {
                              setEditItem(item);
                              setEditEmpresa(String(item.id_empresa));
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:bg-red-50 hover:text-red-700"
                            onClick={() => handleDelete(item)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ================================================================
            HIKVISION
        ================================================================= */}
        <TabsContent value="hikvision" className="space-y-5">
          {unconfiguredHikvision.length > 0 && (
            <section className="overflow-hidden rounded-lg border border-amber-200 bg-amber-50/40">
              <div className="flex items-start gap-3 border-b border-amber-200 px-4 py-3">
                <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

                <div>
                  <h2 className="font-semibold text-slate-800">
                    Dispositivos detectados sin configurar
                  </h2>

                  <p className="text-sm text-slate-600">
                    Estos dispositivos ya enviaron eventos, pero todavía no
                    están asignados a una empresa.
                  </p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dispositivo</TableHead>
                    <TableHead>Número de serie</TableHead>
                    <TableHead className="text-center">Eventos</TableHead>
                    <TableHead>Último evento</TableHead>
                    <TableHead className="w-32 text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {unconfiguredHikvision.map((device) => (
                    <TableRow key={device.device_serial}>
                      <TableCell>
                        <div className="font-medium text-slate-800">
                          {device.device_name || "Dispositivo Hikvision"}
                        </div>

                        {device.reader_name && (
                          <div className="text-xs text-slate-500">
                            {device.reader_name}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="font-mono text-slate-700">
                        {device.device_serial}
                      </TableCell>

                      <TableCell className="text-center">
                        {device.eventos || 0}
                      </TableCell>

                      <TableCell className="text-slate-600">
                        {formatDateTime(device.ultimo_evento)}
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => openDetectedHikvisionDialog(device)}
                        >
                          Asignar empresa
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>
          )}

          <section className="overflow-hidden rounded-lg border">
            <div className="flex items-center justify-between border-b bg-slate-50 px-4 py-3">
              <div>
                <h2 className="font-semibold text-slate-800">
                  Checadores Hikvision configurados
                </h2>

                <p className="text-sm text-slate-500">
                  Cada dispositivo identifica la empresa a la que pertenecen sus
                  eventos.
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-sm text-slate-500">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                {filteredHikvision.length} configurados
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Número de serie</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead className="text-center">Eventos</TableHead>
                  <TableHead>Último evento</TableHead>
                  <TableHead className="text-center">Activo</TableHead>
                  <TableHead className="w-24 text-center" />
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredHikvision.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-10 text-center text-slate-400"
                    >
                      No hay checadores Hikvision configurados
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredHikvision.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell>
                        <div className="font-medium text-slate-800">
                          {device.nombre ||
                            device.device_name ||
                            "Dispositivo Hikvision"}
                        </div>

                        {device.reader_name && (
                          <div className="text-xs text-slate-500">
                            {device.reader_name}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="font-mono font-semibold text-slate-700">
                        {device.device_serial}
                      </TableCell>

                      <TableCell className="text-slate-600">
                        {device.nombre_empresa}
                      </TableCell>

                      <TableCell className="text-center">
                        {device.eventos || 0}
                      </TableCell>

                      <TableCell className="text-slate-600">
                        {formatDateTime(device.ultimo_evento)}
                      </TableCell>

                      <TableCell className="text-center">
                        <Switch
                          checked={Boolean(device.activo)}
                          onCheckedChange={() => handleToggleHikvision(device)}
                        />
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                            onClick={() => openHikvisionEditDialog(device)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:bg-red-50 hover:text-red-700"
                            onClick={() => handleDeleteHikvision(device)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </section>
        </TabsContent>
      </Tabs>

      {/* ================================================================
          EDITAR ZKTECO
      ================================================================= */}
      <Dialog
        open={Boolean(editItem)}
        onOpenChange={(open) => {
          if (!open) {
            setEditItem(null);
            setEditEmpresa("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar checador — {editItem?.sn}</DialogTitle>
          </DialogHeader>

          <div className="py-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Empresa
            </label>

            <Select value={editEmpresa} onValueChange={setEditEmpresa}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una empresa" />
              </SelectTrigger>

              <SelectContent className="max-h-60 overflow-y-auto">
                {empresas.map((empresa) => (
                  <SelectItem
                    key={empresa.id_empresa}
                    value={String(empresa.id_empresa)}
                  >
                    {empresa.nombre_empresa}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditItem(null);
                setEditEmpresa("");
              }}
            >
              Cancelar
            </Button>

            <Button onClick={handleEditarGuardar} disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================
          CREAR ZKTECO
      ================================================================= */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);

          if (!open) {
            setForm({
              sn: "",
              id_empresa: "",
            });
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar checador ZKTeco</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Número de serie del dispositivo (SN)
              </label>

              <Input
                placeholder="Ej. BKMS231700123"
                value={form.sn}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    sn: event.target.value.toUpperCase(),
                  }))
                }
              />

              <p className="mt-1 text-xs text-slate-400">
                Se encuentra en la etiqueta trasera del dispositivo ZKTeco.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Empresa
              </label>

              <Select
                value={form.id_empresa}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    id_empresa: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una empresa" />
                </SelectTrigger>

                <SelectContent>
                  {empresas.map((empresa) => (
                    <SelectItem
                      key={empresa.id_empresa}
                      value={String(empresa.id_empresa)}
                    >
                      {empresa.nombre_empresa}
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

      {/* ================================================================
          ASIGNAR / EDITAR HIKVISION
      ================================================================= */}
      <Dialog
        open={hikvisionDialogOpen}
        onOpenChange={(open) => {
          setHikvisionDialogOpen(open);

          if (!open) {
            setHikvisionEditItem(null);
            setHikvisionForm({
              device_serial: "",
              id_empresa: "",
              nombre: "",
            });
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {hikvisionEditItem
                ? "Editar checador Hikvision"
                : "Asignar checador Hikvision"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Número de serie
              </label>

              <Input
                placeholder="Ej. FT8077035"
                value={hikvisionForm.device_serial}
                disabled={Boolean(hikvisionEditItem)}
                className="font-mono"
                onChange={(event) =>
                  setHikvisionForm((current) => ({
                    ...current,
                    device_serial: event.target.value.trimStart().toUpperCase(),
                  }))
                }
              />

              <p className="mt-1 text-xs text-slate-400">
                {hikvisionEditItem
                  ? "El número de serie no puede modificarse después de registrar el dispositivo."
                  : "Puedes capturarlo manualmente o asignar un dispositivo detectado automáticamente."}
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Nombre descriptivo
              </label>

              <Input
                placeholder="Ej. Entrada principal"
                value={hikvisionForm.nombre}
                onChange={(event) =>
                  setHikvisionForm((current) => ({
                    ...current,
                    nombre: event.target.value,
                  }))
                }
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Empresa
              </label>

              <Select
                value={hikvisionForm.id_empresa}
                onValueChange={(value) =>
                  setHikvisionForm((current) => ({
                    ...current,
                    id_empresa: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una empresa" />
                </SelectTrigger>

                <SelectContent className="max-h-60 overflow-y-auto">
                  {empresas.map((empresa) => (
                    <SelectItem
                      key={empresa.id_empresa}
                      value={String(empresa.id_empresa)}
                    >
                      {empresa.nombre_empresa}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setHikvisionDialogOpen(false)}
            >
              Cancelar
            </Button>

            <Button onClick={handleSaveHikvision} disabled={saving}>
              {saving
                ? "Guardando..."
                : hikvisionEditItem
                ? "Guardar cambios"
                : "Asignar empresa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => {
          if (!deleting) {
            setDeleteDialog((current) => ({
              ...current,
              open,
              ...(open ? {} : { type: null, item: null }),
            }));
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>

              <div className="space-y-1">
                <DialogTitle>
                  {deleteDialog.type === "hikvision"
                    ? "Desasignar checador Hikvision"
                    : "Eliminar checador ZKTeco"}
                </DialogTitle>

                <p className="text-sm text-slate-500">
                  {deleteDialog.type === "hikvision"
                    ? "El dispositivo dejará de procesar checadas hasta que vuelva a asignarse a una empresa."
                    : "El dispositivo será eliminado de la lista de checadores registrados."}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="rounded-lg border bg-slate-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Dispositivo
            </p>

            <p className="mt-1 font-medium text-slate-800">
              {deleteDialog.type === "hikvision"
                ? deleteDialog.item?.nombre ||
                  deleteDialog.item?.device_name ||
                  "Checador Hikvision"
                : deleteDialog.item?.nombre || "Checador ZKTeco"}
            </p>

            <p className="mt-0.5 font-mono text-sm text-slate-600">
              {deleteDialog.type === "hikvision"
                ? deleteDialog.item?.device_serial
                : deleteDialog.item?.sn}
            </p>
          </div>

          {deleteDialog.type === "hikvision" && (
            <p className="text-sm text-slate-500">
              Los eventos históricos enviados por HikCentral no se eliminarán.
            </p>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              disabled={deleting}
              onClick={() =>
                setDeleteDialog({
                  open: false,
                  type: null,
                  item: null,
                })
              }
            >
              Cancelar
            </Button>

            <Button
              variant="destructive"
              disabled={deleting}
              onClick={handleConfirmDelete}
            >
              {deleting
                ? "Eliminando..."
                : deleteDialog.type === "hikvision"
                ? "Desasignar"
                : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
