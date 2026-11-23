"use client";

// (23/11/2026, pedido del dueño) Firmar «en grande» donde sea que se firme (Mi firma y PIN, checklists…):
// - Celular: un botón («Registrar firma» / «Firmar»). Al tocarlo se abre a pantalla completa en HORIZONTAL; abajo
//   «Borrar» y «Guardar»; al guardar regresa a la vista normal. Android/Chrome giran la pantalla solos; en iPhone el
//   navegador no deja girar por código: se pide girar el celular (y si no, se firma igual en vertical).
// - Computadora: el lienzo se queda en la página con «Borrar» y «Guardar» (como antes).
// La página de firmar documentos (/firmar/[token]) ya funcionaba así con su propia pantalla.
// onGuardar(blobPng) → true si quedó guardada (cierra la pantalla completa); false para dejarla abierta.
import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser, PenLine, RotateCw, X } from "lucide-react";
import LienzoFirma from "@/components/empleado/LienzoFirma";
import { detectarCelular } from "@/lib/firma/pantallaFirma.mjs";

async function entrarHorizontal() {
  try {
    if (document.fullscreenEnabled && !document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: "hide" });
  } catch { /* sin pantalla completa */ }
  try { await screen.orientation?.lock?.("landscape"); } catch { /* el navegador no deja girar */ }
}
function salirHorizontal() {
  try { screen.orientation?.unlock?.(); } catch { /* nada */ }
  if (typeof document !== "undefined" && document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
}

export default function FirmaGrande({
  textoBoton = "Firmar",
  textoGuardar = "Guardar firma",
  titulo = "Tu firma",
  etiqueta = "Dibuja tu firma con el dedo o el mouse",
  onGuardar,
  onCancelar = null,
  deshabilitado = false,
}) {
  const lienzo = useRef(null);
  const [celular, setCelular] = useState(false);
  const [abierta, setAbierta] = useState(false);
  const [trazada, setTrazada] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [vertical, setVertical] = useState(false);

  useEffect(() => { setCelular(detectarCelular()); }, []);

  const cerrar = useCallback(() => {
    salirHorizontal();
    setAbierta(false);
    setTrazada(false);
  }, []);

  useEffect(() => {
    if (!abierta) return undefined;
    const consulta = window.matchMedia("(orientation: portrait)");
    const ver = () => setVertical(consulta.matches);
    ver();
    consulta.addEventListener?.("change", ver);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const tecla = (e) => { if (e.key === "Escape") cerrar(); };
    document.addEventListener("keydown", tecla);
    return () => {
      consulta.removeEventListener?.("change", ver);
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", tecla);
    };
  }, [abierta, cerrar]);

  // Si la persona sale de la pantalla completa con el botón del sistema, se cierra también la firma.
  useEffect(() => {
    if (!abierta) return undefined;
    let estuvo = Boolean(document.fullscreenElement);
    const cambio = () => {
      if (document.fullscreenElement) estuvo = true;
      else if (estuvo) cerrar();
    };
    document.addEventListener("fullscreenchange", cambio);
    return () => document.removeEventListener("fullscreenchange", cambio);
  }, [abierta, cerrar]);

  const guardar = async () => {
    if (!trazada || guardando) return;
    setGuardando(true);
    try {
      const ok = await onGuardar?.(await lienzo.current.aPng());
      if (ok !== false) {
        lienzo.current?.borrar();
        if (abierta) cerrar();
      }
    } finally {
      setGuardando(false);
    }
  };

  const botones = (grande) => (
    <div className={`grid ${onCancelar && !grande ? "grid-cols-3" : "grid-cols-2"} gap-2`}>
      {onCancelar && !grande ? (
        <button type="button" onClick={onCancelar} disabled={guardando} className="min-h-11 rounded-xl border border-slate-300 font-medium disabled:opacity-50">Cancelar</button>
      ) : null}
      <button type="button" onClick={() => lienzo.current?.borrar()} disabled={!trazada || guardando}
        className={`inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white font-medium disabled:opacity-50 ${grande ? "min-h-12 text-base" : "min-h-11"}`}>
        <Eraser className="size-4" aria-hidden="true" /> Borrar
      </button>
      <button type="button" onClick={guardar} disabled={!trazada || guardando || deshabilitado}
        className={`rounded-xl bg-blue-600 font-semibold text-white disabled:opacity-50 ${grande ? "min-h-12 text-base" : "min-h-11"}`}>
        {guardando ? "Guardando…" : textoGuardar}
      </button>
    </div>
  );

  // Computadora: en la página.
  if (!celular) {
    return (
      <div className="w-full space-y-3" data-firma-grande="pagina">
        <LienzoFirma ref={lienzo} onCambio={setTrazada} deshabilitado={deshabilitado || guardando} etiqueta={etiqueta} />
        {botones(false)}
      </div>
    );
  }

  // Celular: botón y, al tocarlo, pantalla completa en horizontal.
  return (
    <>
      <div className="grid gap-2" data-firma-grande="boton">
        <button type="button" disabled={deshabilitado} onClick={() => { setAbierta(true); entrarHorizontal(); }}
          className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-base font-semibold text-white disabled:opacity-50">
          <PenLine className="size-5" aria-hidden="true" /> {textoBoton}
        </button>
        {onCancelar ? <button type="button" onClick={onCancelar} className="min-h-11 rounded-xl border border-slate-300 font-medium">Cancelar</button> : null}
      </div>
      {abierta ? (
        <div role="dialog" aria-modal="true" aria-label={`${titulo} a pantalla completa`} data-firma-pantalla
          className="fixed inset-0 z-[200] flex flex-col gap-2 bg-slate-50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="flex items-center gap-2">
            <strong className="min-w-0 flex-1 truncate text-base text-slate-900">{titulo}</strong>
            <button type="button" onClick={cerrar} disabled={guardando} aria-label="Cerrar sin guardar" className="grid size-11 place-items-center rounded-full text-slate-600 hover:bg-slate-200">
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          <div className="relative min-h-0 flex-1">
            <LienzoFirma ref={lienzo} onCambio={setTrazada} deshabilitado={guardando} etiqueta={etiqueta} alto="h-full" />
            {!trazada ? (
              <span className="pointer-events-none absolute inset-0 grid place-items-center text-center text-sm text-slate-400">
                <span className="flex flex-col items-center gap-1.5">
                  {vertical ? <RotateCw className="size-7" aria-hidden="true" /> : <PenLine className="size-7" aria-hidden="true" />}
                  {vertical ? "Gira tu celular para tener más espacio, o firma aquí" : "Firma aquí con tu dedo"}
                </span>
              </span>
            ) : null}
          </div>
          {botones(true)}
        </div>
      ) : null}
    </>
  );
}
