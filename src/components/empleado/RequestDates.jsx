"use client";
import useSWR from 'swr';
import useEmpleadoSesion from '@/hooks/useEmpleadoSesion';
import { fetcherWithToken } from '@/lib/fetcher';
import { requestDates } from '@/lib/empleado/presentation.mjs';
export default function RequestDates({ row }) {
  const { empresa } = useEmpleadoSesion();
  const { data, error } = useSWR(empresa ? `/checador/holidays/${empresa}?page=1&limit=5000&filter=` : null, fetcherWithToken, { shouldRetryOnError: false, revalidateOnFocus: false });
  const holidays = !error && Array.isArray(data?.festivos) && (!data.total || data.total <= data.festivos.length) ? data.festivos.map(item => String(item.fecha).slice(0, 10)) : null;
  const dates = requestDates(row, holidays);
  return <div className="mt-2 space-y-1 text-sm"><p className="text-slate-600">{dates.range}</p>{dates.duration && <p className="font-semibold text-slate-900">{dates.duration}</p>}{dates.back && <p className="text-slate-500">Regreso: {dates.back}</p>}</div>;
}
