import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import { createRecorder } from "../src/lib/diagnostico-reloj/core.mjs";
import { yaRegistrado, recordarChecada } from "../src/lib/reloj/recientes.mjs";

const require = createRequire(import.meta.url);
const babel = require("next/dist/compiled/babel/core");
const source = await readFile(new URL("../src/components/FacialRecognitionPanel.jsx", import.meta.url), "utf8");
const { code } = babel.transformSync(source, {
  configFile: false, babelrc: false,
  presets: [require("next/dist/compiled/babel/preset-react")],
  plugins: [() => ({ visitor: {
    ImportDeclaration(path) { path.remove(); },
    ExportDefaultDeclaration(path) { path.replaceWithSourceString("globalThis.Component = FacialRecognitionPanel"); },
  } })],
});
const tick = () => new Promise(setImmediate);

function setup({ gpsFails = false, gpsUnavailable = false, gpsPending = false, postError = null, diag, props = {} } = {}) {
  const slots = [];
  let cursor = 0;
  let effects = [];
  let cameraCalls = 0;
  let gpsCalls = 0;
  let detections = 0;
  let posts = 0;
  let stops = 0;
  let successes = 0;
  let now = Date.now();
  const notifications = [];
  const detectores = [];
  const requests = [];
  let texts = [];
  let resolveModels;
  let resolveDetection;
  let resolveLocation;
  const models = new Promise((resolve) => { resolveModels = resolve; });
  const result = new Promise((resolve) => { resolveDetection = resolve; });
  const timers = new Set();
  const startupTimers = new Map();
  const video = { readyState: 4, videoWidth: 640, videoHeight: 480,
    pause() {}, load() {}, removeAttribute() {} };
  const canvas = { getContext: () => ({ drawImage() {}, clearRect() {} }) };
  const useState = (initial) => {
    const index = cursor++;
    if (!slots[index]) slots[index] = { value: initial };
    return [slots[index].value, (value) => { slots[index].value = value; }];
  };
  const useRef = (initial) => {
    const index = cursor++;
    return slots[index] ??= { current: initial };
  };
  const useEffect = (run, deps) => {
    const index = cursor++;
    const previous = slots[index];
    if (!previous || deps.some((value, i) => value !== previous.deps[i])) {
      effects.push({ index, run, deps, cleanup: previous?.cleanup });
    }
  };
  const context = vm.createContext({
    useState, useRef, useEffect,
    Date: class extends Date { static now() { return now; } },
    React: { createElement(type, props, ...children) {
      texts.push(...children.filter((child) => typeof child === "string"));
      if (type === "video") props.ref.current = video;
      if (type === "canvas") props.ref.current = canvas;
      return null;
    } },
    Camera() {}, Power() {}, RotateCcw() {}, Button() {},
    loadBrowserFaceApi: () => models,
    opcionesRapidas: () => ({ rapido: true }),
    yaRegistrado, recordarChecada,
    enqueueSnackbar(message) { notifications.push(message); }, console,
    axiosInstance: { post: async (url, body) => {
      posts++;
      requests.push({ url, body });
      const error = typeof postError === "function" ? postError(body) : postError;
      if (error) throw { response: {
        status: error === "Faltan coordenadas de ubicaci\u00f3n" ? 400 : 404,
        data: { error },
      } };
      return { data: {} };
    } },
    navigator: { onLine: true,
      mediaDevices: { async getUserMedia() {
        cameraCalls++;
        return { getTracks: () => [{ stop() { stops++; } }] };
      } },
      geolocation: gpsUnavailable ? undefined : { getCurrentPosition(resolve, reject) {
        gpsCalls++;
        if (gpsFails) reject({ code: 1 });
        else {
          resolveLocation = () => resolve({ timestamp: now, coords: { latitude: 1, longitude: 2, accuracy: 8 } });
          if (!gpsPending) resolveLocation();
        }
      } },
    },
    window: { faceapi: { detectSingleFace(_canvas, opciones) {
      detections++;
      detectores.push(opciones?.rapido ? "rapido" : "ssd");
      return { withFaceLandmarks: () => ({ withFaceDescriptor: () => result }) };
    } } },
    setInterval(fn) { timers.add(fn); return fn; },
    clearInterval(fn) { timers.delete(fn); },
    setTimeout(fn, delay) { startupTimers.set(fn, delay); return fn; },
    clearTimeout(fn) { startupTimers.delete(fn); },
    __adamiaDiag: diag,
  });
  vm.runInContext(code, context);
  const render = (isOpen = true) => {
    cursor = 0;
    effects = [];
    texts = [];
    context.Component({ isOpen, idEmpresa: 1, onClose() {}, onSuccess() { successes++; }, ...props });
    effects.forEach(({ cleanup }) => cleanup?.());
    effects.forEach(({ index, run, deps }) => { slots[index] = { deps, cleanup: run() }; });
  };
  return { render, video, resolveModels, resolveDetection, timers, startupTimers, notifications, requests, detectores,
    texts: () => texts,
    advance(ms) { now += ms; },
    setGpsFails(value) { gpsFails = value; },
    setPostError(value) { postError = value; },
    resolveLocation: () => resolveLocation(),
    counts: () => ({ cameraCalls, gpsCalls, detections, posts, stops, successes }) };
}

