"use client";
import React from "react";
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
      celular: "",
      giro: "",
      direccion: "",
      facebook: "",
      instagram: "",
      pagina_web: "",
    },
  });

  const { handleSubmit, register, formState, setError, clearErrors } = form;
  const { errors } = formState;

  const onSubmit = async (data) => {
    // 1. Validación manual de la Imagen (Solo en creación)
    if (!editar && !selectedFile) {
      setError("imagen_logo", {
        type: "manual",
        message: "El logo de la empresa es obligatorio",
      });
      return;
    }

    // 2. Validación manual del Giro
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
      if (editar) {
        const { createdAt, updatedAt, giro, ...input } = data;
        await axios.put(
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/empresas/${data.id_empresa}`,
          { ...input, giro: giro.value },
          headers,
        );
      } else {
        const formData = new FormData();
        if (selectedFile) formData.append("imagen", selectedFile);

        Object.entries(data).forEach(([key, value]) => {
          if (key !== "imagen" && key !== "giro" && value) {
            formData.append(key, value);
          }
        });
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
    form.reset({ ...values, giro });
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
              {/* LOGO */}
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

              {/* DATOS PRINCIPALES */}
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
                      <Input
                        disabled={loading}
                        type="tel"
                        {...register("celular", { required: "Obligatorio" })}
                      />
                    </FormControl>
                    <FormMessage>{errors.celular?.message}</FormMessage>
                  </FormItem>
                </div>
              </div>

              {/* GIRO */}
              <FormItem>
                <FormLabel>
                  Giro <span className="text-red-500">*</span>
                </FormLabel>
                <AutocompleteInput
                  form={form}
                  name="giro"
                  loadOptions={loadOptionsGiros}
                  handleChange={(val) => {
                    form.setValue("giro", val);
                    clearErrors("giro");
                  }}
                />
                <FormMessage>{errors.giro?.message}</FormMessage>
              </FormItem>

              {/* DIRECCIÓN */}
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

              {/* REDES SOCIALES Y WEB */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
                <FormItem>
                  <FormLabel>Facebook</FormLabel>
                  <FormControl>
                    <Input disabled={loading} {...register("facebook")} />
                  </FormControl>
                </FormItem>

                <FormItem>
                  <FormLabel>Instagram</FormLabel>
                  <FormControl>
                    <Input disabled={loading} {...register("instagram")} />
                  </FormControl>
                </FormItem>

                <FormItem>
                  <FormLabel>Página web</FormLabel>
                  <FormControl>
                    <Input disabled={loading} {...register("pagina_web")} />
                  </FormControl>
                </FormItem>
              </div>

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
