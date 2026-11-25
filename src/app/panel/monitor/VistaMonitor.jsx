"use client";

// Monitor (maquetas aprobadas Main.dc.html y MovilMonitor.dc.html): contadores-filtro, búsqueda y área comunes a las dos
// vistas (`vista`): «Tabla» (TablaHoy.jsx, por defecto) y «Línea del día» (LineaDia.jsx), que reciben las mismas
// personas filtradas. Contadores = filtros (tocar otra vez lo quita); textos en src/lib/asistencia/tablero.mjs (contadores)
// y vistasMonitor.mjs (grupos y frases) sobre los estados de hoy.mjs. Tocar una persona abre el reloj del día
// (`onAbrirDia`); su nombre abre la ficha. La hora se recalcula cada 30 s; los datos se refrescan con cada checada
// (página del Monitor). Celular: contadores con desplazamiento lateral (lo urgente primero); nada más se desplaza a lo ancho.
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { herramientasHoras } from "@/lib/asistencia/horasEdicion.mjs";
import { ahoraEn, diaDesdeRegistro, diasDeHoy, estadoHoy } from "@/lib/asistencia/hoy.mjs";
import { contadorTablero, CONTADORES_TABLERO, resumenTablero } from "@/lib/asistencia/tablero.mjs";
import { gruposTabla, ordenUrgencia } from "@/lib/asistencia/vistasMonitor.mjs";
import { ICONO_CONCEPTO, ICONO_ROL } from "@/components/asistencia/iconosAsistencia";
import { useCuentasHoras } from "@/app/panel/registro-asistencia/CuentaHorasContext";
import { cn } from "@/lib/utils";
import { areaDe, nombreDe } from "./comunes";
import LineaDia from "./LineaDia";
import TablaHoy from "./TablaHoy";

const sinAcentos = (v) =>
  String(v ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
// Iconos y colores de los contadores: los de los desplegables de Asistencias (iconosAsistencia.js).
const ICONO = {
  por_entrar: ICONO_ROL.sistema,
  trabajando: ICONO_CONCEPTO.jornada,
  comida: ICONO_CONCEPTO.comida,
  salio: ICONO_ROL.salida,
  no_ha_llegado: ICONO_ROL.inasistencia,
  tarde: ICONO_ROL.entrada,
  permiso: ICONO_ROL.ley,
};
const TITULO = {
  por_entrar: "text-slate-700",
  trabajando: "text-blue-700",
  comida: "text-yellow-800",
  salio: "text-slate-600",
  no_ha_llegado: "text-red-700",
  tarde: "text-orange-800",
  permiso: "text-violet-700",
};
// Celular: contadores con lo urgente primero (en escritorio, el orden de la maqueta).
const ORDEN_CONTADOR = {
  no_ha_llegado: "max-lg:order-1",
  comida: "max-lg:order-2",
  tarde: "max-lg:order-3",
  trabajando: "max-lg:order-4",
  por_entrar: "max-lg:order-5",
  salio: "max-lg:order-6",
  permiso: "max-lg:order-7",
};
const porNombre = (r) => nombreDe(r.dia.registro);
const CAMPO =
  "h-11 rounded-[10px] border border-slate-300 bg-white text-[15px] text-slate-900 focus:border-brand focus:outline-none " +
  "focus:ring-2 focus:ring-brand/30 lg:h-10 lg:text-sm";

function Icono({ clave }) {
  const { icono: I, tono } = ICONO[clave];
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex size-5 shrink-0 items-center justify-center rounded-md", tono)}
    >
      <I className="size-3" strokeWidth={2.2} />
    </span>
  );
}

function Contador({ c, dato, activo, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={onClick}
      data-contador={c.clave}
      className={cn(
        "flex min-h-11 w-[138px] shrink-0 flex-col gap-0.5 rounded-[14px] px-3 py-2.5 text-left transition-colors lg:w-auto lg:min-w-0 lg:px-3.5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
        ORDEN_CONTADOR[c.clave],
        activo
          ? "border-2 border-brand bg-white"
          : dato.alerta
          ? "border border-red-300 bg-red-50"
          : "border border-slate-200 bg-white hover:border-slate-300"
      )}
    >
      <span className={cn("flex items-center gap-1.5 text-[12.5px] font-semibold leading-tight", TITULO[c.clave])}>
        <Icono clave={c.clave} />
        {c.titulo}
      </span>
      <span data-n className="text-[26px] font-bold leading-tight tabular-nums text-slate-900">
        {dato.n}
      </span>
      <span className={cn("text-[11.5px] leading-snug", dato.alerta ? "text-red-800" : "text-slate-600")}>{dato.pie}</span>
    </button>
  );
}

function SinNadie({ filtro }) {
  return (
    <p className="rounded-[14px] border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-600">
      Nadie en «{filtro?.titulo}» con estos filtros.
    </p>
  );
}

