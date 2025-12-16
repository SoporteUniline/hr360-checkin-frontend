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
import { mutate } from "swr";
import Cookies from "js-cookie";
import { XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import axiosInstance from "@/lib/axios";
import { fetcherWithToken } from "@/lib/fetcher";

export default function RechazarEmpresa({ item, limit, page }) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [motivo, setMotivo] = React.useState("");
  const { enqueueSnackbar } = useSnackbar();
  const token = Cookies.get("token");

  const handleReject = async () => {
    try {
      if (!motivo) {
        return enqueueSnackbar("Motivo obligatorio", {
          variant: "error",
        });
      }
      setLoading(true);
      await axiosInstance.put(
        `/empresas/rechazar/${item.id_empresa}`,
        { motivo_rechazo: motivo },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      await mutate(`/empresas?page=${page}&limit=${limit}`, () =>
        fetcherWithToken(`/empresas?page=${page}&limit=${limit}`)
      );
      setLoading(false);
      enqueueSnackbar("Se esta empresa correctamente", {
        variant: "success",
      });
    } catch (error) {
      setLoading(false);
      console.log(error);
      console.log("Error:", error?.response?.data || error.message);
      const errorMessage =
        error.response?.data?.error || "Error al cambiar estado";
      enqueueSnackbar(errorMessage, { variant: "error" });
    }
  };

  const handleEditAction = (e) => {
    e.stopPropagation();
    setOpen(true);
    setMotivo("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="h-7 bg-red-400"
          startIcon={<XIcon />}
          onClick={handleEditAction}
        />
      </DialogTrigger>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Rechazar empresa</DialogTitle>
          <DialogDescription>
            Escribe el motivo por el cual rechazarás esta empresa
          </DialogDescription>
          <Input
            className="mt-3"
            disabled={loading}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </DialogHeader>
        <DialogFooter>
          <Button className="bg-slate-700" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            className="bg-red-500"
            disabled={loading}
            loading={loading}
            onClick={handleReject}
          >
            Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
