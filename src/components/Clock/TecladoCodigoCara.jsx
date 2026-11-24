"use client";
// «Código y cara» en el reloj de la empresa: teclado numérico grande (teclas de 64 px) para escribir el código; después la
// cámara compara la cara SOLO contra esa persona. Se abre con «¿No te reconoce? Escribe tu código» o solo, cuando la cara
// es de alguien con el método «Código y cara». Solo presentación: la validación la hace RelojChecador (onContinuar).
import { useEffect, useRef, useState } from "react";
import { Delete, ScanFace } from "lucide-react";

const TECLAS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export default function TecladoCodigoCara({ motivo = "boton", onContinuar, onCancelar }) {
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const continuarRef = useRef(null);

  const escribir = (d) => {
    setError("");
    setCodigo((c) => (c.length >= 12 ? c : c + d));
  };
  const borrar = () => {
    setError("");
    setCodigo((c) => c.slice(0, -1));
  };
  const continuar = async () => {
    if (!codigo || enviando) return;
    setEnviando(true);
    try {
      const r = await onContinuar(codigo);
      if (r?.error) {
        setError(r.error);
        setCodigo("");
      }
    } finally {
      setEnviando(false);
    }
  };
  continuarRef.current = continuar;

  // Teclado físico del kiosco (si lo tiene): números, borrar, Enter y Esc.
  useEffect(() => {
    const tecla = (e) => {
      if (/^[0-9]$/.test(e.key)) escribir(e.key);
      else if (e.key === "Backspace") borrar();
      else if (e.key === "Enter") continuarRef.current?.();
      else if (e.key === "Escape") onCancelar();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [onCancelar]);

  const requerido = motivo === "requerido";
  const tecla =
    "grid min-h-16 place-items-center rounded-2xl border-2 border-slate-200 bg-white text-3xl font-bold text-slate-900 shadow-sm transition active:scale-95 active:bg-slate-100 disabled:opacity-50";
  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4" data-teclado-codigo-cara>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="t-codigo-cara"
        aria-describedby="d-codigo-cara"
        className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-blue-50 text-brand">
            <ScanFace className="size-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id="t-codigo-cara" className="text-lg font-bold leading-tight text-slate-900">
              {requerido ? "Escribe tu código" : "Checar con código y cara"}
            </h2>
            <p id="d-codigo-cara" className="text-sm text-slate-600">
              {requerido ? "Para checar, escribe tu código y después mira a la cámara." : "Escribe tu código y después mira a la cámara."}
            </p>
          </div>
        </div>
        <output
          aria-live="polite"
          aria-label="Código escrito"
          data-codigo-escrito
          className={`mt-4 flex h-16 items-center justify-center rounded-2xl border-2 bg-slate-50 font-mono text-3xl font-bold tracking-[0.3em] tabular-nums ${
            error ? "border-red-300" : "border-slate-200"
          }`}
        >
          {codigo ? "•".repeat(codigo.length) : <span className="text-base font-medium tracking-normal text-slate-400">Tu código</span>}
        </output>
        {error ? (
          <p role="alert" className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {error}
          </p>
        ) : null}
        <div className="mt-3 grid grid-cols-3 gap-2" role="group" aria-label="Teclado numérico">
          {TECLAS.map((d) => (
            <button key={d} type="button" className={tecla} onClick={() => escribir(d)} disabled={enviando}>
              {d}
            </button>
          ))}
          <button type="button" className={`${tecla} text-slate-600`} onClick={borrar} disabled={enviando || !codigo} aria-label="Borrar">
            <Delete className="size-7" aria-hidden="true" />
          </button>
          <button type="button" className={tecla} onClick={() => escribir("0")} disabled={enviando}>
            0
          </button>
          <button
            type="button"
            onClick={continuar}
            disabled={!codigo || enviando}
            className="grid min-h-16 place-items-center rounded-2xl bg-brand px-2 text-base font-bold text-white shadow-sm transition active:scale-95 disabled:opacity-50"
          >
            {enviando ? "…" : "Continuar"}
          </button>
        </div>
        <button
          type="button"
          onClick={onCancelar}
          className="mt-3 min-h-11 w-full rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
