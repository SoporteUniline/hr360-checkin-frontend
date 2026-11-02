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

function setup() {
  const slots = [];
  let cursor = 0;
  let effects = [];
  let cameraCalls = 0;
  let gpsCalls = 0;
  let detections = 0;
  let posts = 0;
  let stops = 0;
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
    React: { createElement(type, props) {
      if (type === "video") props.ref.current = video;
      if (type === "canvas") props.ref.current = canvas;
      return null;
    } },
    Camera() {}, Power() {}, RotateCcw() {}, Button() {},
    loadBrowserFaceApi: () => models,
    enqueueSnackbar() {}, console,
    axiosInstance: { post: async () => { posts++; return { data: {} }; } },
    navigator: {
      mediaDevices: { async getUserMedia() {
        cameraCalls++;
        return { getTracks: () => [{ stop() { stops++; } }] };
      } },
      geolocation: { getCurrentPosition(resolve) {
        gpsCalls++;
        resolve({ timestamp: Date.now(), coords: { latitude: 1, longitude: 2 } });
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
    context.Component({ isOpen, idEmpresa: 1, onClose() {}, onSuccess() {} });
    effects.forEach(({ cleanup }) => cleanup?.());
    effects.forEach(({ index, run, deps }) => { slots[index] = { deps, cleanup: run() }; });
  };
  return { render, video, resolveModels, resolveDetection, timers,
    counts: () => ({ cameraCalls, gpsCalls, detections, posts, stops }) };
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
