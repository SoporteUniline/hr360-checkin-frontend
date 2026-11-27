"use client";
// «Para quién» del redactor: toda la empresa o una combinación de sucursales, áreas, puestos y personas, con el conteo en
// vivo de GET /checador/comunicados/audiencia/previa. Sucursal, área y puesto se combinan (Y) y las personas se suman (O),
// igual que el servidor. Catálogos: los de la empresa (sucursales, departamentos, puestos, empleados activos).
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Plus, X } from "lucide-react";
import { Ventana } from "@/components/avisos/Ventana";
import { API, GRUPOS_AUDIENCIA, audienciaElegida, errorDe, audienciaParaEnviar, chipsAudiencia, textoPrevia } from "@/lib/comunicados/comunicados.mjs";
import { Interruptor, botonPrimario, botonSecundario, entrada, get, opcionesSwr } from "./comun";

const nombres = (l) => (Array.isArray(l) ? l : []).map((x) => String(typeof x === "object" ? x?.nombre ?? "" : x ?? "").trim()).filter(Boolean).map((nombre, i) => ({ id: i + 1, nombre }));
const sinAcentos = (t) => String(t ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const MAX_PERSONAS = 60;

/** Hook de la vista previa: { previa, cargando } con espera de 400 ms al cambiar. */
export function usePreviaAudiencia(audiencia, empresa) {
  const clave = JSON.stringify(audienciaParaEnviar(audiencia));
  const [estable, setEstable] = useState(clave);
  useEffect(() => { const t = setTimeout(() => setEstable(clave), 400); return () => clearTimeout(t); }, [clave]);
  // Se pregunta con la audiencia ya «estable» (sin pedir la anterior mientras se escribe o se elige).
  const elegida = audienciaElegida(JSON.parse(estable));
  const url = elegida ? `${API}/audiencia/previa?audiencia=${encodeURIComponent(estable)}${empresa ? `&empresa=${empresa}` : ""}` : null;
  const { data, isLoading } = useSWR(url, get, { ...opcionesSwr, keepPreviousData: true });
  return { previa: audienciaElegida(audiencia) && elegida ? data : null, cargando: isLoading || estable !== clave };
}

function Elegir({ abierta, alCerrar, audiencia, alCambiar, empresa }) {
  const [grupo, setGrupo] = useState("sucursales");
  const [buscar, setBuscar] = useState("");
  // GET /audiencia/opciones: los valores tal cual en las fichas (sucursal, área, puesto) y las personas activas
  // (acotado a su equipo si es jefe).
  const { data, isLoading, error } = useSWR(abierta && empresa ? `${API}/audiencia/opciones?empresa=${empresa}` : null, get, opcionesSwr);
  const opciones = useMemo(() => ({
    sucursales: nombres(data?.sucursales), areas: nombres(data?.areas), puestos: nombres(data?.puestos),
    empleados: (Array.isArray(data?.empleados) ? data.empleados : []).map((e) => ({ id: Number(e.id), nombre: String(e.nombre ?? "").trim(), detalle: [e.puesto, e.sucursal].filter(Boolean).join(" · ") })).filter((e) => e.id && e.nombre),
  }), [data]);
  const filtro = sinAcentos(buscar.trim());
  const coinciden = opciones[grupo].filter((o) => !filtro || sinAcentos(`${o.nombre} ${o.detalle ?? ""}`).includes(filtro));
  const visibles = coinciden.slice(0, grupo === "empleados" ? MAX_PERSONAS : coinciden.length);
  const cargando = isLoading;
  const elegido = (o) => (audiencia[grupo] ?? []).some((x) => (grupo === "empleados" ? x.id === o.id : x.nombre.toLowerCase() === o.nombre.toLowerCase()));
  const alternar = (o) => {
    const actual = audiencia[grupo] ?? [];
    const sigue = elegido(o) ? actual.filter((x) => (grupo === "empleados" ? x.id !== o.id : x.nombre.toLowerCase() !== o.nombre.toLowerCase())) : [...actual, o];
    alCambiar({ ...audiencia, todos: false, [grupo]: sigue });
  };
  return (
    <Ventana abierta={abierta} onOpenChange={(o) => !o && alCerrar()} titulo="Elegir para quién" descripcion="Sucursal, área y puesto se combinan (deben cumplirse todos). Las personas elegidas se suman." className="sm:max-w-lg" hoja={false}>
      <div className="grid min-h-0 gap-3 overflow-y-auto px-4 pb-5 pt-3 sm:px-6" data-elegir-audiencia>
        <div role="tablist" aria-label="Grupo" className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {GRUPOS_AUDIENCIA.map((g) => (
            <button key={g.clave} type="button" role="tab" aria-selected={grupo === g.clave} onClick={() => { setGrupo(g.clave); setBuscar(""); }}
              className={`min-h-11 rounded-lg px-2 text-sm font-semibold ${grupo === g.clave ? "bg-[#2563EB] text-white" : "border border-slate-300 bg-white text-slate-700"}`}>
              {g.plural}{audiencia[g.clave]?.length ? ` (${audiencia[g.clave].length})` : ""}
            </button>
          ))}
        </div>
        <label htmlFor="buscar-audiencia" className="sr-only">Buscar</label>
        <input id="buscar-audiencia" type="search" className={entrada} placeholder={grupo === "empleados" ? "Buscar por nombre, puesto o sucursal" : "Filtrar"} value={buscar} onChange={(e) => setBuscar(e.target.value)} />
        <ul role="tabpanel" aria-label={GRUPOS_AUDIENCIA.find((g) => g.clave === grupo)?.plural} className="grid max-h-[46dvh] gap-0.5 overflow-y-auto">
          {cargando && !visibles.length ? <li role="status" className="p-3 text-sm text-slate-500">Cargando…</li> : null}
          {error ? <li role="alert" className="p-3 text-sm text-red-700">{errorDe(error, "No se pudieron cargar las opciones.")}</li> : null}
          {!cargando && !error && !visibles.length ? <li className="p-3 text-sm text-slate-500">Sin resultados.</li> : null}
          {visibles.map((o) => (
            <li key={`${o.id}-${o.nombre}`}>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-slate-50">
                <input type="checkbox" className="size-5 accent-[#2563EB]" checked={elegido(o)} onChange={() => alternar(o)} />
                <span className="min-w-0"><span className="block text-sm text-slate-900">{o.nombre}</span>{o.detalle ? <span className="block text-[13px] text-slate-500">{o.detalle}</span> : null}</span>
              </label>
            </li>
          ))}
        </ul>
        {coinciden.length > visibles.length ? <p className="text-[13px] text-slate-500">Se muestran {visibles.length} de {coinciden.length}: escribe para buscar.</p> : null}
        <div className="flex justify-end"><button type="button" className={botonPrimario} onClick={alCerrar}>Listo</button></div>
      </div>
    </Ventana>
  );
}

export default function SelectorAudiencia({ audiencia, alCambiar, empresa, previa, cargando, error }) {
  const [abierta, setAbierta] = useState(false);
  const chips = chipsAudiencia(audiencia);
  const quitar = (c) => alCambiar(c.grupo === "todos" ? { ...audiencia, todos: false } : { ...audiencia, [c.grupo]: audiencia[c.grupo].filter((x) => (c.grupo === "empleados" ? x.id !== c.id : x.nombre !== c.nombre)) });
  return (
    <div className="grid gap-2" data-audiencia>
      <Interruptor id="aud-todos" checked={audiencia.todos} onChange={(v) => alCambiar({ ...audiencia, todos: v })} etiqueta="Toda la empresa" descripcion="Todos los empleados activos" />
      {!audiencia.todos ? (
        <div className="flex flex-wrap items-center gap-2" aria-describedby={error ? "aud-error" : undefined}>
          {chips.map((c) => (
            <span key={`${c.grupo}-${c.id}-${c.texto}`} className="inline-flex min-h-11 items-center gap-1 rounded-full bg-blue-50 pl-3 text-sm font-semibold text-blue-800">
              {c.texto}
              <button type="button" aria-label={`Quitar ${c.texto}`} onClick={() => quitar(c)} className="grid size-11 place-items-center rounded-full hover:bg-blue-100"><X className="size-4" aria-hidden="true" /></button>
            </span>
          ))}
          <button type="button" className={botonSecundario} onClick={() => setAbierta(true)} disabled={!empresa}><Plus className="size-4" aria-hidden="true" />Área, puesto, sucursal o persona</button>
        </div>
      ) : null}
      {error ? <span id="aud-error" className="text-[13px] text-red-700">{error}</span> : null}
      <p className="text-[13px] font-semibold text-slate-700" aria-live="polite" data-previa>
        {previa ? textoPrevia(previa) : cargando ? "Contando…" : "Elige a quién le llega para ver cuántas personas son."}
      </p>
      <Elegir abierta={abierta} alCerrar={() => setAbierta(false)} audiencia={audiencia} alCambiar={alCambiar} empresa={empresa} />
    </div>
  );
}
