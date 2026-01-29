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
import { AlertTriangle } from "lucide-react";

export default function EstadoCivilDeleteDialog({
  open,
  setOpen,
  deleteId,
  mutateKey,
}) {
  const { enqueueSnackbar } = useSnackbar();
  const confirmDelete = async () => {
    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/estados-civiles/${deleteId}`
      );
      enqueueSnackbar("Estado civil eliminado correctamente", {
        variant: "success",
      });
      await mutate(
        (key) => typeof key === "string" && key.startsWith(mutateKey)
      );
    } catch (err) {
      console.error("Error al eliminar estado civil", err);
      enqueueSnackbar("Error al eliminar estado civil", { variant: "error" });
    } finally {
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden">
        <DialogHeader className="p-0">
          <div className="bg-gradient-to-r from-red-500 to-red-600 p-6">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-white text-xl font-bold">
                  Eliminar estado civil
                </DialogTitle>
                <p className="text-sm text-red-100">
                  Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4">
          <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-4 rounded-md">
            <p className="font-semibold mb-1">¡Atención!</p>
            <p className="text-sm">
              ¿Seguro que quieres eliminar este estado civil?
            </p>
          </div>
        </div>

        <DialogFooter className="bg-gray-50 p-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} className="border-gray-300">
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={confirmDelete}
            className="bg-red-600 hover:bg-red-700 text-white shadow-sm"
          >
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
