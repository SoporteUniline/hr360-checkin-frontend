"use client";
import React from "react";
import { useForm } from "react-hook-form";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import PersonalForm from "./personalForm";
import AcademyForm from "./AcademyForm";
import ExperienceForm from "./ExperienceForm";
import { useSnackbar } from "notistack";
import OTPForm from "./OTPForm";
import axios from "axios";
import CargaCV from "./CargaCV";

export default function ApplicationForm({
  selectedJob,
  open,
  setOpen,
  isLoggedIn,
  setOpenDialog,
}) {
  const [loading, setLoading] = React.useState(false);
  const [files, setFiles] = React.useState([]);
  const [showOTP, setShowOTP] = React.useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const form = useForm({
    defaultValues: {
      nombre_completo: "",
      correo: "",
      telefono: "",
      fecha_nacimiento: "",
      edad: "",
      sexo: "",
      estado_civil: "",
      curp: "",
      nivel_estudios: "",
      institucion: "",
      carrera: "",
      anio_termino: "",
      ultimo_puesto: "",
      empresa_anterior: "",
      duracion_puesto: "",
      actividades_principales: "",
      ultimo_salario: "",
      motivo_salida: "",
    },
  });

  const { handleSubmit } = form;

  const sendOTP = async (telefono) => {
    try {
      setLoading(true);
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/otp/send`,
        { telefono }
      );
      enqueueSnackbar(
        response?.data?.message || "Código de verificación enviado",
        {
          variant: "success",
        }
      );
      setLoading(false);
      setShowOTP(true);
    } catch (error) {
      setLoading(false);
      const errorMessage =
        error.response?.data?.error ||
        error?.message ||
        "Error al enviar código";
      enqueueSnackbar(errorMessage, { variant: "error" });
    }
  };

  const onSubmit = async (data) => {
    if (!files.length) {
      enqueueSnackbar("CV es obligatorio", {
        variant: "error",
      });
      return;
    }

    if (!showOTP) return sendOTP(data.telefono);
    //crear formData
    const formData = new FormData();
    // agregar formulario y vancante ID al formdata
    formData.append("id_vacante", selectedJob.id_vacante);
    for (const key in data) {
      formData.append(key, data[key]);
    }
    // agregar el cv a formdata
    if (files.length > 0) formData.append("cv", files[0].file);

    setLoading(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/postulaciones/create`,
        formData
      );
      enqueueSnackbar(
        response.data.message || "Se mando tu solicitud correctamente",
        {
          variant: "success",
        }
      );
      setLoading(false);
      form.reset();
      setFiles([]);
      setOpen(false);
    } catch (error) {
      setLoading(false);
      const errorMessage =
        error.response?.data?.error ||
        error?.message ||
        "Error al registrar empresa";
      enqueueSnackbar(errorMessage, { variant: "error" });
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button
        className="bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-600 w-full"
        onClick={() => {
          if (isLoggedIn) {
            setOpenDialog(true); //Descomentar esta línea a futuro
            //setOpen(true); //Borrar esta línea a futuro
          } else {
            setOpen(true);
          }
        }}
      >
        Postularme Ahora
      </Button>

      <SheetContent className="min-w-[100vw] md:min-w-[60vw] lg:min-w-[50vw]">
        <SheetHeader>
          <SheetTitle className="flex flex-col text-slate-700">
            <span className="font-extrabold text-xl">Solicitud de Empleo</span>
            <span className="text-sm">
              Puesto solicitado: {selectedJob.titulo}
            </span>
          </SheetTitle>
          <SheetDescription className="flex flex-col">
            Llena el siguiente formulario con tus datos
          </SheetDescription>
        </SheetHeader>
        <div className="mt-3 h-[85vh] overflow-y-auto">
          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Accordion type="multiple">
                <AccordionItem value="item-1">
                  <AccordionTrigger className="font-bold text-lg text-slate-700">
                    Información Personal
                  </AccordionTrigger>
                  <AccordionContent>
                    <PersonalForm loading={loading} form={form} />
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger className="font-bold text-lg text-slate-700">
                    Formación Académica
                  </AccordionTrigger>
                  <AccordionContent>
                    <AcademyForm loading={loading} form={form} />
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger className="font-bold text-lg text-slate-700">
                    Experiencia Laboral
                  </AccordionTrigger>
                  <AccordionContent>
                    <ExperienceForm loading={loading} form={form} />
                  </AccordionContent>
                </AccordionItem>
                {/* <AccordionItem value="item-4">
                  <AccordionTrigger className="font-bold text-lg text-slate-700">
                    Vacante Solicitada
                  </AccordionTrigger>
                  <AccordionContent>
                    <PositionForm loading={loading} form={form} />
                  </AccordionContent>
                </AccordionItem> */}
              </Accordion>
              <CargaCV files={files} setFiles={setFiles} />
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
                {showOTP ? (
                  <OTPForm onSubmit={onSubmit} form={form} />
                ) : (
                  <Button
                    type="submit"
                    className="bg-slate-700 w-full mt-10"
                    loading={loading}
                  >
                    Enviar Solicitud
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
