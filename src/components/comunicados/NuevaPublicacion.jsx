"use client";
// Publicar en el muro desde Mi espacio. Empleado: va al muro de toda la empresa y queda «pendiente de aprobación» hasta
// que RH la apruebe (si la empresa lo permite; si no, el servidor responde 403 y se dice aquí). Jefe con equipo: además
// puede publicar directo SOLO a su equipo (lo valida el servidor con su sesión). Texto plano, fotos (hasta 10) y video
// de YouTube. Backend: POST /checador/comunicados/mi/publicaciones (multipart) · jefe: POST /checador/comunicados.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import useSWR, { useSWRConfig } from "swr";
import { ArrowLeft, ImagePlus, Trash2 } from "lucide-react";
import axios from "@/lib/axios";
import useMonitorEquipo from "@/hooks/useMonitorEquipo";
import { API, API_MI, LIMITES, RUTA_MURO, TIPOS_FOTO, errorDe, urlMiniatura, validarArchivos, youtubeId } from "@/lib/comunicados/comunicados.mjs";
import { Campo, ariaCampo, entrada, get, opcionesSwr } from "./comun";

const ESTADO = {
  pendiente_aprobacion: ["Esperando aprobación de RH", "bg-amber-100 text-amber-900"],
  publicado: ["Publicada", "bg-green-100 text-green-800"],
  rechazado: ["No se publicó", "bg-red-100 text-red-800"],
};
const boton = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-bold disabled:opacity-50";

