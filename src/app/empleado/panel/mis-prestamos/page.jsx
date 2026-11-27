"use client";

// Mi espacio → Mis préstamos (Nómina R2): el empleado pide un préstamo, firma su acuerdo y ve su saldo y abonos.
// El backend solo devuelve los suyos (/checador/nomina/mis-prestamos). RH o el dueño lo aprueba (D-9).
// (27/11/2026, aprobado por el dueño) Se pide «¿En cuántas quincenas?» (la palabra de su periodo de pago); el abono y el
// calendario los calcula el servidor mientras escribe (simular). Opción: «Prefiero poner cuánto por nómina».
// Letra de 17 px en celular y 16 px en escritorio, títulos en 700 y botones de 48 px.
import { useState } from "react";
import useSWR from "swr";
import axios from "@/lib/axios";
import { cardClass, DataState } from "@/components/empleado/shared";
import { firmaDigitalAdminApi } from "@/lib/firmaDigitalApi";
import { MOVIMIENTO, PRESTAMO, avancePrestamo, cuantos, dinero, elUltimo, palabraPeriodo, palabraSola } from "@/lib/nomina/nomina.mjs";
import { mensajeError } from "@/components/nomina/comun";
import { CAMPO, ETIQUETA, CalendarioPagos, CamposPlan, ResumenSimulacion, cuerpoPlan, useSimulacionPrestamo } from "@/components/nomina/PlanPrestamo";

const get = (url) => axios.get(url).then((r) => r.data);
const TONO = { ambar: "bg-amber-100 text-amber-800", azul: "bg-blue-100 text-blue-800", verde: "bg-green-100 text-green-800", gris: "bg-slate-100 text-slate-600", rojo: "bg-red-100 text-red-700" };
const VACIO = { monto: "", modo: "pagos", num_pagos: "", abono: "", motivo: "" };
const fecha = (v) => (v ? new Date(v).toLocaleDateString("es-MX", { timeZone: "America/Mexico_City", day: "2-digit", month: "short" }) : "");

