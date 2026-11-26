"use client";

// Catálogo del sistema: las plantillas que el código de ADAMIA manda, comparadas con Zernio (falta / difiere / coincide)
// y el botón «Enviar a aprobación las que faltan» (el servidor vuelve a revisar Zernio: no duplica).
import { useState } from "react";
import { ChevronDown, Loader2, Plus, Send, TriangleAlert } from "lucide-react";
import { chipEstado, chipSituacion, faltantes, resumenEnvio, textoCategoria } from "@/lib/whatsapp/plantillasMeta.mjs";
import BurbujaWhatsapp from "./BurbujaWhatsapp";
import { boton, botonSec, caja, chip } from "./estilos";

function Kpi({ titulo, valor, tono = "text-slate-900" }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
      <p className="truncate text-[13px] font-semibold text-slate-500">{titulo}</p>
      <p className={`text-xl font-extrabold tabular-nums ${tono}`}>{valor}</p>
    </div>
  );
}

function Fila({ f, alCrear }) {
  const [abierta, setAbierta] = useState(false);
  const s = chipSituacion(f.situacion);
  const e = f.zernio ? chipEstado(f.zernio.estado) : null;
  const c = f.catalogo;
  return (
    <li data-fila-catalogo={f.nombre} data-situacion={f.situacion} className="min-w-0 rounded-xl border border-slate-200 p-3">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-all text-sm font-bold text-slate-900">{f.nombre}</p>
          <p className="text-[13px] text-slate-600">{c.descripcion} · {textoCategoria(f.categoria)} · {f.idioma}{c.sugerida ? " · nombre sugerido" : ""}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className={`${chip} ${s.tono}`}>{s.texto}</span>
          {e && f.situacion !== "falta" ? <span className={`${chip} ${e.tono}`}>Meta: {e.texto}</span> : null}
        </div>
      </div>
      {f.diferencias.length ? <ul className="mt-2 grid gap-1 text-[13px] text-amber-800">{f.diferencias.map((d) => <li key={d.campo} className="flex gap-1.5"><TriangleAlert className="mt-0.5 size-4 shrink-0" />{d.mensaje}</li>)}</ul> : null}
      {f.avisos.length ? <ul className="mt-2 grid gap-1 text-[13px] text-slate-600">{f.avisos.map((a) => <li key={a}>{a}</li>)}</ul> : null}
      {f.zernio?.motivo_rechazo ? <p className="mt-2 text-[13px] text-red-700">Motivo de Meta: {f.zernio.motivo_rechazo}</p> : null}
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className={botonSec} aria-expanded={abierta} onClick={() => setAbierta((v) => !v)}>
          <ChevronDown className={`size-4 transition-transform ${abierta ? "rotate-180" : ""}`} /> {abierta ? "Ocultar texto" : "Ver texto y variables"}
        </button>
        {f.situacion === "falta" ? <button type="button" className={botonSec} onClick={() => alCrear(f)}><Plus className="size-4" /> Revisar y crear</button> : null}
      </div>
      {abierta ? (
        <div className="mt-3 grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 text-[13px] text-slate-700">
            <p className="font-semibold">Variables que manda el código (en orden)</p>
            <ol className="mt-1 grid gap-0.5">{c.variables.map((v, i) => <li key={i} className="break-words"><span className="font-semibold tabular-nums">{`{{${i + 1}}}`}</span> {v} · ej. «{c.ejemplos[i]}»</li>)}</ol>
            <p className="mt-2">Módulo: {c.modulo}{c.version ? ` · versión ${c.version}` : ""} · {c.doc}</p>
            {f.diferencias.some((d) => d.campo === "texto") ? <p className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-amber-50 p-2">En Zernio: {f.zernio.cuerpo}</p> : null}
          </div>
          <BurbujaWhatsapp plantilla={{ ...c }} titulo="Texto del sistema" />
        </div>
      ) : null}
    </li>
  );
}

export default function CatalogoSistema({ data, error, cargando, enviando, resultado, alEnviarFaltantes, alCrear }) {
  if (cargando) return <p role="status" className="text-sm text-slate-500">Revisando el catálogo contra Zernio…</p>;
  if (error) return <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>;
  if (!data) return null;
  const r = data.resumen;
  const nFaltan = faltantes(data.filas).length;
  const modulos = [...new Set(data.filas.map((f) => f.catalogo.modulo))];
  return (
    <section data-catalogo-sistema aria-labelledby="titulo-catalogo" className={`${caja} grid min-w-0 gap-4`}>
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="titulo-catalogo" className="text-[15px] font-bold text-slate-900">Catálogo del sistema</h2>
          <p className="text-[13px] text-slate-600">Las plantillas que ADAMIA manda desde el código. Deben existir aprobadas con el mismo nombre, idioma y número de variables.</p>
        </div>
        <button type="button" data-enviar-faltantes className={`${boton} w-full sm:w-auto`} disabled={!nFaltan || enviando} onClick={alEnviarFaltantes}>
          {enviando ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Enviar a aprobación las que faltan ({nFaltan})
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kpi titulo="Faltan" valor={r.faltan} tono={r.faltan ? "text-red-700" : "text-slate-900"} />
        <Kpi titulo="Difieren" valor={r.difieren} tono={r.difieren ? "text-amber-700" : "text-slate-900"} />
        <Kpi titulo="Coinciden" valor={r.coinciden} />
        <Kpi titulo="Aprobadas y listas" valor={`${r.aprobadas} / ${r.total}`} tono="text-emerald-700" />
      </div>
      {Object.entries(data.errores_cuenta ?? {}).map(([k, m]) => (
        <p key={k} role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-800">Cuenta «{k}»: {m}</p>
      ))}
      {resultado ? (
        <div role="status" data-resultado-envio className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-[13px] text-blue-900">
          <p className="font-semibold">{resumenEnvio(resultado)}</p>
          {resultado.errores?.length ? <ul className="mt-1 grid gap-0.5 text-red-700">{resultado.errores.map((x) => <li key={x.nombre} className="break-words">{x.nombre}: {x.error}</li>)}</ul> : null}
          {resultado.creadas?.length ? <p className="mt-1">Meta tarda hasta 24 h en revisarlas; usa «Actualizar» para ver su estado.</p> : null}
        </div>
      ) : null}
      {modulos.map((m) => (
        <div key={m} className="grid min-w-0 gap-2">
          <h3 className="text-sm font-bold text-slate-700">{m}</h3>
          <ul className="grid min-w-0 gap-2">{data.filas.filter((f) => f.catalogo.modulo === m).map((f) => <Fila key={`${f.cuenta}:${f.nombre}`} f={f} alCrear={alCrear} />)}</ul>
        </div>
      ))}
      <p className="text-[13px] text-slate-500">
        «Difiere» no se arregla sola: si es el idioma o las variables, crea una versión nueva (…_v2) y cambia el nombre en el código. Las de reclutamiento son sugeridas: cada empresa pone el nombre en «Ajustes de agenda».
      </p>
    </section>
  );
}
