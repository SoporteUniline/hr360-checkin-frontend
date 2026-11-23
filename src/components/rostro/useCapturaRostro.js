"use client";

// Captura del rostro con la cámara frontal (22/11/2026, extraída el 05/12/2026 para reutilizarla): Mi espacio → Mi rostro
// y la página pública del celular (/rostro/[token], enlace QR de RH) usan la MISMA lógica: face-api del navegador
// (loadBrowserFaceApi, modelos de /models), 3 lecturas seguidas de una sola cara y promedio con promediarLecturas
// (si dos lecturas no se parecen, no se guarda). Solo se obtiene la huella numérica (128 números), nunca la foto.
import { useCallback, useEffect, useRef, useState } from "react";
import { loadBrowserFaceApi, opcionesRapidas } from "@/lib/faceapi-browser";
import { promediarLecturas } from "@/lib/rostro/lecturas.mjs";

const LECTURAS = 3;
export const GUIA_LISTA = "Mira de frente, con buena luz, y pulsa «Registrar mi rostro».";

export function errorDeCamara(e) {
  if (["NotAllowedError", "PermissionDeniedError"].includes(e?.name)) return "Permite el acceso a la cámara para registrar tu rostro (en los ajustes del teléfono o del navegador).";
  if (e?.name === "NotFoundError") return "No encontramos una cámara en este dispositivo.";
  return "No pudimos preparar la cámara. Intenta de nuevo.";
}

// fase: inicio · preparando · camara · leyendo · guardando · listo
export function useCapturaRostro() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const vivoRef = useRef(true);
  const [fase, setFase] = useState("inicio");
  const [guia, setGuia] = useState("");
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

  const encender = useCallback(async () => {
    setAviso(null);
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
      setGuia(GUIA_LISTA);
    } catch (e) {
      apagar();
      setFase("inicio");
      setAviso({ ok: false, texto: errorDeCamara(e) });
    }
  }, [apagar]);

  const cancelar = useCallback(() => { apagar(); setFase("inicio"); }, [apagar]);

  // Lee el rostro y llama guardar(descriptor). Si guardar lanza, se vuelve a la cámara con textoError(e).
  const registrar = useCallback(async (guardar, textoError) => {
    const api = window.faceapi;
    if (!api || !videoRef.current) return false;
    setFase("leyendo");
    setAviso(null);
    const lecturas = [];
    for (let intento = 0; intento < 15 && lecturas.length < LECTURAS && vivoRef.current; intento += 1) {
      setGuia(`Quédate quieto… ${lecturas.length + 1} de ${LECTURAS}`);
      const caras = await api.detectAllFaces(videoRef.current, opcionesRapidas(api)).withFaceLandmarks().withFaceDescriptors();
      if (caras.length === 1) lecturas.push(Array.from(caras[0].descriptor));
      else setGuia(caras.length > 1 ? "Hay más de una cara: que solo aparezca la tuya." : "No vemos tu cara: acércate y mira de frente.");
      await new Promise((r) => setTimeout(r, 250));
    }
    const r = promediarLecturas(lecturas, LECTURAS);
    if (!r.ok) {
      setFase("camara");
      setGuia(GUIA_LISTA);
      setAviso({ ok: false, texto: r.error });
      return false;
    }
    setFase("guardando");
    try {
      await guardar(r.descriptor);
      apagar();
      setFase("listo");
      return true;
    } catch (e) {
      setFase("camara");
      setGuia(GUIA_LISTA);
      setAviso({ ok: false, texto: textoError(e) });
      return false;
    }
  }, [apagar]);

  return { videoRef, fase, guia, aviso, encender, cancelar, registrar, apagar, camaraVisible: ["camara", "leyendo", "guardando"].includes(fase) };
}