export default function MisPrestamos() {
  const { data, error, isLoading, mutate } = useSWR("/checador/nomina/mis-prestamos", get);
  const [f, setF] = useState(VACIO);
  const [pedir, setPedir] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const prestamos = data?.prestamos ?? [];
  const abierto = prestamos.some((p) => ["solicitado", "por_firmar", "vigente"].includes(p.estado));
  const periodo = data?.periodo_pago ?? null;
  const plan = cuerpoPlan(f);
  const simulacion = useSimulacionPrestamo("/checador/nomina/mis-prestamos", pedir && plan ? plan : null);

  const enviar = async (e) => {
    e.preventDefault();
    setOcupado(true);
    setAviso(null);
    try {
      if (!plan) { setAviso({ ok: false, texto: f.modo === "abono" ? "Escribe cuánto necesitas y cuánto te pueden descontar." : "Escribe cuánto necesitas y en cuántos pagos (un número entero, 1 o más)." }); return; }
      const r = await axios.post("/checador/nomina/mis-prestamos", { ...plan, motivo: f.motivo });
      setPedir(false);
      setF(VACIO);
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
    <div className="space-y-5 text-[17px] text-[#111827] lg:text-[16px]">
      <h1 className="text-3xl font-bold tracking-tight">Mis préstamos</h1>
      {aviso ? <p role="status" className={`rounded-xl p-3 ${aviso.ok ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-900"}`}>{aviso.texto}</p> : null}

      {!abierto && !pedir ? (
        <button type="button" className="min-h-12 w-full rounded-xl bg-[#2C56E8] font-semibold text-white" onClick={() => setPedir(true)}>Pedir un préstamo</button>
      ) : null}

      {pedir ? (
        <form onSubmit={enviar} className={`${cardClass} grid gap-4`} aria-label="Pedir un préstamo" data-formulario-prestamo>
          <h2 className="m-0 text-[20px] font-bold">Pedir un préstamo</h2>
          <p className="m-0 text-[#4B5563]">Sin intereses. Si lo aprueban, firmas el acuerdo aquí y se descuenta de tu pago hasta terminar.</p>
          <label className={ETIQUETA}>¿Cuánto necesitas?<input className={CAMPO} type="number" inputMode="decimal" min="0.01" step="0.01" required value={f.monto} onChange={(e) => setF({ ...f, monto: e.target.value })} /></label>
          <CamposPlan valor={f} onCambio={(v) => setF({ ...f, ...v })} periodo={periodo} idBase="mi-prestamo"
            textos={{ pagos: periodo ? `¿En ${cuantos(periodo)} lo quieres pagar?` : "¿En cuántos pagos lo quieres pagar?", abono: `¿Cuánto te pueden descontar en cada ${palabraSola(periodo, 1)}?` }} />
          <ResumenSimulacion simulacion={simulacion} quien="empleado" onUsarPagos={(n) => setF({ ...f, modo: "pagos", num_pagos: String(n) })} />
          <label className={ETIQUETA}>¿Para qué lo necesitas?<input className={CAMPO} maxLength={300} required value={f.motivo} onChange={(e) => setF({ ...f, motivo: e.target.value })} /></label>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={ocupado} className="min-h-12 flex-1 rounded-xl bg-[#2C56E8] px-4 font-semibold text-white disabled:opacity-60">{ocupado ? "Enviando…" : "Enviar solicitud"}</button>
            <button type="button" className="min-h-12 rounded-xl border border-slate-300 px-4 font-semibold" onClick={() => { setPedir(false); setF(VACIO); }}>Cancelar</button>
          </div>
        </form>
      ) : null}

      <DataState loading={isLoading} error={error} retry={mutate}>
        {prestamos.length === 0 ? (
          <p className={`${cardClass} text-[#4B5563]`}>No tienes préstamos.</p>
        ) : (
          <ul className="space-y-3">
            {prestamos.map((p) => {
              const e = PRESTAMO[p.estado] ?? PRESTAMO.solicitado;
              const av = avancePrestamo(p, p.plan);
              const quedan = p.plan?.pagos_restantes;
              const porFirmar = p.estado === "por_firmar" && ["pendiente", "abierto"].includes(p.firma_estatus);
              return (
                <li key={p.id} className={cardClass}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="m-0 text-[#4B5563]">Préstamo de {dinero(p.monto)}</p>
                      <p className="m-0 mt-1 text-2xl font-bold tabular-nums text-[#1E40C4]">{dinero(p.saldo)}</p>
                      <p className="m-0 text-[#4B5563]">por pagar · {dinero(p.abono)} por {palabraSola(p.plan?.periodo_pago ?? periodo, 1)}</p>
                    </div>
                    <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[15px] font-semibold ${TONO[e.tono]}`} data-chico>{e.texto}</span>
                  </div>
                  {["vigente", "liquidado"].includes(p.estado) ? (
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={av.porcentaje} aria-valuemin={0} aria-valuemax={100} aria-label="Avance del pago">
                      <div className="h-full bg-blue-600" style={{ width: `${av.porcentaje}%` }} />
                    </div>
                  ) : null}
                  {["solicitado", "por_firmar", "vigente"].includes(p.estado) && quedan ? (
                    <div className="mt-3 grid gap-1">
                      <p className="m-0">{p.estado === "vigente" ? "Te faltan" : "Lo pagas en"} <b>{palabraPeriodo(p.plan.periodo_pago ?? periodo, quedan)}</b>
                        {p.plan.ultimo_restante != null && Math.round(p.plan.ultimo_restante * 100) !== Math.round(Number(p.abono) * 100) ? <> · {elUltimo(p.plan.periodo_pago ?? periodo)} de <b>{dinero(p.plan.ultimo_restante)}</b></> : null}.</p>
                      <CalendarioPagos calendario={p.calendario} />
                    </div>
                  ) : null}
                  {p.estado === "solicitado" ? <p className="m-0 mt-2 text-[#374151]">Recursos Humanos está revisando tu solicitud.</p> : null}
                  {p.estado === "por_firmar" ? <p className="m-0 mt-2 text-[#374151]">Ya lo aprobaron. Firma tu acuerdo para que te lo entreguen y empiece el descuento.</p> : null}
                  {p.motivo_cierre ? <p className="m-0 mt-2 text-[#374151]">{p.estado === "rechazado" ? "No se aprobó" : "Se canceló"}: {p.motivo_cierre}</p> : null}
                  {porFirmar ? (
                    <button type="button" disabled={ocupado} className="mt-3 min-h-12 rounded-xl bg-[#2C56E8] px-5 font-semibold text-white disabled:opacity-60" onClick={() => firmar(p)}>Firmar acuerdo</button>
                  ) : null}
                  {p.movimientos?.length ? (
                    <details className="mt-3">
                      <summary className="flex min-h-12 cursor-pointer items-center font-semibold text-[#374151]">Abonos ({p.movimientos.length})</summary>
                      <ul className="mt-2 divide-y">
                        {p.movimientos.map((m, i) => (
                          <li key={i} className="flex justify-between py-1.5">
                            <span>{MOVIMIENTO[m.tipo]} <span className="text-[#4B5563]">{fecha(m.creado_en)}</span></span>
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
