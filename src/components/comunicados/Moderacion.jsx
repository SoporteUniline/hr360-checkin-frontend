"use client";
// Moderar el muro (maqueta «Moderacion», aprobada 27/11/2026) + reglas del muro + portada (agregado del dueño).
// Reportados (se ocultan solos al juntar N reportes), retenidos por palabra bloqueada y ocultos. Ocultar NUNCA borra:
// queda en la bitácora con quién y cuándo. Sin anónimos. Portada: una imagen por empresa + título y enlace (https) opcionales.
// Backend: GET /moderacion, POST /moderacion/comentarios/:id, POST /moderacion/suspender, GET|PUT /config, PUT|DELETE /portada.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { ChevronLeft, ImagePlus, ShieldCheck } from "lucide-react";
import axios from "@/lib/axios";
import { SelectorEmpresa } from "@/components/nomina/comun";
import { Ventana } from "@/components/avisos/Ventana";
import {
  API, FILTROS_MODERACION, LIMITES, QUIEN_PUBLICA, RUTA_PANEL, TIPOS_FOTO, enlaceSeguro, errorDe, fechaHora, normalizarConfig, palabrasDe,
  quienPublica, validarPortada,
} from "@/lib/comunicados/comunicados.mjs";
import { MULTIPART, AvisoError, Campo, Interruptor, Mensaje, TextoPlano, ariaCampo, botonPeligro, botonPrimario, botonSecundario, conEmpresa, entrada, get, opcionesSwr, tarjeta, useEmpresa, usePuedeEditar, useZona } from "./comun";

const autorDe = (c) => c?.autor?.nombre ?? c?.autor_nombre ?? c?.nombre ?? "Empleado";
const tituloDe = (c) => c?.comunicado?.titulo ?? c?.titulo_comunicado ?? c?.titulo ?? "";
const idEmpleadoDe = (c) => c?.autor?.id_empleado ?? c?.id_empleado ?? c?.autor?.id ?? null;

function Comentario({ c, filtro, tz, alAccion, alSuspender, editar }) {
  const oculto = [...(c.historial ?? [])].reverse().find((h) => h.accion === "ocultar" || h.accion === "ocultar_auto");
  const ocultoPor = c.oculto_por ?? oculto?.por;
  const ocultoEn = c.oculto_en ?? oculto?.en;
  const contexto = filtro === "reportados"
    ? `reportado por ${Number(c.reportes) || 0} ${Number(c.reportes) === 1 ? "persona" : "personas"}${c.oculto_automatico || c.estado === "oculto" ? " · oculto hasta que decidas" : ""}`
    : filtro === "retenidos" ? "retenido por palabra bloqueada"
      : `oculto${ocultoPor ? ` por ${ocultoPor}` : ""}${ocultoEn ? ` · ${fechaHora(ocultoEn, { tz })}` : ""}`;
  return (
    <li data-comentario-moderar={c.id} className="grid gap-3 border-t border-slate-100 p-4 first:border-t-0">
      <p className="text-[13px] text-slate-600">En «{tituloDe(c)}» · {contexto}</p>
      <div className="text-sm text-slate-900"><b>{autorDe(c)}:</b> <TextoPlano className="inline">{c.texto}</TextoPlano></div>
      {c.respuesta_a ? <p className="text-[13px] text-slate-500">En respuesta a {c.respuesta_a.autor}: «{String(c.respuesta_a.texto ?? "").slice(0, 120)}»</p> : null}
      {c.autor?.suspendido_hasta ? <p className="text-[13px] font-semibold text-amber-800">Sin comentarios hasta {fechaHora(c.autor.suspendido_hasta, { tz })}</p> : null}
      {Array.isArray(c.motivos) && c.motivos.length ? <p className="text-[13px] text-slate-600">Motivos: {c.motivos.filter(Boolean).join(" · ")}</p> : null}
      {editar ? <div className="flex flex-wrap gap-2">
        {filtro === "reportados" ? (
          <>
            <button type="button" className={botonPeligro} onClick={() => alAccion(c, "ocultar")}>Ocultar comentario</button>
            <button type="button" className={botonSecundario} onClick={() => alAccion(c, "mostrar")}>Dejarlo visible</button>
            {idEmpleadoDe(c) && !c.autor?.suspendido_hasta ? <button type="button" className={botonSecundario} onClick={() => alSuspender(c)}>Quitarle comentarios 7 días</button> : null}
          </>
        ) : null}
        {filtro === "retenidos" ? (
          <>
            <button type="button" className={botonPrimario} onClick={() => alAccion(c, "publicar")}>Publicarlo</button>
            <button type="button" className={botonSecundario} onClick={() => alAccion(c, "descartar")}>Descartar</button>
          </>
        ) : null}
        {filtro === "ocultos" ? <button type="button" className={botonSecundario} onClick={() => alAccion(c, "mostrar")}>Volver a mostrar</button> : null}
      </div> : null}
    </li>
  );
}

