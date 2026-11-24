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
import { ALCANCE_TXT, HORAS_TXT, normalizarTipo } from "@/lib/asistencia/tiposGoce.mjs";
import { ICONO_ROL, capturaDe, claseDe, nombreTipo, rolDe } from "@/lib/asistencia/quePasoMotivo.mjs";
import { ChevronRight, Pencil, Trash2 } from "lucide-react";
import useSWR from "swr";
import { fetcherWithToken, swr_config } from "@/lib/fetcher";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import TablePagination from "@/components/TablePagination";

// «Qué pasó»: solo los tipos que se ofrecen en capturas nuevas (`captura` 1). El goce y las horas de Inasistencia y de
// los parciales los pone el MOTIVO (sección «Motivos»); los días de ley tienen su goce fijo (🔒). Los tipos anteriores
// (`captura` 0: «Inasistencia justificada», «Visita al médico»…) siguen en el historial y se listan plegados abajo.
// Los íconos van por rol, no por nombre.
function goceYHoras(t, regi) {
  const clase = claseDe(regi);
  if (t.fijo) return { texto: `🔒 ${t.goce === "con" ? "Con goce" : "Sin goce"}`, nota: t.razon?.etiqueta };
  if (clase === "asistencia") return { texto: "Día trabajado", nota: "Las horas las calcula el reloj" };
  if (clase === "inasistencia") return { texto: "El pago lo decide el motivo", nota: "Sin motivo: injustificada, sin goce y acta en borrador" };
  if (rolDe(regi) !== "propio" && rolDe(regi) !== "heredado" && clase === "parcial") {
    const sin = { entrada: "retardo sin permiso", salida: "salida antes sin permiso", medio: "salida sin permiso" }[t.alcance] ?? "sin permiso";
    return { texto: "El pago lo decide el motivo", nota: `Con motivo: día con goce y horas según el motivo · sin motivo: ${sin}` };
  }
  return { texto: `${t.goce === "con" ? "Con goce" : "Sin goce"}${t.parcial ? ` · ${HORAS_TXT[t.horas]}` : ""}`, nota: t.cambia ? "Se cambia al aplicar" : "No se cambia al aplicar" };
}
const iconoTipo = (regi) => {
  const rol = rolDe(regi);
  return rol === "sistema" ? "" : `${ICONO_ROL[rol] ?? "📝"} `;
};

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
  const key = `${swrKey}&captura=1&page=${page}&limit=${limit}&nombre=${filter}`;
  const { data, error, isLoading } = useSWR(key, fetcherWithToken, swr_config);
  // Tipos anteriores (solo historial): todos los del catálogo con `captura` 0.
  const { data: dataTodos } = useSWR(`${swrKey}&page=1&limit=200&nombre=${filter}`, fetcherWithToken, swr_config);
  const anteriores = (dataTodos?.tiposPermiso ?? []).filter((t) => !capturaDe(t) && rolDe(t) !== "sistema");
  const esPropio = (regi) => Boolean(dataUser?.empresas?.includes(Number(regi.id_empresa)));

  useEffect(() => {
    if (data?.total && onTotalChange) {
      onTotalChange(data.total);
    }
  }, [data?.total, onTotalChange]);

  const registros = (data?.tiposPermiso || []).filter((t) => capturaDe(t) && rolDe(t) !== "sistema");
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
                  <TableHead className="font-semibold text-gray-600">Qué pasó</TableHead>
                  {mostrarColumnaEmpresa && (
                    <TableHead className="font-semibold text-gray-600">Unidad de negocio</TableHead>
                  )}
                  <TableHead className="font-semibold text-gray-600">Abarca</TableHead>
                  <TableHead className="font-semibold text-gray-600">Goce y horas</TableHead>
                  <TableHead className="text-right font-semibold text-gray-600">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registros.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={mostrarColumnaEmpresa ? 5 : 4}
                      className="text-center py-10 text-muted-foreground"
                    >
                      No se encontraron registros.
                    </TableCell>
                  </TableRow>
                ) : (
                  registros.map((regi) => {
                    const t = normalizarTipo(regi);
                    // Los de ley no se editan (🔒). Asistencia, Inasistencia y los parciales del sistema tampoco: su pago lo
                    // pone el motivo. Los propios de la empresa se editan o se eliminan.
                    const propio = esPropio(regi);
                    const gh = goceYHoras(t, regi);
                    const nombreEmpresa = dataUser?.empresas_detalle?.find((e) => e.id_empresa === regi.id_empresa)?.nombre || "Sistema / Global";
                    const nota = t.razon?.nota || regi.descripcion;
                    return (
                      <TableRow key={regi.id} data-tipo={regi.id} className="hover:bg-zinc-50">
                        <TableCell className="min-w-[220px] whitespace-normal">
                          <span className="flex flex-wrap items-center gap-1.5 text-[13.5px] font-medium text-gray-900">
                            {iconoTipo(regi)}{nombreTipo(regi)}
                            {t.fijo ? <span data-fijo className="text-[12px] font-normal text-slate-500" title={t.razon?.nota}>🔒 {t.razon?.etiqueta}</span> : null}
                            {regi.personalizado ? (
                              <span data-personalizado title="Tu empresa cambió la configuración de este tipo del sistema"
                                className="rounded-full bg-blue-50 px-2 py-0.5 text-[12px] font-medium text-blue-700">Personalizado</span>
                            ) : null}
                          </span>
                          {nota ? <span className="block text-[12px] leading-snug text-slate-500">{nota}</span> : null}
                        </TableCell>
                        {mostrarColumnaEmpresa && (
                          <TableCell>
                            <span className={`text-[12px] px-2 py-0.5 rounded-full ${propio ? "bg-blue-50 text-blue-600 font-medium" : "bg-gray-100 text-gray-500"}`}>
                              {regi.unidad_negocio || regi.nombre_sucursal || regi.sucursal || nombreEmpresa}
                            </span>
                          </TableCell>
                        )}
                        <TableCell className="whitespace-nowrap text-[13.5px] text-slate-700">{ALCANCE_TXT[t.alcance]}</TableCell>
                        <TableCell className="min-w-[220px] whitespace-normal text-[13.5px] text-slate-800" data-goce-horas>
                          {gh.texto}
                          {gh.nota && !t.fijo ? <span className="block text-[12px] text-slate-500">{gh.nota}</span> : null}
                        </TableCell>
                        <TableCell className="text-right">
                          {propio && !t.fijo ? (
                            <div className="flex justify-end items-center gap-2">
                              <button onClick={() => onEdit(regi, registros)} className="p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                title="Editar" aria-label={`Editar ${regi.nombre}`}>
                                <Pencil className="h-4 w-4 text-[#2563EB]" />
                              </button>
                              <button onClick={() => onDelete(regi.id)} className="p-2 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                                title="Eliminar" aria-label={`Eliminar ${regi.nombre}`}>
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </button>
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
      {anteriores.length ? (
        <details data-tipos-anteriores className="group rounded-xl border border-gray-100 bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-[13.5px] font-semibold text-slate-700 [&::-webkit-details-marker]:hidden">
            <ChevronRight className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-90" aria-hidden />
            Tipos anteriores (solo historial) <span className="font-normal text-slate-500">· {anteriores.length}</span>
          </summary>
          <div className="border-t border-gray-100 px-4 py-3">
            <p className="text-[12.5px] text-slate-500">Ya no se ofrecen en capturas nuevas: ahora son un motivo («Inasistencia» + «Visita al médico»). Los registros que ya los tienen se ven y se pagan igual que siempre.</p>
            <ul className="mt-2 divide-y divide-slate-100">
              {anteriores.map((regi) => (
                <li key={regi.id} data-tipo-anterior={regi.id} className="flex min-h-10 items-center justify-between gap-3 py-1.5 text-[13.5px] text-slate-700">
                  <span className="min-w-0 break-words">{nombreTipo(regi)}</span>
                  <span className="shrink-0 text-[12px] text-slate-400">Solo historial</span>
                </li>
              ))}
            </ul>
          </div>
        </details>
      ) : null}
    </>
  );
}
