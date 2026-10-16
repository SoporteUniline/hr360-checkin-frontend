"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { usePathname, useRouter } from "next/navigation";

/**
 * Hook para gestionar el botón físico o gesto de "Atrás" en dispositivos Android.
 * Evita que la app se cierre abruptamente cuando el usuario está navegando
 * entre módulos internos.
 */
export function useNativeBackButton() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let listenerHandle = null;

    const setupListener = async () => {
      try {
        listenerHandle = await App.addListener("backButton", ({ canGoBack }) => {
          // Rutas raíz donde presionar "Atrás" sí debe salir de la aplicación
          const rootRoutes = [
            "/login",
            "/panel",
            "/empleado",
            "/dashboard",
            "/",
          ];
          const isAtRoot = rootRoutes.includes(pathname);

          if (isAtRoot || !canGoBack) {
            App.exitApp();
          } else {
            router.back();
          }
        });
      } catch (err) {
        console.warn("Error configurando listener de backButton:", err);
      }
    };

    setupListener();

    return () => {
      if (listenerHandle && typeof listenerHandle.remove === "function") {
        listenerHandle.remove();
      }
    };
  }, [pathname, router]);
}
