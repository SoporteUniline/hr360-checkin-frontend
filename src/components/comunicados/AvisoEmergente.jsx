"use client";
// Aviso emergente de comunicados (maqueta «Popup», aprobada 27/11/2026). Va en el layout del panel y en el de Mi espacio.
// - Se cierra SOLO con sus botones: nunca con un clic al fondo (como los pop-ups de venta). Escape solo en los normales.
// - Normal: sale una vez; «Entendido» lo cierra y lo marca visto (POST …/posponer).
// - Confirmación: casilla «Leí el comunicado y estoy enterado» + «Confirmar de leído» (guarda fecha, hora, IP y
//   dispositivo); «Recordarme más tarde» lo pospone 4 h; vuelve a salir en cada entrada hasta confirmar.
// Backend: GET {base}/popup, POST {base}/:id/confirmar { dispositivo }, POST {base}/:id/posponer (base = /mi o el panel).
import { useRef, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import * as D from "@radix-ui/react-dialog";
import { Capacitor } from "@capacitor/core";
import { CalendarDays, FileText } from "lucide-react";
import axios from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import { useModulosActivos } from "@/components/modulos/useModulos";
import { rutaPermitida } from "@/lib/modulos/menu.mjs";
import { RUTA_MURO, RUTA_PANEL, dispositivo, errorDe, fechaEvento, fechaRelativa, fotosDe, pdfDe, popupDe, porConfirmar, rutaPost, rutasPopup, textoTipo } from "@/lib/comunicados/comunicados.mjs";
import { TextoPlano, botonPrimario, botonSecundario, get, useZona } from "./comun";

const esNativo = () => { try { return Capacitor.isNativePlatform() || navigator.userAgent.includes("AdamiaAppNative"); } catch { return false; } };

export function VentanaAviso({ aviso, modo, tz, alTerminar }) {
  const rutas = rutasPopup(modo);
  const [enterado, setEnterado] = useState(false);
  const [enviando, setEnviando] = useState(null);
  const [error, setError] = useState(null);
  const confirmar = porConfirmar(aviso) || aviso?.cerrar_con === "confirmar";
  const foto = fotosDe(aviso)[0];
  const pdf = pdfDe(aviso);
  const hacer = async (clave, fn) => {
    setEnviando(clave); setError(null);
    try { await fn(); alTerminar(aviso.id); } catch (e) { setError(errorDe(e)); } finally { setEnviando(null); }
  };
  const posponer = () => hacer("posponer", () => axios.post(rutas.posponer(aviso.id), {}));
  const confirmarLeido = () => hacer("confirmar", () => axios.post(rutas.confirmar(aviso.id), { dispositivo: dispositivo(navigator.userAgent, esNativo()) }));
  const autor = [aviso.autor?.rol || aviso.autor?.nombre, fechaRelativa(aviso.publicado_en, { tz }).toLowerCase()].filter(Boolean).join(" · ");
  return (
    <D.Root open onOpenChange={() => { /* solo se cierra con sus botones */ }}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-[60] bg-slate-900/55" data-aviso-fondo />
        <D.Content
          data-aviso-emergente={aviso.id}
          aria-describedby="aviso-cuerpo"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => { e.preventDefault(); if (!confirmar && !enviando) posponer(); }}
          className="fixed left-1/2 top-1/2 z-[61] flex max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[20px] bg-white text-slate-900 shadow-2xl outline-none">
          <div className="grid gap-3 overflow-y-auto p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={`rounded-full px-2.5 py-1 text-[13px] font-bold uppercase tracking-wide ${confirmar ? "bg-amber-100 text-amber-900" : "bg-blue-50 text-blue-800"}`}>
                {textoTipo(aviso.tipo)}{confirmar ? " · requiere tu confirmación" : ""}
              </span>
              {autor ? <span className="text-[13px] text-slate-600">{autor}</span> : null}
            </div>
            <D.Title className="break-words text-xl font-extrabold leading-tight">{aviso.titulo}</D.Title>
            {aviso.fecha_evento ? <p className="flex items-center gap-2 text-sm font-semibold text-slate-700"><CalendarDays className="size-4 text-[#2563EB]" aria-hidden="true" />{fechaEvento(aviso.fecha_evento, { tz })}</p> : null}
            {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada */}
            {foto ? <img src={foto.url} alt={foto.nombre || ""} width={1024} height={576} loading="lazy" decoding="async" className="h-auto max-h-56 w-full rounded-xl object-cover" /> : null}
            <div id="aviso-cuerpo"><TextoPlano className="text-[15px] leading-relaxed text-slate-700">{aviso.cuerpo}</TextoPlano></div>
            {pdf ? <a href={pdf.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#2563EB] hover:underline"><FileText className="size-4" aria-hidden="true" />Ver {pdf.nombre || "documento.pdf"}</a> : null}
            {modo === "empleado" && (aviso.youtube_id || fotosDe(aviso).length > 1) ? <Link href={rutaPost(aviso.id)} className="inline-flex min-h-11 items-center text-sm font-semibold text-[#2563EB] hover:underline" onClick={() => { if (!confirmar) posponer(); }}>Ver completo en el muro</Link> : null}
            {confirmar ? (
              <label htmlFor="aviso-enterado" className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <input id="aviso-enterado" type="checkbox" className="size-5 accent-[#2563EB]" checked={enterado} onChange={(e) => setEnterado(e.target.checked)} />
                <span className="text-sm font-semibold text-slate-900">Leí el comunicado y estoy enterado</span>
              </label>
            ) : null}
            {error ? <p role="alert" className="text-[13px] text-red-700">{error}</p> : null}
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 p-4 sm:flex-row sm:justify-end sm:px-6" data-permiso="libre">
            {confirmar ? (
              <>
                <button type="button" className={botonSecundario} disabled={Boolean(enviando)} onClick={posponer}>{enviando === "posponer" ? "Un momento…" : "Recordarme más tarde"}</button>
                <button type="button" className={botonPrimario} disabled={!enterado || Boolean(enviando)} onClick={confirmarLeido}>{enviando === "confirmar" ? "Confirmando…" : "Confirmar de leído"}</button>
              </>
            ) : (
              <button type="button" className={botonPrimario} disabled={Boolean(enviando)} onClick={posponer}>{enviando === "posponer" ? "Un momento…" : "Entendido"}</button>
            )}
          </div>
          {confirmar ? <p className="px-5 pb-4 text-center text-[13px] text-slate-500 sm:px-6">Se guarda tu nombre, la fecha y la hora.</p> : null}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

/** Aviso emergente global. modo: "panel" | "empleado". No consulta si la empresa no tiene el módulo. */
export default function AvisoEmergente({ modo = "empleado" }) {
  const { dataUser, isLoggedIn } = useAuth();
  const { activos, opciones } = useModulosActivos();
  const tz = useZona();
  const tipo = dataUser?.tipo_usuario;
  const quien = modo === "empleado" ? tipo === "Empleado" : tipo === "Recruiter" || tipo === "User";
  const activo = isLoggedIn && quien && rutaPermitida(modo === "empleado" ? RUTA_MURO : RUTA_PANEL, activos, opciones);
  const terminados = useRef(new Set());
  const { data, mutate } = useSWR(activo ? rutasPopup(modo).popup : null, get, { revalidateOnFocus: false, shouldRetryOnError: false, dedupingInterval: 60000 });
  const [, refrescar] = useState(0);
  const aviso = popupDe(data);
  if (!aviso || terminados.current.has(aviso.id)) return null;
  return <VentanaAviso key={aviso.id} aviso={aviso} modo={modo} tz={tz} alTerminar={(id) => { terminados.current.add(id); refrescar((n) => n + 1); mutate(); }} />;
}
