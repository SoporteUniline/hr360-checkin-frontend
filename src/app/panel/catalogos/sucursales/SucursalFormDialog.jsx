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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-3 rounded-lg shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <DialogTitle className="text-xl font-bold text-gray-900">
              {editSuc ? "Editar sucursal" : "Nueva sucursal"}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="bg-emerald-500 p-2 rounded-lg flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-700">
                Las sucursales te permiten organizar a tus empleados por ubicación geográfica.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Nombre de la sucursal
            </label>
            <Input
              placeholder="Ej. Matriz, Sucursal Norte, Guadalajara..."
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value);
                setError("");
              }}
              className="w-full"
              autoFocus
            />
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700 font-medium">⚠️ {error}</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-end gap-3 mt-6">
          <Button 
            variant="outline" 
            onClick={() => setOpen(false)}
            className="border-gray-300"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-medium shadow-sm"
          >
            {editSuc ? "Actualizar" : "Agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
