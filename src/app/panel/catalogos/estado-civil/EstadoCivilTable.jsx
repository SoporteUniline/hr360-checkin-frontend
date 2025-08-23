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
import useSWR, { mutate } from "swr";
import { fetcherWithToken, swr_config } from "@/lib/fetcher";
import { useEffect, useState } from "react";
import TablePagination from "@/components/TablePagination";

export default function EstadoCivilTable({
  id_empresa,
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

  const estadoCivil = data?.estados_civiles || [];
  useEffect(() => {
    if (onLoad) {
      onLoad(estadoCivil);
    }
  }, [estadoCivil]);

  if (estadoCivil.length === 0)
    return (
      <div className="text-center py-10 text-muted-foreground">
        No se encontraron estados civiles.
      </div>
    );

  if (isLoading) return <p>Cargando...</p>;
  if (error) return <p>Error al cargar estados civiles</p>;

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {estadoCivil.map((civ) => (
            <TableRow key={civ.id_estado_civil}>
              <TableCell>{civ.nombre}</TableCell>
              <TableCell className="text-right flex justify-end gap-2">
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => onEdit(civ, estadoCivil)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={() => onDelete(civ.id_estado_civil, key)}
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
