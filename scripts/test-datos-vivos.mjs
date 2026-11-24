import assert from "node:assert/strict";
import test from "node:test";
import { estadoInicial, formatoReloj, largoTexto, segundosReloj, textoParcial, valorContador } from "../src/components/landing/home/datosVivos.mjs";

test("reloj de jornada: HH:MM:SS con ancho fijo", () => {
  assert.equal(formatoReloj(7 * 3600 + 42 * 60 + 15), "07:42:15");
  assert.equal(formatoReloj(0), "00:00:00");
  assert.equal(formatoReloj(59.9), "00:00:59");
  assert.equal(formatoReloj(86400 + 61), "00:01:01");
});

test("el reloj avanza con el tiempo real, aunque el intervalo se haya pausado", () => {
  assert.equal(segundosReloj(100, 1_000, 1_999), 100);
  assert.equal(segundosReloj(100, 1_000, 2_000), 101);
  assert.equal(segundosReloj(100, 1_000, 61_500), 160);
  assert.equal(segundosReloj(100, 5_000, 1_000), 100, "un reloj del sistema que retrocede no lo regresa");
});

test("contador: empieza en 0, llega exacto a su valor y no se pasa", () => {
  assert.equal(valorContador(92, 0), 0);
  assert.equal(valorContador(92, 1), 92);
  assert.equal(valorContador(92, 3), 92);
  assert.equal(valorContador(92, -1), 0);
  assert.ok(valorContador(92, 0.5) > 46, "la curva va adelantada a la mitad");
});

test("escritura: recorta por caracteres y conserva las negritas", () => {
  const partes = [{ texto: "Le tocan " }, { texto: "16 días", b: true }, { texto: " pagados." }];
  assert.equal(largoTexto(partes), 25);
  assert.deepEqual(textoParcial(partes, 0), []);
  assert.deepEqual(textoParcial(partes, 11), [{ texto: "Le tocan " }, { texto: "16", b: true }]);
  assert.deepEqual(textoParcial(partes, 99), partes);
});

test("al hidratar solo se anima lo que aún no se ve y nunca con movimiento reducido", () => {
  assert.equal(estadoInicial({ reducido: false, visible: false }), "espera");
  assert.equal(estadoInicial({ reducido: false, visible: true }), "final");
  assert.equal(estadoInicial({ reducido: true, visible: false }), "final");
});
