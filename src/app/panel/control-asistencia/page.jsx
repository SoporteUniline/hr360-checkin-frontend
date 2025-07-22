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
import TablePagination from "@/components/TablePagination";
import FormularioEditarAsistencia from "./FormularioEditarAsistencia"; // nuevo componente de formulario

dayjs.extend(utc);
dayjs.extend(timezone);

export default function ControlAsistencia() {
  const [modoFormulario, setModoFormulario] = useState(false);
  const [registroSeleccionado, setRegistroSeleccionado] = useState(null);

  const { dataUser } = useAuth();
  const [fecha, setFecha] = useState(
    dayjs().tz("America/Mexico_City").format("YYYY-MM-DD")
  );
  const [page, setPage] = useState(1);
  const limit = 10;
  const [filtroEmpleado, setFiltroEmpleado] = useState("");

  const { data, error, isLoading, mutate } = useSWR(
    dataUser?.id_empresa
      ? `/checador/asistencias?empresa=${dataUser.id_empresa}&${
          fecha ? `fecha=${fecha}&` : ""
        }page=${page}&limit=${limit}`
      : null,
    fetcherWithToken
  );

  const registros = Array.isArray(data?.registros) ? data.registros : [];
  const totalPages = data?.totalPages || 1;
  const currentPage = data?.currentPage || 1;

  const filtrados = registros.filter((r) =>
    `${r.nombre} ${r.apellido_paterno} ${r.apellido_materno || ""}`
      .toLowerCase()
      .includes(filtroEmpleado.toLowerCase())
  );

  const onPageChange = (newPage) => {
    setPage(newPage);
  };

  if (isLoading) return <LoadingTable rows={10} />;
  if (error) {
    console.error(error);
    return <ErrorPage message="Error al cargar los registros de asistencia" />;
  }

  return (
    <div>
      {modoFormulario ? (
        <FormularioEditarAsistencia
          registro={registroSeleccionado}
          setRegistroSeleccionado={setRegistroSeleccionado}
          modoFormulario={modoFormulario}
          setModoFormulario={setModoFormulario}
          empresaId={dataUser?.id_empresa}
          onGuardado={() => {
            mutate();
            setRegistroSeleccionado(null);
          }}
          onCancel={() => setRegistroSeleccionado(null)}
        />
      ) : (
        <>
          <div className="mb-3 w-full flex gap-3 justify-between items-center">
            <Input
              placeholder="Buscar empleado por nombre..."
              value={filtroEmpleado}
              onChange={(e) => setFiltroEmpleado(e.target.value)}
              className="w-full max-w-md"
            />
            <Input
              type="date"
              value={fecha}
              onChange={(e) => {
                setFecha(e.target.value);
                setPage(1);
              }}
              className="max-w-xs"
            />
          </div>
          {filtrados.length === 0 ? (
            <div className="text-center text-muted-foreground py-10">
              No hay registros para hoy o búsqueda sin resultados.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Tipo de registro</TableHead>
                    {!fecha && (
                      <TableHead className="text-center">Fecha</TableHead>
                    )}
                    <TableHead className="text-center">Entrada</TableHead>
                    <TableHead className="text-center">Salida</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map((reg, i) => (
                    <TableRow key={i}>
                      <TableCell>{`${reg.nombre} ${reg.apellido_paterno}`}</TableCell>
                      <TableCell>{reg.tipo_registro_nombre}</TableCell>
                      {!fecha && (
                        <TableCell className="text-center">
                          {reg.fecha
                            ? dayjs(reg.fecha)
                                .tz("America/Mexico_City")
                                .format("DD-MM-YYYY")
                            : "-"}
                        </TableCell>
                      )}
                      <TableCell className="text-center">
                        {reg.entrada ? reg.entrada.slice(11, 19) : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {reg.salida ? reg.salida.slice(11, 19) : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-sm text-white ${
                            reg.estado === "Abierto"
                              ? "bg-green-600"
                              : "bg-gray-500"
                          }`}
                        >
                          {reg.estado}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          onClick={() => {
                            setRegistroSeleccionado(reg);
                            setModoFormulario(true);
                          }}
                        >
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                page={page}
                limit={limit}
                total={data?.total || 0}
                onPageChange={onPageChange}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
