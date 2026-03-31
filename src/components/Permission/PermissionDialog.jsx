import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogFooter,
  DialogHeader,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useTiposPermisoData from "@/hooks/useTiposPermisoData";
import { Input } from "@/components/ui/input";
import { Textarea } from "../ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { useSnackbar } from "notistack";
import axios from "@/lib/axios";
import Cookies from "js-cookie";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CalendarCheck2, Save } from "lucide-react";

export const PermissionDialog = ({ open, setOpen, mutate, mode, selected }) => {
  const { dataUser } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const initialForm = {
    id_tipo_permiso: "",
    fecha_inicio: "",
    fecha_fin: "",
    motivo: "",
    estado: "Pendiente",
    id_empleado: dataUser?.id_empleado ?? "",
  };

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState([]);

  const isReadOnly = mode === "ver";
  const isEdit = mode === "editar";
  const isCreate = mode === "crear";

  useEffect(() => {
    if (open) {
      if ((mode === "editar" || mode === "ver") && selected) {
        setForm({
          id_tipo_permiso: String(selected.id_tipo_permiso),
          fecha_inicio: selected.fecha_inicio?.slice(0, 10),
          fecha_fin: selected.fecha_fin?.slice(0, 10),
          motivo: selected.motivo,
          estado: selected.estado,
          id_empleado: selected.id_empleado,
        });
      } else {
        setForm(initialForm);
      }
      setErrors([]);
    } else {
      setForm(initialForm);
      setErrors([]);
    }
  }, [open, mode, selected]);

  const { data: tiposPermisoResponse } = useTiposPermisoData();

  const arrayTiposPermiso = tiposPermisoResponse?.tiposPermiso;

  const validateForm = () => {
    const validationErrors = [];
    if (!form.id_tipo_permiso) validationErrors.push("Selecciona el tipo de permiso.");
    if (!form.fecha_inicio) validationErrors.push("La fecha de inicio es obligatoria.");
    if (!form.fecha_fin) validationErrors.push("La fecha fin es obligatoria.");
    if (
      form.fecha_inicio &&
      form.fecha_fin &&
      form.fecha_fin < form.fecha_inicio
    ) {
      validationErrors.push("La fecha fin no puede ser anterior a la fecha inicio.");
    }
    return validationErrors;
  };

  const getEmpresaIdSesion = () => {
    return (
      dataUser?.id_empresa ||
      dataUser?.empresas_detalle?.[0]?.id_empresa ||
      dataUser?.empresas?.[0] ||
      null
    );
  };

  const resolveEmpleadoId = async () => {
    const directId = Number(dataUser?.id_empleado || form.id_empleado || selected?.id_empleado);
    if (Number.isFinite(directId) && directId > 0) {
      return directId;
    }

    const correoSesion = String(dataUser?.correo || dataUser?.email || "").trim();
    const empresaSesion = getEmpresaIdSesion();
    if (!correoSesion || !empresaSesion) return null;

    try {
      const token = Cookies.get("token");
      const response = await axios.get(
        `/checador/empleados/por-correo?empresa=${empresaSesion}&correo=${encodeURIComponent(correoSesion)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const resolvedId = Number(response?.data?.id_empleado);
      return Number.isFinite(resolvedId) && resolvedId > 0 ? resolvedId : null;
    } catch {
      return null;
    }
  };

  const handleSave = async () => {
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      enqueueSnackbar("Revisa los campos marcados.", { variant: "warning" });
      return;
    }

    try {
      const token = Cookies.get("token");
      const empleadoId = await resolveEmpleadoId();
      if (!empleadoId) {
        setErrors((prev) => [
          ...prev,
          "No se pudo identificar tu empleado en la sesión. Contacta al administrador.",
        ]);
        enqueueSnackbar("No se pudo identificar el empleado de la sesión.", {
          variant: "error",
        });
        return;
      }
      const payload = {
        id_tipo_permiso: Number(form.id_tipo_permiso),
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
        motivo: form.motivo || null,
        estado: "Pendiente",
        id_empleado: empleadoId,
      };

      await axios.post(`/checador/solicitudes-permiso`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      enqueueSnackbar("Solicitud creada correctamente", { variant: "success" });
      setOpen(false);
      mutate?.();
    } catch (error) {
      enqueueSnackbar(
        error?.response?.data?.error || "No se pudo crear la solicitud",
        { variant: "error" }
      );
    }
  };

  const handleUpdate = async () => {
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      enqueueSnackbar("Revisa los campos marcados.", { variant: "warning" });
      return;
    }

    try {
      const token = Cookies.get("token");
      const empleadoId = await resolveEmpleadoId();
      if (!empleadoId) {
        setErrors((prev) => [
          ...prev,
          "No se pudo identificar tu empleado en la sesión. Contacta al administrador.",
        ]);
        enqueueSnackbar("No se pudo identificar el empleado de la sesión.", {
          variant: "error",
        });
        return;
      }
      const payload = {
        id_tipo_permiso: Number(form.id_tipo_permiso),
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
        motivo: form.motivo || null,
        id_empleado: empleadoId,
        estado: "Pendiente",
      };

      await axios.put(
        `/checador/solicitudes-permiso/${selected.id}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      enqueueSnackbar("Solicitud actualizada correctamente", {
        variant: "success",
      });
      setOpen(false);
      mutate?.();
    } catch (error) {
      console.error(error);
      enqueueSnackbar(
        error?.response?.data?.error || "No se pudo actualizar la solicitud",
        { variant: "error" }
      );
    }
  };

  const arrayFiltered = arrayTiposPermiso?.filter((permiso) => {
    return permiso.es_permiso === 1;
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 overflow-hidden max-w-[95vw] sm:max-w-xl">
        <DialogHeader className="p-5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <span className="grid size-9 place-items-center rounded-lg bg-white/15">
              <CalendarCheck2 className="size-5 text-white" />
            </span>
            {isCreate
              ? "Solicitar permiso"
              : isEdit
              ? "Editar solicitud"
              : "Detalles del permiso"}
          </DialogTitle>
          <p className="text-sm text-white/80">
            {isReadOnly
              ? "Consulta el detalle de la solicitud."
              : "Completa los datos de tu solicitud de permiso."}
          </p>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de permiso</Label>
              <Select
                value={form.id_tipo_permiso}
                onValueChange={(val) =>
                  setForm((prev) => ({
                    ...prev,
                    id_tipo_permiso: val,
                  }))
                }
                disabled={isReadOnly}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Selecciona un tipo de permiso" />
                </SelectTrigger>

                <SelectContent className="max-h-60 overflow-y-auto">
                  {arrayFiltered?.map((permiso) => (
                    <SelectItem key={permiso.id} value={String(permiso.id)}>
                      {permiso.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fecha inicial</Label>
              <Input
                type="date"
                value={form.fecha_inicio}
                onChange={(e) =>
                  setForm((formOriginal) => ({
                    ...formOriginal,
                    fecha_inicio: e.target.value,
                  }))
                }
                disabled={isReadOnly}
              ></Input>
            </div>

            <div className="space-y-2">
              <Label>Fecha final</Label>
              <Input
                type="date"
                value={form.fecha_fin}
                min={form.fecha_inicio || undefined}
                onChange={(e) =>
                  setForm((formOriginal) => ({
                    ...formOriginal,
                    fecha_fin: e.target.value,
                  }))
                }
                disabled={isReadOnly}
              />
            </div>
          </div>

          <div className="space-y-2">
              <Label>Motivo</Label>
              <Textarea
                rows={4}
                placeholder="Describe el motivo del permiso..."
                value={form.motivo}
                onChange={(e) =>
                  setForm((formOriginal) => ({
                    ...formOriginal,
                    motivo: e.target.value,
                  }))
                }
                disabled={isReadOnly}
              />
          </div>

          {errors.length > 0 ? (
            <Alert variant="destructive">
              <AlertTitle>Corrige los siguientes puntos</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 space-y-1">
                  {errors.map((errorMsg, index) => (
                    <li key={`error-${index}`}>{errorMsg}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : null}
        </div>

        <DialogFooter className="bg-gray-50 border-t border-gray-100 p-4 flex gap-2 sm:justify-end">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancelar
          </Button>

          {mode === "crear" && (
            <Button
              onClick={handleSave}
              className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white gap-2"
            >
              <Save className="h-4 w-4" />
              Guardar
            </Button>
          )}

          {mode === "editar" && (
            <Button
              onClick={handleUpdate}
              className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white gap-2"
            >
              <Save className="h-4 w-4" />
              Actualizar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
