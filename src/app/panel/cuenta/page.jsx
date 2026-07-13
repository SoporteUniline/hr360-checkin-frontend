"use client";
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import BasicInfoForm from "./BasicInfoForm";
import { Icon } from "@iconify/react";
import useSWR from "swr";
import { fetcherWithToken, swr_config } from "@/lib/fetcher";
import PasswordChange from "./Contrasena";
import { Building, KeyRound, User, UserCog } from "lucide-react";
import EncabezadoPagina from "@/components/tabla/EncabezadoPagina";
import EmpresaInfoForm from "./Empresa/EmpresaForm";
import ErrorPage from "@/components/ErrorPage";

export default function MyAccountReclutador() {
  const { dataUser } = useAuth();
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState(null);

  // id de empresa activa para el tab "Mi empresa"
  const idEmpresaActiva = empresaSeleccionada ?? dataUser?.id_empresa;
  const tieneMultiplesEmpresas = (dataUser?.empresas_detalle?.length ?? 0) > 1;

  const { data, isLoading, error } = useSWR(
    dataUser?.id_usuario ? `/users/${dataUser.id_usuario}` : null,
    fetcherWithToken,
    swr_config,
  );

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center gap-3 h-100">
        <Icon icon="line-md:loading-loop" width="40" height="40" />
        <p>Cargando...</p>
      </div>
    );
  }

  if (error) return <ErrorPage message={error?.message} />;

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-3 sm:p-6">
      {/* Encabezado compacto homologado Adamia */}
      <div className="mb-6">
        <EncabezadoPagina
          icono={UserCog}
          titulo="Mi cuenta"
          subtitulo="Administra tu información personal, seguridad y datos de tu empresa"
        />
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
        {/* Tabs - Estilo ADAMIA */}
        <Tabs defaultValue="cuenta" className="w-full">
          <div className="border-b border-gray-200 bg-white overflow-x-auto">
            <TabsList className="bg-transparent h-auto p-0 w-full justify-start min-w-max">
              <TabsTrigger
                value="cuenta"
                className="rounded-none border-b-2 border-transparent py-3 px-4 sm:py-4 sm:px-6 text-[12.5px] font-semibold text-gray-500 data-[state=active]:bg-white data-[state=active]:border-[#2563eb] data-[state=active]:text-[#2563eb] data-[state=active]:shadow-none gap-1.5 whitespace-nowrap"
              >
                <User className="w-4 h-4 shrink-0" />
                Mi cuenta
              </TabsTrigger>
              <TabsTrigger
                value="contrasenia"
                className="rounded-none border-b-2 border-transparent py-3 px-4 sm:py-4 sm:px-6 text-[12.5px] font-semibold text-gray-500 data-[state=active]:bg-white data-[state=active]:border-[#2563eb] data-[state=active]:text-[#2563eb] data-[state=active]:shadow-none gap-1.5 whitespace-nowrap"
              >
                <KeyRound className="w-4 h-4 shrink-0" />
                Seguridad
              </TabsTrigger>
              <TabsTrigger
                value="empresa"
                className="rounded-none border-b-2 border-transparent py-3 px-4 sm:py-4 sm:px-6 text-[12.5px] font-semibold text-gray-500 data-[state=active]:bg-white data-[state=active]:border-[#2563eb] data-[state=active]:text-[#2563eb] data-[state=active]:shadow-none gap-1.5 whitespace-nowrap"
              >
                <Building className="w-4 h-4 shrink-0" />
                Mi empresa
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-3 sm:p-6">
            <TabsContent value="cuenta" className="mt-0">
              <BasicInfoForm user={data} />
            </TabsContent>
            <TabsContent value="contrasenia" className="mt-0">
              <PasswordChange user={data} />
            </TabsContent>
            <TabsContent value="empresa" className="mt-0">
              {tieneMultiplesEmpresas && (
                <div className="mb-6">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Selecciona la empresa a editar
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {dataUser.empresas_detalle.map((emp) => (
                      <button
                        key={emp.id_empresa}
                        onClick={() => setEmpresaSeleccionada(emp.id_empresa)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                          idEmpresaActiva === emp.id_empresa
                            ? "bg-[#2563EB] text-white border-[#2563EB]"
                            : "bg-white text-gray-700 border-gray-200 hover:border-[#2563EB] hover:text-[#2563EB]"
                        }`}
                      >
                        {emp.url_imagen && (
                          <img
                            src={emp.url_imagen}
                            alt=""
                            className="w-5 h-5 rounded object-cover"
                          />
                        )}
                        {emp.nombre}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <EmpresaInfoForm idEmpresa={idEmpresaActiva} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
