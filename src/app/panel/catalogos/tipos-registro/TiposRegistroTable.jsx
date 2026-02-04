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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Trash2 } from "lucide-react";
import useSWR from "swr";
import { fetcherWithToken, swr_config } from "@/lib/fetcher";
import { useEffect, useState } from "react";
import TablePagination from "@/components/TablePagination";

export default function TiposRegistroTable({
  filter,
  swrKey,
  onEdit,
  onDelete,
  onTotalChange,
  onLoad,
}) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const key = `${swrKey}&page=${page}&limit=${limit}&nombre=${filter}`;
  const { data, error, isLoading } = useSWR(key, fetcherWithToken, swr_config);

  useEffect(() => {
    if (data?.total && onTotalChange) {
      onTotalChange(data.total);
    }
  }, [data?.total, onTotalChange]);

  const registros = data?.tiposPermiso || [];
  useEffect(() => {
    if (onLoad) {
      onLoad(registros);
    }
  }, [registros]);

  if (isLoading) return <p>Cargando...</p>;
  if (error) return <p>Error al cargar registros</p>;
  if (registros.length === 0)
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-10 text-center text-sm text-gray-600">
        No se encontraron registros.
      </div>
    );

  return (
    <>
      <Card className="p-0 overflow-hidden border-gray-100">
        <CardHeader className="border-b border-gray-100 bg-white pb-4">
          <CardTitle className="text-sm font-bold text-gray-900">Lista de tipos de registro</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-xs font-semibold uppercase text-gray-600">Clave</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-gray-600">Nombre</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-gray-600">Descripción</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase text-gray-600">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registros.map((regi) => (
                  <TableRow key={regi.id} className="hover:bg-zinc-50">
                    <TableCell>{regi.clave}</TableCell>
                    <TableCell className="font-medium text-gray-900">{regi.nombre}</TableCell>
                    <TableCell className="text-gray-600">{regi.descripcion}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-2">
                        <button
                          onClick={() => onEdit(regi, registros)}
                          className="p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4 text-[#2563EB]" />
                        </button>
                        <button
                          onClick={() => onDelete(regi.id)}
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
        </CardContent>
      </Card>
      <TablePagination
        page={page}
        limit={limit}
        total={data?.total}
        onPageChange={setPage}
      />
    </>
  );
}
