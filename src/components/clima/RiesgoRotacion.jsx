"use client";

// Riesgo de rotación por grupo (26/11/2026): tarjeta del tablero de clima. Índice explicable por área o jefe (grupos de
// 2 o más, nunca por persona) con sus 3 factores principales, una recomendación y «Agregar al plan» (plan de acción de
// la última medición de clima, la misma API de siempre). API: GET /riesgo-rotacion · POST /campanias/:id/acciones.
import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { useSnackbar } from "notistack";
import axios from "@/lib/axios";
import { fechaCorta } from "@/lib/clima/modelo.mjs";
import { NIVEL_RIESGO } from "@/lib/clima/inspeccion.mjs";
import { Boton, Cargando, Tarjeta, codigoDe, errorDe, get, ruta } from "./ui";

export default function RiesgoRotacion({ idEmpresa }) {
  const { enqueueSnackbar } = useSnackbar();
  const { mutate } = useSWRConfig();
  const r = useSWR(ruta("/riesgo-rotacion", idEmpresa), get, { shouldRetryOnError: false, revalidateOnFocus: false });
  const [agregadas, setAgregadas] = useState({});
  if (r.error) return codigoDe(r.error) === "SIN_MIGRACION" ? null : <Tarjeta titulo="Riesgo de rotación por grupo"><p className="text-[13.5px] text-slate-600">{errorDe(r.error)}</p></Tarjeta>;
  if (!r.data) return <Tarjeta titulo="Riesgo de rotación por grupo"><Cargando /></Tarjeta>;
  const d = r.data;
  const agregar = async (g) => {
    try {
      await axios.post(ruta(`/campanias/${d.medicion.id}/acciones`, idEmpresa), { texto: g.accion });
      setAgregadas((x) => ({ ...x, [g.clave]: true }));
      enqueueSnackbar("Agregada al plan de acción. Asígnale responsable y fecha.", { variant: "success" });
      mutate((k) => typeof k === "string" && k.includes("/tablero"));
    } catch (e) {
      if (codigoDe(e) === "DUPLICADA") setAgregadas((x) => ({ ...x, [g.clave]: true }));
      enqueueSnackbar(errorDe(e), { variant: codigoDe(e) === "DUPLICADA" ? "info" : "error" });
    }
  };
  return (
    <Tarjeta titulo="Riesgo de rotación por grupo" etiqueta="Riesgo de rotación por grupo">
      <p className="text-[13px] text-slate-600">
        Por {d.agruparPor === "jefe" ? "jefe directo" : "área"}, con {d.medicion ? `el clima de «${d.medicion.nombre}»` : "sin encuesta de clima cerrada"}
        {d.periodo ? ` y asistencias del ${fechaCorta(d.periodo.inicio)} al ${fechaCorta(d.periodo.fin)}` : ""}. Grupos de {d.umbral} personas o más; nunca por persona.
      </p>
      {d.sinAsistencias ? <p className="mt-2 text-[13px] text-amber-800">No se pudieron leer las asistencias: el índice usa solo clima y antigüedad.</p> : null}
      {!d.grupos.length ? (
        <p className="mt-3 text-[13.5px] text-slate-600">Aún no hay grupos con datos suficientes.</p>
      ) : (
        <ul className="mt-3 grid gap-3 md:grid-cols-2">
          {d.grupos.slice(0, 6).map((g) => {
            const n = NIVEL_RIESGO[g.nivel];
            return (
              <li key={g.clave} className="flex min-w-0 flex-col rounded-xl border border-slate-200 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-[14.5px] font-bold text-slate-900">{g.nombre}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[13px] font-bold ${n.clase}`}>
                    {n.texto} · {g.indice}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`Índice ${g.indice} de 100`}>
                  <div className="h-full rounded-full" style={{ width: `${g.indice}%`, background: n.barra }} />
                </div>
                <p className="mt-1 text-[13px] text-slate-500">{g.n} personas</p>
                <ol className="mt-2 space-y-1">
                  {g.principales.map((f) => (
                    <li key={f.clave} className="text-[13px] text-slate-700">
                      <strong className="text-slate-900">{f.nombre}:</strong> {f.texto}
                    </li>
                  ))}
                </ol>
                <p className="mt-2 flex-1 text-[13px] text-slate-800">{g.recomendacion}</p>
                {d.medicion ? (
                  <Boton className="mt-2 self-start" onClick={() => agregar(g)} disabled={agregadas[g.clave]}>
                    {agregadas[g.clave] ? "Ya está en el plan" : "Agregar al plan"}
                  </Boton>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-[13px] text-slate-500">{d.nota}</p>
    </Tarjeta>
  );
}