// Un estado por persona. Cada empresa en su zona: la checada (hora de CDMX en la base) se pasa a la zona de la empresa.
// `ahora` (minutos absolutos de su zona) va en cada resultado para los textos (hora extra, «debía entrar hace…»).
function estadosDeHoy(registros, zona, ahoraMs) {
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
    for (const d of diasDeHoy(dias, ahora.hoy, ahora.abs)) salida.push({ ...estadoHoy(d, ahora.abs), ahora: ahora.abs });
  }
  return salida;
}

export default function VistaMonitor({ registros, zona, cargando, onAbrirDia, vista = "tabla" }) {
  const [reloj, setReloj] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setReloj(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  const [filtro, setFiltro] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [area, setArea] = useState("");
  const cuentas = useCuentasHoras();

  const resultados = useMemo(() => estadosDeHoy(registros, zona, reloj), [registros, zona, reloj]);
  const areas = useMemo(
    () => [...new Set(resultados.map((r) => areaDe(r.dia.registro)).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es")),
    [resultados]
  );
  const base = useMemo(() => {
    const q = sinAcentos(busqueda.trim());
    return resultados.filter((r) => {
      const reg = r.dia.registro;
      if (area && areaDe(reg) !== area) return false;
      return !q || sinAcentos([reg.nombre, reg.apellido_paterno, reg.apellido_materno, reg.nip].filter(Boolean).join(" ")).includes(q);
    });
  }, [resultados, busqueda, area]);
  const resumen = useMemo(() => resumenTablero(base), [base]);
  const activo = contadorTablero(filtro);
  const visibles = useMemo(() => (activo ? base.filter(activo.es) : base), [base, activo]);
  // Tabla: grupos del más urgente al menos. Línea: las mismas personas, una fila cada una, en el orden de urgencia.
  const grupos = useMemo(() => (vista === "linea" ? [] : gruposTabla(visibles, porNombre)), [visibles, vista]);
  const filas = useMemo(() => (vista === "linea" ? ordenUrgencia(visibles, porNombre) : []), [visibles, vista]);

  if (cargando && !resultados.length)
    return (
      <p role="status" className="p-6 text-sm text-slate-500">
        Cargando quién está hoy…
      </p>
    );

  return (
    <section className="space-y-3.5 lg:space-y-4" aria-label="Asistencia de hoy">
      <div
        role="group"
        aria-label="Contadores de hoy"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-2.5 lg:overflow-visible lg:px-0 lg:pb-0 xl:grid-cols-7"
      >
        {CONTADORES_TABLERO.map((c) => (
          <Contador
            key={c.clave}
            c={c}
            dato={resumen[c.clave]}
            activo={filtro === c.clave}
            onClick={() => setFiltro((f) => (f === c.clave ? null : c.clave))}
          />
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        <div className="relative sm:w-[300px]">
          <label htmlFor="monitor-buscar" className="sr-only">
            Buscar empleado
          </label>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            id="monitor-buscar"
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar persona…"
            className={cn(CAMPO, "w-full pl-9 pr-3.5 placeholder:text-slate-400")}
          />
        </div>
        <label htmlFor="monitor-area" className="sr-only">
          Área
        </label>
        <select id="monitor-area" value={area} onChange={(e) => setArea(e.target.value)} className={cn(CAMPO, "px-3")}>
          <option value="">Todas las áreas</option>
          {areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <p data-filtro className="text-[13px] text-slate-600" aria-live="polite">
          {activo ? (
            <>
              Filtrando: <b className="text-slate-900">{activo.titulo}</b> · toca de nuevo la tarjeta para quitarlo ·{" "}
              <button
                type="button"
                onClick={() => setFiltro(null)}
                className="min-h-11 font-semibold text-blue-700 hover:underline lg:min-h-0"
              >
                ver todos
              </button>
            </>
          ) : (
            `${base.length} ${base.length === 1 ? "persona" : "personas"} hoy`
          )}
        </p>
        <p className="text-[13px] text-slate-500 sm:ml-auto">Toca una persona para abrir su reloj del día</p>
      </div>

      {!base.length ? null : vista === "linea" ? (
        filas.length ? (
          <LineaDia personas={filas} todos={resultados} onAbrirDia={onAbrirDia} />
        ) : (
          <SinNadie filtro={activo} />
        )
      ) : grupos.length ? (
        <TablaHoy grupos={grupos} cuentas={cuentas} onAbrirDia={onAbrirDia} />
      ) : (
        <SinNadie filtro={activo} />
      )}
      {base.length ? null : (
        <p className="rounded-[14px] border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-600">
          {busqueda || area ? "Nadie coincide con la búsqueda." : "No hay empleados con registro para hoy."}
        </p>
      )}
    </section>
  );
}
