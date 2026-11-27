"use client";
// Botón «?» del encabezado del panel y de Mi espacio: abre el panel lateral de Ayuda con la guía de la pantalla actual
// (la que nombra esta ruta en sus «pantallas»; si no hay, el buscador). También escucha el evento «abrir-ayuda» para que
// «Ayuda» (CentroAyudaApp) u otra pantalla abran una guía concreta: window.dispatchEvent(new CustomEvent("abrir-ayuda",
// { detail: { slug: "comunicados/publicar-comunicado", ancla: null } })).
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CircleHelp } from "lucide-react";
import PanelAyuda from "./PanelAyuda";

export const abrirAyuda = (slug = null, ancla = null) => window.dispatchEvent(new CustomEvent("abrir-ayuda", { detail: { slug, ancla } }));

export default function BotonAyuda({ variante = "panel" }) {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);
  const [pedido, setPedido] = useState(null);
  useEffect(() => {
    const abrir = (e) => { setPedido(e.detail?.slug ? { slug: e.detail.slug, ancla: e.detail.ancla ?? null, n: Date.now() } : null); setAbierto(true); };
    window.addEventListener("abrir-ayuda", abrir);
    return () => window.removeEventListener("abrir-ayuda", abrir);
  }, []);
  const clase = variante === "empleado"
    ? "grid size-11 place-items-center rounded-full text-slate-600 hover:bg-slate-100 hover:text-[#2563EB]"
    : "inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-[#2563EB]";
  return (
    <>
      <button type="button" onClick={() => { setPedido(null); setAbierto(true); }} aria-label="Ayuda de esta pantalla" title="Ayuda de esta pantalla" className={clase} data-boton-ayuda>
        <CircleHelp className={variante === "empleado" ? "size-6" : "size-4"} aria-hidden="true" />
      </button>
      <PanelAyuda abierto={abierto} alCambiar={(v) => { setAbierto(v); if (!v) setPedido(null); }} pathname={pathname} pedido={pedido} />
    </>
  );
}
