"use client";

import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { mutate } from "swr";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import axios from "@/lib/axios";
import { enqueueSnackbar } from "notistack";
import Cookies from "js-cookie";
import NuevoUsuario from "./NuevoUsuario";

const status = {
  Activo: true,
  Inactivo: false,
};

export default function TablaUsuarios({ data, setSelected, limit, page }) {
  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Correo</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Telefono</TableHead>
            <TableHead className="text-center w-[100px]">Estatus</TableHead>
            <TableHead className="text-center w-[100px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.map((item, index) => {
            const rejectedClass =
              item.estado === "Rechazado" &&
              "opacity-30 cursor-default pointer-events-none";
            return (
              <TableRow
                key={index}
                className="cursor-pointer"
                onClick={() => setSelected(item.id_usuario)}
              >
                <TableCell className={rejectedClass}>{item?.correo}</TableCell>
                <TableCell className={rejectedClass}>{item.nombre}</TableCell>
                <TableCell className={rejectedClass}>{item.telefono}</TableCell>
                <TableCell className="text-center">
                  <EstatusSwitch item={item} limit={limit} page={page} />
                </TableCell>
                <TableCell
                  className={`text-center ${rejectedClass}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <NuevoUsuario
                    editar
                    values={item}
                    limit={limit}
                    page={page}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

const EstatusSwitch = ({ item, limit, page }) => {
  const isActive = status[item.estado];
  const isNew = item.estado === "Nuevo";
  const [loading, setLoading] = useState(false);
  const token = Cookies.get("token");

  const handleChangeStatus = async () => {
    try {
      setLoading(true);
      await axios.put(
        `/users/cambiar-estado/${item.id_usuario}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      await mutate(`/users/user?page=${page}&limit=${limit}`);
      setLoading(false);
      enqueueSnackbar("Se cambió el estado correctamente", {
        variant: "success",
      });
    } catch (error) {
      setLoading(false);
      console.error("Error al agregar:", error.response?.data || error.message);
      const errorMessage =
        error.response?.data?.error || "Error al cambiar estado";
      enqueueSnackbar(errorMessage, { variant: "error" });
    }
  };

  return isNew ? null : (
    <Switch
      disabled={loading}
      checked={isActive}
      onClick={(e) => e.stopPropagation()}
      onCheckedChange={handleChangeStatus}
    />
  );
};
