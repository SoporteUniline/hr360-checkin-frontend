"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import axios from "axios";
import { useSnackbar } from "notistack";
import { mutate } from "swr";

export default function FestivoDeleteDialog({
  open,
  setOpen,
  deleteId,
  mutateKey,
}) {
  const { enqueueSnackbar } = useSnackbar();

  const confirmDelete = async () => {
    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/holidays/${deleteId}`
      );
      enqueueSnackbar("Festivo eliminado correctamente", {
        variant: "success",
      });
      await mutate(
        (key) => typeof key === "string" && key.startsWith(mutateKey)
      );
    } catch (err) {
      console.error("Error al eliminar festivo", err);
      enqueueSnackbar("Error al eliminar festivo", { variant: "error" });
    } finally {
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar día festivo</DialogTitle>
          <p>
            ¿Seguro que quieres eliminar este día festivo? Esta acción no se
            puede deshacer.
          </p>
        </DialogHeader>
        <DialogFooter className="flex justify-end gap-2">
          {/* Secundario según `Colores.txt` */}
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="bg-white border border-[#d1d5db] text-[#374151] hover:bg-[#f9fafb]"
          >
            Cancelar
          </Button>
          {/* Danger según `Colores.txt` */}
          <Button
            variant="destructive"
            onClick={confirmDelete}
            className="bg-[#ef4444] hover:bg-[#dc2626] text-white shadow-[0_4px_12px_rgba(239,68,68,0.3)]"
          >
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
