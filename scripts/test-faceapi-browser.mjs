import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

const source = (await readFile(new URL("../src/lib/faceapi-browser.js", import.meta.url), "utf8"))
  .replace(/\bexport (function|const) /g, "var _x; $1 ").replace(/var _x; const /g, "var ");

function setup({ scriptFails = false, modelFails = false, warmupFails = false } = {}) {
  let scripts = 0;
  let warmups = 0;
  const pending = [];
  // Hay que acercarse al reloj: se carga el detector rápido, no SSD.
  const cargados = [];
  const nets = Object.fromEntries(["tinyFaceDetector", "ssdMobilenetv1", "faceLandmark68Net", "faceRecognitionNet"].map((name) => [name, {
    detectLandmarks: async () => { warmups++; if (warmupFails) throw Error("warmup"); },
    computeFaceDescriptor: async () => { warmups++; if (warmupFails) throw Error("warmup"); },
    loadFromUri(path) {
      cargados.push(name);
      assert.equal(path, "/models");
      if (modelFails) return Promise.reject(new Error("model failed"));
      return new Promise((resolve) => pending.push(() => { this.params = {}; resolve(); }));
    },
  }]));
  const api = { nets, TinyFaceDetectorOptions: function (o) { Object.assign(this, o); },
    async detectSingleFace() { warmups++; if (warmupFails) throw Error("warmup"); } };
  const context = vm.createContext({
    window: {},
    document: {
      createElement: () => ({ remove() {} }),
      head: { appendChild(script) {
        assert.equal(script.src, "/vendor/face-api/face-api-0.22.2.min.js");
        scripts++;
        queueMicrotask(() => {
          if (scriptFails) script.onerror();
          else { context.window.faceapi = api; script.onload(); }
        });
      } },
    },
  });
  vm.runInContext(source, context);
  return { context, pending, api, cargados, load: () => context.loadBrowserFaceApi(),
    retener: () => context.retenerFaceApi(), counts: () => ({ scripts, warmups }) };
}

test("concurrent consumers share script, parallel model loading, and warmup", async () => {
  const env = setup();
  const first = env.load();
  const second = env.load();
  assert.equal(first, second);
  await new Promise(setImmediate);
  assert.equal(env.pending.length, 3, "all model requests start before any completes");
  assert.deepEqual([...env.cargados].sort(), ["faceLandmark68Net", "faceRecognitionNet", "tinyFaceDetector"], "SSD no se descarga");
  let ready = false;
  first.then(() => { ready = true; });
  env.pending[0]();
  await new Promise(setImmediate);
  assert.equal(ready, false);
  env.pending.slice(1).forEach((finish) => finish());
  assert.equal(await first, env.api);
  assert.equal(await env.load(), env.api);
  // Calentamiento: detector + puntos de la cara + huella (el primer rostro no paga su preparación).
  assert.deepEqual(env.counts(), { scripts: 1, warmups: 3 });
});

test("an existing runtime still waits for missing models; loaded models are reused", async () => {
  const env = setup();
  env.context.window.faceapi = env.api;
  env.api.nets.tinyFaceDetector.params = {};
  const ready = env.load();
  assert.equal(env.pending.length, 2);
  env.pending.forEach((finish) => finish());
  await ready;
  assert.equal(env.counts().scripts, 0);
});

test("script and model errors reject initialization and allow retry", async () => {
  for (const options of [{ scriptFails: true }, { modelFails: true }]) {
    const env = setup(options);
    const first = env.load();
    await assert.rejects(first);
    const retry = env.load();
    assert.notEqual(retry, first);
    await assert.rejects(retry);
  }
});

test("optional warmup failure does not prevent recognition readiness", async () => {
  const env = setup({ warmupFails: true });
  const ready = env.load();
  await new Promise(setImmediate);
  env.pending.forEach((finish) => finish());
  assert.equal(await ready, env.api);
});

// INC-007: «entro al reloj, vuelvo a admin y se traba». Al salir del reloj (nadie retiene el reconocimiento) la
// preparación pesada se detiene antes del siguiente paso; al volver a abrirlo sigue donde iba, sin cargar dos veces.
test("sin retención (reloj cerrado) la preparación se detiene entre pasos y sigue al volver a retenerla", async () => {
  const env = setup();
  const soltar = env.retener();
  const ready = env.load();
  await new Promise(setImmediate);
  assert.equal(env.counts().scripts, 1);
  assert.equal(env.pending.length, 3, "con el reloj abierto se piden los modelos");
  soltar();
  soltar(); // soltar dos veces no descuenta otra retención
  env.pending.forEach((finish) => finish());
  for (let i = 0; i < 5; i++) await new Promise(setImmediate);
  assert.equal(env.counts().warmups, 0, "fuera del reloj no se calienta la GPU");
  let listo = false;
  ready.then(() => { listo = true; });
  await new Promise(setImmediate);
  assert.equal(listo, false);
  const soltar2 = env.retener(); // vuelve a abrir el reloj
  assert.equal(await ready, env.api);
  assert.deepEqual(env.counts(), { scripts: 1, warmups: 3 }, "un solo script y un solo calentamiento");
  assert.equal(env.load(), ready, "no se vuelve a cargar");
  soltar2();
});

