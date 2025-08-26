"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import axios from "axios";
import { mutate } from "swr";
import { useSnackbar } from "notistack";
import { Checkbox } from "@/components/ui/checkbox";

export default function TipoRegistroFormDialog({
  open,
  setOpen,
  editRegistro,
  registros = [],
  mutateKey,
}) {
  const { enqueueSnackbar } = useSnackbar();

  const [form, setForm] = useState({
    clave: "",
    nombre: "",
    descripcion: "",
    goce_sueldo: 0,
    cuenta_como_asistencia: 0,
    descuenta_vacaciones: 0,
    envia_asistencia_automatica: 0,
    es_permiso: 0,
    es_festivo: 0,
    aplica_a_empresa: "Todas",
  });

  const [error, setError] = useState("");

  useEffect(() => {
    if (editRegistro) {
      setForm({
        clave: editRegistro.clave || "",
        nombre: editRegistro.nombre || "",
        descripcion: editRegistro.descripcion || "",
        goce_sueldo: editRegistro.goce_sueldo || 0,
        cuenta_como_asistencia: editRegistro.cuenta_como_asistencia || 0,
        descuenta_vacaciones: editRegistro.descuenta_vacaciones || 0,
        envia_asistencia_automatica:
          editRegistro.envia_asistencia_automatica || 0,
        es_permiso: editRegistro.es_permiso || 0,
        es_festivo: editRegistro.es_festivo || 0,
        aplica_a_empresa: editRegistro.aplica_a_empresa || "Todas",
      });
    } else {
      setForm({
        clave: "",
        nombre: "",
        descripcion: "",
        goce_sueldo: 0,
        cuenta_como_asistencia: 0,
        descuenta_vacaciones: 0,
        envia_asistencia_automatica: 0,
        es_permiso: 0,
        es_festivo: 0,
        aplica_a_empresa: "Todas",
      });
    }
    setError("");
  }, [editRegistro, open]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleSubmit = async () => {
    if (!form.clave.trim() || !form.nombre.trim()) {
      setError("La clave y el nombre son obligatorios.");
      return;
    }

    const existe = registros.some(
      (reg) =>
        reg.nombre.toLowerCase() === form.nombre.toLowerCase() &&
        reg.id !== editRegistro?.id
    );
    if (existe) {
      setError("Ya existe un tipo de registro con este nombre.");
      return;
    }

    try {
      if (editRegistro) {
        await axios.put(
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/tiposPermiso/${editRegistro.id}`,
          form
        );
        enqueueSnackbar("Tipo de registro actualizado correctamente", {
          variant: "success",
        });
      } else {
        await axios.post(
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/tiposPermiso`,
          form
        );
        enqueueSnackbar("Tipo de registro agregado correctamente", {
          variant: "success",
        });
      }

      await mutate(
        (key) => typeof key === "string" && key.startsWith(mutateKey)
      );

      setOpen(false);
    } catch (err) {
      console.error("Error al guardar tipo de registro", err);
      enqueueSnackbar("Error al guardar tipo de registro", {
        variant: "error",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editRegistro
              ? "Editar tipo de registro"
              : "Nuevo tipo de registro"}
          </DialogTitle>
        </DialogHeader>

        <div className="my-4 space-y-3">
          <Input
            placeholder="Clave"
            value={form.clave}
            onChange={(e) => handleChange("clave", e.target.value)}
          />
          <Input
            placeholder="Nombre"
            value={form.nombre}
            onChange={(e) => handleChange("nombre", e.target.value)}
          />
          <Input
            placeholder="Descripción"
            value={form.descripcion}
            onChange={(e) => handleChange("descripcion", e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2">
              <Checkbox
                checked={!!form.goce_sueldo}
                onCheckedChange={(val) =>
                  handleChange("goce_sueldo", val ? 1 : 0)
                }
              />
              Goce sueldo
            </label>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={!!form.cuenta_como_asistencia}
                onCheckedChange={(val) =>
                  handleChange("cuenta_como_asistencia", val ? 1 : 0)
                }
              />
              Cuenta como asistencia
            </label>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={!!form.descuenta_vacaciones}
                onCheckedChange={(val) =>
                  handleChange("descuenta_vacaciones", val ? 1 : 0)
                }
              />
              Descuenta vacaciones
            </label>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={!!form.envia_asistencia_automatica}
                onCheckedChange={(val) =>
                  handleChange("envia_asistencia_automatica", val ? 1 : 0)
                }
              />
              Envia asistencia automática
            </label>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={!!form.es_permiso}
                onCheckedChange={(val) =>
                  handleChange("es_permiso", val ? 1 : 0)
                }
              />
              Es permiso
            </label>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={!!form.es_festivo}
                onCheckedChange={(val) =>
                  handleChange("es_festivo", val ? 1 : 0)
                }
              />
              Es festivo
            </label>
          </div>

          <Input
            placeholder="Aplica a empresa"
            value={form.aplica_a_empresa}
            onChange={(e) => handleChange("aplica_a_empresa", e.target.value)}
          />

          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>

        <DialogFooter className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            {editRegistro ? "Actualizar" : "Agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
