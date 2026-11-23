"use client";

// «Salud y cobro» del administrador de ADAMIA (P7, /dashboard/whatsapp?vista=salud). Todas las empresas con su semáforo
// (estado del agente en 24 h), última falla en lenguaje claro, costo de IA del mes, entrevistas del mes contra su paquete
// y extras a cobrar. GET /admin/salud cada 60 s. Escritorio: tabla; teléfono: tarjetas (sin desborde, botones ≥ 44 px).
import { useMemo, useState } from "react";
import useSWR from "swr";
import { RefreshCw, Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import LoadingTable from "@/components/LoadingTable";
import { RUTA_ADMIN_SALUD, obtener } from "@/components/whatsapp/api";
import { formatearPrecio, mensajeErrorApi } from "@/lib/whatsapp/reglas.mjs";
import { textoEntrevistasAdmin } from "@/lib/whatsapp/paquete.mjs";
import { formatoUsd, haceCuanto, ordenarEmpresas, semaforo, textoError } from "@/lib/whatsapp/salud.mjs";

const normalizar = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const ENCABEZADO_LARGO = "max-w-28 whitespace-normal text-right leading-tight";

function Semaforo({ valor, fallas }) {
  const s = semaforo(valor);
  return (
    <span data-semaforo={valor} className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${s.clase}`}
      title={fallas ? `${fallas} ${fallas === 1 ? "falla" : "fallas"} en 24 h` : "Sin fallas en 24 h"}>
      <span className={`size-2 rounded-full ${s.punto}`} aria-hidden="true" /> {s.texto}
    </span>
  );
}

function UltimaFalla({ falla, ahora }) {
  if (!falla) return <span className="text-gray-500">Sin fallas</span>;
  return (
    <span className="block min-w-0">
      <span className="block [overflow-wrap:anywhere]">{textoError(falla)}</span>
      <span className="block text-xs text-gray-500">{haceCuanto(falla.fecha, ahora)}</span>
    </span>
  );
}

export default function SaludAdmin() {
  const { data, error, isLoading, mutate } = useSWR(RUTA_ADMIN_SALUD, obtener, { refreshInterval: 60000, refreshWhenHidden: false });
  const [busqueda, setBusqueda] = useState("");
  const ahora = new Date();
  const empresas = useMemo(() => ordenarEmpresas(data?.empresas ?? []), [data]);
  const filtradas = useMemo(() => {
    const q = normalizar(busqueda.trim());
    return q ? empresas.filter((e) => normalizar(e.nombre_empresa).includes(q) || String(e.id_empresa) === q) : empresas;
  }, [empresas, busqueda]);
  const t = data?.totales ?? {};

  return (
    <div className="grid min-w-0 gap-4" data-salud-admin>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumen de salud y cobro">
        {[
          ["Empresas fallando", String(t.en_rojo ?? 0), (t.en_rojo ?? 0) > 0],
          ["Costo de IA del mes", formatoUsd(t.costo_mes_usd ?? 0)],
          ["Entrevistas extra a cobrar", (Number(t.entrevistas_extra) || 0).toLocaleString("es-MX")],
          ["Importe estimado del mes", formatearPrecio(t.importe_estimado ?? 0)],
        ].map(([titulo, valor, alerta]) => (
          <div key={titulo} className="min-w-0 rounded-xl border p-3 md:p-4">
            <p className="text-[13px] text-muted-foreground">{titulo}</p>
            <p className={`text-xl font-bold tabular-nums md:text-2xl ${alerta ? "text-red-700" : ""}`}>{valor}</p>
          </div>
        ))}
      </section>
      {data?.globales?.eventos_24h ? (
        <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" data-globales>
          {data.globales.eventos_24h === 1 ? "Llegó 1 aviso" : `Llegaron ${data.globales.eventos_24h} avisos`} de WhatsApp con firma inválida en las últimas 24 h (revisa el secreto del webhook en Zernio).
        </p>
      ) : null}

      <label className="relative block max-w-md">
        <span className="sr-only">Buscar empresa</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar empresa"
          className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:h-10 md:text-sm" />
      </label>

      {isLoading ? <LoadingTable /> : error ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span className="min-w-0 flex-1">
            {error?.response?.data?.codigo === "SIN_MIGRACION"
              ? "Falta correr la migración del monitoreo (20261201_whatsapp_monitoreo.sql) en el servidor."
              : mensajeErrorApi(error, "No se pudo cargar la salud de las empresas.")}
          </span>
          <button type="button" onClick={() => mutate()} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 font-medium md:min-h-9">
            <RefreshCw className="size-4" aria-hidden="true" /> Reintentar
          </button>
        </div>
      ) : filtradas.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center"><p className="font-medium">{busqueda ? `Ninguna empresa coincide con «${busqueda}».` : "Aún no hay empresas."}</p></div>
      ) : (
        <>
          <div className="hidden min-w-0 overflow-x-auto rounded-xl border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="min-w-56">Última falla</TableHead>
                  <TableHead className={ENCABEZADO_LARGO}>Costo de IA del mes</TableHead>
                  <TableHead className={ENCABEZADO_LARGO}>Entrevistas este mes / incluidas</TableHead>
                  <TableHead className="text-right">Extra</TableHead>
                  <TableHead className={ENCABEZADO_LARGO}>Importe estimado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtradas.map((e) => (
                  <TableRow key={e.id_empresa} data-fila-salud={e.id_empresa}>
                    <TableCell className="font-medium">{e.nombre_empresa}</TableCell>
                    <TableCell><Semaforo valor={e.semaforo} fallas={e.fallas_24h} /></TableCell>
                    <TableCell className="max-w-80 whitespace-normal text-sm"><UltimaFalla falla={e.ultima_falla} ahora={ahora} /></TableCell>
                    <TableCell className="text-right tabular-nums">{formatoUsd(e.costo_mes_usd)}</TableCell>
                    <TableCell className="text-right tabular-nums">{textoEntrevistasAdmin(e)}</TableCell>
                    <TableCell className={`text-right tabular-nums ${Number(e.entrevistas_extra) > 0 ? "font-semibold text-amber-800" : ""}`}>{(Number(e.entrevistas_extra) || 0).toLocaleString("es-MX")}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatearPrecio(e.importe_estimado)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ul className="grid gap-3 md:hidden" aria-label="Salud por empresa">
            {filtradas.map((e) => (
              <li key={e.id_empresa} className="min-w-0 rounded-xl border bg-white p-4" data-tarjeta-empresa={e.id_empresa}>
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 font-semibold [overflow-wrap:anywhere]">{e.nombre_empresa}</p>
                  <Semaforo valor={e.semaforo} fallas={e.fallas_24h} />
                </div>
                <div className="mt-2 text-[13px] text-gray-700"><UltimaFalla falla={e.ultima_falla} ahora={ahora} /></div>
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[13px]">
                  <dt className="text-gray-500">Costo de IA del mes</dt><dd className="text-right tabular-nums">{formatoUsd(e.costo_mes_usd)}</dd>
                  <dt className="text-gray-500">Entrevistas / incluidas</dt><dd className="text-right tabular-nums">{textoEntrevistasAdmin(e)}</dd>
                  <dt className="text-gray-500">Extra</dt><dd className={`text-right tabular-nums ${Number(e.entrevistas_extra) > 0 ? "font-semibold text-amber-800" : ""}`}>{Number(e.entrevistas_extra) || 0}</dd>
                  <dt className="text-gray-500">Importe estimado</dt><dd className="text-right font-medium tabular-nums">{formatearPrecio(e.importe_estimado)}</dd>
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
