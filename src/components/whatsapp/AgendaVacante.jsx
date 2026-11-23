"use client";

// «Agenda» de una vacante (R3): dónde y cuándo entrevista, cuántas personas caben por horario, horario semanal con
// varios rangos por día, bloqueos y valores propios que ganan a los de la empresa (vacío = «Usar el de la empresa»).
// GET/PUT /vacantes/:id/agenda. Abajo, vista previa de los próximos 7 días (GET /horarios) con lo guardado.
// En escritorio es un diálogo; en teléfono ocupa toda la pantalla.
import { useEffect, useId, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { CalendarOff, Copy, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DIAS } from "@/lib/whatsapp/entrevista.mjs";
import { mensajeErrorApi } from "@/lib/whatsapp/reglas.mjs";
import {
  LIMITES_EMPRESA, LIMITES_VACANTE, MODOS_AGENDA, agendaVacanteDesdeApi, bloqueoNuevo, copiarDiaATodos, horasDesdeMinutos, hoyMx, rangoNuevo,
  textoModoAgenda, validarAgendaVacante,
} from "@/lib/whatsapp/agenda.mjs";
import { guardarAgendaVacante, obtener, rutaAgendaEmpresa, rutaAgendaVacante } from "./api";
import { AvisoSinGuardar, CLASE_ENTRADA, Campo, DIALOGO_PANTALLA_COMPLETA, Interruptor, describir } from "./controles";
import { SelectorHorario } from "./citas";

const enfocar = (selector) => requestAnimationFrame(() => document.querySelector(selector)?.focus());

function Bloque({ titulo, ayuda, children, id }) {
  return (
    <section aria-labelledby={id} className="grid gap-3 rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
      <div className="grid gap-0.5">
        <h3 id={id} className="text-[15px] font-bold text-gray-900">{titulo}</h3>
        {ayuda ? <p className="text-[12.5px] text-gray-600">{ayuda}</p> : null}
      </div>
      {children}
    </section>
  );
}

function HorarioSemanal({ horario, onCambiar, errores = {} }) {
  const cambiarDia = (clave, rangos) => onCambiar({ ...horario, [clave]: rangos });
  return (
    <div className="grid gap-2">
      <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200" aria-label="Horario semanal">
        {DIAS.map(({ clave, texto }) => {
          const rangos = horario[clave] ?? [];
          const error = errores[clave];
          return (
            <li key={clave} data-dia={clave} className="grid gap-2 px-3 py-2.5 sm:grid-cols-[7rem_minmax(0,1fr)] sm:items-start">
              <p className="pt-0 text-sm font-semibold text-gray-800 sm:pt-2">{texto}</p>
              <div className="grid min-w-0 gap-2">
                {rangos.length ? rangos.map((r, i) => (
                  <div key={r.clave} className="flex min-w-0 items-center gap-2" data-rango={`${clave}-${i + 1}`}>
                    <input type="time" aria-label={`${texto}, horario ${i + 1}: desde`} value={r.desde}
                      onChange={(e) => cambiarDia(clave, rangos.map((x) => (x.clave === r.clave ? { ...x, desde: e.target.value } : x)))}
                      aria-invalid={error ? true : undefined} className={`${CLASE_ENTRADA} h-11 min-w-0 flex-1 px-2 sm:max-w-[9rem] md:h-9`} />
                    <span className="text-sm text-gray-500">a</span>
                    <input type="time" aria-label={`${texto}, horario ${i + 1}: hasta`} value={r.hasta}
                      onChange={(e) => cambiarDia(clave, rangos.map((x) => (x.clave === r.clave ? { ...x, hasta: e.target.value } : x)))}
                      aria-invalid={error ? true : undefined} className={`${CLASE_ENTRADA} h-11 min-w-0 flex-1 px-2 sm:max-w-[9rem] md:h-9`} />
                    <button type="button" onClick={() => cambiarDia(clave, rangos.filter((x) => x.clave !== r.clave))} aria-label={`Quitar horario ${i + 1} del ${texto.toLowerCase()}`}
                      className="grid size-11 shrink-0 place-items-center rounded-lg text-red-600 hover:bg-red-50 md:size-9"><Trash2 className="size-4" /></button>
                  </div>
                )) : <p className="text-sm text-gray-500 sm:pt-2">Sin entrevistas</p>}
                <div className="flex flex-wrap gap-1.5">
                  <Button type="button" variant="outline" size="sm" onClick={() => cambiarDia(clave, [...rangos, rangoNuevo(rangos[rangos.length - 1])])}
                    disabled={rangos.length >= LIMITES_VACANTE.rangosPorDia} aria-label={`Agregar horario al ${texto.toLowerCase()}`}
                    className="min-h-11 md:min-h-8" startIcon={<Plus className="size-4" />}>Agregar horario</Button>
                  {rangos.length ? (
                    <Button type="button" variant="ghost" size="sm" onClick={() => onCambiar(copiarDiaATodos(horario, clave))} aria-label={`Copiar horario del ${texto.toLowerCase()} a todos los días`}
                      className="min-h-11 md:min-h-8" startIcon={<Copy className="size-4" />}>Copiar a todos</Button>
                  ) : null}
                </div>
                {error ? <p className="text-[12.5px] font-medium text-red-700">{error}</p> : null}
              </div>
            </li>
          );
        })}
      </ul>
      {errores.general ? <p role="alert" className="text-[12.5px] font-medium text-red-700">{errores.general}</p> : null}
    </div>
  );
}

function Bloqueos({ bloqueos, onCambiar, errores = {}, hoy }) {
  return (
    <div className="grid gap-2">
      {bloqueos.length ? (
        <ul className="grid gap-2" aria-label="Bloqueos">
          {bloqueos.map((b, i) => {
            const error = errores[b.clave];
            const cambiar = (campo, valor) => onCambiar(bloqueos.map((x) => (x.clave === b.clave ? { ...x, [campo]: valor } : x)));
            return (
              <li key={b.clave} data-bloqueo={i + 1} className="grid gap-2 rounded-lg border border-gray-200 p-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto] sm:items-end">
                <label className="grid min-w-0 gap-1 text-[12.5px] font-medium text-gray-700">Desde
                  <input type="datetime-local" value={b.desde} onChange={(e) => cambiar("desde", e.target.value)} aria-label={`Bloqueo ${i + 1}: desde`}
                    aria-invalid={error ? true : undefined} className={`${CLASE_ENTRADA} h-11 px-2 md:h-9`} />
                </label>
                <label className="grid min-w-0 gap-1 text-[12.5px] font-medium text-gray-700">Hasta
                  <input type="datetime-local" value={b.hasta} onChange={(e) => cambiar("hasta", e.target.value)} aria-label={`Bloqueo ${i + 1}: hasta`}
                    aria-invalid={error ? true : undefined} className={`${CLASE_ENTRADA} h-11 px-2 md:h-9`} />
                </label>
                <label className="grid min-w-0 gap-1 text-[12.5px] font-medium text-gray-700">Motivo (opcional)
                  <input value={b.motivo} maxLength={LIMITES_VACANTE.motivo} onChange={(e) => cambiar("motivo", e.target.value)} aria-label={`Bloqueo ${i + 1}: motivo`}
                    placeholder="Ej.: Día festivo" className={`${CLASE_ENTRADA} h-11 md:h-9`} />
                </label>
                <button type="button" onClick={() => onCambiar(bloqueos.filter((x) => x.clave !== b.clave))} aria-label={`Quitar bloqueo ${i + 1}`}
                  className="grid size-11 place-items-center justify-self-end rounded-lg text-red-600 hover:bg-red-50 md:size-9"><Trash2 className="size-4" /></button>
                {error ? <p className="text-[12.5px] font-medium text-red-700 sm:col-span-4">{error}</p> : null}
              </li>
            );
          })}
        </ul>
      ) : <p className="text-sm text-gray-500">Sin bloqueos. Agrega días u horas en los que no se entrevista (festivos, juntas, vacaciones).</p>}
      <div>
        <Button type="button" variant="outline" onClick={() => onCambiar([...bloqueos, bloqueoNuevo(hoy)])} disabled={bloqueos.length >= LIMITES_VACANTE.bloqueos}
          className="min-h-11 md:min-h-9" startIcon={<CalendarOff className="size-4" />}>Agregar bloqueo</Button>
      </div>
    </div>
  );
}

// Número propio de la vacante o «Usar el de la empresa» (interruptor encendido = hereda; muestra el valor heredado).
function ValorPropio({ id, etiqueta, usaEmpresa, onUsaEmpresa, valor, onValor, heredado, sufijo, error, ayuda }) {
  return (
    <div className="grid gap-1.5" data-valor-propio={id}>
      <p className="text-sm font-semibold text-gray-800">{etiqueta}</p>
      <Interruptor activo={usaEmpresa} onCambiar={onUsaEmpresa} aria-label={`Usar el de la empresa (${etiqueta.toLowerCase()})`}>
        Usar el de la empresa{heredado ? <span className="font-normal text-gray-500"> ({heredado})</span> : null}
      </Interruptor>
      {!usaEmpresa ? (
        <div className="flex items-center gap-2">
          <input id={id} inputMode="decimal" value={valor} onChange={(e) => onValor(e.target.value)} aria-label={etiqueta}
            aria-invalid={error ? true : undefined} aria-describedby={describir(id, { ayuda: !!ayuda, error })} className={`${CLASE_ENTRADA.replace("w-full ", "")} h-11 w-28 md:h-9`} />
          <span className="text-sm text-gray-600">{sufijo}</span>
        </div>
      ) : null}
      {ayuda && !usaEmpresa ? <p id={`${id}-ayuda`} className="text-[12.5px] text-gray-500">{ayuda}</p> : null}
      {error ? <p id={`${id}-error`} className="text-[12.5px] font-medium text-red-700">{error}</p> : null}
    </div>
  );
}

export default function AgendaVacante({ abierto, onCambiar, idVacante, titulo, idEmpresa }) {
  const ids = useId();
  const id = (s) => `${ids}-${s}`;
  const { mutate: mutarGlobal } = useSWRConfig();
  const { data, error, isLoading, mutate } = useSWR(abierto ? rutaAgendaVacante(idVacante) : null, obtener, { revalidateOnFocus: false });
  const { data: empresa } = useSWR(abierto ? rutaAgendaEmpresa(idEmpresa) : null, obtener, { revalidateOnFocus: false, shouldRetryOnError: false });
  const [form, setForm] = useState(null);
  const inicial = useRef("");
  const [errores, setErrores] = useState({});
  const [errorApi, setErrorApi] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [confirmarSalida, setConfirmarSalida] = useState(false);
  const [anuncio, setAnuncio] = useState("");
  const hoy = hoyMx();

  useEffect(() => {
    if (!abierto) { setForm(null); setErrores({}); setErrorApi(""); setConfirmarSalida(false); setAnuncio(""); return; }
    if (data && !form) {
      const f = agendaVacanteDesdeApi(data);
      inicial.current = JSON.stringify(f);
      setForm(f);
    }
  }, [abierto, data, form]);
  const sucio = !!form && JSON.stringify(form) !== inicial.current;
  const cambiarAbierto = (v) => {
    if (!v && sucio && !guardando) { setConfirmarSalida(true); return; }
    onCambiar(v);
  };
  const actualizar = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));

  const guardar = async (e) => {
    e.preventDefault();
    const r = validarAgendaVacante(form);
    setErrores(r.errores);
    setErrorApi("");
    setAnuncio("");
    if (!r.valido) { enfocar("[data-agenda-vacante] [aria-invalid=true]"); return; }
    setGuardando(true);
    try {
      const guardado = await guardarAgendaVacante(idVacante, r.cuerpo);
      const nuevo = guardado && typeof guardado === "object" && "activa" in guardado ? guardado : r.cuerpo;
      await mutate(nuevo, { revalidate: false });
      const f = agendaVacanteDesdeApi(nuevo);
      inicial.current = JSON.stringify(f);
      setForm(f);
      // La vista previa se vuelve a pedir con lo guardado.
      mutarGlobal((k) => typeof k === "string" && k.includes(`/vacantes/${idVacante}/agenda/horarios`));
      setAnuncio("Agenda guardada. La vista previa ya muestra los horarios nuevos.");
    } catch (err) {
      setErrorApi(mensajeErrorApi(err, "No se pudo guardar la agenda de la vacante."));
    } finally {
      setGuardando(false);
    }
  };

  const textoEmpresaModo = empresa?.quien_agenda ? textoModoAgenda(empresa.quien_agenda) : "";
  const anticipacionEmpresa = empresa?.anticipacion_min_minutos != null ? `${horasDesdeMinutos(empresa.anticipacion_min_minutos)} h` : "";
  const diasEmpresa = empresa?.dias_adelante != null ? `${empresa.dias_adelante} días` : "";

  return (
    <Dialog open={abierto} onOpenChange={cambiarAbierto}>
      <DialogContent className={`${DIALOGO_PANTALLA_COMPLETA} sm:max-w-3xl`}>
        <DialogHeader className="border-b border-gray-200 px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))] pr-14 text-left">
          <DialogTitle>Agenda de entrevistas</DialogTitle>
          <DialogDescription>
            {titulo ? <>Vacante «{titulo}». </> : null}
            Dónde y cuándo entrevistas; el agente solo ofrece horarios libres de esta agenda.
          </DialogDescription>
        </DialogHeader>
        {error && !form ? (
          <div role="alert" className="m-5 flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <span className="flex-1">{mensajeErrorApi(error, "No se pudo cargar la agenda de la vacante.")}</span>
            <Button type="button" variant="outline" onClick={() => mutate()} className="min-h-11 md:min-h-9" startIcon={<RefreshCw className="size-4" />}>Reintentar</Button>
          </div>
        ) : !form ? (
          <p className="flex items-center gap-2 p-5 text-sm text-gray-500" aria-busy={isLoading}><Loader2 className="size-4 animate-spin" /> Cargando agenda…</p>
        ) : (
          <form onSubmit={guardar} noValidate data-agenda-vacante className="flex min-h-0 flex-1 flex-col">
            <div className="relative grid min-h-0 flex-1 content-start gap-3 overflow-y-auto bg-gray-50 px-4 py-4 sm:px-5">
              <div className="grid gap-1 rounded-xl border border-gray-200 bg-white p-3">
                <Interruptor activo={form.activa} onCambiar={(v) => actualizar("activa", v)}>Agenda activa</Interruptor>
                <p className="text-[12.5px] text-gray-600">
                  {form.activa ? "El agente ofrece horarios de esta agenda a los candidatos de la vacante." : "Apagada: el agente entrevista pero no ofrece horarios; tú agendas a mano desde la conversación."}
                </p>
              </div>
              <Bloque id={id("donde")} titulo="Dónde y con quién">
                <fieldset className="grid gap-1.5">
                  <legend className="mb-1 text-sm font-semibold text-gray-800">Modalidad</legend>
                  <div className="grid grid-cols-2 gap-2 sm:w-fit">
                    {[{ v: "presencial", t: "Presencial" }, { v: "video", t: "Videollamada" }].map((m) => (
                      <label key={m.v} className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50 has-[:checked]:text-emerald-900 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-300 md:min-h-9">
                        <input type="radio" name={id("modalidad")} value={m.v} checked={form.modalidad === m.v} onChange={() => actualizar("modalidad", m.v)} className="size-4 accent-emerald-600" />
                        {m.t}
                      </label>
                    ))}
                  </div>
                </fieldset>
                {form.modalidad === "presencial" ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Campo id={id("direccion")} etiqueta="Dirección" error={errores.direccion}>
                      <input id={id("direccion")} value={form.direccion} maxLength={LIMITES_VACANTE.texto} onChange={(e) => actualizar("direccion", e.target.value)} placeholder="Ej.: Av. Industrial 120, Apodaca, N.L."
                        aria-invalid={errores.direccion ? true : undefined} aria-describedby={describir(id("direccion"), { error: errores.direccion })} className={`${CLASE_ENTRADA} h-11 md:h-9`} />
                    </Campo>
                    <Campo id={id("referencia")} etiqueta="Referencia (opcional)" error={errores.referencia}>
                      <input id={id("referencia")} value={form.referencia} maxLength={LIMITES_VACANTE.texto} onChange={(e) => actualizar("referencia", e.target.value)} placeholder="Ej.: Entrada por la puerta 3, pregunta en caseta."
                        className={`${CLASE_ENTRADA} h-11 md:h-9`} />
                    </Campo>
                  </div>
                ) : (
                  <Campo id={id("enlace")} etiqueta="Enlace de la videollamada" ayuda="Meet, Zoom, Teams… El agente lo manda al confirmar la cita." error={errores.enlace_video}>
                    <input id={id("enlace")} type="url" inputMode="url" value={form.enlace_video} onChange={(e) => actualizar("enlace_video", e.target.value)} placeholder="https://meet.google.com/…"
                      aria-invalid={errores.enlace_video ? true : undefined} aria-describedby={describir(id("enlace"), { ayuda: true, error: errores.enlace_video })} className={`${CLASE_ENTRADA} h-11 md:h-9`} />
                  </Campo>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <Campo id={id("entrevistador")} etiqueta="Entrevistador (opcional)" error={errores.entrevistador}>
                    <input id={id("entrevistador")} value={form.entrevistador} maxLength={LIMITES_VACANTE.texto} onChange={(e) => actualizar("entrevistador", e.target.value)} placeholder="Ej.: Laura Gómez, Recursos Humanos"
                      className={`${CLASE_ENTRADA} h-11 md:h-9`} />
                  </Campo>
                  <Campo id={id("llevar")} etiqueta="Qué llevar (opcional)" error={errores.que_llevar}>
                    <input id={id("llevar")} value={form.que_llevar} maxLength={LIMITES_VACANTE.texto} onChange={(e) => actualizar("que_llevar", e.target.value)} placeholder="Ej.: INE, CV impreso y pluma"
                      className={`${CLASE_ENTRADA} h-11 md:h-9`} />
                  </Campo>
                </div>
              </Bloque>
              <Bloque id={id("cupo")} titulo="Duración y cupo">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Campo id={id("duracion")} etiqueta="Duración de cada entrevista (minutos)" ayuda={`De ${LIMITES_VACANTE.duracion.min} a ${LIMITES_VACANTE.duracion.max} min. Cada horario dura esto.`} error={errores.duracion_minutos}>
                    <input id={id("duracion")} inputMode="numeric" value={form.duracion_minutos} onChange={(e) => actualizar("duracion_minutos", e.target.value)}
                      aria-invalid={errores.duracion_minutos ? true : undefined} aria-describedby={describir(id("duracion"), { ayuda: true, error: errores.duracion_minutos })} className={`${CLASE_ENTRADA} h-11 md:h-9`} />
                  </Campo>
                  <Campo id={id("personas")} etiqueta="Personas por horario" ayuda="Cuántos candidatos pueden venir al mismo horario (1 = entrevista individual)." error={errores.cupo_por_horario}>
                    <input id={id("personas")} inputMode="numeric" value={form.cupo_por_horario} onChange={(e) => actualizar("cupo_por_horario", e.target.value)}
                      aria-invalid={errores.cupo_por_horario ? true : undefined} aria-describedby={describir(id("personas"), { ayuda: true, error: errores.cupo_por_horario })} className={`${CLASE_ENTRADA} h-11 md:h-9`} />
                  </Campo>
                </div>
              </Bloque>
              <Bloque id={id("horario")} titulo="Horario semanal" ayuda="Puedes tener varios horarios por día (ej.: 9:00 a 13:00 y 15:00 a 18:00).">
                <HorarioSemanal horario={form.horario} onCambiar={(v) => actualizar("horario", v)} errores={errores.horario} />
              </Bloque>
              <Bloque id={id("bloqueos")} titulo="Bloqueos" ayuda="Fechas y horas en las que no se agenda aunque estén en el horario.">
                <Bloqueos bloqueos={form.bloqueos} onCambiar={(v) => actualizar("bloqueos", v)} errores={errores.bloqueos} hoy={hoy} />
                {errores.bloqueos_general ? <p role="alert" className="text-[12.5px] font-medium text-red-700">{errores.bloqueos_general}</p> : null}
              </Bloque>
              <Bloque id={id("reglas")} titulo="Reglas de esta vacante" ayuda="Si no cambias nada, se usan las de «Agente → Agenda y recordatorios».">
                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold text-gray-800">¿A quién le ofrece horarios?</span>
                  <select value={form.quien_agenda} onChange={(e) => actualizar("quien_agenda", e.target.value)} className={`${CLASE_ENTRADA} h-11 md:h-9`}>
                    <option value="">Usar el de la empresa{textoEmpresaModo ? ` (${textoEmpresaModo})` : ""}</option>
                    {MODOS_AGENDA.map((m) => <option key={m.valor} value={m.valor}>{m.titulo}</option>)}
                  </select>
                  {form.quien_agenda ? <span className="text-[12.5px] text-gray-600">{MODOS_AGENDA.find((m) => m.valor === form.quien_agenda)?.texto}</span> : null}
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <ValorPropio id={id("anticipacion")} etiqueta="Anticipación mínima" usaEmpresa={form.usa_anticipacion_empresa} onUsaEmpresa={(v) => actualizar("usa_anticipacion_empresa", v)}
                    valor={form.anticipacion_horas} onValor={(v) => actualizar("anticipacion_horas", v)} heredado={anticipacionEmpresa} sufijo="horas" error={errores.anticipacion_horas}
                    ayuda={`De 0 a ${LIMITES_EMPRESA.anticipacionHoras} h.`} />
                  <ValorPropio id={id("dias")} etiqueta="Días hacia adelante" usaEmpresa={form.usa_dias_empresa} onUsaEmpresa={(v) => actualizar("usa_dias_empresa", v)}
                    valor={form.dias_adelante} onValor={(v) => actualizar("dias_adelante", v)} heredado={diasEmpresa} sufijo="días" error={errores.dias_adelante}
                    ayuda={`De ${LIMITES_EMPRESA.dias.min} a ${LIMITES_EMPRESA.dias.max} días.`} />
                </div>
              </Bloque>
              <Bloque id={id("vista")} titulo="Vista previa: horarios de los próximos 7 días" ayuda="Así ve el agente la agenda guardada: cada horario con su cupo y cuántos ya están ocupados.">
                {sucio ? <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[12.5px] text-amber-900">Tienes cambios sin guardar: guarda para ver su efecto aquí.</p> : null}
                <div data-vista-horarios>
                  <SelectorHorario idVacante={idVacante} hoy={hoy} soloLectura />
                </div>
              </Bloque>
            </div>
            <div className="grid gap-2 border-t border-gray-200 bg-white px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
              {anuncio ? <p role="status" className="rounded-lg bg-emerald-50 p-2.5 text-[13px] font-medium text-emerald-800">{anuncio}</p> : null}
              {errorApi ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-[13px] text-red-800">{errorApi}</p> : null}
              {Object.keys(errores).length ? <p role="alert" className="text-[13px] font-medium text-red-700">Revisa los campos marcados.</p> : null}
              {confirmarSalida ? (
                <AvisoSinGuardar onSeguir={() => setConfirmarSalida(false)} onDescartar={() => onCambiar(false)} />
              ) : (
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => cambiarAbierto(false)} className="min-h-11 flex-1 sm:flex-none md:min-h-9">{sucio ? "Cancelar" : "Cerrar"}</Button>
                  <Button type="submit" loading={guardando} className="min-h-11 flex-1 sm:flex-none md:min-h-9">Guardar agenda</Button>
                </div>
              )}
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
