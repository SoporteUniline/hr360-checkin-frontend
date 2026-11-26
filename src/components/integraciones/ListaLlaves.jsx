"use client";
// Ajustes → Integraciones: tarjetas de las llaves (prefijo, permisos, estado, último uso) y bitácora reciente.
// Tarjetas apiladas (sin tabla): no hay scroll horizontal en el teléfono.
import { Ban, Clock, KeyRound } from "lucide-react";
import { estadoLlave, fechaCorta, nombrePermiso, prefijoVisible, textoUltimoUso, tonoHttp } from "@/lib/integraciones/integraciones.mjs";

const TONOS = {
  verde: "border-emerald-200 bg-emerald-50 text-emerald-800",
  ambar: "border-amber-200 bg-amber-50 text-amber-900",
  gris: "border-slate-200 bg-slate-100 text-slate-600",
  rojo: "border-red-200 bg-red-50 text-red-800",
};
const Etiqueta = ({ tono, children }) => (
  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[13px] font-semibold ${TONOS[tono] ?? TONOS.gris}`}>{children}</span>
);

export function ListaLlaves({ llaves, alRevocar }) {
  if (!llaves.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
        <KeyRound className="mx-auto size-6 text-slate-400" aria-hidden="true" />
        <p className="mt-2 text-sm font-semibold text-slate-800">Todavía no hay llaves</p>
        <p className="mt-1 text-[13px] text-slate-600">Crea una para conectar tu sistema de nómina, ERP o control de acceso.</p>
      </div>
    );
  }
  return (
    <ul className="grid gap-2" aria-label="Llaves de API">
      {llaves.map((l) => {
        const estado = estadoLlave(l.estado);
        return (
          <li key={l.id} data-llave={l.prefijo} className={`flex min-w-0 flex-col gap-3 rounded-2xl border bg-white p-4 sm:flex-row sm:items-start sm:justify-between ${l.estado === "activa" ? "border-slate-200" : "border-slate-200 bg-slate-50/70"}`}>
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="break-words text-[15px] font-bold text-slate-900">{l.nombre}</h3>
                <Etiqueta tono={estado.tono}>{estado.texto}</Etiqueta>
              </div>
              <code className="block break-all font-mono text-[13px] text-slate-700">{prefijoVisible(l.prefijo)}</code>
              <div className="flex flex-wrap gap-1.5">
                {l.permisos.map((p) => <Etiqueta key={p} tono="gris">{nombrePermiso(p)}</Etiqueta>)}
              </div>
              <dl className="grid gap-x-4 gap-y-0.5 text-[13px] text-slate-600 sm:grid-cols-2">
                <div className="min-w-0"><dt className="inline font-medium text-slate-500">Último uso: </dt><dd className="inline break-words">{textoUltimoUso(l)}</dd></div>
                <div className="min-w-0"><dt className="inline font-medium text-slate-500">Creada: </dt><dd className="inline">{fechaCorta(l.creada_en)}{l.creada_por ? ` · ${l.creada_por}` : ""}</dd></div>
                <div className="min-w-0"><dt className="inline font-medium text-slate-500">Vence: </dt><dd className="inline">{l.expira_en ? fechaCorta(l.expira_en) : "Sin vencimiento"}</dd></div>
                {l.revocada_en ? <div className="min-w-0"><dt className="inline font-medium text-slate-500">Revocada: </dt><dd className="inline">{fechaCorta(l.revocada_en)}</dd></div> : null}
              </dl>
            </div>
            {l.estado !== "revocada" ? (
              <button type="button" onClick={() => alRevocar(l)} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 hover:bg-red-50">
                <Ban className="size-4" aria-hidden="true" />Revocar
              </button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function Bitacora({ filas, cargando }) {
  if (cargando) return <p role="status" className="text-[13px] text-slate-500">Cargando bitácora…</p>;
  if (!filas.length) return <p className="rounded-xl border border-slate-200 bg-white p-4 text-[13px] text-slate-600">Aún no hay peticiones con tus llaves.</p>;
  return (
    <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white" aria-label="Uso reciente de la API">
      {filas.map((f) => (
        <li key={f.id} className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-[13px]">
          <span className="w-14 shrink-0 font-mono font-semibold text-slate-800">{f.metodo}</span>
          <code className="min-w-0 flex-1 break-all font-mono text-slate-700">{f.ruta.replace(/^\/api\/integracion\/v1/, "")}</code>
          <span className={`rounded-full border px-2 py-0.5 text-[13px] font-semibold ${TONOS[tonoHttp(f.estado)]}`}>{f.estado}</span>
          <span className="inline-flex items-center gap-1 text-slate-500"><Clock className="size-3.5" aria-hidden="true" />{fechaCorta(f.creado_en)}</span>
          <span className="w-full text-[13px] text-slate-500 sm:w-auto">{f.ms} ms · {f.llave ?? "—"} ({prefijoVisible(f.prefijo)}){f.ip ? ` · ${f.ip}` : ""}</span>
        </li>
      ))}
    </ul>
  );
}
