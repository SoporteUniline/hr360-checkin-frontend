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
import { AlertTriangle, Trash2 } from "lucide-react";

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
      <DialogContent className="p-0 overflow-hidden sm:max-w-lg">
        <DialogHeader className="p-5 bg-gradient-to-r from-red-600 to-red-700 text-white">
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <span className="grid size-9 place-items-center rounded-lg bg-white/15">
              <AlertTriangle className="size-5 text-white" />
            </span>
            Eliminar día festivo
          </DialogTitle>
          <p className="text-sm text-red-100">Esta acción no se puede deshacer.</p>
        </DialogHeader>

        <div className="p-5">
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            ¿Seguro que quieres eliminar este día festivo?
          </div>
        </div>

        <DialogFooter className="bg-gray-50 border-t border-gray-100 p-4 flex gap-2 sm:justify-end">
          <Button variant="outline" onClick={() => setOpen(false)} className="border-gray-300 text-gray-700 hover:bg-gray-100">
            Cancelar
          </Button>
          <Button variant="destructive" onClick={confirmDelete} className="gap-2">
            <Trash2 className="h-4 w-4" />
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
