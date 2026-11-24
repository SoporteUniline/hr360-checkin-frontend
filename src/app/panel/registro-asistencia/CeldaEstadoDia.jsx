"use client";

// «Estado · motivo» de una fila de Asistencias (y del reloj sin checadas y la vista móvil).
// Con checadas vivas (o sin permiso de edición) es solo lectura: «❌ Inasistencia injustificada», «📝 Inasistencia ·
// Permiso personal · sin goce», «⌚ Entrada tarde · Visita al médico · 2 h · las repone» (lib/asistencia/quePasoMotivo.mjs).
// Sin checadas: el par «Qué pasó» + «Motivo» (components/asistencia/QuePasoMotivo).
//  · Inasistencia: motivo opcional (vacío = injustificada, se avisa del acta en borrador); goce del motivo (🔒 si no se
//    cambia al aplicar). Días de ley: sin motivo, goce del tipo, folio en la incapacidad. Se guarda con OK:
//    PUT /:id/estado-dia { id_tipo_permiso, id_motivo?, motivo_permiso? (texto de «Otro»), goce?, folio? }.
//  · Asistencia, Entrada tarde, Salida temprano, Salir en medio turno: abren el reloj para poner sus horas (el parcial llega
//    puesto en «Permiso del día», donde se elige su motivo).
// Debajo: el resumen de motivos del reloj y, en una inasistencia injustificada, «📄 Acta en borrador».
import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useSnackbar } from "notistack";
import axios from "@/lib/axios";
import { fetcherWithToken } from "@/lib/fetcher";
import { checadasVivas, estadoFila, textoConIcono } from "@/lib/asistencia/relojDia.mjs";
import { permisoFila } from "@/lib/asistencia/tiposGoce.mjs";
import {
  ASISTENCIA, aplicado, claseDe, cuerpoEstadoDia, estadoMotivo, faltaPar, opcionesMotivo, opcionesTipo, parDesdeFila, parVacio,
  goceTxt, nombreTipo, tiposCaptura,
} from "@/lib/asistencia/quePasoMotivo.mjs";
import { actaFila, avisosRespuesta } from "@/lib/actasEstatus.mjs";
import QuePasoMotivo, { GoceMotivo } from "@/components/asistencia/QuePasoMotivo";

const CLAVE_MOTIVOS = "/checador/motivos-permiso";

function Debajo({ registro, conDetalle, goce = "" }) {
  const permiso = conDetalle ? permisoFila(registro) : null;
  const acta = actaFila(registro);
  const resumen = registro.motivos_resumen || "";
  if (!permiso?.detalle && !resumen && !acta && !goce) return null;
  return (
    <span className="flex max-w-[300px] flex-col gap-0.5 whitespace-normal text-[12px] leading-snug text-slate-500">
      {goce ? <span data-goce-guardado>{goce}</span> : null}
      {permiso?.detalle ? <span data-permiso-detalle>{permiso.detalle}</span> : null}
      {resumen ? <span>{resumen}</span> : null}
      {acta ? (
        <Link href={acta.href} data-acta-enlace onClick={(e) => e.stopPropagation()}
          className="w-fit font-medium text-blue-700 underline-offset-2 hover:underline">{acta.texto}</Link>
      ) : null}
    </span>
  );
}

