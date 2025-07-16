"use client";

import { useEffect, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import useSWR from "swr";
import { fetcherWithToken } from "@/lib/fetcher";
import { useAuth } from "@/context/AuthContext";
import ErrorPage from "@/components/ErrorPage";
import LoadingTable from "@/components/LoadingTable";
import { Button } from "@/components/ui/button";

dayjs.extend(utc);
dayjs.extend(timezone);

export default function ControlAsistencia() {
  const { dataUser } = useAuth();
  const [filtroEmpleado, setFiltroEmpleado] = useState("");

  // Obtener la fecha actual en zona horaria de México
  const fechaActual = dayjs().tz("America/Mexico_City").format("YYYY-MM-DD");

  const { data, error, isLoading, mutate } = useSWR(
    dataUser?.id_empresa
      ? `/checador/asistencias?empresa=${dataUser.id_empresa}&fecha=${fechaActual}`
      : null,
    fetcherWithToken,
    { refreshInterval: 60000 } // Opcional: refrescar cada 60 segundos
  );

  const registros = data || [];

  const filtrados = registros.filter((r) =>
    `${r.nombre} ${r.apellido_paterno} ${r.apellido_materno || ""}`
      .toLowerCase()
      .includes(filtroEmpleado.toLowerCase())
  );

  console.log(filtrados);

  if (isLoading) return <LoadingTable rows={10} />;
  if (error) {
    console.error(error);
    return <ErrorPage message="Error al cargar los registros de asistencia" />;
  }

  return (
    <div>
      <div className="mb-3 w-full flex gap-3 justify-between items-center">
        <Input
          placeholder="Buscar empleado por nombre..."
          value={filtroEmpleado}
          onChange={(e) => setFiltroEmpleado(e.target.value)}
          className="w-full max-w-md"
        />
      </div>

      {filtrados.length === 0 ? (
        <div className="text-center text-muted-foreground py-10">
          No hay registros para hoy o búsqueda sin resultados.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead className="text-center">Tipo de registro</TableHead>
              <TableHead className="text-center">Entrada</TableHead>
              <TableHead className="text-center">Salida</TableHead>
              <TableHead className="text-center">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.map((reg, i) => (
              <TableRow key={i}>
                <TableCell>{`${reg.nombre} ${reg.apellido_paterno}`}</TableCell>
                <TableCell className="text-center">
                  {reg.tipo_registro_nombre}
                </TableCell>

                <TableCell className="text-center">
                  {reg.entrada ? reg.entrada.slice(11, 19) : "-"}
                </TableCell>

                <TableCell className="text-center">
                  {reg.salida ? reg.salida.slice(11, 19) : "-"}
                </TableCell>
                <TableCell className="text-center">
                  <span
                    className={`px-2 py-1 rounded-full text-sm text-white ${
                      reg.estado === "Abierto" ? "bg-green-600" : "bg-gray-500"
                    }`}
                  >
                    {reg.estado}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
