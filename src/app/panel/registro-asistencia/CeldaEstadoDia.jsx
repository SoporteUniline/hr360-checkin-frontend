"use client";

// «Estado · motivo» de una fila de Asistencias. Con checadas vivas el estado es solo lectura (lo calcula el reloj).
// Sin checadas: select con dos grupos (lib/asistencia/tiposGoce.mjs):
//  · «No vino»: tipos de día completo. Si el tipo pide motivo sale el catálogo de motivos (con «Otro…» para escribirlo);
//    si pide folio (incapacidad), el folio; y el goce solo si el tipo se cambia al aplicar (preseleccionado). PUT /:id/estado-dia.
//  · «Sí vino»: «Sí vino (sin permiso)» y los tipos parciales (entrada después, salida antes…): abren el reloj con ese
//    tipo en «Permiso del día».
// Debajo: «Visita al médico · 2 h · las repone · con goce» y, en una falta injustificada, «📄 Acta en borrador».
import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import axios from "@/lib/axios";
import { fetcherWithToken } from "@/lib/fetcher";
import { checadasVivas, estadoFila, requisitoEstado, textoConIcono } from "@/lib/asistencia/relojDia.mjs";
import {
  GOCES, OTRO, cuerpoEstadoDia, gruposFila, listaMotivos, motivoFinal, normalizarTipo, permisoFila, puedeCambiar,
} from "@/lib/asistencia/tiposGoce.mjs";
import { actaFila, avisosRespuesta } from "@/lib/actasEstatus.mjs";

const SI_VINO = "si_vino";

function Debajo({ registro }) {
  const permiso = permisoFila(registro);
  const acta = actaFila(registro);
  const resumen = registro.motivos_resumen || "";
  if (!permiso?.detalle && !resumen && !acta) return null;
  return (
    <span className="flex max-w-[280px] flex-col gap-0.5 whitespace-normal text-[12px] leading-snug text-slate-500">
      {permiso?.detalle ? <span data-permiso-detalle>{permiso.detalle}</span> : null}
      {resumen ? <span>{resumen}</span> : null}
      {acta ? (
        <Link href={acta.href} data-acta-enlace onClick={(e) => e.stopPropagation()}
          className="w-fit font-medium text-blue-700 underline-offset-2 hover:underline">{acta.texto}</Link>
      ) : null}
    </span>
  );
}

