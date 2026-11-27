"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { resultadoBaja, tokenBajaValido } from "@/lib/prospectos/reglas.mjs";

const API = `${process.env.NEXT_PUBLIC_RUTA_BACKEND ?? ""}/checador/prospectos/publico/baja`;
const CORREO_SOPORTE = "sistema@adamia.mx";

// Se da de baja con un botón (no al abrir la página): los revisores de enlaces de algunos correos abren las ligas solos
// y darían de baja a alguien sin que lo pidiera. Letra grande, botón de 56 px y sin degradados (para todas las edades).
export default function BajaNoticias() {
  const token = useSearchParams().get("token") ?? "";
  const [estado, setEstado] = useState(tokenBajaValido(token) ? "pendiente" : "sin-token");
  const [resultado, setResultado] = useState(null);

  const darDeBaja = async () => {
    setEstado("enviando");
    try {
      const r = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
      const cuerpo = await r.json().catch(() => ({}));
      setResultado(resultadoBaja(r.status, cuerpo));
    } catch {
      setResultado(resultadoBaja(0));
    }
    setEstado("terminado");
  };

  const mostrar = estado === "sin-token" ? resultadoBaja(404) : resultado;
  const exito = mostrar && (mostrar.tipo === "listo" || mostrar.tipo === "ya");

  return (
    <section className="bg-[#F5F7FB] px-4 py-16 text-[#0B1033] sm:py-24">
      <div className="mx-auto w-full max-w-xl rounded-3xl border border-[#D8DEEB] border-t-4 border-t-[#2C56E8] bg-white p-6 shadow-sm sm:p-10">
        {mostrar ? (
          <div aria-live="polite" className="grid gap-4">
            <h1 className="text-[1.75rem] font-bold leading-tight">{mostrar.titulo}</h1>
            <p className="text-[17px] leading-relaxed text-[#374151]">{mostrar.texto}</p>
            {!exito ? (
              <p className="text-[17px] leading-relaxed text-[#374151]">
                Correo: <a className="break-words font-bold text-[#2C56E8] underline underline-offset-2" href={`mailto:${CORREO_SOPORTE}?subject=Darme%20de%20baja%20de%20las%20noticias`}>{CORREO_SOPORTE}</a>
              </p>
            ) : null}
            {mostrar.tipo === "error" ? (
              <button type="button" onClick={darDeBaja} className="min-h-14 rounded-2xl bg-[#2C56E8] px-6 text-lg font-bold text-white hover:bg-[#1F44C8] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#0B1033]">
                Intentar de nuevo
              </button>
            ) : (
              <Link href="/" className="inline-flex min-h-14 items-center justify-center rounded-2xl border-2 border-[#2C56E8] px-6 text-lg font-bold text-[#2C56E8] hover:bg-[#EEF2FF]">
                Ir a la página de ADAMIA
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            <h1 className="text-[1.75rem] font-bold leading-tight">¿Ya no quieres recibir noticias de ADAMIA?</h1>
            <p className="text-[17px] leading-relaxed text-[#374151]">
              Dejarás de recibir correos con noticias sobre reformas laborales, novedades de ADAMIA y consejos de RH.
              Si tienes una cuenta en ADAMIA, los avisos de tu cuenta te seguirán llegando.
            </p>
            <button
              type="button"
              onClick={darDeBaja}
              disabled={estado === "enviando"}
              className="min-h-14 rounded-2xl bg-[#2C56E8] px-6 text-lg font-bold text-white hover:bg-[#1F44C8] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#0B1033] disabled:cursor-wait disabled:bg-[#6B7FD7]"
            >
              {estado === "enviando" ? "Dándote de baja…" : "Sí, darme de baja"}
            </button>
            <Link href="/" className="inline-flex min-h-12 items-center justify-center rounded-2xl px-6 text-[17px] font-bold text-[#2C56E8] underline underline-offset-2">
              No, seguir recibiéndolas
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
