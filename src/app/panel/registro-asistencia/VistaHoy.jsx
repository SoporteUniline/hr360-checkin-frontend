"use client";

// Asistencias → Hoy (23/11/2026, maqueta aprobada por el dueño): a esta hora, un estado por persona y lo urgente primero.
// Tarjetas = filtros (Trabajando, Llegaron tarde, No han llegado, En comida, Ya salieron, Salieron antes, Faltaron);
// búsqueda y área en pantalla; lista agrupada: Requieren atención → En comida → Trabajando → Próximos → Ya salieron →
// No laboran hoy (plegado). «Ver día» abre la ventana de edición del día (la misma de Registros).
// Datos: los registros de ayer y hoy que ya carga Asistencias (se refrescan con cada checada por SSE); la hora se
// recalcula cada 30 s. Lógica pura en src/lib/asistencia/hoy.mjs (scripts/test-asistencias-hoy.mjs).
// Celular: tarjetas con desplazamiento horizontal y renglones como tarjetas (Telefono.dc.html); escritorio: tabla.
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { herramientasHoras } from "@/lib/asistencia/horasEdicion.mjs";
import {
  agruparHoy, ahoraEn, describir, diaDesdeRegistro, diasDeHoy, estadoHoy, horaDe, resumenHoy, TARJETAS,
} from "@/lib/asistencia/hoy.mjs";
import { formatearMinutos } from "@/lib/asistencia/jornada.mjs";
import { NombreEmpleado } from "@/components/empleado/FichaEmpleado";
import { useCuentasHoras } from "./CuentaHorasContext";

const nombreDe = (r) => [r.nombre, r.apellido_paterno].filter(Boolean).join(" ");
const iniciales = (r) => `${r.nombre?.[0] ?? ""}${r.apellido_paterno?.[0] ?? ""}`.toUpperCase() || "?";
const areaDe = (r) => r.departamento || r.puesto || "";

// Colores de la maqueta con los tokens de Tailwind (red/orange/yellow/green/slate) y el azul de marca.
const CHIP = {
  rojo: "bg-red-100 text-red-800", naranja: "bg-orange-100 text-orange-800", amarillo: "bg-yellow-100 text-yellow-800",
  verde: "bg-green-100 text-green-800", azul: "bg-blue-100 text-blue-800", rosa: "bg-rose-100 text-rose-800",
  gris: "bg-slate-200 text-slate-700", neutro: "bg-slate-100 text-slate-600",
};
const AVATAR = {
  rojo: "bg-red-100 text-red-800", naranja: "bg-orange-100 text-orange-800", amarillo: "bg-yellow-100 text-yellow-800",
  verde: "bg-blue-100 text-blue-800", azul: "bg-blue-100 text-blue-800", rosa: "bg-rose-100 text-rose-800",
  gris: "bg-slate-200 text-slate-700", neutro: "bg-slate-100 text-slate-500",
};
const TEXTO = { normal: "text-slate-600", naranja: "font-semibold text-orange-800", amarillo: "font-semibold text-yellow-800", rosa: "font-semibold text-rose-800" };
const BARRA = { trabajando: "bg-brand", en_comida: "bg-green-500", ya_salio: "bg-slate-500", salio_antes: "bg-rose-500" };
// Tarjetas: color del título y fondo cuando hay alguien en un estado urgente.
const TARJETA = {
  trabajando: { titulo: "text-blue-800" },
  tarde: { titulo: "text-orange-800" },
  no_ha_llegado: { titulo: "text-orange-800", alerta: "border-orange-300 bg-orange-50", pie: "text-orange-900" },
  en_comida: { titulo: "text-yellow-800" },
  ya_salio: { titulo: "text-slate-700" },
  salio_antes: { titulo: "text-rose-800", alerta: "border-rose-300 bg-rose-50", pie: "text-rose-900" },
  falto: { titulo: "text-red-800", alerta: "border-red-300 bg-red-50", pie: "text-red-900" },
};
// En celular lo urgente va primero (Telefono.dc.html).
const ORDEN_CELULAR = { trabajando: "max-lg:order-1", no_ha_llegado: "max-lg:order-2", tarde: "max-lg:order-3", en_comida: "max-lg:order-4", falto: "max-lg:order-5", salio_antes: "max-lg:order-6", ya_salio: "max-lg:order-7" };
const COLUMNAS = "lg:grid lg:grid-cols-[2fr_1.45fr_1.25fr_1.7fr_1.3fr_72px] lg:items-center lg:gap-4";

