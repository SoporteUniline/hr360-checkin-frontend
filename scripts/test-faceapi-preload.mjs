import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

const source = (await readFile(new URL("../src/lib/faceapi-preload.js", import.meta.url), "utf8"))
  .replace(/^import .*;$/m, "").replace(/\bexport (function|const) /g, "$1 ");

for (const idle of [true, false]) {
  test(`preload defers initialization and supports cleanup (${idle ? "idle" : "timer"})`, async () => {
    let scheduled;
    let calls = 0;
    let cancelled;
    let esperado = 250;
    const window = {
      setTimeout(fn, delay) { assert.equal(delay, esperado); scheduled = fn; return 7; },
      clearTimeout(id) { cancelled = id; },
    };
    if (idle) {
      window.requestIdleCallback = (fn, options) => {
        assert.equal(options.timeout, 1500); scheduled = fn; return 7;
      };
      window.cancelIdleCallback = (id) => { cancelled = id; };
    }
    let descargas = 0;
    const context = vm.createContext({ window, loadBrowserFaceApi() {
      calls++;
      return Promise.reject(new Error("offline"));
    }, descargarFaceApi() {
      descargas++;
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
    // (INC-011) Solo descarga: no prepara el reconocimiento (no ejecuta el script ni calienta la GPU).
    // Además espera 10 s a que el panel termine de arrancar, y se puede cancelar en esa espera.
    esperado = 10000;
    cancelled = undefined;
    context.scheduleFaceApiPreload({ soloDescarga: true })();
    assert.equal(cancelled, 7);
    context.scheduleFaceApiPreload({ soloDescarga: true });
    esperado = 250;
    scheduled(); // fin de la espera → reposo
    assert.equal(descargas, 0);
    scheduled();
    await new Promise(setImmediate);
    assert.equal(calls, 1);
    assert.equal(descargas, 1);
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
  const modos = [];
  const context = vm.createContext({
    usePathname: () => pathname,
    useAuth: () => ({ isLoggedIn }),
    scheduleFaceApiPreload(opciones) { starts++; modos.push(opciones?.soloDescarga ? "descarga" : "completa"); return () => { cancellations++; }; },
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
  render("/empleado/panel/inicio", false);
  assert.equal(starts, 0);
  render("/empleado/panel/inicio", true);
  assert.equal(starts, 1);
  render("/empleado/reloj-checador", true);
  assert.equal(starts, 1, "navegar dentro del panel del empleado no reinicia la precarga");
  assert.equal(cancellations, 0);
  render("/empleado/reloj-checador", false);
  assert.equal(cancellations, 1);
  render("/home", true);
  assert.equal(starts, 1);
  render("/seleccionar-reloj", true);
  assert.equal(starts, 2);
  // Panel de RH: no se precarga (Asistencias se dibujaba a pedazos).
  render("/panel/registro-asistencia", true);
  assert.equal(cancellations, 2);
  render("/panel", true);
  assert.equal(starts, 2);
  // (INC-011) En el panel del empleado solo se descargan los archivos; en /seleccionar-reloj se prepara completo.
  assert.deepEqual(modos, ["descarga", "completa"]);
});
