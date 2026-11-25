"use client";

// Lumo fase A (25/11/2026): requisitos de la vacante (edad legal, experiencia, escolaridad, turno y zona), uno por tipo.
// El servidor los evalúa SIN IA contra lo que contestó el candidato y lo que guardó el agente, y los muestra en la ficha
// como ALERTA («cumple / no cumple / falta dato»): nunca rechaza al candidato. PUT reemplaza todos.
// En escritorio es un diálogo; en teléfono ocupa toda la pantalla (mismo patrón que «Entrevista»).
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { ClipboardCheck, Loader2, Plus, RefreshCw, Scale, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { mensajeErrorApi } from "@/lib/whatsapp/reglas.mjs";
import {
  NIVELES, TIPOS_REQUISITO, TURNOS, edadPideFundamento, preguntasParaTipo, requisitoNuevo, requisitosDesdeApi, tiposDisponibles, validarRequisitosForm,
} from "@/lib/whatsapp/requisitos.mjs";
import { guardarRequisitos, obtener, rutaPreguntas, rutaRequisitos } from "./api";
import { AvisoSinGuardar, CLASE_ENTRADA, DIALOGO_PANTALLA_COMPLETA, Interruptor } from "./controles";

const ENTRADA = `${CLASE_ENTRADA} h-11 md:h-9`;
// Campo numérico corto (sin w-full, que ganaría al ancho fijo).
const ENTRADA_CORTA = `${CLASE_ENTRADA.replace("w-full ", "")} h-11 md:h-9`;
const MensajeError = ({ texto }) => (texto ? <p className="text-[13px] font-medium text-red-700">{texto}</p> : null);

function Campos({ r, e, cambiar, preguntas }) {
  const id = `req-${r.tipo}`;
  const fuentes = preguntasParaTipo(preguntas, r.tipo);
  return (
    <div className="grid gap-3">
      {r.tipo === "edad" ? (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
            <label htmlFor={`${id}-min`}>De</label>
            <input id={`${id}-min`} inputMode="numeric" value={r.min} onChange={(x) => cambiar({ min: x.target.value })} aria-invalid={e.edad ? true : undefined} className={`${ENTRADA_CORTA} w-20`} />
            <label htmlFor={`${id}-max`}>a</label>
            <input id={`${id}-max`} inputMode="numeric" value={r.max} placeholder="Sin máx." onChange={(x) => cambiar({ max: x.target.value })} aria-invalid={e.edad ? true : undefined} className={`${ENTRADA_CORTA} w-24`} />
            <span>años</span>
          </div>
          <MensajeError texto={e.edad} />
          {edadPideFundamento(r) ? (
            <div className="grid gap-1.5 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <label htmlFor={`${id}-fundamento`} className="flex items-center gap-1.5 text-[13px] font-semibold text-amber-950"><Scale className="size-4" aria-hidden="true" /> Fundamento legal (obligatorio)</label>
              <input id={`${id}-fundamento`} value={r.fundamento} maxLength={300} onChange={(x) => cambiar({ fundamento: x.target.value })} placeholder="Ej.: Licencia federal de la SCT exige 21 años"
                aria-invalid={e.fundamento ? true : undefined} className={ENTRADA} />
              <p className="text-[13px] text-amber-900">La LFT (art. 133) prohíbe filtrar por edad. Solo una norma que lo exija lo permite.</p>
              <MensajeError texto={e.fundamento} />
            </div>
          ) : null}
        </>
      ) : r.tipo === "experiencia" ? (
        <div className="grid gap-1">
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
            <label htmlFor={`${id}-anios`}>Mínimo</label>
            <input id={`${id}-anios`} inputMode="decimal" value={r.min_anios} onChange={(x) => cambiar({ min_anios: x.target.value })} aria-invalid={e.min_anios ? true : undefined} className={`${ENTRADA_CORTA} w-20`} />
            <span>años</span>
          </div>
          <MensajeError texto={e.min_anios} />
        </div>
      ) : r.tipo === "escolaridad" ? (
        <div className="grid gap-1">
          <label htmlFor={`${id}-nivel`} className="text-[13px] font-semibold text-gray-700">Nivel mínimo</label>
          <select id={`${id}-nivel`} value={r.minima} onChange={(x) => cambiar({ minima: x.target.value })} aria-invalid={e.minima ? true : undefined} className={`${ENTRADA} px-2`}>
            <option value="">Elige…</option>
            {NIVELES.map((n) => <option key={n.valor} value={n.valor}>{n.texto}</option>)}
          </select>
          <MensajeError texto={e.minima} />
        </div>
      ) : r.tipo === "turno" ? (
        <fieldset className="grid gap-1.5">
          <legend className="mb-1 text-[13px] font-semibold text-gray-700">Turnos que se aceptan</legend>
          <div className="flex flex-wrap gap-1.5">
            {TURNOS.map((t) => (
              <label key={t.valor} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-gray-300 bg-white px-3 text-[13px] font-medium text-gray-700 has-[:checked]:border-emerald-400 has-[:checked]:bg-emerald-50 md:min-h-8">
                <input type="checkbox" className="size-4 accent-emerald-700" checked={r.acepta.includes(t.valor)}
                  onChange={(x) => cambiar({ acepta: x.target.checked ? [...r.acepta, t.valor] : r.acepta.filter((v) => v !== t.valor) })} />
                {t.texto}
              </label>
            ))}
          </div>
          <MensajeError texto={e.acepta} />
        </fieldset>
      ) : (
        <div className="grid gap-1">
          <label htmlFor={`${id}-lugares`} className="text-[13px] font-semibold text-gray-700">Lugares aceptados (separados por comas)</label>
          <input id={`${id}-lugares`} value={r.lugares} onChange={(x) => cambiar({ lugares: x.target.value })} placeholder="Ej.: Monterrey, Apodaca, San Nicolás" aria-invalid={e.lugares ? true : undefined} className={ENTRADA} />
          <MensajeError texto={e.lugares} />
        </div>
      )}
      <div className="grid gap-1">
        <label htmlFor={`${id}-fuente`} className="text-[13px] font-semibold text-gray-700">De dónde se toma el dato</label>
        <select id={`${id}-fuente`} value={r.id_pregunta} onChange={(x) => cambiar({ id_pregunta: x.target.value })} className={`${ENTRADA} px-2`}>
          <option value="">{r.tipo === "edad" ? "Automático (una pregunta de edad)" : "Automático (pregunta parecida o lo que dijo al agente)"}</option>
          {fuentes.map((p) => <option key={p.id} value={String(p.id)}>Pregunta: {p.texto}</option>)}
        </select>
      </div>
    </div>
  );
}

export default function EditorRequisitos({ abierto, onCambiar, idVacante, titulo }) {
  const { data, error, mutate } = useSWR(abierto ? rutaRequisitos(idVacante) : null, obtener, { revalidateOnFocus: false });
  const { data: datosPreguntas } = useSWR(abierto ? rutaPreguntas(idVacante) : null, obtener, { revalidateOnFocus: false });
  const [lista, setLista] = useState(null);
  const inicial = useRef("");
  const [errores, setErrores] = useState([]);
  const [errorApi, setErrorApi] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [confirmarSalida, setConfirmarSalida] = useState(false);

  useEffect(() => {
    if (!abierto) { setLista(null); setErrores([]); setErrorApi(""); setConfirmarSalida(false); return; }
    if (data && !lista) {
      const l = requisitosDesdeApi(data.requisitos);
      inicial.current = JSON.stringify(l);
      setLista(l);
    }
  }, [abierto, data, lista]);

  const sucio = !!lista && JSON.stringify(lista) !== inicial.current;
  const cambiarAbierto = (v) => {
    if (!v && sucio && !guardando) { setConfirmarSalida(true); return; }
    onCambiar(v);
  };
  const cambiarLista = (l) => {
    setLista(l);
    if (errores.length) setErrores(validarRequisitosForm(l).errores);
  };
  const preguntas = (datosPreguntas?.preguntas ?? []).filter((p) => p.activa !== false);

  const guardar = async (ev) => {
    ev.preventDefault();
    const r = validarRequisitosForm(lista);
    setErrores(r.errores);
    setErrorApi("");
    if (!r.valido) { requestAnimationFrame(() => document.querySelector("[data-editor-requisitos] [aria-invalid=true]")?.focus()); return; }
    setGuardando(true);
    try {
      const g = await guardarRequisitos(idVacante, r.cuerpo);
      await mutate(g, { revalidate: false });
      onCambiar(false);
    } catch (e) {
      setErrorApi(mensajeErrorApi(e, "No se pudieron guardar los requisitos."));
    } finally {
      setGuardando(false);
    }
  };

  const disponibles = lista ? tiposDisponibles(lista) : [];
  return (
    <Dialog open={abierto} onOpenChange={cambiarAbierto}>
      <DialogContent className={`${DIALOGO_PANTALLA_COMPLETA} sm:max-w-2xl`}>
        <DialogHeader className="border-b border-gray-200 px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))] pr-14 text-left">
          <DialogTitle>Requisitos de la vacante</DialogTitle>
          <DialogDescription>
            {titulo ? <>Vacante «{titulo}». </> : null}
            Se revisan sin IA con lo que dice el candidato. En su ficha verás si cumple, no cumple o falta el dato. Es una alerta: nadie se rechaza solo.
          </DialogDescription>
        </DialogHeader>
        {error && !lista ? (
          <div role="alert" className="m-5 flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <span className="flex-1">{mensajeErrorApi(error, "No se pudieron cargar los requisitos.")}</span>
            <Button type="button" variant="outline" onClick={() => mutate()} className="min-h-11 md:min-h-9" startIcon={<RefreshCw className="size-4" />}>Reintentar</Button>
          </div>
        ) : !lista ? (
          <p className="flex items-center gap-2 p-5 text-sm text-gray-500"><Loader2 className="size-4 animate-spin" /> Cargando requisitos…</p>
        ) : (
          <form onSubmit={guardar} noValidate data-editor-requisitos className="flex min-h-0 flex-1 flex-col">
            <div className="grid min-h-0 flex-1 content-start gap-3 overflow-y-auto bg-gray-50 px-4 py-4 sm:px-5">
              {!lista.length ? (
                <div className="grid place-items-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white px-4 py-8 text-center">
                  <ClipboardCheck className="size-8 text-emerald-600" aria-hidden="true" />
                  <p className="font-semibold text-gray-800">Esta vacante no tiene requisitos</p>
                  <p className="max-w-sm text-sm text-gray-600">Agrega los que de verdad pide el puesto. Verás en cada candidato si los cumple.</p>
                </div>
              ) : lista.map((r, i) => {
                const info = TIPOS_REQUISITO.find((t) => t.tipo === r.tipo);
                const cambiar = (c) => cambiarLista(lista.map((x, j) => (j === i ? { ...x, ...c } : x)));
                return (
                  <section key={r.tipo} aria-label={info?.texto} data-requisito={r.tipo} className={`grid gap-3 rounded-xl border bg-white p-3 sm:p-4 ${Object.keys(errores[i] ?? {}).length ? "border-red-300" : "border-gray-200"}`}>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h3 className="min-w-0 flex-1 text-sm font-bold text-gray-900">{info?.texto}</h3>
                      <Interruptor activo={r.activo} onCambiar={(v) => cambiar({ activo: v })}>{r.activo ? "Activo" : "Pausado"}</Interruptor>
                      <button type="button" onClick={() => cambiarLista(lista.filter((_, j) => j !== i))} aria-label={`Quitar requisito ${info?.texto}`}
                        className="grid size-11 place-items-center rounded-lg text-red-600 hover:bg-red-50 md:size-9"><Trash2 className="size-4" /></button>
                    </div>
                    <p className="text-[13px] text-gray-500">{info?.ayuda}</p>
                    <Campos r={r} e={errores[i] ?? {}} cambiar={cambiar} preguntas={preguntas} />
                  </section>
                );
              })}
              {disponibles.length ? (
                <div className="grid gap-1.5">
                  <p className="text-[13px] font-semibold text-gray-700">Agregar requisito</p>
                  <div className="flex flex-wrap gap-1.5">
                    {disponibles.map((t) => (
                      <Button key={t.tipo} type="button" variant="outline" size="sm" startIcon={<Plus className="size-4" />} className="min-h-11 md:min-h-8"
                        onClick={() => cambiarLista([...lista, requisitoNuevo(t.tipo)])}>{t.texto}</Button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="grid gap-2 border-t border-gray-200 bg-white px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
              {errorApi ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-[13px] text-red-800">{errorApi}</p> : null}
              {confirmarSalida ? (
                <AvisoSinGuardar onSeguir={() => setConfirmarSalida(false)} onDescartar={() => onCambiar(false)} />
              ) : (
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => cambiarAbierto(false)} className="min-h-11 flex-1 sm:flex-none md:min-h-9">Cancelar</Button>
                  <Button type="submit" loading={guardando} className="min-h-11 flex-1 sm:flex-none md:min-h-9">Guardar requisitos</Button>
                </div>
              )}
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
