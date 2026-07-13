"use client";

// StatCard homologada Adamia: tarjeta blanca con borde fino, chip de icono
// suave a la izquierda, etiqueta pequeña y cifra tabular.
// Retrocompatible: `borderColor` (legacy) solo decide el acento del chip.

const ACCENTS = {
  slate: { iconBg: "bg-slate-100", iconColor: "text-slate-600" },
  gray: { iconBg: "bg-slate-100", iconColor: "text-slate-600" },
  amber: { iconBg: "bg-amber-50", iconColor: "text-amber-600" },
  emerald: { iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
  red: { iconBg: "bg-red-50", iconColor: "text-red-600" },
  violet: { iconBg: "bg-violet-50", iconColor: "text-[#7c3aed]" },
  blue: { iconBg: "bg-blue-50", iconColor: "text-[#2563eb]" },
};

function pickAccent(accent = "", borderColor = "") {
  if (ACCENTS[accent]) return ACCENTS[accent];
  const v = String(borderColor);
  if (v.includes("amber")) return ACCENTS.amber;
  if (v.includes("emerald") || v.includes("green")) return ACCENTS.emerald;
  if (v.includes("red")) return ACCENTS.red;
  if (v.includes("violet") || v.includes("purple")) return ACCENTS.violet;
  if (v.includes("gray") || v.includes("slate")) return ACCENTS.gray;
  return ACCENTS.blue;
}

const IconoGenerico = ({ className }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
  >
    <path d="M9 17v-2m3 2V7m3 10v-5m6 9H3" />
  </svg>
);

const StatCard = ({ title, value, sub, icon: Icon, accent, borderColor }) => {
  const a = pickAccent(accent, borderColor);
  return (
    <div className="flex items-center gap-3 rounded-[10px] border border-gray-200 bg-white p-4">
      <div
        className={`grid h-9 w-9 flex-none place-items-center rounded-lg ${a.iconBg}`}
      >
        {Icon ? (
          <Icon className={`h-4 w-4 ${a.iconColor}`} />
        ) : (
          <IconoGenerico className={`h-4 w-4 ${a.iconColor}`} />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-semibold text-gray-500">
          {title}
        </p>
        <p className="text-[22px] font-extrabold leading-tight tracking-tight text-gray-900 [font-variant-numeric:tabular-nums]">
          {value}
          {sub ? (
            <span className="ml-1.5 text-[11px] font-semibold text-gray-400">
              {sub}
            </span>
          ) : null}
        </p>
      </div>
    </div>
  );
};

export default StatCard;
