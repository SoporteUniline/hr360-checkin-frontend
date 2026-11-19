"use client";

// Alerta «No marcó salida a comer» + botón para agregar la comida (pedido del 19/11/2026).
// Parte el tramo en dos en el backend (POST /checador/asistencias/:id/comida); la checada
// real del reloj se conserva y el registro queda «Editado».

import { useState } from "react";
import { mutate as recargar } from "swr";
import { useSnackbar } from "notistack";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import axios from "@/lib/axios";
import { horaAMinutos } from "@/lib/asistencia/jornada.mjs";

const detener = (e) => e.stopPropagation();
const hhmm = (min) => `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

// Por defecto la comida de su horario; si no tiene, 30 min a las 13:00.
function comidaSugerida(registro) {
  const sale = horaAMinutos(registro.hora_salida_comida_programada);
  const regresa = horaAMinutos(registro.hora_regreso_comida_programada);
  if (sale != null && regresa != null && regresa > sale) return [hhmm(sale), hhmm(regresa)];
  return ["13:00", "13:30"];
}

// variante "alerta" (tabla: chip amarillo) o "boton" (ventana de la fila: botón normal).
export default function BotonAgregarComida({ registro, aBaseDeDatos, fechaBase, onGuardado, readOnly, variante = "alerta" }) {
  const { enqueueSnackbar } = useSnackbar();
  const [abierto, setAbierto] = useState(false);
  const [sugerida] = useState(() => comidaSugerida(registro));
  const [salida, setSalida] = useState(sugerida[0]);
  const [regreso, setRegreso] = useState(sugerida[1]);
  const [guardando, setGuardando] = useState(false);

  const etiqueta = (
    <span className="inline-flex items-center gap-1">⚠ No marcó salida a comer</span>
  );
  const clases = "mt-1 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800";
  if (readOnly) {
    return <span className={clases} title="Su horario tiene comida, pero solo checó entrada y salida: no se le descontó nada.">{etiqueta}</span>;
  }

  const guardar = async () => {
    if (!salida || !regreso || regreso <= salida) {
      enqueueSnackbar("El regreso de comida debe ser después de la salida a comer.", { variant: "warning" });
      return;
    }
    setGuardando(true);
    try {
      await axios.post(`/checador/asistencias/${registro.id}/comida`, {
        salida_comida: aBaseDeDatos(fechaBase, salida),
        regreso_comida: aBaseDeDatos(fechaBase, regreso),
      });
      enqueueSnackbar(`Comida agregada: ${salida}–${regreso}. Su checada original se conserva.`, { variant: "success" });
      setAbierto(false);
      // (19/11/2026) Refresca también las «Checadas del reloj» de la ventana: antes había que cerrar y abrir.
      await Promise.all([
        onGuardado?.(),
        recargar((clave) => typeof clave === "string" && clave.includes("/checador/reloj/asistencia-por-empleado")),
      ]);
    } catch (error) {
      enqueueSnackbar(error?.response?.data?.message || "No se pudo agregar la comida.", { variant: "error" });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        {variante === "boton" ? (
          <button type="button" data-no-row-click onClick={detener}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100">
            + Agregar comida
          </button>
        ) : (
          <button type="button" data-no-row-click onClick={detener} className={`${clases} hover:bg-amber-100`} title="Agregar la comida que no marcó">
            {etiqueta}
            <span className="ml-1 rounded-full bg-amber-600 px-1.5 text-[10px] text-white">Agregar comida</span>
          </button>
        )}
      </PopoverTrigger>
      {/* (19/11/2026) Dentro de la ventana de edición «Guardar comida» no hacía nada: la ventana pone
          pointer-events:none fuera de ella. Arreglado en ui/popover (pointer-events-auto) + z-[60]. */}
      <PopoverContent className="z-[60] w-72 border border-slate-200 bg-white p-4 shadow-xl" data-no-row-click onClick={detener}>
        <p className="text-sm font-semibold text-slate-900">Agregar comida · {registro.nombre} {registro.apellido_paterno}</p>
        <p className="mt-0.5 text-xs text-slate-500">Su día queda en dos tramos; el tiempo de comida no se paga.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-xs font-semibold text-slate-500">
            Salió a comer
            <input type="time" aria-label="Salió a comer" value={salida} onChange={(e) => setSalida(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-800" />
          </label>
          <label className="text-xs font-semibold text-slate-500">
            Regresó
            <input type="time" aria-label="Regresó de comer" value={regreso} onChange={(e) => setRegreso(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-800" />
          </label>
        </div>
        <p className="mt-2 text-[11px] text-slate-400">La checada del reloj se conserva y el registro queda «Editado».</p>
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={() => setAbierto(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">
            Cancelar
          </button>
          <button type="button" disabled={guardando} onClick={guardar}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            {guardando ? "Guardando…" : "Guardar comida"}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
