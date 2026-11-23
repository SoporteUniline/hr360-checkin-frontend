"use client";
// Ajustes → Módulos (03/12/2026, «Módulos por empresa», opción C). RH / dueño prende o apaga lo que su empresa usa dentro
// de lo que tiene contratado; lo base aparece fijo («Incluido siempre»); lo que no tiene, con candado y Contratar.
// Apagar pide confirmación: se oculta para todos y no se borra nada. El servidor valida todo (empresa de la sesión).
import { useState } from "react";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import { LayoutGrid, Lock, MessageCircle, CheckCircle2 } from "lucide-react";
import axios from "@/lib/axios";
import EncabezadoPagina from "@/components/tabla/EncabezadoPagina";
import { SelectorEmpresa, useEmpresaNomina } from "@/components/nomina/comun";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { enlaceWhatsApp } from "@/lib/popups/reglas.mjs";
import { ORIGEN, seccionesModulos, textoContratar } from "@/lib/modulos/menu.mjs";
import { refrescarModulos } from "./useModulos";

const get = (url) => axios.get(url).then((r) => r.data);
const errorDe = (e, porDefecto) => e?.response?.data?.error || porDefecto;
const tarjeta = "flex min-w-0 flex-col gap-3 rounded-2xl border bg-white p-4 sm:flex-row sm:items-start sm:justify-between";

export function Interruptor({ encendido, alCambiar, deshabilitado, etiqueta }) {
  return (
    <button
      type="button" role="switch" aria-checked={encendido} aria-label={etiqueta} disabled={deshabilitado} onClick={alCambiar}
      className="inline-flex min-h-11 shrink-0 items-center gap-2 self-start rounded-full px-1 text-sm font-semibold text-slate-700 disabled:opacity-60"
    >
      <span className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${encendido ? "bg-[#2563EB]" : "bg-slate-300"}`}>
        <span className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${encendido ? "translate-x-6" : "translate-x-1"}`} />
      </span>
      <span className="w-16 text-left">{encendido ? "Activo" : "Apagado"}</span>
    </button>
  );
}

function Tarjeta({ m, children, tono = "border-slate-200" }) {
  return (
    <li className={`${tarjeta} ${tono}`} data-modulo={m.clave}>
      <div className="min-w-0">
        <h3 className="break-words text-[15px] font-bold text-slate-900">{m.nombre}</h3>
        <p className="mt-0.5 break-words text-[13px] text-slate-600">{m.descripcion}</p>
        {/* Base y sin derecho ya lo dicen a la derecha («Incluido siempre», candado). */}
        {!m.base && m.derecho ? <p className="mt-1.5 text-[12px] font-medium text-slate-500">{ORIGEN[m.origen] ?? ""}{m.origen === "extra" && m.nota ? ` · ${m.nota}` : ""}</p> : null}
      </div>
      {children}
    </li>
  );
}

export default function ModulosEmpresa() {
  const { enqueueSnackbar } = useSnackbar();
  const empresa = useEmpresaNomina();
  const nombreEmpresa = empresa.empresas.find((e) => e.id === empresa.idEmpresa)?.nombre;
  const llave = empresa.idEmpresa ? `/checador/modulos?empresa=${empresa.idEmpresa}` : null;
  const { data, error, isLoading, mutate } = useSWR(llave, get, { revalidateOnFocus: false, shouldRetryOnError: false });
  const [apagar, setApagar] = useState(null);
  const [guardando, setGuardando] = useState(null);

  const cambiar = async (m, activo) => {
    setGuardando(m.clave);
    try {
      const r = await axios.put(`/checador/modulos/${m.clave}`, { empresa: empresa.idEmpresa, activo });
      await mutate(r.data, { revalidate: false });
      await refrescarModulos();
      enqueueSnackbar(activo ? `${m.nombre} quedó activo.` : `${m.nombre} quedó apagado. No se borró nada.`, { variant: "success" });
    } catch (e) {
      enqueueSnackbar(errorDe(e, "No se pudo cambiar el módulo. Intenta de nuevo."), { variant: "error" });
    } finally {
      setGuardando(null);
    }
  };

  const s = seccionesModulos(data?.modulos ?? []);
  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 p-1">
      <EncabezadoPagina icono={LayoutGrid} titulo="Módulos" subtitulo="Prende o apaga lo que usa tu empresa. Apagar no borra nada." acciones={<SelectorEmpresa {...empresa} />} />
      {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{errorDe(error, "No se pudieron cargar los módulos.")}</p> : null}
      {isLoading || !data ? (!error ? <p role="status" className="text-sm text-slate-500">Cargando módulos…</p> : null) : (
        <>
          <section aria-labelledby="mod-tuyos" className="space-y-2">
            <h2 id="mod-tuyos" className="text-sm font-bold text-slate-800">Tus módulos</h2>
            <ul className="grid gap-2">
              {s.conDerecho.map((m) => (
                <Tarjeta key={m.clave} m={m}>
                  <Interruptor
                    encendido={m.activo} etiqueta={`${m.nombre}: ${m.activo ? "activo" : "apagado"}`} deshabilitado={guardando === m.clave}
                    alCambiar={() => (m.activo ? setApagar(m) : cambiar(m, true))}
                  />
                </Tarjeta>
              ))}
            </ul>
          </section>
          <section aria-labelledby="mod-base" className="space-y-2">
            <h2 id="mod-base" className="text-sm font-bold text-slate-800">Base de ADAMIA</h2>
            <ul className="grid gap-2">
              {s.base.map((m) => (
                <Tarjeta key={m.clave} m={m} tono="border-slate-200 bg-slate-50/60">
                  <span className="inline-flex min-h-11 shrink-0 items-center gap-1.5 self-start text-sm font-semibold text-emerald-700"><CheckCircle2 className="size-4" aria-hidden="true" />Incluido siempre</span>
                </Tarjeta>
              ))}
            </ul>
          </section>
          {s.sinDerecho.length ? (
            <section aria-labelledby="mod-contratar" className="space-y-2">
              <h2 id="mod-contratar" className="text-sm font-bold text-slate-800">Disponibles para contratar</h2>
              <ul className="grid gap-2">
                {s.sinDerecho.map((m) => (
                  <Tarjeta key={m.clave} m={m} tono="border-dashed border-slate-300">
                    <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                      <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-500"><Lock className="size-4" aria-hidden="true" />No incluido en tu plan</span>
                      <a href={enlaceWhatsApp(textoContratar(m.nombre, nombreEmpresa))} target="_blank" rel="noopener noreferrer"
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700">
                        <MessageCircle className="size-4" aria-hidden="true" />Contratar
                      </a>
                    </div>
                  </Tarjeta>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
      <AlertDialog open={Boolean(apagar)} onOpenChange={(abierto) => { if (!abierto) setApagar(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Apagar {apagar?.nombre}?</AlertDialogTitle>
            <AlertDialogDescription>
              Se ocultará para todos (RH y empleados) y no se borra nada. Puedes volver a prenderlo cuando quieras y todo seguirá ahí.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">Cancelar</AlertDialogCancel>
            <AlertDialogAction className="min-h-11 bg-red-600 hover:bg-red-700" onClick={() => { const m = apagar; setApagar(null); cambiar(m, false); }}>Apagar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
