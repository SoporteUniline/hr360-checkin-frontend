"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <section>
      <ImageUpload user={user} />
      <div className="my-5 border-b-1 border-gray-200">
        <p className="font-semibold">Información básica</p>
      </div>

      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-md space-y-6">
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
            className="w-full bg-slate-700"
            loading={loading}
          >
            Guardar cambios
          </Button>
        </form>
      </Form>
    </section>
  );
}
