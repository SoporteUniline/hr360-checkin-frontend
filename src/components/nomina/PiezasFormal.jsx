"use client";

// Piezas de las pantallas de la nómina formal (configuración, datos de cada persona y tablas fiscales). Las usa también
// gente mayor: letra de 16 px o más, títulos en 700, campos y botones de 48 px con texto y sin degradados.
export const CAMPO = "h-12 w-full rounded-xl border border-[#C7CEDD] bg-white px-4 text-base text-[#0B1033] outline-none focus-visible:border-[#2C56E8] focus-visible:ring-[3px] focus-visible:ring-[#2C56E8]/30 disabled:bg-slate-50";
const BASE = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-base font-bold focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#2C56E8]/40 disabled:cursor-not-allowed disabled:opacity-60";
export const BOTON = `${BASE} bg-[#2C56E8] text-white hover:bg-[#2347C4]`;
export const BOTON_SECUNDARIO = `${BASE} border border-[#C7CEDD] bg-white text-[#0B1033] hover:bg-slate-50`;
export const BOTON_PELIGRO = `${BASE} border border-red-300 bg-white text-red-800 hover:bg-red-50`;

export function Tarjeta({ titulo, children, acciones, id }) {
  return (
    <section aria-labelledby={id} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-base text-[#0B1033]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={id} className="text-xl font-bold">{titulo}</h2>
        {acciones}
      </div>
      {children}
    </section>
  );
}

export function Campo({ etiqueta, ayuda, children, htmlFor }) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={htmlFor} className="text-base font-bold">{etiqueta}</label>
      {children}
      {ayuda ? <p className="text-base text-slate-600">{ayuda}</p> : null}
    </div>
  );
}

const TONOS = {
  verde: "bg-[#DCFCE7] text-[#166534]",
  ambar: "bg-[#FEF3C7] text-[#92400E]",
  rojo: "bg-[#FEE2E2] text-[#991B1B]",
  gris: "bg-[#F1F5F9] text-[#374151]",
};
export function Etiqueta({ tono = "gris", children }) {
  return <span data-chico className={`inline-flex w-fit shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-[15px] font-bold ${TONOS[tono]}`}>{children}</span>;
}

export function Aviso({ tono = "ambar", titulo, children }) {
  const estilos = { ambar: "border-amber-300 bg-amber-50 text-amber-950", rojo: "border-red-300 bg-red-50 text-red-900", azul: "border-blue-200 bg-blue-50 text-[#0B1033]", verde: "border-emerald-300 bg-emerald-50 text-emerald-950" };
  return (
    <div role={tono === "rojo" ? "alert" : "status"} className={`grid gap-1 rounded-xl border p-4 text-base ${estilos[tono]}`}>
      {titulo ? <p className="font-bold">{titulo}</p> : null}
      {children}
    </div>
  );
}
