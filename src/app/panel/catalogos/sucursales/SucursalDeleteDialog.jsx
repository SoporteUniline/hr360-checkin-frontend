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

export default function SucursalDeleteDialog({
  open,
  setOpen,
  deleteId,
  mutateKey,
}) {
  const { enqueueSnackbar } = useSnackbar();
  const confirmDelete = async () => {
    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/sucursales/${deleteId}`
      );
      enqueueSnackbar("Sucursal eliminada correctamente", {
        variant: "success",
      });
      await mutate(
        (key) => typeof key === "string" && key.startsWith(mutateKey)
      );
    } catch (err) {
      console.error("Error al eliminar sucursal", err);
      enqueueSnackbar("Error al eliminar sucursal", { variant: "error" });
    } finally {
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-br from-red-500 to-red-600 p-3 rounded-lg shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-gray-900">
                Eliminar sucursal
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-4">
          <div className="flex items-start gap-3">
            <div className="bg-red-500 p-2 rounded-lg flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-red-900 mb-1 text-sm">¡Atención!</h4>
              <p className="text-sm text-red-700">
                ¿Estás seguro que quieres eliminar esta sucursal? Esta acción no se puede deshacer.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={() => setOpen(false)}
            className="border-gray-300"
          >
            Cancelar
          </Button>
          <Button 
            onClick={confirmDelete}
            className="bg-red-500 hover:bg-red-600 text-white font-medium shadow-sm"
          >
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
