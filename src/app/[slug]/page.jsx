"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import axiosInstance from "@/lib/axios";
import RelojChecador from "@/components/RelojChecador";

function RedirectingPage({ message }) {
  const router = useRouter();
  const [counter, setCounter] = useState(5);

  useEffect(() => {
    const interval = setInterval(() => {
      setCounter((prev) => prev - 1);
    }, 1000);

    const timeout = setTimeout(() => {
      router.push("/panel");
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center h-screen text-center p-4">
      <div className="bg-red-50 p-8 rounded-3xl border border-red-100 max-w-md">
        <h1 className="text-2xl font-bold text-red-600 mb-4">{message}</h1>
        <p className="text-gray-500">
          Serás redirigido al panel en{" "}
          <span className="font-bold text-red-500">{counter}</span> segundos...
        </p>
      </div>
    </div>
  );
}

export default function ChecadorPage() {
  const params = useParams();
  const slug = params.slug;
  const [idEmpresa, setIdEmpresa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAndValidate = async () => {
      try {
        const res = await axiosInstance.get(`/empresas/slug/${slug}`);
        const id = res.data.id_empresa;

        const response = await fetch(`/api/empresas/check-subscription/${id}`, {
          cache: "no-store",
        });

        const statusData = await response.json();
        if (!statusData.hasActivePlan) {
          setError("Suscripción inactiva");
          return;
        }

        setIdEmpresa(id);
      } catch (err) {
        if (err.response?.status === 404) {
          setError("Empresa no encontrada");
        } else {
          setError("Error de conexión");
        }
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchAndValidate();
  }, [slug]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600 mr-4"></div>
        <p className="text-lg font-medium text-gray-600">Validando acceso...</p>
      </div>
    );

  if (error === "Suscripción inactiva") {
    return (
      <RedirectingPage message="Esta empresa no cuenta con una suscripción activa para el Reloj Checador." />
    );
  }

  if (error || !idEmpresa) {
    return <RedirectingPage message={error || "Empresa no encontrada"} />;
  }

  return <RelojChecador idEmpresa={idEmpresa} />;
}
