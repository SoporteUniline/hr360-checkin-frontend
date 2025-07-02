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
import { RotateCcw } from "lucide-react";
import { mutate } from "swr";
import Cookies from "js-cookie";

export default function ReactivarVacante({ item, limit, page }) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const token = Cookies.get("token");

  const onReactivate = async () => {
    setLoading(true);
    try {
      await axios.put(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/vacantes/reactivar/${item.id_vacante}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      enqueueSnackbar("Se reactivó la vacante exitosamente!", {
        variant: "success",
      });
      setLoading(false);
      await mutate(`/vacantes/vacantesPorEmpresa?page=${page}&limit=${limit}`);
      setOpen(false);
    } catch (error) {
      setLoading(false);
      const errorMessage =
        error.response?.data?.error ||
        error?.message ||
        "Error al reactivar vacante";
      enqueueSnackbar(errorMessage, { variant: "error" });
    }
  };

  const handleEditAction = (e) => {
    e.stopPropagation();
    setOpen(true);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild className="z-100">
        <Button
          variant="ghost"
          onClick={handleEditAction}
          startIcon={<RotateCcw />}
        />
      </DialogTrigger>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Reactivar vacante</DialogTitle>
          <DialogDescription>
            <span className="font-bold">{item.titulo}</span> será habilitada
            nuevamente, ¿Seguro que desea continuar?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button className="bg-slate-700" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            className="bg-blue-500"
            disabled={loading}
            loading={loading}
            onClick={onReactivate}
          >
            Si, Reactivar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
