"use client";

// «¿Cómo te fue hoy?» (26/11/2026): pregunta opcional de 1 toque en el Inicio del empleado, cuando ya cerró su jornada y
// su empresa tiene una encuesta de clima abierta con el canal «al checar salida». Anónima (el servidor no guarda persona
// ni hora con la respuesta) y saltable. Va aparte de la checada: si algo falla, simplemente no aparece.
import { useState } from "react";
import useSWR from "swr";
import axios from "@/lib/axios";
import { BASE, get } from "./ui";
import { CARAS, llavePulso } from "@/lib/clima/canales.mjs";

const hoyLocal = () => new Intl.DateTimeFormat("en-CA").format(new Date());
const cerradaAqui = (llave) => {
  try {
    return window.localStorage.getItem(llave) === "1";
  } catch {
    return false;
  }
};
const recordar = (llave) => {
  try {
    window.localStorage.setItem(llave, "1");
  } catch {
    /* sin almacenamiento: el servidor ya lo sabe */
  }
};

export default function PulsoSalida({ activo }) {
  const { data } = useSWR(activo ? `${BASE}/pulso-hoy` : null, get, { revalidateOnFocus: false, shouldRetryOnError: false });
  const [estado, setEstado] = useState("pregunta"); // pregunta | enviando | gracias | oculto
  const [error, setError] = useState(null);
  const p = data?.pregunta;
  if (!activo || !p || estado === "oculto") return null;
  const llave = llavePulso(p.id_campania, hoyLocal());
  if (estado === "pregunta" && cerradaAqui(llave)) return null;

  const mandar = async (cuerpo) => {
    setEstado("enviando");
    setError(null);
    try {
      await axios.post(`${BASE}/pulso-hoy`, { id_campania: p.id_campania, ...cuerpo });
      recordar(llave);
      setEstado(cuerpo.saltar ? "oculto" : "gracias");
    } catch {
      setError("No se pudo guardar. Intenta de nuevo o sáltala.");
      setEstado("pregunta");
    }
  };

  if (estado === "gracias")
    return (
      <section role="status" className="rounded-xl border border-green-200 bg-green-50 p-4 text-[15px] text-green-900" data-pulso-salida>
        ¡Gracias! Tu respuesta es anónima: se suma a la de tu equipo sin tu nombre.
      </section>
    );

  return (
    <section aria-labelledby="pulso-salida-titulo" className="rounded-xl border border-blue-200 bg-blue-50/60 p-4" data-pulso-salida>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="pulso-salida-titulo" className="text-[17px] font-bold text-slate-900">
            {p.texto}
          </h2>
          <p className="mt-0.5 text-[13.5px] text-slate-600">Opcional y anónima · un toque y listo.</p>
        </div>
        <button
          type="button"
          onClick={() => mandar({ saltar: true })}
          disabled={estado === "enviando"}
          className="inline-flex min-h-11 shrink-0 items-center rounded-lg px-3 text-[14px] font-semibold text-slate-600 hover:bg-white disabled:opacity-50"
        >
          Saltar
        </button>
      </div>
      <div className="mt-3 grid grid-cols-5 gap-2" role="group" aria-label={p.texto}>
        {p.opciones.map((o) => (
          <button
            key={o.valor}
            type="button"
            disabled={estado === "enviando"}
            onClick={() => mandar({ valor: o.valor })}
            aria-label={`${o.valor} de 5: ${o.texto}`}
            className="flex min-h-[72px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl border-2 border-slate-200 bg-white px-0.5 py-1.5 text-slate-800 active:bg-blue-50 disabled:opacity-50"
          >
            <span className="text-[24px] leading-none" aria-hidden="true">
              {CARAS[o.valor]}
            </span>
            <span className="w-full whitespace-normal break-words text-center text-[13px] font-semibold leading-tight">{o.texto}</span>
          </button>
        ))}
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-[14px] text-red-800">
          {error}
        </p>
      ) : null}
    </section>
  );
}
