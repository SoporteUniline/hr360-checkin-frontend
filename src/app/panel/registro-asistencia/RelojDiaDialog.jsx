"use client";

// El reloj del día: la única forma de corregir horas en Asistencias (reemplaza a PanelEditarAsistencia en esta pantalla).
// GET/PUT /checador/asistencias/:id/reloj. Izquierda: horario y checadas (entrada, salida, concepto, motivo, quién
// autoriza la extra; anular/restaurar lo del reloj, quitar lo agregado). Derecha: cálculo automático y calendario con
// candado. Validación en vivo (lib/asistencia/relojDia.mjs) y errores del servidor por renglón.
// En pantallas angostas (< 640 px) es una hoja a pantalla completa y cada checada es una tarjeta con controles de 44 px.

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import { Lock, Plus, RotateCcw, Scissors, X } from "lucide-react";
import axios from "@/lib/axios";
import { cn } from "@/lib/utils";
import { fetcherWithToken } from "@/lib/fetcher";
import { useEmpresaTimezone } from "@/context/AuthContext";
import { useGuardiaSalida } from "@/components/cambios/CambiosPendientes";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  CONCEPTOS, TOLERANCIA_MIN, aHHMM, aMin, agregarComida, agregarRegistro, autorizaValor, claseEstado, conAutoriza,
  cuerpoPut, desdeApi, diaFila, durTexto, editado, errores as validar, erroresPorRenglon, estadoFila, etiquetaQuitar,
  fechaTxt, hora12Txt, horarioMin, horarioNormal, minDeCampo, ordenar, origenTexto, puedeComida, quitarORestaurar,
  resumen, separarExtra, vivos,
} from "@/lib/asistencia/relojDia.mjs";

const CAMPO = "h-9 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 text-[13.5px] text-slate-900 "
  + "focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:bg-slate-50 disabled:text-slate-400 max-sm:h-11 max-sm:text-base";
const BOTON = "inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3.5 text-[13.5px] "
  + "font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 max-sm:h-11";
const ETQ = "text-[12px] font-medium text-slate-500";
const TITULO = "text-[11.5px] font-semibold uppercase tracking-[0.07em] text-slate-500";
const ROJO = "border-rose-300 bg-rose-50";

function Campo({ etiqueta, children, nota, className = "" }) {
  return (
    <label className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <span className={ETQ}>{etiqueta}</span>
      {children}
      {nota ? <span className="text-[12px] text-slate-400">{nota}</span> : null}
    </label>
  );
}

