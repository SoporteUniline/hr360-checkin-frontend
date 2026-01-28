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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-br from-[#7C3AED] to-[#6d28d9] p-3 rounded-lg shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <DialogTitle className="text-xl font-bold text-gray-900">
              {editPosition ? "Editar puesto" : "Nuevo puesto"}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="bg-[#7C3AED] p-2 rounded-lg flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-700">
                Los puestos definen las responsabilidades y roles dentro de tu organización.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Nombre del puesto
            </label>
            <Input
              placeholder="Ej. Gerente, Desarrollador, Contador..."
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
            {editPosition ? "Actualizar" : "Agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
