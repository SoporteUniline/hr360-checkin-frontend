"use client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSnackbar } from "notistack";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle, ShieldCheckIcon } from "lucide-react";

export default function PasswordStep({ form, steps, setSteps }) {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const completeSteps = async () => {
    try {
      if (!password || !confirmPassword) {
        setError("Por favor completa ambos campos.");
        return;
      }

      if (password !== confirmPassword) {
        setError("Las contraseñas no coinciden.");
        return;
      }
      setLoading(true);
      const email = form.getValues("correo");
      await axios.put(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/users/update-password-recovery/${email}`,
        {
          password,
          confirmPassword,
        }
      );
      enqueueSnackbar("Se guardo correctamente tu nueva contraseña", {
        variant: "success",
      });
      setError("");
      setSteps({ ...steps, password: true });
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || "Error al iniciar sesión";
      enqueueSnackbar(errorMessage, { variant: "error" });
      setLoading(false);
    }
  };

  if (!steps.otp) return null;

  return (
    <>
      <div className="flex items-center gap-2">
        <p className="py-1 text-sm text-slate-700 font-light">
          3. Ingrese su nueva contraseña
        </p>
        <span>{steps.password && <CheckCircle />}</span>
      </div>
      {!steps.password ? (
        <div className="flex flex-col gap-3">
          <Input
            disabled={loading}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full py-2.5 text-base"
            placeholder="Ingrese su contraseña"
          />
          <Input
            disabled={loading}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full py-2.5 text-base"
            placeholder="Repite de nuevo la contraseña"
          />
          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
          <Button
            startIcon={<ShieldCheckIcon />}
            type="button"
            onClick={completeSteps}
            disabled={loading}
            className="w-full bg-slate-700 cursor-pointer hover:bg-slate-500"
          >
            Guardar y finalizar proceso
          </Button>
        </div>
      ) : (
        <p className="my-5">
          Redirigiendo a inicio de sesión, espere por favor...
        </p>
      )}
    </>
  );
}
