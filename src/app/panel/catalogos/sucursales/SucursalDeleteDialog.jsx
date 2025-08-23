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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar sucursal</DialogTitle>
          <p>
            ¿Seguro que quieres eliminar esta sucursal? Esta acción no se puede
            deshacer.
          </p>
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
