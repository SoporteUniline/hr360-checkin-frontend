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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar estado civil</DialogTitle>
          <p>
            ¿Seguro que quieres eliminar este estado civil? Esta acción no se
            puede deshacer.
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