function Suspender({ comentario, alCerrar, alSuspender }) {
  const [dias, setDias] = useState(7);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const ok = async () => { setEnviando(true); setError(null); try { await alSuspender(dias); alCerrar(); } catch (e) { setError(errorDe(e)); } finally { setEnviando(false); } };
  return (
    <Ventana abierta={Boolean(comentario)} onOpenChange={(o) => !o && alCerrar()} titulo={`Quitarle comentarios a ${autorDe(comentario)}`} descripcion="No podrá comentar ni responder durante esos días. Queda en la bitácora." className="sm:max-w-md">
      <div className="grid gap-3 px-4 pb-5 pt-3 sm:px-6">
        <label htmlFor="susp-dias" className="text-sm font-semibold text-slate-800">Días</label>
        <select id="susp-dias" className={entrada} value={dias} onChange={(e) => setDias(Number(e.target.value))}>{[1, 3, 7, 15, 30].map((d) => <option key={d} value={d}>{d} {d === 1 ? "día" : "días"}</option>)}</select>
        {error ? <p role="alert" className="text-[13px] text-red-700">{error}</p> : null}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className={botonSecundario} onClick={alCerrar}>Cancelar</button>
          <button type="button" className={`${botonPrimario} bg-red-600 hover:bg-red-700`} disabled={enviando} onClick={ok}>{enviando ? "Un momento…" : "Quitar comentarios"}</button>
        </div>
      </div>
    </Ventana>
  );
}

