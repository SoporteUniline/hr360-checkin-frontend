"use client";

// Newsletter semanal y Guía 2027 (solo administradores de ADAMIA). Backend: /api/checador/newsletter (docs/newsletter.md).
// El boletín se genera el lunes 8:00 y sale el martes 9:00 (hora de la CDMX) a quienes aceptaron noticias. Aquí se revisa,
// se editan los textos, se aprueba y envía o se cancela. Página (no ventana); letra ≥ 16 px, títulos 700, botones ≥ 48 px.
import { useEffect, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { enqueueSnackbar } from "notistack";
import { fetcherWithToken } from "@/lib/fetcher";
import { enCurso, estadoBoletin, fechaLarga, semanaDe, textoEnvio, validarCorreos, MAX_AVISOS } from "@/lib/newsletter/reglas.mjs";
import { Aviso, CAMPO, Insignia, PRIMARIO, SECUNDARIO, TARJETA, pedir } from "./ui";
import Boletin from "./Boletin";
import Guia from "./Guia";

function Ajustes({ ajustes, alGuardar }) {
  const [requerir, setRequerir] = useState(Boolean(ajustes?.requerir_aprobacion));
  const [correos, setCorreos] = useState(ajustes?.correos_aviso?.length ? ajustes.correos_aviso : [""]);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  useEffect(() => {
    setRequerir(Boolean(ajustes?.requerir_aprobacion));
    setCorreos(ajustes?.correos_aviso?.length ? ajustes.correos_aviso : [""]);
  }, [ajustes]);

  const guardar = async () => {
    const v = validarCorreos(correos);
    if (v.error) { setError(v.error); return; }
    setError("");
    setGuardando(true);
    try {
      await pedir("/ajustes", { method: "PUT", body: JSON.stringify({ requerir_aprobacion: requerir, correos_aviso: v.lista }) });
      enqueueSnackbar("Ajustes guardados.", { variant: "success" });
      alGuardar();
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className={TARJETA} aria-labelledby="titulo-ajustes">
      <h2 id="titulo-ajustes" className="text-[1.25rem] font-bold">Ajustes del envío</h2>
      <label htmlFor="requerir" className="flex cursor-pointer items-start gap-3">
        <input id="requerir" type="checkbox" className="mt-1 size-5 shrink-0 accent-[#2C56E8]" checked={requerir} onChange={(e) => setRequerir(e.target.checked)} />
        <span>
          <span className="block font-bold">Requerir mi aprobación</span>
          <span className="block text-[#4B5563]">Si la activas, el boletín no se envía solo el martes: espera a que lo apruebes aquí.</span>
        </span>
      </label>
      <fieldset className="grid min-w-0 gap-3">
        <legend className="mb-1 font-bold">Avisar por correo a</legend>
        <p className="text-[#4B5563]">Cuando el boletín esté listo te llega un correo con el enlace a esta página (hasta {MAX_AVISOS} correos).</p>
        {correos.map((c, i) => (
          <div key={i} className="flex gap-3">
            <input type="email" aria-label={`Correo ${i + 1}`} className={`${CAMPO} h-12`} value={c} maxLength={255} placeholder="nombre@adamia.com.mx" onChange={(e) => setCorreos((l) => l.map((x, j) => (j === i ? e.target.value : x)))} />
            {correos.length > 1 ? <button type="button" className={SECUNDARIO} onClick={() => setCorreos((l) => l.filter((_, j) => j !== i))}>Quitar</button> : null}
          </div>
        ))}
        {correos.length < MAX_AVISOS ? <button type="button" className={`${SECUNDARIO} justify-self-start`} onClick={() => setCorreos((l) => [...l, ""])}>Agregar otro correo</button> : null}
      </fieldset>
      {error ? <p role="alert" className="font-bold text-[#B91C1C]">{error}</p> : null}
      <div><button type="button" className={PRIMARIO} onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar ajustes"}</button></div>
    </section>
  );
}

export default function NewsletterPage() {
  const { data, error, isLoading, mutate } = useSWR("/checador/newsletter", fetcherWithToken, {
    refreshInterval: (d) => ((d?.boletines ?? []).some(enCurso) ? 5000 : 0),
  });
  const boletines = data?.boletines ?? [];
  const [elegido, setElegido] = useState(null);
  const [generando, setGenerando] = useState(false);
  const actual = boletines.find((b) => b.id === elegido) ?? boletines.find((b) => ["borrador", "programado", "enviando"].includes(b.estado)) ?? boletines[0] ?? null;
  const cfg = data?.configuracion;
  const mensajeError = error?.response?.data?.error || error?.message;

  const generar = async () => {
    setGenerando(true);
    try {
      const r = await pedir("/generar", { method: "POST" });
      enqueueSnackbar(r.mensaje || "Generando el boletín…", { variant: "info" });
      setTimeout(() => mutate(), 1500);
    } catch (e) {
      enqueueSnackbar(e.message, { variant: "error" });
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div data-pagina="newsletter" className="grid min-w-0 gap-6 text-base text-[#0B1033] [&>*]:min-w-0">
      <header className="grid gap-2">
        <h1 className="text-[1.75rem] font-bold leading-tight">Newsletter semanal</h1>
        <p className="text-[#4B5563]">Cada lunes a las 8:00 se prepara un boletín con las novedades de la reforma laboral, con su fuente. Sale el martes a las 9:00 (hora de la Ciudad de México) a quienes aceptaron recibir noticias.</p>
        <p><Link href="/dashboard/prospectos" className="inline-flex min-h-12 items-center font-bold text-[#1E40C4] underline underline-offset-4">Ver prospectos y quién acepta noticias</Link></p>
      </header>

      {isLoading && !data ? (
        <p className="rounded-2xl border border-[#D8DEEB] bg-white p-6 text-[#4B5563]" role="status">Cargando…</p>
      ) : error ? (
        <Aviso tono="peligro" titulo="No se pudo cargar el newsletter">{mensajeError || "Intenta de nuevo."}</Aviso>
      ) : (
        <>
          <section className="grid gap-3" aria-label="Estado de la configuración">
            {!cfg?.resend?.configurado ? (
              <Aviso tono="peligro" titulo="Falta configurar Resend">{cfg?.resend?.motivo || "Falta configurar Resend."} Mientras tanto el boletín no se envía.</Aviso>
            ) : null}
            {!cfg?.ia ? <Aviso tono="alerta" titulo="Falta la llave de la IA">Sin GEMINI_API_KEY no se puede preparar el boletín.</Aviso> : null}
            {!cfg?.cron ? <Aviso tono="info" titulo="El horario automático está apagado">En este servidor no corre el horario del lunes y el martes (ENABLE_NEWSLETTER_CRON). Puedes generarlo y enviarlo desde aquí.</Aviso> : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#D8DEEB] bg-white p-5">
                <p className="text-[#4B5563]">Aceptan recibir noticias hoy</p>
                <p className="text-[2rem] font-bold leading-tight">{Number(data?.suscriptores ?? 0).toLocaleString("es-MX")}</p>
              </div>
              <div className="rounded-2xl border border-[#D8DEEB] bg-white p-5">
                <p className="text-[#4B5563]">Envío automático</p>
                <p className="text-[1.25rem] font-bold leading-tight">{data?.ajustes?.requerir_aprobacion ? "Solo con tu aprobación" : "Martes 9:00, si no lo cancelas"}</p>
              </div>
            </div>
          </section>

          {actual ? (
            <Boletin key={actual.id} resumen={actual} requerirAprobacion={Boolean(data?.ajustes?.requerir_aprobacion)} suscriptores={data?.suscriptores ?? 0} alCambiar={() => mutate()} alGenerar={generar} generando={generando} />
          ) : (
            <section className={TARJETA}>
              <h2 className="text-[1.25rem] font-bold">Todavía no hay boletines</h2>
              <p className="text-[#4B5563]">El primero se prepara solo el próximo lunes a las 8:00. También puedes prepararlo ahora.</p>
              <div><button type="button" className={PRIMARIO} onClick={generar} disabled={generando || !cfg?.ia}>{generando ? "Preparando…" : "Preparar el boletín de esta semana"}</button></div>
            </section>
          )}

          <Ajustes ajustes={data?.ajustes} alGuardar={() => mutate()} />

          {boletines.length ? (
            <section className={TARJETA} aria-labelledby="titulo-historial">
              <h2 id="titulo-historial" className="text-[1.25rem] font-bold">Historial</h2>
              <ul className="grid gap-3" aria-label="Boletines">
                {boletines.map((b) => {
                  const e = estadoBoletin(b);
                  return (
                    <li key={b.id} className="flex flex-col gap-3 rounded-xl border border-[#E5E9F2] p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="grid min-w-0 gap-1">
                        <p className="font-bold break-words">{b.asunto || semanaDe(b)}</p>
                        <p className="text-[#374151]">{semanaDe(b)}{b.estado === "enviado" ? ` · ${b.enviados} enviados` : b.programado_para && b.estado === "programado" ? ` · ${fechaLarga(b.programado_para)}` : ""}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <Insignia tono={e.tono}>{e.texto}</Insignia>
                        <button type="button" className={SECUNDARIO} aria-pressed={actual?.id === b.id} onClick={() => { setElegido(b.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                          {actual?.id === b.id ? "Abierto arriba" : "Ver"}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="text-[#4B5563]">{textoEnvio(actual, { requerirAprobacion: Boolean(data?.ajustes?.requerir_aprobacion) })}</p>
            </section>
          ) : null}

          <Guia />
        </>
      )}
    </div>
  );
}
