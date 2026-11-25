"use client";

// (INC-007) Al entrar al panel y al cambiar de pantalla dentro de él: si el <body> quedó bloqueado (pointer-events o
// scroll-lock) sin ningún diálogo abierto, se libera para que el panel responda al toque. Ver src/lib/ui/cuerpoBloqueado.mjs.
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { liberarCuerpoBloqueado } from "@/lib/ui/cuerpoBloqueado.mjs";

export default function CuerpoDesbloqueado() {
  const pathname = usePathname();
  useEffect(() => {
    // Después de que terminen los cierres en curso (las animaciones de salida de Radix duran ~200 ms).
    const t = setTimeout(() => {
      const corregido = liberarCuerpoBloqueado();
      if (corregido.length) console.warn("Panel: se liberó el bloqueo del body sin diálogo abierto:", corregido.join(", "));
    }, 400);
    return () => clearTimeout(t);
  }, [pathname]);
  return null;
}
