"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { scheduleFaceApiPreload } from "@/lib/faceapi-preload";

export default function FaceApiPreloader() {
  const pathname = usePathname();
  const { isLoggedIn } = useAuth();
  const inApp = pathname === "/panel" || pathname?.startsWith("/panel/") ||
    pathname === "/empleado" || pathname?.startsWith("/empleado/") ||
    pathname === "/seleccionar-reloj";

  useEffect(() => {
    if (!isLoggedIn || !inApp) return;
    return scheduleFaceApiPreload();
  }, [isLoggedIn, inApp]);

  return null;
}
