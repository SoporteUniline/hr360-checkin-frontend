"use client";
// Piezas del reloj de la empresa (kiosco): selector de método y el panel de cada uno (Rostro, Código, QR).
// Solo presentación: registrar, abrir el QR y la cámara los hace RelojChecador.
import { Delete, Keyboard, Loader2, QrCode, ScanFace, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const METODOS_KIOSCO = [
  { id: "rostro", etiqueta: "Rostro", Icono: ScanFace },
  { id: "codigo", etiqueta: "Código", Icono: Keyboard },
  { id: "qr", etiqueta: "QR", Icono: QrCode },
];

export function SelectorMetodo({ metodo, onCambiar }) {
  return (
    <div role="group" aria-label="Cómo quieres checar" className="grid shrink-0 grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
      {METODOS_KIOSCO.map(({ id, etiqueta, Icono }) => {
        const activo = metodo === id;
        return (
          <button key={id} type="button" aria-pressed={activo} onClick={() => onCambiar(id)} data-metodo={id}
            className={cn(
              "flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
              activo ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900",
            )}>
            <Icono className={cn("size-5", activo ? "text-brand" : "text-slate-500")} aria-hidden="true" />
            {etiqueta}
          </button>
        );
      })}
    </div>
  );
}

// Teclas: 56–64 px de alto en pantallas y tabletas; 48–56 px en el celular.
const ALTO_TECLA = { normal: "h-[clamp(3.5rem,7.2vh,4rem)]", compacto: "h-[clamp(3rem,6vh,3.5rem)]" };

export function PanelCodigo({ codigo, setCodigo, onRegistrar, registrando, avisar, avisoUbicacion, compacto = false }) {
  const alto = ALTO_TECLA[compacto ? "compacto" : "normal"];
  const escribir = (d) => setCodigo((c) => (c.length >= 12 ? c : c + d));
  const registrar = () => {
    if (codigo.trim()) onRegistrar();
    else avisar("Ingresa un código antes de registrar", "warning");
  };
  const tecla = cn(alto, "rounded-xl border-slate-200 bg-white text-2xl font-semibold text-slate-900 shadow-xs hover:bg-slate-50 active:scale-[0.97] active:bg-slate-100");
  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <User className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          placeholder="Ingresa tu código"
          aria-label="Código de empleado"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => { if (e.key === "Enter") registrar(); }}
          className={cn(compacto ? "h-12" : "h-14 [@media(max-height:820px)]:h-12", "rounded-xl border-slate-300 bg-slate-50 px-12 text-center text-2xl md:text-2xl font-semibold tracking-[0.2em] tabular-nums text-slate-900 placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400 focus-visible:bg-white")}
        />
      </div>
      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Teclado numérico">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <Button key={d} type="button" variant="outline" className={tecla} onClick={() => escribir(d)}>{d}</Button>
        ))}
        <Button type="button" variant="ghost" className={cn(alto, "rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100")} onClick={() => setCodigo("")} disabled={!codigo}>
          Limpiar
        </Button>
        <Button type="button" variant="outline" className={tecla} onClick={() => escribir("0")}>0</Button>
        <Button type="button" variant="outline" className={cn(tecla, "text-slate-600")} onClick={() => setCodigo((c) => c.slice(0, -1))} disabled={!codigo} aria-label="Borrar último dígito">
          <Delete className="size-6" aria-hidden="true" />
        </Button>
      </div>
      <Button type="button" onClick={registrar} disabled={registrando || !codigo.trim()}
        className={cn(compacto ? "h-12" : "h-14 [@media(max-height:820px)]:h-12", "w-full rounded-xl text-lg font-semibold shadow-sm")}>
        {registrando ? <><Loader2 className="size-5 animate-spin" aria-hidden="true" /> Registrando…</> : "Registrar entrada / salida"}
      </Button>
      {avisoUbicacion && <p className="text-xs text-slate-600" role="status">{avisoUbicacion}</p>}
    </div>
  );
}

function Pasos({ pasos }) {
  return (
    <ol className="flex flex-col gap-2.5">
      {pasos.map((p, i) => (
        <li key={p} className="flex items-center gap-3 text-sm text-slate-700">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand/10 text-xs font-bold text-brand">{i + 1}</span>
          {p}
        </li>
      ))}
    </ol>
  );
}

export function PanelRostro({ onUsarCodigo, compacto = false }) {
  return (
    <div className="flex h-full flex-col justify-center gap-5">
      <div className="flex items-center gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-brand/10 text-brand">
          <ScanFace className="size-8" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-slate-900">Checa con tu rostro</h2>
          <p className="text-sm text-slate-600">Te reconocemos en un segundo, sin tocar nada.</p>
        </div>
      </div>
      {!compacto && <Pasos pasos={["Párate frente a la cámara", "Mira de frente, dentro del óvalo", "Espera tu confirmación en pantalla"]} />}
      <Button type="button" variant="outline" onClick={onUsarCodigo} className="h-12 rounded-xl text-base font-semibold text-slate-700">
        <Keyboard className="size-5 text-brand" aria-hidden="true" /> Prefiero usar mi código
      </Button>
    </div>
  );
}

export function PanelQR({ onAbrirQR, registrando, compacto = false }) {
  return (
    <div className="flex h-full flex-col justify-center gap-5">
      <div className="flex items-center gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-brand/10 text-brand">
          <QrCode className="size-8" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-slate-900">Checa con tu QR</h2>
          <p className="text-sm text-slate-600">El de tu gafete o el de tu app de ADAMIA.</p>
        </div>
      </div>
      {!compacto && <Pasos pasos={["Toca «Escanear mi QR»", "Acerca tu QR a la cámara", "Espera tu confirmación en pantalla"]} />}
      <Button type="button" onClick={onAbrirQR} disabled={registrando} className="h-14 rounded-xl text-lg font-semibold shadow-sm">
        <QrCode className="size-6" aria-hidden="true" /> Escanear mi QR
      </Button>
    </div>
  );
}
