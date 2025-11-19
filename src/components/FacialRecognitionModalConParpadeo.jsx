import React, { useRef, useEffect, useState } from "react";
import { Camera, X, Loader, Eye } from "lucide-react";
import { enqueueSnackbar } from "notistack";
import { Camera as CapacitorCamera } from "@capacitor/camera";

const FacialRecognitionModalConParpaedo = ({
  isOpen,
  onClose,
  onSuccess,
  idEmpresa,
}) => {
  const [detectionActive, setDetectionActive] = useState(false);
  const [error, setError] = useState("");
  const [faceApiLoaded, setFaceApiLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [livenessCompleted, setLivenessCompleted] = useState(false);
  const [livenessStatus, setLivenessStatus] = useState("Cargando...");
  const [stream, setStream] = useState(null);
  const canvasRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const livenessStateRef = useRef({
    blinkDetected: false,
    headMovementDetected: false,
    blinkHistory: [],
    headPositions: [],
    frameCount: 0,
  });
  const videoRef = useRef(null);

  const shutdownCamera = () => {
    try {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.pause();
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        requestAnimationFrame(() => {
          if (videoRef.current) videoRef.current.load();
        });
      }
      setStream(null);
      setDetectionActive(false);
    } catch (error) {
      console.error("Error apagando cámara:", error);
    }
  };

  /** 🧹 Reset de todo */
  const cleanupAll = () => {
    shutdownCamera();
    setError("");
    setIsLoading(false);
    setLivenessCompleted(false);
    setLivenessStatus("Cargando...");
    setDetectionActive(false);
    livenessStateRef.current = {
      blinkDetected: false,
      headMovementDetected: false,
      blinkHistory: [],
      headPositions: [],
      frameCount: 0,
    };
  };

  /** 📦 Cargar face-api */
  useEffect(() => {
    const loadFaceApi = async () => {
      if (typeof window !== "undefined" && !window.faceapi) {
        const script = document.createElement("script");
        script.src =
          "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";
        script.onload = async () => {
          try {
            await window.faceapi.nets.ssdMobilenetv1.loadFromUri("/models");
            await window.faceapi.nets.faceLandmark68Net.loadFromUri("/models");
            await window.faceapi.nets.faceRecognitionNet.loadFromUri("/models");
            setFaceApiLoaded(true);
          } catch (err) {
            console.error("Error loading models:", err);
            setError("Error al cargar modelos de reconocimiento facial");
          }
        };
        document.head.appendChild(script);
      } else if (window.faceapi) {
        setFaceApiLoaded(true);
      }
    };

    if (isOpen) {
      loadFaceApi();
    } else {
      cleanupAll();
    }
  }, [isOpen]);

  /** 🎥 Iniciar cámara */
  useEffect(() => {
    const startCamera = async () => {
      if (!isOpen || !faceApiLoaded) return;

      try {
        if (stream) {
          shutdownCamera();
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        const statusCamera = await CapacitorCamera.checkPermissions();

        if (statusCamera.camera !== "granted") {
          await CapacitorCamera.requestPermissions();
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user",
          },
        });

        if (videoRef.current && isOpen) {
          videoRef.current.srcObject = mediaStream;
          setStream(mediaStream);

          videoRef.current.onloadedmetadata = () => {
            setTimeout(() => {
              if (isOpen) startContinuousDetection();
            }, 800);
          };
        } else {
          mediaStream.getTracks().forEach((t) => t.stop());
        }
      } catch (err) {
        // console.error("Error camera:", err);
        setError("No se pudo acceder a la cámara");
        enqueueSnackbar("No se pudo acceder a la cámara", {
          variant: "error",
          autoHideDuration: 3000,
        });
      }
    };

    startCamera();
    return () => shutdownCamera();
  }, [isOpen, faceApiLoaded]);

  useEffect(() => () => cleanupAll(), []);

  /** 👁️ Parpadeo + movimiento */
  const startContinuousDetection = () => {
    if (detectionActive || !videoRef.current || !canvasRef.current || !isOpen)
      return;

    setDetectionActive(true);
    setLivenessStatus("Parpadee y mueva ligeramente su cabeza...");

    detectionIntervalRef.current = setInterval(async () => {
      try {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video || video.readyState !== 4) return;

        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(video, 0, 0);

        const detection = await window.faceapi
          .detectSingleFace(canvas)
          .withFaceLandmarks();
        const state = livenessStateRef.current;
        state.frameCount++;

        const getEAR = (eye) => {
          const v1 = Math.hypot(eye[1].x - eye[5].x, eye[1].y - eye[5].y);
          const v2 = Math.hypot(eye[2].x - eye[4].x, eye[2].y - eye[4].y);
          const h = Math.hypot(eye[0].x - eye[3].x, eye[0].y - eye[3].y);
          return (v1 + v2) / (2.0 * h);
        };

        if (detection) {
          const landmarks = detection.landmarks.positions;
          const box = detection.detection.box;

          // 🔹 Blink con filtro de movimiento
          if (!state.blinkDetected) {
            const leftEAR = getEAR(landmarks.slice(36, 42));
            const rightEAR = getEAR(landmarks.slice(42, 48));
            const avgEAR = (leftEAR + rightEAR) / 2.0;

            const BLINK_THRESHOLD = 0.28;
            if (!state.closedFrames) state.closedFrames = 0;

            // Calcular centro de la cara
            const cx = box.x + box.width / 2;
            const cy = box.y + box.height / 2;

            if (!state.lastCenter) state.lastCenter = { x: cx, y: cy };
            const dx = Math.abs(cx - state.lastCenter.x);
            const dy = Math.abs(cy - state.lastCenter.y);
            state.lastCenter = { x: cx, y: cy };

            const HEAD_STABLE = dx < 8 && dy < 8; // tolerancia máx. 8px

            if (avgEAR <= BLINK_THRESHOLD && HEAD_STABLE) {
              state.closedFrames++;
            } else {
              if (state.closedFrames >= 1 && HEAD_STABLE) {
                state.blinkDetected = true;
              }
              state.closedFrames = 0;
            }
          }

          // 🔹 Head move
          if (!state.headMovementDetected) {
            const cx = box.x + box.width / 2;
            const cy = box.y + box.height / 2;

            state.headPositions.push({ x: cx, y: cy });
            if (state.headPositions.length > 20) state.headPositions.shift();

            if (state.headPositions.length >= 15) {
              let total = 0;
              for (let i = 1; i < state.headPositions.length; i++) {
                const dx =
                  state.headPositions[i].x - state.headPositions[i - 1].x;
                const dy =
                  state.headPositions[i].y - state.headPositions[i - 1].y;
                total += Math.sqrt(dx * dx + dy * dy);
              }
              if (total > 30) state.headMovementDetected = true;
            }
          }

          // ✅ Check done
          if (state.blinkDetected && state.headMovementDetected) {
            clearInterval(detectionIntervalRef.current);
            detectionIntervalRef.current = null;
            setLivenessCompleted(true);
            setLivenessStatus("Persona real verificada ✅");
            setDetectionActive(false);

            setTimeout(() => isOpen && captureAndRecognize(), 1000);
            return;
          }

          if (state.blinkDetected)
            setLivenessStatus("Parpadeo ✓ - Falta mover la cabeza");
          else if (state.headMovementDetected)
            setLivenessStatus("Movimiento ✓ - Falta parpadear");
          else if (state.frameCount > 30)
            setLivenessStatus("Parpadee claramente y mueva un poco su cabeza");

          if (state.frameCount > 100) {
            setLivenessStatus("Tiempo agotado. Cierre y reintente.");
            clearInterval(detectionIntervalRef.current);
          }
        } else {
          setLivenessStatus("Colóquese frente a la cámara...");
        }
      } catch (err) {
        console.error("Error en detección:", err);
      }
    }, 200);
  };

  /** 📸 Captura + envío */
  const captureAndRecognize = async () => {
    if (!videoRef.current || !canvasRef.current || !faceApiLoaded || !isOpen)
      return;

    setIsLoading(true);
    setError("");

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0);

      const detection = await window.faceapi
        .detectSingleFace(canvas)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setError("No se detectó rostro en la captura final.");
        setIsLoading(false);
        return;
      }

      const descriptor = Array.from(detection.descriptor);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/reloj/registrar-facial`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            descriptor_facial: descriptor,
            id_empresa: idEmpresa,
            liveness_verified: true,
          }),
        }
      );

      const data = await response.json();
      if (response.ok) {
        shutdownCamera();
        onSuccess(data);
        handleClose();
      } else setError(data.error || "Error en reconocimiento facial");
    } catch (err) {
      console.error("Error reconocimiento:", err);
      setError("Error al procesar el reconocimiento facial");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    cleanupAll();
    setFaceApiLoaded(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Verificación de Persona Real
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center">
          {!faceApiLoaded ? (
            <div className="py-8">
              <Loader className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Cargando sistema...</p>
            </div>
          ) : (
            <>
              <div className="relative mb-4">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full max-w-md mx-auto rounded-lg border-4 border-gray-200"
                />
                <canvas ref={canvasRef} style={{ display: "none" }} />

                {!livenessCompleted && detectionActive && (
                  <div className="absolute bottom-2 left-2 right-2 bg-blue-500/90 text-white px-3 py-2 rounded-lg text-xs font-medium">
                    {livenessStatus}
                  </div>
                )}
                {livenessCompleted && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-lg text-sm font-semibold">
                    ✅ Verificado
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-blue-700 text-sm font-medium">
                    Para verificar que eres una persona real:
                  </p>
                  <ol className="text-blue-600 text-sm mt-1 space-y-1">
                    <li>• Parpadea claramente una vez</li>
                    <li>• Mueve ligeramente tu cabeza</li>
                  </ol>
                </div>

                <p className="text-gray-600 text-sm">
                  {isLoading
                    ? "Procesando..."
                    : livenessCompleted
                    ? "Verificación completada, procesando..."
                    : "El sistema detectará automáticamente cuando completes ambas acciones..."}
                </p>

                {isLoading && (
                  <div className="flex items-center justify-center py-4">
                    <Loader className="w-8 h-8 animate-spin text-blue-600 mr-3" />
                    <span className="text-gray-600">Procesando...</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FacialRecognitionModalConParpaedo;
