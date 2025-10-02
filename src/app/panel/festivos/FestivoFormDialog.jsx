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

export default function FestivoFormDialog({
  open,
  setOpen,
  editFestivo,
  id_empresa,
  festivos = [],
  mutateKey,
}) {
  const [fecha, setFecha] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState("");
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (editFestivo) {
      setFecha(editFestivo.fecha);
      setDescripcion(editFestivo.descripcion);
    } else {
      setFecha("");
      setDescripcion("");
    }
    setError("");
  }, [editFestivo, open]);

  const handleSubmit = async () => {
    if (!fecha) {
      setError("La fecha no puede estar vacía.");
      return;
    }

    try {
      if (editFestivo) {
        await axios.put(
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/holidays/${editFestivo.id}`,
          { fecha, descripcion }
        );
        enqueueSnackbar("Festivo actualizado correctamente", {
          variant: "success",
        });
      } else {
        await axios.post(
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/holidays`,
          { id_empresa, fecha, descripcion }
        );
        enqueueSnackbar("Festivo agregado correctamente", {
          variant: "success",
        });
      }
      await mutate(
        (key) => typeof key === "string" && key.startsWith(mutateKey)
      );
      setOpen(false);
    } catch (err) {
      console.error("Error al guardar festivo", err);
      enqueueSnackbar("Error al guardar festivo", { variant: "error" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editFestivo ? "Editar día festivo" : "Nuevo día festivo"}
          </DialogTitle>
        </DialogHeader>
        <div className="my-4 space-y-2">
          <Input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full"
          />
          <Input
            placeholder="Descripción"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="w-full"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
        <DialogFooter className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            {editFestivo ? "Actualizar" : "Agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
