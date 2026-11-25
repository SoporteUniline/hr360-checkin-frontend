"use client";

// Plantillas de felicitación (maqueta Plantillas.dc.html) para RH y el dueño. Decisiones del dueño:
//   - CORREO editable por empresa: diseño, asunto y mensaje con variables, vista previa real del correo, «Enviarme una
//     prueba» y dos interruptores (envío automático el día, que además depende de la regla de aviso existente, y aviso en
//     la campana). Sin personalizar se usa el correo de ADAMIA.
//   - WhatsApp: solo vista previa del catálogo fijo aprobado por Meta (sin cuadro de texto); el envío automático por
//     WhatsApp aparece «próximamente».
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Loader2, RotateCcw, Save, Send } from "lucide-react";
import axios from "@/lib/axios";
import { useEmpresaNomina, SelectorEmpresa } from "@/components/nomina/comun";
import { useGuardiaSalida } from "@/components/cambios/CambiosPendientes";
import {
  API, DISENOS, RUTA_REGLAS, TIPOS, borradorDe, codigoError, cuerpoGuardar, hayCambios, insertarVariable, mensajeError, textosCambiados,
  variablesDesconocidas,
} from "@/lib/avisos/avisos.mjs";
import { cn } from "@/lib/utils";
import { useSesionAvisos } from "./useAvisos";

const get = (url) => axios.get(url).then((r) => r.data);
const BOTON = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-60";
const NOMBRE_REGLA = { cumpleanos: "Felicitar cumpleaños", aniversario: "Felicitar aniversario" };

