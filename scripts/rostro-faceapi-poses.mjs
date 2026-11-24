// face-api simulado para los verify del rostro con poses (registro guiado y reloj). Se inyecta con
// ctx.addInitScript({ content: faceapiPoses }). window.__escena = { persona, pose }:
//   persona: "ana" | "caro" | "luis" | "parecida" (como Ana, ~89 %) | "otra" | "ninguna"
//   pose: "frente" | "arriba" | "abajo" | "izquierda" | "derecha" (o { giro, arriba } en grados).
// Los 68 puntos salen de la cara sintética 3D (rostro-cara-sintetica.mjs); la huella depende de la persona y, un poco, de
// la pose (cada pose registrada es distinta pero de la misma persona: coseno ~0.99 contra «frente»).
import { caraSinteticaFuente } from "./rostro-cara-sintetica.mjs";

export const HUELLA_FUENTE = `function huellaDe(persona, pose, n) {
  const semillas = { ana: 1.3, caro: 2.7, luis: 3.9, otra: 5.1, parecida: 1.3 };
  const k = semillas[persona] ?? 1.3;
  const po = ["frente", "arriba", "abajo", "izquierda", "derecha"].indexOf(pose);
  return Array.from({ length: 128 }, (_, i) => Math.sin(i * k + 1) * 0.1 + (po > 0 ? Math.cos(i * (po + 3)) * 0.012 : 0)
    + (persona === "parecida" ? Math.cos(i * 7.7 + 0.5) * 0.05 : 0) + (n ? Math.cos(i * n) * 0.0004 : 0));
}`;

export const faceapiPoses = `(() => {
  ${caraSinteticaFuente}
  ${HUELLA_FUENTE}
  const POSES = { frente: {}, arriba: { arriba: 15 }, abajo: { arriba: -15 }, izquierda: { giro: 15 }, derecha: { giro: -15 } };
  window.__escena = window.__escena ?? { persona: "ana", pose: "frente" };
  let n = 0;
  const caras = (input) => {
    const e = window.__escena;
    if (!e || e.persona === "ninguna") return [];
    const vw = input?.videoWidth || input?.width || 640, vh = input?.videoHeight || input?.height || 480;
    const w = Math.round(Math.min(vw, vh) * 0.42), h = Math.round(w * 1.15);
    const x = (vw - w) / 2, y = (vh - h) / 2;
    const pose = typeof e.pose === "object" ? e.pose : POSES[e.pose] ?? {};
    const positions = puntosCara({ ...pose, x: vw / 2, y: y + h * 0.35, escala: w / 16 });
    return [{ detection: { box: { x, y, width: w, height: h }, score: 0.9 }, landmarks: { positions } }];
  };
  const conHuella = (c) => ({ ...c, descriptor: Float32Array.from(huellaDe(window.__escena.persona, typeof window.__escena.pose === "string" ? window.__escena.pose : "frente", ++n)) });
  const tarea = (valor) => ({ then: (ok, mal) => Promise.resolve().then(valor).then(ok, mal) });
  window.faceapi = {
    nets: { tinyFaceDetector: { params: {} }, faceLandmark68Net: { params: {}, detectLandmarks: async () => null }, faceRecognitionNet: { params: {}, computeFaceDescriptor: async () => null } },
    TinyFaceDetectorOptions: class {},
    detectSingleFace: (input) => ({
      ...tarea(() => caras(input)[0] ?? undefined),
      withFaceLandmarks: () => ({ withFaceDescriptor: async () => { const [c] = caras(input); return c ? conHuella(c) : undefined; } }),
    }),
    detectAllFaces: (input) => ({
      withFaceLandmarks: () => ({ ...tarea(() => caras(input)), withFaceDescriptors: async () => caras(input).map(conHuella) }),
    }),
  };
})();`;

// Recorre la captura guiada: pone en la escena la pose que pide la pantalla hasta tomar la última foto («derecha»).
// Termina cuando la pose en curso deja de ser la última (se guardó, se reinició tras un error o ya no hay captura).
export async function completarPoses(pg, { persona = "ana", espera = 30000 } = {}) {
  const fin = Date.now() + espera;
  let ultima = null;
  while (Date.now() < fin) {
    const pose = await pg.evaluate(() => {
      const c = [...document.querySelectorAll("[data-captura-guiada]")].find((el) => el.offsetParent);
      return c?.dataset.fase === "guiado" ? c.querySelector('[data-estado="actual"]')?.dataset.pose ?? null : null;
    });
    if (ultima === "derecha" && pose !== "derecha") return;
    if (pose) {
      ultima = pose;
      await pg.evaluate(
        ([p, quien]) => {
          window.__escena = { persona: quien, pose: p };
        },
        [pose, persona]
      );
    }
    await new Promise((r) => setTimeout(r, 60));
  }
  throw new Error("La captura guiada no terminó");
}
