"use client";

// Un renglón de la lista de ley: estado (hecho / falta / no aplica…), fuente, de dónde sale y, para RH, subir el documento
// o marcar el paso a mano (solo Ingreso y Salida) con quién y cuándo. Todo en la página, sin ventanas.
import { useState } from "react";
import { etiquetaEstado, origenItem, puedeMarcar, puedeSubir } from "@/lib/expediente/presentacion.mjs";
import FormArchivo from "./FormArchivo";
import { BOTON, BOTON_SECUNDARIO, CAMPO, Etiqueta, SECUNDARIO } from "./Piezas";

export default function PasoLey({ item, puedeEditar, onSubir, onMarcar }) {
  const [abierto, setAbierto] = useState(null); // "subir" | "no_aplica"
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);
  const { texto, tono } = etiquetaEstado(item);
  const origen = origenItem(item);
  const marcar = async (estado, motivo = null) => {
    setGuardando(true);
    try {
      await onMarcar(item, estado, motivo);
      setAbierto(null);
      setNota("");
    } finally {
      setGuardando(false);
    }
  };
  const pendiente = item.estado === "falta" || item.estado === "vencido";

  return (
    <li data-paso={item.clave} data-estado={item.estado} className="grid gap-2 border-b border-slate-200 py-4 last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Etiqueta tono={tono}>{texto}</Etiqueta>
        <p className="min-w-0 font-bold">
          {item.nombre}
          {item.nivel === "recomendado" ? <span className={`font-normal ${SECUNDARIO}`}> · Recomendado</span> : null}
        </p>
      </div>
      <p className={SECUNDARIO}>{item.fuente}</p>
      {origen ? <p className={SECUNDARIO}>{origen}</p> : null}
      {puedeEditar && (puedeSubir(item, puedeEditar) || puedeMarcar(item, puedeEditar)) && !abierto ? (
        <div className="flex flex-wrap gap-3">
          {puedeSubir(item, puedeEditar) ? (
            <button type="button" className={pendiente ? BOTON : BOTON_SECUNDARIO} onClick={() => setAbierto("subir")}>
              {item.estado === "cumplido" || item.estado === "por_vencer" ? "Subir otro" : "Subir documento"}
            </button>
          ) : null}
          {puedeMarcar(item, puedeEditar) && pendiente ? (
            <button type="button" className={BOTON_SECUNDARIO} disabled={guardando} onClick={() => marcar("hecho")}>Marcar como hecho</button>
          ) : null}
          {puedeMarcar(item, puedeEditar) && item.estado !== "no_aplica" && item.origen !== "documento" && item.origen !== "vinculado" ? (
            <button type="button" className={BOTON_SECUNDARIO} disabled={guardando} onClick={() => setAbierto("no_aplica")}>No aplica</button>
          ) : null}
          {puedeMarcar(item, puedeEditar) && item.marca ? (
            <button type="button" className={BOTON_SECUNDARIO} disabled={guardando} onClick={() => marcar("falta")}>Quitar marca</button>
          ) : null}
        </div>
      ) : null}
      {abierto === "subir" ? (
        <FormArchivo
          titulo={`Subir: ${item.nombre}`}
          ayuda="Queda en su carpeta y cuenta en la lista de ley. La categoría se elige sola."
          nombreInicial={item.nombre}
          sugerirVencimiento={item.sugerir_vencimiento}
          onCancelar={() => setAbierto(null)}
          onEnviar={async (datos) => { await onSubir(item, datos); setAbierto(null); }}
        />
      ) : null}
      {abierto === "no_aplica" ? (
        <form className="grid gap-3 rounded-xl border border-slate-300 bg-slate-50 p-4" onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); if (nota.trim()) marcar("no_aplica", nota.trim()); }}
          onKeyDown={(e) => { if (e.key === "Escape") setAbierto(null); }}>
          <label htmlFor={`no-aplica-${item.clave}`} className="font-bold">¿Por qué no aplica?</label>
          <input id={`no-aplica-${item.clave}`} className={CAMPO} value={nota} maxLength={300} autoFocus onChange={(e) => setNota(e.target.value)} placeholder="Por ejemplo: trabaja por honorarios" />
          <div className="flex flex-wrap gap-3">
            <button type="submit" className={BOTON} disabled={guardando || !nota.trim()}>Guardar «no aplica»</button>
            <button type="button" className={BOTON_SECUNDARIO} onClick={() => setAbierto(null)}>Cancelar</button>
          </div>
        </form>
      ) : null}
    </li>
  );
}