export default function PlantillasFelicitacion() {
  const { esRH } = useSesionAvisos();
  const { empresas, idEmpresa, setIdEmpresa } = useEmpresaNomina();
  const listo = !empresas.length || Boolean(idEmpresa);
  const { data, error, mutate } = useSWR(esRH && listo ? `${API}/plantillas${idEmpresa ? `?empresa=${idEmpresa}` : ""}` : null, get, {
    revalidateOnFocus: false, shouldRetryOnError: false,
  });
  const [tipo, setTipo] = useState("cumpleanos");
  const [borradores, setBorradores] = useState({});
  const [mensaje, setMensaje] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [probando, setProbando] = useState(false);

  const guardadas = useMemo(() => Object.fromEntries((data?.plantillas ?? []).map((p) => [p.tipo, p])), [data]);
  // Al cargar (o cambiar de empresa) los borradores empiezan como lo guardado.
  useEffect(() => {
    if (data?.plantillas) setBorradores(Object.fromEntries(data.plantillas.map((p) => [p.tipo, borradorDe(p)])));
  }, [data]);

  const sucios = TIPOS.map((t) => t.clave).filter((t) => borradores[t] && guardadas[t] && hayCambios(borradores[t], guardadas[t]));
  const actual = borradores[tipo];
  const guardada = guardadas[tipo];
  const cambiar = (cambios) => setBorradores((b) => ({ ...b, [tipo]: { ...b[tipo], ...cambios } }));

  const guardarTodo = useCallback(async () => {
    setGuardando(true);
    setMensaje(null);
    try {
      for (const t of sucios) {
        await axios.put(`${API}/plantillas/${t}`, { empresa: idEmpresa ?? undefined, ...cuerpoGuardar(borradores[t], guardadas[t]) });
      }
      await mutate();
      setMensaje({ tono: "ok", texto: "Cambios guardados. Las próximas felicitaciones ya los usan." });
      return true;
    } catch (e) {
      setMensaje({ tono: "error", texto: mensajeError(e, "No se pudo guardar la plantilla."), recargar: codigoError(e) === "CAMBIO_SIMULTANEO" });
      return false;
    } finally {
      setGuardando(false);
    }
  }, [sucios, borradores, guardadas, idEmpresa, mutate]);
  useGuardiaSalida({ hayCambios: sucios.length > 0, guardar: guardarTodo });

  const restaurar = async () => {
    setMensaje(null);
    try {
      await axios.delete(`${API}/plantillas/${tipo}${idEmpresa ? `?empresa=${idEmpresa}` : ""}`);
      await mutate();
      setMensaje({ tono: "ok", texto: "Listo: se vuelve a usar el correo de ADAMIA." });
    } catch (e) {
      setMensaje({ tono: "error", texto: mensajeError(e) });
    }
  };

  const probar = async () => {
    setProbando(true);
    setMensaje(null);
    try {
      const r = await axios.post(`${API}/plantillas/prueba`, { empresa: idEmpresa ?? undefined, tipo, ...actual });
      setMensaje({ tono: "ok", texto: `Te mandamos la prueba a ${r.data.para}.` });
    } catch (e) {
      setMensaje({ tono: "error", texto: mensajeError(e, "No se pudo mandar la prueba.") });
    } finally {
      setProbando(false);
    }
  };

  if (!esRH) return <p className="p-6 text-sm text-slate-700">Solo RH y el dueño editan las plantillas de felicitación.</p>;
  if (error && !data) return <p role="alert" className="p-6 text-sm text-red-800">{mensajeError(error, "No se pudieron cargar las plantillas.")}</p>;
  if (!data || !actual) return <p role="status" className="flex items-center gap-2 p-6 text-sm text-slate-600"><Loader2 aria-hidden="true" className="size-4 animate-spin" />Cargando plantillas…</p>;

  const desconocidas = [...variablesDesconocidas(actual.asunto, data.variables), ...variablesDesconocidas(actual.mensaje, data.variables)];
  const sinMigracion = data.migracion === false;

  return (
    <div data-plantillas-felicitacion className="mx-auto flex w-full min-w-0 max-w-[1440px] flex-col gap-4 text-slate-900">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold">Plantillas de felicitación</h1>
          <p className="mt-1 text-sm text-slate-600">Lo que reciben tus empleados en su cumpleaños y en su aniversario, por correo y por WhatsApp.</p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <SelectorEmpresa empresas={empresas} idEmpresa={idEmpresa} setIdEmpresa={setIdEmpresa} />
          <button type="button" onClick={probar} disabled={probando || desconocidas.length > 0} className={cn(BOTON, "flex-1 border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 sm:flex-none")}>
            {probando ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Send aria-hidden="true" className="size-4" />}Enviarme una prueba
          </button>
          <button type="button" onClick={guardarTodo} disabled={guardando || !sucios.length || sinMigracion || desconocidas.length > 0} className={cn(BOTON, "flex-1 bg-brand text-white hover:bg-blue-700 sm:flex-none")}>
            {guardando ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Save aria-hidden="true" className="size-4" />}Guardar
          </button>
        </div>
      </header>

      {sinMigracion ? (
        <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Falta preparar la base de datos de avisos y felicitaciones: por ahora no se puede guardar y se usa el correo de ADAMIA.
        </p>
      ) : null}
      {mensaje ? (
        <p role={mensaje.tono === "error" ? "alert" : "status"} className={cn("rounded-xl p-3 text-sm", mensaje.tono === "error" ? "bg-red-50 text-red-800" : "bg-green-50 text-green-900")}>
          {mensaje.texto}
          {mensaje.recargar ? <button type="button" onClick={() => mutate()} className="ml-2 font-semibold underline">Recargar</button> : null}
        </p>
      ) : null}

      <div className="grid min-w-0 gap-4 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_420px]">
        <nav aria-label="Plantillas" className="flex flex-col gap-1 self-start rounded-2xl border border-slate-200 bg-white p-2.5 max-lg:flex-row max-lg:flex-wrap">
          {TIPOS.map((t) => (
            <button key={t.clave} type="button" aria-current={t.clave === tipo ? "page" : undefined} onClick={() => setTipo(t.clave)}
              className={cn("flex min-h-12 items-center gap-2.5 rounded-xl px-3 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand max-lg:flex-1",
                t.clave === tipo ? "bg-blue-50 font-bold text-blue-800" : "text-slate-700 hover:bg-slate-50")}>
              <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ background: t.color }} />
              {t.etiqueta}
              {sucios.includes(t.clave) ? <span className="ml-auto text-[12px] font-semibold text-amber-800">sin guardar</span> : null}
            </button>
          ))}
          <p className="px-3 pb-1 pt-2 text-[12px] text-slate-600 max-lg:basis-full">El fin de contrato no se felicita: solo avisa a RH en la campana.</p>
        </nav>

        <Editor tipo={tipo} actual={actual} guardada={guardada} data={data} cambiar={cambiar} restaurar={restaurar} desconocidas={desconocidas} />

        <VistaPrevia tipo={tipo} actual={actual} guardada={guardada} data={data} idEmpresa={idEmpresa} />
      </div>
    </div>
  );
}

