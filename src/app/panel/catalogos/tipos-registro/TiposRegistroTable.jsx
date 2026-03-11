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

  return (
    <>
      <Card className="p-0 overflow-hidden border-gray-100">
        
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-xs font-semibold uppercase text-gray-600">
                    Clave
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-gray-600">
                    Nombre
                  </TableHead>
                  {mostrarColumnaEmpresa && (
                    <TableHead className="text-xs font-semibold uppercase text-gray-600">
                      Empresa
                    </TableHead>
                  )}
                  <TableHead className="text-xs font-semibold uppercase text-gray-600">
                    Descripción
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase text-gray-600">
                    Acciones
                  </TableHead>
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
                      <TableRow key={regi.id} className="hover:bg-zinc-50">
                        <TableCell>{regi.clave}</TableCell>
                        <TableCell className="font-medium text-gray-900">
                          {regi.nombre}
                        </TableCell>
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
                        <TableCell className="text-gray-600">
                          {regi.descripcion}
                        </TableCell>
                        <TableCell className="text-right">
                          {puedeGestionar ? (
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
          </div>
        </CardContent>
      </Card>
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
