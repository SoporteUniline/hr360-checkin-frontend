"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useModulosActivos } from "@/components/modulos/useModulos";
import { rutaInicioPanel } from "@/lib/inicioPanel.mjs";

// Primera pantalla de RH y dueño (el login y el reloj mandan a /panel): el muro del Centro de comunicados si la empresa
// lo tiene y el usuario puede verlo; si no, el Monitor (src/lib/inicioPanel.mjs).
// replace: «Atrás» no regresa a esta ruta vacía.
export default function PanelPage() {
  const router = useRouter();
  const { permisosSesion } = useAuth();
  const { activos, listo, opciones } = useModulosActivos();
  const destino = listo ? rutaInicioPanel({ activos, permisos: permisosSesion, opciones }) : null;

  useEffect(() => {
    if (destino) router.replace(destino);
  }, [router, destino]);

  return null;
}