function Editor({ tipo, actual, guardada, data, cambiar, restaurar, desconocidas }) {
  const ids = useId();
  const mensajeRef = useRef(null);
  const asuntoRef = useRef(null);
  const ultimo = useRef("mensaje"); // dónde se inserta la variable: el último campo que tuvo el foco
  const insertar = (v) => {
    const campo = ultimo.current;
    const el = campo === "asunto" ? asuntoRef.current : mensajeRef.current;
    const r = insertarVariable(actual[campo], v, el?.selectionStart, el?.selectionEnd);
    cambiar({ [campo]: r.texto });
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(r.cursor, r.cursor); });
  };
  const nombreTipo = tipo === "cumpleanos" ? "del cumpleaños" : "del aniversario";

  return (
    <section aria-labelledby={`${ids}-titulo`} className="flex min-w-0 flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-[22px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`${ids}-titulo`} className="text-base font-bold">Correo {tipo === "cumpleanos" ? "de cumpleaños" : "de aniversario laboral"}</h2>
        <p className="text-[13px] text-slate-600">
          {guardada?.personalizada
            ? <>Personalizada{guardada.actualizado_por ? ` · guardó ${guardada.actualizado_por}` : ""} · <button type="button" onClick={restaurar} className="inline-flex min-h-11 items-center gap-1 font-semibold text-brand hover:underline"><RotateCcw aria-hidden="true" className="size-3.5" />Volver a la de ADAMIA</button></>
            : "Hoy se usa el correo de ADAMIA. Cuando guardes, se usará el tuyo."}
        </p>
      </div>

      <div>
        <p id={`${ids}-diseno`} className="mb-2.5 text-sm font-bold">Diseño</p>
        <div role="radiogroup" aria-labelledby={`${ids}-diseno`} className="grid grid-cols-3 gap-2.5">
          {DISENOS.map((d) => {
            const activo = actual.diseno === d.clave;
            return (
              <button key={d.clave} type="button" role="radio" aria-checked={activo} onClick={() => cambiar({ diseno: d.clave })}
                className={cn("min-w-0 rounded-2xl bg-white p-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand", activo ? "border-2 border-brand" : "border border-slate-200")}>
                <Miniatura diseno={d.clave} />
                <b className={cn("mt-2 block text-sm", activo && "text-blue-800")}>{d.etiqueta}</b>
                <span className="block text-[12.5px] text-slate-600">{d.descripcion}</span>
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-bold">
        Asunto del correo
        <input ref={asuntoRef} value={actual.asunto} maxLength={data.limites?.asunto ?? 150} onFocus={() => { ultimo.current = "asunto"; }}
          onChange={(e) => cambiar({ asunto: e.target.value })}
          className="h-11 w-full min-w-0 rounded-xl border border-slate-300 px-3 text-[14.5px] font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-bold">
        Mensaje
        <textarea ref={mensajeRef} rows={7} value={actual.mensaje} maxLength={data.limites?.mensaje ?? 2000} onFocus={() => { ultimo.current = "mensaje"; }}
          onChange={(e) => cambiar({ mensaje: e.target.value })} aria-describedby={`${ids}-ayuda`}
          className="w-full min-w-0 resize-y rounded-xl border border-slate-300 px-3.5 py-3 text-[14.5px] font-normal leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" />
        <span id={`${ids}-ayuda`} className="text-[12.5px] font-normal text-slate-600">Deja una línea en blanco para separar párrafos. No se puede poner HTML: lo que escribas sale tal cual.</span>
      </label>

      <div className="flex flex-wrap items-center gap-1.5 text-[13px] text-slate-600">
        <span>Toca para insertar:</span>
        {data.variables.map((v) => (
          <button key={v} type="button" onClick={() => insertar(v)} onMouseDown={(e) => e.preventDefault()}
            className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-2.5 text-[13px] font-semibold text-slate-900 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:min-h-8">
            {`{${v}}`}
          </button>
        ))}
      </div>
      {desconocidas.length ? (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">No existe {desconocidas.map((v) => `{${v}}`).join(", ")}. Usa solo las de arriba.</p>
      ) : null}

      <fieldset className="flex flex-col gap-1 border-t border-slate-100 pt-4">
        <legend className="sr-only">Envío y avisos</legend>
        <label className="flex min-h-11 items-start gap-3 py-1.5 text-sm">
          <input type="checkbox" checked={actual.envio_correo_auto} onChange={(e) => cambiar({ envio_correo_auto: e.target.checked })} className="mt-0.5 size-5 shrink-0 accent-[#2563eb]" />
          <span><b>Enviar automático por correo</b> el día {nombreTipo} a las {data.hora_envio ?? "9:05"} a. m.
            {actual.envio_correo_auto && !guardada?.regla_activa ? (
              <span className="mt-1 block text-[13px] text-amber-900">Hoy no sale: la regla «{NOMBRE_REGLA[tipo]}» está apagada. <Link href={RUTA_REGLAS} className="font-semibold underline">Ir a Reglas de aviso</Link></span>
            ) : null}
          </span>
        </label>
        <label className="flex min-h-11 items-start gap-3 py-1.5 text-sm">
          <input type="checkbox" checked={actual.aviso_campana} onChange={(e) => cambiar({ aviso_campana: e.target.checked })} className="mt-0.5 size-5 shrink-0 accent-[#2563eb]" />
          <span><b>Avisarme en la campana</b> 7 días antes, para felicitar por WhatsApp</span>
        </label>
        <WhatsappAutomatico actual={actual} cambiar={cambiar} estado={data.whatsapp?.automatico} nombreTipo={nombreTipo} hora={data.hora_envio ?? "9:05"} />
      </fieldset>
    </section>
  );
}

// Envío automático por WhatsApp (ajuste del dueño): plantilla aprobada por Meta desde el número principal de ADAMIA.
// Apagado por omisión; deshabilitado si el servidor no tiene configurado el número de notificaciones.
function WhatsappAutomatico({ actual, cambiar, estado, nombreTipo, hora }) {
  const ids = useId();
  const disponible = Boolean(estado?.configurado);
  return (
    <label className={cn("flex min-h-11 items-start gap-3 py-1.5 text-sm", !disponible && "text-slate-600")}>
      <input type="checkbox" checked={disponible && Boolean(actual.envio_whatsapp_auto)} disabled={!disponible}
        onChange={(e) => cambiar({ envio_whatsapp_auto: e.target.checked })} aria-describedby={`${ids}-wa`}
        className="mt-0.5 size-5 shrink-0 accent-[#15803d]" />
      <span><b>Enviar automático por WhatsApp</b> el día {nombreTipo} a las {hora} a. m., con el mensaje aprobado por WhatsApp
        <span id={`${ids}-wa`} className="mt-0.5 block text-[13px] text-slate-600">
          {disponible
            ? "Sale del número de WhatsApp de ADAMIA. Si WhatsApp aún no aprueba el mensaje, no se manda y lo puedes felicitar a mano desde la campana."
            : `${estado?.motivo ?? "Falta configurar el número de notificaciones"}: por ahora no se puede encender.`}
        </span>
      </span>
    </label>
  );
}

function Miniatura({ diseno }) {
  if (diseno === "festivo") {
    return (
      <span aria-hidden="true" className="relative block h-[70px] overflow-hidden rounded-[10px] bg-[#1D5CF5]">
        <span className="absolute left-3 top-2.5 size-1.5 rounded-sm bg-[#FDE047]" /><span className="absolute left-10 top-[22px] size-1.5 rounded-sm bg-[#F9A8D4]" />
        <span className="absolute right-6 top-3.5 size-1.5 rounded-sm bg-[#86EFAC]" /><span className="absolute bottom-3 left-3 h-2 w-3/5 rounded bg-white" />
      </span>
    );
  }
  if (diseno === "elegante") {
    return (
      <span aria-hidden="true" className="relative block h-[70px] rounded-[10px] bg-[#0F172A]">
        <span className="absolute inset-x-3 top-3.5 h-px bg-[#D4AF37]" /><span className="absolute bottom-3.5 left-3 h-2 w-[55%] rounded bg-[#D4AF37]" />
      </span>
    );
  }
  return (
    <span aria-hidden="true" className="relative block h-[70px] rounded-[10px] bg-slate-100">
      <span className="absolute left-3 top-3.5 h-2 w-2/5 rounded bg-slate-900" /><span className="absolute left-3 top-[30px] h-1.5 w-[70%] rounded bg-slate-300" />
      <span className="absolute left-3 top-[42px] h-1.5 w-3/5 rounded bg-slate-300" />
    </span>
  );
}

// Vista previa: el correo real (HTML del servidor en un iframe sin scripts) o los mensajes fijos de WhatsApp.
function VistaPrevia({ tipo, actual, guardada, data, idEmpresa }) {
  const ids = useId();
  const [pestana, setPestana] = useState("correo");
  const [previa, setPrevia] = useState({ estado: "cargando" });
  // Sin personalizar y sin cambios: se ve el correo de ADAMIA (el que hoy sale). Con cambios: el borrador.
  const sistema = !guardada?.personalizada && !textosCambiados(actual, guardada);
  const cuerpo = JSON.stringify(sistema ? { tipo, sistema: true } : { tipo, ...actual });

  useEffect(() => {
    if (pestana !== "correo") return;
    let vivo = true;
    const espera = setTimeout(() => {
      setPrevia((p) => ({ ...p, estado: "cargando" }));
      axios.post(`${API}/plantillas/vista-previa`, { empresa: idEmpresa ?? undefined, ...JSON.parse(cuerpo) })
        .then((r) => vivo && setPrevia({ estado: "listo", ...r.data }))
        .catch((e) => vivo && setPrevia({ estado: "error", error: mensajeError(e, "No se pudo armar la vista previa.") }));
    }, 350);
    return () => { vivo = false; clearTimeout(espera); };
  }, [cuerpo, pestana, idEmpresa]);

  const whatsapp = (data.whatsapp?.plantillas ?? []).filter((p) => p.tipo === tipo);
  return (
    <section aria-label="Vista previa" className="flex min-w-0 flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 lg:col-span-2 xl:col-span-1">
      <div role="tablist" aria-label="Vista previa" className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 p-1.5">
        {[["correo", "Correo"], ["whatsapp", "WhatsApp"]].map(([clave, etiqueta]) => (
          <button key={clave} type="button" role="tab" id={`${ids}-${clave}`} aria-selected={pestana === clave} aria-controls={`${ids}-p-${clave}`} onClick={() => setPestana(clave)}
            className={cn("min-h-11 rounded-lg text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand", pestana === clave ? "bg-white font-bold text-blue-800 shadow-sm" : "font-semibold text-slate-700")}>
            {etiqueta}
          </button>
        ))}
      </div>
      {pestana === "correo" ? (
        <div role="tabpanel" id={`${ids}-p-correo`} aria-labelledby={`${ids}-correo`} className="flex flex-col gap-2">
          <p className="text-[12.5px] text-slate-600">Vista previa con {data.ejemplo?.nombreCompleto ?? "datos de ejemplo"}{sistema ? " · correo de ADAMIA" : ""}</p>
          {previa.estado === "error" ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{previa.error}</p> : null}
          {previa.html ? (
            <>
              <p className="text-[13px] text-slate-700"><b>Asunto:</b> {previa.subject}</p>
              <iframe title="Vista previa del correo" sandbox="" srcDoc={previa.html} data-vista-correo className={cn("h-[560px] w-full rounded-xl border border-slate-200 bg-white transition-opacity", previa.estado === "cargando" && "opacity-60")} />
            </>
          ) : previa.estado === "cargando" ? (
            <p role="status" className="flex min-h-40 items-center justify-center gap-2 text-sm text-slate-600"><Loader2 aria-hidden="true" className="size-4 animate-spin" />Armando la vista previa…</p>
          ) : null}
        </div>
      ) : (
        <div role="tabpanel" id={`${ids}-p-whatsapp`} aria-labelledby={`${ids}-whatsapp`} className="flex flex-col gap-3">
          <p className="text-[13px] font-semibold text-slate-700">{data.whatsapp?.nota ?? "Texto aprobado por WhatsApp; no se puede cambiar."}</p>
          <ul className="flex flex-col gap-3" aria-label="Mensajes de WhatsApp">
            {whatsapp.map((p) => (
              <li key={p.clave} className="rounded-2xl bg-[#E7F0E4] p-3">
                <p className="mb-1.5 text-[12.5px] font-bold text-slate-700">{p.etiqueta} · <span className="font-normal">{p.descripcion}</span></p>
                <p data-mensaje-whatsapp className="ml-auto max-w-[95%] whitespace-pre-line break-words rounded-xl rounded-br-sm bg-[#D9FDD3] px-3 py-2.5 text-sm leading-relaxed text-[#111B21] shadow-sm">{p.texto}</p>
              </li>
            ))}
          </ul>
          <p className="text-[12.5px] text-slate-600">Los redacta ADAMIA y los aprueba WhatsApp (Meta). Al felicitar eliges uno; los datos se llenan solos.</p>
        </div>
      )}
    </section>
  );
}
