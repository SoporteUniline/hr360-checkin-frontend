"use client";

// Detalle de un préstamo (Nómina R2): saldo, avance, historial de abonos y las acciones según su estado.
// D-9: RH o el dueño aprueba; cancelar uno vigente con saldo solo el dueño. El backend vuelve a validar todo.
import { NombreEmpleado } from "@/components/empleado/FichaEmpleado";
import { useEffect, useState } from "react";
import useSWR from "swr";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MOVIMIENTO, PRESTAMO, avancePrestamo, dinero, fechaCorta } from "@/lib/nomina/nomina.mjs";
import { Chip, mensajeError } from "./comun";

const get = (url) => axios.get(url).then((r) => r.data);
const campo = "h-10 rounded-lg border border-gray-300 px-2.5 text-sm";
const fechaHora = (v) => (v ? new Date(v).toLocaleDateString("es-MX", { timeZone: "America/Mexico_City", day: "2-digit", month: "short", year: "numeric" }) : "—");
const FIRMA = { pendiente: "Esperando su firma en Mi espacio", abierto: "Abrió el acuerdo, falta que firme", firmado: "Firmado", expirado: "El enlace venció", cancelado: "La firma se canceló" };

function Dato({ titulo, valor, clase = "" }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-2.5">
      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-gray-500">{titulo}</p>
      <p className={`text-base font-extrabold tabular-nums text-gray-900 ${clase}`}>{valor}</p>
    </div>
  );
}

