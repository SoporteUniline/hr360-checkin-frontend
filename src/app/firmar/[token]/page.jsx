"use client";

import {
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Clock3,
  Eraser,
  FileSignature,
  FileText,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  UserRound,
  Video,
} from "lucide-react";

import { firmaDigitalApi } from "@/lib/firmaDigitalApi";

function EstadoError({ titulo, mensaje }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
          <AlertCircle className="h-7 w-7 text-red-600" />
        </div>

        <h1 className="text-xl font-semibold text-slate-900">{titulo}</h1>

        <p className="mt-3 text-sm leading-6 text-slate-600">{mensaje}</p>
      </div>
    </main>
  );
}

export default function FirmarDocumentoPage({ params }) {
  const { token } = use(params);

  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const dibujandoRef = useRef(false);
  const ultimoPuntoRef = useRef(null);

  const [solicitud, setSolicitud] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [consentimiento, setConsentimiento] = useState(false);
  const [tieneFirma, setTieneFirma] = useState(false);
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [errorCamara, setErrorCamara] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [firmado, setFirmado] = useState(false);

  const detenerCamara = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCamaraActiva(false);
  }, []);

  useEffect(() => {
    let activo = true;

    async function cargarSolicitud() {
      try {
        setCargando(true);
        setError(null);

        const data = await firmaDigitalApi.obtenerSolicitudPublica(token);

        if (activo) {
          setSolicitud(data.solicitud);
        }
      } catch (err) {
        if (!activo) return;

        const status = err?.response?.status;
        const mensajeBackend = err?.response?.data?.error;

        if (status === 404) {
          setError({
            titulo: "Enlace no válido",
            mensaje:
              mensajeBackend ||
              "No encontramos una solicitud de firma asociada a este enlace.",
          });
        } else if (status === 410) {
          setError({
            titulo: "Este enlace ya no está disponible",
            mensaje:
              mensajeBackend ||
              "La solicitud de firma expiró o fue cancelada.",
          });
        } else if (status === 409) {
          setError({
            titulo: "Documento ya firmado",
            mensaje:
              mensajeBackend ||
              "Este documento ya fue firmado y el enlace no puede volver a utilizarse.",
          });
        } else {
          setError({
            titulo: "No pudimos cargar el documento",
            mensaje:
              mensajeBackend ||
              "Ocurrió un problema al consultar la solicitud. Intenta nuevamente.",
          });
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    if (token) {
      cargarSolicitud();
    }

    return () => {
      activo = false;

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [token]);

  const prepararCanvas = useCallback(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();

    if (!rect.width || !rect.height) return;

    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    const ctx = canvas.getContext("2d");

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.25;
    ctx.strokeStyle = "#0f172a";

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);

    setTieneFirma(false);
  }, []);

  useEffect(() => {
    if (!solicitud || firmado) return;

    prepararCanvas();

    const handleResize = () => {
      prepararCanvas();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [solicitud, firmado, prepararCanvas]);

  const obtenerPunto = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const iniciarTrazo = (event) => {
    if (enviando) return;

    event.preventDefault();

    const canvas = canvasRef.current;

    canvas.setPointerCapture?.(event.pointerId);

    dibujandoRef.current = true;
    ultimoPuntoRef.current = obtenerPunto(event);
  };

  const dibujar = (event) => {
    if (!dibujandoRef.current || enviando) return;

    event.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const actual = obtenerPunto(event);
    const anterior = ultimoPuntoRef.current;

    if (!anterior) {
      ultimoPuntoRef.current = actual;
      return;
    }

    ctx.beginPath();
    ctx.moveTo(anterior.x, anterior.y);
    ctx.lineTo(actual.x, actual.y);
    ctx.stroke();

    ultimoPuntoRef.current = actual;
    setTieneFirma(true);
  };

  const terminarTrazo = (event) => {
    if (!dibujandoRef.current) return;

    event.preventDefault();

    canvasRef.current?.releasePointerCapture?.(event.pointerId);

    dibujandoRef.current = false;
    ultimoPuntoRef.current = null;
  };

  const limpiarFirma = () => {
    prepararCanvas();
  };

  const activarCamara = async () => {
    try {
      setErrorCamara("");

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("CAMARA_NO_DISPONIBLE");
      }

      detenerCamara();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCamaraActiva(true);
    } catch (err) {
      detenerCamara();

      if (
        err?.name === "NotAllowedError" ||
        err?.name === "PermissionDeniedError"
      ) {
        setErrorCamara(
          "Necesitamos permiso para usar la cámara como evidencia de la firma.",
        );
      } else {
        setErrorCamara(
          "No fue posible iniciar la cámara. Revisa que esté disponible y vuelve a intentarlo.",
        );
      }
    }
  };

  const canvasABlob = (canvas, tipo, calidad) =>
    new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("No fue posible generar la imagen."));
          }
        },
        tipo,
        calidad,
      );
    });

  const capturarEvidencia = async () => {
    const video = videoRef.current;

    if (
      !video ||
      !camaraActiva ||
      video.readyState < 2 ||
      !video.videoWidth ||
      !video.videoHeight
    ) {
      throw new Error("La cámara todavía no está lista.");
    }

    const canvas = document.createElement("canvas");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvasABlob(canvas, "image/jpeg", 0.88);
  };

  const firmarDocumento = async () => {
    if (!consentimiento || !tieneFirma || !camaraActiva || enviando) {
      return;
    }

    try {
      setEnviando(true);
      setErrorCamara("");

      const firma = await canvasABlob(
        canvasRef.current,
        "image/png",
      );

      const evidencia = await capturarEvidencia();

      detenerCamara();

      await firmaDigitalApi.firmarSolicitud(token, {
        firma,
        evidencia,
      });

      setFirmado(true);
    } catch (err) {
      detenerCamara();

      const mensajeBackend = err?.response?.data?.error;

      setErrorCamara(
        mensajeBackend ||
          err?.message ||
          "No fue posible completar la firma. Intenta nuevamente.",
      );
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-700" />
          <p className="mt-4 text-sm text-slate-600">
            Preparando tu documento...
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return <EstadoError titulo={error.titulo} mensaje={error.mensaje} />;
  }

  if (!solicitud) {
    return (
      <EstadoError
        titulo="Documento no disponible"
        mensaje="No fue posible obtener la información de esta solicitud."
      />
    );
  }

  if (firmado) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>

          <h1 className="text-2xl font-semibold text-slate-900">
            Documento firmado
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            Tu firma fue registrada correctamente. Ya puedes cerrar esta
            ventana.
          </p>

          <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4" />
            La evidencia de la firma quedó registrada de forma privada.
          </div>
        </div>
      </main>
    );
  }

  const puedeFirmar =
    consentimiento && tieneFirma && camaraActiva && !enviando;

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <img
            src="/assets/adamia.png"
            alt="ADAMIA"
            className="h-9 w-auto object-contain"
          />

          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <LockKeyhole className="h-4 w-4" />
            Acceso seguro
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
                <FileText className="h-4 w-4" />
                Documento pendiente de firma
              </div>

              <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
                {solicitud.nombre_documento}
              </h1>

              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <UserRound className="h-4 w-4" />
                  <span>
                    Firmante:{" "}
                    <strong className="font-medium text-slate-900">
                      {solicitud.nombre_firmante || "Empleado"}
                    </strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4" />
                  Enlace temporal protegido
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start rounded-full bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 lg:self-auto">
              <CheckCircle2 className="h-4 w-4" />
              Listo para revisar
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-900">
              1. Revisa tu documento
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Verifica su contenido antes de continuar con la firma.
            </p>
          </div>

          {solicitud.documento_url ? (
            <iframe
              src={solicitud.documento_url}
              title={solicitud.nombre_documento}
              className="h-[65vh] min-h-[500px] w-full bg-slate-100"
            />
          ) : (
            <div className="flex min-h-[400px] items-center justify-center px-6 text-center">
              <p className="text-sm text-slate-600">
                El documento no está disponible para visualizarse.
              </p>
            </div>
          )}
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <div className="flex items-center gap-2">
                <FileSignature className="h-5 w-5 text-slate-700" />
                <h2 className="font-semibold text-slate-900">
                  2. Firma el documento
                </h2>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Dibuja tu firma dentro del recuadro.
              </p>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-300 bg-white">
              <canvas
                ref={canvasRef}
                className="h-52 w-full touch-none cursor-crosshair"
                onPointerDown={iniciarTrazo}
                onPointerMove={dibujar}
                onPointerUp={terminarTrazo}
                onPointerCancel={terminarTrazo}
              />
            </div>

            <button
              type="button"
              onClick={limpiarFirma}
              disabled={enviando}
              className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50"
            >
              <Eraser className="h-4 w-4" />
              Limpiar firma
            </button>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-slate-700" />
              <h2 className="font-semibold text-slate-900">
                3. Verifica tu identidad
              </h2>
            </div>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Para registrar evidencia de quién realiza la firma, necesitamos
              acceso temporal a tu cámara.
            </p>

            <div className="relative mt-4 overflow-hidden rounded-xl bg-slate-950">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={`aspect-video w-full object-cover ${
                  camaraActiva ? "block" : "invisible"
                }`}
              />

              {!camaraActiva && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-slate-400">
                    <Video className="mx-auto h-8 w-8" />
                    <p className="mt-2 text-xs">Cámara desactivada</p>
                  </div>
                </div>
              )}
            </div>

            {!camaraActiva && (
              <button
                type="button"
                onClick={activarCamara}
                disabled={enviando}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Camera className="h-4 w-4" />
                Habilitar cámara
              </button>
            )}

            {camaraActiva && (
              <div className="mt-3 flex items-center gap-2 text-xs font-medium text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Cámara lista. La evidencia se capturará al confirmar.
              </div>
            )}
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={consentimiento}
              onChange={(event) =>
                setConsentimiento(event.target.checked)
              }
              disabled={enviando}
              className="mt-1 h-4 w-4 rounded border-slate-300"
            />

            <span className="text-sm leading-6 text-slate-600">
              Confirmo que revisé el documento, que la firma dibujada me
              pertenece y autorizo la captura de una fotografía como evidencia
              asociada a este proceso de firma.
            </span>
          </label>

          {errorCamara && (
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorCamara}</span>
            </div>
          )}

          <button
            type="button"
            onClick={firmarDocumento}
            disabled={!puedeFirmar}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {enviando ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Registrando firma...
              </>
            ) : (
              <>
                <FileSignature className="h-4 w-4" />
                Firmar documento
              </>
            )}
          </button>

          <p className="mt-3 text-center text-xs leading-5 text-slate-500">
            La cámara se utiliza únicamente durante este proceso y se detiene
            después de capturar la evidencia.
          </p>
        </section>

        <p className="mx-auto mt-5 max-w-2xl text-center text-xs leading-5 text-slate-500">
          Este enlace es personal y temporal. No lo compartas con otras
          personas.
        </p>
      </div>
    </main>
  );
}
