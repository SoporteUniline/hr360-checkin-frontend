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

export default function EstadoCivilFormDialog({
  open,
  setOpen,
  editCiv,
  id_empresa,
  estadoCivil = [],
  mutateKey,
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (editCiv) setNombre(editCiv.nombre);
    else setNombre("");
    setError("");
  }, [editCiv, open]);

  const handleSubmit = async () => {
    if (!nombre.trim()) {
      setError("El nombre no puede estar vacío.");
      return;
    }

    const existe = estadoCivil.some(
      (civ) =>
        civ.nombre.toLowerCase() === nombre.toLowerCase() &&
        civ.id_estado_civil !== editCiv?.id_estado_civil
    );
    if (existe) {
      setError("Ya existe un estado civil con este nombre.");
      return;
    }

    try {
      if (editCiv) {
        await axios.put(
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/estados-civiles/${editCiv.id_estado_civil}`,
          { nombre }
        );
        enqueueSnackbar("Estado civil actualizado correctamente", {
          variant: "success",
        });
      } else {
        await axios.post(
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/estados-civiles`,
          { nombre, id_empresa }
        );
        enqueueSnackbar("Estado civil agregado correctamente", {
          variant: "success",
        });
      }
      await mutate(
        (key) => typeof key === "string" && key.startsWith(mutateKey)
      );

      setOpen(false);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setError("Ya existe un estado civil con este nombre");
        enqueueSnackbar("Ya existe un estado civil con este nombre", {
          variant: "error",
        });
      } else {
        console.error("Error al guardar estado civil", err);
        enqueueSnackbar("Error al guardar estado civil", { variant: "error" });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editCiv ? "Editar estado civil" : "Nuevo estado civil"}
          </DialogTitle>
        </DialogHeader>
        <div className="my-4 space-y-2">
          <Input
            placeholder="Nombre del estado civil"
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
            {editCiv ? "Actualizar" : "Agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
