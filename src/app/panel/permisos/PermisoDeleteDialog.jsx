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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar permiso</DialogTitle>
          <p>¿Seguro que quieres eliminar esta solicitud? Esta acción no se puede deshacer.</p>
        </DialogHeader>
        <DialogFooter className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={confirmDelete}>
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


