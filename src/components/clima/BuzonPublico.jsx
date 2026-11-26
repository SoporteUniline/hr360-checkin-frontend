"use client";

// Buzón confidencial (NOM-035, 8.1 b) · página pública /buzon/<clave>: contar lo que pasó sin dar nombre (opcional) y
// recibir folio + clave para consultar el estado. Sin sesión; la liga es de la empresa (no de la persona).
import { useState } from "react";
import useSWR from "swr";
import axios from "@/lib/axios";
import { ESTADOS_QUEJA, RELATO_MINIMO, erroresQueja } from "@/lib/clima/inspeccion.mjs";
import { BASE, Boton, Cargando, Vacio, errorDe, get } from "./ui";

const CAMPO = "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-[15px] text-slate-900";
const ETIQUETA = "mb-1 block text-[14px] font-semibold text-slate-800";

function Seguimiento() {
  const [datos, setDatos] = useState({ folio: "", clave: "" });
  const [res, setRes] = useState(null);
  const [error, setError] = useState(null);
  const consultar = async (e) => {
    e.preventDefault();
    setError(null);
    setRes(null);
    try {
      const r = await axios.post(`${BASE}/publica/buzon-seguimiento`, datos);
      setRes(r.data.queja);
    } catch (err) {
      setError(errorDe(err, "No encontramos ese folio con esa clave."));
    }
  };
  return (
    <form onSubmit={consultar} className="space-y-3 rounded-2xl border border-slate-200 p-4" noValidate>
      <h2 className="text-[16px] font-bold text-slate-900">Consultar con mi folio</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={ETIQUETA}>Folio</span>
          <input className={`${CAMPO} uppercase`} autoComplete="off" placeholder="B-XXXXXXXX" value={datos.folio} onChange={(e) => setDatos({ ...datos, folio: e.target.value })} />
        </label>
        <label className="block">
          <span className={ETIQUETA}>Clave</span>
          <input className={`${CAMPO} uppercase`} autoComplete="off" value={datos.clave} onChange={(e) => setDatos({ ...datos, clave: e.target.value })} />
        </label>
      </div>
      <Boton type="submit" className="w-full sm:w-auto">
        Consultar
      </Boton>
      {error ? <p className="text-[14px] text-red-700">{error}</p> : null}
      {res ? (
        <div role="status" className="rounded-xl bg-slate-50 p-3 text-[14px] text-slate-800">
          <p>
            <strong>{res.folio}</strong> · {res.tipo} · <strong>{ESTADOS_QUEJA[res.estado]?.texto ?? res.estado}</strong>
          </p>
          {res.respuesta ? <p className="mt-1 whitespace-pre-wrap">{res.respuesta}</p> : <p className="mt-1 text-slate-600">Aún no hay respuesta.</p>}
        </div>
      ) : null}
    </form>
  );
}

