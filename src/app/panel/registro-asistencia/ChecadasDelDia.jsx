"use client";

// Checadas del reloj de un empleado en un día, con corrección por tramo.
// Lo usan el panel de la fila (PanelEditarAsistencia) y el diálogo de solo lectura.
// La hora original del reloj se ve tachada y la corregida resaltada; nada se borra.

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { Pencil, Save, X } from "lucide-react";
import useClockCheckData from "@/hooks/useRelojChecador";
import useEntradaSalida from "@/hooks/useEntradaSalida";
import { useAuth, useEmpresaTimezone } from "@/context/AuthContext";

dayjs.extend(utc);
dayjs.extend(timezone);

const DB_TIMEZONE = "America/Mexico_City";
const valida = (v) => Boolean(v) && v !== "-";

export default function ChecadasDelDia({ empleado, activo = true, mutateAsistencia, editable = true }) {
  const { dataUser } = useAuth();
  const zona = useEmpresaTimezone(dataUser?.id_empresa);
  const { data, error, isLoading, mutate } = useClockCheckData(
    activo ? dataUser?.id_empresa : null,
    activo ? empleado?.fecha : null,
    activo ? empleado?.id_empleado : null,
    null,
    1,
    10,
    null,
    null,
  );
  const {
    editingMovimientoId,
    isSavingMovimiento,
    editingMovimientoData,
    handleEditMovimientoClick,
    handleSaveMovimientoClick,
    handleCancelMovimientoEdit,
    handleMovimientoFieldChange,
  } = useEntradaSalida(mutate);

  const hora = (v) => (valida(v) ? dayjs.tz(v, DB_TIMEZONE).tz(zona).format("HH:mm") : "");
  const fechaBase = dayjs.tz(empleado?.entrada, DB_TIMEZONE).tz(zona).format("YYYY-MM-DD");
  const aFecha = (h) => (h ? dayjs(`${fechaBase} ${h}`).format("YYYY-MM-DD HH:mm:ss") : null);
  const registros = Array.isArray(data?.registros) ? data.registros : [];

  // Hora original tachada + corregida resaltada (o solo la original).
  const Marca = ({ original, corregida, etiqueta }) => (
    <div className="flex flex-col items-start">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{etiqueta}</span>
      {valida(corregida) ? (
        <span className="tabular-nums">
          {valida(original) && (
            <span className="mr-1 text-slate-400 line-through" title="Hora original del reloj (corregida)">{hora(original)}</span>
          )}
          <span className="rounded-md bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-700">{hora(corregida)}</span>
        </span>
      ) : (
        <span className="font-semibold tabular-nums text-slate-800">{hora(original) || "—"}</span>
      )}
    </div>
  );

  if (isLoading) return <p className="py-3 text-sm text-slate-500">Cargando checadas…</p>;
  if (error) return <p className="py-3 text-sm text-red-600">No se pudieron cargar las checadas: {error.message}</p>;
  if (!registros.length) return <p className="py-3 text-sm text-slate-500">No hay checadas del reloj este día.</p>;

  return (
    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200" aria-label="Checadas del reloj">
      {registros.map((c, i) => {
        const editando = editingMovimientoId === c.id;
        return (
          <li key={c.id ?? i} className="flex items-center gap-3 px-3 py-2.5 text-sm">
            <span className="w-5 text-xs font-semibold text-slate-400">{i + 1}</span>
            {editando ? (
              <>
                <label className="flex flex-col text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Entrada
                  <input type="time" aria-label="Entrada corregida" value={hora(editingMovimientoData.entrada_corregida)}
                    onChange={(e) => handleMovimientoFieldChange("entrada_corregida", aFecha(e.target.value))}
                    className="mt-0.5 rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-800" />
                </label>
                <label className="flex flex-col text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Salida
                  <input type="time" aria-label="Salida corregida" value={hora(editingMovimientoData.salida_corregida)}
                    onChange={(e) => handleMovimientoFieldChange("salida_corregida", aFecha(e.target.value))}
                    className="mt-0.5 rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-800" />
                </label>
                <div className="ml-auto flex gap-1">
                  <button type="button" title="Guardar corrección" aria-label="Guardar corrección" disabled={isSavingMovimiento}
                    onClick={async () => { await handleSaveMovimientoClick(); await mutateAsistencia?.(); }}
                    className="rounded-lg bg-blue-50 p-2 text-blue-600 hover:bg-blue-100 disabled:opacity-50">
                    <Save className="h-4 w-4" />
                  </button>
                  <button type="button" title="Cancelar" aria-label="Cancelar corrección" onClick={handleCancelMovimientoEdit}
                    className="rounded-lg bg-slate-100 p-2 text-slate-600 hover:bg-slate-200">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <Marca etiqueta="Entrada" original={c.entrada} corregida={c.entrada_corregida} />
                <span className="text-slate-300">→</span>
                <Marca etiqueta="Salida" original={c.salida} corregida={c.salida_corregida} />
                <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold ${c.estado === "Abierto" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                  {c.estado}
                </span>
                {editable && (
                  <button type="button" title="Corregir checada" aria-label={`Corregir checada ${i + 1}`}
                    onClick={() => handleEditMovimientoClick(c)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600">
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
