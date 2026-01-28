"use client";
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import BasicInfoForm from "./BasicInfoForm";
import { Icon } from "@iconify/react";
import useSWR from "swr";
import { fetcherWithToken, swr_config } from "@/lib/fetcher";
import PasswordChange from "./Contrasena";
import { Building, KeyRound, User } from "lucide-react";
import EmpresaInfoForm from "./Empresa/EmpresaForm";

export default function MyAccountReclutador() {
  const { dataUser } = useAuth();
  const { data, isLoading, error } = useSWR(
    `/users/${dataUser?.id_usuario}`,
    fetcherWithToken,
    swr_config
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
    <div className="min-h-screen bg-[#F9FAFB] p-6">
      {/* Header del módulo - Estilo ADAMIA */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
        <div className="bg-gradient-to-r from-[#2563EB] to-[#1d4ed8] p-6">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
              <User className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Mi Perfil</h1>
              <p className="text-sm text-blue-100">Gestiona tu información personal y de empresa</p>
            </div>
          </div>
        </div>

        {/* Tabs - Estilo ADAMIA */}
        <Tabs defaultValue="cuenta" className="w-full">
          <div className="border-b-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
            <TabsList className="bg-transparent h-auto p-0 w-full justify-start">
              <TabsTrigger
                value="cuenta"
                className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-[#2563EB] data-[state=active]:text-[#2563EB] rounded-none py-4 px-6 font-medium gap-2"
              >
                <User className="w-4 h-4" />
                Mi cuenta
              </TabsTrigger>
              <TabsTrigger
                value="contrasenia"
                className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-[#2563EB] data-[state=active]:text-[#2563EB] rounded-none py-4 px-6 font-medium gap-2"
              >
                <KeyRound className="w-4 h-4" />
                Seguridad
              </TabsTrigger>
              <TabsTrigger
                value="empresa"
                className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-[#2563EB] data-[state=active]:text-[#2563EB] rounded-none py-4 px-6 font-medium gap-2"
              >
                <Building className="w-4 h-4" />
                Mi empresa
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6">
            <TabsContent value="cuenta" className="mt-0">
              <BasicInfoForm user={data} />
            </TabsContent>
            <TabsContent value="contrasenia" className="mt-0">
              <PasswordChange user={data} />
            </TabsContent>
            <TabsContent value="empresa" className="mt-0">
              <EmpresaInfoForm />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
