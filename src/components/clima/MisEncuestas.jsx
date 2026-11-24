"use client";

// App del empleado → Encuestas: las encuestas abiertas para mí y contestar una pregunta por pantalla.
import Link from "next/link";
import useSWR from "swr";
import axios from "@/lib/axios";
import { fechaCorta } from "@/lib/clima/modelo.mjs";
import { BASE, Cargando, Vacio, errorDe, get } from "./ui";
import Contestar from "./Contestar";

function Lista() {
  const { data, error } = useSWR(`${BASE}/mis-encuestas`, get);
  if (error) return <Vacio titulo="No se pudieron cargar tus encuestas" texto={errorDe(error)} />;
  if (!data) return <Cargando />;
  const pendientes = data.encuestas.filter((e) => !e.contestada);
  const hechas = data.encuestas.filter((e) => e.contestada);
  return (
    <div className="space-y-4 p-4 pb-24">
      <h1 className="text-xl font-extrabold text-slate-900">Encuestas</h1>
      <p className="text-[14px] text-slate-600">Tu opinión cuenta y es anónima: nadie de tu empresa ve tu nombre junto a tus respuestas.</p>
      {!pendientes.length ? (
        <Vacio titulo="No tienes encuestas pendientes" texto="Cuando tu empresa lance una, aparecerá aquí." />
      ) : (
        <ul className="space-y-2">
          {pendientes.map((e) => (
            <li key={e.id}>
              <Link
                href={`/empleado/panel/encuestas/${e.id}`}
                className="block rounded-2xl border border-slate-200 bg-white p-4 active:bg-slate-50"
              >
                <p className="text-[16px] font-bold text-slate-900">{e.nombre}</p>
                <p className="mt-1 text-[13px] text-slate-500">
                  {e.tipo === "nom035" ? "NOM-035 · cuestionario oficial" : "Encuesta de clima"} · cierra el {fechaCorta(e.cierra_el)}
                </p>
                <span className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-brand px-4 text-sm font-bold text-white">
                  Contestar
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {hechas.length ? (
        <p className="text-[13px] text-slate-500">Ya contestaste: {hechas.map((e) => e.nombre).join(", ")}. ¡Gracias!</p>
      ) : null}
    </div>
  );
}

function Encuesta({ id }) {
  const { data, error } = useSWR(`${BASE}/encuestas/${id}`, get, { revalidateOnFocus: false });
  if (error)
    return (
      <Vacio titulo="No se pudo abrir la encuesta" texto={errorDe(error)}>
        <Link href="/empleado/panel/encuestas" className="font-semibold text-brand">
          Volver
        </Link>
      </Vacio>
    );
  if (!data) return <Cargando />;
  if (data.contestada)
    return (
      <Vacio titulo="Ya contestaste esta encuesta" texto="¡Gracias por tu tiempo!">
        <Link href="/empleado/panel/encuestas" className="font-semibold text-brand">
          Volver
        </Link>
      </Vacio>
    );
  return (
    <div className="mx-auto max-w-xl pb-24">
      <Link href="/empleado/panel/encuestas" className="mx-4 mt-3 inline-block text-sm font-semibold text-brand">
        ‹ Encuestas
      </Link>
      <Contestar encuesta={data.encuesta} alEnviar={(cuerpo) => axios.post(`${BASE}/encuestas/${id}/respuestas`, cuerpo)} />
    </div>
  );
}

export default function MisEncuestas({ id }) {
  return id ? <Encuesta id={id} /> : <Lista />;
}
