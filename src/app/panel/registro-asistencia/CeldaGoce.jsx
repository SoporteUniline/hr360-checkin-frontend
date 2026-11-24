"use client";

// Columna «Goce»: si ese día se paga (con goce) o no (sin goce), con su icono. Sale de lo guardado en la asistencia
// (goce_sueldo), que fija el tipo del día o el motivo (docs/tipos-goce.md del backend). Sin dato: «—».
import { BadgeDollarSign, CircleSlash } from "lucide-react";

export default function CeldaGoce({ registro }) {
  const v = registro?.goce_sueldo;
  if (v === null || v === undefined || v === "") return <span className="text-slate-300">—</span>;
  const con = Number(v) === 1;
  return con ? (
    <span data-goce="con" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-emerald-700">
      <BadgeDollarSign className="h-4 w-4" aria-hidden /> Con goce
    </span>
  ) : (
    <span data-goce="sin" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500">
      <CircleSlash className="h-4 w-4" aria-hidden /> Sin goce
    </span>
  );
}
