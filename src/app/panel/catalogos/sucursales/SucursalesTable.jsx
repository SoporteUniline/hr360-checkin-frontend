"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import useSWR, { mutate } from "swr";
import { fetcherWithToken, swr_config } from "@/lib/fetcher";
import { useEffect, useState } from "react";
import TablePagination from "@/components/TablePagination";
import { useRouter } from "next/navigation";

export default function SucursalesTable({
  id_empresa,
  filter,
  swrKey,
  onEdit,
  onDelete,
  onTotalChange,
  onLoad,
}) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const key = `${swrKey}&page=${page}&limit=${limit}&nombre=${filter}`;
  const { data, error, isLoading } = useSWR(key, fetcherWithToken, swr_config);

  useEffect(() => {
    if (data?.total && onTotalChange) {
      onTotalChange(data.total);
    }
  }, [data?.total, onTotalChange]);

  const sucursales = data?.sucursales || [];
  useEffect(() => {
    if (onLoad) {
      onLoad(sucursales);
    }
  }, [sucursales]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10">
        <div className="text-center text-gray-500">Cargando sucursales...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10">
        <div className="text-center text-red-500">Error al cargar sucursales</div>
      </div>
    );
  }

  if (sucursales.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10">
        <div className="text-center text-gray-500">No se encontraron sucursales.</div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Lista de sucursales</h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 hover:bg-gray-50">
                <TableHead className="font-semibold text-gray-700 uppercase text-xs">
                  Nombre
                </TableHead>
                <TableHead className="font-semibold text-gray-700 uppercase text-xs text-right">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sucursales.map((suc) => (
                <TableRow key={suc.id_sucursal} className="hover:bg-gray-50 border-b border-gray-100">
                  <TableCell className="font-medium text-gray-900">{suc.nombre}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center gap-2">
                      <button
                        onClick={() => onEdit(suc, sucursales)}
                        className="p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4 text-[#2563EB]" />
                      </button>
                      <button
                        onClick={() => onDelete(suc.id_sucursal, key)}
                        className="p-2 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <TablePagination
        page={page}
        limit={limit}
        total={data?.total}
        onPageChange={setPage}
      />
    </>
  );
}
