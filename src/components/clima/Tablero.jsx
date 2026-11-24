"use client";

// Resultados de clima: tarjetas (clima general, eNPS, participación, NOM-035), mapa de calor por grupo y dimensión,
// encuestas abiertas y, en celular, el resumen para el dueño. Todo sale agregado del servidor (mínimo 5 por grupo).
import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Download, Plus } from "lucide-react";
import axios from "@/lib/axios";
import { descargar } from "@/components/nomina/comun";
import { MINIMO, atencion, colorCalor, fechaCorta, fmtDelta, fmtEnps, fmtUno, mapaCalor, NIVELES } from "@/lib/clima/modelo.mjs";
import { Boton, Cargando, ChipEstado, Tarjeta, Vacio, errorDe, get, ruta } from "./ui";

function Kpi({ titulo, valor, unidad, detalle, delta, puntos = false, href, tono = "text-slate-900" }) {
  const d = fmtDelta(delta, { puntos });
  const cuerpo = (
    <>
      <p className="text-[13px] font-semibold text-slate-500">{titulo}</p>
      <p className={`mt-1 text-[26px] font-extrabold leading-none tracking-tight sm:text-[30px] ${tono}`}>
        {valor}
        {unidad ? <span className="ml-1 text-base font-semibold text-slate-400">{unidad}</span> : null}
      </p>
      {d ? <p className={`mt-1 text-[12.5px] font-semibold ${d.tono}`}>{d.texto}</p> : null}
      {detalle ? <p className="mt-1 text-[12.5px] text-slate-500">{detalle}</p> : null}
    </>
  );
  const clase = "block min-w-0 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4";
  return href ? (
    <Link href={href} className={`${clase} hover:border-blue-300`}>
      {cuerpo}
    </Link>
  ) : (
    <div className={clase}>{cuerpo}</div>
  );
}

