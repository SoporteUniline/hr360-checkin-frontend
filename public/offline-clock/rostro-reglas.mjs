// Reglas para comparar un rostro con las referencias registradas (contrato «rostro con varias fotos», 24/11/2026).
// Módulo puro y sin dependencias: lo usan el reloj sin conexión (face.mjs, también desde el service worker) y la app
// (src/lib/rostro/reglas.mjs lo reexporta). El servidor aplica los mismos valores; si cambian aquí, cambian allá.
//
// - Puntaje de una persona = el MAYOR coseno entre la cara capturada y cada una de sus referencias (una por pose).
// - Cara sola contra la empresa: gana la persona con mayor puntaje si llega a UMBRAL_EMPRESA y le saca MARGEN a la
//   segunda persona; si no le saca margen es «ambiguo». Un empleado con «Código y cara» nunca entra por cara sola.
// - Contra una sola persona (código y cara en el kiosco, o la app del empleado): basta UMBRAL_1A1.
// Los umbrales son provisionales: se calibran después con rostro_intentos y los puntajes de checadas aceptadas.

export const UMBRAL_EMPRESA = 0.95;
export const MARGEN = 0.02;
export const UMBRAL_1A1 = 0.92;
export const UMBRAL_MISMA_PERSONA = 0.85; // al registrar: cada pose contra «frente»
export const POSES = Object.freeze(["frente", "arriba", "abajo", "izquierda", "derecha"]);
export const MOTIVOS = Object.freeze(["sin_coincidencia", "ambiguo", "codigo_no_coincide", "codigo_invalido", "sin_referencias"]);
export const VENTANA_INTENTOS_MS = 30000; // como mucho 1 intento por candidato y motivo cada 30 s por dispositivo

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

const redondear = (n) => (Number.isFinite(n) ? Math.round(n * 10000) / 10000 : null);
const idDe = (e) => (e ? Number(e.id ?? e.id_empleado) : null);

/**
 * Cara sola contra la empresa. empleados: [{ id, referencias?, descriptor?, metodo_chequeo? }].
 * → { ok: true, empleado, exacto, mejor, segundo, idSegundo } (exacto: puntaje sin redondear; mejor/segundo: 4 decimales)
 * | { ok: false, motivo: 'sin_coincidencia' | 'ambiguo' | 'sin_referencias' | 'codigo_requerido', empleado, mejor, segundo, idSegundo }
 * 'codigo_requerido' no es un intento fallido: la persona tiene «Código y cara» y se le pide su código.
 */
export function caraSola(descriptor, empleados, umbrales = {}) {
  const { umbral = UMBRAL_EMPRESA, margen = MARGEN } = umbrales;
  const lista = (Array.isArray(empleados) ? empleados : []).filter((e) => referenciasDe(e).length);
  if (!lista.length) return { ok: false, motivo: "sin_referencias", empleado: null, mejor: null, segundo: null, idSegundo: null };
  const orden = lista.map((empleado) => ({ empleado, s: puntaje(descriptor, empleado) })).sort((a, b) => b.s - a.s);
  const [primero, segundoLugar] = orden;
  const base = {
    empleado: primero.empleado,
    exacto: primero.s,
    mejor: redondear(primero.s),
    segundo: segundoLugar ? redondear(segundoLugar.s) : null,
    idSegundo: segundoLugar ? idDe(segundoLugar.empleado) : null,
  };
  if (primero.s < umbral) return { ok: false, motivo: "sin_coincidencia", ...base };
  if (segundoLugar && primero.s - segundoLugar.s < margen) return { ok: false, motivo: "ambiguo", ...base };
  if (primero.empleado.metodo_chequeo === "codigo_cara") return { ok: false, motivo: "codigo_requerido", ...base };
  return { ok: true, ...base };
}

// Contra una sola persona (ya identificada por su código o por su sesión).
export function unoAUno(descriptor, empleado, umbral = UMBRAL_1A1, motivoFallo = "codigo_no_coincide") {
  if (!empleado || !referenciasDe(empleado).length)
    return { ok: false, motivo: "sin_referencias", empleado: empleado ?? null, mejor: null, segundo: null, idSegundo: null };
  const s = puntaje(descriptor, empleado);
  return {
    ok: s >= umbral,
    motivo: s >= umbral ? null : motivoFallo,
    empleado,
    exacto: s,
    mejor: redondear(s),
    segundo: null,
    idSegundo: null,
  };
}

// Límite de intentos por dispositivo: devuelve si se manda y la lista actualizada de lo ya enviado (sin lo vencido).
export function debeReportar(enviados, intento, ahora = Date.now(), ventana = VENTANA_INTENTOS_MS) {
  const clave = `${intento?.id_empleado ?? "-"}|${intento?.motivo ?? ""}`;
  const vigentes = (Array.isArray(enviados) ? enviados : []).filter((e) => e && ahora - e.t < ventana && ahora >= e.t);
  if (!MOTIVOS.includes(intento?.motivo)) return { reportar: false, enviados: vigentes };
  if (vigentes.some((e) => e.clave === clave)) return { reportar: false, enviados: vigentes };
  return { reportar: true, enviados: [...vigentes, { clave, t: ahora }].slice(-200) };
}
