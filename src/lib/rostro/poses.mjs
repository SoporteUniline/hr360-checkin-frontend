// Registro guiado del rostro en 5 poses (contrato «rostro con varias fotos», 24/11/2026).
// Regla pura, sin navegador: con los 68 puntos de face-api estima hacia dónde mira la cara y decide, cuadro por cuadro,
// qué decirle a la persona y cuándo tomar la foto sola (en la pose, quieta y con buena luz). La usan la ficha de RH,
// Mi espacio → Mi rostro y la página del celular (QR), por medio de useCapturaRostro y CapturaGuiada.
//
// Cómo se mide (coordenadas del cuadro ORIGINAL de la cámara, sin espejo; x crece a la derecha, y hacia abajo):
// - giro: posición de la punta de la nariz (30) entre los centros de los ojos (36–41 y 42–47) y entre las orillas de la
//   mandíbula (0 y 16); 0 = de frente. Positivo = la nariz se va a la derecha del cuadro = la persona gira a SU izquierda
//   (en el cuadro sin espejo, la izquierda de la persona queda a la derecha). Unos 15° ≈ 0.11; 30° ≈ 0.25.
// - vertical: dónde cae la nariz entre la línea de los ojos y la boca (48–67). Al subir la cara baja el número y al bajarla
//   sube; cambia ~0.065 con 15°. Como cada cara es distinta, arriba/abajo se miden contra la foto de «frente» de esa persona.
// Ángulos ligeros: si gira de más, se le pide que gire menos (la huella de una cara muy de lado sale pobre).
import { coseno } from "../reloj/recientes.mjs";
import { promediarLecturas } from "./lecturas.mjs";

export const POSES_GUIADAS = Object.freeze([
  Object.freeze({ pose: "frente", texto: "Mira al frente", flecha: null, corto: "Frente" }),
  Object.freeze({ pose: "arriba", texto: "Sube un poco la cara", flecha: "arriba", corto: "Arriba" }),
  Object.freeze({ pose: "abajo", texto: "Baja un poco la cara", flecha: "abajo", corto: "Abajo" }),
  Object.freeze({ pose: "izquierda", texto: "Gira un poco a tu izquierda", flecha: "izquierda", corto: "Izquierda" }),
  Object.freeze({ pose: "derecha", texto: "Gira un poco a tu derecha", flecha: "derecha", corto: "Derecha" }),
]);

export const MENOS = Object.freeze({
  arriba: "Sube un poco menos la cara",
  abajo: "Baja un poco menos la cara",
  izquierda: "Gira un poco menos",
  derecha: "Gira un poco menos",
});

export const LIMITES_POSE = Object.freeze({
  frenteGiro: 0.06, // |giro| máximo para «Mira al frente» (~8°)
  giroMin: 0.07, // ~9°
  giroMax: 0.26, // ~31°: más que esto, «Gira un poco menos»
  verticalMin: 0.04, // ~9° respecto a su foto de frente
  verticalMax: 0.15, // ~30°
  giroCruzado: 0.12, // al subir o bajar la cara, no girarla de lado
  estables: 3, // cuadros seguidos en la pose antes de tomar la foto
  mismaPersona: 0.85, // cada pose contra «frente» (igual que el servidor)
  minimoPoses: 3, // el servidor acepta 3 a 5, con «frente» obligatoria
  saltarTrasMs: 12000, // si una pose no sale en 12 s, se puede saltar (hasta llegar al mínimo)
});

export const QUIETO = "Quédate así…";
export const OTRA_PERSONA = "Las fotos no parecen de la misma persona. Toca «Reintentar» y que solo aparezca tu cara.";

const promedio = (puntos) => ({
  x: puntos.reduce((s, p) => s + p.x, 0) / puntos.length,
  y: puntos.reduce((s, p) => s + p.y, 0) / puntos.length,
});
const finito = (p) => p && Number.isFinite(p.x) && Number.isFinite(p.y);

