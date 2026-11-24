// «Probar rostro» de la ficha: compara el rostro en vivo con el registrado usando
// EXACTAMENTE la métrica y el umbral del checador real: similitud coseno ≥ 0.95
//   - backend: checadorController.registrarMovimientoFacial (umbralSimilitud = 0.95, calcularSimilitudCoseno) y
//     offlineClockController (cosine < 0.95 → FACE_NOT_MATCHED);
//   - frontend: src/lib/reloj/recientes.mjs (UMBRAL = 0.95, coseno).
// Así la prueba dice lo mismo que dirá el checador. No guarda nada.
import { coseno, UMBRAL } from "../reloj/recientes.mjs";
import { porcentaje } from "./lecturas.mjs";
import { referenciasDe, UMBRAL_1A1 } from "./reglas.mjs";

export { UMBRAL };

const valido = (d) => Array.isArray(d) && d.length === 128 && d.every(Number.isFinite);

// Igual que la ficha: el descriptor guardado puede venir como arreglo o como texto JSON.
export function descriptorGuardado(valor) {
  let d = valor;
  if (typeof d === "string") { try { d = JSON.parse(d); } catch { return null; } }
  return valido(d) ? d.map(Number) : null;
}

// Con varias fotos (referencias por pose) se compara contra todas y cuenta la más parecida, como en el reloj.
// guardado: un descriptor (arreglo o texto JSON) o el empleado { referencias: [{ pose, descriptor }], descriptor_facial }.
export function referenciasGuardadas(guardado) {
  const directo = descriptorGuardado(guardado);
  if (directo) return [directo];
  if (guardado && typeof guardado === "object") return referenciasDe(guardado).map((r) => r.descriptor);
  return [];
}

export function compararRostro(vivo, guardado, umbral = UMBRAL) {
  const refs = referenciasGuardadas(guardado);
  if (!refs.length) return { ok: false, motivo: "sin_rostro" };
  if (!valido(vivo)) return { ok: false, motivo: "sin_lectura" };
  const similitud = refs.reduce((m, ref) => Math.max(m, coseno(vivo, ref)), 0);
  // Entre 0.92 y 0.95 el kiosco no lo acepta por cara sola, pero sí con «Código y cara» o en su app (1 a 1).
  return { ok: true, coincide: similitud >= umbral, conCodigo: similitud >= UMBRAL_1A1, similitud, porcentaje: porcentaje(similitud), fotos: refs.length };
}

export function textoComparacion(r, nombre) {
  if (!r?.ok) return r?.motivo === "sin_rostro" ? "Aún no hay un rostro guardado para comparar." : "No pudimos leer el rostro. Colócate dentro del óvalo e intenta de nuevo.";
  const quien = String(nombre ?? "").trim() || "la persona";
  return r.coincide
    ? `✅ Coincide: es ${quien} (similitud ${r.porcentaje} %)`
    : r.conCodigo
      ? `❌ Con la cara sola no lo reconocería (similitud ${r.porcentaje} %). Con «Código y cara» sí. Si le pasa seguido, vuelve a registrarlo`
      : `❌ No coincide con el rostro registrado (similitud ${r.porcentaje} %). Vuelve a registrarlo`;
}
