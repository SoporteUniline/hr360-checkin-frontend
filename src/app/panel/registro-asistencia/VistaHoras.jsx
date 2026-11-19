"use client";

// Pestaña «Horas» de Asistencias (maqueta aprobada 19/11/2026): horas de la semana legal de cada
// empleado contra el límite de la LFT, quién se está excediendo o va a pasar, extras y alertas.
// Datos: GET /checador/reportes/horas-ley (semana completa elegida). Lógica: lib/asistencia/semanaHoras.mjs

import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { fetcherWithToken } from "@/lib/fetcher";
import { formatearMinutos } from "@/lib/asistencia/jornada.mjs";
import { horaCorta, ordenarFilas, resumenSemana, semanaInicial, semanasDelRango } from "@/lib/asistencia/semanaHoras.mjs";

// (19/11/2026) Clic en un día (o en su alerta) abre el registro de ese día en la Lista para corregirlo.
export const enlaceDia = (idEmpleado, nombre, fecha) =>
  `/panel/registro-asistencia?${new URLSearchParams({ fecha, empleado: nombre ?? "", abrirEmpleado: String(idEmpleado ?? "") })}`;
const irAlDia = (e, idEmpleado, nombre, fecha) => {
  e.stopPropagation();
  // Navegación completa: la página toma fecha, empleado y registro a abrir al cargar.
  window.location.assign(enlaceDia(idEmpleado, nombre, fecha));
};

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
  const [orden, setOrden] = useState({ campo: "trabajado", dir: "desc" });

  const clave = semana
    ? `/checador/reportes/horas-ley?fechaInicio=${semana.inicio}&fechaFin=${semana.fin}${idEmpresa && idEmpresa !== "all" ? `&empresa=${idEmpresa}` : ""}`
    : null;
  const { data, error, isLoading } = useSWR(clave, fetcherWithToken, { revalidateOnFocus: false });

  const filas = useMemo(() => {
    const reportes = Array.isArray(data?.data?.reportes) ? data.data.reportes : [];
    const busca = filtroEmpleado.trim().toLowerCase();
    return reportes
      .filter((r) => !busca || String(r.empleado?.nombre_empleado ?? "").toLowerCase().includes(busca))
      .map((r) => ({ r, s: resumenSemana(r, semana, hoy) }));
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
  const visibles = ordenarFilas(filtro ? filas.filter(contadores.find(([k]) => k === filtro)[2]) : filas, orden.campo, orden.dir);
  const ordenarPor = (campo) => setOrden((o) => ({ campo, dir: o.campo === campo && o.dir === "desc" ? "asc" : campo === "nombre" && o.campo !== "nombre" ? "asc" : "desc" }));

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

      {visibles.length > 0 && (
        <TablaHoras visibles={visibles} semana={semana} hoy={hoy} orden={orden} ordenarPor={ordenarPor} abierto={abierto} setAbierto={setAbierto} />
      )}

      <p className="text-[11.5px] text-slate-400">
        Ordena con los títulos de las columnas · clic en una fila con alertas para verlas completas · horas en h:mm; entre paréntesis, lo que le falta de su horario.
        {" "}Usa la búsqueda y el rango de fechas de arriba.
      </p>
    </section>
  );
}

const ESTADO_CORTO = { excede: "Excede", "va-a-pasar": "Va a pasar", ok: "En límite", sin: "Sin regla" };

function Th({ campo, orden, ordenarPor, children, className = "" }) {
  const activo = orden.campo === campo;
  return (
    <th scope="col" className={`px-2 py-2 font-semibold ${className}`} aria-sort={activo ? (orden.dir === "asc" ? "ascending" : "descending") : "none"}>
      <button type="button" onClick={() => ordenarPor(campo)} className={`inline-flex items-center gap-0.5 uppercase hover:text-slate-900 ${activo ? "text-slate-900" : ""}`}>
        {children}<span aria-hidden className="text-[9px]">{activo ? (orden.dir === "asc" ? "▲" : "▼") : "↕"}</span>
      </button>
    </th>
  );
}

