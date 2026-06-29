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
import NuevaEmpresa from "./NuevaEmpresa";
import RechazarEmpresa from "./RechazarEmpresa";
import { fetcherWithToken } from "@/lib/fetcher";

const status = {
  Activo: true,
  Inactivo: false,
};

export default function TablaEmpresas({ data, setSelected, limit, page }) {
  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Empresa</TableHead>
            <TableHead>Dueño</TableHead>
            <TableHead>Correo</TableHead>
            <TableHead>Telefono</TableHead>
            <TableHead>Giro</TableHead>
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
                onClick={() => setSelected(item)}
              >
                <TableCell className={rejectedClass}>
                  {item?.nombre_empresa}
                </TableCell>
                <TableCell className={rejectedClass}>
                  {item.nombre_duenio}
                </TableCell>
                <TableCell className={rejectedClass}>
                  {item.correo_empresa}
                </TableCell>
                <TableCell className={rejectedClass}>{item.celular}</TableCell>
                <TableCell className={rejectedClass}>{item.giro}</TableCell>
                <TableCell
                  className="text-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  {item.estado === "Rechazado" ? (
                    <EstatusRechazado item={item} limit={limit} page={page} />
                  ) : (
                    <EstatusSwitch item={item} limit={limit} page={page} />
                  )}
                </TableCell>
                <TableCell className={`text-center ${rejectedClass}`}>
                  <NuevaEmpresa
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
        `/empresas/cambiar-estado/${item.id_empresa}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      await mutate(`/empresas?page=${page}&limit=${limit}`, () =>
        fetcherWithToken(`/empresas?page=${page}&limit=${limit}`),
      );
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

  return isNew ? (
    <div className="flex justify-center gap-1">
      <EstatusAceptar item={item} />
      <RechazarEmpresa item={item} limit={limit} page={page} />
    </div>
  ) : (
    <Switch
      disabled={loading}
      checked={isActive}
      onCheckedChange={handleChangeStatus}
    />
  );
};
const EstatusAceptar = ({ item, limit, page }) => {
  const [loading, setLoading] = useState(false);
  const token = Cookies.get("token");

  const handleActivate = async () => {
    try {
      setLoading(true);
      await axios.put(
        `/empresas/activar-nueva/${item.id_empresa}`,
        {
          tipo_contratacion: "Normal",
          meses_contratados: 1,
          empleados: Number(prompt("Empleados de referencia", "0") || 0),
          precio_base_mensual: Number(prompt("Precio base mensual", "0") || 0),
          empleados_incluidos: Number(prompt("Empleados incluidos", "0") || 0),
          precio_empleado_extra: Number(
            prompt("Precio por empleado extra", "60") || 60,
          ),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      await mutate(`/empresas?page=${page}&limit=${limit}`, () =>
        fetcherWithToken(`/empresas?page=${page}&limit=${limit}`),
      );
      setLoading(false);
      enqueueSnackbar("Se activó correctamente", {
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

  return (
    <Button
      className="h-7 bg-blue-400"
      onClick={handleActivate}
      startIcon={<Check />}
      disabled={loading}
    />
  );
};
const EstatusRechazado = ({ item, limit, page }) => {
  return (
    <div>
      <p className="text-red-500 font-semibold text-sm">{item.estado}</p>
      <p
        title={item.motivo_rechazo}
        className="text-gray-500 text-sm w-[170px] overflow-hidden text-ellipsis whitespace-nowrap"
      >
        {item.motivo_rechazo}
      </p>
    </div>
  );
};
