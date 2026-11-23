"use client";

// Mi espacio → Mis préstamos (Nómina R2): el empleado pide un préstamo, firma su acuerdo y ve su saldo y abonos.
// El backend solo devuelve los suyos (/checador/nomina/mis-prestamos). RH o el dueño lo aprueba (D-9).
import { useState } from "react";
import useSWR from "swr";
import axios from "@/lib/axios";
import { cardClass, DataState } from "@/components/empleado/shared";
import { firmaDigitalAdminApi } from "@/lib/firmaDigitalApi";
import { MOVIMIENTO, PRESTAMO, avancePrestamo, dinero } from "@/lib/nomina/nomina.mjs";
import { mensajeError } from "@/components/nomina/comun";

const get = (url) => axios.get(url).then((r) => r.data);
const TONO = { ambar: "bg-amber-100 text-amber-800", azul: "bg-blue-100 text-blue-800", verde: "bg-green-100 text-green-800", gris: "bg-slate-100 text-slate-600", rojo: "bg-red-100 text-red-700" };
const campo = "min-h-11 w-full rounded-xl border border-slate-300 px-3 text-base";
const fecha = (v) => (v ? new Date(v).toLocaleDateString("es-MX", { timeZone: "America/Mexico_City", day: "2-digit", month: "short" }) : "");

