"use client";

// Pestaña «Horas» de Asistencias (maqueta aprobada 19/11/2026): horas de la semana legal de cada
// empleado contra el límite de la LFT, quién se está excediendo o va a pasar, extras y alertas.
// Datos: GET /checador/reportes/horas-ley (semana completa elegida). Lógica: lib/asistencia/semanaHoras.mjs

import { useMemo, useState } from "react";
import useSWR from "swr";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { fetcherWithToken } from "@/lib/fetcher";
import { formatearMinutos } from "@/lib/asistencia/jornada.mjs";
import { resumenSemana, semanaInicial, semanasDelRango } from "@/lib/asistencia/semanaHoras.mjs";

dayjs.extend(utc);
dayjs.extend(timezone);

const fmt = (m) => formatearMinutos(Number(m) || 0);
const corta = (f) => dayjs(f).format("D MMM").replace(".", "");
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const NIVEL = {
  excede: { texto: "Se está excediendo", color: "text-red-700", barra: "bg-red-500", chip: "border-red-200 bg-red-50 text-red-700" },
  "va-a-pasar": { texto: "Va a pasar del límite", color: "text-amber-700", barra: "bg-amber-500", chip: "border-amber-200 bg-amber-50 text-amber-700" },
  ok: { texto: "Dentro del límite", color: "text-emerald-700", barra: "bg-emerald-500", chip: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  sin: { texto: "Sin regla legal para estas fechas", color: "text-slate-500", barra: "bg-slate-400", chip: "border-slate-200 bg-slate-50 text-slate-600" },
};

export default function VistaHoras({ idEmpresa, fechaInicio, fechaFin, filtroEmpleado = "" }) {
  const hoy = dayjs().tz("America/Mexico_City").format("YYYY-MM-DD");
  const semanas = useMemo(() => semanasDelRango(fechaInicio, fechaFin), [fechaInicio, fechaFin]);
  const [elegida, setElegida] = useState(null);
  const semana = semanas.find((s) => s.inicio === elegida) ?? semanaInicial(semanas, hoy);
  const [filtro, setFiltro] = useState(null);
  const [abierto, setAbierto] = useState(null);

  const clave = semana
    ? `/checador/reportes/horas-ley?fechaInicio=${semana.inicio}&fechaFin=${semana.fin}${idEmpresa && idEmpresa !== "all" ? `&empresa=${idEmpresa}` : ""}`
    : null;
  const { data, error, isLoading } = useSWR(clave, fetcherWithToken, { revalidateOnFocus: false });

  const filas = useMemo(() => {
    const reportes = Array.isArray(data?.data?.reportes) ? data.data.reportes : [];
    const busca = filtroEmpleado.trim().toLowerCase();
    return reportes
      .filter((r) => !busca || String(r.empleado?.nombre_empleado ?? "").toLowerCase().includes(busca))
      .map((r) => ({ r, s: resumenSemana(r, semana, hoy) }))
      .sort((a, b) => b.s.trabajado - a.s.trabajado);
  }, [data, filtroEmpleado, semana, hoy]);

  if (!semana) return null;
  const limite = filas.find((f) => f.s.limite != null)?.s.limite ?? null;
  const tope = filas.find((f) => f.s.topeDoble != null)?.s.topeDoble ?? null;
  const cuenta = (pred) => filas.filter(pred).length;
  const contadores = [
    ["excede", "Se están excediendo", (f) => f.s.nivel === "excede"],
    ["va-a-pasar", "Van a pasar del límite", (f) => f.s.nivel === "va-a-pasar"],
    ["por-autorizar", "Con extras por autorizar", (f) => f.s.porAutorizar > 0],
    ["ok", "Dentro del límite", (f) => f.s.nivel === "ok"],
  ];
  const visibles = filtro ? filas.filter(contadores.find(([k]) => k === filtro)[2]) : filas;

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4" aria-label="Horas de la semana">
      <div className="flex flex-col gap-2 text-[13px] text-slate-700">
        {semanas.length > 1 && (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Semana">
            {semanas.map((s) => (
              <button key={s.inicio} type="button" onClick={() => setElegida(s.inicio)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${s.inicio === semana.inicio ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                {corta(s.inicio)} – {corta(s.fin)}
              </button>
            ))}
          </div>
        )}
        <p>
          <b>Semana {corta(semana.inicio)} – {corta(semana.fin)}</b>
          {semana.inicio <= hoy && hoy <= semana.fin ? " · en curso" : ""}
          {limite != null && <> · límite LFT: <b>{fmt(limite)}</b> ordinarias · <b>{fmt(tope)}</b> extra al doble</>}
          {" "}· solo cuentan las extra autorizadas
        </p>
        <div className="flex flex-wrap gap-2">
          {contadores.map(([k, texto, pred]) => (
            <button key={k} type="button" onClick={() => setFiltro(filtro === k ? null : k)} aria-pressed={filtro === k}
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${k === "por-autorizar" ? "border-orange-200 bg-orange-50 text-orange-700" : NIVEL[k].chip} ${filtro === k ? "ring-2 ring-offset-1 ring-blue-500" : ""}`}>
              ● {texto} <b className="ml-1 text-sm">{cuenta(pred)}</b>
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="py-6 text-center text-sm text-slate-500">Calculando horas de la semana…</p>}
      {error && <p className="py-6 text-center text-sm text-red-600">No se pudieron calcular las horas.</p>}
      {!isLoading && !error && !visibles.length && <p className="py-6 text-center text-sm text-slate-500">No hay empleados para mostrar.</p>}

      <div className="space-y-2">
        {visibles.map(({ r, s }) => {
          const n = NIVEL[s.nivel];
          const pct = s.limite ? Math.min(100, (s.trabajado / s.limite) * 100) : 0;
          const proy = s.limite ? Math.min(100, (s.proyeccion / s.limite) * 100) : 0;
          const id = r.empleado?.id_empleado;
          const restantesDobles = s.topeDoble != null ? Math.max(0, s.topeDoble - s.dobles) : null;
          return (
            <article key={id} className="rounded-xl border border-slate-200 px-4 py-3 hover:bg-slate-50" aria-label={r.empleado?.nombre_empleado}>
              <button type="button" onClick={() => setAbierto(abierto === id ? null : id)} className="grid w-full gap-3 text-left md:grid-cols-[190px_1fr_230px_240px] md:items-center">
                <div>
                  <p className="font-semibold text-slate-900">{r.empleado?.nombre_empleado}</p>
                  <p className="text-xs text-slate-500">{r.empleado?.departamento || r.empleado?.puesto || ""}</p>
                </div>
                <div>
                  <p className="text-[13px] text-slate-700">
                    <b className={`text-base ${n.color}`}>{fmt(s.trabajado)}</b>
                    {s.limite != null && <> de {fmt(s.limite)}</>}
                    {s.limite != null && (s.trabajado > s.limite
                      ? <span className="ml-1 rounded-full bg-red-50 px-2 text-[11px] font-semibold text-red-700">+{fmt(s.trabajado - s.limite)} arriba</span>
                      : <span className="text-xs text-slate-500"> · le quedan {fmt(s.limite - s.trabajado)}</span>)}
                    {s.enCurso && <span className="text-xs text-slate-500"> · faltan {fmt(s.restante)} de su horario</span>}
                  </p>
                  <div className="relative my-1.5 h-2.5 overflow-hidden rounded-full bg-slate-200" aria-hidden>
                    {s.enCurso && <i className="absolute inset-y-0 left-0 rounded-full bg-[repeating-linear-gradient(45deg,#cbd5e1,#cbd5e1_4px,#e2e8f0_4px,#e2e8f0_8px)]" style={{ width: `${proy}%` }} />}
                    <i className={`absolute inset-y-0 left-0 rounded-full ${n.barra}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className={`text-[11.5px] font-semibold ${n.color}`}>
                    {n.texto}{s.nivel === "va-a-pasar" ? ` · si cumple su horario llega a ${fmt(s.proyeccion)}` : ""}
                  </p>
                </div>
                <div className="flex gap-4">
                  <div>
                    <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">Extra autorizadas</p>
                    <p className="font-bold tabular-nums">{fmt(s.autorizadas)}</p>
                    <p className="text-[11px] text-slate-500">
                      {fmt(s.dobles)} dobles{s.triples ? ` · ${fmt(s.triples)} triples` : restantesDobles != null ? ` · le quedan ${fmt(restantesDobles)}` : ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">Por autorizar</p>
                    <p className={`font-bold tabular-nums ${s.porAutorizar ? "text-orange-700" : ""}`}>{fmt(s.porAutorizar)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {s.alertas.length
                    ? s.alertas.map((a) => <span key={a} className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">⚠ {a}</span>)
                    : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">Sin alertas</span>}
                </div>
              </button>
              {abierto === id && (
                <div className="mt-3 grid grid-cols-7 gap-1.5 border-t border-dashed border-slate-200 pt-3" aria-label="Semana día por día">
                  {s.dias.map((d, i) => (
                    <div key={d.fecha} className="rounded-lg bg-slate-50 px-2 py-1.5 text-xs">
                      <p className="text-[11px] text-slate-500">{DIAS[i]} {dayjs(d.fecha).format("D")}</p>
                      <p className="font-semibold tabular-nums">{d.trabajado ? fmt(d.trabajado) : "—"}</p>
                      {d.alertas.map((a) => <p key={a} className="text-[10.5px] font-semibold text-red-700">{a}</p>)}
                    </div>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
      <p className="text-[11.5px] text-slate-400">Clic en un empleado para ver su semana día por día. Usa la búsqueda y el rango de fechas de arriba.</p>
    </section>
  );
}
