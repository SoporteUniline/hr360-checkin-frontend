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

export default function OTPForm({ onSubmit, form, onCambiarTelefono }) {
  const [loading, setLoading] = React.useState(false);
  const [code, setCode] = React.useState("");
  const caja = React.useRef(null);
  // Al pedir el código, la verificación queda al final de un formulario largo: se lleva a la vista y se enfoca.
  React.useEffect(() => {
    const el = caja.current;
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    el.querySelector("input")?.focus({ preventScroll: true });
  }, []);

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
      // (24/11/2026, INC-REC-002) El backend entrega un token de un solo uso que /postulaciones/create exige.
      onSubmit(form.getValues(), response?.data?.verification_token || "");
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
    <section ref={caja} className="vc-otp" aria-labelledby="vc-otp-titulo">
      <h3 id="vc-otp-titulo">Verifica tu teléfono</h3>
      <p>
        Te enviamos un SMS con un código de 6 dígitos al{" "}
        <b>{form.getValues("telefono")}</b>. Ingresa el código para continuar con tu solicitud.
      </p>
      <div className="vc-otp-casillas">
        <InputOTP maxLength={6} onChange={(value) => setCode(value)} aria-label="Código de verificación">
          <InputOTPGroup>
            <InputOTPSlot index={0} className="h-12 w-11 bg-white text-lg font-semibold border-[#c9cde0]" />
            <InputOTPSlot index={1} className="h-12 w-11 bg-white text-lg font-semibold border-[#c9cde0]" />
            <InputOTPSlot index={2} className="h-12 w-11 bg-white text-lg font-semibold border-[#c9cde0]" />
            <InputOTPSlot index={3} className="h-12 w-11 bg-white text-lg font-semibold border-[#c9cde0]" />
            <InputOTPSlot index={4} className="h-12 w-11 bg-white text-lg font-semibold border-[#c9cde0]" />
            <InputOTPSlot index={5} className="h-12 w-11 bg-white text-lg font-semibold border-[#c9cde0]" />
          </InputOTPGroup>
        </InputOTP>
      </div>

      <Button
        type="button"
        className="vc-btn-enviar"
        loading={loading}
        disabled={code.length < 6}
        onClick={() => verifyOTP()}
      >
        Verificar código
      </Button>
      {onCambiarTelefono ? (
        <button type="button" className="vc-texto-btn" onClick={onCambiarTelefono} disabled={loading}>
          Cambiar teléfono
        </button>
      ) : null}
    </section>
  );
}
