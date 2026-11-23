"use client";

// Mi espacio → Mis recibos de pago (Nómina R1, D-7): el empleado ve sus recibos de nóminas autorizadas, los
// descarga y los firma en línea. El backend solo devuelve los suyos (/checador/nomina/mis-recibos).
import { useState } from "react";
import useSWR from "swr";
import { FileText } from "lucide-react";
import axios from "@/lib/axios";
import { cardClass, DataState } from "@/components/empleado/shared";
import { firmaDigitalAdminApi } from "@/lib/firmaDigitalApi";
import { dinero, fechaCorta } from "@/lib/nomina/nomina.mjs";
import { descargar } from "@/components/nomina/comun";

const get = (url) => axios.get(url).then((r) => r.data);
const ESTADO_FIRMA = { firmado: ["Firmado", "bg-green-100 text-green-800"], pendiente: ["Por firmar", "bg-amber-100 text-amber-800"], abierto: ["Por firmar", "bg-amber-100 text-amber-800"] };

export default function MisRecibos() {
  const { data, error, isLoading, mutate } = useSWR("/checador/nomina/mis-recibos", get);
  const [ocupado, setOcupado] = useState(null);
  const [aviso, setAviso] = useState("");
  const recibos = data?.recibos ?? [];

  const firmar = async (r) => {
    setOcupado(r.id);
    setAviso("");
    try {
      const estado = await firmaDigitalAdminApi.obtenerEstadoDocumento({ idEmpresa: r.id_empresa, tipoDocumento: "RECIBO_NOMINA", referenciaId: r.id });
      const url = estado?.solicitud?.url_firma;
      if (url) window.location.href = url;
      else setAviso("Este recibo ya no tiene un enlace de firma vigente. Pide a Recursos Humanos que lo reenvíe.");
    } catch {
      setAviso("No pudimos abrir la firma. Intenta de nuevo.");
    } finally {
      setOcupado(null);
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold tracking-tight">Mis recibos de pago</h1>
      {aviso ? <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{aviso}</p> : null}
      <DataState loading={isLoading} error={error} retry={mutate}>
        {recibos.length === 0 ? (
          <p className={`${cardClass} text-sm text-slate-500`}>Aún no tienes recibos. Aparecerán aquí cuando tu empresa autorice la nómina.</p>
        ) : (
          <ul className="space-y-3">
            {recibos.map((r) => {
              const [texto, clase] = ESTADO_FIRMA[r.firma_estatus] ?? ["Sin firma", "bg-slate-100 text-slate-600"];
              return (
                <li key={r.id} className={cardClass}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">Del {fechaCorta(r.fecha_inicio)} al {fechaCorta(r.fecha_fin)}</p>
                      <p className="mt-1 text-2xl font-bold tabular-nums text-blue-700">{dinero(r.neto)}</p>
                      <p className="text-xs text-slate-500">Transferencia {dinero(r.transferencia)} · Efectivo {dinero(r.efectivo)}</p>
                    </div>
                    <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ${clase}`}>{texto}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" className="flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold" onClick={() => descargar(axios, `/checador/nomina/mis-recibos/${r.id}/pdf`, `recibo-${r.folio ?? r.id}.pdf`, true).catch(() => setAviso("No pudimos abrir el PDF."))}>
                      <FileText className="size-4" /> Ver recibo
                    </button>
                    {["pendiente", "abierto"].includes(r.firma_estatus) ? (
                      <button type="button" disabled={ocupado === r.id} className="min-h-11 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-60" onClick={() => firmar(r)}>
                        {ocupado === r.id ? "Abriendo…" : "Firmar"}
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </DataState>
      <p className="text-xs text-slate-500">Tus recibos de pago no son comprobantes fiscales (CFDI).</p>
    </div>
  );
}
