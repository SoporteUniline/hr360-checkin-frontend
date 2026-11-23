"use client";

// Detalle de una nómina (R1): totales, recibos por persona, edición en borrador y flujo
// borrador → por autorizar → autorizada (solo el dueño) | cancelada (con motivo). Backend: /checador/nomina.
import { NombreEmpleado } from "@/components/empleado/FichaEmpleado";
import { Fragment, useState } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import { Wallet } from "lucide-react";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Chip, Kpi, descargar, mensajeError } from "@/components/nomina/comun";
import EditorRecibo from "@/components/nomina/EditorRecibo";
import { EncabezadoDetalle } from "@/components/nomina/ModuloNomina";
import AsistenciaRecibo from "@/components/nomina/AsistenciaRecibo";
import EditarDiaAsistencia from "@/app/panel/registro-asistencia/EditarDiaAsistencia";
import { ENVIOS, ESTADOS, acciones, dinero, fechaCorta, horas } from "@/lib/nomina/nomina.mjs";

const get = (url) => axios.get(url).then((r) => r.data);

export default function DetalleNomina() {
  const { id } = useParams();
  const { enqueueSnackbar } = useSnackbar();
  const { data, error, isLoading, mutate } = useSWR(`/checador/nomina/periodos/${id}`, get, {
    // Mientras se envían los recibos, se actualiza solo para ver el avance.
    refreshInterval: (d) => (d?.recibos?.some((r) => r.envio_estado === "pendiente") ? 3000 : 0),
  });
  const [abierto, setAbierto] = useState(null);
  const [desplegado, setDesplegado] = useState(null); // fila con su asistencia abierta
  const [confirmar, setConfirmar] = useState(null); // "autorizar" | "cancelar" | "enviar"
  const [motivo, setMotivo] = useState("");
  const [ocupado, setOcupado] = useState(false);
  // «Corregir» abre aquí mismo la ventana de edición de Asistencias de ese día; al guardar se recalcula sola.
  const [editarDia, setEditarDia] = useState(null); // { idEmpleado, nombre, fecha }

  if (error) return <p role="alert" className="m-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{mensajeError(error, "No se pudo cargar la nómina.")}</p>;
  if (isLoading || !data) return <p className="m-4 text-sm text-gray-500">Cargando…</p>;

  const { periodo, recibos, puede_autorizar: puedeAutorizar } = data;
  const est = ESTADOS[periodo.estado] ?? ESTADOS.borrador;
  const a = acciones(periodo.estado, puedeAutorizar);
  const conAvisos = recibos.filter((r) => (r.datos?.alertas ?? []).length).length;
  const negativos = recibos.filter((r) => Number(r.neto) < 0).length;
  const recibo = recibos.find((r) => r.id === abierto) ?? null;

  const corregir = a.recalcular
    ? (r) => (fecha) => setEditarDia({ idEmpleado: r.id_empleado, nombre: r.datos?.empleado?.nombre ?? "", fecha })
    : null;

  const accion = async (ruta, cuerpo, ok) => {
    setOcupado(true);
    try {
      await axios.post(`/checador/nomina/periodos/${id}/${ruta}`, { version: periodo.version, ...cuerpo });
      enqueueSnackbar(ok, { variant: "success" });
      setConfirmar(null);
      setMotivo("");
    } catch (e) {
      enqueueSnackbar(mensajeError(e), { variant: "error" });
    } finally {
      setOcupado(false);
      mutate();
    }
  };

  return (
    <div className="space-y-5 p-1">
      <EncabezadoDetalle
        regreso="/panel/nomina"
        textoRegreso="Nóminas"
        icono={Wallet}
        titulo={`Nómina del ${fechaCorta(periodo.fecha_inicio)} al ${fechaCorta(periodo.fecha_fin)}`}
        subtitulo={`${periodo.periodicidad} · ${periodo.creado_por_nombre ? `Creó ${periodo.creado_por_nombre}` : ""}${periodo.autorizado_por_nombre ? ` · Autorizó ${periodo.autorizado_por_nombre}` : ""}`}
        acciones={<Chip tono={est.tono}>{est.texto}</Chip>}
      />

      {periodo.estado === "cancelado" && periodo.motivo_cancelacion ? (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">Cancelada por {periodo.cancelado_por_nombre ?? "—"}: {periodo.motivo_cancelacion}</p>
      ) : null}
      {periodo.estado === "por_autorizar" && !puedeAutorizar ? (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Enviada al dueño de la cuenta para su autorización.</p>
      ) : null}

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Kpi titulo="Personas" valor={recibos.length} nota={conAvisos ? `${conAvisos} con avisos por revisar` : "sin avisos"} />
        <Kpi titulo="Neto a pagar" valor={dinero(periodo.total_neto)} clase="text-[#2c56e8]" />
        <Kpi titulo="Por transferencia" valor={dinero(periodo.total_transferencia)} />
        <Kpi titulo="En efectivo" valor={dinero(periodo.total_efectivo)} />
      </div>

      {(() => {
        const suma = (k) => recibos.reduce((t, r) => t + (Number(r.datos?.resumen?.[k]) || 0), 0);
        const extra = suma("minDobles") + suma("minTriples");
        return (
          <div className="grid grid-cols-3 gap-2 text-sm md:max-w-xl">
            <Kpi titulo="Faltas" valor={suma("faltas")} clase={suma("faltas") ? "text-red-700" : "text-gray-900"} />
            <Kpi titulo="Retardos" valor={suma("retardos")} nota="no descuentan sueldo" clase={suma("retardos") ? "text-amber-700" : "text-gray-900"} />
            <Kpi titulo="Horas extra" valor={horas(extra)} nota={suma("minTriples") ? `${horas(suma("minTriples"))} al triple` : null} />
          </div>
        );
      })()}

      <div className="flex flex-wrap gap-2">
        {a.recalcular ? <Button variant="outline" size="sm" disabled={ocupado} onClick={() => accion("calcular", {}, "Nómina recalculada con la asistencia actual.")}>Recalcular</Button> : null}
        {a.enviar ? <Button size="sm" disabled={ocupado || negativos > 0} onClick={() => setConfirmar("enviar")}>Enviar a autorizar</Button> : null}
        {a.regresar ? <Button variant="outline" size="sm" disabled={ocupado} onClick={() => accion("regresar", {}, "Regresó a borrador.")}>Regresar a borrador</Button> : null}
        {a.autorizar ? <Button size="sm" disabled={ocupado} onClick={() => setConfirmar("autorizar")}>Autorizar y enviar recibos</Button> : null}
        {a.reenviar && recibos.some((r) => ["error", null].includes(r.envio_estado)) ? <Button variant="outline" size="sm" onClick={() => accion("reenviar", {}, "Reintentando los envíos.")}>Reintentar envíos</Button> : null}
        <Button variant="outline" size="sm" onClick={() => descargar(axios, `/checador/nomina/periodos/${id}/excel`, `nomina-${periodo.fecha_inicio}.xlsx`).catch(() => enqueueSnackbar("No se pudo descargar el Excel.", { variant: "error" }))}>Excel de pagos</Button>
        {a.cancelar ? <Button variant="outline" size="sm" className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => setConfirmar("cancelar")}>Cancelar nómina</Button> : null}
      </div>
      {negativos ? <p className="text-sm text-red-700">Hay {negativos} recibo(s) con neto negativo: corrígelos antes de enviar.</p> : null}

      {recibos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">Nadie entra en esta nómina. Revisa que tus empleados tengan «{periodo.periodicidad}» como periodo de pago y que no estén ya en otra nómina de esas fechas.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full min-w-[1100px] text-[13px] tabular-nums">
            <thead>
              <tr className="bg-gray-50 text-[10px] uppercase tracking-wide text-gray-500">
                <th className="px-3 pt-2 text-left font-semibold" rowSpan={2}>Empleado</th>
                <th className="border-l border-gray-200 px-3 pt-2 text-center font-semibold text-gray-700" colSpan={5}>Asistencia del periodo</th>
                <th className="border-l border-gray-200 px-3 pt-2 text-center font-semibold text-gray-700" colSpan={5}>Pago</th>
                <th className="border-l border-gray-200 px-3 pt-2 text-left font-semibold" rowSpan={2}>{periodo.estado === "autorizado" ? "Envío" : "Avisos"}</th>
              </tr>
              <tr className="bg-gray-50 text-left text-[10px] uppercase tracking-wide text-gray-500">
                {["Trabajó", "Faltas", "Retardos", "Horas extra", "Días pagados"].map((h, i) => <th key={h} className={`px-3 pb-2 font-semibold ${i === 0 ? "border-l border-gray-200" : ""}`}>{h}</th>)}
                {["Percepciones", "Descuentos", "Neto", "Transferencia", "Efectivo"].map((h, i) => <th key={h} className={`px-3 pb-2 font-semibold ${i === 0 ? "border-l border-gray-200" : ""}`}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {recibos.map((r) => {
                const avisos = r.datos?.alertas ?? [];
                const envio = ENVIOS[r.envio_estado];
                const res = r.datos?.resumen ?? {};
                const extra = (res.minDobles ?? 0) + (res.minTriples ?? 0);
                return (
                  <Fragment key={r.id}>
                  <tr className={`cursor-pointer border-t border-gray-100 hover:bg-blue-50/40 ${desplegado === r.id ? "bg-blue-50/60" : ""}`} onClick={() => setDesplegado(desplegado === r.id ? null : r.id)}>
                    <td className="px-3 py-2.5">
                      <span className="flex items-center gap-1.5 font-semibold text-gray-900">
                        <button type="button" aria-expanded={desplegado === r.id} aria-label={`Ver asistencia de ${r.datos?.empleado?.nombre ?? "la persona"}`} className="grid size-5 place-items-center rounded text-gray-400 hover:bg-gray-100" onClick={(e) => { e.stopPropagation(); setDesplegado(desplegado === r.id ? null : r.id); }}>
                          <span aria-hidden="true" className={`inline-block text-[10px] transition-transform ${desplegado === r.id ? "rotate-90" : ""}`}>▶</span>
                        </button>
                        <NombreEmpleado id={r.id_empleado}>{r.datos?.empleado?.nombre ?? r.id_empleado}</NombreEmpleado>
                      </span>
                      {r.datos?.empleado?.puesto ? <p className="text-[11px] text-gray-500">{r.datos.empleado.puesto}</p> : null}
                    </td>
                    <td className="border-l border-gray-100 px-3 py-2.5">{res.diasTrabajados == null ? "—" : `${res.diasTrabajados} d`}{res.minTrabajados ? <span className="block text-[11px] text-gray-500">{horas(res.minTrabajados)}</span> : null}</td>
                    <td className={`px-3 py-2.5 ${res.faltas ? "font-semibold text-red-700" : "text-gray-500"}`}>{res.faltas ?? "—"}</td>
                    <td className={`px-3 py-2.5 ${res.retardos ? "font-semibold text-amber-700" : "text-gray-500"}`}>{res.retardos ?? "—"}</td>
                    <td className="px-3 py-2.5">{extra ? <>{horas(extra)}{res.minTriples ? <span className="block text-[11px] text-red-700">{horas(res.minTriples)} triples</span> : null}</> : <span className="text-gray-500">—</span>}</td>
                    <td className="px-3 py-2.5 font-semibold">{res.diasPagados ?? "—"}{res.diasRango ? <span className="font-normal text-gray-500"> / {res.diasRango}</span> : null}</td>
                    <td className="border-l border-gray-100 px-3 py-2.5">{dinero(r.total_percepciones)}</td>
                    <td className="px-3 py-2.5">{dinero(r.total_descuentos)}</td>
                    <td className={`px-3 py-2.5 font-bold ${Number(r.neto) < 0 ? "text-red-700" : ""}`}>{dinero(r.neto)}</td>
                    <td className="px-3 py-2.5">{dinero(r.transferencia)}</td>
                    <td className="px-3 py-2.5">{dinero(r.efectivo)}</td>
                    <td className="max-w-[240px] border-l border-gray-100 px-3 py-2.5">
                      {periodo.estado === "autorizado" ? (envio ? <Chip tono={envio.tono}>{envio.texto}</Chip> : "—") : avisos.length ? (
                        <span className="block truncate text-[11.5px] text-amber-800" title={avisos.join("\n")}>⚠ {avisos[0]}{avisos.length > 1 ? ` (+${avisos.length - 1})` : ""}</span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                  </tr>
                  {desplegado === r.id ? (
                    <tr className="bg-blue-50/30">
                      <td colSpan={12} className="px-3 pb-4 pt-1">
                        <AsistenciaRecibo recibo={r} onEditar={() => setAbierto(r.id)} onCorregir={corregir?.(r)} />
                      </td>
                    </tr>
                  ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editarDia ? (
        <EditarDiaAsistencia
          idEmpresa={periodo.id_empresa}
          {...editarDia}
          onCerrar={(huboCambios) => {
            setEditarDia(null);
            if (huboCambios) accion("calcular", {}, "Asistencia corregida: la nómina se recalculó. Lo que ajustaste a mano se conserva.");
          }}
        />
      ) : null}
      {recibo ? <EditorRecibo recibo={recibo} periodo={periodo} editable={a.editar} idEmpresa={periodo.id_empresa} alCambiar={() => mutate()} alCerrar={() => setAbierto(null)} onCorregir={corregir?.(recibo)} /> : null}

      <Dialog open={Boolean(confirmar)} onOpenChange={(v) => !v && setConfirmar(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{confirmar === "autorizar" ? "Autorizar la nómina" : confirmar === "enviar" ? "Enviar a autorizar" : "Cancelar la nómina"}</DialogTitle>
            <DialogDescription>
              {confirmar === "autorizar"
                ? `Se cierra el periodo (ya no se podrán editar las checadas de esas fechas) y se envía a cada persona su recibo en PDF por correo para firmarlo. Neto total: ${dinero(periodo.total_neto)}.`
                : confirmar === "enviar"
                  ? "El dueño de la cuenta la revisará y autorizará. Mientras tanto ya no se puede editar; si hace falta, se regresa a borrador."
                  : periodo.estado === "autorizado"
                    ? "Los recibos quedan cancelados, sus firmas pendientes se anulan y las checadas de esas fechas se pueden volver a corregir."
                    : "La nómina queda cancelada. Podrás crear otra para esas fechas."}
            </DialogDescription>
          </DialogHeader>
          {confirmar === "cancelar" ? (
            <label className="grid gap-1.5 text-sm font-medium">Motivo<textarea className="min-h-20 rounded-lg border border-gray-300 p-2" value={motivo} onChange={(e) => setMotivo(e.target.value)} /></label>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmar(null)}>Volver</Button>
            {confirmar === "autorizar" ? <Button disabled={ocupado} onClick={() => accion("autorizar", {}, "Nómina autorizada. Enviando recibos…")}>Autorizar</Button> : null}
            {confirmar === "enviar" ? <Button disabled={ocupado} onClick={() => accion("enviar", {}, "Enviada a autorizar.")}>Enviar</Button> : null}
            {confirmar === "cancelar" ? <Button className="bg-red-600 hover:bg-red-700" disabled={ocupado || !motivo.trim()} onClick={() => accion("cancelar", { motivo }, "Nómina cancelada.")}>Cancelar nómina</Button> : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
