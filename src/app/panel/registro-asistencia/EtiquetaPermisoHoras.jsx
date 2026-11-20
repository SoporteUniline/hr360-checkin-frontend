"use client";

// Etiqueta del permiso por horas del día (20/11/2026): «Permiso · por reponer 3 h» con el detalle en el título.
import { etiquetaPermisoHoras } from "@/lib/asistencia/permisoHoras.mjs";

const TONOS = {
  azul: "border-sky-200 bg-sky-50 text-sky-800",
  verde: "border-emerald-200 bg-emerald-50 text-emerald-800",
  ambar: "border-amber-200 bg-amber-50 text-amber-800",
};

export default function EtiquetaPermisoHoras({ permiso, className = "" }) {
  const e = etiquetaPermisoHoras(permiso);
  if (!e) return null;
  return (
    <span title={e.detalle} className={`inline-flex max-w-full items-center truncate rounded-full border px-2 py-0.5 text-[11px] font-semibold ${TONOS[e.tono]} ${className}`}>
      {e.texto}
    </span>
  );
}
