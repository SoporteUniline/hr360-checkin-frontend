import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, Pencil } from "lucide-react";

export const PermissionTable = ({ data, setOpen, setMode, setSelected }) => {
  return (
    <div className="overflow-x-auto rounded-lg border mt-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo de permiso</TableHead>
            <TableHead>Fecha Inicio</TableHead>
            <TableHead>Fecha Fin</TableHead>
            <TableHead>Días</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Solicitado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.map((row) => {
            const fechaInicio = new Date(row.fecha_inicio).toLocaleDateString(
              "es-MX"
            );
            const fechaFin = row.fecha_fin
              ? new Date(row.fecha_fin).toLocaleDateString("es-MX")
              : "-";

            return (
              <TableRow key={row.id}>
                <TableCell>{row.tipo_permiso_nombre}</TableCell>
                <TableCell>{fechaInicio}</TableCell>
                <TableCell>{fechaFin}</TableCell>
                <TableCell>
                  {row.fecha_fin
                    ? Math.ceil(
                        (new Date(row.fecha_fin) - new Date(row.fecha_inicio)) /
                          (1000 * 60 * 60 * 24)
                      ) + 1
                    : 1}
                </TableCell>
                <TableCell>{row.estado}</TableCell>
                <TableCell>
                  {new Date(row.marca_tiempo).toLocaleDateString("es-MX")}
                </TableCell>

                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {row.estado === "Pendiente" && (
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => {
                          setSelected(row);
                          setMode("editar");
                          setOpen(true);
                        }}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}

                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={() => {
                        setSelected(row);
                        setMode("ver");
                        setOpen(true);
                      }}
                      title="Ver"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
