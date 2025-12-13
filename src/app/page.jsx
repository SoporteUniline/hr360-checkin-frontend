"use client";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import axiosInstance from "@/lib/axios";
import Navbar from "@/components/Navbar";
import { useRef } from "react";

export default function Home() {
  const { dataUser, isLoggedIn } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState("idle"); // "idle" | "loading" | "notfound" | "error" | "forbidden"
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!isLoggedIn) return;
    if (!dataUser) return;
    if (hasFetched.current) return;

    hasFetched.current = true;

    if (dataUser.tipo_usuario !== "Recruiter") {
      setStatus("forbidden");
      return;
    }

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
  }, [dataUser, isLoggedIn]);

  // Usuario loggeado pero no Recruiter
  if (status === "forbidden") {
    return (
      <>
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4 text-center">
          {/* Logo HR360 */}
          <img src="/assets/logo.png" alt="HR360 Logo" className="w-40 mb-6" />

          {/* Mensaje de bienvenida */}
          <h1 className="text-3xl font-bold mb-4">
            Bienvenido a HR360 {dataUser.nombre}
          </h1>

          {/* Botones de navegación */}
          <div className="flex gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="cursor-pointer px-6 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow"
            >
              Ir al Panel
            </button>
          </div>
        </div>
      </>
    );
  }

  // Usuario no loggeado → landing inicial
  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center">
        <img src="/assets/logo.png" alt="HR360 Logo" className="w-40 mb-6" />
        <h1 className="text-3xl font-bold mb-4">
          Bienvenido a nuestra plataforma
        </h1>
        <p className="text-gray-600 mb-6">
          Por favor inicia sesión para continuar.
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => router.push("/login")}
            className="cursor-pointer px-6 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow"
          >
            Iniciar sesión
          </button>
        </div>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600 mr-4"></div>
        <p className="text-lg font-medium">Redirigiendo a tu empresa...</p>
      </div>
    );
  }

  if (status === "notfound") {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center">
        <h1 className="text-2xl font-semibold mb-2">Empresa no encontrada</h1>
        <p className="text-gray-600 mb-4">
          No encontramos información asociada a tu cuenta. Si crees que esto es
          un error, contacta a soporte.
        </p>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow"
        >
          Ir al inicio
        </button>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center">
        <h1 className="text-2xl font-semibold mb-2">Algo salió mal</h1>
        <p className="text-gray-600 mb-4">
          Hubo un problema al obtener la información. Intenta de nuevo más
          tarde.
        </p>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  return null;
}
