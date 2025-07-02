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
import { Select } from "@/components/ui/select";
import {
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import dayjs from "dayjs";

export default function BasicInfoForm({ user }) {
  const token = Cookies.get("token");
  const [loading, setLoading] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const form = useForm();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = form;

  useEffect(() => {
    if (user && user.datos_personales) {
      const fecha = user.datos_personales.fecha_nacimiento
        ? dayjs(user.datos_personales.fecha_nacimiento).format("YYYY-MM-DD")
        : null;

      reset({
        nombre: user.nombre,
        correo: user.correo,
        telefono: user.datos_personales.telefono || null,
        curp: user.datos_personales.curp || null,
        fecha_nacimiento: fecha,
      });

      setValue("sexo", user.datos_personales.sexo || null);
      setValue("estado_civil", user.datos_personales.estado_civil || null);
    }
  }, [user, reset, setValue]);

  const onSubmit = async (data) => {
    setLoading(true);

    try {
      const payload = {
        nombre: data.nombre,
        telefono: data.telefono,
        correo: data.correo,
        datos_personales: {
          curp: data.curp,
          fecha_nacimiento: data.fecha_nacimiento,
          sexo: data.sexo,
          estado_civil: data.estado_civil,
        },
      };

      await axiosInstance.put(`/users/updateUser/${user.id_usuario}`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      enqueueSnackbar("Se actualizaron tus datos exitosamente!", {
        variant: "success",
      });
      setLoading(false);
    } catch (error) {
      setLoading(false);
      const errorMessage =
        error.response?.data?.error ||
        error?.message ||
        "Error al actualizar tu información";
      enqueueSnackbar(errorMessage, { variant: "error" });
    }
  };

  if (!user || !user.datos_personales) {
    return null;
  }

  return (
    <section>
      <ImageUpload user={user} />
      <div className="my-5 border-b-1 border-gray-200">
        <p className="font-semibold">Información básica</p>
      </div>

      <Form {...form}>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl"
        >
          <FormItem>
            <FormLabel>Nombre</FormLabel>
            <FormControl>
              <Input
                disabled={loading}
                {...register("nombre", { required: "Nombre obligatorio" })}
              />
            </FormControl>
            <FormMessage>{errors.nombre?.message}</FormMessage>
          </FormItem>

          <FormItem>
            <FormLabel>Teléfono</FormLabel>
            <FormControl>
              <Input
                disabled={loading}
                {...register("telefono", {
                  required: "Teléfono obligatorio",
                  pattern: {
                    value: /^[0-9]{10}$/,
                    message: "Teléfono no válido",
                  },
                })}
              />
            </FormControl>
            <FormMessage>{errors.telefono?.message}</FormMessage>
          </FormItem>

          <FormItem>
            <FormLabel>CURP</FormLabel>
            <FormControl>
              <Input
                disabled={loading}
                {...register("curp", {
                  maxLength: { value: 18, message: "CURP muy largo" },
                })}
              />
            </FormControl>
            <FormMessage>{errors.curp?.message}</FormMessage>
          </FormItem>

          <FormItem>
            <FormLabel>Fecha de nacimiento</FormLabel>
            <FormControl>
              <Input
                type="date"
                disabled={loading}
                {...register("fecha_nacimiento")}
              />
            </FormControl>
          </FormItem>

          <FormItem>
            <FormLabel>Sexo</FormLabel>
            <Select
              onValueChange={(value) => setValue("sexo", value)}
              defaultValue={user.datos_personales?.sexo || ""}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tu sexo" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="Hombre">Hombre</SelectItem>
                <SelectItem value="Mujer">Mujer</SelectItem>
                <SelectItem value="Otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </FormItem>

          <FormItem>
            <FormLabel>Estado civil</FormLabel>
            <Select
              onValueChange={(value) => setValue("estado_civil", value)}
              defaultValue={user.datos_personales?.estado_civil || ""}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tu estado civil" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="Soltero">Soltero</SelectItem>
                <SelectItem value="Casado">Casado</SelectItem>
                <SelectItem value="Divorciado">Divorciado</SelectItem>
                <SelectItem value="Viudo">Viudo</SelectItem>
              </SelectContent>
            </Select>
          </FormItem>

          <div className="col-span-1 md:col-span-2">
            <Button
              type="submit"
              className="w-full bg-slate-700"
              loading={loading}
            >
              Guardar cambios
            </Button>
          </div>
        </form>
      </Form>
    </section>
  );
}
