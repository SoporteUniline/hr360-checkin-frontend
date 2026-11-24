"use client";

// Pestaña «Mi empresa» (24/11/2026, rediseño): a la izquierda el logo (y lo que la página ponga en `lateral`, como el
// acceso a Módulos); a la derecha los datos en secciones: datos generales, contacto, redes sociales y registro automático
// de asistencias, con barra «Sin cambios» / «Guardar». Mismos campos y mismo guardado: PUT /empresas/:id.
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Form,
  FormLabel,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { useSnackbar } from "notistack";
import axios from "axios";
import { Building2, ImageIcon } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { copiarValores, hayCambiosPendientes } from "@/lib/cambiosPendientes.mjs";
import { BarraGuardar, Grupo, Tarjeta, claseCampo, claseEtiqueta } from "../Piezas";
import { useCambiosCuenta } from "../GuardiaCuenta";

export default function EmpresaForm({ idEmpresa, lateral = null }) {
  const { dataUser } = useAuth();
  const token = Cookies.get("token");
  const [loading, setLoading] = React.useState(false);
  const [base, setBase] = React.useState(null);
  const { enqueueSnackbar } = useSnackbar();

  const empresaId = idEmpresa ?? dataUser?.id_empresa;

  const { data, isLoading, error } = useSWR(
    empresaId ? `/empresas/${empresaId}` : null,
    fetcherWithToken,
    swr_config
  );

  const form = useForm();
  const { register, handleSubmit, reset, formState, setValue, watch } = form;
  const selectedTimeZone = watch("zona_horaria");
  const cronActivo = watch("cron_asistencias_activo");
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
        const valores = {
          ...data,
          giro: giro ?? data.giro,
          zona_horaria: data.zona_horaria || DEFAULT_COMPANY_TIMEZONE,
          cron_asistencias_activo: data.cron_asistencias_activo ?? 1,
        };
        reset(valores);
        setBase(copiarValores(valores));
      };
      setDataGiro();
    }
  }, [data, reset]);

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
        return false;
      }
      const { createdAt, updatedAt, giro, ...input } = data;

      await axios.put(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/empresas/${data.id_empresa}`,
        {
            ...input,
            giro: typeof giro === "string" ? giro : giro?.value,
          },
        headers
      );
      enqueueSnackbar("Se guardaron los cambios exitosamente!", {
        variant: "success",
      });
      // (24/11/2026) Queda lo guardado en el formulario (antes se vaciaba hasta que volvía a llegar la empresa).
      form.reset(data);
      setBase(copiarValores(data));
      setLoading(false);
      await mutate(`/empresas/${empresaId}`);
      return true;
    } catch (error) {
      console.log(error);
      setLoading(false);
      const errorMessage =
        error.response?.data?.error ||
        error?.message ||
        "Error al guardar empresa";
      enqueueSnackbar(errorMessage, { variant: "error" });
      return false;
    }
  };

  const valores = watch();
  const hayCambios = Boolean(base) && hayCambiosPendientes({ base, actual: valores });
  const guardar = () => new Promise((resolve) => {
    handleSubmit(async (datos) => resolve(await onSubmit(datos)), () => resolve(false))().catch(() => resolve(false));
  });
  useCambiosCuenta(`empresa-${empresaId}`, { hayCambios, guardar });

  if (isLoading) {
    return (
      <div role="status" className="flex flex-col justify-center items-center gap-3 h-100">
        <Icon icon="line-md:loading-loop" width="40" height="40" />
        <p>Cargando...</p>
      </div>
    );
  }

  if (error) return <ErrorPage message={error?.message} />;

  const handleOnSelect = (selectedOption) => {
    form.setValue("giro", selectedOption);
  };

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="min-w-0 space-y-5">
        <Tarjeta titulo="Logo" descripcion="La imagen de tu empresa." icono={ImageIcon}>
          <ImageEmpresa empresa={data} />
        </Tarjeta>
        {lateral}
      </div>

      <Form {...form}>
        <form id="form-empresa" onSubmit={handleSubmit(onSubmit)} noValidate className="min-w-0">
          <Tarjeta
            titulo="Información de la empresa"
            descripcion="Datos generales, contacto y preferencias."
            icono={Building2}
            // Formulario largo: en escritorio «Guardar» también arriba, sin tener que bajar (como la ficha del empleado).
            acciones={<div className="hidden md:block"><BarraGuardar arriba hayCambios={hayCambios} guardando={formState.isSubmitting} /></div>}
            pie={<BarraGuardar hayCambios={hayCambios} guardando={formState.isSubmitting} />}
          >
            <div className="space-y-7">
              <Grupo titulo="Datos generales">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormItem>
                    <FormLabel className={claseEtiqueta}>Empresa</FormLabel>
                    <FormControl>
                      <Input
                        disabled={loading}
                        className={claseCampo}
                        {...register("nombre_empresa", {
                          required: "Empresa obligatorio",
                        })}
                      />
                    </FormControl>
                    <FormMessage>{formState.errors.nombre_empresa?.message}</FormMessage>
                  </FormItem>

                  <FormItem>
                    <FormLabel className={claseEtiqueta}>Nombre del dueño</FormLabel>
                    <FormControl>
                      <Input
                        disabled={loading}
                        className={claseCampo}
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
                    <FormLabel className={claseEtiqueta} htmlFor="giro_autocomplete">Giro</FormLabel>
                    {/* 44 px en teléfono también para el selector de giro (react-select). */}
                    <div className="[&_[class*=-control]]:min-h-11 sm:[&_[class*=-control]]:min-h-10">
                      <AutocompleteInput
                        form={form}
                        name="giro"
                        loadOptions={loadOptionsGiros}
                        handleChange={handleOnSelect}
                        id="giro_autocomplete"
                      />
                    </div>
                    <FormMessage>{formState.errors.giro?.message}</FormMessage>
                  </FormItem>

                  <FormItem>
                    <FormLabel className={claseEtiqueta} htmlFor="zona_horaria">Zona horaria</FormLabel>
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
                      className="min-h-11 bg-white font-normal sm:min-h-10"
                    />
                    <FormMessage>{formState.errors.zona_horaria?.message}</FormMessage>
                  </FormItem>
                </div>
              </Grupo>

              <Grupo titulo="Contacto">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormItem>
                    <FormLabel className={claseEtiqueta}>Correo</FormLabel>
                    <FormControl>
                      <Input
                        disabled={loading}
                        type="email"
                        autoComplete="email"
                        className={claseCampo}
                        {...register("correo_empresa", {
                          required: "Correo obligatorio",
                        })}
                      />
                    </FormControl>
                    <FormMessage>
                      {formState.errors.correo_empresa?.message}
                    </FormMessage>
                  </FormItem>

                  <FormItem>
                    <FormLabel className={claseEtiqueta}>Teléfono</FormLabel>
                    <FormControl>
                      <Input
                        disabled={loading}
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        className={claseCampo}
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

                  <FormItem className="md:col-span-2">
                    <FormLabel className={claseEtiqueta}>Dirección</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        disabled={loading}
                        autoComplete="street-address"
                        className={claseCampo}
                        {...register("direccion", {
                          required: "Dirección obligatorio",
                        })}
                        placeholder="Dirección completa de la empresa"
                      />
                    </FormControl>
                    <FormMessage>{formState.errors.direccion?.message}</FormMessage>
                  </FormItem>
                </div>
              </Grupo>

              <Grupo titulo="Redes sociales" descripcion="Opcionales.">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <FormItem>
                    <FormLabel className={claseEtiqueta}>Facebook</FormLabel>
                    <FormControl>
                      <Input disabled={loading} inputMode="url" className={claseCampo} {...register("facebook")} placeholder="URL de Facebook" />
                    </FormControl>
                    <FormMessage>{formState.errors.facebook?.message}</FormMessage>
                  </FormItem>
                  <FormItem>
                    <FormLabel className={claseEtiqueta}>Instagram</FormLabel>
                    <FormControl>
                      <Input disabled={loading} inputMode="url" className={claseCampo} {...register("instagram")} placeholder="URL de Instagram" />
                    </FormControl>
                    <FormMessage>{formState.errors.instagram?.message}</FormMessage>
                  </FormItem>
                  <FormItem>
                    <FormLabel className={claseEtiqueta}>Página web</FormLabel>
                    <FormControl>
                      <Input disabled={loading} inputMode="url" className={claseCampo} {...register("pagina_web")} placeholder="URL del sitio web" />
                    </FormControl>
                    <FormMessage>{formState.errors.pagina_web?.message}</FormMessage>
                  </FormItem>
                </div>
              </Grupo>

              <Grupo titulo="Registro automático de asistencias">
                <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                  <Switch
                    id="cron_asistencias_activo"
                    checked={!!cronActivo}
                    onCheckedChange={(checked) =>
                      setValue("cron_asistencias_activo", checked ? 1 : 0, {
                        shouldDirty: true,
                      })
                    }
                    disabled={loading}
                    className="mt-0.5 shrink-0"
                  />
                  <div className="flex min-w-0 flex-col gap-1">
                    <label
                      htmlFor="cron_asistencias_activo"
                      className="cursor-pointer select-none text-sm font-semibold text-[#080d36]"
                    >
                      {cronActivo ? "Activo" : "Inactivo"}
                    </label>
                    <p className="text-[12.5px] leading-relaxed text-slate-600">
                      Cuando está <strong>activo</strong>, el sistema genera y cierra automáticamente los registros de asistencia cada día para todos los empleados de esta empresa.
                    </p>
                    <p className="text-[12.5px] font-medium leading-relaxed text-amber-700">
                      Desactívalo mientras das de alta a tus empleados y vuelve a activarlo cuando estés listo para comenzar el registro diario.
                    </p>
                  </div>
                </div>
              </Grupo>
            </div>
          </Tarjeta>
        </form>
      </Form>
    </div>
  );
}
