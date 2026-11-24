"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import axiosInstance from "@/lib/axios";
import RelojChecador from "@/components/RelojChecador";
import { loadBrowserFaceApi } from "@/lib/faceapi-browser";
import { validadaHoy, validadaReciente, guardarValidada, olvidarValidada } from "@/lib/reloj/suscripcionDia.mjs";

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
  const [nombreEmpresa, setNombreEmpresa] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let vigente = true;
    // Consulta la empresa y su suscripción. Devuelve { id, nombre } si está activa; lanza si no se pudo consultar.
    const consultar = async () => {
      const res = await axiosInstance.get(`/empresas/slug/${slug}`);
      const id = res.data.id_empresa;
      const nombre = res.data.nombre || res.data.nombre_empresa || "";
      const response = await fetch(`/api/empresas/check-subscription/${id}`, { cache: "no-store" });
      const statusData = await response.json();
      if (!statusData.hasActivePlan) return { id, nombre, activa: false };
      guardarValidada(`slug:${slug}`, { idEmpresa: id, nombre });
      guardarValidada(`empresa:${id}`);
      return { id, nombre, activa: true };
    };

    const fetchAndValidate = async () => {
      // Validado hoy, o activo en los últimos 7 días: abre directo y revalida en segundo plano para que la
      // primera apertura del día no espere a la red. Si resulta inactiva, se bloquea.
      const hoy = validadaHoy(`slug:${slug}`);
      const reciente = hoy ?? validadaReciente(`slug:${slug}`);
      if (reciente?.idEmpresa) {
        setNombreEmpresa(reciente.nombre || "");
        setIdEmpresa(reciente.idEmpresa);
        setLoading(false);
        loadBrowserFaceApi().catch(() => {});
        if (!hoy) {
          consultar().then((r) => {
            if (!vigente || r.activa) return;
            olvidarValidada(`slug:${slug}`);
            setError("Suscripción inactiva");
          }).catch(() => {}); // Sin red: sigue abierto con la validación reciente.
        }
        return;
      }
      try {
        const r = await consultar();
        if (!vigente) return;
        setNombreEmpresa(r.nombre);
        if (!r.activa) {
          olvidarValidada(`slug:${slug}`);
          setError("Suscripción inactiva");
          return;
        }
        setIdEmpresa(r.id);
        // Los modelos del rostro (7 MB) se bajan después de validar para no competir por la red con la validación.
        loadBrowserFaceApi().catch(() => {});
      } catch (err) {
        if (!vigente) return;
        if (err.response?.status === 404) {
          setError("Empresa no encontrada");
        } else {
          setError("Error de conexión");
        }
      } finally {
        if (vigente) setLoading(false);
      }
    };

    if (slug) fetchAndValidate();
    return () => { vigente = false; };
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

  return <RelojChecador idEmpresa={idEmpresa} companySlug={slug} nombreEmpresa={nombreEmpresa} />;
}
