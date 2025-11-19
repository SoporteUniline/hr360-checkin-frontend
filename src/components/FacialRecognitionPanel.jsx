import React, { useRef, useEffect, useState } from "react";
import { Camera, Loader, CheckCircle, Power, RotateCcw } from "lucide-react";
import { enqueueSnackbar } from "notistack";
import axiosInstance from "@/lib/axios";
import { Button } from "./ui/button";
import { Camera as CapacitorCamera } from "@capacitor/camera";
import { Geolocation } from "@capacitor/geolocation";

const FacialRecognitionPanel = ({
  isOpen,
  onOpen,
  onClose,
  onSuccess,
  idEmpresa,
  handleOpenFacialModal,
}) => {
  const [cameraFacing, setCameraFacing] = useState("user");
  const [error, setError] = useState("");
  const [faceApiLoaded, setFaceApiLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const streamRef = useRef(null);
  const [faceDetected, setFaceDetected] = useState(false);

  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const countdownTimeoutRef = useRef(null);

  const isProcessingRef = useRef(false);
  const lastCheckTimeRef = useRef(0);
  const MIN_INTERVAL = 3000;

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

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (videoRef.current) {
        const vid = videoRef.current;
        vid.pause();
        vid.srcObject = null;
        vid.currentTime = 0;
        vid.removeAttribute("src");
      }

      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx)
          ctx.clearRect(
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height
          );
      }

      isProcessingRef.current = false;
      setFaceDetected(false);
      setIsLoading(false);
    } catch (err) {
      console.error("❌ Error apagando cámara:", err);
    }
  };

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
    const loadFaceApi = async () => {
      if (!window.faceapi) {
        const script = document.createElement("script");
        script.src =
          "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";

        script.onload = async () => {
          await window.faceapi.nets.ssdMobilenetv1.loadFromUri("/models");
          await window.faceapi.nets.faceLandmark68Net.loadFromUri("/models");
          await window.faceapi.nets.faceRecognitionNet.loadFromUri("/models");
          setFaceApiLoaded(true);
        };

        document.head.appendChild(script);
      } else {
        setFaceApiLoaded(true);
      }
    };

    loadFaceApi();
  }, []);

  useEffect(() => {
    const startCamera = async () => {
      if (!isOpen || !faceApiLoaded) return;

      try {
        if (streamRef.current) {
          shutdownCamera();
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        const status = await CapacitorCamera.checkPermissions();

        if (status.camera !== "granted") {
          await CapacitorCamera.requestPermissions();
        }

        const gpsStatus = await Geolocation.checkPermissions();
        if (gpsStatus.location !== "granted") {
          await Geolocation.requestPermissions();
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: cameraFacing,
          },
        });

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            // console.log("Permiso de GPS concedido", pos.coords);
          },
          (err) => {
            console.warn("No se pudo obtener ubicación al inicio:", err);
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );

        if (videoRef.current && isOpen) {
          videoRef.current.srcObject = mediaStream;
          streamRef.current = mediaStream;
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
  }, [isOpen, faceApiLoaded, cameraFacing]);

  useEffect(() => () => cleanupAll(), []);

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
          isProcessingRef.current = true;
          startDelay();
        }
      } else {
        setFaceDetected(false);
      }
    }, 300);
  };

  const startDelay = () => {
    const now = Date.now();
    if (now - lastCheckTimeRef.current < MIN_INTERVAL) {
      isProcessingRef.current = false;
      return;
    }

    countdownTimeoutRef.current = setTimeout(() => {
      captureAndRecognize();
    }, 1000);
  };

  const errorCriticalRef = useRef(false);

  const captureAndRecognize = async () => {
    if (!videoRef.current || !canvasRef.current || !faceApiLoaded || !isOpen)
      return;

    if (errorCriticalRef.current) return;

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

      let latitud_actual = null;
      let longitud_actual = null;

      try {
        const position = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          })
        );
        latitud_actual = position.coords.latitude;
        longitud_actual = position.coords.longitude;
      } catch (geoError) {
        enqueueSnackbar("No se pudo obtener la ubicación. Activa el GPS.", {
          variant: "error",
        });
        setIsLoading(false);
        isProcessingRef.current = false;
        return;
      }

      const descriptor = Array.from(detection.descriptor);
      const { data } = await axiosInstance.post(
        `/checador/reloj/registrar-facial`,
        {
          descriptor_facial: descriptor,
          id_empresa: idEmpresa,
          latitud_actual,
          longitud_actual,
        }
      );

      lastCheckTimeRef.current = Date.now();
      setShowSuccessMessage(true);
      onSuccess(data);
      shutdownCamera();
      handleClose();
      setTimeout(() => {
        setShowSuccessMessage(false);
        setIsLoading(false);
        setFaceDetected(false);
        setError("");
        isProcessingRef.current = false;
      }, 500);
    } catch (err) {
      const message =
        err.response?.data?.error || "Error en reconocimiento facial";

      setError(message);
      enqueueSnackbar(message, { variant: "error" });
      setIsLoading(false);
      isProcessingRef.current = false;
    }
  };

  const handleClose = () => {
    cleanupAll();
    errorCriticalRef.current = false;
    isProcessingRef.current = false;
    onClose();
  };

  const getStatusMessage = () => {
    if (isLoading)
      return { text: "Procesando reconocimiento...", color: "bg-gray-700" };
    if (showSuccessMessage)
      return {
        text: "¡Listo! Esperando siguiente empleado...",
        color: "bg-green-600",
      };
    if (error) return { text: error, color: "bg-red-600" };

    if (countdown > 0)
      return { text: "Preparando captura...", color: "bg-gray-700" };
    if (faceDetected)
      return { text: "Rostro detectado", color: "bg-green-600" };

    return { text: "Esperando detección de rostro...", color: "bg-gray-600" };
  };

  // if (!isOpen) return null;

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
        <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
          <div className="bg-blue-100 rounded-full p-6 mb-4">
            <Camera className="h-12 w-12 text-blue-600" />
          </div>

          <h3 className="text-xl font-semibold mb-2 text-gray-800">
            Cámara apagada
          </h3>

          <p className="text-gray-600 text-center mb-6 max-w-md">
            Para iniciar el reconocimiento facial presiona el botón de encender
            cámara y colócate frente a la misma para registrar entrada o salida
          </p>

          <Button
            onClick={() => {
              cleanupAll();
              onOpen();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition"
          >
            Encender cámara
          </Button>
        </div>
      ) : (
        <>
          <div className="hidden md:flex justify-between items-center px-4 bg-white z-10">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Reconocimiento Facial
            </h2>
            <div className="flex gap-2 mt-2">
              <Button
                onClick={() =>
                  setCameraFacing((prev) =>
                    prev === "user" ? "environment" : "user"
                  )
                }
                className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition"
              >
                Cambiar cámara
              </Button>

              <Button
                onClick={() => {
                  handleOpenFacialModal();
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition"
              >
                Apagar cámara
              </Button>
            </div>
          </div>

          <div className="overflow-y-auto">
            <>
              {/* <p className="hidden md:block text-gray-600 text-sm text-center ">
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
                <div className="hidden md:flex items-center justify-center py-4 text-center">
                  <Loader className="w-8 h-8 animate-spin text-blue-600 mr-3" />
                  <span className="text-gray-600">Procesando...</span>
                </div>
              )} */}
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
                          prev === "user" ? "environment" : "user"
                        )
                      }
                      className="px-3 py-2 bg-gray-800 text-white rounded-lg opacity-90 hover:bg-white hover:text-slate-700"
                    >
                      <RotateCcw />
                      Cambiar
                    </Button>

                    <Button
                      onClick={handleOpenFacialModal}
                      className="px-3 py-2 bg-red-600 text-white rounded-lg opacity-90 hover:bg-white hover:text-red-600"
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

                {/* {faceDetected &&
                  countdown === 0 &&
                  !isLoading &&
                  !showSuccessMessage && (
                    <div className="hidden md:flex absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-lg text-sm font-semibold items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Rostro detectado
                    </div>
                  )} */}
              </div>

              {/* {error && (
                <div className="hidden md:block bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-center">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )} */}

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
