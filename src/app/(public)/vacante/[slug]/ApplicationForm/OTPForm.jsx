"use client";
import React from "react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { enqueueSnackbar } from "notistack";
import axios from "axios";

export default function OTPForm({ onSubmit, form }) {
  const [loading, setLoading] = React.useState(false);
  const [code, setCode] = React.useState("");

  const verifyOTP = async () => {
    try {
      setLoading(true);
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/otp/verify`,
        { telefono: form.getValues("telefono"), code }
      );
      enqueueSnackbar(
        response?.data?.message || "Código de verificación aceptado",
        {
          variant: "success",
        }
      );
      onSubmit(form.getValues());
      setLoading(false);
    } catch (error) {
      setLoading(false);
      const errorMessage =
        error.response?.data?.error ||
        error?.message ||
        "Error al verificar código";
      enqueueSnackbar(errorMessage, { variant: "error" });
    }
  };

  return (
    <section className="flex flex-col justify-center gap-4">
      <h4>
        Se envío un mensaje de texto con un código de verificación a tu telefono{" "}
        <span className="font-bold">({form.getValues("telefono")})</span>,
        ingresa el codigo para continuar con tu solicitud
      </h4>
      <div className="flex justify-center">
        <InputOTP maxLength={6} onChange={(value) => setCode(value)}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </div>

      <Button
        type="button"
        className="bg-slate-700 w-full mt-10"
        loading={loading}
        onClick={() => verifyOTP()}
      >
        Verificar Código
      </Button>
    </section>
  );
}
