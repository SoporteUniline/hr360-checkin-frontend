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

export default function PositionFormDialog({
  open,
  setOpen,
  editPosition,
  id_empresa,
  positions = [],
  mutateKey,
  empresas = [],
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState(
    id_empresa ? String(id_empresa) : ""
  );

  const formInvalido =
    !nombre.trim() || (!editPosition && !empresaSeleccionada);

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
        Number(position.id_empresa) === Number(empresaSeleccionada) &&
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
          {
            nombre: nombre.trim(),
            id_empresa: Number(empresaSeleccionada),
          }
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
            {editPosition ? "Editar puesto" : "Nuevo puesto"}
          </DialogTitle>
        </DialogHeader>
        <div className="my-4 space-y-2">
          {!editPosition && (
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
          <Button onClick={handleSubmit} disabled={formInvalido}>
            {editPosition ? "Actualizar" : "Agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
