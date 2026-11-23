"use client";

// Editor de la entrevista de una vacante (R2): hasta 8 preguntas que el agente hace por WhatsApp. Cada pregunta define
// qué respuestas descartan o alertan. Reordenar con botones (sin arrastrar). PUT reemplaza todas las preguntas.
// En escritorio es un diálogo; en teléfono ocupa toda la pantalla.
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { ArrowDown, ArrowUp, ListChecks, Loader2, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { mensajeErrorApi } from "@/lib/whatsapp/reglas.mjs";
import {
  LIMITE_OPCION, LIMITE_PREGUNTA, MAX_OPCIONES, MAX_PREGUNTAS, TIPOS, cambiarTipo, moverPregunta, preguntaDesdeApi, preguntaNueva,
  validarPreguntas, vistaPreviaPregunta,
} from "@/lib/whatsapp/entrevista.mjs";
import { guardarPreguntas, obtener, rutaPreguntas } from "./api";
import { AvisoSinGuardar, CLASE_ENTRADA, DIALOGO_PANTALLA_COMPLETA } from "./controles";

const enfocar = (selector) => requestAnimationFrame(() => document.querySelector(selector)?.focus());

function ChipsEfecto({ titulo, efecto, pregunta, onCambiar, error, tono }) {
  const marcado = tono === "rojo" ? "has-[:checked]:border-red-300 has-[:checked]:bg-red-50 has-[:checked]:text-red-800" : "has-[:checked]:border-amber-300 has-[:checked]:bg-amber-50 has-[:checked]:text-amber-900";
  const opciones = pregunta.opciones.filter((o) => o.texto.trim());
  return (
    <fieldset className="grid gap-1.5">
      <legend className="mb-1 text-[13px] font-semibold text-gray-700">{titulo}</legend>
      {opciones.length ? (
        <div className="flex flex-wrap gap-1.5">
          {opciones.map((o) => (
            <label key={o.clave} className={`inline-flex min-h-11 max-w-full cursor-pointer items-center gap-2 rounded-full border border-gray-300 bg-white px-3 text-[13px] font-medium text-gray-700 md:min-h-8 ${marcado}`}>
              <input type="checkbox" checked={o.efecto === efecto} className={`size-4 ${tono === "rojo" ? "accent-red-600" : "accent-amber-600"}`}
                onChange={(e) => onCambiar(pregunta.opciones.map((x) => (x.clave === o.clave ? { ...x, efecto: e.target.checked ? efecto : "ok" } : x)))} />
              <span className="min-w-0 truncate">{o.texto.trim()}</span>
            </label>
          ))}
        </div>
      ) : (
        <p className="text-[12.5px] text-gray-500">Escribe las opciones primero.</p>
      )}
      {error ? <p className="text-[12.5px] font-medium text-red-700">{error}</p> : null}
    </fieldset>
  );
}

function RangoEfecto({ titulo, ayuda, rango, onCambiar, error }) {
  const entrada = `${CLASE_ENTRADA.replace("w-full ", "")} h-11 w-24 md:h-9`;
  return (
    <fieldset className="grid gap-1.5">
      <legend className="mb-1 text-[13px] font-semibold text-gray-700">{titulo}</legend>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-600">
        <span className="basis-full">Rango aceptado:</span>
        <span>de</span>
        <input aria-label="Mínimo" inputMode="decimal" placeholder="Mín." value={rango.min} onChange={(e) => onCambiar({ ...rango, min: e.target.value })}
          aria-invalid={error ? true : undefined} className={entrada} />
        <span>a</span>
        <input aria-label="Máximo" inputMode="decimal" placeholder="Máx." value={rango.max} onChange={(e) => onCambiar({ ...rango, max: e.target.value })}
          aria-invalid={error ? true : undefined} className={entrada} />
      </div>
      <p className="text-[12px] text-gray-500">{ayuda}</p>
      {error ? <p className="text-[12.5px] font-medium text-red-700">{error}</p> : null}
    </fieldset>
  );
}

function TarjetaPregunta({ pregunta: p, indice, total, error = {}, onCambiar, onMover, onQuitar }) {
  const n = indice + 1;
  const actualizar = (cambios) => onCambiar({ ...p, ...cambios });
  const idTexto = `pregunta-${p.clave}-texto`;
  return (
    <section aria-label={`Pregunta ${n}`} data-clave={p.clave} className={`grid gap-3 rounded-xl border bg-white p-3 sm:p-4 ${Object.keys(error).length ? "border-red-300" : "border-gray-200"}`}>
      <div className="flex items-center gap-1">
        <h3 className="min-w-0 flex-1 text-sm font-bold text-gray-900">Pregunta {n}</h3>
        <button type="button" data-mover="arriba" onClick={() => onMover(-1)} disabled={indice === 0} aria-label={`Subir pregunta ${n}`}
          className="grid size-11 place-items-center rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-30 md:size-9"><ArrowUp className="size-4" /></button>
        <button type="button" data-mover="abajo" onClick={() => onMover(1)} disabled={indice === total - 1} aria-label={`Bajar pregunta ${n}`}
          className="grid size-11 place-items-center rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-30 md:size-9"><ArrowDown className="size-4" /></button>
        <button type="button" onClick={onQuitar} aria-label={`Quitar pregunta ${n}`}
          className="grid size-11 place-items-center rounded-lg text-red-600 hover:bg-red-50 md:size-9"><Trash2 className="size-4" /></button>
      </div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem]">
        <div className="grid gap-1">
          <label htmlFor={idTexto} className="sr-only">Texto de la pregunta {n}</label>
          <input id={idTexto} value={p.texto} maxLength={LIMITE_PREGUNTA} onChange={(e) => actualizar({ texto: e.target.value })} placeholder="Ej.: ¿Tienes licencia tipo C?"
            aria-invalid={error.texto ? true : undefined} aria-describedby={error.texto ? `${idTexto}-error` : undefined} className={`${CLASE_ENTRADA} h-11 md:h-9`} />
          {error.texto ? <p id={`${idTexto}-error`} className="text-[12.5px] font-medium text-red-700">{error.texto}</p> : null}
        </div>
        <label className="grid gap-1">
          <span className="sr-only">Tipo de respuesta de la pregunta {n}</span>
          <select value={p.tipo} onChange={(e) => onCambiar(cambiarTipo(p, e.target.value))} aria-invalid={error.tipo ? true : undefined}
            className={`${CLASE_ENTRADA} h-11 px-2 md:h-9`}>
            {TIPOS.map((t) => <option key={t.valor} value={t.valor}>{t.texto}</option>)}
          </select>
        </label>
      </div>
      {p.tipo === "opciones" ? (
        <fieldset className="grid gap-1.5">
          <legend className="mb-1 text-[13px] font-semibold text-gray-700">Opciones de respuesta</legend>
          <ol className="grid gap-1.5">
            {p.opciones.map((o, j) => (
              <li key={o.clave} className="flex items-center gap-1.5">
                <input aria-label={`Opción ${j + 1}`} value={o.texto} maxLength={LIMITE_OPCION} placeholder={`Opción ${j + 1}`}
                  onChange={(e) => actualizar({ opciones: p.opciones.map((x) => (x.clave === o.clave ? { ...x, texto: e.target.value } : x)) })}
                  aria-invalid={error.opciones && !o.texto.trim() ? true : undefined} className={`${CLASE_ENTRADA} h-11 flex-1 md:h-9`} />
                <button type="button" onClick={() => actualizar({ opciones: p.opciones.filter((x) => x.clave !== o.clave) })} aria-label={`Quitar opción ${j + 1}`}
                  className="grid size-11 shrink-0 place-items-center rounded-lg text-gray-500 hover:bg-gray-100 md:size-9"><X className="size-4" /></button>
              </li>
            ))}
          </ol>
          <div>
            <Button type="button" variant="ghost" size="sm" disabled={p.opciones.length >= MAX_OPCIONES} startIcon={<Plus className="size-4" />} className="min-h-11 md:min-h-8"
              onClick={() => actualizar({ opciones: [...p.opciones, { clave: `${p.clave}-o${Date.now()}`, texto: "", efecto: "ok" }] })}>
              Agregar opción
            </Button>
          </div>
          {error.opciones ? <p className="text-[12.5px] font-medium text-red-700">{error.opciones}</p> : null}
        </fieldset>
      ) : null}
      {p.tipo === "si_no" || p.tipo === "opciones" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <ChipsEfecto titulo="Respuestas que descartan" efecto="descarta" tono="rojo" pregunta={p} onCambiar={(opciones) => actualizar({ opciones })} error={error.descartan} />
          <ChipsEfecto titulo="Respuestas que alertan" efecto="alerta" tono="ambar" pregunta={p} onCambiar={(opciones) => actualizar({ opciones })} error={error.alertan} />
        </div>
      ) : p.tipo === "numero" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <RangoEfecto titulo="Respuestas que descartan" ayuda="Fuera de este rango descarta. Ej.: edad de 18 (sin máximo) descarta a menores de edad." rango={p.descarta} onCambiar={(descarta) => actualizar({ descarta })} error={error.descartan} />
          <RangoEfecto titulo="Respuestas que alertan" ayuda="Fuera de este rango alerta. Deja vacío el lado que no tenga límite." rango={p.alerta} onCambiar={(alerta) => actualizar({ alerta })} error={error.alertan} />
        </div>
      ) : (
        <p className="text-[12.5px] text-gray-500">La respuesta libre solo se guarda para que la leas; no descarta ni alerta.</p>
      )}
      <p className="rounded-lg bg-gray-50 px-3 py-2 text-[12.5px] text-gray-700 [overflow-wrap:anywhere]" data-vista-previa>{vistaPreviaPregunta(p)}</p>
    </section>
  );
}

