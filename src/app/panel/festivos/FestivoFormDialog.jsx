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
import { Label } from "@/components/ui/label"; // Importamos Label para consistencia
import { Combobox } from "@/components/Combobox"; // Importamos tu Combobox
import axios from "axios";
import { mutate } from "swr";
import { useSnackbar } from "notistack";
import { CalendarDays, Info, Save } from "lucide-react";

export default function FestivoFormDialog({
  open,
  setOpen,
  editFestivo,
  id_empresa, // Este puede venir como "all" o un ID numérico
  festivos = [],
  mutateKey,
  empresas = [], // Recibimos la lista de empresas_detalle
}) {
  const [fecha, setFecha] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [idEmpresaSeleccionada, setIdEmpresaSeleccionada] = useState("");
  const [error, setError] = useState("");
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (editFestivo) {
      setFecha(editFestivo.fecha || "");
      setDescripcion(editFestivo.descripcion || "");
      setIdEmpresaSeleccionada(editFestivo.id_empresa);
    } else {
      setFecha("");
      setDescripcion("");
      // Lógica de pre-selección:
      // Si el filtro de la página es una empresa específica, la usamos.
      // Si es "all", dejamos que el usuario elija o ponemos la primera de la lista.
      const preseleccionada = id_empresa === "all" ? "" : id_empresa;
      setIdEmpresaSeleccionada(preseleccionada);
    }
    setError("");
  }, [editFestivo, open, id_empresa]);

  const handleSubmit = async () => {
    if (!fecha) {
      setError("La fecha no puede estar vacía.");
      return;
    }

    if (!idEmpresaSeleccionada) {
      setError("Debes seleccionar una empresa.");
      return;
    }

    try {
      const payload = {
        id_empresa: Number(idEmpresaSeleccionada),
        fecha,
        descripcion,
      };

      if (editFestivo) {
        await axios.put(
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/holidays/${editFestivo.id}`,
          { fecha, descripcion },
        );
        enqueueSnackbar("Festivo actualizado correctamente", {
          variant: "success",
        });
      } else {
        await axios.post(
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/holidays`,
          payload,
        );
        enqueueSnackbar("Festivo agregado correctamente", {
          variant: "success",
        });
      }

      // Invalidamos la cache de SWR para refrescar la tabla
      await mutate(
        (key) => typeof key === "string" && key.startsWith(mutateKey),
      );
      setOpen(false);
    } catch (err) {
      // console.error("Error al guardar festivo", err);

      const mensajeError =
        err.response?.data?.error || "Error al guardar festivo";
      setError(mensajeError);
      enqueueSnackbar(mensajeError, { variant: "error" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 overflow-hidden sm:max-w-lg">
        <DialogHeader className="p-5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <span className="grid size-9 place-items-center rounded-lg bg-white/15">
              <CalendarDays className="size-5 text-white" />
            </span>
            {editFestivo ? "Editar día festivo" : "Nuevo día festivo"}
          </DialogTitle>
          <p className="text-sm text-white/80">
            {editFestivo
              ? "Actualiza la fecha o descripción del festivo."
              : "Agrega un día festivo para la empresa."}
          </p>
        </DialogHeader>

        <div className="p-5 space-y-3">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 flex gap-2">
            <Info className="h-4 w-4 mt-0.5 text-blue-700" />
            <div>
              Estos días se usan para el cálculo de días hábiles en módulos como{" "}
              <b>Permisos</b> y <b>Panel de empleados</b>.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {!editFestivo && empresas.length > 1 && (
              <div className="flex flex-col gap-2">
                <Label>Empresa destino</Label>
                <Combobox
                  options={empresas.map((e) => ({
                    value: e.id_empresa,
                    label: e.nombre,
                  }))}
                  value={idEmpresaSeleccionada}
                  onChange={(val) => setIdEmpresaSeleccionada(val)}
                  placeholder="Seleccionar empresa"
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Fecha</label>
              <Input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full bg-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Descripción
              </label>
              <Input
                placeholder="Ej. Natalicio Benito Juárez"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="w-full bg-white"
              />
            </div>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>

        <DialogFooter className="bg-gray-50 border-t border-gray-100 p-4 flex gap-2 sm:justify-end">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white gap-2"
          >
            <Save className="h-4 w-4" />
            {editFestivo ? "Actualizar" : "Agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