export default function CeldaEstadoDia({ registro, tiposPermiso, readOnly = false, onAbrirReloj, onGuardado, movil = false }) {
  const { enqueueSnackbar } = useSnackbar();
  const [pendiente, setPendiente] = useState(null); // { tipo, req, opcion, texto, goce }
  const [guardando, setGuardando] = useState(false);
  // Una sola petición para toda la tabla (SWR la comparte); se pide desde que la fila puede elegir estado.
  const editable = !readOnly && checadasVivas(registro) === 0;
  const { data: dataMotivos } = useSWR(editable ? "/checador/motivos-permiso" : null, fetcherWithToken, { revalidateOnFocus: false });
  const estado = estadoFila(registro);
  const permiso = permisoFila(registro);
  const nombre = [registro.nombre, registro.apellido_paterno].filter(Boolean).join(" ");

  if (checadasVivas(registro) > 0 || readOnly) {
    return (
      <span className="flex flex-col items-start gap-1" data-estado-fila>
        <span className="whitespace-nowrap text-[13.5px] text-slate-800">{permiso?.tipo || textoConIcono(estado.texto, estado.clave)}</span>
        <Debajo registro={registro} />
      </span>
    );
  }

  const { noVino: tipos, siVino } = gruposFila(tiposPermiso);
  const actual = tipos.some((t) => String(t.id) === String(registro.id_tipo_permiso)) ? String(registro.id_tipo_permiso) : "";
  const valor = pendiente ? String(pendiente.tipo.id) : actual;
  const motivos = listaMotivos(dataMotivos);

  const guardar = async (p) => {
    setGuardando(true);
    try {
      const cuerpo = cuerpoEstadoDia(p.tipo, { requisito: p.req, motivo: motivoFinal(p), folio: p.texto, goce: p.goce });
      const res = await axios.put(`/checador/asistencias/${registro.id}/estado-dia`, cuerpo);
      setPendiente(null);
      enqueueSnackbar(`${nombre}: ${p.tipo.nombre}. Queda en el historial con tu nombre.`, { variant: "success" });
      for (const a of avisosRespuesta(res.data)) enqueueSnackbar(a, { variant: "info" });
      await onGuardado?.(res.data?.asistencia);
    } catch (e) {
      enqueueSnackbar(e?.response?.data?.error || e?.response?.data?.message || "No se pudo guardar el estado del día.", { variant: "error" });
    } finally {
      setGuardando(false);
    }
  };
  const elegir = (v) => {
    if (v === SI_VINO) { setPendiente(null); onAbrirReloj?.(registro); return; }
    if (v.startsWith("tp:")) { setPendiente(null); onAbrirReloj?.({ ...registro, _tipoParcial: v.slice(3) }); return; }
    const tipo = tipos.find((t) => String(t.id) === v);
    if (!tipo) return;
    const p = { tipo, req: requisitoEstado(tipo), opcion: "", texto: "", goce: normalizarTipo(tipo).goce };
    if (p.req || puedeCambiar(tipo).goce) setPendiente(p);
    else guardar(p);
  };
  const listo = pendiente && (pendiente.req === "folio" ? pendiente.texto.trim()
    : pendiente.req === "motivo" ? motivoFinal(pendiente) : true);
  const alto = movil ? "h-11 text-base" : "h-9 text-[13.5px]";
  const campo = `${alto} min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30`;
  const falta = /injustificad/i.test(estado.texto) || estado.clave === "falta";
  const tecla = (e) => { if (e.key === "Enter" && listo) guardar(pendiente); if (e.key === "Escape") setPendiente(null); };
  const set = (c) => setPendiente((p) => ({ ...p, ...c }));

  return (
    <span className="flex w-full min-w-[240px] flex-col gap-1.5" data-estado-fila data-no-row-click>
      {/* Se ve como texto (igual que el «Tipo» de antes); al tocarlo despliega las opciones. */}
      <span className="group relative inline-flex w-fit max-w-full items-center">
        <select aria-label={`Estado de ${nombre}`} value={valor} disabled={guardando} onChange={(e) => elegir(e.target.value)}
          className={`${alto} max-w-full cursor-pointer appearance-none truncate rounded-md border-0 bg-transparent py-0 pl-1 pr-6 text-slate-800 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30`}>
          {!actual && !pendiente ? <option value="">{permiso?.tipo || textoConIcono(estado.texto, falta ? "falta" : estado.clave) || "Elige el estado…"}</option> : null}
          <optgroup label="No vino">
            {tipos.map((t) => <option key={t.id} value={String(t.id)}>{t.nombre}{requisitoEstado(t) || puedeCambiar(t).goce ? "…" : ""}</option>)}
          </optgroup>
          <optgroup label="Sí vino → poner sus horas en el reloj">
            <option value={SI_VINO}>Sí vino (sin permiso)</option>
            {siVino.map((t) => <option key={t.id} value={`tp:${t.id}`}>{t.nombre}</option>)}
          </optgroup>
        </select>
        <svg aria-hidden viewBox="0 0 20 20" className="pointer-events-none absolute right-1.5 h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600" fill="currentColor"><path d="M5.5 7.5 10 12l4.5-4.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
      {pendiente ? (
        <span data-estado-pendiente className="flex flex-col gap-1.5">
          {pendiente.req === "folio" ? (
            <input aria-label="Folio IMSS (obligatorio)" placeholder="Folio IMSS (obligatorio)" value={pendiente.texto} maxLength={200} autoFocus
              onChange={(e) => set({ texto: e.target.value })} onKeyDown={tecla} className={campo} />
          ) : null}
          {pendiente.req === "motivo" ? (
            <select aria-label="Motivo" value={pendiente.opcion} autoFocus onChange={(e) => set({ opcion: e.target.value })} onKeyDown={tecla} className={campo}>
              <option value="">Elige el motivo…</option>
              {motivos.map((m) => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}
              <option value={OTRO}>Otro…</option>
            </select>
          ) : null}
          {pendiente.req === "motivo" && pendiente.opcion === OTRO ? (
            <input aria-label="Escribe el motivo" placeholder="Escribe el motivo" value={pendiente.texto} maxLength={120} autoFocus
              onChange={(e) => set({ texto: e.target.value })} onKeyDown={tecla} className={campo} />
          ) : null}
          <span className="flex gap-1.5">
            {puedeCambiar(pendiente.tipo).goce ? (
              <select aria-label="Goce del día" value={pendiente.goce} onChange={(e) => set({ goce: e.target.value })} className={`${campo} flex-1`}>
                {GOCES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
              </select>
            ) : (
              <span className={`${alto} inline-flex flex-1 items-center text-[13px] text-slate-500`}>🔒 {normalizarTipo(pendiente.tipo).goce === "con" ? "Con goce" : "Sin goce"}</span>
            )}
            <button type="button" disabled={!listo || guardando} onClick={() => guardar(pendiente)}
              className={`${movil ? "h-11 px-4" : "h-9 px-3"} rounded-lg bg-blue-600 text-[13px] font-semibold text-white hover:bg-blue-700 disabled:opacity-45`}>OK</button>
          </span>
        </span>
      ) : <Debajo registro={registro} />}
    </span>
  );
}
