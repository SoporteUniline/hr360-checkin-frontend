"use client";

// Lumo fase B2 (25/11/2026): formulario PÚBLICO de la entrevista (sin sesión; el token del enlace es la llave). Trae los
// MISMOS campos que el agente pregunta por WhatsApp, prellenados con lo que ya contestó; lo que envíe aquí se ve en la
// misma ficha del candidato en la bandeja. (27/11/2026) Mismo estándar de lectura que la bolsa v2: preguntas en grande
// (Sí / No como botones, PreguntasGrandes), texto 17 px y botones de 48 px o más. Documentos:
// PDF, Word o foto (≤ 10 MB), se guardan en privado y solo los ve el equipo de reclutamiento.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, FileText, Loader2, Upload } from "lucide-react";
import PreguntasGrandes from "../../vacante/[slug]/PreguntasGrandes";
import { enfocarPrimerError } from "../../vacante/[slug]/Postular";
import { camposAPreguntas, camposArchivo, mensajeFormulario, revisarEnvio, valoresIniciales } from "@/lib/whatsapp/formularioEntrevista.mjs";
import { MENSAJE_ARCHIVO_PESADO } from "@/lib/errorSubida.mjs";
import { TEXTO_PREPARANDO, usePrepararFoto } from "@/lib/imagenes/usePrepararFoto";

const backend = () => String(process.env.NEXT_PUBLIC_RUTA_BACKEND ?? "").replace(/\/$/, "");
const ruta = (token) => `${backend()}/reclutamiento/formulario/${encodeURIComponent(token)}`;

async function leer(respuesta) {
  const datos = await respuesta.json().catch(() => ({}));
  // 413 de nginx en HTML (no llegó al backend): mensaje claro (lib/errorSubida.mjs).
  if (respuesta.status === 413 && !datos?.error) throw Object.assign(new Error(MENSAJE_ARCHIVO_PESADO), { codigo: "ARCHIVO_GRANDE" });
  if (!respuesta.ok) throw Object.assign(new Error(datos?.error || "error"), { codigo: datos?.codigo, campos: datos?.campos });
  return datos;
}

