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

  if (sucursales.length === 0)
    return (
      <div className="text-center py-10 text-muted-foreground">
        No se encontraron sucursales.
      </div>
    );

  if (isLoading) return <p>Cargando...</p>;
  if (error) return <p>Error al cargar sucursales</p>;

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
          {sucursales.map((suc) => (
            <TableRow key={suc.id_sucursal}>
              <TableCell>{suc.nombre}</TableCell>
              <TableCell className="text-right flex justify-end gap-2">
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => onEdit(suc, sucursales)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={() => onDelete(suc.id_sucursal, key)}
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
