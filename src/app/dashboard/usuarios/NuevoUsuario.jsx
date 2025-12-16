"use client";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Form,
  FormLabel,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit, Eye, EyeOff, Plus } from "lucide-react";
import { useSnackbar } from "notistack";
import axios from "axios";
import Cookies from "js-cookie";
import { Checkbox } from "@/components/ui/checkbox";
import { mutate } from "swr";

export default function NuevoUsuario({ editar = false, values, limit, page }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarRepetir, setMostrarRepetir] = useState(false);
  const [quiereCambiarPassword, setQuiereCambiarPassword] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const token = Cookies.get("token");

  const form = useForm({
    defaultValues: {
      nombre: "",
      correo: "",
      telefono: "",
      contrasenia: "",
      repetir: "",
    },
  });

  const { handleSubmit, register, formState, setError, watch } = form;

  const onSubmit = async (data) => {
    const { repetir, ...usuarioData } = data;

    if (data.contrasenia !== data.repetir) {
      setError("repetir", {
        type: "manual",
        message: "Las contraseñas no coinciden",
      });
      return;
    }

    if (editar && !quiereCambiarPassword) {
      delete usuarioData.contrasenia;
    } else if (!data.contrasenia || !data.repetir) {
      setError("contrasenia", {
        type: "manual",
        message: "Contraseña requerida",
      });
      return;
    }

    setLoading(true);
    try {
      if (editar && values?.id_usuario) {
        const response = await axios.put(
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/users/updateUser/${values.id_usuario}`,
          usuarioData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.status === 200) {
          enqueueSnackbar("¡Usuario editado con éxito!", {
            variant: "success",
          });
        } else {
          enqueueSnackbar("Error al editar el usuario", { variant: "error" });
        }
      } else {
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/users/registerUser`,
          usuarioData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.status === 201 || response.status === 200) {
          enqueueSnackbar("¡Usuario creado con éxito!", { variant: "success" });
        } else {
          enqueueSnackbar("Error al crear el usuario", { variant: "error" });
        }
      }
      form.reset();
      setOpen(false);
      await mutate(`/users/user?page=${page}&limit=${limit}`);
    } catch (error) {
      const mensaje =
        error.response?.data?.error || "Error al registrar o editar usuario";
      enqueueSnackbar(mensaje, { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (e) => {
    e?.stopPropagation?.();
    if (editar && values?.id_usuario) {
      form.reset({
        nombre: values.nombre,
        correo: values.correo,
        telefono: values.telefono,
      });
    } else {
      form.reset();
    }
    setOpen(true);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {editar ? (
          <Button variant="ghost" onClick={handleOpen} startIcon={<Edit />} />
        ) : (
          <Button
            className="flex items-center gap-3 bg-slate-700 text-white text-sm px-4 py-[7px] rounded-lg hover:bg-slate-600"
            onClick={handleOpen}
          >
            <Plus size={18} />
            Nuevo usuario
          </Button>
        )}
      </SheetTrigger>

      <SheetContent className="min-w-[90vw] md:min-w-[60vw] lg:min-w-[40vw]">
        <SheetHeader>
          <SheetTitle className="text-xl font-bold text-slate-700">
            {editar ? "Editar usuario" : "Crear nuevo usuario"}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <FormItem>
                <FormLabel>Nombre completo</FormLabel>
                <FormControl>
                  <Input
                    disabled={loading}
                    {...register("nombre", { required: "Campo obligatorio" })}
                  />
                </FormControl>
                <FormMessage>{formState.errors.nombre?.message}</FormMessage>
              </FormItem>

              <FormItem>
                <FormLabel>Correo electrónico</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    disabled={loading}
                    {...register("correo", {
                      required: "Correo obligatorio",
                      pattern: {
                        value: /\S+@\S+\.\S+/,
                        message: "Correo inválido",
                      },
                    })}
                  />
                </FormControl>
                <FormMessage>{formState.errors.correo?.message}</FormMessage>
              </FormItem>

              <FormItem>
                <FormLabel>Teléfono</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    disabled={loading}
                    {...register("telefono", {
                      required: "Teléfono obligatorio",
                      pattern: {
                        value: /^(52\d{10}|\d{10})$/,
                        message: "Teléfono no válido",
                      },
                    })}
                  />
                </FormControl>
                <FormMessage>{formState.errors.telefono?.message}</FormMessage>
              </FormItem>

              {editar ? (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        id="changePass"
                        checked={quiereCambiarPassword}
                        onCheckedChange={setQuiereCambiarPassword}
                      />
                    </FormControl>
                    <label htmlFor="changePass">Cambiar contraseña</label>
                  </div>
                </FormItem>
              ) : null}

              {(!editar || quiereCambiarPassword) && (
                <>
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type={mostrarPassword ? "text" : "password"}
                          disabled={loading}
                          {...register("contrasenia", {
                            required:
                              !editar || quiereCambiarPassword
                                ? "Contraseña requerida"
                                : false,
                          })}
                        />
                      </FormControl>
                      <div
                        className="absolute right-3 top-2 cursor-pointer"
                        onClick={() => setMostrarPassword((prev) => !prev)}
                      >
                        {mostrarPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </div>
                    </div>
                    <FormMessage>
                      {formState.errors.contrasenia?.message}
                    </FormMessage>
                  </FormItem>

                  <FormItem>
                    <FormLabel>Repetir contraseña</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type={mostrarRepetir ? "text" : "password"}
                          disabled={loading}
                          {...register("repetir", {
                            required:
                              !editar || quiereCambiarPassword
                                ? "Debes repetir la contraseña"
                                : false,
                          })}
                        />
                      </FormControl>
                      <div
                        className="absolute right-3 top-2 cursor-pointer"
                        onClick={() => setMostrarRepetir((prev) => !prev)}
                      >
                        {mostrarRepetir ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </div>
                    </div>
                    <FormMessage>
                      {formState.errors.repetir?.message}
                    </FormMessage>
                  </FormItem>
                </>
              )}

              {/* {editar && (
                <FormItem>
                  <FormControl>
                    <Checkbox
                      id="changePass"
                      checked={quiereCambiarPassword}
                      onCheckedChange={setQuiereCambiarPassword}
                    />
                    <label
                      htmlFor="changePass"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Cambiar contraseña
                    </label>
                  </FormControl>
                </FormItem>
              )} */}

              <Button type="submit" className="bg-slate-700" loading={loading}>
                {editar ? "Guardar cambios" : "Registrar usuario"}
              </Button>
            </form>
          </Form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
