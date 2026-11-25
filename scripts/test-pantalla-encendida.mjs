// «Mantener encendido» (src/lib/reloj/pantallaEncendida.mjs) con un navegador simulado.
import { test } from "node:test";
import assert from "node:assert/strict";
import { crearPantallaEncendida } from "../src/lib/reloj/pantallaEncendida.mjs";

function entorno({ soporta = true, niega = false } = {}) {
  const pedidos = [];
  const liberados = [];
  const escuchas = new Map();
  const doc = {
    visibilityState: "visible",
    addEventListener: (t, f) => escuchas.set(t, f),
    removeEventListener: (t) => escuchas.delete(t),
  };
  const nav = soporta ? { wakeLock: { request: async (tipo) => {
    if (niega) throw new Error("NotAllowedError");
    const oyentes = [];
    const c = { tipo, addEventListener: (_, f) => oyentes.push(f), release: async () => { liberados.push(c); oyentes.forEach((f) => f()); } };
    pedidos.push(c);
    return c;
  } } } : {};
  return { nav, doc, pedidos, liberados, escuchas };
}

test("prendido pide el candado de pantalla; apagado lo suelta", async () => {
  const e = entorno();
  const p = crearPantallaEncendida(e);
  assert.equal(await p.fijar(true), true);
  assert.equal(e.pedidos.length, 1);
  assert.equal(e.pedidos[0].tipo, "screen");
  assert.equal(p.activo, true);
  await p.fijar(false);
  assert.equal(e.liberados.length, 1);
  assert.equal(p.activo, false);
  assert.equal(e.escuchas.has("visibilitychange"), false);
});

test("al volver a la pestaña lo pide otra vez (el navegador lo suelta al ocultarla)", async () => {
  const e = entorno();
  const p = crearPantallaEncendida(e);
  await p.fijar(true);
  await e.pedidos[0].release(); // el navegador lo soltó
  assert.equal(p.activo, false);
  e.doc.visibilityState = "visible";
  await e.escuchas.get("visibilitychange")();
  assert.equal(e.pedidos.length, 2);
  assert.equal(p.activo, true);
});

test("sin soporte o negado: no truena", async () => {
  const sin = crearPantallaEncendida(entorno({ soporta: false }));
  assert.equal(sin.soportado, false);
  assert.equal(await sin.fijar(true), false);
  const negado = crearPantallaEncendida(entorno({ niega: true }));
  assert.equal(await negado.fijar(true), false);
  assert.equal(negado.activo, false);
  await assert.doesNotReject(() => negado.fijar(false));
});

test("pestaña oculta: espera a que se vea", async () => {
  const e = entorno();
  e.doc.visibilityState = "hidden";
  const p = crearPantallaEncendida(e);
  assert.equal(await p.fijar(true), false);
  assert.equal(e.pedidos.length, 0);
  e.doc.visibilityState = "visible";
  await e.escuchas.get("visibilitychange")();
  assert.equal(e.pedidos.length, 1);
});
