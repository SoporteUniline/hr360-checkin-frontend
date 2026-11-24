// Registro guiado del rostro en 5 poses (src/lib/rostro/poses.mjs): cálculo de la pose con los 68 puntos y cuándo se
// toma cada foto. Caras sintéticas: scripts/rostro-cara-sintetica.mjs (modelo 3D girado y proyectado).
import test from "node:test";
import assert from "node:assert/strict";
import { puntosCara } from "./rostro-cara-sintetica.mjs";
import {
  POSES_GUIADAS,
  LIMITES_POSE,
  MENOS,
  OTRA_PERSONA,
  QUIETO,
  estimarPose,
  evaluarPose,
  estadoInicial,
  procesarCuadro,
  puedeSaltar,
  saltar,
  descriptoresDe,
  avance,
  terminado,
} from "../src/lib/rostro/poses.mjs";
import { guiaRostro } from "../src/lib/rostro/guia.mjs";

const huella = (semilla, ruido = 0) =>
  Array.from({ length: 128 }, (_, i) => Math.sin(i * semilla + 1) * 0.1 + (ruido ? Math.cos(i * ruido) * 0.0005 : 0));
const ok = { listo: true, texto: "Rostro detectado ✅", nivel: "ok" };
const POSE = { frente: {}, arriba: { arriba: 15 }, abajo: { arriba: -15 }, izquierda: { giro: 15 }, derecha: { giro: -15 } };
const cuadro = (pose, n = 1, semilla = 1.3) => ({ guia: ok, posiciones: puntosCara(POSE[pose] ?? pose), descriptor: huella(semilla, n) });

test("los cinco mensajes y su orden son los acordados", () => {
  assert.deepEqual(
    POSES_GUIADAS.map((p) => p.pose),
    ["frente", "arriba", "abajo", "izquierda", "derecha"]
  );
  assert.deepEqual(
    POSES_GUIADAS.map((p) => p.texto),
    ["Mira al frente", "Sube un poco la cara", "Baja un poco la cara", "Gira un poco a tu izquierda", "Gira un poco a tu derecha"]
  );
});

test("la pose sale de la nariz respecto a ojos, mandíbula y boca", () => {
  const frente = estimarPose(puntosCara());
  assert.ok(Math.abs(frente.giro) < 0.01);
  assert.ok(estimarPose(puntosCara({ giro: 15 })).giro > 0.08, "a su izquierda: positivo");
  assert.ok(estimarPose(puntosCara({ giro: -15 })).giro < -0.08, "a su derecha: negativo");
  assert.ok(estimarPose(puntosCara({ arriba: 15 })).vertical < frente.vertical - 0.04, "sube la cara: la nariz se acerca a los ojos");
  assert.ok(estimarPose(puntosCara({ arriba: -15 })).vertical > frente.vertical + 0.04, "baja la cara: se acerca a la boca");
  // Sin espejo ni posición: moverse de lugar o acercarse no cambia la pose.
  const lejos = estimarPose(puntosCara({ giro: 15, x: 100, y: 80, escala: 6 }));
  assert.ok(Math.abs(lejos.giro - estimarPose(puntosCara({ giro: 15 })).giro) < 1e-9);
  assert.equal(estimarPose(null), null);
  assert.equal(estimarPose(Array.from({ length: 10 }, () => ({ x: 1, y: 1 }))), null);
});

test("ángulos ligeros: pide la pose, acepta un giro leve y pide menos si se pasa", () => {
  const base = estimarPose(puntosCara());
  assert.equal(evaluarPose("frente", estimarPose(puntosCara({ giro: 3 })), null).ok, true);
  assert.equal(evaluarPose("frente", estimarPose(puntosCara({ giro: 20 })), null).texto, "Mira al frente");
  for (const [pose, leve, deMas] of [
    ["izquierda", { giro: 15 }, { giro: 45 }],
    ["derecha", { giro: -15 }, { giro: -45 }],
    ["arriba", { arriba: 15 }, { arriba: 40 }],
    ["abajo", { arriba: -15 }, { arriba: -40 }],
  ]) {
    assert.equal(evaluarPose(pose, estimarPose(puntosCara()), base).clave, "falta", `${pose}: de frente todavía no`);
    assert.equal(evaluarPose(pose, estimarPose(puntosCara(leve)), base).ok, true, `${pose}: leve`);
    const pasado = evaluarPose(pose, estimarPose(puntosCara(deMas)), base);
    assert.equal(pasado.clave, "demasiado", `${pose}: de más`);
    assert.equal(pasado.texto, MENOS[pose]);
  }
  assert.equal(
    evaluarPose("izquierda", estimarPose(puntosCara({ giro: -15 })), base).texto,
    "Gira un poco a tu izquierda",
    "lado contrario: repite la indicación"
  );
  assert.equal(evaluarPose("arriba", estimarPose(puntosCara({ arriba: 15, giro: 30 })), base).clave, "cruzado");
});

