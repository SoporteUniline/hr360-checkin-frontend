"use client";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import axiosInstance from "@/lib/axios";
import Navbar from "@/components/Navbar";
import { Building2, Lock } from "lucide-react";
import { useSnackbar } from "notistack";

export default function SeleccionarRelojPage() {
  const { dataUser } = useAuth();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const [loadingSelection, setLoadingSelection] = useState(false);
  const redirecting = useRef(false);

  const handleSelectEmpresa = async (idEmpresa) => {
    setLoadingSelection(true);
    try {
      const response = await fetch(
        `/api/empresas/check-status?id=${idEmpresa}`,
      );
      const data = await response.json();

      if (!data.hasActivePlan) {
        enqueueSnackbar("Esta empresa no tiene una suscripción activa.", {
          variant: "error",
        });
        setLoadingSelection(false);
        redirecting.current = false;
        return;
      }

      if (data.slug) {
        router.push(`/${data.slug}`);
      } else {
        enqueueSnackbar("No se encontró la ruta (slug) para esta empresa", {
          variant: "warning",
        });
        setLoadingSelection(false);
      }
    } catch (error) {
      console.error("Error al seleccionar empresa:", error);
      enqueueSnackbar("Error de conexión local", {
        variant: "error",
      });
      setLoadingSelection(false);
    }
  };

  useEffect(() => {
    const empresas = dataUser?.empresas_detalle || [];

    if (
      empresas.length === 1 &&
      !redirecting.current &&
      empresas[0].id_empresa
    ) {
      redirecting.current = true;
      handleSelectEmpresa(empresas[0].id_empresa);
    }
  }, [dataUser]);

  const empresas = dataUser?.empresas_detalle || [];

  if (loadingSelection) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600 mb-4"></div>
        <p className="text-lg font-medium text-gray-600">
          Verificando suscripción y accediendo...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto py-12 px-4 mt-8">
        <h1 className="text-3xl font-extrabold text-center text-gray-900 mb-10">
          Selecciona una Empresa para el Reloj
        </h1>

        {empresas.length === 0 ? (
          <p className="text-center text-gray-500">
            No tienes empresas asignadas.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {empresas.map((emp) => (
              <div
                key={emp.id_empresa}
                onClick={() => handleSelectEmpresa(emp.id_empresa)}
                className="group cursor-pointer bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all border p-6 flex flex-col items-center relative overflow-hidden"
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
                <h3 className="text-xl font-bold">{emp.nombre}</h3>

                <div className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  Entrar al Reloj
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
