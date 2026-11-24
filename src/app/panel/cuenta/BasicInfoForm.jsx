"use client";

// Pestaña «Mi cuenta» (24/11/2026, rediseño): a la izquierda la tarjeta de identidad con la foto; a la derecha la
// información básica con barra «Sin cambios» / «Guardar». Mismo guardado: PUT /users/:id con { nombre, correo }.
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { UserRound } from "lucide-react";
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
import { hayCambiosPendientes } from "@/lib/cambiosPendientes.mjs";
import { BarraGuardar, Tarjeta, claseCampo, claseEtiqueta } from "./Piezas";
import { useCambiosCuenta } from "./GuardiaCuenta";

export default function BasicInfoForm({ user, rol, empresa }) {
  const token = Cookies.get("token");
  const [loading, setLoading] = useState(false);
  const [base, setBase] = useState(null);
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
      const valores = { nombre: user.nombre, correo: user.correo };
      reset(valores);
      setBase(valores);
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
      setBase({ ...data });
      setLoading(false);
      await mutate(`/users/${user.id_usuario}`);
      return true;
    } catch (error) {
      setLoading(false);
      const errorMessage =
        error.response?.data?.error ||
        error?.message ||
        "Error al actualizar tu información";
      enqueueSnackbar(errorMessage, { variant: "error" });
      return false;
    }
  };

  const valores = form.watch();
  const hayCambios = Boolean(base) && hayCambiosPendientes({ base, actual: valores });
  // «Guardar y salir» usa exactamente lo mismo que el botón Guardar (validación + servidor).
  const guardar = () => new Promise((resolve) => {
    handleSubmit(async (datos) => resolve(await onSubmit(datos)), () => resolve(false))().catch(() => resolve(false));
  });
  useCambiosCuenta("info-basica", { hayCambios, guardar });

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Tarjeta aria-label="Tu perfil">
        <ImageUpload user={user} rol={rol} empresa={empresa} />
      </Tarjeta>

      <Form {...form}>
        <form id="form-info-basica" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Tarjeta
            titulo="Información básica"
            descripcion="Tu nombre y el correo con el que entras al panel."
            icono={UserRound}
            pie={<BarraGuardar hayCambios={hayCambios} guardando={loading} />}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormItem>
                <FormLabel htmlFor="cuenta-nombre" className={claseEtiqueta}>Nombre</FormLabel>
                <FormControl>
                  <Input
                    disabled={loading}
                    id="cuenta-nombre"
                    autoComplete="name"
                    className={claseCampo}
                    {...register("nombre", {
                      required: "Nombre obligatorio",
                    })}
                    placeholder="Ingresa tu nombre"
                  />
                </FormControl>
                <FormMessage>{errors.nombre?.message}</FormMessage>
              </FormItem>

              <FormItem>
                <FormLabel htmlFor="cuenta-correo" className={claseEtiqueta}>Correo</FormLabel>
                <FormControl>
                  <Input
                    disabled={loading}
                    id="cuenta-correo"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    className={claseCampo}
                    {...register("correo", {
                      required: "correo obligatorio",
                    })}
                    placeholder="Ingresa tu correo"
                  />
                </FormControl>
                <FormMessage>{errors.correo?.message}</FormMessage>
              </FormItem>
            </div>
          </Tarjeta>
        </form>
      </Form>
    </div>
  );
}
