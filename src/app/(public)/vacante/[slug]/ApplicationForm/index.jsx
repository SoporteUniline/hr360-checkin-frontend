"use client";
import React from "react";
import { useForm } from "react-hook-form";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { X } from "lucide-react";
import { outfit } from "@/fonts";
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
import PreguntasVacante, { faltantes } from "./PreguntasVacante";
import { respuestasParaEnviar } from "@/lib/reclutamiento/respuestas.mjs";

export default function ApplicationForm({
  selectedJob,
  open,
  setOpen,
  isLoggedIn,
  setOpenDialog,
  onEnviada,
}) {
  const [loading, setLoading] = React.useState(false);
  const [files, setFiles] = React.useState([]);
  const [showOTP, setShowOTP] = React.useState(false);
  // Preguntas propias de la vacante (Reclutamiento real).
  const preguntas = React.useMemo(() => selectedJob?.preguntas_formulario ?? [], [selectedJob]);
  const [respuestas, setRespuestas] = React.useState({});
  const [sinResponder, setSinResponder] = React.useState([]);
  const cerrada = selectedJob?.recibe_postulaciones === false;
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

  const onSubmit = async (data, telefonoVerificacionToken = "") => {
    if (!files.length) {
      enqueueSnackbar("CV es obligatorio", {
        variant: "error",
      });
      return;
    }

    const pendientes = faltantes(preguntas, respuestas);
    setSinResponder(pendientes);
    if (pendientes.length) {
      enqueueSnackbar("Responde las preguntas del puesto marcadas.", { variant: "error" });
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
    // Prueba de que el teléfono se verificó; el backend la valida y la consume (INC-REC-002).
    // (handleSubmit de react-hook-form pasa el evento como 2º argumento: solo vale un texto.)
    formData.append(
      "telefono_verificacion_token",
      typeof telefonoVerificacionToken === "string" ? telefonoVerificacionToken : "",
    );
    if (preguntas.length) formData.append("respuestas", JSON.stringify(respuestasParaEnviar(preguntas, respuestas)));
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
      setRespuestas({});
      setShowOTP(false);
      setOpen(false);
      onEnviada?.();
    } catch (error) {
      setLoading(false);
      const errorMessage =
        error.response?.data?.error ||
        error?.message ||
        "Error al registrar empresa";
      enqueueSnackbar(errorMessage, { variant: "error" });
    }
  };

  // Secciones abiertas una tras otra: en acordeón cerrado los errores de un campo obligatorio quedaban ocultos.
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {cerrada ? (
        <p className="vc-aviso" role="status">Esta vacante ya cerró su periodo de postulaciones.</p>
      ) : null}
      <button
        type="button"
        className="btn btn-primary vc-btn-postular"
        disabled={cerrada}
        onClick={() => {
          if (isLoggedIn) {
            setOpenDialog(true); //Descomentar esta línea a futuro
            //setOpen(true); //Borrar esta línea a futuro
          } else {
            setOpen(true);
          }
        }}
      >
        Postularme ahora
      </button>

      <SheetContent className={`lh vc-hoja ${outfit.variable}`}>
        <div className="vc-hoja-cab">
          <div>
            <SheetTitle className="vc-hoja-titulo">Solicitud de empleo</SheetTitle>
            <SheetDescription className="vc-hoja-sub">
              {selectedJob.titulo}{selectedJob.nombre_empresa ? ` en ${selectedJob.nombre_empresa}` : ""}
            </SheetDescription>
          </div>
          <SheetClose className="vc-cerrar" aria-label="Cerrar solicitud"><X aria-hidden="true" /></SheetClose>
        </div>
        <div className="vc-hoja-cuerpo">
          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="vc-form">
              <p className="vc-nota">Los campos con <span aria-hidden="true">*</span><span className="sr-only">asterisco</span> son obligatorios. Al final te enviaremos un código por SMS para verificar tu teléfono.</p>
              <section className="vc-sec" aria-labelledby="sec-personal">
                <h3 id="sec-personal">Información personal</h3>
                <PersonalForm loading={loading} form={form} />
              </section>
              <section className="vc-sec" aria-labelledby="sec-estudios">
                <h3 id="sec-estudios">Formación académica</h3>
                <AcademyForm loading={loading} form={form} />
              </section>
              <section className="vc-sec" aria-labelledby="sec-experiencia">
                <h3 id="sec-experiencia">Experiencia laboral</h3>
                <ExperienceForm loading={loading} form={form} />
              </section>
              {preguntas.length ? (
                <section className="vc-sec">
                  <PreguntasVacante preguntas={preguntas} valores={respuestas} onCambiar={setRespuestas} errores={sinResponder} disabled={loading} />
                </section>
              ) : null}
              <section className="vc-sec">
                <CargaCV files={files} setFiles={setFiles} />
              </section>
              <FormField
                control={form.control}
                name="accepted"
                rules={{ required: "Debes aceptar los términos" }}
                render={({ field }) => (
                  <FormItem className="vc-acepto">
                    <div className="vc-acepto-fila">
                      <FormControl>
                        <Checkbox
                          aria-labelledby="vc-acepto-txt"
                          disabled={loading}
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="vc-acepto-txt" id="vc-acepto-txt">
                        Acepto los{" "}
                        <a href="/terminos-condiciones" target="_blank" rel="noopener noreferrer">
                          Términos y condiciones
                        </a>{" "}
                        y el{" "}
                        <a href="/aviso-privacidad" target="_blank" rel="noopener noreferrer">
                          Aviso de privacidad
                        </a>
                        .
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="vc-enviar">
                {showOTP ? (
                  <OTPForm onSubmit={onSubmit} form={form} onCambiarTelefono={() => setShowOTP(false)} />
                ) : (
                  <Button
                    type="submit"
                    className="vc-btn-enviar"
                    loading={loading}
                  >
                    Enviar solicitud
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
