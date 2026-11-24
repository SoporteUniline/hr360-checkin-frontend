"use client";

// Desplegable propio (Radix Select de components/ui/select) de fondo blanco, con icono por opción, grupos con título,
// palomita en la elegida, sombra suave y opciones de 44 px en celular. Sustituye a los <select> nativos, que en Mac
// se abren como un menú gris sin iconos. Solo dibuja: el valor que entra y sale es el mismo que el del <select>.
//
// opciones: [{ valor, texto, icono?, tono?, grupo?, deshabilitada?, ayuda? }]
//   icono: componente de lucide-react · tono: clases del recuadro del icono (p. ej. TONOS.verde).
// vacio: texto de la opción «sin valor» (null = no hay). Radix no admite valor "": se usa un centinela que se convierte.
// variante «fila»: el disparador se ve como texto con flechita, sin cuadro (fila de Asistencias).
// Accesible: aria-label, flechas, Inicio/Fin, escribir para buscar, Esc y foco visible (lo da Radix).
// Para las pruebas: data-valor en el disparador (valor actual) y en cada opción (su valor; "" = sin valor).
import { useEffect, useRef, useState } from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { Select, SelectGroup } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const VACIO = "__sin_valor__";

export const TONOS = {
  verde: "bg-emerald-50 text-emerald-600",
  rojo: "bg-rose-50 text-rose-600",
  ambar: "bg-amber-50 text-amber-600",
  azul: "bg-sky-50 text-sky-600",
  indigo: "bg-indigo-50 text-indigo-600",
  violeta: "bg-violet-50 text-violet-600",
  gris: "bg-slate-100 text-slate-500",
};

function Icono({ icono: I, tono, chico = false }) {
  if (!I) return null;
  return (
    <span aria-hidden className={cn("inline-flex shrink-0 items-center justify-center rounded-md", chico ? "h-5 w-5" : "h-6 w-6", tono ?? TONOS.gris)}>
      <I className={chico ? "h-3 w-3" : "h-3.5 w-3.5"} strokeWidth={2.2} />
    </span>
  );
}

// Clases del disparador según la variante (mismas medidas que los campos del panel).
function claseDisparador({ variante, movil, error }) {
  const alto = variante === "fila"
    ? (movil ? "h-11 text-base" : "h-9 text-[13.5px] max-sm:h-11 max-sm:text-base")
    // Campo: si el texto no cabe baja a un segundo renglón (nunca se corta).
    : (movil ? "min-h-11 py-1 text-base" : "min-h-9 py-1 text-[13.5px] max-sm:min-h-11 max-sm:text-base");
  const comun = "group inline-flex min-w-0 items-center gap-2 text-left outline-none transition-colors "
    + "focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed data-[placeholder]:text-slate-400";
  if (variante === "fila") {
    return cn(comun, alto, "max-w-full cursor-pointer rounded-md border-0 bg-transparent pl-1.5 pr-1 text-slate-800 hover:bg-slate-100 data-[state=open]:bg-slate-100 disabled:cursor-default disabled:hover:bg-transparent");
  }
  return cn(comun, alto, "w-full rounded-lg border bg-white pl-2.5 pr-2 text-slate-900 shadow-[0_1px_0_rgba(15,23,42,0.03)] hover:border-slate-300",
    "data-[state=open]:border-blue-400 data-[state=open]:ring-2 data-[state=open]:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-500 disabled:hover:border-slate-200",
    error ? "border-rose-300 bg-rose-50" : "border-slate-200");
}

// Agrupa las opciones consecutivas por `grupo` (las que no tienen grupo van sueltas).
function agrupar(opciones) {
  const out = [];
  for (const o of opciones) {
    const ultimo = out.at(-1);
    if (ultimo && ultimo.grupo === (o.grupo ?? null)) ultimo.items.push(o);
    else out.push({ grupo: o.grupo ?? null, items: [o] });
  }
  return out;
}

function Opcion({ o, movil }) {
  const valor = o.valor === "" || o.valor == null ? VACIO : String(o.valor);
  return (
    <SelectPrimitive.Item value={valor} disabled={o.deshabilitada} data-valor={o.valor ?? ""}
      className={cn("relative flex w-full cursor-pointer select-none items-center gap-2.5 rounded-lg py-1.5 pl-2 pr-8 text-[13.5px] text-slate-800 outline-none",
        "data-[highlighted]:bg-slate-100 data-[state=checked]:font-semibold data-[state=checked]:text-slate-900",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-45",
        movil ? "min-h-11 text-base" : "min-h-9 max-sm:min-h-11 max-sm:text-base")}>
      <span className="flex min-w-0 flex-1 flex-col">
        <SelectPrimitive.ItemText asChild>
          <span className="flex min-w-0 items-center gap-2.5">
            <Icono icono={o.icono} tono={o.tono} />
            <span className="min-w-0 break-words leading-snug">{o.texto}</span>
          </span>
        </SelectPrimitive.ItemText>
        {o.ayuda ? <span className={cn("text-[12px] font-normal leading-snug text-slate-500", o.icono ? "pl-[34px]" : "")}>{o.ayuda}</span> : null}
      </span>
      <span className="absolute right-2.5 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center text-blue-600">
        <SelectPrimitive.ItemIndicator><Check className="h-4 w-4" strokeWidth={2.5} aria-hidden /></SelectPrimitive.ItemIndicator>
      </span>
    </SelectPrimitive.Item>
  );
}

