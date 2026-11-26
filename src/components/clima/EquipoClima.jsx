"use client";

// Vista del jefe (26/11/2026): resultados de SU equipo en una encuesta de clima cerrada (si llega al mínimo vigente) y el
// plan de acción de su equipo. El servidor decide quién es jefe y qué equipo es (la ficha sale de la sesión); aquí solo
// se pinta. Sirve en la app del empleado y en el panel («Mis encuestas»).
import { useState } from "react";
import Link from "next/link";
import useSWR, { useSWRConfig } from "swr";
import axios from "@/lib/axios";
import { ESTADOS_ACCION, etiquetaFavorabilidad, fechaCorta, segmentosFavorabilidad, fmtEnps } from "@/lib/clima/modelo.mjs";
import { avisoEquipoChico, contraEmpresa, rutaEquipo, textoDif } from "@/lib/clima/canales.mjs";
import { BASE, Cargando, Vacio, codigoDe, errorDe, get } from "./ui";

export const LLAVE_EQUIPO = `${BASE}/mi-equipo/campanias`;
const conEmpresa = (url, empresa) => (empresa ? `${url}${url.includes("?") ? "&" : "?"}empresa=${empresa}` : url);

function Barra({ f }) {
  return (
    <div role="img" aria-label={etiquetaFavorabilidad(f)} className="flex h-3 overflow-hidden rounded-full bg-slate-200">
      {segmentosFavorabilidad(f).map((s) => (
        <div key={s.clave} style={{ width: `${s.pct}%`, background: s.color }} />
      ))}
    </div>
  );
}

