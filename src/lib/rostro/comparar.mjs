// «Probar rostro» de la ficha: compara el rostro en vivo con el registrado usando
// EXACTAMENTE la métrica y el umbral del checador real: similitud coseno ≥ 0.95
//   - backend: checadorController.registrarMovimientoFacial (umbralSimilitud = 0.95, calcularSimilitudCoseno) y
//     offlineClockController (cosine < 0.95 → FACE_NOT_MATCHED);
//   - frontend: src/lib/reloj/recientes.mjs (UMBRAL = 0.95, coseno).
// Así la prueba dice lo mismo que dirá el checador. No guarda nada.
import { coseno, UMBRAL } from "../reloj/recientes.mjs";
import { porcentaje } from "./lecturas.mjs";

export { UMBRAL };

const valido = (d) => Array.isArray(d) && d.length === 128 && d.every(Number.isFinite);

// Igual que la ficha: el descriptor guardado puede venir como arreglo o como texto JSON.
export function descriptorGuardado(valor) {
  let d = valor;
  if (typeof d === "string") { try { d = JSON.parse(d); } catch { return null; } }
  return valido(d) ? d.map(Number) : null;
}

export function compararRostro(vivo, guardado, umbral = UMBRAL) {
  const ref = descriptorGuardado(guardado);
  if (!ref) return { ok: false, motivo: "sin_rostro" };
  if (!valido(vivo)) return { ok: false, motivo: "sin_lectura" };
  const similitud = coseno(vivo, ref);
  return { ok: true, coincide: similitud >= umbral, similitud, porcentaje: porcentaje(similitud) };
}

export function textoComparacion(r, nombre) {
  if (!r?.ok) return r?.motivo === "sin_rostro" ? "Aún no hay un rostro guardado para comparar." : "No pudimos leer el rostro. Colócate dentro del óvalo e intenta de nuevo.";
  const quien = String(nombre ?? "").trim() || "la persona";
  return r.coincide
    ? `✅ Coincide: es ${quien} (similitud ${r.porcentaje} %)`
    : `❌ No coincide con el rostro registrado (similitud ${r.porcentaje} %). Vuelve a registrarlo`;
}
