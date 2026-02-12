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
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/Combobox";

export default function DepartamentoFormDialog({
  open,
  setOpen,
  editDep,
  id_empresa,
  departamentos = [],
  mutateKey,
  empresas = [],
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState(
    id_empresa ? String(id_empresa) : "",
  );

  const formInvalido = !nombre.trim() || (!editDep && !empresaSeleccionada);

  useEffect(() => {
    if (editDep) setNombre(editDep.nombre);
    else setNombre("");
    setError("");
  }, [editDep, open]);

  const handleSubmit = async () => {
    if (!editDep && !empresaSeleccionada) {
      setError("Debes seleccionar una empresa.");
      return;
    }

    if (!nombre.trim()) {
      setError("El nombre del departamento es obligatorio.");
      return;
    }

    const existe = departamentos.some(
      (dep) =>
        dep.nombre.toLowerCase() === nombre.toLowerCase() &&
        Number(dep.id_empresa) === Number(empresaSeleccionada) &&
        dep.id_departamento !== editDep?.id_departamento,
    );

    if (existe) {
      setError("Ya existe un departamento con este nombre.");
      return;
    }

    try {
      if (editDep) {
        await axios.put(
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/departamentos/${editDep.id_departamento}`,
          { nombre },
        );
        enqueueSnackbar("Departamento actualizado correctamente", {
          variant: "success",
        });
      } else {
        await axios.post(
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/departamentos`,
          {
            nombre: nombre.trim(),
            id_empresa: Number(empresaSeleccionada),
          },
        );

        enqueueSnackbar("Departamento agregado correctamente", {
          variant: "success",
        });
      }
      await mutate(
        (key) => typeof key === "string" && key.startsWith(mutateKey),
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-br from-[#2563EB] to-[#1d4ed8] p-3 rounded-lg shadow-md">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <DialogTitle className="text-xl font-bold text-gray-900">
              {editDep ? "Editar departamento" : "Nuevo departamento"}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="bg-[#2563EB] p-2 rounded-lg flex-shrink-0">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-700">
                Los departamentos ayudan a organizar a tus empleados por áreas
                funcionales.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            {!editDep && (
              <div>
                <Label htmlFor="empresa-combobox" className="mb-2">
                  Empresa
                </Label>
                <Combobox
                  name="empresa-combobox"
                  options={empresas.map((e) => ({
                    value: String(e.id_empresa),
                    label: e.nombre,
                  }))}
                  value={empresaSeleccionada}
                  onChange={setEmpresaSeleccionada}
                  placeholder="Selecciona la empresa"
                />
              </div>
            )}

            <label className="text-sm font-medium text-gray-700">
              Nombre del departamento
            </label>
            <Input
              placeholder="Ej. Recursos Humanos, Marketing, Ventas..."
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
            disabled={formInvalido}
          >
            {editDep ? "Actualizar" : "Agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
