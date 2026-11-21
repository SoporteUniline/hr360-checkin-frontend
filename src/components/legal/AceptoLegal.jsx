"use client";

import Link from "next/link";

// Casilla obligatoria de aceptación. `conTerminos`: además del aviso de privacidad, los términos (al crear cuenta).
export default function AceptoLegal({ checked, onChange, conTerminos = false, id = "acepto-legal", className = "" }) {
  const enlace = "font-semibold text-[#2c56e8] underline underline-offset-2";
  return (
    <label htmlFor={id} className={`flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-[#4b5270] ${className}`}>
      <input
        id={id}
        type="checkbox"
        required
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-5 shrink-0 accent-[#2c56e8]"
      />
      <span>
        He leído y acepto el{" "}
        <Link href="/aviso-privacidad" target="_blank" className={enlace}>Aviso de privacidad</Link>
        {conTerminos ? (
          <>
            {" "}y los{" "}
            <Link href="/terminos-condiciones" target="_blank" className={enlace}>Términos y condiciones</Link>
          </>
        ) : null}
        .
      </span>
    </label>
  );
}
