"use client";

// Encuestas por contestar: el aviso de arriba (inicio del empleado y Monitor de RH/dueño) y el número del menú.
// Una sola consulta (GET /checador/clima/mis-encuestas, misma llave SWR que la lista) para aviso, menú y lista.
// Sin pendientes, sin ficha de empleado (403 SIN_FICHA) o si falla: no se muestra nada.
import Link from "next/link";
import useSWR from "swr";
import { ClipboardList } from "lucide-react";
import { contarPendientes, destinoAviso, textoPendientes } from "@/lib/clima/pendientes.mjs";
import { BASE, get } from "./ui";

export const LLAVE_MIS_ENCUESTAS = `${BASE}/mis-encuestas`;

export function useMisEncuestas(activo = true) {
  const r = useSWR(activo ? LLAVE_MIS_ENCUESTAS : null, get, {
    shouldRetryOnError: false,
    revalidateOnFocus: true,
    dedupingInterval: 60000,
  });
  return { ...r, pendientes: r.data ? contarPendientes(r.data) : 0, conFicha: Boolean(r.data?.encuestas) };
}

// Número junto a «Encuestas» / «Mis encuestas». Nada si es 0.
export function ContadorEncuestas({ n, className = "" }) {
  if (!n) return null;
  return (
    <span
      aria-label={`${n} por contestar`}
      className={`inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[11px] font-bold tabular-nums leading-none text-white ${className}`}
    >
      {n > 9 ? "9+" : n}
    </span>
  );
}

// Aviso «Tienes 1 encuesta por contestar · Contestar». base: ruta de la lista (app del empleado o panel).
export default function AvisoEncuestas({ base, className = "" }) {
  const { data, pendientes } = useMisEncuestas();
  const titulo = textoPendientes(pendientes);
  if (!titulo) return null;
  return (
    <section
      aria-label="Encuestas por contestar"
      className={`flex flex-wrap items-center gap-3 rounded-xl border border-blue-200 bg-blue-50/70 p-4 ${className}`}
    >
      <span className="rounded-xl bg-blue-100 p-2 text-blue-700" aria-hidden="true">
        <ClipboardList className="size-5" />
      </span>
      <div className="min-w-0 flex-1 basis-48">
        <h2 className="font-semibold text-slate-900">{titulo}</h2>
        <p className="text-sm text-slate-600">Es anónima: nadie de tu empresa ve tu nombre junto a tus respuestas.</p>
      </div>
      <Link
        href={destinoAviso(base, data)}
        className="flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 max-sm:w-full"
      >
        Contestar
      </Link>
    </section>
  );
}
