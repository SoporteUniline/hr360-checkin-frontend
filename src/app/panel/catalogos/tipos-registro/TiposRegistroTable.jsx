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
import { useAuth } from "@/context/AuthContext";
import TablePagination from "@/components/TablePagination";

export default function TiposRegistroTable({
  id_empresa,
  filter,
  swrKey,
  onEdit,
  onDelete,
  onTotalChange,
  onLoad,
  page,
  setPage,
}) {
  const { dataUser } = useAuth();
  const [limit, setLimit] = useState(10);
  const mostrarColumnaEmpresa = id_empresa === "all";
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

  console.log(registros);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="bg-[#37495E] hover:bg-[#37495E]">
            <TableHead className="text-white">Clave</TableHead>
            <TableHead className="text-white">Nombre</TableHead>
            {mostrarColumnaEmpresa && (
              <TableHead className="text-white">Empresa</TableHead>
            )}
            <TableHead className="text-white">Descripción</TableHead>
            <TableHead className="text-right text-white">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {registros.length === 0 ? (
            <TableRow>
              <TableRow>
                <TableCell
                  colSpan={mostrarColumnaEmpresa ? 5 : 4}
                  className="text-center py-10 text-muted-foreground"
                >
                  No se encontraron registros.
                </TableCell>
              </TableRow>
            </TableRow>
          ) : (
            registros.map((regi) => {
              const esSistema = regi.id <= 18;
              const puedeGestionar =
                !esSistema &&
                dataUser.empresas.includes(Number(regi.id_empresa));

              const nombreEmpresa =
                dataUser?.empresas_detalle?.find(
                  (e) => e.id_empresa === regi.id_empresa,
                )?.nombre || "Sistema / Global";

              return (
                <TableRow key={regi.id}>
                  <TableCell>{regi.clave}</TableCell>
                  <TableCell>{regi.nombre}</TableCell>
                  {mostrarColumnaEmpresa && (
                    <TableCell>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full ${
                          esSistema
                            ? "bg-gray-100 text-gray-500"
                            : "bg-blue-50 text-blue-600 font-medium"
                        }`}
                      >
                        {nombreEmpresa}
                      </span>
                    </TableCell>
                  )}
                  <TableCell>{regi.descripcion}</TableCell>

                  <TableCell className="text-right flex justify-end gap-2">
                    {puedeGestionar ? (
                      <>
                        <Button
                          size="icon"
                          variant="outline"
                          className="border-[#93c5fd] text-[#2563eb] hover:bg-[#dbeafe]"
                          onClick={() => onEdit(regi, registros)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="border-[#fca5a5] text-[#dc2626] hover:bg-[#fee2e2]"
                          onClick={() => onDelete(regi.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded uppercase mr-2">
                        Sistema
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      <TablePagination
        page={page}
        limit={limit}
        total={data?.total}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />
    </>
  );
}