// Los eventos del menú (en un portal) suben por el árbol de React: no deben llegar a la fila ni a los atajos de la celda.
const detener = (e) => e.stopPropagation();

export default function SelectConIconos({
  valor, onCambio, opciones = [], vacio = null, iconoVacio = null, tonoVacio = null, placeholder = "Elige…",
  aria, id, disabled = false, variante = "campo", movil = false, error = false, autoFocus = false, className = "", ancho = null,
}) {
  const sinValor = valor === "" || valor == null;
  const radixValor = sinValor ? (vacio != null ? VACIO : "") : String(valor);
  const todas = vacio != null ? [{ valor: "", texto: vacio, icono: iconoVacio, tono: tonoVacio }, ...opciones] : opciones;
  const fila = variante === "fila";
  // Abierto/cerrado controlado: Esc cierra SOLO el menú. Se atiende en `window` (antes que los diálogos y cajones de
  // Radix/vaul, que escuchan en `document` y, con copias distintas de su «capa», cerrarían también el diálogo).
  const [abierto, setAbierto] = useState(false);
  // Dentro de un Dialog el menú se monta dentro del propio diálogo: Select y Dialog de Radix traen copias distintas de
  // su trampa de foco y, en un portal al <body>, se peleaban el foco (las flechas y Enter no funcionaban).
  const disparador = useRef(null);
  const [contenedor, setContenedor] = useState(null);
  const cambiarAbierto = (v) => {
    if (v) setContenedor(disparador.current?.closest("[role=dialog]") ?? null);
    setAbierto(v);
  };
  useEffect(() => {
    if (!abierto) return undefined;
    const esc = (e) => { if (e.key === "Escape") { e.stopPropagation(); setAbierto(false); } };
    window.addEventListener("keydown", esc, true);
    return () => window.removeEventListener("keydown", esc, true);
  }, [abierto]);
  return (
    <Select open={abierto} onOpenChange={cambiarAbierto} value={radixValor} disabled={disabled} onValueChange={(v) => onCambio?.(v === VACIO ? "" : v)}>
      <SelectPrimitive.Trigger ref={disparador} id={id} aria-label={aria} autoFocus={autoFocus} data-valor={sinValor ? "" : String(valor)}
        // Un <fieldset disabled> deshabilita el botón, pero Radix abre en pointerdown: se evita.
        onPointerDown={(e) => { if (e.currentTarget.matches(":disabled")) e.preventDefault(); }}
        className={cn(claseDisparador({ variante, movil, error }), className)}>
        <span className={cn("flex min-w-0 flex-1 items-center gap-2 overflow-hidden [&_[aria-hidden]]:h-5 [&_[aria-hidden]]:w-5 [&_svg]:h-3 [&_svg]:w-3",
          fila && "[&_[aria-hidden]]:hidden")}>
          <span data-texto-valor className={cn("min-w-0", fila ? "truncate" : "flex-1 whitespace-normal break-words leading-tight")}>
            <SelectPrimitive.Value placeholder={placeholder} />
          </span>
        </span>
        <SelectPrimitive.Icon asChild>
          <ChevronDown aria-hidden className={cn("shrink-0 text-slate-400 transition-transform group-data-[state=open]:rotate-180", fila ? "h-3.5 w-3.5" : "h-4 w-4")} />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal container={contenedor}>
        <SelectPrimitive.Content position="popper" sideOffset={6} collisionPadding={12} data-no-row-click data-select-con-iconos
          onClick={detener} onKeyDown={detener} onPointerDown={detener}
          style={ancho ? { width: ancho } : undefined}
          className={cn("relative z-[200] max-h-[min(22rem,var(--radix-select-content-available-height,22rem))] overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-800",
            "min-w-[max(var(--radix-select-trigger-width),13rem)] max-w-[min(26rem,calc(100vw-1.5rem))]",
            "shadow-[0_16px_40px_-12px_rgba(15,23,42,0.25),0_2px_6px_rgba(15,23,42,0.06)]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1")}>
          <SelectPrimitive.Viewport className="max-h-[inherit] overflow-y-auto overscroll-contain p-1.5">
            {agrupar(todas).map((g, i) => (
              g.grupo ? (
                <SelectGroup key={`g${i}`} className={i ? "mt-1 border-t border-slate-100 pt-1" : ""}>
                  <SelectPrimitive.Label data-grupo className="px-2 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-400">{g.grupo}</SelectPrimitive.Label>
                  {g.items.map((o) => <Opcion key={String(o.valor)} o={o} movil={movil} />)}
                </SelectGroup>
              ) : (
                <div key={`s${i}`} className={i ? "mt-1 border-t border-slate-100 pt-1" : ""}>
                  {g.items.map((o) => <Opcion key={String(o.valor)} o={o} movil={movil} />)}
                </div>
              )
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </Select>
  );
}
