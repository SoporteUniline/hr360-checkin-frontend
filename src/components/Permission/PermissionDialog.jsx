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
import dayjs from "dayjs";
import { Textarea } from "../ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { enqueueSnackbar } from "notistack";
import axios from "@/lib/axios";
import Cookies from "js-cookie";

export const PermissionDialog = ({ open, setOpen, mutate, mode, selected }) => {
  const { dataUser } = useAuth();
  const initialForm = {
    id_tipo_permiso: "",
    fecha_inicio: "",
    fecha_fin: "",
    motivo: "",
    estado: "Pendiente",
    id_empleado: dataUser?.id_empleado ?? "",
  };

  const [form, setForm] = useState(initialForm);

  const isReadOnly = mode === "ver";

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
    } else {
      setForm(initialForm);
    }
  }, [open, mode, selected]);

  const isExpired = false;

  const { data: tiposPermisoResponse } = useTiposPermisoData();

  const arrayTiposPermiso = tiposPermisoResponse?.tiposPermiso;

  const handleSave = async () => {
    try {
      const token = Cookies.get("token");

      const { data } = await axios.post(`/checador/solicitudes-permiso`, form, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      enqueueSnackbar("Solicitud creada correctamente", { variant: "success" });
      setOpen(false);
      mutate?.();
    } catch (error) {
      console.error(error);
      enqueueSnackbar(
        error?.response?.data?.error || "No se pudo crear la solicitud",
        { variant: "error" }
      );
    }
  };

  const handleUpdate = async () => {
    try {
      const token = Cookies.get("token");

      const { data } = await axios.put(
        `/checador/solicitudes-permiso/${selected.id}`,
        form,
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "crear"
              ? "Solicitar permiso"
              : mode === "editar"
              ? "Editar permiso"
              : "Detalles del permiso"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
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
                <SelectTrigger>
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
                min={dayjs().format("YYYY-MM-DD")}
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
                min={dayjs().format("YYYY-MM-DD")}
                onChange={(e) =>
                  setForm((formOriginal) => ({
                    ...formOriginal,
                    fecha_fin: e.target.value,
                  }))
                }
                disabled={isReadOnly}
              ></Input>
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
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancelar
          </Button>

          {mode === "crear" && <Button onClick={handleSave}>Guardar</Button>}

          {mode === "editar" && (
            <Button onClick={handleUpdate}>Actualizar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
