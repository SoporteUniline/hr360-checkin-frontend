import { useState } from "react";
import axios from "@/lib/axios";
import { useSnackbar } from "notistack";
import dayjs from "dayjs";

const numericFields = new Set([
  "asistencia", "goce_sueldo", "hrs_extra", "pago_triple", "es_domingo",
  "es_festivo", "autorizado_por", "extras_autorizadas_por", "id_tipo_permiso",
  "hrs_comida", "porcentaje_dia_festivo", "prima_dominical",
]);

function comparable(field, value) {
  if (value == null || value === "") return null;
  return numericFields.has(field) ? Number(value) : value;
}

export default function useAsistenciaActions(mutateTable, onSaveSuccess) {
  const { enqueueSnackbar } = useSnackbar();
  const [registro, setRegistro] = useState(null);
  const [draft, setDraft] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const storedOriginal = registro?.valores_originales;
  const original = typeof storedOriginal === "string"
    ? JSON.parse(storedOriginal)
    : storedOriginal;
  const entrada = Object.hasOwn(draft, "entrada") ? draft.entrada : registro?.entrada;
  const salida = draft.salida;
  const editedValues = entrada && salida && salida < entrada
    ? { ...draft, salida: dayjs(salida).add(1, "day").format("YYYY-MM-DD HH:mm:ss") }
    : draft;
  const reference = { ...registro, ...original };
  const differs = (field, value, previous) =>
    comparable(field, value) !== comparable(field, previous[field]);

  const editingRowData = {
    ...registro,
    ...editedValues,
    correccion: Number(
      (!original && Boolean(registro?.correccion)) ||
      Object.keys({ ...original, ...editedValues }).some((field) =>
        field !== "tipo_registro_nombre" &&
        differs(field, Object.hasOwn(editedValues, field) ? editedValues[field] : registro[field], reference),
      ),
    ),
  };

  const handleEditClick = (selected) => {
    setRegistro(selected);
    setDraft({});
  };

  const handleCancelEdit = () => {
    setRegistro(null);
    setDraft({});
  };

  const handleFieldChange = (name, value) => {
    setDraft((previous) => ({ ...previous, [name]: value }));
  };

  const save = async (values, restoring = false) => {
    if (isSaving || !registro) return;
    const changes = Object.fromEntries(
      Object.entries(values).filter(([field, value]) =>
        field !== "tipo_registro_nombre" && (restoring || differs(field, value, registro)),
      ),
    );
    if (!Object.keys(changes).length) {
      if (!original || !Number(registro.correccion) || editingRowData.correccion) {
        handleCancelEdit();
        return;
      }
      Object.assign(changes, original);
    }

    setIsSaving(true);
    try {
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/asistencias/${registro.id}`,
        changes,
      );
      enqueueSnackbar(restoring ? "Asistencia restaurada al original." : "Asistencia actualizada correctamente.", { variant: "success" });
      onSaveSuccess?.(response.data?.asistencia);
      handleCancelEdit();
      await mutateTable?.();
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      enqueueSnackbar(`Error al actualizar asistencia: ${message}`, { variant: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  return {
    editingRowId: registro?.id ?? null,
    editingRowData,
    isSaving,
    handleEditClick,
    handleCancelEdit,
    handleFieldChange,
    handleSaveClick: () => save(editedValues),
    handleRestoreOriginal: () => { if (original) return save(original, true); },
  };
}
