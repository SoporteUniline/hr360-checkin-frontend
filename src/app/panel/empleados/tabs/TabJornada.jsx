"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  const { dataUser } = useAuth();
  const [diasSeleccionados, setDiasSeleccionados] = useState([]);
  const [entradaComun, setEntradaComun] = useState("");
  const [salidaComun, setSalidaComun] = useState("");
  const [salidaComidaComun, setSalidaComidaComun] = useState("");
  const [regresoComidaComun, setRegresoComidaComun] = useState("");
  const [areas, setAreas] = useState([]);
  const [areasAsignadas, setAreasAsignadas] = useState([]);

  const horarios = form.watch("horarios") || [];
  const usarReloj = form.watch("usar_reloj_checador");
  const { errors, isSubmitted } = form.formState;

  useEffect(() => {
    if (!usarReloj) return;
    const fetchAreas = async () => {
      try {
        const { data } = await axios.get(
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/area_check2`,
          {
            params: {
              id_empresa: dataUser?.id_empresa,
            },
          }
        );
        setAreas(data.data);
      } catch (error) {
        console.error("Error al obtener áreas:", error);
      }
    };
    fetchAreas();
  }, [usarReloj]);

  useEffect(() => {
    if (!usarReloj || !empleadoId) return;
    const fetchAsignadas = async () => {
      try {
        const { data } = await axios.get(
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/empleados/area_check/${empleadoId}/areas`
        );
        setAreasAsignadas(data.map((a) => a.id_area));
      } catch (error) {
        console.error("Error al obtener áreas del empleado", error);
      }
    };

    fetchAsignadas();
  }, [empleadoId, usarReloj]);

  const toggleArea = async (id_area, checked) => {
    try {
      if (checked) {
        await axios.post(
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/empleados/area_check/${empleadoId}/asignar-area`,
          {
            areas: [id_area],
          }
        );

        setAreasAsignadas((prev) => [...prev, id_area]);
      } else {
        await axios.delete(
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/empleados/area_check/${empleadoId}/quitar-area/${id_area}`
        );
        setAreasAsignadas((prev) => prev.filter((id) => id !== id_area));
      }
    } catch (error) {
      console.error("Error al modificar área:", error);
    }
  };

  function calcularHoras(inicio, fin) {
    if (!inicio || !fin) return 0;

    const [hi, mi] = inicio.split(":").map(Number);
    const [hf, mf] = fin.split(":").map(Number);

    const start = hi * 60 + mi;
    const end = hf * 60 + mf;

    const diff = end - start;
    return diff > 0 ? +(diff / 60).toFixed(2) : 0;
  }

  // Rellenar los días que falten
  useEffect(() => {
    if (horarios.length < 7) {
      const nuevos = DIAS_SEMANA.map((dia) => {
        const existente = horarios.find((h) => h.dia === dia);
        return (
          existente || {
            dia,
            entrada: "",
            salida_comida: "",
            regreso_comida: "",
            salida: "",
          }
        );
      });
      form.setValue("horarios", nuevos, { shouldValidate: true });
    }
  }, []);

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

    form.setValue("hrs_por_dia", promedioHoras, { shouldValidate: true });
    form.setValue("hrs_de_comida", promedioComidas, { shouldValidate: true });
  }, [horarios, form]);

  const toggleDiaSeleccionado = (dia) => {
    setDiasSeleccionados((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia]
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
      h.dia === dia ? { ...h, [campo]: valor } : h
    );
    form.setValue("horarios", actualizados, { shouldValidate: true });
  };

  return (
    <section className="space-y-6 px-4 py-2">
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
            {horarios.map((h) => (
              <tr key={h.dia} className="border-t">
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
                      actualizarHorario(h.dia, "salida_comida", e.target.value)
                    }
                    disabled={soloLectura}
                  />
                </td>
                <td className="p-2">
                  <Input
                    type="time"
                    value={h.regreso_comida || ""}
                    onChange={(e) =>
                      actualizarHorario(h.dia, "regreso_comida", e.target.value)
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
        {" "}
        {[
          { name: "hrs_por_dia", label: "Horas laborales por día" },
          { name: "hrs_de_comida", label: "Horas de comida por día" },
        ].map(({ name, label }) => (
          <FormField
            key={name}
            name={name}
            control={form.control}
            render={({ field }) => (
              <FormItem>
                {" "}
                <FormLabel className="text-base font-medium">
                  {label}
                </FormLabel>{" "}
                <div className="px-3 py-2 bg-gray-100 border rounded text-sm text-gray-700">
                  {" "}
                  {field.value ?? "0.00"} hrs{" "}
                </div>{" "}
              </FormItem>
            )}
          />
        ))}{" "}
      </div>
      {/* 🔹 Áreas permitidas (solo si usar_reloj_checador = true) */}
      {usarReloj && (
        <div className="border rounded-xl p-4 bg-slate-50 shadow-sm">
          <FormLabel className="text-base font-semibold block mb-3">
            Áreas donde el empleado puede checar
          </FormLabel>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {areas.map((area) => {
              const asignada = areasAsignadas.includes(area.id_area);
              return (
                <div
                  key={area.id_area}
                  className={`border rounded-lg p-3 flex items-center justify-between ${
                    asignada
                      ? "bg-blue-50 border-blue-300"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <div>
                    <p className="font-medium">{area.nombre_area}</p>
                    <p className="text-xs text-gray-500">
                      {area.latitud}, {area.longitud}
                    </p>
                  </div>
                  {!soloLectura && (
                    <Checkbox
                      checked={asignada}
                      onCheckedChange={(checked) =>
                        toggleArea(area.id_area, checked)
                      }
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