// 68 puntos ({x, y}) → { giro, vertical } o null si no alcanzan.
export function estimarPose(posiciones) {
  if (!Array.isArray(posiciones) || posiciones.length < 68 || !posiciones.every(finito)) return null;
  const ojoA = promedio(posiciones.slice(36, 42));
  const ojoB = promedio(posiciones.slice(42, 48));
  const boca = promedio(posiciones.slice(48, 68));
  const nariz = posiciones[30];
  const entreOjos = ojoB.x - ojoA.x;
  if (Math.abs(entreOjos) < 1) return null;
  const porOjos = (nariz.x - ojoA.x) / entreOjos - 0.5;
  const mandibula = posiciones[16].x - posiciones[0].x;
  const porMandibula = Math.abs(mandibula) >= 1 ? (nariz.x - posiciones[0].x) / mandibula - 0.5 : porOjos;
  const ojosY = (ojoA.y + ojoB.y) / 2;
  const alto = boca.y - ojosY;
  if (Math.abs(alto) < 1) return null;
  return { giro: (porOjos + porMandibula) / 2, vertical: (nariz.y - ojosY) / alto };
}

/**
 * ¿Está en la pose pedida? base: la pose medida en su foto de «frente» (null mientras se toma esa).
 * → { ok, clave: 'ok' | 'falta' | 'demasiado' | 'cruzado', texto }
 */
export function evaluarPose(objetivo, pose, base = null, limites = LIMITES_POSE) {
  const paso = POSES_GUIADAS.find((p) => p.pose === objetivo);
  if (!paso || !pose) return { ok: false, clave: "falta", texto: paso?.texto ?? "Mira a la cámara" };
  const dGiro = pose.giro - (base?.giro ?? 0);
  if (objetivo === "frente") {
    return Math.abs(pose.giro) <= limites.frenteGiro
      ? { ok: true, clave: "ok", texto: QUIETO }
      : { ok: false, clave: "falta", texto: paso.texto };
  }
  if (objetivo === "izquierda" || objetivo === "derecha") {
    const hacia = objetivo === "izquierda" ? dGiro : -dGiro;
    if (hacia > limites.giroMax) return { ok: false, clave: "demasiado", texto: MENOS[objetivo] };
    if (hacia < limites.giroMin) return { ok: false, clave: "falta", texto: paso.texto };
    return { ok: true, clave: "ok", texto: QUIETO };
  }
  const dVertical = pose.vertical - (base?.vertical ?? pose.vertical);
  const hacia = objetivo === "arriba" ? -dVertical : dVertical;
  if (Math.abs(dGiro) > limites.giroCruzado) return { ok: false, clave: "cruzado", texto: `Mira al frente y ${paso.texto.toLowerCase()}` };
  if (hacia > limites.verticalMax) return { ok: false, clave: "demasiado", texto: MENOS[objetivo] };
  if (hacia < limites.verticalMin) return { ok: false, clave: "falta", texto: paso.texto };
  return { ok: true, clave: "ok", texto: QUIETO };
}

export function estadoInicial(ahora = 0) {
  return { indice: 0, base: null, buenas: [], posesBuenas: [], capturas: [], saltadas: [], inicioPaso: ahora, error: null };
}

export const pasoActual = (estado) => POSES_GUIADAS[estado.indice] ?? null;
export const terminado = (estado) => estado.indice >= POSES_GUIADAS.length && !estado.error;

const avanzar = (estado, cambios, ahora) => ({
  ...estado,
  ...cambios,
  indice: estado.indice + 1,
  buenas: [],
  posesBuenas: [],
  inicioPaso: ahora,
});

/**
 * Un cuadro de la cámara. lectura: { guia: { listo, texto, nivel } (guiaRostro), posiciones: 68 puntos, descriptor }.
 * → { estado, mensaje: { texto, nivel }, capturada: { pose, descriptor } | null }
 */