test("a camera that never delivers a frame stops without requiring a page reload", async () => {
  const env = setup();
  env.render();
  await tick();
  const onPlaying = env.video.onplaying;
  for (const [timeout, delay] of env.startupTimers) if (delay === 15000) timeout();
  onPlaying();
  env.resolveModels();
  await tick();
  env.render();
  assert.equal(env.counts().stops, 1);
  assert.equal(env.counts().detections, 0);
  assert.ok(env.texts().some((message) => message.includes("La cámara no inició")));
});

test("without a face, the next analysis starts almost immediately (60 ms), not after half a second", async () => {
  const env = setup();
  env.render();
  await tick();
  env.video.onplaying();
  env.resolveModels();
  await tick();
  env.render();
  env.resolveDetection(undefined);
  await tick();
  env.advance(30);
  for (const detect of env.timers) detect();
  assert.equal(env.counts().detections, 1, "no new analysis before 60 ms");
  env.advance(40);
  for (const detect of env.timers) detect();
  assert.equal(env.counts().detections, 2);
});

test("slow model startup offers another check-in method and recovers when loading completes", async () => {
  const env = setup();
  env.render();
  await tick();
  env.video.onplaying();
  for (const [timeout, delay] of env.startupTimers) if (delay === 20000) timeout();
  env.render();
  assert.ok(env.texts().some((message) => message.includes("Puedes usar código o QR")));
  env.resolveModels();
  await tick();
  env.render();
  assert.equal(env.counts().detections, 1);
  assert.ok(env.texts().every((message) => !message.includes("Puedes usar código o QR")));
});

test("camera starts before models without requesting GPS; model readiness does not reopen the camera", async () => {
  const env = setup();
  env.render();
  await tick();
  assert.equal(env.counts().cameraCalls, 1);
  assert.equal(env.counts().gpsCalls, 0);
  env.video.onloadeddata();
  env.render();
  assert.equal(env.counts().detections, 0);
  env.resolveModels();
  await tick();
  env.render();
  assert.equal(env.counts().cameraCalls, 1);
  assert.equal(env.counts().detections, 1);
  for (const fn of env.timers) fn();
  assert.equal(env.counts().detections, 1, "inferences must not overlap");
  env.resolveDetection({ descriptor: new Float32Array(128) });
  await tick();
  assert.equal(env.counts().posts, 1);
});

test("closing during first inference prevents posting its stale result", async () => {
  const env = setup();
  env.render();
  await tick();
  env.video.onloadeddata();
  env.resolveModels();
  await tick();
  env.render();
  assert.equal(env.counts().detections, 1);
  env.render(false);
  env.resolveDetection({ descriptor: new Float32Array(128) });
  await tick();
  assert.equal(env.counts().posts, 0);
  assert.ok(env.counts().stops > 0);
  assert.equal(env.timers.size, 0);
});

test("models finishing first wait for the camera frame", async () => {
  const env = setup();
  env.render();
  env.resolveModels();
  await tick();
  env.render();
  assert.equal(env.counts().detections, 0);
  env.video.onloadeddata();
  env.render();
  assert.equal(env.counts().detections, 1);
  assert.equal(env.counts().cameraCalls, 1);
  env.render(false);
  env.resolveDetection(undefined);
  await tick();
});

async function startRecognition(env) {
  env.render();
  await tick();
  env.video.onloadeddata();
  env.resolveModels();
  await tick();
  env.render();
  env.resolveDetection({ descriptor: new Float32Array(128) });
  await tick();
  env.render();
}

test("missing or denied GPS does not block employees without a GPS requirement", async () => {
  for (const options of [{ gpsFails: true }, { gpsUnavailable: true }]) {
    const env = setup(options);
    await startRecognition(env);
    assert.equal(env.counts().posts, 1);
    assert.equal(env.counts().successes, 1);
    assert.equal(env.counts().gpsCalls, 0, "GPS is not requested for employees who do not need it");
    assert.equal(env.requests[0].body.latitud_actual, null);
    assert.equal(env.requests[0].body.longitud_actual, null);
    assert.equal(env.notifications.length, 0);
  }
});

