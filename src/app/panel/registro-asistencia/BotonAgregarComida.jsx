"use client";

// Alerta «No marcó salida a comer» + agregar la comida: el backend parte el tramo en dos
// (POST /checador/asistencias/:id/comida), conserva la checada real y el registro queda «Editado».
// La comida queda guardada como comida manual: con `comida` (la manual del día) el mismo formulario cambia sus horas
// (PUT …/comida/:idMovimiento) y QuitarComida la quita (DELETE), que regresa el tramo como estaba.

import { useState } from "react";
import { mutate as recargar } from "swr";
import { useSnackbar } from "notistack";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import axios from "@/lib/axios";
import { horaAMinutos, minutosAHora } from "@/lib/fechaHora.mjs";

const detener = (e) => e.stopPropagation();

// Por defecto la comida de su horario; si no tiene, 30 min a las 13:00.
function comidaSugerida(registro) {
  const sale = horaAMinutos(registro.hora_salida_comida_programada);
  const regresa = horaAMinutos(registro.hora_regreso_comida_programada);
  if (sale != null && regresa != null && regresa > sale) return [minutosAHora(sale), minutosAHora(regresa)];
  return ["13:00", "13:30"];
}

// Refresca la lista y las «Checadas del reloj» de la ventana abierta.
const refrescar = (onGuardado) => Promise.all([
  onGuardado?.(),
  recargar((clave) => typeof clave === "string" && clave.includes("/checador/reloj/asistencia-por-empleado")),
]);

// variante "alerta" (tabla: chip amarillo), "boton" (ventana de la fila) o "editar" (comida manual: con `comida`
// = { id_movimiento, salida, regreso } y `horaLocal` para mostrar sus horas en la zona de la empresa).
export default function BotonAgregarComida({ registro, aBaseDeDatos, fechaBase, onGuardado, readOnly, variante = "alerta", comida, horaLocal }) {
  const { enqueueSnackbar } = useSnackbar();
  const [abierto, setAbierto] = useState(false);
  const editar = variante === "editar" && comida?.id_movimiento;
  const [sugerida] = useState(() => (editar && horaLocal ? [horaLocal(comida.salida), horaLocal(comida.regreso)] : comidaSugerida(registro)));
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
      const cuerpo = { salida_comida: aBaseDeDatos(fechaBase, salida), regreso_comida: aBaseDeDatos(fechaBase, regreso) };
      if (editar) await axios.put(`/checador/asistencias/${registro.id}/comida/${comida.id_movimiento}`, cuerpo);
      else await axios.post(`/checador/asistencias/${registro.id}/comida`, cuerpo);
      enqueueSnackbar(editar ? `Comida cambiada: ${salida}–${regreso}.` : `Comida agregada: ${salida}–${regreso}. Su checada original se conserva.`,
        { variant: "success" });
      setAbierto(false);
      await refrescar(onGuardado);
    } catch (error) {
      enqueueSnackbar(error?.response?.data?.message || "No se pudo agregar la comida.", { variant: "error" });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        {editar ? (
          <button type="button" data-no-row-click onClick={detener}
            className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100">
            Editar
          </button>
        ) : variante === "boton" ? (
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
      {/* Dentro de la ventana de edición «Guardar comida» no hacía nada: la ventana pone
          pointer-events:none fuera de ella. Arreglado en ui/popover (pointer-events-auto) + z-[60]. */}
      <PopoverContent className="z-[60] w-72 border border-slate-200 bg-white p-4 shadow-xl" data-no-row-click onClick={detener}>
        <p className="text-sm font-semibold text-slate-900">{editar ? "Editar comida" : "Agregar comida"} · {registro.nombre} {registro.apellido_paterno}</p>
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
            {guardando ? "Guardando…" : editar ? "Guardar cambios" : "Guardar comida"}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Quitar la comida manual: el tramo vuelve a quedar como lo checó el reloj. Pide confirmar.
export function QuitarComida({ registro, comida, onGuardado }) {
  const { enqueueSnackbar } = useSnackbar();
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const quitar = async () => {
    setGuardando(true);
    try {
      await axios.delete(`/checador/asistencias/${registro.id}/comida/${comida.id_movimiento}`);
      enqueueSnackbar("Comida quitada: su día vuelve a como lo checó el reloj.", { variant: "success" });
      setAbierto(false);
      await refrescar(onGuardado);
    } catch (error) {
      enqueueSnackbar(error?.response?.data?.message || "No se pudo quitar la comida.", { variant: "error" });
    } finally {
      setGuardando(false);
    }
  };
  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <button type="button" data-no-row-click onClick={detener}
          className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50">
          Quitar
        </button>
      </PopoverTrigger>
      <PopoverContent className="z-[60] w-64 border border-slate-200 bg-white p-4 shadow-xl" data-no-row-click onClick={detener}>
        <p className="text-sm font-semibold text-slate-900">¿Quitar la comida?</p>
        <p className="mt-1 text-xs text-slate-500">Su día vuelve a quedar como lo checó el reloj. Queda en el historial.</p>
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={() => setAbierto(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold
            text-slate-600">
            Cancelar
          </button>
          <button type="button" disabled={guardando} onClick={quitar}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50">
            {guardando ? "Quitando…" : "Quitar comida"}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
