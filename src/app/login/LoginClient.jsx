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
import { destinoSeguro } from "@/lib/destinoLogin.mjs";
import { entrarConPasskey } from "@/lib/passkeys/api";
import { CLAVE_OFRECER, marcarActivada, mensajeFalla, payloadDeToken, textoBotonEntrar } from "@/lib/passkeys/modelo.mjs";
import usePlataforma from "@/components/seguridad/usePlataforma";
import { IconoMetodo } from "@/components/seguridad/OfertaPasskey";

const RUTAS_POR_TIPO = {
  User: "/panel",
  Recruiter: "/panel",
  Admin: "/dashboard",
  Empleado: "/empleado",
};

const guardarEnSesion = (clave, valor) => {
  try {
    if (valor) window.sessionStorage.setItem(clave, valor);
    else window.sessionStorage.removeItem(clave);
  } catch { /* sin almacenamiento: no se ofrece activar */ }
};

// destino: a dónde volver después de entrar (?next= ya validado en la página; se vuelve a validar aquí).
// aviso: texto ya resuelto en la página (p. ej. «Tu sesión se cerró…» cuando el servidor cerró la sesión).
export default function LoginClient({ initialIsNative = false, destino: destinoPedido = null, aviso = null }) {
  const { login } = useAuth();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [isNative, setIsNative] = useState(initialIsNative);
  const plataforma = usePlataforma();
  const [conPasskey, setConPasskey] = useState(false);
  const [errorPasskey, setErrorPasskey] = useState(null);

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

  // Guarda el token y navega según el tipo de cuenta (igual que antes). false = tipo desconocido.
  const entrar = (token, tipo_usuario) => {
    Cookies.set("token", token, { expires: 365 });
    login(token);
    const destino = RUTAS_POR_TIPO[tipo_usuario] ? destinoSeguro(destinoPedido) || RUTAS_POR_TIPO[tipo_usuario] : null;
    if (!destino) return false;
    enqueueSnackbar("Inicio de sesión exitoso", { variant: "success" });
    router.push(destino);
    return true;
  };

  // (25/11/2026) Entrar con Face ID / huella / passkey. No se oculta el botón aunque el navegador diga que no hay
  // autenticador (isUserVerifyingPlatformAuthenticatorAvailable falla en iOS 26.2 WKWebView): se intenta y, si no se
  // puede, se explica y el formulario sigue ahí.
  const onPasskey = async () => {
    setConPasskey(true);
    setErrorPasskey(null);
    try {
      const { token, tipo_usuario } = await entrarConPasskey();
      guardarEnSesion(CLAVE_OFRECER, null);
      try { marcarActivada(window.localStorage, payloadDeToken(token)); } catch { /* sin almacenamiento */ }
      if (entrar(token, tipo_usuario)) return;
      setErrorPasskey("El tipo usuario de este usuario no existe");
    } catch (error) {
      setErrorPasskey(mensajeFalla(error, { plataforma }));
    }
    setConPasskey(false);
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
      // (25/11/2026) Recién entró con contraseña: se ofrece activar Face ID / huella (components/seguridad/OfertaPasskey).
      guardarEnSesion(CLAVE_OFRECER, "1");
      if (entrar(token, tipo_usuario)) return;

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
        {aviso ? (
          <p role="status" className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm text-[#080d36]">
            {aviso}
          </p>
        ) : null}
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

          <div className="flex items-center gap-3 text-xs text-slate-400" aria-hidden="true">
            <span className="h-px flex-1 bg-slate-200" />o<span className="h-px flex-1 bg-slate-200" />
          </div>
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              onClick={onPasskey}
              loading={conPasskey}
              disabled={loading}
              startIcon={<IconoMetodo plataforma={plataforma} />}
              className="w-full h-12 rounded-xl text-base font-semibold cursor-pointer border-slate-200 text-[var(--adamia-text-primary)] hover:border-[var(--adamia-blue)]/50 hover:bg-[var(--adamia-blue)]/5"
            >
              {textoBotonEntrar(plataforma)}
            </Button>
            {errorPasskey ? (
              <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
                {errorPasskey}
              </p>
            ) : null}
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
