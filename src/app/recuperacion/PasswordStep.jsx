"use client";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useSnackbar } from "notistack";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, ShieldCheckIcon } from "lucide-react";

export default function PasswordStep({ form, steps, setSteps }) {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const completeSteps = async (e) => {
    e?.preventDefault?.();
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
        },
      );
      enqueueSnackbar("Se guardó correctamente tu nueva contraseña", {
        variant: "success",
      });
      setError("");
      setSteps({ ...steps, password: true });
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err) {
      const errorMessage =
        err.response?.data?.error || "Error al actualizar contraseña";
      enqueueSnackbar(errorMessage, { variant: "error" });
      setLoading(false);
    }
  };

  if (!steps.otp) return null;

  if (steps.password) {
    return (
      <div className="flex flex-col items-center text-center py-4 space-y-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-semibold text-[var(--adamia-text-primary)]">
          ¡Contraseña actualizada!
        </h2>
        <p className="text-sm text-[var(--adamia-text-secondary)]">
          Redirigiendo a inicio de sesión, espera un momento...
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={completeSteps} className="space-y-4">
      <div className="space-y-2">
        <Label
          htmlFor="recovery-password"
          className="text-sm font-medium text-[var(--adamia-text-primary)]"
        >
          Nueva contraseña
        </Label>
        <PasswordInput
          id="recovery-password"
          disabled={loading}
          autoComplete="new-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (error) setError("");
          }}
          className="w-full h-12 min-h-12 rounded-xl text-base px-4 border-slate-200 focus-visible:border-[var(--adamia-blue)] focus-visible:ring-[var(--adamia-blue)]/20"
          placeholder="Ingresa tu nueva contraseña"
        />
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="recovery-confirm-password"
          className="text-sm font-medium text-[var(--adamia-text-primary)]"
        >
          Confirmar contraseña
        </Label>
        <PasswordInput
          id="recovery-confirm-password"
          disabled={loading}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (error) setError("");
          }}
          className="w-full h-12 min-h-12 rounded-xl text-base px-4 border-slate-200 focus-visible:border-[var(--adamia-blue)] focus-visible:ring-[var(--adamia-blue)]/20"
          placeholder="Repite la nueva contraseña"
        />
      </div>

      {error && (
        <p className="text-sm text-red-500 font-medium text-center">{error}</p>
      )}

      <div className="pt-2">
        <Button
          startIcon={<ShieldCheckIcon className="w-4 h-4" />}
          type="submit"
          loading={loading}
          className="w-full h-12 rounded-xl text-base font-semibold cursor-pointer text-white shadow-md shadow-blue-500/20 bg-gradient-to-r from-[var(--adamia-blue)] to-[var(--adamia-purple)] hover:opacity-95 active:scale-[0.99] transition-all"
        >
          Guardar nueva contraseña
        </Button>
      </div>
    </form>
  );
}
