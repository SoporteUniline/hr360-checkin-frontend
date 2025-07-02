"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { mutate } from "swr";
import { useSnackbar } from "notistack";

export default function DarDeBajaEmpleado({ item, limit, page }) {
  const { enqueueSnackbar } = useSnackbar();

  const darDeBaja = async () => {
    try {
      await axios.put(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/empleados/${item.id_empleado}`,
        {
          estado: "Baja",
          fecha_baja: new Date(),
          motivo_baja: "Motivo pendiente de capturar",
        }
      );
      enqueueSnackbar("Empleado dado de baja", { variant: "success" });
      mutate(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/empleados?empresa=${item.empresa}&page=${page}&limit=${limit}`
      );
    } catch (err) {
      enqueueSnackbar("Error al dar de baja", { variant: "error" });
    }
  };

  return (
    <Button variant="destructive" onClick={darDeBaja}>
      Baja
    </Button>
  );
}
