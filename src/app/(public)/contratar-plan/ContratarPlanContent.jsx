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

function getPlanId(row) {
  return row?.id ?? row?.id_tipo_plan ?? row?.tipo_plan_id ?? null;
}

function getLabelFromRow(row, fallback) {
  return (
    row?.nombre ||
    row?.descripcion ||
    row?.titulo ||
    row?.plan ||
    row?.tipo ||
    fallback
  );
}

function parseFlexibleNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[^\d,.-]/g, "");
  if (!cleaned) return null;
  if (cleaned.includes(",") && cleaned.includes(".")) {
    const normalized = cleaned.replace(/,/g, "");
    const n = Number.parseFloat(normalized);
    return Number.isFinite(n) ? n : null;
  }
  const normalized =
    cleaned.includes(",") && !cleaned.includes(".")
      ? cleaned.replace(",", ".")
      : cleaned;
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

function buildDescuentosMap(rows = []) {
  const defaults = { 1: 0, 6: 10, 12: 20 };
  if (!rows.length) return defaults;

  const result = { ...defaults };
  rows.forEach((row) => {
    const meses = Number(row?.meses);
    const descuento = parseFlexibleNumber(
      row?.descuento_porcentaje ?? row?.descuento ?? null,
    );
    if ([1, 6, 12].includes(meses) && Number.isFinite(descuento)) {
      result[meses] = descuento;
    }
  });
  return result;
}

function getPriceFromPlan(row, months, employees) {
  const monthlyCandidates = [
    row?.precio_mensual,
    row?.precio,
    row?.costo_mensual,
    row?.monto_mensual,
  ];
  for (const value of monthlyCandidates) {
    const n = parseFlexibleNumber(value);
    if (Number.isFinite(n) && n > 0) return n;
  }

  const byMonths = {
    1: [row?.precio_1_mes, row?.precio_1mes, row?.monto_1_mes, row?.mes_1],
    6: [
      row?.precio_6_meses,
      row?.precio_6meses,
      row?.monto_6_meses,
      row?.mes_6,
    ],
    12: [
      row?.precio_12_meses,
      row?.precio_12meses,
      row?.monto_12_meses,
      row?.mes_12,
    ],
  };
  for (const value of byMonths[months] || []) {
    const n = parseFlexibleNumber(value);
    if (Number.isFinite(n) && n > 0) return n;
  }

  const unit =
    row?.precio_por_empleado ??
    row?.costo_por_empleado ??
    row?.precio_unitario ??
    null;
  const unitNum = parseFlexibleNumber(unit);
  const employeesNum = Number(employees);
  if (
    Number.isFinite(unitNum) &&
    unitNum > 0 &&
    Number.isFinite(employeesNum) &&
    employeesNum > 0
  ) {
    return unitNum * employeesNum;
  }

  for (const [key, rawValue] of Object.entries(row || {})) {
    const keyLc = key.toLowerCase();
    const looksLikePrice =
      /(precio|costo|monto|mensual|tarifa)/.test(keyLc) &&
      !/(id|descuento|porcentaje|max|min|usuarios|empleados|meses|anio|año)/.test(
        keyLc,
      );
    if (!looksLikePrice) continue;
    const n = parseFlexibleNumber(rawValue);
    if (Number.isFinite(n) && n > 0) return n;
  }

  return null;
}