export default function DetallePrestamo({ id, onCerrar, onCambio }) {
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
    setF(a === "aprobar" ? { monto: p.monto, abono: p.abono } : {});
  };

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

  const av = p ? avancePrestamo(p) : null;
  const est = p ? PRESTAMO[p.estado] ?? PRESTAMO.solicitado : null;
  const sinFirmaActiva = p?.estado === "por_firmar" && !["pendiente", "abierto", "firmado"].includes(p.firma_estatus);
  const puedeCancelar = p && (["solicitado", "por_firmar"].includes(p.estado) || (p.estado === "vigente" && data.puede_cancelar_vigente));

  return (
    <Dialog open={Boolean(id)} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">{p ? <><NombreEmpleado id={p.id_empleado}>{p.empleado}</NombreEmpleado> <Chip tono={est.tono}>{est.texto}</Chip></> : "Préstamo"}</DialogTitle>
          <DialogDescription>{p ? `Préstamo P-${p.id} · ${p.origen === "empleado" ? "lo pidió desde Mi espacio" : `registrado por ${p.solicitado_por_nombre ?? "RH"}`} el ${fechaHora(p.creado_en)}` : "Cargando…"}</DialogDescription>
        </DialogHeader>
        {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{mensajeError(error, "No se pudo cargar el préstamo.")}</p> : null}
        {p ? (
          <div className="grid gap-4 text-[13px]">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Dato titulo="Prestado" valor={dinero(p.monto)} />
              <Dato titulo="Abono por nómina" valor={dinero(p.abono)} />
              <Dato titulo="Saldo" valor={dinero(p.saldo)} clase={Number(p.saldo) > 0 ? "text-[#2c56e8]" : ""} />
              <Dato titulo="Pagos restantes" valor={av.pagosRestantes ?? "—"} />
            </div>
            <div>
              <div className="flex justify-between text-[12px] text-gray-500"><span>Pagado {dinero(av.pagado)}</span><span>{av.porcentaje} %</span></div>
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
                {p.estado === "solicitado" ? <><Button size="sm" onClick={() => abrir("aprobar")}>Aprobar</Button><Button size="sm" variant="outline" onClick={() => abrir("rechazar")}>Rechazar</Button></> : null}
                {sinFirmaActiva ? <Button size="sm" disabled={ocupado} onClick={() => enviar("aprobar", {}, "Acuerdo enviado para firma.")}>Generar acuerdo</Button> : null}
                {p.estado === "vigente" ? <Button size="sm" onClick={() => abrir("abono")}>Registrar abono en efectivo</Button> : null}
                {puedeCancelar ? <Button size="sm" variant="outline" className="text-red-700" onClick={() => abrir("cancelar")}>Cancelar préstamo</Button> : null}
              </div>
            ) : (
              <form
                className="grid gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (accion === "aprobar") enviar("aprobar", { monto: Number(f.monto), abono: Number(f.abono) }, "Aprobado. Se envió el acuerdo para que lo firme en Mi espacio.");
                  if (accion === "rechazar") enviar("rechazar", { motivo: f.motivo }, "Solicitud rechazada.");
                  if (accion === "cancelar") enviar("cancelar", { motivo: f.motivo }, "Préstamo cancelado.");
                  if (accion === "abono") enviar("abono", { importe: Number(f.importe), nota: f.nota }, "Abono registrado.");
                }}
              >
                {accion === "aprobar" ? (
                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1 font-medium">Monto<input className={campo} type="number" min="1" step="0.01" required value={f.monto} onChange={(e) => setF({ ...f, monto: e.target.value })} /></label>
                    <label className="grid gap-1 font-medium">Abono por nómina<input className={campo} type="number" min="1" step="0.01" required value={f.abono} onChange={(e) => setF({ ...f, abono: e.target.value })} /></label>
                  </div>
                ) : null}
                {accion === "abono" ? (
                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1 font-medium">Importe<input className={campo} type="number" min="0.01" max={p.saldo} step="0.01" required value={f.importe ?? ""} onChange={(e) => setF({ ...f, importe: e.target.value })} /></label>
                    <label className="grid gap-1 font-medium">Nota (opcional)<input className={campo} maxLength={200} value={f.nota ?? ""} onChange={(e) => setF({ ...f, nota: e.target.value })} /></label>
                  </div>
                ) : null}
                {["rechazar", "cancelar"].includes(accion) ? (
                  <label className="grid gap-1 font-medium">
                    Motivo
                    <input className={campo} required maxLength={300} value={f.motivo ?? ""} onChange={(e) => setF({ ...f, motivo: e.target.value })} />
                    {accion === "cancelar" && p.estado === "vigente" ? <span className="text-[12px] font-normal text-amber-800">El saldo de {dinero(p.saldo)} ya no se cobrará.</span> : null}
                  </label>
                ) : null}
                <div className="flex gap-2">
                  <Button size="sm" type="submit" disabled={ocupado} variant={["rechazar", "cancelar"].includes(accion) ? "destructive" : "default"}>
                    {ocupado ? "Guardando…" : { aprobar: "Aprobar y enviar acuerdo", rechazar: "Rechazar", cancelar: "Cancelar préstamo", abono: "Registrar abono" }[accion]}
                  </Button>
                  <Button size="sm" type="button" variant="outline" onClick={() => setAccion(null)}>Volver</Button>
                </div>
              </form>
            )}

            <section aria-label="Historial de abonos">
              <h3 className="mb-1.5 text-[12px] font-bold uppercase tracking-wide text-gray-500">Historial</h3>
              {data.movimientos.length === 0 ? (
                <p className="text-gray-500">Aún no hay abonos.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full min-w-[520px] tabular-nums">
                    <thead><tr className="bg-gray-50 text-left text-[10px] uppercase tracking-wide text-gray-500">{["Fecha", "Movimiento", "Importe", "Saldo", "Detalle"].map((h) => <th key={h} className="px-2.5 py-1.5 font-semibold">{h}</th>)}</tr></thead>
                    <tbody>
                      {data.movimientos.map((m) => (
                        <tr key={m.id} className="border-t border-gray-100">
                          <td className="whitespace-nowrap px-2.5 py-1.5">{fechaHora(m.creado_en)}</td>
                          <td className="px-2.5 py-1.5">{MOVIMIENTO[m.tipo] ?? m.tipo}</td>
                          <td className={`whitespace-nowrap px-2.5 py-1.5 font-semibold ${m.tipo === "reverso" ? "text-amber-700" : "text-emerald-700"}`}>{m.tipo === "reverso" ? "+" : "−"}{dinero(m.importe)}</td>
                          <td className="px-2.5 py-1.5">{dinero(m.saldo_despues)}</td>
                          <td className="px-2.5 py-1.5 text-gray-500">{m.periodo_inicio ? `Nómina ${fechaCorta(m.periodo_inicio)} – ${fechaCorta(m.periodo_fin)}` : m.nota ?? ""}{m.registrado_por_nombre ? ` · ${m.registrado_por_nombre}` : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
