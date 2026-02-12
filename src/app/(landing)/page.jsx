"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import MarketingLanding from "@/components/landing/MarketingLanding";

/**
 * Homepage ("/")
 * - Basada en `Landing.txt` (solo front).
 * - Mantiene la UX del proyecto: si el usuario ya está logueado, lo redirige a su destino.
 * - Importante: usamos `isAuthChecked` para evitar parpadeos entre estados.
 */
export default function LandingHomePage() {
  const router = useRouter();
  const { dataUser, isLoggedIn, isAuthChecked } = useAuth();
  const hasFetched = useRef(false);
  const [status, setStatus] = useState("idle"); // "idle" | "loading" | "notfound" | "error"

  useEffect(() => {
    if (!isAuthChecked) return;
    if (!isLoggedIn) return;
    if (!dataUser) return;
    if (hasFetched.current) return;

    hasFetched.current = true;

    // Rutas consistentes con `src/app/login/page.jsx`
    const rutas = {
      User: "/home",
      Recruiter: "/panel",
      Admin: "/dashboard",
      Empleado: "/empleado",
    };

    // Recruiter: intenta redirigir por slug de empresa (flujo histórico de `/`).
    if (dataUser.tipo_usuario === "Recruiter") {
      const idEmpresa = dataUser.id_empresa || dataUser.empresas?.[0];
      if (!idEmpresa) {
        setStatus("notfound");
        return;
      }

      const fetchSlug = async () => {
        setStatus("loading");
        try {
          const res = await axiosInstance.get(`/empresas/id/${idEmpresa}/slug`);
          const slug = res.data.slug;
          if (slug) router.push(`/${slug}`);
          else setStatus("notfound");
        } catch {
          setStatus("error");
        }
      };

      fetchSlug();
      return;
    }

    // Otros tipos: manda al panel correspondiente.
    const destino = rutas[dataUser.tipo_usuario];
    if (destino) {
      router.push(destino);
      return;
    }

    // Fallback: si no se reconoce el tipo de usuario, al menos manda a login.
    router.push("/login");
  }, [dataUser, isAuthChecked, isLoggedIn, router]);

  // Esperando verificación de auth: mantenemos pantalla limpia.
  if (!isAuthChecked) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-white">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-t-4 border-[var(--adamia-blue)]" />
          <p className="text-base font-medium text-[var(--adamia-text-secondary)]">
            Cargando...
          </p>
        </div>
      </div>
    );
  }

  // Usuario no logueado: mostrar landing completa.
  if (!isLoggedIn) return <MarketingLanding />;

  // Usuario logueado (redirigiendo)
  if (status === "loading") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-white">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-t-4 border-[var(--adamia-blue)]" />
          <p className="text-base font-medium text-[var(--adamia-text-secondary)]">
            Redirigiendo...
          </p>
        </div>
      </div>
    );
  }

  if (status === "notfound") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-white px-6 text-center">
        <div className="max-w-lg">
          <h1 className="text-2xl font-semibold text-[var(--adamia-text-primary)]">
            Empresa no encontrada
          </h1>
          <p className="mt-3 text-[var(--adamia-text-secondary)]">
            No encontramos información asociada a tu cuenta. Si crees que esto es
            un error, contacta a soporte.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="mt-6 rounded-xl bg-[var(--adamia-blue)] px-5 py-2 text-white shadow hover:bg-blue-700"
          >
            Ir a iniciar sesión
          </button>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-white px-6 text-center">
        <div className="max-w-lg">
          <h1 className="text-2xl font-semibold text-[var(--adamia-text-primary)]">
            Algo salió mal
          </h1>
          <p className="mt-3 text-[var(--adamia-text-secondary)]">
            Hubo un problema al obtener la información. Intenta de nuevo más
            tarde.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="mt-6 rounded-xl bg-[var(--adamia-blue)] px-5 py-2 text-white shadow hover:bg-blue-700"
          >
            Volver a iniciar sesión
          </button>
        </div>
      </div>
    );
  }

  // Si ya está logueado y no estamos en estado de error/cargando, devolvemos un loading corto.
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-white">
      <div className="h-10 w-10 animate-spin rounded-full border-t-4 border-[var(--adamia-blue)]" />
    </div>
  );
}

