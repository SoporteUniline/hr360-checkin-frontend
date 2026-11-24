"use client";

// Contador de la comida en la app del empleado. Si salió a comer con el
// botón del reloj y aún no regresa: anillo con el tiempo de comida, a qué hora debe regresar y aviso si se pasó.
import { useEffect, useState } from "react";
import Link from "next/link";
import { Play } from "lucide-react";

// Las horas llegan como «AAAA-MM-DD HH:mm:ss» en hora del centro de México (-06:00, sin horario de verano).
const aFecha = (valor) => (valor ? new Date(`${String(valor).replace(" ", "T").slice(0, 19)}-06:00`) : null);
const dosDigitos = (n) => String(n).padStart(2, "0");
const reloj = (seg) => `${dosDigitos(Math.floor(seg / 3600))}:${dosDigitos(Math.floor((seg % 3600) / 60))}:${dosDigitos(seg % 60)}`;

export default function ComidaEnCurso({ comida, timezone }) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    if (!comida?.en_comida) return undefined;
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [comida?.en_comida]);
  const salida = aFecha(comida?.salida);
  if (!comida?.en_comida || !salida || Number.isNaN(salida.getTime())) return null;

  const segundos = Math.max(0, Math.floor((ahora - salida.getTime()) / 1000));
  const programados = comida.minutos_programados ? comida.minutos_programados * 60 : null;
  const excedente = programados ? Math.max(0, segundos - programados) : 0;
  const avance = programados ? Math.min(1, segundos / programados) : 0;
  const hora = (d) => new Intl.DateTimeFormat("es-MX", { hour: "numeric", minute: "2-digit", hourCycle: "h12", timeZone: timezone }).format(d);
  const regreso = programados ? new Date(salida.getTime() + programados * 1000) : null;
  const circ = 2 * Math.PI * 50;

  return (
    <section aria-label="Estás en comida" className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
      <div className="flex items-center gap-4">
        <div className="relative size-28 shrink-0">
          <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
            <circle cx="60" cy="60" r="50" fill="none" strokeWidth="10" className="stroke-amber-100" />
            <circle cx="60" cy="60" r="50" fill="none" strokeWidth="10" strokeLinecap="round" className={excedente ? "stroke-red-500" : "stroke-amber-500"}
              strokeDasharray={circ} strokeDashoffset={excedente ? 0 : circ * (1 - avance)} />
          </svg>
          <div className="absolute inset-0 grid place-content-center text-center">
            <span className="text-[10.5px] text-slate-500">Comida</span>
            <strong className={`text-base tabular-nums ${excedente ? "text-red-600" : "text-slate-900"}`} role="timer">{excedente ? `+${reloj(excedente)}` : reloj(segundos)}</strong>
            {programados ? <span className="text-[10.5px] text-slate-500">de {comida.minutos_programados} min</span> : null}
          </div>
        </div>
        <div className="min-w-0 space-y-1 text-sm">
          <p className="font-semibold text-slate-900">Estás en tu hora de comida</p>
          <p className="text-slate-600">Saliste a las {hora(salida)}{regreso ? ` · regresa a las ${hora(regreso)}` : ""}</p>
          {excedente ? <p className="font-semibold text-red-600">Te pasaste {Math.ceil(excedente / 60)} min de tu hora de comida.</p> : null}
        </div>
      </div>
      <Link href="/empleado/reloj-checador" className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 text-sm font-semibold text-white hover:bg-amber-600">
        <Play className="size-4" /> Regresé de comer
      </Link>
    </section>
  );
}
