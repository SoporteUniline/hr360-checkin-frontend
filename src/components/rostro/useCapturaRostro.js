"use client";

// Captura del rostro con la cámara frontal (22/11/2026, extraída el 05/12/2026 para reutilizarla): Mi espacio → Mi rostro
// y la página pública del celular (/rostro/[token], enlace QR de RH) usan la MISMA lógica: face-api del navegador
// (loadBrowserFaceApi, modelos de /models), 3 lecturas seguidas de una sola cara y promedio con promediarLecturas
// (si dos lecturas no se parecen, no se guarda). Solo se obtiene la huella numérica (128 números), nunca la foto.
// (23/11/2026, pedido del dueño) Guía EN VIVO mientras la cámara está abierta (src/lib/rostro/guia.mjs): «No se detecta
// rostro», «Acércate un poco», «Más luz», «Mira de frente», «Rostro detectado ✅»… `listo` dice cuándo habilitar el
// botón; solo cuentan las lecturas con la cara bien colocada, y al terminar se informa la calidad («✅ Rostro correcto»).
// También lo usa «Probar rostro» de la ficha (lecturas: 1, como el checador; no guarda nada).
import { useCallback, useEffect, useRef, useState } from "react";
import { loadBrowserFaceApi, opcionesRapidas } from "@/lib/faceapi-browser";
import { promediarLecturas } from "@/lib/rostro/lecturas.mjs";
import { brilloPromedio, carasDeFaceApi, GUIA_INICIAL, guiaRostro, OVALO_CELULAR } from "@/lib/rostro/guia.mjs";

export const TOMA_BUENA = "✅ Rostro correcto";
const INTERVALO_GUIA_MS = 300;

export function errorDeCamara(e) {
  if (["NotAllowedError", "PermissionDeniedError"].includes(e?.name)) return "Permite el acceso a la cámara para registrar tu rostro (en los ajustes del teléfono o del navegador).";
  if (e?.name === "NotFoundError") return "No encontramos una cámara en este dispositivo.";
  return "No pudimos preparar la cámara. Intenta de nuevo.";
}

// Brillo de un cuadro reducido del video (32×24). null si el navegador no deja leerlo.
function medirBrillo(video, lienzoRef) {
  try {
    const c = lienzoRef.current ?? (lienzoRef.current = document.createElement("canvas"));
    c.width = 32; c.height = 24;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, 32, 24);
    return brilloPromedio(ctx.getImageData(0, 0, 32, 24).data);
  } catch {
    return null;
  }
}