// `comoCampo`: dentro del reloj sin checadas (campos con borde; «Asistencia» y los parciales se quedan en el reloj).
export default function CeldaEstadoDia({ registro, tiposPermiso, readOnly = false, onAbrirReloj, onGuardado, movil = false, comoCampo = false }) {
  const { enqueueSnackbar } = useSnackbar();
  const [cambio, setCambio] = useState(null); // par editado (null = el guardado)
  const [guardando, setGuardando] = useState(false);
  const editable = !readOnly && checadasVivas(registro) === 0;
  // Una sola petición para toda la tabla (SWR la comparte).
  const { data: dataMotivos } = useSWR(editable ? CLAVE_MOTIVOS : null, fetcherWithToken, { revalidateOnFocus: false });
  const estado = estadoFila(registro);
  const nombre = [registro.nombre, registro.apellido_paterno].filter(Boolean).join(" ");
  const nuevo = estadoMotivo(registro, tiposPermiso);

  if (!editable) {
    return (
      <span className="flex flex-col items-start gap-1" data-estado-fila>
        <span data-estado-motivo className="whitespace-normal text-[13.5px] leading-snug text-slate-800">
          {nuevo ?? (permisoFila(registro)?.tipo || textoConIcono(estado.texto, estado.clave))}
        </span>
        <Debajo registro={registro} conDetalle={!nuevo} />
      </span>
    );
  }

  const guardado = parDesdeFila(registro, tiposPermiso, dataMotivos);
  const par = cambio ?? guardado;
  const tipos = tiposCaptura(tiposPermiso, { actual: guardado.tipo });
  const tipo = par.tipo && par.tipo !== ASISTENCIA ? tipos.find((t) => String(t.id) === par.tipo) ?? null : null;
  const { r, motivo, goce } = aplicado(par, tipo, dataMotivos);
  const pendiente = cambio != null && cambio.tipo !== ASISTENCIA && JSON.stringify(cambio) !== JSON.stringify(guardado);
  const falta = pendiente ? faltaPar(par, tipo, dataMotivos) : "";
  const variante = comoCampo || movil ? "campo" : "fila";

  const guardar = async () => {
    if (!tipo || falta) return;
    setGuardando(true);
    try {
      const res = await axios.put(`/checador/asistencias/${registro.id}/estado-dia`, cuerpoEstadoDia(par, tipo, dataMotivos));
      setCambio(null);
      enqueueSnackbar(`${nombre}: ${[nombreTipo(tipo), motivo?.otro ? par.texto.trim() : motivo?.nombre].filter(Boolean).join(" · ")}. Queda en el historial con tu nombre.`, { variant: "success" });
      for (const a of avisosRespuesta(res.data)) enqueueSnackbar(a, { variant: "info" });
      await onGuardado?.(res.data?.asistencia);
    } catch (e) {
      enqueueSnackbar(e?.response?.data?.error || e?.response?.data?.message || "No se pudo guardar el estado del día.", { variant: "error" });
    } finally {
      setGuardando(false);
    }
  };
  const elegirTipo = (v) => {
    const t = tipos.find((x) => String(x.id) === v);
    // Asistencia y los parciales: sus horas se ponen en el reloj.
    if (v === ASISTENCIA || (t && claseDe(t) === "parcial")) {
      setCambio(comoCampo ? parVacio(v === ASISTENCIA ? ASISTENCIA : "") : null);
      onAbrirReloj?.(v === ASISTENCIA ? registro : { ...registro, _tipoParcial: v });
      return;
    }
    setCambio(v ? parVacio(v) : null);
  };
  const set = (c) => setCambio({ ...par, ...c });
  const tecla = (e) => { if (e.key === "Enter" && pendiente && !falta) guardar(); if (e.key === "Escape") setCambio(null); };
  // Sin tipo guardado (sin checar): la opción vacía dice el estado de hoy.
  const vacioTipo = par.tipo ? null : comoCampo ? "Elige qué pasó…" : textoConIcono(estado.texto, estado.clave) || "Elige qué pasó…";
  const boton = movil ? "h-11 px-4" : "h-9 px-3 max-sm:h-11";

  return (
    <span className={`flex w-full flex-col gap-1.5 ${comoCampo ? "" : "min-w-[260px]"}`} data-estado-fila data-no-row-click onKeyDown={tecla}>
      <QuePasoMotivo variante={variante} movil={movil} nombre={nombre} disabled={guardando}
        tipoOpciones={opcionesTipo(tipos)} tipoVacio={vacioTipo} tipo={par.tipo} onTipo={elegirTipo}
        motivoVisible={Boolean(tipo) && r.motivoVisible} motivoOpciones={opcionesMotivo(dataMotivos)} motivoVacio={r.vacioMotivo}
        motivo={par.motivo} onMotivo={(m) => set({ motivo: m, texto: "", goce: null })} esOtro={Boolean(motivo?.otro)}
        texto={par.texto} onTexto={(t) => set({ texto: t })} />
      {pendiente ? (
        <span data-estado-pendiente className="flex flex-col gap-1.5">
          {r.folio ? (
            <input aria-label="Folio IMSS (obligatorio)" placeholder="Folio IMSS (obligatorio)" value={par.folio} maxLength={200}
              onChange={(e) => set({ folio: e.target.value })}
              className={`${movil ? "h-11 text-base" : "h-9 text-[13.5px] max-sm:h-11 max-sm:text-base"} min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30`} />
          ) : null}
          <span className="flex items-center gap-2">
            <span className="flex min-w-0 flex-1"><GoceMotivo goce={goce} cambia={r.goceCambia} onCambio={(g) => set({ goce: g })} movil={movil} className="w-full" /></span>
            <button type="button" disabled={Boolean(falta) || guardando} onClick={guardar}
              className={`${boton} shrink-0 rounded-lg bg-blue-600 text-[13px] font-semibold text-white hover:bg-blue-700 disabled:opacity-45`}>OK</button>
          </span>
          {r.acta ? <span data-aviso-acta className="text-[12px] leading-snug text-amber-800">Sin motivo es injustificada: se creará un acta en borrador.</span> : null}
        </span>
      ) : comoCampo && par.tipo === ASISTENCIA ? (
        <span className="text-[12.5px] text-slate-500">Pon sus horas abajo en «Checadas del reloj».</span>
      ) : <Debajo registro={registro} conDetalle={!nuevo} goce={tipo && r.clase !== "parcial" && !r.acta && goce ? `${r.goceCambia ? "" : "🔒 "}${goceTxt(goce)}` : ""} />}
    </span>
  );
}
