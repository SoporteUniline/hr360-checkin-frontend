"use client";
// Muro de Mi espacio (maqueta «AppFeed», aprobada 27/11/2026 + portada y fijadas, agregados del dueño): foto de portada
// arriba (como la de una página), franja de comunicados por confirmar, publicaciones fijadas (hasta 3) y el resto del
// muro con «Ver más». Notificaciones push (si están configuradas), publicar (queda pendiente de aprobación) y ocultar mi
// cumpleaños. Solo lo que el empleado puede ver (lo decide el servidor). Backend: GET /checador/comunicados/mi/muro.
import { useState } from "react";
import Link from "next/link";
import useSWRInfinite from "swr/infinite";
import { AlertCircle, ChevronRight, PenSquare } from "lucide-react";
import axios from "@/lib/axios";
import { API_MI, RUTA_PUBLICAR, enlaceSeguro, errorDe, ordenarMuro, porConfirmar, rutaPost, textoPendientes } from "@/lib/comunicados/comunicados.mjs";
import Publicacion from "./Publicacion";
import AvisosPush from "./AvisosPush";
import useMeGusta from "./useMeGusta";
import { AvisoError, Interruptor, useZona } from "./comun";

const get = (url) => axios.get(url).then((r) => r.data);
const llave = (i, previa) => (i === 0 ? `${API_MI}/muro` : previa?.siguiente ? `${API_MI}/muro?cursor=${encodeURIComponent(previa.siguiente)}` : null);
const urlMeGusta = (id) => `${API_MI}/${encodeURIComponent(id)}/me-gusta`;

export function Portada({ portada }) {
  if (!portada?.url) return null;
  const enlace = enlaceSeguro(portada.enlace);
  const contenido = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada de S3 */}
      <img src={portada.url} alt={portada.titulo || "Portada del muro"} className="size-full object-cover" />
      {portada.titulo ? (
        <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-black/55 px-4 py-3 text-white">
          <span className="break-words text-lg font-extrabold leading-tight drop-shadow">{portada.titulo}</span>
          {enlace ? <ChevronRight className="size-5 shrink-0" aria-hidden="true" /> : null}
        </span>
      ) : null}
    </>
  );
  const clase = "relative block aspect-[16/7] w-full overflow-hidden rounded-2xl bg-slate-100 sm:aspect-[3/1]";
  return enlace
    ? <a href={enlace} target="_blank" rel="noopener noreferrer" className={clase} data-portada>{contenido}<span className="sr-only"> (se abre en otra pestaña)</span></a>
    : <div className={clase} data-portada>{contenido}</div>;
}

function Preferencias({ inicial }) {
  const [ocultar, setOcultar] = useState(Boolean(inicial));
  const [mensaje, setMensaje] = useState(null);
  const cambiar = async (v) => {
    const antes = ocultar;
    setOcultar(v); setMensaje(null);
    try { await axios.put(`${API_MI}/preferencias`, { ocultar_cumpleanos: v }); setMensaje(v ? "Tu cumpleaños ya no se publicará en el muro." : "Tu cumpleaños se publicará en el muro."); }
    catch (e) { setOcultar(antes); setMensaje(errorDe(e)); }
  };
  return (
    <section aria-labelledby="pref-muro" className="grid gap-1 rounded-2xl border border-slate-200 bg-white p-4" data-preferencias>
      <h2 id="pref-muro" className="text-[15px] font-bold text-slate-900">Mis preferencias del muro</h2>
      <Interruptor id="pref-cumple" checked={ocultar} onChange={cambiar} etiqueta="Ocultar mi cumpleaños" descripcion="No se publica la felicitación automática de tu cumpleaños." />
      {mensaje ? <p role="status" className="text-[13px] text-slate-600">{mensaje}</p> : null}
    </section>
  );
}

export default function Muro() {
  const tz = useZona();
  const { data, error, isLoading, size, setSize, mutate, isValidating } = useSWRInfinite(llave, get, { revalidateOnFocus: false, revalidateFirstPage: false, shouldRetryOnError: false });
  const megusta = useMeGusta(urlMeGusta);
  const primera = data?.[0];
  const todos = (data ?? []).flatMap((p) => p?.items ?? []).map(megusta.aplicar);
  const { fijados, resto } = ordenarMuro(todos);
  const pendientes = Number(primera?.pendientes_confirmar) || 0;
  const primeroPendiente = todos.find(porConfirmar);
  const hayMas = Boolean(data?.[data.length - 1]?.siguiente);
  const cargandoMas = isValidating && size > (data?.length ?? 0);
  const tarjeta = (it) => <li key={it.id}><Publicacion it={it} tz={tz} alMeGusta={megusta.alternar} ocupado={megusta.ocupado(it.id)} /></li>;

  return (
    <div className="space-y-4" data-pantalla="muro">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">Muro</h1>
        {primera?.puede_publicar !== false ? <Link href={RUTA_PUBLICAR} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-[15px] font-semibold text-slate-800 hover:bg-slate-50"><PenSquare className="size-4" aria-hidden="true" />Publicar</Link> : null}
      </div>
      <Portada portada={primera?.portada} />
      {pendientes ? (
        <Link href={primeroPendiente ? rutaPost(primeroPendiente.id) : "#muro-lista"} className="flex min-h-12 items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[15px] font-semibold text-amber-950" data-franja-pendientes>
          <AlertCircle className="size-5 shrink-0 text-amber-700" aria-hidden="true" />
          <span className="min-w-0 flex-1">{textoPendientes(pendientes, primeroPendiente)}</span>
          <ChevronRight className="size-5 shrink-0" aria-hidden="true" />
        </Link>
      ) : null}
      <AvisoError error={error} porDefecto="No pudimos cargar el muro." reintentar={mutate} />
      {megusta.error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{megusta.error}</p> : null}
      {isLoading && !data ? <p role="status" className="rounded-xl bg-slate-100 p-5 text-sm text-slate-500">Cargando el muro…</p> : null}
      {fijados.length ? (
        <section aria-label="Publicaciones fijadas" data-fijadas>
          <ul className="grid gap-4">{fijados.map(tarjeta)}</ul>
        </section>
      ) : null}
      <section aria-label="Publicaciones" id="muro-lista">
        {data && !todos.length ? <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-[15px] text-slate-600">Aún no hay publicaciones. Aquí verás los avisos de tu empresa.</p> : null}
        <ul className="grid gap-4">{resto.map(tarjeta)}</ul>
      </section>
      {hayMas ? (
        <button type="button" onClick={() => setSize(size + 1)} disabled={cargandoMas} className="flex min-h-12 w-full items-center justify-center rounded-xl border border-slate-300 bg-white text-[15px] font-semibold text-slate-800">
          {cargandoMas ? "Cargando…" : "Ver más publicaciones"}
        </button>
      ) : null}
      {data ? <AvisosPush /> : null}
      {data ? <Preferencias inicial={primera?.preferencias?.ocultar_cumpleanos} /> : null}
    </div>
  );
}
