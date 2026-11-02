import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

const source = (await readFile(new URL("../src/lib/faceapi-preload.js", import.meta.url), "utf8"))
  .replace(/^import .*;$/m, "").replace("export function", "function");

for (const idle of [true, false]) {
  test(`preload defers initialization and supports cleanup (${idle ? "idle" : "timer"})`, async () => {
    let scheduled;
    let calls = 0;
    let cancelled;
    const window = {
      setTimeout(fn, delay) { assert.equal(delay, 250); scheduled = fn; return 7; },
      clearTimeout(id) { cancelled = id; },
    };
    if (idle) {
      window.requestIdleCallback = (fn, options) => {
        assert.equal(options.timeout, 1500); scheduled = fn; return 7;
      };
      window.cancelIdleCallback = (id) => { cancelled = id; };
    }
    const context = vm.createContext({ window, loadBrowserFaceApi() {
      calls++;
      return Promise.reject(new Error("offline"));
    } });
    vm.runInContext(source, context);
    const cancel = context.scheduleFaceApiPreload();
    assert.equal(calls, 0);
    cancel();
    assert.equal(cancelled, 7);
    context.scheduleFaceApiPreload();
    scheduled();
    await new Promise(setImmediate);
    assert.equal(calls, 1, "background failures are handled without an unhandled rejection");
  });
}

test("preloader runs only in authenticated app routes and survives internal navigation", async () => {
  const require = createRequire(import.meta.url);
  const babel = require("next/dist/compiled/babel/core");
  const component = await readFile(new URL("../src/components/FaceApiPreloader.jsx", import.meta.url), "utf8");
  const { code } = babel.transformSync(component, {
    configFile: false, babelrc: false,
    plugins: [() => ({ visitor: {
      ImportDeclaration(path) { path.remove(); },
      ExportDefaultDeclaration(path) { path.replaceWith(path.node.declaration); },
    } })],
  });
  let pathname = "/login";
  let isLoggedIn = false;
  let previous;
  let cleanup;
  let starts = 0;
  let cancellations = 0;
  const context = vm.createContext({
    usePathname: () => pathname,
    useAuth: () => ({ isLoggedIn }),
    scheduleFaceApiPreload() { starts++; return () => { cancellations++; }; },
    useEffect(run, deps) {
      if (!previous || deps.some((value, i) => value !== previous[i])) {
        cleanup?.(); cleanup = run(); previous = deps;
      }
    },
  });
  vm.runInContext(code, context);
  const render = (path, loggedIn) => {
    pathname = path; isLoggedIn = loggedIn; context.FaceApiPreloader();
  };
  render("/login", false);
  render("/panel", false);
  assert.equal(starts, 0);
  render("/panel", true);
  assert.equal(starts, 1);
  render("/panel/empleados", true);
  assert.equal(starts, 1);
  assert.equal(cancellations, 0);
  render("/panel/empleados", false);
  assert.equal(cancellations, 1);
  render("/home", true);
  assert.equal(starts, 1);
  render("/empleado/panel/inicio", true);
  assert.equal(starts, 2);
  render("/empleado/reloj-checador", true);
  assert.equal(starts, 2);
});
