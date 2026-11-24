// Guía en vivo, calidad de la toma y «Probar rostro»: reglas puras de src/lib/rostro/*.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import { brilloPromedio, cajaEnRecuadro, carasDeFaceApi, deFrente, GUIA_INICIAL, guiaRostro, MENSAJES, OVALO_CELULAR, OVALO_FICHA } from "../src/lib/rostro/guia.mjs";
import { consistenciaLecturas, porcentaje, promediarLecturas, TOMA_INCOMPLETA, TOMA_MALA } from "../src/lib/rostro/lecturas.mjs";
import { compararRostro, descriptorGuardado, textoComparacion, UMBRAL } from "../src/lib/rostro/comparar.mjs";
import { UMBRAL as UMBRAL_RELOJ } from "../src/lib/reloj/recientes.mjs";
import { estadoRostro, fechaCorta } from "../src/lib/rostro/estadoRostro.mjs";

// Video 640×480 visto en un recuadro de 3:4 (360×480) del celular, con object-cover.
const video = { width: 640, height: 480 };
const recuadro = { width: 360, height: 480 };
// Puntos de la cara: ojos y nariz donde se pide (68 puntos; solo importan 30 y 36–47).
function puntos({ ojoIzq = [280, 200], ojoDer = [360, 200], nariz = [320, 240] } = {}) {
  const p = Array.from({ length: 68 }, () => ({ x: 320, y: 260 }));
  for (let i = 36; i < 42; i++) p[i] = { x: ojoIzq[0], y: ojoIzq[1] };
  for (let i = 42; i < 48; i++) p[i] = { x: ojoDer[0], y: ojoDer[1] };
  p[30] = { x: nariz[0], y: nariz[1] };
  return p;
}
const cara = (box, landmarks = puntos()) => ({ box, landmarks });
const centrada = cara({ x: 240, y: 160, width: 160, height: 170 }); // centro (320, 245): al centro del recuadro
const g = (caras, extra = {}) => guiaRostro({ caras, video, recuadro, ovalo: OVALO_CELULAR, brillo: 120, ...extra });

test("cover: la caja del video se escala y recorta centrada como en pantalla", () => {
  const c = cajaEnRecuadro({ x: 240, y: 160, width: 160, height: 170 }, video, recuadro);
  // escala = max(360/640, 480/480) = 1; se recortan 140 px por lado en horizontal.
  assert.deepEqual(c, { x: 100, y: 160, width: 160, height: 170 });
});

test("guía: sin rostro, varias caras, poca luz", () => {
  assert.equal(g([]).texto, "No se detecta rostro");
  assert.equal(g([]).nivel, "error");
  assert.equal(g([]).listo, false);
  assert.equal(g([centrada, centrada]).texto, MENSAJES.varias);
  assert.equal(g([centrada], { brillo: 30 }).texto, "Más luz", "oscuro aunque se vea la cara");
  assert.equal(g([], { brillo: 60 }).texto, "Más luz", "sin cara y con poca luz: pide luz");
  assert.equal(g([centrada], { brillo: null }).listo, true, "si no se puede medir el brillo no estorba");
});

test("guía: fuera del óvalo, lejos, demasiado cerca, de lado", () => {
  assert.equal(g([cara({ x: 420, y: 40, width: 160, height: 170 })]).texto, "Coloca tu rostro dentro del óvalo");
  assert.equal(g([cara({ x: 290, y: 205, width: 60, height: 65 })]).texto, "Acércate un poco");
  assert.equal(g([cara({ x: 150, y: 70, width: 340, height: 350 })]).texto, "Aléjate un poco");
  assert.equal(g([cara(centrada.box, puntos({ nariz: [290, 240] }))]).texto, "Mira de frente", "volteado");
  assert.equal(g([cara(centrada.box, puntos({ ojoDer: [360, 240] }))]).texto, "Mira de frente", "cabeza inclinada");
  assert.equal(g([cara(centrada.box, null)]).listo, true, "sin puntos no se exige el giro");
});

test("guía: bien colocado → «Rostro detectado ✅» y habilita el botón", () => {
  const r = g([centrada]);
  assert.deepEqual([r.nivel, r.texto, r.listo], ["ok", "Rostro detectado ✅", true]);
  assert.equal(GUIA_INICIAL.texto, "Coloca tu rostro dentro del óvalo");
  assert.equal(GUIA_INICIAL.listo, false);
  // Recuadro cuadrado de la ficha con su propio óvalo.
  const f = guiaRostro({ caras: [cara({ x: 240, y: 150, width: 160, height: 180 })], video, recuadro: { width: 300, height: 300 }, ovalo: OVALO_FICHA, brillo: 120 });
  assert.equal(f.listo, true, JSON.stringify(f));
  // Video aún sin tamaño: no se habilita.
  assert.equal(guiaRostro({ caras: [centrada], video: { width: 0, height: 0 }, recuadro, brillo: 120 }).listo, false);
});

