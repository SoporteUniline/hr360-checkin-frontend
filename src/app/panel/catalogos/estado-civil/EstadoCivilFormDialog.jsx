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

export default function EstadoCivilFormDialog({
  open,
  setOpen,
  editCiv,
  id_empresa,
  estadoCivil = [],
  mutateKey,
  empresas = [],
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState(
    id_empresa ? String(id_empresa) : ""
  );

  const formInvalido = !nombre.trim() || (!editCiv && !empresaSeleccionada);

  useEffect(() => {
    if (editCiv) setNombre(editCiv.nombre);
    else setNombre("");
    setError("");
  }, [editCiv, open]);

  const handleSubmit = async () => {
    if (!editCiv && !empresaSeleccionada) {
      setError("Debes seleccionar una empresa.");
      return;
    }

    if (!nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }

    const existe = estadoCivil.some(
      (civ) =>
        civ.nombre.toLowerCase() === nombre.toLowerCase() &&
        Number(civ.id_empresa) === Number(empresaSeleccionada) &&
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
          {
            nombre: nombre.trim(),
            id_empresa: Number(empresaSeleccionada),
          }
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
          {!editCiv && (
            <div>
              <Label className="mb-2">Empresa</Label>
              <Combobox
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
          <Button onClick={handleSubmit} disabled={formInvalido}>
            {editCiv ? "Actualizar" : "Agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