function pieTarjeta(clave, s) {
  switch (clave) {
    case "trabajando": return `de ${s.programadosHoy} programados hoy`;
    case "tarde": return s.promedioTarde != null ? `promedio +${formatearMinutos(s.promedioTarde)}` : "nadie llegó tarde";
    case "no_ha_llegado": return "pasó su tolerancia";
    case "en_comida": return s.comidaExcedida ? `${s.comidaExcedida} ya se pasó` : "nadie se ha pasado";
    case "ya_salio": return s.salieronConPermiso ? `${s.salieronConPermiso} con permiso` : "jornada cumplida";
    case "salio_antes": return "sin permiso";
    case "falto": return "sin checar a media jornada";
    default: return "";
  }
}

function Tarjeta({ t, n, activa, resumen, onClick }) {
  const tono = TARJETA[t.clave];
  const alerta = n > 0 && tono.alerta;
  return (
    <button type="button" aria-pressed={activa} onClick={onClick}
      className={`flex min-h-11 min-w-[112px] shrink-0 flex-col gap-0.5 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 lg:min-w-0 lg:gap-1.5 lg:rounded-[14px] lg:p-4 ${ORDEN_CELULAR[t.clave]} ${
        activa ? "border-2 border-brand bg-white" : alerta ? `border ${alerta}` : "border border-slate-200 bg-white hover:border-slate-300"
      }`}>
      <span className={`text-xs font-semibold lg:text-[13px] ${tono.titulo}`}>{t.titulo}</span>
      <span className="text-2xl font-bold tabular-nums text-slate-900 lg:text-[32px] lg:leading-10">{n}</span>
      <span className={`hidden text-xs lg:block ${alerta ? tono.pie : "text-slate-600"}`}>{pieTarjeta(t.clave, resumen)}</span>
    </button>
  );
}

