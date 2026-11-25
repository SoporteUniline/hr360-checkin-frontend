"use client";

// Lumo fase A (25/11/2026): «Base de conocimiento» de la bandeja (?vista=conocimiento). Arriba, las preguntas que el
// agente no supo contestar: «Responder» crea una entrada APROBADA (de esa vacante o de toda la empresa) y la marca
// resuelta; «Descartar» la quita sin respuesta. Abajo, las entradas (CRUD): el agente usa SOLO las aprobadas, además
// del texto libre de «respuestas frecuentes», que se conserva (se puede importar a entradas como borradores).
import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { BookOpenCheck, Download, HelpCircle, Loader2, Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { mensajeErrorApi } from "@/lib/whatsapp/reglas.mjs";
import { tiempoRelativo } from "@/lib/whatsapp/tiempo.mjs";
import { nombreContacto } from "@/lib/whatsapp/telefono.mjs";
import {
  LIMITE_PREGUNTA_K, LIMITE_RESPUESTA_K, etiquetaEstadoEntrada, etiquetaOrigen, filtrarEntradas, textoAlcance, textoPendientes, validarEntradaForm,
} from "@/lib/whatsapp/conocimiento.mjs";
import {
  borrarEntrada, crearEntrada, descartarPregunta, guardarEntrada, importarConocimiento, obtener, responderPregunta, rutaConocimiento, rutaSinRespuesta, rutaVacantes,
} from "./api";
import { CLASE_ENTRADA, DIALOGO_PANTALLA_COMPLETA, TONOS } from "./controles";

const FILTROS = [{ valor: "", texto: "Todas" }, { valor: "aprobada", texto: "Aprobadas" }, { valor: "borrador", texto: "Borradores" }];

// Diálogo para crear, editar o responder. modo: "nueva" | "editar" | "responder".
function DialogoEntrada({ abierto, modo, inicial, pregunta, vacantes, onCerrar, onGuardado, idEmpresa }) {
  const [form, setForm] = useState(inicial);
  const [errores, setErrores] = useState({});
  const [errorApi, setErrorApi] = useState("");
  const [guardando, setGuardando] = useState(false);
  const responder = modo === "responder";
  const guardar = async (ev) => {
    ev.preventDefault();
    const r = validarEntradaForm(responder ? { ...form, estado: "aprobada" } : form);
    setErrores(r.errores);
    setErrorApi("");
    if (!r.valido) { requestAnimationFrame(() => document.querySelector("[data-dialogo-entrada] [aria-invalid=true]")?.focus()); return; }
    setGuardando(true);
    try {
      if (responder) await responderPregunta(pregunta.id, { pregunta: r.cuerpo.pregunta, respuesta: r.cuerpo.respuesta, alcance: form.alcance });
      else if (modo === "editar") await guardarEntrada(inicial.id, r.cuerpo);
      else await crearEntrada(idEmpresa, r.cuerpo);
      onGuardado(responder ? "Respuesta guardada: el agente ya la usa." : modo === "editar" ? "Entrada actualizada." : "Entrada creada.");
    } catch (e) {
      setErrorApi(mensajeErrorApi(e, "No se pudo guardar."));
    } finally {
      setGuardando(false);
    }
  };
  const cambiar = (c) => setForm((f) => ({ ...f, ...c }));
  const titulo = responder ? "Responder pregunta" : modo === "editar" ? "Editar entrada" : "Nueva entrada";
  return (
    <Dialog open={abierto} onOpenChange={(v) => { if (!v && !guardando) onCerrar(); }}>
      <DialogContent className={`${DIALOGO_PANTALLA_COMPLETA} sm:max-w-xl`}>
        <DialogHeader className="border-b border-gray-200 px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))] pr-14 text-left">
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>
            {responder ? "Tu respuesta queda aprobada en la base de conocimiento: la próxima vez el agente contesta solo." : "Solo las entradas aprobadas las usa el agente."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={guardar} noValidate data-dialogo-entrada className="flex min-h-0 flex-1 flex-col">
          <div className="grid min-h-0 flex-1 content-start gap-4 overflow-y-auto px-5 py-4">
            <div className="grid gap-1.5">
              <label htmlFor="k-pregunta" className="text-sm font-semibold text-gray-800">Pregunta</label>
              <textarea id="k-pregunta" rows={2} maxLength={LIMITE_PREGUNTA_K} value={form.pregunta} onChange={(e) => cambiar({ pregunta: e.target.value })}
                aria-invalid={errores.pregunta ? true : undefined} className={`${CLASE_ENTRADA} min-h-11 py-2`} placeholder="Ej.: ¿Dan uniforme?" />
              {responder ? <p className="text-[13px] text-gray-500">Puedes redactarla mejor; así la buscará el agente.</p> : null}
              {errores.pregunta ? <p className="text-[13px] font-medium text-red-700">{errores.pregunta}</p> : null}
            </div>
            <div className="grid gap-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <label htmlFor="k-respuesta" className="text-sm font-semibold text-gray-800">Respuesta del agente</label>
                <span className="text-[13px] text-gray-500">{String(form.respuesta ?? "").length}/{LIMITE_RESPUESTA_K}</span>
              </div>
              <textarea id="k-respuesta" rows={5} maxLength={LIMITE_RESPUESTA_K} value={form.respuesta} onChange={(e) => cambiar({ respuesta: e.target.value })}
                aria-invalid={errores.respuesta ? true : undefined} className={`${CLASE_ENTRADA} py-2`} placeholder="Escribe la respuesta tal como quieres que la dé." autoFocus={responder} />
              {errores.respuesta ? <p className="text-[13px] font-medium text-red-700">{errores.respuesta}</p> : null}
            </div>
            {responder ? (
              pregunta?.id_vacante ? (
                <fieldset className="grid gap-1.5">
                  <legend className="mb-1 text-sm font-semibold text-gray-800">¿Para quién aplica?</legend>
                  {[["vacante", `Solo la vacante «${pregunta.vacante || "de esta pregunta"}»`], ["empresa", "Todas las vacantes de la empresa"]].map(([v, t]) => (
                    <label key={v} className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border border-gray-200 px-3 text-[14px] has-[:checked]:border-emerald-400 has-[:checked]:bg-emerald-50">
                      <input type="radio" name="k-alcance" value={v} checked={form.alcance === v} onChange={() => cambiar({ alcance: v })} className="size-4 accent-emerald-700" />
                      <span className="min-w-0 [overflow-wrap:anywhere]">{t}</span>
                    </label>
                  ))}
                </fieldset>
              ) : null
            ) : (
              <>
                <div className="grid gap-1.5">
                  <label htmlFor="k-alcance" className="text-sm font-semibold text-gray-800">Aplica a</label>
                  <select id="k-alcance" value={form.id_vacante ?? ""} onChange={(e) => cambiar({ id_vacante: e.target.value })} className={`${CLASE_ENTRADA} h-11 px-2 md:h-9`}>
                    <option value="">Todas las vacantes de la empresa</option>
                    {inicial.id_vacante && !vacantes.some((v) => String(v.id_vacante) === String(inicial.id_vacante))
                      ? <option value={String(inicial.id_vacante)}>{inicial.vacante || "Vacante actual"}</option> : null}
                    {vacantes.map((v) => <option key={v.id_vacante} value={String(v.id_vacante)}>Solo «{v.titulo}»</option>)}
                  </select>
                </div>
                <fieldset className="grid gap-1.5">
                  <legend className="mb-1 text-sm font-semibold text-gray-800">Estado</legend>
                  {["aprobada", "borrador"].map((v) => (
                    <label key={v} className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border border-gray-200 px-3 text-[14px] has-[:checked]:border-emerald-400 has-[:checked]:bg-emerald-50">
                      <input type="radio" name="k-estado" value={v} checked={form.estado === v} onChange={() => cambiar({ estado: v })} className="size-4 accent-emerald-700" />
                      <span><span className="font-semibold">{etiquetaEstadoEntrada(v).texto}</span> · {etiquetaEstadoEntrada(v).ayuda}</span>
                    </label>
                  ))}
                </fieldset>
              </>
            )}
          </div>
          <div className="grid gap-2 border-t border-gray-200 bg-white px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
            {errorApi ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-[13px] text-red-800">{errorApi}</p> : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onCerrar} disabled={guardando} className="min-h-11 flex-1 sm:flex-none md:min-h-9">Cancelar</Button>
              <Button type="submit" loading={guardando} className="min-h-11 flex-1 sm:flex-none md:min-h-9">{responder ? "Guardar respuesta" : "Guardar"}</Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Confirmar({ entrada, onCerrar, onBorrado }) {
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState("");
  const borrar = async () => {
    setBorrando(true);
    setError("");
    try { await borrarEntrada(entrada.id); onBorrado(); } catch (e) { setError(mensajeErrorApi(e, "No se pudo eliminar.")); } finally { setBorrando(false); }
  };
  return (
    <Dialog open={!!entrada} onOpenChange={(v) => { if (!v && !borrando) onCerrar(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle>¿Eliminar esta entrada?</DialogTitle>
          <DialogDescription className="[overflow-wrap:anywhere]">«{entrada?.pregunta}». El agente dejará de usarla. No se puede deshacer.</DialogDescription>
        </DialogHeader>
        {error ? <p role="alert" className="text-[13px] text-red-700">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCerrar} className="min-h-11 flex-1 sm:flex-none md:min-h-9">Cancelar</Button>
          <Button type="button" onClick={borrar} loading={borrando} className="min-h-11 flex-1 bg-red-700 hover:bg-red-800 sm:flex-none md:min-h-9">Eliminar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function BaseConocimiento({ idEmpresa, ahora, pathname }) {
  const k = useSWR(rutaConocimiento(idEmpresa), obtener, { revalidateOnFocus: false });
  const sr = useSWR(rutaSinRespuesta(idEmpresa), obtener, { refreshInterval: 30000, refreshWhenHidden: false });
  const { data: datosVacantes } = useSWR(rutaVacantes(idEmpresa), obtener, { revalidateOnFocus: false });
  const vacantes = datosVacantes?.vacantes ?? [];
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("");
  const [dialogo, setDialogo] = useState(null);
  const [borrar, setBorrar] = useState(null);
  const [aviso, setAviso] = useState("");
  const [importando, setImportando] = useState(false);
  const [descartando, setDescartando] = useState(null);
  const entradas = useMemo(() => filtrarEntradas(k.data?.entradas, { q, estado }), [k.data, q, estado]);
  const pendientes = sr.data?.preguntas ?? [];
  const recargar = (texto) => { k.mutate(); sr.mutate(); if (texto) setAviso(texto); };

  const importar = async () => {
    setImportando(true);
    setAviso("");
    try {
      const r = await importarConocimiento(idEmpresa);
      recargar(r.creadas ? `Se importaron ${r.creadas} ${r.creadas === 1 ? "entrada" : "entradas"} como borrador. Revísalas y apruébalas.` : "No había preguntas nuevas que importar.");
    } catch (e) {
      setAviso(mensajeErrorApi(e, "No se pudo importar."));
    } finally {
      setImportando(false);
    }
  };
  const descartar = async (p) => {
    setDescartando(p.id);
    try { await descartarPregunta(p.id); recargar("Pregunta descartada."); } catch (e) { setAviso(mensajeErrorApi(e, "No se pudo descartar.")); } finally { setDescartando(null); }
  };

  const error = k.error || sr.error;
  if (error && !k.data) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        <span className="flex-1">{mensajeErrorApi(error, "No se pudo cargar la base de conocimiento.")}</span>
        <Button type="button" variant="outline" onClick={() => recargar()} className="min-h-11 md:min-h-9" startIcon={<RefreshCw className="size-4" />}>Reintentar</Button>
      </div>
    );
  }
  if (!k.data) return <p className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="size-4 animate-spin" /> Cargando base de conocimiento…</p>;

  return (
    <div className="mx-auto grid w-full min-w-0 max-w-4xl gap-5" data-base-conocimiento>
      <p className="text-[13.5px] text-[#54656F]">El agente contesta las dudas de los candidatos solo con los datos de la vacante, tus respuestas frecuentes y las entradas <strong>aprobadas</strong> de aquí.</p>
      <p aria-live="polite" className={aviso ? "rounded-lg bg-emerald-50 p-2.5 text-[13px] text-emerald-900" : "sr-only"}>{aviso}</p>

      <section aria-labelledby="k-pendientes" className="grid gap-2">
        <h3 id="k-pendientes" className="flex items-center gap-2 text-[15px] font-semibold text-[#111B21]">
          <HelpCircle className="size-4 text-amber-600" aria-hidden="true" /> {textoPendientes(sr.data?.pendientes ?? pendientes.length)}
        </h3>
        {pendientes.length ? (
          <ul className="grid gap-2" aria-label="Preguntas sin respuesta">
            {pendientes.map((p) => (
              <li key={p.id} className="grid gap-2 rounded-xl border border-amber-200 bg-white p-3" data-sin-respuesta={p.id}>
                <p className="text-[14.5px] font-semibold text-gray-900 [overflow-wrap:anywhere]">{p.pregunta}</p>
                <p className="text-[13px] text-gray-600 [overflow-wrap:anywhere]">
                  {[p.contacto ? nombreContacto(p.contacto) : null, p.vacante, tiempoRelativo(p.creado_en, ahora)].filter(Boolean).join(" · ")}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={() => setDialogo({ modo: "responder", pregunta: p, inicial: { pregunta: p.pregunta, respuesta: "", alcance: p.id_vacante ? "vacante" : "empresa" } })}
                    className="min-h-11 flex-1 sm:flex-none md:min-h-9">Responder</Button>
                  <Button type="button" variant="outline" onClick={() => descartar(p)} loading={descartando === p.id} className="min-h-11 flex-1 sm:flex-none md:min-h-9">Descartar</Button>
                  {p.contacto ? (
                    <Link href={`${pathname}?c=${p.id_conversacion}`} scroll={false} aria-label={`Abrir chat con ${nombreContacto(p.contacto)}`}
                      className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md px-3 text-sm font-semibold text-emerald-800 underline underline-offset-2 hover:bg-emerald-50 sm:flex-none md:min-h-9">
                      Abrir chat
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-gray-300 bg-white p-4 text-[13.5px] text-gray-600">Cuando el agente no sepa contestar algo, aparecerá aquí para que lo respondas una sola vez.</p>
        )}
      </section>

      <section aria-labelledby="k-entradas" className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 id="k-entradas" className="flex min-w-0 flex-1 basis-40 items-center gap-2 text-[15px] font-semibold text-[#111B21]">
            <BookOpenCheck className="size-4 text-emerald-700" aria-hidden="true" /> Entradas · {k.data.entradas.length}
          </h3>
          {k.data.importables ? (
            <Button type="button" variant="outline" onClick={importar} loading={importando} startIcon={<Download className="size-4" />} className="min-h-11 flex-1 sm:flex-none md:min-h-9" data-importar>
              Importar respuestas frecuentes
            </Button>
          ) : null}
          <Button type="button" onClick={() => setDialogo({ modo: "nueva", inicial: { pregunta: "", respuesta: "", estado: "aprobada", id_vacante: "" } })}
            startIcon={<Plus className="size-4" />} className="min-h-11 flex-1 sm:flex-none md:min-h-9">Nueva entrada</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-0 flex-1 basis-56">
            <span className="sr-only">Buscar en la base de conocimiento</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar pregunta o respuesta" className={`${CLASE_ENTRADA} h-11 pl-9 md:h-9`} />
          </label>
          <div role="group" aria-label="Filtrar por estado" className="flex gap-1.5">
            {FILTROS.map((f) => (
              <button key={f.valor} type="button" onClick={() => setEstado(f.valor)} aria-pressed={estado === f.valor}
                className={`min-h-11 rounded-full px-3 text-[13px] font-semibold md:min-h-8 ${estado === f.valor ? "bg-[#D9FDD3] text-[#0B5C2E]" : "bg-white text-[#54656F] ring-1 ring-inset ring-gray-200"}`}>{f.texto}</button>
            ))}
          </div>
        </div>
        {entradas.length ? (
          <ul className="grid gap-2" aria-label="Entradas de la base de conocimiento">
            {entradas.map((e) => {
              const est = etiquetaEstadoEntrada(e.estado);
              return (
                <li key={e.id} className="grid gap-1.5 rounded-xl border border-gray-200 bg-white p-3" data-entrada={e.id}>
                  <div className="flex items-start gap-2">
                    <p className="min-w-0 flex-1 text-[14.5px] font-semibold text-gray-900 [overflow-wrap:anywhere]">{e.pregunta}</p>
                    <button type="button" onClick={() => setDialogo({ modo: "editar", inicial: { ...e, id_vacante: e.id_vacante ? String(e.id_vacante) : "" } })} aria-label={`Editar «${e.pregunta}»`}
                      className="grid size-11 shrink-0 place-items-center rounded-lg text-gray-600 hover:bg-gray-100 md:size-9"><Pencil className="size-4" /></button>
                    <button type="button" onClick={() => setBorrar(e)} aria-label={`Eliminar «${e.pregunta}»`}
                      className="grid size-11 shrink-0 place-items-center rounded-lg text-red-600 hover:bg-red-50 md:size-9"><Trash2 className="size-4" /></button>
                  </div>
                  <p className="line-clamp-3 whitespace-pre-wrap text-[13.5px] text-gray-700 [overflow-wrap:anywhere]">{e.respuesta}</p>
                  <p className="flex flex-wrap items-center gap-1.5 text-[13px] text-gray-500">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[13px] font-semibold ring-1 ring-inset ${TONOS[est.tono]}`}>{est.texto}</span>
                    <span className="[overflow-wrap:anywhere]">{textoAlcance(e)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{etiquetaOrigen(e.origen)}</span>
                  </p>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-gray-300 bg-white p-4 text-[13.5px] text-gray-600">
            {k.data.entradas.length ? "Ninguna entrada coincide con la búsqueda." : "Aún no hay entradas. Crea una o responde una pregunta pendiente."}
          </p>
        )}
      </section>

      {dialogo ? (
        <DialogoEntrada key={`${dialogo.modo}-${dialogo.pregunta?.id ?? dialogo.inicial?.id ?? "n"}`} abierto modo={dialogo.modo} inicial={dialogo.inicial} pregunta={dialogo.pregunta}
          vacantes={vacantes} idEmpresa={idEmpresa} onCerrar={() => setDialogo(null)} onGuardado={(texto) => { setDialogo(null); recargar(texto); }} />
      ) : null}
      <Confirmar entrada={borrar} onCerrar={() => setBorrar(null)} onBorrado={() => { setBorrar(null); recargar("Entrada eliminada."); }} />
    </div>
  );
}
