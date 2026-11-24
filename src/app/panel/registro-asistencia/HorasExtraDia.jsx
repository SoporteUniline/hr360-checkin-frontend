"use client";

// Panel del día → «Horas extra» con su horario (Dia.dc.html / MovilDia.dc.html). Filas por día con desde, hasta, horas
// calculadas y motivo; «+ Agregar día», «Repetir en otros días…», total de la semana contra el tope de ley, «Autoriza» y
// «Se pagan como». Se guarda con el botón Guardar del panel (estado en hooks/useHorasExtraDia.js).
import { useState } from "react";
import { Clock3, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FORMAS_PAGO } from "@/lib/asistencia/horasExtra.mjs";
import { etiquetaDia, minutosFila, TOPE_SEMANA_MIN } from "@/lib/asistencia/horasExtraDia.mjs";
import { formatearMinutos } from "@/lib/asistencia/jornada.mjs";
import { hora12 } from "@/lib/hora12.mjs";

const campo = "h-9 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none";
const botonPunteado = "inline-flex h-9 items-center rounded-lg border border-dashed border-blue-300 bg-white px-3 text-[13px] font-semibold "
  + "text-blue-700 hover:bg-blue-50";
const hora = (hhmm) => (hhmm ? hora12(hhmm) : "");

function Repetir({ filas, dias, onRepetir }) {
  const [abierto, setAbierto] = useState(false);
  const [origen, setOrigen] = useState("");
  const [elegidos, setElegidos] = useState([]);
  const base = filas.find((f) => f.clave === origen) ?? filas.at(-1);
  const aplicar = () => {
    if (base && elegidos.length) onRepetir(base.clave, elegidos);
    setElegidos([]);
    setAbierto(false);
  };
  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <button type="button" className={botonPunteado} disabled={!filas.length}>Repetir en otros días…</button>
      </PopoverTrigger>
      <PopoverContent className="z-[60] w-72 border border-slate-200 bg-white p-4 shadow-xl">
        <p className="text-sm font-semibold text-slate-900">Repetir en otros días</p>
        {filas.length > 1 && (
          <label className="mt-2 block text-xs font-semibold text-slate-500">
            Copiar
            <select aria-label="Fila a copiar" value={base?.clave ?? ""} onChange={(e) => setOrigen(e.target.value)} className={`${campo} mt-1`}>
              {filas.map((f) => <option key={f.clave} value={f.clave}>{etiquetaDia(f.fecha)} · {f.desde}–{f.hasta}</option>)}
            </select>
          </label>
        )}
        {base && <p className="mt-2 text-xs text-slate-500">{hora(base.desde)} a {hora(base.hasta)}{base.motivo ? ` · ${base.motivo}` : ""}</p>}
        <fieldset className="mt-3 grid grid-cols-2 gap-1.5" aria-label="Días">
          {dias.filter((d) => d !== base?.fecha).map((d) => (
            <label key={d} className="flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 px-2 text-sm">
              <input type="checkbox" checked={elegidos.includes(d)}
                onChange={(e) => setElegidos((l) => (e.target.checked ? [...l, d] : l.filter((x) => x !== d)))} />
              {etiquetaDia(d)}
            </label>
          ))}
        </fieldset>
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={() => setAbierto(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold
            text-slate-600">Cancelar</button>
          <button type="button" onClick={aplicar} disabled={!elegidos.length}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">Repetir</button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Fila({ f, dias, extra, empleadoSale }) {
  const min = minutosFila(f);
  const error = extra.errores[f.clave];
  const sale = empleadoSale(f.fecha);
  return (
    <li className={`grid grid-cols-2 gap-2 rounded-xl border p-2.5 sm:grid-cols-[104px_132px_132px_80px_minmax(0,1fr)_32px] sm:items-start
      sm:rounded-none sm:border-0 sm:border-b sm:p-0 sm:py-2 ${error ? "border-red-200 bg-red-50/40 sm:bg-transparent" : "border-slate-200"}`}
      data-fila-extra={f.fecha}>
      <label className="col-span-2 flex items-center gap-2 sm:col-span-1 sm:block">
        <span className="sr-only">Día</span>
        <select aria-label="Día" value={f.fecha} onChange={(e) => extra.cambiar(f.clave, "fecha", e.target.value)} className={campo}>
          {dias.map((d) => <option key={d} value={d}>{etiquetaDia(d)}</option>)}
        </select>
        <span className="shrink-0 text-[11px] text-slate-400 sm:mt-0.5 sm:block">{sale ? `sale ${hora(sale)}` : "descanso"}</span>
        <button type="button" onClick={() => extra.quitar(f.clave)} aria-label={`Quitar ${etiquetaDia(f.fecha)}`}
          className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 sm:hidden"><X className="h-4 w-4" /></button>
      </label>
      <label className="text-[11px] font-semibold text-slate-500 sm:text-transparent">
        <span className="sm:sr-only">Desde</span>
        <input type="time" aria-label="Desde" value={f.desde} onChange={(e) => extra.cambiar(f.clave, "desde", e.target.value)}
          className={`${campo} mt-0.5 sm:mt-0`} />
      </label>
      <label className="text-[11px] font-semibold text-slate-500 sm:text-transparent">
        <span className="sm:sr-only">Hasta</span>
        <input type="time" aria-label="Hasta" value={f.hasta} onChange={(e) => extra.cambiar(f.clave, "hasta", e.target.value)}
          className={`${campo} mt-0.5 sm:mt-0`} />
      </label>
      <p className="col-span-2 flex h-9 items-center whitespace-nowrap text-sm font-semibold tabular-nums text-slate-800 sm:col-span-1" aria-label="Horas">
        <span className="sm:hidden">=&nbsp;</span>{min ? formatearMinutos(min) : "—"}<span className="ml-1 font-normal text-slate-500 sm:hidden">extra</span>
      </p>
      <label className="col-span-2 sm:col-span-1">
        <span className="sr-only">Motivo</span>
        <input type="text" aria-label="Motivo" placeholder="Motivo" maxLength={255} value={f.motivo}
          onChange={(e) => extra.cambiar(f.clave, "motivo", e.target.value)} className={campo} />
        {f.origen === "reloj" && <span className="mt-0.5 block text-[11px] text-blue-700">Del reloj: checó después de su salida</span>}
      </label>
      <button type="button" onClick={() => extra.quitar(f.clave)} aria-label={`Quitar ${etiquetaDia(f.fecha)}`}
        className="hidden h-9 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 sm:flex">
        <X className="h-4 w-4" />
      </button>
      {error && <p role="alert" className="col-span-2 text-xs font-medium text-red-700 sm:col-span-6">{error}</p>}
    </li>
  );
}

export default function HorasExtraDia({ extra, empleados }) {
  if (extra.error) return <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">{extra.error}</p>;
  if (extra.cargando) return <p className="py-2 text-sm text-slate-500">Cargando horas extra…</p>;
  const { resumen } = extra;
  const porDia = resumen.porDia.map(([f, m]) => `${etiquetaDia(f).split(" ")[0].toLowerCase()} ${formatearMinutos(m)}`).join(", ");
  return (
    <div className="space-y-3" data-horas-extra-dia>
      <p className="text-xs text-slate-500">Con su horario, después de su salida, para que el reporte de ley muestre a qué hora se trabajaron.</p>
      {extra.propuestas.map((p) => (
        <div key={p.fecha} data-propuesta-reloj
          className="flex flex-wrap items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
          <Clock3 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            {etiquetaDia(p.fecha)}: checó en el reloj {formatearMinutos(p.minutos)} después de su salida
          </span>
          <button type="button" onClick={() => extra.autorizarPropuesta(p)} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold
            text-white hover:bg-blue-700">
            Autorizar
          </button>
        </div>
      ))}
      {extra.filas.length > 0 && (
        <div>
          <div className="hidden grid-cols-[104px_132px_132px_80px_minmax(0,1fr)_32px] gap-2 border-b border-slate-200 pb-1 text-[10.5px]
            font-semibold uppercase tracking-[0.07em] text-slate-400 sm:grid">
            <span>Día</span><span>Desde</span><span>Hasta</span><span>Horas</span><span>Motivo</span><span />
          </div>
          <ul className="space-y-2 sm:space-y-0" aria-label="Horas extra por día">
            {extra.filas.map((f) => <Fila key={f.clave} f={f} dias={extra.dias} extra={extra} empleadoSale={(d) => extra.jornadaDe(d)?.salida} />)}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={extra.agregarDia} className={botonPunteado}>+ Agregar día</button>
        <Repetir filas={extra.filas} dias={extra.dias} onRepetir={extra.repetir} />
      </div>
      {resumen.total > 0 && (
        <div data-resumen-semana
          className={`rounded-xl border px-3 py-2.5 ${resumen.avisos.length ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-slate-50/60"}`}>
          <p className="text-sm text-slate-800">
            <b className="tabular-nums">{formatearMinutos(resumen.total)} extra</b> esta semana{porDia ? ` · ${porDia}` : ""}
          </p>
          <p className={`text-xs ${resumen.avisos.length ? "font-semibold text-amber-900" : "text-slate-500"}`}>
            {resumen.avisos.length
              ? resumen.avisos.join(" ")
              : `Quedan ${formatearMinutos(resumen.quedan)} de las ${formatearMinutos(TOPE_SEMANA_MIN)} que permite la ley.`}
          </p>
        </div>
      )}
      {(extra.filas.length > 0 || extra.sucio) && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
            Autoriza
            <select aria-label="Autoriza" value={extra.autoriza} onChange={(e) => extra.setAutoriza(e.target.value)} className={campo}>
              <option value="">Elige quién autoriza</option>
              {(empleados ?? []).map((emp) => (
                <option key={emp.id_empleado} value={String(emp.id_empleado)}>{emp.nombre} {emp.apellido_paterno}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
            Se pagan como
            <select aria-label="Se pagan como" value={extra.forma} onChange={(e) => extra.setForma(e.target.value)} className={campo}>
              {FORMAS_PAGO.map((f) => <option key={f}>{f}</option>)}
            </select>
          </label>
        </div>
      )}
      <p className="text-[11px] text-slate-400">
        Si checa en el reloj después de su salida, ese tiempo se propone aquí y RH lo autoriza. Si no checa, captúralo con su horario.
      </p>
    </div>
  );
}
