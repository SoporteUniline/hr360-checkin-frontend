"use client";

// «Salud del agente» (P7, ?vista=salud dentro de /panel/whatsapp). Para RH de la empresa: tarjetas (respondidos, fallas,
// pasos a persona, tiempo de respuesta y costo del mes), gráfica por día, errores agrupados en lenguaje claro y las
// conversaciones afectadas con «Abrir chat». GET /salud?empresa&desde&hasta cada 60 s con la pestaña visible.
// Sin la migración del servidor (503 SIN_MIGRACION) se explica que falta prepararlo; nunca se muestran códigos crudos.
import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { AlertTriangle, MessageCircle, RefreshCw } from "lucide-react";
import { mensajeErrorApi } from "@/lib/whatsapp/reglas.mjs";
import { formatearTelefono } from "@/lib/whatsapp/telefono.mjs";
import { PERIODOS, haceCuanto, rangoUltimosDias, tarjetasResumen, textoError, tonoSeveridad } from "@/lib/whatsapp/salud.mjs";
import { hoyMx } from "@/lib/whatsapp/agenda.mjs";
import { obtener, rutaSalud } from "./api";
import { TONOS } from "./controles";
import GraficaSalud from "./GraficaSalud";

function Tarjeta({ t }) {
  return (
    <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-3 md:p-4" data-tarjeta-salud={t.clave}>
      <p className="text-[12.5px] font-medium text-gray-600">{t.titulo}</p>
      <p className={`mt-0.5 text-xl font-bold tabular-nums md:text-2xl ${t.alerta ? "text-red-700" : "text-gray-900"}`}>{t.valor}</p>
      <p className="mt-0.5 text-[12px] leading-snug text-gray-500 [overflow-wrap:anywhere]">{t.detalle}</p>
    </div>
  );
}

function Errores({ errores, ahora }) {
  if (!errores.length) {
    return <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900" data-sin-errores>Sin fallas en este periodo. El agente contestó con normalidad.</p>;
  }
  return (
    <ul className="grid gap-2" aria-label="Errores agrupados" data-errores-salud>
      {errores.map((e) => (
        <li key={e.tipo} className="flex min-w-0 items-start gap-3 rounded-xl border border-gray-200 bg-white p-3">
          <span className={`mt-0.5 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${TONOS[tonoSeveridad(e.severidad)]}`}>
            {e.severidad === "error" ? "Falla" : "Aviso"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-gray-900 [overflow-wrap:anywhere]">{textoError({ tipo: e.tipo, mensaje: e.ultimo_mensaje })}</p>
            <p className="text-[12.5px] text-gray-500">{e.total === 1 ? "1 vez" : `${e.total} veces`} · la última {haceCuanto(e.ultima_fecha, ahora)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Afectadas({ conversaciones, pathname, ahora }) {
  if (!conversaciones.length) return null;
  return (
    <section aria-labelledby="titulo-afectadas" className="grid gap-2">
      <h3 id="titulo-afectadas" className="text-[15px] font-bold text-gray-900">Conversaciones afectadas</h3>
      <ul className="grid gap-2 lg:grid-cols-2" data-afectadas>
        {conversaciones.map((c) => (
          <li key={c.id_conversacion} className="flex min-w-0 flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold text-gray-900">{c.contacto || (c.telefono ? formatearTelefono(c.telefono) : "Candidato")}</p>
              <p className="truncate text-[12.5px] text-gray-500">{c.vacante || "Sin vacante"}</p>
              <p className="mt-0.5 text-[12.5px] text-gray-700 [overflow-wrap:anywhere]">{textoError(c.ultimo_error)} · {haceCuanto(c.ultimo_error?.fecha, ahora)}</p>
            </div>
            <Link href={`${pathname}?c=${encodeURIComponent(c.id_conversacion)}`} scroll={false}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-[13.5px] font-semibold text-gray-800 hover:bg-gray-50 md:min-h-9"
              aria-label={`Abrir chat de ${c.contacto || "el candidato"}`}>
              <MessageCircle className="size-4" aria-hidden="true" /> Abrir chat
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function SaludAgente({ idEmpresa, ahora, pathname }) {
  const [dias, setDias] = useState(7);
  const rango = useMemo(() => rangoUltimosDias(dias, hoyMx(ahora)), [dias, ahora]);
  const { data, error, isLoading, mutate } = useSWR(rutaSalud(idEmpresa, rango), obtener, { refreshInterval: 60000, refreshWhenHidden: false, keepPreviousData: true });
  const tarjetas = useMemo(() => tarjetasResumen(data?.resumen ?? {}), [data]);

  return (
    <div className="grid min-w-0 gap-4" data-vista-salud>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-[17px] font-bold text-gray-900">Salud del agente</h2>
          <p className="text-[13px] text-gray-600">Si el agente deja de contestar, aquí lo ves de inmediato.</p>
        </div>
        <div role="group" aria-label="Periodo" className="flex rounded-lg bg-gray-100 p-0.5">
          {PERIODOS.map((p) => (
            <button key={p.dias} type="button" aria-pressed={dias === p.dias} onClick={() => setDias(p.dias)}
              className={`min-h-11 rounded-md px-4 text-[13.5px] font-semibold md:min-h-9 ${dias === p.dias ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"}`}>
              {p.texto}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            {error?.response?.data?.codigo === "SIN_MIGRACION"
              ? "El monitoreo del agente aún no está preparado en el servidor. Pídele a ADAMIA que lo active."
              : mensajeErrorApi(error, "No se pudo consultar la salud del agente.")}
          </span>
          <button type="button" onClick={() => mutate()} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 font-medium md:min-h-9">
            <RefreshCw className="size-4" aria-hidden="true" /> Reintentar
          </button>
        </div>
      ) : isLoading && !data ? (
        <p className="text-sm text-gray-500">Consultando la salud del agente…</p>
      ) : data ? (
        <>
          <section aria-label="Resumen" className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-5">
            {tarjetas.map((t) => <Tarjeta key={t.clave} t={t} />)}
          </section>
          <section className="min-w-0 rounded-xl border border-gray-200 bg-white p-3 md:p-4">
            <GraficaSalud serie={data.serie ?? []} />
          </section>
          <section aria-labelledby="titulo-errores" className="grid gap-2">
            <h3 id="titulo-errores" className="text-[15px] font-bold text-gray-900">Qué falló</h3>
            <Errores errores={data.errores ?? []} ahora={ahora} />
          </section>
          <Afectadas conversaciones={data.conversaciones ?? []} pathname={pathname} ahora={ahora} />
        </>
      ) : null}
    </div>
  );
}
