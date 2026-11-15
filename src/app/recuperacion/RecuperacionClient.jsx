"use client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { useSnackbar } from "notistack";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Check, CircleArrowLeftIcon, HomeIcon } from "lucide-react";
import AuthSplitShell from "@/components/auth/AuthSplitShell";
import OTPStep from "./OTPStep";
import PasswordStep from "./PasswordStep";
import { isNativeClient } from "@/lib/native-app";

const STEP_LABELS = ["Datos", "Código", "Contraseña"];

export default function RecuperacionClient({ initialIsNative = false }) {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [isNative, setIsNative] = useState(initialIsNative);

  useEffect(() => {
    if (isNativeClient()) {
      setIsNative(true);
    }
  }, []);

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

  const currentStep = !steps.credentials ? 1 : !steps.otp ? 2 : 3;

  const checkFirstStep = async () => {
    // solicitar código otp
    try {
      setLoading(true);
      const { telefono, correo } = form.getValues();
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/otp/send`,
        { telefono, correo, recovery: true },
      );
      enqueueSnackbar(
        response?.data?.message || "Código de verificación enviado",
        {
          variant: "success",
        },
      );
      setLoading(false);
      // al recibir OK del api continuar al siguiente step
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
    <AuthSplitShell
      nav={
        <nav className="flex items-center justify-between px-3 pt-4 pb-2 sm:px-5">
          <Button
            variant="ghost"
            className="text-[var(--adamia-text-primary)] hover:bg-[var(--adamia-blue)]/10 px-2.5 sm:px-3"
            startIcon={<CircleArrowLeftIcon className="w-5 h-5" />}
            onClick={() => router.push("/login")}
          >
            Iniciar sesión
          </Button>
          {!isNative && (
            <Button
              variant="ghost"
              className="adamia-web-only text-[var(--adamia-text-primary)] hover:bg-[var(--adamia-blue)]/10 px-2.5 sm:px-3"
              startIcon={<HomeIcon className="w-4 h-4" />}
              onClick={() => {
                if (!isNative) router.push("/");
              }}
            >
              Página principal
            </Button>
          )}
        </nav>
      }
      title="Recuperar contraseña"
      subtitle="Restablece tu acceso en 3 sencillos pasos"
      securityText="Verificación segura en 3 pasos"
      headerExtra={
        <div className="mb-7">
          <div className="flex items-center justify-between">
            {STEP_LABELS.map((label, index) => {
              const stepNumber = index + 1;
              const isDone =
                (stepNumber === 1 && steps.credentials) ||
                (stepNumber === 2 && steps.otp) ||
                (stepNumber === 3 && steps.password);
              const isActive = !isDone && currentStep === stepNumber;

              return (
                <div
                  key={label}
                  className="flex flex-1 items-center last:flex-none"
                >
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                        isDone
                          ? "bg-emerald-500 text-white"
                          : isActive
                            ? "bg-[var(--adamia-blue)] text-white shadow-sm shadow-blue-500/30"
                            : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {isDone ? (
                        <Check className="h-4 w-4 stroke-[2.5]" />
                      ) : (
                        stepNumber
                      )}
                    </div>
                    <span
                      className={`text-[11px] font-medium ${
                        isDone || isActive
                          ? "text-[var(--adamia-text-primary)]"
                          : "text-slate-400"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                  {index < STEP_LABELS.length - 1 && (
                    <div
                      className={`mx-2 -mt-5 h-[2px] flex-1 rounded-full transition-colors ${
                        isDone ? "bg-emerald-500" : "bg-slate-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      }
    >
      {!steps.credentials && (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(checkFirstStep)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="correo"
              rules={{ required: "Correo electrónico obligatorio" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-[var(--adamia-text-primary)]">
                    Correo electrónico
                  </FormLabel>
                  <FormControl>
                    <Input
                      disabled={loading}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      className="w-full h-12 rounded-xl text-base px-4 border-slate-200 focus-visible:border-[var(--adamia-blue)] focus-visible:ring-[var(--adamia-blue)]/20"
                      placeholder="ejemplo@empresa.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="telefono"
              rules={{
                required: "Teléfono obligatorio",
                pattern: {
                  value: /^(52\d{10}|\d{10})$/,
                  message: "Teléfono no válido (10 dígitos)",
                },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-[var(--adamia-text-primary)]">
                    Teléfono registrado
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      disabled={loading}
                      className="w-full h-12 rounded-xl text-base px-4 border-slate-200 focus-visible:border-[var(--adamia-blue)] focus-visible:ring-[var(--adamia-blue)]/20"
                      placeholder="10 dígitos (ej. 5512345678)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-2">
              <Button
                type="submit"
                loading={loading}
                className="w-full h-12 rounded-xl text-base font-semibold cursor-pointer text-white shadow-md shadow-blue-500/20 bg-gradient-to-r from-[var(--adamia-blue)] to-[var(--adamia-purple)] hover:opacity-95 active:scale-[0.99] transition-all"
              >
                Enviar código
              </Button>
            </div>
          </form>
        </Form>
      )}

      <OTPStep form={form} setSteps={setSteps} steps={steps} />
      <PasswordStep form={form} setSteps={setSteps} steps={steps} />
    </AuthSplitShell>
  );
}
