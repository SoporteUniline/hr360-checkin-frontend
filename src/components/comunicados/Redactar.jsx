"use client";
// Redactar comunicado (maqueta «Redactar», aprobada 27/11/2026): tipo, texto, fotos (hasta 10), un PDF, video de YouTube,
// me gusta y comentarios, nivel (normal o confirmación de leído con recordatorio automático), para quién (conteo en vivo),
// canales y cuándo (ahora, programar o borrador; y hasta cuándo se ve). Editar = mismo formulario (solo borrador o
// programado). Backend: POST /checador/comunicados (multipart: `datos` JSON + `fotos` + `pdf`), PUT /:id, GET /:id.
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { ChevronLeft, FileText, ImagePlus, Trash2, Youtube } from "lucide-react";
import axios from "@/lib/axios";
import { SelectorEmpresa } from "@/components/nomina/comun";
import {
  API, LIMITES, RUTA_PANEL, TIPOS_FOTO, TIPOS_REDACTAR, datosParaEnviar, errorDe, formularioDe, formularioVacio, principal, rutaSeguimiento,
  tamanoLegible, textoPublicar, urlMiniatura, validarArchivos, validarFormulario, youtubeId,
} from "@/lib/comunicados/comunicados.mjs";
import SelectorAudiencia, { usePreviaAudiencia } from "./SelectorAudiencia";
import { AvisoError, Campo, Interruptor, Mensaje, ariaCampo, botonPrimario, botonSecundario, botonTexto, entrada, get, opcionesSwr, tarjeta, useEmpresa } from "./comun";

const seccion = `${tarjeta} grid gap-4 p-4 sm:p-5`;
const tituloSeccion = "text-[15px] font-extrabold text-slate-900";