function ReglasMuro({ config, empresa, alGuardar, editar }) {
  const [c, setC] = useState(() => normalizarConfig(config));
  const [palabras, setPalabras] = useState(() => normalizarConfig(config).palabras_bloqueadas.join("\n"));
  const [mensaje, setMensaje] = useState(null);
  const [guardando, setGuardando] = useState(false);
  useEffect(() => { const n = normalizarConfig(config); setC(n); setPalabras(n.palabras_bloqueadas.join("\n")); }, [config]);
  const quien = quienPublica(c);
  const guardar = async () => {
    setGuardando(true); setMensaje(null);
    try {
      await axios.put(`${API}/config`, { ...(empresa ? { empresa } : {}), publican_jefes: c.publican_jefes, publican_empleados: c.publican_empleados, permitir_reacciones: c.permitir_reacciones, permitir_comentarios: c.permitir_comentarios, palabras_bloqueadas: palabrasDe(palabras), umbral_reportes: c.umbral_reportes });
      setMensaje({ tipo: "ok", texto: "Reglas del muro guardadas." });
      await alGuardar();
    } catch (e) { setMensaje({ tipo: "error", texto: errorDe(e) }); }
    finally { setGuardando(false); }
  };
  return (
    <section aria-labelledby="reglas-muro" className={`${tarjeta} grid gap-3 p-4`} data-reglas-muro>
      <h2 id="reglas-muro" className="text-[15px] font-extrabold text-slate-900">Reglas del muro</h2>
      <fieldset disabled={!editar} className="grid gap-3">
      <Interruptor id="r-reacciones" checked={c.permitir_reacciones} onChange={(v) => setC({ ...c, permitir_reacciones: v })} etiqueta="Permitir me gusta" />
      <Interruptor id="r-comentarios" checked={c.permitir_comentarios} onChange={(v) => setC({ ...c, permitir_comentarios: v })} etiqueta="Permitir comentarios" />
      <Campo id="r-palabras" etiqueta="Palabras bloqueadas" ayuda="Una por línea. Un comentario con alguna queda retenido hasta que lo revises.">
        <textarea {...ariaCampo("r-palabras", null, true)} rows={4} className={`${entrada} py-2`} value={palabras} onChange={(e) => setPalabras(e.target.value)} />
      </Campo>
      <label htmlFor="r-umbral" className="flex flex-wrap items-center gap-2 text-sm text-slate-800">Ocultar solo al juntar
        <input id="r-umbral" type="number" min={1} max={50} inputMode="numeric" className={`${entrada} w-20`} value={c.umbral_reportes} onChange={(e) => setC({ ...c, umbral_reportes: Number(e.target.value) })} />
        reportes, hasta que RH decida
      </label>
      <fieldset className="grid gap-1">
        <legend className="mb-1 text-sm font-bold text-slate-900">Quién puede publicar en el muro</legend>
        {QUIEN_PUBLICA.map((q) => (
          <label key={q.clave} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-slate-800">
            <input type="radio" name="quien-publica" className="size-5 accent-[#2563EB]" checked={quien === q.clave} onChange={() => setC({ ...c, publican_jefes: q.publican_jefes, publican_empleados: q.publican_empleados })} />{q.texto}
          </label>
        ))}
      </fieldset>
      </fieldset>
      <Mensaje mensaje={mensaje} />
      {editar ? <button type="button" className={botonPrimario} disabled={guardando} onClick={guardar}>{guardando ? "Guardando…" : "Guardar reglas"}</button> : null}
      <p className="text-[13px] text-slate-600">Fotos hasta 10 por publicación. Videos solo de YouTube, para no llenar tu almacenamiento.</p>
    </section>
  );
}

