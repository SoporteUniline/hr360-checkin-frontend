import { useState, useEffect } from "react";
import axios from "axios";
import { mutate } from "swr";
import { useSnackbar } from "notistack";
import { Combobox } from "@/components/Combobox";
import { CampoFormulario, VentanaChica } from "@/components/formulario";

// (28/11/2026, sistema de diseño; docs/sistema-diseno.md) Crear o editar un puesto es una sola idea con 1–2 campos:
// va en VENTANA CHICA (franja gris, X de 44 px, Cancelar y Guardar; no se cierra al tocar afuera). La lógica de guardar
// no cambió.
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
    id_empresa ? String(id_empresa) : "",
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
        position.id_puesto !== editPosition?.id_puesto,
    );

    if (existe) {
      setError("Ya existe un puesto con este nombre.");
      return;
    }

    try {
      if (editPosition) {
        await axios.put(
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/puestos/${editPosition.id_puesto}`,
          { nombre },
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
          },
        );

        enqueueSnackbar("Puesto agregado correctamente", {
          variant: "success",
        });
      }
      await mutate(
        (key) => typeof key === "string" && key.startsWith(mutateKey),
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
    <VentanaChica
      abierta={open}
      alCambiar={setOpen}
      titulo={editPosition ? "Editar puesto" : "Crear puesto"}
      descripcion="Los puestos dicen qué hace cada persona en tu empresa."
      alGuardar={handleSubmit}
      deshabilitado={formInvalido}
    >
      {!editPosition && (
        <CampoFormulario id="empresa-combobox" etiqueta="Empresa" obligatorio>
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
        </CampoFormulario>
      )}

      <CampoFormulario id="puesto-nombre" etiqueta="Nombre del puesto" obligatorio error={error || null}
        ayuda="Así aparecerá en el contrato y en los recibos.">
        {(p) => (
          <input
            {...p}
            placeholder="Ej.: Supervisor de piso"
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value);
              setError("");
            }}
            autoFocus
          />
        )}
      </CampoFormulario>
    </VentanaChica>
  );
}
