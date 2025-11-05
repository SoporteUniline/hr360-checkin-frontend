"use client";

// Gráfico semanal interactivo (SVG puro)
// Props: data: Array<{ fecha: 'YYYY-MM-DD', asistencias: number, tardanzas: number }>

import { useMemo, useState } from "react";

export default function WeeklyTrend({ data = [] }) {
  const [hoverIdx, setHoverIdx] = useState(null);

  const computed = useMemo(() => {
    const maxValRaw = Math.max(1, ...data.map((d) => Math.max(d.asistencias || 0, d.tardanzas || 0)));
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
    const pointsA = data.map((d, i) => [P + i * stepX, scaleY(d.asistencias || 0)]);
    const pointsT = data.map((d, i) => [P + i * stepX, scaleY(d.tardanzas || 0)]);
    const tickValues = []; tickValues.push(1); for (let v = step; v <= yMax; v += step) tickValues.push(v);
    const yTicks = tickValues.filter((v, i, arr) => i === 0 || v !== arr[i - 1]).map((v) => ({ value: v, y: scaleY(v) }));
    return { W, H, P, stepX, scaleY, pointsA, pointsT, yTicks };
  }, [data]);

  const dayLabel = (ymd) => {
    const d = new Date(ymd + "T00:00:00Z");
    const wd = d.toLocaleDateString("es-MX", { weekday: "short" }).replace(/\./g, "").toLowerCase();
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${wd} ${day}`;
  };
  const dayNumber = (ymd) => String(new Date(ymd + "T00:00:00Z").getUTCDate());

  const onMove = (evt) => {
    const target = evt.currentTarget;
    const rect = target.getBoundingClientRect();
    const xPx = evt.clientX - rect.left;
    const xView = (xPx / rect.width) * computed.W;
    const { P, stepX } = computed;
    const xClamped = Math.max(P, Math.min(xView, computed.W - P));
    const idx = Math.round((xClamped - P) / stepX);
    if (idx >= 0 && idx < data.length) setHoverIdx(idx);
  };
  const onLeave = () => setHoverIdx(null);

  const active = hoverIdx != null ? data[hoverIdx] : null;
  const xActive = hoverIdx != null ? computed.P + hoverIdx * computed.stepX : null;
  const yActiveA = hoverIdx != null ? computed.pointsA[hoverIdx][1] : null;
  const yActiveT = hoverIdx != null ? computed.pointsT[hoverIdx][1] : null;

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
        className="h-64 w-full"
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="fillAsist" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.06" />
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

        <path d={`${toSmoothPath(computed.pointsA)} L ${computed.P + (data.length - 1) * computed.stepX},${computed.H} L ${computed.P},${computed.H} Z`} fill="url(#fillAsist)" />
        <path d={toSmoothPath(computed.pointsA)} fill="none" stroke="#0ea5e9" strokeWidth="2.5" filter="url(#shadow)" />
        {computed.pointsA.map((p, i) => (
          <g key={`a-${i}`}>
            <circle cx={p[0]} cy={p[1]} r="4.5" fill="#ffffff" stroke="#0ea5e9" strokeWidth="2" />
          </g>
        ))}

        <path d={toSmoothPath(computed.pointsT)} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="6 6" />
        {computed.pointsT.map((p, i) => (
          <circle key={`t-${i}`} cx={p[0]} cy={p[1]} r="3.5" fill="#f59e0b" />
        ))}

        {data.map((d, i) => (
          <text key={`x-${i}`} x={computed.P + i * computed.stepX} y={computed.H + 30} textAnchor="middle" fontSize="11" className="fill-zinc-600">
            {dayNumber(d.fecha)}
          </text>
        ))}

        {active && (
          <g>
            <line x1={xActive} x2={xActive} y1={0} y2={computed.H} stroke="#cbd5e1" strokeDasharray="4 4" />
            <circle cx={xActive} cy={yActiveA} r="5" fill="#ffffff" stroke="#0ea5e9" strokeWidth="2" />
            <circle cx={xActive} cy={yActiveT} r="4" fill="#f59e0b" />
            <g transform={`translate(${Math.min(xActive + 12, computed.W - 172)}, 8)`}>
              <rect width="164" height="58" rx="10" fill="#ffffff" stroke="#e5e7eb" />
              <text x="12" y="18" fontSize="12" className="fill-zinc-800 font-medium">{dayLabel(active.fecha)}</text>
              <circle cx="14" cy="31" r="4" fill="#0ea5e9" />
              <text x="24" y="34" fontSize="11" className="fill-zinc-700">Asistencias: {active.asistencias}</text>
              <circle cx="14" cy="46" r="4" fill="#f59e0b" />
              <text x="24" y="49" fontSize="11" className="fill-zinc-700">Tardanzas: {active.tardanzas}</text>
            </g>
          </g>
        )}
      </svg>
    </div>
  );
}


