// Aviso de encuestas por contestar y regreso del login (?next=). node --test scripts/test-clima-aviso.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { destinoSeguro, urlLogin } from "../src/lib/destinoLogin.mjs";
import * as P from "../src/lib/clima/pendientes.mjs";

test("next: solo rutas internas seguras", () => {
  assert.equal(destinoSeguro("/mis-encuestas"), "/mis-encuestas");
  assert.equal(destinoSeguro("/panel/mis-encuestas/21?empresa=7"), "/panel/mis-encuestas/21?empresa=7");
  assert.equal(destinoSeguro(["/empleado/panel/encuestas", "/x"]), "/empleado/panel/encuestas");
  assert.equal(destinoSeguro("/a/../panel"), "/panel", "se normaliza");
  for (const malo of [
    "//evil.example",
    "///evil.example",
    "/\\evil.example",
    "\\\\evil.example",
    "https://evil.example/panel",
    "http:/evil.example",
    "javascript:alert(1)",
    "evil.example",
    "panel",
    " //evil.example",
    "/panel\n//evil",
    "/pa nel",
    "/login",
    "/login?next=/panel",
    "",
    null,
    undefined,
    42,
    `/${"a".repeat(600)}`,
  ])
    assert.equal(destinoSeguro(malo), null, `rechaza ${JSON.stringify(malo)}`);
});

test("urlLogin recuerda la ruta actual solo si es segura", () => {
  assert.equal(urlLogin("/empleado/panel/encuestas/41"), "/login?next=%2Fempleado%2Fpanel%2Fencuestas%2F41");
  assert.equal(urlLogin("/panel/monitor?x=1"), "/login?next=%2Fpanel%2Fmonitor%3Fx%3D1");
  assert.equal(urlLogin("//evil.example"), "/login");
  assert.equal(urlLogin(null), "/login");
});

test("pendientes: conteo, texto y destino del aviso", () => {
  const data = {
    encuestas: [
      { id: 21, empresa: 7, contestada: false, estado: "activa" },
      { id: 22, empresa: 9, contestada: true, estado: "activa" },
      { id: 23, empresa: 7, contestada: false, estado: "cerrada" },
    ],
  };
  assert.equal(P.contarPendientes(data), 1);
  assert.equal(P.contarPendientes(null), 0);
  assert.equal(P.contarPendientes({ ok: false }), 0);
  assert.equal(P.contarPendientes({ encuestas: [] }), 0);
  assert.equal(P.textoPendientes(0), null, "sin pendientes no hay aviso");
  assert.equal(P.textoPendientes(1), "Tienes 1 encuesta por contestar");
  assert.equal(P.textoPendientes(3), "Tienes 3 encuestas por contestar");
  assert.equal(P.destinoAviso(P.RUTA_PANEL, data), "/panel/mis-encuestas/21?empresa=7");
  assert.equal(P.destinoAviso(P.RUTA_EMPLEADO, data), "/empleado/panel/encuestas/21");
  const dos = { encuestas: [{ id: 1, contestada: false }, { id: 2, contestada: false }] };
  assert.equal(P.destinoAviso(P.RUTA_EMPLEADO, dos), P.RUTA_EMPLEADO, "con varias va a la lista");
});

test("ruta de mis encuestas por perfil", () => {
  assert.equal(P.rutaMisEncuestas("Empleado"), "/empleado/panel/encuestas");
  assert.equal(P.rutaMisEncuestas("Recruiter"), "/panel/mis-encuestas");
  assert.equal(P.rutaMisEncuestas("User"), "/panel/mis-encuestas");
  assert.equal(P.rutaMisEncuestas("Admin"), null);
  assert.equal(P.rutaMisEncuestas(undefined), null);
});
