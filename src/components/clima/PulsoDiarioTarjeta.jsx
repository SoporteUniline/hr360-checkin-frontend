// «¿Cómo te fue hoy?» en el tablero de RH (26/11/2026): solo el agregado de la medición, al cerrar (sin serie por día).
import { CARAS } from "@/lib/clima/canales.mjs";

const NOMBRES = ["Muy mal", "Mal", "Regular", "Bien", "Muy bien"];

export default function PulsoDiarioTarjeta({ pulso }) {
  if (!pulso) return null;
  const total = pulso.respuestas ?? 0;
  return (
    <section aria-labelledby="pulso-diario" className="min-w-0 rounded-[18px] border border-slate-200 bg-white p-4" data-pulso-diario>
      <h2 id="pulso-diario" className="text-[15px] font-bold text-slate-900">
        «¿Cómo te fue hoy?» al checar salida
      </h2>
      {!pulso.suficiente ? (
        <p className="mt-2 text-[14px] text-slate-500">{total ? `${total} respuestas: aún no alcanza el mínimo.` : "Nadie contestó la pregunta del día."}</p>
      ) : (
        <>
          <p className="mt-1 text-[14px] text-slate-600">
            {total} {total === 1 ? "respuesta" : "respuestas"} anónimas · promedio <b className="text-slate-900">{pulso.promedio} de 5</b> ·{" "}
            <b className="text-slate-900">{pulso.favorable} %</b> bien o muy bien
          </p>
          <ul className="mt-3 space-y-1.5">
            {pulso.distribucion.map((n, i) => (
              <li key={i} className="flex items-center gap-2 text-[13px] text-slate-700">
                <span className="w-24 shrink-0">
                  <span aria-hidden="true">{CARAS[i + 1]}</span> {NOMBRES[i]}
                </span>
                <span className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
                  <span className="block h-full rounded-full bg-brand" style={{ width: `${total ? Math.round((n / total) * 100) : 0}%` }} />
                </span>
                <span className="w-8 shrink-0 text-right font-semibold">{n}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
