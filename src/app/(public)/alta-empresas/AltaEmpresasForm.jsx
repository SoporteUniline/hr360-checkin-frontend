"use client";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { enqueueSnackbar } from "notistack";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import ImageForm from "./ImageForm";
import AutocompleteInput from "@/components/Inputs/FormCreatebleAutocomplete";
import { loadOptionsGiros } from "./dataMappings";

export default function AltaEmpresasForm() {
  const { isLoggedIn } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [imagePreview, setImagePreview] = React.useState(null);
  const [selectedFile, setSelectedFile] = React.useState(null);

  const form = useForm({
    defaultValues: {
      nombre_empresa: "",
      nombre_duenio: "",
      correo_empresa: "",
      celular: "",
      direccion: "",
      facebook: "",
      instagram: "",
      pagina_web: "",
      accepted: false,
    },
  });

  const { register, handleSubmit, formState, setError } = form;

  const handleOnSelect = (selectedOption) => {
    form.setValue("giro", selectedOption);
  };

  const onSubmit = async (data) => {
    if (!selectedFile && !imagePreview) {
      setError("imagen", {
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
    try {
      const formData = new FormData();

      // Agrega la imagen si hay una
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
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/empresas/create`,
        formData
      );
      enqueueSnackbar("Se registró tu empresa exitosamente!", {
        variant: "success",
      });
      setLoading(false);
      setImagePreview(null);
      form.reset();
    } catch (error) {
      setLoading(false);
      const errorMessage =
        error.response?.data?.error ||
        error?.message ||
        "Error al registrar empresa";
      enqueueSnackbar(errorMessage, { variant: "error" });
    }
  };

  useEffect(() => {
    if (isLoggedIn) router.push("/");
  }, [isLoggedIn, router]);

  if (isLoggedIn) return null;

  return (
    <section className="w-full bg-gray-100 flex justify-center items-center md:p-10">
      <div className="bg-white shadow-md p-5 rounded-md w-[800px] max-w-full">
        <div className="flex justify-center py-5">
          <Image
            alt="BackgroundHR"
            src="/assets/logo.png"
            height={100}
            width={100}
          />
        </div>
        <h3 className="text-2xl font-extrabold text-center text-slate-700">
          Formulario de Alta de Empresas
        </h3>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <ImageForm
                form={form}
                imagePreview={imagePreview}
                setImagePreview={setImagePreview}
                setSelectedFile={setSelectedFile}
              />
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
                <FormMessage>
                  {formState.errors.pagina_web?.message}
                </FormMessage>
              </FormItem>
            </div>
            <FormField
              control={form.control}
              name="accepted"
              rules={{ required: "Debes aceptar los términos" }}
              render={({ field }) => (
                <FormItem className="flex items-start space-x-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      disabled={loading}
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="leading-none text-sm">
                    Acepto los{" "}
                    <a
                      href="/terminos-condiciones"
                      className="underline text-blue-500"
                      target="_blank"
                    >
                      Términos y Condiciones
                    </a>{" "}
                    y el{" "}
                    <a
                      href="/aviso-privacidad"
                      className="underline text-blue-500"
                      target="_blank"
                    >
                      Aviso de Privacidad
                    </a>
                    .
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-center my-5">
              <Button type="submit" className="bg-slate-700" loading={loading}>
                Registrarme
              </Button>
            </div>
          </form>
        </Form>
        <p className="text-center font-extrabold text-slate-700 text-sm">
          💡 Al registrarte, tu empresa da el primer paso para digitalizar su
          reclutamiento.
        </p>
        <p className="font-light text-center text-sm mt-3">
          Una vez validada, podrás publicar vacantes, recibir postulaciones
          directas y administrar todo tu proceso desde una sola plataforma.
          <span className="font-bold"> HR360</span> conecta tu negocio con el
          mejor talento y te ayuda a tomar decisiones inteligentes, rápidas y
          eficientes.
        </p>
      </div>
    </section>
  );
}