function Radio({ name, value, actual, alCambiar, titulo, descripcion }) {
  const id = `${name}-${value}`;
  return (
    <label htmlFor={id} className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-3 ${actual === value ? "border-[#2563EB] bg-blue-50/60" : "border-slate-200 bg-white"}`}>
      <input id={id} type="radio" name={name} value={value} checked={actual === value} onChange={() => alCambiar(value)} className="mt-0.5 size-5 accent-[#2563EB]" />
      <span className="min-w-0"><span className="block text-sm font-bold text-slate-900">{titulo}</span>{descripcion ? <span className="block text-[13px] text-slate-600">{descripcion}</span> : null}</span>
    </label>
  );
}

function Canal({ id, etiqueta, detalle, checked, onChange, disabled, fijo }) {
  return (
    <label htmlFor={id} className={`flex min-h-11 items-center gap-3 border-t border-slate-100 py-2 first:border-t-0 ${disabled ? "opacity-60" : "cursor-pointer"}`}>
      <input id={id} type="checkbox" className="size-5 accent-[#2563EB]" checked={checked} disabled={disabled || fijo} onChange={(e) => onChange?.(e.target.checked)} />
      <span className="min-w-0 flex-1 text-sm font-semibold text-slate-900">{etiqueta}</span>
      {detalle ? <span className="text-[13px] text-slate-600">{detalle}</span> : null}
    </label>
  );
}

export default function Redactar({ id = null }) {
  const router = useRouter();
  const empresa = useEmpresa();
  const editando = id != null;
  const existente = useSWR(editando ? `${API}/${encodeURIComponent(id)}${empresa.idEmpresa ? `?empresa=${empresa.idEmpresa}` : ""}` : null, get, opcionesSwr);
  const guardado = principal(existente.data);
  const [f, setF] = useState(formularioVacio);
  const [fotos, setFotos] = useState([]); // [{ clave, archivo, url }]
  const [pdf, setPdf] = useState(null);
  const [quitar, setQuitar] = useState([]); // ids de adjuntos guardados que se quitan
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState(null);
  const [enviando, setEnviando] = useState(null);
  const [sucio, setSucio] = useState(false);
  const cargado = useRef(false);
  const entradaFotos = useRef(null);
  const entradaPdf = useRef(null);

  useEffect(() => {
    if (guardado && !cargado.current) { cargado.current = true; setF(formularioDe(guardado)); }
  }, [guardado]);
  // Las vistas previas de las fotos se liberan al quitarlas o al salir.
  const urls = useRef([]);
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);
  useEffect(() => {
    if (!sucio) return undefined;
    const aviso = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [sucio]);

  const cambiar = (campo, valor) => { setF((x) => ({ ...x, [campo]: valor })); setErrores((e) => ({ ...e, [campo]: undefined })); setSucio(true); };
  const cambiarCanal = (canal, valor) => cambiar("canales", { ...f.canales, [canal]: valor });
  const { previa, cargando } = usePreviaAudiencia(f.audiencia, empresa.idEmpresa);
  const yt = youtubeId(f.youtube_url);
  const previasGuardadas = (guardado?.adjuntos ?? []).filter((a) => !quitar.includes(a.id));
  const fotosGuardadas = previasGuardadas.filter((a) => a.tipo === "foto" || a.tipo === "imagen");
  const pdfGuardado = previasGuardadas.find((a) => a.tipo === "pdf");
  const errArchivos = useMemo(() => validarArchivos({ fotos: fotos.map((x) => x.archivo), pdf, previas: fotosGuardadas.length }), [fotos, pdf, fotosGuardadas.length]);
  const editable = !editando || ["borrador", "programado"].includes(guardado?.estado);

  const agregarFotos = (lista) => {
    const nuevas = [...lista].map((archivo) => { const url = URL.createObjectURL(archivo); urls.current.push(url); return { clave: `${archivo.name}-${archivo.size}-${Math.random()}`, archivo, url }; });
    setFotos((x) => [...x, ...nuevas]);
    setSucio(true);
    if (entradaFotos.current) entradaFotos.current.value = "";
  };
  const quitarFoto = (clave) => setFotos((x) => x.filter((y) => { if (y.clave === clave) URL.revokeObjectURL(y.url); return y.clave !== clave; }));

  const enviar = async (accion) => {
    setMensaje(null);
    const e = validarFormulario(f, { accion });
    if (Object.keys(e).length || Object.keys(errArchivos).length) {
      setErrores(e);
      setMensaje({ tipo: "error", texto: Object.values(e)[0] ?? Object.values(errArchivos)[0] });
      return;
    }
    const datos = datosParaEnviar(f, { accion, empresa: empresa.idEmpresa });
    if (editando) { datos.quitar_adjuntos = quitar; if (guardado?.version) datos.version = guardado.version; }
    const cuerpo = new FormData();
    cuerpo.append("datos", JSON.stringify(datos));
    for (const x of fotos) cuerpo.append("fotos", x.archivo, x.archivo.name);
    if (pdf) cuerpo.append("pdf", pdf, pdf.name);
    setEnviando(accion);
    try {
      const r = editando ? await axios.put(`${API}/${encodeURIComponent(id)}`, cuerpo) : await axios.post(API, cuerpo);
      const c = principal(r.data);
      setSucio(false);
      router.push(c?.id != null && accion !== "borrador" ? rutaSeguimiento(c.id) : RUTA_PANEL);
    } catch (err) {
      const campos = err?.response?.data?.campos;
      if (campos && typeof campos === "object") setErrores(campos);
      setMensaje({ tipo: "error", texto: errorDe(err, "No se pudo guardar el comunicado.") });
    } finally { setEnviando(null); }
  };

  const titulo = editando ? (f.titulo ? `Editar: ${f.titulo}` : "Editar comunicado") : "Nuevo comunicado";
  const acciones = (
    <div className="flex flex-wrap gap-2">
      <button type="button" className={botonSecundario} disabled={Boolean(enviando) || !editable} onClick={() => enviar("borrador")}>{enviando === "borrador" ? "Guardando…" : "Guardar borrador"}</button>
      <button type="button" className={botonPrimario} disabled={Boolean(enviando) || !editable} onClick={() => enviar("publicar")} data-publicar>{enviando === "publicar" ? "Publicando…" : textoPublicar(f, previa?.total)}</button>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-1" data-pantalla="redactar">
      <Link href={RUTA_PANEL} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900"><ChevronLeft className="size-4" aria-hidden="true" />Comunicados</Link>
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="break-words text-2xl font-extrabold tracking-tight text-slate-900">{titulo}</h1>
        <div className="flex flex-wrap items-center gap-2"><SelectorEmpresa {...empresa} />{acciones}</div>
      </header>
      <AvisoError error={existente.error} porDefecto="No se pudo cargar el comunicado." />
      {editando && guardado && !editable ? <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Este comunicado ya se publicó: solo se pueden editar borradores y programados.</p> : null}
      <Mensaje mensaje={mensaje} />

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="grid content-start gap-4">
          <section className={seccion} aria-labelledby="sec-contenido">
            <h2 id="sec-contenido" className={tituloSeccion}>Contenido</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo id="c-tipo" etiqueta="Tipo">
                <select {...ariaCampo("c-tipo", errores.tipo)} className={entrada} value={f.tipo} onChange={(e) => cambiar("tipo", e.target.value)}>
                  {TIPOS_REDACTAR.map((t) => <option key={t.clave} value={t.clave}>{t.texto}</option>)}
                </select>
              </Campo>
              <Campo id="c-fecha-evento" etiqueta="Fecha del evento (opcional)" error={errores.fecha_evento}>
                <input type="date" {...ariaCampo("c-fecha-evento", errores.fecha_evento)} className={entrada} value={f.fecha_evento} onChange={(e) => cambiar("fecha_evento", e.target.value)} />
              </Campo>
            </div>
            <Campo id="c-titulo" etiqueta="Título" error={errores.titulo}>
              <input {...ariaCampo("c-titulo", errores.titulo)} className={entrada} value={f.titulo} maxLength={LIMITES.titulo} onChange={(e) => cambiar("titulo", e.target.value)} />
            </Campo>
            <Campo id="c-cuerpo" etiqueta="Mensaje" error={errores.cuerpo} ayuda={`${f.cuerpo.length} de ${LIMITES.cuerpo} caracteres · se publica como texto`}>
              <textarea {...ariaCampo("c-cuerpo", errores.cuerpo, true)} rows={7} className={`${entrada} py-2 leading-relaxed`} value={f.cuerpo} maxLength={LIMITES.cuerpo} onChange={(e) => cambiar("cuerpo", e.target.value)} />
            </Campo>
          </section>

          <section className={seccion} aria-labelledby="sec-adjuntos">
            <h2 id="sec-adjuntos" className={tituloSeccion}>Fotos, documento y video</h2>
            <div className="flex flex-wrap gap-2">
              <input ref={entradaFotos} id="c-fotos" type="file" accept={TIPOS_FOTO.join(",")} multiple className="sr-only" onChange={(e) => agregarFotos(e.target.files ?? [])} data-entrada-fotos />
              <label htmlFor="c-fotos" className={`${botonSecundario} cursor-pointer`}><ImagePlus className="size-4" aria-hidden="true" />Fotos (hasta {LIMITES.fotos})</label>
              <input ref={entradaPdf} id="c-pdf" type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => { setPdf(e.target.files?.[0] ?? null); setSucio(true); e.target.value = ""; }} data-entrada-pdf />
              <label htmlFor="c-pdf" className={`${botonSecundario} cursor-pointer`}><FileText className="size-4" aria-hidden="true" />{pdf || pdfGuardado ? "Cambiar PDF" : "PDF"}</label>
            </div>
            {errArchivos.fotos ? <p role="alert" className="text-[13px] text-red-700">{errArchivos.fotos}</p> : null}
            {errArchivos.pdf ? <p role="alert" className="text-[13px] text-red-700">{errArchivos.pdf}</p> : null}
            {fotos.length || fotosGuardadas.length ? (
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5" aria-label="Fotos">
                {fotosGuardadas.map((a, i) => (
                  <li key={`g${a.id ?? i}`} className="relative aspect-square overflow-hidden rounded-lg bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada de S3 */}
                    <img src={a.url} alt={a.nombre || `Foto ${i + 1}`} className="size-full object-cover" />
                    <button type="button" aria-label={`Quitar ${a.nombre || `foto ${i + 1}`}`} onClick={() => { setQuitar((q) => [...q, a.id]); setSucio(true); }} className="absolute right-1 top-1 grid size-11 place-items-center rounded-full bg-white/90 text-red-700 shadow"><Trash2 className="size-4" aria-hidden="true" /></button>
                  </li>
                ))}
                {fotos.map((x, i) => (
                  <li key={x.clave} className="relative aspect-square overflow-hidden rounded-lg bg-slate-100" data-foto-nueva>
                    {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:) */}
                    <img src={x.url} alt={`Foto ${fotosGuardadas.length + i + 1}`} className="size-full object-cover" />
                    <button type="button" aria-label={`Quitar foto ${fotosGuardadas.length + i + 1}`} onClick={() => quitarFoto(x.clave)} className="absolute right-1 top-1 grid size-11 place-items-center rounded-full bg-white/90 text-red-700 shadow"><Trash2 className="size-4" aria-hidden="true" /></button>
                  </li>
                ))}
              </ul>
            ) : null}
            {pdf || pdfGuardado ? (
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3" data-pdf-elegido>
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-red-50 text-[13px] font-bold text-red-700">PDF</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{pdf ? pdf.name : pdfGuardado.nombre}</span>{pdf ? <span className="block text-[13px] text-slate-600">{tamanoLegible(pdf.size)}</span> : null}</span>
                <button type="button" aria-label="Quitar PDF" onClick={() => { if (pdf) setPdf(null); else setQuitar((q) => [...q, pdfGuardado.id]); setSucio(true); }} className="grid size-11 place-items-center rounded-lg text-red-700 hover:bg-red-50"><Trash2 className="size-4" aria-hidden="true" /></button>
              </div>
            ) : null}
            <Campo id="c-youtube" etiqueta="Video de YouTube (opcional)" error={errores.youtube_url} ayuda="Pega el enlace; se ve dentro de la app sin descargar nada.">
              <input {...ariaCampo("c-youtube", errores.youtube_url, true)} type="url" inputMode="url" placeholder="https://www.youtube.com/watch?v=…" className={entrada} value={f.youtube_url} onChange={(e) => cambiar("youtube_url", e.target.value)} />
            </Campo>
            {yt ? (
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-2" data-youtube-previa={yt}>
                {/* eslint-disable-next-line @next/next/no-img-element -- miniatura pública de YouTube */}
                <img src={urlMiniatura(yt)} alt="" className="h-16 w-28 shrink-0 rounded-md object-cover" />
                <span className="flex min-w-0 items-center gap-2 text-sm text-slate-700"><Youtube className="size-5 shrink-0 text-red-600" aria-hidden="true" />Video listo para verse en el muro</span>
              </div>
            ) : null}
            <div className="grid gap-1 border-t border-slate-100 pt-3">
              <Interruptor id="c-reacciones" checked={f.permite_reacciones} onChange={(v) => cambiar("permite_reacciones", v)} etiqueta="Permitir me gusta" />
              <Interruptor id="c-comentarios" checked={f.permite_comentarios} onChange={(v) => cambiar("permite_comentarios", v)} etiqueta="Permitir comentarios" />
            </div>
          </section>
        </div>

        <div className="grid content-start gap-4">
          <section className={seccion} aria-labelledby="sec-nivel">
            <h2 id="sec-nivel" className={tituloSeccion}>Nivel de importancia</h2>
            <div className="grid gap-2" role="radiogroup" aria-labelledby="sec-nivel">
              <Radio name="nivel" value="normal" actual={f.nivel} alCambiar={(v) => cambiar("nivel", v)} titulo="Normal" descripcion="Se muestra y se cuenta quién lo vio." />
              <Radio name="nivel" value="confirmacion" actual={f.nivel} alCambiar={(v) => cambiar("nivel", v)} titulo="Requiere confirmación de leído" descripcion="Cada persona toca «Confirmar de leído». Ves quién falta y puedes recordarle." />
            </div>
            {f.nivel === "confirmacion" ? (
              <div className="grid gap-2">
                <label htmlFor="c-recordar" className="flex min-h-11 cursor-pointer items-start gap-3">
                  <input id="c-recordar" type="checkbox" className="mt-0.5 size-5 accent-[#2563EB]" checked={f.recordatorio_auto} onChange={(e) => cambiar("recordatorio_auto", e.target.checked)} />
                  <span className="text-sm text-slate-800">Recordar automáticamente cada 24 h a quien no ha confirmado</span>
                </label>
                {f.recordatorio_auto ? (
                  <label htmlFor="c-recordatorios" className="flex flex-wrap items-center gap-2 pl-8 text-sm text-slate-700">Máximo
                    <select id="c-recordatorios" className={`${entrada} w-20`} value={f.recordatorios_max} onChange={(e) => cambiar("recordatorios_max", Number(e.target.value))}>
                      {Array.from({ length: LIMITES.recordatorios }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>veces
                  </label>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className={seccion} aria-labelledby="sec-para">
            <h2 id="sec-para" className={tituloSeccion}>Para quién</h2>
            <SelectorAudiencia audiencia={f.audiencia} alCambiar={(a) => cambiar("audiencia", a)} empresa={empresa.idEmpresa} previa={previa} cargando={cargando} error={errores.audiencia} />
          </section>

          <section className={seccion} aria-labelledby="sec-canales">
            <h2 id="sec-canales" className={tituloSeccion}>Por dónde llega</h2>
            <div>
              <Canal id="c-canal-app" etiqueta="App del empleado · Muro" detalle="Siempre" checked fijo />
              <Canal id="c-canal-push" etiqueta="Notificación push" checked={f.canales.push} onChange={(v) => cambiarCanal("push", v)} disabled={previa?.push_habilitado === false}
                detalle={previa?.push_habilitado === false ? "No configurado" : previa ? `${Number(previa.con_app) || 0} personas` : null} />
              <Canal id="c-canal-correo" etiqueta="Correo electrónico" checked={f.canales.correo} onChange={(v) => cambiarCanal("correo", v)} detalle={previa ? `${Number(previa.con_correo) || 0} personas` : null} />
              <Canal id="c-canal-popup" etiqueta="Aviso emergente" checked={f.canales.popup} onChange={(v) => cambiarCanal("popup", v)} detalle="Al entrar a Mi espacio o al panel" />
            </div>
            {Number(previa?.sin_canal) > 0 ? <p className="text-[13px] text-slate-600">{Number(previa.sin_canal) === 1 ? "1 persona sin app ni correo aparece" : `Las ${previa.sin_canal} personas sin app ni correo aparecen`} como «sin canal» para avisarles en persona.</p> : null}
          </section>

          <section className={seccion} aria-labelledby="sec-cuando">
            <h2 id="sec-cuando" className={tituloSeccion}>Cuándo se publica</h2>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-labelledby="sec-cuando">
              <Radio name="publicar" value="ahora" actual={f.publicar} alCambiar={(v) => cambiar("publicar", v)} titulo="Ahora" />
              <Radio name="publicar" value="programar" actual={f.publicar} alCambiar={(v) => cambiar("publicar", v)} titulo="Programar" />
            </div>
            {f.publicar === "programar" ? (
              <Campo id="c-publicar-en" etiqueta="Fecha y hora" error={errores.publicar_en}>
                <input type="datetime-local" {...ariaCampo("c-publicar-en", errores.publicar_en)} className={entrada} value={f.publicar_en} onChange={(e) => cambiar("publicar_en", e.target.value)} />
              </Campo>
            ) : null}
            <Campo id="c-expira" etiqueta="Quitar del muro después del (opcional)" error={errores.expira_en} ayuda="Deja de verse en el muro; el historial y las confirmaciones se conservan.">
              <input type="date" {...ariaCampo("c-expira", errores.expira_en, true)} className={entrada} value={f.expira_en} onChange={(e) => cambiar("expira_en", e.target.value)} />
            </Campo>
            {f.expira_en ? <button type="button" className={botonTexto} onClick={() => cambiar("expira_en", "")}>No quitarlo</button> : null}
          </section>
        </div>
      </div>
      <div className="flex justify-end border-t border-slate-200 pt-4">{acciones}</div>
    </div>
  );
}
