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
import { useRouter } from "next/navigation";

export default function EstadoEmpleadoDialog({
  item,
  limit,
  page,
  className,
  mutate,
  onEmployeeChanged,
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [preguntarFiniquito, setPreguntarFiniquito] = useState(false);
  const [accionDialog, setAccionDialog] = useState(null);

  const router = useRouter();

  const cambiarEstado = async () => {
    const esBaja = accionDialog === "baja";

    try {
      await axios.put(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/empleados/${item.id_empleado}`,
        {
          estado: esBaja ? "Inactivo" : "Activo",
          motivo_baja: esBaja ? motivo : null,
          fecha_baja: esBaja ? new Date() : null,
        },
      );

      enqueueSnackbar(
        esBaja ? "Empleado dado de baja" : "Empleado reactivado",
        {
          variant: "success",
        },
      );

      if (esBaja) {
        setOpen(false);
        setPreguntarFiniquito(true);
        return;
      }

      setOpen(false);
      setMotivo("");

      await mutate();
      onEmployeeChanged?.();
    } catch (err) {
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

  const finalizarBajaSinFiniquito = async () => {
    setPreguntarFiniquito(false);
    setMotivo("");

    await mutate();
    onEmployeeChanged?.();
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
          e.stopPropagation();

          setAccionDialog(item.estado === "Activo" ? "baja" : "reactivar");

          setOpen(true);
        }}
        title={item.estado === "Activo" ? "Dar de baja" : "Reactivar"}
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
              {accionDialog === "baja"
                ? "¿Deseas dar de baja a este empleado?"
                : "Reactivar empleado"}
            </DialogTitle>

            {accionDialog === "baja" && (
              <DialogDescription>
                Por favor, proporciona el motivo de la baja. Esta acción puede
                revertirse después.
              </DialogDescription>
            )}
          </DialogHeader>

          {accionDialog === "baja" && (
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
              variant={accionDialog === "baja" ? "destructive" : "default"}
              onClick={cambiarEstado}
              disabled={accionDialog === "baja" && !motivo.trim()}
            >
              {accionDialog === "baja"
                ? "Confirmar baja"
                : "Confirmar reactivación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={preguntarFiniquito}
        onOpenChange={(value) => {
          if (!value) {
            finalizarBajaSinFiniquito();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Generar finiquito?</DialogTitle>

            <DialogDescription>
              La baja del empleado se registró correctamente. ¿Deseas generar su
              finiquito ahora?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={finalizarBajaSinFiniquito}>
              No
            </Button>

            <Button
              onClick={() => {
                const params = new URLSearchParams({
                  empleado: String(item.id_empleado),
                  empresa: String(item.id_empresa),
                  origen: "baja",
                  motivo,
                });

                router.push(
                  `/panel/finiquitos-y-liquidaciones?${params.toString()}`,
                );
              }}
            >
              Sí, generar finiquito
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
