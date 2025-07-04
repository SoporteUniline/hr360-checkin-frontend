"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import axios from "axios";
import { mutate } from "swr";
import { useSnackbar } from "notistack";

export default function EstadoEmpleadoDialog({ item, limit, page, className }) {
  const { enqueueSnackbar } = useSnackbar();
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");

  const cambiarEstado = async () => {
    try {
      await axios.put(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/empleados/${item.id_empleado}`,
        {
          ...item,
          estado: item.estado === "Activo" ? "Inactivo" : "Activo",
          motivo_baja: item.estado === "Activo" ? motivo : null,
          fecha_baja: item.estado === "Activo" ? new Date() : null,
        }
      );

      enqueueSnackbar(
        item.estado === "Activo"
          ? "Empleado inactivado"
          : "Empleado reactivado",
        { variant: "success" }
      );

      // ✅ Cierra el modal de inmediato
      setOpen(false);
      setMotivo("");

      // ✅ Refresca los datos en segundo plano
      mutate(
        `/checador/empleados?empresa=${item.id_empresa}&page=${page}&limit=${limit}`
      );
    } catch (err) {
      enqueueSnackbar("Error al cambiar estado", { variant: "error" });
    }
  };

  return (
    <>
      <Button
        className={item.estado === "Inactivo" ? className : ""}
        variant={item.estado === "Activo" ? "destructive" : "outline"}
        onClick={(e) => {
          e.stopPropagation(); // 👈 Para que no se dispare el onClick de la fila
          setOpen(true);
        }}
      >
        {item.estado === "Activo" ? "Eliminar" : "Reactivar"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {item.estado === "Activo"
                ? "¿Estás seguro de eliminar este empleado?"
                : "Reactivar empleado"}
            </DialogTitle>
            {item.estado === "Activo" && (
              <DialogDescription>
                Por favor, proporciona el motivo de la baja. Esta acción puede
                revertirse después.
              </DialogDescription>
            )}
          </DialogHeader>

          {item.estado === "Activo" && (
            <div className="py-2">
              <Textarea
                rows={4}
                placeholder="Ej. Renuncia voluntaria, despido, fin de contrato..."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
            </div>
          )}

          <DialogFooter className="flex justify-end gap-2 pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setOpen(false);
                setMotivo("");
              }}
            >
              Cancelar
            </Button>
            <Button
              variant={item.estado === "Activo" ? "destructive" : "default"}
              onClick={cambiarEstado}
              disabled={item.estado === "Activo" && !motivo.trim()}
            >
              {item.estado === "Activo"
                ? "Confirmar baja"
                : "Confirmar reactivación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
