"use client";

// «Mis acciones» (26/11/2026): acciones del plan de clima de las que soy responsable (las asignó RH o mi jefe). Aquí
// llegan los avisos por correo y WhatsApp («Ver mis acciones»). Solo cambio el estado de las mías; el servidor lo valida.
import { useState } from "react";
import useSWR from "swr";
import axios from "@/lib/axios";
import { ESTADOS_ACCION, fechaCorta } from "@/lib/clima/modelo.mjs";
import { BASE, errorDe, get } from "./ui";

const conEmpresa = (url, empresa) => (empresa ? `${url}?empresa=${empresa}` : url);
const hoy = () => new Intl.DateTimeFormat("en-CA").format(new Date());

export default function MisAcciones({ empresa = null }) {
  const { data, error, mutate } = useSWR(conEmpresa(`${BASE}/mis-acciones`, empresa), get, { shouldRetryOnError: false, revalidateOnFocus: false });
  const [cambiando, setCambiando] = useState(null);
  const [fallo, setFallo] = useState(null);
  if (error || !data?.acciones?.length) return null;
  const cambiar = async (a, estado) => {
    setCambiando(a.id);
    setFallo(null);
    try {
      await axios.patch(conEmpresa(`${BASE}/mis-acciones/${a.id}`, empresa), { estado, revision: a.revision });
      await mutate();
    } catch (e) {
      setFallo(errorDe(e));
    } finally {
      setCambiando(null);
    }
  };
  return (
    <section aria-labelledby="mis-acciones" className="space-y-2" data-mis-acciones>
      <h2 id="mis-acciones" className="text-[16px] font-bold text-slate-900">
        Mis acciones del plan de clima
      </h2>
      <ul className="space-y-2">
        {data.acciones.map((a) => {
          const vencida = a.fecha_limite && a.fecha_limite < hoy() && ["pendiente", "en_curso"].includes(a.estado);
          return (
            <li key={a.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="break-words text-[15px] font-semibold text-slate-900">{a.texto}</p>
              <p className={`mt-1 text-[13px] ${vencida ? "font-semibold text-red-700" : "text-slate-500"}`}>
                {a.medicion ? `${a.medicion} · ` : ""}
                {a.fecha_limite ? `${vencida ? "venció" : "vence"} el ${fechaCorta(a.fecha_limite)}` : "sin fecha límite"}
              </p>
              <label className="mt-2 block max-w-xs">
                <span className="sr-only">Estado de «{a.texto}»</span>
                <select
                  value={a.estado}
                  disabled={cambiando === a.id}
                  onChange={(e) => cambiar(a, e.target.value)}
                  className={`min-h-11 w-full rounded-xl border border-slate-300 px-3 text-[14px] font-semibold ${ESTADOS_ACCION[a.estado]?.clase ?? ""}`}
                >
                  {data.estados.map((s) => (
                    <option key={s} value={s}>
                      {ESTADOS_ACCION[s]?.texto ?? s}
                    </option>
                  ))}
                </select>
              </label>
            </li>
          );
        })}
      </ul>
      {fallo ? (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-[14px] text-red-800">
          {fallo}
        </p>
      ) : null}
    </section>
  );
}
