"use client";

// Detalle de un préstamo (Nómina R2): saldo, avance, historial de abonos y las acciones según su estado.
// D-9: RH o el dueño aprueba; cancelar uno vigente con saldo solo el dueño. El backend vuelve a validar todo.
// (27/11/2026) Plan «6 quincenas de $833.33 · la última de $833.35» y calendario «Primer descuento · Último» (del
// servidor); al aprobar se ajusta en cuántos pagos (o el abono, como opción). Letra de 17/16 px y botones de 48 px.
import { NombreEmpleado } from "@/components/empleado/FichaEmpleado";
import { useEffect, useState } from "react";
import useSWR from "swr";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MOVIMIENTO, PRESTAMO, abonoPor, avancePrestamo, dinero, fechaCorta, palabraPeriodo, resumenPlan } from "@/lib/nomina/nomina.mjs";
import { Chip, mensajeError } from "./comun";
import { CAMPO, ETIQUETA, CalendarioPagos, CamposPlan, ResumenSimulacion, cuerpoPlan, useSimulacionPrestamo } from "./PlanPrestamo";
import { EncabezadoDetalle } from "@/components/detalle";

const get = (url) => axios.get(url).then((r) => r.data);
const campo = CAMPO;
const BOTON = "min-h-12 px-5 text-[17px] lg:text-[16px]";
const fechaHora = (v) => (v ? new Date(v).toLocaleDateString("es-MX", { timeZone: "America/Mexico_City", day: "2-digit", month: "short", year: "numeric" }) : "—");
const FIRMA = { pendiente: "Esperando su firma en Mi espacio", abierto: "Abrió el acuerdo, falta que firme", firmado: "Firmado", expirado: "El enlace venció", cancelado: "La firma se canceló" };

function Dato({ titulo, valor, clase = "" }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <p className="m-0 text-[15px] font-semibold uppercase tracking-wide text-[#4B5563]" data-chico>{titulo}</p>
      <p className={`m-0 text-[19px] font-bold tabular-nums text-[#111827] ${clase}`}>{valor}</p>
    </div>
  );
}

