"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mutate } from "swr";
import ImageUpload from "./Imagen";
import {
  Form,
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import axiosInstance from "@/lib/axios";
import { useSnackbar } from "notistack";
import Cookies from "js-cookie";

export default function BasicInfoForm({ user }) {
  const token = Cookies.get("token");
  const [loading, setLoading] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const form = useForm();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = form;

  useEffect(() => {
    if (user) {
      reset({
        nombre: user.nombre,
        correo: user.correo,
      });
    }
  }, [user, reset]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await axiosInstance.put(`/users/${user.id_usuario}`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      enqueueSnackbar("Se actualizaron tus datos exitosamente!", {
        variant: "success",
      });
      setLoading(false);
      await mutate(`/users/${user.id_usuario}`);
    } catch (error) {
      setLoading(false);
      const errorMessage =
        error.response?.data?.error ||
        error?.message ||
        "Error al actualizar tu información";
      enqueueSnackbar(errorMessage, { variant: "error" });
    }
  };

  return (
    <section className="max-w-2xl">
      {/* Sección de imagen con diseño ADAMIA */}
      <div className="bg-gradient-to-br from-blue-50 via-white to-blue-50 border-2 border-blue-100 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="bg-gradient-to-br from-[#2563EB] to-[#1d4ed8] p-3 rounded-lg shadow-md">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Foto de perfil</h3>
            <p className="text-sm text-gray-600">Actualiza tu imagen de perfil</p>
          </div>
        </div>
        <ImageUpload user={user} />
      </div>

      {/* Información básica con diseño ADAMIA */}
      <div className="bg-gradient-to-br from-purple-50 via-white to-purple-50 border-2 border-purple-100 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="bg-gradient-to-br from-[#7C3AED] to-[#6d28d9] p-3 rounded-lg shadow-md">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Información básica</h3>
            <p className="text-sm text-gray-600">Actualiza tus datos personales</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input
                  disabled={loading}
                  id="name"
                  {...register("nombre", {
                    required: "Nombre obligatorio",
                  })}
                  placeholder="Ingresa tu nombre"
                />
              </FormControl>
              <FormMessage>{errors.nombre?.message}</FormMessage>
            </FormItem>
          </div>

          <div className="space-y-2">
            <FormItem>
              <FormLabel>Correo</FormLabel>
              <FormControl>
                <Input
                  disabled={loading}
                  {...register("correo", {
                    required: "correo obligatorio",
                  })}
                  placeholder="Ingresa tu correo"
                />
              </FormControl>
              <FormMessage>{errors.correo?.message}</FormMessage>
            </FormItem>
          </div>

          <Button
            type="submit"
            className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-medium shadow-sm"
            loading={loading}
          >
            Guardar cambios
          </Button>
        </form>
      </Form>
      </div>
    </section>
  );
}
