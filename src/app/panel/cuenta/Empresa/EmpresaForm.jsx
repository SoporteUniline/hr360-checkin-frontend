"use client";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Form,
  FormLabel,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useSnackbar } from "notistack";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import useSWR, { mutate } from "swr";
import Cookies from "js-cookie";
import { Icon } from "@iconify/react";
import { fetcherWithToken, swr_config } from "@/lib/fetcher";
import ErrorPage from "@/components/ErrorPage";
import ImageEmpresa from "./ImagenEmpresa";
import { loadOptionsGiros } from "@/app/(public)/alta-empresas/dataMappings";
import AutocompleteInput from "@/components/Inputs/FormCreatebleAutocomplete";

export default function EmpresaForm() {
  const { dataUser } = useAuth();
  const token = Cookies.get("token");
  const [loading, setLoading] = React.useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const { data, isLoading, error } = useSWR(
    `/empresas/${dataUser?.id_empresa}`,
    fetcherWithToken,
    swr_config
  );

  const form = useForm();
  const { register, handleSubmit, reset, formState } = form;

  const getOptionGiros = async (value) => {
    setLoading(true);
    const options = await loadOptionsGiros(value);
    setLoading(false);
    return options.find((opt) => opt.label === value);
  };

  useEffect(() => {
    if (data) {
      const setDataGiro = async () => {
        const giro = await getOptionGiros(data.giro);
        reset({
          ...data,
          giro,
        });
      };
      setDataGiro();
    }
  }, [data, reset]);

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center gap-3 h-100">
        <Icon icon="line-md:loading-loop" width="40" height="40" />
        <p>Cargando...</p>
      </div>
    );
  }

  if (error) return <ErrorPage message={error?.message} />;

  const onSubmit = async (data) => {
    setLoading(true);
    const headers = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
    try {
      const { createdAt, updatedAt, giro, ...input } = data;

      await axios.put(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/empresas/${data.id_empresa}`,
        { ...input, giro: giro.value },
        headers
      );
      enqueueSnackbar("Se guardaron los cambios exitosamente!", {
        variant: "success",
      });
      form.reset();
      setLoading(false);
      await mutate(`/empresas/${dataUser?.id_empresa}`);
    } catch (error) {
      console.log(error);
      setLoading(false);
      const errorMessage =
        error.response?.data?.error ||
        error?.message ||
        "Error al guardar empresa";
      enqueueSnackbar(errorMessage, { variant: "error" });
    }
  };

  const handleOnSelect = (selectedOption) => {
    form.setValue("giro", selectedOption);
  };

  return (
    <div>
      <div>
        <ImageEmpresa empresa={data} />
      </div>
      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
            <div className="flex flex-col gap-3">
              <FormItem>
                <FormLabel>Empresa</FormLabel>
                <FormControl>
                  <Input
                    disabled={loading}
                    {...register("nombre_empresa", {
                      required: "Empresa obligatorio",
                    })}
                  />
                </FormControl>
                <FormMessage>{formState.errors.empresa?.message}</FormMessage>
              </FormItem>

              <FormItem>
                <FormLabel>Correo</FormLabel>
                <FormControl>
                  <Input
                    disabled={loading}
                    type="email"
                    {...register("correo_empresa", {
                      required: "Correo obligatorio",
                    })}
                  />
                </FormControl>
                <FormMessage>
                  {formState.errors.correo_empresa?.message}
                </FormMessage>
              </FormItem>
            </div>
            <div className="flex flex-col gap-3">
              <FormItem>
                <FormLabel>Nombre del dueño</FormLabel>
                <FormControl>
                  <Input
                    disabled={loading}
                    {...register("nombre_duenio", {
                      required: "Nombre del dueño obligatorio",
                    })}
                  />
                </FormControl>
                <FormMessage>
                  {formState.errors.nombre_duenio?.message}
                </FormMessage>
              </FormItem>

              <FormItem>
                <FormLabel>Teléfono</FormLabel>
                <FormControl>
                  <Input
                    disabled={loading}
                    type="tel"
                    {...register("celular", {
                      required: "Teléfono obligatorio",
                      pattern: {
                        value: /^(52\d{10}|\d{10})$/,
                        message: "Teléfono no válido",
                      },
                    })}
                  />
                </FormControl>
                <FormMessage>{formState.errors.celular?.message}</FormMessage>
              </FormItem>
            </div>
          </div>
          {/* <FormItem>
            <FormLabel>Giro</FormLabel>
            <FormControl>
              <Input
                disabled={loading}
                {...register("giro", {
                  required: "Giro obligatorio",
                })}
              />
            </FormControl>
            <FormMessage>{formState.errors.giro?.message}</FormMessage>
          </FormItem> */}
          <FormItem>
            <FormLabel>Giro</FormLabel>
            <AutocompleteInput
              form={form}
              name="giro"
              loadOptions={loadOptionsGiros}
              handleChange={handleOnSelect}
              id="giro_autocomplete"
            />
            <FormMessage>{formState.errors.giro?.message}</FormMessage>
          </FormItem>
          <FormItem>
            <FormLabel>Dirección</FormLabel>
            <FormControl>
              <Input
                type="tel"
                disabled={loading}
                {...register("direccion", {
                  required: "Dirección obligatorio",
                })}
              />
            </FormControl>
            <FormMessage>{formState.errors.direccion?.message}</FormMessage>
          </FormItem>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
            <FormItem>
              <FormLabel>Facebook</FormLabel>
              <FormControl>
                <Input disabled={loading} {...register("facebook")} />
              </FormControl>
              <FormMessage>{formState.errors.facebook?.message}</FormMessage>
            </FormItem>
            <FormItem>
              <FormLabel>Instagram</FormLabel>
              <FormControl>
                <Input disabled={loading} {...register("instagram")} />
              </FormControl>
              <FormMessage>{formState.errors.instagram?.message}</FormMessage>
            </FormItem>
            <FormItem>
              <FormLabel>Página web</FormLabel>
              <FormControl>
                <Input disabled={loading} {...register("pagina_web")} />
              </FormControl>
              <FormMessage>{formState.errors.pagina_web?.message}</FormMessage>
            </FormItem>
          </div>
          <div className="flex justify-center my-5">
            <Button type="submit" className="bg-slate-700" loading={loading}>
              Guardar cambios
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
