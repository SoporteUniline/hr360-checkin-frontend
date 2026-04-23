// src/hooks/useAsistenciaActions.js
import { useState } from "react";
import axios from "axios";
import { useSnackbar } from "notistack";

export default function useAsistenciaActions(mutateTable, onSaveSuccess) {
  const { enqueueSnackbar } = useSnackbar();
  const [editingRowId, setEditingRowId] = useState(null);
  const [editingRowData, setEditingRowData] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const handleEditClick = (registro) => {
    setEditingRowId(registro.id);
    setEditingRowData({ ...registro });
  };

  const handleCancelEdit = () => {
    setEditingRowId(null);
    setEditingRowData({});
  };

  const handleFieldChange = (name, value) => {
    setEditingRowData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveClick = async () => {
    setIsSaving(true);

    const dataToSend = { ...editingRowData };

    if (dataToSend.correccion) {
      if (!dataToSend.entrada && !dataToSend.salida) {
        enqueueSnackbar("Debes capturar al menos una hora (entrada o salida)", {
          variant: "warning",
        });
        setIsSaving(false);
        return;
      }
    }

    // if (!editingRowData?.entrada) {
    //   enqueueSnackbar("Debes ingresar la hora de entrada antes de guardar", {
    //     variant: "warning",
    //   });
    //   return;
    // }

    console.log("Datos que se van a enviar al backend:", dataToSend);

    // if (!dataToSend.entrada) {
    //   enqueueSnackbar("Debes capturar la hora de entrada antes de guardar 🚨", {
    //     variant: "warning",
    //   });
    //   setIsSaving(false);
    //   return; // detener aquí
    // }

    // Limpiar campos no necesarios para el backend
    const fieldsToRemove = [
      "apellido_materno",
      "apellido_paterno",
      "created_at",
      "foto_perfil",
      "nombre",
      "tipo_registro_clave",
      "tipo_registro_nombre",
      "tipo_registro",
      "updated_at",
      "nombre_autorizador",
      "apellido_paterno_autorizador",
      "apellido_materno_autorizador",
      "nombre_extra_autorizador",
      "apellido_paterno_extra_autorizador",
      "apellido_materno_extra_autorizador",
    ];
    fieldsToRemove.forEach((field) => {
      delete dataToSend[field];
    });

    // Asegurar que los tipos de datos sean correctos para el backend
    if (dataToSend.id_tipo_permiso) {
      dataToSend.id_tipo_permiso = Number(dataToSend.id_tipo_permiso);
    } else {
      dataToSend.id_tipo_permiso = null;
    }

    if (dataToSend.autorizado_por) {
      dataToSend.autorizado_por = Number(dataToSend.autorizado_por);
    } else {
      dataToSend.autorizado_por = null;
    }

    if (dataToSend.extras_autorizadas_por) {
      dataToSend.extras_autorizadas_por = Number(
        dataToSend.extras_autorizadas_por,
      );
    } else {
      dataToSend.extras_autorizadas_por = null;
    }

    if (dataToSend.hrs_comida) {
      dataToSend.hrs_comida = parseFloat(dataToSend.hrs_comida);
    } else {
      dataToSend.hrs_comida = 0;
    }

    if (dataToSend.porcentaje_dia_festivo) {
      dataToSend.porcentaje_dia_festivo = parseFloat(
        dataToSend.porcentaje_dia_festivo,
      );
    } else {
      dataToSend.porcentaje_dia_festivo = 0;
    }

    if (dataToSend.prima_dominical) {
      dataToSend.prima_dominical = parseFloat(dataToSend.prima_dominical);
    } else {
      dataToSend.prima_dominical = 0;
    }

    // Convertir booleanos a 0 o 1
    dataToSend.asistencia = dataToSend.asistencia ? 1 : 0;
    dataToSend.goce_sueldo = dataToSend.goce_sueldo ? 1 : 0;
    dataToSend.pago_triple = dataToSend.pago_triple ? 1 : 0;
    dataToSend.correccion = dataToSend.correccion ? 1 : 0;
    dataToSend.es_domingo = dataToSend.es_domingo ? 1 : 0;
    dataToSend.es_festivo = dataToSend.es_festivo ? 1 : 0;
    dataToSend.hrs_extra = dataToSend.hrs_extra ? 1 : 0;

    try {
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/asistencias/${dataToSend.id}`,
        dataToSend,
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      enqueueSnackbar("Asistencia actualizada correctamente.", {
        variant: "success",
      });

      onSaveSuccess?.(response.data?.asistencia ?? null);
      setEditingRowId(null);
      setEditingRowData({});
      await mutateTable?.();
    } catch (error) {
      const msg = error.response?.data?.message || error.message;
      console.error("❌ Error al actualizar asistencia:", msg);
      enqueueSnackbar(`Error al actualizar asistencia: ${msg}`, {
        variant: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return {
    editingRowId,
    setEditingRowId,
    editingRowData,
    setEditingRowData,
    isSaving,
    handleEditClick,
    handleCancelEdit,
    handleFieldChange,
    handleSaveClick,
  };
}
