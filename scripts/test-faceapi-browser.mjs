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
    counts: () => ({ scripts, warmups }) };
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

test("local runtime matches installed face-api 0.22.2 and includes its license", async () => {
  const root = new URL("../", import.meta.url);
  const local = await readFile(new URL("public/vendor/face-api/face-api-0.22.2.min.js", root));
  const installed = await readFile(new URL("node_modules/face-api.js/dist/face-api.min.js", root));
  assert.deepEqual(local, installed);
  const license = await readFile(new URL("public/vendor/face-api/LICENSE", root), "utf8");
  assert.match(license, /MIT License/);
});
