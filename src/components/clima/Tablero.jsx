"use client";

// Resultados de clima (dashboard aprobado 25/11/2026, maqueta Main.dc.html): aviso de confianza, KPIs (% favorable,
// eNPS, participación, NOM-035), dimensiones contra la empresa y la medición anterior, lectura por reglas, pregunta por
// pregunta, participación por área, plan de acción, comentarios y evolución. Todo sale agregado del servidor; los
// gráficos son SVG/CSS con role="img" y texto alterno. Adamia AI llega por `extra`.
import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Download, Info, Plus } from "lucide-react";
import axios from "@/lib/axios";
import { descargar } from "@/components/nomina/comun";
import {
  COLOR,
  META_PARTICIPACION,
  NIVELES,
  anillo,
  colorFavorable,
  detalleEnps,
  etiquetaFavorabilidad,
  fechaCorta,
  filasDimensiones,
  fmtEnps,
  fmtUno,
  lineaEvolucion,
  mapaFavorable,
  preguntasOrdenadas,
  resumenComentarios,
  segmentosEnps,
  segmentosFavorabilidad,
  sugerenciaSiguiente,
  textoConfianza,
  textoParticipacion,
  tonoEnps,
  vsAnterior,
} from "@/lib/clima/modelo.mjs";
import { Boton, Cargando, ChipEstado, Tarjeta, Vacio, errorDe, get, ruta } from "./ui";
import PlanAccion from "./PlanAccion";

const TARJETA = "min-w-0 rounded-[18px] border border-slate-200 bg-white";
const PREGUNTAS_VISIBLES = 8;

// Barra apilada de segmentos { pct, color } con texto alterno.
function Barra({ segmentos, etiqueta, alto = "h-3", redondeo = "rounded-full", className = "" }) {
  return (
    <div role="img" aria-label={etiqueta} className={`flex overflow-hidden bg-[#E2E8F0] ${alto} ${redondeo} ${className}`}>
      {segmentos.map((s) => (
        <div key={s.clave} style={{ width: `${s.pct}%`, background: s.color }} />
      ))}
    </div>
  );
}

function AvisoConfianza({ clima }) {
  const t = textoConfianza(clima.respuestas, clima.confianza);
  return (
    <div role="note" className="flex items-start gap-3 rounded-[14px] border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3.5">
      <Info className="mt-0.5 size-5 shrink-0 text-[#1D4ED8]" aria-hidden="true" />
      <p className="text-sm leading-normal text-[#1E3A8A]">
        <b>{t.titulo}</b> {t.detalle}
      </p>
    </div>
  );
}

