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
import { Card, CardContent } from "@/components/ui/card";
import { ALCANCE_TXT, HORAS_TXT, esDelSistema, normalizarTipo } from "@/lib/asistencia/tiposGoce.mjs";
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
                  <TableHead className="font-semibold text-gray-600">Tipo</TableHead>
                  {mostrarColumnaEmpresa && (
                    <TableHead className="font-semibold text-gray-600">Unidad de negocio</TableHead>
                  )}
                  <TableHead className="font-semibold text-gray-600">Abarca</TableHead>
                  <TableHead className="font-semibold text-gray-600">Goce del día</TableHead>
                  <TableHead className="font-semibold text-gray-600">Horas no trabajadas</TableHead>
                  <TableHead className="font-semibold text-gray-600">Se cambia al aplicar</TableHead>
                  <TableHead className="text-right font-semibold text-gray-600">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registros.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={mostrarColumnaEmpresa ? 7 : 6}
                      className="text-center py-10 text-muted-foreground"
                    >
                      No se encontraron registros.
                    </TableCell>
                  </TableRow>
                ) : (
                  registros.map((regi) => {
                    const esSistema = regi.es_base != null ? Boolean(regi.es_base) : regi.id <= 18;
                    const t = normalizarTipo(regi);
                    // Los fijados por ley no se editan (🔒). Los demás del sistema se editan solo en goce y horas
                    // (el servidor valida permisos y fijo_ley).
                    const propio = Boolean(dataUser?.empresas?.includes(Number(regi.id_empresa)));
                    // «Asistencia», «Sin checar» y «Cerrado por sistema» los pone el sistema: no se configuran.
                    const puedeEditar = !t.fijo && !esDelSistema(regi) && (propio || esSistema);
                    const puedeEliminar = !esSistema && propio && !t.fijo;

                    const nombreEmpresa =
                      dataUser?.empresas_detalle?.find(
                        (e) => e.id_empresa === regi.id_empresa,
                      )?.nombre || "Sistema / Global";
                    const nota = t.razon?.nota || regi.descripcion;

                    return (
                      <TableRow key={regi.id} data-tipo={regi.id} className="hover:bg-zinc-50">
                        <TableCell className="min-w-[220px] whitespace-normal">
                          <span className="flex flex-wrap items-center gap-1.5 text-[13.5px] font-medium text-gray-900">
                            {regi.nombre}
                            {regi.personalizado ? (
                              <span data-personalizado title="Tu empresa cambió la configuración de este tipo del sistema"
                                className="rounded-full bg-blue-50 px-2 py-0.5 text-[12px] font-medium text-blue-700">Personalizado</span>
                            ) : null}
                          </span>
                          {nota ? <span className="block text-[12px] leading-snug text-slate-500">{nota}</span> : null}
                        </TableCell>
                        {mostrarColumnaEmpresa && (
                          <TableCell>
                            <span
                              className={`text-[12px] px-2 py-0.5 rounded-full ${
                                esSistema
                                  ? "bg-gray-100 text-gray-500"
                                  : "bg-blue-50 text-blue-600 font-medium"
                              }`}
                            >
                              {regi.unidad_negocio ||
                                regi.nombre_sucursal ||
                                regi.sucursal ||
                                nombreEmpresa}
                            </span>
                          </TableCell>
                        )}
                        <TableCell className="whitespace-nowrap text-[13.5px] text-slate-700">{ALCANCE_TXT[t.alcance]}</TableCell>
                        <TableCell className="whitespace-nowrap text-[13.5px] text-slate-800">{t.goce === "con" ? "Con goce" : "Sin goce"}</TableCell>
                        <TableCell className="whitespace-nowrap text-[13.5px] text-slate-800">
                          {t.parcial ? HORAS_TXT[t.horas] : <span className="text-slate-400">—</span>}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-[13.5px]">
                          {t.fijo ? (
                            <span data-fijo className="text-[12.5px] text-slate-500" title={t.razon?.nota}>🔒 {t.razon?.etiqueta}</span>
                          ) : (
                            <span className="text-slate-800">{t.cambia ? "Sí" : "No"}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {puedeEditar || puedeEliminar ? (
                            <div className="flex justify-end items-center gap-2">
                              {puedeEditar ? (
                                <button
                                  onClick={() => onEdit(regi, registros)}
                                  className="p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                  title="Editar"
                                  aria-label={`Editar ${regi.nombre}`}
                                >
                                  <Pencil className="h-4 w-4 text-[#2563EB]" />
                                </button>
                              ) : null}
                              {puedeEliminar ? (
                                <button
                                  onClick={() => onDelete(regi.id)}
                                  className="p-2 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                                  title="Eliminar"
                                  aria-label={`Eliminar ${regi.nombre}`}
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </button>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-[12px] text-slate-400 mr-2">{t.fijo ? "No editable" : "Sistema"}</span>
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
