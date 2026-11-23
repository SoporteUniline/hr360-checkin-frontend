"use client";

// Piezas de citas de entrevista (R3): chip de estado, selector de horarios libres (GET /horarios), tarjeta de la cita y
// sus acciones (confirmar, reagendar, cancelar con motivo, asistió / no asistió). Se usan en «Entrevistas» y en el panel
// del candidato. El API decide; aquí solo se ofrece lo que tiene sentido para el estado de la cita.
import { useEffect, useId, useState } from "react";
import Link from "next/link";
import useSWR, { useSWRConfig } from "swr";
import {
  CalendarClock, CalendarX2, Check, ChevronLeft, ChevronRight, ExternalLink, Loader2, MapPin, MessageCircle, RefreshCw, UserCheck, UserX, Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { mensajeErrorApi } from "@/lib/whatsapp/reglas.mjs";
import { formatearTelefono } from "@/lib/whatsapp/telefono.mjs";
import {
  MENSAJE_AGENDA_SIN_CONFIGURAR, MENSAJE_SIN_MIGRACION_AGENDA, causaSinHorarios, accionesCita, agruparHorarios, diasDeSemana, etiquetaDiaLargo, etiquetaEstadoCita, fechaHoraCorta, horaTexto, sumarDias, textoLugares,
} from "@/lib/whatsapp/agenda.mjs";
import {
  cancelarCita, confirmarCita, marcarAsistencia, obtener, reagendarCita, rutaAgendaVacante, rutaHorarios,
} from "./api";
import AgendaVacante from "./AgendaVacante";
import CalendarioAgenda, { useAncho } from "./CalendarioAgenda";
import { rangoAgenda } from "@/lib/whatsapp/calendario.mjs";
import { CLASE_ENTRADA, DIALOGO_PANTALLA_COMPLETA } from "./controles";

export const TONOS_CITA = {
  azul: "bg-blue-50 text-blue-800 ring-blue-200",
  verde: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  rojo: "bg-red-50 text-red-700 ring-red-200",
  gris: "bg-gray-100 text-gray-600 ring-gray-200",
};

export function ChipEstadoCita({ estado, className = "" }) {
  const e = etiquetaEstadoCita(estado);
  return (
    <span data-estado-cita={estado} className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11.5px] font-semibold ring-1 ring-inset ${TONOS_CITA[e.tono]} ${className}`}>
      {e.texto}
    </span>
  );
}

const esEnlace = (t) => /^https:\/\//i.test(String(t ?? "").trim());
const recargarHorarios = (mutate) => mutate((k) => typeof k === "string" && k.includes("/agenda/horarios"));

// Horarios libres de una vacante, de 7 en 7 días a partir de hoy. Radios agrupados por día; los llenos se ven pero no se eligen.
// Sin horarios se explica la causa: falta la migración (503 SIN_MIGRACION), la agenda de la vacante no está configurada
// («Configurar agenda» abre el editor ahí mismo) o simplemente no hay en estos días («Siguientes»).
// `onEstado(hayLibres)` avisa al diálogo si hay algo que elegir. En modo solo lectura (vista previa del editor) no se
// consulta la agenda: el propio editor la está mostrando.
export function SelectorHorario({ idVacante, hoy, valor, onCambiar, soloLectura = false, onEstado, tituloVacante = "", idEmpresa = null }) {
  const nombre = useId();
  const [desde, setDesde] = useState(hoy);
  const [configurando, setConfigurando] = useState(false);
  useEffect(() => setDesde(hoy), [hoy, idVacante]);
  const clave = rutaHorarios(idVacante, desde, 7);
  const { data, error, isLoading, mutate } = useSWR(clave, obtener, { revalidateOnFocus: false });
  const { data: agenda, error: errorAgenda } = useSWR(!soloLectura && idVacante ? rutaAgendaVacante(idVacante) : null, obtener, { revalidateOnFocus: false, shouldRetryOnError: false });
  const dias = agruparHorarios(data?.horarios);
  // Escritorio: semana tipo Google Calendar con los horarios libres para hacer clic; teléfono: lista por día.
  const ancho = useAncho();
  const conRejilla = ancho && !soloLectura;
  const planos = dias.flatMap((d) => d.horarios);
  const hayLibres = dias.some((d) => d.horarios.some((h) => h.libres > 0));
  const causa = soloLectura ? null : causaSinHorarios({ agenda, errorAgenda, errorHorarios: error });
  const elegible = !causa && !error && !isLoading && hayLibres;
  useEffect(() => { onEstado?.(elegible); }, [elegible, onEstado]);
  if (causa === "sin_migracion") {
    return (
      <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[13px] font-medium text-amber-900" data-sin-horarios="sin_migracion">
        {MENSAJE_SIN_MIGRACION_AGENDA}. Pídele a ADAMIA que la corra; mientras tanto no se pueden agendar entrevistas.
      </p>
    );
  }
  if (causa === "sin_agenda") {
    return (
      <div className="grid justify-items-center gap-2 rounded-lg border border-dashed border-gray-300 p-4 text-center text-[13px] text-gray-700" data-sin-horarios="sin_agenda">
        <p className="font-semibold text-gray-900">{MENSAJE_AGENDA_SIN_CONFIGURAR}</p>
        <p>Activa la agenda y define los días y horas en que entrevistas para que aparezcan horarios.</p>
        <Button type="button" variant="outline" onClick={() => setConfigurando(true)} className="min-h-11 md:min-h-9" startIcon={<CalendarClock className="size-4 text-blue-600" />}>
          Configurar agenda
        </Button>
        <AgendaVacante abierto={configurando} onCambiar={setConfigurando} idVacante={idVacante} titulo={tituloVacante} idEmpresa={idEmpresa} />
      </div>
    );
  }
  return (
    <div className="grid gap-3" data-selector-horario={idVacante} aria-busy={isLoading}>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setDesde(sumarDias(desde, -7))} disabled={!desde || desde <= hoy}
          className="min-h-11 md:min-h-8" startIcon={<ChevronLeft className="size-4" />}>Anteriores</Button>
        <p className="min-w-0 flex-1 text-center text-[13px] font-medium text-gray-700">
          {desde === hoy ? "Próximos 7 días" : `Del ${etiquetaDiaLargo(desde)} en adelante`}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={() => setDesde(sumarDias(desde, 7))}
          className="min-h-11 md:min-h-8" endIcon={<ChevronRight className="size-4" />}>Siguientes</Button>
      </div>
      {error ? (
        <div role="alert" className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-900">
          <span className="min-w-0 flex-1">{mensajeErrorApi(error, "No se pudieron consultar los horarios.")}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => mutate()} className="min-h-11 md:min-h-8" startIcon={<RefreshCw className="size-4" />}>Reintentar</Button>
        </div>
      ) : isLoading ? (
        <p className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="size-4 animate-spin" /> Buscando horarios…</p>
      ) : !dias.length ? (
        <p className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-[13px] text-gray-600" data-sin-horarios="vacio">
          No hay horarios en estos días. Revisa la agenda de la vacante (horario, bloqueos y anticipación) o mira los siguientes días.
        </p>
      ) : conRejilla ? (
        <div className="grid gap-2">
          {!hayLibres ? <p className="text-[13px] font-medium text-amber-900">Todos los horarios de estos días están llenos.</p> : null}
          <CalendarioAgenda dias={diasDeSemana(desde)} hoy={hoy} horarios={planos} {...rangoAgenda([], planos)} altoHora={88} marca="data-calendario-horarios"
            maxAlto="min(52dvh, 30rem)" modoElegir seleccionado={valor} onHorario={(h) => onCambiar?.(h.inicio)} etiquetaGrupo="Horarios libres" />
        </div>
      ) : (
        <div className="grid gap-3">
          {!hayLibres && !soloLectura ? <p className="text-[13px] font-medium text-amber-900">Todos los horarios de estos días están llenos.</p> : null}
          {dias.map((d) => (
            <fieldset key={d.clave} className="grid gap-1.5" data-dia-horarios={d.clave}>
              <legend className="mb-1 text-[13px] font-semibold text-gray-800 first-letter:uppercase">{etiquetaDiaLargo(d.clave, hoy)}</legend>
              <div className="flex flex-wrap gap-1.5">
                {d.horarios.map((h) => {
                  const lleno = h.libres <= 0;
                  const lugares = textoLugares(h.libres, h.capacidad);
                  const contenido = (
                    <>
                      <span className="font-semibold tabular-nums">{horaTexto(h.inicio)}</span>
                      <span className={`text-[11.5px] ${lleno ? "text-gray-500" : "text-emerald-700"}`}>{lugares}</span>
                    </>
                  );
                  if (soloLectura) {
                    return (
                      <span key={h.inicio} data-horario={h.inicio} data-ocupados={h.ocupados} data-capacidad={h.capacidad}
                        className={`relative inline-flex min-h-9 flex-col justify-center rounded-lg border px-2.5 py-1 text-[12.5px] leading-tight ${lleno ? "border-gray-200 bg-gray-50 text-gray-500" : "border-emerald-200 bg-emerald-50/60 text-gray-800"}`}>
                        {contenido}
                        <span className="sr-only">{`, ${h.ocupados} de ${h.capacidad} ocupados`}</span>
                      </span>
                    );
                  }
                  return (
                    <label key={h.inicio} data-horario={h.inicio}
                      className={`relative inline-flex min-h-11 cursor-pointer flex-col justify-center rounded-lg border px-3 py-1 text-[13px] leading-tight md:min-h-10 ${
                        lleno ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400" : "border-gray-300 bg-white text-gray-800 hover:border-emerald-400 has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50 has-[:checked]:ring-2 has-[:checked]:ring-emerald-200"
                      } has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-300`}>
                      <input type="radio" name={nombre} value={h.inicio} checked={valor === h.inicio} disabled={lleno} onChange={() => onCambiar?.(h.inicio)}
                        aria-label={`${horaTexto(h.inicio)}, ${lugares}`} className="sr-only" />
                      {contenido}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
      )}
    </div>
  );
}

// Diálogo para elegir un horario (agendar o reagendar). `onConfirmar(inicio)` lanza el error del API; 409 WA_SIN_CUPO refresca.
// «Agendar» queda deshabilitado mientras no haya horarios libres; «Elige un horario.» solo sale si se pulsa sin elegir.
export function DialogoHorario({ abierto, onCambiar, titulo, descripcion, idVacante, hoy, textoBoton, onConfirmar, tituloVacante = "", idEmpresa = null }) {
  const { mutate } = useSWRConfig();
  const [inicio, setInicio] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [hayLibres, setHayLibres] = useState(false);
  useEffect(() => {
    if (!abierto) { setInicio(""); setAviso(""); setHayLibres(false); }
  }, [abierto]);
  const confirmar = async () => {
    if (!inicio) { setAviso("Elige un horario."); return; }
    setGuardando(true);
    setAviso("");
    try {
      await onConfirmar(inicio);
      recargarHorarios(mutate);
      onCambiar(false);
    } catch (e) {
      setAviso(mensajeErrorApi(e, "No se pudo guardar la cita."));
      if (e?.response?.status === 409) { setInicio(""); recargarHorarios(mutate); }
    } finally {
      setGuardando(false);
    }
  };
  return (
    <Dialog open={abierto} onOpenChange={(v) => { if (!guardando) onCambiar(v); }}>
      <DialogContent className={`${DIALOGO_PANTALLA_COMPLETA} sm:max-w-xl md:max-w-4xl`}>
        <DialogHeader className="border-b border-gray-200 px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))] pr-14 text-left">
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>
        <div className="relative min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {abierto ? <SelectorHorario idVacante={idVacante} hoy={hoy} valor={inicio} onCambiar={(v) => { setInicio(v); setAviso(""); }}
            onEstado={setHayLibres} tituloVacante={tituloVacante} idEmpresa={idEmpresa} /> : null}
        </div>
        <div className="grid gap-2 border-t border-gray-200 bg-white px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          {aviso ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-[13px] text-red-800">{aviso}</p> : null}
          <div className="flex items-center justify-end gap-2">
            {inicio ? <span className="mr-auto hidden text-[13px] font-medium text-gray-700 sm:inline">{fechaHoraCorta(inicio)}</span> : null}
            <Button type="button" variant="outline" onClick={() => onCambiar(false)} disabled={guardando} className="min-h-11 flex-1 sm:flex-none md:min-h-9">Cancelar</Button>
            <Button type="button" onClick={confirmar} loading={guardando} disabled={!hayLibres && !inicio} className="min-h-11 flex-1 sm:flex-none md:min-h-9">{textoBoton}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DialogoCancelar({ abierto, onCambiar, cita, onConfirmar }) {
  const id = useId();
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  useEffect(() => { if (!abierto) { setMotivo(""); setError(""); } }, [abierto]);
  const confirmar = async (e) => {
    e.preventDefault();
    const limpio = motivo.trim();
    if (!limpio) { setError("Escribe el motivo; se guarda en el historial de la cita."); return; }
    setGuardando(true);
    setError("");
    try {
      await onConfirmar(limpio);
      onCambiar(false);
    } catch (err) {
      setError(mensajeErrorApi(err, "No se pudo cancelar la cita."));
    } finally {
      setGuardando(false);
    }
  };
  return (
    <Dialog open={abierto} onOpenChange={(v) => { if (!guardando) onCambiar(v); }}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancelar entrevista</DialogTitle>
          <DialogDescription>
            {cita ? `${cita.candidato?.nombre || "El candidato"} · ${fechaHoraCorta(cita.inicio)}. ` : ""}El horario queda libre para otro candidato.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={confirmar} noValidate className="grid gap-3">
          <label htmlFor={id} className="text-sm font-semibold text-gray-800">Motivo</label>
          <textarea id={id} rows={3} maxLength={300} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej.: El candidato avisó que ya no puede asistir."
            aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} className={`${CLASE_ENTRADA} py-2`} />
          {error ? <p id={`${id}-error`} role="alert" className="text-[12.5px] font-medium text-red-700">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onCambiar(false)} disabled={guardando} className="min-h-11 flex-1 sm:flex-none md:min-h-9">Volver</Button>
            <Button type="submit" variant="destructive" loading={guardando} className="min-h-11 flex-1 sm:flex-none md:min-h-9">Cancelar entrevista</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Botones de la cita. `onCambio(cita)` recibe la cita que devuelve el API (o null si no la manda) para refrescar.
export function AccionesCita({ cita, hoy, onCambio, conChat = false }) {
  const [reagendando, setReagendando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [ocupado, setOcupado] = useState("");
  const [aviso, setAviso] = useState("");
  const a = accionesCita(cita, hoy);
  const quien = cita?.candidato?.nombre || "el candidato";
  const correr = async (clave, fn) => {
    setOcupado(clave);
    setAviso("");
    try {
      const r = await fn();
      await onCambio?.(r?.cita ?? null);
    } catch (e) {
      setAviso(mensajeErrorApi(e, "No se pudo actualizar la cita."));
    } finally {
      setOcupado("");
    }
  };
  const boton = "min-h-11 md:min-h-8";
  if (!a.confirmar && !a.reagendar && !a.cancelar && !a.asistencia && !(conChat && cita?.id_conversacion)) return null;
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Acciones de la cita de ${quien}`}>
        {a.confirmar ? (
          <Button type="button" size="sm" variant="outline" onClick={() => correr("confirmar", () => confirmarCita(cita.id))} loading={ocupado === "confirmar"} disabled={!!ocupado}
            className={boton} startIcon={<Check className="size-4 text-emerald-600" />}>Confirmar</Button>
        ) : null}
        {a.asistencia ? (
          <>
            <Button type="button" size="sm" variant="outline" onClick={() => correr("asistio", () => marcarAsistencia(cita.id, true))} loading={ocupado === "asistio"} disabled={!!ocupado}
              className={boton} startIcon={<UserCheck className="size-4 text-emerald-600" />}>Asistió</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => correr("no_asistio", () => marcarAsistencia(cita.id, false))} loading={ocupado === "no_asistio"} disabled={!!ocupado}
              className={boton} startIcon={<UserX className="size-4 text-red-600" />}>No asistió</Button>
          </>
        ) : null}
        {a.reagendar ? (
          <Button type="button" size="sm" variant="outline" onClick={() => setReagendando(true)} disabled={!!ocupado} className={boton}
            startIcon={<CalendarClock className="size-4 text-blue-600" />}>Reagendar</Button>
        ) : null}
        {a.cancelar ? (
          <Button type="button" size="sm" variant="outline" onClick={() => setCancelando(true)} disabled={!!ocupado} className={`${boton} text-red-700 hover:text-red-800`}
            startIcon={<CalendarX2 className="size-4" />}>Cancelar</Button>
        ) : null}
        {conChat && cita?.id_conversacion ? (
          <Button asChild size="sm" variant="ghost" className={`${boton} text-emerald-700`}>
            <Link href={`/panel/whatsapp?c=${encodeURIComponent(cita.id_conversacion)}`}><MessageCircle className="size-4" /> Abrir chat</Link>
          </Button>
        ) : null}
      </div>
      {aviso ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-2 text-[12.5px] text-red-800">{aviso}</p> : null}
      {a.reagendar ? (
        <DialogoHorario abierto={reagendando} onCambiar={setReagendando} titulo="Reagendar entrevista" textoBoton="Reagendar"
          descripcion={`${cita.candidato?.nombre || "Candidato"} · ${cita.vacante?.titulo || "vacante"}. Ahora: ${fechaHoraCorta(cita.inicio)}. El agente le avisa del cambio por WhatsApp.`}
          idVacante={cita.vacante?.id_vacante} hoy={hoy} tituloVacante={cita.vacante?.titulo || ""} idEmpresa={cita.id_empresa ?? null}
          onConfirmar={async (inicio) => { const r = await reagendarCita(cita.id, inicio); await onCambio?.(r?.cita ?? null); }} />
      ) : null}
      {a.cancelar ? (
        <DialogoCancelar abierto={cancelando} onCambiar={setCancelando} cita={cita}
          onConfirmar={async (motivo) => { const r = await cancelarCita(cita.id, motivo); await onCambio?.(r?.cita ?? null); }} />
      ) : null}
    </div>
  );
}