// fase: inicio · preparando · camara · leyendo · guardando · listo
export function useCapturaRostro({ ovalo = OVALO_CELULAR, lecturas: LECTURAS = 3 } = {}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const vivoRef = useRef(true);
  const lienzoRef = useRef(null);
  const enCursoRef = useRef(null); // detección de la guía en curso (no se cruza con las lecturas)
  const [fase, setFase] = useState("inicio");
  const [guia, setGuia] = useState("");
  const [enVivo, setEnVivo] = useState(GUIA_INICIAL);
  const [calidad, setCalidad] = useState(null);
  const [aviso, setAviso] = useState(null);

  const apagar = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);
  useEffect(() => {
    vivoRef.current = true;
    return () => { vivoRef.current = false; apagar(); };
  }, [apagar]);

  // Lo que se ve en un cuadro: cajas y puntos de la cara → guía.
  const evaluar = useCallback((resultados) => {
    const v = videoRef.current;
    if (!v) return GUIA_INICIAL;
    return guiaRostro({
      caras: carasDeFaceApi(resultados),
      video: { width: v.videoWidth, height: v.videoHeight },
      recuadro: { width: v.clientWidth, height: v.clientHeight },
      ovalo,
      brillo: medirBrillo(v, lienzoRef),
    });
  }, [ovalo]);

  // Guía en vivo: mientras la cámara está abierta y nadie está leyendo, un cuadro cada 300 ms (sin traslapes).
  useEffect(() => {
    if (fase !== "camara") return undefined;
    let activo = true;
    let t;
    const ciclo = async () => {
      const api = window.faceapi;
      const v = videoRef.current;
      if (!activo || !api || !v) return;
      const tarea = (async () => {
        try {
          const caras = await api.detectAllFaces(v, opcionesRapidas(api)).withFaceLandmarks();
          if (activo) setEnVivo(evaluar(caras));
        } catch {
          // Un cuadro fallido no detiene la guía.
        }
      })();
      enCursoRef.current = tarea;
      await tarea;
      if (activo) t = setTimeout(ciclo, INTERVALO_GUIA_MS);
    };
    setEnVivo(GUIA_INICIAL);
    ciclo();
    return () => { activo = false; clearTimeout(t); };
  }, [fase, evaluar]);

  const encender = useCallback(async () => {
    setAviso(null);
    setCalidad(null);
    setFase("preparando");
    setGuia("Preparando la cámara…");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error(), { name: "NotFoundError" });
      const [stream] = await Promise.all([
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } }, audio: false }),
        loadBrowserFaceApi(),
      ]);
      if (!vivoRef.current) { stream.getTracks().forEach((t) => t.stop()); return; }
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setFase("camara");
      setGuia("");
    } catch (e) {
      apagar();
      setFase("inicio");
      setAviso({ ok: false, texto: errorDeCamara(e) });
    }
  }, [apagar]);

  const cancelar = useCallback(() => { apagar(); setFase("inicio"); }, [apagar]);

  // Toma LECTURAS lecturas de una sola cara bien colocada y las promedia. → { ok, descriptor, calidad } o { ok:false, error }.
  // Si falla vuelve a la cámara con el aviso. Con volverACamara también regresa a la cámara al salir bien.
  const leer = useCallback(async ({ volverACamara = false } = {}) => {
    const api = window.faceapi;
    if (!api || !videoRef.current) return { ok: false, error: "La cámara no está lista." };
    setFase("leyendo");
    setAviso(null);
    setCalidad(null);
    await enCursoRef.current?.catch(() => {});
    const tomadas = [];
    for (let intento = 0; intento < 20 && tomadas.length < LECTURAS && vivoRef.current; intento += 1) {
      setGuia(LECTURAS > 1 ? `Quédate quieto… ${tomadas.length + 1} de ${LECTURAS}` : "Quédate quieto…");
      const caras = await api.detectAllFaces(videoRef.current, opcionesRapidas(api)).withFaceLandmarks().withFaceDescriptors();
      const g = evaluar(caras);
      if (g.listo && caras.length === 1) tomadas.push(Array.from(caras[0].descriptor));
      else setGuia(g.texto);
      await new Promise((r) => setTimeout(r, 250));
    }
    const r = promediarLecturas(tomadas, LECTURAS);
    if (!r.ok || volverACamara) { setFase("camara"); setGuia(""); }
    if (!r.ok) setAviso({ ok: false, texto: r.error });
    return r;
  }, [evaluar, LECTURAS]);

  // Lee el rostro y llama guardar(descriptor). Si guardar lanza, se vuelve a la cámara con textoError(e).
  const registrar = useCallback(async (guardar, textoError) => {
    const r = await leer();
    if (!r.ok) return false;
    setCalidad(r.calidad);
    setGuia(`${TOMA_BUENA}. Guardando…`);
    setFase("guardando");
    try {
      await guardar(r.descriptor);
      apagar();
      setFase("listo");
      return true;
    } catch (e) {
      setFase("camara");
      setGuia("");
      setAviso({ ok: false, texto: textoError(e) });
      return false;
    }
  }, [apagar, leer]);

  const enCamara = fase === "camara";
  return {
    videoRef, fase, aviso, encender, cancelar, registrar, leer, apagar, calidad,
    // Con la cámara abierta manda la guía en vivo; leyendo o guardando, el paso en curso.
    guia: enCamara ? enVivo.texto : guia,
    nivel: enCamara ? enVivo.nivel : fase === "guardando" ? "ok" : "info",
    listo: enCamara && enVivo.listo,
    camaraVisible: ["camara", "leyendo", "guardando"].includes(fase),
  };
}
