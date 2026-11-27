import Link from "next/link";
import { Loader2 } from "lucide-react";

const ESTILOS = {
  primaria: "border-0 bg-[#2C56E8] text-white hover:bg-[#1E40C4] font-bold",
  contorno: "border-[1.5px] border-[#2C56E8] bg-white text-[#1E40C4] hover:bg-[#EEF2FF] font-semibold",
  normal: "border border-[#CBD3E3] bg-white text-[#111827] hover:bg-[#F3F5FA] font-semibold",
  texto: "border-0 bg-transparent text-[#374151] hover:bg-white font-semibold",
  peligro: "border border-[#FCA5A5] bg-white text-[#991B1B] hover:bg-[#FEF2F2] font-semibold",
};

/** Un botón de acción con texto (≥ 48 px). accion: { clave, texto, onClick, href, tipo, deshabilitada, ayuda, cargando } */
export function BotonAccion({ accion, className = "" }) {
  const clase = `inline-flex min-h-12 items-center justify-center gap-2 rounded-[14px] px-5 text-[17px] transition-colors lg:text-[16px] disabled:cursor-not-allowed disabled:opacity-60 ${ESTILOS[accion.tipo ?? "normal"]} ${className}`;
  const contenido = (
    <>
      {accion.cargando ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}
      {accion.texto}
    </>
  );
  if (accion.href && !accion.deshabilitada) {
    return <Link href={accion.href} className={`${clase} no-underline`} data-accion={accion.clave}>{contenido}</Link>;
  }
  return (
    <button type="button" className={clase} onClick={accion.onClick} disabled={accion.deshabilitada || accion.cargando} title={accion.ayuda} data-accion={accion.clave}>
      {contenido}
    </button>
  );
}

/**
 * Barra de acciones de la vista de detalle (escritorio y tableta): UNA principal, las demás con contorno o normales y
 * al final, separadas, las secundarias tipo texto («Editar datos»). En celular se usa BarraAccionesMovil.
 */
export default function BarraAcciones({ acciones = [], etiqueta = "Acciones" }) {
  const visibles = acciones.filter(Boolean);
  const principales = visibles.filter((a) => a.tipo !== "texto");
  const secundarias = visibles.filter((a) => a.tipo === "texto");
  return (
    <div role="toolbar" aria-label={etiqueta} className="hidden flex-wrap items-center gap-2.5 lg:flex">
      {principales.map((a) => <BotonAccion key={a.clave} accion={a} />)}
      <span className="flex-1" />
      {secundarias.map((a) => <BotonAccion key={a.clave} accion={a} />)}
    </div>
  );
}
