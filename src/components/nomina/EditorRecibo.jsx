"use client";

// Panel para revisar y editar un recibo (solo en borrador). Cada importe sugerido se puede cambiar con un motivo
// y volver al sugerido (D-3); se agregan bonos/descuentos del catálogo o renglones a mano; el reparto
// transferencia/efectivo se edita para esta nómina (D-1).
import { useEffect, useState } from "react";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Chip, descargar, mensajeError } from "./comun";
import { dinero } from "@/lib/nomina/nomina.mjs";
import AsistenciaRecibo from "./AsistenciaRecibo";

const get = (url) => axios.get(url).then((r) => r.data);
const plural = (n, palabra) => `${Number(n) || 0} ${palabra}${Number(n) === 1 ? "" : "s"}`;

function Seccion({ titulo, children, extra }) {
  return (
    <section className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-slate-500">{titulo}</h3>
        {extra}
      </div>
      {children}
    </section>
  );
}

export default function EditorRecibo({ recibo, periodo, editable, idEmpresa, alCambiar, alCerrar, onCorregir }) {
  const { enqueueSnackbar } = useSnackbar();
  const [cambios, setCambios] = useState({});
  const [agregar, setAgregar] = useState({ id_concepto: "", importe: "" });
  const [manual, setManual] = useState({ concepto: "", tipo: "percepcion", importe: "" });
  const [transferencia, setTransferencia] = useState("");
  const [guardando, setGuardando] = useState(false);
  const catalogo = useSWR(editable && idEmpresa ? `/checador/nomina/conceptos?empresa=${idEmpresa}` : null, get);

  useEffect(() => {
    setCambios({});
    setTransferencia(recibo?.transferencia_editada ?? "");
  }, [recibo?.id, recibo?.transferencia_editada]);

  if (!recibo) return null;
  const d = recibo.datos ?? {};
  const enviar = async (cuerpo, ok) => {
    setGuardando(true);
    try {
      await axios.put(`/checador/nomina/recibos/${recibo.id}`, { version: periodo.version, ...cuerpo });
      enqueueSnackbar(ok, { variant: "success" });
      setCambios({});
      await alCambiar();
    } catch (e) {
      enqueueSnackbar(mensajeError(e, "No se pudo guardar."), { variant: "error" });
      if (e?.response?.data?.codigo === "VERSION") await alCambiar();
    } finally {
      setGuardando(false);
    }
  };
  const lineasCambiadas = Object.entries(cambios).map(([clave, c]) => ({ clave, importe: Number(c.importe), motivo: c.motivo }));
  const fila = (l) => {
    const c = cambios[l.clave];
    return (
      <li key={l.clave} className="px-3 py-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-slate-900">{l.concepto}{l.cantidad != null ? <span className="font-normal text-gray-500"> · {Number(l.cantidad)}</span> : null}</p>
            {l.nota ? <p className="text-xs text-amber-700">{l.nota}</p> : null}
            {Number(l.editado) ? <p className="text-xs text-gray-500">Editado{l.editado_por_nombre ? ` por ${l.editado_por_nombre}` : ""}{l.motivo ? `: ${l.motivo}` : ""} · sugerido {dinero(l.importe_sugerido)}</p> : null}
          </div>
          {editable ? (
            <input
              aria-label={`Importe de ${l.concepto}`}
              type="number" min="0" step="0.01" inputMode="decimal"
              className="h-9 w-28 rounded-lg border border-gray-300 px-2 text-right tabular-nums"
              value={c ? c.importe : Number(l.importe)}
              onChange={(e) => setCambios({ ...cambios, [l.clave]: { importe: e.target.value, motivo: c?.motivo ?? "" } })}
            />
          ) : <b className="tabular-nums">{dinero(l.importe)}</b>}
        </div>
        {c ? (
          <input className="mt-2 h-9 w-full rounded-lg border border-gray-300 px-2 text-sm" placeholder="Motivo del cambio (opcional)" value={c.motivo} onChange={(e) => setCambios({ ...cambios, [l.clave]: { ...c, motivo: e.target.value } })} />
        ) : null}
        {editable && Number(l.editado) && !c ? (
          <button type="button" className="mt-1 text-xs font-semibold text-[#2c56e8] hover:underline" onClick={() => enviar({ lineas: [{ clave: l.clave, importe: 0, volver_al_sugerido: true }] }, "Se regresó al importe sugerido.")}>Volver al sugerido</button>
        ) : null}
        {editable && l.origen === "manual" ? (
          <button type="button" className="ml-3 mt-1 text-xs font-semibold text-red-700 hover:underline" onClick={() => enviar({ quitar: l.clave }, "Renglón quitado.")}>Quitar</button>
        ) : null}
      </li>
    );
  };
  const percepciones = recibo.lineas.filter((l) => l.tipo === "percepcion");
  const descuentos = recibo.lineas.filter((l) => l.tipo === "descuento");

  return (
    <Sheet open onOpenChange={(v) => !v && alCerrar()}>
      <SheetContent className="w-full gap-0 overflow-y-auto bg-white p-0 sm:max-w-[720px]">
        <SheetHeader className="border-b border-slate-200 px-6 py-4 text-left">
          <SheetTitle>{d.empleado?.nombre ?? "Recibo"}</SheetTitle>
          <p className="text-sm text-slate-500">{d.empleado?.puesto ? `${d.empleado.puesto} · ` : ""}Pago {String(d.empleado?.periodo_pago ?? "").toLowerCase()} · {plural(d.resumen?.faltas, "falta")} · {plural(d.resumen?.retardos, "retardo")}</p>
        </SheetHeader>
        <div className="grid gap-6 px-6 py-5 text-sm">
          {(d.alertas ?? []).length ? (
            <ul className="grid gap-1 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[12.5px] text-amber-900">{d.alertas.map((a) => <li key={a}>⚠ {a}</li>)}</ul>
          ) : null}
          <Seccion titulo="Asistencia del periodo" extra={onCorregir ? <span className="text-[11px] text-slate-400">«Corregir» abre la ventana de Asistencias de ese día</span> : null}>
            <AsistenciaRecibo recibo={recibo} modo="compacto" onCorregir={onCorregir} />
          </Seccion>
          <Seccion titulo="Percepciones"><ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">{percepciones.map(fila)}</ul></Seccion>
          <Seccion titulo="Descuentos">{descuentos.length ? <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">{descuentos.map(fila)}</ul> : <p className="text-slate-500">Sin descuentos.</p>}</Seccion>
          {editable && lineasCambiadas.length ? (
            <Button disabled={guardando} onClick={() => enviar({ lineas: lineasCambiadas }, "Cambios guardados.")}>Guardar cambios ({lineasCambiadas.length})</Button>
          ) : null}

          {editable ? (
            <section className="grid gap-2 rounded-xl border border-dashed border-slate-300 p-3.5">
              <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-slate-500">Agregar bono o descuento</h3>
              <div className="flex flex-wrap gap-2">
                <select aria-label="Bono o descuento del catálogo" className="h-9 flex-1 rounded-lg border border-gray-300 px-2" value={agregar.id_concepto} onChange={(e) => setAgregar({ ...agregar, id_concepto: e.target.value })}>
                  <option value="">Del catálogo…</option>
                  {(catalogo.data?.conceptos ?? []).filter((c) => c.activo).map((c) => <option key={c.id} value={c.id}>{c.nombre} ({c.tipo === "descuento" ? "descuento" : "bono"})</option>)}
                </select>
                <input aria-label="Importe" type="number" min="0" step="0.01" className="h-9 w-28 rounded-lg border border-gray-300 px-2 text-right" placeholder="$" value={agregar.importe} onChange={(e) => setAgregar({ ...agregar, importe: e.target.value })} />
                <Button size="sm" variant="outline" disabled={!agregar.id_concepto || guardando} onClick={() => enviar({ agregar: [{ id_concepto: Number(agregar.id_concepto), importe: Number(agregar.importe || 0) }] }, "Concepto agregado.").then(() => setAgregar({ id_concepto: "", importe: "" }))}>Agregar</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <input aria-label="Concepto a mano" className="h-9 flex-1 rounded-lg border border-gray-300 px-2" placeholder="O escribe un concepto" value={manual.concepto} onChange={(e) => setManual({ ...manual, concepto: e.target.value })} />
                <select aria-label="Tipo" className="h-9 rounded-lg border border-gray-300 px-2" value={manual.tipo} onChange={(e) => setManual({ ...manual, tipo: e.target.value })}><option value="percepcion">Bono</option><option value="descuento">Descuento</option></select>
                <input aria-label="Importe a mano" type="number" min="0" step="0.01" className="h-9 w-28 rounded-lg border border-gray-300 px-2 text-right" placeholder="$" value={manual.importe} onChange={(e) => setManual({ ...manual, importe: e.target.value })} />
                <Button size="sm" variant="outline" disabled={!manual.concepto.trim() || guardando} onClick={() => enviar({ agregar: [{ concepto: manual.concepto, tipo: manual.tipo, importe: Number(manual.importe || 0) }] }, "Renglón agregado.").then(() => setManual({ concepto: "", tipo: "percepcion", importe: "" }))}>Agregar</Button>
              </div>
            </section>
          ) : null}

          <section className="grid gap-1.5 rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-3 tabular-nums">
            <p className="flex justify-between"><span>Percepciones</span><b>{dinero(recibo.total_percepciones)}</b></p>
            <p className="flex justify-between"><span>Descuentos</span><b>{dinero(recibo.total_descuentos)}</b></p>
            <p className="flex justify-between text-base"><span className="font-bold">Neto</span><b className="text-[#2c56e8]">{dinero(recibo.neto)}</b></p>
            <p className="flex justify-between text-gray-600"><span>Transferencia · Efectivo</span><span>{dinero(recibo.transferencia)} · {dinero(recibo.efectivo)}</span></p>
            <p className="text-xs text-gray-500">Medio de pago en su ficha: {d.empleado?.medio_pago ?? "sin definir"}{d.empleado?.medio_pago === "Mixto" ? ` (${dinero(d.empleado?.monto_transferencia)} por transferencia)` : ""}</p>
            {editable ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <label className="text-sm" htmlFor="transf">Transferencia en esta nómina</label>
                <input id="transf" type="number" min="0" step="0.01" className="h-9 w-28 rounded-lg border border-gray-300 px-2 text-right" placeholder="como su ficha" value={transferencia} onChange={(e) => setTransferencia(e.target.value)} />
                <Button size="sm" variant="outline" disabled={guardando} onClick={() => enviar({ transferencia: transferencia === "" ? null : Number(transferencia) }, "Reparto actualizado.")}>Aplicar</Button>
              </div>
            ) : null}
          </section>

          {recibo.envio_estado ? <p className="text-xs text-gray-500">Envío: {recibo.envio_estado}{recibo.envio_error ? ` — ${recibo.envio_error}` : ""}</p> : null}
          <Button variant="outline" onClick={() => descargar(axios, `/checador/nomina/recibos/${recibo.id}/pdf`, `recibo-${recibo.id}.pdf`, true).catch(() => enqueueSnackbar("No se pudo abrir el PDF.", { variant: "error" }))}>Ver recibo en PDF</Button>
          {!editable && periodo.estado === "borrador" ? <Chip>Solo lectura</Chip> : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
