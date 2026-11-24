// «Continuar desde el celular»: reglas puras del enlace QR (src/lib/rostro/enlaceCelular.mjs).
import test from "node:test";
import assert from "node:assert/strict";
import { cuentaRegresiva, dominioEnlace, errorPublico, INTERVALO_ESTADO_MS, matrizQr, mensajeListo, segundosHasta, trasEstado, trazoQr, urlEnlaceRostro, venceEn } from "../src/lib/rostro/enlaceCelular.mjs";

test("dominio del enlace: variable de entorno o el origen de la página, sin «/» final", () => {
  assert.equal(dominioEnlace("https://dev.adamia.com.mx/", "http://127.0.0.1:3000"), "https://dev.adamia.com.mx");
  assert.equal(dominioEnlace("", "http://127.0.0.1:3000"), "http://127.0.0.1:3000");
  assert.equal(dominioEnlace(undefined, "https://adamia.com.mx"), "https://adamia.com.mx");
  const t = "AbC_-123".padEnd(43, "x");
  assert.equal(urlEnlaceRostro("https://dev.adamia.com.mx", t), `https://dev.adamia.com.mx/rostro/${t}`);
});

test("cuenta regresiva y vencimiento según los segundos del servidor", () => {
  assert.equal(cuentaRegresiva(900), "15:00");
  assert.equal(cuentaRegresiva(61), "1:01");
  assert.equal(cuentaRegresiva(-5), "0:00");
  const v = venceEn(900, 1_000);
  assert.equal(segundosHasta(v, 1_000), 900);
  assert.equal(segundosHasta(v, 1_000 + 899_500), 1);
  assert.equal(segundosHasta(v, 1_000 + 2_000_000), 0);
});

test("estado: sigue consultando mientras está pendiente; usado o expirado detienen", () => {
  assert.ok(INTERVALO_ESTADO_MS >= 2000 && INTERVALO_ESTADO_MS <= 3000);
  assert.deepEqual(trasEstado("pendiente"), { seguir: true, resultado: null });
  assert.deepEqual(trasEstado("usado"), { seguir: false, resultado: "usado" });
  assert.deepEqual(trasEstado("expirado"), { seguir: false, resultado: "expirado" });
  assert.equal(mensajeListo("Ana Torres Ruiz"), "Listo, el rostro de Ana quedó registrado desde el celular.");
  assert.equal(mensajeListo(""), "Listo, el rostro de la persona quedó registrado desde el celular.");
});

test("errores de la página pública: vencido o usado piden uno nuevo a RH", () => {
  const e = (status, codigo, error) => ({ response: { status, data: { codigo, error } } });
  for (const c of ["ENLACE_USADO", "ENLACE_VENCIDO", "INTENTOS_AGOTADOS", "ENLACE_INVALIDO"]) {
    const r = errorPublico(e(410, c));
    assert.equal(r.fin, true, c);
    assert.match(r.texto, /Recursos Humanos/);
  }
  assert.equal(errorPublico(e(404)).codigo, "ENLACE_INVALIDO");
  assert.equal(errorPublico(e(400, "ROSTRO_INVALIDO", "No se pudo leer tu rostro.")).fin, false);
  assert.equal(errorPublico(e(400, "ROSTRO_INVALIDO", "No se pudo leer tu rostro.")).texto, "No se pudo leer tu rostro.");
  assert.equal(errorPublico(new Error("red")).fin, false);
});

test("QR: matriz válida con patrones de posición y margen de silencio", () => {
  const url = `https://dev.adamia.com.mx/rostro/${"a".repeat(43)}`;
  const { n, oscuro } = matrizQr(url);
  assert.ok(n >= 21 && (n - 17) % 4 === 0, `tamaño de QR estándar: ${n}`);
  // Esquinas con el patrón de posición (7×7 con borde oscuro).
  for (const [f, c] of [[0, 0], [0, n - 7], [n - 7, 0]]) {
    assert.ok(oscuro(f, c) && oscuro(f + 6, c + 6) && oscuro(f + 3, c + 3) && !oscuro(f + 1, c + 1), `patrón en ${f},${c}`);
  }
  const t = trazoQr(url);
  assert.equal(t.tamano, n + 8);
  assert.ok(t.d.startsWith("M4 4h1v1h-1z"));
  assert.deepEqual(trazoQr(url), t, "determinista");
  assert.notEqual(trazoQr(`${url}b`).d, t.d);
});