test("sin coincidencia: los primeros 1.5 s reintenta rápido sin aviso; después, aviso estable y pausa de 800 ms", async () => {
  const message = "No se encontr\u00f3 coincidencia facial";
  const env = setup({ postError: message });
  await startRecognition(env);
  // (19/11/2026) Primer cuadro borroso al entrar: no se muestra «no se encontró» y se reintenta a los 200 ms.
  assert.ok(!env.texts().includes(message), "el primer fallo no muestra el aviso");
  assert.equal(env.counts().posts, 1);
  env.advance(150);
  for (const fn of env.timers) fn();
  await tick();
  assert.equal(env.counts().posts, 1, "espera 200 ms entre intentos");
  env.advance(60);
  for (const fn of env.timers) fn();
  await tick();
  env.render();
  assert.equal(env.counts().posts, 2, "reintenta rápido");
  assert.ok(!env.texts().includes(message));
  // Pasada la gracia, el aviso aparece y se queda mientras sigue reintentando cada 800 ms.
  env.advance(1400);
  for (const fn of env.timers) fn();
  await tick();
  env.render();
  assert.equal(env.counts().posts, 3);
  assert.ok(env.texts().includes(message), "después de 1.5 s sí avisa");
  for (let attempt = 0; attempt < 2; attempt++) {
    for (const fn of env.timers) fn();
    await tick();
    assert.equal(env.counts().posts, attempt + 3, "wait before submitting another frame");
    env.advance(800);
    for (const fn of env.timers) fn();
    env.render();
    assert.ok(env.texts().includes(message), "previous message stays visible during retry");
    await tick();
    env.render();
    assert.equal(env.counts().posts, attempt + 4);
  }
  assert.equal(env.notifications.length, 0);
  assert.equal(env.counts().gpsCalls, 0, "unknown faces never trigger a location prompt");
  assert.equal(env.counts().successes, 0);
  env.setPostError(null);
  env.advance(800);
  for (const fn of env.timers) fn();
  await tick();
  assert.equal(env.counts().successes, 1, "automatic retries can still succeed");
});

test("GPS-required server rejection stays visible and recovers automatically after location is enabled", async () => {
  const env = setup({ gpsFails: true,
    postError: (body) => body.latitud_actual === null ? "Faltan coordenadas de ubicaci\u00f3n" : null,
  });
  await startRecognition(env);
  assert.equal(env.counts().successes, 0);
  assert.ok(env.texts().includes("Este empleado requiere ubicaci\u00f3n. Permite el acceso y activa el GPS."));
  assert.equal(env.counts().gpsCalls, 1, "reuse GPS failure until the next attempt");
  env.setGpsFails(false);
  env.advance(3000);
  for (const fn of env.timers) fn();
  await tick();
  assert.equal(env.counts().gpsCalls, 2);
  assert.equal(env.requests[1].body.latitud_actual, null, "identify before asking for GPS again");
  assert.equal(env.requests[2].body.latitud_actual, 1);
  assert.equal(env.requests[2].body.longitud_actual, 2);
  assert.equal(env.requests[2].body.precision_metros, 8);
  assert.equal(typeof env.requests[2].body.ubicacion_timestamp, "number");
  assert.equal(env.counts().successes, 1);
  assert.equal(env.notifications.length, 0);
});

test("closing while required GPS is pending prevents a later registration", async () => {
  const env = setup({ gpsPending: true,
    postError: (body) => body.latitud_actual === null ? "Faltan coordenadas de ubicaci\u00f3n" : null,
  });
  await startRecognition(env);
  assert.equal(env.counts().posts, 1);
  assert.equal(env.counts().gpsCalls, 1);
  env.render(false);
  env.resolveLocation();
  await tick();
  assert.equal(env.counts().posts, 1);
  assert.equal(env.counts().successes, 0);
});

test("GPS is requested after identification and recent coordinates are reused on retry", async () => {
  const env = setup({
    postError: (body) => body.latitud_actual === null
      ? "Faltan coordenadas de ubicaci\u00f3n" : "Fuera del \u00e1rea permitida",
  });
  await startRecognition(env);
  assert.equal(env.requests.length, 2);
  assert.equal(env.requests[0].body.latitud_actual, null);
  assert.equal(env.requests[1].body.latitud_actual, 1);
  assert.equal(env.counts().gpsCalls, 1);
  env.advance(3000);
  for (const fn of env.timers) fn();
  await tick();
  assert.equal(env.requests.length, 3);
  assert.equal(env.requests[2].body.latitud_actual, 1);
  assert.equal(env.counts().gpsCalls, 1);
  assert.equal(env.notifications.length, 0);
});

