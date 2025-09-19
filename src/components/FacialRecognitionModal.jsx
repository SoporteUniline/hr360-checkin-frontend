import React, { useRef, useEffect, useState } from "react";
import { Camera, X, Loader, CheckCircle } from "lucide-react";
import { enqueueSnackbar } from "notistack";

const FacialRecognitionModal = ({ isOpen, onClose, onSuccess, idEmpresa }) => {
  const [error, setError] = useState("");
  const [faceApiLoaded, setFaceApiLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [stream, setStream] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);

  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const countdownTimeoutRef = useRef(null);
  const isProcessingRef = useRef(false); // 🔹 ref para evitar duplicados

  const shutdownCamera = () => {
    try {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
      if (countdownTimeoutRef.current) {
        clearTimeout(countdownTimeoutRef.current);
        countdownTimeoutRef.current = null;
      }
      if (videoRef.current) videoRef.current.pause();
      if (stream) stream.getTracks().forEach((track) => track.stop());
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        requestAnimationFrame(
          () => videoRef.current && videoRef.current.load()
        );
      }
      setStream(null);
      isProcessingRef.current = false; // 🔹 resetear al cerrar
    } catch (err) {
      console.error("Error apagando cámara:", err);
    }
  };

  const resetState = () => {
    setError("");
    setIsLoading(false);
    setCountdown(0);
    setShowSuccessMessage(false);
    setFaceDetected(false);
    isProcessingRef.current = false; // 🔹 resetear también aquí
  };

  const cancelCountdown = () => {
    if (countdownTimeoutRef.current) {
      clearTimeout(countdownTimeoutRef.current);
      countdownTimeoutRef.current = null;
    }
    setCountdown(0);
    isProcessingRef.current = false;
  };

  const cleanupAll = () => {
    shutdownCamera();
    resetState();
  };

  // Cargar face-api
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
      } else if (window.faceapi) setFaceApiLoaded(true);
    };

    if (isOpen) loadFaceApi();
    else cleanupAll();
  }, [isOpen]);

  // Iniciar cámara
  useEffect(() => {
    const startCamera = async () => {
      if (!isOpen || !faceApiLoaded) return;

      try {
        if (stream) {
          shutdownCamera();
          await new Promise((resolve) => setTimeout(resolve, 100));
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
            setTimeout(() => isOpen && startFaceDetection(), 800);
          };
        } else mediaStream.getTracks().forEach((t) => t.stop());
      } catch (err) {
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

  // Detección de rostro
  const startFaceDetection = () => {
    if (!videoRef.current || !canvasRef.current || !isOpen) return;

    detectionIntervalRef.current = setInterval(async () => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video || video.readyState !== 4) return;

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(video, 0, 0);

      const detection = await window.faceapi.detectSingleFace(canvas);

      if (detection) {
        setFaceDetected(true);
        if (!isProcessingRef.current) {
          isProcessingRef.current = true; // 🔹 arranca solo una vez
          startDelay();
        }
      } else {
        if (isProcessingRef.current) {
          cancelCountdown(); // 👈 aquí cancelas si se perdió el rostro
        }
        setFaceDetected(false);
      }
    }, 300);
  };

  // Countdown
  // const startCountdown = () => {
  //   setCountdown(5);

  //   const runCountdown = (count) => {
  //     if (count > 0) {
  //       countdownTimeoutRef.current = setTimeout(() => {
  //         setCountdown(count - 1);
  //         runCountdown(count - 1);
  //       }, 1000);
  //     } else {
  //       captureAndRecognize();
  //     }
  //   };

  //   runCountdown(5);
  // };

  // Delay sin mostrar conteo
  const startDelay = () => {
    // no usamos setCountdown para que no aparezca nada en UI
    countdownTimeoutRef.current = setTimeout(() => {
      captureAndRecognize();
    }, 2000); // espera 1.5 segundos antes de tomar la captura
  };

  // Captura y reconocimiento
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
        setError("No se detectó rostro en la captura. Inténtelo de nuevo.");
        setIsLoading(false);
        isProcessingRef.current = false;
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
            liveness_verified: false,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setShowSuccessMessage(true);
        onSuccess(data);

        setTimeout(() => {
          setShowSuccessMessage(false);
          setIsLoading(false);
          setFaceDetected(false);
          setError("");
          isProcessingRef.current = false; // 🔹 listo para siguiente empleado
        }, 8000);
      } else {
        setError(data.error || "Error en reconocimiento facial");
        setIsLoading(false);
        setTimeout(() => (isProcessingRef.current = false), 8000); // 🔹 permitir reintento
      }
    } catch (err) {
      console.error("Error reconocimiento:", err);
      setError("Error al procesar el reconocimiento facial");
      setIsLoading(false);
      isProcessingRef.current = false;
    }
  };

  const handleClose = () => {
    cleanupAll();
    setFaceApiLoaded(false);
    isProcessingRef.current = false; // 🔹 resetear
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Reconocimiento Facial
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
                  className={`w-full max-w-md mx-auto rounded-lg border-4 transition-colors duration-300 ${
                    faceDetected && !isLoading && !showSuccessMessage
                      ? "border-green-400"
                      : showSuccessMessage
                      ? "border-green-500"
                      : "border-gray-200"
                  }`}
                />
                <canvas ref={canvasRef} style={{ display: "none" }} />

                {countdown > 0 && (
                  <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                    <div className="text-6xl font-bold text-white animate-pulse">
                      {countdown}
                    </div>
                  </div>
                )}

                {faceDetected &&
                  countdown === 0 &&
                  !isLoading &&
                  !showSuccessMessage && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-lg text-sm font-semibold flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Rostro detectado
                    </div>
                  )}

                {/* {showSuccessMessage && (
                  <div className="absolute inset-0 bg-green-500/90 rounded-lg flex items-center justify-center">
                    <div className="text-center text-white">
                      <CheckCircle className="w-16 h-16 mx-auto mb-2" />
                      <p className="text-xl font-bold">¡Registro exitoso!</p>
                    </div>
                  </div>
                )} */}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-blue-700 text-sm font-medium">
                    Instrucciones:
                  </p>
                  <ul className="text-blue-600 text-sm mt-1 space-y-1">
                    <li>• Colóquese frente a la cámara</li>
                    <li>• El recuadro se pondrá verde al detectar su rostro</li>
                    <li>• Se iniciará un conteo regresivo automáticamente</li>
                    <li>• Manténgase quieto durante la captura</li>
                  </ul>
                </div>

                <p className="text-gray-600 text-sm">
                  {isLoading
                    ? "Procesando reconocimiento facial..."
                    : showSuccessMessage
                    ? "¡Listo! Esperando próximo empleado..."
                    : countdown > 0
                    ? "Preparando captura..."
                    : faceDetected
                    ? "Rostro detectado - iniciando en un momento..."
                    : "Esperando detección de rostro..."}
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

export default FacialRecognitionModal;
