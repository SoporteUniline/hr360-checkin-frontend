"use client";

// Captura del rostro con la cámara frontal: Mi espacio → Mi rostro
// y la página pública del celular (/rostro/[token], enlace QR de RH) usan la MISMA lógica: face-api del navegador
// (loadBrowserFaceApi, modelos de /models), 3 lecturas seguidas de una sola cara y promedio con promediarLecturas
// (si dos lecturas no se parecen, no se guarda). Solo se obtiene la huella numérica (128 números), nunca la foto.
// Guía EN VIVO mientras la cámara está abierta (src/lib/rostro/guia.mjs): «No se detecta
// rostro», «Acércate un poco», «Más luz», «Mira de frente», «Rostro detectado ✅»… `listo` dice cuándo habilitar el
// botón; solo cuentan las lecturas con la cara bien colocada, y al terminar se informa la calidad («✅ Rostro correcto»).
// También lo usa «Probar rostro» de la ficha (lecturas: 1, como el checador; no guarda nada).
// Registro GUIADO en 5 poses (registrarGuiado; regla pura en src/lib/rostro/poses.mjs): «Mira al frente», «Sube un poco la
// cara»… La foto de cada pose se toma sola cuando la persona está en la pose, quieta y con buena luz, con el MISMO detector
// rápido que usa el reloj al checar (opcionesRapidas), para que la huella registrada y la de la checada coincidan.
import { useCallback, useEffect, useRef, useState } from "react";
import { loadBrowserFaceApi, opcionesRapidas, retenerFaceApi } from "@/lib/faceapi-browser";
import { promediarLecturas } from "@/lib/rostro/lecturas.mjs";
import { brilloPromedio, carasDeFaceApi, GUIA_INICIAL, guiaRostro, OVALO_CELULAR } from "@/lib/rostro/guia.mjs";
import { avance, descriptoresDe, estadoInicial, pasoActual, procesarCuadro, puedeSaltar, saltar, terminado } from "@/lib/rostro/poses.mjs";

export const TOMA_BUENA = "✅ Rostro correcto";
const INTERVALO_GUIA_MS = 300;
const INTERVALO_GUIADO_MS = 120; // captura guiada: cuadros seguidos (la foto se toma tras 3 cuadros quietos en la pose)

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

