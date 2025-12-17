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
import { CheckCircle } from "lucide-react";

export default function OTPStep({ form, steps, setSteps }) {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = React.useState(false);
  const [code, setCode] = React.useState("");

  const checkSecondStep = async () => {
    //verificar codigo otp
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
      setLoading(false);
      //al recibir OK del api coninuar al siguiente step
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

  if (!steps.credentials) return null;

  return (
    <section className="flex flex-col justify-center gap-4">
      <div className="flex items-center gap-2">
        <p className="py-1 text-sm text-slate-700 font-light">
          2. Ingresar Código de verificación enviado a{" "}
          <span className="font-bold">
            {form.getValues("correo")} y {form.getValues("telefono")}
          </span>
        </p>
        <span>{steps.otp && <CheckCircle />}</span>
      </div>
      {!steps.otp && (
        <div className="flex flex-col items-center justify-center">
          <p className="py-1 text-sm text-slate-700 font-light mb-5">
            Revisa tu spam o correo no deseado en caso de no verlo en bandeja de
            entrada
          </p>
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
          <Button
            type="button"
            className="bg-slate-700 w-full mt-10"
            loading={loading}
            onClick={() => checkSecondStep()}
          >
            Verificar Código
          </Button>
        </div>
      )}
    </section>
  );
}
