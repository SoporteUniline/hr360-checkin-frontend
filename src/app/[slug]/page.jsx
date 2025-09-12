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
      router.push("/");
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center h-screen text-center">
      <h1 className="text-2xl font-bold mb-4">{message}</h1>
      <p className="text-gray-500">
        Serás redirigido al inicio en {counter} segundos...
      </p>
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
    const fetchEmpresa = async () => {
      try {
        const res = await axiosInstance.get(`/empresas/slug/${slug}`);
        setIdEmpresa(res.data.id_empresa);
      } catch (err) {
        if (err.response?.status === 404) {
          setError("Empresa no encontrada");
        } else {
          setError("Error inesperado");
        }
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchEmpresa();
  }, [slug]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600 mr-4"></div>
        <p className="text-lg font-medium">Cargando empresa...</p>
      </div>
    );

  if (error)
    return <RedirectingPage message="Ocurrió un error con la empresa" />;
  if (!idEmpresa)
    return <RedirectingPage message="Empresa no encontrada, compa" />;

  return <RelojChecador idEmpresa={idEmpresa} />;
}
