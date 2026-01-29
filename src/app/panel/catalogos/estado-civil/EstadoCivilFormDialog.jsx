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
import { FileText, Save } from "lucide-react";

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
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden">
        {/* Header - Diseño ADAMIA */}
        <DialogHeader className="p-0">
          <div className="bg-gradient-to-r from-[#2563EB] to-[#1d4ed8] p-6">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-white text-xl font-bold">
            {editCiv ? "Editar estado civil" : "Nuevo estado civil"}
          </DialogTitle>
                <p className="text-sm text-blue-100">
                  {editCiv
                    ? "Actualiza el nombre del estado civil"
                    : "Agrega un nuevo estado civil al catálogo"}
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Sección por color (patrón Contratos) */}
          <div className="bg-gradient-to-br from-blue-50 via-white to-blue-50 border border-blue-100 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="bg-[#2563EB] p-2 rounded-lg">
                <FileText className="h-4 w-4 text-white" />
              </div>
              <div className="font-semibold text-gray-900">
                Información
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">
                Nombre del estado civil
              </p>
          <Input
                placeholder="Ej. Soltero(a)"
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value);
              setError("");
            }}
            className="w-full"
          />
              {error ? (
                <p className="text-red-600 text-sm">{error}</p>
              ) : null}
            </div>
          </div>
        </div>

        <DialogFooter className="bg-gray-50 p-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} className="border-gray-300">
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-medium shadow-sm"
          >
            <Save className="h-4 w-4 mr-2" />
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
