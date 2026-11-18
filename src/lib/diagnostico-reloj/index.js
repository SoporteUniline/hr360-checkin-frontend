// Integración del diagnóstico del reloj checador con el navegador.
// Se activa con ?diag=1 (se recuerda en este dispositivo) o tocando 5 veces la hora
// del reloj en el celular. Desactivado no instala nada y el resto del código
// solo llama globalThis.__adamiaDiag?.marca(...), que entonces no hace nada.
import { createRecorder, reporteTexto } from "./core.mjs";

const CLAVE_ACTIVO = "adamia.diagReloj.activo";
const ENDPOINT = "/api/diagnostico/reloj";
const LIMITE_ENVIO = 60000;

const almacen = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export function diagnosticoActivo() {
  const ls = almacen();
  try {
    const q = new URLSearchParams(window.location.search).get("diag");
    if (q === "1") ls?.setItem(CLAVE_ACTIVO, "1");
    if (q === "0") ls?.removeItem(CLAVE_ACTIVO);
    return ls?.getItem(CLAVE_ACTIVO) === "1";
  } catch {
    return false;
  }
}

export function fijarDiagnostico(activo) {
  const ls = almacen();
  try {
    if (activo) ls?.setItem(CLAVE_ACTIVO, "1");
    else ls?.removeItem(CLAVE_ACTIVO);
  } catch {
    // Sin almacenamiento: el diagnóstico no puede recordarse.
  }
}

function gpuDescripcion() {
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    if (!gl) return "sin WebGL";
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  } catch {
    return null;
  }
}

function entorno() {
  const n = window.navigator || {};
  const c = n.connection || {};
  return {
    ruta: window.location.pathname,
    agente: n.userAgent,
    app_nativa: /AdamiaAppNative/.test(n.userAgent || ""),
    pantalla: `${window.screen?.width}x${window.screen?.height} @${window.devicePixelRatio}`,
    nucleos: n.hardwareConcurrency ?? null,
    memoria_gb: n.deviceMemory ?? null,
    red: c.effectiveType ? { tipo: c.effectiveType, mbps: c.downlink, rtt_ms: c.rtt, ahorro_datos: !!c.saveData } : null,
    gpu: gpuDescripcion(),
  };
}

function recursosFaciales(desde) {
  try {
    return performance.getEntriesByType("resource")
      .filter((e) => /\/models\/|\/vendor\/face-api\//.test(e.name))
      .map((e) => ({
        archivo: e.name.split("/").pop(),
        inicio_ms: Math.round(e.startTime - desde),
        ms: Math.round(e.duration),
        bytes: e.transferSize ?? null,
        tamano: e.decodedBodySize ?? null,
        desde_cache: e.transferSize === 0 && e.decodedBodySize > 0,
      }));
  } catch {
    return [];
  }
}

async function enviar(recorder, reporte) {
  try {
    const cuerpo = JSON.stringify(reporte);
    if (cuerpo.length > LIMITE_ENVIO) return;
    const r = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: cuerpo,
      keepalive: true,
      credentials: "same-origin",
    });
    if (r.ok) recorder.marcarEnviado(reporte.id);
  } catch {
    // Queda guardado en el dispositivo y se reintenta en la siguiente apertura.
  }
}

export function instalarDiagnostico() {
  if (typeof window === "undefined") return null;
  if (window.__adamiaDiag) return window.__adamiaDiag;

  const recorder = createRecorder({
    now: () => performance.now(),
    storage: almacen(),
    onFinish: (reporte) => { void enviar(recorder, reporte); },
  });
  let inicioSesion = 0;

  const api = {
    ahora: () => performance.now(),
    marca: recorder.marca,
    cuenta: recorder.cuenta,
    contexto: recorder.agregarContexto,
    activa: recorder.activa,
    iniciar(motivo, contexto) {
      if (!recorder.activa()) inicioSesion = performance.now();
      return recorder.iniciar(motivo, { ...entorno(), ...contexto });
    },
    terminar(resultado, datos) {
      if (!recorder.activa()) return null;
      recorder.agregarContexto({
        recursos: recursosFaciales(inicioSesion),
        motor_ia: window.faceapi?.tf?.getBackend?.() ?? null,
      });
      return recorder.terminar(resultado, datos);
    },
    actual: recorder.actual,
    historial: recorder.historial,
    borrar: recorder.borrar,
    texto: reporteTexto,
  };

  window.__adamiaDiag = api;
  api.marca("diagnostico_instalado");
  window.addEventListener("pagehide", () => api.terminar("cerró o salió de la app sin checar"));

  // Reintenta los reportes que no se pudieron enviar antes (máximo 5).
  recorder.pendientesDeEnvio().slice(0, 5).forEach((r) => { void enviar(recorder, r); });
  return api;
}
