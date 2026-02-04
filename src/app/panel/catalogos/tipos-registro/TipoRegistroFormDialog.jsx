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
import { BookOpen, Info, Save } from "lucide-react";

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
      <DialogContent className="p-0 overflow-hidden sm:max-w-lg">
        <DialogHeader className="p-5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <span className="grid size-9 place-items-center rounded-lg bg-white/15">
              <BookOpen className="size-5 text-white" />
            </span>
            {editRegistro ? "Editar tipo de registro" : "Nuevo tipo de registro"}
          </DialogTitle>
          <p className="text-sm text-white/80">Configura cómo se comporta este registro en asistencias/permisos.</p>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto p-5 space-y-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 flex gap-2">
            <Info className="h-4 w-4 mt-0.5 text-blue-700" />
            <div>
              Cambios en este catálogo impactan filtros y cálculos en módulos como <b>Asistencias</b>, <b>Permisos</b> y <b>Vacaciones</b>.
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
          <Input
            placeholder="Clave"
            value={form.clave}
            onChange={(e) => handleChange("clave", e.target.value)}
            className="bg-white"
          />
          <Input
            placeholder="Nombre"
            value={form.nombre}
            onChange={(e) => handleChange("nombre", e.target.value)}
            className="bg-white"
          />
          <Input
            placeholder="Descripción"
            value={form.descripcion}
            onChange={(e) => handleChange("descripcion", e.target.value)}
            className="bg-white"
          />
          </div>

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
            className="bg-white"
          />

          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>

        <DialogFooter className="bg-gray-50 border-t border-gray-100 p-4 flex gap-2 sm:justify-end">
          <Button variant="outline" onClick={() => setOpen(false)} className="border-gray-300 text-gray-700 hover:bg-gray-100">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white gap-2">
            <Save className="h-4 w-4" />
            {editRegistro ? "Actualizar" : "Agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
