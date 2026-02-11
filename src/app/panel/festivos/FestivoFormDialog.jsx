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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {editFestivo ? "Editar día festivo" : "Nuevo día festivo"}
          </DialogTitle>
        </DialogHeader>

        <div className="my-4 space-y-4">
          {/* SECCIÓN DE EMPRESA: Solo se muestra al crear y si hay más de una empresa disponible */}
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

          <div className="flex flex-col gap-2">
            <Label>Fecha</Label>
            <Input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Descripción</Label>
            <Input
              placeholder="Ej. Aniversario de la empresa"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full"
            />
          </div>

          {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
        </div>

        <DialogFooter className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="bg-white border border-[#d1d5db] text-[#374151] hover:bg-[#f9fafb]"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-[#37495E] hover:bg-[#2c3a4a] text-white shadow-[0_4px_12px_rgba(55,73,94,0.3)]"
          >
            {editFestivo ? "Actualizar" : "Agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