test("deFrente, brillo y adaptación de face-api", () => {
  assert.equal(deFrente(puntos()), true);
  assert.equal(deFrente(null), null);
  assert.ok(Math.abs(brilloPromedio(new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255])) - 127.5) < 0.01);
  assert.equal(brilloPromedio(null), null);
  const r = carasDeFaceApi([{ detection: { box: { x: 1, y: 2, width: 3, height: 4 } }, landmarks: { positions: [{ x: 5, y: 6 }] } }, { detection: {} }]);
  assert.deepEqual(r, [{ box: { x: 1, y: 2, width: 3, height: 4 }, landmarks: [{ x: 5, y: 6 }] }]);
});

const base = Array.from({ length: 128 }, (_, i) => Math.sin(i + 1) * 0.1);
const cerca = (k) => base.map((v, i) => v + Math.cos(i * k) * 0.0005);
const otra = Array.from({ length: 128 }, (_, i) => Math.cos(i * 3 + 2) * 0.1);

test("calidad de la toma: lecturas consistentes → calidad; inconsistentes → «La toma no salió bien…»", () => {
  const r = promediarLecturas([cerca(1), cerca(2), cerca(3)]);
  assert.equal(r.ok, true);
  assert.ok(r.calidad > 0.99 && r.calidad <= 1, `calidad ${r.calidad}`);
  assert.equal(r.calidad, consistenciaLecturas([cerca(1), cerca(2), cerca(3)]));
  const mala = promediarLecturas([cerca(1), cerca(2), otra]);
  assert.equal(mala.ok, false);
  assert.equal(mala.error, "La toma no salió bien, intenta de nuevo con más luz.");
  assert.equal(mala.error, TOMA_MALA);
  assert.ok(mala.calidad < UMBRAL);
  assert.equal(promediarLecturas([cerca(1)]).error, TOMA_INCOMPLETA);
  assert.equal(promediarLecturas([cerca(1)], 1).ok, true, "una lectura (Probar rostro) no exige consistencia");
  assert.equal(porcentaje(0.9999), 99);
  assert.equal(porcentaje(0.9496), 94, "hacia abajo: nunca se muestra 95 % si no llegó");
  assert.equal(porcentaje(0.95), 95);
});

test("comparar: misma métrica y umbral que el checador (coseno ≥ 0.95)", () => {
  assert.equal(UMBRAL, 0.95);
  assert.equal(UMBRAL, UMBRAL_RELOJ);
  const si = compararRostro(cerca(1), base);
  assert.equal(si.coincide, true);
  assert.equal(textoComparacion(si, "Ana Torres Ruiz"), `✅ Coincide: es Ana Torres Ruiz (similitud ${si.porcentaje} %)`);
  const no = compararRostro(otra, base);
  assert.equal(no.coincide, false);
  assert.match(textoComparacion(no, "Ana"), /^❌ No coincide con el rostro registrado .*Vuelve a registrarlo$/);
  // En el límite: 0.95 coincide; apenas menos, no.
  const unit = Array.from({ length: 128 }, (_, i) => (i === 0 ? 1 : 0));
  const angulo = (c) => Array.from({ length: 128 }, (_, i) => (i === 0 ? c : i === 1 ? Math.sqrt(1 - c * c) : 0));
  assert.equal(compararRostro(angulo(0.9501), unit).coincide, true);
  assert.equal(compararRostro(angulo(0.9499), unit).coincide, false);
  assert.equal(compararRostro(cerca(1), null).motivo, "sin_rostro");
  assert.equal(compararRostro(cerca(1), JSON.stringify(base)).coincide, true, "descriptor guardado como texto JSON");
  assert.equal(compararRostro([1, 2], base).motivo, "sin_lectura");
  assert.equal(descriptorGuardado("no-json"), null);
  assert.equal(descriptorGuardado([...base.slice(0, 127), NaN]), null);
});

test("estado del rostro: origen y fecha del último cambio", () => {
  const hoy = new Date("2026-11-23T20:00:00Z");
  const e = estadoRostro([{ origen: "celular", creado_en: "2026-11-23 23:15:00" }, { origen: "rh", creado_en: "2026-01-01 10:00:00" }], true, hoy);
  assert.equal(e.titulo, "Registrado desde el celular");
  assert.equal(e.detalle, "Registrado desde el celular el 23 nov, 5:15 p.m.");
  assert.equal(estadoRostro([{ origen: "empleado", creado_en: "2026-11-20 15:00:00" }], true, hoy).detalle, "Registrado desde la app el 20 nov, 9:00 a.m.");
  assert.equal(estadoRostro([{ origen: "rh", creado_en: "2025-12-05 18:00:00" }], true, hoy).detalle, "Registrado desde la ficha el 5 dic 2025, 12:00 p.m.");
  assert.deepEqual(estadoRostro([], true, hoy), { registrado: true, titulo: "Rostro registrado", detalle: "" });
  assert.equal(estadoRostro(undefined, false, hoy).registrado, false);
  assert.equal(fechaCorta("basura"), "");
});