export default function FormularioEntrevista({ token }) {
  const [estado, setEstado] = useState({ cargando: true, error: null, datos: null });
  const [valores, setValores] = useState({});
  const [archivos, setArchivos] = useState({});
  const [faltan, setFaltan] = useState([]);
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [avisoGeneral, setAvisoGeneral] = useState("");
  // (27/11/2026) Un documento que es FOTO se convierte a WebP (2400 px, se lee la letra; < 900 KB) al elegirlo.
  const { preparando, preparar } = usePrepararFoto("documento");
  const elegirArchivo = async (id, elegido) => {
    setErrores(({ [id]: _quitado, ...resto }) => resto);
    if (!elegido || !elegido.type.startsWith("image/")) { setArchivos((a) => ({ ...a, [id]: elegido })); return; }
    const foto = await preparar(elegido);
    if (foto.error) { setArchivos((a) => ({ ...a, [id]: null })); setErrores((x) => ({ ...x, [id]: foto.error })); return; }
    setArchivos((a) => ({ ...a, [id]: foto.archivo }));
  };

  useEffect(() => {
    let vivo = true;
    fetch(ruta(token), { cache: "no-store", credentials: "omit" }).then(leer)
      .then((datos) => { if (!vivo) return; setEstado({ cargando: false, error: null, datos }); setValores(valoresIniciales(datos.campos)); })
      .catch((e) => { if (vivo) setEstado({ cargando: false, error: e.codigo || "RED", datos: null }); });
    return () => { vivo = false; };
  }, [token]);

  const campos = useMemo(() => estado.datos?.campos ?? [], [estado.datos]);
  const preguntas = useMemo(() => camposAPreguntas(campos), [campos]);
  const documentos = useMemo(() => camposArchivo(campos), [campos]);

  const enviar = async (e) => {
    e.preventDefault();
    setAvisoGeneral("");
    const r = revisarEnvio(campos, valores, archivos);
    setFaltan(r.faltan);
    setErrores(r.errores);
    if (r.faltan.length || Object.keys(r.errores).length) {
      setAvisoGeneral("Revisa los campos marcados.");
      requestAnimationFrame(() => enfocarPrimerError(document.querySelector("[data-formulario-entrevista]")));
      return;
    }
    const form = new FormData();
    const respuestas = Object.fromEntries(Object.entries(valores).filter(([, v]) => v != null && String(v).trim() !== ""));
    form.append("respuestas", JSON.stringify(respuestas));
    for (const [id, f] of Object.entries(archivos)) if (f) form.append(`archivo_${id}`, f, f.name);
    setEnviando(true);
    try {
      const datos = await leer(await fetch(ruta(token), { method: "POST", body: form, credentials: "omit" }));
      setEstado({ cargando: false, error: null, datos });
      setArchivos({});
      setEnviado(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      if (err.codigo === "CAMPOS_INVALIDOS" && Array.isArray(err.campos)) {
        setErrores(Object.fromEntries(err.campos.map((c) => [c.id, c.error])));
        setAvisoGeneral("Revisa los campos marcados.");
      } else if (["FORMULARIO_INVALIDO", "FORMULARIO_VENCIDO", "VACANTE_CERRADA", "SIN_CONSENTIMIENTO"].includes(err.codigo)) {
        setEstado({ cargando: false, error: err.codigo, datos: null });
      } else {
        setAvisoGeneral(err.message && err.message !== "error" ? err.message : "No se pudo enviar. Revisa tu conexión e intenta de nuevo.");
      }
    } finally {
      setEnviando(false);
    }
  };

  if (estado.cargando) {
    return (
      <div className="bt2 bt2-pagina-vacante"><div className="bt2-envoltura bt2-entrevista">
        <p className="bt2-nota"><Loader2 className="girar" aria-hidden="true" /> Cargando tu formulario…</p>
      </div></div>
    );
  }
  if (estado.error) {
    const m = mensajeFormulario(estado.error);
    return (
      <div className="bt2 bt2-pagina-vacante" data-formulario-error={estado.error}><div className="bt2-envoltura bt2-entrevista">
        <div role="alert" className="bt2-estado">
          <h1>{m.titulo}</h1>
          <p>{m.texto}</p>
        </div>
      </div></div>
    );
  }
  const d = estado.datos;
  const erroresPreguntas = [...faltan, ...Object.keys(errores).map(Number)];
  return (
    <div className="bt2 bt2-pagina-vacante" data-formulario-entrevista><div className="bt2-envoltura bt2-entrevista">
      <header className="bt2-entrevista-cab">
        <p className="empresa">{d.empresa}</p>
        <h1>{d.vacante?.titulo}</h1>
        <p className="bt2-ayuda">Completa o corrige tus datos para la entrevista. Lo que ya nos dijiste por WhatsApp aparece aquí.</p>
      </header>
      {enviado ? (
        <p role="status" className="bt2-nota ok" data-formulario-enviado>
          <CheckCircle2 aria-hidden="true" />
          <span>¡Listo! Recibimos tus respuestas. Seguimos por WhatsApp; puedes volver a este enlace para corregir algo mientras esté vigente.</span>
        </p>
      ) : null}
      <form onSubmit={enviar} noValidate className="bt2-ficha bt2-form">
        <PreguntasGrandes titulo="" preguntas={preguntas} valores={valores} onCambiar={(v) => { setValores(v); setFaltan([]); }} errores={erroresPreguntas} disabled={enviando} />
        {Object.entries(errores).filter(([id]) => preguntas.some((p) => String(p.id) === id)).map(([id, texto]) => (
          <p key={id} className="bt2-error">{preguntas.find((p) => String(p.id) === id)?.label}: {texto}</p>
        ))}
        {documentos.length ? (
          <section className="bt2-preguntas" aria-labelledby="documentos-entrevista">
            <h2 id="documentos-entrevista" className="bt2-paso">Documentos</h2>
            {documentos.map((c) => {
              const id = `doc-${c.id}`;
              const elegido = archivos[c.id];
              const error = errores[c.id] || (faltan.includes(c.id) ? "Sube el archivo." : "");
              return (
                <div key={c.id} className="bt2-campo-grupo" data-documento={c.id}>
                  <span className="bt2-etiqueta" id={`${id}-t`}>{c.texto}{c.obligatoria ? null : <span className="bt2-opcional"> (opcional)</span>}</span>
                  {c.archivo && !elegido ? <p className="bt2-ayuda"><FileText className="inline size-5 align-text-bottom" aria-hidden="true" /> Ya subiste «{c.archivo.nombre}». Puedes reemplazarlo.</p> : null}
                  <label className="bt2-btn secundario ancho bt2-archivo">
                    <Upload aria-hidden="true" />
                    <span>{elegido ? elegido.name : "Elegir archivo (PDF, Word o foto, hasta 10 MB)"}</span>
                    <input id={id} type="file" className="sr-only" accept=".pdf,.doc,.docx,image/*" disabled={preparando} aria-labelledby={`${id}-t`} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined}
                      onChange={(e) => { elegirArchivo(c.id, e.target.files?.[0] ?? null); e.target.value = ""; }} />
                  </label>
                  {error ? <p id={`${id}-error`} className="bt2-error">{error}</p> : null}
                </div>
              );
            })}
          </section>
        ) : null}
        {preparando ? <p role="status" className="bt2-ayuda" data-preparando-foto>{TEXTO_PREPARANDO}</p> : null}
        {avisoGeneral ? <p role="alert" className="bt2-aviso-error">{avisoGeneral}</p> : null}
        <button type="submit" disabled={enviando || preparando} className="bt2-btn verde ancho">
          {enviando ? <Loader2 className="girar" aria-hidden="true" /> : null}{enviado ? "Guardar cambios" : "Enviar respuestas"}
        </button>
        <p className="bt2-ayuda">Tus datos se usan solo para este proceso de reclutamiento. <Link className="bt2-enlace-alto" href="/aviso-privacidad">Aviso de privacidad</Link></p>
      </form>
    </div></div>
  );
}
