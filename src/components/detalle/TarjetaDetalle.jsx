import { useId } from "react";

/**
 * Tarjeta de una vista de detalle: blanca, esquinas de 24 px, título de 18 px en negritas (700). accion: nodo a la
 * derecha del título (p. ej. un enlace «Plantilla: …»). nota: texto de ayuda azul al final.
 */
export default function TarjetaDetalle({ titulo, accion = null, nota = null, children, className = "", ...resto }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={`flex min-w-0 flex-col gap-2 rounded-3xl border border-[#E5E7EB] bg-white p-5 text-[17px] text-[#111827] lg:text-[16px] ${className}`} {...resto}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={id} className="m-0 text-[18px] font-bold">{titulo}</h2>
        {accion}
      </div>
      {children}
      {nota ? <p className="m-0 mt-2 rounded-xl bg-[#EEF2FF] px-3 py-2.5 text-[17px] text-[#1E3A8A] lg:text-[16px]">{nota}</p> : null}
    </section>
  );
}
