"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useSnackbar } from "notistack";
import { permisosApi } from "@/lib/permisosApi";
import { AlertTriangle, Trash2 } from "lucide-react";

/**
 * Diálogo de confirmación para eliminar una solicitud de permiso.
 * Relación: Usado en `page.jsx` del módulo de permisos.
 */
export default function PermisoDeleteDialog({ open, setOpen, deleteId, onDeleted }) {
  const { enqueueSnackbar } = useSnackbar();

  const confirmDelete = async () => {
    try {
      await permisosApi.eliminar(deleteId);
      enqueueSnackbar("Permiso eliminado correctamente", { variant: "success" });
      onDeleted?.();
    } catch (err) {
      console.error("Error al eliminar permiso", err);
      enqueueSnackbar("No se pudo eliminar el permiso", { variant: "error" });
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
            Eliminar permiso
          </DialogTitle>
          <p className="text-sm text-red-100">
            Esta acción es permanente y no se puede deshacer.
          </p>
        </DialogHeader>

        <div className="p-5">
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            ¿Seguro que quieres eliminar esta solicitud?
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


