"use client";

// Gráfica por día de «Salud del agente» (P7). Barras apiladas: turnos contestados (serie azul) y sin contestar (color de
// estado crítico, con su etiqueta en la leyenda: nunca solo color). Un eje, barras ≤ 24 px con esquina de 4 px arriba y
// cuadradas en la base, 2 px de superficie entre segmentos, rejilla tenue, tooltip al pasar o tocar y una tabla con los
// mismos datos (también para lector de pantalla). Paleta validada con dataviz/validate_palette (azul #2a78d6 y crítico
// #d03b3b contra la superficie clara). La app no tiene modo oscuro en estas pantallas.
import { useEffect, useMemo, useRef, useState } from "react";
import { datosGrafica, fechaCorta, fechaLarga } from "@/lib/whatsapp/salud.mjs";

const COLOR = { contestados: "#2a78d6", sin: "#d03b3b", superficie: "#ffffff", rejilla: "#e7e5e1", eje: "#6b6a66" };
const ALTO = 180;
const MARGEN = { arriba: 8, abajo: 24, izquierda: 32, derecha: 8 };

// Rectángulo con las esquinas de arriba redondeadas (4 px) y la base recta.
function barra(x, y, w, h, radio = 4) {
  if (h <= 0) return "";
  const r = Math.min(radio, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

// El tooltip se ancla del lado de la barra que tiene más espacio: nunca se sale de la pantalla (teléfono incluido).
const posicionTooltip = (pct) => (pct <= 50 ? { left: `${Math.max(0, pct - 4)}%` } : { right: `${Math.max(0, 100 - pct - 4)}%` });

export default function GraficaSalud({ serie }) {
  const { max, marcas, dias } = useMemo(() => datosGrafica(serie), [serie]);
  const [activo, setActivo] = useState(null);
  const caja = useRef(null);
  // Se dibuja al ancho real (en px): el texto del eje queda en 11 px en teléfono y en escritorio, sin escalarse.
  const [ancho, setAncho] = useState(640);
  useEffect(() => {
    const el = caja.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const medir = () => setAncho(Math.max(240, Math.round(el.clientWidth)));
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [dias.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps -- medir cuando aparece el contenedor
  const plotW = ancho - MARGEN.izquierda - MARGEN.derecha;
  const plotH = ALTO - MARGEN.arriba - MARGEN.abajo;
  const banda = dias.length ? plotW / dias.length : plotW;
  const w = Math.max(4, Math.min(24, banda * 0.6));
  const y = (v) => MARGEN.arriba + plotH - (v / max) * plotH;
  // Una etiqueta de fecha cada ~56 px para que no se encimen.
  const cadaEtiqueta = Math.max(1, Math.ceil(dias.length / Math.max(1, Math.floor(plotW / 56))));
  const d = activo != null ? dias[activo] : null;

  if (!dias.length) return null;
  return (
    <figure className="grid min-w-0 gap-2" data-grafica-salud>
      <figcaption className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[14px] font-bold text-gray-900">Turnos por día</span>
        <span className="flex flex-wrap items-center gap-3 text-[12.5px] text-gray-600" aria-hidden="true">
          <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: COLOR.contestados }} /> Contestados</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: COLOR.sin }} /> Sin contestar</span>
        </span>
      </figcaption>
      <div ref={caja} className="relative min-w-0" onMouseLeave={() => setActivo(null)}>
        <svg viewBox={`0 0 ${ancho} ${ALTO}`} width={ancho} height={ALTO} className="block max-w-full" role="img" aria-label="Gráfica de turnos contestados y sin contestar por día. Los datos están en la tabla de abajo.">
          {marcas.map((m) => (
            <g key={m}>
              <line x1={MARGEN.izquierda} x2={ancho - MARGEN.derecha} y1={y(m)} y2={y(m)} stroke={COLOR.rejilla} strokeWidth="1" />
              <text x={MARGEN.izquierda - 6} y={y(m) + 4} textAnchor="end" fontSize="11" fill={COLOR.eje}>{m}</text>
            </g>
          ))}
          {dias.map((dia, i) => {
            const x = MARGEN.izquierda + i * banda + (banda - w) / 2;
            const hC = (dia.contestados / max) * plotH;
            const hS = (dia.sin_contestar / max) * plotH;
            const base = MARGEN.arriba + plotH;
            // 2 px de superficie entre los dos segmentos (solo si hay ambos).
            const hueco = hC > 0 && hS > 0 ? 2 : 0;
            return (
              <g key={dia.fecha} opacity={activo == null || activo === i ? 1 : 0.45}>
                {hC > 0 ? <path d={hS > 0 ? `M${x},${base}V${base - hC}H${x + w}V${base}Z` : barra(x, base - hC, w, hC)} fill={COLOR.contestados} /> : null}
                {hS > 0 ? <path d={barra(x, base - hC - hS - hueco, w, hS)} fill={COLOR.sin} /> : null}
                {i % cadaEtiqueta === 0 ? <text x={x + w / 2} y={ALTO - 6} textAnchor="middle" fontSize="11" fill={COLOR.eje}>{fechaCorta(dia.fecha)}</text> : null}
                {/* Zona de toque de toda la banda (más grande que la barra). */}
                <rect x={MARGEN.izquierda + i * banda} y={MARGEN.arriba} width={banda} height={plotH} fill="transparent"
                  onMouseEnter={() => setActivo(i)} onClick={() => setActivo(activo === i ? null : i)} data-dia={dia.fecha} />
              </g>
            );
          })}
          <line x1={MARGEN.izquierda} x2={ancho - MARGEN.derecha} y1={MARGEN.arriba + plotH} y2={MARGEN.arriba + plotH} stroke={COLOR.eje} strokeWidth="1" />
        </svg>
        {d ? (
          <div role="status" data-tooltip-salud className="pointer-events-none absolute top-1 z-10 w-max max-w-[14rem] rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12.5px] shadow-lg"
            style={posicionTooltip(((MARGEN.izquierda + (activo + 0.5) * banda) / ancho) * 100)}>
            <p className="font-semibold text-gray-900 first-letter:uppercase">{fechaLarga(d.fecha)}</p>
            <p className="text-gray-700"><span className="mr-1.5 inline-block size-2 rounded-sm align-middle" style={{ background: COLOR.contestados }} />Contestados: <b className="tabular-nums">{d.contestados}</b></p>
            <p className="text-gray-700"><span className="mr-1.5 inline-block size-2 rounded-sm align-middle" style={{ background: COLOR.sin }} />Sin contestar: <b className="tabular-nums">{d.sin_contestar}</b></p>
          </div>
        ) : null}
      </div>
      <details className="text-[13px]">
        <summary className="inline-flex min-h-11 cursor-pointer items-center font-medium text-blue-700 md:min-h-8">Ver como tabla</summary>
        <div className="mt-1 max-h-64 overflow-auto rounded-lg border border-gray-200">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-gray-50 text-gray-600"><tr><th className="px-3 py-2 font-medium">Día</th><th className="px-3 py-2 text-right font-medium">Contestados</th><th className="px-3 py-2 text-right font-medium">Sin contestar</th></tr></thead>
            <tbody>
              {dias.map((dia) => (
                <tr key={dia.fecha} className="border-t border-gray-100">
                  <td className="px-3 py-1.5 first-letter:uppercase">{fechaLarga(dia.fecha)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{dia.contestados}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{dia.sin_contestar}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
