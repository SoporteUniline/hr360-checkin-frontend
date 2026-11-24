"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { leerConsentimiento, guardarConsentimiento } from "@/lib/legal/cookies";

// Aviso de cookies del sitio público. Mientras no se acepte, el Pixel de Meta no se carga (GlobalThirdPartyScripts).
export default function AvisoCookies() {
  const [visible, setVisible] = useState(false);
  useEffect(() => setVisible(leerConsentimiento() == null), []);
  if (!visible) return null;

  const decidir = (valor) => {
    guardarConsentimiento(valor);
    setVisible(false);
  };

  return (
    <div role="region" aria-label="Aviso de cookies" className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-3xl rounded-2xl border border-[#e6e8f0] bg-white p-4 text-sm text-[#4b5270] shadow-[0_20px_50px_-20px_rgba(11,16,51,.45)] sm:p-5">
      <p className="m-0 leading-relaxed">
        Usamos cookies necesarias para que el sitio funcione y, con tu permiso, cookies de publicidad para medir nuestras campañas.{" "}
        <Link href="/aviso-privacidad#cookies" className="font-semibold text-[#2c56e8] underline underline-offset-2">Más información</Link>
      </p>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={() => decidir("rechazadas")} className="min-h-11 rounded-xl border border-[#c9cde0] bg-white px-4 font-semibold text-[#0b1033] hover:border-[#2c56e8]">
          Solo necesarias
        </button>
        <button type="button" onClick={() => decidir("aceptadas")} className="min-h-11 rounded-xl bg-[#2c56e8] px-4 font-semibold text-white hover:bg-[#1f44c8]">
          Aceptar todas
        </button>
      </div>
    </div>
  );
}
