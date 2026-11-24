"use client";
// Aviso al capturar un turno u horario que pasa del límite legal de la semana del año en que aplica (desde hoy).
// Usa el catálogo de jornadas legales del backend. Solo informa; no bloquea el guardado.
import useSWR from "swr";
import { AlertTriangle } from "lucide-react";
import { fetcherWithToken } from "@/lib/fetcher";
import { minutosSemanaHorario, avisoLimiteLegal, hoyMexico } from "@/lib/asistencia/limiteLegal.mjs";

export default function AvisoLimiteLegal({ horarios, className = "" }) {
  const { data } = useSWR(`/checador/jornadas-legales/vigente?fecha=${hoyMexico()}`, fetcherWithToken, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });
  const texto = avisoLimiteLegal(minutosSemanaHorario(horarios), data?.data);
  if (!texto) return null;
  return (
    <div role="status" data-aviso-limite-legal="true" className={`flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 ${className}`}>
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{texto}</span>
    </div>
  );
}
