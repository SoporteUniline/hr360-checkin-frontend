import assert from "node:assert/strict";
import test from "node:test";
import { coseno, recordarChecada, yaRegistrado } from "../src/lib/reloj/recientes.mjs";

const cara = (semilla) => Array.from({ length: 128 }, (_, i) => Math.sin(i * semilla));
test("la misma cara en 60 s no vuelve a checar; otra cara sí; después de 60 s sí", () => {
  const ana = cara(1.1), luis = cara(2.7);
  assert.ok(coseno(ana, luis) < 0.95);
  let r = recordarChecada([], ana, "Ana Torres", 1000);
  assert.deepEqual(yaRegistrado(r, ana.map((v) => v * 1.01), 11000), { nombre: "Ana Torres", pendiente: false, hace: 10 });
  assert.equal(yaRegistrado(r, luis, 11000), null);
  assert.equal(yaRegistrado(r, ana, 62000), null);
  r = recordarChecada(r, luis, "Luis", 70000);
  assert.equal(r.length, 1, "se olvidan las de más de 60 s");
});

test("a repeated capture retains its pending status during the duplicate window", () => {
  const ana = cara(1.1);
  const recientes = recordarChecada([], ana, "Ana", 1000, true);
  assert.deepEqual(yaRegistrado(recientes, ana, 2000), { nombre: "Ana", pendiente: true, hace: 1 });
});
