"use client";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import RelojChecador from "@/components/RelojChecador";
import Navbar from "@/components/Navbar";

export default function EmpleadoInicioPage() {
  const { dataUser, isLoggedIn } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    if (!isLoggedIn || !dataUser) return;

    if (dataUser.tipo_usuario !== "Empleado") {
      setStatus("forbidden");
      return;
    }

    if (dataUser.esEmpleado) {
      setStatus("ok");
    } else {
      setStatus("error");
    }
  }, [dataUser, isLoggedIn]);

  if (status === "idle" || !isLoggedIn || !dataUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600 mr-4"></div>
        <p className="text-lg font-medium">Cargando usuario...</p>
      </div>
    );
  }

  if (status === "forbidden") {
    return (
      <>
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4 text-center">
          <img src="/assets/logo.png" alt="HR360 Logo" className="w-40 mb-6" />
          <h1 className="text-3xl font-bold mb-4">
            Hola {dataUser?.nombre}, no tienes acceso a este módulo.
          </h1>
          <button
            onClick={() => router.push("/dashboard")}
            className="cursor-pointer px-6 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow"
          >
            Ir al Panel
          </button>
        </div>
      </>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center">
        <h1 className="text-2xl font-semibold mb-2">Error de información</h1>
        <p className="text-gray-600 mb-4">
          No se encontró la empresa o el empleado asociado a tu cuenta.
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

  if (status === "ok") {
    return (
      <>
        <Navbar />
        <div className="pt-14">
          <RelojChecador
            idEmpresa={dataUser.id_empresa}
            modoEmpleado={true}
            idEmpleado={dataUser.id_empleado}
          />
        </div>
      </>
    );
  }

  return null;
}