const MIS = `${API_MI}/publicaciones`;
function MisPublicaciones() {
  const { data, error } = useSWR(MIS, get, opcionesSwr);
  const items = data?.items ?? data?.publicaciones ?? [];
  if (error || !items.length) return null;
  return (
    <section aria-labelledby="mis-pub" className="grid gap-2" data-mis-publicaciones>
      <h2 id="mis-pub" className="text-[15px] font-bold text-slate-900">Mis publicaciones</h2>
      <ul className="grid gap-2">
        {items.map((p) => {
          const [texto, tono] = ESTADO[p.estado] ?? [p.estado, "bg-slate-100 text-slate-700"];
          return (
            <li key={p.id} className="grid gap-1 rounded-xl border border-slate-200 bg-white p-3">
              <span className={`w-fit rounded-full px-2 py-0.5 text-[13px] font-semibold ${tono}`}>{texto}</span>
              <span className="line-clamp-2 break-words text-[15px] text-slate-800">{p.titulo || p.cuerpo}</span>
              {p.estado === "rechazado" && p.motivo_rechazo ? <span className="text-[13px] text-slate-600">Motivo: {p.motivo_rechazo}</span> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function NuevaPublicacion() {
  const { esJefe } = useMonitorEquipo();
  const [destino, setDestino] = useState("muro");
  const [titulo, setTitulo] = useState("");
  const [cuerpo, setCuerpo] = useState("");
  const [youtube, setYoutube] = useState("");
  const [confirmacion, setConfirmacion] = useState(false);
  const [fotos, setFotos] = useState([]);
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const { mutate } = useSWRConfig();
  const urls = useRef([]);
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);
  const yt = youtubeId(youtube);
  const errFotos = validarArchivos({ fotos: fotos.map((f) => f.archivo) }).fotos;
  const equipo = esJefe && destino === "equipo";

  const agregar = (lista) => {
    const nuevas = [...lista].map((archivo) => { const url = URL.createObjectURL(archivo); urls.current.push(url); return { clave: `${archivo.name}-${archivo.size}-${Math.random()}`, archivo, url }; });
    setFotos((x) => [...x, ...nuevas]);
  };
  const publicar = async (e) => {
    e.preventDefault();
    const err = {};
    if (!cuerpo.trim()) err.cuerpo = "Escribe algo para publicar.";
    if (cuerpo.length > LIMITES.cuerpo) err.cuerpo = `Máximo ${LIMITES.cuerpo} caracteres.`;
    if (youtube.trim() && !yt) err.youtube = "Pega un enlace de YouTube (youtube.com o youtu.be).";
    setErrores(err);
    if (Object.keys(err).length || errFotos) return;
    const datos = equipo
      ? { tipo: "publicacion", titulo: titulo.trim(), cuerpo: cuerpo.trim(), nivel: confirmacion ? "confirmacion" : "normal", youtube_url: yt ? youtube.trim() : null, permite_reacciones: true, permite_comentarios: true, canales: { push: true, correo: false, popup: confirmacion }, audiencia: { todos: true, sucursales: [], areas: [], puestos: [], empleados: [] }, publicar: "ahora", recordatorio_auto: confirmacion, recordatorios_max: confirmacion ? 3 : 0 }
      : { tipo: "publicacion", titulo: titulo.trim(), cuerpo: cuerpo.trim(), youtube_url: yt ? youtube.trim() : null };
    const fd = new FormData();
    fd.append("datos", JSON.stringify(datos));
    for (const f of fotos) fd.append("fotos", f.archivo, f.archivo.name);
    setEnviando(true); setMensaje(null);
    try {
      const r = await axios.post(equipo ? API : `${API_MI}/publicaciones`, fd);
      const estado = r.data?.estado ?? r.data?.comunicado?.estado;
      setMensaje({ tipo: "ok", texto: estado === "publicado" || equipo ? "¡Publicado! Ya lo ve tu equipo." : "Tu publicación quedó pendiente de aprobación. Te avisamos cuando RH la revise." });
      setTitulo(""); setCuerpo(""); setYoutube(""); setFotos([]); setConfirmacion(false); mutate(MIS);
    } catch (x) {
      setMensaje({ tipo: "error", texto: x?.response?.status === 403 && !equipo ? errorDe(x, "Tu empresa no permite que los empleados publiquen en el muro.") : errorDe(x, "No se pudo publicar.") });
    } finally { setEnviando(false); }
  };

  return (
    <div className="space-y-4" data-pantalla="publicar">
      <Link href={RUTA_MURO} className="inline-flex min-h-11 items-center gap-1.5 text-[15px] font-medium text-slate-600"><ArrowLeft className="size-4" aria-hidden="true" />Muro</Link>
      <h1 className="text-2xl font-bold tracking-tight">Publicar en el muro</h1>
      <form onSubmit={publicar} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4" noValidate>
        {esJefe ? (
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-semibold text-slate-800">¿Dónde se publica?</legend>
            {[["muro", "En el muro de la empresa", "RH la revisa antes de que salga."], ["equipo", "Solo a mi equipo", "Se publica directo a tus colaboradores."]].map(([v, t, d]) => (
              <label key={v} className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-3 ${destino === v ? "border-[#2563EB] bg-blue-50/60" : "border-slate-200"}`}>
                <input type="radio" name="destino" value={v} checked={destino === v} onChange={() => setDestino(v)} className="mt-0.5 size-5 accent-[#2563EB]" />
                <span><span className="block text-[15px] font-semibold">{t}</span><span className="block text-[13px] text-slate-600">{d}</span></span>
              </label>
            ))}
          </fieldset>
        ) : <p className="rounded-xl bg-blue-50 p-3 text-[13px] text-blue-900">Tu publicación la revisa Recursos Humanos antes de que salga en el muro.</p>}
        <Campo id="pub-titulo" etiqueta="Título (opcional)">
          <input {...ariaCampo("pub-titulo")} className={entrada} maxLength={LIMITES.titulo} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </Campo>
        <Campo id="pub-cuerpo" etiqueta="¿Qué quieres compartir?" error={errores.cuerpo} ayuda={`${cuerpo.length} de ${LIMITES.cuerpo}`}>
          <textarea {...ariaCampo("pub-cuerpo", errores.cuerpo, true)} rows={5} className={`${entrada} py-2 text-base`} maxLength={LIMITES.cuerpo} value={cuerpo} onChange={(e) => { setCuerpo(e.target.value); setErrores((x) => ({ ...x, cuerpo: undefined })); }} />
        </Campo>
        <div className="grid gap-2">
          <input id="pub-fotos" type="file" accept={TIPOS_FOTO.join(",")} multiple className="sr-only" onChange={(e) => { agregar(e.target.files ?? []); e.target.value = ""; }} />
          <label htmlFor="pub-fotos" className={`${boton} w-fit cursor-pointer border border-slate-300 bg-white text-slate-800`}><ImagePlus className="size-5" aria-hidden="true" />Agregar fotos</label>
          {errFotos ? <p role="alert" className="text-[13px] text-red-700">{errFotos}</p> : null}
          {fotos.length ? (
            <ul className="grid grid-cols-3 gap-2" aria-label="Fotos elegidas">
              {fotos.map((f, i) => (
                <li key={f.clave} className="relative aspect-square overflow-hidden rounded-lg bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:) */}
                  <img src={f.url} alt={`Foto ${i + 1}`} className="size-full object-cover" />
                  <button type="button" aria-label={`Quitar foto ${i + 1}`} onClick={() => setFotos((x) => x.filter((y) => y.clave !== f.clave))} className="absolute right-1 top-1 grid size-11 place-items-center rounded-full bg-white/90 text-red-700 shadow"><Trash2 className="size-4" aria-hidden="true" /></button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <Campo id="pub-youtube" etiqueta="Video de YouTube (opcional)" error={errores.youtube}>
          <input {...ariaCampo("pub-youtube", errores.youtube)} type="url" inputMode="url" placeholder="https://youtu.be/…" className={entrada} value={youtube} onChange={(e) => setYoutube(e.target.value)} />
        </Campo>
        {/* eslint-disable-next-line @next/next/no-img-element -- miniatura pública de YouTube */}
        {yt ? <img src={urlMiniatura(yt)} alt="Vista previa del video" className="aspect-video w-full rounded-xl object-cover" /> : null}
        {equipo ? (
          <label htmlFor="pub-confirmacion" className="flex min-h-11 cursor-pointer items-center gap-3">
            <input id="pub-confirmacion" type="checkbox" className="size-5 accent-[#2563EB]" checked={confirmacion} onChange={(e) => setConfirmacion(e.target.checked)} />
            <span className="text-[15px] text-slate-800">Pedir a mi equipo que confirme de leído</span>
          </label>
        ) : null}
        {mensaje ? <p role={mensaje.tipo === "ok" ? "status" : "alert"} className={`rounded-xl p-3 text-[15px] ${mensaje.tipo === "ok" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`} data-resultado={mensaje.tipo}>{mensaje.texto}</p> : null}
        <button type="submit" disabled={enviando} className={`${boton} bg-[#2563EB] text-white`}>{enviando ? "Publicando…" : equipo ? "Publicar a mi equipo" : "Enviar a revisión"}</button>
      </form>
      <MisPublicaciones />
    </div>
  );
}
