import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = 768;
// Misma consulta que useIsMobile, para leerla de inmediato en un efecto (useIsMobile empieza en false).
export const CONSULTA_MOVIL = `(max-width: ${MOBILE_BREAKPOINT}px)`;
export const esMovilAhora = () => typeof window !== "undefined" && window.matchMedia(CONSULTA_MOVIL).matches;

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(CONSULTA_MOVIL);

    const onChange = (e) => {
      setIsMobile(e.matches);
    };

    setIsMobile(mql.matches);

    mql.addEventListener("change", onChange);

    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
