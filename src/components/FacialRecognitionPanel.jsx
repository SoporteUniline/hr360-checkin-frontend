import React, { useRef, useEffect, useState } from "react";
import { Camera, Power, RotateCcw } from "lucide-react";
import { enqueueSnackbar } from "notistack";
import axiosInstance from "@/lib/axios";
import { Button } from "./ui/button";
import { loadBrowserFaceApi, opcionesRapidas } from "@/lib/faceapi-browser";
import { yaRegistrado, recordarChecada } from "@/lib/reloj/recientes.mjs";

// Modo diagnóstico opcional: si está apagado, estas llamadas no hacen nada.
const diagApi = () => globalThis.__adamiaDiag;
const diag = (nombre, datos) => diagApi()?.marca(nombre, datos);

const FacialRecognitionPanel = ({
  isOpen,
  onOpen,
  onClose,
  onSuccess,
  idEmpresa,
  handleOpenFacialModal,
  submitMovement,
  // Reloj de la empresa: la cámara se queda encendida para el siguiente empleado.
  continuo = false,
  // Celular: la cámara llena el alto que le da el contenedor (maqueta aprobada 19/11/2026).
  pantallaCompleta = false,
  // Mientras el reloj pregunta «¿Registrar otra vez?» no se reconoce a nadie más (la tarjeta quedaría tapada).
  pausado = false,
}) => {
  // (19/11/2026) El análisis corre en un intervalo creado al encender la cámara: leer `continuo`
  // directo dejaba el valor de ese momento y el interruptor no surtía efecto hasta reiniciarla.
  const continuoRef = useRef(continuo);
  continuoRef.current = continuo;
  const pausadoRef = useRef(pausado);
  pausadoRef.current = pausado;
  const [ubicacionGPS, setUbicacionGPS] = useState(null);
  const [cameraFacing, setCameraFacing] = useState("user");
  const [error, setError] = useState("");
  const [faceApiLoaded, setFaceApiLoaded] = useState(false);
  const [modelError, setModelError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [resultadoChecada, setResultadoChecada] = useState(null);
  const [avisoRepetido, setAvisoRepetidoEstado] = useState("");
  const avisoRepetidoRef = useRef("");
  const setAvisoRepetido = (v) => { avisoRepetidoRef.current = v; setAvisoRepetidoEstado(v); };
  const streamRef = useRef(null);
  const [faceDetected, setFaceDetected] = useState(false);

  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const sessionRef = useRef(0);
  const locationRef = useRef(null);

  const isProcessingRef = useRef(false);
  const isDetectingRef = useRef(false);
  const lastCheckTimeRef = useRef(0);
  // (19/11/2026) Checar debe ser inmediato: se analiza en cuanto termina el cuadro anterior.
  const MIN_INTERVAL = 60;
  const NO_MATCH_INTERVAL = 800; // sin coincidencia: no saturar el reconocimiento / servidor
  // (19/11/2026) Al entrar al cuadro o al abrir la cámara, el primer cuadro suele salir borroso o
  // a contraluz y no alcanza 0.95: se reintenta rápido y en silencio; el aviso «no se encontró
  // coincidencia» solo aparece si sigue sin reconocer después de este tiempo.
  const GRACIA_SIN_COINCIDENCIA_MS = 1500;
  const NO_MATCH_RAPIDO = 200;
  const sinCoincidenciaDesdeRef = useRef(null);
  const PAUSA_TRAS_CHECAR = 2000; // modo reloj: el nombre se ve 2 s y sigue con el siguiente
  const RESPALDO_SENSIBLE_MS = 2000; // si no ve cara en 2 s, alterna con un umbral más sensible (poca luz)
  // (19/11/2026) Hay que acercarse al reloj: si la cara ocupa menos de esta fracción del alto del
  // cuadro, se pide «Acércate» y no se intenta reconocer (cara chica = huella pobre).
  const CARA_MINIMA = 0.22;
  const [acercate, setAcercate] = useState(false);
  const retryIntervalRef = useRef(MIN_INTERVAL);
  const recientesRef = useRef([]); // checadas de los últimos 60 s (evita doble checada)
  const CAMERA_START_TIMEOUT = 15000;
  const ERROR_INTERVAL = 3000;
  const GPS_MAX_AGE = 30000;

  const shutdownCamera = () => {
    sessionRef.current += 1;
    locationRef.current = null;
    setCameraReady(false);
    try {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
          track.enabled = false;
        });
        streamRef.current = null;
      }

      if (videoRef.current) {
        const vid = videoRef.current;
        vid.onloadeddata = null;
        vid.onplaying = null;
        vid.pause();
        vid.srcObject = null;
        vid.removeAttribute("src");
        vid.load();
      }

      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx)
          ctx.clearRect(
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height,
          );
      }

      isProcessingRef.current = false;
      setFaceDetected(false);
      setIsLoading(false);
    } catch (err) {
      console.error("❌ Error apagando cámara:", err);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      shutdownCamera();
    }
  }, [isOpen]);

  const resetState = () => {
    setError("");
    setIsLoading(false);
    setCountdown(0);
    setResultadoChecada(null);
    setFaceDetected(false);
    isProcessingRef.current = false;
  };

  const cleanupAll = () => {
    shutdownCamera();
    resetState();
  };

  useEffect(() => {
    if (!isOpen || faceApiLoaded) return;
    let active = true;
    setModelError("");
    const timeout = setTimeout(() => {
      setModelError("El reconocimiento está tardando. Puedes usar código o QR.");
    }, 20000);
    loadBrowserFaceApi()
      .then(() => {
        diag("modelos_listos_panel");
        if (!active) return;
        setModelError("");
        setFaceApiLoaded(true);
      })
      .catch(() => {
        if (active) setModelError("No se pudo iniciar el reconocimiento. Apaga y vuelve a encender la cámara, o usa código o QR.");
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [isOpen, faceApiLoaded]);

  // Request GPS only after the server identifies an employee who requires it.
  const getLocation = () => {
    const cached = locationRef.current;
    if (cached && (cached.position
      ? Date.now() - cached.position.timestamp <= GPS_MAX_AGE
      : !cached.failedAt || Date.now() - cached.failedAt < ERROR_INTERVAL)) {
      return cached.promise;
    }
    const entry = {};
    locationRef.current = entry;
    diag("gps_inicio");
    entry.promise = new Promise((resolve) => {
      const fail = (geoError) => {
        entry.failedAt = Date.now();
        diag("gps_fin", { ok: false, codigo: geoError?.code ?? null });
        resolve({ error: true });
      };
      if (!navigator.geolocation) return fail();
      try {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            diag("gps_fin", { ok: true, precision_m: Math.round(position.coords.accuracy) });
            entry.position = position; setUbicacionGPS(position); resolve({ position });
          },
          fail,
          { enableHighAccuracy: true, timeout: 10000, maximumAge: GPS_MAX_AGE },
        );
      } catch {
        fail();
      }
    });
    return entry.promise;
  };

  useEffect(() => {
    if (!isOpen) return;
    const session = sessionRef.current;
    setError("");
    lastCheckTimeRef.current = 0;
    retryIntervalRef.current = MIN_INTERVAL;

    const startupTimeout = setTimeout(() => {
      if (session !== sessionRef.current) return;
      shutdownCamera();
      setError("La cámara no inició. Apágala y vuelve a encenderla, o usa código o QR.");
    }, CAMERA_START_TIMEOUT);

    const startCamera = async () => {
      diagApi()?.iniciar?.("panel_facial");
      diag("camara_solicitada", { lado: cameraFacing });
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: cameraFacing,
          },
        });

        if (videoRef.current && isOpen && session === sessionRef.current) {
          const video = videoRef.current;
          streamRef.current = mediaStream;
          const markReady = () => {
            if (session !== sessionRef.current || video.onplaying !== markReady || video.readyState < 2 || !video.videoWidth) return;
            clearTimeout(startupTimeout);
            video.onloadeddata = null;
            video.onplaying = null;
            diag("camara_lista");
            diagApi()?.contexto?.({ camara: `${video.videoWidth}x${video.videoHeight}` });
            setCameraReady(true);
          };
          video.onloadeddata = markReady;
          video.onplaying = markReady;
          video.srcObject = mediaStream;
          video.play?.()?.then(markReady, () => {});
        } else mediaStream.getTracks().forEach((t) => t.stop());
      } catch (err) {
        if (session !== sessionRef.current) return;
        clearTimeout(startupTimeout);
        shutdownCamera();
        console.log(err);
        diag("camara_error", { nombre: err?.name ?? null });
        setError("No se pudo acceder a la cámara");
        enqueueSnackbar("No se pudo acceder a la cámara", {
          variant: "error",
          autoHideDuration: 3000,
        });
      }
    };

    startCamera();
    return () => {
      clearTimeout(startupTimeout);
      shutdownCamera();
    };
  }, [isOpen, cameraFacing]);

  // Camera and model initialization run concurrently. Recognition starts
  // once both the video and models are ready, without reopening the camera.
  useEffect(() => {
    if (!isOpen || !faceApiLoaded || !cameraReady) return;
    startFaceDetection();
    return () => {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    };
  }, [isOpen, faceApiLoaded, cameraReady, cameraFacing]);

  useEffect(() => () => cleanupAll(), []);

  const startFaceDetection = () => {
    if (!videoRef.current || !canvasRef.current || !isOpen) return;
    if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
    const session = sessionRef.current;
    diag("deteccion_lista");
    let analizados = 0;
    let rostroVisto = false;
    let sinRostroDesde = Date.now();
    let usarRespaldo = false;
    const detect = async () => {
      if (session !== sessionRef.current || pausadoRef.current || isDetectingRef.current || isProcessingRef.current || globalThis.document?.hidden) return;
      if (Date.now() - lastCheckTimeRef.current < retryIntervalRef.current) return;
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;

      isDetectingRef.current = true;
      try {
        if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
        if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;
        canvas.getContext("2d").drawImage(video, 0, 0);
        // One frame and one detector pass for both presence and recognition.
        const d = diagApi();
        const t0 = d ? d.ahora() : 0;
        // Detector rápido; si lleva 2 s sin ver cara, alterna con un umbral más sensible (poca luz).
        usarRespaldo = Date.now() - sinRostroDesde > RESPALDO_SENSIBLE_MS ? !usarRespaldo : false;
        const detection = await window.faceapi
          .detectSingleFace(canvas, opcionesRapidas(window.faceapi, usarRespaldo))
          .withFaceLandmarks().withFaceDescriptor();
        if (d) {
          const ms = d.ahora() - t0;
          d.cuenta("analisis", ms);
          if (!detection) d.cuenta("analisis_sin_rostro", ms);
          analizados += 1;
          if (analizados === 1) d.marca("primer_analisis_fin", { ms: Math.round(ms) });
          if (detection && !rostroVisto) {
            rostroVisto = true;
            d.marca("primer_rostro", { cuadro: analizados, confianza: Math.round((detection.detection?.score ?? 0) * 100) / 100 });
          }
        }
        if (session !== sessionRef.current) return;
        setFaceDetected(!!detection);
        // Cara muy chica (lejos del reloj): pedir que se acerque, sin reconocer.
        const altoCara = detection?.detection?.box?.height;
        const lejos = Boolean(detection && altoCara && canvas.height && altoCara / canvas.height < CARA_MINIMA);
        setAcercate(lejos);
        if (lejos) {
          d?.cuenta("cara_lejos", 0);
          sinRostroDesde = Date.now();
          sinCoincidenciaDesdeRef.current = null;
          lastCheckTimeRef.current = Date.now();
          retryIntervalRef.current = MIN_INTERVAL;
          return;
        }
        if (detection) {
          sinRostroDesde = Date.now();
          d?.cuenta(usarRespaldo ? "detector_sensible" : "detector_rapido", 0);
          // La misma persona en los últimos 60 s: no se vuelve a checar.
          const repetida = yaRegistrado(recientesRef.current, detection.descriptor, Date.now());
          if (repetida) {
            setError("");
            setAvisoRepetido(`${repetida.nombre}: ya registrado hace ${repetida.hace} s`);
            lastCheckTimeRef.current = Date.now();
            retryIntervalRef.current = NO_MATCH_INTERVAL;
            return;
          }
          setAvisoRepetido("");
          isProcessingRef.current = true;
          await captureAndRecognize(detection, session);
        } else {
          lastCheckTimeRef.current = Date.now();
          retryIntervalRef.current = MIN_INTERVAL; // terminó la pausa / aviso: volver a analizar sin espera
          sinCoincidenciaDesdeRef.current = null;
          if (avisoRepetidoRef.current) setAvisoRepetido("");
        }
      } catch (err) {
        if (session === sessionRef.current) {
          retryIntervalRef.current = ERROR_INTERVAL;
          lastCheckTimeRef.current = Date.now();
          setError("Error al detectar el rostro. Intente de nuevo.");
        }
      } finally {
        isDetectingRef.current = false;
      }
    };
    detectionIntervalRef.current = setInterval(detect, 40);
    void detect();
  };

  const errorCriticalRef = useRef(false);

  const captureAndRecognize = async (detection, session) => {
    if (!videoRef.current || !canvasRef.current || !faceApiLoaded || !isOpen)
      return;

    if (errorCriticalRef.current) return;

    setIsLoading(true);
    retryIntervalRef.current = MIN_INTERVAL;

    try {
      const cachedPosition = locationRef.current?.position;
      const position = cachedPosition && Date.now() - cachedPosition.timestamp <= GPS_MAX_AGE
        ? cachedPosition : null;
      const descriptor = Array.from(detection.descriptor);
      const payload = {
        captured_at: new Date().toISOString(),
        descriptor_facial: descriptor,
        id_empresa: idEmpresa,
        latitud_actual: position?.coords.latitude ?? null,
        longitud_actual: position?.coords.longitude ?? null,
        precision_metros: position?.coords.accuracy ?? null,
        ubicacion_timestamp: position?.timestamp ?? null,
      };
      const submit = async (body) => {
        const d = diagApi();
        const t0 = d ? d.ahora() : 0;
        d?.marca("envio_inicio", { con_gps: body.latitud_actual != null, via: submitMovement ? "submitMovement" : "servidor" });
        try {
          const r = await (submitMovement ? submitMovement(body) : axiosInstance.post("/checador/reloj/registrar-facial", body));
          d?.marca("envio_fin", { estado: r?.status ?? null });
          return r;
        } catch (e) {
          d?.marca("envio_fin", { estado: e.response?.status ?? null, error: e.response?.data?.error ?? e.message ?? null, codigo: e.response?.data?.code ?? null });
          throw e;
        } finally {
          d?.cuenta("envio", d.ahora() - t0);
        }
      };
      let response;
      try {
        response = await submit(payload);
      } catch (err) {
        if (session !== sessionRef.current) return;
        // This response is returned before any attendance record is written.
        // All other failures must keep their original handling.
        if (err.response?.data?.code !== 'GPS_REQUIRED' && (err.response?.status !== 400 ||
          err.response?.data?.error !== "Faltan coordenadas de ubicaci\u00f3n")) throw err;
        const { position: requiredPosition } = await getLocation();
        if (session !== sessionRef.current) return;
        if (!requiredPosition) throw err;
        response = await submit({
          ...payload,
          captured_at: new Date().toISOString(),
          latitud_actual: requiredPosition.coords.latitude,
          longitud_actual: requiredPosition.coords.longitude,
          precision_metros: requiredPosition.coords.accuracy,
          ubicacion_timestamp: requiredPosition.timestamp,
        });
      }
      const { data } = response;

      if (session !== sessionRef.current) return;
      sinCoincidenciaDesdeRef.current = null;
      diag("checada_exitosa");
      diagApi()?.terminar?.("checada registrada");
      setError("");
      if (!data?.requiereDecision) setResultadoChecada(data?.repetida ? "repetida" : "registrada");
      if (!data?.requiereDecision) {
        recientesRef.current = recordarChecada(recientesRef.current, detection.descriptor,
          data?.empleado ? `${data.empleado.nombre ?? ""} ${data.empleado.apellido_paterno ?? ""}`.trim() : "", Date.now());
      }
      onSuccess(data);
      if (continuoRef.current && !data?.requiereDecision) {
        // Reloj de la empresa: la cámara sigue encendida; pausa breve y listo para el siguiente.
        retryIntervalRef.current = PAUSA_TRAS_CHECAR;
        setTimeout(() => { if (session === sessionRef.current) setResultadoChecada(null); }, PAUSA_TRAS_CHECAR);
        return;
      }
      shutdownCamera();
      handleClose();

    } catch (err) {
      if (session !== sessionRef.current) return;
      const message =
        err.response?.data?.error || err.message || "Error en reconocimiento facial";
      if (["GPS_INACCURATE", "GPS_REFRESH_REQUIRED", "OUTSIDE_AREA", "GPS_OUTSIDE_AREA"].includes(err.response?.data?.code)) locationRef.current = null;
      const sinCoincidencia = /coincidencia facial/i.test(message);
      if (sinCoincidencia) {
        sinCoincidenciaDesdeRef.current ??= Date.now();
        if (Date.now() - sinCoincidenciaDesdeRef.current < GRACIA_SIN_COINCIDENCIA_MS) {
          retryIntervalRef.current = NO_MATCH_RAPIDO;
          setError("");
          return;
        }
      }
      retryIntervalRef.current = sinCoincidencia ? NO_MATCH_INTERVAL : ERROR_INTERVAL;

      // Keep one stable message by the camera while automatic retries continue.
      setError(message === "Faltan coordenadas de ubicaci\u00f3n"
        ? "Este empleado requiere ubicaci\u00f3n. Permite el acceso y activa el GPS."
        : message);
    } finally {
      if (session === sessionRef.current) {
        lastCheckTimeRef.current = Date.now();
        setIsLoading(false);
        isProcessingRef.current = false;
      }
    }
  };

  const handleClose = () => {
    cleanupAll();
    errorCriticalRef.current = false;
    isProcessingRef.current = false;
    onClose();
  };

  const getStatusMessage = () => {
    if (error) return { text: error, color: "bg-red-600" };
    if (modelError) return { text: modelError, color: "bg-red-600" };
    if (!faceApiLoaded)
      return { text: "Preparando reconocimiento facial...", color: "bg-gray-700" };
    if (isLoading)
      return { text: "Procesando reconocimiento...", color: "bg-gray-700" };
    if (!cameraReady)
      return { text: "Iniciando cámara...", color: "bg-gray-700" };
    if (resultadoChecada === "repetida") return { text: "Ya estaba registrada · confirma abajo", color: "bg-amber-600" };
    if (resultadoChecada === "registrada")
      return {
        text: "¡Listo! Esperando siguiente empleado...",
        color: "bg-green-600",
      };
    if (avisoRepetido) return { text: avisoRepetido, color: "bg-blue-600" };
    if (countdown > 0)
      return { text: "Preparando captura...", color: "bg-gray-700" };
    if (acercate)
      return { text: "Acércate al reloj", color: "bg-amber-600" };
    if (faceDetected)
      return { text: "Rostro detectado", color: "bg-green-600" };

    return { text: pantallaCompleta ? "Mira a la cámara" : "Esperando detección de rostro...", color: "bg-gray-600" };
  };

  return (
    <div
      className={`p-0 bg-transparent rounded-none shadow-none md:p-4 md:bg-white md:rounded-2xl md:shadow-xl ${pantallaCompleta ? "h-full bg-slate-950" : "space-y-4"}`}
    >
      {!isOpen ? (
        <div className={`flex flex-col items-center justify-center px-4 ${pantallaCompleta ? "h-full bg-slate-50" : "py-16 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50"}`}>
          <div className="bg-blue-100 rounded-full p-6 mb-4">
            <Camera className="h-12 w-12 text-blue-600" />
          </div>

          <h3 className="mb-2 text-xl font-semibold text-slate-900">
            Cámara apagada
          </h3>

          <p className="mb-6 max-w-md text-center text-slate-600">
            Para iniciar el reconocimiento facial presiona el botón de encender
            cámara y colócate frente a la misma para registrar entrada o salida
          </p>

          <Button
            onClick={() => {
              cleanupAll();
              onOpen();
            }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
          >
            Encender cámara
          </Button>
        </div>
      ) : (
        <>
          <div className="hidden md:flex justify-between items-center px-4 bg-white z-10">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <Camera className="w-5 h-5" />
              Reconocimiento Facial
            </h2>
            <div className="flex gap-2 mt-2">
              <Button
                onClick={() =>
                  setCameraFacing((prev) =>
                    prev === "user" ? "environment" : "user",
                  )
                }
                variant="outline"
                className="border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Cambiar cámara
              </Button>

              <Button
                onClick={() => {
                  handleOpenFacialModal();
                }}
                className="bg-red-600 hover:bg-red-700 text-white shadow-sm"
              >
                Apagar cámara
              </Button>
            </div>
          </div>

          {ubicacionGPS && <p className={pantallaCompleta ? "absolute left-3 right-3 top-3 z-10 rounded-lg bg-slate-900/70 px-3 py-1.5 text-xs text-white" : "px-3 text-sm text-slate-600"} role="status">Última lectura: precisión ±{Math.ceil(ubicacionGPS.coords.accuracy)} m. La ubicación aproximada puede impedir el checado.</p>}
          <div className={pantallaCompleta ? "relative h-full" : "overflow-y-auto"}>
            <>
              <div className={pantallaCompleta ? "relative h-full" : "relative mb-4"}>
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className={`w-full object-cover border-0 md:border-4 rounded-none md:rounded-lg ${pantallaCompleta ? "h-full" : ""}`}
                    // (19/11/2026) Cámara frontal en espejo, como cualquier selfie: si giras a la izquierda,
                    // la imagen también. Solo cambia lo que se ve; el reconocimiento usa el cuadro original.
                    style={cameraFacing === "user" ? { transform: "scaleX(-1)" } : undefined}
                  />
                  {pantallaCompleta && (
                    <div aria-hidden="true" className={`pointer-events-none absolute left-1/2 top-[44%] h-[52%] max-h-80 aspect-[3/4] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-[3px] shadow-[0_0_0_9999px_rgba(2,6,23,0.35)] transition-colors ${acercate ? "border-amber-400" : resultadoChecada === "registrada" || faceDetected ? "border-green-400" : resultadoChecada ? "border-amber-400" : "border-white/85"}`} />
                  )}
                  <div className={`md:hidden absolute right-3 flex gap-2 ${pantallaCompleta ? (ubicacionGPS ? "top-14" : "top-3") : "top-4"}`}>
                    {pantallaCompleta ? (<>
                      <button type="button" aria-label="Cambiar de cámara" onClick={() => setCameraFacing((prev) => (prev === "user" ? "environment" : "user"))}
                        className="grid size-10 place-items-center rounded-full bg-slate-900/55 text-white"><RotateCcw className="size-5" /></button>
                      <button type="button" aria-label="Apagar cámara" onClick={handleOpenFacialModal}
                        className="grid size-10 place-items-center rounded-full bg-slate-900/55 text-white"><Power className="size-5" /></button>
                    </>) : (<>
                    <Button
                      onClick={() =>
                        setCameraFacing((prev) =>
                          prev === "user" ? "environment" : "user",
                        )
                      }
                      className="px-3 py-2 bg-[#2563EB] text-white rounded-lg opacity-90 hover:bg-[#1d4ed8] shadow-sm"
                    >
                      <RotateCcw />
                      Cambiar
                    </Button>

                    <Button
                      onClick={handleOpenFacialModal}
                      className="px-3 py-2 bg-red-600 text-white rounded-lg opacity-90 hover:bg-red-700 shadow-sm"
                    >
                      <Power />
                      Apagar
                    </Button>
                    </>)}
                  </div>

                  {(() => {
                    const { text, color } = getStatusMessage();
                    return (
                      <div
                        className={`absolute left-1/2 -translate-x-1/2 px-4 py-2 text-white text-sm font-medium shadow-lg ${color} bg-opacity-90 text-center ${pantallaCompleta ? "bottom-4 max-w-[calc(100%-2rem)] rounded-full" : "bottom-3 rounded-lg"}`}
                      >
                        {text}
                      </div>
                    );
                  })()}
                </>

                <canvas ref={canvasRef} style={{ display: "none" }} />

                {countdown > 0 && (
                  <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                    <div className="text-6xl font-bold text-white animate-pulse">
                      {countdown}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3 hidden md:block">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-blue-700 text-sm font-medium">
                    Instrucciones:
                  </p>
                  <ul className="text-blue-600 text-sm mt-1 space-y-1">
                    <li>• Colóquese frente a la cámara</li>
                    <li>• El recuadro se pondrá verde al detectar su rostro</li>
                    <li>• Se iniciará automáticamente la captura</li>
                    <li>• Manténgase quieto durante la toma</li>
                  </ul>
                </div>
              </div>
            </>
          </div>
        </>
      )}
    </div>
  );
};

export default FacialRecognitionPanel;
