// Regresión (INC-REC-002): el backend ahora exige en POST /postulaciones/create el token de un solo uso
// que entrega /otp/verify. El formulario público debe pasarlo; si no, ninguna postulación sin sesión entraría.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const raiz = new URL("../", import.meta.url).pathname;
const leer = (p) => readFile(`${raiz}src/app/(public)/vacante/[slug]/${p}`, "utf8");

// (27/11/2026, bolsa v2) La solicitud corta vive en Postular.jsx: verifica el código y manda SU token (texto) al crear.
test("la solicitud corta entrega el verification_token de /otp/verify al postularse", async () => {
  const form = await leer("Postular.jsx");
  assert.match(form, /axios\.post\(api\("\/otp\/verify"\), \{ telefono: tel, code:/);
  assert.match(form, /form\.append\("telefono_verificacion_token", r\?\.data\?\.verification_token \|\| ""\)/, "token de la respuesta, nunca el evento del formulario");
  assert.match(form, /axios\.post\(api\("\/postulaciones\/create"\), form\)/);
  assert.match(form, /^import axios from "axios";$/m, "axios directo: la instancia del panel convertiría el FormData a JSON");
  assert.ok(form.indexOf('"/otp/verify"') < form.indexOf('"/postulaciones/create"'), "primero verifica, luego crea");
});
