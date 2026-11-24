"use client";

// Monitor: a esta hora, un estado por persona y lo urgente primero.
// Tarjetas = filtros; búsqueda y área en pantalla; lista agrupada (src/lib/asistencia/monitor.mjs) con la razón en texto.
// Clic en la fila abre el día con la misma ventana de edición de Asistencias (`onAbrirDia`).
// La hora se recalcula cada 30 s; los datos se refrescan con cada checada (página del Monitor).
// Celular: tarjetas con desplazamiento horizontal y renglones como tarjetas; escritorio: tabla por columnas.
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { herramientasHoras } from "@/lib/asistencia/horasEdicion.mjs";
import { ahoraEn, checadasDelDia, describir, diaDesdeRegistro, diasDeHoy, estadoHoy } from "@/lib/asistencia/hoy.mjs";
import { agruparMonitor, horarioDe, pieTarjeta, razonMonitor, resumenMonitor, TARJETAS_MONITOR } from "@/lib/asistencia/monitor.mjs";
import { formatearMinutos } from "@/lib/asistencia/jornada.mjs";
import { NombreEmpleado } from "@/components/empleado/FichaEmpleado";
import { useCuentasHoras } from "@/app/panel/registro-asistencia/CuentaHorasContext";
import { cn } from "@/lib/utils";

