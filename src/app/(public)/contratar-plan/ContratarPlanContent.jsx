"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import axios from "@/lib/axios";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useSearchParams } from "next/navigation";

const COUNTRY_CODES = [
  { code: "+52", label: "MX (+52)" },
  { code: "+1", label: "US/CA (+1)" },
  { code: "+57", label: "CO (+57)" },
  { code: "+54", label: "AR (+54)" },
  { code: "+56", label: "CL (+56)" },
  { code: "+51", label: "PE (+51)" },
  { code: "+34", label: "ES (+34)" },
];

const COSTO_POR_USUARIO_DEFAULT = 60;

function getLabelFromRow(row, fallback) {
  return (
    row?.nombre || row?.descripcion || row?.titulo || row?.tipo || fallback
  );
}

function formatCurrencyMXN(value) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(value);
}

function onlyPhoneDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeCountryCode(value) {
  const digits = String(value || "").replace(/[^\d+]/g, "");
  if (!digits) return "+52";
  if (digits.startsWith("+")) return digits;
  return `+${digits}`;
}

function buildInternationalPhone(countryCode, phone) {
  const cc = normalizeCountryCode(countryCode);
  const phoneDigits = onlyPhoneDigits(phone);
  return `${cc}${phoneDigits}`;
}

export default function ContratarPlanContent() {
  const initialForm = {
    nombre_cliente: "",
    correo: "",
    codigo_pais: "+52",
    telefono: "",
    empresa_nombre: "",
    rfc: "",
    empleados: "15",
    meses_contratados: "1",
    metodo_pago_id: "",
    notas: "",
    codigo_cupon: "",
    demo: "No",
    tipo_contratacion: "Normal",
    contrasenia: "",
    confirmar_contrasenia: "",
  };


  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [stripeLink, setStripeLink] = useState("");
  const [cuponValidando, setCuponValidando] = useState(false);
  const [cuponAplicado, setCuponAplicado] = useState(null);
  const [cuponMensaje, setCuponMensaje] = useState("");
  const [mostrarContrasenia, setMostrarContrasenia] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successModalData, setSuccessModalData] = useState({
    folio: "",
    correo: "",
    contrasenia: "",
  });

  const searchParams = useSearchParams();

  useEffect(() => {
    const status = searchParams.get("status");
    const contrato = searchParams.get("contrato");

    if (status === "success") {
      setSubmitSuccess(
        `¡Pago procesado con éxito para el folio ${contrato}! En unos minutos tu cuenta estará activa.`,
      );
    } else if (status === "cancelled") {
      setSubmitError(
        "El pago fue cancelado. Tu registro está guardado pero la contratación no se ha activado.",
      );
    }
  }, [searchParams]);

  const [form, setForm] = useState(initialForm);
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [phoneVerificationToken, setPhoneVerificationToken] = useState("");
  const [otpMessage, setOtpMessage] = useState("");
  const [otpCountdown, setOtpCountdown] = useState(0);

  useEffect(() => {
    if (otpCountdown <= 0) return undefined;
    const interval = window.setInterval(() => {
      setOtpCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [otpCountdown]);


  const estimado = useMemo(() => {
    const employees = Number(form.empleados);

    if (!Number.isFinite(employees) || employees < 1) return null;

    const monthlyNormal = employees * COSTO_POR_USUARIO_DEFAULT;
    const monthlyPromo = cuponAplicado
      ? employees * cuponAplicado.precio_por_empleado
      : null;

    return {
      employees,
      monthlyNormal,
      monthlyPromo,
    };
  }, [form.empleados, cuponAplicado]);

  const onChange = (event) => {
    const { name, value } = event.target;

    if (name === "telefono" || name === "codigo_pais") {
      setOtpSent(false);
      setOtpVerified(false);
      setPhoneVerificationToken("");
      setOtpCode("");
      setOtpMessage("");
      setOtpCountdown(0);
    }
    if (name === "codigo_cupon") {
      setCuponAplicado(null);
      setCuponMensaje("");
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const fullPhone = useMemo(
    () => buildInternationalPhone(form.codigo_pais, form.telefono),
    [form.codigo_pais, form.telefono],
  );

  const sendOtpByWhatsApp = async () => {
    setSubmitError("");
    setSubmitSuccess("");
    setOtpMessage("");
    const phoneDigits = onlyPhoneDigits(form.telefono);
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      setSubmitError("Ingresa un teléfono válido para enviar el código.");
      return;
    }

    try {
      setOtpSending(true);
      const response = await axios.post("/otp/send", {
        telefono: fullPhone,
        canal: "whatsapp",
      });
      setOtpSent(true);
      setOtpVerified(false);
      setPhoneVerificationToken("");
      setOtpCountdown(45);
      setOtpMessage(
        response?.data?.message ||
          "Código enviado por WhatsApp. Revisa tu chat para continuar.",
      );
    } catch (error) {
      setSubmitError(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          "No fue posible enviar el código por WhatsApp.",
      );
    } finally {
      setOtpSending(false);
    }
  };

  const verifyOtp = async () => {
    setSubmitError("");
    setSubmitSuccess("");
    setOtpMessage("");
    if (String(otpCode || "").trim().length !== 6) {
      setSubmitError("Ingresa los 6 dígitos del código de verificación.");
      return;
    }

    try {
      setOtpVerifying(true);
      const response = await axios.post("/otp/verify", {
        telefono: fullPhone,
        code: otpCode,
        canal: "whatsapp",
      });
      const verificationToken = response?.data?.data?.verification_token;
      if (!verificationToken) {
        setOtpVerified(false);
        setPhoneVerificationToken("");
        setSubmitError(
          "No se recibió token de verificación. Intenta nuevamente.",
        );
        return;
      }
      setOtpVerified(true);
      setPhoneVerificationToken(verificationToken);
      setOtpMessage(
        response?.data?.message ||
          "Teléfono verificado correctamente por WhatsApp.",
      );
    } catch (error) {
      setOtpVerified(false);
      setPhoneVerificationToken("");
      setSubmitError(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          "El código no es válido o expiró.",
      );
    } finally {
      setOtpVerifying(false);
    }
  };

  const validarCupon = async () => {
    const codigo = String(form.codigo_cupon || "").trim();

    setCuponMensaje("");
    setCuponAplicado(null);

    if (!codigo) {
      setCuponMensaje("Ingresa un código de cupón.");
      return;
    }

    try {
      setCuponValidando(true);

      const response = await axios.post(
        "/checador/contrataciones/validar-cupon",
        { codigo },
      );

      const data = response?.data;

      if (!data?.valido) {
        setCuponMensaje("El cupón no es válido.");
        return;
      }

      setForm((prev) => ({
        ...prev,
        codigo_cupon: data.codigo || codigo.toUpperCase(),
      }));

      setCuponAplicado({
        codigo: data.codigo,
        precio_por_empleado: Number(data.precio_por_empleado),
        meses_duracion: Number(data.meses_duracion),
      });

      setCuponMensaje(
        `Cupón aplicado: ${formatCurrencyMXN(
          Number(data.precio_por_empleado),
        )} por empleado durante ${Number(data.meses_duracion)} ${
          Number(data.meses_duracion) === 1 ? "mes" : "meses"
        }.`,
      );
    } catch (error) {
      setCuponMensaje(
        error?.response?.data?.message || "No fue posible validar el cupón.",
      );
    } finally {
      setCuponValidando(false);
    }
  };

  const changeEmployees = (delta) => {
    const current = Number(form.empleados) || 1;
    const next = Math.max(1, current + delta);
    setForm((prev) => ({ ...prev, empleados: String(next) }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");
    setSubmitSuccess("");
    setStripeLink("");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
    const phoneRegex = /^\+[0-9]{8,20}$/;
    const rfcRegex = /^([A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3})$/i;

    if (!form.nombre_cliente || !form.correo || !form.telefono) {
      setSubmitError("Completa nombre, correo y teléfono.");
      return;
    }
    if (!emailRegex.test(form.correo.trim())) {
      setSubmitError("El correo no tiene un formato válido.");
      return;
    }
    if (!phoneRegex.test(fullPhone.trim())) {
      setSubmitError(
        "El teléfono con código de país no tiene un formato válido.",
      );
      return;
    }
    if (!otpVerified || !phoneVerificationToken) {
      setSubmitError(
        "Debes verificar tu identidad por WhatsApp antes de registrar la contratación.",
      );
      return;
    }
    if (form.rfc && !rfcRegex.test(form.rfc.trim().toUpperCase())) {
      setSubmitError("El RFC no tiene un formato válido.");
      return;
    }
    if (!form.contrasenia || form.contrasenia.length < 8) {
      setSubmitError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (form.contrasenia !== form.confirmar_contrasenia) {
      setSubmitError("Las contraseñas no coinciden.");
      return;
    }
    if (!form.empleados || Number(form.empleados) < 1) {
      setSubmitError("Ingresa un número de empleados válido.");
      return;
    }

    try {
      setSubmitting(true);
      const credentialsToShow = {
        correo: form.correo,
        contrasenia: form.contrasenia,
      };
      const payload = {
        ...form,
        codigo_cupon: cuponAplicado ? cuponAplicado.codigo : null,
        telefono: fullPhone,
        telefono_verificacion_token: phoneVerificationToken,
        empleados: Number(form.empleados),
        tipo_plan_id: null,
        meses_contratados: 1,
        metodo_pago_id: null,
        precio_por_mes: estimado?.monthlyNormal ?? null,
        precio_empleado_extra: COSTO_POR_USUARIO_DEFAULT,
      };
      const response = await axios.post(
        "/checador/contrataciones/publica",
        payload,
      );
      const data = response?.data?.data;
      const folio = data?.contrato_id ?? "";
      const stripeUrl = data?.enlace_pago_stripe;

      if (stripeUrl) {
        window.location.href = stripeUrl;
        return;
      }

      setSubmitSuccess(`¡Registro exitoso! Folio ${folio}.`);
      setSuccessModalData({
        folio,
        correo: credentialsToShow.correo,
        contrasenia: credentialsToShow.contrasenia,
      });
      setSuccessModalOpen(true);
      setForm(initialForm);
      setCuponAplicado(null);
      setCuponMensaje("");
      setOtpCode("");
      setOtpSent(false);
      setOtpVerified(false);
      setPhoneVerificationToken("");
      setOtpMessage("");
      setOtpCountdown(0);
    } catch (error) {
      setSubmitError(
        error?.response?.data?.message ||
          "No fue posible registrar la contratación.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[var(--adamia-bg-light)] to-white text-[var(--adamia-text-primary)]">
      <Dialog open={successModalOpen} onOpenChange={setSuccessModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-[var(--adamia-blue)]">
              Registro completado correctamente
            </DialogTitle>
            <DialogDescription className="text-sm text-[var(--adamia-text-secondary)]">
              Ya puedes iniciar sesión con esta cuenta.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 rounded-xl bg-[var(--adamia-bg-light)] p-4 text-sm">
            <p>
              <strong>Folio de contratación:</strong> {successModalData.folio}
            </p>
            <p>
              <strong>Ir a:</strong> <span className="font-mono">/login</span>
            </p>
            <p>
              <strong>Correo:</strong> {successModalData.correo}
            </p>
            <p>
              <strong>Contraseña:</strong> {successModalData.contrasenia}
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Link
              href="/login"
              className="rounded-xl bg-[var(--adamia-blue)] px-4 py-2 text-sm font-bold text-white"
              onClick={() => setSuccessModalOpen(false)}
            >
              Ir a iniciar sesión
            </Link>
          </div>
        </DialogContent>
      </Dialog>

      <section className="bg-gradient-to-r from-[var(--adamia-blue)] to-[var(--adamia-purple)] px-6 py-12 text-center text-white">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-3xl font-black md:text-5xl">
            Activa ADAMIA para tu empresa
          </h1>
          <p className="mx-auto mt-3 max-w-3xl text-sm text-white/90 md:text-base">
            Comienza con los empleados que tienes hoy. La facturación se ajusta
            según los empleados activos de tu empresa.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6">
        <div className="rounded-2xl border border-[var(--adamia-blue)]/15 bg-white p-4 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-black md:text-xl">
                ¿Con cuántos empleados comenzarás?
              </h2>
              <p className="text-sm text-[var(--adamia-text-secondary)]">
                Este número estima tu primer cobro. Después, la facturación se
                ajusta según los empleados activos de tu empresa.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => changeEmployees(-1)}
                className="h-11 w-11 rounded-xl bg-[var(--adamia-blue)] text-2xl font-bold text-white"
              >
                -
              </button>
              <input
                name="empleados"
                type="number"
                min={1}
                value={form.empleados}
                onChange={onChange}
                className="h-12 w-28 rounded-xl border-2 border-[var(--adamia-blue)] px-3 text-center text-2xl font-black text-[var(--adamia-blue)] outline-none"
              />
              <button
                type="button"
                onClick={() => changeEmployees(1)}
                className="h-11 w-11 rounded-xl bg-[var(--adamia-blue)] text-2xl font-bold text-white"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-[var(--adamia-blue)]/20 bg-white p-5 shadow-sm md:p-6">
          <div className="grid gap-5 md:grid-cols-[0.8fr_1.2fr] md:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--adamia-blue)]">
                Facturación mensual
              </p>
              <p className="mt-2 text-3xl font-black text-[var(--adamia-blue)]">
                {formatCurrencyMXN(COSTO_POR_USUARIO_DEFAULT)}
                <span className="text-sm font-semibold text-[var(--adamia-text-secondary)]">
                  {" "}
                  por empleado / mes
                </span>
              </p>
            </div>

            <div className="text-sm text-[var(--adamia-text-secondary)]">
              <p>
                Pagas según los empleados activos de tu empresa. Si agregas
                empleados durante el mes, se calcula el ajuste proporcional
                correspondiente.
              </p>
              <p className="mt-2 font-semibold text-[var(--adamia-text-primary)]">
                Con {Number(form.empleados || 0)} empleados, tu mensualidad
                normal estimada es{" "}
                {estimado ? formatCurrencyMXN(estimado.monthlyNormal) : "—"}.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
          <form
            onSubmit={onSubmit}
            className="rounded-2xl border border-[var(--adamia-blue)]/15 bg-white p-5 shadow-sm md:p-7"
          >
            <h2 className="text-2xl font-black">Crea tu cuenta</h2>
            <p className="mt-1 text-sm text-[var(--adamia-text-secondary)]">
              Ingresa tus datos para comenzar con ADAMIA.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field
                label="Nombre completo"
                name="nombre_cliente"
                value={form.nombre_cliente}
                onChange={onChange}
                placeholder="Ingresa tu nombre completo"
                autoComplete="name"
                required
              />
              <Field
                label="Empresa / razón social"
                name="empresa_nombre"
                value={form.empresa_nombre}
                onChange={onChange}
                placeholder="Ingresa el nombre de tu empresa"
                autoComplete="organization"
              />
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Teléfono (verificación por WhatsApp)
                </label>
                <div className="flex gap-2">
                  <select
                    name="codigo_pais"
                    value={form.codigo_pais}
                    onChange={onChange}
                    className="w-36 rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none ring-[var(--adamia-blue)]/20 focus:ring-2"
                    aria-label="Código de país"
                  >
                    {COUNTRY_CODES.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.label}
                      </option>
                    ))}
                  </select>
                  <input
                    name="telefono"
                    value={form.telefono}
                    onChange={onChange}
                    required
                    inputMode="tel"
                    autoComplete="tel-national"
                    placeholder="Ingresa tu número de WhatsApp"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 outline-none ring-[var(--adamia-blue)]/20 focus:ring-2"
                  />
                </div>
                <p className="mt-2 text-xs text-[var(--adamia-text-secondary)]">
                  Número internacional: <strong>{fullPhone || "—"}</strong>
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={sendOtpByWhatsApp}
                    disabled={otpSending || otpCountdown > 0}
                    className="rounded-xl border border-[var(--adamia-blue)]/25 bg-white px-4 py-2 text-xs font-bold text-[var(--adamia-blue)] disabled:opacity-60"
                  >
                    {otpSending
                      ? "Enviando..."
                      : otpCountdown > 0
                      ? `Reenviar en ${otpCountdown}s`
                      : otpSent
                      ? "Reenviar código WhatsApp"
                      : "Enviar código por WhatsApp"}
                  </button>
                  <span
                    className={`inline-flex items-center rounded-xl px-3 py-2 text-xs font-semibold ${
                      otpVerified
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {otpVerified
                      ? "Teléfono verificado"
                      : "Pendiente de verificar"}
                  </span>
                </div>

                {otpSent ? (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-[var(--adamia-bg-light)] p-3">
                    <p className="mb-2 text-xs font-semibold text-[var(--adamia-text-secondary)]">
                      Ingresa el código de 6 dígitos enviado por WhatsApp
                    </p>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <InputOTP
                        maxLength={6}
                        value={otpCode}
                        onChange={setOtpCode}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                      <button
                        type="button"
                        onClick={verifyOtp}
                        disabled={otpVerifying || otpCode.length !== 6}
                        className="rounded-xl bg-[var(--adamia-blue)] px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
                      >
                        {otpVerifying ? "Validando..." : "Validar código"}
                      </button>
                    </div>
                  </div>
                ) : null}

                {otpMessage ? (
                  <p className="mt-2 text-xs font-semibold text-[var(--adamia-blue)]">
                    {otpMessage}
                  </p>
                ) : null}
              </div>
              <Field
                label="Correo electrónico"
                name="correo"
                type="email"
                value={form.correo}
                onChange={onChange}
                placeholder="Ingresa tu correo electrónico"
                autoComplete="email"
                required
              />
              <div className="md:col-span-2">
                <Field
                  label="RFC (opcional)"
                  name="rfc"
                  value={form.rfc}
                  onChange={onChange}
                  placeholder="Ingresa el RFC de tu empresa"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <PasswordField
                label="Contraseña"
                name="contrasenia"
                value={form.contrasenia}
                onChange={onChange}
                visible={mostrarContrasenia}
                onToggle={() => setMostrarContrasenia((prev) => !prev)}
                placeholder="Al menos 8 caracteres"
                autoComplete="new-password"
                required
              />
              <PasswordField
                label="Confirmar contraseña"
                name="confirmar_contrasenia"
                value={form.confirmar_contrasenia}
                onChange={onChange}
                visible={mostrarConfirmacion}
                onToggle={() => setMostrarConfirmacion((prev) => !prev)}
                placeholder="Vuelve a ingresar tu contraseña"
                autoComplete="new-password"
                required
              />

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold">
                  Código de cupón (opcional)
                </label>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    name="codigo_cupon"
                    value={form.codigo_cupon}
                    onChange={onChange}
                    placeholder="Ingresa tu código de cupón"
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 outline-none ring-[var(--adamia-blue)]/20 focus:ring-2"
                  />

                  <button
                    type="button"
                    onClick={validarCupon}
                    disabled={cuponValidando || !form.codigo_cupon.trim()}
                    className="rounded-xl border border-[var(--adamia-blue)]/30 bg-white px-5 py-2.5 text-sm font-bold text-[var(--adamia-blue)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {cuponValidando ? "Validando..." : "Aplicar cupón"}
                  </button>
                </div>

                {cuponMensaje ? (
                  <p
                    className={`mt-2 rounded-lg px-3 py-2 text-sm font-semibold ${
                      cuponAplicado
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {cuponMensaje}
                  </p>
                ) : null}

                {cuponAplicado ? (
                  <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-sm font-black text-emerald-800">
                      Promoción aplicada
                    </p>
                    <p className="mt-1 text-2xl font-black text-emerald-700">
                      {formatCurrencyMXN(cuponAplicado.precio_por_empleado)}
                      <span className="text-sm font-semibold">
                        {" "}
                        / empleado / mes
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-emerald-700">
                      Durante {cuponAplicado.meses_duracion}{" "}
                      {cuponAplicado.meses_duracion === 1 ? "mes" : "meses"}.
                      Después se aplicará el precio normal de tu contratación.
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold">
                  Notas (opcional)
                </label>
                <textarea
                  name="notas"
                  value={form.notas}
                  onChange={onChange}
                  rows={3}
                  placeholder="Agrega información adicional"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 outline-none ring-[var(--adamia-blue)]/20 focus:ring-2"
                />
              </div>
            </div>

            {submitError ? (
              <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                {submitError}
              </p>
            ) : null}
            {submitSuccess ? (
              <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                {submitSuccess}
              </p>
            ) : null}

            {stripeLink ? (
              <a
                href={stripeLink}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white"
              >
                Ir a pagar con Stripe
              </a>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-[var(--adamia-blue)] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {submitting ? "Procesando..." : "Continuar al pago"}
              </button>
              <Link
                href="/cotiza"
                className="rounded-xl border border-[var(--adamia-blue)]/30 px-5 py-2.5 text-sm font-bold text-[var(--adamia-blue)]"
              >
                Ver tabla de precios
              </Link>
            </div>
          </form>

          <aside className="space-y-5">
            <article className="rounded-2xl border border-[var(--adamia-blue)]/20 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--adamia-blue)]">
                Cobro por uso
              </p>
              <h3 className="mt-1 text-xl font-black">
                Resumen mensual estimado
              </h3>

              {estimado ? (
                <div className="mt-3 space-y-2 text-sm">
                  <SummaryRow
                    label="Empleados iniciales"
                    value={String(estimado.employees)}
                  />
                  <SummaryRow
                    label="Precio normal por empleado"
                    value={formatCurrencyMXN(COSTO_POR_USUARIO_DEFAULT)}
                  />
                  <SummaryRow
                    label="Mensualidad normal estimada"
                    value={formatCurrencyMXN(estimado.monthlyNormal)}
                    highlight={!cuponAplicado}
                  />

                  {cuponAplicado ? (
                    <div className="mt-4 space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="font-black text-emerald-800">
                        Cupón {cuponAplicado.codigo}
                      </p>

                      <SummaryRow
                        label="Precio promocional por empleado"
                        value={formatCurrencyMXN(
                          cuponAplicado.precio_por_empleado,
                        )}
                      />

                      <SummaryRow
                        label="Mensualidad promocional estimada"
                        value={formatCurrencyMXN(estimado.monthlyPromo)}
                        highlight
                      />

                      <SummaryRow
                        label="Duración"
                        value={`${cuponAplicado.meses_duracion} ${
                          cuponAplicado.meses_duracion === 1 ? "mes" : "meses"
                        }`}
                      />

                      <p className="pt-2 text-xs font-semibold text-emerald-800">
                        Al terminar la promoción se aplicará el precio normal
                        por empleado activo.
                      </p>
                    </div>
                  ) : null}

                  <p className="pt-3 text-xs text-[var(--adamia-text-secondary)]">
                    El importe puede ajustarse si cambia la cantidad de
                    empleados activos durante el periodo.
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-[var(--adamia-text-secondary)]">
                  Indica con cuántos empleados comenzarás.
                </p>
              )}
            </article>

            <article className="rounded-2xl border border-[var(--adamia-blue)]/20 bg-white p-5 shadow-sm">
              <h3 className="text-xl font-black">Beneficios del software</h3>
              <div className="mt-3 space-y-2 text-sm text-[var(--adamia-text-secondary)]">
                <p>• Reloj checador con evidencia y control en tiempo real.</p>
                <p>• Gestión de contratos, permisos y vacaciones.</p>
                <p>• Reportes para operación y nómina.</p>
                <p>• Plataforma web empresarial con soporte continuo.</p>
              </div>
            </article>

          </aside>
        </div>
      </section>
    </main>
  );
}

function Field({ label, value, ...props }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold">{label}</label>
      <input
        {...props}
        value={value ?? ""}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 outline-none ring-[var(--adamia-blue)]/20 focus:ring-2"
      />
    </div>
  );
}

function PasswordField({ label, visible, onToggle, value, ...props }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold">{label}</label>
      <div className="relative">
        <input
          {...props}
          type={visible ? "text" : "password"}
          value={value ?? ""}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 pr-20 outline-none ring-[var(--adamia-blue)]/20 focus:ring-2"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute inset-y-0 right-0 px-4 text-xs font-bold text-[var(--adamia-blue)]"
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        >
          {visible ? "Ocultar" : "Mostrar"}
        </button>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, highlight = false }) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg px-3 py-2 ${
        highlight ? "bg-[var(--adamia-blue)]/10" : "bg-[var(--adamia-bg-light)]"
      }`}
    >
      <span>{label}</span>
      <strong className={highlight ? "text-[var(--adamia-blue)]" : ""}>
        {value}
      </strong>
    </div>
  );
}