test("salir del reloj antes de empezar: no se descarga nada hasta volver", async () => {
  const env = setup();
  env.retener()();
  const ready = env.load();
  for (let i = 0; i < 3; i++) await new Promise(setImmediate);
  assert.equal(env.counts().scripts, 0);
  assert.equal(env.pending.length, 0);
  const soltar = env.retener();
  await new Promise(setImmediate);
  await new Promise(setImmediate);
  assert.equal(env.counts().scripts, 1);
  env.pending.forEach((finish) => finish());
  assert.equal(await ready, env.api);
  soltar();
});

// INC-011: «entro en modo empleado y está trabada, después de 1 minuto ya funcionó». El panel del empleado solo baja los
// archivos a la caché (uno por uno, prioridad baja): no ejecuta el script ni crea tensores ni calienta la GPU.
test("descargarFaceApi baja script y pesos sin preparar el reconocimiento", async () => {
  const env = setup();
  const pedidos = [];
  let activos = 0;
  let maxActivos = 0;
  const manifiestos = { tiny_face_detector_model: ["tiny-shard1"], face_landmark_68_model: ["land-shard1"], face_recognition_model: ["rec-shard1", "rec-shard2"] };
  env.context.fetch = async (url, opciones) => {
    pedidos.push(url);
    assert.equal(opciones?.priority, "low");
    activos++; maxActivos = Math.max(maxActivos, activos);
    await new Promise(setImmediate);
    activos--;
    const modelo = Object.keys(manifiestos).find((m) => url === `/models/${m}-weights_manifest.json`);
    return { ok: true, json: async () => [{ paths: manifiestos[modelo] }], blob: async () => ({}) };
  };
  const bajada = env.context.descargarFaceApi();
  assert.equal(env.context.descargarFaceApi(), bajada, "una sola descarga a la vez");
  await bajada;
  assert.deepEqual(pedidos, ["/vendor/face-api/face-api-0.22.2.min.js",
    "/models/tiny_face_detector_model-weights_manifest.json", "/models/tiny-shard1",
    "/models/face_landmark_68_model-weights_manifest.json", "/models/land-shard1",
    "/models/face_recognition_model-weights_manifest.json", "/models/rec-shard1", "/models/rec-shard2"]);
  assert.equal(maxActivos, 1, "de uno en uno");
  assert.deepEqual(env.counts(), { scripts: 0, warmups: 0 }, "no ejecuta el script ni calienta la GPU");
  assert.equal(env.cargados.length, 0, "no crea los modelos en memoria");
  // Ya cargado (o cargándose) para el reloj: no descarga nada más.
  const ready = env.load();
  pedidos.length = 0;
  await env.context.descargarFaceApi();
  assert.equal(pedidos.length, 0);
  await new Promise(setImmediate);
  env.pending.forEach((finish) => finish());
  assert.equal(await ready, env.api);
});

test("descargarFaceApi: si falla una descarga se puede reintentar", async () => {
  const env = setup();
  let falla = true;
  env.context.fetch = async () => ({ ok: !falla, json: async () => [], blob: async () => ({}) });
  const primera = env.context.descargarFaceApi();
  await assert.rejects(primera);
  falla = false;
  const segunda = env.context.descargarFaceApi();
  assert.notEqual(segunda, primera);
  await segunda;
});

test("local runtime matches installed face-api 0.22.2 and includes its license", async () => {
  const root = new URL("../", import.meta.url);
  const local = await readFile(new URL("public/vendor/face-api/face-api-0.22.2.min.js", root));
  const installed = await readFile(new URL("node_modules/face-api.js/dist/face-api.min.js", root));
  assert.deepEqual(local, installed);
  const license = await readFile(new URL("public/vendor/face-api/LICENSE", root), "utf8");
  assert.match(license, /MIT License/);
});

// (25/11/2026) «Preparando reconocimiento facial…» tardaba en la primera apertura del día: los modelos caducaban a las
// 24 h. Deben quedarse en caché (inmutables, un año), igual que el script de face-api.
test("los modelos de face-api se quedan en caché del navegador (inmutables)", async () => {
  const { readFileSync, readdirSync } = await import("node:fs");
  const archivo = readdirSync(new URL("..", import.meta.url)).find((n) => /^next\.config\./.test(n));
  const texto = readFileSync(new URL(`../${archivo}`, import.meta.url), "utf8");
  const bloque = texto.slice(texto.indexOf('source: "/models/:path*"'), texto.indexOf('source: "/models/:path*"') + 200);
  assert.match(bloque, /max-age=31536000, immutable/);
});
