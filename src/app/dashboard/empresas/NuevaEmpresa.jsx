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
import axios from "axios";
import { Edit, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { mutate } from "swr";
import Cookies from "js-cookie";
//import { fetcher } from "@/lib/fetcher";
import ImageForm from "@/app/(public)/alta-empresas/ImageForm";
import ImageEmpresa from "@/app/panel/cuenta/Empresa/ImagenEmpresa";
import AutocompleteInput from "@/components/Inputs/FormCreatebleAutocomplete";
import { loadOptionsGiros } from "@/app/(public)/alta-empresas/dataMappings";

export default function NuevaEmpresa({ editar = false, values, limit, page }) {
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

  const { handleSubmit, register, formState, setError } = form;

  const onSubmit = async (data) => {
    if (!selectedFile && !imagePreview) {
      setError("image", {
        type: "required",
        message: "La imagen es obligatoria",
      });
      return;
    }

    if (!data?.giro?.value) {
      setError("giro", {
        type: "required",
        message: "Giro es obligatorio",
      });
      return;
    }

    setLoading(true);
    const headers = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
    try {
      if (editar) {
        const { createdAt, updatedAt, giro, ...input } = data;

        await axios.put(
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/empresas/${data.id_empresa}`,
          { ...input, giro: giro.value },
          headers
        );
      } else {
        const formData = new FormData();

        if (selectedFile) {
          formData.append("imagen", selectedFile);
        }

        Object.entries(data).forEach(([key, value]) => {
          if (key !== "imagen" && key !== "giro") {
            formData.append(key, value);
          }
        });
        formData.append("giro", data?.giro?.label);

        await axios.post(
          `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/empresas/createEmpresaByAdmin`,
          formData,
          headers
        );
      }
      enqueueSnackbar("Se guardó empresa exitosamente!", {
        variant: "success",
      });
      form.reset();
      setLoading(false);
      await mutate(`/empresas?page=${page}&limit=${limit}`);
      setOpen(false);
    } catch (error) {
      setLoading(false);
      const errorMessage =
        error.response?.data?.error ||
        error?.message ||
        "Error al guardar empresa";
      enqueueSnackbar(errorMessage, { variant: "error" });
    }
  };

  const getOptionGiros = async (value) => {
    const options = await loadOptionsGiros(value);
    return options.find((opt) => opt.label === value);
  };

  const handleEditAction = async (e) => {
    e.stopPropagation();
    const giro = await getOptionGiros(values.giro);
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

  const handleOnSelect = (selectedOption) => {
    form.setValue("giro", selectedOption);
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
        <div className="mt-3 h-[85vh] overflow-y-auto">
          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                {editar ? (
                  <ImageEmpresa empresa={values} keepData />
                ) : (
                  <ImageForm
                    form={form}
                    imagePreview={imagePreview}
                    setImagePreview={setImagePreview}
                    setSelectedFile={setSelectedFile}
                  />
                )}
              </div>
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
                    <FormMessage>
                      {formState.errors.empresa?.message}
                    </FormMessage>
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
                    <FormMessage>
                      {formState.errors.celular?.message}
                    </FormMessage>
                  </FormItem>
                </div>
              </div>
              {/* <FormItem>
                <FormLabel>Giro</FormLabel>
                <FormControl>
                  <Input
                    type="text"
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
                  <FormMessage>
                    {formState.errors.facebook?.message}
                  </FormMessage>
                </FormItem>
                <FormItem>
                  <FormLabel>Instagram</FormLabel>
                  <FormControl>
                    <Input disabled={loading} {...register("instagram")} />
                  </FormControl>
                  <FormMessage>
                    {formState.errors.instagram?.message}
                  </FormMessage>
                </FormItem>
                <FormItem>
                  <FormLabel>Página web</FormLabel>
                  <FormControl>
                    <Input disabled={loading} {...register("pagina_web")} />
                  </FormControl>
                  <FormMessage>
                    {formState.errors.pagina_web?.message}
                  </FormMessage>
                </FormItem>
              </div>
              <div className="flex justify-center my-5">
                <Button
                  type="submit"
                  className="bg-slate-700"
                  loading={loading}
                  disabled={loading || (!selectedFile && !imagePreview)}
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
