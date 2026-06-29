"use client";
import React, { useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useSnackbar } from "notistack";
import axios from "@/lib/axios";
import { Edit, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { mutate } from "swr";
import Cookies from "js-cookie";
import ImageForm from "@/app/(public)/alta-empresas/ImageForm";
import ImageEmpresa from "@/app/panel/cuenta/Empresa/ImagenEmpresa";
import AutocompleteInput from "@/components/Inputs/FormCreatebleAutocomplete";
import { loadOptionsGiros } from "@/app/(public)/alta-empresas/dataMappings";

const COUNTRY_CODES = [
  { code: "+52", label: "MX (+52)" },
  { code: "+504", label: "HN (+504)" },
  { code: "+1", label: "US/CA (+1)" },
  { code: "+57", label: "CO (+57)" },
  { code: "+54", label: "AR (+54)" },
  { code: "+56", label: "CL (+56)" },
  { code: "+51", label: "PE (+51)" },
  { code: "+34", label: "ES (+34)" },
];

function onlyPhoneDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeCountryCode(value) {
  const digits = String(value || "").replace(/[^\d+]/g, "");
  if (!digits) return "+52";
  return digits.startsWith("+") ? digits : `+${digits}`;
}

function splitPhoneValue(value) {
  const raw = String(value || "").trim();
  if (!raw) return { codigo_pais: "+52", celular: "" };

  if (raw.startsWith("+")) {
    const matched = COUNTRY_CODES.find((country) =>
      raw.startsWith(country.code),
    );
    if (matched) {
      return {
        codigo_pais: matched.code,
        celular: onlyPhoneDigits(raw.slice(matched.code.length)),
      };
    }
  }

  return { codigo_pais: "+52", celular: onlyPhoneDigits(raw) };
}

export default function NuevaEmpresa({
  editar = false,
  values,
  limit,
  page,
  setFilter,
}) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [imagePreview, setImagePreview] = React.useState(null);
  const [selectedFile, setSelectedFile] = React.useState(null);
  const { enqueueSnackbar } = useSnackbar();
  const token = Cookies.get("token");

  const form = useForm({
    defaultValues: {
      nombre_empresa: "",
      nombre_duenio: "",
      correo_empresa: "",
      codigo_pais: "+52",
      celular: "",
      giro: "",
      direccion: "",
      facebook: "",
      instagram: "",
      pagina_web: "",
      empleados: 0,
      empleados_incluidos: 0,
      precio_base_mensual: 0,
      precio_empleado_extra: 60,
      tipo_contratacion: "Prueba",
      meses_contratados: "1",
      precio_por_mes: 0,
      monto_total: 0,
    },
  });

  const {
    handleSubmit,
    register,
    formState,
    setError,
    clearErrors,
    watch,
    setValue,
  } = form;
  const { errors } = formState;
  const watchTipoContratacion = watch("tipo_contratacion");

  const onSubmit = async (data) => {
    // if (!editar && !selectedFile) {
    //   setError("imagen_logo", {
    //     type: "manual",
    //     message: "El logo de la empresa es obligatorio",
    //   });
    //   return;
    // }

    if (!data?.giro?.value) {
      setError("giro", {
        type: "manual",
        message: "Debes seleccionar un giro",
      });
      return;
    }

    if (setFilter) setFilter({ search: "", status: "Todos" });
    setLoading(true);

    const headers = {
      headers: { Authorization: `Bearer ${token}` },
    };

    try {
      const celularCompleto = `${normalizeCountryCode(
        data.codigo_pais,
      )}${onlyPhoneDigits(data.celular)}`;

      if (editar) {
        const datosParaActualizar = {
          nombre_empresa: data.nombre_empresa,
          nombre_duenio: data.nombre_duenio,
          correo_empresa: data.correo_empresa,
          celular: celularCompleto,
          direccion: data.direccion,
          facebook: data.facebook,
          instagram: data.instagram,
          pagina_web: data.pagina_web,
          giro: data.giro?.value || data.giro,
        };

        await axios.put(
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/empresas/${data.id_empresa}`,
          datosParaActualizar,
          headers,
        );
      } else {
        const formData = new FormData();
        if (selectedFile) formData.append("imagen", selectedFile);

        Object.entries(data).forEach(([key, value]) => {
          if (
            key !== "imagen" &&
            key !== "giro" &&
            key !== "codigo_pais" &&
            value !== undefined &&
            value !== null
          ) {
            formData.append(key, value);
          }
        });
        formData.set("celular", celularCompleto);

        formData.append("giro", data?.giro?.label);

        await axios.post(
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/empresas/createEmpresaByAdmin`,
          formData,
          headers,
        );
      }

      enqueueSnackbar("Empresa registrada exitosamente!", {
        variant: "success",
      });
      form.reset();
      setImagePreview(null);
      setSelectedFile(null);
      setLoading(false);
      await mutate(`/empresas?page=${page}&limit=${limit}`);
      setOpen(false);
    } catch (error) {
      setLoading(false);
      const errorMessage =
        error.response?.data?.error || "Error al guardar empresa";
      enqueueSnackbar(errorMessage, { variant: "error" });
    }
  };

  const onImageChange = (file) => {
    setSelectedFile(file);
    if (file) clearErrors("imagen_logo");
  };

  const handleEditAction = async (e) => {
    e.stopPropagation();
    const options = await loadOptionsGiros(values.giro);
    const giro = options.find((opt) => opt.label === values.giro);
    const parsedPhone = splitPhoneValue(values?.celular);
    form.reset({ ...values, giro, ...parsedPhone });
    setOpen(true);
    setImagePreview(values.url_imagen || null);
    setSelectedFile(null);
  };

  const handleClickOpen = (e) => {
    e.stopPropagation();
    form.reset();
    setOpen(true);
    setImagePreview(null);
    setSelectedFile(null);
  };

  const watchMeses = watch("meses_contratados");
  const watchEmpleados = watch("empleados");
  const watchEmpleadosIncluidos = watch("empleados_incluidos");
  const watchPrecioBaseMensual = watch("precio_base_mensual");
  const watchPrecioEmpleado = watch("precio_empleado_extra");

  useEffect(() => {
    if (watchTipoContratacion !== "Normal") {
      setValue("precio_por_mes", 0);
      setValue("monto_total", 0);
      return;
    }

    const meses = parseInt(watchMeses || 1);
    const empleados = Number(watchEmpleados || 0);
    const incluidos = Number(watchEmpleadosIncluidos || 0);
    const base = Number(watchPrecioBaseMensual || 0);
    const precioExtra = Number(watchPrecioEmpleado || 60);

    const excedentes = Math.max(empleados - incluidos, 0);
    const mensualidad = base + excedentes * precioExtra;

    setValue("precio_por_mes", mensualidad.toFixed(2));
    setValue("monto_total", (mensualidad * meses).toFixed(2));
  }, [
    watchMeses,
    watchEmpleados,
    watchEmpleadosIncluidos,
    watchPrecioBaseMensual,
    watchPrecioEmpleado,
    watchTipoContratacion,
    setValue,
  ]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {editar ? (
          <Button
            variant="ghost"
            onClick={handleEditAction}
            startIcon={<Edit />}
          />
        ) : (
          <Button
            startIcon={<Plus size={18} />}
            onClick={handleClickOpen}
            className="flex items-center gap-3 bg-slate-700 text-white text-sm px-4 py-[7px] rounded-lg hover:bg-slate-600"
          >
            Nueva empresa
          </Button>
        )}
      </SheetTrigger>

      <SheetContent
        className="min-w-[100vw] md:min-w-[60vw] lg:min-w-[50vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <SheetHeader>
          <SheetTitle className="font-extrabold text-xl text-slate-700">
            {editar ? "Editar empresa" : "Crear nueva empresa"}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-3 h-[85vh] overflow-y-auto pr-2">
          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="flex flex-col gap-2">
                {editar ? (
                  <ImageEmpresa empresa={values} keepData />
                ) : (
                  <ImageForm
                    form={form}
                    imagePreview={imagePreview}
                    setImagePreview={setImagePreview}
                    setSelectedFile={onImageChange}
                  />
                )}
                {errors.imagen_logo && (
                  <p className="text-sm font-medium text-destructive text-center">
                    {errors.imagen_logo.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                <div className="flex flex-col gap-3">
                  <FormItem>
                    <FormLabel>
                      Empresa <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        disabled={loading}
                        {...register("nombre_empresa", {
                          required: "Obligatorio",
                        })}
                      />
                    </FormControl>
                    <FormMessage>{errors.nombre_empresa?.message}</FormMessage>
                  </FormItem>

                  <FormItem>
                    <FormLabel>
                      Correo <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        disabled={loading}
                        type="email"
                        {...register("correo_empresa", {
                          required: "Obligatorio",
                        })}
                      />
                    </FormControl>
                    <FormMessage>{errors.correo_empresa?.message}</FormMessage>
                  </FormItem>
                </div>

                <div className="flex flex-col gap-3">
                  <FormItem>
                    <FormLabel>
                      Nombre del dueño <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        disabled={loading}
                        {...register("nombre_duenio", {
                          required: "Obligatorio",
                        })}
                      />
                    </FormControl>
                    <FormMessage>{errors.nombre_duenio?.message}</FormMessage>
                  </FormItem>

                  <FormItem>
                    <FormLabel>
                      Teléfono <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <select
                          disabled={loading}
                          {...register("codigo_pais")}
                          className="w-36 rounded-md border border-input bg-background px-3 text-sm"
                          aria-label="Código de país"
                        >
                          {COUNTRY_CODES.map((country) => (
                            <option key={country.code} value={country.code}>
                              {country.label}
                            </option>
                          ))}
                        </select>
                        <Input
                          disabled={loading}
                          type="tel"
                          {...register("celular", { required: "Obligatorio" })}
                        />
                      </div>
                    </FormControl>
                    <FormMessage>{errors.celular?.message}</FormMessage>
                  </FormItem>
                </div>
              </div>

              <FormItem>
                <FormLabel>
                  Giro <span className="text-red-500">*</span>
                </FormLabel>
                <AutocompleteInput
                  form={form}
                  name="giro"
                  loadOptions={loadOptionsGiros}
                  handleChange={(val) => {
                    setValue("giro", val);
                    clearErrors("giro");
                  }}
                />
                <FormMessage>{errors.giro?.message}</FormMessage>
              </FormItem>

              <FormItem>
                <FormLabel>
                  Dirección <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    disabled={loading}
                    {...register("direccion", { required: "Obligatoria" })}
                  />
                </FormControl>
                <FormMessage>{errors.direccion?.message}</FormMessage>
              </FormItem>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <FormItem>
                  <FormLabel>Facebook</FormLabel>
                  <Input disabled={loading} {...register("facebook")} />
                </FormItem>
                <FormItem>
                  <FormLabel>Instagram</FormLabel>
                  <Input disabled={loading} {...register("instagram")} />
                </FormItem>
                <FormItem>
                  <FormLabel>Página web</FormLabel>
                  <Input disabled={loading} {...register("pagina_web")} />
                </FormItem>
              </div>

              {!editar && (
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-5 mt-8">
                  <h3 className="text-sm font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
                    Configuración de cobro
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormItem>
                      <FormLabel>Tipo de contratación</FormLabel>
                      <Select
                        defaultValue="Prueba"
                        onValueChange={(val) =>
                          setValue("tipo_contratacion", val)
                        }
                      >
                        <FormControl>
                          <SelectTrigger className="bg-white">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Prueba">
                            Prueba / cortesía
                          </SelectItem>
                          <SelectItem value="Normal">
                            Contratación normal
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  </div>

                  {watchTipoContratacion === "Normal" && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white rounded-lg border border-slate-100">
                      <FormItem>
                        <FormLabel>Meses</FormLabel>
                        <Select
                          defaultValue="1"
                          onValueChange={(val) =>
                            setValue("meses_contratados", val)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 Mes</SelectItem>
                            <SelectItem value="6">6 Meses</SelectItem>
                            <SelectItem value="12">12 Meses</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>

                      <FormItem>
                        <FormLabel>Empleados iniciales</FormLabel>
                        <Input
                          type="number"
                          min="0"
                          {...register("empleados")}
                        />
                      </FormItem>

                      <FormItem>
                        <FormLabel>Precio base mensual</FormLabel>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          {...register("precio_base_mensual")}
                        />
                      </FormItem>

                      <FormItem>
                        <FormLabel>
                          Empleados incluidos en la mensualidad
                        </FormLabel>
                        <Input
                          type="number"
                          min="0"
                          {...register("empleados_incluidos")}
                        />
                      </FormItem>

                      <FormItem>
                        <FormLabel>Precio por empleado excedente</FormLabel>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          {...register("precio_empleado_extra")}
                        />
                      </FormItem>

                      <FormItem>
                        <FormLabel>Mensualidad calculada</FormLabel>
                        <Input
                          type="number"
                          step="0.01"
                          readOnly
                          {...register("precio_por_mes")}
                        />
                      </FormItem>

                      <FormItem>
                        <FormLabel>Monto total</FormLabel>
                        <Input
                          type="number"
                          step="0.01"
                          readOnly
                          {...register("monto_total")}
                        />
                      </FormItem>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-center my-8">
                <Button
                  type="submit"
                  className="bg-slate-700 w-full md:w-64"
                  loading={loading}
                  disabled={loading}
                >
                  {editar ? "Guardar cambios" : "Registrar empresa"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
