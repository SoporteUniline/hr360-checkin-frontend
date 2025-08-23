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

export default function DepartamentoFormDialog({
  open,
  setOpen,
  editDep,
  id_empresa,
  departamentos = [],
  mutateKey,
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (editDep) setNombre(editDep.nombre);
    else setNombre("");
    setError("");
  }, [editDep, open]);

  const handleSubmit = async () => {
    if (!nombre.trim()) {
      setError("El nombre no puede estar vacío.");
      return;
    }

    const existe = departamentos.some(
      (dep) =>
        dep.nombre.toLowerCase() === nombre.toLowerCase() &&
        dep.id_departamento !== editDep?.id_departamento
    );
    if (existe) {
      setError("Ya existe un departamento con este nombre.");
      return;
    }

    try {
      if (editDep) {
        await axios.put(
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/departamentos/${editDep.id_departamento}`,
          { nombre }
        );
        enqueueSnackbar("Departamento actualizado correctamente", {
          variant: "success",
        });
      } else {
        await axios.post(
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/departamentos`,
          { nombre, id_empresa }
        );
        enqueueSnackbar("Departamento agregado correctamente", {
          variant: "success",
        });
      }
      await mutate(
        (key) => typeof key === "string" && key.startsWith(mutateKey)
      );

      setOpen(false);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setError("Ya existe un departamento con este nombre");
        enqueueSnackbar("Ya existe un departamento con este nombre", {
          variant: "error",
        });
      } else {
        console.error("Error al guardar departamento", err);
        enqueueSnackbar("Error al guardar departamento", { variant: "error" });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editDep ? "Editar departamento" : "Nuevo departamento"}
          </DialogTitle>
        </DialogHeader>
        <div className="my-4 space-y-2">
          <Input
            placeholder="Nombre del departamento"
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
            {editDep ? "Actualizar" : "Agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