function Portada({ portada, empresa, alGuardar }) {
  const [imagen, setImagen] = useState(null);
  const [vista, setVista] = useState(null);
  const [titulo, setTitulo] = useState(portada?.titulo ?? "");
  const [enlace, setEnlace] = useState(portada?.enlace ?? "");
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [quitar, setQuitar] = useState(false);
  const archivo = useRef(null);
  useEffect(() => { setTitulo(portada?.titulo ?? ""); setEnlace(portada?.enlace ?? ""); }, [portada]);
  useEffect(() => () => { if (vista) URL.revokeObjectURL(vista); }, [vista]);
  const elegir = (f) => {
    if (!f) return;
    const e = validarPortada(f);
    setErrores((x) => ({ ...x, imagen: e }));
    if (e) return;
    setImagen(f); setVista(URL.createObjectURL(f));
  };
  const guardar = async () => {
    const e = {};
    if (!imagen && !portada?.url) e.imagen = "Elige la imagen de la portada.";
    if (enlace.trim() && !enlaceSeguro(enlace)) e.enlace = "El enlace debe empezar con https://";
    setErrores(e);
    if (Object.keys(e).length) return;
    const cuerpo = new FormData();
    if (empresa) cuerpo.append("empresa", String(empresa));
    if (imagen) cuerpo.append("imagen", imagen, imagen.name);
    cuerpo.append("titulo", titulo.trim());
    cuerpo.append("enlace", enlace.trim());
    setGuardando(true); setMensaje(null);
    try { await axios.put(`${API}/portada`, cuerpo, MULTIPART); setImagen(null); setVista(null); setMensaje({ tipo: "ok", texto: "Portada guardada: ya se ve arriba del muro." }); await alGuardar(); }
    catch (err) { setMensaje({ tipo: "error", texto: errorDe(err, "No se pudo guardar la portada.") }); }
    finally { setGuardando(false); }
  };
  const borrar = async () => {
    try { await axios.delete(conEmpresa(`${API}/portada`, empresa)); setQuitar(false); setMensaje({ tipo: "ok", texto: "Se quitó la portada." }); await alGuardar(); }
    catch (err) { setQuitar(false); setMensaje({ tipo: "error", texto: errorDe(err) }); }
  };
  const src = vista ?? portada?.url ?? null;
  return (
    <section aria-labelledby="portada-muro" className={`${tarjeta} grid gap-3 p-4`} data-portada-editor>
      <h2 id="portada-muro" className="text-[15px] font-extrabold text-slate-900">Portada del muro</h2>
      <p className="text-[13px] text-slate-600">La foto fija arriba del muro de todos, como la portada de una página. JPG, PNG o WebP hasta 8 MB.</p>
      <div className="relative aspect-[3/1] overflow-hidden rounded-xl bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local o URL firmada */}
        {src ? <img src={src} alt="Portada actual del muro" className="size-full object-cover" /> : <span className="grid size-full place-items-center text-sm text-slate-500">Sin portada</span>}
      </div>
      <input ref={archivo} id="portada-imagen" type="file" accept={TIPOS_FOTO.join(",")} className="sr-only" onChange={(e) => { elegir(e.target.files?.[0]); e.target.value = ""; }} data-entrada-portada />
      <label htmlFor="portada-imagen" className={`${botonSecundario} cursor-pointer`}><ImagePlus className="size-4" aria-hidden="true" />{src ? "Cambiar imagen" : "Elegir imagen"}</label>
      {errores.imagen ? <p role="alert" className="text-[13px] text-red-700">{errores.imagen}</p> : null}
      <Campo id="portada-titulo" etiqueta="Título (opcional)">
        <input {...ariaCampo("portada-titulo")} className={entrada} maxLength={LIMITES.portadaTitulo} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      </Campo>
      <Campo id="portada-enlace" etiqueta="Enlace (opcional, https)" error={errores.enlace}>
        <input {...ariaCampo("portada-enlace", errores.enlace)} type="url" inputMode="url" placeholder="https://" className={entrada} value={enlace} onChange={(e) => { setEnlace(e.target.value); setErrores((x) => ({ ...x, enlace: undefined })); }} />
      </Campo>
      <Mensaje mensaje={mensaje} />
      <div className="flex flex-wrap gap-2">
        <button type="button" className={botonPrimario} disabled={guardando} onClick={guardar}>{guardando ? "Guardando…" : "Guardar portada"}</button>
        {portada?.url ? <button type="button" className={botonPeligro} onClick={() => setQuitar(true)}>Quitar portada</button> : null}
      </div>
      <Ventana abierta={quitar} onOpenChange={setQuitar} titulo="Quitar la portada" className="sm:max-w-md">
        <div className="grid gap-3 px-4 pb-5 pt-3 sm:px-6">
          <p className="text-sm text-slate-700">El muro se verá sin foto de portada. Puedes subir otra cuando quieras.</p>
          <div className="flex justify-end gap-2"><button type="button" className={botonSecundario} onClick={() => setQuitar(false)}>Cancelar</button><button type="button" className={`${botonPrimario} bg-red-600 hover:bg-red-700`} onClick={borrar}>Quitar</button></div>
        </div>
      </Ventana>
    </section>
  );
}

