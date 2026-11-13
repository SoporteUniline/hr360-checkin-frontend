"use client";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
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
import Cookies from "js-cookie";
import { useState, useEffect } from "react";
import EllipsisLoader from "@/components/loading/EllipsisLoader";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";
import { CircleArrowLeftIcon, ShieldCheck } from "lucide-react";
import { Capacitor } from "@capacitor/core";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsNative(
        Capacitor.isNativePlatform() ||
          navigator.userAgent.includes("AdamiaAppNative") ||
          window.location.search.includes("native=true"),
      );
    }
  }, []);

  const form = useForm({
    defaultValues: {
      correo: "",
      password: "",
    },
  });

  const handleBack = () => {
    if (isNative) return;
    router.push("/");
  };
  const handleRecovery = () => router.push("/recuperacion");
  const irARegistro = () => {
    if (isNative) return;
    router.push("/contratar-plan");
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const { correo, password } = data;
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/users/login`,
        {
          correo,
          contrasenia: password,
        },
      );
      const { token, tipo_usuario } = response.data;
      Cookies.set("token", token, { expires: 365 });
      login(token);

      const rutas = {
        User: "/panel",
        Recruiter: "/panel",
        Admin: "/dashboard",
        Empleado: "/empleado",
      };

      const destino = rutas[tipo_usuario];

      if (destino) {
        enqueueSnackbar("Inicio de sesión exitoso", { variant: "success" });
        router.push(destino);
      } else {
        enqueueSnackbar("El tipo usuario de este usuario no existe", {
          variant: "error",
        });
      }

      setTimeout(() => {
        setLoading(false);
      }, 2000);
    } catch (error) {
      console.log(error);
      const errorMessage =
        error.response?.data?.error || "Error al iniciar sesión";
      enqueueSnackbar(errorMessage, { variant: "error" });
      setLoading(false);
    }
  };

  if (loading) return <EllipsisLoader />;

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 min-h-screen min-h-[100dvh]">
      <div className="hidden md:block">
        <section className="relative min-h-screen flex flex-col justify-center items-center bg-[url(/assets/bg.jpg)] bg-cover bg-center">
          <div className="absolute w-full h-full bg-slate-900/70" />
          <Image
            alt="ADAMIA"
            src="/assets/logo.png"
            height={170}
            width={460}
            className="z-10 h-auto w-[260px] lg:w-[360px]"
          />
        </section>
      </div>
      <div className="flex flex-col min-h-screen min-h-[100dvh] bg-white">
        {!isNative && (
          <nav className="flex justify-end p-4">
            <Button
              variant="ghost"
              className="text-[var(--adamia-text-primary)] hover:bg-[var(--adamia-blue)]/10"
              startIcon={<CircleArrowLeftIcon className="w-5 h-5" />}
              onClick={handleBack}
            >
              Página principal
            </Button>
          </nav>
        )}
        <div className="flex flex-col justify-center items-center flex-1 px-5 py-8 sm:px-8">
          <div className="w-full max-w-sm sm:max-w-md mx-auto">
            {/* Logo de ADAMIA (visible en móvil o app nativa) */}
            <div className="md:hidden mb-6 flex justify-center">
              <Image
                alt="ADAMIA"
                src="/assets/adamia.png"
                height={54}
                width={170}
                className="h-11 w-auto object-contain"
                priority
              />
            </div>

            {/* Cabecera del formulario */}
            <div className="text-center mb-7">
              <h1 className="text-[var(--adamia-text-primary)] text-2xl sm:text-3xl font-bold tracking-tight">
                Iniciar sesión
              </h1>
              <p className="mt-2 text-sm text-[var(--adamia-text-secondary)]">
                Ingresa tus credenciales para acceder a la plataforma
              </p>
            </div>

            {/* Formulario */}
            <section className="bg-white">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="correo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-[var(--adamia-text-primary)]">
                          Correo electrónico
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="email"
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
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-[var(--adamia-text-primary)]">
                          Contraseña
                        </FormLabel>
                        <FormControl>
                          <PasswordInput
                            autoComplete="current-password"
                            className="w-full h-12 min-h-12 rounded-xl text-base px-4 border-slate-200 focus-visible:border-[var(--adamia-blue)] focus-visible:ring-[var(--adamia-blue)]/20"
                            placeholder="Ingresa tu contraseña"
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
                      className="w-full h-12 rounded-xl text-base font-semibold cursor-pointer text-white shadow-md shadow-blue-500/20 bg-gradient-to-r from-[var(--adamia-blue)] to-[var(--adamia-purple)] hover:opacity-95 active:scale-[0.99] transition-all"
                    >
                      Ingresar
                    </Button>
                  </div>

                  <div className="flex flex-col gap-2 pt-2 text-center">
                    <Button
                      onClick={handleRecovery}
                      type="button"
                      variant="ghost"
                      className="w-full h-10 cursor-pointer text-sm font-medium text-[var(--adamia-text-secondary)] hover:text-[var(--adamia-blue)] hover:bg-[var(--adamia-blue)]/5 rounded-xl"
                    >
                      ¿Olvidaste tu contraseña?
                    </Button>

                    {!isNative && (
                      <Button
                        onClick={irARegistro}
                        type="button"
                        variant="ghost"
                        className="w-full h-10 cursor-pointer text-sm font-medium text-[var(--adamia-blue)] hover:bg-[var(--adamia-blue)]/5 rounded-xl"
                      >
                        ¿No tienes una cuenta? Registrarme
                      </Button>
                    )}
                  </div>
                </form>
              </Form>
            </section>

            {/* Distintivo de seguridad */}
            <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Conexión segura y cifrada</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
