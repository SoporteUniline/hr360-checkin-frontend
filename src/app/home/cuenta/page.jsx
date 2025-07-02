"use client";
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { Icon } from "@iconify/react";
import useSWR from "swr";
import { fetcherWithToken, swr_config } from "@/lib/fetcher";
import { BriefcaseBusiness, KeyRound, User, School } from "lucide-react";

import BasicInfoForm from "./BasicInfoForm";
import ErrorPage from "@/components/ErrorPage";
import PasswordChange from "./Contrasena";
import Academics from "./Academics";
import ExperienciaLaboral from "./ExperienciaLaboral";

export default function MyAccountUser() {
  const { dataUser } = useAuth();

  const { data, isLoading, error } = useSWR(
    dataUser?.id_usuario ? `/users/user/${dataUser.id_usuario}` : null,
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
      <div className="overflow-x-auto">
        <TabsList className="flex-nowrap w-max min-w-full">
          <TabsTrigger value="cuenta">
            <User className="mr-2 h-4 w-4" />
            Datos personales
          </TabsTrigger>
          <TabsTrigger value="contrasenia">
            <KeyRound className="mr-2 h-4 w-4" />
            Seguridad
          </TabsTrigger>
          <TabsTrigger value="academicos">
            <School className="mr-2 h-4 w-4" />
            Estudios Académicos
          </TabsTrigger>
          <TabsTrigger value="experiencia">
            <BriefcaseBusiness className="mr-2 h-4 w-4" />
            Experiencia Laboral
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="cuenta">
        <BasicInfoForm user={data} />
      </TabsContent>
      <TabsContent value="contrasenia">
        <PasswordChange user={data} />
      </TabsContent>
      <TabsContent value="academicos">
        <Academics user={data} />
      </TabsContent>
      <TabsContent value="experiencia">
        <ExperienciaLaboral user={data} />
      </TabsContent>
    </Tabs>
  );
}
