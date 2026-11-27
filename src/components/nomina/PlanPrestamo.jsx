"use client";

// (27/11/2026) Préstamos «¿En cuántos pagos?»: piezas compartidas por Registrar préstamo (RH), el detalle y Mis
// préstamos. El plan (pagos, abono, último pago), el calendario y los avisos los calcula el servidor (simular); aquí solo
// se ponen en palabras (src/lib/nomina/nomina.mjs). Letra de 17 px en celular y 16 px en escritorio, botones de 48 px.
import { useEffect, useState } from "react";
import axios from "@/lib/axios";
import { palabraPeriodo, palabraSola, resumenPlan, textoCalendario } from "@/lib/nomina/nomina.mjs";
import { mensajeError } from "./comun";

export const CAMPO = "block min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-[17px] text-[#111827] lg:text-[16px] focus:border-brand focus:outline-none focus:ring-2 focus:ring-[#2C56E8]/30";
export const ETIQUETA = "grid content-start gap-1.5 text-[17px] font-semibold text-[#111827] lg:text-[16px]";

/** Entero ≥ 1 escrito en el campo «¿En cuántos pagos?» (o null). */
export const pagosValidos = (v) => (/^\d+$/.test(String(v ?? "").trim()) && Number(v) >= 1 ? Number(v) : null);

/**
 * Pide al servidor el plan mientras se escribe (350 ms después de la última tecla). cuerpo null = nada que simular.
 * Devuelve { info, error, cargando } con info = { plan, calendario, avisos, pagos_minimos, tope_periodo }.
 */
export function useSimulacionPrestamo(url, cuerpo) {
  const clave = cuerpo ? JSON.stringify(cuerpo) : null;
  const [estado, setEstado] = useState({ info: null, error: "", cargando: false, clave: null });
  useEffect(() => {
    if (!clave) { setEstado({ info: null, error: "", cargando: false, clave: null }); return undefined; }
    let vigente = true;
    setEstado((e) => ({ ...e, cargando: true }));
    const t = setTimeout(() => {
      axios.post(url, { ...JSON.parse(clave), simular: true })
        .then((r) => { if (vigente) setEstado({ info: r.data, error: "", cargando: false, clave }); })
        .catch((e) => { if (vigente) setEstado({ info: null, error: mensajeError(e, "No se pudo calcular el plan de pagos."), cargando: false, clave }); });
    }, 350);
    return () => { vigente = false; clearTimeout(t); };
  }, [url, clave]);
  return estado;
}

/** «Primer descuento: … · Último: …» (y «aproximado» si la empresa aún no tiene nóminas de esa periodicidad). */
export function CalendarioPagos({ calendario, pasado = false }) {
  const c = textoCalendario(calendario);
  if (!c) return null;
  return (
    <p className="m-0 text-[17px] text-[#111827] lg:text-[16px]" data-calendario>
      {c.mismo ? <>{pasado ? "Descuento" : "Único descuento"}: <b>{c.primero}</b></> : <>Primer descuento: <b>{c.primero}</b> · Último: <b>{c.ultimo}</b></>}
      {c.aproximado ? <span className="text-[#4B5563]"> (aproximado: todavía no hay nóminas de esta periodicidad, se estimó con el calendario)</span> : null}
    </p>
  );
}

/**
 * Resumen del plan antes de guardar: «Se paga en 6 quincenas de $833.33 · la última de $833.35», el calendario, el
 * recordatorio del tope y los avisos de la ley. Si el abono pasa del tope, botón «Usar N quincenas».
 */