function getMaxUsersFromPlan(row) {
  const candidates = [
    row?.usuarios_max,
    row?.empleados_max,
    row?.max_usuarios,
    row?.empleados,
  ];
  for (const value of candidates) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return Number.POSITIVE_INFINITY;
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

function getPlanEmployeesRange(row, allPlans) {
  const currentMax = getMaxUsersFromPlan(row);
  if (!Number.isFinite(currentMax)) return "Plan sin límite definido";

  const sorted = [...allPlans].sort(
    (a, b) => getMaxUsersFromPlan(a) - getMaxUsersFromPlan(b),
  );
  const currentIndex = sorted.findIndex(
    (plan) => Number(getPlanId(plan)) === Number(getPlanId(row)),
  );
  if (currentIndex === -1) return `Hasta ${currentMax} empleados`;

  const prev = sorted[currentIndex - 1];
  const prevMax = prev ? getMaxUsersFromPlan(prev) : 0;
  const min = prevMax + 1;

  if (currentMax >= 99999 || currentMax === Number.POSITIVE_INFINITY)
    return `${min}+ empleados`;
  if (min === currentMax) return `${min} empleado${min > 1 ? "s" : ""}`;
  return `${min} - ${currentMax} empleados`;
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
    tipo_plan_id: "",
    meses_contratados: "1",
    metodo_pago_id: "",
    notas: "",
    demo: "Si",
    tipo_contratacion: "Prueba",
    contrasenia: "",
    confirmar_contrasenia: "",
  };

  const [catalogos, setCatalogos] = useState({
    tipo_planes: [],
    metodos_pago: [],
    planes_duracion: [],
  });
  const [descuentos, setDescuentos] = useState({ 1: 0, 6: 10, 12: 20 });
  const [loadingCatalogos, setLoadingCatalogos] = useState(true);
  const [errorCatalogos, setErrorCatalogos] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [stripeLink, setStripeLink] = useState("");
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successModalData, setSuccessModalData] = useState({
    folio: "",
    correo: "",
    contrasenia: "",
    esPrueba: false,
    fechaFin: "",
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
        "El pago fue cancelado. Tu registro está guardado pero el plan no se ha activado.",
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

  useEffect(() => {
    let mounted = true;
    const loadCatalogos = async () => {
      setLoadingCatalogos(true);
      setErrorCatalogos("");
      try {
        const response = await axios.get("/checador/contrataciones/catalogos");
        if (!mounted) return;
        setCatalogos({
          tipo_planes: response?.data?.tipo_planes ?? [],
          metodos_pago: response?.data?.metodos_pago ?? [],
          planes_duracion: response?.data?.planes_duracion ?? [],
        });
        setDescuentos(buildDescuentosMap(response?.data?.planes_duracion ?? []));
      } catch (_error) {
        if (!mounted) return;
        setErrorCatalogos(
          "No fue posible cargar los catálogos. Intenta nuevamente.",
        );
      } finally {
        if (mounted) setLoadingCatalogos(false);
      }
    };

    loadCatalogos();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const employees = Number(form.empleados);
    if (
      !Number.isFinite(employees) ||
      employees < 1 ||
      !catalogos.tipo_planes.length
    )
      return;

    const sorted = [...catalogos.tipo_planes].sort(
      (a, b) => getMaxUsersFromPlan(a) - getMaxUsersFromPlan(b),
    );
    const matched =
      sorted.find((plan) => employees <= getMaxUsersFromPlan(plan)) ||
      sorted[sorted.length - 1];
    const matchedId = getPlanId(matched);
    if (matchedId !== null && String(form.tipo_plan_id) !== String(matchedId)) {
      setForm((prev) => ({ ...prev, tipo_plan_id: String(matchedId) }));
    }
  }, [form.empleados, catalogos.tipo_planes, form.tipo_plan_id]);

  const selectedPlan = useMemo(
    () =>
      catalogos.tipo_planes.find(
        (plan) => Number(getPlanId(plan)) === Number(form.tipo_plan_id),
      ) || null,
    [catalogos.tipo_planes, form.tipo_plan_id],
  );

  const estimado = useMemo(() => {
    const months = Number(form.meses_contratados);
    const employees = Number(form.empleados);
    const monthlyBase = getPriceFromPlan(selectedPlan, months, employees);
    if (!monthlyBase || ![1, 6, 12].includes(months)) return null;
    const descuento = descuentos[months] ?? 0;
    const subtotal = monthlyBase * months;
    const total = subtotal - subtotal * (descuento / 100);
    return {
      monthlyBase,
      monthlyFinal: total / months,
      subtotal,
      descuento,
      total,
    };
  }, [selectedPlan, form.meses_contratados, form.empleados, descuentos]);

  const planCards = useMemo(
    () => [
      {
        months: 1,
        title: "Mensual",
        badge: "Sin compromiso",
        discount: descuentos[1] ?? 0,
      },
      {
        months: 6,
        title: "Semestral",
        badge: "Más popular",
        discount: descuentos[6] ?? 0,
      },
      {
        months: 12,
        title: "Anual",
        badge: "Mejor ahorro",
        discount: descuentos[12] ?? 0,
      },
    ],
    [descuentos],
  );

  const onChange = (event) => {
    const { name, value } = event.target;
    if (name === "tipo_contratacion") {
      setForm((prev) => ({
        ...prev,
        tipo_contratacion: value,
        demo: value === "Prueba" ? "Si" : "No",
      }));
      return;
    }
    if (name === "telefono" || name === "codigo_pais") {
      setOtpSent(false);
      setOtpVerified(false);
      setPhoneVerificationToken("");
      setOtpCode("");
      setOtpMessage("");
      setOtpCountdown(0);
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

  const changeEmployees = (delta) => {
    const current = Number(form.empleados) || 1;
    const next = Math.max(1, current + delta);
    setForm((prev) => ({ ...prev, empleados: String(next) }));
  };

  const selectMonths = (months) => {
    setForm((prev) => ({ ...prev, meses_contratados: String(months) }));
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
      setSubmitError("El teléfono con código de país no tiene un formato válido.");
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
    if (!form.tipo_plan_id) {
      setSubmitError(
        "No fue posible inferir el plan. Ajusta el número de empleados.",
      );
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
        telefono: fullPhone,
        telefono_verificacion_token: phoneVerificationToken,
        empleados: Number(form.empleados),
        tipo_plan_id: Number(form.tipo_plan_id),
        meses_contratados: Number(form.meses_contratados),
        metodo_pago_id: form.metodo_pago_id
          ? Number(form.metodo_pago_id)
          : null,
        precio_por_mes: estimado?.monthlyBase ?? null,
      };
      const response = await axios.post(
        "/checador/contrataciones/publica",
        payload,
      );
      const data = response?.data?.data;
      const folio = data?.contrato_id ?? "";
      const esPrueba = data?.demo === "Si";
      const fechaFinPrueba = data?.fecha_fin ?? "";
      const stripeUrl = data?.enlace_pago_stripe;

      if (!esPrueba && stripeUrl) {
        window.location.href = stripeUrl;
        return;
      }

      setSubmitSuccess(
        `¡Registro exitoso! Folio ${folio}. Tu prueba de 7 días está activa.`,
      );
      setSuccessModalData({
        folio,
        correo: credentialsToShow.correo,
        contrasenia: credentialsToShow.contrasenia,
        esPrueba,
        fechaFin: fechaFinPrueba,
      });
      setSuccessModalOpen(true);
      setForm(initialForm);
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
            {successModalData.esPrueba ? (
              <p className="rounded-lg bg-[var(--adamia-blue)]/10 px-3 py-2 font-semibold text-[var(--adamia-blue)]">
                Tu prueba de 7 días está activa hasta{" "}
                {successModalData.fechaFin}.
              </p>
            ) : null}
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
            Selecciona el tamaño de tu equipo, elige modalidad y registra tu
            contratación.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6">
        <div className="rounded-2xl border border-[var(--adamia-blue)]/15 bg-white p-4 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-black md:text-xl">
                ¿Cuántos empleados tiene tu empresa?
              </h2>
              <p className="text-sm text-[var(--adamia-text-secondary)]">
                El plan se asigna automáticamente por rango de empleados.
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

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {planCards.map((card) => {
            const monthlyBase = getPriceFromPlan(
              selectedPlan,
              card.months,
              Number(form.empleados),
            );
            const subtotal = (monthlyBase || 0) * card.months;
            const total = subtotal - subtotal * (card.discount / 100);
            const monthlyFinal =
              monthlyBase && card.months ? total / card.months : null;
            const active = Number(form.meses_contratados) === card.months;
            return (
              <article
                key={card.months}
                className={`rounded-2xl border bg-white p-5 shadow-sm transition ${
                  active
                    ? "border-[var(--adamia-blue)] ring-2 ring-[var(--adamia-blue)]/20"
                    : "border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black">{card.title}</h3>
                  <span className="rounded-full bg-[var(--adamia-blue)]/10 px-3 py-1 text-xs font-bold text-[var(--adamia-blue)]">
                    {card.badge}
                  </span>
                </div>
                <p className="mt-2 text-xs font-bold uppercase tracking-wide text-[var(--adamia-text-secondary)]">
                  {card.discount}% de descuento
                </p>
                <p className="mt-4 text-3xl font-black text-[var(--adamia-blue)]">
                  {monthlyFinal ? formatCurrencyMXN(monthlyFinal) : "—"}
                  <span className="text-sm font-semibold text-[var(--adamia-text-secondary)]">
                    /mes
                  </span>
                </p>
                {monthlyBase && card.discount > 0 ? (
                  <p className="mt-1 text-xs text-[var(--adamia-text-secondary)]">
                    Precio mensual base: <strong>{formatCurrencyMXN(monthlyBase)}</strong>
                  </p>
                ) : null}
                <p className="mt-1 text-sm text-[var(--adamia-text-secondary)]">
                  Total {card.months} {card.months === 1 ? "mes" : "meses"}:{" "}
                  <strong>{monthlyBase ? formatCurrencyMXN(total) : "—"}</strong>
                </p>
                <button
                  type="button"
                  onClick={() => selectMonths(card.months)}
                  className={`mt-4 w-full rounded-xl px-4 py-2.5 text-sm font-bold ${
                    active
                      ? "bg-[var(--adamia-blue)] text-white"
                      : "border border-[var(--adamia-blue)]/30 bg-white text-[var(--adamia-blue)]"
                  }`}
                >
                  {active ? "Plan seleccionado" : "Seleccionar plan"}
                </button>
              </article>
            );
          })}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
          <form
            onSubmit={onSubmit}
            className="rounded-2xl border border-[var(--adamia-blue)]/15 bg-white p-5 shadow-sm md:p-7"
          >
            <h2 className="text-2xl font-black">Completa tus datos</h2>
            <p className="mt-1 text-sm text-[var(--adamia-text-secondary)]">
              Registro directo en la tabla <strong>Contrataciones</strong>.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field
                label="Nombre completo"
                name="nombre_cliente"
                value={form.nombre_cliente}
                onChange={onChange}
                required
              />
              <Field
                label="Empresa / razón social"
                name="empresa_nombre"
                value={form.empresa_nombre}
                onChange={onChange}
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
                    inputMode="numeric"
                    placeholder="Número de WhatsApp"
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
                    {otpVerified ? "Teléfono verificado" : "Pendiente de verificar"}
                  </span>
                </div>

                {otpSent ? (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-[var(--adamia-bg-light)] p-3">
                    <p className="mb-2 text-xs font-semibold text-[var(--adamia-text-secondary)]">
                      Ingresa el código de 6 dígitos enviado por WhatsApp
                    </p>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
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
                required
              />
              <Field
                label="RFC"
                name="rfc"
                value={form.rfc}
                onChange={onChange}
              />
              <Field
                label="Contraseña de acceso"
                name="contrasenia"
                type="password"
                value={form.contrasenia}
                onChange={onChange}
                required
              />
              <Field
                label="Confirmar contraseña"
                name="confirmar_contrasenia"
                type="password"
                value={form.confirmar_contrasenia}
                onChange={onChange}
                required
              />
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Tipo de contratación
                </label>
                <select
                  name="tipo_contratacion"
                  value={form.tipo_contratacion}
                  onChange={onChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 outline-none ring-[var(--adamia-blue)]/20 focus:ring-2"
                >
                  <option value="Prueba">Prueba (7 días)</option>
                  <option value="Normal">Normal</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Método de pago
                </label>
                <select
                  name="metodo_pago_id"
                  value={form.metodo_pago_id}
                  onChange={onChange}
                  disabled={loadingCatalogos}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 outline-none ring-[var(--adamia-blue)]/20 focus:ring-2 disabled:opacity-60"
                >
                  <option value="">Selecciona (opcional)</option>
                  {catalogos.metodos_pago.map((item) => (
                    <option key={item.id} value={item.id}>
                      {getLabelFromRow(item, `Método ${item.id}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2 rounded-lg bg-[var(--adamia-bg-light)] px-3 py-2 text-xs text-[var(--adamia-text-secondary)]">
                Esta contraseña será la que use el cliente para iniciar sesión
                en ADAMIA.
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold">
                  Notas
                </label>
                <textarea
                  name="notas"
                  value={form.notas}
                  onChange={onChange}
                  rows={3}
                  placeholder="Cuéntanos detalles para el alta"
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
                disabled={submitting || loadingCatalogos}
                className="rounded-xl bg-[var(--adamia-blue)] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {submitting ? "Guardando..." : "Registrar contratación"}
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
                Plan automático
              </p>
              <h3 className="mt-1 text-xl font-black">
                {selectedPlan
                  ? getLabelFromRow(selectedPlan, "Plan seleccionado")
                  : "Selecciona empleados"}
              </h3>
              <p className="mt-2 text-sm text-[var(--adamia-text-secondary)]">
                {selectedPlan
                  ? getPlanEmployeesRange(selectedPlan, catalogos.tipo_planes)
                  : "Sin rango disponible"}
              </p>
            </article>

            <article className="rounded-2xl border border-[var(--adamia-blue)]/20 bg-white p-5 shadow-sm">
              <h3 className="text-xl font-black">Resumen estimado</h3>
              {estimado ? (
                <div className="mt-3 space-y-2 text-sm">
                  <SummaryRow
                    label="Precio por mes (con descuento)"
                    value={formatCurrencyMXN(estimado.monthlyFinal)}
                  />
                  {estimado.descuento > 0 ? (
                    <SummaryRow
                      label="Precio mensual base"
                      value={formatCurrencyMXN(estimado.monthlyBase)}
                    />
                  ) : null}
                  <SummaryRow
                    label="Subtotal"
                    value={formatCurrencyMXN(estimado.subtotal)}
                  />
                  <SummaryRow
                    label="Descuento"
                    value={`${estimado.descuento}%`}
                  />
                  <SummaryRow
                    label="Total"
                    value={formatCurrencyMXN(estimado.total)}
                    highlight
                  />
                </div>
              ) : (
                <p className="mt-2 text-sm text-[var(--adamia-text-secondary)]">
                  Ajusta empleados para calcular precio.
                </p>
              )}
              {form.tipo_contratacion === "Prueba" ? (
                <p className="mt-3 rounded-lg bg-[var(--adamia-blue)]/10 px-3 py-2 text-sm font-semibold text-[var(--adamia-blue)]">
                  Incluye 7 días de prueba al registrarte.
                </p>
              ) : null}
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

            {errorCatalogos ? (
              <article className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {errorCatalogos}
              </article>
            ) : null}
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
