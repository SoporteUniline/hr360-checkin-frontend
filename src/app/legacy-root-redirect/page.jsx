"use client";

/**
 * LEGACY
 * Esta página contiene el comportamiento histórico que antes vivía en `src/app/page.jsx`.
 *
 * Motivo del cambio:
 * - Ahora la homepage ("/") es una landing dedicada (ver `src/app/(landing)/page.jsx`).
 * - Next.js no permite dos páginas resolviendo a la misma ruta "/".
 *
 * Nota:
 * - Se conserva para referencia y para poder acceder manualmente a este flujo si lo necesitas.
 */

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import axiosInstance from "@/lib/axios";
import Navbar from "@/components/Navbar";
import { Building2 } from "lucide-react"; // Icono de respaldo

export default function HomeLegacyRootRedirect() {
  const { dataUser, isLoggedIn } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState("idle");
  const [loadingSelection, setLoadingSelection] = useState(false);
  const hasRedirected = useRef(false);

  const handleSelectEmpresa = async (idEmpresa) => {
    setLoadingSelection(true);
    try {
      const res = await axiosInstance.get(`/empresas/id/${idEmpresa}/slug`);
      const slug = res.data.slug;
      if (slug) router.push(`/${slug}`);
      else alert("No se encontró la ruta para esta empresa");
    } catch (error) {
      console.error("Error obteniendo slug:", error);
      alert("Error al conectar con la empresa");
    } finally {
      setLoadingSelection(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn || !dataUser || hasRedirected.current) return;

    if (dataUser.tipo_usuario === "Admin") {
      hasRedirected.current = true;
      router.push("/dashboard/empresas"); // O la ruta de tu panel admin
      return;
    }

    if (dataUser.tipo_usuario === "Recruiter") {
      const detalles = dataUser.empresas_detalle || [];
      if (detalles.length === 1) {
        hasRedirected.current = true;
        handleSelectEmpresa(detalles[0].id_empresa);
      } else if (detalles.length > 1) {
        setStatus("selection");
      } else {
        setStatus("notfound");
      }
      return;
    }

    if (dataUser.tipo_usuario === "Empleado") {
      hasRedirected.current = true;
      router.push("/empleado/panel/solicitudes");
      return;
    }
  }, [dataUser, isLoggedIn]);

  if (!isLoggedIn) return <LandingLogin router={router} />;

  if (status === "loading" || loadingSelection) {
    return <LoadingState message="Cargando acceso a la empresa..." />;
  }

  if (status === "selection") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-5xl mx-auto py-12 px-4 mt-8">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-extrabold text-gray-900">
              Selecciona una Empresa
            </h1>
            <p className="text-gray-500 mt-2">
              Gestiona el Reloj Checador de tus sucursales asignadas
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {dataUser.empresas_detalle.map((emp) => (
              <div
                key={emp.id_empresa}
                onClick={() => handleSelectEmpresa(emp.id_empresa)}
                className="group cursor-pointer bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all border border-gray-100 p-6 flex flex-col items-center text-center"
              >
                <div className="w-24 h-24 mb-4 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center border-2 border-transparent group-hover:border-blue-500 transition-colors">
                  {emp.url_imagen ? (
                    <img
                      src={emp.url_imagen}
                      alt={emp.nombre}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Building2 className="text-gray-400 w-10 h-10" />
                  )}
                </div>
                <h3 className="text-xl font-bold text-gray-800">
                  {emp.nombre}
                </h3>
                <p className="text-sm text-gray-400">{emp.zona_horaria}</p>
                <div className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-semibold group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  Entrar al Reloj
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function LoadingState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600 mb-4"></div>
      <p className="text-lg font-medium text-gray-600">{message}</p>
    </div>
  );
}

function LandingLogin({ router }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen text-center">
      <img src="/assets/logo.png" alt="Logo" className="w-40 mb-6" />
      <h1 className="text-3xl font-bold mb-4">Bienvenido a Adamia</h1>
      <button
        onClick={() => router.push("/login")}
        className="px-6 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow"
      >
        Iniciar sesión
      </button>
    </div>
  );
}
