"use client";

// Panel de RH y dueño sin sesión (cerró sesión en otra pestaña o el servidor la rechazó y se borró la cookie): al login
// recordando la ruta actual, para volver ahí al entrar. Sin cookie y sin sesión, el middleware ya hace lo mismo al
// cargar la página. Con cookie y sin respuesta del servidor (sin conexión) no se manda a ningún lado.
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { useAuth } from "@/context/AuthContext";
import { urlLogin } from "@/lib/destinoLogin.mjs";

export default function SesionPanel() {
  const router = useRouter();
  const { isAuthChecked, isLoggedIn } = useAuth();
  useEffect(() => {
    if (!isAuthChecked || isLoggedIn || Cookies.get("token")) return;
    router.replace(urlLogin(`${window.location.pathname}${window.location.search}`));
  }, [isAuthChecked, isLoggedIn, router]);
  return null;
}
