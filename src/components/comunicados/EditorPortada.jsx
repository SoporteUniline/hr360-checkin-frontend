"use client";
// Portada del muro (agregado del dueño, 27/11/2026): una imagen por empresa + título y enlace (https) opcionales.
// La usan «Moderar el muro» y el botón «Cambiar portada» encima de la portada del muro del panel (MuroPanel.jsx).
// Backend: PUT /portada (multipart «imagen», «titulo», «enlace»), DELETE /portada. El servidor valida la imagen por bytes.
import { useEffect, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import axios from "@/lib/axios";
import { Ventana } from "@/components/avisos/Ventana";
import { API, LIMITES, TIPOS_FOTO, enlaceSeguro, errorDe, validarPortada } from "@/lib/comunicados/comunicados.mjs";
import { MULTIPART, Campo, Mensaje, ariaCampo, botonPeligro, botonPrimario, botonSecundario, conEmpresa, entrada, tarjeta } from "./comun";

/** marco: false dentro de una ventana (sin tarjeta ni título propio). */
export default function EditorPortada({ portada, empresa, alGuardar, marco = true }) {
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
    <section aria-labelledby={marco ? "portada-muro" : undefined} aria-label={marco ? undefined : "Portada del muro"} className={marco ? `${tarjeta} grid gap-3 p-4` : "grid gap-3"} data-portada-editor>
      {marco ? <h2 id="portada-muro" className="text-[15px] font-extrabold text-slate-900">Portada del muro</h2> : null}
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
