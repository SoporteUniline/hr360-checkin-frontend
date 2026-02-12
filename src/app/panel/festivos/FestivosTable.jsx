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

function formatDateDMYLocal(dateStr) {
  if (!dateStr) return "-";

  const [year, month, day] = dateStr.split("T")[0].split("-");

  if (!year || !month || !day) return "-";

  return `${day}/${month}/${year}`;
}

export default function FestivosTable({
  id_empresa,
  filter,
  swrKey,
  onEdit,
  onDelete,
  onLoad,
}) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  const url = swrKey
    ? `${swrKey}${
        swrKey.includes("?") ? "&" : "?"
      }page=${page}&limit=${limit}&filter=${encodeURIComponent(filter || "")}`
    : null;

  const { data, error, isLoading } = useSWR(url, fetcherWithToken, swr_config);

  const festivos = data?.festivos || [];
  useEffect(() => {
    if (onLoad) {
      onLoad(festivos);
    }
  }, [festivos]);

  if (isLoading) return <p>Cargando...</p>;
  if (error) return <p>Error al cargar festivos</p>;
  if (festivos.length === 0)
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-10 text-center text-sm text-gray-600">
        No se encontraron días festivos.
      </div>
    );

  return (
    <>
      <Card className="p-0 overflow-hidden border-gray-100">
        <CardHeader className="border-b border-gray-100 bg-white pb-4">
          <CardTitle className="text-sm font-bold text-gray-900">
            Lista de días festivos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  {id_empresa === "all" && (
                    <TableHead className="text-xs font-semibold uppercase text-gray-600">
                      Empresa
                    </TableHead>
                  )}
                  <TableHead className="text-xs font-semibold uppercase text-gray-600">
                    Fecha
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-gray-600">
                    Descripción
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase text-gray-600">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {festivos.map((festivo) => (
                  <TableRow key={festivo.id} className="hover:bg-zinc-50">
                    {id_empresa === "all" && (
                      <TableCell>{festivo.empresa_nombre}</TableCell>
                    )}
                    <TableCell>
                      {festivo.fecha ? formatDateDMYLocal(festivo.fecha) : "-"}
                    </TableCell>
                    <TableCell>{festivo.descripcion}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-2">
                        <button
                          onClick={() => onEdit(festivo, festivos)}
                          className="p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4 text-[#2563EB]" />
                        </button>
                        <button
                          onClick={() => onDelete(festivo.id)}
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
