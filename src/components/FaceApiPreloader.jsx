"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { scheduleFaceApiPreload } from "@/lib/faceapi-preload";

export default function FaceApiPreloader() {
  const pathname = usePathname();
  const { isLoggedIn } = useAuth();
  // No en /panel: preparar los modelos (~7 MB y la GPU) compite con pantallas pesadas como Asistencias.
  // El reloj los carga al abrirse.
  const inApp = pathname === "/empleado" || pathname?.startsWith("/empleado/") ||
    pathname === "/seleccionar-reloj";

  useEffect(() => {
    if (!isLoggedIn || !inApp) return;
    return scheduleFaceApiPreload();
  }, [isLoggedIn, inApp]);

  return null;
}
