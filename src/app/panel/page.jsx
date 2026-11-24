"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// El Monitor es la primera pantalla de RH y dueño (el login y el reloj mandan a /panel).
// replace: «Atrás» no regresa a esta ruta vacía.
const RUTA_INICIO_PANEL = "/panel/monitor";

export default function PanelPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(RUTA_INICIO_PANEL);
  }, [router]);

  return null;
}
