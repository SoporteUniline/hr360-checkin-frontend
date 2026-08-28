"use client";

import { useMemo, useState } from "react";

const DATE_FORMATTER = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

function formatDay(ymd) {
  if (!ymd) return "";
  return DATE_FORMATTER.format(new Date(`${ymd}T00:00:00Z`)).replace(".", "");
}

function smoothPath(points) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0][0]},${points[0][1]}`;
  if (points.length === 2) return `M ${points[0].join(",")} L ${points[1].join(",")}`;

  const tension = 0.16;
  let path = `M ${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = i > 0 ? points[i - 1] : points[0];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < points.length - 2 ? points[i + 2] : p2;
    const cp1x = p1[0] + (p2[0] - p0[0]) * tension;
    const cp1y = p1[1] + (p2[1] - p0[1]) * tension;
    const cp2x = p2[0] - (p3[0] - p1[0]) * tension;
    const cp2y = p2[1] - (p3[1] - p1[1]) * tension;
    path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`;
  }
  return path;
}

export default function WeeklyTrend({ data = [] }) {
  const [activeIndex, setActiveIndex] = useState(null);

  const chart = useMemo(() => {
    const paddingX = 42;
    const top = 14;
    const baseline = 176;
    // La escala por día se conserva. En rangos largos la gráfica se desplaza
    // horizontalmente en lugar de estirarse o comprimirse para llenar la tarjeta.
    const stepX = 68;
    const width = Math.max(
      560,
      paddingX * 2 + Math.max(1, data.length - 1) * stepX,
    );
    const maxAttendance = Math.max(1, ...data.map((d) => Number(d.asistencias) || 0));
    const roundedMax = Math.max(5, Math.ceil(maxAttendance / 5) * 5);
    const y = (value) =>
      baseline - ((Number(value) || 0) / roundedMax) * (baseline - top);
    const x = (index) =>
      data.length === 1 ? width / 2 : paddingX + index * ((width - paddingX * 2) / (data.length - 1));
    const points = data.map((d, index) => [x(index), y(d.asistencias)]);
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
      value: Math.round(roundedMax * ratio),
      y: baseline - ratio * (baseline - top),
    }));
    const labelEvery = Math.max(1, Math.ceil(data.length / 8));
    return { width, height: 220, baseline, points, ticks, x, labelEvery };
  }, [data]);

  const totals = useMemo(
    () =>
      data.reduce(
        (acc, day) => ({
          tardanzas: acc.tardanzas + (Number(day.tardanzas) || 0),
          ausentes: acc.ausentes + (Number(day.ausentes) || 0),
          permisos: acc.permisos + (Number(day.permisos) || 0),
        }),
        { tardanzas: 0, ausentes: 0, permisos: 0 },
      ),
    [data],
  );

  const active = activeIndex == null ? null : data[activeIndex];
  const activeX = activeIndex == null ? null : chart.x(activeIndex);
  const line = smoothPath(chart.points);
  const area = chart.points.length
    ? `${line} L ${chart.points.at(-1)[0]},${chart.baseline} L ${chart.points[0][0]},${chart.baseline} Z`
    : "";

  const selectFromPointer = (event) => {
    if (!data.length) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const scaledX = ((event.clientX - rect.left) / rect.width) * chart.width;
    let nearest = 0;
    let distance = Number.POSITIVE_INFINITY;
    data.forEach((_, index) => {
      const currentDistance = Math.abs(chart.x(index) - scaledX);
      if (currentDistance < distance) {
        nearest = index;
        distance = currentDistance;
      }
    });
    setActiveIndex(nearest);
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
          {totals.tardanzas} tardanzas
        </span>
        <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
          {totals.ausentes} ausencias
        </span>
        <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
          {totals.permisos} permisos
        </span>
      </div>

      {chart.width > 700 && (
        <p className="mb-2 text-[10px] font-medium text-slate-400">
          Desliza horizontalmente para recorrer el periodo.
        </p>
      )}
      <div className="overflow-x-auto overscroll-x-contain pb-2 touch-pan-x [scrollbar-width:thin]">
        <svg
          viewBox={`0 0 ${chart.width} ${chart.height}`}
          width={chart.width}
          height={chart.height}
          className="block max-w-none"
          role="img"
          aria-label="Tendencia de personas presentes por día"
          onPointerMove={selectFromPointer}
          onPointerDown={selectFromPointer}
          onPointerLeave={() => setActiveIndex(null)}
        >
          {chart.ticks.map((tick) => (
            <g key={tick.value}>
              <line
                x1="42"
                x2={chart.width - 24}
                y1={tick.y}
                y2={tick.y}
                stroke="#e2e8f0"
                strokeDasharray={tick.value === 0 ? "0" : "3 5"}
              />
              <text x="34" y={tick.y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
                {tick.value}
              </text>
            </g>
          ))}

          <path d={area} fill="#dbeafe" />
          <path
            d={line}
            fill="none"
            stroke="#2563eb"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {chart.points.map(([x, y], index) => (
            <g key={`${data[index]?.fecha}-${index}`}>
              <circle cx={x} cy={y} r="4" fill="white" stroke="#2563eb" strokeWidth="2" />
              {(index % chart.labelEvery === 0 || index === data.length - 1) && (
                <text x={x} y="207" textAnchor="middle" fontSize="10" fill="#64748b">
                  {formatDay(data[index]?.fecha)}
                </text>
              )}
            </g>
          ))}

          {active && (
            <g pointerEvents="none">
              <line
                x1={activeX}
                x2={activeX}
                y1="10"
                y2={chart.baseline}
                stroke="#94a3b8"
                strokeDasharray="4 4"
              />
              <g
                transform={`translate(${Math.min(
                  Math.max(8, activeX + 10),
                  chart.width - 188,
                )}, 10)`}
              >
                <rect width="180" height="94" rx="12" fill="white" stroke="#dbeafe" />
                <text x="12" y="20" fontSize="11" fontWeight="600" fill="#0f172a">
                  {formatDay(active.fecha)}
                </text>
                <text x="12" y="40" fontSize="11" fill="#2563eb">
                  Presentes: {active.asistencias || 0}
                </text>
                <text x="12" y="56" fontSize="11" fill="#b45309">
                  Tardanzas: {active.tardanzas || 0}
                </text>
                <text x="12" y="72" fontSize="11" fill="#be123c">
                  Ausencias: {Math.max(0, active.ausentes || 0)}
                </text>
                <text x="12" y="88" fontSize="11" fill="#6d28d9">
                  Permisos: {active.permisos || 0}
                </text>
              </g>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