// Lista de mediciones del equipo (en «Mis encuestas»). No aparece si la persona no tiene equipo a cargo.
export function ListaEquipo({ base, empresa = null }) {
  const { data, error } = useSWR(conEmpresa(LLAVE_EQUIPO, empresa), get, { shouldRetryOnError: false, revalidateOnFocus: false });
  if (error || !data?.campanias?.length) return null;
  return (
    <section aria-labelledby="clima-equipo" className="space-y-2" data-clima-equipo>
      <h2 id="clima-equipo" className="text-[16px] font-bold text-slate-900">
        Clima de mi equipo
      </h2>
      <p className="text-[13.5px] text-slate-600">Resultados de las personas que te reportan directamente, sin nombres. Solo de encuestas ya cerradas.</p>
      <ul className="space-y-2">
        {data.campanias.map((c) => (
          <li key={c.id}>
            <Link
              href={`${rutaEquipo(base, c.id)}${empresa ? `?empresa=${empresa}` : ""}`}
              className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 hover:border-slate-300 active:bg-slate-50"
            >
              <span className="min-w-0">
                <span className="block break-words text-[15px] font-bold text-slate-900">{c.nombre}</span>
                <span className="block text-[13px] text-slate-500">
                  Cerró el {fechaCorta(c.cierra_el)} · {c.respuestas} {c.respuestas === 1 ? "respuesta" : "respuestas"}
                  {c.invitados ? ` de ${c.invitados}` : ""}
                </span>
              </span>
              <span className="shrink-0 text-[14px] font-semibold text-brand">{c.disponible ? "Ver" : "Sin datos"} ›</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

const VACIA = { texto: "", fecha_limite: "", dimension: "" };

function FormularioAccion({ id, empresa, dimensiones, alGuardar }) {
  const [f, setF] = useState(VACIA);
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  if (!abierto)
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-[14px] font-semibold text-slate-800"
      >
        + Agregar acción
      </button>
    );
  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      await axios.post(conEmpresa(`${BASE}/mi-equipo/campanias/${id}/acciones`, empresa), {
        texto: f.texto,
        dimension: f.dimension || null,
        fecha_limite: f.fecha_limite || null,
      });
      setF(VACIA);
      setAbierto(false);
      alGuardar();
    } catch (err) {
      setError(errorDe(err));
    } finally {
      setGuardando(false);
    }
  };
  const campo = "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-[15px]";
  return (
    <form onSubmit={guardar} className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <label className="block">
        <span className="text-[13.5px] font-semibold text-slate-700">¿Qué van a hacer?</span>
        <textarea
          required
          minLength={3}
          maxLength={300}
          rows={2}
          value={f.texto}
          onChange={(e) => setF({ ...f, texto: e.target.value })}
          className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-[15px]"
          placeholder="Ej. Reunión 1:1 de 20 minutos con cada persona cada mes"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block min-w-0">
          <span className="text-[13.5px] font-semibold text-slate-700">Tema</span>
          <select value={f.dimension} onChange={(e) => setF({ ...f, dimension: e.target.value })} className={`${campo} mt-1`}>
            <option value="">General</option>
            {dimensiones.map((d) => (
              <option key={d.clave} value={d.clave}>
                {d.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="block min-w-0">
          <span className="text-[13.5px] font-semibold text-slate-700">Fecha límite</span>
          <input type="date" value={f.fecha_limite} onChange={(e) => setF({ ...f, fecha_limite: e.target.value })} className={`${campo} mt-1`} />
        </label>
      </div>
      <p className="text-[13px] text-slate-500">Tú quedas como responsable; RH puede reasignarla.</p>
      {error ? (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-[14px] text-red-800">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={guardando} className="min-h-11 rounded-xl bg-brand px-4 text-[14px] font-bold text-white disabled:opacity-50">
          {guardando ? "Guardando…" : "Guardar acción"}
        </button>
        <button type="button" onClick={() => setAbierto(false)} className="min-h-11 rounded-xl px-4 text-[14px] font-semibold text-slate-600">
          Cancelar
        </button>
      </div>
    </form>
  );
}

function PlanEquipo({ id, empresa, plan, alCambiar }) {
  const [cambiando, setCambiando] = useState(null);
  const [error, setError] = useState(null);
  if (!plan?.migracion)
    return <p className="text-[14px] text-slate-500">El plan de tu equipo estará disponible cuando se actualice la base de datos.</p>;
  const nombreDim = new Map((plan.dimensiones ?? []).map((d) => [d.clave, d.nombre]));
  const estado = async (a, nuevo) => {
    setCambiando(a.id);
    setError(null);
    try {
      await axios.patch(conEmpresa(`${BASE}/mi-equipo/acciones/${a.id}`, empresa), { estado: nuevo, revision: a.revision });
      alCambiar();
    } catch (e) {
      setError(errorDe(e));
    } finally {
      setCambiando(null);
    }
  };
  return (
    <div className="space-y-3">
      {plan.acciones?.length ? (
        <ul className="space-y-2">
          {plan.acciones.map((a) => (
            <li key={a.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="break-words text-[15px] font-semibold text-slate-900">{a.texto}</p>
              <p className="mt-1 text-[13px] text-slate-500">
                {a.dimension ? nombreDim.get(a.dimension) ?? a.dimension : "General"} · {a.fecha_limite ? `vence el ${fechaCorta(a.fecha_limite)}` : "sin fecha"}
                {a.responsable?.nombre ? ` · ${a.responsable.nombre}` : ""}
              </p>
              <label className="mt-2 block max-w-xs">
                <span className="sr-only">Estado de «{a.texto}»</span>
                <select
                  value={a.estado}
                  disabled={cambiando === a.id}
                  onChange={(e) => estado(a, e.target.value)}
                  className={`min-h-11 w-full rounded-xl border border-slate-300 px-3 text-[14px] font-semibold ${ESTADOS_ACCION[a.estado]?.clase ?? ""}`}
                >
                  {plan.estados.map((s) => (
                    <option key={s} value={s}>
                      {ESTADOS_ACCION[s]?.texto ?? s}
                    </option>
                  ))}
                </select>
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[14px] text-slate-500">Aún no hay acciones. Escoge 1 o 2 cosas concretas y platícalas con tu equipo.</p>
      )}
      {error ? (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-[14px] text-red-800">
          {error}
        </p>
      ) : null}
      <FormularioAccion id={id} empresa={empresa} dimensiones={plan.dimensiones ?? []} alGuardar={alCambiar} />
    </div>
  );
}

export default function EquipoClima({ id, base, empresa = null }) {
  const { mutate: global } = useSWRConfig();
  const url = conEmpresa(`${BASE}/mi-equipo/campanias/${id}`, empresa);
  const { data, error, mutate } = useSWR(url, get, { shouldRetryOnError: false, revalidateOnFocus: false });
  const volver = (
    <Link href={`${base}${empresa ? `?empresa=${empresa}` : ""}`} className="inline-flex min-h-11 items-center text-[15px] font-semibold text-brand">
      ‹ Encuestas
    </Link>
  );
  if (error)
    return (
      <div className="space-y-3 p-4">
        {volver}
        <Vacio titulo={codigoDe(error) === "SIN_EQUIPO" ? "No tienes equipo a cargo" : "No se pudieron cargar los resultados"} texto={errorDe(error)} />
      </div>
    );
  if (!data) return <Cargando />;
  const alCambiar = () => {
    mutate();
    global(conEmpresa(LLAVE_EQUIPO, empresa));
  };
  const eq = data.equipo;
  const filas = eq ? contraEmpresa(eq, data.empresa) : [];
  const aviso = avisoEquipoChico(data.respuestas);
  return (
    <div className="space-y-4 p-4 pb-24" data-vista-jefe>
      {volver}
      <div>
        <h1 className="break-words text-xl font-extrabold text-slate-900">{data.campania.nombre}</h1>
        <p className="text-[14px] text-slate-600">
          Tu equipo · {data.respuestas} {data.respuestas === 1 ? "respuesta" : "respuestas"}
          {data.invitados ? ` de ${data.invitados}` : ""} · cerró el {fechaCorta(data.campania.cierra_el)}
        </p>
      </div>
      {!data.disponibles ? (
        <Vacio titulo="Aún no hay resultados de tu equipo" texto={data.motivo} />
      ) : (
        <>
          {aviso ? (
            <p role="note" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[14px] text-amber-950">
              {aviso}
            </p>
          ) : null}
          <section className="grid gap-3 sm:grid-cols-2" aria-label="Resumen de tu equipo">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[13px] font-semibold text-slate-500">% favorable de tu equipo</p>
              <p className="mt-1 text-[32px] font-extrabold leading-none text-slate-900">{eq.favorabilidad ? `${eq.favorabilidad.favorable} %` : "—"}</p>
              <div className="mt-3">
                <Barra f={eq.favorabilidad} />
              </div>
              {data.empresa?.favorabilidad ? (
                <p className="mt-2 text-[13px] text-slate-500">Empresa: {data.empresa.favorabilidad.favorable} %</p>
              ) : null}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[13px] font-semibold text-slate-500">eNPS de tu equipo</p>
              <p className="mt-1 text-[32px] font-extrabold leading-none text-slate-900">{fmtEnps(eq.enps?.valor)}</p>
              <p className="mt-2 text-[13px] text-slate-500">Qué tanto recomendarían trabajar aquí (−100 a +100).</p>
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-4" aria-labelledby="dims-equipo">
            <h2 id="dims-equipo" className="text-[15px] font-bold text-slate-900">
              Por tema
            </h2>
            <ul className="mt-3 space-y-3">
              {filas.map((d) => (
                <li key={d.clave} className="min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="min-w-0 break-words text-[14.5px] font-semibold text-slate-800">{d.nombre}</span>
                    <span className="shrink-0 text-[14px] font-bold text-slate-900">{d.favorable === null ? "—" : `${d.favorable} %`}</span>
                  </div>
                  <div className="mt-1.5">
                    <Barra f={d.favorabilidad} />
                  </div>
                  <p className={`mt-1 text-[13px] ${d.dif === null ? "text-slate-500" : d.dif < 0 ? "text-red-700" : "text-green-700"}`}>{textoDif(d.dif)}</p>
                </li>
              ))}
            </ul>
          </section>
          {data.comentarios?.some((q) => q.respuestas.length) ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-4" aria-labelledby="coment-equipo">
              <h2 id="coment-equipo" className="text-[15px] font-bold text-slate-900">
                Comentarios de tu equipo
              </h2>
              {data.comentarios
                .filter((q) => q.respuestas.length)
                .map((q) => (
                  <div key={q.clave} className="mt-3">
                    <p className="text-[13.5px] font-semibold text-slate-600">{q.texto}</p>
                    <ul className="mt-1 space-y-1.5">
                      {q.respuestas.map((t, i) => (
                        <li key={i} className="break-words rounded-xl bg-slate-50 px-3 py-2 text-[14.5px] text-slate-800">
                          «{t}»
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </section>
          ) : null}
        </>
      )}
      <section className="space-y-3" aria-labelledby="plan-equipo">
        <h2 id="plan-equipo" className="text-[16px] font-bold text-slate-900">
          Plan de acción de tu equipo
        </h2>
        <PlanEquipo id={id} empresa={empresa} plan={data.plan} alCambiar={alCambiar} />
      </section>
    </div>
  );
}
