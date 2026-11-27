"use client";

// Piezas compartidas del panel del newsletter (docs/newsletter.md): letra de 16 px o más, títulos en 700, botones de
// 48 px con texto, sin degradados. Es una página, no una ventana: las confirmaciones van en línea.
import Cookies from "js-cookie";

export const API = `${process.env.NEXT_PUBLIC_RUTA_BACKEND ?? ""}/checador/newsletter`;
export const CAMPO = "w-full rounded-xl border border-[#C7CEDD] bg-white px-4 text-base text-[#0B1033] outline-none focus-visible:border-[#2C56E8] focus-visible:ring-[3px] focus-visible:ring-[#2C56E8]/30 aria-[invalid=true]:border-[#B91C1C]";
export const BOTON = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-base font-bold focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#2C56E8]/40 disabled:cursor-not-allowed disabled:opacity-60";
export const PRIMARIO = `${BOTON} bg-[#2C56E8] text-white hover:bg-[#1F44C8]`;
export const SECUNDARIO = `${BOTON} border-2 border-[#2C56E8] bg-white text-[#2C56E8] hover:bg-[#EEF2FF]`;
export const PELIGRO = `${BOTON} border-2 border-[#B91C1C] bg-white text-[#B91C1C] hover:bg-[#FEF2F2]`;
export const PELIGRO_LLENO = `${BOTON} bg-[#B91C1C] text-white hover:bg-[#991B1B]`;
export const TARJETA = "grid gap-4 rounded-2xl border border-[#D8DEEB] bg-white p-5";

const TONOS = {
  neutro: "bg-[#F1F5F9] text-[#334155]",
  info: "bg-[#DBEAFE] text-[#1E3A8A]",
  exito: "bg-[#DCFCE7] text-[#166534]",
  alerta: "bg-[#FEF3C7] text-[#78350F]",
  peligro: "bg-[#FEE2E2] text-[#991B1B]",
};
// envolver: textos largos («Aprobado, con fecha de entrada: 01/01/2027») bajan de línea en vez de salirse en el celular.
export function Insignia({ tono = "neutro", envolver = false, children }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-base font-bold ${envolver ? "max-w-full whitespace-normal" : "shrink-0 whitespace-nowrap"} ${TONOS[tono] ?? TONOS.neutro}`}>{children}</span>;
}

export function Aviso({ tono = "alerta", titulo, children }) {
  const estilos = {
    alerta: "border-[#F59E0B] bg-[#FFFBEB] text-[#78350F]",
    peligro: "border-[#DC2626] bg-[#FEF2F2] text-[#7F1D1D]",
    info: "border-[#2C56E8] bg-[#EFF6FF] text-[#1E3A8A]",
    exito: "border-[#059669] bg-[#ECFDF5] text-[#065F46]",
  };
  return (
    <div role={tono === "peligro" ? "alert" : "status"} className={`rounded-xl border-l-4 p-4 ${estilos[tono] ?? estilos.alerta}`}>
      {titulo ? <p className="font-bold">{titulo}</p> : null}
      <div>{children}</div>
    </div>
  );
}

/** fetch con la sesión; error legible del servidor. */
export async function pedir(ruta, opciones = {}) {
  const r = await fetch(`${API}${ruta}`, {
    ...opciones,
    headers: { Authorization: `Bearer ${Cookies.get("token")}`, ...(opciones.body ? { "content-type": "application/json" } : {}), ...(opciones.headers ?? {}) },
  });
  const cuerpo = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(cuerpo.error || "No se pudo completar la acción.");
  return cuerpo;
}