function Renglon({ r, onAbrirDia, debe }) {
  const reg = r.dia.registro;
  const d = describir(r);
  const nombre = nombreDe(reg);
  const horario = r.entradaProg != null ? `${horaDe(r.entradaProg)} – ${horaDe(r.salidaProg)}` : "Sin horario";
  const chip = <span className={`inline-flex shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${CHIP[d.tono]}`}>{d.chip}</span>;
  const textoJornada = d.jornada ? `Jornada: ${d.jornada}` : null;
  return (
    <li className={`relative flex flex-col gap-2 rounded-[14px] border border-slate-200 bg-white p-3.5 lg:rounded-none lg:border-0 lg:border-b lg:border-slate-100 lg:px-5 lg:py-3 lg:last:border-b-0 ${COLUMNAS}`}
      data-estado={r.estado}>
      <div className="flex min-w-0 items-center gap-2.5 lg:gap-3">
        <span aria-hidden="true" className={`grid size-9 shrink-0 place-items-center rounded-full text-[13px] font-bold ${AVATAR[d.tono]}`}>{iniciales(reg)}</span>
        <span className="flex min-w-0 grow flex-col">
          <b data-nombre className="truncate text-[15px] text-slate-900 lg:text-sm">
            <span className="lg:relative lg:z-10"><NombreEmpleado id={reg.id_empleado}>{nombre}</NombreEmpleado></span>
          </b>
          <span className="text-xs text-slate-600">
            {areaDe(reg)}<span className="lg:hidden">{areaDe(reg) ? " · " : ""}{horario}</span>
            {debe > 0 ? <span className="font-semibold text-amber-700"> · debe {formatearMinutos(debe)}</span> : null}
          </span>
        </span>
        <span className="lg:hidden">{chip}</span>
      </div>
      <span className="hidden whitespace-nowrap text-[13px] tabular-nums text-slate-900 lg:block">{horario}</span>
      <span className="hidden lg:block">{chip}</span>
      <span className={`text-[13px] ${TEXTO[d.detalleTono] ?? TEXTO.normal}`}>
        {d.detalle}{d.resaltado ? <> · <b className="text-orange-800">{d.resaltado}</b></> : null}
      </span>
      {d.jornada ? (
        <span className="flex flex-col gap-1">
          <span role="progressbar" aria-label={textoJornada} aria-valuemin={0} aria-valuemax={100} aria-valuenow={d.avance != null ? Math.round(d.avance * 100) : undefined}
            className="block h-1.5 rounded-full bg-slate-200">
            <span className={`block h-1.5 rounded-full ${BARRA[r.estado] ?? "bg-brand"}`} style={{ width: `${Math.round((d.avance ?? 0) * 100)}%` }} />
          </span>
          <span className="hidden text-xs tabular-nums text-slate-600 lg:block">{d.jornada}</span>
        </span>
      ) : <span aria-hidden="true" className="hidden text-[13px] text-slate-400 lg:block">—</span>}
      <button type="button" onClick={() => onAbrirDia?.(reg)} aria-label={`Ver día de ${nombre}`}
        className="absolute inset-0 rounded-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand lg:static lg:inset-auto lg:min-h-11 lg:justify-self-start lg:rounded-md lg:px-1 lg:text-[13px] lg:font-semibold lg:text-blue-700 lg:hover:text-blue-900 lg:hover:underline">
        <span className="hidden lg:inline">Ver día</span>
      </button>
    </li>
  );
}

function Grupo({ g, onAbrirDia, cuentas, plegado, onPlegar }) {
  const urgente = g.clave === "atencion";
  const encabezado = `${g.titulo.toUpperCase()} · ${g.filas.length}`;
  const clase = `text-xs font-bold tracking-[0.04em] lg:px-5 lg:py-2 ${urgente ? "text-orange-800 lg:bg-orange-50" : "text-slate-600 lg:bg-slate-50"}`;
  return (
    <section aria-label={`${g.titulo} (${g.filas.length})`} className="space-y-2 lg:space-y-0 lg:border-t lg:border-slate-200 lg:first:border-t-0">
      {onPlegar ? (
        <h3 className={clase}>
          <button type="button" aria-expanded={!plegado} onClick={onPlegar} className="flex min-h-11 w-full items-center gap-2 text-left lg:min-h-0">
            {encabezado}<span className="font-semibold normal-case tracking-normal text-brand">{plegado ? "Mostrar" : "Ocultar"}</span>
          </button>
        </h3>
      ) : <h3 className={`mt-2 lg:mt-0 ${clase}`}>{encabezado}</h3>}
      {plegado ? null : (
        <ul className="space-y-2 lg:space-y-0">
          {g.filas.map((r) => <Renglon key={r.dia.id} r={r} onAbrirDia={onAbrirDia} debe={Number(cuentas[Number(r.dia.registro.id_empleado)]) || 0} />)}
        </ul>
      )}
    </section>
  );
}

