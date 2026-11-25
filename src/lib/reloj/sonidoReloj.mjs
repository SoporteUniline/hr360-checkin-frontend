// Sonidos del reloj de la empresa (kiosco, 26/11/2026). Web Audio: osciladores con envolvente suave, sin archivos.
//  - Checada exitosa: 2 notas ascendentes, < 400 ms, volumen moderado. Salida un poco distinta; salida a comer más cálida.
//  - Error o no reconocido: tono grave y corto, como máximo uno cada 3 s (no suena en los reintentos silenciosos).
//  - Si el navegador bloquea el audio hasta que alguien toca la pantalla, se desbloquea con el primer toque o tecla.
//  - Nunca truena: sin Web Audio o con el audio bloqueado, simplemente no suena.
// Probado en scripts/test-reloj-sonido.mjs.

export const CLAVE_SONIDO = "adamia-reloj-sonido";
export const ESPERA_ERROR_MS = 3000;
const VOLUMEN = 0.16;

// [frecuencia Hz, inicio s, duración s]
export const SONIDOS = {
  entrada: { forma: "sine", notas: [[659.25, 0, 0.13], [987.77, 0.11, 0.22]] }, // mi5 → si5
  salida: { forma: "sine", notas: [[587.33, 0, 0.13], [880, 0.11, 0.22]] }, // re5 → la5
  comida: { forma: "triangle", notas: [[523.25, 0, 0.14], [659.25, 0.12, 0.24]] }, // do5 → mi5, más cálido
  error: { forma: "sine", notas: [[196, 0, 0.26]], volumen: 0.12 }, // sol3, grave y corto
};

// Duración total de un sonido en ms (para comprobar que la confirmación dura menos de 400 ms).
export const duracionMs = (tipo) => Math.round(Math.max(...SONIDOS[tipo].notas.map(([, i, d]) => i + d)) * 1000);

// Qué sonido corresponde al mensaje del servidor (los mismos textos de siempre).
export function tipoSonido(movimiento = "") {
  const t = String(movimiento);
  if (/comer|comida/i.test(t) && !/ya registraste/i.test(t)) return "comida";
  if (/entrada/i.test(t)) return "entrada";
  return "salida";
}

// Preferencia por aparato (por defecto, con sonido).
export function leerSonidoActivo(almacen) {
  try { return almacen?.getItem(CLAVE_SONIDO) !== "0"; } catch { return true; }
}
export function guardarSonidoActivo(almacen, activo) {
  try { almacen?.setItem(CLAVE_SONIDO, activo ? "1" : "0"); } catch { /* solo esta sesión */ }
}

// crearContexto: () => AudioContext (en el navegador, el de window). ahora: reloj en ms (para las pruebas).
export function crearSonidoReloj({ crearContexto, ahora = () => Date.now(), activo = true } = {}) {
  let ctx = null;
  let encendido = activo;
  let ultimoError = -Infinity;

  const contexto = () => {
    if (ctx) return ctx;
    try { ctx = crearContexto?.() ?? null; } catch { ctx = null; }
    return ctx;
  };
  const reanudar = (c) => {
    try {
      if (c?.state === "suspended") c.resume?.()?.catch?.(() => {});
    } catch { /* bloqueado: se intenta en el siguiente toque */ }
  };

  function tocar(tipo) {
    const sonido = SONIDOS[tipo];
    const c = contexto();
    if (!sonido || !c) return false;
    try {
      reanudar(c);
      const t0 = c.currentTime ?? 0;
      const volumen = sonido.volumen ?? VOLUMEN;
      for (const [frecuencia, inicio, duracion] of sonido.notas) {
        const osc = c.createOscillator();
        const env = c.createGain();
        osc.type = sonido.forma;
        osc.frequency.setValueAtTime(frecuencia, t0 + inicio);
        // Envolvente: entra en 12 ms y se apaga suave (sin chasquidos).
        env.gain.setValueAtTime(0.0001, t0 + inicio);
        env.gain.exponentialRampToValueAtTime(volumen, t0 + inicio + 0.012);
        env.gain.exponentialRampToValueAtTime(0.0001, t0 + inicio + duracion);
        osc.connect(env);
        env.connect(c.destination);
        osc.start(t0 + inicio);
        osc.stop(t0 + inicio + duracion + 0.02);
      }
      return true;
    } catch {
      return false;
    }
  }

  return {
    // Primer toque o tecla: crea/reanuda el contexto para que el navegador deje sonar.
    desbloquear() { reanudar(contexto()); },
    exito(movimiento) { return encendido ? tocar(tipoSonido(movimiento)) : false; },
    error() {
      if (!encendido) return false;
      const t = ahora();
      if (t - ultimoError < ESPERA_ERROR_MS) return false;
      ultimoError = t;
      return tocar("error");
    },
    get activo() { return encendido; },
    fijarActivo(valor) { encendido = Boolean(valor); },
    cerrar() { try { ctx?.close?.()?.catch?.(() => {}); } catch { /* nada */ } ctx = null; },
  };
}
