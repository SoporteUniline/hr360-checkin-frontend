"use client";

// «Configurar agente» (R2): encendido, nombre, horario por día, mensaje fuera de horario, respuestas frecuentes y
// palabras con las que el candidato pide a una persona. GET/PUT /agente?empresa=ID; el API valida y manda.
import { useEffect, useId, useRef, useState } from "react";
import useSWR from "swr";
import { Bot, Copy, Loader2, RefreshCw, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { mensajeErrorApi } from "@/lib/whatsapp/reglas.mjs";
import {
  DIAS, LIMITE_FRECUENTES, LIMITE_FUERA_HORARIO, LIMITE_NOMBRE, agenteDesdeApi, agregarPalabras, copiarLunesATodos, validarAgente,
} from "@/lib/whatsapp/entrevista.mjs";
import { guardarAgente, obtener, rutaAgente } from "./api";
import { AvisoSinGuardar, CLASE_ENTRADA, Campo, DIALOGO_PANTALLA_COMPLETA, Interruptor, describir } from "./controles";

export function BotonAgente({ onClick, encendido, className = "" }) {
  return (
    <Button type="button" variant="outline" onClick={onClick} title={encendido === undefined ? undefined : encendido ? "Agente encendido" : "Agente apagado"}
      className={`min-h-11 md:min-h-9 ${className}`} startIcon={<Bot className="size-4 text-violet-600" />}>
      Agente
      {encendido !== undefined ? <span aria-hidden="true" className={`size-2 rounded-full ${encendido ? "bg-emerald-500" : "bg-gray-300"}`} /> : null}
    </Button>
  );
}

function Palabras({ id, palabras, onCambiar, error }) {
  const [texto, setTexto] = useState("");
  const [aviso, setAviso] = useState("");
  const agregar = () => {
    if (!texto.trim()) return;
    const r = agregarPalabras(palabras, texto);
    onCambiar(r.palabras);
    setAviso(r.error);
    if (!r.error) setTexto("");
  };
  const mensaje = aviso || error;
  return (
    <div className="grid gap-2">
      <div className="flex gap-2">
        <input
          id={id}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === ",") && !e.nativeEvent.isComposing) {
              e.preventDefault();
              agregar();
            }
          }}
          placeholder="Ej.: humano, asesor, hablar con alguien"
          aria-describedby={describir(id, { ayuda: true, error: mensaje })}
          aria-invalid={mensaje ? true : undefined}
          className={`${CLASE_ENTRADA} h-11 md:h-9`}
        />
        <Button type="button" variant="outline" onClick={agregar} className="min-h-11 shrink-0 md:min-h-9">Agregar</Button>
      </div>
      {palabras.length ? (
        <ul aria-label="Palabras agregadas" className="flex flex-wrap gap-1.5">
          {palabras.map((p) => (
            <li key={p} className="inline-flex max-w-full items-center gap-0.5 rounded-full bg-violet-50 pl-3 text-[13px] font-medium text-violet-800 ring-1 ring-inset ring-violet-200">
              <span className="min-w-0 truncate">{p}</span>
              <button type="button" onClick={() => onCambiar(palabras.filter((x) => x !== p))} aria-label={`Quitar «${p}»`}
                className="grid size-11 shrink-0 place-items-center rounded-full text-violet-700 hover:bg-violet-100 md:size-8">
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {mensaje ? <p id={`${id}-error`} className="text-[12.5px] font-medium text-red-700">{mensaje}</p> : null}
    </div>
  );
}

function Horario({ form, setForm, errores }) {
  const cambiarDia = (clave, valor) => setForm((f) => ({ ...f, horario: { ...f.horario, [clave]: valor } }));
  return (
    <fieldset className="grid gap-2" aria-describedby={errores?.general ? "horario-error" : undefined}>
      <legend className="sr-only">Horario por día</legend>
      <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
        {DIAS.map(({ clave, texto }) => {
          const dia = form.horario?.[clave];
          const error = errores?.[clave];
          return (
            <li key={clave} className="grid gap-1 px-3 py-1.5" data-dia={clave}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Interruptor activo={!!dia} onCambiar={(v) => cambiarDia(clave, v ? { desde: form.horario?.lunes?.desde || "09:00", hasta: form.horario?.lunes?.hasta || "18:00" } : null)} className="w-32">
                  {texto}
                </Interruptor>
                {dia ? (
                  <span className="flex min-w-0 flex-1 basis-full items-center gap-2 sm:basis-auto">
                    <input type="time" aria-label={`${texto}: desde`} value={dia.desde} onChange={(e) => cambiarDia(clave, { ...dia, desde: e.target.value })}
                      aria-invalid={error ? true : undefined} className={`${CLASE_ENTRADA} h-11 flex-1 px-2 sm:max-w-[9.5rem] md:h-9`} />
                    <span className="text-sm text-gray-500">a</span>
                    <input type="time" aria-label={`${texto}: hasta`} value={dia.hasta} onChange={(e) => cambiarDia(clave, { ...dia, hasta: e.target.value })}
                      aria-invalid={error ? true : undefined} className={`${CLASE_ENTRADA} h-11 flex-1 px-2 sm:max-w-[9.5rem] md:h-9`} />
                  </span>
                ) : (
                  <span className="text-sm text-gray-500">No atiende</span>
                )}
              </div>
              {error ? <p className="text-[12.5px] font-medium text-red-700">{error}</p> : null}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setForm((f) => ({ ...f, horario: copiarLunesATodos(f.horario) }))}
          className="min-h-11 md:min-h-8" startIcon={<Copy className="size-4" />}>
          Copiar lunes a todos
        </Button>
        {errores?.general ? <p id="horario-error" className="text-[12.5px] font-medium text-red-700">{errores.general}</p> : null}
      </div>
    </fieldset>
  );
}

export default function ConfigurarAgente({ abierto, onCambiar, idEmpresa }) {
  const ids = useId();
  const clave = abierto ? rutaAgente(idEmpresa) : null;
  const { data, error, isLoading, mutate } = useSWR(clave, obtener, { revalidateOnFocus: false });
  const [form, setForm] = useState(null);
  const inicial = useRef("");
  const [errores, setErrores] = useState({});
  const [errorApi, setErrorApi] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [confirmarSalida, setConfirmarSalida] = useState(false);

  useEffect(() => {
    if (!abierto) {
      setForm(null);
      setErrores({});
      setErrorApi("");
      setConfirmarSalida(false);
      return;
    }
    if (data && !form) {
      const f = agenteDesdeApi(data);
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
    const r = validarAgente(form);
    setErrores(r.errores);
    setErrorApi("");
    if (!r.valido) {
      requestAnimationFrame(() => document.querySelector("[data-agente-form] [aria-invalid=true]")?.focus());
      return;
    }
    setGuardando(true);
    try {
      const guardado = await guardarAgente(idEmpresa, r.cuerpo);
      await mutate(guardado && typeof guardado === "object" ? guardado : r.cuerpo, { revalidate: false });
      onCambiar(false);
    } catch (err) {
      setErrorApi(mensajeErrorApi(err, "No se pudo guardar la configuración del agente."));
    } finally {
      setGuardando(false);
    }
  };

  const id = (s) => `${ids}-${s}`;
  return (
    <Dialog open={abierto} onOpenChange={cambiarAbierto}>
      <DialogContent className={DIALOGO_PANTALLA_COMPLETA}>
        <DialogHeader className="border-b border-gray-200 px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))] pr-14 text-left">
          <DialogTitle>Configurar agente</DialogTitle>
          <DialogDescription>El agente contesta por WhatsApp, entrevista con las preguntas de cada vacante y te avisa cuando alguien necesita atención.</DialogDescription>
        </DialogHeader>
        {error && !form ? (
          <div role="alert" className="m-5 flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <span className="flex-1">{mensajeErrorApi(error, "No se pudo cargar la configuración del agente.")}</span>
            <Button type="button" variant="outline" onClick={() => mutate()} className="min-h-11 md:min-h-9" startIcon={<RefreshCw className="size-4" />}>Reintentar</Button>
          </div>
        ) : !form ? (
          <p className="flex items-center gap-2 p-5 text-sm text-gray-500" aria-busy={isLoading}><Loader2 className="size-4 animate-spin" /> Cargando configuración…</p>
        ) : (
          <form onSubmit={guardar} noValidate data-agente-form className="flex min-h-0 flex-1 flex-col">
            <div className="grid min-h-0 flex-1 content-start gap-5 overflow-y-auto px-5 py-4">
              <div className="grid gap-1 rounded-xl border border-gray-200 p-3">
                <Interruptor activo={form.activo} onCambiar={(v) => actualizar("activo", v)}>Agente encendido</Interruptor>
                <p className="text-[12.5px] text-gray-600">
                  {form.activo ? "Contesta a los candidatos y les hace las preguntas de la vacante. Puedes tomar el control de cualquier chat." : "Apagado: los chats nuevos esperan a que alguien del equipo conteste."}
                </p>
              </div>
              <p className="flex gap-2 rounded-xl bg-blue-50 p-3 text-[13px] text-blue-900">
                <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>El agente usa tu aviso de privacidad de ADAMIA y nunca pide CURP, datos bancarios ni dinero.</span>
              </p>
              <Campo id={id("nombre")} etiqueta="Nombre del asistente" ayuda="Así se presenta y firma sus mensajes. Ej.: Sofía de Uniline." error={errores.nombre_asistente}
                contador={`${form.nombre_asistente.length}/${LIMITE_NOMBRE}`}>
                <input id={id("nombre")} value={form.nombre_asistente} maxLength={LIMITE_NOMBRE} onChange={(e) => actualizar("nombre_asistente", e.target.value)}
                  aria-invalid={errores.nombre_asistente ? true : undefined} aria-describedby={describir(id("nombre"), { ayuda: true, error: errores.nombre_asistente })}
                  className={`${CLASE_ENTRADA} h-11 md:h-9`} />
              </Campo>
              <section className="grid gap-2" aria-labelledby={id("horario-t")}>
                <h3 id={id("horario-t")} className="text-sm font-semibold text-gray-800">Horario</h3>
                <Interruptor activo={form.usaHorario} onCambiar={(v) => actualizar("usaHorario", v)}>Responder solo en horario</Interruptor>
                <p className="text-[12.5px] text-gray-500">
                  {form.usaHorario ? "Fuera de este horario el agente contesta el mensaje de abajo y retoma la entrevista al día siguiente." : "Apagado: el agente contesta a cualquier hora."}
                </p>
                {form.usaHorario ? (
                  <>
                    <Horario form={form} setForm={setForm} errores={errores.horario} />
                    <Campo id={id("fuera")} etiqueta="Mensaje fuera de horario" error={errores.mensaje_fuera_horario} contador={`${form.mensaje_fuera_horario.length}/${LIMITE_FUERA_HORARIO}`}>
                      <textarea id={id("fuera")} rows={3} value={form.mensaje_fuera_horario} maxLength={LIMITE_FUERA_HORARIO}
                        onChange={(e) => actualizar("mensaje_fuera_horario", e.target.value)} placeholder="Ej.: ¡Gracias por escribir! Te respondemos mañana a partir de las 9:00."
                        aria-invalid={errores.mensaje_fuera_horario ? true : undefined} aria-describedby={describir(id("fuera"), { error: errores.mensaje_fuera_horario })}
                        className={`${CLASE_ENTRADA} py-2`} />
                    </Campo>
                  </>
                ) : null}
              </section>
              <Campo id={id("frecuentes")} etiqueta="Respuestas frecuentes" ayuda="Escribe lo que el agente puede contestar: horarios, prestaciones, dirección…"
                error={errores.respuestas_frecuentes} contador={`${form.respuestas_frecuentes.length}/${LIMITE_FRECUENTES}`}>
                <textarea id={id("frecuentes")} rows={6} value={form.respuestas_frecuentes} maxLength={LIMITE_FRECUENTES}
                  onChange={(e) => actualizar("respuestas_frecuentes", e.target.value)} placeholder={"Ej.: El sueldo es de $9,500 a la quincena.\nLa planta está en Av. Industrial 120, Apodaca."}
                  aria-invalid={errores.respuestas_frecuentes ? true : undefined} aria-describedby={describir(id("frecuentes"), { ayuda: true, error: errores.respuestas_frecuentes })}
                  className={`${CLASE_ENTRADA} py-2`} />
              </Campo>
              <div className="grid gap-1.5">
                <label htmlFor={id("palabras")} className="text-sm font-semibold text-gray-800">Palabras para pasar a una persona</label>
                <p id={`${id("palabras")}-ayuda`} className="text-[12.5px] text-gray-500">Si el candidato escribe alguna, el agente deja de contestar y el chat se marca como «Requiere atención». Enter o coma para agregar.</p>
                <Palabras id={id("palabras")} palabras={form.palabras_humano} onCambiar={(v) => actualizar("palabras_humano", v)} error={errores.palabras_humano} />
              </div>
            </div>
            <div className="grid gap-2 border-t border-gray-200 bg-white px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
              {errorApi ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-[13px] text-red-800">{errorApi}</p> : null}
              {Object.keys(errores).length ? <p role="alert" className="text-[13px] font-medium text-red-700">Revisa los campos marcados.</p> : null}
              {confirmarSalida ? (
                <AvisoSinGuardar onSeguir={() => setConfirmarSalida(false)} onDescartar={() => onCambiar(false)} />
              ) : (
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => cambiarAbierto(false)} className="min-h-11 flex-1 sm:flex-none md:min-h-9">Cancelar</Button>
                  <Button type="submit" loading={guardando} className="min-h-11 flex-1 sm:flex-none md:min-h-9">Guardar</Button>
                </div>
              )}
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