export default function EditorEntrevista({ abierto, onCambiar, idVacante, titulo }) {
  const clave = abierto ? rutaPreguntas(idVacante) : null;
  const { data, error, mutate } = useSWR(clave, obtener, { revalidateOnFocus: false });
  const [preguntas, setPreguntas] = useState(null);
  const inicial = useRef("");
  const [errores, setErrores] = useState([]);
  const [general, setGeneral] = useState("");
  const [errorApi, setErrorApi] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [confirmarSalida, setConfirmarSalida] = useState(false);
  const [anuncio, setAnuncio] = useState("");

  useEffect(() => {
    if (!abierto) {
      setPreguntas(null);
      setErrores([]);
      setGeneral("");
      setErrorApi("");
      setConfirmarSalida(false);
      return;
    }
    if (data && !preguntas) {
      const lista = [...(data.preguntas ?? [])].sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0)).map(preguntaDesdeApi);
      inicial.current = JSON.stringify(validarPreguntas(lista).cuerpo);
      setPreguntas(lista);
    }
  }, [abierto, data, preguntas]);

  const sucio = !!preguntas && JSON.stringify(validarPreguntas(preguntas).cuerpo) !== inicial.current;
  const cambiarAbierto = (v) => {
    if (!v && sucio && !guardando) { setConfirmarSalida(true); return; }
    onCambiar(v);
  };
  // Los errores se recalculan al editar solo si ya se intentó guardar.
  const revalidar = (lista) => {
    if (!errores.length && !general) return;
    const r = validarPreguntas(lista);
    setErrores(r.errores);
    setGeneral(r.valido ? "" : r.general);
  };
  const cambiarLista = (lista) => { setPreguntas(lista); revalidar(lista); };

  const agregar = () => {
    const nueva = preguntaNueva("si_no");
    cambiarLista([...preguntas, nueva]);
    enfocar(`[data-clave="${nueva.clave}"] input`);
  };
  const mover = (i, delta) => {
    const p = preguntas[i];
    const lista = moverPregunta(preguntas, i, delta);
    if (lista === preguntas) return;
    cambiarLista(lista);
    setErrores((e) => (e.length ? moverPregunta(e, i, delta) : e));
    setAnuncio(`Pregunta movida a la posición ${i + delta + 1}.`);
    const destino = i + delta;
    const borde = destino === 0 || destino === lista.length - 1;
    enfocar(`[data-clave="${p.clave}"] [data-mover="${borde ? (delta < 0 ? "abajo" : "arriba") : delta < 0 ? "arriba" : "abajo"}"]`);
  };
  const quitar = (i) => {
    const lista = preguntas.filter((_, j) => j !== i);
    cambiarLista(lista);
    setErrores((e) => e.filter((_, j) => j !== i));
    setAnuncio(`Pregunta ${i + 1} quitada.`);
    const siguiente = lista[i] ?? lista[i - 1];
    enfocar(siguiente ? `[data-clave="${siguiente.clave}"] input` : "[data-agregar-pregunta]");
  };

  const guardar = async (e) => {
    e.preventDefault();
    const r = validarPreguntas(preguntas);
    setErrores(r.errores);
    setGeneral(r.valido ? "" : r.general);
    setErrorApi("");
    if (!r.valido) {
      enfocar("[data-editor-entrevista] [aria-invalid=true]");
      return;
    }
    setGuardando(true);
    try {
      const guardado = await guardarPreguntas(idVacante, r.cuerpo);
      await mutate(guardado?.preguntas ? guardado : r.cuerpo, { revalidate: false });
      onCambiar(false);
    } catch (err) {
      setErrorApi(mensajeErrorApi(err, "No se pudo guardar la entrevista."));
    } finally {
      setGuardando(false);
    }
  };

  const total = preguntas?.length ?? 0;
  return (
    <Dialog open={abierto} onOpenChange={cambiarAbierto}>
      <DialogContent className={`${DIALOGO_PANTALLA_COMPLETA} sm:max-w-3xl`}>
        <DialogHeader className="border-b border-gray-200 px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))] pr-14 text-left">
          <DialogTitle>Entrevista por WhatsApp</DialogTitle>
          <DialogDescription>
            {titulo ? <>Vacante «{titulo}». </> : null}
            El agente hace estas preguntas en orden y califica al candidato según sus respuestas.
          </DialogDescription>
        </DialogHeader>
        {error && !preguntas ? (
          <div role="alert" className="m-5 flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <span className="flex-1">{mensajeErrorApi(error, "No se pudieron cargar las preguntas.")}</span>
            <Button type="button" variant="outline" onClick={() => mutate()} className="min-h-11 md:min-h-9" startIcon={<RefreshCw className="size-4" />}>Reintentar</Button>
          </div>
        ) : !preguntas ? (
          <p className="flex items-center gap-2 p-5 text-sm text-gray-500"><Loader2 className="size-4 animate-spin" /> Cargando preguntas…</p>
        ) : (
          <form onSubmit={guardar} noValidate data-editor-entrevista className="flex min-h-0 flex-1 flex-col">
            <div className="grid min-h-0 flex-1 content-start gap-3 overflow-y-auto bg-gray-50 px-4 py-4 sm:px-5">
              {!total ? (
                <div className="grid place-items-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white px-4 py-8 text-center">
                  <ListChecks className="size-8 text-emerald-600" aria-hidden="true" />
                  <p className="font-semibold text-gray-800">Esta vacante aún no tiene entrevista</p>
                  <p className="max-w-sm text-sm text-gray-600">Agrega hasta {MAX_PREGUNTAS} preguntas cortas. Marca qué respuestas descartan o alertan para que el agente califique.</p>
                </div>
              ) : (
                preguntas.map((p, i) => (
                  <TarjetaPregunta key={p.clave} pregunta={p} indice={i} total={total} error={errores[i]}
                    onCambiar={(nueva) => cambiarLista(preguntas.map((x) => (x.clave === p.clave ? nueva : x)))}
                    onMover={(delta) => mover(i, delta)} onQuitar={() => quitar(i)} />
                ))
              )}
              <div>
                <Button type="button" variant="outline" onClick={agregar} disabled={total >= MAX_PREGUNTAS} data-agregar-pregunta
                  startIcon={<Plus className="size-4" />} className="min-h-11 w-full sm:w-auto md:min-h-9">
                  Agregar pregunta ({total}/{MAX_PREGUNTAS})
                </Button>
                {total >= MAX_PREGUNTAS ? <p className="mt-1 text-[12.5px] text-gray-500">Llegaste al máximo de {MAX_PREGUNTAS} preguntas.</p> : null}
              </div>
            </div>
            <p aria-live="polite" className="sr-only">{anuncio}</p>
            <div className="grid gap-2 border-t border-gray-200 bg-white px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
              {errorApi ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-[13px] text-red-800">{errorApi}</p> : null}
              {general ? <p role="alert" className="text-[13px] font-medium text-red-700">{general}</p> : null}
              {confirmarSalida ? (
                <AvisoSinGuardar onSeguir={() => setConfirmarSalida(false)} onDescartar={() => onCambiar(false)} />
              ) : (
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => cambiarAbierto(false)} className="min-h-11 flex-1 sm:flex-none md:min-h-9">Cancelar</Button>
                  <Button type="submit" loading={guardando} className="min-h-11 flex-1 sm:flex-none md:min-h-9">Guardar entrevista</Button>
                </div>
              )}
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
