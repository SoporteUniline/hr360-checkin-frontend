// Regresión (24/11/2026, INC-REC-002): el backend ahora exige en POST /postulaciones/create el token de un solo uso
// que entrega /otp/verify. El formulario público debe pasarlo; si no, ninguna postulación sin sesión entraría.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const raiz = new URL("../", import.meta.url).pathname;
const leer = (p) => readFile(`${raiz}src/app/(public)/vacante/[slug]/ApplicationForm/${p}`, "utf8");

test("OTPForm entrega el verification_token y el formulario lo manda al postularse", async () => {
  const otp = await leer("OTPForm.jsx");
  assert.match(otp, /onSubmit\(form\.getValues\(\),\s*response\?\.data\?\.verification_token/);
  const form = await leer("index.jsx");
  assert.match(form, /formData\.append\(\s*"telefono_verificacion_token"/);
  assert.match(form, /typeof telefonoVerificacionToken === "string"/, "no manda el evento de submit como token");
});
