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
    id_empresa ? String(id_empresa) : ""
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
          {
            nombre: nombre.trim(),
            id_empresa: Number(empresaSeleccionada),
          }
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
    <Dialog open={open} onOpenChange={setOpen} modal={false}>
      {open && <div className="fixed inset-0 bg-black/50 z-40" />}
      <DialogContent
        className="z-50"
        onInteractOutside={(e) => {
          // Si el clic viene de algo con el atributo de "popover", no cierres ni bloquees
          if (e.target.closest("[data-radix-popper-content-wrapper]")) {
            e.preventDefault();
          }
        }}
        onOpenAutoFocus={(e) => {
          // Si tenemos un combobox, a veces es mejor dejar que el sistema maneje el foco inicial
          // o simplemente prevenir que el Dialog fuerce el foco al primer botón si no queremos.
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {editDep ? "Editar departamento" : "Nuevo departamento"}
          </DialogTitle>
        </DialogHeader>
        <div className="my-4 space-y-2">
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
          <Button onClick={handleSubmit} disabled={formInvalido}>
            {editDep ? "Actualizar" : "Agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