export default function MisPrestamos() {
  const { data, error, isLoading, mutate } = useSWR("/checador/nomina/mis-prestamos", get);
  const [f, setF] = useState({ monto: "", abono: "", motivo: "" });
  const [pedir, setPedir] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const prestamos = data?.prestamos ?? [];
  const abierto = prestamos.some((p) => ["solicitado", "por_firmar", "vigente"].includes(p.estado));
  const pagos = Number(f.monto) > 0 && Number(f.abono) > 0 ? Math.ceil(Number(f.monto) / Number(f.abono)) : null;

  const enviar = async (e) => {
    e.preventDefault();
    setOcupado(true);
    setAviso(null);
    try {
      const r = await axios.post("/checador/nomina/mis-prestamos", { monto: Number(f.monto), abono: Number(f.abono), motivo: f.motivo });
      setPedir(false);
      setF({ monto: "", abono: "", motivo: "" });
      setAviso({ ok: true, texto: `Listo, tu solicitud se envió a Recursos Humanos.${r.data.avisos?.length ? ` ${r.data.avisos.join(" ")}` : ""}` });
      mutate();
    } catch (err) {
      setAviso({ ok: false, texto: mensajeError(err, "No se pudo enviar tu solicitud.") });
    } finally {
      setOcupado(false);
    }
  };

  const firmar = async (p) => {
    setOcupado(true);
    setAviso(null);
    try {
      const estado = await firmaDigitalAdminApi.obtenerEstadoDocumento({ idEmpresa: p.id_empresa, tipoDocumento: "PRESTAMO_NOMINA", referenciaId: p.id });
      const url = estado?.solicitud?.url_firma;
      if (url) window.location.href = url;
      else setAviso({ ok: false, texto: "Tu acuerdo ya no tiene un enlace de firma vigente. Pide a Recursos Humanos que lo vuelva a generar." });
    } catch {
      setAviso({ ok: false, texto: "No pudimos abrir la firma. Intenta de nuevo." });
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold tracking-tight">Mis préstamos</h1>
      {aviso ? <p role="status" className={`rounded-xl p-3 text-sm ${aviso.ok ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-900"}`}>{aviso.texto}</p> : null}

      {!abierto && !pedir ? (
        <button type="button" className="min-h-12 w-full rounded-xl bg-blue-600 font-semibold text-white" onClick={() => setPedir(true)}>Pedir un préstamo</button>
      ) : null}

      {pedir ? (
        <form onSubmit={enviar} className={`${cardClass} space-y-3`}>
          <p className="font-semibold">Pedir un préstamo</p>
          <p className="text-sm text-slate-500">Sin intereses. Si lo aprueban, firmas el acuerdo aquí y se descuenta de cada nómina hasta terminar.</p>
          <label className="block text-sm font-medium">¿Cuánto necesitas?<input className={campo} type="number" inputMode="decimal" min="1" step="0.01" required value={f.monto} onChange={(e) => setF({ ...f, monto: e.target.value })} /></label>
          <label className="block text-sm font-medium">¿Cuánto te pueden descontar en cada nómina?<input className={campo} type="number" inputMode="decimal" min="1" step="0.01" required value={f.abono} onChange={(e) => setF({ ...f, abono: e.target.value })} /></label>
          {pagos ? <p className="text-sm text-slate-600">Lo terminarías de pagar en <b>{pagos} {pagos === 1 ? "nómina" : "nóminas"}</b>.</p> : null}
          <label className="block text-sm font-medium">¿Para qué lo necesitas?<input className={campo} maxLength={300} required value={f.motivo} onChange={(e) => setF({ ...f, motivo: e.target.value })} /></label>
          <div className="flex gap-2">
            <button type="submit" disabled={ocupado} className="min-h-11 flex-1 rounded-xl bg-blue-600 px-4 font-semibold text-white disabled:opacity-60">{ocupado ? "Enviando…" : "Enviar solicitud"}</button>
            <button type="button" className="min-h-11 rounded-xl border px-4 font-semibold" onClick={() => setPedir(false)}>Cancelar</button>
          </div>
        </form>
      ) : null}

      <DataState loading={isLoading} error={error} retry={mutate}>
        {prestamos.length === 0 ? (
          <p className={`${cardClass} text-sm text-slate-500`}>No tienes préstamos.</p>
        ) : (
          <ul className="space-y-3">
            {prestamos.map((p) => {
              const e = PRESTAMO[p.estado] ?? PRESTAMO.solicitado;
              const av = avancePrestamo(p);
              const porFirmar = p.estado === "por_firmar" && ["pendiente", "abierto"].includes(p.firma_estatus);
              return (
                <li key={p.id} className={cardClass}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-500">Préstamo de {dinero(p.monto)}</p>
                      <p className="mt-1 text-2xl font-bold tabular-nums text-blue-700">{dinero(p.saldo)}</p>
                      <p className="text-xs text-slate-500">por pagar · {dinero(p.abono)} por nómina</p>
                    </div>
                    <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ${TONO[e.tono]}`}>{e.texto}</span>
                  </div>
                  {["vigente", "liquidado"].includes(p.estado) ? (
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={av.porcentaje} aria-valuemin={0} aria-valuemax={100} aria-label="Avance del pago">
                      <div className="h-full bg-blue-600" style={{ width: `${av.porcentaje}%` }} />
                    </div>
                  ) : null}
                  {p.estado === "solicitado" ? <p className="mt-2 text-sm text-slate-600">Recursos Humanos está revisando tu solicitud.</p> : null}
                  {p.estado === "por_firmar" ? <p className="mt-2 text-sm text-slate-600">Ya lo aprobaron. Firma tu acuerdo para que te lo entreguen y empiece el descuento.</p> : null}
                  {p.motivo_cierre ? <p className="mt-2 text-sm text-slate-600">{p.estado === "rechazado" ? "No se aprobó" : "Se canceló"}: {p.motivo_cierre}</p> : null}
                  {porFirmar ? (
                    <button type="button" disabled={ocupado} className="mt-3 min-h-11 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-60" onClick={() => firmar(p)}>Firmar acuerdo</button>
                  ) : null}
                  {p.movimientos?.length ? (
                    <details className="mt-3 text-sm">
                      <summary className="cursor-pointer font-semibold text-slate-700">Abonos ({p.movimientos.length})</summary>
                      <ul className="mt-2 divide-y">
                        {p.movimientos.map((m, i) => (
                          <li key={i} className="flex justify-between py-1.5">
                            <span>{MOVIMIENTO[m.tipo]} <span className="text-slate-400">{fecha(m.creado_en)}</span></span>
                            <span className="tabular-nums">{m.tipo === "reverso" ? "+" : "−"}{dinero(m.importe)}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </DataState>
    </div>
  );
}
