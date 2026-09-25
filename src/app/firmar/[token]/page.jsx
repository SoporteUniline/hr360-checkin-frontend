"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  Eraser,
  FileCheck2,
  FileSignature,
  FileText,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { firmaDigitalApi } from "@/lib/firmaDigitalApi";
import styles from "./firma.module.css";

const DocumentoReader = dynamic(() => import("./DocumentoReader"), {
  ssr: false,
  loading: () => (
    <div className={styles.readerLoading}>
      <Loader2 className={styles.spin} />
      Preparando el documento…
    </div>
  ),
});

const PASOS = [
  { titulo: "Cámara", descripcion: "Prepara tu fotografía", icono: Camera },
  { titulo: "Documento", descripcion: "Revisa cada detalle", icono: FileText },
  { titulo: "Firma", descripcion: "Confirma y termina", icono: FileSignature },
];
const TITULOS = [
  "Comencemos con tu cámara",
  "Revisa tu documento",
  "Tu firma, el último paso",
];
const DESCRIPCIONES = [
  "Al terminar tomaremos una fotografía como evidencia de tu firma.",
  "Lee con calma. Puedes ampliar el texto y recorrer todas las páginas.",
  "Dibuja tu firma como aparece en tus documentos.",
];

function Marca() {
  return (
    <span className={styles.logoFrame}>
      <Image
        src="/assets/adamia.png"
        alt="ADAMIA"
        width={2160}
        height={1000}
        priority
        className={styles.logo}
      />
    </span>
  );
}

function EstadoFinal({ titulo, mensaje, exito = false, children }) {
  const Icono = exito ? CheckCircle2 : AlertCircle;
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Marca />
          <span className={styles.headerLabel}>Firma de documentos</span>
        </div>
      </header>
      <div className={styles.resultWrap}>
        <div className={styles.resultCard}>
          <span
            className={`${styles.resultIcon} ${
              exito ? styles.resultSuccess : styles.resultError
            }`}
          >
            <Icono size={32} />
          </span>
          <h1>{titulo}</h1>
          <p>{mensaje}</p>
          {children}
        </div>
      </div>
    </main>
  );
}

