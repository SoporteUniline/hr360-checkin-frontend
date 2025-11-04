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

export default function PositionFormDialog({
  open,
  setOpen,
  editPosition,
  id_empresa,
  positions = [],
  mutateKey,
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (editPosition) setNombre(editPosition.nombre_puesto);
    else setNombre("");
    setError("");
  }, [editPosition, open]);

  const handleSubmit = async () => {
    if (!nombre.trim()) {
      setError("El nombre no puede estar vacío.");
      return;
    }

    const existe = positions.some(
      (position) =>
        position.nombre_puesto.toLowerCase() === nombre.toLowerCase() &&
        position.id_puesto !== editPosition?.id_puesto
    );
    if (existe) {
      setError("Ya existe un puesto con este nombre.");
      return;
    }

    try {
      if (editPosition) {
        await axios.put(
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/puestos/${editPosition.id_puesto}`,
          { nombre }
        );
        enqueueSnackbar("Puesto actualizado correctamente", {
          variant: "success",
        });
      } else {
        await axios.post(
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/puestos`,
          { nombre, id_empresa }
        );
        enqueueSnackbar("Puesto agregado correctamente", {
          variant: "success",
        });
      }
      await mutate(
        (key) => typeof key === "string" && key.startsWith(mutateKey)
      );

      setOpen(false);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setError("Ya existe un puesto con este nombre");
        enqueueSnackbar("Ya existe un puesto con este nombre", {
          variant: "error",
        });
      } else {
        console.error("Error al guardar puesto", err);
        enqueueSnackbar("Error al guardar puesto", { variant: "error" });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editPosition ? "Editar puesto" : "Nuevo puesto"}
          </DialogTitle>
        </DialogHeader>
        <div className="my-4 space-y-2">
          <Input
            placeholder="Nombre del puesto"
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value);
              setError("");
            }}
            className="w-full"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
        <DialogFooter className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            {editPosition ? "Actualizar" : "Agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
