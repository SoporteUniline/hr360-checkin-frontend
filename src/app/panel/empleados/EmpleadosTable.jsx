"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import EstadoEmpleadoDialog from "./EstadoEmpleadoDialog";
import dayjs from "dayjs";
import "dayjs/locale/es";

dayjs.locale("es");

// Función auxiliar para iniciales
const getInitials = (nombreCompleto = "") => {
  const parts = nombreCompleto.split(" ");
  return parts
    .map((p) => p[0]?.toUpperCase() || "")
    .slice(0, 2)
    .join("");
};

export default function EmpleadosTable({
  empleados,
  abrirFormulario,
  mutate,
  page,
  limit,
}) {
  if (!empleados || empleados.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-10">
        No hay empleados o búsqueda sin resultados.
      </div>
    );
  }

  return (
    <>
      <div className="bg-slate-700 shadow-md px-4 py-3 rounded-tl-md rounded-tr-md">
        <h2 className="text-lg font-bold bg-slate-700 text-white">
          Lista de empleados
        </h2>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-700 text-white rounded">
            <TableHead className="bg-slate-700 text-white">Nombre</TableHead>
            <TableHead className="bg-slate-700 text-white w-auto">
              Puesto
            </TableHead>
            <TableHead className="bg-slate-700 text-white text-center">
              Departamento
            </TableHead>
            <TableHead className="bg-slate-700 text-white">Contacto</TableHead>
            <TableHead className="bg-slate-700 text-white">
              Fecha de ingreso
            </TableHead>
            <TableHead className="bg-slate-700 text-white text-center">
              Estado
            </TableHead>
            <TableHead className="sticky right-0 bg-slate-700 text-white z-10 text-center">
              Acciones
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {empleados.map((emp) => {
            const nombreCompleto = `${emp.nombre} ${
              emp.apellido_paterno ?? ""
            } ${emp.apellido_materno ?? ""}`.trim();

            return (
              <TableRow
                className="cursor-pointer"
                key={emp.id_empleado}
                onClick={() => abrirFormulario(emp, false, true)}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-10 w-10">
                      {emp.foto_perfil ? (
                        <AvatarImage
                          src={emp.foto_perfil}
                          alt={nombreCompleto}
                        />
                      ) : null}
                      <AvatarFallback className="bg-slate-700 text-white font-bold">
                        {getInitials(nombreCompleto)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <section className="font-bold">{nombreCompleto}</section>
                      {emp?.nip ? (
                        <section className="text-gray-500">
                          <span className="font-bold">Código:</span> {emp.nip}
                        </section>
                      ) : null}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-bold w-auto">{emp.puesto}</TableCell>
                <TableCell className="flex justify-center">
                  {emp.departamento ? (
                    <div className="rounded-xl border px-4 py-1 my-2">
                      {emp.departamento}
                    </div>
                  ) : null}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col text-gray-600">
                    {emp?.correo ? <div>📧 {emp.correo}</div> : null}
                    {emp?.telefono ? <div>📱 {emp.telefono}</div> : null}
                  </div>
                </TableCell>
                <TableCell>
                  {dayjs(emp.fecha_ingreso).format("D MMM YYYY")}
                </TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded-full text-sm text-white ${
                      emp.estado === "Activo" ? "bg-green-600" : "bg-gray-500"
                    }`}
                  >
                    {emp.estado}
                  </span>
                </TableCell>
                <TableCell className="sticky right-0 bg-background z-10 text-center">
                  <div className="flex justify-center gap-2">
                    <div>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          abrirFormulario(emp, true, false);
                        }}
                        className="bg-slate-700 hover:bg-slate-700"
                      >
                        <Pencil className="text-white bg-slate-700" />
                      </Button>
                    </div>
                    <div
                      onClick={(e) => e.stopPropagation()} // 👈 Esto evita que se dispare el click de la fila
                    >
                      <EstadoEmpleadoDialog
                        item={emp}
                        limit={limit}
                        page={page}
                        className={
                          emp.estado === "Inactivo"
                            ? "text-green-600 border-green-600"
                            : "text-green-600 border-green-600"
                        }
                      />
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </>
  );
}
