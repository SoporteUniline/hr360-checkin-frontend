"use client";

// Un boletín: estado, «Aprobar y enviar ahora», «Cancelar este envío» (con confirmación en línea), edición de textos,
// notas descartadas, propuesta de la Guía 2027 y vista previa del correo.
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { enqueueSnackbar } from "notistack";
import { fetcherWithToken } from "@/lib/fetcher";
import {
  SECCIONES, borradorDe, cambiosBorrador, enCurso, erroresBorrador, estadoBoletin, fechaCorta, puedeAprobar, puedeCancelar, puedeEditar,
  semanaDe, textoEnvio, textoPunto, totalNotas,
} from "@/lib/newsletter/reglas.mjs";
import { Aviso, CAMPO, Insignia, PELIGRO, PELIGRO_LLENO, PRIMARIO, SECUNDARIO, TARJETA, pedir } from "./ui";

const tipoFuente = (n) => (n.tipo_fuente === "periodistica" ? "Fuente periodística" : "Fuente oficial");

export default function Boletin({ resumen, requerirAprobacion, suscriptores, alCambiar, alGenerar, generando }) {
  const { data, mutate } = useSWR(resumen?.id ? `/checador/newsletter/${resumen.id}` : null, fetcherWithToken, {
    refreshInterval: (d) => (enCurso(d?.boletin ?? resumen) ? 5000 : 0),
  });
  const b = data?.boletin ?? null;
  const [borrador, setBorrador] = useState(null);
  const [confirmar, setConfirmar] = useState(null); // "enviar" | "cancelar"
  const [ocupado, setOcupado] = useState(false);
  const [errores, setErrores] = useState({});
  useEffect(() => { if (b) setBorrador(borradorDe(b)); }, [b]);

  const cambios = useMemo(() => (b && borrador ? cambiosBorrador(b, borrador) : {}), [b, borrador]);
  const hayCambios = Object.keys(cambios).length > 0;
  const estado = estadoBoletin(b ?? resumen);
  const editable = puedeEditar(b);

  const refrescar = async () => { await mutate(); alCambiar(); };
  const accion = async (fn, exito) => {
    setOcupado(true);
    try { await fn(); enqueueSnackbar(exito, { variant: "success" }); setConfirmar(null); await refrescar(); } catch (e) { enqueueSnackbar(e.message, { variant: "error" }); } finally { setOcupado(false); }
  };
  const guardar = () => {
    const e = erroresBorrador(borrador);
    setErrores(e);
    if (Object.keys(e).length) { enqueueSnackbar("Revisa los campos marcados.", { variant: "error" }); return; }
    accion(() => pedir(`/${b.id}`, { method: "PUT", body: JSON.stringify(cambios) }), "Cambios guardados.");
  };
  const enviar = () => accion(() => pedir(`/${b.id}/aprobar`, { method: "POST" }), "Aprobado. Se está enviando.");
  const cancelar = () => accion(() => pedir(`/${b.id}/cancelar`, { method: "POST" }), "Envío cancelado.");
  const nota = (id, campo, valor) => setBorrador((d) => ({ ...d, notas: { ...d.notas, [id]: { ...d.notas[id], [campo]: valor } } }));

  return (
    <section className={TARJETA} aria-labelledby="titulo-boletin" data-boletin={resumen.id}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="grid min-w-0 gap-1">
          <p className="text-[#4B5563]">{semanaDe(resumen)}</p>
          <h2 id="titulo-boletin" className="text-[1.5rem] font-bold leading-tight break-words">{b?.asunto || resumen.asunto || "Boletín de la semana"}</h2>
        </div>
        <Insignia tono={estado.tono}>{estado.texto}</Insignia>
      </div>
      {textoEnvio(b ?? resumen, { requerirAprobacion }) ? <p className="font-bold">{textoEnvio(b ?? resumen, { requerirAprobacion })}</p> : null}
      {(b ?? resumen).error ? (
        <Aviso tono="peligro" titulo={(b ?? resumen).contenido ? "Necesita tu revisión" : "No se pudo preparar"}>
          {(b ?? resumen).error}
          {!(b ?? resumen).contenido ? <div className="mt-3"><button type="button" className={PRIMARIO} onClick={alGenerar} disabled={generando}>{generando ? "Preparando…" : "Generar de nuevo"}</button></div> : null}
        </Aviso>
      ) : null}
      {enCurso(b ?? resumen) ? <p role="status" className="text-[#4B5563]">{(b ?? resumen).estado === "enviando" ? "Enviando… esta página se actualiza sola." : "Preparando el boletín con la IA… tarda uno o dos minutos."}</p> : null}

      {b && (puedeAprobar(b) || puedeCancelar(b)) ? (
        <div className="grid gap-3 rounded-xl bg-[#F5F7FB] p-4">
          {confirmar === "enviar" ? (
            <div className="grid gap-3" role="group" aria-label="Confirmar envío">
              <p className="font-bold">¿Enviar ahora a {Number(suscriptores).toLocaleString("es-MX")} personas que aceptaron noticias?{hayCambios ? " Primero guarda tus cambios." : ""}</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button type="button" className={PRIMARIO} onClick={enviar} disabled={ocupado || hayCambios}>{ocupado ? "Enviando…" : "Sí, enviar ahora"}</button>
                <button type="button" className={SECUNDARIO} onClick={() => setConfirmar(null)} disabled={ocupado}>No, volver</button>
              </div>
            </div>
          ) : confirmar === "cancelar" ? (
            <div className="grid gap-3" role="group" aria-label="Confirmar cancelación">
              <p className="font-bold">¿Cancelar este envío? El boletín de esta semana no se enviará.</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button type="button" className={PELIGRO_LLENO} onClick={cancelar} disabled={ocupado}>{ocupado ? "Cancelando…" : "Sí, cancelar el envío"}</button>
                <button type="button" className={SECUNDARIO} onClick={() => setConfirmar(null)} disabled={ocupado}>No, volver</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row">
              {puedeAprobar(b) ? <button type="button" className={PRIMARIO} onClick={() => setConfirmar("enviar")}>Aprobar y enviar ahora</button> : null}
              {puedeCancelar(b) ? <button type="button" className={PELIGRO} onClick={() => setConfirmar("cancelar")}>Cancelar este envío</button> : null}
            </div>
          )}
        </div>
      ) : null}

      {b?.contenido && borrador ? (
        <form className="grid gap-5" onSubmit={(e) => { e.preventDefault(); guardar(); }} aria-label="Editar los textos del boletín">
          <h3 className="text-[1.25rem] font-bold">{editable ? "Textos del boletín" : "Contenido"}</h3>
          <label className="grid gap-2">
            <span className="font-bold">Asunto del correo</span>
            <input className={`${CAMPO} h-12`} value={borrador.asunto} maxLength={150} disabled={!editable} aria-invalid={Boolean(errores.asunto)} onChange={(e) => setBorrador((d) => ({ ...d, asunto: e.target.value }))} />
            {errores.asunto ? <span className="font-bold text-[#B91C1C]">{errores.asunto}</span> : null}
          </label>
          <label className="grid gap-2">
            <span className="font-bold">Introducción</span>
            <textarea className={`${CAMPO} min-h-24 py-3`} value={borrador.introduccion} maxLength={600} disabled={!editable} onChange={(e) => setBorrador((d) => ({ ...d, introduccion: e.target.value }))} />
          </label>
          {totalNotas(b.contenido) === 0 ? <Aviso tono="info" titulo="Sin novedades verificables">Esta semana no hubo notas con una fuente que se pudiera abrir. El boletín lo dice así y no inventa.</Aviso> : null}
          {SECCIONES.map((s) => {
            const notas = b.contenido.secciones?.[s.clave] ?? [];
            if (!notas.length) return null;
            return (
              <fieldset key={s.clave} className="grid min-w-0 gap-4">
                <legend className="mb-2 text-[1.125rem] font-bold">{s.titulo}</legend>
                {notas.map((n) => {
                  const d = borrador.notas[n.id] ?? { titulo: n.titulo, resumen: n.resumen, quitar: false };
                  return (
                    <div key={n.id} className={`grid gap-3 rounded-xl border p-4 ${d.quitar ? "border-dashed border-[#C7CEDD] bg-[#F8FAFC]" : "border-[#E5E9F2]"}`} data-nota={n.id}>
                      <label className="grid gap-2">
                        <span className="font-bold">Título</span>
                        <input className={`${CAMPO} h-12`} value={d.titulo} maxLength={160} disabled={!editable || d.quitar} aria-invalid={Boolean(errores[`titulo:${n.id}`])} onChange={(e) => nota(n.id, "titulo", e.target.value)} />
                        {errores[`titulo:${n.id}`] ? <span className="font-bold text-[#B91C1C]">{errores[`titulo:${n.id}`]}</span> : null}
                      </label>
                      <label className="grid gap-2">
                        <span className="font-bold">Resumen</span>
                        <textarea className={`${CAMPO} min-h-24 py-3`} value={d.resumen} maxLength={600} disabled={!editable || d.quitar} aria-invalid={Boolean(errores[`resumen:${n.id}`])} onChange={(e) => nota(n.id, "resumen", e.target.value)} />
                        {errores[`resumen:${n.id}`] ? <span className="font-bold text-[#B91C1C]">{errores[`resumen:${n.id}`]}</span> : null}
                      </label>
                      <p className="break-words text-[#374151]">
                        <a href={n.fuente_url} target="_blank" rel="noopener noreferrer" className="font-bold text-[#1E40C4] underline underline-offset-4">{n.fuente_nombre || "Fuente"}</a>
                        {` · ${tipoFuente(n)} · ${fechaCorta(n.fecha_fuente)}`}
                      </p>
                      {editable ? (
                        <label className="flex cursor-pointer items-center gap-3">
                          <input type="checkbox" className="size-5 shrink-0 accent-[#B91C1C]" checked={d.quitar} onChange={(e) => nota(n.id, "quitar", e.target.checked)} />
                          <span>Quitar esta nota del boletín</span>
                        </label>
                      ) : null}
                    </div>
                  );
                })}
              </fieldset>
            );
          })}

          {b.guia_propuesta?.length ? (
            <fieldset className="grid min-w-0 gap-3">
              <legend className="mb-2 text-[1.125rem] font-bold">Cambios propuestos a la Guía 2027</legend>
              <p className="text-[#4B5563]">Se aplican cuando apruebas o se envía el boletín. Quita los que no quieras.</p>
              {b.guia_propuesta.map((p) => (
                <div key={p.clave} className="grid gap-2 rounded-xl border border-[#E5E9F2] p-4">
                  <div className="flex min-w-0 flex-wrap items-center gap-3"><p className="min-w-0 font-bold break-words">{p.titulo}</p><Insignia envolver tono="info">{textoPunto(p)}</Insignia></div>
                  <p>{p.detalle}</p>
                  {p.fuente?.url ? <p><a href={p.fuente.url} target="_blank" rel="noopener noreferrer" className="font-bold text-[#1E40C4] underline underline-offset-4">{p.fuente.titulo || "Fuente"}</a></p> : null}
                  {editable ? (
                    <label className="flex cursor-pointer items-center gap-3">
                      <input type="checkbox" className="size-5 shrink-0 accent-[#B91C1C]" checked={Boolean(borrador.guia[p.clave]?.quitar)} onChange={(e) => setBorrador((d) => ({ ...d, guia: { ...d.guia, [p.clave]: { quitar: e.target.checked } } }))} />
                      <span>No aplicar este cambio</span>
                    </label>
                  ) : null}
                </div>
              ))}
            </fieldset>
          ) : null}

          {editable ? (
            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="submit" className={PRIMARIO} disabled={!hayCambios || ocupado}>{ocupado ? "Guardando…" : "Guardar cambios"}</button>
              <button type="button" className={SECUNDARIO} disabled={!hayCambios || ocupado} onClick={() => { setBorrador(borradorDe(b)); setErrores({}); }}>Deshacer cambios</button>
            </div>
          ) : null}
        </form>
      ) : null}

      {b?.descartadas?.length ? (
        <details className="rounded-xl border border-[#E5E9F2] p-4">
          <summary className="cursor-pointer font-bold">{b.descartadas.length} {b.descartadas.length === 1 ? "nota descartada" : "notas descartadas"} (sin fuente o con fuente que no abre)</summary>
          <ul className="mt-3 grid gap-2">
            {b.descartadas.map((d, i) => <li key={i} className="break-words"><span className="font-bold">{d.titulo}</span>{` · ${d.motivo}`}</li>)}
          </ul>
        </details>
      ) : null}

      {b?.html ? (
        <div className="grid gap-2">
          <h3 className="text-[1.25rem] font-bold">Vista previa del correo</h3>
          <p className="text-[#4B5563]">Cada persona lo recibe con su nombre y su enlace para darse de baja.{hayCambios ? " La vista previa se actualiza al guardar." : ""}</p>
          <iframe title="Vista previa del boletín" srcDoc={b.html} sandbox="" className="h-[720px] w-full rounded-xl border border-[#D8DEEB] bg-white" />
        </div>
      ) : null}
    </section>
  );
}
