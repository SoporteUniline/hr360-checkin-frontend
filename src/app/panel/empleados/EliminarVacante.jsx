"use client";
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { useSnackbar } from "notistack";
import axios from "axios";
import { Trash } from "lucide-react";
import { mutate } from "swr";
import Cookies from "js-cookie";

export default function EliminarVacante({ item, limit, page }) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const token = Cookies.get("token");

  const onDelete = async () => {
    setLoading(true);
    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/vacantes/delete/${item.id_vacante}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      enqueueSnackbar("Se eliminó la vacante exitosamente!", {
        variant: "success",
      });
      setLoading(false);
      await mutate(`/vacantes?page=${page}&limit=${limit}`);
      setOpen(false);
    } catch (error) {
      setLoading(false);
      const errorMessage =
        error.response?.data?.error ||
        error?.message ||
        "Error al eliminar vacante";
      enqueueSnackbar(errorMessage, { variant: "error" });
    }
  };

  const handleEditAction = (e) => {
    e.stopPropagation();
    setOpen(true);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          onClick={handleEditAction}
          startIcon={<Trash />}
        />
      </DialogTrigger>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Eliminar vacante</DialogTitle>
          <DialogDescription>
            <span className="font-bold">{item.titulo}</span> será eliminada,
            ¿Seguro que desea continuar?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button className="bg-slate-700" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            className="bg-red-500"
            disabled={loading}
            loading={loading}
            onClick={onDelete}
          >
            Si, Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
