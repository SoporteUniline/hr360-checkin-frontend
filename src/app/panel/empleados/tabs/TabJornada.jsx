"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/context/AuthContext";

const DIAS_SEMANA = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

export default function TabJornada({ form, soloLectura, empleadoId }) {
  const [diasSeleccionados, setDiasSeleccionados] = useState([]);
  const [entradaComun, setEntradaComun] = useState("");
  const [salidaComun, setSalidaComun] = useState("");
  const [salidaComidaComun, setSalidaComidaComun] = useState("");
  const [regresoComidaComun, setRegresoComidaComun] = useState("");
  const [hrsSemana, setHrsSemana] = useState(0);

  const horarios = form.watch("horarios") || [];
  const { errors, isSubmitted } = form.formState;

  // function calcularHoras(inicio, fin) {
  //   if (!inicio || !fin) return 0;

  //   const [hi, mi] = inicio.split(":").map(Number);
  //   const [hf, mf] = fin.split(":").map(Number);

  //   const start = hi * 60 + mi;
  //   const end = hf * 60 + mf;

  //   const diff = end - start;
  //   return diff > 0 ? +(diff / 60).toFixed(2) : 0;
  // }

  function calcularHoras(inicio, fin) {
    if (!inicio || !fin) return 0;

    const [hi, mi] = inicio.split(":").map(Number);
    const [hf, mf] = fin.split(":").map(Number);

    let start = hi * 60 + mi;
    let end = hf * 60 + mf;

    if (end < start) {
      end += 24 * 60;
    }

    const diff = end - start;
    return +(diff / 60).toFixed(2);
  }

  useEffect(() => {
    let totalHoras = 0;
    let totalComidas = 0;

    for (const h of horarios) {
      const entrada = h.entrada;
      const salida = h.salida;
      const salidaComida = h.salida_comida;
      const regresoComida = h.regreso_comida;

      const horasComida = calcularHoras(salidaComida, regresoComida);
      const horasTotales = calcularHoras(entrada, salida) - horasComida;

      if (!isNaN(horasTotales)) totalHoras += horasTotales;
      if (!isNaN(horasComida)) totalComidas += horasComida;
    }

    // Calculamos promedio
    const diasValidos = horarios.filter((h) => h.entrada && h.salida).length;
    const promedioHoras = diasValidos
      ? +(totalHoras / diasValidos).toFixed(2)
      : 0;
    const promedioComidas = diasValidos
      ? +(totalComidas / diasValidos).toFixed(2)
      : 0;

    setHrsSemana(+totalHoras.toFixed(2));

    form.setValue("hrs_por_dia", promedioHoras, { shouldValidate: true });
    form.setValue("hrs_de_comida", promedioComidas, { shouldValidate: true });
  }, [horarios, form]);

  const toggleDiaSeleccionado = (dia) => {
    setDiasSeleccionados((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia],
    );
  };

  const aplicarHorarioComun = () => {
    const actualizados = horarios.map((h) => {
      if (diasSeleccionados.includes(h.dia)) {
        return {
          ...h,
          entrada: entradaComun,
          salida_comida: salidaComidaComun,
          regreso_comida: regresoComidaComun,
          salida: salidaComun,
        };
      }
      return h;
    });

    // Actualiza los horarios en el formulario
    form.setValue("horarios", actualizados, { shouldValidate: true });

    // 🔄 Limpiar campos comunes
    setEntradaComun("");
    setSalidaComun("");
    setSalidaComidaComun("");
    setRegresoComidaComun("");

    // 🔄 Limpiar días seleccionados
    setDiasSeleccionados([]);
  };

  const actualizarHorario = (dia, campo, valor) => {
    const actualizados = horarios.map((h) =>
      h.dia === dia ? { ...h, [campo]: valor } : h,
    );
    form.setValue("horarios", actualizados, { shouldValidate: true });
  };

  return (
    <section className="space-y-6">
      {/* Header de la sección */}
      <div className="bg-gradient-to-br from-orange-50 via-white to-orange-50 border-2 border-orange-100 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-3 rounded-lg shadow-md">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Jornada laboral</h3>
            <p className="text-sm text-gray-600">
              Define los horarios de trabajo semanales
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <FormField
            name="autoriza_horas_extra"
            control={form.control}
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    Autorizar horas extra (reporte)
                  </FormLabel>
                  <div className="text-sm text-muted-foreground">
                    Si está activo, este empleado acumula horas extra en el
                    reporte de horas trabajadas.
                  </div>
                </div>
                <FormControl>
                  <Switch
                    disabled={soloLectura}
                    checked={!!field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {isSubmitted && errors.horarios && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm font-medium">
                ❌ {errors.horarios.message}
              </p>
            </div>
          )}
          {/* Asignación rápida */}
          <div className="border rounded-xl p-4 bg-slate-50 shadow-sm space-y-4">
            <FormLabel className="text-base font-semibold block mb-1">
              Asignar horario a varios días
            </FormLabel>

            {/* Días seleccionables */}
            <div className="flex flex-wrap gap-3">
              {DIAS_SEMANA.map((dia) => (
                <label
                  key={dia}
                  className={`cursor-pointer px-3 py-1 border rounded-full text-sm transition ${
                    diasSeleccionados.includes(dia)
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <input
                    type="checkbox"
                    value={dia}
                    checked={diasSeleccionados.includes(dia)}
                    onChange={() => toggleDiaSeleccionado(dia)}
                    disabled={soloLectura}
                    className="hidden"
                  />
                  {dia.slice(0, 3)}
                </label>
              ))}
            </div>

            {/* Inputs de horario común */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <FormLabel className="text-sm text-gray-600">Entrada</FormLabel>
                <Input
                  type="time"
                  value={entradaComun}
                  onChange={(e) => setEntradaComun(e.target.value)}
                  disabled={soloLectura}
                />
              </div>
              <div>
                <FormLabel className="text-sm text-gray-600">
                  Salida comida
                </FormLabel>
                <Input
                  type="time"
                  value={salidaComidaComun}
                  onChange={(e) => setSalidaComidaComun(e.target.value)}
                  disabled={soloLectura}
                />
              </div>
              <div>
                <FormLabel className="text-sm text-gray-600">
                  Regreso comida
                </FormLabel>
                <Input
                  type="time"
                  value={regresoComidaComun}
                  onChange={(e) => setRegresoComidaComun(e.target.value)}
                  disabled={soloLectura}
                />
              </div>
              <div>
                <FormLabel className="text-sm text-gray-600">Salida</FormLabel>
                <Input
                  type="time"
                  value={salidaComun}
                  onChange={(e) => setSalidaComun(e.target.value)}
                  disabled={soloLectura}
                />
              </div>
            </div>

            {/* Botón aplicar */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={aplicarHorarioComun}
                className="px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium shadow disabled:opacity-50"
                disabled={soloLectura || diasSeleccionados.length === 0}
              >
                Aplicar horario a días seleccionados
              </button>
            </div>
          </div>

          <FormLabel className="text-base font-medium mb-2 block">
            Horarios por día
          </FormLabel>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-300 rounded min-w-[600px]">
              <thead className="bg-slate-100 text-left">
                <tr>
                  <th className="p-2">Día</th>
                  <th className="p-2">Entrada</th>
                  <th className="p-2">Salida comida</th>
                  <th className="p-2">Regreso comida</th>
                  <th className="p-2">Salida</th>
                </tr>
              </thead>
              <tbody>
                {horarios.map((h, index) => (
                  <tr key={`${h.dia}-${index}`} className="border-t">
                    <td className="p-2 font-medium">{h.dia}</td>
                    <td className="p-2">
                      <Input
                        type="time"
                        value={h.entrada || ""}
                        onChange={(e) =>
                          actualizarHorario(h.dia, "entrada", e.target.value)
                        }
                        disabled={soloLectura}
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="time"
                        value={h.salida_comida || ""}
                        onChange={(e) =>
                          actualizarHorario(
                            h.dia,
                            "salida_comida",
                            e.target.value,
                          )
                        }
                        disabled={soloLectura}
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="time"
                        value={h.regreso_comida || ""}
                        onChange={(e) =>
                          actualizarHorario(
                            h.dia,
                            "regreso_comida",
                            e.target.value,
                          )
                        }
                        disabled={soloLectura}
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="time"
                        value={h.salida || ""}
                        onChange={(e) =>
                          actualizarHorario(h.dia, "salida", e.target.value)
                        }
                        disabled={soloLectura}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Resumen de horas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <FormField
              name="hrs_por_dia"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">
                    Promedio de horas por día
                  </FormLabel>
                  <div className="px-4 py-3 bg-blue-50 border-2 border-blue-200 rounded-lg text-lg font-bold text-blue-700">
                    {field.value ?? "0.00"} hrs
                  </div>
                </FormItem>
              )}
            />
            <FormField
              name="hrs_de_comida"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">
                    Horas de comida por día
                  </FormLabel>
                  <div className="px-4 py-3 bg-purple-50 border-2 border-purple-200 rounded-lg text-lg font-bold text-purple-700">
                    {field.value ?? "0.00"} hrs
                  </div>
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel className="text-sm font-medium text-gray-700">
                Horas totales por semana
              </FormLabel>
              <div className="px-4 py-3 bg-green-50 border-2 border-green-200 rounded-lg text-lg font-bold text-green-700">
                {hrsSemana} hrs
              </div>
            </FormItem>
          </div>
        </div>
      </div>
    </section>
  );
}
