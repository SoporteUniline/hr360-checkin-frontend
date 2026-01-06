"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import axios from "@/lib/axios";
import { useSnackbar } from "notistack";
import { mutate } from "swr";
import Cookies from "js-cookie";

export default function TipoRegistroDeleteDialog({
  open,
  setOpen,
  deleteId,
  mutateKey,
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    try {
      if (!deleteId) return;
      setDeleting(true);
      const token = Cookies.get("token");
      await axios.delete(`/checador/tiposPermiso/${deleteId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      enqueueSnackbar("Tipo de registro eliminado correctamente", {
        variant: "success",
      });
      await mutate(
        (key) => typeof key === "string" && key.startsWith(mutateKey)
      );
    } catch (err) {
      console.error("Error al eliminar tipo de registro", err);
      enqueueSnackbar("Error al eliminar tipo de registro", {
        variant: "error",
      });
    } finally {
      setDeleting(false);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar tipo de registro</DialogTitle>
          <p>
            ¿Seguro que quieres eliminar este tipo de registro? Esta acción no
            se puede deshacer.
          </p>
        </DialogHeader>
        <DialogFooter className="flex justify-end gap-2">
          {/* Secundario según `Colores.txt` */}
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={deleting}
            className="bg-white border border-[#d1d5db] text-[#374151] hover:bg-[#f9fafb]"
          >
            Cancelar
          </Button>
          {/* Danger según `Colores.txt` */}
          <Button
            variant="destructive"
            onClick={confirmDelete}
            disabled={deleting}
            className="bg-[#ef4444] hover:bg-[#dc2626] text-white shadow-[0_4px_12px_rgba(239,68,68,0.3)]"
          >
            {deleting ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
