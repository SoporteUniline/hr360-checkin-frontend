"use client";

// Pestaña «Agenda y recordatorios» del diálogo del agente (R3): valores de la empresa para agendar entrevistas.
// GET/PUT /agenda/empresa?empresa=ID. Cada vacante puede usar valores propios en «Enlaces de vacantes → Agenda».
import { useEffect, useId, useRef, useState } from "react";
import useSWR from "swr";
import { BellRing, Loader2, Plus, RefreshCw, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mensajeErrorApi } from "@/lib/whatsapp/reglas.mjs";
import {
  DATOS_EJEMPLO, IDIOMAS_PLANTILLA, LIMITE_TEXTO_AGENTE, LIMITES_EMPRESA, MARCADORES, MAX_RECORDATORIOS, MODOS_AGENDA, PLANTILLAS_SUGERIDAS, TEXTOS_AGENTE,
  agendaEmpresaDesdeApi, agregarRecordatorio, avisoSinPlantilla, insertarEnCursor, leerRecordatorio, marcadoresDesconocidos, renderizarTexto, textoRecordatorio,
  validarAgendaEmpresa,
} from "@/lib/whatsapp/agenda.mjs";
import { guardarAgendaEmpresa, obtener, rutaAgendaEmpresa } from "./api";
import { AvisoSinGuardar, CLASE_ENTRADA, Campo, Interruptor, describir } from "./controles";

function Seccion({ titulo, ayuda, children, id }) {
  return (
    <section className="grid gap-3" aria-labelledby={id}>
      <div className="grid gap-0.5">
        <h3 id={id} className="text-[15px] font-bold text-gray-900">{titulo}</h3>
        {ayuda ? <p className="text-[12.5px] text-gray-600">{ayuda}</p> : null}
      </div>
      {children}
    </section>
  );
}

// Tarjetas de opción (radio) con explicación en lenguaje llano.
export function TarjetasModo({ nombre, valor, onCambiar }) {
  return (
    <div role="radiogroup" aria-label="Quién recibe horarios" className="grid gap-2 sm:grid-cols-3">
      {MODOS_AGENDA.map((m) => (
        <label key={m.valor} data-modo={m.valor}
          className="grid cursor-pointer content-start gap-1 rounded-xl border border-gray-300 bg-white p-3 text-left has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50/60 has-[:checked]:ring-2 has-[:checked]:ring-emerald-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-300">
          <span className="flex items-center gap-2">
            <input type="radio" name={nombre} value={m.valor} checked={valor === m.valor} onChange={() => onCambiar(m.valor)} className="size-4 accent-emerald-600" />
            <span className="text-sm font-semibold text-gray-900">{m.titulo}</span>
          </span>
          <span className="text-[12.5px] leading-snug text-gray-600">{m.texto}</span>
        </label>
      ))}
    </div>
  );
}

