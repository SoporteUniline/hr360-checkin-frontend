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

export default function PositionsTable({
  id_empresa,
  filter,
  swrKey,
  onEdit,
  onDelete,
  onTotalChange,
  onLoad,
}) {
  const showEmpresa = id_empresa === "all";

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const key = `${swrKey}&page=${page}&limit=${limit}&nombre=${filter}`;
  const { data, error, isLoading } = useSWR(key, fetcherWithToken, swr_config);

  useEffect(() => {
    if (data?.total && onTotalChange) {
      onTotalChange(data.total);
    }
  }, [data?.total, onTotalChange]);

  const positions = data?.puestos || [];
  useEffect(() => {
    if (onLoad) {
      onLoad(positions);
    }
  }, [positions]);

  if (isLoading) return <p>Cargando...</p>;
  if (error) return <p>Error al cargar puestos</p>;

  if (positions.length === 0)
    return (
      <div className="text-center py-10 text-muted-foreground">
        No se encontraron puestos.
      </div>
    );

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            {showEmpresa && <TableHead>Empresa</TableHead>}
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {positions.map((puesto) => (
            <TableRow key={puesto.id_puesto}>
              <TableCell>{puesto.nombre_puesto}</TableCell>
              {showEmpresa && <TableCell>{puesto.empresa_nombre}</TableCell>}
              <TableCell className="text-right flex justify-end gap-2">
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => onEdit(puesto, positions)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={() => onDelete(puesto.id_puesto, key)}
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
