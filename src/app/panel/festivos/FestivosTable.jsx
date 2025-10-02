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
import { Edit, Trash2 } from "lucide-react";
import useSWR from "swr";
import { fetcherWithToken, swr_config } from "@/lib/fetcher";
import { useEffect, useState } from "react";
import TablePagination from "@/components/TablePagination";

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

  // Construimos la URL con query params
  const url = `${swrKey}?page=${page}&limit=${limit}&filter=${encodeURIComponent(
    filter || ""
  )}`;

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
      <div className="text-center py-10 text-muted-foreground">
        No se encontraron días festivos.
      </div>
    );

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {festivos.map((festivo) => (
            <TableRow key={festivo.id}>
              <TableCell>{festivo.fecha}</TableCell>
              <TableCell>{festivo.descripcion}</TableCell>
              <TableCell className="text-right flex justify-end gap-2">
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => onEdit(festivo, festivos)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={() => onDelete(festivo.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination
        page={page}
        limit={limit}
        total={data?.total}
        onPageChange={setPage}
      />
    </>
  );
}
