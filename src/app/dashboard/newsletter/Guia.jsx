"use client";

// «Guía 2027: lo que tu empresa necesita para cumplir la ley» (docs/newsletter.md): la versión vigente, lo que está «por
// confirmar» (no sale en los correos) y corregir o confirmar un punto (crea una versión nueva).
import { useState } from "react";
import useSWR from "swr";
import { enqueueSnackbar } from "notistack";
import { fetcherWithToken } from "@/lib/fetcher";
import { ESTADOS_GUIA, cuerpoPunto, erroresPunto, fechaCorta, fechaLarga, textoPunto } from "@/lib/newsletter/reglas.mjs";
import { Aviso, CAMPO, Insignia, PRIMARIO, SECUNDARIO, TARJETA, pedir } from "./ui";

const formularioDe = (p) => ({
  titulo: p.titulo ?? "", detalle: p.detalle ?? "", estado: p.estado ?? "vigente", fecha_entrada: p.fecha_entrada ?? "",
  fuente_titulo: p.fuente?.titulo ?? "", fuente_url: p.fuente?.url ?? "", fecha_fuente: p.fecha_fuente ?? "", nota: p.nota ?? "", por_confirmar: Boolean(p.por_confirmar),
});

function EditarPunto({ punto, alTerminar }) {
  const [f, setF] = useState(formularioDe(punto));
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const campo = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const id = (k) => `punto-${punto.clave}-${k}`;
  const guardar = async (e) => {
    e.preventDefault();
    const err = erroresPunto(f);
    setErrores(err);
    if (Object.keys(err).length) return;
    setGuardando(true);
    try {
      const r = await pedir(`/guia/puntos/${encodeURIComponent(punto.clave)}`, { method: "PUT", body: JSON.stringify(cuerpoPunto(f)) });
      enqueueSnackbar(`Guía actualizada (versión ${r.version}).`, { variant: "success" });
      alTerminar(true);
    } catch (x) {
      enqueueSnackbar(x.message, { variant: "error" });
    } finally {
      setGuardando(false);
    }
  };
  const error = (k) => (errores[k] ? <span className="font-bold text-[#B91C1C]">{errores[k]}</span> : null);
  return (
    <form onSubmit={guardar} className="grid gap-4 rounded-xl bg-[#F5F7FB] p-4" aria-label={`Editar «${punto.titulo}»`}>
      <label className="grid gap-2" htmlFor={id("titulo")}><span className="font-bold">Título</span>
        <input id={id("titulo")} className={`${CAMPO} h-12`} value={f.titulo} maxLength={150} onChange={campo("titulo")} aria-invalid={Boolean(errores.titulo)} />{error("titulo")}</label>
      <label className="grid gap-2" htmlFor={id("detalle")}><span className="font-bold">Qué debe hacer la empresa</span>
        <textarea id={id("detalle")} className={`${CAMPO} min-h-28 py-3`} value={f.detalle} maxLength={700} onChange={campo("detalle")} aria-invalid={Boolean(errores.detalle)} />{error("detalle")}</label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2" htmlFor={id("estado")}><span className="font-bold">Estado</span>
          <select id={id("estado")} className={`${CAMPO} h-12`} value={f.estado} onChange={campo("estado")}>
            {Object.entries(ESTADOS_GUIA).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select></label>
        {f.estado === "aprobado_con_fecha" ? (
          <label className="grid gap-2" htmlFor={id("entrada")}><span className="font-bold">Entra en vigor el</span>
            <input id={id("entrada")} type="date" className={`${CAMPO} h-12`} value={f.fecha_entrada} onChange={campo("fecha_entrada")} aria-invalid={Boolean(errores.fecha_entrada)} />{error("fecha_entrada")}</label>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2" htmlFor={id("url")}><span className="font-bold">Enlace de la fuente (https://…)</span>
          <input id={id("url")} type="url" inputMode="url" className={`${CAMPO} h-12`} value={f.fuente_url} maxLength={500} onChange={campo("fuente_url")} aria-invalid={Boolean(errores.fuente_url)} />{error("fuente_url")}</label>
        <label className="grid gap-2" htmlFor={id("fuente")}><span className="font-bold">Nombre de la fuente</span>
          <input id={id("fuente")} className={`${CAMPO} h-12`} value={f.fuente_titulo} maxLength={200} onChange={campo("fuente_titulo")} placeholder="DOF, Cámara de Diputados…" /></label>
      </div>
      <label className="grid gap-2 sm:max-w-xs" htmlFor={id("fecha")}><span className="font-bold">Fecha de la fuente</span>
        <input id={id("fecha")} type="date" className={`${CAMPO} h-12`} value={f.fecha_fuente} onChange={campo("fecha_fuente")} /></label>
      <label className="flex cursor-pointer items-start gap-3" htmlFor={id("confirmar")}>
        <input id={id("confirmar")} type="checkbox" className="mt-1 size-5 shrink-0 accent-[#B91C1C]" checked={f.por_confirmar} onChange={campo("por_confirmar")} />
        <span><span className="block font-bold">Todavía por confirmar</span><span className="block text-[#4B5563]">Lo marcado así no sale en los correos.</span></span>
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="submit" className={PRIMARIO} disabled={guardando}>{guardando ? "Guardando…" : "Guardar punto"}</button>
        <button type="button" className={SECUNDARIO} onClick={() => alTerminar(false)} disabled={guardando}>Cancelar</button>
      </div>
    </form>
  );
}

export default function Guia() {
  const { data, error, mutate } = useSWR("/checador/newsletter/guia", fetcherWithToken);
  const [editando, setEditando] = useState(null);
  const guia = data?.guia;
  const puntos = guia?.puntos ?? [];
  const porConfirmar = puntos.filter((p) => p.por_confirmar);
  return (
    <section className={`${TARJETA} min-w-0`} aria-labelledby="titulo-guia" data-seccion="guia">
      <div className="grid gap-1">
        <h2 id="titulo-guia" className="text-[1.25rem] font-bold break-words">{data?.titulo || "Guía 2027: lo que tu empresa necesita para cumplir la ley"}</h2>
        {guia ? <p className="text-[#4B5563]">{`Versión ${guia.version}, revisada el ${fechaLarga(guia.revisada_en)}. Va en el correo de bienvenida de cada prospecto y se actualiza con cada boletín aprobado.`}</p> : null}
      </div>
      {error ? <Aviso tono="peligro" titulo="No se pudo cargar la guía">{error?.response?.data?.error || error.message}</Aviso> : null}
      {data?.aviso ? <Aviso tono="alerta">{data.aviso}</Aviso> : null}
      {porConfirmar.length ? (
        <Aviso tono="alerta" titulo={`${porConfirmar.length} ${porConfirmar.length === 1 ? "punto por confirmar" : "puntos por confirmar"}`}>
          {porConfirmar.map((p) => p.titulo).join(", ")}. No salen en los correos hasta que les pongas su fuente y quites «por confirmar».
        </Aviso>
      ) : null}
      <ul className="grid gap-3" aria-label="Puntos de la guía">
        {puntos.map((p) => (
          <li key={p.clave} className={`grid gap-2 rounded-xl border p-4 ${p.por_confirmar ? "border-[#F59E0B] bg-[#FFFBEB]" : "border-[#E5E9F2]"}`} data-punto={p.clave}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <p className="min-w-0 font-bold break-words">{p.titulo}</p>
              <div className="flex min-w-0 flex-wrap gap-2">
                {p.por_confirmar ? <Insignia tono="alerta">Por confirmar</Insignia> : null}
                <Insignia envolver tono={p.estado === "vigente" ? "exito" : p.estado === "propuesta" ? "neutro" : "info"}>{textoPunto(p)}</Insignia>
              </div>
            </div>
            <p>{p.detalle}</p>
            <p className="break-words text-[#374151]">
              {p.fuente?.url ? <a href={p.fuente.url} target="_blank" rel="noopener noreferrer" className="font-bold text-[#1E40C4] underline underline-offset-4">{p.fuente.titulo || "Fuente"}</a> : <span className="font-bold">Sin fuente</span>}
              {p.fecha_fuente ? ` · fuente del ${fechaCorta(p.fecha_fuente)}` : ""}{` · revisado el ${fechaCorta(p.revisado_en)}`}
            </p>
            {p.nota ? <p className="text-[#4B5563]">{p.nota}</p> : null}
            {editando === p.clave ? (
              <EditarPunto punto={p} alTerminar={(ok) => { setEditando(null); if (ok) mutate(); }} />
            ) : (
              <div><button type="button" className={SECUNDARIO} onClick={() => setEditando(p.clave)} disabled={data?.guia?.disponible === false}>{p.por_confirmar ? "Confirmar o corregir" : "Corregir"}</button></div>
            )}
          </li>
        ))}
      </ul>
      {data?.historial?.length ? (
        <details className="rounded-xl border border-[#E5E9F2] p-4">
          <summary className="cursor-pointer font-bold">Versiones anteriores ({data.historial.length})</summary>
          <ul className="mt-3 grid gap-2">
            {data.historial.map((v) => <li key={v.version}>{`Versión ${v.version} · ${v.origen === "newsletter" ? "con el boletín" : "corrección a mano"} · ${fechaLarga(v.creado_en)}${v.creado_por ? ` · ${v.creado_por}` : ""}`}</li>)}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
