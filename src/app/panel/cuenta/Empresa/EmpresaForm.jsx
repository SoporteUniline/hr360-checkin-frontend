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
import { Combobox } from "@/components/Combobox";
import {
  DEFAULT_COMPANY_TIMEZONE,
  getTimeZoneOptions,
} from "@/lib/timezones";

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
  const { register, handleSubmit, reset, formState, setValue, watch } = form;
  const selectedTimeZone = watch("zona_horaria");
  const timeZoneOptions = React.useMemo(() => getTimeZoneOptions(), []);

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
          zona_horaria: data.zona_horaria || DEFAULT_COMPANY_TIMEZONE,
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
      if (!data.zona_horaria) {
        form.setError("zona_horaria", {
          type: "manual",
          message: "Selecciona una zona horaria",
        });
        setLoading(false);
        return;
      }
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
    <div className="max-w-4xl space-y-6">
      {/* Sección de logo con diseño ADAMIA */}
      <div className="bg-gradient-to-br from-cyan-50 via-white to-cyan-50 border-2 border-cyan-100 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 p-3 rounded-lg shadow-md">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Logo de empresa</h3>
            <p className="text-sm text-gray-600">Personaliza la imagen de tu empresa</p>
          </div>
        </div>
        <ImageEmpresa empresa={data} />
      </div>

      {/* Información de empresa con diseño ADAMIA */}
      <div className="bg-gradient-to-br from-orange-50 via-white to-orange-50 border-2 border-orange-100 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-3 rounded-lg shadow-md">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Información de la empresa</h3>
            <p className="text-sm text-gray-600">Datos generales y de contacto</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-4">
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">Empresa</FormLabel>
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
                <FormLabel className="text-sm font-medium text-gray-700">Correo</FormLabel>
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
            <div className="flex flex-col gap-4">
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">Nombre del dueño</FormLabel>
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
                <FormLabel className="text-sm font-medium text-gray-700">Teléfono</FormLabel>
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
          <FormItem>
            <FormLabel className="text-sm font-medium text-gray-700">
              Zona horaria
            </FormLabel>
            <Combobox
              name="zona_horaria"
              options={timeZoneOptions}
              value={selectedTimeZone || DEFAULT_COMPANY_TIMEZONE}
              placeholder="Selecciona la zona horaria"
              emptyText="No se encontraron zonas horarias"
              onChange={(value) => {
                setValue("zona_horaria", value || DEFAULT_COMPANY_TIMEZONE);
                form.clearErrors("zona_horaria");
              }}
              disabled={loading}
            />
            <FormMessage>{formState.errors.zona_horaria?.message}</FormMessage>
          </FormItem>
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
            <FormLabel className="text-sm font-medium text-gray-700">Giro</FormLabel>
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
            <FormLabel className="text-sm font-medium text-gray-700">Dirección</FormLabel>
            <FormControl>
              <Input
                type="text"
                disabled={loading}
                {...register("direccion", {
                  required: "Dirección obligatorio",
                })}
                placeholder="Dirección completa de la empresa"
              />
            </FormControl>
            <FormMessage>{formState.errors.direccion?.message}</FormMessage>
          </FormItem>

          {/* Sección de Redes Sociales */}
          <div className="border-t-2 border-orange-200 pt-6 mt-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              Redes sociales
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">Facebook</FormLabel>
                <FormControl>
                  <Input disabled={loading} {...register("facebook")} placeholder="URL de Facebook" />
                </FormControl>
                <FormMessage>{formState.errors.facebook?.message}</FormMessage>
              </FormItem>
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">Instagram</FormLabel>
                <FormControl>
                  <Input disabled={loading} {...register("instagram")} placeholder="URL de Instagram" />
                </FormControl>
                <FormMessage>{formState.errors.instagram?.message}</FormMessage>
              </FormItem>
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">Página web</FormLabel>
                <FormControl>
                  <Input disabled={loading} {...register("pagina_web")} placeholder="URL del sitio web" />
                </FormControl>
                <FormMessage>{formState.errors.pagina_web?.message}</FormMessage>
              </FormItem>
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <Button 
              type="submit" 
              className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-medium shadow-sm px-8" 
              loading={loading}
            >
              Guardar cambios
            </Button>
          </div>
        </form>
      </Form>
      </div>
    </div>
  );
}
