"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Id del ancla de una sección del índice (`<SeccionFormulario id={anclaSeccion("sueldo")}>`). */
export const anclaSeccion = (clave) => `seccion-${clave}`;

/** Lleva la pantalla suave hasta una sección (sin animación si la persona pidió menos movimiento). */
export function irASeccion(clave) {
  const el = typeof document !== "undefined" ? document.getElementById(anclaSeccion(clave)) : null;
  if (!el) return;
  const quieto = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  // «instant», no «auto»: el panel trae scroll-behavior: smooth en el CSS y «auto» lo seguiría.
  el.scrollIntoView({ behavior: quieto ? "instant" : "smooth", block: "start" });
}

/**
 * La sección que se está viendo: la última cuyo título ya pasó la parte de arriba de la pantalla (con 140 px de margen
 * para el índice compacto de celular). Al llegar al final de la página, la última.
 */
function useSeccionVisible(claves) {
  const [visible, setVisible] = useState(claves[0] ?? null);
  const firma = claves.join("|");
  useEffect(() => {
    let cuadro = 0;
    const revisar = () => {
      cuadro = 0;
      let actual = claves[0] ?? null;
      for (const c of claves) {
        const el = document.getElementById(anclaSeccion(c));
        if (el && el.getBoundingClientRect().top <= 140) actual = c;
      }
      const alFinal = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (alFinal && window.scrollY > 0) actual = claves.at(-1) ?? actual;
      setVisible(actual);
    };
    const programar = () => { if (!cuadro) cuadro = requestAnimationFrame(revisar); };
    revisar();
    window.addEventListener("scroll", programar, { passive: true });
    window.addEventListener("resize", programar);
    return () => {
      window.removeEventListener("scroll", programar);
      window.removeEventListener("resize", programar);
      if (cuadro) cancelAnimationFrame(cuadro);
    };
  }, [firma]); // eslint-disable-line react-hooks/exhaustive-deps
  return visible;
}

function Estado({ faltan }) {
  return faltan > 0 ? (
    <span data-chico data-estado="error" data-falta={faltan} className="shrink-0 whitespace-nowrap rounded-full bg-estado-error px-2 py-0.5 text-[15px] font-bold leading-tight text-estado-error-texto">
      Falta {faltan}
    </span>
  ) : (
    <span data-estado="exito" data-completa className="flex size-5 shrink-0 items-center justify-center rounded-full bg-paso-listo text-white">
      <Check aria-hidden="true" className="size-3.5" strokeWidth={3.5} />
      <span className="sr-only">completa</span>
    </span>
  );
}

/**
 * ÍNDICE de un formulario largo en una sola hoja (28/11/2026, pedido del dueño para el contrato: «todo en una sola hoja
 * hacia abajo, sin siguiente, siguiente»; docs/sistema-diseno.md). Cada sección sale con ✓ (completa) o con la pastilla
 * roja «Falta N»; al hacer clic la pantalla baja suave hasta ella, y la sección que se está viendo queda resaltada.
 *   Desde 1200 px: columna fija de 232 px a la izquierda (pegada arriba al bajar).
 *   Menos de 1200 px: una fila compacta de pastillas arriba, pegada al bajar (se recorre de lado si no caben).
 * Va en el prop `indice` de PaginaFormulario, que lo acomoda. Cada sección debe llevar id={anclaSeccion(clave)}.
 *
 * Props:
 *   secciones  [{ clave, texto, faltan }] en orden (faltan: cuántos datos faltan o hay que corregir; 0 = completa).
 *   titulo     encabezado del índice en escritorio («Secciones» por omisión).
 *   aviso      nodo opcional arriba de la lista (p. ej. «Faltan 5 datos» al intentar guardar).
 *
 * Ejemplo:
 *   <PaginaFormulario indice={<IndiceSecciones secciones={[{ clave: "persona", texto: "Persona y puesto", faltan: 1 }]} />}>
 *     <SeccionFormulario id={anclaSeccion("persona")} titulo="Persona y puesto">…</SeccionFormulario>
 *   </PaginaFormulario>
 */
export default function IndiceSecciones({ secciones = [], titulo = "Secciones", aviso = null }) {
  const visible = useSeccionVisible(secciones.map((s) => s.clave));
  const enlace = (s, compacto) => {
    const activa = s.clave === visible;
    return (
      <a
        key={s.clave}
        href={`#${anclaSeccion(s.clave)}`}
        onClick={(e) => { e.preventDefault(); irASeccion(s.clave); }}
        aria-current={activa ? "location" : undefined}
        data-indice={s.clave}
        data-activa={activa || undefined}
        className={cn(
          "flex items-center gap-2 font-medium no-underline outline-none focus-visible:ring-[3px] focus-visible:ring-brand/40",
          compacto
            ? "min-h-11 shrink-0 whitespace-nowrap rounded-full border px-3.5"
            : "min-h-10 justify-between rounded-boton border-l-[3px] py-1.5 pl-3 pr-2",
          compacto
            ? activa ? "border-brand bg-seleccion text-seleccion-texto" : "border-borde bg-white text-texto hover:border-borde-campo"
            : activa ? "border-brand bg-seleccion font-semibold text-seleccion-texto" : "border-transparent text-texto hover:bg-franja",
        )}
      >
        <span className={cn(!compacto && "min-w-0")}>{s.texto}</span>
        <Estado faltan={s.faltan} />
      </a>
    );
  };
  return (
    <>
      <nav aria-label="Secciones del formulario" data-indice-secciones className="hidden w-[232px] shrink-0 self-start min-[75rem]:sticky min-[75rem]:top-4 min-[75rem]:block">
        <p data-chico className="m-0 mb-2 px-3 text-[15px] font-semibold text-texto-secundario">{titulo}</p>
        {aviso}
        <div className="flex flex-col gap-0.5">{secciones.map((s) => enlace(s, false))}</div>
      </nav>
      <nav aria-label="Secciones del formulario (compacto)" data-indice-compacto
        className="sticky top-0 z-10 -mx-4 -mt-4 flex lg:-mt-6 gap-2 overflow-x-auto border-b border-borde bg-fondo-pagina/95 px-4 py-2.5 backdrop-blur-sm min-[75rem]:hidden lg:-mx-8 lg:px-8">
        {secciones.map((s) => enlace(s, true))}
      </nav>
    </>
  );
}
