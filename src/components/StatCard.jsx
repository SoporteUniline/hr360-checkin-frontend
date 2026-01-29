"use client";

import { Card } from "@/components/ui/card";

/**
 * StatCard (Diseño ADAMIA)
 * - Estandariza tipografía (base 14px desde `src/app/panel/layout.jsx`) y jerarquía visual.
 * - Mantiene compatibilidad con props existentes: `title`, `value`, `borderColor`.
 * - `borderColor` se conserva para resaltar (legacy), pero el look&feel se alinea a Empleados/Contratos.
 */
const ACCENTS = {
  slate: { iconBg: "bg-slate-100", iconColor: "text-slate-700" },
  gray: { iconBg: "bg-slate-100", iconColor: "text-slate-700" },
  amber: { iconBg: "bg-amber-50", iconColor: "text-amber-700" },
  emerald: { iconBg: "bg-emerald-50", iconColor: "text-emerald-700" },
  red: { iconBg: "bg-red-50", iconColor: "text-red-700" },
  blue: { iconBg: "bg-blue-50", iconColor: "text-[#2563EB]" },
};

function pickAccent(borderColor = "") {
  const v = String(borderColor);
  if (v.includes("amber")) return ACCENTS.amber;
  if (v.includes("emerald")) return ACCENTS.emerald;
  if (v.includes("red")) return ACCENTS.red;
  if (v.includes("blue")) return ACCENTS.blue;
  if (v.includes("gray")) return ACCENTS.gray;
  return ACCENTS.slate;
}

const StatCard = ({ title, value, borderColor }) => {
  const accent = pickAccent(borderColor);
  return (
    <Card
      className={`border-l-4 ${borderColor} bg-white border border-gray-100 shadow-sm`}
    >
      <div className="p-6 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${accent.iconBg}`}>
          {/* Ícono decorativo (simple) para mantener consistencia visual */}
          <svg
            className={`h-6 w-6 ${accent.iconColor}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 17v-2m3 2V7m3 10v-5m6 9H3"
            />
          </svg>
        </div>
      </div>
    </Card>
  );
};

export default StatCard;
