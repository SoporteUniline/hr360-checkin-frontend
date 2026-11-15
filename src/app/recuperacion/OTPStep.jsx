"use client";
import React from "react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { useSnackbar } from "notistack";
import axios from "axios";

export default function OTPStep({ form, steps, setSteps }) {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = React.useState(false);
  const [code, setCode] = React.useState("");

  const checkSecondStep = async () => {
    if (code.trim().length < 6) {
      enqueueSnackbar("Ingresa los 6 dígitos del código de verificación", {
        variant: "error",
      });
      return;
    }

    // verificar codigo otp
    try {
      setLoading(true);
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/otp/verify`,
        { telefono: form.getValues("telefono"), code },
      );
      enqueueSnackbar(
        response?.data?.message || "Código de verificación aceptado",
        {
          variant: "success",
        },
      );
      setLoading(false);
      // al recibir OK del api continuar al siguiente step
      setSteps({ ...steps, otp: true });
    } catch (error) {
      setLoading(false);
      const errorMessage =
        error.response?.data?.error ||
        error?.message ||
        "Error al verificar código";
      enqueueSnackbar(errorMessage, { variant: "error" });
    }
  };

  if (!steps.credentials || steps.otp) return null;

  const correo = form.getValues("correo");
  const telefono = form.getValues("telefono");

  return (
    <div className="flex flex-col items-center text-center space-y-5">
      <div className="w-full rounded-xl bg-slate-50 border border-slate-200/80 px-4 py-3 text-left">
        <p className="text-xs sm:text-sm text-[var(--adamia-text-secondary)] leading-relaxed">
          Enviamos un código de 6 dígitos a{" "}
          <span className="font-semibold text-[var(--adamia-text-primary)] break-all">
            {correo}
          </span>{" "}
          y al teléfono{" "}
          <span className="font-semibold text-[var(--adamia-text-primary)]">
            {telefono}
          </span>
          .
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Si no lo ves en tu bandeja principal, revisa spam o correo no deseado.
        </p>
      </div>

      <div className="w-full flex justify-center py-1">
        <InputOTP
          maxLength={6}
          value={code}
          onChange={(value) => setCode(value)}
        >
          <InputOTPGroup className="gap-1.5 sm:gap-2">
            {[0, 1, 2, 3, 4, 5].map((slotIndex) => (
              <InputOTPSlot
                key={slotIndex}
                index={slotIndex}
                className="h-12 w-11 sm:h-12 sm:w-12 rounded-xl border border-slate-200 text-lg font-semibold text-[var(--adamia-text-primary)] shadow-none first:rounded-xl last:rounded-xl"
              />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>

      <div className="w-full space-y-2 pt-1">
        <Button
          type="button"
          className="w-full h-12 rounded-xl text-base font-semibold cursor-pointer text-white shadow-md shadow-blue-500/20 bg-gradient-to-r from-[var(--adamia-blue)] to-[var(--adamia-purple)] hover:opacity-95 active:scale-[0.99] transition-all"
          loading={loading}
          onClick={checkSecondStep}
        >
          Verificar código
        </Button>

        <Button
          type="button"
          variant="ghost"
          disabled={loading}
          onClick={() => {
            setCode("");
            setSteps({ ...steps, credentials: false });
          }}
          className="w-full h-10 text-sm font-medium text-[var(--adamia-text-secondary)] hover:text-[var(--adamia-blue)] hover:bg-[var(--adamia-blue)]/5 rounded-xl"
        >
          Cambiar correo o teléfono
        </Button>
      </div>
    </div>
  );
}
