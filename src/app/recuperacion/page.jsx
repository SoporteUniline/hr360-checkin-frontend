"use client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormItem, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { useSnackbar } from "notistack";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle, CircleArrowLeftIcon, HomeIcon } from "lucide-react";
import OTPStep from "./OTPStep";
import PasswordStep from "./PasswordStep";

export default function RecuperacionPage() {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState({
    credentials: false,
    otp: false,
    password: false,
  });
  const form = useForm({
    defaultValues: {
      correo: "",
      telefono: "",
    },
  });

  const checkFirstStep = async () => {
    //solicitar codigo otp
    try {
      setLoading(true);
      const { telefono, correo } = form.getValues();
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/otp/send`,
        { telefono, correo, recovery: true }
      );
      enqueueSnackbar(
        response?.data?.message || "Código de verificación enviado",
        {
          variant: "success",
        }
      );
      setLoading(false);
      //al recibir OK del api coninuar al siguiente step
      setSteps({ ...steps, credentials: true });
    } catch (error) {
      setLoading(false);
      const errorMessage =
        error.response?.data?.error ||
        error?.message ||
        "Error al enviar código";
      enqueueSnackbar(errorMessage, { variant: "error" });
    }
  };

  return (
    <section className="flex flex-col">
      <nav className="flex justify-end p-3">
        <Button
          variant="ghost"
          startIcon={<HomeIcon />}
          onClick={() => router.push("/")}
        >
          Página principal
        </Button>
        <Button
          variant="ghost"
          startIcon={<CircleArrowLeftIcon />}
          onClick={() => router.push("/login")}
        >
          LogIn
        </Button>
      </nav>
      <div className="flex flex-col justify-center items-center flex-1">
        <h1 className="text-slate-700 text-4xl font-bold self-center">
          Recuperación de Contraseña
        </h1>
        <p className="text-gray-500 text-lg font-bold self-center">
          Cambia tu contraseña en 3 sencillos pasos
        </p>
        <section className="w-full max-w-lg mt-10 self-center px-20">
          <p className="flex items-center gap-2 py-1 text-sm text-slate-700 font-light">
            1. Ingrese su correo electrónico y teléfono{" "}
            <span>{steps.credentials && <CheckCircle />}</span>
          </p>
          <Form {...form}>
            {!steps.credentials && (
              <form
                onSubmit={form.handleSubmit(checkFirstStep)}
                className="space-y-5"
              >
                <FormItem>
                  <FormControl>
                    <Input
                      disabled={loading}
                      type="email"
                      className="w-full py-2.5 text-base "
                      placeholder="Correo electrónico"
                      {...form.register("correo", {
                        required: "Correo electrónico obligatorio",
                      })}
                    />
                  </FormControl>
                  <FormMessage>
                    {form.formState.errors.correo?.message}
                  </FormMessage>
                </FormItem>
                <FormItem>
                  <FormControl>
                    <Input
                      type="phone"
                      disabled={loading}
                      className="w-full py-2.5 text-base "
                      placeholder="Número de telefono a 10 dígitos"
                      {...form.register("telefono", {
                        required: "Teléfono obligatorio",
                        pattern: {
                          value: /^(52\d{10}|\d{10})$/,
                          message: "Teléfono no válido",
                        },
                      })}
                    />
                  </FormControl>
                  <FormMessage>
                    {form.formState.errors.telefono?.message}
                  </FormMessage>
                </FormItem>
                <Button
                  type="submit"
                  className="w-full bg-slate-700 cursor-pointer hover:bg-slate-500 "
                  loading={loading}
                >
                  Continuar
                </Button>
              </form>
            )}
          </Form>
        </section>
        <section className="w-full max-w-lg mt-10 self-center px-20">
          <OTPStep form={form} setSteps={setSteps} steps={steps} />
        </section>
        <section className="w-full max-w-lg mt-10 self-center px-20">
          <PasswordStep form={form} setSteps={setSteps} steps={steps} />
        </section>
      </div>
    </section>
  );
}
