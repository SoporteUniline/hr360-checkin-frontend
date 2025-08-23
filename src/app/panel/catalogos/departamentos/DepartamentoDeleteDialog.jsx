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

export default function DepartamentoDeleteDialog({
  open,
  setOpen,
  deleteId,
  mutateKey,
}) {
  const { enqueueSnackbar } = useSnackbar();
  const confirmDelete = async () => {
    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/departamentos/${deleteId}`
      );
      enqueueSnackbar("Departamento eliminado correctamente", {
        variant: "success",
      });
      await mutate(
        (key) => typeof key === "string" && key.startsWith(mutateKey)
      );
    } catch (err) {
      console.error("Error al eliminar departamento", err);
      enqueueSnackbar("Error al eliminar departamento", { variant: "error" });
    } finally {
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar departamento</DialogTitle>
          <p>
            ¿Seguro que quieres eliminar este departamento? Esta acción no se
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
