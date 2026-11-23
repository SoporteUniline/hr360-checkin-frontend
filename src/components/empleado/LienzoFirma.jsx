"use client";

// Lienzo para dibujar la firma con el dedo o el mouse (Mi espacio → Mi firma y PIN, 22/11/2026).
// Guarda los trazos en coordenadas relativas: al girar el teléfono o cambiar el tamaño se vuelve a pintar igual.
// ref expone: aPng() → Blob PNG, borrar().
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";

const LienzoFirma = forwardRef(function LienzoFirma({ onCambio, deshabilitado, etiqueta = "Dibuja tu firma con el dedo o el mouse" }, ref) {
  const canvasRef = useRef(null);
  const trazos = useRef([]);
  const dibujando = useRef(null);

  const pintar = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const { width, height } = c.getBoundingClientRect();
    if (!width || !height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    c.width = Math.round(width * dpr);
    c.height = Math.round(height * dpr);
    const ctx = c.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "#172554";
    ctx.lineWidth = 2.3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const t of trazos.current) {
      if (t.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(t[0].x * width, t[0].y * height);
      t.slice(1).forEach((p) => ctx.lineTo(p.x * width, p.y * height));
      ctx.stroke();
    }
  }, []);

  useEffect(() => {
    pintar();
    const o = new ResizeObserver(pintar);
    if (canvasRef.current) o.observe(canvasRef.current);
    return () => o.disconnect();
  }, [pintar]);

  useImperativeHandle(ref, () => ({
    aPng: () => new Promise((resolve, reject) => canvasRef.current.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo generar la imagen."))), "image/png")),
    borrar: () => { trazos.current = []; dibujando.current = null; pintar(); onCambio?.(false); },
  }), [pintar, onCambio]);

  const punto = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };

  return (
    <div className="relative h-44 w-full overflow-hidden rounded-xl border border-slate-300 bg-white">
      <canvas
        ref={canvasRef}
        aria-label={etiqueta}
        className="size-full touch-none"
        onPointerDown={(e) => {
          if (deshabilitado || !e.isPrimary || (e.pointerType === "mouse" && e.button !== 0)) return;
          e.preventDefault();
          canvasRef.current.setPointerCapture(e.pointerId);
          dibujando.current = e.pointerId;
          trazos.current.push([punto(e)]);
        }}
        onPointerMove={(e) => {
          if (dibujando.current !== e.pointerId) return;
          e.preventDefault();
          const t = trazos.current.at(-1);
          const p = punto(e);
          const u = t.at(-1);
          if (Math.hypot(p.x - u.x, p.y - u.y) < 0.002) return;
          t.push(p);
          onCambio?.(true);
          pintar();
        }}
        onPointerUp={(e) => { if (dibujando.current === e.pointerId) dibujando.current = null; }}
        onPointerCancel={() => { dibujando.current = null; }}
      />
      <span className="pointer-events-none absolute inset-x-6 bottom-9 border-t border-dashed border-slate-300" />
    </div>
  );
});

export default LienzoFirma;
