"use client";

// Fila desplegada de «Horas por reponer»: movimientos de su cuenta (cargos +, reposiciones −, cierres) con «Cancelar» en
// cada permiso y «Deshacer» en cada cierre, el saldo, y al lado «Qué hacer con lo que debe».
// Datos: GET /checador/cuenta-horas/:id_empleado (la misma cuenta del Panel empleado).
import useSWR from "swr";
import { fetcherWithToken } from "@/lib/fetcher";
import { formatearMinutos } from "@/lib/asistencia/jornada.mjs";
import { fechaLarga, movimientosFila } from "@/lib/asistencia/horasPorReponer.mjs";

export const urlCuenta = (idEmpleado) => `/checador/cuenta-horas/${idEmpleado}`;

function Movimientos({ cuenta, ocupado, onCancelar, onDeshacer }) {
  const lista = movimientosFila(cuenta);
  return (
    <section className="min-w-0 flex-[2_1_480px] rounded-xl border border-slate-200 bg-white" aria-label="Movimientos de su cuenta">
      <h4 className="border-b border-slate-200 px-4 py-3 text-[12.5px] font-bold tracking-wide text-slate-600">MOVIMIENTOS DE SU CUENTA</h4>
      <ul className="divide-y divide-slate-100 text-sm" data-movimientos>
        {lista.map((m) => (
          <li key={m.clave} data-movimiento={m.clave}
            className={`grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-2.5 sm:grid-cols-[5.5rem_minmax(0,1fr)_5.5rem_6rem] ${m.deshecho ? "opacity-60" : ""}`}>
            <span className="text-[13px] text-slate-500">{fechaLarga(m.fecha, { anio: false })}</span>
            <span className="min-w-0 break-words">
              <span className={m.deshecho ? "line-through" : ""}>{m.texto}</span>
              {m.nota && <span className="block text-xs text-slate-500">{m.nota}</span>}
              {m.nomina && <span className="block text-xs font-medium text-slate-700" data-nomina-cierre={m.cierre?.id}>{m.nomina}</span>}
              {m.deshecho && <span className="block text-xs text-slate-500">Deshecho{m.cierre?.borrado_por_nombre ? ` por ${m.cierre.borrado_por_nombre}` : ""}</span>}
            </span>
            <span className={`text-right font-bold tabular-nums ${m.minutos > 0 ? "text-rose-700" : "text-emerald-700"}`}>
              {m.minutos > 0 ? "+" : "−"}{formatearMinutos(Math.abs(m.minutos))}
            </span>
            <span className="col-span-3 flex justify-end sm:col-span-1">
              {m.accion === "cancelar" && (
                <button type="button" disabled={ocupado} onClick={() => onCancelar(m)} aria-label={`Cancelar permiso del ${fechaLarga(m.fecha)}`}
                  className="min-h-11 rounded-lg px-3 text-[13px] font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50 sm:min-h-9">Cancelar</button>
              )}
              {m.accion === "deshacer" && (
                <button type="button" disabled={ocupado} onClick={() => onDeshacer(m)} aria-label={`Deshacer ${m.texto.toLowerCase()} del ${fechaLarga(m.fecha)}`}
                  className="min-h-11 rounded-lg px-3 text-[13px] font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50 sm:min-h-9">Deshacer</button>
              )}
            </span>
          </li>
        ))}
        <li className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-x-3 border-t border-slate-200 px-4 py-3 sm:grid-cols-[5.5rem_minmax(0,1fr)_5.5rem_6rem]" data-saldo>
          <span className="font-bold text-slate-900">Saldo</span>
          <span />
          <span className={`text-right font-extrabold tabular-nums ${cuenta.debe ? "text-rose-700" : "text-emerald-700"}`}>
            {cuenta.debe ? formatearMinutos(cuenta.debe) : "Al corriente"}
          </span>
        </li>
      </ul>
    </section>
  );
}

export function QueHacer({ onReponer, onRebajar, onCondonar }) {
  const opcion = "flex min-h-11 w-full flex-wrap items-center gap-x-1 rounded-xl border px-3 py-2 text-left text-sm";
  return (
    <section className="flex min-w-0 flex-[1_1_260px] flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4" aria-label="Qué hacer con lo que debe">
      <h4 className="mb-1 text-[12.5px] font-bold tracking-wide text-slate-600">QUÉ HACER CON LO QUE DEBE</h4>
      <button type="button" onClick={onReponer} className={`${opcion} border-blue-200 bg-blue-50 font-semibold text-blue-700 hover:bg-blue-100`}>
        Registrar reposición <span className="font-normal text-slate-600">· se quedó tal día, tantas horas</span>
      </button>
      <button type="button" onClick={onRebajar} className={`${opcion} border-slate-300 bg-white text-slate-900 hover:bg-slate-50`}>
        Rebajar en nómina <span className="text-slate-500">· en la próxima nómina</span>
      </button>
      <button type="button" onClick={onCondonar} className={`${opcion} border-slate-300 bg-white text-slate-900 hover:bg-slate-50`}>
        Condonar <span className="text-slate-500">· se le perdona, con motivo</span>
      </button>
      <p className="mt-1 text-[12.5px] leading-snug text-slate-500">
        Todo queda en el historial con quién y por qué. Lo que ya va en una nómina por autorizar o autorizada no se deshace.
      </p>
    </section>
  );
}

export default function DetalleCuentaReponer({ fila, ocupado, onCancelar, onDeshacer, onReponer, onRebajar, onCondonar }) {
  const { data, error, isLoading } = useSWR(urlCuenta(fila.id_empleado), fetcherWithToken, { revalidateOnFocus: false, shouldRetryOnError: false });
  const cuenta = data?.data;
  return (
    <div className="flex flex-wrap gap-4" data-detalle-cuenta={fila.id_empleado}>
      {cuenta ? <Movimientos cuenta={cuenta} ocupado={ocupado} onCancelar={onCancelar} onDeshacer={onDeshacer} />
        : (
          <p className="flex-[2_1_480px] rounded-xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
            {error ? "No se pudo leer su cuenta. Intenta de nuevo." : isLoading ? "Cargando movimientos…" : "Sin movimientos."}
          </p>
        )}
      <QueHacer onReponer={onReponer} onRebajar={onRebajar} onCondonar={onCondonar} />
    </div>
  );
}