export default function DetallePrestamo({ id, onCerrar, onCambio = () => {}, pagina = false }) {
  const { data, error, mutate } = useSWR(id ? `/checador/nomina/prestamos/${id}` : null, get);
  const [accion, setAccion] = useState(null);
  const [f, setF] = useState({});
  const [aviso, setAviso] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const p = data?.prestamo;
  useEffect(() => { setAccion(null); setAviso(null); }, [id]);

  const abrir = (a) => {
    setAviso(null);
    setAccion(a);
    setF(a === "aprobar" ? { monto: String(Number(p.monto)), modo: "pagos", num_pagos: String(data.plan?.num_pagos ?? ""), abono: String(Number(p.abono)) } : {});
  };
  // Al aprobar se ve el plan nuevo mientras se ajusta (simular con la persona del préstamo).
  const planAprobar = accion === "aprobar" ? cuerpoPlan(f) : null;
  const simulacion = useSimulacionPrestamo("/checador/nomina/prestamos", planAprobar && p ? { id_empleado: p.id_empleado, ...planAprobar } : null);

  const enviar = async (ruta, cuerpo, exito) => {
    setOcupado(true);
    setAviso(null);
    try {
      const r = await axios.post(`/checador/nomina/prestamos/${p.id}/${ruta}`, { version: p.version, ...cuerpo });
      setAccion(null);
      setAviso(r.data?.aviso_acuerdo ? { tono: "ambar", texto: r.data.aviso_acuerdo } : { tono: "verde", texto: exito });
      await mutate();
      onCambio();
    } catch (e) {
      setAviso({ tono: "rojo", texto: mensajeError(e) });
    } finally {
      setOcupado(false);
    }
  };

  const plan = data?.plan ?? null;
  const av = p ? avancePrestamo(p, plan) : null;
  const periodo = plan?.periodo_pago ?? null;
  const est = p ? PRESTAMO[p.estado] ?? PRESTAMO.solicitado : null;
  const sinFirmaActiva = p?.estado === "por_firmar" && !["pendiente", "abierto", "firmado"].includes(p.firma_estatus);
  const puedeCancelar = p && (["solicitado", "por_firmar"].includes(p.estado) || (p.estado === "vigente" && data.puede_cancelar_vigente));

  const titulo = p ? <span className="flex flex-wrap items-center gap-2"><NombreEmpleado id={p.id_empleado}>{p.empleado}</NombreEmpleado> <Chip tono={est.tono}>{est.texto}</Chip></span> : "Préstamo";
  // En la página: encabezado de las vistas de detalle (letra 17/16 px, título 700, pastilla de estado).
  const TONO_DETALLE = { ambar: "aviso", azul: "info", verde: "exito", gris: "neutro", rojo: "error" };
  const iniciales = (p?.empleado ?? "").split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join("").toUpperCase() || "P";
  const origen = p ? `${p.origen === "empleado" ? "lo pidió desde Mi espacio" : `registrado por ${p.solicitado_por_nombre ?? "RH"}`} el ${fechaHora(p.creado_en)}` : "";
  const descripcion = p ? `Préstamo P-${p.id} · ${origen}` : "Cargando…";
  const contenido = (
    <>
        {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-[17px] text-red-700 lg:text-[16px]">{mensajeError(error, "No se pudo cargar el préstamo.")}</p> : null}
        {p ? (
          <div className="grid gap-4 text-[17px] text-[#111827] lg:text-[16px]">
            <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:grid-cols-4">
              <Dato titulo="Prestado" valor={dinero(p.monto)} />
              <Dato titulo={abonoPor(periodo)} valor={dinero(p.abono)} />
              <Dato titulo="Saldo" valor={dinero(p.saldo)} clase={Number(p.saldo) > 0 ? "text-[#1E40C4]" : ""} />
              <Dato titulo="Pagos restantes" valor={av.pagosRestantes != null ? (periodo ? palabraPeriodo(periodo, av.pagosRestantes) : av.pagosRestantes) : "—"} />
            </div>
            {plan?.num_pagos ? (
              <div className="grid gap-1.5 rounded-xl bg-[#EEF2FF] px-4 py-3 text-[#1E3A8A]" data-plan-detalle>
                <p className="m-0">Acordado en <b>{resumenPlan(plan)}</b>{plan.num_pagos_calculado ? <span className="text-[#374151]"> (calculado con el abono)</span> : null}.</p>
                {p.estado === "vigente" && plan.pagos_restantes > 1 && plan.ultimo_restante != null && Math.round(plan.ultimo_restante * 100) !== Math.round(Number(p.abono) * 100)
                  ? <p className="m-0">El último descuento será de <b>{dinero(plan.ultimo_restante)}</b>{plan.ultimo_restante > Number(p.abono) ? " para cuadrar los centavos" : ", lo que falta del saldo"}.</p> : null}
                <CalendarioPagos calendario={data.calendario} pasado={p.estado === "liquidado"} />
              </div>
            ) : null}
            <div>
              <div className="flex justify-between text-[#374151]"><span>Pagado {dinero(av.pagado)}</span><span>{av.porcentaje} %</span></div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-valuenow={av.porcentaje} aria-valuemin={0} aria-valuemax={100} aria-label="Avance del pago">
                <div className="h-full rounded-full bg-[#2c56e8]" style={{ width: `${av.porcentaje}%` }} />
              </div>
            </div>
            {p.motivo ? <p><span className="text-gray-500">Motivo:</span> {p.motivo}</p> : null}
            {p.estado === "por_firmar" ? <p className="rounded-lg bg-blue-50 p-3 text-blue-950"><b>Acuerdo:</b> {FIRMA[p.firma_estatus] ?? "Sin enviar"}. No se descuenta nada hasta que firme.</p> : null}
            {p.motivo_cierre ? <p className="rounded-lg bg-gray-50 p-3"><b>{p.estado === "rechazado" ? "Rechazado" : "Cancelado"}</b> por {p.cerrado_por_nombre}: {p.motivo_cierre}</p> : null}
            {data.avisos?.length && ["solicitado", "por_firmar"].includes(p.estado) ? data.avisos.map((a) => <p key={a} className="rounded-lg bg-amber-50 p-3 text-amber-900">{a}</p>) : null}

            {aviso ? <p role="status" className={`rounded-lg p-3 ${aviso.tono === "rojo" ? "bg-red-50 text-red-700" : aviso.tono === "ambar" ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-800"}`}>{aviso.texto}</p> : null}

            {!accion ? (
              <div className="flex flex-wrap gap-2">
                {p.estado === "solicitado" ? <><Button className={BOTON} onClick={() => abrir("aprobar")}>Aprobar</Button><Button className={BOTON} variant="outline" onClick={() => abrir("rechazar")}>Rechazar</Button></> : null}
                {sinFirmaActiva ? <Button className={BOTON} disabled={ocupado} onClick={() => enviar("aprobar", {}, "Acuerdo enviado para firma.")}>Generar acuerdo</Button> : null}
                {p.estado === "vigente" ? <Button className={BOTON} onClick={() => abrir("abono")}>Registrar abono en efectivo</Button> : null}
                {puedeCancelar ? <Button className={`${BOTON} text-red-700`} variant="outline" onClick={() => abrir("cancelar")}>Cancelar préstamo</Button> : null}
              </div>
            ) : (
              <form
                className="grid gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (accion === "aprobar") {
                    if (!planAprobar) { setAviso({ tono: "rojo", texto: f.modo === "abono" ? "Escribe el monto y el abono." : "Escribe el monto y en cuántos pagos (un número entero, 1 o más)." }); return; }
                    enviar("aprobar", planAprobar, "Aprobado. Se envió el acuerdo para que lo firme en Mi espacio.");
                  }
                  if (accion === "rechazar") enviar("rechazar", { motivo: f.motivo }, "Solicitud rechazada.");
                  if (accion === "cancelar") enviar("cancelar", { motivo: f.motivo }, "Préstamo cancelado.");
                  if (accion === "abono") enviar("abono", { importe: Number(f.importe), nota: f.nota }, "Abono registrado.");
                }}
              >
                {accion === "aprobar" ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className={ETIQUETA}>Monto<input className={campo} type="number" min="0.01" step="0.01" required value={f.monto} onChange={(e) => setF({ ...f, monto: e.target.value })} /></label>
                      <CamposPlan valor={f} onCambio={(v) => setF({ ...f, ...v })} periodo={periodo} idBase="aprobar-prestamo" />
                    </div>
                    <ResumenSimulacion simulacion={simulacion} onUsarPagos={(n) => setF({ ...f, modo: "pagos", num_pagos: String(n) })} />
                  </>
                ) : null}
                {accion === "abono" ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className={ETIQUETA}>Importe<input className={campo} type="number" min="0.01" max={p.saldo} step="0.01" required value={f.importe ?? ""} onChange={(e) => setF({ ...f, importe: e.target.value })} /></label>
                    <label className={ETIQUETA}>Nota (opcional)<input className={campo} maxLength={200} value={f.nota ?? ""} onChange={(e) => setF({ ...f, nota: e.target.value })} /></label>
                  </div>
                ) : null}
                {["rechazar", "cancelar"].includes(accion) ? (
                  <label className={ETIQUETA}>
                    Motivo
                    <input className={campo} required maxLength={300} value={f.motivo ?? ""} onChange={(e) => setF({ ...f, motivo: e.target.value })} />
                    {accion === "cancelar" && p.estado === "vigente" ? <span className="font-normal text-[#9A3412]">El saldo de {dinero(p.saldo)} ya no se cobrará.</span> : null}
                  </label>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button className={BOTON} type="submit" disabled={ocupado} variant={["rechazar", "cancelar"].includes(accion) ? "destructive" : "default"}>
                    {ocupado ? "Guardando…" : { aprobar: "Aprobar y enviar acuerdo", rechazar: "Rechazar", cancelar: "Cancelar préstamo", abono: "Registrar abono" }[accion]}
                  </Button>
                  <Button className={BOTON} type="button" variant="outline" onClick={() => setAccion(null)}>Volver</Button>
                </div>
              </form>
            )}

            <section aria-label="Historial de abonos">
              <h3 className="mb-1.5 text-[18px] font-bold text-[#111827]">Historial</h3>
              {data.movimientos.length === 0 ? (
                <p className="text-[#4B5563]">Aún no hay abonos.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full min-w-[620px] tabular-nums">
                    <thead><tr className="bg-gray-50 text-left text-[15px] text-[#374151]">{["Fecha", "Movimiento", "Importe", "Saldo", "Detalle"].map((h) => <th key={h} className="px-2.5 py-2 font-semibold" data-chico>{h}</th>)}</tr></thead>
                    <tbody>
                      {data.movimientos.map((m) => (
                        <tr key={m.id} className="border-t border-gray-100">
                          <td className="whitespace-nowrap px-2.5 py-1.5">{fechaHora(m.creado_en)}</td>
                          <td className="px-2.5 py-1.5">{MOVIMIENTO[m.tipo] ?? m.tipo}</td>
                          <td className={`whitespace-nowrap px-2.5 py-1.5 font-semibold ${m.tipo === "reverso" ? "text-amber-700" : "text-emerald-700"}`}>{m.tipo === "reverso" ? "+" : "−"}{dinero(m.importe)}</td>
                          <td className="px-2.5 py-1.5">{dinero(m.saldo_despues)}</td>
                          <td className="px-2.5 py-1.5 text-[#4B5563]">{m.periodo_inicio ? `Nómina ${fechaCorta(m.periodo_inicio)} – ${fechaCorta(m.periodo_fin)}` : m.nota ?? ""}{m.registrado_por_nombre ? ` · ${m.registrado_por_nombre}` : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        ) : null}
    </>
  );

  // En el módulo Nómina el detalle es una página (clic en el renglón); la ventana queda para otros usos.
  if (pagina) {
    return (
      <div className="space-y-5 p-1">
        <EncabezadoDetalle volver={{ href: "/panel/nomina/prestamos", texto: "Préstamos" }} iniciales={iniciales} etiqueta={p ? `Préstamo P-${p.id}` : "Préstamo"}
          titulo={p?.empleado ?? "Préstamo"} subtitulo={<p className="m-0">{p ? origen.charAt(0).toUpperCase() + origen.slice(1) : "Cargando…"}{p ? <> · <NombreEmpleado id={p.id_empleado}>Ver ficha</NombreEmpleado></> : null}</p>}
          estado={est ? { texto: est.texto, tono: TONO_DETALLE[est.tono] ?? "neutro" } : null} />
        <div className="max-w-3xl rounded-xl border border-slate-200 bg-white p-4 sm:p-5">{contenido}</div>
      </div>
    );
  }
  return (
    <Dialog open={Boolean(id)} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>
        {contenido}
      </DialogContent>
    </Dialog>
  );
}
