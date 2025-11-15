"use client";

// Gráfico semanal interactivo (SVG puro)
// Props: data: Array<{ fecha: 'YYYY-MM-DD', asistencias: number, tardanzas: number }>

import { useMemo, useState } from "react";

export default function WeeklyTrend({ data = [] }) {
  const [hoverIdx, setHoverIdx] = useState(null);

  const computed = useMemo(() => {
    const maxValRaw = Math.max(
      1,
      ...data.map((d) =>
        Math.max(
          d.asistencias || 0,
          d.tardanzas || 0,
          d.ausentes || 0,
          d.permisos || 0
        )
      )
    );
    const rough = maxValRaw / 5;
    const pow10 = Math.pow(10, Math.floor(Math.log10(Math.max(1, rough))));
    let step = pow10;
    if (rough / pow10 > 5) step = 10 * pow10; else if (rough / pow10 > 2) step = 5 * pow10; else if (rough / pow10 > 1) step = 2 * pow10; else step = 1 * pow10;
    const paddedMax = maxValRaw + 5;
    const yMax = Math.max(step, Math.ceil(paddedMax / step) * step);
    const W = 720; const H = 180; const P = 52;
    const n = data.length || 1;
    const stepX = n > 1 ? (W - 2 * P) / (n - 1) : 0;
    const scaleY = (v) => H - (v / yMax) * (H - 8);
    const pointsA = data.map((d, i) => [P + i * stepX, scaleY(d.asistencias || 0)]); // Asistencias (Presente)
    const pointsT = data.map((d, i) => [P + i * stepX, scaleY(d.tardanzas || 0)]);   // Tardanzas
    const pointsAus = data.map((d, i) => [P + i * stepX, scaleY(d.ausentes || 0)]);  // Ausentes
    const pointsPerm = data.map((d, i) => [P + i * stepX, scaleY(d.permisos || 0)]); // Permisos (excluye Vacaciones)
    const tickValues = []; tickValues.push(1); for (let v = step; v <= yMax; v += step) tickValues.push(v);
    const yTicks = tickValues.filter((v, i, arr) => i === 0 || v !== arr[i - 1]).map((v) => ({ value: v, y: scaleY(v) }));
    return { W, H, P, stepX, scaleY, pointsA, pointsT, pointsAus, pointsPerm, yTicks };
  }, [data]);

  const dayLabel = (ymd) => {
    // Interpretar YMD como fecha "literal" en UTC para evitar desfaces.
    const d = new Date(ymd + "T00:00:00Z");
    const wd = d.toLocaleDateString("es-MX", { weekday: "long", timeZone: "UTC" });
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${wd} ${day}`;
  };
  const dayNumber = (ymd) => String(new Date(ymd + "T00:00:00Z").getUTCDate());

  const getIdxFromEvent = (evt) => {
    const target = evt.currentTarget;
    const rect = target.getBoundingClientRect();
    const clientX = evt.clientX ?? (evt.touches && evt.touches[0]?.clientX) ?? 0;
    const xPx = clientX - rect.left;
    const xView = (xPx / rect.width) * computed.W;
    const { P, stepX } = computed;
    const xClamped = Math.max(P, Math.min(xView, computed.W - P));
    const idx = Math.round((xClamped - P) / stepX);
    return idx;
  };
  const onPointerMove = (evt) => {
    const idx = getIdxFromEvent(evt);
    if (idx >= 0 && idx < data.length) setHoverIdx(idx);
  };
  const onPointerDown = (evt) => {
    const idx = getIdxFromEvent(evt);
    if (idx >= 0 && idx < data.length) setHoverIdx(idx);
  };
  const onPointerLeave = () => setHoverIdx(null);

  const active = hoverIdx != null ? data[hoverIdx] : null;
  const xActive = hoverIdx != null ? computed.P + hoverIdx * computed.stepX : null;
  const yActiveA = hoverIdx != null ? computed.pointsA[hoverIdx][1] : null;
  const yActiveT = hoverIdx != null ? computed.pointsT[hoverIdx][1] : null;
  const yActiveAus = hoverIdx != null ? computed.pointsAus[hoverIdx][1] : null;
  const yActivePerm = hoverIdx != null ? computed.pointsPerm[hoverIdx][1] : null;

  const toSmoothPath = (pts) => {
    if (pts.length <= 2) return `M ${pts.map(p => p.join(',')).join(' L ')}`;
    const tension = 0.2;
    let d = `M ${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = i > 0 ? pts[i - 1] : pts[0];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = i !== pts.length - 2 ? pts[i + 2] : p2;
      const cp1x = p1[0] + (p2[0] - p0[0]) * tension;
      const cp1y = p1[1] + (p2[1] - p0[1]) * tension;
      const cp2x = p2[0] - (p3[0] - p1[0]) * tension;
      const cp2y = p2[1] - (p3[1] - p1[1]) * tension;
      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`;
    }
    return d;
  };

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${computed.W} ${computed.H + 56}`}
        className="w-full h-72 sm:h-64"
        onPointerMove={onPointerMove}
        onPointerDown={onPointerDown}
        onPointerLeave={onPointerLeave}
        style={{ touchAction: "pan-x" }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="fillAsist" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.06" />
          </linearGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.15" />
          </filter>
        </defs>

        {computed.yTicks.map((t, i) => (
          <line key={`gy-${i}`} x1={computed.P} x2={computed.W - computed.P} y1={t.y} y2={t.y} stroke="#e5e7eb" />
        ))}
        <line x1={computed.P} x2={computed.W - computed.P} y1={computed.H} y2={computed.H} stroke="#cbd5e1" />
        {data.map((_, i) => (
          <line key={`gx-${i}`} x1={computed.P + i * computed.stepX} x2={computed.P + i * computed.stepX} y1={0} y2={computed.H} stroke="#f1f5f9" />
        ))}
        {computed.yTicks.map((t, i) => (
          <text key={`yl-${i}`} x={computed.P - 8} y={t.y + 4} textAnchor="end" fontSize="10" className="fill-zinc-500">
            {t.value}
          </text>
        ))}

        {/* Asistencias - emerald */}
        <path d={`${toSmoothPath(computed.pointsA)} L ${computed.P + (data.length - 1) * computed.stepX},${computed.H} L ${computed.P},${computed.H} Z`} fill="url(#fillAsist)" />
        <path d={toSmoothPath(computed.pointsA)} fill="none" stroke="#10b981" strokeWidth="2.5" filter="url(#shadow)" />
        {computed.pointsA.map((p, i) => (
          <g key={`a-${i}`}>
            <circle cx={p[0]} cy={p[1]} r="4.5" fill="#ffffff" stroke="#10b981" strokeWidth="2" />
          </g>
        ))}

        {/* Tardanzas - amber */}
        <path d={toSmoothPath(computed.pointsT)} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="6 6" />
        {computed.pointsT.map((p, i) => (
          <circle key={`t-${i}`} cx={p[0]} cy={p[1]} r="3.5" fill="#f59e0b" />
        ))}

        {/* Ausentes - rose */}
        <path d={toSmoothPath(computed.pointsAus)} fill="none" stroke="#ef4444" strokeWidth="2.5" strokeDasharray="4 4" />
        {computed.pointsAus.map((p, i) => (
          <circle key={`au-${i}`} cx={p[0]} cy={p[1]} r="3" fill="#ef4444" />
        ))}

        {/* Permisos - violet */}
        <path d={toSmoothPath(computed.pointsPerm)} fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeDasharray="6 3" />
        {computed.pointsPerm.map((p, i) => (
          <circle key={`pe-${i}`} cx={p[0]} cy={p[1]} r="3" fill="#8b5cf6" />
        ))}

        {data.map((d, i) => (
          <text key={`x-${i}`} x={computed.P + i * computed.stepX} y={computed.H + 30} textAnchor="middle" fontSize="11" className="fill-zinc-600">
            {dayNumber(d.fecha)}
          </text>
        ))}

        {active && (() => {
          // Preparar datos del tooltip con ancho/alto dinámicos y clamp horizontal
          const tipos = active?.permisosPorTipo ? Object.entries(active.permisosPorTipo) : [];
          const maxShow = 5;
          const shown = tipos.sort((a,b) => b[1]-a[1]).slice(0, maxShow);
          const remaining = Math.max(0, tipos.length - shown.length);
          // Estimar un ancho mínimo y ampliar según la etiqueta más larga
          const longest = shown.reduce((m, [t]) => Math.max(m, t.length), 0);
          const estByLen = 160 + longest * 9; // 9px aprox por carácter (más conservador)
          const boxW = Math.max(220, Math.min(420, estByLen)); // responsivo con tope mayor
          const lineH = 16;
          const margin = 8;
          // Altura exacta: base hasta 'Permisos' (línea 4) + bloque dinámico
          const yAfterBase = 79; // última línea base (Permisos) y=79
          const yPermHeader = yAfterBase + 17; // 96
          const permLines = shown.length + (remaining > 0 ? 1 : 0);
          const lastY = shown.length > 0 ? (yPermHeader + permLines * lineH) : yAfterBase;
          const boxH = lastY + 12; // padding inferior
          // Posición x/y asegurada dentro del SVG
          const xTip = Math.max(margin, Math.min((xActive || 0) + 12, computed.W - boxW - margin));
          const yTip = Math.max(margin, Math.min(8, computed.H - boxH - margin));
          // Truncado seguro por ancho
          const maxChars = Math.floor((boxW - 100) / 8.5); // deja espacio para viñeta y números
          const fmtTipo = (s) => (s.length > maxChars ? (s.slice(0, Math.max(0, maxChars - 1)) + "…") : s);
          return (
            <g>
              <line x1={xActive} x2={xActive} y1={0} y2={computed.H} stroke="#cbd5e1" strokeDasharray="4 4" />
              <circle cx={xActive} cy={yActiveA} r="5" fill="#ffffff" stroke="#10b981" strokeWidth="2" />
              <circle cx={xActive} cy={yActiveT} r="4" fill="#f59e0b" />
              <circle cx={xActive} cy={yActiveAus} r="3.5" fill="#ef4444" />
              <circle cx={xActive} cy={yActivePerm} r="3.5" fill="#8b5cf6" />
              <g transform={`translate(${xTip}, ${yTip})`}>
                <rect width={boxW} height={boxH} rx="10" fill="#ffffff" stroke="#e5e7eb" />
                <text x="12" y="18" fontSize="12" className="fill-zinc-800 font-medium">{dayLabel(active.fecha)}</text>
                <circle cx="14" cy="31" r="4" fill="#10b981" />
                <text x="24" y="34" fontSize="11" className="fill-zinc-700">Asistencias: {active.asistencias}</text>
                <circle cx="14" cy="46" r="4" fill="#f59e0b" />
                <text x="24" y="49" fontSize="11" className="fill-zinc-700">Tardanzas: {active.tardanzas}</text>
                <circle cx="14" cy="61" r="4" fill="#ef4444" />
                <text x="24" y="64" fontSize="11" className="fill-zinc-700">Ausentes: {Math.max(0, active.ausentes ?? 0)}</text>
                <circle cx="14" cy="76" r="4" fill="#8b5cf6" />
                <text x="24" y="79" fontSize="11" className="fill-zinc-700">Permisos: {active.permisos ?? 0}</text>
                {shown.length > 0 && (
                  <>
                    <text x="12" y="96" fontSize="11" className="fill-zinc-500">Permisos por tipo:</text>
                    {shown.map(([tipo, cnt], i) => (
                      <text key={`pt-${i}`} x="24" y={96 + (i + 1) * 16} fontSize="11" className="fill-zinc-700">
                        • {fmtTipo(tipo)}: {cnt}
                      </text>
                    ))}
                    {remaining > 0 && (
                      <text x="24" y={96 + (shown.length + 1) * 16} fontSize="11" className="fill-zinc-500">
                        y {remaining} más...
                      </text>
                    )}
                  </>
                )}
              </g>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}


