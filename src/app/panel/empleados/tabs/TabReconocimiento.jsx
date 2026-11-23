"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { faceapi, loadFaceApiModels, isFaceApiReady } from "@/lib/faceapi";
import { useSnackbar } from "notistack";
import { useAuth } from "@/context/AuthContext";
import ConsentimientoRostro from "./ConsentimientoRostro";
import AvisoRostroApp from "./AvisoRostroApp";
import FirmaPinRh from "./FirmaPinRh";
import RostroCelular from "./RostroCelular";
import { useSWRConfig } from "swr";
import { ScanFace } from "lucide-react";
import { mensajeListo } from "@/lib/rostro/enlaceCelular.mjs";

export default function TabReconocimiento({
  renderCampos = () => null,
  form,
  setDescriptor,
  soloLectura,
  active,
}) {
  const { enqueueSnackbar } = useSnackbar();
  const { dataUser } = useAuth();
  const valores = form?.getValues?.() ?? {};
  const idEmpresa = valores.id_empresa;
  const empresaNombre = (dataUser?.empresas_detalle ?? []).find((e) => Number(e.id_empresa) === Number(idEmpresa))?.nombre;
  const nombreEmpleado = [valores.nombre, valores.apellido_paterno, valores.apellido_materno].filter(Boolean).join(" ");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);
  const streamRef = useRef(null); // 🔹 Ref para guardar el stream
  const userStoppedRef = useRef(false);

  const [loadingModels, setLoadingModels] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [descriptorReady, setDescriptorReady] = useState(false);
  const [rostroCelular, setRostroCelular] = useState(false);
  const { mutate } = useSWRConfig();
  // (05/12/2026) Registrado desde el celular: se actualiza el estado y el aviso del rostro de la ficha, sin recargar.
  // No se toca el formulario: al guardar la ficha no se reenvía un rostro (ver rostroCapturado en FormularioEmpleado).
  const idEmpleadoFicha = valores.id_empleado;
  const alRegistrarDesdeCelular = useCallback(() => {
    setRostroCelular(true);
    if (idEmpleadoFicha) mutate(`/checador/mi-espacio/rostro/empleado/${idEmpleadoFicha}`);
  }, [idEmpleadoFicha, mutate]);
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
    enqueueSnackbar("Rostro capturado. Guarda la ficha para conservarlo.", {
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

  const tieneRostro = rostroCelular || descriptorReady || (Array.isArray(valores.descriptor_facial) && valores.descriptor_facial.length > 0);
  const tonoGuia = {
    success: "border-green-200 bg-green-50 text-green-800",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    error: "border-red-200 bg-red-50 text-red-700",
  }[guidance.level] ?? "border-slate-200 bg-slate-50 text-slate-700";

  // (05/12/2026, pedido del dueño) Tres columnas en vez de una tira angosta: 1) documento (consentimiento),
  // 2) firma y PIN + aviso del rostro desde la app, 3) reconocimiento facial (instrucciones, cámara y botones).
  // Por ancho del contenedor (no de la ventana): 3 columnas ≥ 1024 px; 2 + 1 en tableta; apiladas en teléfono.
  return (
    <div className="@container w-full space-y-4 py-2">
      {renderCampos("inicio", true)}
      <div className="grid grid-cols-1 items-start gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3" data-reconocimiento-columnas>
        <div className="min-w-0" data-columna="documento">
          <ConsentimientoRostro idEmpresa={idEmpresa} idEmpleado={valores.id_empleado} nombre={nombreEmpleado} empresa={empresaNombre} />
        </div>
        <div className="grid min-w-0 gap-4" data-columna="firma">
          <FirmaPinRh idEmpleado={valores.id_empleado} />
          <AvisoRostroApp idEmpleado={valores.id_empleado} />
        </div>
        <section aria-labelledby="t-reconocimiento" className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 text-sm @2xl:col-span-2 @5xl:col-span-1" data-columna="reconocimiento">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 id="t-reconocimiento" className="flex items-center gap-2 font-semibold text-slate-900"><ScanFace className="size-4 text-brand" aria-hidden="true" /> Reconocimiento facial</h3>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tieneRostro ? "bg-green-50 text-green-800" : "bg-slate-100 text-slate-600"}`} data-rostro-estado>
              {rostroCelular ? "Registrado desde el celular" : descriptorReady ? "Capturado: falta guardar" : tieneRostro ? "Rostro registrado" : "Sin rostro"}
            </span>
          </div>
          <p className="mt-1 text-slate-600">Rostro al centro del cuadro, con buena luz y sin otras personas atrás.</p>
          {rostroCelular ? (
            <p role="status" className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 text-green-800">{mensajeListo(nombreEmpleado)} Ya lo usa para checar.</p>
          ) : null}
          {renderCampos("instrucciones", true)}
          {loadingModels ? (
            <div className="flex flex-col items-center gap-3 py-12" role="status">
              <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#2563EB] motion-reduce:animate-none"></div>
              <p className="text-slate-600">Preparando la cámara…</p>
            </div>
          ) : (
            <div className="mt-3 grid gap-3">
              <div className="relative mx-auto aspect-square w-full max-w-[300px] overflow-hidden rounded-xl bg-slate-900">
                <video ref={videoRef} width={300} height={300} className="h-full w-full object-cover" muted autoPlay playsInline aria-label="Vista de la cámara de esta computadora" />
                <canvas ref={canvasRef} className="absolute left-0 top-0 h-full w-full" />
              </div>
              {renderCampos("camara", true)}
              <p role="status" className={`rounded-lg border px-3 py-2 text-center font-medium ${tonoGuia}`}>{guidance.text}</p>
              {!soloLectura && (
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" onClick={toggleCamera}
                    className={`min-h-11 font-semibold ${cameraActive ? "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50" : "bg-[#2563EB] text-white hover:bg-[#1d4ed8]"}`}>
                    {cameraActive ? "Detener cámara" : "Iniciar cámara"}
                  </Button>
                  <Button type="button" onClick={handleCapture} disabled={!cameraActive}
                    className="min-h-11 bg-slate-800 font-semibold text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50">
                    Capturar rostro
                  </Button>
                </div>
              )}
              {renderCampos("controles", true)}
              {descriptorReady && (
                <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-green-800">Rostro capturado. Se guarda al guardar la ficha.</p>
              )}
            </div>
          )}
          {!soloLectura ? (
            <div className="mt-4 grid gap-2 border-t border-slate-100 pt-4">
              <p className="text-slate-600">¿Es difícil con la cámara de la computadora? La persona puede tomarlo con su celular.</p>
              {valores.id_empleado ? (
                <RostroCelular idEmpleado={valores.id_empleado} nombre={nombreEmpleado} onRegistrado={alRegistrarDesdeCelular} onAbrir={stopCamera} />
              ) : (
                <p className="text-xs text-slate-500">Guarda primero al empleado para usar esta opción.</p>
              )}
            </div>
          ) : null}
        </section>
      </div>
      {renderCampos("fin", true)}
    </div>
  );
}