export default function BuzonPublico({ clave }) {
  const url = `${BASE}/publica/buzon/${encodeURIComponent(clave)}`;
  const { data, error } = useSWR(url, get, { revalidateOnFocus: false, shouldRetryOnError: false });
  const [datos, setDatos] = useState({ tipo: "", relato: "", centro: "", nombre: "", contacto: "" });
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [hecho, setHecho] = useState(null);
  const [falla, setFalla] = useState(null);
  const enviar = async (e) => {
    e.preventDefault();
    const errs = erroresQueja(datos);
    setErrores(errs);
    if (Object.keys(errs).length) return;
    setEnviando(true);
    setFalla(null);
    try {
      const r = await axios.post(url, { ...datos, canal: new URLSearchParams(window.location.search).get("canal") === "whatsapp" ? "whatsapp" : "web" });
      setHecho(r.data);
    } catch (err) {
      setFalla(errorDe(err));
    } finally {
      setEnviando(false);
    }
  };
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col bg-white">
      <header className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
        <span className="size-7 rounded-lg bg-gradient-to-br from-brand to-brand-accent" aria-hidden="true" />
        <span className="text-sm font-bold tracking-[0.12em] text-slate-900">ADAMIA</span>
      </header>
      <div className="space-y-4 p-4 pb-16">
        {error ? (
          <Vacio titulo="No se pudo abrir el buzón" texto={errorDe(error, "La liga del buzón no es válida.")} />
        ) : !data ? (
          <Cargando />
        ) : hecho ? (
          <section role="status" className="space-y-3 rounded-2xl border border-green-200 bg-green-50 p-4">
            <h1 className="text-[18px] font-extrabold text-green-900">Recibimos tu queja</h1>
            <p className="text-[14px] text-green-900">Guarda estos datos: con ellos consultas cómo va. No los podemos recuperar.</p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[15px]">
              <dt className="font-semibold text-green-900">Folio</dt>
              <dd className="font-mono font-bold text-slate-900">{hecho.folio}</dd>
              <dt className="font-semibold text-green-900">Clave</dt>
              <dd className="break-all font-mono font-bold text-slate-900">{hecho.clave}</dd>
            </dl>
          </section>
        ) : (
          <form onSubmit={enviar} className="space-y-4" noValidate>
            <div>
              <h1 className="text-[20px] font-extrabold text-slate-900">Buzón confidencial de {data.empresa}</h1>
              <p className="mt-1 text-[14px] text-slate-700">
                Cuéntanos si viviste o viste violencia, acoso, malos tratos o algo que ponga en riesgo a alguien en el trabajo. <strong>No tienes que dar tu nombre.</strong>{" "}
                Solo RH y la dirección lo leen; no se guarda tu IP ni tu usuario.
              </p>
            </div>
            <fieldset>
              <legend className={ETIQUETA}>¿De qué se trata?</legend>
              <div className="space-y-2">
                {Object.entries(data.tipos).map(([k, v]) => (
                  <label key={k} className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 px-3 text-[15px] has-[:checked]:border-brand has-[:checked]:bg-blue-50">
                    <input type="radio" name="tipo" value={k} checked={datos.tipo === k} onChange={() => setDatos({ ...datos, tipo: k })} className="size-5 accent-blue-600" />
                    {v}
                  </label>
                ))}
              </div>
              {errores.tipo ? <span className="mt-1 block text-[14px] text-red-700">{errores.tipo}</span> : null}
            </fieldset>
            <label className="block">
              <span className={ETIQUETA}>¿Qué pasó?</span>
              <textarea
                className={`${CAMPO} min-h-36 py-2`}
                maxLength={data.limites?.relato ?? 5000}
                value={datos.relato}
                onChange={(e) => setDatos({ ...datos, relato: e.target.value })}
                placeholder="Qué pasó, cuándo y dónde. Si prefieres, sin nombres."
              />
              <span className="mt-1 block text-[13px] text-slate-500">Al menos {RELATO_MINIMO} caracteres.</span>
              {errores.relato ? <span className="mt-1 block text-[14px] text-red-700">{errores.relato}</span> : null}
            </label>
            {data.centros?.length ? (
              <label className="block">
                <span className={ETIQUETA}>Centro de trabajo (opcional)</span>
                <select className={CAMPO} value={datos.centro} onChange={(e) => setDatos({ ...datos, centro: e.target.value })}>
                  <option value="">Prefiero no decir</option>
                  {data.centros.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <details className="rounded-xl border border-slate-200 px-3">
              <summary className="min-h-11 cursor-pointer py-3 text-[14px] font-semibold text-slate-800">Quiero dejar mis datos para que me contacten (opcional)</summary>
              <div className="space-y-3 pb-3">
                <label className="block">
                  <span className={ETIQUETA}>Nombre</span>
                  <input className={CAMPO} maxLength={150} autoComplete="name" value={datos.nombre} onChange={(e) => setDatos({ ...datos, nombre: e.target.value })} />
                </label>
                <label className="block">
                  <span className={ETIQUETA}>Teléfono o correo</span>
                  <input className={CAMPO} maxLength={150} value={datos.contacto} onChange={(e) => setDatos({ ...datos, contacto: e.target.value })} />
                </label>
              </div>
            </details>
            {falla ? <p className="text-[14px] text-red-700">{falla}</p> : null}
            <Boton type="submit" variante="primario" className="w-full" disabled={enviando}>
              {enviando ? "Enviando…" : "Enviar de forma confidencial"}
            </Boton>
          </form>
        )}
        {data && !error ? <Seguimiento /> : null}
      </div>
    </main>
  );
}