const nombreDe = (r) => [r.nombre, r.apellido_paterno].filter(Boolean).join(" ");
const iniciales = (r) => `${r.nombre?.[0] ?? ""}${r.apellido_paterno?.[0] ?? ""}`.toUpperCase() || "?";
const areaDe = (r) => r.departamento || r.puesto || "";
const sinAcentos = (v) => String(v ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Tonos con los tokens de Tailwind (red/orange/yellow/green/blue/slate).
const CHIP = {
  rojo: "bg-red-100 text-red-800", naranja: "bg-orange-100 text-orange-800", amarillo: "bg-yellow-100 text-yellow-800",
  verde: "bg-green-100 text-green-800", azul: "bg-blue-100 text-blue-800", rosa: "bg-rose-100 text-rose-800",
  gris: "bg-slate-200 text-slate-700", neutro: "bg-slate-100 text-slate-600",
};
const BARRA = { trabajando: "bg-brand", en_comida: "bg-yellow-500", ya_salio: "bg-slate-500", salio_antes: "bg-rose-500" };
// Título de cada tarjeta y fondo cuando hay alguien en un estado que pide acción.
const TARJETA = {
  jornada: { titulo: "text-blue-800" },
  tarde: { titulo: "text-orange-800", alerta: "border-orange-300 bg-orange-50", pie: "text-orange-900" },
  no_han_llegado: { titulo: "text-red-800", alerta: "border-red-300 bg-red-50", pie: "text-red-900" },
  permiso: { titulo: "text-blue-800" },
  en_comida: { titulo: "text-yellow-800" },
  saldran_tarde: { titulo: "text-blue-800" },
  por_entrar: { titulo: "text-slate-700" },
};
// En celular lo que pide acción va primero.
const ORDEN_CELULAR = {
  tarde: "max-lg:order-1", no_han_llegado: "max-lg:order-2", permiso: "max-lg:order-3", saldran_tarde: "max-lg:order-4",
  en_comida: "max-lg:order-5", jornada: "max-lg:order-6", por_entrar: "max-lg:order-7",
};
const CAMPO = "h-11 rounded-[10px] border border-slate-300 bg-white text-[15px] text-slate-900 focus:border-brand focus:outline-none "
  + "focus:ring-2 focus:ring-brand/30 lg:text-sm";
const COLUMNAS = "lg:grid lg:grid-cols-[1.8fr_1.2fr_0.8fr_2.2fr_1.2fr_24px] lg:items-center lg:gap-4";

function Tarjeta({ t, n, activa, resumen, onClick }) {
  const tono = TARJETA[t.clave];
  const alerta = n > 0 && tono.alerta;
  return (
    <button type="button" aria-pressed={activa} onClick={onClick}
      className={cn(
        "flex min-h-11 min-w-[112px] shrink-0 flex-col gap-0.5 rounded-xl px-3 py-2.5 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 lg:min-w-0 lg:gap-1 lg:rounded-[14px] lg:p-4",
        ORDEN_CELULAR[t.clave],
        activa ? "border-2 border-brand bg-white" : alerta ? `border ${alerta}` : "border border-slate-200 bg-white hover:border-slate-300",
      )}>
      <span className={`text-xs font-semibold lg:text-[13px] ${tono.titulo}`}>{t.titulo}</span>
      <span className="text-2xl font-bold tabular-nums text-slate-900 lg:text-[30px] lg:leading-9">{n}</span>
      <span className={`hidden text-xs lg:block ${alerta ? tono.pie : "text-slate-600"}`}>{pieTarjeta(t.clave, resumen)}</span>
    </button>
  );
}

function Renglon({ r, onAbrirDia, debe }) {
  const reg = r.dia.registro;
  const razon = razonMonitor(r);
  const d = describir(r);
  const { entrada } = checadasDelDia(r);
  const nombre = nombreDe(reg);
  const horario = horarioDe(r);
  const tarde = r.llegoTarde != null;
  return (
    <li className={cn(
      "relative flex flex-col gap-2 rounded-[14px] border border-slate-200 bg-white p-3.5 hover:bg-slate-50",
      "lg:rounded-none lg:border-0 lg:border-b lg:border-slate-100 lg:px-5 lg:py-3 lg:last:border-b-0",
      COLUMNAS,
    )}
      data-estado={r.estado}>
      <div className="flex min-w-0 items-center gap-2.5 lg:gap-3">
        <span aria-hidden="true" className={cn("grid size-9 shrink-0 place-items-center rounded-full text-[13px] font-bold", CHIP[razon.tono])}>
          {iniciales(reg)}
        </span>
        <span className="flex min-w-0 grow flex-col">
          <b data-nombre className="truncate text-[15px] text-slate-900 lg:text-sm">
            <span className="relative z-10"><NombreEmpleado id={reg.id_empleado}>{nombre}</NombreEmpleado></span>
          </b>
          <span className="truncate text-xs text-slate-600">
            {areaDe(reg)}<span className="lg:hidden">{areaDe(reg) ? " · " : ""}{horario}</span>
            {debe > 0 ? <span className="font-semibold text-amber-700"> · debe {formatearMinutos(debe)}</span> : null}
          </span>
        </span>
        <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-slate-400 lg:hidden" />
      </div>
      <span className="hidden whitespace-nowrap text-[13px] tabular-nums text-slate-700 lg:block">{horario}</span>
      <span data-col="entrada"
        className={cn("hidden whitespace-nowrap text-[13px] tabular-nums lg:block", tarde ? "font-semibold text-orange-800" : "text-slate-900")}>
        {entrada ?? <span className="text-slate-400">—</span>}
      </span>
      <span className="flex min-w-0 flex-wrap items-center gap-1.5">
        <span data-razon className={`inline-flex max-w-full rounded-xl px-2.5 py-1 text-xs font-semibold ${CHIP[razon.tono]}`}>{razon.texto}</span>
        {entrada ? <span className="text-xs tabular-nums text-slate-600 lg:hidden">Entró {entrada}</span> : null}
      </span>
      {d.jornada ? (
        <span className="flex flex-col gap-1">
          <span role="progressbar" aria-label={`Jornada: ${d.jornada}`} aria-valuemin={0} aria-valuemax={100}
            aria-valuenow={d.avance != null ? Math.round(d.avance * 100) : undefined} className="block h-1.5 rounded-full bg-slate-200">
            <span className={`block h-1.5 rounded-full ${BARRA[r.estado] ?? "bg-brand"}`} style={{ width: `${Math.round((d.avance ?? 0) * 100)}%` }} />
          </span>
          <span className="text-xs tabular-nums text-slate-600">{d.jornada}</span>
        </span>
      ) : <span aria-hidden="true" className="hidden text-[13px] text-slate-400 lg:block">—</span>}
      <ChevronRight aria-hidden="true" className="hidden size-4 text-slate-400 lg:block" />
      <button type="button" onClick={() => onAbrirDia?.(reg)} aria-label={`Ver día de ${nombre}`}
        className={cn("absolute inset-0 rounded-[14px] lg:rounded-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand")} />
    </li>
  );
}

function Grupo({ g, onAbrirDia, cuentas, abierto, onAlternar }) {
  const urgente = g.clave === "atencion";
  const corto = g.limite && !abierto && g.filas.length > g.limite;
  const plegado = g.plegado && !abierto;
  const filas = plegado ? [] : corto ? g.filas.slice(0, g.limite) : g.filas;
  const textoBoton = g.plegado ? (abierto ? "Ocultar" : "Mostrar") : abierto ? "ver menos" : "ver todos";
  const conBoton = g.plegado || (g.limite && g.filas.length > g.limite);
  return (
    <section aria-label={`${g.titulo} (${g.filas.length})`} className="space-y-2 lg:space-y-0 lg:border-t lg:border-slate-200 lg:first:border-t-0">
      <h3 className={`mt-2 flex min-h-11 items-center gap-2 text-xs font-bold tracking-[0.04em] lg:mt-0 lg:min-h-0 lg:px-5 lg:py-2 ${
        urgente ? "text-orange-800 lg:bg-orange-50" : "text-slate-600 lg:bg-slate-50"}`}>
        <span>{`${g.titulo.toUpperCase()} · ${g.filas.length}`}</span>
        {conBoton ? (
          <button type="button" aria-expanded={Boolean(abierto)} onClick={onAlternar}
            className="min-h-11 px-1 font-semibold normal-case tracking-normal text-brand hover:underline lg:min-h-0">
            {textoBoton}
          </button>
        ) : null}
      </h3>
      {filas.length ? (
        <ul className="space-y-2 lg:space-y-0">
          {filas.map((r) => <Renglon key={r.dia.id} r={r} onAbrirDia={onAbrirDia} debe={Number(cuentas[Number(r.dia.registro.id_empleado)]) || 0} />)}
        </ul>
      ) : null}
    </section>
  );
}

// Un estado por persona. Cada empresa en su zona: la checada (hora de CDMX en la base) se pasa a la zona de la empresa.
export function estadosDeHoy(registros, zona, ahoraMs) {
  const porZona = new Map();
  for (const r of registros ?? []) {
    const z = r.zona_horaria || zona;
    if (!porZona.has(z)) porZona.set(z, []);
    const { fechaLocal, horaLocal } = herramientasHoras(r, z);
    porZona.get(z).push({ ...diaDesdeRegistro(r, (v) => `${fechaLocal(v)} ${horaLocal(v)}`), registro: r });
  }
  const salida = [];
  for (const [z, dias] of porZona) {
    const ahora = ahoraEn(z, new Date(ahoraMs));
    for (const d of diasDeHoy(dias, ahora.hoy, ahora.abs)) salida.push(estadoHoy(d, ahora.abs));
  }
  return salida;
}

export default function VistaMonitor({ registros, zona, cargando, onAbrirDia }) {
  const [reloj, setReloj] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setReloj(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  const [filtro, setFiltro] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [area, setArea] = useState("");
  const [abiertos, setAbiertos] = useState({});
  const cuentas = useCuentasHoras();

  const resultados = useMemo(() => estadosDeHoy(registros, zona, reloj), [registros, zona, reloj]);
  const areas = useMemo(
    () => [...new Set(resultados.map((r) => areaDe(r.dia.registro)).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es")),
    [resultados],
  );
  const base = useMemo(() => {
    const q = sinAcentos(busqueda.trim());
    return resultados.filter((r) => {
      const reg = r.dia.registro;
      if (area && areaDe(reg) !== area) return false;
      return !q || sinAcentos([reg.nombre, reg.apellido_paterno, reg.apellido_materno, reg.nip].filter(Boolean).join(" ")).includes(q);
    });
  }, [resultados, busqueda, area]);
  const resumen = useMemo(() => resumenMonitor(base), [base]);
  const tarjeta = TARJETAS_MONITOR.find((t) => t.clave === filtro) ?? null;
  const grupos = useMemo(() => agruparMonitor(tarjeta ? base.filter(tarjeta.es) : base, (r) => nombreDe(r.dia.registro)), [base, tarjeta]);

  if (cargando && !resultados.length) return <p role="status" className="p-6 text-sm text-slate-500">Cargando quién está hoy…</p>;

  return (
    <section className="space-y-3.5 lg:space-y-5" aria-label="Asistencia de hoy">
      <div role="group" aria-label="Resumen de hoy"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-3 lg:overflow-visible lg:px-0 lg:pb-0 xl:grid-cols-7">
        {TARJETAS_MONITOR.map((t) => (
          <Tarjeta key={t.clave} t={t} n={resumen.cuenta[t.clave]} resumen={resumen} activa={filtro === t.clave}
            onClick={() => setFiltro((f) => (f === t.clave ? null : t.clave))} />
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        <div className="relative sm:w-[340px]">
          <label htmlFor="monitor-buscar" className="sr-only">Buscar empleado</label>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input id="monitor-buscar" type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar empleado…"
            className={cn(CAMPO, "w-full pl-9 pr-3.5 placeholder:text-slate-400")} />
        </div>
        <label htmlFor="monitor-area" className="sr-only">Área</label>
        <select id="monitor-area" value={area} onChange={(e) => setArea(e.target.value)}
          className={cn(CAMPO, "px-3")}>
          <option value="">Todas las áreas</option>
          {areas.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <p className="text-[13px] text-slate-600 sm:ml-auto" aria-live="polite">
          Mostrando: <b className="text-slate-900">{tarjeta ? tarjeta.titulo : "Todos"}</b>
          {tarjeta
            ? <> · <button type="button" onClick={() => setFiltro(null)}
              className="min-h-11 font-semibold text-blue-700 hover:underline lg:min-h-0">ver todos</button></>
            : " · lo urgente primero"}
        </p>
      </div>

      <div aria-label="Empleados de hoy" role="region" className="lg:overflow-hidden lg:rounded-2xl lg:border lg:border-slate-200 lg:bg-white">
        <div aria-hidden="true"
          className={cn("hidden border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-[0.04em] text-slate-600", COLUMNAS)}>
          <span>Persona</span><span>Horario</span><span>Entrada</span><span>Qué pasa</span><span>Jornada</span><span />
        </div>
        {grupos.length ? (
          <div className="space-y-2 lg:space-y-0">
            {grupos.map((g) => (
              <Grupo key={g.clave} g={g} onAbrirDia={onAbrirDia} cuentas={cuentas} abierto={abiertos[g.clave]}
                onAlternar={() => setAbiertos((v) => ({ ...v, [g.clave]: !v[g.clave] }))} />
            ))}
          </div>
        ) : (
          <p className="rounded-[14px] border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-600 lg:rounded-none lg:border-0">
            {tarjeta ? `Nadie en «${tarjeta.titulo}» ahora.` : busqueda || area ? "Nadie coincide con la búsqueda." : "No hay empleados con registro para hoy."}
          </p>
        )}
      </div>
    </section>
  );
}