function MapaCalor({ clima, agruparPor }) {
  const { columnas, filas } = mapaCalor(clima);
  if (!columnas.length) return <p className="text-sm text-slate-500">Esta encuesta no tiene dimensiones.</p>;
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full min-w-[560px] border-separate border-spacing-1 text-sm">
        <caption className="sr-only">Calificación de 0 a 10 por {agruparPor === "jefe" ? "jefe" : "área"} y dimensión</caption>
        <thead>
          <tr>
            <th scope="col" className="w-32 text-left text-[11.5px] font-semibold text-slate-500">
              {agruparPor === "jefe" ? "Jefe" : "Área"}
            </th>
            {columnas.map((c) => (
              <th key={c.clave} scope="col" className="px-0.5 text-center text-[11px] font-semibold leading-tight text-slate-500">
                {c.nombre}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.nombre}>
              <th scope="row" className="truncate pr-2 text-left text-[13px] font-semibold text-slate-800">
                {f.nombre} <span className="font-normal text-slate-400">· {f.n}</span>
              </th>
              {f.celdas.map((v, i) => (
                <td key={columnas[i].clave} className={`h-10 rounded-lg text-center text-[13px] font-bold ${colorCalor(v)}`}>
                  {fmtUno(v)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Comentarios({ comentarios }) {
  const [abierto, setAbierto] = useState(false);
  const total = (comentarios ?? []).reduce((s, q) => s + q.respuestas.length, 0);
  if (!total) return null;
  return (
    <details open={abierto} onToggle={(e) => setAbierto(e.currentTarget.open)} className="rounded-xl border border-slate-200 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-slate-800">
        Comentarios abiertos ({total}) · sin área ni orden de llegada
      </summary>
      {comentarios.map((q) => (
        <div key={q.clave} className="mt-3">
          <p className="text-[13px] font-semibold text-slate-600">{q.texto}</p>
          <ul className="mt-1 space-y-1">
            {q.respuestas.slice(0, 60).map((t, i) => (
              <li key={i} className="rounded-lg bg-slate-50 px-3 py-1.5 text-[13px] text-slate-700">
                «{t}»
              </li>
            ))}
          </ul>
        </div>
      ))}
    </details>
  );
}

function Abiertas({ abiertas }) {
  if (!abiertas?.length) return null;
  return (
    <Tarjeta
      titulo="Encuestas abiertas"
      accion={
        <Link href="/panel/clima/encuestas" className="text-sm font-semibold text-brand">
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
              <span className="text-[13px] text-slate-500">
                {c.contestadas} de {c.invitados} · {pct} % · cierra {fechaCorta(c.cierra_el)}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-slate-500">
        Mientras está abierta solo ves la participación: los resultados aparecen al cerrar, para proteger el anonimato.
      </p>
    </Tarjeta>
  );
}

export default function Tablero({ idEmpresa, extra = null }) {
  const [campania, setCampania] = useState(null);
  const { data, error } = useSWR(ruta(`/tablero${campania ? `?campania=${campania}` : ""}`, idEmpresa), get, { shouldRetryOnError: false });
  const [bajando, setBajando] = useState(false);
  if (error) return <Vacio titulo="No se pudo cargar el tablero" texto={errorDe(error)} />;
  if (!data) return <Cargando texto="Cargando resultados…" />;
  const r = data.actual;
  const cl = r?.clima;
  const comp = data.anterior?.comparacion;
  const nom = data.nom035;

  if (!r) {
    return (
      <div className="space-y-4">
        <Abiertas abiertas={data.abiertas} />
        <Vacio
          titulo="Aún no hay resultados de clima"
          texto="Lanza una encuesta con una plantilla profesional. Los resultados aparecen al cerrarla, con 5 respuestas o más."
        >
          <Link
            href="/panel/clima/encuestas"
            className="inline-flex min-h-10 items-center rounded-xl bg-brand px-4 text-sm font-semibold text-white"
          >
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold text-slate-900">Clima organizacional</h2>
          <p className="text-[13px] text-slate-500">
            Encuesta «{r.campania.nombre}» · cerró el {fechaCorta(r.campania.cierra_el)} · respuestas anónimas
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {data.mediciones.length > 1 ? (
            <label className="flex items-center gap-2 text-[13px] text-slate-600">
              Medición
              <select
                className="h-10 rounded-xl border border-slate-300 bg-white px-2"
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
          <Boton onClick={bajar} disabled={!r.disponibles || bajando}>
            <Download className="size-4" /> {bajando ? "Preparando…" : "Descargar informe PDF"}
          </Boton>
          <Link
            href="/panel/clima/encuestas"
            className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-brand px-4 text-sm font-semibold text-white"
          >
            <Plus className="size-4" /> Nueva encuesta
          </Link>
        </div>
      </div>
      {data.anterior ? <p className="-mt-2 text-[12.5px] text-slate-500">Comparado con «{data.anterior.nombre}».</p> : null}

      {!r.disponibles ? (
        <Vacio titulo="Sin resultados que mostrar" texto={r.motivo || `Se necesitan al menos ${MINIMO} respuestas.`} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
            <Kpi titulo="Clima general" valor={fmtUno(cl.general)} unidad="/ 10" delta={comp?.general} />
            <Kpi
              titulo="eNPS · ¿recomendarían trabajar aquí?"
              valor={fmtEnps(cl.enps?.valor)}
              detalle={
                cl.enps ? `${cl.enps.promotores} % promotores · ${cl.enps.detractores} % detractores` : "Sin pregunta de recomendación"
              }
            />
            <Kpi
              titulo="Participación"
              valor={`${r.participacion ?? 0} %`}
              detalle={`${r.contestadas} de ${r.invitados} personas`}
              delta={comp?.participacion}
              puntos
            />
            <Kpi
              titulo="NOM-035 · riesgo psicosocial"
              href="/panel/clima/nom035"
              valor={nom?.nivel ? NIVELES[nom.nivel].texto : nom ? "Sin datos" : "Pendiente"}
              tono={nom?.nivel ? NIVELES[nom.nivel].tinta : "text-slate-400"}
              detalle={nom?.nivel ? `${nom.dominiosAltos} dominio(s) en alto · ver plan →` : "Aplica el cuestionario oficial →"}
            />
          </div>

          <div className={`grid gap-4 ${extra ? "lg:grid-cols-[minmax(0,1fr)_340px]" : ""}`}>
            <div className="flex min-w-0 flex-col gap-4">
              <Tarjeta
                titulo={`Por ${r.agruparPor === "jefe" ? "jefe directo" : "área"} y dimensión`}
                className="order-2 lg:order-1"
                accion={<span className="text-xs text-slate-500">calificación de 0 a 10</span>}
              >
                <MapaCalor clima={cl} agruparPor={r.agruparPor} />
                {cl.gruposOcultos ? (
                  <p className="mt-2 text-[12.5px] text-slate-500">
                    {cl.gruposOcultos} grupo(s) con menos de {MINIMO} respuestas no se muestran por separado para proteger el anonimato
                    (cuentan en «Toda la empresa»).
                  </p>
                ) : null}
              </Tarjeta>
              <Tarjeta titulo="Dónde poner atención" className="order-1 lg:hidden">
                <ul className="space-y-2">
                  {atencion(cl).map((x) => (
                    <li key={`${x.grupo}-${x.dimension}`} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate">
                        {x.grupo} · {x.dimension.toLowerCase()}
                      </span>
                      <span className={`rounded-lg px-2 py-0.5 font-bold ${colorCalor(x.valor)}`}>{fmtUno(x.valor)}</span>
                    </li>
                  ))}
                </ul>
              </Tarjeta>
              <div className="order-3">
                <Comentarios comentarios={r.comentarios} />
              </div>
            </div>
            {extra ? <div className="min-w-0 space-y-4">{extra({ resultado: r })}</div> : null}
          </div>
        </>
      )}
      <Abiertas abiertas={data.abiertas} />
    </div>
  );
}
