"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { faceapi, loadFaceApiModels, isFaceApiReady } from "@/lib/faceapi";
import { useSnackbar } from "notistack";

export default function TabReconocimiento({
  setDescriptor,
  soloLectura,
  active,
}) {
  const { enqueueSnackbar } = useSnackbar();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);
  const streamRef = useRef(null); // 🔹 Ref para guardar el stream
  const userStoppedRef = useRef(false);

  const [loadingModels, setLoadingModels] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [descriptorReady, setDescriptorReady] = useState(false);
  const [guidance, setGuidance] = useState({
    level: "info",
    text: "Alinea tu rostro en el centro",
  });

  const syncCanvasSize = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const cssW = video.clientWidth || 0;
    const cssH = video.clientHeight || 0;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.max(1, Math.round(cssW * dpr));
    canvas.height = Math.max(1, Math.round(cssH * dpr));
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;

    const ctx = canvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, []);

  // 🔹 Detener cámara mejorado
  const stopCamera = useCallback(() => {
    userStoppedRef.current = true;
    // Detener el intervalo de detección
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Detener todas las pistas del stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }

    // Limpiar el video
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
      video.currentTime = 0;
    }

    // Limpiar el canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }

    // Reset del estado
    setCameraActive(false);
    setDescriptorReady(false);
    setGuidance({ level: "info", text: "Cámara detenida" });
  }, []);

  const startCamera = useCallback(async () => {
    if (!isFaceApiReady() || !videoRef.current || !canvasRef.current) return;

    stopCamera();

    try {
      const permission = await navigator.permissions.query({ name: "camera" });

      if (permission.state === "denied") {
        setGuidance({
          level: "error",
          text: "Permiso de cámara bloqueado. Actívalo en el navegador.",
        });
        enqueueSnackbar("Permiso de cámara bloqueado", { variant: "error" });
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 300 },
          height: { ideal: 300 },
        },
      });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;

      await new Promise((resolve) => {
        const checkVideoSize = () => {
          if (videoRef.current?.videoWidth > 0) resolve(true);
          else requestAnimationFrame(checkVideoSize);
        };
        checkVideoSize();
      });

      await videoRef.current.play();
      syncCanvasSize();

      setCameraActive(true);

      setGuidance({
        level: "info",
        text: "Cámara iniciada - Alinea tu rostro",
      });

      intervalRef.current = setInterval(async () => {
        if (!videoRef.current || !canvasRef.current || !active) {
          return; // 🔹 No procesar si no está activo
        }

        const detections = await faceapi
          .detectAllFaces(videoRef.current)
          .withFaceLandmarks()
          .withFaceDescriptors();

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const displaySize = {
          width: videoRef.current.videoWidth,
          height: videoRef.current.videoHeight,
        };

        if (displaySize.width > 0 && displaySize.height > 0) {
          faceapi.matchDimensions(canvas, displaySize);
          const resizedDetections = faceapi.resizeResults(
            detections,
            displaySize
          );

          resizedDetections.forEach((d) => {
            const box = d.detection.box;
            const dpr = window.devicePixelRatio || 1;
            const landmarkSize = 2; // 🔹 TAMAÑO FIJO MUY FINO
            const strokeWidth = Math.max(1, 1 * dpr);

            ctx.strokeStyle = "#00FF00";
            ctx.lineWidth = strokeWidth;
            ctx.strokeRect(box.x, box.y, box.width, box.height);

            ctx.fillStyle = "#FF0000";
            d.landmarks.positions.forEach((p) => {
              ctx.beginPath();
              ctx.arc(p.x, p.y, landmarkSize, 0, 2 * Math.PI);
              ctx.fill();
            });
          });
        }

        if (!detections.length) {
          setGuidance({ level: "warning", text: "No se detecta rostro." });
        } else if (detections.length > 1) {
          setGuidance({ level: "warning", text: "Varias caras detectadas." });
        } else {
          setGuidance({ level: "success", text: "Rostro detectado ✅" });
        }
      }, 200);
    } catch (error) {
      console.error("Error al acceder a la cámara:", error);

      if (
        error.name === "NotAllowedError" ||
        error.name === "PermissionDeniedError"
      ) {
        setGuidance({
          level: "error",
          text: "Permiso de cámara denegado. Debes permitir el acceso.",
        });
      } else if (error.name === "NotFoundError") {
        setGuidance({
          level: "error",
          text: "No se encontró ninguna cámara disponible.",
        });
      } else {
        setGuidance({
          level: "error",
          text: "Error inesperado al acceder a la cámara.",
        });
      }

      setCameraActive(false);
    }
  }, [active, stopCamera, syncCanvasSize]);

  const toggleCamera = useCallback(() => {
    if (cameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  }, [cameraActive, startCamera, stopCamera]);

  // 🔹 Capturar descriptor
  const handleCapture = async () => {
    if (!isFaceApiReady() || !videoRef.current) return;

    const detection = await faceapi
      .detectSingleFace(videoRef.current)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      enqueueSnackbar("No se detectó ninguna cara", {
        variant: "error",
      });
      return;
    }

    const descriptorArray = Array.from(detection.descriptor);
    setDescriptor(descriptorArray);
    setDescriptorReady(true);
    setGuidance({
      level: "success",
      text: "Descriptor capturado exitosamente ✅",
    });
    enqueueSnackbar("Descriptor capturado exitosamente", {
      variant: "success",
    });
  };

  // 🔹 Cargar modelos
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        if (!isFaceApiReady()) await loadFaceApiModels("/models");
        if (mounted) setLoadingModels(false);
      } catch (err) {
        console.error("Error inicializando:", err);
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!active) {
      stopCamera();
    }
  }, [active, stopCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  useEffect(() => {
    if (
      active &&
      !loadingModels &&
      !cameraActive &&
      !userStoppedRef.current // 👈 AQUÍ
    ) {
      startCamera();
    }
  }, [active, loadingModels, cameraActive, startCamera]);

  useEffect(() => {
    if (active) {
      userStoppedRef.current = false;
    }
  }, [active]);

  // 🔹 Si no está activo, no renderizar el contenido de la cámara
  if (!active) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {loadingModels ? (
        <div className="flex flex-col items-center gap-3 py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2563EB]"></div>
          <p className="text-gray-600 font-medium">Cargando modelos de reconocimiento facial...</p>
        </div>
      ) : (
        <>
          {/* Información de ayuda */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 max-w-md">
            <div className="flex items-start gap-3">
              <div className="bg-[#2563EB] p-2 rounded-lg flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">Reconocimiento facial</h4>
                <p className="text-sm text-gray-600">
                  Posiciona tu rostro en el centro del cuadro. Asegúrate de tener buena iluminación y estar en un lugar sin distracciones.
                </p>
              </div>
            </div>
          </div>

          {/* Video con marco mejorado */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-400 to-purple-400 rounded-2xl blur opacity-20"></div>
            <div className="relative bg-white p-4 rounded-2xl shadow-lg">
              <div className="relative w-[300px] h-[300px] rounded-xl overflow-hidden bg-gray-900">
                <video
                  ref={videoRef}
                  width={300}
                  height={300}
                  className="w-full h-full object-cover"
                  muted
                  autoPlay
                  playsInline
                />
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 w-full h-full"
                />
              </div>
            </div>
          </div>

          {/* Estado de guía con colores */}
          <div className={`px-4 py-2 rounded-lg font-medium text-sm ${
            guidance.level === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : guidance.level === "warning"
              ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
              : guidance.level === "error"
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-gray-50 text-gray-700 border border-gray-200"
          }`}>
            {guidance.text}
          </div>

          {/* Botones con colores ADAMIA */}
          {!soloLectura && (
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={toggleCamera}
                className={
                  cameraActive
                    ? "bg-red-500 hover:bg-red-600 text-white font-medium shadow-sm"
                    : "bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-medium shadow-sm"
                }
              >
                {cameraActive ? "Detener cámara" : "Iniciar cámara"}
              </Button>
              <Button
                type="button"
                onClick={handleCapture}
                disabled={!cameraActive}
                className="bg-gray-800 hover:bg-gray-900 text-white font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Capturar descriptor
              </Button>
            </div>
          )}

          {/* Indicador de éxito */}
          {descriptorReady && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
              <div className="bg-green-500 p-2 rounded-full">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-semibold text-green-700">Rostro detectado ✅</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
