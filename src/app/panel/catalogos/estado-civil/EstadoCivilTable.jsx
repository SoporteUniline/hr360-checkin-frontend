"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Trash2 } from "lucide-react";
import useSWR from "swr";
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            Lista de estados civiles
          </h2>
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
              {estadoCivil.map((civ) => (
                <TableRow
                  key={civ.id_estado_civil}
                  className="hover:bg-gray-50 border-b border-gray-100"
                >
                  <TableCell className="font-medium text-gray-900">
                    {civ.nombre}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center gap-2">
                      <button
                        onClick={() => onEdit(civ, estadoCivil)}
                        className="p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4 text-[#2563EB]" />
                      </button>
                      <button
                        onClick={() => onDelete(civ.id_estado_civil, key)}
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