function Renglon({ r, n, error, motivos, autorizadores, nocturno, onCambio, onQuitar }) {
  const ed = editado(r);
  const pideMotivo = ed || (r.anulado && !r.anuladoAntes);
  const motivosConocidos = [...(motivos.permisos ?? []), ...(motivos.correccion ?? [])].map((m) => m.clave);
  const fondo = r.anulado ? "bg-slate-50" : ed ? "bg-amber-50/50" : r.concepto === "extra" ? "bg-violet-50/50" : r.concepto === "comida" ? "bg-slate-50/70" : "bg-white";
  const tachado = r.anulado ? "line-through" : "";
  const duracion = r.ini != null && r.fin != null && r.fin > r.ini ? durTexto(r.fin - r.ini) : r.fin == null && r.ini != null ? "Sin salida" : "";
  return (
    <div data-renglon={n} data-clave={r.k} className={`border-t border-slate-100 px-4 py-3.5 first:border-t-0 max-sm:rounded-xl max-sm:border max-sm:border-slate-200 max-sm:first:border-t ${fondo}`}>
      <div className="flex items-center justify-between gap-2 sm:hidden">
        <b className="text-[14px] text-slate-800">Checada {n}{r.anulado ? " · anulada" : ""}</b>
        <span className="text-[13px] text-slate-500">{duracion}</span>
      </div>
      <div className="grid grid-cols-[24px_116px_116px_150px_minmax(0,1fr)_36px] items-start gap-3 max-sm:mt-2 max-sm:grid-cols-2">
        <span className="pt-7 text-[13px] tabular-nums text-slate-400 max-sm:hidden">{n}</span>
        <Campo etiqueta="Entrada" nota={origenTexto(r, "ini")}>
          <input type="time" aria-label="Entrada" disabled={r.anulado} className={cn(CAMPO, tachado, !r.anulado && r.ini == null ? ROJO : "")}
            value={r.ini == null ? "" : aHHMM(r.ini)}
            onChange={(e) => onCambio({ ini: e.target.value ? aMin(e.target.value) + (r.ini != null && r.ini >= 1440 ? 1440 : 0) : null })} />
        </Campo>
        <Campo etiqueta="Salida" nota={origenTexto(r, "fin")}>
          <input type="time" aria-label="Salida" disabled={r.anulado} className={cn(CAMPO, tachado)}
            value={r.fin == null ? "" : aHHMM(r.fin)}
            onChange={(e) => onCambio({ fin: e.target.value ? minDeCampo(e.target.value, { referencia: r.ini, nocturno }) : null })} />
        </Campo>
        <Campo etiqueta="Concepto" className="max-sm:col-span-2">
          <select aria-label="Concepto" disabled={r.anulado} className={CAMPO} value={r.concepto} onChange={(e) => onCambio({ concepto: e.target.value })}>
            {CONCEPTOS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </Campo>
        <span className="pt-7 text-[13px] tabular-nums text-slate-500 max-sm:hidden">{duracion}</span>
        <div className="flex justify-end pt-6 max-sm:hidden">
          <button type="button" onClick={onQuitar} aria-label={etiquetaQuitar(r)} title={etiquetaQuitar(r)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">
            {r.anulado ? <RotateCcw className="h-4 w-4" aria-hidden /> : <X className="h-4 w-4" aria-hidden />}
          </button>
        </div>
      </div>
      <div className={`mt-3 grid gap-3 sm:pl-9 ${r.concepto === "extra" && !r.anulado ? "sm:grid-cols-2" : ""}`}>
        <Campo etiqueta={pideMotivo ? "Motivo (obligatorio)" : "Motivo (opcional)"}>
          <select aria-label="Motivo" value={r.motivo} onChange={(e) => onCambio({ motivo: e.target.value })}
            className={cn(CAMPO, pideMotivo && !r.motivo && ROJO)}>
            <option value="">{pideMotivo ? "Elige el motivo…" : "Sin motivo"}</option>
            {r.motivo && !motivosConocidos.includes(r.motivo) ? <option value={r.motivo}>{r.motivo}</option> : null}
            {motivos.permisos?.length ? (
              <optgroup label="Permisos">{motivos.permisos.map((m) => <option key={m.clave} value={m.clave}>{m.nombre}</option>)}</optgroup>
            ) : null}
            <optgroup label="Corrección">{(motivos.correccion ?? []).map((m) => <option key={m.clave} value={m.clave}>{m.nombre}</option>)}</optgroup>
          </select>
        </Campo>
        {r.concepto === "extra" && !r.anulado ? (
          <Campo etiqueta="¿Quién autoriza?" nota="Dobles o triples: lo decide la ley por semana.">
            <select aria-label="Quién autoriza" value={autorizaValor(r)} onChange={(e) => onCambio(conAutoriza(e.target.value))}
              className={cn(CAMPO, !autorizaValor(r) && ROJO)}>
              <option value="">Elige quién autoriza…</option>
              {autorizadores.map((a) => <option key={a.id} value={String(a.id)}>{a.nombre}</option>)}
              <option value="no">No se autoriza</option>
            </select>
          </Campo>
        ) : null}
      </div>
      <button type="button" onClick={onQuitar} className={cn(BOTON, "mt-3 w-full justify-center sm:hidden")}>
        {r.anulado ? <RotateCcw className="h-4 w-4" aria-hidden /> : <X className="h-4 w-4" aria-hidden />}{etiquetaQuitar(r)}
      </button>
      {error ? <p role="alert" className="mt-2 text-[13px] font-medium text-rose-700 sm:pl-9">{error}</p> : null}
    </div>
  );
}

function Fila({ etiqueta, children }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-dashed border-slate-200 py-2.5 text-[14px] last:border-b-0">
      <span className="text-slate-600">{etiqueta}</span>
      <span className="text-right font-semibold tabular-nums text-slate-900">{children}</span>
    </div>
  );
}

export default function RelojDiaDialog({ registro, onCerrar, onGuardado }) {
  const { enqueueSnackbar } = useSnackbar();
  const id = registro?.id;
  const zonaEmpresa = useEmpresaTimezone(registro?.id_empresa);
  const zona = registro?.zona_horaria || zonaEmpresa;
  const { data, error, isLoading } = useSWR(id ? `/checador/asistencias/${id}/reloj` : null, fetcherWithToken, { revalidateOnFocus: false });
  const fecha = String(data?.asistencia?.fecha ?? registro?.fecha ?? "").slice(0, 10);
  const [regs, setRegs] = useState(null);
  const [servidor, setServidor] = useState({ general: "", renglones: {} });
  const [guardando, setGuardando] = useState(false);
  useEffect(() => {
    if (data?.registros && regs == null) setRegs(desdeApi(data.registros, { fecha, zona }));
  }, [data, regs, fecha, zona]);

  const horario = data?.horario ?? null;
  const h = useMemo(() => horarioMin(horario), [horario]);
  const lista = useMemo(() => regs ?? [], [regs]);
  const orden = useMemo(() => ordenar(lista), [lista]);
  const errs = useMemo(() => validar(lista), [lista]);
  const estadoSin = estadoFila(registro);
  const calc = resumen(lista, horario, { tolerancia: Number(horario?.tolerancia_min ?? TOLERANCIA_MIN), estadoDia: estadoSin });
  // Cambios = el cuerpo del PUT ya no es el que se cargó.
  const firma = (rs) => JSON.stringify(cuerpoPut(ordenar(rs), { fecha, zona }));
  const inicial = useMemo(() => (data?.registros ? firma(desdeApi(data.registros, { fecha, zona })) : ""),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, fecha, zona]);
  const hayCambios = regs != null && firma(lista) !== inicial;
  const hayErrores = Object.keys(errs).length > 0;

  const cambiar = (fn) => { setRegs((prev) => fn(prev ?? [])); setServidor((s) => (s.general || Object.keys(s.renglones).length ? { general: "", renglones: {} } : s)); };
  const guardar = async () => {
    if (hayErrores || guardando) return false;
    setGuardando(true);
    try {
      const res = await axios.put(`/checador/asistencias/${id}/reloj`, cuerpoPut(orden, { fecha, zona }));
      enqueueSnackbar("Reloj guardado. Horas, comida, extra y estado se recalcularon; lo original queda en el historial.", { variant: "success" });
      await onGuardado?.(res.data?.asistencia);
      onCerrar?.(true);
      return true;
    } catch (e) {
      const cuerpo = e?.response?.data;
      setServidor({ general: cuerpo?.error || cuerpo?.message || "No se pudo guardar el reloj. Intenta de nuevo.", renglones: erroresPorRenglon(cuerpo, orden) });
      return false;
    } finally {
      setGuardando(false);
    }
  };
  const confirmarSalida = useGuardiaSalida({ hayCambios, guardar });
  const cerrar = () => (hayCambios ? confirmarSalida(() => onCerrar?.(false)) : onCerrar?.(false));

  const nombre = data?.asistencia?.nombre || [registro?.nombre, registro?.apellido_paterno].filter(Boolean).join(" ");
  const depto = data?.asistencia?.departamento ?? registro?.departamento;
  const dia = data?.dia ?? diaFila(registro);
  const especial = dia?.tipo && dia.tipo !== "normal";
  const sinVivos = regs != null && vivos(lista).length === 0;
  const motivoOlvido = (data?.motivos?.correccion ?? []).find((m) => m.clave === "olvido")?.clave ?? "";
  const programado = h ? `${hora12Txt(aHHMM(h.pe))} – ${hora12Txt(aHHMM(h.ps))}` : "Sin horario";
  const comidaProg = h?.sc != null ? `${hora12Txt(aHHMM(h.sc))} – ${hora12Txt(aHHMM(h.rc))}` : "Sin comida";
  const mensajeError = servidor.general || (hayErrores ? "Corrige lo marcado en rojo para guardar." : "");

  return (
    <Dialog open onOpenChange={(v) => !v && cerrar()}>
      <DialogContent data-no-row-click data-reloj-dia
        className="flex max-h-[92vh] w-[1080px] max-w-[96vw] flex-col gap-0 overflow-hidden bg-white p-0 sm:max-w-[min(1080px,96vw)] max-sm:left-0 max-sm:top-0 max-sm:h-[100dvh] max-sm:max-h-none max-sm:w-screen max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:border-0 [&>button:last-child]:top-5 [&>button:last-child]:right-5 max-sm:[&>button:last-child]:hidden">
        <div className="flex shrink-0 items-start gap-3 border-b border-slate-200 px-6 py-4 max-sm:px-4 max-sm:pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-[18px] font-bold text-slate-900">{nombre}</DialogTitle>
            <DialogDescription className="mt-0.5 text-[14px] text-slate-600">{fechaTxt(fecha)}{depto ? ` · ${depto}` : ""}</DialogDescription>
          </div>
          <button type="button" onClick={cerrar} aria-label="Cerrar el reloj"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 sm:hidden">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6 py-5 max-sm:px-4">
          {error ? (
            <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[14px] text-rose-800">No se pudo abrir el reloj de este día.</p>
          ) : isLoading || regs == null ? (
            <p role="status" className="py-10 text-center text-[14px] text-slate-500">Cargando las checadas del reloj…</p>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="flex min-w-0 flex-col gap-4">
                <section className="flex flex-col gap-2">
                  <h3 className={TITULO}>Horario del día</h3>
                  <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div><p className="text-[11.5px] font-semibold uppercase tracking-wide text-slate-500">Jornada</p><p className="text-[14px] font-semibold tabular-nums text-slate-900">{programado}</p></div>
                    <div><p className="text-[11.5px] font-semibold uppercase tracking-wide text-slate-500">Comida</p><p className="text-[14px] font-semibold tabular-nums text-slate-900">{comidaProg}</p></div>
                  </div>
                </section>

                <section className="flex flex-col gap-3">
                  <h3 className={TITULO}>Checadas del reloj</h3>
                  {sinVivos ? (
                    <div data-reloj-vacio className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
                      <b className="text-[14px] text-amber-900">No tiene checadas. ¿De qué hora a qué hora trabajó?</b>
                      <div className="flex flex-wrap gap-2.5">
                        <button type="button" disabled={!h} onClick={() => cambiar((p) => [...p, ...horarioNormal(horario, motivoOlvido)])}
                          className={cn(BOTON, "border-blue-600 bg-blue-600 text-white hover:bg-blue-700")}>Cargar su horario normal</button>
                        <button type="button" onClick={() => cambiar((p) => agregarRegistro(p, horario))} className={BOTON}>Escribir las horas</button>
                      </div>
                    </div>
                  ) : null}
                  {orden.length ? (
                    <div className="overflow-hidden rounded-xl border border-slate-200 max-sm:flex max-sm:flex-col max-sm:gap-3 max-sm:overflow-visible max-sm:border-0">
                      {orden.map((r, i) => (
                        <Renglon key={r.k} r={r} n={i + 1} error={errs[r.k] || servidor.renglones[r.k]} motivos={data?.motivos ?? {}}
                          autorizadores={data?.autorizadores ?? []} nocturno={Boolean(h?.nocturno)}
                          onCambio={(c) => cambiar((p) => p.map((x) => (x.k === r.k ? { ...x, ...c } : x)))}
                          onQuitar={() => cambiar((p) => quitarORestaurar(p, r.k))} />
                      ))}
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-2.5">
                    <button type="button" onClick={() => cambiar((p) => agregarRegistro(p, horario))} className={BOTON}><Plus className="h-4 w-4" aria-hidden />Agregar registro</button>
                    {puedeComida(lista) ? <button type="button" onClick={() => cambiar((p) => agregarComida(p, horario))} className={BOTON}><Plus className="h-4 w-4" aria-hidden />Comida</button> : null}
                    {calc.sinSeparar > 0 ? (
                      <button type="button" onClick={() => cambiar((p) => separarExtra(p, horario))} className={cn(BOTON, "border-violet-300 text-violet-700 hover:bg-violet-50")}>
                        <Scissors className="h-4 w-4" aria-hidden />Separar {durTexto(calc.sinSeparar)} después de las {hora12Txt(aHHMM(h.ps))} como hora extra
                      </button>
                    ) : null}
                  </div>
                  <p className="text-[12.5px] text-slate-500">Lo que marcó el reloj nunca se borra: queda tachado o como «reloj: hora» y en el historial con tu nombre y el motivo.</p>
                </section>
              </div>

              <aside className="flex flex-col gap-4">
                <section data-calculo className="flex flex-col gap-1">
                  <h3 className={TITULO}>Cálculo automático</h3>
                  <Fila etiqueta="Trabajadas">
                    {calc.hayRegs && !calc.abierto ? durTexto(calc.trabajadas) : "—"}
                    {calc.programadas ? <span className="block text-[12px] font-normal text-slate-400">de {durTexto(calc.programadas)} programado</span> : null}
                  </Fila>
                  <Fila etiqueta="Comida">{durTexto(calc.comida)}</Fila>
                  <Fila etiqueta="Horas extra">
                    <span className="text-violet-700">{durTexto(calc.extraMin - calc.extraNoAut)}</span>
                    {calc.extraPorAutorizar > 0 ? <span className="block text-[12px] font-normal text-violet-700">{durTexto(calc.extraPorAutorizar)} por autorizar</span> : null}
                  </Fila>
                  <Fila etiqueta="Estado">
                    <span data-estado-calculado className={`inline-block rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold ${claseEstado(calc.estado.clave)}`}>{calc.estado.texto}</span>
                  </Fila>
                </section>
                <section data-calendario className="flex flex-col gap-2">
                  <h3 className={TITULO}>Calendario y pagos</h3>
                  <div className="flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <span className="flex items-center gap-2 text-[14px] font-semibold text-slate-800">
                      <Lock className="h-4 w-4 text-slate-400" aria-label="Solo lectura" />
                      <span className={especial ? "rounded-full bg-sky-100 px-2.5 py-0.5 text-[12.5px] text-sky-800" : ""}>{dia?.nombre || "Día normal"}</span>
                    </span>
                    <span className="text-[13px] text-slate-600">{dia?.pago || "Sin pago adicional."}</span>
                    <span className="text-[12px] text-slate-400">Lo pone la ley o el catálogo de días de la empresa. No se edita aquí para que el registro sea auditable.</span>
                  </div>
                </section>
              </aside>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-slate-200 px-6 py-3.5 max-sm:flex-wrap max-sm:px-4 max-sm:pb-[max(0.875rem,env(safe-area-inset-bottom))]">
          <span role={mensajeError ? "alert" : undefined} className="min-w-0 flex-1 text-[13px] text-rose-700 max-sm:basis-full">{mensajeError}</span>
          <button type="button" onClick={cerrar} disabled={guardando} className={cn(BOTON, "max-sm:flex-1 max-sm:justify-center")}>Cancelar</button>
          <button type="button" onClick={guardar} disabled={guardando || hayErrores || !hayCambios || regs == null}
            className={cn(BOTON, "border-blue-600 bg-blue-600 text-white hover:bg-blue-700 max-sm:flex-1 max-sm:justify-center")}>
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
