"use client";

// Formulario EN LA PÁGINA (no ventana) para subir un documento de ley o reemplazar uno. Se cierra con Cancelar, con
// Guardar o con Esc; nunca al tocar afuera.
import { useEffect, useId, useRef, useState } from "react";
import { BOTON, BOTON_SECUNDARIO, CAMPO, SECUNDARIO, TEXTO } from "./Piezas";

const TIPOS = ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,application/pdf,image/jpeg,image/png,image/webp";
const MAX = 10 * 1024 * 1024;

export default function FormArchivo({ titulo, ayuda, nombreInicial = "", sugerirVencimiento = false, textoGuardar = "Guardar documento", onEnviar, onCancelar }) {
  const id = useId();
  const raiz = useRef(null);
  const [archivo, setArchivo] = useState(null);
  const [nombre, setNombre] = useState(nombreInicial);
  const [emision, setEmision] = useState("");
  const [vence, setVence] = useState(sugerirVencimiento);
  const [vencimiento, setVencimiento] = useState("");
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    raiz.current?.querySelector("input[type=file]")?.focus();
    const alTeclear = (e) => { if (e.key === "Escape" && !enviando) onCancelar(); };
    const nodo = raiz.current;
    nodo?.addEventListener("keydown", alTeclear);
    return () => nodo?.removeEventListener("keydown", alTeclear);
  }, [onCancelar, enviando]);

  const enviar = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    if (!archivo) return setError("Elige el archivo.");
    if (archivo.size > MAX) return setError("El archivo pasa de 10 MB. Usa uno más ligero.");
    if (!nombre.trim()) return setError("Escribe el nombre del documento.");
    if (vence && !vencimiento) return setError("Escribe la fecha de vencimiento.");
    const datos = new FormData();
    datos.append("file", archivo);
    datos.append("nombre_documento", nombre.trim());
    if (emision) datos.append("fecha_emision", emision);
    datos.append("vence", vence ? "1" : "0");
    if (vence) datos.append("fecha_vencimiento", vencimiento);
    setEnviando(true);
    try {
      await onEnviar(datos);
    } catch (err) {
      setError(err?.message || "No se pudo guardar el documento.");
      setEnviando(false);
    }
  };

  return (
    <form ref={raiz} onSubmit={enviar} data-form-archivo className={`grid gap-4 rounded-xl border border-[#93C5FD] bg-[#EFF6FF] p-4 ${TEXTO}`} aria-labelledby={`${id}-t`}>
      <p id={`${id}-t`} className="font-bold">{titulo}</p>
      {ayuda ? <p className={SECUNDARIO}>{ayuda}</p> : null}
      <div className="grid gap-1.5">
        <label htmlFor={`${id}-f`} className="font-bold">Archivo (PDF, foto o Word, hasta 10 MB)</label>
        <input id={`${id}-f`} type="file" accept={TIPOS} className={`${CAMPO} py-2.5`} onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor={`${id}-n`} className="font-bold">Nombre del documento</label>
        <input id={`${id}-n`} className={CAMPO} value={nombre} maxLength={200} onChange={(e) => setNombre(e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <label htmlFor={`${id}-e`} className="font-bold">Fecha del documento (opcional)</label>
          <input id={`${id}-e`} type="date" className={CAMPO} value={emision} onChange={(e) => setEmision(e.target.value)} />
        </div>
        <div className="grid content-start gap-1.5">
          <label className="flex min-h-12 items-center gap-3 font-bold">
            <input type="checkbox" className="size-6 accent-[#2563EB]" checked={vence} onChange={(e) => setVence(e.target.checked)} />
            Tiene fecha de vencimiento
          </label>
          {vence ? (
            <>
              <label htmlFor={`${id}-v`} className="font-bold">Vence el</label>
              <input id={`${id}-v`} type="date" className={CAMPO} value={vencimiento} onChange={(e) => setVencimiento(e.target.value)} />
            </>
          ) : null}
        </div>
      </div>
      {error ? <p role="alert" className="font-bold text-[#991B1B]">{error}</p> : null}
      <div className="flex flex-wrap gap-3">
        <button type="submit" className={BOTON} disabled={enviando}>{enviando ? "Guardando…" : textoGuardar}</button>
        <button type="button" className={BOTON_SECUNDARIO} disabled={enviando} onClick={onCancelar}>Cancelar</button>
      </div>
    </form>
  );
}