export function ResumenSimulacion({ simulacion, onUsarPagos = null, quien = "rh" }) {
  const { info, error, cargando } = simulacion;
  if (error) return <p role="alert" className="m-0 rounded-xl bg-[#FFF7ED] px-3 py-2.5 text-[17px] text-[#9A3412] lg:text-[16px]">{error}</p>;
  if (!info?.plan) return cargando ? <p role="status" className="m-0 text-[17px] text-[#4B5563] lg:text-[16px]">Calculando el plan de pagos…</p> : null;
  const { plan } = info;
  const periodo = plan.periodo_pago;
  return (
    <div className="grid gap-2 rounded-xl bg-[#EEF2FF] px-4 py-3 text-[17px] text-[#1E3A8A] lg:text-[16px]" aria-live="polite" data-plan>
      <p className="m-0">{quien === "empleado" ? "Lo pagarías en" : "Se paga en"} <b>{resumenPlan(plan)}</b>.</p>
      <CalendarioPagos calendario={info.calendario} />
      <p className="m-0 text-[#374151]">Sin intereses. Por ley, cada descuento no pasa del 30 % de lo que {quien === "empleado" ? "ganas" : "gana"} arriba del salario mínimo.</p>
      {info.avisos?.map((a) => <p key={a} className="m-0 font-semibold text-[#9A3412]" data-aviso>{a}</p>)}
      {onUsarPagos && info.pagos_minimos && info.pagos_minimos > plan.num_pagos ? (
        <button type="button" onClick={() => onUsarPagos(info.pagos_minimos)}
          className="min-h-12 w-fit rounded-xl border border-[#2C56E8] bg-white px-4 font-semibold text-[#1E40C4] hover:bg-[#F3F5FA]">
          Usar {palabraPeriodo(periodo, info.pagos_minimos)}
        </button>
      ) : null}
    </div>
  );
}

/**
 * Los dos campos del plan: «¿En cuántos pagos?» (principal, con la palabra del periodo al lado) o, como opción,
 * «Prefiero poner cuánto por nómina» (el abono; el número de pagos se calcula). valor = { modo, num_pagos, abono }.
 */
export function CamposPlan({ valor, onCambio, periodo = null, idBase = "prestamo", textos = {} }) {
  const n = pagosValidos(valor.num_pagos);
  if (valor.modo === "abono") {
    return (
      <div className="grid content-start gap-2">
        <label className={ETIQUETA} htmlFor={`${idBase}-abono`}>
          {textos.abono ?? `Abono por ${palabraSola(periodo, 1)}`}
          <input id={`${idBase}-abono`} className={CAMPO} type="number" inputMode="decimal" min="0.01" step="0.01" required
            value={valor.abono} onChange={(e) => onCambio({ ...valor, abono: e.target.value })} />
        </label>
        <button type="button" className="min-h-12 w-fit rounded-xl px-1 text-left font-semibold text-[#1E40C4] underline underline-offset-4" onClick={() => onCambio({ ...valor, modo: "pagos" })}>
          Prefiero decir en cuántos pagos
        </button>
      </div>
    );
  }
  return (
    <div className="grid content-start gap-2">
      <label className={ETIQUETA} htmlFor={`${idBase}-pagos`}>{textos.pagos ?? "¿En cuántos pagos?"}</label>
      <div className="flex items-center gap-3">
        <input id={`${idBase}-pagos`} className={`${CAMPO} max-w-[9rem]`} type="number" inputMode="numeric" min="1" step="1" required
          value={valor.num_pagos} onChange={(e) => onCambio({ ...valor, num_pagos: e.target.value })} aria-describedby={`${idBase}-pagos-ayuda`} />
        <span className="font-semibold text-[#111827]" id={`${idBase}-pagos-ayuda`}>{periodo ? palabraSola(periodo, n ?? 2) : "pagos"}</span>
      </div>
      <button type="button" className="min-h-12 w-fit rounded-xl px-1 text-left font-semibold text-[#1E40C4] underline underline-offset-4" onClick={() => onCambio({ ...valor, modo: "abono" })}>
        {textos.cambiar ?? "Prefiero poner cuánto por nómina"}
      </button>
    </div>
  );
}

/** Cuerpo para el servidor según el modo (num_pagos o abono). null si falta algo. */
export function cuerpoPlan({ monto, modo, num_pagos, abono }) {
  const m = Number(monto);
  if (!(m > 0)) return null;
  if (modo === "abono") return Number(abono) > 0 ? { monto: m, abono: Number(abono) } : null;
  const n = pagosValidos(num_pagos);
  return n ? { monto: m, num_pagos: n } : null;
}
