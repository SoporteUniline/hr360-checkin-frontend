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
import Cookies from "js-cookie";
import { useState } from "react";
import EllipsisLoader from "@/components/loading/EllipsisLoader";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";
import { CircleArrowLeftIcon } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const form = useForm({
    defaultValues: {
      correo: "",
      password: "",
    },
  });

  const handleBack = () => router.push("/");
  const handleRecovery = () => router.push("/recuperacion");
  const irARegistro = () => router.push("/register");

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
    <section className="grid grid-cols-1 md:grid-cols-2">
      <div className="hidden sm:block">
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
      <div className="flex flex-col">
        <nav className="flex justify-end p-3">
          <Button
            variant="ghost"
            className="text-[var(--adamia-text-primary)] hover:bg-[var(--adamia-blue)]/10"
            startIcon={<CircleArrowLeftIcon />}
            onClick={handleBack}
          >
            Página principal
          </Button>
        </nav>
        <div className="flex flex-col justify-center items-center flex-1">
          <h1 className="text-[var(--adamia-text-primary)] text-4xl font-bold self-center">
            Iniciar sesión
          </h1>

          <section className="w-full max-w-lg mt-10 self-center px-20">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-5"
              >
                <FormField
                  control={form.control}
                  name="correo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">
                        Correo electrónico
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          className="w-full py-2.5 text-base "
                          placeholder="Ingrese su correo electrónico"
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
                      <FormLabel className="text-sm">Contraseña</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          className="w-full py-2.5 text-base "
                          placeholder="Ingrese su contraseña"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full cursor-pointer bg-gradient-to-r from-[var(--adamia-blue)] to-[var(--adamia-purple)] hover:opacity-95"
                >
                  Ingresar
                </Button>
                <div className="flex flex-col gap-1">
                  <Button
                    onClick={handleRecovery}
                    type="button"
                    variant="ghost"
                    className="w-full cursor-pointer text-[var(--adamia-text-primary)] hover:bg-[var(--adamia-blue)]/10"
                  >
                    Olvidé mi contraseña
                  </Button>
                  <Button
                    onClick={irARegistro}
                    type="button"
                    variant="ghost"
                    className="w-full cursor-pointer text-[var(--adamia-text-primary)] hover:bg-[var(--adamia-blue)]/10"
                  >
                    Registrarme
                  </Button>
                </div>
              </form>
            </Form>
          </section>
        </div>
      </div>
    </section>
  );
}
