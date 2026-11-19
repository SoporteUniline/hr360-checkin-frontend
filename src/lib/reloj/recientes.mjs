// Reloj facial: evita la doble checada de la misma persona en poco tiempo (cámara siempre encendida).
// Se compara la huella facial con las de quienes checaron en los últimos 60 s (umbral del reloj: 0.95).
export const VENTANA_MS = 60000;
export const UMBRAL = 0.95;

export function coseno(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let d = 0, x = 0, y = 0;
  for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; x += a[i] * a[i]; y += b[i] * b[i]; }
  return x && y ? d / Math.sqrt(x * y) : 0;
}

// Devuelve { nombre, hace } si la huella coincide con una checada reciente; si no, null.
export function yaRegistrado(recientes, descriptor, ahora = Date.now()) {
  for (const r of recientes ?? []) {
    if (ahora - r.t > VENTANA_MS) continue;
    if (coseno(r.descriptor, descriptor) >= UMBRAL) return { nombre: r.nombre || "Esta persona", pendiente: r.pendiente, hace: Math.max(1, Math.round((ahora - r.t) / 1000)) };
  }
  return null;
}

// Agrega la checada y quita las de más de 60 s.
export function recordarChecada(recientes, descriptor, nombre, ahora = Date.now(), pendiente = false) {
  return [...(recientes ?? []).filter((r) => ahora - r.t <= VENTANA_MS), { descriptor: Array.from(descriptor), nombre, pendiente, t: ahora }];
}
