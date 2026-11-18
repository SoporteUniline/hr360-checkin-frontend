import { useState } from "react";
import axios from "@/lib/axios";
import { useSnackbar } from "notistack";

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

  const original = registro?.valores_originales;
  const reference = { ...registro, ...original };
  const differs = (field, value, previous) =>
    comparable(field, value) !== comparable(field, previous[field]);

  const editingRowData = {
    ...registro,
    ...draft,
    correccion: Number(
      (!original && Boolean(registro?.correccion)) ||
      Object.keys({ ...original, ...draft }).some((field) =>
        field !== "tipo_registro_nombre" &&
        differs(field, Object.hasOwn(draft, field) ? draft[field] : registro[field], reference),
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

  const handleRestoreOriginal = () => {
    if (original) setDraft({ ...original });
  };

  const handleSaveClick = async () => {
    if (isSaving || !registro) return;
    const changes = Object.fromEntries(
      Object.entries(draft).filter(([field, value]) =>
        field !== "tipo_registro_nombre" && differs(field, value, registro),
      ),
    );
    if (!Object.keys(changes).length) {
      handleCancelEdit();
      return;
    }

    setIsSaving(true);
    try {
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/asistencias/${registro.id}`,
        changes,
      );
      enqueueSnackbar("Asistencia actualizada correctamente.", { variant: "success" });
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
    handleSaveClick,
    handleRestoreOriginal,
  };
}