// fase: inicio · preparando · camara · leyendo · guiado · guardando · listo
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
  // Captura guiada: { indice, actual, total, objetivo, flecha, texto, nivel, hechas, saltadas, puedeSaltar, error }
  const [paso, setPaso] = useState(null);
  const guiadoRef = useRef(null); // { estado, resolver, activo }

  const apagar = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);
  useEffect(() => {
    vivoRef.current = true;
    return () => { vivoRef.current = false; apagar(); };
  }, [apagar]);
  // (INC-007) Mientras la captura está abierta, la preparación del reconocimiento puede seguir.
  useEffect(() => retenerFaceApi(), []);

  // Lo que se ve en un cuadro: cajas y puntos de la cara → guía.
  const evaluar = useCallback((resultados, exigirFrente = true) => {
    const v = videoRef.current;
    if (!v) return GUIA_INICIAL;
    return guiaRostro({
      caras: carasDeFaceApi(resultados),
      video: { width: v.videoWidth, height: v.videoHeight },
      recuadro: { width: v.clientWidth, height: v.clientHeight },
      ovalo,
      brillo: medirBrillo(v, lienzoRef),
      exigirFrente,
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

  // Devuelve true si la cámara quedó lista.
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
      return true;
    } catch (e) {
      apagar();
      setFase("inicio");
      setAviso({ ok: false, texto: errorDeCamara(e) });
      return false;
    }
  }, [apagar]);

  const terminarGuiado = useCallback((resultado) => {
    const g = guiadoRef.current;
    guiadoRef.current = null;
    if (g) { g.activo = false; g.resolver(resultado); }
  }, []);
  const cancelar = useCallback(() => { terminarGuiado(null); setPaso(null); apagar(); setFase("inicio"); }, [apagar, terminarGuiado]);

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

  // ---- Captura guiada en 5 poses ----
  const publicarPaso = useCallback((estado, mensaje) => {
    const p = pasoActual(estado);
    const a = avance(estado);
    setPaso({ indice: estado.indice, actual: a.actual, total: a.total, hechas: a.hechas, saltadas: a.saltadas, objetivo: p?.pose ?? null,
      flecha: p?.flecha ?? null, instruccion: p?.texto ?? "", texto: mensaje?.texto ?? p?.texto ?? "", nivel: mensaje?.nivel ?? "info",
      puedeSaltar: puedeSaltar(estado, Date.now()), error: estado.error });
  }, []);

  // Recorre las poses hasta tener las fotos. → [{ pose, descriptor }] o null si se canceló.
  const guiar = useCallback((conservarAviso = false) => new Promise((resolver) => {
    const api = window.faceapi;
    if (!api || !videoRef.current) { resolver(null); return; }
    terminarGuiado(null);
    const g = { estado: estadoInicial(Date.now()), resolver, activo: true };
    guiadoRef.current = g;
    if (!conservarAviso) setAviso(null);
    setFase("guiado");
    publicarPaso(g.estado, null);
    const ciclo = async () => {
      if (!g.activo || !vivoRef.current) return;
      try {
        await enCursoRef.current?.catch(() => {});
        const caras = await api.detectAllFaces(videoRef.current, opcionesRapidas(api)).withFaceLandmarks().withFaceDescriptors();
        if (!g.activo) return;
        const guiaCuadro = evaluar(caras, false);
        const [cara] = caras.length === 1 ? carasDeFaceApi(caras) : [];
        const r = procesarCuadro(g.estado, { guia: guiaCuadro, posiciones: cara?.landmarks ?? null, descriptor: caras.length === 1 ? caras[0].descriptor : null }, Date.now());
        g.estado = r.estado;
        publicarPaso(g.estado, r.mensaje);
        if (terminado(g.estado)) { terminarGuiado(descriptoresDe(g.estado)); return; }
      } catch {
        // Un cuadro fallido no detiene la guía.
      }
      if (g.activo) setTimeout(ciclo, INTERVALO_GUIADO_MS);
    };
    ciclo();
  }), [evaluar, publicarPaso, terminarGuiado]);

  const reintentarGuiado = useCallback(() => {
    const g = guiadoRef.current;
    if (!g) return;
    g.estado = estadoInicial(Date.now());
    setAviso(null);
    publicarPaso(g.estado, null);
  }, [publicarPaso]);

  const saltarPose = useCallback(() => {
    const g = guiadoRef.current;
    if (!g) return;
    g.estado = saltar(g.estado, Date.now());
    publicarPaso(g.estado, null);
    if (terminado(g.estado)) terminarGuiado(descriptoresDe(g.estado));
  }, [publicarPaso, terminarGuiado]);

  // «Saltar este paso» aparece solo pasados unos segundos: se revisa cada segundo mientras se guía.
  useEffect(() => {
    if (fase !== "guiado") return undefined;
    const t = setInterval(() => { const g = guiadoRef.current; if (g) setPaso((p) => (p ? { ...p, puedeSaltar: puedeSaltar(g.estado, Date.now()) } : p)); }, 1000);
    return () => clearInterval(t);
  }, [fase]);

  // Toma las 5 poses y llama guardar(descriptores, frente). Si guardar lanza, vuelve a empezar la guía con textoError(e).
  const registrarGuiado = useCallback(async (guardar, textoError) => {
    for (let repetir = false; ; repetir = true) {
      const descriptores = await guiar(repetir);
      if (!descriptores) return false;
      setFase("guardando");
      setGuia(`${TOMA_BUENA}. Guardando…`);
      try {
        await guardar(descriptores, descriptores.find((d) => d.pose === "frente")?.descriptor ?? null);
        apagar();
        setPaso(null);
        setFase("listo");
        return true;
      } catch (e) {
        setAviso({ ok: false, texto: textoError(e) });
        // Con la cámara encendida se repiten las fotos y el aviso queda a la vista.
        if (!vivoRef.current || !streamRef.current) return false;
      }
    }
  }, [apagar, guiar]);

  const enCamara = fase === "camara";
  return {
    videoRef, fase, aviso, encender, cancelar, registrar, leer, apagar, calidad,
    paso, registrarGuiado, reintentarGuiado, saltarPose,
    // Con la cámara abierta manda la guía en vivo; leyendo o guardando, el paso en curso.
    guia: enCamara ? enVivo.texto : guia,
    nivel: enCamara ? enVivo.nivel : fase === "guardando" ? "ok" : "info",
    listo: enCamara && enVivo.listo,
    camaraVisible: ["camara", "leyendo", "guiado", "guardando"].includes(fase),
  };
}
