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
import axios from "@/lib/axios";
import { useSnackbar } from "notistack";
import { ShieldCheck, Trash2 } from "lucide-react";

export default function EstadoEmpleadoDialog({
  item,
  limit,
  page,
  className,
  mutate,
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");

  const cambiarEstado = async () => {
    const datosEnvio = { ...item };
    delete datosEnvio.nombre_empresa;
    try {
      await axios.put(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/empleados/${item.id_empleado}`,
        {
          ...datosEnvio,
          estado: item.estado === "Activo" ? "Inactivo" : "Activo",
          motivo_baja: item.estado === "Activo" ? motivo : null,
          fecha_baja: item.estado === "Activo" ? new Date() : null,
        },
      );

      enqueueSnackbar(
        item.estado === "Activo"
          ? "Empleado inactivado"
          : "Empleado reactivado",
        { variant: "success" },
      );

      setOpen(false);
      setMotivo("");

      mutate();
    } catch (err) {
      // Esto te dirá si el error es de Axios, de Red o de tu propio código
      console.log("Error completo:", err);

      if (err.response) {
        console.log("Data del servidor:", err.response.data);
      } else if (err.request) {
        console.log("No se recibió respuesta del servidor");
      } else {
        console.log("Error de configuración/JS:", err.message);
      }

      const msg =
        err?.response?.data?.error || "Ocurrió un error al cambiar el estado.";
      enqueueSnackbar(msg, { variant: "error" });
    }
  };

  return (
    <>
      <button
        className={`p-2 rounded-lg transition-colors ${
          item.estado === "Activo"
            ? "bg-red-50 hover:bg-red-100"
            : "bg-green-50 hover:bg-green-100"
        }`}
        onClick={(e) => {
          e.stopPropagation(); // 👈 Para que no se dispare el onClick de la fila
          setOpen(true);
        }}
        title={item.estado === "Activo" ? "Eliminar" : "Reactivar"}
      >
        {item.estado === "Activo" ? (
          <Trash2 className="h-4 w-4 text-red-600" />
        ) : (
          <ShieldCheck className="h-4 w-4 text-green-600" />
        )}
      </button>

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
