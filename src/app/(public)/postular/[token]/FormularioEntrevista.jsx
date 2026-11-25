"use client";

// Lumo fase B2 (25/11/2026): formulario PÚBLICO de la entrevista (sin sesión; el token del enlace es la llave). Trae los
// MISMOS campos que el agente pregunta por WhatsApp, prellenados con lo que ya contestó; lo que envíe aquí se ve en la
// misma ficha del candidato en la bandeja. Reutiliza el componente de preguntas de la página de la vacante. Documentos:
// PDF, Word o foto (≤ 10 MB), se guardan en privado y solo los ve el equipo de reclutamiento.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, FileText, Loader2, Upload } from "lucide-react";
import PreguntasVacante from "../../vacante/[slug]/ApplicationForm/PreguntasVacante";
import { camposAPreguntas, camposArchivo, mensajeFormulario, revisarEnvio, valoresIniciales } from "@/lib/whatsapp/formularioEntrevista.mjs";

const backend = () => String(process.env.NEXT_PUBLIC_RUTA_BACKEND ?? "").replace(/\/$/, "");
const ruta = (token) => `${backend()}/reclutamiento/formulario/${encodeURIComponent(token)}`;

async function leer(respuesta) {
  const datos = await respuesta.json().catch(() => ({}));
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
      requestAnimationFrame(() => document.querySelector("[aria-invalid=true]")?.focus());
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

  const contenedor = "mx-auto w-full max-w-xl px-4 pb-16 pt-28 sm:pt-32";
  if (estado.cargando) {
    return <div className={contenedor}><p className="flex items-center gap-2 text-[15px] text-slate-600"><Loader2 className="size-5 animate-spin" aria-hidden="true" /> Cargando tu formulario…</p></div>;
  }
  if (estado.error) {
    const m = mensajeFormulario(estado.error);
    return (
      <div className={contenedor} data-formulario-error={estado.error}>
        <div role="alert" className="grid gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h1 className="text-xl font-bold text-slate-900">{m.titulo}</h1>
          <p className="text-[15px] text-slate-700">{m.texto}</p>
        </div>
      </div>
    );
  }
  const d = estado.datos;
  const erroresPreguntas = [...faltan, ...Object.keys(errores).map(Number)];
  return (
    <div className={contenedor} data-formulario-entrevista>
      <header className="mb-5 grid gap-1">
        <p className="text-[14px] font-medium text-emerald-700">{d.empresa}</p>
        <h1 className="text-2xl font-bold text-slate-900 [overflow-wrap:anywhere]">{d.vacante?.titulo}</h1>
        <p className="text-[15px] text-slate-600">Completa o corrige tus datos para la entrevista. Lo que ya nos dijiste por WhatsApp aparece aquí.</p>
      </header>
      {enviado ? (
        <div role="status" className="mb-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-[15px] text-emerald-900" data-formulario-enviado>
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <span>¡Listo! Recibimos tus respuestas. Seguimos por WhatsApp; puedes volver a este enlace para corregir algo mientras esté vigente.</span>
        </div>
      ) : null}
      <form onSubmit={enviar} noValidate className="grid gap-5">
        <PreguntasVacante preguntas={preguntas} valores={valores} onCambiar={(v) => { setValores(v); setFaltan([]); }} errores={erroresPreguntas} disabled={enviando} />
        {Object.entries(errores).filter(([id]) => preguntas.some((p) => String(p.id) === id)).map(([id, texto]) => (
          <p key={id} className="-mt-3 text-sm text-red-600">{preguntas.find((p) => String(p.id) === id)?.label}: {texto}</p>
        ))}
        {documentos.length ? (
          <section className="grid gap-4" aria-labelledby="documentos-entrevista">
            <h2 id="documentos-entrevista" className="text-lg font-bold text-slate-700">Documentos</h2>
            {documentos.map((c) => {
              const id = `doc-${c.id}`;
              const elegido = archivos[c.id];
              const error = errores[c.id] || (faltan.includes(c.id) ? "Sube el archivo." : "");
              return (
                <div key={c.id} className="grid gap-1.5" data-documento={c.id}>
                  <label htmlFor={id} className="text-sm font-medium text-slate-700">{c.texto}{c.obligatoria ? " *" : ""}</label>
                  {c.archivo && !elegido ? <p className="flex items-center gap-1.5 text-sm text-slate-600"><FileText className="size-4" aria-hidden="true" /> Ya subiste «{c.archivo.nombre}». Puedes reemplazarlo.</p> : null}
                  <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:border-slate-500">
                    <Upload className="size-4 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 truncate">{elegido ? elegido.name : "Elegir archivo (PDF, Word o foto, hasta 10 MB)"}</span>
                    <input id={id} type="file" className="sr-only" accept=".pdf,.doc,.docx,image/jpeg,image/png,image/webp" aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined}
                      onChange={(e) => { const f = e.target.files?.[0] ?? null; setArchivos((a) => ({ ...a, [c.id]: f })); setErrores(({ [c.id]: _quitado, ...resto }) => resto); }} />
                  </label>
                  {error ? <p id={`${id}-error`} className="text-sm text-red-600">{error}</p> : null}
                </div>
              );
            })}
          </section>
        ) : null}
        {avisoGeneral ? <p role="alert" className="text-sm font-medium text-red-700">{avisoGeneral}</p> : null}
        <button type="submit" disabled={enviando} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-base font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
          {enviando ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : null}{enviado ? "Guardar cambios" : "Enviar respuestas"}
        </button>
        <p className="text-[13px] text-slate-500">Tus datos se usan solo para este proceso de reclutamiento. <Link href="/aviso-privacidad" className="inline-flex min-h-11 items-center underline sm:min-h-0">Aviso de privacidad</Link></p>
      </form>
    </div>
  );
}
