// INC-007: red de seguridad del panel (src/lib/ui/cuerpoBloqueado.mjs). Sin diálogo abierto, un <body> con
// pointer-events:none / data-scroll-locked / overflow:hidden se libera; con un diálogo abierto no se toca.
import assert from "node:assert/strict";
import test from "node:test";
import { liberarCuerpoBloqueado } from "../src/lib/ui/cuerpoBloqueado.mjs";

function documento({ abierto = false, pointerEvents = "", overflow = "", bloqueado = false } = {}) {
  const estilo = { pointerEvents, overflow, removeProperty(p) { if (p === "pointer-events") this.pointerEvents = ""; else this[p] = ""; } };
  const atributos = new Map(bloqueado ? [["data-scroll-locked", "1"]] : []);
  const body = { style: estilo, hasAttribute: (n) => atributos.has(n), removeAttribute: (n) => atributos.delete(n) };
  const consultas = [];
  return { body, consultas, atributos, querySelector: (sel) => { consultas.push(sel); return abierto ? {} : null; } };
}

test("sin diálogo abierto: quita pointer-events:none, data-scroll-locked y overflow:hidden del body", () => {
  const doc = documento({ pointerEvents: "none", overflow: "hidden", bloqueado: true });
  assert.deepEqual(liberarCuerpoBloqueado(doc), ["pointer-events", "data-scroll-locked", "overflow"]);
  assert.equal(doc.body.style.pointerEvents, "");
  assert.equal(doc.body.style.overflow, "");
  assert.equal(doc.atributos.has("data-scroll-locked"), false);
  assert.match(doc.consultas[0], /\[role="dialog"\]\[data-state="open"\]/);
  assert.match(doc.consultas[0], /data-radix-popper-content-wrapper/);
});

test("con un diálogo, hoja o menú abierto no se toca el body (el bloqueo es legítimo)", () => {
  const doc = documento({ abierto: true, pointerEvents: "none", bloqueado: true });
  assert.deepEqual(liberarCuerpoBloqueado(doc), []);
  assert.equal(doc.body.style.pointerEvents, "none");
  assert.equal(doc.atributos.has("data-scroll-locked"), true);
});

test("body sano o sin documento: no hace nada", () => {
  assert.deepEqual(liberarCuerpoBloqueado(documento()), []);
  assert.deepEqual(liberarCuerpoBloqueado(null), []);
  assert.deepEqual(liberarCuerpoBloqueado({}), []);
});
