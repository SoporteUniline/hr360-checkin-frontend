"use client";

// Asistencias → En vivo (22/11/2026, pedido del dueño): a esta hora, quién está por entrar (y quién va tarde), quién está en
// jornada, quién sale pronto (o ya debía salir), quién ya salió o no vino, y cuánto tiempo debe cada quien (cuenta de horas).
// Usa los registros de ayer y hoy que ya cargó Asistencias (se actualizan con cada checada) y se recalcula cada minuto.
// Clic en la persona: su ficha; clic en el renglón: la ventana de edición de su día.
import { useEffect, useMemo, useState } from "react";
import { herramientasHoras } from "@/lib/asistencia/horasEdicion.mjs";
import { aMinutos, clasificarEnVivo, relativo } from "@/lib/asistencia/enVivo.mjs";
import { hora12 } from "@/lib/hora12.mjs";
import { NombreEmpleado } from "@/components/empleado/FichaEmpleado";
import { useCuentasHoras } from "./CuentaHorasContext";

const hoyEn = (zona, d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: zona }).format(d);
const minutosAhora = (zona) => {
  const [h, m] = new Intl.DateTimeFormat("en-GB", { timeZone: zona, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()).split(":").map(Number);
  return (h % 24) * 60 + m;
};
const duracion = (min) => { const a = Math.round(min); return a < 60 ? `${a} min` : `${Math.floor(a / 60)} h${a % 60 ? ` ${a % 60} min` : ""}`; };
const nombre = (r) => [r.nombre, r.apellido_paterno].filter(Boolean).join(" ");
const aHora = (min) => (min == null ? "" : hora12(`${String(Math.floor((min % 1440) / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`));

// Por persona: el turno de ayer si sigue abierto y cruza la medianoche; si no, el de hoy.
function filasDe(registros, zonaEmpresa) {
  const porPersona = new Map();
  for (const r of registros) {
    const zona = r.zona_horaria || zonaEmpresa;
    const fecha = String(r.fecha ?? "").slice(0, 10);
    const hoy = hoyEn(zona);
    const { horaLocal } = herramientasHoras(r, zona);
    const entradaProg = aMinutos(r.hora_entrada_programada);
    const salidaProg = aMinutos(r.hora_salida_programada);
    const fila = {
      id: r.id ?? `${r.id_empleado}-${fecha}`, registro: r, nombre: nombre(r), detalle: [r.puesto, r.departamento].filter(Boolean).join(" · "),
      entradaProg, salidaProg, entrada: aMinutos(horaLocal(r.entrada)), salida: aMinutos(horaLocal(r.salida)),
      descanso: /descanso|vacacion|incapacidad/i.test(r.tipo_registro_nombre ?? ""),
      llegaHasta: r.permiso_horas?.tipo_horas === "llega_tarde" ? aMinutos(r.permiso_horas.hora_fin) : null,
    };
    const nocturnoAbierto = fecha < hoy && fila.entrada != null && fila.salida == null && entradaProg != null && salidaProg != null && salidaProg <= entradaProg;
    if (fecha === hoy || nocturnoAbierto) {
      const previo = porPersona.get(r.id_empleado);
      if (!previo || nocturnoAbierto) porPersona.set(r.id_empleado, fila);
    }
  }
  return [...porPersona.values()];
}

function Columna({ titulo, color, vacio, children, n }) {
  return (
    <section className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white" aria-label={titulo}>
      <h3 className="flex items-center gap-2 border-b border-slate-100 px-3.5 py-2.5 text-[12px] font-bold uppercase tracking-[0.06em] text-slate-600">
        <span className="size-2 rounded-[3px]" style={{ backgroundColor: color }} /> {titulo} <b className="ml-auto text-sm tabular-nums text-[#080d36]">{n}</b>
      </h3>
      <ul className="divide-y divide-slate-100">{children}</ul>
      {!n ? <p className="px-3.5 py-4 text-[12.5px] text-slate-400">{vacio}</p> : null}
    </section>
  );
}

function Persona({ f, onAbrir, derecha, nota, tono = "text-slate-500" }) {
  return (
    <li>
      <div role="button" tabIndex={0} onClick={(e) => { if (!e.target.closest("a")) onAbrir?.(f.registro); }} onKeyDown={(e) => e.key === "Enter" && onAbrir?.(f.registro)}
        className="flex cursor-pointer items-start justify-between gap-3 px-3.5 py-2.5 hover:bg-blue-50/40">
        <span className="min-w-0">
          <span className="block font-semibold text-[#080d36]"><NombreEmpleado id={f.registro.id_empleado}>{f.nombre}</NombreEmpleado></span>
          {f.detalle ? <span className="block truncate text-[11.5px] text-slate-500">{f.detalle}</span> : null}
          {nota ? <span className={`block text-[11.5px] font-semibold ${tono}`}>{nota}</span> : null}
        </span>
        <span className="shrink-0 text-right text-[12px] tabular-nums text-slate-600">{derecha}</span>
      </div>
    </li>
  );
}

function Plegable({ titulo, filas, render }) {
  if (!filas.length) return null;
  return (
    <details className="rounded-xl border border-slate-200 bg-white">
      <summary className="cursor-pointer px-3.5 py-2.5 text-[13px] font-semibold text-slate-700">{titulo} <span className="tabular-nums text-slate-400">({filas.length})</span></summary>
      <ul className="divide-y divide-slate-100 border-t border-slate-100">{filas.map(render)}</ul>
    </details>
  );
}

export default function VistaEnVivo({ registros, zona, cargando, onAbrirDia }) {
  const [ahora, setAhora] = useState(() => minutosAhora(zona));
  useEffect(() => {
    setAhora(minutosAhora(zona));
    const t = setInterval(() => setAhora(minutosAhora(zona)), 30000);
    return () => clearInterval(t);
  }, [zona]);
  const filas = useMemo(() => filasDe(registros ?? [], zona), [registros, zona]);
  const g = useMemo(() => clasificarEnVivo(filas, ahora), [filas, ahora]);
  const cuentas = useCuentasHoras();
  const deben = useMemo(() => {
    const porId = new Map(filas.map((f) => [Number(f.registro.id_empleado), f]));
    return Object.entries(cuentas).map(([id, min]) => ({ f: porId.get(Number(id)), min: Number(min) })).filter((x) => x.f && x.min > 0).sort((a, b) => b.min - a.min);
  }, [cuentas, filas]);

  if (cargando && !filas.length) return <p role="status" className="p-6 text-sm text-slate-500">Cargando quién está hoy…</p>;

  const resumen = [
    ["#2563eb", "Por entrar", g.porEntrar.length],
    ["#f59e0b", "Van tarde", g.tarde.length],
    ["#10b981", "En jornada", g.enJornada.length + g.porSalir.length + g.debioSalir.length],
    ["#7c3aed", "Salen pronto", g.porSalir.length],
    ["#64748b", "Ya salieron", g.salieron.length],
    ["#f43f5e", "No vinieron", g.noVino.length],
  ];

  return (
    <section className="space-y-4" aria-label="Asistencia en vivo">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
        <span className="text-[12px] font-semibold text-slate-500">Ahora {aHora(ahora)}</span>
        {resumen.map(([color, t, n]) => (
          <span key={t} className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600">
            <span className="h-2 w-2 rounded-[3px]" style={{ backgroundColor: color }} />{t} <b className="font-extrabold tabular-nums text-gray-900">{n}</b>
          </span>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Columna titulo="Por entrar" color="#2563eb" n={g.tarde.length + g.porEntrar.length} vacio="Nadie entra en la próxima hora.">
          {g.tarde.map((f) => <Persona key={f.id} f={f} onAbrir={onAbrirDia} nota={`Va tarde · ${duracion(-f.faltan)}`} tono="text-amber-700" derecha={`Entra ${aHora(f.llegaHasta ?? f.entradaProg)}`} />)}
          {g.porEntrar.map((f) => <Persona key={f.id} f={f} onAbrir={onAbrirDia} nota={relativo(f.faltan)} tono="text-brand" derecha={`Entra ${aHora(f.llegaHasta ?? f.entradaProg)}`} />)}
        </Columna>
        <Columna titulo="En jornada" color="#10b981" n={g.enJornada.length} vacio="Nadie en jornada por ahora.">
          {g.enJornada.map((f) => <Persona key={f.id} f={f} onAbrir={onAbrirDia} nota={f.faltan != null ? `Sale ${relativo(f.faltan)}` : "Sin horario"} derecha={<>Entró {aHora(f.entrada)}{f.salidaProg != null ? <span className="block text-slate-400">sale {aHora(f.salidaProg)}</span> : null}</>} />)}
        </Columna>
        <Columna titulo="Por salir" color="#7c3aed" n={g.porSalir.length + g.debioSalir.length} vacio="Nadie sale en la próxima hora.">
          {g.debioSalir.map((f) => <Persona key={f.id} f={f} onAbrir={onAbrirDia} nota={`No ha checado salida · ${relativo(f.faltan)}`} tono="text-red-700" derecha={`Salía ${aHora(f.salidaProg)}`} />)}
          {g.porSalir.map((f) => <Persona key={f.id} f={f} onAbrir={onAbrirDia} nota={`Sale ${relativo(f.faltan)}`} tono="text-violet-700" derecha={`Sale ${aHora(f.salidaProg)}`} />)}
        </Columna>
        <Columna titulo="Debe tiempo" color="#f59e0b" n={deben.length} vacio="Nadie debe tiempo de permisos por horas.">
          {deben.map(({ f, min }) => <Persona key={f.id} f={f} onAbrir={onAbrirDia} nota="Por permisos que se reponen" derecha={<b className="text-amber-700">{duracion(min)}</b>} />)}
        </Columna>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Plegable titulo="No vinieron" filas={g.noVino} render={(f) => <Persona key={f.id} f={f} onAbrir={onAbrirDia} nota="Su horario ya terminó y no checó" tono="text-red-700" derecha={`${aHora(f.entradaProg)}–${aHora(f.salidaProg)}`} />} />
        <Plegable titulo="Ya salieron" filas={g.salieron} render={(f) => <Persona key={f.id} f={f} onAbrir={onAbrirDia} derecha={`${aHora(f.entrada)}–${aHora(f.salida)}`} />} />
        <Plegable titulo="Entran más tarde" filas={g.masTarde} render={(f) => <Persona key={f.id} f={f} onAbrir={onAbrirDia} nota={relativo(f.faltan)} derecha={`Entra ${aHora(f.entradaProg)}`} />} />
        <Plegable titulo="Descanso o sin horario hoy" filas={g.descanso} render={(f) => <Persona key={f.id} f={f} onAbrir={onAbrirDia} derecha={f.registro.tipo_registro_nombre ?? "Sin horario"} />} />
      </div>
    </section>
  );
}
