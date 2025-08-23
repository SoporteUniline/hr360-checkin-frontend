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

export default function DepartamentosTable({
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

  const departamentos = data?.departamentos || [];
  useEffect(() => {
    if (onLoad) {
      onLoad(departamentos);
    }
  }, [departamentos]);

  if (departamentos.length === 0)
    return (
      <div className="text-center py-10 text-muted-foreground">
        No se encontraron departamentos.
      </div>
    );

  if (isLoading) return <p>Cargando...</p>;
  if (error) return <p>Error al cargar departamentos</p>;

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
          {departamentos.map((dep) => (
            <TableRow key={dep.id_departamento}>
              <TableCell>{dep.nombre}</TableCell>
              <TableCell className="text-right flex justify-end gap-2">
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => onEdit(dep, departamentos)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={() => onDelete(dep.id_departamento, key)}
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
