"use client";

// Liga personal sin contraseña (WhatsApp): la misma pantalla de contestar. El token identifica la participación, nunca
// se guarda con las respuestas.
import useSWR from "swr";
import axios from "@/lib/axios";
import { BASE, Cargando, Vacio, errorDe, get } from "./ui";
import Contestar from "./Contestar";

export default function EncuestaPublica({ token }) {
  const url = `${BASE}/publica/${encodeURIComponent(token)}`;
  const { data, error } = useSWR(url, get, { revalidateOnFocus: false, shouldRetryOnError: false });
  return (
    <main className="mx-auto min-h-dvh max-w-xl bg-white">
      <header className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
        <span className="size-7 rounded-lg bg-gradient-to-br from-brand to-brand-accent" aria-hidden="true" />
        <span className="text-sm font-bold tracking-[0.12em] text-slate-900">ADAMIA</span>
      </header>
      {error ? (
        <div className="p-4">
          <Vacio titulo="No se pudo abrir la encuesta" texto={errorDe(error, "La liga no es válida.")} />
        </div>
      ) : !data ? (
        <div className="p-4">
          <Cargando />
        </div>
      ) : data.contestada ? (
        <div className="p-4">
          <Vacio titulo="Ya contestaste esta encuesta" texto="¡Gracias por tu tiempo!" />
        </div>
      ) : (
        <Contestar encuesta={data.encuesta} token={token} alEnviar={(cuerpo) => axios.post(`${url}/respuestas`, cuerpo)} />
      )}
    </main>
  );
}
