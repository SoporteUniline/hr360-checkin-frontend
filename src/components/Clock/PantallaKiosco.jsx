"use client";
import { useState } from "react";
import { Menu } from "lucide-react";
import EmployeeInput from "./EmployeeInput";
import IndicadorConexion from "./IndicadorConexion";

// Reloj checador de la empresa (/<slug>) en modo kiosco: todo cabe en una pantalla (100dvh) sin desplazar.
// Horizontal (con alto suficiente): hora + código/teclado a la izquierda y la cámara a la derecha (en pantallas anchas, también los
// últimos registros). Celular acostado: teclado a la izquierda; hora y cámara a la derecha. Vertical: hora arriba, cámara en medio y código/teclado abajo, siempre a la vista.
// Solo presentación: la lógica de checado vive en RelojChecador.
export default function PantallaKiosco({
  horaActual,
  fechaActual,
  onTocarHora,
  conexion,
  menu,
  codigo,
  setCodigo,
  onRegistrar,
  onAbrirQR,
  registrando,
  enqueueSnackbar,
  avisoUbicacion,
  camara,
  recientes,
  // (26/11/2026) «Voy a comer»: va junto al código y el QR.
  extra = null,
}) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const hora = horaActual.replace(/ [ap]\.m\.$/, "");
  const meridiano = /a\.m\.$/.test(horaActual) ? "a.m." : "p.m.";

  return (
    <div className="grid h-dvh gap-3 overflow-hidden bg-slate-50 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] [grid-template-areas:'hora'_'camara'_'codigo'] grid-rows-[auto_minmax(0,1fr)_auto] grid-cols-1 kiosco-grande:gap-4 kiosco-grande:p-4 kiosco-horizontal:grid-cols-[minmax(20rem,26rem)_minmax(0,1fr)] kiosco-horizontal:grid-rows-[auto_minmax(0,1fr)] kiosco-horizontal:[grid-template-areas:'hora_camara'_'codigo_camara'] kiosco-bajo:grid-cols-2 kiosco-bajo:grid-rows-[auto_minmax(0,1fr)] kiosco-bajo:[grid-template-areas:'codigo_hora'_'codigo_camara'] min-[1360px]:kiosco-horizontal:grid-cols-[26rem_minmax(0,1fr)_22rem] min-[1360px]:kiosco-horizontal:[grid-template-areas:'hora_camara_recientes'_'codigo_camara_recientes']">
      <header className="relative flex items-center justify-between gap-3 [grid-area:hora] kiosco-horizontal:flex-col kiosco-horizontal:items-stretch kiosco-horizontal:gap-2 kiosco-horizontal:rounded-2xl kiosco-horizontal:border kiosco-horizontal:border-slate-200 kiosco-horizontal:bg-white kiosco-horizontal:p-4 kiosco-horizontal:shadow-sm">
        <div className="flex shrink-0 items-center gap-2 kiosco-horizontal:justify-between">
          <span className="flex items-center gap-2">
            {menu && (
              <button type="button" onClick={() => setMenuAbierto((v) => !v)} aria-expanded={menuAbierto} aria-label="Menú"
                className="-ml-1 grid size-10 shrink-0 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 md:hidden">
                <Menu className="size-5" aria-hidden="true" />
              </button>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/adamia-logo-reloj.png" alt="ADAMIA" width={600} height={159} className="h-7 w-auto kiosco-grande:h-8" />
          </span>
          <IndicadorConexion {...conexion} />
        </div>
        <div className="min-w-0 text-right kiosco-horizontal:text-center">
          {/* Cinco toques sobre la hora prenden o apagan el diagnóstico. */}
          <p onClick={onTocarHora} className="flex select-none items-baseline justify-end gap-1.5 font-mono font-bold tracking-tight text-slate-900 kiosco-horizontal:justify-center">
            <span className="text-4xl kiosco-bajo:text-3xl tabular-nums kiosco-grande:text-6xl kiosco-horizontal:text-5xl min-[1360px]:kiosco-horizontal:text-6xl">{hora}</span>
            <span className="text-base font-black text-brand kiosco-grande:text-xl">{meridiano}</span>
          </p>
          <p className="truncate text-xs text-slate-500 kiosco-grande:text-sm">{fechaActual}</p>
        </div>
        {menu && menuAbierto && (
          <div className="absolute inset-x-0 top-full z-30 mt-2 rounded-xl border border-slate-200 bg-white p-3 shadow-lg kiosco-grande:hidden">
            {menu}
          </div>
        )}
      </header>

      <section aria-label="Cámara" className="relative min-h-0 overflow-hidden rounded-2xl bg-slate-950 [grid-area:camara]">
        {camara}
      </section>

      <section aria-label="Registrar con código o QR" className="flex min-h-0 flex-col justify-center gap-2 [grid-area:codigo] kiosco-horizontal:rounded-2xl kiosco-horizontal:border kiosco-horizontal:border-slate-200 kiosco-horizontal:bg-white kiosco-horizontal:p-4 kiosco-horizontal:shadow-sm">
        <EmployeeInput
          variante="kiosco"
          codigo={codigo}
          setCodigo={setCodigo}
          handleRegistrar={onRegistrar}
          handleOpenQR={onAbrirQR}
          registrando={registrando}
          enqueueSnackbar={enqueueSnackbar}
          extra={extra}
        />
        {avisoUbicacion && <p className="text-xs text-slate-600" role="status">{avisoUbicacion}</p>}
      </section>

      {recientes && (
        <aside aria-label="Últimos registros" className="hidden min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm [grid-area:recientes] min-[1360px]:kiosco-horizontal:flex">
          {recientes}
        </aside>
      )}
    </div>
  );
}