export default function FirmarDocumentoPage({ params }) {
  const { token } = use(params);
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const cameraRequestRef = useRef(0);
  const mountedRef = useRef(false);
  const strokesRef = useRef([]);
  const drawingRef = useRef(null);
  const headingRef = useRef(null);
  const [solicitud, setSolicitud] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [paso, setPaso] = useState(0);
  const [ultimoPaso, setUltimoPaso] = useState(0);
  const [consentimiento, setConsentimiento] = useState(false);
  const [tieneFirma, setTieneFirma] = useState(false);
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [activandoCamara, setActivandoCamara] = useState(false);
  const [errorCamara, setErrorCamara] = useState("");
  const [errorEnvio, setErrorEnvio] = useState("");
  const [documentoListo, setDocumentoListo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [firmado, setFirmado] = useState(false);

  const detenerCamara = useCallback(() => {
    cameraRequestRef.current += 1;
    const stream = streamRef.current;
    streamRef.current = null;
    stream?.getTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    });
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamaraActiva(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    let activo = true;
    async function cargarSolicitud() {
      try {
        setCargando(true);
        setError(null);
        const data = await firmaDigitalApi.obtenerSolicitudPublica(token);
        if (activo) setSolicitud(data.solicitud);
      } catch (err) {
        if (!activo) return;
        const estados = {
          404: [
            "Enlace no válido",
            "No encontramos una solicitud de firma asociada a este enlace.",
          ],
          410: [
            "Este enlace ya no está disponible",
            "La solicitud de firma expiró o fue cancelada.",
          ],
          409: [
            "Documento ya firmado",
            "Este documento ya fue firmado y el enlace no puede volver a utilizarse.",
          ],
        };
        const [titulo, mensaje] = estados[err?.response?.status] || [
          "No pudimos cargar el documento",
          "Intenta abrir el enlace nuevamente en unos momentos.",
        ];
        setError({ titulo, mensaje: err?.response?.data?.error || mensaje });
      } finally {
        if (activo) setCargando(false);
      }
    }
    if (token) cargarSolicitud();
    return () => {
      activo = false;
      mountedRef.current = false;
      cameraRequestRef.current += 1;
      streamRef.current?.getTracks().forEach((track) => {
        track.onended = null;
        track.stop();
      });
      streamRef.current = null;
    };
  }, [token]);

  // Store strokes in relative coordinates so rotation and step navigation preserve the signature.
  const repintarFirma = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "#172554";
    ctx.lineWidth = 2.3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const trazo of strokesRef.current) {
      if (trazo.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(trazo[0].x * width, trazo[0].y * height);
      trazo
        .slice(1)
        .forEach((punto) => ctx.lineTo(punto.x * width, punto.y * height));
      ctx.stroke();
    }
  }, []);

  useEffect(() => {
    if (paso !== 2 || !solicitud || firmado) return;
    repintarFirma();
    const observer = new ResizeObserver(repintarFirma);
    if (canvasRef.current) observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, [paso, solicitud, firmado, repintarFirma]);

  const cambiarPaso = (siguiente) => {
    if (enviando || siguiente > ultimoPaso + 1) return;
    if (siguiente > 0 && !camaraActiva) return;
    if (siguiente === 2 && !documentoListo) return;
    drawingRef.current = null;
    setPaso(siguiente);
    setUltimoPaso((anterior) => Math.max(anterior, siguiente));
    requestAnimationFrame(() => {
      headingRef.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "instant" });
    });
  };

  const obtenerPunto = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    };
  };
  const iniciarTrazo = (event) => {
    if (
      enviando ||
      !event.isPrimary ||
      (event.pointerType === "mouse" && event.button !== 0)
    )
      return;
    event.preventDefault();
    canvasRef.current.setPointerCapture(event.pointerId);
    drawingRef.current = event.pointerId;
    strokesRef.current.push([obtenerPunto(event)]);
  };
  const dibujar = (event) => {
    if (drawingRef.current !== event.pointerId || enviando) return;
    event.preventDefault();
    const trazo = strokesRef.current.at(-1);
    const punto = obtenerPunto(event);
    const ultimo = trazo.at(-1);
    if (Math.hypot(punto.x - ultimo.x, punto.y - ultimo.y) < 0.002) return;
    trazo.push(punto);
    setTieneFirma(true);
    repintarFirma();
  };
  const terminarTrazo = (event) => {
    if (drawingRef.current !== event.pointerId) return;
    if (canvasRef.current?.hasPointerCapture(event.pointerId))
      canvasRef.current.releasePointerCapture(event.pointerId);
    drawingRef.current = null;
  };
  const limpiarFirma = () => {
    strokesRef.current = [];
    drawingRef.current = null;
    setTieneFirma(false);
    repintarFirma();
  };

  const activarCamara = async () => {
    if (activandoCamara || enviando) return;
    detenerCamara();
    const requestId = cameraRequestRef.current;
    setActivandoCamara(true);
    setErrorCamara("");
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error("CAMARA_NO_DISPONIBLE");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      if (!mountedRef.current || requestId !== cameraRequestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("CAMARA_NO_DISPONIBLE");
      video.srcObject = stream;
      await video.play();
      if (!mountedRef.current || requestId !== cameraRequestRef.current) return;
      stream.getVideoTracks().forEach((track) => {
        track.onended = () => {
          detenerCamara();
          setErrorCamara(
            "La cámara se desconectó. Actívala nuevamente para continuar."
          );
        };
      });
      setCamaraActiva(true);
    } catch (err) {
      if (!mountedRef.current || requestId !== cameraRequestRef.current) return;
      detenerCamara();
      setErrorCamara(
        ["NotAllowedError", "PermissionDeniedError"].includes(err?.name)
          ? "Permite el acceso a la cámara en tu navegador y vuelve a intentarlo. Si abriste el enlace dentro de otra app, ábrelo en Safari o Chrome."
          : "No pudimos iniciar la cámara. Revisa que esté disponible y vuelve a intentarlo."
      );
    } finally {
      if (mountedRef.current) setActivandoCamara(false);
    }
  };

  const canvasABlob = (canvas, tipo, calidad) =>
    new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(new Error("No fue posible generar la imagen.")),
        tipo,
        calidad
      );
    });
  const firmarDocumento = async () => {
    if (
      !consentimiento ||
      !tieneFirma ||
      !camaraActiva ||
      !documentoListo ||
      !solicitud?.documento_url ||
      enviando
    )
      return;
    try {
      setEnviando(true);
      setErrorEnvio("");
      const video = videoRef.current;
      if (
        !video ||
        video.readyState < 2 ||
        !video.videoWidth ||
        !streamRef.current
          ?.getVideoTracks()
          .some((track) => track.readyState === "live")
      ) {
        throw new Error(
          "La cámara no está lista. Actívala nuevamente antes de firmar."
        );
      }
      const firma = await canvasABlob(canvasRef.current, "image/png");
      const foto = document.createElement("canvas");
      foto.width = video.videoWidth;
      foto.height = video.videoHeight;
      foto.getContext("2d").drawImage(video, 0, 0);
      const evidencia = await canvasABlob(foto, "image/jpeg", 0.88);
      detenerCamara();
      await firmaDigitalApi.firmarSolicitud(token, { firma, evidencia });
      setFirmado(true);
    } catch (err) {
      detenerCamara();
      setErrorEnvio(
        err?.response?.data?.error ||
          err?.message ||
          "No fue posible completar la firma. Intenta nuevamente."
      );
    } finally {
      setEnviando(false);
    }
  };

  if (cargando)
    return (
      <EstadoFinal
        titulo="Preparando tu documento"
        mensaje="En un momento podrás comenzar."
      >
        <Loader2 className={styles.spin} />
      </EstadoFinal>
    );
  if (error)
    return <EstadoFinal titulo={error.titulo} mensaje={error.mensaje} />;
  if (!solicitud)
    return (
      <EstadoFinal
        titulo="Documento no disponible"
        mensaje="No fue posible obtener la información de esta solicitud."
      />
    );
  if (firmado)
    return (
      <EstadoFinal
        exito
        titulo="Tu documento está firmado"
        mensaje="La firma y la fotografía se registraron correctamente. Ya puedes cerrar esta ventana."
      >
        <div className={styles.signedDocument}>
          <FileCheck2 />
          <span>{solicitud.nombre_documento}</span>
          <CheckCircle2 size={18} />
        </div>
        <span className={styles.privateNote}>
          <LockKeyhole size={14} />
          Proceso completado
        </span>
      </EstadoFinal>
    );

  const nombre = solicitud.nombre_firmante || "Empleado";
  const puedeFirmar =
    consentimiento && tieneFirma && camaraActiva && documentoListo && !enviando;
  const puedeContinuar =
    paso === 0
      ? !activandoCamara
      : paso === 1
      ? documentoListo && camaraActiva
      : puedeFirmar;
  const accionPrincipal =
    paso === 0
      ? camaraActiva
        ? () => cambiarPaso(1)
        : activarCamara
      : paso === 1
      ? () => cambiarPaso(2)
      : firmarDocumento;
  const textoAccion = activandoCamara
    ? "Activando cámara…"
    : enviando
    ? "Registrando firma…"
    : paso === 0
    ? camaraActiva
      ? "Ver documento"
      : "Activar cámara"
    : paso === 1
    ? "Continuar a la firma"
    : "Firmar documento";

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Marca />
          <span className={styles.headerLabel}>
            <LockKeyhole size={14} />
            Firma de documentos
          </span>
        </div>
      </header>
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.introduction}>
            <span className={styles.eyebrow}>
              UN ÚLTIMO PASO PARA COMPLETARLO
            </span>
            <h1>
              Revisa.
              <br />
              Firma.
              <br />
              <span>Listo.</span>
            </h1>
            <p>
              Tu documento, sin impresiones
              <br className={styles.desktopOnly} /> y desde donde estés.
            </p>
          </div>
          <nav aria-label="Pasos para firmar" className={styles.steps}>
            {PASOS.map(({ titulo, descripcion }, index) => (
              <button
                key={titulo}
                type="button"
                onClick={() => cambiarPaso(index)}
                disabled={
                  enviando ||
                  index > ultimoPaso ||
                  (index > 0 && !camaraActiva) ||
                  (index === 2 && !documentoListo)
                }
                aria-current={paso === index ? "step" : undefined}
                className={`${styles.step} ${
                  paso === index ? styles.stepActive : ""
                } ${index < paso ? styles.stepDone : ""}`}
              >
                <span className={styles.stepNumber}>
                  {index < paso ? <Check size={16} /> : `0${index + 1}`}
                </span>
                <span>
                  <strong>{titulo}</strong>
                  <small>{descripcion}</small>
                </span>
              </button>
            ))}
          </nav>
          <div className={styles.recipient}>
            <span className={styles.recipientIcon}>
              <UserRound size={18} />
            </span>
            <div>
              <small>DOCUMENTO PARA</small>
              <strong>{nombre}</strong>
            </div>
          </div>
          <p className={styles.sidebarNote}>
            <ShieldCheck size={17} />
            <span>
              Este enlace es personal.
              <br />
              No lo compartas con otras personas.
            </span>
          </p>
        </aside>

        <section className={styles.stage} aria-labelledby="paso-titulo">
          <div className={styles.stageHeading}>
            <div className={styles.stageTopline}>
              <span className={styles.eyebrow}>PASO {paso + 1} DE 3</span>
              {camaraActiva && (
                <span className={styles.liveBadge}>
                  <span />
                  Cámara activa
                </span>
              )}
            </div>
            <h2 ref={headingRef} tabIndex={-1} id="paso-titulo">
              {TITULOS[paso]}
            </h2>
            <p>{DESCRIPCIONES[paso]}</p>
          </div>

          {/* The same video stays mounted and playing throughout the three steps. */}
          <div
            className={styles.cameraStage}
            aria-hidden={paso !== 0}
            style={
              paso === 0
                ? undefined
                : {
                    position: "fixed",
                    width: "1px",
                    height: "1px",
                    overflow: "hidden",
                    opacity: 0,
                    pointerEvents: "none",
                    left: "-10000px",
                    top: 0,
                  }
            }
          >
            <div
              className={`${styles.cameraPreview} ${
                camaraActiva ? styles.cameraPreviewLive : ""
              }`}
            >
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                aria-label="Vista previa de tu cámara"
                className={camaraActiva ? styles.video : styles.videoHidden}
              />
              {camaraActiva ? (
                <>
                  <div className={styles.faceGuide} />
                  <span className={styles.cameraCaption}>
                    <span />
                    Cámara lista
                  </span>
                </>
              ) : (
                <div className={styles.cameraPlaceholder}>
                  <span className={styles.cameraIllustration}>
                    <UserRound strokeWidth={1.2} size={66} />
                    <span className={styles.cameraIllustrationBadge}>
                      <Camera size={18} />
                    </span>
                  </span>
                  <strong>Coloca tu rostro dentro del recuadro</strong>
                  <p>Busca un lugar con buena iluminación.</p>
                </div>
              )}
            </div>
            <div className={styles.cameraExplanation}>
              <ShieldCheck size={20} />
              <p>
                <strong>Solo una fotografía. Sin grabar audio ni video.</strong>
                <span>
                  Se tomará cuando pulses “Firmar documento”. La cámara
                  permanecerá activa mientras revisas.
                </span>
              </p>
            </div>
          </div>

          {paso === 1 && (
            <div className={styles.documentStage}>
              <div className={styles.documentName}>
                <FileText size={18} />
                <span>{solicitud.nombre_documento}</span>
              </div>
              {solicitud.documento_url ? (
                <DocumentoReader
                  url={solicitud.documento_url}
                  nombre={solicitud.nombre_documento}
                  onReady={setDocumentoListo}
                />
              ) : (
                <div className={styles.inlineError} role="alert">
                  <AlertCircle size={20} />
                  <span>
                    El documento no está disponible. Solicita un nuevo enlace
                    antes de firmar.
                  </span>
                </div>
              )}
              <p className={styles.readHint}>
                Comprueba tus datos y el contenido antes de continuar.
              </p>
            </div>
          )}

          {paso === 2 && (
            <div className={styles.signatureStage}>
              <div className={styles.signingFor}>
                <FileText size={20} />
                <div>
                  <small>VAS A FIRMAR</small>
                  <strong>{solicitud.nombre_documento}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => cambiarPaso(1)}
                  disabled={enviando}
                >
                  Revisar
                </button>
              </div>
              <div className={styles.signatureLabel}>
                <label htmlFor="firma-manuscrita">Tu firma</label>
                <button
                  type="button"
                  onClick={limpiarFirma}
                  disabled={!tieneFirma || enviando}
                >
                  <Eraser size={15} />
                  Borrar
                </button>
              </div>
              <div className={styles.signatureBox}>
                <canvas
                  id="firma-manuscrita"
                  ref={canvasRef}
                  aria-label="Dibuja tu firma con el dedo o el mouse"
                  onPointerDown={iniciarTrazo}
                  onPointerMove={dibujar}
                  onPointerUp={terminarTrazo}
                  onPointerCancel={terminarTrazo}
                  onLostPointerCapture={() => {
                    drawingRef.current = null;
                  }}
                />
                {!tieneFirma && (
                  <span className={styles.signaturePlaceholder}>
                    <FileSignature size={27} strokeWidth={1.4} />
                    Firma aquí con tu dedo o mouse
                  </span>
                )}
                <span className={styles.signatureLine} />
              </div>
              <span className={styles.signatureOwner}>{nombre}</span>
              <label className={styles.consent}>
                <input
                  type="checkbox"
                  checked={consentimiento}
                  onChange={(event) => setConsentimiento(event.target.checked)}
                  disabled={enviando}
                />
                <span>
                  Confirmo que revisé el documento, que la firma me pertenece y
                  autorizo una fotografía como evidencia de este proceso.
                </span>
              </label>
              <div className={styles.photoReminder}>
                <Camera size={18} />
                <span>
                  Mira a la cámara al confirmar. Tu fotografía se tomará en ese
                  momento.
                </span>
              </div>
            </div>
          )}

          {(errorCamara || errorEnvio) && (
            <div className={styles.inlineError} role="alert">
              <AlertCircle size={19} />
              <span>{errorEnvio || errorCamara}</span>
            </div>
          )}
          {paso > 0 && !camaraActiva && !enviando && (
            <button
              type="button"
              className={styles.reactivate}
              onClick={activarCamara}
              disabled={activandoCamara}
            >
              <Camera size={17} />
              {activandoCamara
                ? "Activando cámara…"
                : "Reactivar cámara para continuar"}
            </button>
          )}

          <div className={styles.actions}>
            <div className={styles.actionCopy}>
              <LockKeyhole size={14} />
              <span>
                {paso === 0
                  ? "Tú decides cuándo firmar"
                  : paso === 1
                  ? "Aún no has firmado"
                  : "Firma y fotografía en un solo paso"}
              </span>
            </div>
            <div className={styles.actionButtons}>
              {paso > 0 && (
                <button
                  type="button"
                  className={styles.backButton}
                  onClick={() => cambiarPaso(paso - 1)}
                  disabled={enviando}
                  aria-label="Volver al paso anterior"
                >
                  <ArrowLeft size={19} />
                  <span>Anterior</span>
                </button>
              )}
              <button
                type="button"
                className={styles.primaryButton}
                onClick={accionPrincipal}
                disabled={!puedeContinuar || enviando}
              >
                {activandoCamara || enviando ? (
                  <Loader2 size={18} className={styles.spin} />
                ) : paso === 0 && !camaraActiva ? (
                  <Camera size={18} />
                ) : paso === 2 ? (
                  <FileSignature size={18} />
                ) : null}
                {textoAccion}
                {paso < 2 &&
                  !activandoCamara &&
                  (paso !== 0 || camaraActiva) && <ArrowRight size={18} />}
              </button>
            </div>
          </div>
        </section>
      </div>
      <footer className={styles.footer}>
        ADAMIA
        <span />
        Personas, procesos y confianza.
      </footer>
    </main>
  );
}
