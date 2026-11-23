import test from "node:test";
import assert from "node:assert/strict";
import { fechaParaInput } from "../src/lib/fechaInput.mjs";

test("fecha con hora se ve en el campo de fecha", () => {
  assert.equal(fechaParaInput("1990-05-02T00:00:00.000Z"), "1990-05-02");
  assert.equal(fechaParaInput("1990-05-02T06:00:00.000Z"), "1990-05-02");
  assert.equal(fechaParaInput("1990-05-02 00:00:00"), "1990-05-02");
  assert.equal(fechaParaInput("1990-05-02"), "1990-05-02");
});
test("vacíos e inválidos quedan vacíos", () => {
  for (const v of [null, undefined, "", "0000", "02/05/1990", "1990-5-2"]) assert.equal(fechaParaInput(v), "");
});
