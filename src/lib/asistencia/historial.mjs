// Historial de cambios de una asistencia (quién, cuándo, desde dónde). Backend: asistencias_cambios.

import { PANTALLAS } from "./motivoCorreccion.mjs";

const ORIGEN = { asistencia: "Edición", reloj: "Reloj checador", comida: "Comida agregada", estado_dia: "Qué pasó",
  sistema: "Sistema (automático)" };

// (27/11/2026) Con la pantalla de origen (asistencias_cambios.pantalla, migración 20261230) dice desde dónde se corrigió.
export const etiquetaOrigen = (origen, pantalla = null) => PANTALLAS[pantalla] ?? ORIGEN[origen] ?? origen ?? "";

// "2026-11-18 19:45:12.000000" → "18/11 19:45" (hora de la base, igual que el resto de la vista).
export function fechaCorta(valor) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(String(valor ?? ""));
  return m ? `${m[3]}/${m[2]} ${m[4]}:${m[5]}` : "";
}

// "Laura Gómez · 18/11 19:45"
export function quienCuando(cambio) {
  if (!cambio) return "";
  return [cambio.nombre_usuario || "Usuario sin nombre", fechaCorta(cambio.creado_en)].filter(Boolean).join(" · ");
}
