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
import { Check, Eye, Pencil, X } from "lucide-react";
import { permisosApi } from "@/lib/permisosApi";
import { useSnackbar } from "notistack";
import { cn } from "@/lib/utils";

const formatDateOnly = (value) => {
  if (!value) return "-";

  const [year, month, day] = String(value).slice(0, 10).split("-");

  if (!year || !month || !day) return "-";

  return `${day}/${month}/${year}`;
};

const diffDaysInclusive = (start, end) => {
  if (!start || !end) return 1;

  const startDate = new Date(`${String(start).slice(0, 10)}T12:00:00`);
  const endDate = new Date(`${String(end).slice(0, 10)}T12:00:00`);

  return Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
};

export const PermissionTable = ({
  data,
  setOpen,
  setMode,
  setSelected,
  modoAutorizar = false,
  mutate,
}) => {
  const { enqueueSnackbar } = useSnackbar();

  const cambiarEstado = async (id, estado) => {
    try {
      await permisosApi.actualizarEstado(id, estado);
      enqueueSnackbar(`Solicitud ${estado.toLowerCase()} correctamente`, {
        variant: "success",
      });
      mutate?.();
    } catch (error) {
      enqueueSnackbar(
        error?.response?.data?.error || "Error al actualizar la solicitud",
        { variant: "error" },
      );
    }
  };
  return (
    <div className="overflow-x-auto rounded-lg border mt-4">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            {modoAutorizar && (
              <TableHead className="whitespace-nowrap text-xs font-semibold uppercase text-gray-600">
                Empleado
              </TableHead>
            )}
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase text-gray-600">
              Tipo de permiso
            </TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase text-gray-600">
              Fecha inicio
            </TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase text-gray-600">
              Fecha fin
            </TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase text-gray-600">
              Días
            </TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase text-gray-600">
              Estado
            </TableHead>
            <TableHead className="whitespace-nowrap text-xs font-semibold uppercase text-gray-600">
              Solicitado
            </TableHead>
            <TableHead className="sticky right-0 bg-gray-50 z-10 text-right whitespace-nowrap text-xs font-semibold uppercase text-gray-600">
              Acciones
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.map((row) => {
            const fechaInicio = formatDateOnly(row.fecha_inicio);
            const fechaFin = formatDateOnly(row.fecha_fin);

            return (
              <TableRow key={row.id} className="hover:bg-zinc-50">
                {modoAutorizar && (
                  <TableCell>
                    <div className="font-medium">{row.empleado_nombre}</div>
                  </TableCell>
                )}
                <TableCell>{row.tipo_permiso_nombre}</TableCell>

                <TableCell>{fechaInicio}</TableCell>
                <TableCell>{fechaFin}</TableCell>
                <TableCell>
                  {diffDaysInclusive(row.fecha_inicio, row.fecha_fin)}
                </TableCell>
                <TableCell>
                  <EstadoBadge estado={row.estado} />
                </TableCell>
                <TableCell>{formatDateOnly(row.marca_tiempo)} </TableCell>

                <TableCell className="sticky right-0 bg-white z-10 text-right shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)]">
                  <div className="flex justify-end gap-2">
                    {modoAutorizar && row.estado === "Pendiente" && (
                      <>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          onClick={() => cambiarEstado(row.id, "Aprobado")}
                          title="Aprobar"
                        >
                          <Check className="h-4 w-4" />
                        </Button>

                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                          onClick={() => cambiarEstado(row.id, "Rechazado")}
                          title="Rechazar"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {!modoAutorizar && row.estado === "Pendiente" && (
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
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
                      variant="outline"
                      className="h-8 w-8 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
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

function EstadoBadge({ estado }) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold";

  if (estado === "Pendiente") {
    return (
      <span className={cn(base, "bg-amber-100 text-amber-900")}>Pendiente</span>
    );
  }
  if (estado === "Aprobado") {
    return (
      <span className={cn(base, "bg-emerald-100 text-emerald-900")}>
        Aprobado
      </span>
    );
  }
  if (estado === "Rechazado") {
    return (
      <span className={cn(base, "bg-red-100 text-red-900")}>Rechazado</span>
    );
  }
  if (estado === "Cancelado") {
    return (
      <span className={cn(base, "bg-zinc-200 text-zinc-700")}>Cancelado</span>
    );
  }
  return (
    <span className={cn(base, "bg-zinc-200 text-zinc-700")}>
      {estado || "—"}
    </span>
  );
}
