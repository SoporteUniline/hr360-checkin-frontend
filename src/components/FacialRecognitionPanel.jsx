import React, { useRef, useEffect, useState } from "react";
import { Camera, Power, RotateCcw } from "lucide-react";
import { enqueueSnackbar } from "notistack";
import axiosInstance from "@/lib/axios";
import { Button } from "./ui/button";
import { loadBrowserFaceApi } from "@/lib/faceapi-browser";

const FacialRecognitionPanel = ({
  isOpen,
  onOpen,
  onClose,
  onSuccess,
  idEmpresa,
  handleOpenFacialModal,
  submitMovement,
}) => {
  const [ubicacionGPS, setUbicacionGPS] = useState(null);
  const [cameraFacing, setCameraFacing] = useState("user");
  const [error, setError] = useState("");
  const [faceApiLoaded, setFaceApiLoaded] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
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
  const retryIntervalRef = useRef(500);
  const MIN_INTERVAL = 500;
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
    setShowSuccessMessage(false);
    setFaceDetected(false);
    isProcessingRef.current = false;
  };

  const cleanupAll = () => {
    shutdownCamera();
    resetState();
  };

  useEffect(() => {
    let active = true;
    loadBrowserFaceApi()
      .then(() => active && setFaceApiLoaded(true))
      .catch(() => active && setError("No se pudieron cargar los modelos faciales. Recargue la p\u00e1gina."));
    return () => { active = false; };
  }, []);

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
    entry.promise = new Promise((resolve) => {
      const fail = () => {
        entry.failedAt = Date.now();
        resolve({ error: true });
      };
      if (!navigator.geolocation) return fail();
      try {
        navigator.geolocation.getCurrentPosition(
          (position) => { entry.position = position; setUbicacionGPS(position); resolve({ position }); },
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
    const startCamera = async () => {
      if (!isOpen) return;

      const session = sessionRef.current;
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: cameraFacing,
          },
        });

        if (videoRef.current && isOpen && session === sessionRef.current) {
          videoRef.current.srcObject = mediaStream;
          streamRef.current = mediaStream;
          videoRef.current.onloadeddata = () => {
            if (session === sessionRef.current) setCameraReady(true);
          };
        } else mediaStream.getTracks().forEach((t) => t.stop());
      } catch (err) {
        if (session !== sessionRef.current) return;
        console.log(err);
        setError("No se pudo acceder a la cámara");
        enqueueSnackbar("No se pudo acceder a la cámara", {
          variant: "error",
          autoHideDuration: 3000,
        });
      }
    };

    startCamera();
    return () => shutdownCamera();
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
    const detect = async () => {
      if (session !== sessionRef.current || isDetectingRef.current || isProcessingRef.current) return;
      if (Date.now() - lastCheckTimeRef.current < retryIntervalRef.current) return;
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video || video.readyState < 2) return;

      isDetectingRef.current = true;
      try {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d").drawImage(video, 0, 0);
        // One frame and one detector pass for both presence and recognition.
        const detection = await window.faceapi.detectSingleFace(canvas)
          .withFaceLandmarks().withFaceDescriptor();
        if (session !== sessionRef.current) return;
        setFaceDetected(!!detection);
        if (detection) {
          isProcessingRef.current = true;
          await captureAndRecognize(detection, session);
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
    detectionIntervalRef.current = setInterval(detect, 100);
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
      const submit = (body) => submitMovement ? submitMovement(body) : axiosInstance.post("/checador/reloj/registrar-facial", body);
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
      setError("");
      setShowSuccessMessage(true);
      onSuccess(data);
      shutdownCamera();
      handleClose();

    } catch (err) {
      if (session !== sessionRef.current) return;
      const message =
        err.response?.data?.error || err.message || "Error en reconocimiento facial";
      if (["GPS_INACCURATE", "GPS_REFRESH_REQUIRED", "OUTSIDE_AREA", "GPS_OUTSIDE_AREA"].includes(err.response?.data?.code)) locationRef.current = null;
      retryIntervalRef.current = message === "No se encontr\u00f3 coincidencia facial"
        ? MIN_INTERVAL : ERROR_INTERVAL;

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
    if (!faceApiLoaded)
      return { text: "Preparando reconocimiento facial...", color: "bg-gray-700" };
    if (isLoading)
      return { text: "Procesando reconocimiento...", color: "bg-gray-700" };
    if (showSuccessMessage)
      return {
        text: "¡Listo! Esperando siguiente empleado...",
        color: "bg-green-600",
      };
    if (countdown > 0)
      return { text: "Preparando captura...", color: "bg-gray-700" };
    if (faceDetected)
      return { text: "Rostro detectado", color: "bg-green-600" };

    return { text: "Esperando detección de rostro...", color: "bg-gray-600" };
  };

  return (
    <div
      className="
  p-0
  bg-transparent
  rounded-none
  shadow-none
  md:p-4
  md:bg-white
  md:rounded-2xl
  md:shadow-xl
  space-y-4
"
    >
      {!isOpen ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
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

          {ubicacionGPS && <p className="px-3 text-sm text-slate-600" role="status">Última lectura: precisión ±{Math.ceil(ubicacionGPS.coords.accuracy)} m. La ubicación aproximada puede impedir el checado.</p>}
          <div className="overflow-y-auto">
            <>
              <div className="relative mb-4">
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full object-cover border-0 md:border-4 rounded-none md:rounded-lg"
                  />
                  <div className="md:hidden absolute top-4 right-3 flex gap-3">
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
                  </div>

                  {(() => {
                    const { text, color } = getStatusMessage();
                    return (
                      <div
                        className={`absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-2 text-white text-sm font-medium rounded-lg shadow-lg ${color} bg-opacity-90 text-center`}
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