// Tabla: una fila por empleado (pensada para cientos), encabezado fijo y orden por columna.
function TablaHoras({ visibles, semana, hoy, orden, ordenarPor, abierto, setAbierto }) {
  const fechas = Array.from({ length: 7 }, (_, i) => dayjs(semana.inicio).add(i, "day").format("YYYY-MM-DD"));
  return (
    <div className="max-h-[70vh] overflow-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[1040px] border-collapse text-[13px] tabular-nums">
        <thead className="sticky top-0 z-10 bg-slate-50 text-left text-[10.5px] uppercase tracking-wide text-slate-500 shadow-[0_1px_0_#e2e8f0]">
          <tr>
            <Th campo="nombre" orden={orden} ordenarPor={ordenarPor} className="min-w-[180px]">Empleado</Th>
            {fechas.map((f, i) => (
              <th key={f} scope="col" className={`px-1.5 py-2 text-center font-semibold ${f === hoy ? "bg-blue-50 text-blue-700" : ""}`}>
                {DIAS[i]} {dayjs(f).format("D")}
              </th>
            ))}
            <Th campo="trabajado" orden={orden} ordenarPor={ordenarPor} className="min-w-[150px]">Semana</Th>
            <th scope="col" className="px-2 py-2 font-semibold">Contra el límite</th>
            <Th campo="autorizadas" orden={orden} ordenarPor={ordenarPor}>Extra aut.</Th>
            <Th campo="porAutorizar" orden={orden} ordenarPor={ordenarPor}>Por aut.</Th>
            <th scope="col" className="px-2 py-2 font-semibold">Estado</th>
            <Th campo="alertas" orden={orden} ordenarPor={ordenarPor} className="w-[240px]">Alertas</Th>
          </tr>
        </thead>
        <tbody>
          {visibles.map(({ r, s }) => {
            const n = NIVEL[s.nivel];
            const id = r.empleado?.id_empleado;
            const nombre = r.empleado?.nombre_empleado;
            const pct = s.limite ? Math.min(100, (s.trabajado / s.limite) * 100) : 0;
            const proy = s.limite ? Math.min(100, (s.proyeccion / s.limite) * 100) : 0;
            const abiertoAqui = abierto === id;
            return (
              <FilaHoras key={id} idEmpleado={id} nombre={nombre} abierto={abiertoAqui} onClick={() => setAbierto(abiertoAqui ? null : id)} alertas={s.alertas} dias={s.dias}>
                <td className="px-2 py-1.5">
                  <p className="font-semibold leading-tight text-slate-900">{nombre}</p>
                  <p className="truncate text-[11px] text-slate-500">{r.empleado?.departamento || r.empleado?.puesto || ""}</p>
                </td>
                {s.dias.map((d) => {
                  const contenido = (
                    <>
                      {d.fecha > hoy && !d.trabajado ? (d.programado ? <span className="text-[11px]">({horaCorta(d.programado)})</span> : "—") : horaCorta(d.trabajado)}
                      {d.alertas.length ? <span aria-hidden> •</span> : null}
                    </>
                  );
                  const abrible = d.fecha <= hoy && (d.trabajado || d.alertas.length);
                  return (
                    <td key={d.fecha} title={[...d.alertas, abrible ? "Clic para ver y corregir este día" : ""].filter(Boolean).join(" · ") || undefined}
                      className={`px-1 py-1 text-center ${d.fecha === hoy ? "bg-blue-50/60" : ""} ${d.alertas.length ? "font-semibold text-red-700" : d.fecha > hoy ? "text-slate-300" : "text-slate-700"}`}>
                      {abrible ? (
                        <button type="button" onClick={(e) => irAlDia(e, id, nombre, d.fecha)}
                          className="w-full rounded-md px-1 py-0.5 underline-offset-2 hover:bg-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
                          {contenido}
                        </button>
                      ) : contenido}
                    </td>
                  );
                })}
                <td className="px-2 py-1.5">
                  <b className={n.color}>{fmt(s.trabajado)}</b>
                  {s.limite != null && <span className="text-[11px] text-slate-500"> / {fmt(s.limite)}</span>}
                  <div className="relative mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-slate-200" aria-hidden>
                    {s.enCurso && <i className="absolute inset-y-0 left-0 rounded-full bg-slate-300" style={{ width: `${proy}%` }} />}
                    <i className={`absolute inset-y-0 left-0 rounded-full ${n.barra}`} style={{ width: `${pct}%` }} />
                  </div>
                </td>
                <td className="whitespace-nowrap px-2 py-1.5 text-[12px]">
                  {s.limite == null ? "—" : s.trabajado > s.limite
                    ? <span className="font-semibold text-red-700">+{fmt(s.trabajado - s.limite)} arriba</span>
                    : s.nivel === "va-a-pasar"
                      ? <span className="font-semibold text-amber-700">llegaría a {fmt(s.proyeccion)}</span>
                      : <span className="text-slate-500">le quedan {fmt(s.limite - s.trabajado)}</span>}
                </td>
                <td className="whitespace-nowrap px-2 py-1.5">
                  {s.autorizadas || s.porAutorizar ? (
                    <Link href={`/panel/horas-extra?semana=${semana.inicio}&empleado=${encodeURIComponent(nombre ?? "")}`} onClick={(e) => e.stopPropagation()}
                      className="group/hx rounded-md hover:underline" title="Ver sus horas extra en Control de horas extra">
                      {s.autorizadas ? <b>{fmt(s.autorizadas)}</b> : <span className="text-slate-400">0 min</span>}
                      <span className="block text-[11px] text-slate-500 group-hover/hx:text-blue-600">{s.triples ? `${fmt(s.triples)} triples` : `${fmt(s.dobles)} dobles`} ›</span>
                    </Link>
                  ) : <span className="text-slate-400">—</span>}
                </td>
                <td className={`whitespace-nowrap px-2 py-1.5 ${s.porAutorizar ? "font-semibold text-orange-700" : "text-slate-400"}`}>
                  {s.porAutorizar ? fmt(s.porAutorizar) : "—"}
                </td>
                <td className="px-2 py-1.5">
                  <span className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${n.chip}`}>{ESTADO_CORTO[s.nivel]}</span>
                </td>
                <td className="max-w-[240px] px-2 py-1.5 text-[11.5px]" title={s.alertas.join(" · ") || undefined}>
                  {s.alertas.length ? (
                    <span className="flex items-center gap-1.5 font-semibold text-red-700">
                      <span className="shrink-0 whitespace-nowrap rounded-full bg-red-50 px-1.5">⚠ {s.alertas.length}</span>
                      <span className="truncate">{s.alertas[0]}</span>
                    </span>
                  ) : <span className="text-slate-400">Sin alertas</span>}
                </td>
              </FilaHoras>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FilaHoras({ idEmpleado, nombre, abierto, onClick, alertas, dias, children }) {
  const porDia = dias.map((d, i) => ({ ...d, dia: DIAS[i] })).filter((d) => d.alertas.length);
  return (
    <>
      <tr aria-label={nombre} aria-expanded={alertas.length ? abierto : undefined} onClick={alertas.length ? onClick : undefined}
        className={`border-t border-slate-100 align-middle ${alertas.length ? "cursor-pointer" : ""} ${abierto ? "bg-slate-50" : "hover:bg-slate-50"}`}>
        {children}
      </tr>
      {abierto && (
        <tr className="bg-slate-50" aria-label={`Alertas de ${nombre}`}>
          <td colSpan={15} className="px-3 pb-2.5 pt-0 text-[12px]">
            <div className="flex flex-wrap gap-1.5">
              {alertas.map((a) => <span key={a} className="rounded-full bg-red-50 px-2 py-0.5 font-semibold text-red-700">⚠ {a}</span>)}
            </div>
            {porDia.length ? (
              <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-slate-600">
                {porDia.map((d) => (
                  <button key={d.fecha} type="button" onClick={(e) => irAlDia(e, idEmpleado, nombre, d.fecha)}
                    className="font-medium text-blue-700 underline-offset-2 hover:underline">
                    {d.dia} {dayjs(d.fecha).format("D")}: {d.alertas.join(", ")} · Ver y corregir →
                  </button>
                ))}
              </p>
            ) : null}
          </td>
        </tr>
      )}
    </>
  );
}