export function procesarCuadro(estado, lectura, ahora = 0, limites = LIMITES_POSE) {
  const paso = pasoActual(estado);
  if (!paso || estado.error)
    return { estado, mensaje: { texto: estado.error ?? "Listo", nivel: estado.error ? "error" : "ok" }, capturada: null };
  const reinicio = { ...estado, buenas: [], posesBuenas: [] };
  if (!lectura?.guia?.listo)
    return {
      estado: reinicio,
      mensaje: { texto: lectura?.guia?.texto ?? paso.texto, nivel: lectura?.guia?.nivel ?? "info" },
      capturada: null,
    };
  const pose = estimarPose(lectura.posiciones);
  const juicio = evaluarPose(paso.pose, pose, estado.base, limites);
  if (!juicio.ok)
    return {
      estado: reinicio,
      mensaje: { texto: juicio.texto, nivel: juicio.clave === "demasiado" || juicio.clave === "cruzado" ? "aviso" : "info" },
      capturada: null,
    };
  const descriptor = lectura.descriptor ? Array.from(lectura.descriptor) : null;
  if (!descriptor || descriptor.length !== 128) return { estado: reinicio, mensaje: { texto: paso.texto, nivel: "info" }, capturada: null };
  const buenas = [...estado.buenas, descriptor];
  const posesBuenas = [...estado.posesBuenas, pose];
  if (buenas.length < limites.estables)
    return { estado: { ...estado, buenas, posesBuenas }, mensaje: { texto: QUIETO, nivel: "ok" }, capturada: null };
  // Quieta: los últimos cuadros se parecen entre sí. Si no, se sigue esperando con los más recientes.
  const r = promediarLecturas(buenas.slice(-limites.estables), limites.estables);
  if (!r.ok)
    return {
      estado: { ...estado, buenas: buenas.slice(1), posesBuenas: posesBuenas.slice(1) },
      mensaje: { texto: "Quédate quieto…", nivel: "info" },
      capturada: null,
    };
  const frente = estado.capturas.find((c) => c.pose === "frente");
  if (frente && coseno(r.descriptor, frente.descriptor) < limites.mismaPersona) {
    return { estado: { ...reinicio, error: OTRA_PERSONA }, mensaje: { texto: OTRA_PERSONA, nivel: "error" }, capturada: null };
  }
  const capturada = { pose: paso.pose, descriptor: r.descriptor };
  const base = paso.pose === "frente" ? promedioPose(posesBuenas.slice(-limites.estables)) : estado.base;
  const siguiente = avanzar(estado, { base, capturas: [...estado.capturas, capturada] }, ahora);
  const proximo = pasoActual(siguiente);
  return {
    estado: siguiente,
    mensaje: { texto: proximo ? proximo.texto : "¡Listo! Ya tenemos tus fotos", nivel: proximo ? "info" : "ok" },
    capturada,
  };
}

function promedioPose(poses) {
  return { giro: poses.reduce((s, p) => s + p.giro, 0) / poses.length, vertical: poses.reduce((s, p) => s + p.vertical, 0) / poses.length };
}

// «Saltar este paso»: solo poses que no son «frente», después de un rato sin lograrla y sin bajar del mínimo.
export function puedeSaltar(estado, ahora = 0, limites = LIMITES_POSE) {
  const paso = pasoActual(estado);
  if (!paso || paso.pose === "frente" || estado.error) return false;
  const maximoSaltos = POSES_GUIADAS.length - limites.minimoPoses;
  return estado.saltadas.length < maximoSaltos && ahora - estado.inicioPaso >= limites.saltarTrasMs;
}

export function saltar(estado, ahora = 0, limites = LIMITES_POSE) {
  if (!puedeSaltar(estado, ahora, limites)) return estado;
  return avanzar(estado, { saltadas: [...estado.saltadas, pasoActual(estado).pose] }, ahora);
}

// Lo que se manda al servidor: [{ pose, descriptor }], 3 a 5 poses con «frente».
export function descriptoresDe(estado) {
  return estado.capturas.map(({ pose, descriptor }) => ({ pose, descriptor: descriptor.map(Number) }));
}

// «2 de 5»: la pose en curso (1 a 5).
export const avance = (estado) => ({
  actual: Math.min(estado.indice + 1, POSES_GUIADAS.length),
  total: POSES_GUIADAS.length,
  hechas: estado.capturas.map((c) => c.pose),
  saltadas: estado.saltadas,
});
