import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";

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

function setup({ gpsFails = false, gpsUnavailable = false, postError = null } = {}) {
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
  const requests = [];
  let texts = [];
  let resolveModels;
  let resolveDetection;
  const models = new Promise((resolve) => { resolveModels = resolve; });
  const result = new Promise((resolve) => { resolveDetection = resolve; });
  const timers = new Set();
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
    enqueueSnackbar(message) { notifications.push(message); }, console,
    axiosInstance: { post: async (url, body) => {
      posts++;
      requests.push({ url, body });
      const error = typeof postError === "function" ? postError(body) : postError;
      if (error) throw { response: { data: { error } } };
      return { data: {} };
    } },
    navigator: {
      mediaDevices: { async getUserMedia() {
        cameraCalls++;
        return { getTracks: () => [{ stop() { stops++; } }] };
      } },
      geolocation: gpsUnavailable ? undefined : { getCurrentPosition(resolve, reject) {
        gpsCalls++;
        if (gpsFails) reject({ code: 1 });
        else resolve({ timestamp: now, coords: { latitude: 1, longitude: 2 } });
      } },
    },
    window: { faceapi: { detectSingleFace() {
      detections++;
      return { withFaceLandmarks: () => ({ withFaceDescriptor: () => result }) };
    } } },
    setInterval(fn) { timers.add(fn); return fn; },
    clearInterval(fn) { timers.delete(fn); },
  });
  vm.runInContext(code, context);
  const render = (isOpen = true) => {
    cursor = 0;
    effects = [];
    texts = [];
    context.Component({ isOpen, idEmpresa: 1, onClose() {}, onSuccess() { successes++; } });
    effects.forEach(({ cleanup }) => cleanup?.());
    effects.forEach(({ index, run, deps }) => { slots[index] = { deps, cleanup: run() }; });
  };
  return { render, video, resolveModels, resolveDetection, timers, notifications, requests,
    texts: () => texts,
    advance(ms) { now += ms; },
    setGpsFails(value) { gpsFails = value; },
    setPostError(value) { postError = value; },
    counts: () => ({ cameraCalls, gpsCalls, detections, posts, stops, successes }) };
}

test("camera and GPS start before models; model readiness does not reopen the camera", async () => {
  const env = setup();
  env.render();
  await tick();
  assert.equal(env.counts().cameraCalls, 1);
  assert.equal(env.counts().gpsCalls, 1);
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
    assert.equal(env.requests[0].body.latitud_actual, null);
    assert.equal(env.requests[0].body.longitud_actual, null);
    assert.equal(env.notifications.length, 0);
  }
});

test("nonmatching faces retry with a stable inline error, no snackbar flood, and a pause", async () => {
  const message = "No se encontr\u00f3 coincidencia facial";
  const env = setup({ postError: message });
  await startRecognition(env);
  assert.ok(env.texts().includes(message));
  for (let attempt = 0; attempt < 3; attempt++) {
    for (const fn of env.timers) fn();
    await tick();
    assert.equal(env.counts().posts, attempt + 1, "wait before submitting another frame");
    env.advance(3000);
    for (const fn of env.timers) fn();
    env.render();
    assert.ok(env.texts().includes(message), "previous message stays visible during retry");
    await tick();
    env.render();
    assert.equal(env.counts().posts, attempt + 2);
  }
  assert.equal(env.notifications.length, 0);
  assert.equal(env.counts().successes, 0);
  env.setPostError(null);
  env.advance(3000);
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
  assert.equal(env.requests[1].body.latitud_actual, 1);
  assert.equal(env.requests[1].body.longitud_actual, 2);
  assert.equal(env.counts().successes, 1);
  assert.equal(env.notifications.length, 0);
});
