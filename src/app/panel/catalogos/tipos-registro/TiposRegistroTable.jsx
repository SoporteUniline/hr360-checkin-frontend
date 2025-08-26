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
      <div className="text-center py-10 text-muted-foreground">
        No se encontraron registros.
      </div>
    );

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Clave</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {registros.map((regi) => (
            <TableRow key={regi.id}>
              <TableCell>{regi.clave}</TableCell>
              <TableCell>{regi.nombre}</TableCell>
              <TableCell>{regi.descripcion}</TableCell>
              <TableCell className="text-right flex justify-end gap-2">
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => onEdit(regi, registros)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                {/* <Button
                  size="icon"
                  variant="destructive"
                  onClick={() => onDelete(regi.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button> */}
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
