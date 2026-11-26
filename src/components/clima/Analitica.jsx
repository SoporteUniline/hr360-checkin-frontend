"use client";

// Analítica de clima (26/11/2026): cortes por área o jefe, antigüedad, puesto y sucursal; mapa de calor dimensión ×
// grupo; impulsores del compromiso y exportación CSV. Todo agregado (mínimo vigente y supresión secundaria del servidor).
// API: GET /campanias/:id/analitica?corte=… · GET /campanias/:id/analitica.csv?corte=…
import { useState } from "react";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import axios from "@/lib/axios";
import { descargar } from "@/components/nomina/comun";
import { fechaCorta } from "@/lib/clima/modelo.mjs";
import { textoCelda, textoImpulsor, tonoCelda } from "@/lib/clima/inspeccion.mjs";
import { Aviso, Boton, Cargando, Tarjeta, Vacio, errorDe, get, ruta } from "./ui";

function MapaCalor({ mapa }) {
  if (!mapa.filas.length) return <p className="text-[13.5px] text-slate-600">Sin grupos que mostrar con este corte.</p>;
  return (
    <>
      {/* Teléfono: una tarjeta por grupo con sus dimensiones (sin tabla ancha). */}
      <ul className="space-y-3 sm:hidden">
        {mapa.filas.map((f) => (
          <li key={f.clave} className="rounded-xl border border-slate-200 p-3">
            <p className="text-[14px] font-bold text-slate-900">
              {f.nombre} <span className="font-normal text-slate-500">· {f.n} resp.</span>
            </p>
            <ul className="mt-2 grid grid-cols-2 gap-1.5">
              {f.celdas.map((c, i) => {
                const t = tonoCelda(c.favorable);
                return (
                  <li key={c.clave} className="flex min-w-0 items-center justify-between gap-1 rounded-lg px-2 py-1.5 text-[13px]" style={{ background: t.fondo, color: t.tinta }} aria-label={textoCelda(f.nombre, mapa.dimensiones[i].nombre, c)}>
                    <span className="min-w-0 truncate">{mapa.dimensiones[i].nombre}</span>
                    <strong className="shrink-0">{c.favorable === null ? "—" : `${c.favorable} %`}</strong>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    <div className="hidden overflow-x-auto sm:block" role="region" aria-label="Mapa de calor por dimensión y grupo" tabIndex={0}>
      <table className="w-full min-w-[640px] border-separate border-spacing-1 text-[13px]">
        <thead>
          <tr>
            <th style={{ fontSize: 13 }} scope="col" className="sticky left-0 z-10 bg-white px-2 py-1 text-left font-semibold text-slate-600">
              Grupo
            </th>
            {mapa.dimensiones.map((d) => (
              <th style={{ fontSize: 13 }} key={d.clave} scope="col" className="px-1 py-1 text-center font-semibold text-slate-600">
                {d.nombre}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th style={{ fontSize: 13 }} scope="row" className="sticky left-0 z-10 bg-white px-2 py-1 text-left font-bold text-slate-900">
              Toda la empresa
            </th>
            {mapa.dimensiones.map((d) => {
              const t = tonoCelda(d.empresa);
              return (
                <td key={d.clave} className="rounded-lg px-1 py-2 text-center font-bold" style={{ background: t.fondo, color: t.tinta }}>
                  {d.empresa === null ? "—" : `${d.empresa} %`}
                </td>
              );
            })}
          </tr>
          {mapa.filas.map((f) => (
            <tr key={f.clave}>
              <th style={{ fontSize: 13 }} scope="row" className="sticky left-0 z-10 bg-white px-2 py-1 text-left font-semibold text-slate-800">
                {f.nombre}
                <span className="block text-[13px] font-normal text-slate-500">{f.n} resp.</span>
              </th>
              {f.celdas.map((c, i) => {
                const t = tonoCelda(c.favorable);
                return (
                  <td
                    key={c.clave}
                    className="rounded-lg px-1 py-2 text-center font-bold"
                    style={{ background: t.fondo, color: t.tinta }}
                    title={textoCelda(f.nombre, mapa.dimensiones[i].nombre, c)}
                    aria-label={textoCelda(f.nombre, mapa.dimensiones[i].nombre, c)}
                  >
                    {c.favorable === null ? "—" : `${c.favorable} %`}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </>
  );
}

function Impulsores({ imp }) {
  if (!imp?.disponible) return <Aviso>{imp?.motivo ?? "Sin datos suficientes."}</Aviso>;
  const max = Math.max(...imp.dimensiones.map((d) => Math.abs(d.correlacion ?? 0)), 0.01);
  return (
    <>
      <p className="mb-3 text-[13px] text-slate-600">
        Qué tanto se mueve <strong>{imp.resultado.nombre}</strong> con cada dimensión en las mismas respuestas ({imp.respuestas}). Solo se muestra el
        coeficiente, nunca respuestas individuales.
      </p>
      <ul className="space-y-2">
        {imp.dimensiones.map((d) => (
          <li key={d.clave} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
            <span className="min-w-0 text-[14px] font-semibold text-slate-900">
              {d.nombre}
              {d.palanca ? <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[13px] font-bold text-amber-900">Palanca</span> : null}
              <span className="block text-[13px] font-normal text-slate-500">
                {textoImpulsor(d)}
                {d.favorable !== null ? ` · ${d.favorable} % favorable` : ""}
              </span>
            </span>
            <span className="text-[13px] font-bold text-slate-700">{d.correlacion === null ? "—" : d.correlacion.toFixed(2)}</span>
            <div className="col-span-2 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
              <div className={`h-full rounded-full ${(d.correlacion ?? 0) >= 0 ? "bg-brand" : "bg-red-500"}`} style={{ width: `${(Math.abs(d.correlacion ?? 0) / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[13px] text-slate-500">«Palanca»: mueve mucho el compromiso y está por debajo de 70 % favorable. Correlación no es causa.</p>
    </>
  );
}

export default function Analitica({ idEmpresa }) {
  const { enqueueSnackbar } = useSnackbar();
  const tablero = useSWR(ruta("/tablero", idEmpresa), get, { shouldRetryOnError: false });
  const [medicion, setMedicion] = useState(null);
  const [corte, setCorte] = useState(null);
  const [bajando, setBajando] = useState(false);
  const mediciones = tablero.data?.mediciones ?? [];
  const id = medicion ?? mediciones[0]?.id ?? null;
  const a = useSWR(id ? ruta(`/campanias/${id}/analitica${corte ? `?corte=${corte}` : ""}`, idEmpresa) : null, get, { shouldRetryOnError: false });
  if (tablero.error) return <Vacio titulo="No se pudo cargar la analítica" texto={errorDe(tablero.error)} />;
  if (!tablero.data) return <Cargando />;
  if (!mediciones.length) return <Vacio titulo="Aún no hay mediciones cerradas" texto="La analítica aparece cuando cierra la primera encuesta de clima." />;
  const d = a.data;
  const exportar = async () => {
    setBajando(true);
    try {
      await descargar(axios, ruta(`/campanias/${id}/analitica.csv?corte=${d.corte}`, idEmpresa), `clima-${id}-${d.corte}.csv`);
    } catch (e) {
      enqueueSnackbar(errorDe(e), { variant: "error" });
    } finally {
      setBajando(false);
    }
  };
  return (
    <div className="space-y-4" data-clima2="analitica">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="block min-w-0 max-w-md flex-1">
          <span className="mb-1 block text-[13px] font-semibold text-slate-700">Medición</span>
          <select
            className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-[14px]"
            value={id ?? ""}
            onChange={(e) => {
              setMedicion(Number(e.target.value));
              setCorte(null);
            }}
          >
            {mediciones.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre} · {fechaCorta(m.cierra_el)}
              </option>
            ))}
          </select>
        </label>
        <Boton onClick={exportar} disabled={!d?.suficiente || bajando}>
          {bajando ? "Preparando…" : "Exportar CSV"}
        </Boton>
      </div>
      {a.error ? (
        <Aviso tono="alerta">{errorDe(a.error)}</Aviso>
      ) : !d ? (
        <Cargando />
      ) : (
        <>
          <div role="tablist" aria-label="Corte" className="flex gap-2 overflow-x-auto pb-1">
            {d.cortes.map((c) => (
              <button
                key={c.clave}
                type="button"
                role="tab"
                aria-selected={c.clave === d.corte}
                onClick={() => setCorte(c.clave)}
                className={`min-h-11 shrink-0 rounded-full border px-4 text-[13.5px] font-semibold ${
                  c.clave === d.corte ? "border-brand bg-blue-50 text-brand" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {c.nombre}
              </button>
            ))}
          </div>
          {d.sinDatoSegmento ? <Aviso>Esta encuesta se lanzó antes de guardar antigüedad, puesto y sucursal: el corte sale en «Sin dato». Las siguientes ya lo traen.</Aviso> : null}
          {d.gruposOcultos ? <Aviso>{d.gruposOcultos} grupo(s) no se muestran por separado para que nadie quede identificado.</Aviso> : null}
          <Tarjeta titulo={`Mapa de calor por ${d.nombreCorte.toLowerCase()}`}>
            <MapaCalor mapa={d.mapa} />
            <p className="mt-2 text-[13px] text-slate-500">% favorable. Verde 75 % o más, amarillo 60 a 74 %, rojo menos de 60 %. Se muestra un corte a la vez.</p>
          </Tarjeta>
          <Tarjeta titulo="Qué mueve el compromiso">
            <Impulsores imp={d.impulsores} />
          </Tarjeta>
        </>
      )}
    </div>
  );
}
