import { useState } from "react";
import axios from "axios";
import { useSnackbar } from "notistack";
import dayjs from "dayjs"; // Importa dayjs para formatear las fechas/horas

export default function useEntradaSalida(mutateTable) {
  const { enqueueSnackbar } = useSnackbar();
  const [editingMovimientoId, setEditingMovimientoId] = useState(null);
  const [editingMovimientoData, setEditingMovimientoData] = useState({});
  const [isSavingMovimiento, setIsSavingMovimiento] = useState(false);

  /**
   * Inicia el modo de edición para un movimiento específico.
   * @param {object} movimiento - El objeto del movimiento a editar.
   */
  const handleEditMovimientoClick = (movimiento) => {
    setEditingMovimientoId(movimiento.id);
    // Solo nos interesan las versiones corregidas y las originales para mostrar
    // y permitir edición. Asumimos que 'entrada' y 'salida' son las originales,
    // y 'entrada_corregida'/'salida_corregida' son las que se pueden modificar.
    setEditingMovimientoData({
      id: movimiento.id,
      entrada: movimiento.entrada, // Original
      salida: movimiento.salida, // Original
      entrada_corregida: movimiento.entrada_corregida || "", // Corregida (o vacía si no existe)
      salida_corregida: movimiento.salida_corregida || "", // Corregida (o vacía si no existe)
      // Necesitamos id_empleado y fecha para que el backend recalcule la asistencia.
      // Suponemos que estos campos vienen en el objeto 'movimiento' pasado.
      id_empleado: movimiento.id_empleado,
      fecha: movimiento.fecha, // La fecha del movimiento, importante para el backend
      estado: movimiento.estado,
    });
  };

  /**
   * Cancela el modo de edición y limpia los datos.
   */
  const handleCancelMovimientoEdit = () => {
    setEditingMovimientoId(null);
    setEditingMovimientoData({});
  };

  /**
   * Maneja el cambio en un campo de edición del movimiento.
   * @param {string} name - Nombre del campo ('entrada_corregida' o 'salida_corregida').
   * @param {string} value - Nuevo valor del campo.
   */
  const handleMovimientoFieldChange = (name, value) => {
    setEditingMovimientoData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /**
   * Guarda los cambios del movimiento corregido en el backend.
   */
  const handleSaveMovimientoClick = async () => {
    setIsSavingMovimiento(true);

    const dataToSend = {
      // Solo enviamos los campos que el backend espera para este endpoint
      entrada_corregida:
        editingMovimientoData.entrada_corregida === ""
          ? null
          : dayjs(editingMovimientoData.entrada_corregida).isValid()
          ? dayjs(editingMovimientoData.entrada_corregida).format(
              "YYYY-MM-DD HH:mm:ss"
            )
          : null,
      salida_corregida:
        editingMovimientoData.salida_corregida === ""
          ? null
          : dayjs(editingMovimientoData.salida_corregida).isValid()
          ? dayjs(editingMovimientoData.salida_corregida).format(
              "YYYY-MM-DD HH:mm:ss"
            )
          : null,
    };

    // Asegúrate de que al menos un campo corregido se envíe
    // if (
    //   dataToSend.entrada_corregida === null &&
    //   dataToSend.salida_corregida === null
    // ) {
    //   enqueueSnackbar(
    //     "Debes proporcionar al menos una entrada o salida corregida.",
    //     { variant: "warning" }
    //   );
    //   setIsSavingMovimiento(false);
    //   return;
    // }

    try {
      await axios.put(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/reloj/actualizar/${editingMovimientoId}`,
        dataToSend,
        {
          headers: {
            "Content-Type": "application/json",
            // "Authorization": `Bearer ${tuTokenDeAuth}`, // Asegúrate de incluir tu token si es necesario
          },
        }
      );

      enqueueSnackbar("Movimiento de checador actualizado correctamente.", {
        variant: "success",
      });
      setEditingMovimientoId(null);
      setEditingMovimientoData({});
      mutateTable(); // Revalida los datos de la tabla de movimientos/asistencias
    } catch (error) {
      console.error("❌ Error al actualizar movimiento de checador:", error);
      enqueueSnackbar(
        `Error al actualizar movimiento: ${
          error.response?.data?.error || error.message
        }`,
        { variant: "error" }
      );
    } finally {
      setIsSavingMovimiento(false);
    }
  };

  return {
    editingMovimientoId,
    setEditingMovimientoId, // Por si necesitas establecerlo externamente
    editingMovimientoData,
    setEditingMovimientoData, // Por si necesitas establecerlo externamente
    isSavingMovimiento,
    handleEditMovimientoClick,
    handleCancelMovimientoEdit,
    handleMovimientoFieldChange,
    handleSaveMovimientoClick,
  };
}
