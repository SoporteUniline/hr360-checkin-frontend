"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "@/lib/axios";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, UserRoundPlus, UsersRound } from "lucide-react";
import { useSnackbar } from "notistack";

export default function AsignarEmpleadosDialog({
  open,
  onOpenChange,
  turno,
  idEmpresa,
  onSaved,
}) {
  const [empleados, setEmpleados] = useState([]);
  const [asignadosOriginales, setAsignadosOriginales] = useState([]);
  const [seleccionados, setSeleccionados] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (!open || !turno?.id_turno || !idEmpresa) return;

    setBusqueda("");
    setError("");

    const cargarDatos = async () => {
      try {
        setCargando(true);

        const [empleadosResponse, asignadosResponse] = await Promise.all([
          axios.get(
            `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/empleados`,
            {
              params: {
                empresa: idEmpresa,
                page: 1,
                limit: 500,
                estado: "Activo",
              },
            },
          ),

          axios.get(
            `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/turnos/${turno.id_turno}/empleados`,
          ),
        ]);

        const listaEmpleados = Array.isArray(empleadosResponse.data?.data)
          ? empleadosResponse.data.data
          : [];

        const listaAsignados = Array.isArray(asignadosResponse.data?.empleados)
          ? asignadosResponse.data.empleados
          : [];

        const idsAsignados = listaAsignados.map((empleado) =>
          Number(empleado.id_empleado),
        );

        setEmpleados(listaEmpleados);
        setAsignadosOriginales(idsAsignados);
        setSeleccionados(idsAsignados);
      } catch (err) {
        console.error("Error al cargar empleados del turno:", err);

        setError(
          err?.response?.data?.error ||
            err?.response?.data?.mensaje ||
            "No se pudieron cargar los empleados.",
        );
      } finally {
        setCargando(false);
      }
    };

    cargarDatos();
  }, [open, turno, idEmpresa]);

  const empleadosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) return empleados;

    return empleados.filter((empleado) => {
      const nombreCompleto = [
        empleado.nombre,
        empleado.apellido_paterno,
        empleado.apellido_materno,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const correo = String(empleado.correo || "").toLowerCase();

      return nombreCompleto.includes(texto) || correo.includes(texto);
    });
  }, [empleados, busqueda]);

  const toggleEmpleado = (idEmpleado) => {
    const id = Number(idEmpleado);

    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const seleccionarTodosVisibles = () => {
    const idsVisibles = empleadosFiltrados.map((empleado) =>
      Number(empleado.id_empleado),
    );

    setSeleccionados((prev) => [...new Set([...prev, ...idsVisibles])]);
  };

  const limpiarSeleccion = () => {
    setSeleccionados([]);
  };

  const guardar = async () => {
    if (!turno?.id_turno) return;

    try {
      setGuardando(true);
      setError("");

      const idsQuitados = asignadosOriginales.filter(
        (id) => !seleccionados.includes(id),
      );

      if (idsQuitados.length > 0) {
        await Promise.all(
          idsQuitados.map((idEmpleado) =>
            axios.delete(
              `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/empleados/${idEmpleado}/turno`,
            ),
          ),
        );
      }

      const idsNuevos = seleccionados.filter(
        (id) => !asignadosOriginales.includes(id),
      );

      if (idsNuevos.length > 0) {
        await axios.post(
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/turnos/${turno.id_turno}/asignar`,
          {
            ids_empleados: idsNuevos,
          },
        );
      }

      enqueueSnackbar(
        `Asignación del turno ${turno?.nombre} actualizada correctamente`,
        {
          variant: "success",
        },
      );

      await onSaved?.();

      onOpenChange(false);
    } catch (err) {
      console.error("Error al asignar empleados:", err);

      setError(
        err?.response?.data?.error ||
          err?.response?.data?.mensaje ||
          "No se pudieron guardar las asignaciones.",
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-[650px]">
        <DialogHeader className="shrink-0">
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50">
            <UserRoundPlus className="h-5 w-5 text-indigo-600" />
          </div>

          <DialogTitle>Asignar empleados</DialogTitle>

          <DialogDescription className="text-left">
            Selecciona los empleados que pertenecerán al turno{" "}
            <strong>{turno?.nombre}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

            <Input
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar por nombre o correo..."
              className="pl-9"
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {seleccionados.length} empleado(s) seleccionado(s)
            </p>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={seleccionarTodosVisibles}
              >
                Seleccionar visibles
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={limpiarSeleccion}
              >
                Limpiar
              </Button>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {cargando ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            </div>
          ) : empleadosFiltrados.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-gray-500">
              <UsersRound className="mb-2 h-7 w-7 text-gray-300" />
              <p className="text-sm">No se encontraron empleados.</p>
            </div>
          ) : (
            <div className="space-y-2 py-2">
              {empleadosFiltrados.map((empleado) => {
                const idEmpleado = Number(empleado.id_empleado);
                const seleccionado = seleccionados.includes(idEmpleado);

                const nombreCompleto = [
                  empleado.nombre,
                  empleado.apellido_paterno,
                  empleado.apellido_materno,
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <label
                    key={idEmpleado}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                      seleccionado
                        ? "border-indigo-200 bg-indigo-50"
                        : "border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={seleccionado}
                      onChange={() => toggleEmpleado(idEmpleado)}
                      className="h-4 w-4"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {nombreCompleto || `Empleado #${idEmpleado}`}
                      </p>

                      <p className="truncate text-xs text-gray-500">
                        {empleado.correo || "Sin correo"}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {error && (
          <div className="shrink-0 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <DialogFooter className="shrink-0 border-t bg-white pt-4">
          <Button
            type="button"
            variant="outline"
            disabled={guardando}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>

          <Button
            type="button"
            disabled={guardando || cargando}
            onClick={guardar}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}

            {guardando ? "Guardando..." : "Guardar asignación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