export default function Moderacion() {
  const empresa = useEmpresa();
  const tz = useZona();
  const editar = usePuedeEditar();
  const [filtro, setFiltro] = useState("reportados");
  const [mensaje, setMensaje] = useState(null);
  const [suspender, setSuspender] = useState(null);
  const url = empresa.listo ? conEmpresa(`${API}/moderacion?filtro=${filtro}`, empresa.idEmpresa) : null;
  const lista = useSWR(url, get, { ...opcionesSwr, keepPreviousData: true });
  const config = useSWR(empresa.listo ? conEmpresa(`${API}/config`, empresa.idEmpresa) : null, get, opcionesSwr);
  const portada = useSWR(empresa.listo ? conEmpresa(`${API}/portada`, empresa.idEmpresa) : null, get, opcionesSwr);
  const items = lista.data?.items ?? lista.data?.comentarios ?? [];
  const conteos = lista.data?.conteos ?? {};
  const cuerpo = (x) => (empresa.idEmpresa ? { ...x, empresa: empresa.idEmpresa } : x);
  const TEXTO_OK = { ocultar: "Comentario oculto (queda en la bitácora).", mostrar: "El comentario está visible.", publicar: "Comentario publicado.", descartar: "Comentario descartado (queda en la bitácora)." };
  const accion = async (c, a) => {
    setMensaje(null);
    try { await axios.post(`${API}/moderacion/comentarios/${encodeURIComponent(c.id)}`, cuerpo({ accion: a })); setMensaje({ tipo: "ok", texto: TEXTO_OK[a] }); await lista.mutate(); }
    catch (e) { setMensaje({ tipo: "error", texto: errorDe(e) }); }
  };
  const suspenderA = async (dias) => {
    await axios.post(`${API}/moderacion/suspender`, cuerpo({ id_empleado: Number(idEmpleadoDe(suspender)), dias }));
    setMensaje({ tipo: "ok", texto: `${autorDe(suspender)} no podrá comentar durante ${dias} ${dias === 1 ? "día" : "días"}.` });
    await lista.mutate();
  };
  const datosConfig = config.data?.config ?? config.data ?? {};
  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-1" data-pantalla="moderacion">
      <Link href={RUTA_PANEL} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900"><ChevronLeft className="size-4" aria-hidden="true" />Comunicados</Link>
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-900"><ShieldCheck className="size-6 text-[#2563EB]" aria-hidden="true" />Moderar el muro</h1>
          <p className="mt-1 text-sm text-slate-600">Tú pones las reglas. Todo comentario queda con nombre: no hay anónimos en el muro.</p>
        </div>
        <SelectorEmpresa {...empresa} />
      </header>
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="grid content-start gap-3">
          <div role="tablist" aria-label="Comentarios por revisar" className="flex flex-wrap gap-1.5">
            {FILTROS_MODERACION.map((f) => (
              <button key={f.clave} type="button" role="tab" aria-selected={filtro === f.clave} onClick={() => setFiltro(f.clave)}
                className={`min-h-11 rounded-full px-3.5 text-sm font-semibold ${filtro === f.clave ? "bg-[#2563EB] text-white" : "border border-slate-300 bg-white text-slate-700"}`}>
                {f.texto}{conteos[f.clave] != null && f.clave !== "ocultos" ? ` (${conteos[f.clave]})` : ""}
              </button>
            ))}
          </div>
          <Mensaje mensaje={mensaje} />
          <AvisoError error={lista.error} porDefecto="No se pudo cargar la moderación." reintentar={lista.mutate} />
          <section aria-label="Comentarios" className={tarjeta}>
            {lista.isLoading && !lista.data ? <p role="status" className="p-4 text-sm text-slate-500">Cargando…</p> : null}
            {lista.data && !items.length ? <p className="p-5 text-center text-sm text-slate-600">Nada por revisar aquí.</p> : null}
            <ul>{items.map((c) => <Comentario key={c.id} c={c} filtro={filtro} tz={tz} alAccion={accion} alSuspender={setSuspender} editar={editar} />)}</ul>
          </section>
          <p className="text-[13px] text-slate-600">Ocultar no borra: queda en el historial con quién lo ocultó y cuándo, por si hace falta en un caso laboral.</p>
        </div>
        <div className="grid content-start gap-4">
          {editar ? <Portada portada={portada.data?.portada ?? null} empresa={empresa.idEmpresa} alGuardar={portada.mutate} /> : null}
          {config.data ? <ReglasMuro config={datosConfig} empresa={empresa.idEmpresa} alGuardar={config.mutate} editar={editar} /> : <AvisoError error={config.error} porDefecto="No se pudieron cargar las reglas del muro." />}
        </div>
      </div>
      <Suspender comentario={suspender} alCerrar={() => setSuspender(null)} alSuspender={suspenderA} />
    </div>
  );
}
