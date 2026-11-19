"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { scheduleFaceApiPreload } from "@/lib/faceapi-preload";

export default function FaceApiPreloader() {
  const pathname = usePathname();
  const { isLoggedIn } = useAuth();
  // (19/11/2026) Ya no en /panel: preparar los modelos (~7 MB y la GPU) competía con pantallas
  // pesadas como Asistencias y se dibujaban a pedazos. El reloj los carga al abrirse.
  const inApp = pathname === "/empleado" || pathname?.startsWith("/empleado/") ||
    pathname === "/seleccionar-reloj";

  useEffect(() => {
    if (!isLoggedIn || !inApp) return;
    return scheduleFaceApiPreload();
  }, [isLoggedIn, inApp]);

  return null;
}
