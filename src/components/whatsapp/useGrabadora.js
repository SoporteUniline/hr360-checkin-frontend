"use client";

// Grabadora de notas de voz con MediaRecorder (espejo de use-voice-recorder de Lumo): prefiere ogg/opus y si no webm/opus,
// cuenta el tiempo, cancela sin dejar el micrófono abierto y se detiene sola a los 5 min.
// `onTerminar(archivo, motivo)`: motivo «enviar» (la persona pulsó «Detener y enviar») o «maximo» (llegó a 5 min).
import { useCallback, useEffect, useRef, useState } from "react";
import { MENSAJE_SIN_GRABADORA, elegirMimeGrabacion, llegoAlMaximo, mensajeMicrofono, mimeBase, nombreGrabacion } from "@/lib/whatsapp/adjuntos.mjs";

export default function useGrabadora({ onTerminar, onError }) {
  const [grabando, setGrabando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const grabadora = useRef(null);
  const flujo = useRef(null);
  const reloj = useRef(null);
  const motivo = useRef("enviar");
  const callbacks = useRef({ onTerminar, onError });
  callbacks.current = { onTerminar, onError };

  const soltarMicro = () => {
    flujo.current?.getTracks?.().forEach((t) => t.stop());
    flujo.current = null;
  };
  const pararReloj = () => {
    if (reloj.current) clearInterval(reloj.current);
    reloj.current = null;
  };
  useEffect(() => () => { pararReloj(); soltarMicro(); }, []);

  const detener = useCallback((como = "enviar") => {
    const r = grabadora.current;
    if (!r) return;
    motivo.current = como;
    pararReloj();
    setGrabando(false);
    if (r.state !== "inactive") r.stop();
  }, []);

  const iniciar = useCallback(async () => {
    if (grabadora.current) return;
    const MR = typeof window !== "undefined" ? window.MediaRecorder : undefined;
    if (!MR || !navigator.mediaDevices?.getUserMedia) { callbacks.current.onError?.(MENSAJE_SIN_GRABADORA); return; }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      callbacks.current.onError?.(mensajeMicrofono(e));
      return;
    }
    const mime = elegirMimeGrabacion(MR.isTypeSupported?.bind(MR));
    let r;
    try {
      r = new MR(stream, mime ? { mimeType: mime } : undefined);
    } catch {
      stream.getTracks?.().forEach((t) => t.stop());
      callbacks.current.onError?.(MENSAJE_SIN_GRABADORA);
      return;
    }
    const partes = [];
    r.ondataavailable = (e) => { if (e.data?.size > 0) partes.push(e.data); };
    r.onstop = () => {
      soltarMicro();
      grabadora.current = null;
      if (motivo.current === "cancelar" || !partes.length) return;
      const tipo = mimeBase(r.mimeType || mime) || "audio/webm";
      const archivo = new File(partes, nombreGrabacion(tipo), { type: tipo });
      callbacks.current.onTerminar?.(archivo, motivo.current);
    };
    flujo.current = stream;
    grabadora.current = r;
    motivo.current = "enviar";
    r.start();
    const inicio = Date.now();
    setSegundos(0);
    setGrabando(true);
    reloj.current = setInterval(() => {
      const s = Math.floor((Date.now() - inicio) / 1000);
      setSegundos(s);
      if (llegoAlMaximo(s)) detener("maximo");
    }, 250);
  }, [detener]);

  return { grabando, segundos, iniciar, detener: () => detener("enviar"), cancelar: () => detener("cancelar") };
}