function Kpis({ r, cl, comp, nom }) {
  const f = cl.favorabilidad;
  const e = cl.enps;
  const dFav = comp?.favorable;
  const a = anillo(r.participacion ?? 0);
  const p = textoParticipacion(r.contestadas, r.invitados);
  const dEnps = vsAnterior(comp?.enps ?? null);
  return (
    <section aria-label="Indicadores" className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,250px),1fr))] gap-3">
      <div className={`${TARJETA} p-[18px]`}>
        <p className="text-[13px] font-semibold text-slate-600">Respuestas favorables</p>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-2.5">
          <span className="text-[34px] font-extrabold leading-tight text-slate-900">{f ? `${f.favorable} %` : "—"}</span>
          <span className="text-[13px]" style={{ color: dFav === null || dFav === undefined ? "#475569" : vsAnterior(dFav).tono }}>
            {dFav === null || dFav === undefined ? "primera medición" : `${vsAnterior(dFav).texto} pts vs. anterior`}
          </span>
        </div>
        <Barra className="mt-2.5" segmentos={segmentosFavorabilidad(f)} etiqueta={etiquetaFavorabilidad(f)} />
        <p className="mt-2 text-[12.5px] text-slate-600">
          Calificación promedio: <b className="text-slate-900">{fmtUno(cl.general)} de 10</b>
        </p>
      </div>

      <div className={`${TARJETA} p-[18px]`}>
        <p className="text-[13px] font-semibold text-slate-600">eNPS · ¿recomendarían trabajar aquí?</p>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-2.5">
          <span className="text-[34px] font-extrabold leading-tight" style={{ color: tonoEnps(e?.valor) }}>
            {fmtEnps(e?.valor)}
          </span>
          <span className="text-[13px] text-slate-600">escala de −100 a +100</span>
        </div>
        <Barra
          className="mt-2.5"
          segmentos={segmentosEnps(e)}
          etiqueta={e ? `${e.detractores} % detractores, ${e.pasivos} % pasivos, ${e.promotores} % promotores` : "Sin eNPS"}
        />
        <p className="mt-2 text-[12.5px] text-slate-600">
          {detalleEnps(e)}
          {comp?.enps !== null && comp?.enps !== undefined ? (
            <span style={{ color: dEnps.tono }}> · {dEnps.texto} vs. anterior</span>
          ) : null}
        </p>
      </div>

      <div className={`${TARJETA} flex items-center gap-3.5 p-[18px]`}>
        <svg width="78" height="78" viewBox="0 0 84 84" role="img" aria-label={`Participación ${a.pct} %`} className="shrink-0">
          <circle cx="42" cy="42" r="34" fill="none" stroke={COLOR.pista} strokeWidth="10" />
          {a.pct > 0 ? (
            <circle
              cx="42"
              cy="42"
              r="34"
              fill="none"
              stroke={p.color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${a.lleno} 300`}
              transform="rotate(-90 42 42)"
            />
          ) : null}
          <text x="42" y="48" textAnchor="middle" fontSize="18" fontWeight="800" fill="#0F172A">
            {a.pct}%
          </text>
        </svg>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-slate-600">Participación</p>
          <p className="mt-0.5 text-xl font-extrabold text-slate-900">
            {r.contestadas} de {r.invitados}
          </p>
          <p className="mt-0.5 text-[12.5px]" style={{ color: p.tono }}>
            {p.texto}
          </p>
        </div>
      </div>

      <Link
        href="/panel/clima/nom035"
        className={`${TARJETA} flex min-h-11 flex-col gap-1.5 p-[18px] text-slate-900 hover:border-blue-300`}
      >
        <span className="text-[13px] font-semibold text-slate-600">NOM-035 · riesgo psicosocial</span>
        <span className={`text-2xl font-extrabold ${nom?.nivel ? NIVELES[nom.nivel].tinta : "text-slate-600"}`}>
          {nom?.nivel ? NIVELES[nom.nivel].texto : nom ? "Sin datos" : "Pendiente"}
        </span>
        <span className="text-[13px] font-semibold text-[#1D5CF5]">
          {nom?.nivel ? `${nom.dominiosAltos} dominio(s) en alto · ver plan →` : "Aplica el cuestionario oficial →"}
        </span>
      </Link>
    </section>
  );
}

function Leyenda() {
  return (
    <div className="flex flex-wrap gap-3.5 text-[12.5px] text-slate-600">
      {[
        ["favorable", COLOR.favorable],
        ["neutral", COLOR.neutral],
        ["desfavorable", COLOR.desfavorable],
      ].map(([t, c]) => (
        <span key={t} className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-[3px]" style={{ background: c }} aria-hidden="true" />
          {t}
        </span>
      ))}
    </div>
  );
}

function Dimensiones({ cl, comp }) {
  const prom = cl.favorabilidad?.favorable;
  const filas = filasDimensiones(cl, comp);
  return (
    <section aria-labelledby="titulo-dimensiones" className={`${TARJETA} p-5`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="titulo-dimensiones" className="text-[17px] font-extrabold text-slate-900">
          Dimensiones
        </h2>
        <Leyenda />
      </div>
      {filas.length ? (
        <ul className="mt-3 divide-y divide-slate-100 sm:hidden">
          {filas.map((d) => (
            <li key={d.clave} className="py-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 font-semibold text-slate-900">{d.nombre}</span>
                <b className="shrink-0 text-slate-900">{d.favorable === null ? "—" : `${d.favorable} %`}</b>
              </div>
              <Barra alto="h-3" redondeo="rounded" className="mt-1.5" segmentos={segmentosFavorabilidad(d.favorabilidad)} etiqueta={`${d.nombre}: ${etiquetaFavorabilidad(d.favorabilidad)}`} />
              <div className="mt-1.5 flex flex-wrap justify-between gap-x-3 text-[12.5px] font-semibold">
                <span style={{ color: d.contraEmpresa ? (d.contraEmpresa.positivo ? COLOR.textoVerde : COLOR.textoAmbar) : "#475569" }}>
                  {d.contraEmpresa ? `${d.contraEmpresa.texto} vs. la empresa` : "—"}
                </span>
                <span style={{ color: d.anterior.tono }} aria-label={`vs. anterior: ${d.anterior.aria}`}>
                  {d.anterior.texto} vs. anterior
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {filas.length ? (
        <div className="mt-3.5 hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <caption className="sr-only">% favorable por dimensión, contra el promedio de la empresa y contra la medición anterior</caption>
            <thead>
              <tr className="text-left text-xs text-slate-600">
                <th scope="col" className="pb-2.5 pr-2 font-semibold">Dimensión</th>
                <th scope="col" className="w-[34%] px-2 pb-2.5 font-semibold">Cómo respondieron</th>
                <th scope="col" className="px-2 pb-2.5 text-right font-semibold">Favorable</th>
                <th scope="col" className="w-[26%] px-2 pb-2.5 text-center font-semibold">vs. la empresa ({prom ?? "—"} %)</th>
                <th scope="col" className="pb-2.5 pl-2 text-right font-semibold">vs. anterior</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((d) => (
                <tr key={d.clave} className="border-t border-slate-100">
                  <th scope="row" className="py-2.5 pr-2 text-left font-semibold text-slate-900">{d.nombre}</th>
                  <td className="px-2 py-2.5">
                    <Barra alto="h-4" redondeo="rounded-[5px]" segmentos={segmentosFavorabilidad(d.favorabilidad)} etiqueta={`${d.nombre}: ${etiquetaFavorabilidad(d.favorabilidad)}`} />
                  </td>
                  <td className="px-2 py-2.5 text-right font-extrabold text-slate-900">{d.favorable === null ? "—" : `${d.favorable} %`}</td>
                  <td className="px-2 py-2.5">
                    {d.contraEmpresa ? (
                      <span role="img" aria-label={`${d.nombre}: ${d.contraEmpresa.aria}`} className="relative block h-4">
                        <span aria-hidden="true" className="absolute inset-y-[-3px] left-1/2 w-[1.5px] bg-[#94A3B8]" />
                        <span
                          aria-hidden="true"
                          className="absolute inset-y-0.5 rounded"
                          style={{
                            width: `${d.contraEmpresa.ancho}%`,
                            ...(d.contraEmpresa.positivo ? { left: "50%", background: COLOR.favorable } : { right: "50%", background: COLOR.ambar }),
                          }}
                        />
                        <span
                          aria-hidden="true"
                          className="absolute -top-px whitespace-nowrap text-xs font-bold"
                          style={
                            d.contraEmpresa.positivo
                              ? { left: `calc(50% + ${d.contraEmpresa.ancho}% + 6px)`, color: COLOR.textoVerde }
                              : { right: `calc(50% + ${d.contraEmpresa.ancho}% + 6px)`, color: COLOR.textoAmbar }
                          }
                        >
                          {d.contraEmpresa.texto}
                        </span>
                      </span>
                    ) : (
                      <span className="block text-center text-slate-500">—</span>
                    )}
                  </td>
                  <td className="py-2.5 pl-2 text-right font-semibold" style={{ color: d.anterior.tono }}>
                    <span aria-label={d.anterior.aria}>{d.anterior.texto}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-2 text-sm text-slate-600">Esta encuesta no tiene dimensiones.</p>
      )}
      <p className="mt-3 text-[12.5px] text-slate-600">
        {comp
          ? "«vs. anterior»: puntos de % favorable contra la medición anterior de esta encuesta."
          : "«vs. anterior» se llena desde la segunda medición con ▲ o ▼ en cada dimensión."}
      </p>
    </section>
  );
}

function Lectura({ lectura }) {
  if (!lectura) return null;
  return (
    <section aria-label="Lectura de resultados" className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-4">
      <div className={`${TARJETA} p-[18px]`}>
        <h2 className="text-[15px] font-extrabold text-slate-900">Lo más fuerte</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">{lectura.texto.fuerte}</p>
      </div>
      <div className={`${TARJETA} p-[18px]`}>
        <h2 className="text-[15px] font-extrabold text-slate-900">Lo que pide atención</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">{lectura.texto.atencion}</p>
      </div>
    </section>
  );
}

function Preguntas({ preguntas }) {
  const lista = preguntasOrdenadas(preguntas);
  const [todas, setTodas] = useState(false);
  if (!lista.length) return null;
  const visibles = todas ? lista : lista.slice(0, PREGUNTAS_VISIBLES);
  return (
    <section aria-labelledby="titulo-preguntas" className={`${TARJETA} p-5`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="titulo-preguntas" className="text-[17px] font-extrabold text-slate-900">
          Pregunta por pregunta
        </h2>
        <span className="text-[12.5px] text-slate-600">de la más favorable a la menos</span>
      </div>
      <ul id="lista-preguntas" className="mt-3 divide-y divide-slate-100">
        {visibles.map((q) => (
          <li key={q.clave} className="grid gap-x-3 gap-y-1.5 py-2.5 sm:grid-cols-[minmax(0,1fr)_200px_44px] sm:items-center">
            <span className="min-w-0 text-sm text-slate-900">
              {q.dimensionNombre ? <b className="block text-[11.5px] font-bold uppercase tracking-wide text-slate-600">{q.dimensionNombre}</b> : null}
              {q.texto}
            </span>
            <span className="flex items-center gap-2 sm:contents">
              <Barra alto="h-3.5" redondeo="rounded" className="flex-1" segmentos={segmentosFavorabilidad(q.favorabilidad)} etiqueta={etiquetaFavorabilidad(q.favorabilidad)} />
              <b className="w-11 text-right text-sm text-slate-900">{q.favorabilidad.favorable} %</b>
            </span>
          </li>
        ))}
      </ul>
      {lista.length > PREGUNTAS_VISIBLES ? (
        <button
          type="button"
          aria-expanded={todas}
          aria-controls="lista-preguntas"
          onClick={() => setTodas((v) => !v)}
          className="mt-2 min-h-11 rounded-xl px-2 text-sm font-semibold text-[#1D5CF5] hover:bg-blue-50"
        >
          {todas ? "Ver menos" : `Ver las ${lista.length} preguntas`}
        </button>
      ) : null}
    </section>
  );
}

function PorArea({ r, cl }) {
  const pg = cl.participacionGrupos;
  const mapa = mapaFavorable(cl);
  if (!pg) return null;
  const quien = r.agruparPor === "jefe" ? "jefe directo" : "área";
  return (
    <section aria-labelledby="titulo-area" className={`${TARJETA} p-5`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="titulo-area" className="text-[17px] font-extrabold text-slate-900">
          Participación por {quien}
        </h2>
        {!mapa ? <span className="text-[12.5px] text-slate-600">el mapa de resultados por {quien} aparece con 2 grupos o más</span> : null}
      </div>
      <ul className="mt-3.5 space-y-3 text-sm">
        {pg.grupos.map((g) => {
          const t = textoParticipacion(g.contestadas, g.invitados);
          return (
            <li key={g.clave} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[160px_minmax(0,1fr)_90px]">
              <span className="truncate font-semibold text-slate-900">{g.nombre}</span>
              <span className="order-3 col-span-2 h-3.5 overflow-hidden rounded-full bg-[#E2E8F0] sm:order-none sm:col-span-1" role="img" aria-label={`${g.nombre}: ${g.participacion ?? 0} % de participación`}>
                <span className="block h-full" style={{ width: `${Math.min(100, g.participacion ?? 0)}%`, background: t.color }} />
              </span>
              <span className="text-right text-slate-700">
                <b className="text-slate-900">{g.contestadas}</b> de {g.invitados}
              </span>
            </li>
          );
        })}
      </ul>
      {pg.sinGrupos ? (
        <p className="mt-2.5 text-[13px] text-slate-600">
          Tus empleados no tienen área asignada. Asígnalas en Empleados para ver resultados por área en la siguiente encuesta.
        </p>
      ) : (
        <p className="mt-2.5 text-[12.5px] text-slate-600">Solo conteos: nunca se muestra quién falta. Meta: {META_PARTICIPACION} %.</p>
      )}
      {mapa ? (
        <div className="mt-4 overflow-x-auto">
          <table lang="es" className="w-full min-w-[600px] table-fixed border-separate border-spacing-1 text-sm">
            <caption className="mb-1 text-left text-[13px] font-bold text-slate-700">% favorable por {quien} y dimensión</caption>
            <thead>
              <tr>
                <th scope="col" className="w-28 text-left text-[11.5px] font-semibold text-slate-600">{quien === "área" ? "Área" : "Jefe"}</th>
                <th scope="col" className="px-0.5 text-center text-[11px] font-semibold text-slate-600">Total</th>
                {mapa.columnas.map((c) => (
                  <th key={c.clave} scope="col" className="hyphens-auto break-words px-0.5 text-center text-[11px] font-semibold leading-tight text-slate-600">
                    {c.nombre}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mapa.filas.map((f) => (
                <tr key={f.nombre}>
                  <th scope="row" className="break-words pr-2 text-left text-[13px] font-semibold leading-tight text-slate-900">
                    {f.nombre} <span className="whitespace-nowrap font-normal text-slate-600">· {f.n}</span>
                  </th>
                  {[f.total, ...f.celdas].map((v, i) => (
                    <td key={i} className={`h-10 rounded-lg text-center text-[13px] font-bold ${colorFavorable(v)}`}>
                      {v === null ? "—" : `${v} %`}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function Comentarios({ comentarios }) {
  const [todos, setTodos] = useState(false);
  const { total, grupos } = resumenComentarios(comentarios, 2);
  return (
    <section aria-labelledby="titulo-comentarios" className={`${TARJETA} p-5`}>
      <div className="flex items-center justify-between gap-2">
        <h2 id="titulo-comentarios" className="text-[17px] font-extrabold text-slate-900">
          Lo que dicen
        </h2>
        <span className="text-[12.5px] text-slate-600">{total === 1 ? "1 comentario" : `${total} comentarios`}</span>
      </div>
      {!total ? <p className="mt-2 text-[13.5px] text-slate-600">Nadie dejó comentarios abiertos en esta medición.</p> : null}
      <div id="lista-comentarios">
        {grupos.map((q) => (
          <div key={q.clave}>
            <p className="mb-1.5 mt-3 text-[13px] font-bold text-slate-600">{q.texto}</p>
            <ul className="space-y-1.5">
              {(todos ? q.respuestas : q.visibles).map((t, i) => (
                <li key={i}>
                  <blockquote className="break-words rounded-[10px] bg-[#F8FAFC] px-3 py-2.5 text-[13.5px] leading-normal text-slate-700">«{t}»</blockquote>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {grupos.some((q) => q.resto) ? (
        <button
          type="button"
          aria-expanded={todos}
          aria-controls="lista-comentarios"
          onClick={() => setTodos((v) => !v)}
          className="mt-2 min-h-11 rounded-xl px-2 text-sm font-semibold text-[#1D5CF5] hover:bg-blue-50"
        >
          {todos ? "Ver menos" : `Ver los ${total} comentarios →`}
        </button>
      ) : null}
      {total ? <p className="mt-2 text-[12px] text-slate-600">Sin área y en orden alfabético, no en orden de llegada.</p> : null}
    </section>
  );
}

function Evolucion({ evolucion, cl, cierra }) {
  const l = lineaEvolucion(evolucion);
  return (
    <section aria-labelledby="titulo-evolucion" className={`${TARJETA} p-5`}>
      <h2 id="titulo-evolucion" className="text-[17px] font-extrabold text-slate-900">
        Evolución
      </h2>
      {l ? (
        <svg viewBox={`0 0 ${l.ancho} ${l.alto}`} role="img" aria-label={l.aria} className="mt-2 h-auto w-full">
          {l.guias.map((g) => (
            <g key={g.v}>
              <line x1={l.margen.izq} x2={l.ancho - l.margen.der} y1={g.y} y2={g.y} stroke="#E2E8F0" strokeWidth="1" />
              <text x={l.margen.izq - 6} y={g.y + 4} textAnchor="end" fontSize="10" fill="#475569">
                {g.v}%
              </text>
            </g>
          ))}
          <path d={l.d} fill="none" stroke={COLOR.favorable} strokeWidth="2.5" strokeLinejoin="round" />
          {l.puntos.map((p, i) => (
            <g key={p.id ?? i}>
              <circle cx={p.x} cy={p.y} r="4" fill="#FFFFFF" stroke={COLOR.favorable} strokeWidth="2" />
              <text x={p.x} y={p.y - 9} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#0F172A">
                {p.favorable}%
              </text>
              <text x={p.x} y={l.alto - 8} textAnchor="middle" fontSize="10" fill="#475569">
                {p.etiqueta}
              </text>
            </g>
          ))}
        </svg>
      ) : (
        <p className="mt-2 text-[13.5px] text-slate-600">
          Primera medición{cl.favorabilidad ? `: ${cl.favorabilidad.favorable} % favorable` : ""}. Con la siguiente verás la línea y qué
          subió o bajó.{sugerenciaSiguiente(cierra) ? ` Sugerencia: repetirla en ${sugerenciaSiguiente(cierra)}.` : ""}
        </p>
      )}
    </section>
  );
}

function Abiertas({ abiertas }) {
  if (!abiertas?.length) return null;
  return (
    <Tarjeta
      titulo="Encuestas abiertas"
      accion={
        <Link href="/panel/clima/encuestas" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand">
          Ver todas →
        </Link>
      }
    >
      <ul className="divide-y divide-slate-100">
        {abiertas.map((c) => {
          const pct = c.invitados ? Math.round((c.contestadas / c.invitados) * 100) : 0;
          return (
            <li key={c.id} className="flex flex-wrap items-center gap-3 py-2">
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{c.nombre}</span>
              <ChipEstado estado={c.estado} />
              <span className="text-[13px] text-slate-600">
                {c.contestadas} de {c.invitados} · {pct} % · cierra {fechaCorta(c.cierra_el)}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-slate-600">
        Mientras está abierta solo ves la participación: los resultados aparecen al cerrar, para proteger el anonimato.
      </p>
    </Tarjeta>
  );
}

export default function Tablero({ idEmpresa, extra = null }) {
  const [campania, setCampania] = useState(null);
  const { data, error, mutate } = useSWR(ruta(`/tablero${campania ? `?campania=${campania}` : ""}`, idEmpresa), get, { shouldRetryOnError: false });
  const [bajando, setBajando] = useState(false);
  if (error) return <Vacio titulo="No se pudo cargar el tablero" texto={errorDe(error)} />;
  if (!data) return <Cargando texto="Cargando resultados…" />;
  const r = data.actual;
  const cl = r?.clima;
  const comp = data.anterior?.comparacion ?? null;
  const nom = data.nom035;

  if (!r) {
    return (
      <div className="space-y-4">
        <Abiertas abiertas={data.abiertas} />
        <Vacio
          titulo="Aún no hay resultados de clima"
          texto="Lanza una encuesta con una plantilla profesional. Los resultados aparecen al cerrarla, aunque conteste una sola persona."
        >
          <Link href="/panel/clima/encuestas" className="inline-flex min-h-11 items-center rounded-xl bg-brand px-4 text-sm font-semibold text-white">
            Nueva encuesta
          </Link>
        </Vacio>
      </div>
    );
  }

  const bajar = async () => {
    setBajando(true);
    try {
      await descargar(axios, ruta(`/campanias/${r.campania.id}/informe`, idEmpresa), `informe-clima-${r.campania.id}.pdf`);
    } finally {
      setBajando(false);
    }
  };

  return (
    <div data-dashboard-clima className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-2xl font-extrabold text-slate-900">Clima organizacional</h2>
          <p className="mt-1 text-sm text-slate-600">
            «{r.campania.nombre}» · cerró el {fechaCorta(r.campania.cierra_el)} · respuestas anónimas
            {data.anterior ? ` · comparado con «${data.anterior.nombre}»` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {data.mediciones.length > 1 ? (
            <label className="flex items-center gap-2 text-[13px] text-slate-600">
              Medición
              <select
                aria-label="Medición"
                className="h-11 max-w-[60vw] rounded-xl border border-slate-300 bg-white px-2.5 text-sm text-slate-900"
                value={r.campania.id}
                onChange={(e) => setCampania(Number(e.target.value))}
              >
                {data.mediciones.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <Boton className="min-h-11" onClick={bajar} disabled={!r.disponibles || bajando}>
            <Download className="size-[18px]" aria-hidden="true" /> {bajando ? "Preparando…" : "Descargar informe PDF"}
          </Boton>
          <Link href="/panel/clima/encuestas" className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-brand px-4 text-sm font-semibold text-white">
            <Plus className="size-4" aria-hidden="true" /> Nueva encuesta
          </Link>
        </div>
      </header>

      {!r.disponibles ? (
        <Vacio titulo="Sin resultados que mostrar" texto={r.motivo || "Todavía no hay respuestas."} />
      ) : (
        <>
          <AvisoConfianza clima={cl} />
          <Kpis r={r} cl={cl} comp={comp} nom={nom} />
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex min-w-0 flex-[999_1_680px] flex-col gap-4">
              <Dimensiones cl={cl} comp={comp} />
              <Lectura lectura={cl.lectura} />
              <Preguntas preguntas={cl.preguntas} />
              <PorArea r={r} cl={cl} />
            </div>
            <aside aria-label="Plan, comentarios y evolución" className="flex min-w-0 flex-[1_1_360px] flex-col gap-4">
              <PlanAccion
                idEmpresa={idEmpresa}
                idCampania={r.campania.id}
                plan={data.plan}
                dimensiones={cl.dimensiones}
                atencion={cl.lectura?.atencion ?? []}
                conIa={Boolean(extra)}
                alCambiar={() => mutate()}
              />
              <Comentarios comentarios={r.comentarios} />
              <Evolucion evolucion={data.evolucion} cl={cl} cierra={r.campania.cierra_el} />
              {extra ? extra({ resultado: r }) : null}
            </aside>
          </div>
        </>
      )}
      <Abiertas abiertas={data.abiertas} />
    </div>
  );
}
