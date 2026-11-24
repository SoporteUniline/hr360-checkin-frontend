// Comparación del rostro con varias referencias (public/offline-clock/rostro-reglas.mjs y face.mjs): puntaje por persona =
// la mejor de sus referencias, cara sola con margen, «Código y cara» nunca por cara sola, uno a uno contra una persona, la
// referencia vieja si no hay nuevas, el límite de intentos y los textos que ve RH.
import test from "node:test";
import assert from "node:assert/strict";
import {
  UMBRAL_EMPRESA,
  MARGEN,
  UMBRAL_1A1,
  referenciasDe,
  puntaje,
  caraSola,
  unoAUno,
  debeReportar,
  coseno,
} from "../public/offline-clock/rostro-reglas.mjs";
import * as reglasApp from "../src/lib/rostro/reglas.mjs";
import { MODEL, matchFace, matchFaceCode } from "../public/offline-clock/face.mjs";
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
const vigente = (empleados, extra = {}) => ({
  company: 10,
  model: MODEL,
  prepared_at: new Date(Date.now() - 1000).toISOString(),
  expires_at: new Date(Date.now() + 86400000).toISOString(),
  employees: empleados,
  ...extra,
});

test("constantes del contrato, compartidas por la app y el reloj", () => {
  assert.deepEqual([UMBRAL_EMPRESA, MARGEN, UMBRAL_1A1], [0.95, 0.02, 0.92]);
  assert.equal(reglasApp.UMBRAL_EMPRESA, UMBRAL_EMPRESA);
  assert.equal(reglasApp.caraSola, caraSola);
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

test("cara sola: gana con umbral y margen; sin margen es ambiguo; abajo del umbral no coincide", () => {
  const ana = { id: 1, referencias: [{ pose: "frente", descriptor: base(0) }] };
  const luis = { id: 2, referencias: [{ pose: "frente", descriptor: parecido(0, 0.94) }] };
  const r = caraSola(base(0), [ana, luis]);
  assert.equal(r.ok, true);
  assert.equal(r.empleado.id, 1);
  assert.equal(r.segundo, 0.94);
  assert.equal(r.idSegundo, 2);
  const gemelo = { id: 3, referencias: [{ pose: "derecha", descriptor: parecido(0, 0.99) }] };
  const amb = caraSola(base(0), [ana, gemelo]);
  assert.equal(amb.ok, false);
  assert.equal(amb.motivo, "ambiguo", "1.00 − 0.99 < 0.02");
  const bajo = caraSola(parecido(0, 0.93), [ana]);
  assert.equal(bajo.motivo, "sin_coincidencia");
  assert.equal(bajo.mejor, 0.93);
  assert.equal(bajo.empleado.id, 1, "el más parecido queda como candidato");
  assert.equal(caraSola(base(0), []).motivo, "sin_referencias");
});

test("«Código y cara» nunca se acepta por cara sola; con su código, 1 a 1 con 0.92", () => {
  const ana = { id: 1, metodo_chequeo: "codigo_cara", referencias: [{ pose: "frente", descriptor: base(0) }] };
  assert.equal(caraSola(base(0), [ana]).motivo, "codigo_requerido");
  assert.equal(unoAUno(parecido(0, 0.93), ana).ok, true, "0.93 ≥ 0.92 contra una sola persona");
  const no = unoAUno(parecido(0, 0.91), ana);
  assert.equal(no.ok, false);
  assert.equal(no.motivo, "codigo_no_coincide");
  assert.equal(unoAUno(base(0), { id: 2 }).motivo, "sin_referencias");
});

test("face.mjs: el reloj de la empresa usa cara sola con margen y pide el código a «Código y cara»", () => {
  const ana = {
    id: 1,
    nombre: "Ana",
    code_identity: "h-ana",
    referencias: [
      { pose: "frente", descriptor: base(0) },
      { pose: "arriba", descriptor: parecido(0, 0.96) },
    ],
  };
  const luis = { id: 2, nombre: "Luis", code_identity: "h-luis", descriptor: base(9) };
  const caro = {
    id: 3,
    nombre: "Caro",
    code_identity: "h-caro",
    metodo_chequeo: "codigo_cara",
    referencias: [{ pose: "frente", descriptor: base(20) }],
  };
  const datos = vigente([ana, luis, caro], { code_references: [{ id: 4, nombre: "Sin rostro", code_identity: "h-sin" }] });
  assert.equal(matchFace(parecido(0, 0.97), datos).employee.id, 1);
  assert.equal(matchFace(base(9), datos).employee.id, 2, "la referencia vieja sigue sirviendo");
  assert.throws(
    () => matchFace(base(20), datos),
    (e) => e.code === "CODE_REQUIRED" && !e.intento,
    "pide el código; no es intento fallido"
  );
  assert.throws(
    () => matchFace(parecido(0, 0.9, 50), datos),
    (e) =>
      e.code === "FACE_NOT_MATCHED" &&
      e.intento.motivo === "sin_coincidencia" &&
      e.intento.id_empleado === 1 &&
      e.intento.mejor === 0.9 &&
      e.intento.metodo === "cara"
  );
  const dos = vigente([ana, { ...ana, id: 5, code_identity: "h-5" }]);
  assert.throws(
    () => matchFace(base(0), dos),
    (e) => e.code === "FACE_AMBIGUOUS" && e.intento.motivo === "ambiguo" && e.intento.segundo === 1
  );
  // Código y cara.
  assert.equal(matchFaceCode(base(20), datos, "h-caro").employee.id, 3);
  assert.equal(matchFaceCode(parecido(20, 0.93), datos, "h-caro").score >= 0.92, true);
  assert.throws(
    () => matchFaceCode(base(0), datos, "h-caro"),
    (e) =>
      e.code === "FACE_CODE_NOT_MATCHED" &&
      e.intento.motivo === "codigo_no_coincide" &&
      e.intento.id_empleado === 3 &&
      e.intento.metodo === "codigo_cara"
  );
  assert.throws(
    () => matchFaceCode(base(0), datos, "h-nadie"),
    (e) => e.code === "CODE_NOT_FOUND" && e.intento.motivo === "codigo_invalido" && e.intento.id_empleado === null
  );
  assert.throws(
    () => matchFaceCode(base(0), datos, "h-sin"),
    (e) => e.code === "FACE_NOT_REGISTERED" && e.intento.motivo === "sin_referencias" && e.intento.id_empleado === 4
  );
});

test("face.mjs: la app del empleado compara solo contra sus propias referencias (1 a 1), nunca contra la empresa", () => {
  const yo = { id: 7, nombre: "Yo", referencias: [{ pose: "frente", descriptor: base(3) }] };
  const datos = vigente([yo], { mode: "employee", employee: 7 });
  assert.equal(matchFace(parecido(3, 0.93), datos).employee.id, 7, "0.93 basta contra una sola persona");
  assert.throws(
    () => matchFace(base(40), datos),
    (e) => e.code === "FACE_NOT_MATCHED" && e.intento.id_empleado === 7 && e.intento.motivo === "sin_coincidencia"
  );
  // Aunque el archivo trajera a otra persona, solo cuenta la de la sesión.
  const conOtro = vigente([{ id: 8, nombre: "Otro", referencias: [{ pose: "frente", descriptor: base(40) }] }, yo], {
    mode: "employee",
    employee: 7,
  });
  assert.throws(() => matchFace(base(40), conOtro), { code: "FACE_NOT_MATCHED" });
});

test("intentos: como mucho 1 por candidato y motivo cada 30 s por dispositivo", () => {
  const a = { id_empleado: 1, motivo: "sin_coincidencia" };
  let r = debeReportar([], a, 1000);
  assert.equal(r.reportar, true);
  r = debeReportar(r.enviados, a, 20000);
  assert.equal(r.reportar, false, "mismo candidato y motivo antes de 30 s");
  assert.equal(debeReportar(r.enviados, { ...a, motivo: "ambiguo" }, 20000).reportar, true, "otro motivo sí");
  assert.equal(debeReportar(r.enviados, { ...a, id_empleado: 2 }, 20000).reportar, true, "otro candidato sí");
  assert.equal(debeReportar(r.enviados, a, 31001).reportar, true, "pasados 30 s sí");
  assert.equal(debeReportar([], { motivo: "codigo_requerido" }, 0).reportar, false, "solo motivos del contrato");
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
