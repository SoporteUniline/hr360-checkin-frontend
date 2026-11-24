"use client";

// «Mis encuestas», la liga del correo de Clima. El middleware ya la reparte por perfil (empleado → su app; RH o dueño →
// el panel; sin sesión → /login?next=/mis-encuestas). Esta página solo cubre el caso en que no pase por el middleware.
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { RUTA_NEUTRA, rutaMisEncuestas } from "@/lib/clima/pendientes.mjs";
import { urlLogin } from "@/lib/destinoLogin.mjs";

export default function MisEncuestasNeutra() {
  const router = useRouter();
  const { dataUser, isAuthChecked, isLoggedIn } = useAuth();
  useEffect(() => {
    if (!isAuthChecked) return;
    if (!isLoggedIn) router.replace(urlLogin(RUTA_NEUTRA));
    else router.replace(rutaMisEncuestas(dataUser?.tipo_usuario) || "/");
  }, [isAuthChecked, isLoggedIn, dataUser, router]);
  return <p role="status" className="p-8 text-center">Abriendo tus encuestas…</p>;
}
