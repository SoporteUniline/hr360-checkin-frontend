// AudioContext simulado para los verify del reloj (sonidos del kiosco, src/lib/reloj/sonidoReloj.mjs): cada nota que se
// toca queda en window.__sonidos como { f: frecuencia redondeada, forma, t: ms }. No suena nada.
export const AUDIO_FALSO = `(() => {
  window.__sonidos = [];
  class ContextoFalso {
    constructor() { this.state = "running"; this.currentTime = 0; this.destination = {}; }
    resume() { this.state = "running"; return Promise.resolve(); }
    close() { return Promise.resolve(); }
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
    createOscillator() {
      const o = { type: "", connect() {}, start() {}, stop() {},
        frequency: { setValueAtTime: (f) => window.__sonidos.push({ f: Math.round(f), forma: o.type, t: Date.now() }) } };
      return o;
    }
  }
  window.AudioContext = ContextoFalso;
  window.webkitAudioContext = ContextoFalso;
})();`;
// Frecuencias (redondeadas) de cada sonido.
export const NOTA = { entrada: 659, salida: 587, comida: 523, error: 196 };
