// Registro de rostro desde Mi espacio (22/11/2026): varias lecturas seguidas de la misma cara se promedian para que la
// huella guardada sea estable. Si dos lecturas no se parecen al menos lo que pide el reloj para decir «es la misma
// persona» (coseno ≥ 0.95, ver reloj/recientes.mjs), no se guarda: se movió, cambió la luz o eran dos personas.
import { coseno, UMBRAL } from "../reloj/recientes.mjs";

export function promediarLecturas(lecturas, necesarias = 3) {
  const validas = (lecturas ?? []).filter((d) => Array.isArray(d) && d.length === 128 && d.every(Number.isFinite));
  if (validas.length < necesarias) return { ok: false, error: "No pudimos leer bien tu cara. Acércate, mira de frente y busca buena luz." };
  for (let i = 0; i < validas.length; i += 1) {
    for (let j = i + 1; j < validas.length; j += 1) {
      if (coseno(validas[i], validas[j]) < UMBRAL) return { ok: false, error: "Te moviste o cambió la luz entre lecturas. Quédate quieto e intenta de nuevo." };
    }
  }
  const descriptor = validas[0].map((_, k) => validas.reduce((s, d) => s + d[k], 0) / validas.length);
  return { ok: true, descriptor };
}