function Recordatorios({ id, lista, onCambiar }) {
  const [cantidad, setCantidad] = useState("");
  const [unidad, setUnidad] = useState("horas");
  const [error, setError] = useState("");
  const agregar = () => {
    const leido = leerRecordatorio(cantidad, unidad);
    if (leido.error) { setError(leido.error); return; }
    const r = agregarRecordatorio(lista, leido.minutos);
    setError(r.error);
    if (!r.error) { onCambiar(r.lista); setCantidad(""); }
  };
  return (
    <div className="grid gap-2" data-recordatorios>
      {lista.length ? (
        <ul aria-label="Recordatorios" className="flex flex-wrap gap-1.5">
          {lista.map((m) => (
            <li key={m} className="inline-flex items-center gap-0.5 rounded-full bg-sky-50 pl-3 text-[13px] font-semibold text-sky-900 ring-1 ring-inset ring-sky-200">
              <BellRing className="size-3.5" aria-hidden="true" />
              <span className="ml-1">{textoRecordatorio(m)}</span>
              <button type="button" onClick={() => onCambiar(lista.filter((x) => x !== m))} aria-label={`Quitar recordatorio ${textoRecordatorio(m)}`}
                className="grid size-11 place-items-center rounded-full text-sky-800 hover:bg-sky-100 md:size-8"><X className="size-3.5" /></button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg bg-gray-50 p-2.5 text-[13px] text-gray-600" data-recordatorios-apagados>Recordatorios apagados: el agente no le recuerda la cita al candidato.</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input id={id} inputMode="decimal" value={cantidad} onChange={(e) => { setCantidad(e.target.value); setError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); agregar(); } }}
          aria-label="Tiempo antes de la cita" placeholder="Ej.: 24" aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined}
          className={`${CLASE_ENTRADA.replace("w-full ", "")} h-11 w-24 md:h-9`} />
        <select aria-label="Unidad" value={unidad} onChange={(e) => setUnidad(e.target.value)} className={`${CLASE_ENTRADA.replace("w-full ", "")} h-11 w-auto md:h-9`}>
          <option value="horas">horas antes</option>
          <option value="minutos">minutos antes</option>
        </select>
        <Button type="button" variant="outline" onClick={agregar} disabled={lista.length >= MAX_RECORDATORIOS} className="min-h-11 md:min-h-9" startIcon={<Plus className="size-4" />}>
          Agregar recordatorio
        </Button>
      </div>
      {error ? <p id={`${id}-error`} role="alert" className="text-[12.5px] font-medium text-red-700">{error}</p> : null}
    </div>
  );
}

// Editor de un mensaje del agente: marcadores que se insertan donde está el cursor y vista previa con datos de ejemplo.
function EditorMensajes({ textos, onCambiar, errores = {}, nombreEmpresa }) {
  const ids = useId();
  const [clave, setClave] = useState(TEXTOS_AGENTE[0].clave);
  const area = useRef(null);
  // Al guardar con error en otro mensaje, se muestra ese mensaje para que el foco llegue al campo marcado.
  const primerError = Object.keys(errores ?? {})[0];
  useEffect(() => { if (primerError) setClave(primerError); }, [primerError]);
  const def = TEXTOS_AGENTE.find((t) => t.clave === clave);
  const valor = textos[clave] ?? "";
  const efectivo = valor.trim() ? valor : def.original;
  const raros = marcadoresDesconocidos(valor);
  const error = errores[clave] || (raros.length ? `El agente no conoce ${raros.join(", ")}. Usa los botones de marcadores.` : "");
  const insertar = (marcador) => {
    const el = area.current;
    const base = valor.trim() ? valor : def.original; // al insertar sobre el original, se parte de él
    const inicio = valor.trim() ? el?.selectionStart : base.length;
    const fin = valor.trim() ? el?.selectionEnd : base.length;
    const r = insertarEnCursor(base, inicio, fin, `{${marcador}}`);
    onCambiar({ ...textos, [clave]: r.texto.slice(0, LIMITE_TEXTO_AGENTE) });
    requestAnimationFrame(() => {
      if (!area.current) return;
      area.current.focus();
      area.current.setSelectionRange(r.cursor, r.cursor);
    });
  };
  const idArea = `${ids}-texto`;
  return (
    <div className="grid gap-3" data-editor-mensajes>
      <label className="grid gap-1.5 text-sm">
        <span aria-hidden="true" className="font-semibold text-gray-800">Mensaje</span>
        <select aria-label="Mensaje" value={clave} onChange={(e) => setClave(e.target.value)} className={`${CLASE_ENTRADA} h-11 md:h-9`}>
          {TEXTOS_AGENTE.map((t) => (
            <option key={t.clave} value={t.clave}>{t.titulo}{String(textos[t.clave] ?? "").trim() ? " (personalizado)" : ""}</option>
          ))}
        </select>
      </label>
      <p className="-mt-1 text-[12.5px] text-gray-600">{def.ayuda}</p>
      <div className="grid gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor={idArea} className="text-sm font-semibold text-gray-800">Texto de «{def.titulo}»</label>
          <span className="text-[11.5px] text-gray-500">{valor.length}/{LIMITE_TEXTO_AGENTE}</span>
        </div>
        <textarea id={idArea} ref={area} rows={4} value={valor} maxLength={LIMITE_TEXTO_AGENTE} placeholder={def.original}
          onChange={(e) => onCambiar({ ...textos, [clave]: e.target.value })}
          aria-invalid={error ? true : undefined} aria-describedby={`${idArea}-ayuda${error ? ` ${idArea}-error` : ""}`} className={`${CLASE_ENTRADA} py-2`} />
        <p id={`${idArea}-ayuda`} className="text-[12px] text-gray-500">Vacío = el agente usa el texto original (el gris de arriba).</p>
        {error ? <p id={`${idArea}-error`} className="text-[12.5px] font-medium text-red-700">{error}</p> : null}
      </div>
      <div role="group" aria-label="Insertar marcador" className="flex flex-wrap gap-1.5">
        {MARCADORES.map((m) => (
          <button key={m.clave} type="button" title={m.texto} onMouseDown={(e) => e.preventDefault()} onClick={() => insertar(m.clave)}
            aria-label={`Insertar {${m.clave}} (${m.texto})`}
            className="inline-flex min-h-11 items-center rounded-full border border-violet-200 bg-violet-50 px-3 font-mono text-[12.5px] font-medium text-violet-800 hover:bg-violet-100 md:min-h-8">
            {`{${m.clave}}`}
          </button>
        ))}
      </div>
      <div className="grid gap-1.5">
        <p className="text-[12px] font-bold uppercase tracking-wide text-gray-500">Vista previa</p>
        <div className="rounded-xl bg-[#efeae2] p-3">
          <p data-vista-previa className="ml-auto w-fit max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-br-md border border-violet-200 bg-violet-50 px-3 py-2 text-[13.5px] leading-snug text-gray-900 [overflow-wrap:anywhere]">
            {renderizarTexto(efectivo, { ...DATOS_EJEMPLO, empresa: nombreEmpresa || DATOS_EJEMPLO.empresa })}
          </p>
        </div>
      </div>
      <div>
        <Button type="button" variant="outline" size="sm" onClick={() => onCambiar({ ...textos, [clave]: "" })} disabled={!valor}
          className="min-h-11 md:min-h-8" startIcon={<RotateCcw className="size-4" />}>Restaurar texto original</Button>
      </div>
      <p className="text-[12px] text-gray-500">El mensaje fuera de horario se edita en la pestaña «Agente».</p>
    </div>
  );
}

export default function AgendaEmpresa({ abierto, idEmpresa, nombreEmpresa, onSucio, onGuardado, onCancelar, confirmarSalida, onSeguir, onDescartar }) {
  const ids = useId();
  const id = (s) => `${ids}-${s}`;
  const { data, error, isLoading, mutate } = useSWR(abierto ? rutaAgendaEmpresa(idEmpresa) : null, obtener, { revalidateOnFocus: false });
  const [form, setForm] = useState(null);
  const inicial = useRef("");
  const [errores, setErrores] = useState({});
  const [errorApi, setErrorApi] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!abierto) { setForm(null); setErrores({}); setErrorApi(""); return; }
    if (data && !form) {
      const f = agendaEmpresaDesdeApi(data);
      inicial.current = JSON.stringify(f);
      setForm(f);
    }
  }, [abierto, data, form]);
  const sucio = !!form && JSON.stringify(form) !== inicial.current;
  useEffect(() => { onSucio?.(sucio); }, [sucio, onSucio]);
  const actualizar = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));

  const guardar = async (e) => {
    e.preventDefault();
    const r = validarAgendaEmpresa(form);
    setErrores(r.errores);
    setErrorApi("");
    if (!r.valido) {
      requestAnimationFrame(() => document.querySelector("[data-agenda-empresa] [aria-invalid=true]")?.focus());
      return;
    }
    setGuardando(true);
    try {
      const guardado = await guardarAgendaEmpresa(idEmpresa, r.cuerpo);
      const nuevo = guardado && typeof guardado === "object" && guardado.quien_agenda ? guardado : r.cuerpo;
      await mutate(nuevo, { revalidate: false });
      const f = agendaEmpresaDesdeApi(nuevo);
      inicial.current = JSON.stringify(f);
      setForm(f);
      onGuardado?.();
    } catch (err) {
      setErrorApi(mensajeErrorApi(err, "No se pudo guardar la agenda."));
    } finally {
      setGuardando(false);
    }
  };

  if (error && !form) {
    return (
      <div role="alert" className="m-5 flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        <span className="flex-1">{mensajeErrorApi(error, "No se pudo cargar la agenda de la empresa.")}</span>
        <Button type="button" variant="outline" onClick={() => mutate()} className="min-h-11 md:min-h-9" startIcon={<RefreshCw className="size-4" />}>Reintentar</Button>
      </div>
    );
  }
  if (!form) return <p className="flex items-center gap-2 p-5 text-sm text-gray-500" aria-busy={isLoading}><Loader2 className="size-4 animate-spin" /> Cargando agenda…</p>;
  const aviso = avisoSinPlantilla(form);
  return (
    <form onSubmit={guardar} noValidate data-agenda-empresa className="flex min-h-0 flex-1 flex-col">
      <div className="relative grid min-h-0 flex-1 content-start gap-6 overflow-y-auto px-5 py-4">
        <Seccion id={id("quien")} titulo="¿A quién le ofrece horarios el agente?" ayuda="Aplica a todas las vacantes; en cada vacante puedes cambiarlo.">
          <TarjetasModo nombre={id("modo")} valor={form.quien_agenda} onCambiar={(v) => actualizar("quien_agenda", v)} />
        </Seccion>
        <Seccion id={id("cuando")} titulo="Cuándo se puede agendar">
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo id={id("anticipacion")} etiqueta="Anticipación mínima (horas)" ayuda="Ej.: 2 = no agenda citas que empiecen en menos de 2 h." error={errores.anticipacion_horas}>
              <input id={id("anticipacion")} inputMode="decimal" value={form.anticipacion_horas} onChange={(e) => actualizar("anticipacion_horas", e.target.value)}
                aria-invalid={errores.anticipacion_horas ? true : undefined} aria-describedby={describir(id("anticipacion"), { ayuda: true, error: errores.anticipacion_horas })}
                className={`${CLASE_ENTRADA} h-11 md:h-9`} />
            </Campo>
            <Campo id={id("dias")} etiqueta="Días hacia adelante" ayuda={`Hasta cuántos días después ofrece horarios (${LIMITES_EMPRESA.dias.min} a ${LIMITES_EMPRESA.dias.max}).`} error={errores.dias_adelante}>
              <input id={id("dias")} inputMode="numeric" value={form.dias_adelante} onChange={(e) => actualizar("dias_adelante", e.target.value)}
                aria-invalid={errores.dias_adelante ? true : undefined} aria-describedby={describir(id("dias"), { ayuda: true, error: errores.dias_adelante })}
                className={`${CLASE_ENTRADA} h-11 md:h-9`} />
            </Campo>
            <Campo id={id("ofrecer")} etiqueta="Horarios a ofrecer" ayuda="Cuántas opciones le da al candidato para que elija (ej.: 3)." error={errores.horarios_a_ofrecer}>
              <input id={id("ofrecer")} inputMode="numeric" value={form.horarios_a_ofrecer} onChange={(e) => actualizar("horarios_a_ofrecer", e.target.value)}
                aria-invalid={errores.horarios_a_ofrecer ? true : undefined} aria-describedby={describir(id("ofrecer"), { ayuda: true, error: errores.horarios_a_ofrecer })}
                className={`${CLASE_ENTRADA} h-11 md:h-9`} />
            </Campo>
          </div>
        </Seccion>
        <Seccion id={id("recordatorios")} titulo="Recordatorios por WhatsApp" ayuda="Cuánto tiempo antes de la cita le escribe el agente. Puedes tener varios (máximo 5).">
          <Recordatorios id={id("recordatorio")} lista={form.recordatorios} onCambiar={(v) => actualizar("recordatorios", v)} />
          <div className="grid gap-1 rounded-xl border border-gray-200 p-3">
            <Interruptor activo={form.pedir_confirmacion} onCambiar={(v) => actualizar("pedir_confirmacion", v)}>Pedir que confirme su asistencia</Interruptor>
            <Interruptor activo={form.permitir_cambios} onCambiar={(v) => actualizar("permitir_cambios", v)}>Dejar que cambie o cancele su cita por WhatsApp</Interruptor>
            <Interruptor activo={form.ofrecer_alternas} onCambiar={(v) => actualizar("ofrecer_alternas", v)}>Ofrecer otras vacantes si no califica</Interruptor>
          </div>
        </Seccion>
        <Seccion id={id("plantillas")} titulo="Plantillas de WhatsApp"
          ayuda="Pasadas 24 h desde el último mensaje del candidato, WhatsApp solo permite escribirle con una plantilla aprobada. Créalas en Zernio y espera a que Meta las apruebe; luego escribe aquí su nombre exacto.">
          <p className="rounded-lg bg-blue-50 p-2.5 text-[12.5px] text-blue-900" data-plantillas-sugeridas>
            Nombres sugeridos: {PLANTILLAS_SUGERIDAS.map((n, i) => (
              <span key={n}><code className="rounded bg-white px-1 font-mono text-[12px]">{n}</code>{i < PLANTILLAS_SUGERIDAS.length - 1 ? ", " : "."}</span>
            ))}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo id={id("p-rec")} etiqueta="Plantilla de recordatorio" error={errores.plantilla_recordatorio}>
              <input id={id("p-rec")} value={form.plantilla_recordatorio} onChange={(e) => actualizar("plantilla_recordatorio", e.target.value)} placeholder={PLANTILLAS_SUGERIDAS[0]}
                autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-invalid={errores.plantilla_recordatorio ? true : undefined}
                aria-describedby={describir(id("p-rec"), { error: errores.plantilla_recordatorio })} className={`${CLASE_ENTRADA} h-11 font-mono md:h-9`} />
            </Campo>
            <Campo id={id("p-seg")} etiqueta="Plantilla de seguimiento" error={errores.plantilla_seguimiento}>
              <input id={id("p-seg")} value={form.plantilla_seguimiento} onChange={(e) => actualizar("plantilla_seguimiento", e.target.value)} placeholder={PLANTILLAS_SUGERIDAS[1]}
                autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-invalid={errores.plantilla_seguimiento ? true : undefined}
                aria-describedby={describir(id("p-seg"), { error: errores.plantilla_seguimiento })} className={`${CLASE_ENTRADA} h-11 font-mono md:h-9`} />
            </Campo>
            <Campo id={id("p-idioma")} etiqueta="Idioma de las plantillas" error={errores.plantilla_idioma}>
              <select id={id("p-idioma")} value={form.plantilla_idioma} onChange={(e) => actualizar("plantilla_idioma", e.target.value)} className={`${CLASE_ENTRADA} h-11 md:h-9`}>
                {IDIOMAS_PLANTILLA.map((i) => <option key={i.valor} value={i.valor}>{i.texto}</option>)}
              </select>
            </Campo>
          </div>
          {aviso ? <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[12.5px] text-amber-900">{aviso}</p> : null}
        </Seccion>
        <Seccion id={id("mensajes")} titulo="Mensajes del agente" ayuda="Personaliza lo que dice el agente. Los marcadores se cambian por los datos reales de cada candidato y cita.">
          <EditorMensajes textos={form.textos} onCambiar={(v) => actualizar("textos", v)} errores={errores.textos} nombreEmpresa={nombreEmpresa} />
        </Seccion>
      </div>
      <div className="grid gap-2 border-t border-gray-200 bg-white px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        {errorApi ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-[13px] text-red-800">{errorApi}</p> : null}
        {Object.keys(errores).length ? <p role="alert" className="text-[13px] font-medium text-red-700">Revisa los campos marcados.</p> : null}
        {confirmarSalida ? (
          <AvisoSinGuardar onSeguir={onSeguir} onDescartar={onDescartar} />
        ) : (
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancelar} className="min-h-11 flex-1 sm:flex-none md:min-h-9">Cancelar</Button>
            <Button type="submit" loading={guardando} className="min-h-11 flex-1 sm:flex-none md:min-h-9">Guardar agenda</Button>
          </div>
        )}
      </div>
    </form>
  );
}
