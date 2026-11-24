"use client";

// «Estado · motivo» de una fila de Asistencias. Con checadas vivas el estado es solo lectura (lo calcula el reloj).
// Sin checadas: select con los tipos del catálogo que no cuentan como asistencia + «Sí vino → poner sus horas en el
// reloj». Si el tipo pide motivo o folio aparece el campo con OK en la misma fila. PUT /:id/estado-dia.
import { useState } from "react";
import { useSnackbar } from "notistack";
import axios from "@/lib/axios";
import {
  checadasVivas, estadoFila, gruposEstadoDia, requisitoEstado, textoConIcono,
} from "@/lib/asistencia/relojDia.mjs";

const SI_VINO = "si_vino";

export default function CeldaEstadoDia({ registro, tiposPermiso, readOnly = false, onAbrirReloj, onGuardado, movil = false }) {
  const { enqueueSnackbar } = useSnackbar();
  const [pendiente, setPendiente] = useState(null); // { tipo, texto }
  const [guardando, setGuardando] = useState(false);
  const estado = estadoFila(registro);
  const nombre = [registro.nombre, registro.apellido_paterno].filter(Boolean).join(" ");
  const resumen = registro.motivos_resumen || "";

  if (checadasVivas(registro) > 0 || readOnly) {
    return (
      <span className="flex flex-col items-start gap-1" data-estado-fila>
        <span className="whitespace-nowrap text-[13.5px] text-slate-800">{textoConIcono(estado.texto, estado.clave)}</span>
        {resumen ? <span className="max-w-[260px] whitespace-normal text-[12px] leading-snug text-slate-500">{resumen}</span> : null}
      </span>
    );
  }

  const { sinHoras: tipos, conHoras } = gruposEstadoDia(tiposPermiso);
  const actual = tipos.some((t) => String(t.id) === String(registro.id_tipo_permiso)) ? String(registro.id_tipo_permiso) : "";
  const valor = pendiente ? String(pendiente.tipo.id) : actual;
  const pide = pendiente ? requisitoEstado(pendiente.tipo) : null;

  const guardar = async (tipo, texto = "") => {
    setGuardando(true);
    try {
      const req = requisitoEstado(tipo);
      const cuerpo = { id_tipo_permiso: Number(tipo.id), ...(req === "folio" ? { folio: texto.trim() } : req === "motivo" ? { motivo: texto.trim() } : {}) };
      const res = await axios.put(`/checador/asistencias/${registro.id}/estado-dia`, cuerpo);
      setPendiente(null);
      enqueueSnackbar(`${nombre}: ${tipo.nombre}. Queda en el historial con tu nombre.`, { variant: "success" });
      await onGuardado?.(res.data?.asistencia);
    } catch (e) {
      enqueueSnackbar(e?.response?.data?.error || e?.response?.data?.message || "No se pudo guardar el estado del día.", { variant: "error" });
    } finally {
      setGuardando(false);
    }
  };
  const elegir = (v) => {
    if (v === SI_VINO) { setPendiente(null); onAbrirReloj?.(registro); return; }
    if (v.startsWith("tp:")) { setPendiente(null); onAbrirReloj?.({ ...registro, _motivoInicial: v }); return; }
    const tipo = tipos.find((t) => String(t.id) === v);
    if (!tipo) return;
    if (requisitoEstado(tipo)) setPendiente({ tipo, texto: "" });
    else guardar(tipo);
  };
  const alto = movil ? "h-11 text-base" : "h-9 text-[13.5px]";
  const etiqueta = pide === "folio" ? "Folio IMSS (obligatorio)" : "Motivo (obligatorio)";
  const falta = /injustificad/i.test(estado.texto) || estado.clave === "falta";

  return (
    <span className="flex w-full min-w-[220px] flex-col gap-1.5" data-estado-fila data-no-row-click>
      {/* Se ve como texto (igual que el «Tipo» de antes); al tocarlo despliega las opciones. */}
      <span className="group relative inline-flex w-fit max-w-full items-center">
        <select aria-label={`Estado de ${nombre}`} value={valor} disabled={guardando} onChange={(e) => elegir(e.target.value)}
          className={`${alto} max-w-full cursor-pointer appearance-none truncate rounded-md border-0 bg-transparent py-0 pl-1 pr-6 text-slate-800 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30`}>
          {!actual && !pendiente ? <option value="">{textoConIcono(estado.texto, falta ? "falta" : estado.clave) || "Elige el estado…"}</option> : null}
          <optgroup label="No vino">
            {tipos.map((t) => <option key={t.id} value={String(t.id)}>{t.nombre}{requisitoEstado(t) ? "…" : ""}</option>)}
          </optgroup>
          <optgroup label="Sí vino → poner sus horas en el reloj">
            <option value={SI_VINO}>Sí vino (sin permiso)</option>
            {conHoras.map((t) => <option key={t.id} value={`tp:${t.id}`}>{t.nombre}</option>)}
          </optgroup>
        </select>
        <svg aria-hidden viewBox="0 0 20 20" className="pointer-events-none absolute right-1.5 h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600" fill="currentColor"><path d="M5.5 7.5 10 12l4.5-4.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
      {pendiente ? (
        <span className="flex gap-1.5">
          <input aria-label={etiqueta} placeholder={etiqueta} value={pendiente.texto} maxLength={200} autoFocus
            onChange={(e) => setPendiente((p) => ({ ...p, texto: e.target.value }))}
            onKeyDown={(e) => { if (e.key === "Enter" && pendiente.texto.trim()) guardar(pendiente.tipo, pendiente.texto); if (e.key === "Escape") setPendiente(null); }}
            className={`${alto} min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30`} />
          <button type="button" disabled={!pendiente.texto.trim() || guardando} onClick={() => guardar(pendiente.tipo, pendiente.texto)}
            className={`${movil ? "h-11 px-4" : "h-9 px-3"} rounded-lg bg-blue-600 text-[13px] font-semibold text-white hover:bg-blue-700 disabled:opacity-45`}>OK</button>
        </span>
      ) : resumen ? <span className="text-[12px] leading-snug text-slate-500">{resumen}</span> : null}
    </span>
  );
}
