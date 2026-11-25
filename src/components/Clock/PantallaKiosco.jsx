"use client";
import { useState } from "react";
import { Menu, Volume2, VolumeX } from "lucide-react";
import IndicadorConexion from "./IndicadorConexion";
import { SelectorMetodo, PanelCodigo, PanelRostro, PanelQR } from "./MetodosKiosco";
import { TarjetaVoyAComer } from "./VoyAComer";
import { useDisposicionKiosco } from "./disposicionKiosco";
import { cn } from "@/lib/utils";

// Reloj checador de la empresa (/<slug>) en modo kiosco (rediseño 26/11/2026): todo cabe en una pantalla (100dvh) sin
// desplazar, con el sistema visual de la app (fondo claro, tarjetas blancas, azul ADAMIA, Inter).
//  - Pantalla/monitor: izquierda hora + método + panel del método + «Voy a comer»; centro la cámara; derecha «Hoy».
//  - Tableta (horizontal o vertical): la cámara arriba y los controles abajo.
//  - Celular: hora arriba, cámara en medio y controles abajo. Celular acostado: controles a la izquierda.
// Solo presentación: la lógica de checado vive en RelojChecador.
export default function PantallaKiosco({
  horaActual,
  fechaActual,
  nombreEmpresa = "",
  onTocarHora,
  conexion,
  menu,
  metodo,
  onCambiarMetodo,
  codigo,
  setCodigo,
  onRegistrar,
  onAbrirQR,
  registrando,
  avisar,
  sonido,
  avisoUbicacion,
  camara,
  recientes,
  voyAComer,
}) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const { disposicion, horizontal } = useDisposicionKiosco();
  const hora = horaActual.replace(/ [ap]\.m\.$/, "");
  const meridiano = /a\.m\.$/.test(horaActual) ? "a.m." : "p.m.";
  const compacto = disposicion === "celular" || disposicion === "bajo";

  const botonMenu = menu && (
    <button type="button" onClick={() => setMenuAbierto((v) => !v)} aria-expanded={menuAbierto} aria-label="Menú"
      className="-ml-1 grid size-10 shrink-0 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 md:hidden">
      <Menu className="size-5" aria-hidden="true" />
    </button>
  );
  const menuDesplegado = menu && menuAbierto && (
    <div className="absolute inset-x-0 top-full z-30 mt-2 rounded-xl border border-slate-200 bg-white p-3 shadow-lg md:hidden">{menu}</div>
  );
  const logo = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/assets/adamia-logo-reloj.png" alt="ADAMIA" width={600} height={159} className="h-7 w-auto shrink-0" />
  );
  const bocina = sonido && (
    <button type="button" onClick={sonido.onCambiar} aria-pressed={!sonido.activo} data-bocina={sonido.activo ? "si" : "no"}
      aria-label={sonido.activo ? "Silenciar sonido" : "Activar sonido"} title={sonido.activo ? "Sonido activado" : "Sonido silenciado"}
      className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
      {sonido.activo ? <Volume2 className="size-5" aria-hidden="true" /> : <VolumeX className="size-5 text-slate-400" aria-hidden="true" />}
    </button>
  );
  const enLinea = <span className="flex shrink-0 items-center gap-1"><IndicadorConexion {...conexion} variante="insignia" />{bocina}</span>;
  // Cinco toques sobre la hora prenden o apagan el diagnóstico.
  const textoHora = (tamano, tamanoMeridiano, extra = "") => (
    <p onClick={onTocarHora} className={cn("flex select-none items-baseline gap-1.5 font-bold tracking-tight text-slate-900", extra)}>
      <span className={cn("tabular-nums leading-none", tamano)}>{hora}</span>
      <span className={cn("font-semibold text-brand", tamanoMeridiano)}>{meridiano}</span>
    </p>
  );

  // Tarjeta de la hora: grande en pantalla (crece con el alto libre), compacta en tableta (crece en horizontal).
  const tarjetaHora = (grande, crece = grande) => (
    <header className={cn("relative flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm", grande ? "p-5 [@media(max-height:820px)]:p-3.5" : "p-4", crece && "min-h-0 flex-1 justify-center")}>
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">{botonMenu}{logo}</span>
        {enLinea}
      </div>
      <div className={cn("flex flex-col items-center text-center", grande ? "flex-1 justify-center gap-2 py-2 [@media(max-height:820px)]:gap-1 [@media(max-height:820px)]:py-1" : "mt-3 gap-1", crece && !grande && "flex-1 justify-center")}>
        {textoHora(
          grande ? "text-6xl [@media(min-height:900px)]:text-7xl [@media(min-height:1000px)]:text-8xl [@media(max-height:780px)]:text-5xl" : "text-5xl",
          grande ? "text-2xl [@media(min-height:1000px)]:text-3xl [@media(max-height:780px)]:text-xl" : "text-xl",
        )}
        <p className={cn("text-slate-600", grande ? "text-base [@media(min-height:1000px)]:text-lg [@media(max-height:820px)]:text-sm" : "text-sm")}>{fechaActual}</p>
        {nombreEmpresa && <p className="max-w-full truncate text-sm font-semibold text-slate-900">{nombreEmpresa}</p>}
      </div>
      {menuDesplegado}
    </header>
  );

  const selector = <SelectorMetodo metodo={metodo} onCambiar={onCambiarMetodo} />;
  const paneles = {
    codigo: <PanelCodigo codigo={codigo} setCodigo={setCodigo} onRegistrar={onRegistrar} registrando={registrando} avisar={avisar} avisoUbicacion={avisoUbicacion} compacto={compacto} />,
    rostro: <PanelRostro onUsarCodigo={() => onCambiarMetodo("codigo")} compacto={compacto} />,
    qr: <PanelQR onAbrirQR={onAbrirQR} registrando={registrando} compacto={compacto} />,
  };
  // Pantalla: los tres paneles ocupan el mismo lugar (el alto no brinca al cambiar de método). Fuera de pantalla, solo el elegido.
  const panel = (fijo, className = "") => (
    <section aria-label="Registrar con código o QR" className={cn("rounded-2xl border border-slate-200 bg-white shadow-sm", compacto ? "p-3" : "p-4", className)}>
      {fijo ? (
        <div className="grid h-full">
          {Object.entries(paneles).map(([id, nodo]) => (
            <div key={id} className={cn("[grid-area:1/1]", id !== metodo && "invisible")} inert={id !== metodo} data-panel-metodo={id}>{nodo}</div>
          ))}
        </div>
      ) : <div className="h-full" data-panel-metodo={metodo}>{paneles[metodo]}</div>}
    </section>
  );
  const comer = <TarjetaVoyAComer {...voyAComer} compacto={compacto} />;
  const seccionCamara = (className = "") => (
    <section aria-label="Cámara" className={cn("relative min-h-0 overflow-hidden rounded-2xl bg-slate-900 shadow-sm [container-type:size]", className)}>{camara}</section>
  );
  const hoy = (className = "") => recientes && (
    <aside aria-label="Checadas de hoy" className={cn("flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm", className)}>{recientes}</aside>
  );
  const marco = "h-dvh overflow-hidden bg-slate-50";

  if (disposicion === "escritorio") {
    return (
      <div className={cn(marco, "grid grid-cols-[clamp(22rem,27vw,26rem)_minmax(0,1fr)_clamp(17rem,22vw,22rem)] gap-4 p-4 [@media(max-height:780px)]:gap-3 [@media(max-height:780px)]:p-3")}>
        <div className="flex min-h-0 flex-col gap-3">
          {tarjetaHora(true)}
          {selector}
          {panel(true, "shrink-0")}
          {comer}
        </div>
        {seccionCamara()}
        {hoy()}
      </div>
    );
  }

  if (disposicion === "tableta") {
    // Horizontal: hora/método/«Voy a comer» | panel | «Hoy». Vertical: hora/método/«Voy a comer»/«Hoy» | panel.
    return (
      <div className={cn(marco, "flex flex-col gap-4 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]")}>
        {seccionCamara("flex-1")}
        <div className={cn("grid shrink-0 gap-4", horizontal ? "grid-cols-[minmax(17rem,20rem)_minmax(0,1fr)_minmax(0,1fr)]" : "grid-cols-2")}>
          <div className="flex min-h-0 flex-col gap-3">
            {tarjetaHora(false, horizontal)}
            {selector}
            {comer}
            {!horizontal && metodo !== "rostro" && hoy("min-h-0 flex-1 basis-0")}
          </div>
          {panel(false)}
          {horizontal && hoy("[contain:size]")}
        </div>
      </div>
    );
  }

  if (disposicion === "bajo") {
    return (
      <div className={cn(marco, "grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 p-3")}>
        <div className="flex min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain">
          <header className="relative flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">{botonMenu}{logo}</span>
            {textoHora("text-2xl", "text-sm")}
            {menuDesplegado}
          </header>
          {selector}
          {metodo !== "rostro" && panel(false)}
          {comer}
        </div>
        {seccionCamara()}
      </div>
    );
  }

  // Celular vertical.
  return (
    <div className={cn(marco, "flex flex-col gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]")}>
      <header className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="flex items-center gap-2">{botonMenu}{logo}</span>
          {enLinea}
        </div>
        <div className="min-w-0 text-right">
          {textoHora("text-3xl", "text-sm", "justify-end")}
          <p className="truncate text-xs text-slate-500">{fechaActual}</p>
        </div>
        {menuDesplegado}
      </header>
      {seccionCamara("min-h-40 flex-1")}
      {selector}
      {metodo !== "rostro" && panel(false, "shrink-0")}
      {comer}
    </div>
  );
}
