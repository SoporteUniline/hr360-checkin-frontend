"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
} from "lucide-react";
import styles from "./firma.module.css";

export default function DocumentoReader({ url, nombre, onReady }) {
  const viewportRef = useRef(null);
  const canvasRef = useRef(null);
  const expandButtonRef = useRef(null);
  const readerRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [ancho, setAncho] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [ampliado, setAmpliado] = useState(false);
  const [texto, setTexto] = useState("");
  const [intento, setIntento] = useState(0);
  const [abiertoExterno, setAbiertoExterno] = useState(false);

  useEffect(() => {
    let activo = true;
    let loadingTask;
    setCargando(true);
    setError(false);
    setPdfDoc(null);
    setPagina(1);
    setAbiertoExterno(false);
    onReady(false);
    async function cargar() {
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.min.mjs");
        if (!activo) return;
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
          import.meta.url
        ).toString();
        loadingTask = pdfjs.getDocument({ url, isEvalSupported: false });
        const pdf = await loadingTask.promise;
        if (activo) setPdfDoc(pdf);
      } catch {
        if (activo) {
          setError(true);
          setCargando(false);
        }
      }
    }
    cargar();
    return () => {
      activo = false;
      loadingTask?.destroy();
    };
  }, [url, intento, onReady]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    let frame = null;

    const resize = () => {
      if (frame) cancelAnimationFrame(frame);

      frame = requestAnimationFrame(() => {
        const css = getComputedStyle(viewport);
        const nuevoAncho = Math.min(
          1000,
          Math.floor(
            viewport.clientWidth -
              parseFloat(css.paddingLeft) -
              parseFloat(css.paddingRight)
          )
        );

        if (nuevoAncho <= 0) return;

        setAncho((anterior) =>
          Math.abs(anterior - nuevoAncho) >= 2 ? nuevoAncho : anterior
        );
      });
    };

    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(viewport);

    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [error]);

  useEffect(() => {
    if (!pdfDoc || !ancho || error) return;
    let activo = true;
    let renderTask;
    setCargando(true);
    async function renderizar() {
      try {
        const page = await pdfDoc.getPage(pagina);
        if (!activo) return;
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({
          scale: (ancho / base.width) * zoom,
        });
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        // Render offscreen: a quick zoom/page change never reuses an active PDF.js canvas.
        const buffer = document.createElement("canvas");
        buffer.width = Math.ceil(viewport.width * dpr);
        buffer.height = Math.ceil(viewport.height * dpr);
        renderTask = page.render({
          canvasContext: buffer.getContext("2d"),
          viewport,
          transform: [dpr, 0, 0, dpr, 0, 0],
        });
        await renderTask.promise;
        if (!activo || !canvasRef.current) return;
        const canvas = canvasRef.current;
        canvas.width = buffer.width;
        canvas.height = buffer.height;
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        canvas.getContext("2d").drawImage(buffer, 0, 0);
        setCargando(false);
        onReady(true);
        const content = await page.getTextContent();
        if (activo) setTexto(content.items.map((item) => item.str).join(" "));
      } catch (err) {
        if (activo && err?.name !== "RenderingCancelledException") {
          setError(true);
          setCargando(false);
          onReady(false);
        }
      }
    }
    renderizar();
    return () => {
      activo = false;
      renderTask?.cancel();
    };
  }, [pdfDoc, pagina, ancho, zoom, onReady, error]);

  useEffect(() => {
    if (!ampliado) return;
    const previousOverflow = document.body.style.overflow;
    const expandButton = expandButtonRef.current;
    document.body.style.overflow = "hidden";
    expandButton?.focus();
    const handleKey = (event) => {
      if (event.key === "Escape") setAmpliado(false);
      if (event.key === "Tab") {
        const items = [
          ...readerRef.current.querySelectorAll(
            "button:not(:disabled), a[href], [tabindex='0']"
          ),
        ];
        const first = items[0];
        const last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKey);
      expandButton?.focus();
    };
  }, [ampliado]);

  const cambiarPagina = (numero) => {
    setPagina(numero);
    viewportRef.current?.scrollTo({ top: 0, left: 0 });
  };

  return (
    <div
      ref={readerRef}
      className={`${styles.reader} ${ampliado ? styles.readerExpanded : ""}`}
      role={ampliado ? "dialog" : "region"}
      aria-modal={ampliado || undefined}
      aria-label={`Documento: ${nombre}`}
    >
      <div className={styles.readerToolbar}>
        <div className={styles.readerTools}>
          <button
            type="button"
            aria-label="Página anterior"
            disabled={!pdfDoc || pagina === 1}
            onClick={() => cambiarPagina(pagina - 1)}
          >
            <ChevronLeft size={17} />
          </button>
          <span
            aria-live="polite"
            aria-label={`Página ${pagina} de ${pdfDoc?.numPages || 0}`}
          >
            {pagina} / {pdfDoc?.numPages || "—"}
          </span>
          <button
            type="button"
            aria-label="Página siguiente"
            disabled={!pdfDoc || pagina >= pdfDoc.numPages}
            onClick={() => cambiarPagina(pagina + 1)}
          >
            <ChevronRight size={17} />
          </button>
        </div>
        <div className={styles.readerTools}>
          <button
            type="button"
            aria-label="Reducir documento"
            disabled={!pdfDoc || zoom <= 1}
            onClick={() => setZoom((value) => Math.max(1, value - 0.25))}
          >
            <Minus size={15} />
          </button>
          <button
            type="button"
            title="Ajustar al ancho"
            aria-label="Ajustar documento al ancho"
            disabled={!pdfDoc}
            onClick={() => setZoom(1)}
          >
            <span>{Math.round(zoom * 100)}%</span>
          </button>
          <button
            type="button"
            aria-label="Ampliar documento"
            disabled={!pdfDoc || zoom >= 2.5}
            onClick={() => setZoom((value) => Math.min(2.5, value + 0.25))}
          >
            <Plus size={15} />
          </button>
          <button
            ref={expandButtonRef}
            type="button"
            aria-label={
              ampliado ? "Cerrar pantalla completa" : "Ver en pantalla completa"
            }
            onClick={() => setAmpliado((value) => !value)}
          >
            {ampliado ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Abrir PDF original en otra pestaña"
          >
            <ExternalLink size={15} />
          </a>
        </div>
      </div>
      {error ? (
        <div className={styles.readerError} role="status">
          <AlertCircle size={24} />
          <p>
            No pudimos mostrar la vista previa.
            <br />
            Puedes leer el PDF en otra pestaña.
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setAbiertoExterno(true)}
          >
            Abrir documento completo
            <ExternalLink size={15} />
          </a>
          {abiertoExterno && (
            <label
              className={styles.consent}
              style={{ marginTop: 20, textAlign: "left" }}
            >
              <input
                type="checkbox"
                onChange={(event) => onReady(event.target.checked)}
              />
              <span>Ya pude abrir y revisar el documento completo.</span>
            </label>
          )}
          <button
            type="button"
            onClick={() => setIntento((value) => value + 1)}
          >
            Reintentar vista previa
          </button>
        </div>
      ) : (
        <div
          ref={viewportRef}
          className={styles.readerViewport}
          tabIndex={0}
          aria-label="Vista del PDF. Puedes desplazarte para leer el documento ampliado."
          aria-busy={cargando}
        >
          {cargando && (
            <div className={styles.readerLoading} role="status">
              <Loader2 className={styles.spin} size={18} />
              Cargando página…
            </div>
          )}
          <div
            className={styles.pdfPaper}
            style={{
              width: "max-content",
              display: cargando ? "none" : "block",
            }}
          >
            <canvas ref={canvasRef} aria-hidden="true" />
            <p className={styles.srOnly}>{texto}</p>
          </div>
        </div>
      )}
    </div>
  );
}
