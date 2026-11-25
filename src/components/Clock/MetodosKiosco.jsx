"use client";
// Piezas del panel derecho del reloj de la empresa (kiosco, maqueta aprobada 26/11/2026): selector de método y el
// contenido de cada uno (Rostro, Código, QR). Solo presentación: registrar, abrir el QR y la cámara los hace RelojChecador.
import { Delete, Keyboard, Loader2, QrCode, ScanFace } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const METODOS_KIOSCO = [
  { id: "rostro", etiqueta: "Rostro", Icono: ScanFace },
  { id: "codigo", etiqueta: "Código", Icono: Keyboard },
  { id: "qr", etiqueta: "QR", Icono: QrCode },
];

export function SelectorMetodo({ metodo, onCambiar, compacto = false }) {
  return (
    <div role="group" aria-label="Cómo quieres checar" className="grid shrink-0 grid-cols-3 gap-1.5 rounded-2xl bg-slate-200/80 p-1.5">
      {METODOS_KIOSCO.map(({ id, etiqueta, Icono }) => {
        const activo = metodo === id;
        return (
          <button key={id} type="button" aria-pressed={activo} onClick={() => onCambiar(id)} data-metodo={id}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
              compacto ? "min-h-11" : "min-h-[3.25rem]",
              activo ? "bg-white font-bold text-brand shadow-sm" : "font-semibold text-slate-700 hover:text-slate-900",
            )}>
            <Icono className={cn("size-5", activo ? "text-brand" : "text-slate-500")} aria-hidden="true" />
            {etiqueta}
          </button>
        );
      })}
    </div>
  );
}

// Teclas de ~60 px en pantallas y tabletas (mínimo 56); 48–56 px en el celular.
const ALTO_TECLA = { normal: "h-[clamp(3.5rem,7vh,3.75rem)]", compacto: "h-[clamp(3rem,6vh,3.5rem)]" };

export function PanelCodigo({ codigo, setCodigo, onRegistrar, registrando, avisar, avisoUbicacion, compacto = false }) {
  const alto = ALTO_TECLA[compacto ? "compacto" : "normal"];
  const escribir = (d) => setCodigo((c) => (c.length >= 12 ? c : c + d));
  const registrar = () => {
    if (codigo.trim()) onRegistrar();
    else avisar("Ingresa un código antes de registrar", "warning");
  };
  const tecla = cn(alto, "rounded-xl border-slate-200 bg-slate-50 text-2xl font-semibold text-slate-900 shadow-none hover:bg-slate-100 active:scale-[0.97] active:bg-slate-200");
  return (
    <div className={cn("flex flex-col", compacto ? "gap-2" : "gap-2.5")}>
      <label className="flex flex-col gap-1.5 text-[13px] font-bold text-slate-600">
        {!compacto && "Tu código"}
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
          className={cn(compacto ? "h-12" : "h-[3.75rem] [@media(max-height:800px)]:h-14", "rounded-xl border-2 border-brand bg-white px-4 text-center text-3xl md:text-3xl font-semibold tracking-[0.3em] tabular-nums text-slate-900 placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400")}
        />
      </label>
      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Teclado numérico">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <Button key={d} type="button" variant="outline" className={tecla} onClick={() => escribir(d)}>{d}</Button>
        ))}
        <Button type="button" variant="ghost" className={cn(alto, "rounded-xl text-[15px] font-medium text-slate-600 hover:bg-slate-100")} onClick={() => setCodigo("")} disabled={!codigo}>
          Limpiar
        </Button>
        <Button type="button" variant="outline" className={tecla} onClick={() => escribir("0")}>0</Button>
        <Button type="button" variant="outline" className={cn(tecla, "bg-white text-slate-600")} onClick={() => setCodigo((c) => c.slice(0, -1))} disabled={!codigo} aria-label="Borrar último dígito">
          <Delete className="size-6" aria-hidden="true" />
        </Button>
      </div>
      <Button type="button" onClick={registrar} disabled={registrando || !codigo.trim()}
        className={cn(compacto ? "h-12" : "h-[3.625rem] [@media(max-height:800px)]:h-14", "w-full rounded-xl text-lg font-bold shadow-sm")}>
        {registrando ? <><Loader2 className="size-5 animate-spin" aria-hidden="true" /> Registrando…</> : "Checar"}
      </Button>
      {avisoUbicacion && <p className="text-xs text-slate-600" role="status">{avisoUbicacion}</p>}
    </div>
  );
}

// Rostro: la cámara ya está reconociendo; aquí solo la indicación y la salida por código.
export function PanelRostro({ onNoReconoce, compacto = false }) {
  const boton = (
    <Button type="button" variant="outline" onClick={onNoReconoce} data-boton-codigo-cara
      className={cn("w-full rounded-xl border-2 border-brand bg-white text-[17px] font-bold text-brand hover:bg-brand/5 hover:text-brand", compacto ? "h-12" : "h-14")}>
      <Keyboard className="size-5" aria-hidden="true" /> ¿No te reconoce? Usa tu código
    </Button>
  );
  if (compacto) return boton;
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-[22px] font-extrabold leading-tight text-slate-900">Acércate y mira a la cámara</h2>
      <p className="text-[15px] leading-relaxed text-slate-600">Pon tu cara dentro del óvalo, a un brazo de distancia. Te reconoce en un segundo.</p>
      {boton}
    </div>
  );
}

export function PanelQR({ onAbrirQR, registrando, compacto = false }) {
  const boton = (
    <Button type="button" onClick={onAbrirQR} disabled={registrando} className={cn("w-full rounded-xl text-lg font-bold shadow-sm", compacto ? "h-12" : "h-14")}>
      <QrCode className="size-6" aria-hidden="true" /> Escanear mi QR
    </Button>
  );
  if (compacto) return boton;
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-[22px] font-extrabold leading-tight text-slate-900">Checa con tu QR</h2>
      <p className="text-[15px] leading-relaxed text-slate-600">Toca «Escanear mi QR» y acerca a la cámara el QR de tu gafete o de tu app de ADAMIA.</p>
      {boton}
    </div>
  );
}
