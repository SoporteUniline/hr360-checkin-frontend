"use client";

// Política de prevención de riesgos psicosociales (NOM-035, 5.1 y 5.7) en «Mis encuestas»: la persona la lee y acusa de
// leído. Sin política publicada o sin la migración no se muestra nada. API: GET /nom035/politica/mia · POST …/acuse.
import { useState } from "react";
import useSWR from "swr";
import axios from "@/lib/axios";
import { BASE, Boton, errorDe, get } from "./ui";

export default function PoliticaAcuse({ empresa = null }) {
  const url = `${BASE}/nom035/politica/mia${empresa ? `?empresa=${empresa}` : ""}`;
  const { data, mutate } = useSWR(url, get, { shouldRetryOnError: false, revalidateOnFocus: false });
  const [abierta, setAbierta] = useState(false);
  const [error, setError] = useState(null);
  const p = data?.politica;
  if (!p) return null;
  const acusar = async () => {
    setError(null);
    try {
      await axios.post(`${BASE}/nom035/politica/acuse${empresa ? `?empresa=${empresa}` : ""}`, { revision: p.revision });
      mutate();
    } catch (e) {
      setError(errorDe(e));
    }
  };
  return (
    <section aria-label="Política de prevención" className="rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="text-[15px] font-bold text-slate-900">Política de prevención de riesgos psicosociales</h2>
      <p className="mt-1 text-[13.5px] text-slate-600">
        {data.acusado_en ? "Ya la leíste. ¡Gracias!" : "Tu empresa publicó su política (NOM-035). Léela y confirma que la conoces."}
      </p>
      <Boton variante="fantasma" className="mt-2 -ml-2" onClick={() => setAbierta((v) => !v)} aria-expanded={abierta}>
        {abierta ? "Ocultar política" : "Leer política"}
      </Boton>
      {abierta ? <p className="mt-2 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-[14px] leading-relaxed text-slate-800">{p.texto}</p> : null}
      {!data.acusado_en ? (
        <Boton variante="primario" className="mt-3 w-full sm:w-auto" onClick={acusar}>
          La leí y la conozco
        </Boton>
      ) : null}
      {error ? <p className="mt-2 text-[13.5px] text-red-700">{error}</p> : null}
    </section>
  );
}
