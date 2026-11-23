// Registro de rostro desde Mi espacio (22/11/2026): varias lecturas seguidas de la misma cara se promedian para que la
// huella guardada sea estable. Si dos lecturas no se parecen al menos lo que pide el reloj para decir «es la misma
// persona» (coseno ≥ 0.95, ver reloj/recientes.mjs), no se guarda: se movió, cambió la luz o eran dos personas.
// (23/11/2026) Devuelve también la calidad de la toma (la similitud más baja entre lecturas) para decir «✅ Rostro
// correcto» antes de enviar, y el mensaje que pidió el dueño cuando la toma no sale bien.
import { coseno, UMBRAL } from "../reloj/recientes.mjs";

export const TOMA_MALA = "La toma no salió bien, intenta de nuevo con más luz.";
export const TOMA_INCOMPLETA = "La toma no salió bien: no vimos tu cara todo el tiempo. Colócala dentro del óvalo e intenta de nuevo con más luz.";

// Similitud más baja entre cualquier par de lecturas (1 = idénticas). null si hay menos de dos.
export function consistenciaLecturas(lecturas) {
  let minima = null;
  for (let i = 0; i < lecturas.length; i += 1) {
    for (let j = i + 1; j < lecturas.length; j += 1) {
      const s = coseno(lecturas[i], lecturas[j]);
      if (minima == null || s < minima) minima = s;
    }
  }
  return minima;
}

export function promediarLecturas(lecturas, necesarias = 3, umbral = UMBRAL) {
  const validas = (lecturas ?? []).filter((d) => Array.isArray(d) && d.length === 128 && d.every(Number.isFinite));
  if (validas.length < necesarias) return { ok: false, error: TOMA_INCOMPLETA };
  const calidad = consistenciaLecturas(validas);
  if (calidad != null && calidad < umbral) return { ok: false, error: TOMA_MALA, calidad };
  const descriptor = validas[0].map((_, k) => validas.reduce((s, d) => s + d[k], 0) / validas.length);
  return { ok: true, descriptor, calidad: calidad ?? 1 };
}

// «Las 3 lecturas coinciden entre sí al 99 %» (se redondea hacia abajo: nunca se muestra mejor de lo que fue).
export const porcentaje = (similitud) => Math.max(0, Math.min(100, Math.floor(Number(similitud) * 100 + 1e-9)));
