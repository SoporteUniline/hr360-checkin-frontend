"use client";
// Aviso grande del reloj de la empresa (código inválido, cara que no coincide, «mira a la cámara»…): arriba al centro,
// legible a un paso de distancia y sin tapar la cámara ni los botones. Se va solo; se puede cerrar con un toque.
import { AlertTriangle, Info, X, XCircle } from "lucide-react";

const TONOS = {
  error: { Icono: XCircle, caja: "border-red-200", icono: "bg-red-50 text-red-600", titulo: "No se pudo registrar" },
  warning: { Icono: AlertTriangle, caja: "border-amber-200", icono: "bg-amber-50 text-amber-600", titulo: "Revisa" },
  info: { Icono: Info, caja: "border-blue-200", icono: "bg-blue-50 text-brand", titulo: "Un paso más" },
};

// enCamara: dentro de la zona de la cámara, arriba del aviso grande (maqueta aprobada 26/11/2026).
export default function AvisoKiosco({ aviso, onCerrar, enCamara = false }) {
  if (!aviso) return null;
  const tono = TONOS[aviso.tono] || TONOS.error;
  return (
    <div className={`pointer-events-none inset-x-0 flex justify-center px-4 ${enCamara ? "absolute bottom-[5.5rem] z-40 [@container(min-width:40rem)]:bottom-28" : "fixed top-4 z-120"}`}>
      <div role={aviso.tono === "info" ? "status" : "alert"} data-aviso-kiosco={aviso.tono}
        className={`pointer-events-auto flex w-full max-w-xl items-start gap-3 rounded-2xl border bg-white p-4 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 ${tono.caja}`}>
        <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${tono.icono}`}><tono.Icono className="size-6" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className={`text-base font-semibold ${aviso.tono === "error" ? "text-red-700" : "text-slate-900"}`}>{tono.titulo}</p>
          <p className="text-base text-slate-700">{aviso.texto}</p>
        </div>
        <button type="button" onClick={onCerrar} aria-label="Cerrar aviso" className="grid size-10 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100">
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
