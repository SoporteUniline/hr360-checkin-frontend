"use client";

// Piezas comunes del módulo Tareas.
import { useEffect, useState } from "react";
import axios from "@/lib/axios";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export function fechaCorta(fecha) {
  if (!fecha) return "";
  const [, m, d] = fecha.split("-").map(Number);
  return `${d} ${MESES[m - 1]}`;
}
// «Hoy», «Mañana», «Ayer», «Vencía 20 nov», «25 nov».
export function fechaRelativa(fecha, hoy, hecha = false) {
  if (!fecha) return { texto: "Sin fecha", vencida: false };
  const dias = Math.round((Date.parse(`${fecha}T12:00:00Z`) - Date.parse(`${hoy}T12:00:00Z`)) / 86400000);
  const vencida = !hecha && dias < 0;
  const texto = dias === 0 ? "Hoy" : dias === 1 ? "Mañana" : dias === -1 ? "Ayer" : fechaCorta(fecha);
  return { texto: vencida ? `Vencía ${texto.toLowerCase() === "ayer" ? "ayer" : texto}` : texto, vencida };
}

// Día de un envío (no es fecha límite): «Hoy», «Ayer» o «20 nov».
export function fechaDia(fecha, hoy) {
  const dias = Math.round((Date.parse(`${hoy}T12:00:00Z`) - Date.parse(`${fecha}T12:00:00Z`)) / 86400000);
  return dias === 0 ? "Hoy" : dias === 1 ? "Ayer" : fechaCorta(fecha);
}

export function Avatar({ persona, tam = "size-7" }) {
  if (!persona) return null;
  return <span title={persona.nombre} className={`grid ${tam} shrink-0 place-items-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-800`}>{persona.ini}</span>;
}

const PRIO = { Alta: "bg-red-50 text-red-700", Media: "bg-amber-50 text-amber-800", Baja: "bg-sky-50 text-sky-800" };
export const ChipPrioridad = ({ prioridad }) => <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${PRIO[prioridad] ?? PRIO.Media}`}>{prioridad}</span>;

export function Barra({ porcentaje, color = "bg-brand", alto = "h-1.5" }) {
  return (
    <span className={`block ${alto} w-full overflow-hidden rounded-full bg-slate-200`} role="presentation">
      <span className={`block h-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, porcentaje))}%` }} />
    </span>
  );
}

export function colorCalificacion(p) {
  if (p == null) return "text-slate-400";
  return p >= 90 ? "text-green-700" : p >= 75 ? "text-amber-700" : "text-red-700";
}

// Foto o firma guardada en el servidor: se pide con la sesión (solo si quien la ve tiene permiso) y se guarda en memoria
// mientras la página esté abierta. Después de 3 meses ya no existe y lo dice.
const cacheFotos = new Map();
export function FotoSegura({ llave, alt = "Foto de evidencia", className = "h-12 w-16 rounded-md object-cover" }) {
  const [estado, setEstado] = useState(() => cacheFotos.get(llave) ?? null);
  useEffect(() => {
    if (!llave || cacheFotos.has(llave)) { setEstado(cacheFotos.get(llave) ?? null); return undefined; }
    if (/^(blob|data):/.test(llave)) { setEstado({ url: llave }); return undefined; }
    let vivo = true;
    axios.get(`/checador/tareas/archivo?key=${encodeURIComponent(llave)}`, { responseType: "blob" })
      .then((r) => { const v = { url: URL.createObjectURL(r.data) }; cacheFotos.set(llave, v); if (vivo) setEstado(v); })
      .catch((e) => { const v = { vencida: e?.response?.status === 404 }; if (vivo) setEstado(v); });
    return () => { vivo = false; };
  }, [llave]);
  if (!llave) return null;
  if (estado?.url) return <img src={estado.url} alt={alt} className={className} />;
  if (estado?.vencida) return <span className="text-[11px] text-slate-400">Foto borrada (más de 3 meses)</span>;
  return <span className={`${className} grid place-items-center bg-slate-200 text-[10px] text-slate-500`} aria-label="Cargando foto">…</span>;
}

// campoBase: sin ancho (filtros en línea); campo: ocupa todo el ancho (formularios).
export const campoBase = "h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-blue-100";
export const campo = `${campoBase} w-full`;
export const etiqueta = "block text-[12.5px] font-semibold text-slate-700";
export const botonPrimario = "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50";
export const botonSecundario = "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50";
