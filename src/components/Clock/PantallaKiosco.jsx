"use client";
import { useState } from "react";
import { Menu } from "lucide-react";
import IndicadorConexion from "./IndicadorConexion";
import { SelectorMetodo, PanelCodigo, PanelRostro, PanelQR } from "./MetodosKiosco";
import { TarjetaVoyAComer } from "./VoyAComer";
import { useDisposicionKiosco } from "./disposicionKiosco";
import { cn } from "@/lib/utils";

// Reloj checador de la empresa (/<slug>) en modo kiosco — maqueta aprobada por el dueño (26/11/2026), DOS zonas:
//  - la cámara es la protagonista (todo el alto y el ancho libre, óvalo grande para checar a un brazo de distancia), con
//    la hora en una tarjeta translúcida arriba a la izquierda y los botones arriba a la derecha;
//  - un panel derecho angosto (~380 px): método, su contenido, «Voy a comer» y «Últimos».
// Vertical (tableta y celular): la cámara arriba, grande, y el panel abajo. Todo cabe en 100dvh sin desplazar.
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
  onNoReconoce,
  registrando,
  avisar,
  avisoUbicacion,
  camara,
  sobreCamara = null,
  ultimos,
  voyAComer,
}) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const { disposicion, horizontal } = useDisposicionKiosco();
  // La tarjeta muestra horas y minutos (los segundos distraen a distancia).
  const hora = horaActual.replace(/:\d{2} [ap]\.m\.$/, "");
  const meridiano = /a\.m\.$/.test(horaActual) ? "a.m." : "p.m.";
  const celular = disposicion === "celular" || disposicion === "bajo";
  const dosZonas = disposicion === "escritorio" || disposicion === "bajo" || (disposicion === "tableta" && horizontal);

  // Tarjeta de la hora sobre la cámara (arriba a la izquierda). Crece con el ancho de la cámara (container queries).
  const tarjetaHora = (
    <header className="absolute left-3 top-3 z-20 max-w-[calc(100%-12rem)] [@container(min-width:40rem)]:max-w-[calc(100%-26rem)] rounded-2xl bg-white/90 px-3.5 py-2.5 shadow-[0_4px_16px_rgba(15,23,42,0.12)] backdrop-blur-sm [@container(min-width:40rem)]:left-5 [@container(min-width:40rem)]:top-5 [@container(min-width:40rem)]:px-5 [@container(min-width:40rem)]:py-3.5">
      <div className="flex items-center gap-2">
        {menu && (
          <button type="button" onClick={() => setMenuAbierto((v) => !v)} aria-expanded={menuAbierto} aria-label="Menú"
            className="-ml-1.5 grid size-9 shrink-0 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 md:hidden">
            <Menu className="size-5" aria-hidden="true" />
          </button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/adamia-logo-reloj.png" alt="ADAMIA" width={600} height={159} className="h-5 w-auto shrink-0 [@container(min-width:40rem)]:h-6" />
        <IndicadorConexion {...conexion} variante="insignia" className="ml-1" />
      </div>
      {/* Cinco toques sobre la hora prenden o apagan el diagnóstico. */}
      <p onClick={onTocarHora} className="mt-1.5 flex select-none items-baseline gap-1.5 font-extrabold leading-none tracking-tight text-slate-900">
        <span className="text-3xl tabular-nums [@container(min-width:40rem)]:text-[2.75rem]">{hora}</span>
        <span className="text-sm font-bold text-brand [@container(min-width:40rem)]:text-lg">{meridiano}</span>
      </p>
      <p className="mt-1 truncate text-xs text-slate-600 [@container(min-width:40rem)]:text-[13px]">
        {fechaActual}{nombreEmpresa ? ` · ${nombreEmpresa}` : ""}
      </p>
      {menu && menuAbierto && (
        <div className="absolute left-0 top-full z-30 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-lg md:hidden">{menu}</div>
      )}
    </header>
  );

  const seccionCamara = (className = "") => (
    <section aria-label="Cámara" className={cn("relative min-h-0 overflow-hidden rounded-3xl bg-slate-800 [container-type:size]", className)}>
      {camara}
      {tarjetaHora}
      {sobreCamara}
    </section>
  );

  const contenido = {
    codigo: <PanelCodigo codigo={codigo} setCodigo={setCodigo} onRegistrar={onRegistrar} registrando={registrando} avisar={avisar} avisoUbicacion={avisoUbicacion} compacto={celular} />,
    rostro: <PanelRostro onNoReconoce={onNoReconoce} compacto={celular} />,
    qr: <PanelQR onAbrirQR={onAbrirQR} registrando={registrando} compacto={celular} />,
  }[metodo];
  const selector = <SelectorMetodo metodo={metodo} onCambiar={onCambiarMetodo} compacto={celular} />;
  const comer = <TarjetaVoyAComer {...voyAComer} compacto={celular} />;
  // «Últimos»: con Código en pantallas bajas no cabe junto al teclado; se esconde para no desplazar.
  const tarjetaUltimos = (className = "") => ultimos && (
    <section aria-label="Últimos registros" className={cn("shrink-0 rounded-[1.25rem] bg-white px-4 py-3.5 shadow-sm", metodo === "codigo" && "[@media(max-height:56rem)]:hidden", className)}>
      {ultimos}
    </section>
  );
  const marco = "h-dvh overflow-hidden bg-slate-100";

  if (dosZonas) {
    return (
      <div className={cn(marco, "flex gap-4 p-4", disposicion === "bajo" && "gap-3 p-3")}>
        {seccionCamara("flex-1")}
        <aside aria-label="Cómo checar" className={cn("flex min-h-0 shrink-0 flex-col gap-3.5", disposicion === "bajo" ? "w-[min(20rem,45vw)] overflow-y-auto overscroll-contain" : "w-[clamp(20rem,28vw,23.75rem)]")}>
          {selector}
          <section aria-label="Registrar con código o QR" className="flex min-h-0 flex-1 flex-col gap-4 rounded-[1.25rem] bg-white p-5 shadow-sm [@media(max-height:800px)]:p-4">
            <div data-panel-metodo={metodo}>{contenido}</div>
            <div className="mt-auto">{comer}</div>
          </section>
          {disposicion !== "bajo" && tarjetaUltimos()}
        </aside>
      </div>
    );
  }

  if (!celular) {
    // Tableta vertical: cámara arriba (≥ 55 % del alto con Rostro y QR); abajo método, «Voy a comer» y «Últimos» | contenido del método.
    return (
      <div className={cn(marco, "flex flex-col gap-4 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]")}>
        {/* Con Código el teclado manda: la cámara cede alto para que todo quepa sin desplazar. */}
        {seccionCamara(cn("flex-1", metodo === "codigo" ? "min-h-48" : "min-h-[55%]"))}
        <div className="grid shrink-0 grid-cols-2 gap-4">
          <div className="flex min-h-0 flex-col gap-3.5">
            {selector}
            {comer}
            {tarjetaUltimos()}
          </div>
          <section aria-label="Registrar con código o QR" className="rounded-[1.25rem] bg-white p-5 shadow-sm" data-panel-metodo={metodo}>{contenido}</section>
        </div>
      </div>
    );
  }

  // Celular vertical: cámara arriba (≥ 55 % del alto con Rostro y QR), método, contenido y «Voy a comer».
  return (
    <div className={cn(marco, "flex flex-col gap-2.5 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]")}>
      {seccionCamara(cn("flex-1", metodo === "codigo" ? "min-h-40" : "min-h-[55%]"))}
      {selector}
      {metodo === "codigo"
        ? <section aria-label="Registrar con código o QR" className="shrink-0 rounded-2xl bg-white p-3 shadow-sm" data-panel-metodo={metodo}>{contenido}</section>
        : <div className="shrink-0" data-panel-metodo={metodo}>{contenido}</div>}
      {comer}
    </div>
  );
}
