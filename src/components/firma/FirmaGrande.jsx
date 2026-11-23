"use client";

// (23/11/2026, pedido del dueño) Firmar «en grande» donde sea que se firme (Mi firma y PIN, checklists…):
// - Celular: un botón («Registrar firma» / «Firmar»). Al tocarlo se abre a pantalla completa en HORIZONTAL; abajo
//   «Borrar» y «Guardar»; al guardar regresa a la vista normal. Android/Chrome giran la pantalla solos. En iPhone el
//   navegador no deja girar por código: si el celular sigue en vertical, la firma se dibuja ROTADA 90° a pantalla
//   completa (se gira el celular y queda horizontal); si lo giran de verdad, se endereza sin perder el trazo.
// - Computadora: el lienzo se queda en la página con «Borrar» y «Guardar» (como antes).
// La página de firmar documentos (/firmar/[token]) ya funcionaba así con su propia pantalla.
// onGuardar(blobPng) → true si quedó guardada (cierra la pantalla completa); false para dejarla abierta.
// (23/11/2026, INC: «empiezo a escribir y se cierra solo») Firmar empezando cerca del borde activa el gesto «atrás» del
// sistema: en Android saca de pantalla completa y en iPhone regresa de página. Antes eso cerraba la firma. Ahora solo
// se cierra con «X» o al guardar: si sale de pantalla completa la firma sigue abierta (rotada si quedó en vertical) y
// el «atrás» se absorbe con una entrada propia en el historial. Además se dejan márgenes para alejar el trazo del borde.
import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser, PenLine, RotateCw, X } from "lucide-react";
import LienzoFirma from "@/components/empleado/LienzoFirma";
import { detectarCelular, estiloRotado } from "@/lib/firma/pantallaFirma.mjs";

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
  const [medidas, setMedidas] = useState({ ancho: 0, alto: 0 });
  const cerrandoPorBoton = useRef(false);

  useEffect(() => { setCelular(detectarCelular()); }, []);

  const cerrar = useCallback(() => {
    salirHorizontal();
    setAbierta(false);
    setTrazada(false);
    // Quita la entrada propia del historial que se puso al abrir.
    if (window.history.state?.firmaGrande) {
      cerrandoPorBoton.current = true;
      window.history.back();
    }
  }, []);

  const abrir = () => {
    cerrandoPorBoton.current = false;
    setAbierta(true);
    entrarHorizontal();
    try { window.history.pushState({ ...(window.history.state || {}), firmaGrande: true }, ""); } catch { /* sin historial */ }
  };

  useEffect(() => {
    if (!abierta) return undefined;
    const consulta = window.matchMedia("(orientation: portrait)");
    const ver = () => { setVertical(consulta.matches); setMedidas({ ancho: window.innerWidth, alto: window.innerHeight }); };
    ver();
    consulta.addEventListener?.("change", ver);
    window.addEventListener("resize", ver);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const tecla = (e) => { if (e.key === "Escape") cerrar(); };
    document.addEventListener("keydown", tecla);
    return () => {
      consulta.removeEventListener?.("change", ver);
      window.removeEventListener("resize", ver);
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", tecla);
    };
  }, [abierta, cerrar]);

  // Celular en vertical (iPhone, o un Android que no giró): la firma se muestra rotada 90° a pantalla completa.
  const rotado = vertical && medidas.ancho > 0;

  // Gesto o botón «atrás» con la firma abierta: no se pierde lo dibujado; se vuelve a poner la entrada propia.
  // (Salir de pantalla completa ya NO cierra la firma: el gesto de borde en Android lo provocaba al empezar a firmar.)
  useEffect(() => {
    if (!abierta) return undefined;
    const atras = () => {
      if (cerrandoPorBoton.current) { cerrandoPorBoton.current = false; return; }
      try { window.history.pushState({ ...(window.history.state || {}), firmaGrande: true }, ""); } catch { /* nada */ }
    };
    window.addEventListener("popstate", atras);
    return () => window.removeEventListener("popstate", atras);
  }, [abierta]);

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
        <button type="button" disabled={deshabilitado} onClick={abrir}
          className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-base font-semibold text-white disabled:opacity-50">
          <PenLine className="size-5" aria-hidden="true" /> {textoBoton}
        </button>
        {onCancelar ? <button type="button" onClick={onCancelar} className="min-h-11 rounded-xl border border-slate-300 font-medium">Cancelar</button> : null}
      </div>
      {abierta ? (
        <div role="dialog" aria-modal="true" aria-label={`${titulo} a pantalla completa`} data-firma-pantalla className="fixed inset-0 z-[200] overflow-hidden bg-slate-50">
          {/* Mismo árbol rotado o no: así el lienzo no se vuelve a montar y el trazo se conserva al girar. */}
          <div data-rotado={rotado ? "si" : "no"} style={rotado ? estiloRotado(medidas.ancho, medidas.alto) : { position: "absolute", inset: 0 }}
            className={`flex flex-col gap-2 ${rotado
              ? "px-4 pt-4 pb-7"
              : "px-[max(2rem,env(safe-area-inset-left))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]"}`}>
            <div className="flex items-center gap-2">
              <strong className="min-w-0 flex-1 truncate text-base text-slate-900">{titulo}</strong>
              <button type="button" onClick={cerrar} disabled={guardando} aria-label="Cerrar sin guardar" className="grid size-11 place-items-center rounded-full text-slate-600 hover:bg-slate-200">
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <div className="relative min-h-0 flex-1">
              <LienzoFirma ref={lienzo} onCambio={setTrazada} deshabilitado={guardando} etiqueta={etiqueta} alto="h-full" rotado={rotado} />
              {!trazada ? (
                <span className="pointer-events-none absolute inset-0 grid place-items-center text-center text-sm text-slate-400">
                  <span className="flex flex-col items-center gap-1.5">
                    {rotado ? <RotateCw className="size-7" aria-hidden="true" /> : <PenLine className="size-7" aria-hidden="true" />}
                    {rotado ? "Gira tu celular y firma aquí con tu dedo" : "Firma aquí con tu dedo"}
                  </span>
                </span>
              ) : null}
            </div>
            {botones(true)}
          </div>
        </div>
      ) : null}
    </>
  );
}
