"use client";
// Confirmación grande después de checar (reloj de la empresa y app del empleado en escritorio): «¡Listo, Ana!», qué se
// registró y a qué hora. Dura unos segundos (la barra de abajo se vacía) y el reloj vuelve solo. Solo presentación.
import { AlertTriangle, CheckCircle2, Clock4, LogIn, LogOut, Utensils, XCircle } from "lucide-react";

const iniciales = (nombre) => String(nombre || "").trim().split(/\s+/).slice(0, 2).map((p) => p[0] || "").join("").toUpperCase() || "?";

// Tipo del movimiento según el mensaje del servidor (los mismos textos de siempre).
export function tipoMovimiento(texto = "") {
  if (/comer|comida/i.test(texto) && !/ya registraste/i.test(texto)) return "comida";
  if (/entrada/i.test(texto)) return "entrada";
  if (/salida|turno|cerrad/i.test(texto)) return "salida";
  return "otro";
}

const TONOS = {
  entrada: { Icono: LogIn, hora: "text-emerald-700", insignia: "bg-emerald-500", barra: "bg-emerald-500" },
  salida: { Icono: LogOut, hora: "text-rose-700", insignia: "bg-rose-500", barra: "bg-rose-500" },
  comida: { Icono: Utensils, hora: "text-amber-700", insignia: "bg-amber-500", barra: "bg-amber-500" },
  otro: { Icono: CheckCircle2, hora: "text-slate-900", insignia: "bg-emerald-500", barra: "bg-brand" },
};

export default function ResultadoChecada({ info, duracion, className = "" }) {
  const primerNombre = String(info.nombre || "").trim().split(/\s+/)[0];
  const estado = info.pending
    ? info.errorServidor ? { texto: "Error del servidor · avisa a RH", clase: "bg-amber-50 text-amber-800", Icono: AlertTriangle } : { texto: "Pendiente de subir", clase: "bg-blue-50 text-blue-800", Icono: Clock4 }
    : info.success ? null : { texto: "No se registró · avisa a RH", clase: "bg-red-50 text-red-700", Icono: XCircle };
  const tono = TONOS[estado ? "otro" : tipoMovimiento(info.movimiento)];
  const foto = info.foto_perfil && !info.foto_perfil.endsWith("/assets/user.png") ? info.foto_perfil : null;
  return (
    <div className={`fixed inset-0 z-100 items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm ${className}`}>
      <div role="status" aria-live="polite" className="animate-bounce-in relative w-full max-w-md overflow-hidden sm:max-w-lg rounded-3xl border border-slate-200 bg-white px-8 pb-9 pt-8 text-center shadow-2xl">
        <div className="relative mx-auto mb-5 size-24">
          {foto
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={foto} alt="" className="size-24 rounded-full object-cover ring-4 ring-slate-50" />
            : <span className="grid size-24 place-items-center rounded-full bg-brand/10 text-3xl font-bold text-brand ring-4 ring-slate-50">{iniciales(info.nombre)}</span>}
          <span className={`absolute -bottom-1 -right-1 grid size-9 place-items-center rounded-full text-white ring-4 ring-white ${estado ? (info.pending ? (info.errorServidor ? "bg-amber-500" : "bg-blue-500") : "bg-red-500") : tono.insignia}`}>
            {estado ? <estado.Icono className="size-5" aria-hidden="true" /> : <tono.Icono className="size-5" aria-hidden="true" />}
          </span>
        </div>
        <p className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{estado ? primerNombre || "Checada" : `¡Listo, ${primerNombre || "registrado"}!`}</p>
        <p className="mt-2 text-lg font-medium text-slate-700">{info.movimiento}</p>
        {info.hora && !estado && <p className={`mt-3 text-5xl font-bold tabular-nums tracking-tight sm:text-6xl ${tono.hora}`}>{info.hora}</p>}
        <p className="mt-3 text-sm text-slate-500">{info.nombre}</p>
        {estado && (
          <p className={`mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${estado.clase}`}>
            <estado.Icono className="size-4" aria-hidden="true" />{estado.texto}
          </p>
        )}
        {info.pending && info.motivo && <p className="mt-3 text-sm font-medium text-amber-700">{info.motivo}</p>}
        {info.volviendo && <p className="mt-3 text-sm text-slate-500">Regresando a tu inicio…</p>}
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1.5 bg-slate-100">
          <span className={`block h-full origin-left animate-[vaciar_linear_forwards] ${tono.barra}`} style={{ animationDuration: `${duracion}ms` }} />
        </span>
      </div>
    </div>
  );
}
