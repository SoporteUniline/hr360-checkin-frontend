"use client";

import axios from "@/lib/axios";
import useSWR from "swr";
import { useAuth } from "@/context/AuthContext";
import { fetcherWithToken } from "@/lib/fetcher";
import { useEffect, useState } from "react";
import { CalendarClock, Plus, Pencil, Trash2, UsersRound } from "lucide-react";
import TurnoDialog from "./TurnoDialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AsignarEmpleadosDialog from "./AsignarEmpleadosDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import EncabezadoPagina from "@/components/tabla/EncabezadoPagina";
import LoadingTable from "@/components/LoadingTable";
import ErrorPage from "@/components/ErrorPage";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function TurnosPage() {
  const [modalTurnoAbierto, setModalTurnoAbierto] = useState(false);
  const [turnoSeleccionado, setTurnoSeleccionado] = useState(null);
  const [turnoEliminar, setTurnoEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState("");
  const { dataUser } = useAuth();

  const [empresaActiva, setEmpresaActiva] = useState("all");

  const [turnoAsignar, setTurnoAsignar] = useState(null);

  useEffect(() => {
    if (dataUser?.empresas_detalle?.length === 1) {
      setEmpresaActiva(String(dataUser.empresas_detalle[0].id_empresa));
    }
  }, [dataUser]);

  const idEmpresa =
    empresaActiva && empresaActiva !== "all" ? empresaActiva : null;

  const { data, error, isLoading, mutate } = useSWR(
    idEmpresa
      ? `/checador/turnos?id_empresa=${idEmpresa}&page=1&limit=100`
      : null,
    fetcherWithToken,
    {
      revalidateOnFocus: false,
    },
  );

  const turnos = data?.turnos || [];

  const abrirNuevoTurno = () => {
    setTurnoSeleccionado(null);
    setModalTurnoAbierto(true);
  };

  const abrirEditarTurno = (turno) => {
    console.log("TURNO A EDITAR:", turno);
    setTurnoSeleccionado(turno);
    setModalTurnoAbierto(true);
  };

  const eliminarTurno = async () => {
    if (!turnoEliminar?.id_turno) return;

    try {
      setEliminando(true);
      setErrorEliminar("");

      await axios.delete(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/turnos/${turnoEliminar.id_turno}`,
      );

      setTurnoEliminar(null);
      await mutate();
    } catch (err) {
      let mensaje = "No se pudo eliminar el turno.";

      if (err?.response?.status === 409) {
        mensaje =
          "No se puede eliminar este turno porque tiene empleados asignados. " +
          "Quita o cambia el turno de esos empleados antes de eliminarlo.";
      } else {
        mensaje =
          err?.response?.data?.error ||
          err?.response?.data?.mensaje ||
          err?.message ||
          mensaje;
      }

      setErrorEliminar(mensaje);
    } finally {
      setEliminando(false);
    }
  };

  if (isLoading && idEmpresa) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] p-6">
        <LoadingTable rows={6} />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorPage message={error?.message || "Error al cargar los turnos"} />
    );
  }

  const esMultiEmpresa = dataUser?.empresas_detalle?.length > 1;

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-6">
      <div className="mb-6">
        <EncabezadoPagina
          icono={CalendarClock}
          titulo="Turnos"
          subtitulo="Catálogo y asignación de horarios laborales"
        />
      </div>

      <div className="mb-6 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full sm:max-w-xs">
            {esMultiEmpresa ? (
              <>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Unidad de negocio
                </label>

                <Select value={empresaActiva} onValueChange={setEmpresaActiva}>
                  <SelectTrigger className="h-[38px] w-full rounded-md border-gray-200 text-[13px] font-medium">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="all">Selecciona una empresa</SelectItem>

                    {dataUser?.empresas_detalle?.map((empresa) => (
                      <SelectItem
                        key={String(empresa.id_empresa)}
                        value={String(empresa.id_empresa)}
                      >
                        {empresa.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            ) : null}
          </div>

          <Button
            type="button"
            disabled={!idEmpresa}
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={abrirNuevoTurno}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo turno
          </Button>
        </div>
      </div>

      {!idEmpresa ? (
        <div className="rounded-xl border border-gray-100 bg-white p-10 text-center text-sm text-gray-500 shadow-sm">
          Selecciona una empresa para consultar sus turnos.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Lista de turnos
              </h2>

              <p className="text-sm text-gray-500">
                {data?.total ?? turnos.length} turno(s) registrado(s)
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Días configurados</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {turnos.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-10 text-center text-gray-500"
                    >
                      No hay turnos registrados.
                    </TableCell>
                  </TableRow>
                ) : (
                  turnos.map((turno) => (
                    <TableRow key={turno.id_turno}>
                      <TableCell className="font-medium text-gray-900">
                        {turno.nombre}
                      </TableCell>

                      <TableCell className="text-gray-600">
                        {turno.descripcion || "-"}
                      </TableCell>

                      <TableCell className="text-gray-600">
                        {turno.dias?.length ?? 0}
                      </TableCell>

                      <TableCell className="text-center">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                            turno.activo
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-gray-200 bg-gray-100 text-gray-600"
                          }`}
                        >
                          {turno.activo ? "Activo" : "Inactivo"}
                        </span>
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => abrirEditarTurno(turno)}
                            className="rounded-lg bg-blue-50 p-2 transition-colors hover:bg-blue-100"
                            title="Editar turno"
                          >
                            <Pencil className="h-4 w-4 text-blue-600" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setErrorEliminar("");
                              setTurnoEliminar(turno);
                            }}
                            className="rounded-lg bg-red-50 p-2 transition-colors hover:bg-red-100"
                            title="Eliminar turno"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setTurnoAsignar(turno)}
                            className="rounded-lg bg-indigo-50 p-2 transition-colors hover:bg-indigo-100"
                            title="Asignar empleados"
                          >
                            <UsersRound className="h-4 w-4 text-indigo-600" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <TurnoDialog
        open={modalTurnoAbierto}
        onOpenChange={(open) => {
          setModalTurnoAbierto(open);

          if (!open) {
            setTurnoSeleccionado(null);
          }
        }}
        idEmpresa={idEmpresa}
        turno={turnoSeleccionado}
        onSaved={mutate}
      />

      <Dialog
        open={Boolean(turnoEliminar)}
        onOpenChange={(open) => {
          if (!open && !eliminando) {
            setTurnoEliminar(null);
            setErrorEliminar("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Eliminar turno</DialogTitle>

            <DialogDescription className="text-left">
              ¿Seguro que deseas eliminar el turno{" "}
              <strong>{turnoEliminar?.nombre}</strong>?
            </DialogDescription>
          </DialogHeader>

          {errorEliminar && (
            <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
              {errorEliminar}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={eliminando}
              onClick={() => {
                setTurnoEliminar(null);
                setErrorEliminar("");
              }}
            >
              Cancelar
            </Button>

            <Button
              type="button"
              disabled={eliminando}
              onClick={eliminarTurno}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {eliminando ? "Eliminando..." : "Eliminar turno"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AsignarEmpleadosDialog
        open={Boolean(turnoAsignar)}
        onOpenChange={(open) => {
          if (!open) {
            setTurnoAsignar(null);
          }
        }}
        turno={turnoAsignar}
        idEmpresa={idEmpresa}
        onSaved={async () => {
          await mutate();
        }}
      />
    </div>
  );
}
