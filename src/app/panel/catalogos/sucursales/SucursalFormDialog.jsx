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

export default function SucursalFormDialog({
  open,
  setOpen,
  editSuc,
  id_empresa,
  sucursales = [],
  mutateKey,
}) {
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (editSuc) setNombre(editSuc.nombre);
    else setNombre("");
    setError("");
  }, [editSuc, open]);

  const handleSubmit = async () => {
    if (!nombre.trim()) {
      setError("El nombre no puede estar vacío.");
      return;
    }

    const existe = sucursales.some(
      (suc) =>
        suc.nombre.toLowerCase() === nombre.toLowerCase() &&
        suc.id_sucursal !== editSuc?.id_sucursal
    );
    if (existe) {
      setError("Ya existe una sucursal con este nombre.");
      return;
    }

    try {
      if (editSuc) {
        await axios.put(
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/sucursales/${editSuc.id_sucursal}`,
          { nombre }
        );
        enqueueSnackbar("Sucursal actualizada correctamente", {
          variant: "success",
        });
      } else {
        await axios.post(
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/sucursales`,
          { nombre, id_empresa }
        );
        enqueueSnackbar("Sucursal agregada correctamente", {
          variant: "success",
        });
      }
      await mutate(
        (key) => typeof key === "string" && key.startsWith(mutateKey)
      );

      setOpen(false);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setError("Ya existe una sucursal con este nombre");
        enqueueSnackbar("Ya existe una sucursal con este nombre", {
          variant: "error",
        });
      } else {
        console.error("Error al guardar sucursal", err);
        enqueueSnackbar("Error al guardar sucursal", { variant: "error" });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editSuc ? "Editar sucursal" : "Nueva sucursal"}
          </DialogTitle>
        </DialogHeader>
        <div className="my-4 space-y-2">
          <Input
            placeholder="Nombre de la sucursal"
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
          {/* Secundario según `Colores.txt` */}
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="bg-white border border-[#d1d5db] text-[#374151] hover:bg-[#f9fafb]"
          >
            Cancelar
          </Button>
          {/* Primario según `Colores.txt` */}
          <Button
            onClick={handleSubmit}
            className="bg-[#37495E] hover:bg-[#2c3a4a] text-white shadow-[0_4px_12px_rgba(55,73,94,0.3)]"
          >
            {editSuc ? "Actualizar" : "Agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
