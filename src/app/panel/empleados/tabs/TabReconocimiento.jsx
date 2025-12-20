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
    <div className="flex flex-col items-center gap-4">
      {loadingModels ? (
        <p>Cargando modelos...</p>
      ) : (
        <>
          <div className="relative w-[300px] h-[300px]">
            <video
              ref={videoRef}
              width={300}
              height={300}
              className="border rounded"
              muted
              autoPlay
              playsInline
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full"
            />
          </div>

          {!soloLectura && (
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={toggleCamera}
                variant={cameraActive ? "destructive" : "default"}
              >
                {cameraActive ? "Detener cámara" : "Iniciar cámara"}
              </Button>
              <Button
                type="button"
                onClick={handleCapture}
                disabled={!cameraActive} // Solo habilitado si la cámara está activa
              >
                Capturar descriptor
              </Button>
            </div>
          )}

          {descriptorReady && (
            <p className="text-green-600">Descriptor listo ✅</p>
          )}
          <p
            className={`text-sm ${
              guidance.level === "success"
                ? "text-green-600"
                : guidance.level === "warning"
                ? "text-yellow-600"
                : guidance.level === "error"
                ? "text-red-600"
                : "text-gray-600"
            }`}
          >
            {guidance.text}
          </p>
        </>
      )}
    </div>
  );
}
