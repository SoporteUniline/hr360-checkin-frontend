// Reglas puras para comparar un rostro con las referencias registradas (contrato «rostro con varias fotos», 24/11/2026).
// Al checar compara SOLO el servidor (el reloj es en línea); aquí quedan los valores y el puntaje que usa
// «Probar rostro» en la ficha para decir lo mismo que dirá el checador. Si cambian en el servidor, cambian aquí.
//
// - Puntaje de una persona = el MAYOR coseno entre la cara capturada y cada una de sus referencias (una por pose).
// - Cara sola contra la empresa: UMBRAL_EMPRESA y MARGEN contra la segunda persona.
// - Contra una sola persona (código y cara en el kiosco, o la app del empleado): UMBRAL_1A1.

export const UMBRAL_EMPRESA = 0.95;
export const MARGEN = 0.02;
export const UMBRAL_1A1 = 0.92;
export const POSES = Object.freeze(["frente", "arriba", "abajo", "izquierda", "derecha"]);

const valido = (d) => Array.isArray(d) && d.length === 128 && d.every(Number.isFinite);

function leerDescriptor(valor) {
  let d = valor;
  if (typeof d === "string") {
    try {
      d = JSON.parse(d);
    } catch {
      return null;
    }
  }
  if (d && !Array.isArray(d) && typeof d.length === "number") d = Array.from(d); // Float32Array
  return valido(d) ? d.map(Number) : null;
}

export function coseno(a, b) {
  if (!valido(a) || !valido(b)) return 0;
  let p = 0,
    x = 0,
    y = 0;
  for (let i = 0; i < 128; i += 1) {
    p += a[i] * b[i];
    x += a[i] * a[i];
    y += b[i] * b[i];
  }
  return x && y ? p / Math.sqrt(x * y) : 0;
}

// Referencias de un empleado: las nuevas por pose; si no tiene, su descriptor de siempre como «frente».
export function referenciasDe(empleado) {
  const nuevas = (Array.isArray(empleado?.referencias) ? empleado.referencias : [])
    .map((r) => ({ pose: POSES.includes(r?.pose) ? r.pose : "frente", descriptor: leerDescriptor(r?.descriptor) }))
    .filter((r) => r.descriptor);
  if (nuevas.length) return nuevas;
  const vieja = leerDescriptor(empleado?.descriptor ?? empleado?.descriptor_facial);
  return vieja ? [{ pose: "frente", descriptor: vieja }] : [];
}

export function puntaje(descriptor, empleado) {
  const vivo = leerDescriptor(descriptor);
  if (!vivo) return 0;
  return referenciasDe(empleado).reduce((mejor, r) => Math.max(mejor, coseno(vivo, r.descriptor)), 0);
}
