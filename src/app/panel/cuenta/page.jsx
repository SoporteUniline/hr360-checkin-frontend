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
    <Tabs defaultValue="cuenta">
      <TabsList>
        <TabsTrigger value="cuenta">
          <User />
          Mi cuenta
        </TabsTrigger>
        <TabsTrigger value="contrasenia">
          <KeyRound /> Seguridad
        </TabsTrigger>
        <TabsTrigger value="empresa">
          <Building />
          Mi empresa
        </TabsTrigger>
      </TabsList>
      <TabsContent value="cuenta">
        <BasicInfoForm user={data} />
      </TabsContent>
      <TabsContent value="contrasenia">
        <PasswordChange user={data} />
      </TabsContent>
      <TabsContent value="empresa">
        <EmpresaInfoForm />
      </TabsContent>
    </Tabs>
  );
}