export default function VistaHoy({ registros, zona, cargando, onAbrirDia }) {
  const [reloj, setReloj] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setReloj(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  const [filtro, setFiltro] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [area, setArea] = useState("");
  const [verNoLaboran, setVerNoLaboran] = useState(false);
  const cuentas = useCuentasHoras();

  // Un estado por persona. Cada empresa en su zona: la checada (hora de CDMX en la base) se pasa a la zona de la empresa.
  const resultados = useMemo(() => {
    const porZona = new Map();
    for (const r of registros ?? []) {
      const z = r.zona_horaria || zona;
      if (!porZona.has(z)) porZona.set(z, []);
      const { fechaLocal, horaLocal } = herramientasHoras(r, z);
      porZona.get(z).push({ ...diaDesdeRegistro(r, (v) => `${fechaLocal(v)} ${horaLocal(v)}`), registro: r });
    }
    const salida = [];
    for (const [z, dias] of porZona) {
      const ahora = ahoraEn(z, new Date(reloj));
      for (const d of diasDeHoy(dias, ahora.hoy, ahora.abs)) salida.push(estadoHoy(d, ahora.abs));
    }
    return salida;
  }, [registros, zona, reloj]);

  const areas = useMemo(() => [...new Set(resultados.map((r) => areaDe(r.dia.registro)).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es")), [resultados]);
  const base = useMemo(() => {
    const q = busqueda.trim().normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    return resultados.filter((r) => {
      const reg = r.dia.registro;
      if (area && areaDe(reg) !== area) return false;
      if (!q) return true;
      const texto = [reg.nombre, reg.apellido_paterno, reg.apellido_materno, reg.nip].filter(Boolean).join(" ").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
      return texto.includes(q);
    });
  }, [resultados, busqueda, area]);
  const resumen = useMemo(() => resumenHoy(base), [base]);
  const tarjeta = TARJETAS.find((t) => t.clave === filtro) ?? null;
  const grupos = useMemo(() => agruparHoy(tarjeta ? base.filter(tarjeta.es) : base, (r) => nombreDe(r.dia.registro)), [base, tarjeta]);

  if (cargando && !resultados.length) return <p role="status" className="p-6 text-sm text-slate-500">Cargando quién está hoy…</p>;

  return (
    <section className="space-y-3.5 lg:space-y-5" aria-label="Asistencia de hoy">
      <div role="group" aria-label="Resumen de hoy" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-3 lg:overflow-visible lg:px-0 lg:pb-0 xl:grid-cols-7">
        {TARJETAS.map((t) => (
          <Tarjeta key={t.clave} t={t} n={resumen.cuenta[t.clave]} resumen={resumen} activa={filtro === t.clave}
            onClick={() => setFiltro((f) => (f === t.clave ? null : t.clave))} />
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        <div className="relative sm:w-[340px]">
          <label htmlFor="hoy-buscar" className="sr-only">Buscar empleado</label>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input id="hoy-buscar" type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar empleado…"
            className="h-11 w-full rounded-[10px] border border-slate-300 bg-white pl-9 pr-3.5 text-[15px] text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 lg:text-sm" />
        </div>
        <label htmlFor="hoy-area" className="sr-only">Área</label>
        <select id="hoy-area" value={area} onChange={(e) => setArea(e.target.value)}
          className="h-11 rounded-[10px] border border-slate-300 bg-white px-3 text-[15px] text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 lg:text-sm">
          <option value="">Todas las áreas</option>
          {areas.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <p className="text-[13px] text-slate-600 sm:ml-auto" aria-live="polite">
          Mostrando: <b className="text-slate-900">{tarjeta ? tarjeta.titulo : "Todos"}</b>
          {tarjeta ? <> · <button type="button" onClick={() => setFiltro(null)} className="min-h-11 font-semibold text-blue-700 hover:underline lg:min-h-0">ver todos</button></> : " · lo urgente primero"}
        </p>
      </div>

      <div aria-label="Empleados de hoy" role="region" className="lg:overflow-hidden lg:rounded-2xl lg:border lg:border-slate-200 lg:bg-white">
        <div aria-hidden="true" className={`hidden border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-[0.04em] text-slate-600 ${COLUMNAS}`}>
          <span>Empleado</span><span>Horario</span><span>Estado</span><span>Checada real</span><span>Jornada</span><span />
        </div>
        {grupos.length ? (
          <div className="space-y-2 lg:space-y-0">
            {grupos.map((g) => (
              <Grupo key={g.clave} g={g} onAbrirDia={onAbrirDia} cuentas={cuentas}
                plegado={g.clave === "no_laboran" && !verNoLaboran}
                onPlegar={g.clave === "no_laboran" ? () => setVerNoLaboran((v) => !v) : null} />
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
