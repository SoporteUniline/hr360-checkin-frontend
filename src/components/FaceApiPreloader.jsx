"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { scheduleFaceApiPreload } from "@/lib/faceapi-preload";

export default function FaceApiPreloader() {
  const pathname = usePathname();
  const { isLoggedIn } = useAuth();
  // No en /panel: preparar los modelos (~7 MB y la GPU) compite con pantallas pesadas como Asistencias.
  // (INC-011) Tampoco en el panel del empleado: ahí solo se descargan los archivos; prepararlos bloqueaba el hilo
  // principal segundos al abrir la app y los toques no respondían. El reloj (y la captura de rostro) los preparan al
  // abrirse, ya con los archivos en caché. /seleccionar-reloj lleva directo al reloj: ahí sí se prepara completo.
  const modo = !isLoggedIn ? null
    : pathname === "/seleccionar-reloj" ? "completa"
    : pathname === "/empleado" || pathname?.startsWith("/empleado/") ? "descarga"
    : null;

  useEffect(() => {
    if (!modo) return;
    return scheduleFaceApiPreload({ soloDescarga: modo === "descarga" });
  }, [modo]);

  return null;
}