test("with diagnostics on, behavior is unchanged and every phase is recorded", async () => {
  let t = 0;
  const reportes = [];
  const rec = createRecorder({ now: () => t, storage: null, onFinish: (r) => reportes.push(r) });
  const diag = {
    ahora: () => (t += 5),
    marca: rec.marca, cuenta: rec.cuenta, contexto: rec.agregarContexto,
    iniciar: (m, c) => rec.iniciar(m, c), terminar: (r, d) => rec.terminar(r, d),
  };
  const env = setup({ diag,
    postError: (body) => body.latitud_actual === null ? "Faltan coordenadas de ubicaci\u00f3n" : null,
  });
  await startRecognition(env);
  await tick();
  assert.equal(env.counts().successes, 1);
  assert.equal(env.requests.length, 2);
  assert.equal(env.requests[0].body.latitud_actual, null);
  assert.equal(env.requests[1].body.latitud_actual, 1);
  assert.equal(reportes.length, 1);
  const r = reportes[0];
  assert.equal(r.resultado, "checada registrada");
  const nombres = r.marcas.map((m) => m.n);
  for (const n of ["camara_solicitada", "camara_lista", "modelos_listos_panel", "deteccion_lista",
    "primer_analisis_fin", "primer_rostro", "envio_inicio", "envio_fin", "gps_inicio", "gps_fin", "checada_exitosa", "fin"]) {
    assert.ok(nombres.includes(n), `falta la marca ${n}`);
  }
  assert.equal(nombres.filter((n) => n === "envio_inicio").length, 2);
  assert.equal(r.marcas.find((m) => m.n === "envio_fin").d.error, "Faltan coordenadas de ubicaci\u00f3n");
  const gps = r.marcas.find((m) => m.n === "gps_fin").d;
  assert.equal(gps.ok, true);
  assert.equal(gps.precision_m, 8);
  assert.equal(r.contexto.camara, "640x480");
  assert.equal(r.contadores.analisis.veces, 1);
  assert.equal(r.contadores.envio.veces, 2);
  assert.ok(r.fases.some((f) => f.fase === "Obtener GPS" && f.ms != null));
});

const cara = Float32Array.from({ length: 128 }, (_, i) => Math.sin(i * 1.3));

test("se reconoce con SSD (el detector rápido queda apagado hasta validarlo con fotos reales)", async () => {
  const env = setup();
  env.render();
  await tick();
  env.video.onplaying();
  env.resolveModels();
  await tick();
  env.render();
  env.resolveDetection(undefined);
  await tick();
  for (let i = 0; i < 4; i++) { env.advance(100); for (const detect of env.timers) detect(); await tick(); }
  assert.ok(env.detectores.length >= 2);
  assert.ok(env.detectores.every((d) => d === "ssd"), JSON.stringify(env.detectores));
});

test("modo reloj: la cámara sigue encendida tras checar y la misma persona no vuelve a checar en 60 s", async () => {
  const env = setup({ props: { continuo: true } });
  env.render();
  await tick();
  env.video.onloadeddata();
  env.resolveModels();
  await tick();
  env.render();
  env.resolveDetection({ descriptor: cara });
  await tick();
  env.render();
  assert.equal(env.counts().posts, 1);
  assert.equal(env.counts().successes, 1);
  assert.equal(env.counts().stops, 0, "la cámara no se apaga");
  // Pausa de 2 s con el nombre en pantalla: no analiza.
  env.advance(500);
  for (const fn of env.timers) fn();
  await tick();
  assert.equal(env.counts().posts, 1);
  // Pasada la pausa, la misma cara sigue enfrente: aviso y sin otra checada.
  for (const [fn, delay] of env.startupTimers) if (delay === 2000) { env.startupTimers.delete(fn); fn(); }
  env.advance(2000);
  for (const fn of env.timers) fn();
  await tick();
  env.render();
  assert.equal(env.counts().posts, 1, "no se duplica la checada");
  assert.ok(env.texts().some((t) => /ya registrado hace \d+ s/.test(t)), JSON.stringify(env.texts()));
  // Después de 60 s sí puede volver a checar (p. ej. su salida).
  env.advance(61000);
  for (const fn of env.timers) fn();
  await tick();
  assert.equal(env.counts().posts, 2);
});

test("apagar «Cámara siempre encendida» con la cámara ya encendida sí la apaga al checar", async () => {
  const props = { continuo: true };
  const env = setup({ props });
  env.render();
  await tick();
  env.video.onloadeddata();
  env.resolveModels();
  await tick();
  env.render();
  props.continuo = false; // el usuario apaga el interruptor; el análisis ya estaba corriendo
  env.render();
  env.resolveDetection({ descriptor: cara });
  await tick();
  env.render();
  assert.equal(env.counts().posts, 1);
  assert.ok(env.counts().stops > 0, "la cámara se apaga al checar");
});
