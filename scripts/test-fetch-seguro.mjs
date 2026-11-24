// Regresión: al checar entrada salía «The DOMException.message getter can only be used on instances of
// DOMException». axios (AxiosError.from) truena al copiar un DOMException con que se rechaza fetch. Con fetchSeguro el
// error llega a la pantalla con su mensaje real.
import { test } from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import { fetchSeguro, errorNormal } from "../src/lib/fetchSeguro.mjs";

const rechazaCon = (e) => () => Promise.reject(e);

test("sin la corrección, axios truena con el DOMException (así se reproducía)", async () => {
  const cliente = axios.create({ adapter: "fetch", env: { fetch: rechazaCon(new DOMException("Bloqueado por el navegador", "SecurityError")) } });
  await assert.rejects(cliente.get("http://ejemplo.invalid/x"), (e) => /DOMException/.test(e.message) && !/Bloqueado/.test(e.message));
});

test("con fetchSeguro el error conserva su mensaje y nombre", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = rechazaCon(new DOMException("Bloqueado por el navegador", "SecurityError"));
  try {
    const cliente = axios.create({ adapter: "fetch", env: { fetch: fetchSeguro } });
    await assert.rejects(cliente.post("http://ejemplo.invalid/checar", { a: 1 }), (e) => e.message === "Bloqueado por el navegador" && e.name === "SecurityError");
  } finally { globalThis.fetch = original; }
});

test("errores normales pasan igual", () => {
  const e = new TypeError("Load failed");
  assert.equal(errorNormal(e), e);
  const abort = errorNormal(new DOMException("The operation was aborted.", "AbortError"));
  assert.ok(abort instanceof Error && !(abort instanceof DOMException));
  assert.equal(abort.name, "AbortError");
});
