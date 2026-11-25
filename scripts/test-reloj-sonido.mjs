// Sonidos del reloj de la empresa (src/lib/reloj/sonidoReloj.mjs) con un AudioContext simulado.
import { test } from "node:test";
import assert from "node:assert/strict";
import { crearSonidoReloj, tipoSonido, duracionMs, leerSonidoActivo, guardarSonidoActivo, CLAVE_SONIDO, SONIDOS } from "../src/lib/reloj/sonidoReloj.mjs";

function contextoFalso({ estado = "running", falla = false } = {}) {
  const notas = [];
  const ctx = {
    state: estado, currentTime: 10, destination: {}, reanudado: 0,
    resume() { ctx.reanudado++; ctx.state = "running"; return Promise.resolve(); },
    createOscillator() {
      if (falla) throw new Error("sin audio");
      const o = { type: "", frequency: { setValueAtTime: (f) => notas.push({ f, tipo: o.type }) }, connect() {}, start() {}, stop() {} };
      return o;
    },
    createGain: () => ({ gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }),
  };
  return { ctx, notas };
}

test("éxito: dos notas ascendentes de menos de 400 ms; salida distinta y comida más cálida", () => {
  for (const tipo of ["entrada", "salida", "comida"]) {
    const [a, b] = SONIDOS[tipo].notas;
    assert.equal(SONIDOS[tipo].notas.length, 2);
    assert.ok(b[0] > a[0], `${tipo} asciende`);
    assert.ok(duracionMs(tipo) < 400, `${tipo}: ${duracionMs(tipo)} ms`);
  }
  assert.notDeepEqual(SONIDOS.entrada.notas, SONIDOS.salida.notas);
  assert.equal(SONIDOS.comida.forma, "triangle");
  assert.ok(SONIDOS.comida.notas[0][0] < SONIDOS.entrada.notas[0][0], "comida más grave/cálida");
  assert.ok(SONIDOS.error.notas[0][0] < 250, "error grave");
});

test("tipoSonido según el mensaje del servidor", () => {
  assert.equal(tipoSonido("Entrada registrada"), "entrada");
  assert.equal(tipoSonido("Salida registrada"), "salida");
  assert.equal(tipoSonido("Turno cerrado"), "salida");
  assert.equal(tipoSonido("Salida a comer registrada. ¡Buen provecho!"), "comida");
  assert.equal(tipoSonido("Ya registraste tu comida hoy. Registramos tu salida."), "salida");
});

test("toca el sonido de la checada y el de error", () => {
  const { ctx, notas } = contextoFalso();
  const s = crearSonidoReloj({ crearContexto: () => ctx });
  assert.equal(s.exito("Entrada registrada"), true);
  assert.deepEqual(notas.map((n) => n.f), SONIDOS.entrada.notas.map((n) => n[0]));
  notas.length = 0;
  assert.equal(s.exito("Salida a comer registrada"), true);
  assert.equal(notas[0].tipo, "triangle");
  notas.length = 0;
  assert.equal(s.error(), true);
  assert.deepEqual(notas.map((n) => n.f), [SONIDOS.error.notas[0][0]]);
});

test("error: como máximo uno cada 3 s (los reintentos no suenan)", () => {
  let t = 0;
  const { ctx, notas } = contextoFalso();
  const s = crearSonidoReloj({ crearContexto: () => ctx, ahora: () => t });
  assert.equal(s.error(), true);
  for (t = 200; t < 3000; t += 400) assert.equal(s.error(), false);
  t = 3000;
  assert.equal(s.error(), true);
  assert.equal(notas.length, 2);
});

test("silenciado no suena; se vuelve a activar", () => {
  const { ctx, notas } = contextoFalso();
  const s = crearSonidoReloj({ crearContexto: () => ctx, activo: false });
  assert.equal(s.exito("Entrada registrada"), false);
  assert.equal(s.error(), false);
  assert.equal(notas.length, 0);
  s.fijarActivo(true);
  assert.equal(s.exito("Entrada registrada"), true);
});

test("audio bloqueado: el primer toque lo reanuda; sin Web Audio o con fallas no truena", () => {
  const { ctx } = contextoFalso({ estado: "suspended" });
  const s = crearSonidoReloj({ crearContexto: () => ctx });
  s.desbloquear();
  assert.equal(ctx.reanudado, 1);
  assert.equal(ctx.state, "running");
  const sin = crearSonidoReloj({ crearContexto: () => { throw new Error("no hay AudioContext"); } });
  assert.doesNotThrow(() => { sin.desbloquear(); assert.equal(sin.exito("Entrada registrada"), false); assert.equal(sin.error(), false); });
  const falla = crearSonidoReloj({ crearContexto: () => contextoFalso({ falla: true }).ctx });
  assert.equal(falla.exito("Entrada registrada"), false);
  const rechaza = { ...contextoFalso({ estado: "suspended" }).ctx, resume: () => Promise.reject(new Error("bloqueado")) };
  assert.doesNotThrow(() => crearSonidoReloj({ crearContexto: () => rechaza }).desbloquear());
});

test("preferencia por aparato: activado por defecto y almacenamiento que falla", () => {
  const datos = new Map();
  const almacen = { getItem: (k) => datos.get(k) ?? null, setItem: (k, v) => datos.set(k, v) };
  assert.equal(leerSonidoActivo(almacen), true);
  guardarSonidoActivo(almacen, false);
  assert.equal(datos.get(CLAVE_SONIDO), "0");
  assert.equal(leerSonidoActivo(almacen), false);
  const roto = { getItem() { throw new Error("bloqueado"); }, setItem() { throw new Error("bloqueado"); } };
  assert.equal(leerSonidoActivo(roto), true);
  assert.doesNotThrow(() => guardarSonidoActivo(roto, false));
});
