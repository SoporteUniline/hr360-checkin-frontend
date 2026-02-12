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
import { AlertTriangle, Trash2 } from "lucide-react";

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
      <DialogContent className="p-0 overflow-hidden sm:max-w-lg">
        <DialogHeader className="p-5 bg-gradient-to-r from-red-600 to-red-700 text-white">
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <span className="grid size-9 place-items-center rounded-lg bg-white/15">
              <AlertTriangle className="size-5 text-white" />
            </span>
            Eliminar tipo de registro
          </DialogTitle>
          <p className="text-sm text-red-100">Esta acción no se puede deshacer.</p>
        </DialogHeader>

        <div className="p-5">
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            ¿Seguro que quieres eliminar este tipo de registro?
          </div>
        </div>

        <DialogFooter className="bg-gray-50 border-t border-gray-100 p-4 flex gap-2 sm:justify-end">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={deleting} className="border-gray-300 text-gray-700 hover:bg-gray-100">
            Cancelar
          </Button>
          <Button variant="destructive" onClick={confirmDelete} disabled={deleting} className="gap-2">
            <Trash2 className="h-4 w-4" />
            {deleting ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
