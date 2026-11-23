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
import { useAuth } from "@/context/AuthContext";
import AuthSplitShell from "@/components/auth/AuthSplitShell";
import { CircleArrowLeftIcon } from "lucide-react";
import { isNativeClient } from "@/lib/native-app";

export default function LoginClient({ initialIsNative = false }) {
  const { login } = useAuth();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [isNative, setIsNative] = useState(initialIsNative);

  useEffect(() => {
    if (isNativeClient()) {
      setIsNative(true);
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
        return;
      }

      enqueueSnackbar("El tipo usuario de este usuario no existe", {
        variant: "error",
      });
      setLoading(false);
    } catch (error) {
      console.log(error);
      const errorMessage =
        error.response?.data?.error || "Error al iniciar sesión";
      enqueueSnackbar(errorMessage, { variant: "error" });
      setLoading(false);
    }
  };

  return (
    <AuthSplitShell
      nav={
        !isNative && (
          <nav className="flex justify-end p-4 adamia-web-only">
            <Button
              variant="ghost"
              className="text-[var(--adamia-text-primary)] hover:bg-[var(--adamia-blue)]/10"
              startIcon={<CircleArrowLeftIcon className="w-5 h-5" />}
              onClick={handleBack}
            >
              Página principal
            </Button>
          </nav>
        )
      }
      title="Iniciar sesión"
      subtitle="Ingresa tus credenciales para acceder a la plataforma"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    inputMode="email"
                    enterKeyHint="next"
                    autoComplete="email"
                    disabled={loading}
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
                    enterKeyHint="go"
                    disabled={loading}
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
              loading={loading}
              className="w-full h-12 rounded-xl text-base font-semibold cursor-pointer text-white shadow-md shadow-blue-500/20 bg-brand hover:opacity-95 active:scale-[0.99] transition-all"
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </Button>
          </div>

          <div className="flex flex-col gap-2 pt-2 text-center">
            <Button
              onClick={handleRecovery}
              type="button"
              variant="ghost"
              disabled={loading}
              className="w-full h-10 cursor-pointer text-sm font-medium text-[var(--adamia-text-secondary)] hover:text-[var(--adamia-blue)] hover:bg-[var(--adamia-blue)]/5 rounded-xl"
            >
              ¿Olvidaste tu contraseña?
            </Button>

            {!isNative && (
              <Button
                onClick={irARegistro}
                type="button"
                variant="ghost"
                disabled={loading}
                className="w-full h-10 cursor-pointer text-sm font-medium text-[var(--adamia-blue)] hover:bg-[var(--adamia-blue)]/5 rounded-xl adamia-web-only"
              >
                ¿No tienes una cuenta? Registrarme
              </Button>
            )}
          </div>
        </form>
      </Form>
    </AuthSplitShell>
  );
}
