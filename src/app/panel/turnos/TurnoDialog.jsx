"use client";

import { useEffect, useState } from "react";
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
import { Loader2, CalendarClock } from "lucide-react";

const DIAS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

const DIAS_LUNES_VIERNES = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
];

const horarioVacio = () =>
  DIAS.map((dia) => ({
    dia,
    activo: false,
    entrada: "",
    salida_comida: "",
    regreso_comida: "",
    salida: "",
  }));

const horarioRapidoVacio = () => ({
  entrada: "",
  salida_comida: "",
  regreso_comida: "",
  salida: "",
});

export default function TurnoDialog({
  open,
  onOpenChange,
  idEmpresa,
  turno = null,
  onSaved,
}) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [dias, setDias] = useState(horarioVacio);

  const [diasRapidos, setDiasRapidos] = useState(DIAS_LUNES_VIERNES);
  const [horarioRapido, setHorarioRapido] = useState(horarioRapidoVacio);

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const esEdicion = Boolean(turno?.id_turno);

  useEffect(() => {
    if (!open) return;

    setDiasRapidos(DIAS_LUNES_VIERNES);
    setHorarioRapido(horarioRapidoVacio());
    setError("");

    if (!turno) {
      setNombre("");
      setDescripcion("");
      setDias(horarioVacio());
      return;
    }

    setNombre(turno.nombre || "");
    setDescripcion(turno.descripcion || "");

    const diasTurno = Array.isArray(turno.dias) ? turno.dias : [];

    setDias(
      DIAS.map((dia) => {
        const existente = diasTurno.find((item) => item.dia === dia);

        return {
          dia,
          activo: Boolean(existente),
          entrada: existente?.entrada?.slice(0, 5) || "",
          salida_comida: existente?.salida_comida?.slice(0, 5) || "",
          regreso_comida: existente?.regreso_comida?.slice(0, 5) || "",
          salida: existente?.salida?.slice(0, 5) || "",
        };
      }),
    );
  }, [open, turno]);

  const actualizarDia = (index, campo, valor) => {
    setDias((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [campo]: valor,
            }
          : item,
      ),
    );
  };

  const toggleDiaRapido = (dia) => {
    setDiasRapidos((prev) =>
      prev.includes(dia) ? prev.filter((item) => item !== dia) : [...prev, dia],
    );
  };

  const seleccionarDiasRapidos = (tipo) => {
    if (tipo === "lunes-viernes") {
      setDiasRapidos(DIAS_LUNES_VIERNES);
      return;
    }

    if (tipo === "lunes-sabado") {
      setDiasRapidos([
        "Lunes",
        "Martes",
        "Miércoles",
        "Jueves",
        "Viernes",
        "Sábado",
      ]);
      return;
    }

    if (tipo === "todos") {
      setDiasRapidos(DIAS);
      return;
    }

    setDiasRapidos([]);
  };

  const actualizarHorarioRapido = (campo, valor) => {
    setHorarioRapido((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const aplicarHorarioRapido = () => {
    if (diasRapidos.length === 0) {
      setError("Selecciona al menos un día para aplicar el horario.");
      return;
    }

    if (!horarioRapido.entrada || !horarioRapido.salida) {
      setError("Captura al menos la hora de entrada y salida.");
      return;
    }

    setError("");

    setDias((prev) =>
      prev.map((item) => {
        if (!diasRapidos.includes(item.dia)) {
          return item;
        }

        return {
          ...item,
          activo: true,
          entrada: horarioRapido.entrada,
          salida_comida: horarioRapido.salida_comida,
          regreso_comida: horarioRapido.regreso_comida,
          salida: horarioRapido.salida,
        };
      }),
    );
  };

  const guardar = async () => {
    if (!nombre.trim()) {
      setError("El nombre del turno es obligatorio.");
      return;
    }

    if (!idEmpresa) {
      setError("Selecciona una empresa.");
      return;
    }

    const diasActivos = dias
      .filter((item) => item.activo)
      .map(({ dia, entrada, salida_comida, regreso_comida, salida }) => ({
        dia,
        entrada: entrada || null,
        salida_comida: salida_comida || null,
        regreso_comida: regreso_comida || null,
        salida: salida || null,
      }));

    if (diasActivos.length === 0) {
      setError("Activa al menos un día para el turno.");
      return;
    }

    const diaSinHorario = diasActivos.find(
      (dia) => !dia.entrada || !dia.salida,
    );

    if (diaSinHorario) {
      setError(
        `${diaSinHorario.dia} debe tener al menos hora de entrada y salida.`,
      );
      return;
    }

    try {
      setGuardando(true);
      setError("");

      const payload = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        id_empresa: Number(idEmpresa),
        dias: diasActivos,
      };

      if (esEdicion) {
        await axios.put(
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/turnos/${turno.id_turno}`,
          payload,
        );
      } else {
        await axios.post(
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/turnos`,
          payload,
        );
      }

      await onSaved?.();
      onOpenChange(false);
    } catch (err) {
      let mensaje = "No se pudo guardar el turno.";

      if (err?.response?.status === 409) {
        mensaje =
          "Ya existe un turno con ese nombre en esta empresa. Usa otro nombre.";
      } else {
        mensaje =
          err?.response?.data?.error ||
          err?.response?.data?.mensaje ||
          err?.message ||
          mensaje;
      }

      setError(mensaje);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-[900px]">
        <DialogHeader className="shrink-0">
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50">
            <CalendarClock className="h-5 w-5 text-indigo-600" />
          </div>

          <DialogTitle>
            {esEdicion ? "Editar turno" : "Nuevo turno"}
          </DialogTitle>

          <DialogDescription className="text-left">
            Configura los días y horarios laborales de este turno.
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Nombre *
              </label>

              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Matutino"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Descripción
              </label>

              <Input
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej. Turno de oficina"
              />
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-2">
          <div className="space-y-4 py-3">
            <div>
              <h3 className="font-semibold text-gray-900">Horario semanal</h3>

              <p className="text-sm text-gray-500">
                Puedes aplicar un mismo horario a varios días y después ajustar
                cada día individualmente.
              </p>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
              <div className="mb-3">
                <p className="text-sm font-semibold text-gray-900">
                  Aplicar horario a varios días
                </p>

                <p className="text-xs text-gray-500">
                  Selecciona los días, captura el horario una vez y aplícalo.
                </p>
              </div>

              <div className="mb-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => seleccionarDiasRapidos("lunes-viernes")}
                >
                  Lun–Vie
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => seleccionarDiasRapidos("lunes-sabado")}
                >
                  Lun–Sáb
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => seleccionarDiasRapidos("todos")}
                >
                  Todos
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => seleccionarDiasRapidos("ninguno")}
                >
                  Limpiar
                </Button>
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                {DIAS.map((dia) => {
                  const seleccionado = diasRapidos.includes(dia);

                  return (
                    <button
                      key={dia}
                      type="button"
                      onClick={() => toggleDiaRapido(dia)}
                      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                        seleccionado
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {dia.slice(0, 3)}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">
                    Entrada
                  </label>

                  <Input
                    type="time"
                    value={horarioRapido.entrada}
                    onChange={(e) =>
                      actualizarHorarioRapido("entrada", e.target.value)
                    }
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-gray-500">
                    Salida comida
                  </label>

                  <Input
                    type="time"
                    value={horarioRapido.salida_comida}
                    onChange={(e) =>
                      actualizarHorarioRapido("salida_comida", e.target.value)
                    }
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-gray-500">
                    Regreso comida
                  </label>

                  <Input
                    type="time"
                    value={horarioRapido.regreso_comida}
                    onChange={(e) =>
                      actualizarHorarioRapido("regreso_comida", e.target.value)
                    }
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-gray-500">
                    Salida
                  </label>

                  <Input
                    type="time"
                    value={horarioRapido.salida}
                    onChange={(e) =>
                      actualizarHorarioRapido("salida", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="mt-3 flex justify-end">
                <Button
                  type="button"
                  onClick={aplicarHorarioRapido}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  Aplicar horario
                </Button>
              </div>
            </div>

            <div>
              <div className="mb-2">
                <p className="text-sm font-semibold text-gray-900">
                  Horario por día
                </p>

                <p className="text-xs text-gray-500">
                  Ajusta individualmente cualquier excepción del horario.
                </p>
              </div>

              <div className="space-y-2">
                {dias.map((item, index) => (
                  <div
                    key={item.dia}
                    className="rounded-lg border border-gray-200 p-3"
                  >
                    <div
                      className={`flex items-center gap-3 ${
                        item.activo ? "mb-3" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={item.activo}
                        onChange={(e) =>
                          actualizarDia(index, "activo", e.target.checked)
                        }
                        className="h-4 w-4"
                      />

                      <span className="font-medium text-gray-900">
                        {item.dia}
                      </span>
                    </div>

                    {item.activo && (
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <div>
                          <label className="mb-1 block text-xs text-gray-500">
                            Entrada
                          </label>

                          <Input
                            type="time"
                            value={item.entrada}
                            onChange={(e) =>
                              actualizarDia(index, "entrada", e.target.value)
                            }
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs text-gray-500">
                            Salida comida
                          </label>

                          <Input
                            type="time"
                            value={item.salida_comida}
                            onChange={(e) =>
                              actualizarDia(
                                index,
                                "salida_comida",
                                e.target.value,
                              )
                            }
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs text-gray-500">
                            Regreso comida
                          </label>

                          <Input
                            type="time"
                            value={item.regreso_comida}
                            onChange={(e) =>
                              actualizarDia(
                                index,
                                "regreso_comida",
                                e.target.value,
                              )
                            }
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs text-gray-500">
                            Salida
                          </label>

                          <Input
                            type="time"
                            value={item.salida}
                            onChange={(e) =>
                              actualizarDia(index, "salida", e.target.value)
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
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
            onClick={() => onOpenChange(false)}
            disabled={guardando}
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={guardar}
            disabled={guardando}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}

            {guardando
              ? "Guardando..."
              : esEdicion
              ? "Guardar cambios"
              : "Crear turno"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
