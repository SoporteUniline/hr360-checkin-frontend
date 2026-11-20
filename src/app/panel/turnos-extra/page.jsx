"use client";

// Turnos extra (fase 1): RH arma quién viene a trabajar tiempo extra un día, con avisos de ley,
// y ve el turno en vivo con las checadas del reloj. Backend: /checador/turnos-extra
// (hr360-checkin-backend/docs/turnos-extra.md). El reloj todavía no cambia (fase 2 con Luis).
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import { CalendarClock, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import axios from "@/lib/axios";
import EncabezadoPagina from "@/components/tabla/EncabezadoPagina";
import useUnidadesNegocio from "@/hooks/useUnidadesNegocio";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import TurnoExtraDialog from "./TurnoExtraDialog";
import {
  FASES, estadoPersona, faseTurno, textoDia, textoSemana,
} from "@/lib/asistencia/turnosExtra.mjs";
import { semanaDe, sumarDias } from "@/lib/fechaHora.mjs";
import { formatearMinutos } from "@/lib/asistencia/jornada.mjs";

const get = (url) => axios.get(url).then((r) => r.data);
const hoyLocal = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());

const TONOS = {
  gris: "bg-gray-100 text-gray-600",
  azul: "bg-blue-50 text-blue-700",
  verde: "bg-emerald-50 text-emerald-700",
  ambar: "bg-amber-50 text-amber-700",
  rojo: "bg-red-50 text-red-700",
};
function Chip({ tono = "gris", children }) {
  return <span className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${TONOS[tono]}`}>{children}</span>;
}
const hora = (marca) => (marca ? String(marca).slice(11, 16) : "—");

export default function TurnosExtraPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [semana, setSemana] = useState(() => semanaDe(hoyLocal()));
  const [elegido, setElegido] = useState(null);
  const [dialogo, setDialogo] = useState(null); // { modo: "nuevo" | "editar" }
  const [cancelando, setCancelando] = useState(false);

  const { options } = useUnidadesNegocio();
  const empresas = useMemo(() => {
    const m = new Map();
    for (const o of options) if (o.id_empresa && !m.has(o.id_empresa)) m.set(o.id_empresa, { id: o.id_empresa, nombre: o.empresa_nombre || o.label });
    return [...m.values()];
  }, [options]);

  const lista = useSWR(`/checador/turnos-extra?desde=${semana.inicio}&hasta=${semana.fin}`, get);
  const turnos = useMemo(() => lista.data?.data ?? [], [lista.data]);
  const sinMigracion = lista.error?.response?.data?.codigo === "SIN_MIGRACION";

  useEffect(() => {
    if (!turnos.length) { setElegido(null); return; }
    if (!turnos.some((t) => t.id === elegido)) {
      const ahora = lista.data?.ahora;
      const vivo = turnos.find((t) => faseTurno(t, ahora) === "en_curso")
        ?? turnos.find((t) => faseTurno(t, ahora) === "programado") ?? turnos[0];
      setElegido(vivo.id);
    }
  }, [turnos, elegido, lista.data?.ahora]);

  const detalle = useSWR(elegido ? `/checador/turnos-extra/${elegido}` : null, get, {
    // En curso se refresca cada minuto para ver las checadas del reloj.
    refreshInterval: (d) => (d?.data?.turno?.fase === "en_curso" ? 60000 : 0),
  });
  const d = detalle.data?.data;
  const plantilla = useMemo(() => d?.personas ?? [], [d]);

  const guardado = (id) => {
    lista.mutate();
    if (id) { setElegido(id); detalle.mutate(); }
  };

  const cancelarTurno = async () => {
    try {
      await axios.post(`/checador/turnos-extra/${elegido}/cancelar`);
      enqueueSnackbar("Turno extra cancelado", { variant: "success" });
      lista.mutate(); detalle.mutate();
    } catch (e) {
      enqueueSnackbar(e?.response?.data?.error || "No se pudo cancelar", { variant: "error" });
    } finally {
      setCancelando(false);
    }
  };

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <EncabezadoPagina
        icono={CalendarClock}
        titulo="Turnos extra"
        subtitulo="Arma quién viene a trabajar tiempo extra; se cuenta como horas extra y se ve en vivo con el reloj"
        acciones={(
          <Button onClick={() => setDialogo({ modo: "nuevo" })} disabled={sinMigracion || !empresas.length}>
            <Plus className="mr-1 h-4 w-4" /> Nuevo turno extra
          </Button>
        )}
      />

      <div className="flex items-center gap-2 text-sm">
        <button type="button" aria-label="Semana anterior" className="grid h-8 w-8 place-items-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
          onClick={() => setSemana((s) => semanaDe(sumarDias(s.inicio, -7)))}><ChevronLeft className="h-4 w-4" /></button>
        <b className="text-gray-900">{textoSemana(semana)}</b>
        <button type="button" aria-label="Semana siguiente" className="grid h-8 w-8 place-items-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
          onClick={() => setSemana((s) => semanaDe(sumarDias(s.inicio, 7)))}><ChevronRight className="h-4 w-4" /></button>
        <button type="button" className="ml-1 text-xs font-semibold text-brand hover:underline" onClick={() => setSemana(semanaDe(hoyLocal()))}>Esta semana</button>
      </div>

      {sinMigracion ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Turnos extra todavía no está activado en el servidor (falta correr la migración <code>20261119_turnos_extra.sql</code>).
        </div>
      ) : lista.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {lista.error?.response?.data?.error || "No se pudieron cargar los turnos extra."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[270px_1fr]">
          <aside className="flex flex-col gap-2">
            {lista.isLoading ? <p className="text-sm text-gray-500">Cargando…</p> : null}
            {turnos.map((t) => {
              const fase = FASES[faseTurno(t, lista.data?.ahora)];
              return (
                <button key={t.id} type="button" onClick={() => setElegido(t.id)}
                  className={`flex flex-col gap-0.5 rounded-2xl border bg-white px-3 py-2.5 text-left text-[12.5px] text-gray-600 ${t.id === elegido ? "border-brand shadow-[0_0_0_2px_rgba(37,99,235,0.15)]" : "border-gray-200 hover:bg-gray-50"}`}>
                  <span className="text-[11.5px] font-bold uppercase tracking-wide text-brand">{textoDia(t.fecha)}</span>
                  <b className="text-[13.5px] text-gray-900">{t.nombre}</b>
                  <span>{t.hora_inicio}–{t.hora_fin} · {t.personas} {Number(t.personas) === 1 ? "persona" : "personas"}{empresas.length > 1 ? ` · ${t.nombre_empresa}` : ""}</span>
                  <Chip tono={fase.tono}>{fase.texto}</Chip>
                </button>
              );
            })}
            {!lista.isLoading && !turnos.length ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-4 text-sm text-gray-500">
                No hay turnos extra esta semana.
                <button type="button" className="mt-2 block font-semibold text-brand hover:underline" onClick={() => setDialogo({ modo: "nuevo" })} disabled={!empresas.length}>
                  ＋ Programar uno
                </button>
              </div>
            ) : null}
            <p className="px-1 text-[11.5px] text-gray-500">Al día siguiente cada quien vuelve a su turno normal: el turno extra no cambia su horario.</p>
          </aside>

          {d ? <Detalle d={d} onEditar={() => setDialogo({ modo: "editar" })} onCancelar={() => setCancelando(true)} />
            : elegido ? <section className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500">{detalle.error ? "No se pudo cargar el turno." : "Cargando…"}</section>
              : null}
        </div>
      )}

      <TurnoExtraDialog
        open={Boolean(dialogo)}
        onOpenChange={(v) => { if (!v) setDialogo(null); }}
        empresas={empresas}
        turno={dialogo?.modo === "editar" ? d?.turno : null}
        plantilla={dialogo?.modo === "editar" ? plantilla : null}
        fechaInicial={semana.inicio <= hoyLocal() && hoyLocal() <= semana.fin ? hoyLocal() : semana.inicio}
        onGuardado={guardado}
      />

      <AlertDialog open={cancelando} onOpenChange={setCancelando}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar «{d?.turno?.nombre}»?</AlertDialogTitle>
            <AlertDialogDescription>
              El turno queda como cancelado (no se borra) y se registra quién lo canceló. Las checadas que ya hicieron se quedan en Asistencias.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, volver</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={cancelarTurno}>Sí, cancelar turno</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Detalle({ d, onEditar, onCancelar }) {
  const { turno, personas, resumen } = d;
  const fase = FASES[turno.fase] ?? FASES.programado;
  const activo = turno.estado !== "cancelado";
  const creado = String(turno.creado_en ?? "").replace("T", " ");
  const cuando = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(creado) ? `${textoDia(creado.slice(0, 10)).toLowerCase()} ${creado.slice(11, 16)}` : "";
  return (
    <section className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <div className="min-w-0">
          <Chip tono={fase.tono}>{turno.fase === "en_curso" ? "● " : ""}{fase.texto}</Chip>
          <h2 className="mt-1.5 text-lg font-bold text-gray-900">{turno.nombre}</h2>
          <p className="text-[13px] text-gray-700">
            {textoDia(turno.fecha)} · <b>{turno.hora_inicio} – {turno.hora_fin}</b> ({formatearMinutos(turno.duracion)}) · tolerancia {turno.tolerancia_min} min
            {turno.motivo ? ` · Motivo: ${turno.motivo}` : ""}
          </p>
          <p className="text-xs text-gray-500">
            {turno.creado_por_nombre ? `Programó ${turno.creado_por_nombre}${cuando ? ` el ${cuando}` : ""} · ` : ""}horas autorizadas como extra al programarlas
            {turno.estado === "cancelado" ? ` · Canceló ${turno.cancelado_por_nombre ?? "—"}` : ""}
          </p>
        </div>
        {activo && turno.fase !== "terminado" ? (
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={onEditar}>Editar / agregar personas</Button>
            <Button variant="outline" size="sm" className="border-red-200 text-red-700 hover:bg-red-50" onClick={onCancelar}>Cancelar turno</Button>
          </div>
        ) : null}
      </div>

      <div className="my-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kpi titulo="Personas" valor={resumen.personas} nota={`${resumen.checaron} checaron · ${resumen.sinLlegar} sin llegar`} />
        <Kpi titulo="Horas extra hasta ahora" valor={formatearMinutos(resumen.minutos)} nota="se actualiza con cada checada" />
        <Kpi titulo="Al doble" valor={formatearMinutos(resumen.dobles)} clase="text-emerald-700" />
        <Kpi titulo="Al triple" valor={formatearMinutos(resumen.triples)} clase={resumen.triples ? "text-red-700" : "text-gray-900"} />
      </div>

      <ul className="space-y-2 md:hidden" aria-label="Personas del turno">
        {personas.map((p) => {
          const e = estadoPersona(p.vivo);
          const alertas = p.avisos.filter((a) => a.nivel !== "info");
          return (
            <li key={p.id_empleado} className="rounded-xl border border-gray-200 p-3 text-[13px]">
              <div className="flex items-start justify-between gap-2">
                <b className="text-gray-900">{p.nombre_empleado}</b>
                <Chip tono={e.tono}>{e.texto}</Chip>
              </div>
              <p className="text-xs text-gray-500">
                Turno {p.horario_dia ?? "sin horario"}{p.vivo.salidaAnterior ? ` · salió ${hora(p.vivo.salidaAnterior)}` : ""}
              </p>
              <p className="mt-1 tabular-nums text-gray-700">
                {p.vivo.entrada ? `Entró ${hora(p.vivo.entrada)}${p.vivo.salida ? ` · salió ${hora(p.vivo.salida)}` : ""}` : "Sin checada en este turno"}
                {p.vivo.minutos ? <> · <b>{formatearMinutos(p.vivo.minutos)}</b> (<span className="text-emerald-700">{formatearMinutos(p.vivo.dobles)}</span>{p.vivo.triples ? <> · <span className="text-red-700">{formatearMinutos(p.vivo.triples)} triple</span></> : null})</> : null}
              </p>
              {alertas.length ? <div className="mt-1.5 flex flex-wrap gap-1">{alertas.map((a) => <Chip key={a.codigo} tono={a.nivel === "grave" ? "rojo" : "ambar"}>⚠ {a.mensaje}</Chip>)}</div> : null}
            </li>
          );
        })}
      </ul>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[860px] border-collapse text-[13px] tabular-nums">
          <thead>
            <tr className="bg-gray-50 text-left text-[10.5px] uppercase tracking-wide text-gray-500">
              {["Empleado", "Su turno normal", "Entrada", "Salida", "Tiempo extra", "Doble / triple", "Estado", "Alertas de ley"].map((h) => <th key={h} className="px-2 py-2 font-semibold">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {personas.map((p) => {
              const e = estadoPersona(p.vivo);
              const alertas = p.avisos.filter((a) => a.nivel !== "info");
              return (
                <tr key={p.id_empleado} className="border-t border-gray-100 align-top">
                  <td className="px-2 py-2.5 font-semibold text-gray-900">{p.nombre_empleado}</td>
                  <td className="px-2 py-2.5 text-xs text-gray-500">
                    {p.horario_dia ?? "Sin horario"}{p.vivo.salidaAnterior ? ` (salió ${hora(p.vivo.salidaAnterior)})` : ""}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5">{hora(p.vivo.entrada)}</td>
                  <td className="whitespace-nowrap px-2 py-2.5">{hora(p.vivo.salida)}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 font-semibold">{p.vivo.minutos ? formatearMinutos(p.vivo.minutos) : "—"}</td>
                  <td className="whitespace-nowrap px-2 py-2.5">
                    {p.vivo.minutos ? (
                      <><span className="text-emerald-700">{formatearMinutos(p.vivo.dobles)}</span>
                        {p.vivo.triples ? <> · <span className="text-red-700">{formatearMinutos(p.vivo.triples)}</span></> : null}</>
                    ) : "—"}
                  </td>
                  <td className="px-2 py-2.5"><Chip tono={e.tono}>{e.texto}</Chip></td>
                  <td className="px-2 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {alertas.length ? alertas.map((a) => <Chip key={a.codigo} tono={a.nivel === "grave" ? "rojo" : "ambar"}>⚠ {a.mensaje}</Chip>) : <span className="text-xs text-gray-400">—</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[12.5px] text-gray-700">
        <b>Cómo se ve en el reloj:</b> por ahora el reloj registra estas checadas como siempre y aquí se calcula el turno con ellas
        (desde {turno.tolerancia_min} min antes de las {turno.hora_inicio}). Pronto el reloj las guardará como tramo de turno extra,
        sin abrir un día nuevo ni cerrar su turno; al día siguiente cada quien checa su turno normal.
      </div>
    </section>
  );
}

function Kpi({ titulo, valor, nota, clase = "text-gray-900" }) {
  return (
    <div className="rounded-xl border border-gray-200 px-3 py-2">
      <span className="block text-[10.5px] font-semibold uppercase tracking-wide text-gray-500">{titulo}</span>
      <b className={`text-[19px] ${clase}`}>{valor}</b>
      {nota ? <small className="block text-[11px] text-gray-500">{nota}</small> : null}
    </div>
  );
}