// Tarjeta de una cita: candidato, vacante, hora, lugar o enlace y estado; con acciones opcionales.
export function TarjetaCita({ cita, hoy, onCambio, conChat = false, conCandidato = true, className = "" }) {
  const lugar = String(cita?.lugar ?? "").trim();
  const video = cita?.modalidad === "video" || esEnlace(lugar);
  const cancelada = cita?.estado === "cancelada";
  return (
    <article aria-label={`Entrevista de ${cita?.candidato?.nombre || "candidato"} ${fechaHoraCorta(cita?.inicio)}`} data-cita={cita?.id}
      className={`grid gap-2 rounded-xl border border-gray-200 bg-white p-3 ${cancelada ? "opacity-75" : ""} ${className}`}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className={`text-[14px] font-bold tabular-nums text-gray-900 ${cancelada ? "line-through" : ""}`}>
            {horaTexto(cita?.inicio)}{cita?.fin ? ` – ${horaTexto(cita.fin)}` : ""}
          </p>
          {conCandidato ? (
            <p className="truncate text-[14px] font-semibold text-gray-800">{cita?.candidato?.nombre || (cita?.candidato?.telefono ? formatearTelefono(cita.candidato.telefono) : "Candidato")}</p>
          ) : null}
          <p className="truncate text-[12.5px] text-gray-600">{cita?.vacante?.titulo || "Sin vacante"}</p>
        </div>
        <ChipEstadoCita estado={cita?.estado} />
      </div>
      {lugar ? (
        <p className="flex min-w-0 items-start gap-1.5 text-[12.5px] text-gray-700">
          {video ? <Video className="mt-0.5 size-4 shrink-0 text-blue-600" aria-hidden="true" /> : <MapPin className="mt-0.5 size-4 shrink-0 text-gray-500" aria-hidden="true" />}
          {esEnlace(lugar) ? (
            <a href={lugar} target="_blank" rel="noopener noreferrer" className="inline-flex min-w-0 items-center gap-1 font-medium text-blue-700 underline underline-offset-2">
              <span className="truncate">{lugar}</span><ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
            </a>
          ) : (
            <span className="min-w-0 [overflow-wrap:anywhere]">{lugar}</span>
          )}
        </p>
      ) : null}
      {onCambio ? <AccionesCita cita={cita} hoy={hoy} onCambio={onCambio} conChat={conChat} /> : null}
    </article>
  );
}