test("toma la foto sola tras 3 cuadros quietos en la pose y pasa a la siguiente: 5 de 5 con frente primero", () => {
  let e = estadoInicial(0);
  const vistos = [];
  for (const pose of ["frente", "arriba", "abajo", "izquierda", "derecha"]) {
    for (let n = 1; n <= LIMITES_POSE.estables; n += 1) {
      const r = procesarCuadro(e, cuadro(pose, n), 100);
      e = r.estado;
      if (n < LIMITES_POSE.estables) {
        assert.equal(r.capturada, null);
        assert.equal(r.mensaje.texto, QUIETO);
      } else {
        assert.equal(r.capturada.pose, pose);
        vistos.push(r.mensaje.texto);
      }
    }
  }
  assert.ok(terminado(e));
  assert.deepEqual(vistos, [
    "Sube un poco la cara",
    "Baja un poco la cara",
    "Gira un poco a tu izquierda",
    "Gira un poco a tu derecha",
    "¡Listo! Ya tenemos tus fotos",
  ]);
  const d = descriptoresDe(e);
  assert.deepEqual(
    d.map((x) => x.pose),
    ["frente", "arriba", "abajo", "izquierda", "derecha"]
  );
  assert.ok(d.every((x) => x.descriptor.length === 128 && x.descriptor.every(Number.isFinite)));
});

test("no captura con mala colocación, poca luz, fuera de pose o moviéndose; el avance dice «2 de 5»", () => {
  let e = estadoInicial(0);
  for (let n = 1; n <= 3; n += 1) e = procesarCuadro(e, cuadro("frente", n), 0).estado;
  assert.deepEqual(avance(e), { actual: 2, total: 5, hechas: ["frente"], saltadas: [] });
  // Dos cuadros buenos y uno con poca luz: vuelve a contar.
  e = procesarCuadro(e, cuadro("arriba", 1), 0).estado;
  e = procesarCuadro(e, cuadro("arriba", 2), 0).estado;
  const luz = procesarCuadro(e, { ...cuadro("arriba", 3), guia: { listo: false, texto: "Más luz", nivel: "aviso" } }, 0);
  assert.equal(luz.mensaje.texto, "Más luz");
  assert.equal(luz.estado.buenas.length, 0);
  // De frente todavía: pide subir la cara.
  assert.equal(procesarCuadro(luz.estado, cuadro("frente"), 0).mensaje.texto, "Sube un poco la cara");
  // Moviéndose (huellas distintas cuadro a cuadro): espera sin tomar la foto.
  let m = luz.estado;
  let r;
  for (let n = 1; n <= 3; n += 1) {
    r = procesarCuadro(m, { ...cuadro("arriba"), descriptor: huella(n * 2.1) }, 0);
    m = r.estado;
  }
  assert.equal(r.capturada, null);
  assert.equal(r.mensaje.texto, "Quédate quieto…");
  // La guía real (guiaRostro) no exige «de frente» en la captura guiada.
  const video = { width: 640, height: 480 },
    recuadro = { width: 300, height: 300 };
  const caja = { x: 220, y: 140, width: 200, height: 220 };
  const lado = [{ box: caja, landmarks: puntosCara({ giro: 35 }) }];
  assert.equal(guiaRostro({ caras: lado, video, recuadro, brillo: 120 }).clave, "frente");
  assert.equal(guiaRostro({ caras: lado, video, recuadro, brillo: 120, exigirFrente: false }).listo, true);
});

test("si otra persona se pone en una pose, no se guarda y pide reintentar", () => {
  let e = estadoInicial(0);
  for (let n = 1; n <= 3; n += 1) e = procesarCuadro(e, cuadro("frente", n, 1.3), 0).estado;
  let r;
  for (let n = 1; n <= 3; n += 1) {
    r = procesarCuadro(e, cuadro("arriba", n, 7.7), 0);
    e = r.estado;
  }
  assert.equal(r.capturada, null);
  assert.equal(r.mensaje.texto, OTRA_PERSONA);
  assert.equal(e.error, OTRA_PERSONA);
  assert.equal(terminado(e), false);
});

test("saltar: nunca «frente», solo tras 12 s y sin bajar de 3 poses", () => {
  let e = estadoInicial(0);
  assert.equal(puedeSaltar(e, 60000), false, "frente no se salta");
  for (let n = 1; n <= 3; n += 1) e = procesarCuadro(e, cuadro("frente", n), 1000).estado;
  assert.equal(puedeSaltar(e, 5000), false, "aún no pasan 12 s");
  e = saltar(e, 14000);
  e = saltar({ ...e, inicioPaso: 0 }, 14000);
  assert.deepEqual(e.saltadas, ["arriba", "abajo"]);
  assert.equal(puedeSaltar({ ...e, inicioPaso: 0 }, 60000), false, "con 2 saltadas ya no (mínimo 3 fotos)");
  for (const pose of ["izquierda", "derecha"]) for (let n = 1; n <= 3; n += 1) e = procesarCuadro(e, cuadro(pose, n), 20000).estado;
  assert.ok(terminado(e));
  assert.deepEqual(
    descriptoresDe(e).map((d) => d.pose),
    ["frente", "izquierda", "derecha"]
  );
});
