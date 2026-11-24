// Reglas del rostro con varias referencias (src/lib/rostro/reglas.mjs): puntaje por persona = la mejor de sus
// referencias, la referencia vieja si no hay nuevas, y los textos que ve RH. Al checar compara solo el servidor.
import test from "node:test";
import assert from "node:assert/strict";
import { UMBRAL_EMPRESA, MARGEN, UMBRAL_1A1, referenciasDe, puntaje, coseno } from "../src/lib/rostro/reglas.mjs";
import {
  textoMotivo,
  filaIntento,
  resumenReferencias,
  mensajeRegistro,
  esRostroParecido,
  MENSAJE_ROSTRO_PARECIDO,
} from "../src/lib/rostro/intentos.mjs";

// Vector unitario a un ángulo dado de la base: coseno(base, conAngulo(base, s)) = s exactamente.
const base = (k) => Array.from({ length: 128 }, (_, i) => (i === k ? 1 : 0));
const parecido = (k, s, otro = (k + 1) % 128) =>
  Array.from({ length: 128 }, (_, i) => (i === k ? s : i === otro ? Math.sqrt(1 - s * s) : 0));

test("constantes del contrato, iguales a las del servidor", () => {
  assert.deepEqual([UMBRAL_EMPRESA, MARGEN, UMBRAL_1A1], [0.95, 0.02, 0.92]);
});

test("puntaje = la mejor de sus referencias; sin referencias nuevas usa la vieja como «frente»", () => {
  const ana = {
    id: 1,
    referencias: [
      { pose: "frente", descriptor: parecido(0, 0.9) },
      { pose: "izquierda", descriptor: parecido(0, 0.97) },
    ],
  };
  assert.ok(Math.abs(puntaje(base(0), ana) - 0.97) < 1e-9);
  const vieja = { id: 2, descriptor: JSON.stringify(base(5)) };
  assert.deepEqual(
    referenciasDe(vieja).map((r) => r.pose),
    ["frente"]
  );
  assert.equal(puntaje(base(5), vieja), 1);
  assert.deepEqual(referenciasDe({ id: 3, referencias: [{ pose: "arriba", descriptor: [1, 2] }] }), [], "referencias inválidas no cuentan");
  assert.equal(referenciasDe({ id: 4, referencias: [], descriptor: base(1) }).length, 1, "lista vacía → la vieja");
});

test("RH lee el motivo en español claro, con su %", () => {
  assert.equal(textoMotivo({ motivo: "sin_coincidencia", mejor: "0.9134" }), "No se parecía lo suficiente (91 %)");
  assert.equal(textoMotivo({ motivo: "ambiguo", mejor: 0.97 }), "Se parecía a dos personas");
  assert.equal(textoMotivo({ motivo: "codigo_no_coincide", mejor: 0.88 }), "El código no coincide con la cara (88 %)");
  assert.equal(textoMotivo({ motivo: "codigo_no_coincide" }), "El código no coincide con la cara");
  assert.equal(textoMotivo({ motivo: "codigo_invalido" }), "Escribió un código que no existe");
  assert.equal(textoMotivo({ motivo: "sin_referencias" }), "No tenía rostro registrado");
  const f = filaIntento(
    { id: 9, creado_en: "2026-11-24 21:05:00", modo: "app", metodo: "cara", motivo: "sin_coincidencia", mejor: 0.9 },
    new Date("2026-11-25T00:00:00Z")
  );
  assert.deepEqual(f, {
    id: 9,
    cuando: "24 nov, 3:05 p.m.",
    donde: "App del empleado",
    metodo: "Solo cara",
    motivo: "No se parecía lo suficiente (90 %)",
    porcentaje: 90,
  });
  assert.equal(
    resumenReferencias([{ pose: "frente" }, { pose: "izquierda" }, { pose: "arriba" }], true).texto,
    "3 fotos: Frente, Arriba, Izquierda"
  );
  assert.equal(resumenReferencias(["frente"], true).texto, "1 foto: Frente");
  assert.equal(resumenReferencias([], true).texto, "1 foto (registro anterior, de frente)");
  assert.equal(resumenReferencias(null, false).total, 0);
});

test("409 ROSTRO_PARECIDO: mensaje genérico, sin decir a quién se parece", () => {
  const e = { response: { status: 409, data: { code: "ROSTRO_PARECIDO" } } };
  assert.equal(esRostroParecido(e), true);
  assert.equal(mensajeRegistro(e, "x"), MENSAJE_ROSTRO_PARECIDO);
  assert.equal(
    mensajeRegistro({ response: { status: 409, data: { codigo: "ROSTRO_PARECIDO", error: "Del servidor" } } }, "x"),
    "Del servidor"
  );
  assert.equal(mensajeRegistro({ response: { status: 500 } }, "Intenta de nuevo"), "Intenta de nuevo");
  assert.ok(coseno(base(0), base(0)) === 1);
});

test("«Probar rostro» compara contra la mejor de sus fotos y dice si con «Código y cara» sí lo reconocería", async () => {
  const { compararRostro, textoComparacion } = await import("../src/lib/rostro/comparar.mjs");
  const empleado = {
    descriptor_facial: base(0),
    referencias: [
      { pose: "frente", descriptor: base(0) },
      { pose: "izquierda", descriptor: parecido(0, 0.6, 9) },
    ],
  };
  const r = compararRostro(parecido(0, 0.93, 50), empleado);
  assert.equal(r.fotos, 2);
  assert.equal(r.coincide, false);
  assert.equal(r.conCodigo, true);
  assert.match(textoComparacion(r, "Ana"), /^❌ Con la cara sola no lo reconocería \(similitud 93 %\)\. Con «Código y cara» sí/);
  assert.equal(
    compararRostro(parecido(0, 0.96, 50), { descriptor_facial: JSON.stringify(base(0)) }).coincide,
    true,
    "sin poses: la huella de siempre"
  );
});

test("QR: el 409 ROSTRO_PARECIDO deja reintentar y dice cuántos intentos quedan", async () => {
  const { errorPublico } = await import("../src/lib/rostro/enlaceCelular.mjs");
  const e = errorPublico({
    response: {
      status: 409,
      data: {
        codigo: "ROSTRO_PARECIDO",
        error: "Tu rostro se parece mucho al de otra persona registrada. Vuelve a tomar las fotos con buena luz.",
        intentos_restantes: 1,
      },
    },
  });
  assert.equal(e.fin, false);
  assert.match(e.texto, /Te queda 1 intento con este enlace\.$/);
  assert.equal(errorPublico({ response: { status: 409, data: { codigo: "ROSTRO_PARECIDO", intentos_restantes: 0 } } }).fin, true);
});
