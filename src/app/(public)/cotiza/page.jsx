"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  ADAMIA,
  ADAMIA_LOGO_RATIO,
  applyAdamiaFont,
  gradientLine,
  lerpColor,
  loadAdamiaLogo,
} from "@/lib/pdfAdamiaTheme";

const COUNTRY_CODES = [
  { code: "+52", label: "MX (+52)" },
  { code: "+1", label: "US/CA (+1)" },
  { code: "+57", label: "CO (+57)" },
  { code: "+54", label: "AR (+54)" },
  { code: "+56", label: "CL (+56)" },
  { code: "+51", label: "PE (+51)" },
  { code: "+34", label: "ES (+34)" },
];

function formatCurrencyMXN(value) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatCompact(value) {
  return new Intl.NumberFormat("es-MX", {
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[^\d.-]/g, "");
  if (!cleaned) return null;
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
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

function getFirst(source, keys) {
  for (const key of keys) {
    const val = source?.[key];
    if (val !== undefined && val !== null && val !== "") return val;
  }
  return null;
}

function transformTipoPlanes(rows = []) {
  return rows
    .map((row) => {
      const id = getFirst(row, ["id", "id_tipo_plan"]);
      const min = toNumber(
        getFirst(row, ["usuarios_min", "empleados_min", "min", "rango_min"]),
      );
      const max = toNumber(
        getFirst(row, ["usuarios_max", "empleados_max", "max", "rango_max"]),
      );
      const precioBase = toNumber(
        getFirst(row, [
          "precio_base",
          "precio_mensual",
          "precio_por_mes",
          "precio_mes",
          "precio",
          "monto_mensual",
          "costo_mensual",
        ]),
      );
      return {
        id: Number(id),
        min: Number.isFinite(min) ? min : null,
        max: Number.isFinite(max) ? max : null,
        precioBase: Number.isFinite(precioBase) ? precioBase : null,
      };
    })
    .filter(
      (item) =>
        Number.isInteger(item.id) && item.id > 0 && item.precioBase !== null,
    )
    .sort((a, b) => {
      const aMax = a.max ?? Number.MAX_SAFE_INTEGER;
      const bMax = b.max ?? Number.MAX_SAFE_INTEGER;
      return aMax - bMax;
    });
}

function transformDescuentos(rows = []) {
  const defaults = { 1: 0, 6: 10, 12: 20 };
  if (!rows.length) return defaults;

  const result = { ...defaults };
  rows.forEach((row) => {
    const meses = Number(getFirst(row, ["meses"]));
    const descuento = toNumber(
      getFirst(row, ["descuento_porcentaje", "descuento"]),
    );
    if ([1, 6, 12].includes(meses) && Number.isFinite(descuento)) {
      result[meses] = descuento;
    }
  });
  return result;
}

function calcularCotizacionLocal({ empleados, meses, descuentos }) {
  const empleadosNum = Math.max(1, Number(empleados || 1));

  const COSTO_POR_EMPLEADO = 60;

  const precioMensual = empleadosNum * COSTO_POR_EMPLEADO;

  const descuento = descuentos[meses] ?? 0;

  const subtotal = precioMensual * meses;

  const descuentoAplicado = subtotal * (descuento / 100);

  const total = subtotal - descuentoAplicado;

  return {
    empleados: empleadosNum,
    meses,
    precioMensual,
    precioPorMes: total / meses,
    descuentoPorcentaje: descuento,
    descuentoAplicado,
    subtotal,
    total,
  };
}

export default function CotizaPage() {
  const beneficios = [
    {
      icon: "👥",
      title: "Gestión de Empleados",
      text: "Administra expedientes, datos laborales y documentos en un solo lugar.",
    },
    {
      icon: "⏰",
      title: "Control de Asistencias",
      text: "Registra entradas, salidas, retardos y faltas con reportes listos para nómina.",
    },
    {
      icon: "🏖️",
      title: "Vacaciones y Permisos",
      text: "Flujos de solicitud y aprobación con cálculo automático de días disponibles.",
    },
    {
      icon: "📄",
      title: "Contratos Digitales",
      text: "Plantillas y documentos laborales centralizados para operación más ágil.",
    },
    {
      icon: "📊",
      title: "Reportes y Dashboards",
      text: "Métricas clave para tomar decisiones con datos en tiempo real.",
    },
    {
      icon: "🔔",
      title: "Notificaciones Inteligentes",
      text: "Alertas automáticas de incidencias, vencimientos y eventos importantes.",
    },
  ];
  const garantias = [
    { icon: "✓", title: "Sin compromiso", text: "Cancela cuando quieras." },
    {
      icon: "🔒",
      title: "Datos seguros",
      text: "Infraestructura robusta y respaldo continuo.",
    },
    {
      icon: "💬",
      title: "Soporte cercano",
      text: "Acompañamiento en implementación y operación.",
    },
  ];
  const faqs = [
    {
      q: "¿La cotización tiene vigencia?",
      a: "Sí, la cotización PDF tiene vigencia de 30 días naturales a partir de su emisión.",
    },
    {
      q: "¿Puedo cambiar de plan después?",
      a: "Sí, puedes escalar o ajustar tu plan según el crecimiento de tu empresa.",
    },
    {
      q: "¿Incluye implementación?",
      a: "Sí, ADAMIA incluye acompañamiento de arranque para que empieces rápido.",
    },
  ];
  const [planes, setPlanes] = useState([]);
  const [descuentos, setDescuentos] = useState({ 1: 0, 6: 10, 12: 20 });
  const [empleados, setEmpleados] = useState(15);
  const [loading, setLoading] = useState(false);
  const [alertaModal, setAlertaModal] = useState({
    open: false,
    title: "",
    description: "",
    variant: "info",
  });
  const [planSeleccionado, setPlanSeleccionado] = useState(6);
  const [form, setForm] = useState({
    nombre: "",
    empresa: "",
    codigo_pais: "+52",
    telefono: "",
    correo: "",
    tipoContratacion: "Normal",
  });
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [phoneVerificationToken, setPhoneVerificationToken] = useState("");
  const [otpMessage, setOtpMessage] = useState("");
  const [otpCountdown, setOtpCountdown] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const loadCatalogos = async () => {
      try {
        const response = await axios.get("/checador/contrataciones/catalogos");
        if (!isMounted) return;
        setPlanes(transformTipoPlanes(response?.data?.tipo_planes ?? []));
        setDescuentos(
          transformDescuentos(response?.data?.planes_duracion ?? []),
        );
      } catch (error) {
        console.error("No se pudo cargar catalogo de cotiza:", error);
      }
    };
    loadCatalogos();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (otpCountdown <= 0) return undefined;
    const interval = window.setInterval(() => {
      setOtpCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [otpCountdown]);

  const planesCalculados = useMemo(() => {
    if (!planes.length) return [];
    return [1, 6, 12].map((meses) =>
      calcularCotizacionLocal({
        empleados,
        meses,
        planes,
        descuentos,
      }),
    );
  }, [descuentos, empleados, planes]);

  const seleccion = useMemo(
    () =>
      planesCalculados.find((plan) => plan.meses === planSeleccionado) ?? null,
    [planSeleccionado, planesCalculados],
  );

  const handleEmployees = (delta) => {
    const next = Math.max(1, Math.min(9999, empleados + delta));
    const rounded =
      delta > 0 ? Math.ceil(next / 5) * 5 : Math.floor(next / 5) * 5 || 1;
    setEmpleados(Math.max(1, rounded));
  };

  const updateField = (key, value) => {
    if (key === "telefono" || key === "codigo_pais") {
      setOtpSent(false);
      setOtpVerified(false);
      setPhoneVerificationToken("");
      setOtpCode("");
      setOtpMessage("");
      setOtpCountdown(0);
    }
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const fullPhone = useMemo(
    () => buildInternationalPhone(form.codigo_pais, form.telefono),
    [form.codigo_pais, form.telefono],
  );

  const showAlert = ({ title, description, variant = "info" }) => {
    setAlertaModal({
      open: true,
      title,
      description,
      variant,
    });
  };

  const validate = () => {
    if (
      !form.nombre.trim() ||
      !form.empresa.trim() ||
      !form.telefono.trim() ||
      !form.correo.trim()
    ) {
      return "Todos los campos son obligatorios.";
    }
    if (!/^\+[0-9]{8,20}$/.test(fullPhone.trim())) {
      return "El teléfono con código de país no tiene un formato válido.";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo.trim())) {
      return "El correo no es válido.";
    }
    if (!otpVerified || !phoneVerificationToken) {
      return "Debes verificar tu número por WhatsApp antes de generar la cotización.";
    }
    if (!seleccion) {
      return "Primero selecciona un plan.";
    }
    return "";
  };

  const sendOtpByWhatsApp = async () => {
    setOtpMessage("");
    const phoneDigits = onlyPhoneDigits(form.telefono);
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      showAlert({
        title: "Número inválido",
        description:
          "Ingresa un número de WhatsApp válido para enviar el código.",
        variant: "error",
      });
      return;
    }

    try {
      setOtpSending(true);
      await axios.post("/otp/send", {
        telefono: fullPhone,
        canal: "whatsapp",
      });
      setOtpSent(true);
      setOtpVerified(false);
      setPhoneVerificationToken("");
      setOtpCountdown(45);
      setOtpMessage(
        "Código enviado por WhatsApp. Revisa tu chat para continuar.",
      );
    } catch (error) {
      showAlert({
        title: "No se pudo enviar el código",
        description:
          error?.response?.data?.error ||
          error?.response?.data?.message ||
          "Intenta nuevamente en unos segundos.",
        variant: "error",
      });
    } finally {
      setOtpSending(false);
    }
  };

  const verifyOtp = async () => {
    if (String(otpCode || "").trim().length !== 6) {
      showAlert({
        title: "Código incompleto",
        description: "Ingresa los 6 dígitos enviados por WhatsApp.",
        variant: "error",
      });
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
        showAlert({
          title: "No se pudo verificar",
          description:
            "No se recibió token de verificación. Intenta nuevamente.",
          variant: "error",
        });
        return;
      }
      setOtpVerified(true);
      setPhoneVerificationToken(verificationToken);
      setOtpMessage("Número verificado correctamente por WhatsApp.");
    } catch (error) {
      setOtpVerified(false);
      setPhoneVerificationToken("");
      showAlert({
        title: "Código inválido",
        description:
          error?.response?.data?.error ||
          error?.response?.data?.message ||
          "El código no es válido o expiró.",
        variant: "error",
      });
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const error = validate();
    if (error) {
      showAlert({
        title: "Datos incompletos",
        description: error,
        variant: "error",
      });
      return;
    }

    try {
      setLoading(true);
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "letter" });
      const planNombre =
        seleccion.meses === 1
          ? "Mensual"
          : seleccion.meses === 6
          ? "Semestral"
          : "Anual";
      const planSeleccionadoData =
        planes.find((plan) => plan.id === seleccion.tipoPlanId) ?? null;
      const rangoEmpleados =
        planSeleccionadoData &&
        (planSeleccionadoData.min !== null || planSeleccionadoData.max !== null)
          ? `${planSeleccionadoData.min ?? 1} - ${
              planSeleccionadoData.max ?? "en adelante"
            } empleados`
          : null;
      const fecha = new Date().toLocaleDateString("es-MX", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      // Tema corporativo ADAMIA: sin rellenos de color, solo líneas de acento
      // con el degradado azul → morado de la marca, logotipo real y tipografía
      // Poppins. Si logo o fuentes no cargan, hay fallback tipográfico.
      const FONT = await applyAdamiaFont(doc);
      const logo = await loadAdamiaLogo();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const left = 14;
      const right = pageWidth - 14;
      const contentW = right - left;

      // Columna informativa con barra de acento vertical (sin cajas ni rellenos).
      const drawInfoCard = (x, y, w, h, label, value, accent) => {
        doc.setDrawColor(...accent);
        doc.setLineWidth(0.9);
        doc.line(x + 0.45, y, x + 0.45, y + h);
        doc.setTextColor(...ADAMIA.muted);
        doc.setFont(FONT, "normal");
        doc.setFontSize(7);
        doc.text(label.toUpperCase(), x + 4.5, y + 4.5, { charSpace: 0.2 });
        doc.setTextColor(...ADAMIA.text);
        doc.setFont(FONT, "bold");
        doc.setFontSize(12);
        doc.text(String(value), x + 4.5, y + 12);
      };

      // Encabezado: logotipo + título y fecha, bajo una línea degradada.
      if (logo) {
        const logoH = 12;
        doc.addImage(
          logo,
          "PNG",
          left - 2.5,
          9.5,
          logoH * ADAMIA_LOGO_RATIO,
          logoH,
        );
      } else {
        doc.setFont(FONT, "bold");
        doc.setFontSize(18);
        doc.setTextColor(...ADAMIA.blue);
        doc.text("Adamia", left, 18.5);
      }
      doc.setFont(FONT, "bold");
      doc.setFontSize(13);
      doc.setTextColor(...ADAMIA.text);
      doc.text("Cotización", right, 15, { align: "right" });
      doc.setFont(FONT, "normal");
      doc.setFontSize(8);
      doc.setTextColor(...ADAMIA.muted);
      doc.text(`Generada el ${fecha}`, right, 20.5, { align: "right" });
      doc.text(
        `Plan ${planNombre} · ${seleccion.meses} ${
          seleccion.meses === 1 ? "mes" : "meses"
        }`,
        right,
        25,
        {
          align: "right",
        },
      );
      gradientLine(doc, left, right, 30, 0.55);

      // Saludo + cliente
      doc.setTextColor(...ADAMIA.text);
      doc.setFont(FONT, "bold");
      doc.setFontSize(13);
      doc.text(`Hola ${form.nombre},`, left, 42);
      doc.setTextColor(...ADAMIA.text2);
      doc.setFont(FONT, "normal");
      doc.setFontSize(10);
      doc.text(
        "Gracias por cotizar ADAMIA. Esta es la propuesta para tu empresa:",
        left,
        49,
      );
      doc.setTextColor(...ADAMIA.blue);
      doc.setFont(FONT, "bold");
      doc.text(form.empresa, left, 55.5);

      // Plan seleccionado: título y descuento en cifra, sin cajas de color.
      doc.setDrawColor(...ADAMIA.hairline);
      doc.setLineWidth(0.25);
      doc.line(left, 62, right, 62);
      doc.setTextColor(...ADAMIA.text);
      doc.setFont(FONT, "bold");
      doc.setFontSize(14);
      doc.text(`Plan ${planNombre}`, left, 71);
      if (seleccion.descuentoPorcentaje > 0) {
        doc.setTextColor(...ADAMIA.purple);
        doc.setFont(FONT, "bold");
        doc.setFontSize(11);
        doc.text(
          `${seleccion.descuentoPorcentaje}% de descuento`,
          right,
          71,
          { align: "right" },
        );
      }

      // Tres columnas informativas para evitar redundancia entre "precio mensual" e "inversión".
      const cardW = contentW / 3;
      drawInfoCard(
        left,
        77,
        cardW,
        15,
        "Empleados",
        formatCompact(seleccion.empleados),
        ADAMIA.blue,
      );
      drawInfoCard(
        left + cardW,
        77,
        cardW,
        15,
        "Duración",
        `${seleccion.meses} ${seleccion.meses === 1 ? "mes" : "meses"}`,
        lerpColor(ADAMIA.blue, ADAMIA.purple, 0.5),
      );
      drawInfoCard(
        left + cardW * 2,
        77,
        cardW,
        15,
        "Precio mensual",
        formatCurrencyMXN(seleccion.precioPorMes),
        ADAMIA.purple,
      );

      // Total destacado: cifra grande en azul entre dos líneas finas.
      doc.setDrawColor(...ADAMIA.hairline);
      doc.setLineWidth(0.25);
      doc.line(left, 100, right, 100);
      doc.line(left, 117, right, 117);
      doc.setTextColor(...ADAMIA.muted);
      doc.setFont(FONT, "normal");
      doc.setFontSize(8);
      doc.text("TOTAL COTIZADO", left, 110.5, { charSpace: 0.3 });
      doc.setTextColor(...ADAMIA.blue);
      doc.setFont(FONT, "bold");
      doc.setFontSize(18);
      doc.text(formatCurrencyMXN(seleccion.total), right, 111.5, {
        align: "right",
      });

      // Beneficios incluidos
      doc.setTextColor(...ADAMIA.text);
      doc.setFont(FONT, "bold");
      doc.setFontSize(11);
      doc.text("Incluye en tu plan ADAMIA", left, 129);
      gradientLine(doc, left, left + 48, 132.2, 0.55);
      doc.setFont(FONT, "normal");
      doc.setFontSize(9);
      doc.setTextColor(...ADAMIA.text2);
      const beneficios = [
        "Control de asistencias y turnos",
        "Vacaciones, permisos y justificantes",
        "Contratos digitales y expedientes",
        "Reportes y panel de indicadores",
        "Portal de empleados y notificaciones",
        "Soporte y acompañamiento de implementación",
      ];
      beneficios.forEach((item, idx) => {
        const y = 140 + (idx % 3) * 7.5;
        const x = idx < 3 ? left + 1 : left + contentW / 2 + 1;
        doc.text(`·  ${item}`, x, y);
      });

      // CTA contacto: contorno fino con barra de acento, sin relleno.
      doc.setDrawColor(...ADAMIA.hairline);
      doc.setLineWidth(0.3);
      doc.roundedRect(left, 165, contentW, 22, 2, 2, "S");
      gradientLine(doc, left + 6, left + 26, 171.5, 0.55);
      doc.setTextColor(...ADAMIA.text);
      doc.setFont(FONT, "bold");
      doc.setFontSize(11);
      doc.text("¿Listo para comenzar?", left + 6, 177);
      doc.setFont(FONT, "normal");
      doc.setFontSize(9);
      doc.setTextColor(...ADAMIA.text2);
      doc.text(
        "WhatsApp: +52 317 128 8029 | Correo: sistema@adamia.mx",
        left + 6,
        183,
      );

      // Notas legales
      doc.setTextColor(...ADAMIA.muted);
      doc.setFont(FONT, "normal");
      doc.setFontSize(7.5);
      doc.text(
        "Cotización informativa sujeta a validación comercial y técnica.",
        left,
        248,
      );
      doc.text(
        "Vigencia de la cotización: 30 días naturales desde su emisión.",
        left,
        252.5,
      );
      doc.text(
        "https://adamia.com.mx/ | sistema@adamia.mx | +52 317 128 8029",
        left,
        257,
      );
      doc.text(`ADAMIA by Uniline - ${new Date().getFullYear()}`, right, 257, {
        align: "right",
      });

      // Pie de página en todas las hojas: línea degradada, marca y numeración.
      const totalPages = doc.getNumberOfPages();
      for (let page = 1; page <= totalPages; page++) {
        doc.setPage(page);
        const footerLineY = pageHeight - 14;
        const footerTextY = footerLineY + 5;
        gradientLine(doc, left, right, footerLineY, 0.3);
        doc.setFont(FONT, "bold");
        doc.setFontSize(8);
        doc.setTextColor(...ADAMIA.blue);
        doc.text("Adamia", left, footerTextY);
        const brandW = doc.getTextWidth("Adamia");
        doc.setFont(FONT, "normal");
        doc.setTextColor(...ADAMIA.muted);
        doc.text("  ·  Cotización", left + brandW, footerTextY);
        doc.text(`Página ${page} de ${totalPages}`, right, footerTextY, {
          align: "right",
        });
      }

      const fileName = `Cotizacion_ADAMIA_${form.empresa.replace(
        /\s+/g,
        "_",
      )}_${planNombre}.pdf`;
      const pdfDataUri = doc.output("datauristring");
      const pdfBase64 = (pdfDataUri.split(",")[1] || "").trim();
      doc.save(fileName);
      try {
        const response = await axios.post(
          "/checador/contrataciones/cotizacion",
          {
            nombre_cliente: form.nombre.trim(),
            correo: form.correo.trim(),
            telefono: fullPhone.trim(),
            empresa_nombre: form.empresa.trim(),
            tipo_contratacion: form.tipoContratacion,
            plan_nombre: planNombre,
            empleados: Number(seleccion.empleados),
            rango_empleados: rangoEmpleados,
            meses_contratados: Number(seleccion.meses),
            precio_mensual: Number(seleccion.precioPorMes.toFixed(2)),
            descuento_porcentaje: Number(seleccion.descuentoPorcentaje || 0),
            monto_total: Number(seleccion.total.toFixed(2)),
            pdf_base64: pdfBase64,
            pdf_filename: fileName,
            telefono_verificacion_token: phoneVerificationToken,
          },
        );
        const backendMessage = response?.data?.message;
        showAlert({
          title: "Cotización enviada",
          description:
            backendMessage ||
            `Tu cotización se descargó localmente y el PDF fue enviado al correo ${form.correo.trim()}.`,
          variant: "success",
        });
      } catch (mailError) {
        const backendMessage = mailError?.response?.data?.message;
        showAlert({
          title: "PDF descargado",
          description: backendMessage
            ? `Tu cotización se descargó localmente, pero no se pudo enviar al correo: ${backendMessage}`
            : "Tu cotización se descargó localmente, pero no se pudo enviar al correo.",
          variant: "warning",
        });
      }
    } catch (error) {
      console.error(error);
      showAlert({
        title: "Error al generar cotización",
        description: "No se pudo generar la cotización en PDF.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--adamia-bg-light)] text-[var(--adamia-text-primary)]">
      <section className="bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)] px-6 py-14 text-center text-white">
        <h1 className="text-4xl font-black md:text-5xl">
          Cotiza tu plan ADAMIA
        </h1>
        <p className="mx-auto mt-3 max-w-3xl text-white/90">
          Calcula tu plan y descarga tu PDF de cotización en segundos.
        </p>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 md:px-6">
        <article className="rounded-2xl border border-[var(--adamia-blue)]/20 bg-white p-5 shadow-sm">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div>
              <h2 className="text-xl font-black">
                ¿Cuántos empleados tiene tu empresa?
              </h2>
              <p className="text-sm text-[var(--adamia-text-secondary)]">
                Ajusta en incrementos de 5.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleEmployees(-5)}
                className="h-12 w-12 rounded-lg bg-[var(--adamia-blue)] text-3xl font-bold text-white"
              >
                -
              </button>
              <input
                type="number"
                min={1}
                value={empleados}
                onChange={(event) =>
                  setEmpleados(Math.max(1, Number(event.target.value || 1)))
                }
                className="h-12 w-28 rounded-lg border-2 border-[var(--adamia-blue)]/40 text-center text-2xl font-black"
              />
              <button
                type="button"
                onClick={() => handleEmployees(5)}
                className="h-12 w-12 rounded-lg bg-[var(--adamia-blue)] text-3xl font-bold text-white"
              >
                +
              </button>
            </div>
          </div>
        </article>

        <article className="grid gap-4 md:grid-cols-3">
          {planesCalculados.map((plan) => {
            const active = plan.meses === planSeleccionado;
            const planName =
              plan.meses === 1
                ? "Mensual"
                : plan.meses === 6
                ? "Semestral"
                : "Anual";
            return (
              <div
                key={plan.meses}
                className={`rounded-2xl border-2 p-5 shadow-sm transition ${
                  active
                    ? "border-[var(--adamia-blue)] bg-[var(--adamia-blue)]/5"
                    : "border-slate-200 bg-white"
                }`}
              >
                <h3 className="text-2xl font-black">{planName}</h3>
                <p className="mt-1 text-xs font-semibold uppercase text-[var(--adamia-text-secondary)]">
                  {plan.descuentoPorcentaje}% de descuento
                </p>
                <p className="mt-4 text-sm text-[var(--adamia-text-secondary)]">
                  Precio por mes
                </p>
                <p className="text-3xl font-black text-[var(--adamia-blue)]">
                  {formatCurrencyMXN(plan.precioPorMes)}
                </p>
                <p className="mt-1 text-sm text-[var(--adamia-text-secondary)]">
                  Total: <strong>{formatCurrencyMXN(plan.total)}</strong>
                </p>
                <p className="mt-1 text-xs text-[var(--adamia-text-secondary)]">
                  {formatCurrencyMXN(plan.precioPorMes / plan.empleados)} por
                  empleado
                </p>
                <button
                  type="button"
                  onClick={() => setPlanSeleccionado(plan.meses)}
                  className={`mt-4 w-full rounded-lg px-4 py-2 text-sm font-bold ${
                    active
                      ? "bg-[var(--adamia-blue)] text-white"
                      : "bg-slate-100 text-[var(--adamia-text-primary)]"
                  }`}
                >
                  {active ? "Plan seleccionado" : `Seleccionar ${planName}`}
                </button>
              </div>
            );
          })}
        </article>

        <article className="rounded-2xl border border-[var(--adamia-blue)]/20 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">
            Completa tus datos para cotización PDF
          </h2>
          <form
            onSubmit={handleSubmit}
            className="mt-4 grid gap-4 md:grid-cols-2"
          >
            <input
              type="text"
              placeholder="Nombre completo"
              value={form.nombre}
              onChange={(event) => updateField("nombre", event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
            <input
              type="text"
              placeholder="Empresa"
              value={form.empresa}
              onChange={(event) => updateField("empresa", event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
            <div className="md:col-span-2">
              <div className="flex items-center gap-2">
                <select
                  value={form.codigo_pais}
                  onChange={(event) =>
                    updateField("codigo_pais", event.target.value)
                  }
                  className="h-10 w-28 rounded-lg border border-slate-300 px-2 text-sm"
                  aria-label="Código de país"
                >
                  {COUNTRY_CODES.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.code}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  placeholder="Número de WhatsApp"
                  value={form.telefono}
                  onChange={(event) =>
                    updateField(
                      "telefono",
                      event.target.value.replace(/\D/g, "").slice(0, 15),
                    )
                  }
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                />
              </div>
            </div>
            <input
              type="email"
              placeholder="Correo electrónico"
              value={form.correo}
              onChange={(event) => updateField("correo", event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
            <div className="rounded-xl border border-slate-200 bg-[var(--adamia-bg-light)] p-3 md:col-span-2">
              <p className="text-xs text-[var(--adamia-text-secondary)]">
                Número internacional: <strong>{fullPhone || "—"}</strong>
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={sendOtpByWhatsApp}
                  disabled={otpSending || otpCountdown > 0}
                  className="rounded-lg border border-[var(--adamia-blue)]/25 bg-white px-3 py-2 text-xs font-bold text-[var(--adamia-blue)] disabled:opacity-60"
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
                  className={`inline-flex items-center rounded-lg px-3 py-2 text-xs font-semibold ${
                    otpVerified
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {otpVerified ? "Número verificado" : "Pendiente de verificar"}
                </span>
              </div>
              {otpSent ? (
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="h-9 w-8 text-sm" />
                      <InputOTPSlot index={1} className="h-9 w-8 text-sm" />
                      <InputOTPSlot index={2} className="h-9 w-8 text-sm" />
                      <InputOTPSlot index={3} className="h-9 w-8 text-sm" />
                      <InputOTPSlot index={4} className="h-9 w-8 text-sm" />
                      <InputOTPSlot index={5} className="h-9 w-8 text-sm" />
                    </InputOTPGroup>
                  </InputOTP>
                  <button
                    type="button"
                    onClick={verifyOtp}
                    disabled={otpVerifying || otpCode.length !== 6}
                    className="rounded-lg bg-[var(--adamia-blue)] px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
                  >
                    {otpVerifying ? "Validando..." : "Validar código"}
                  </button>
                </div>
              ) : null}
              {otpMessage ? (
                <p className="mt-2 text-xs font-semibold text-[var(--adamia-blue)]">
                  {otpMessage}
                </p>
              ) : null}
            </div>
            <select
              value={form.tipoContratacion}
              onChange={(event) =>
                updateField("tipoContratacion", event.target.value)
              }
              className="rounded-lg border border-slate-300 px-3 py-2 md:col-span-2"
            >
              <option value="Normal">Tipo de contratación: Normal</option>
              <option value="Prueba">Tipo de contratación: Prueba</option>
            </select>

            {seleccion ? (
              <div className="rounded-xl bg-[var(--adamia-blue)] px-4 py-3 text-white md:col-span-2">
                <p className="text-xs uppercase text-white/80">
                  Resumen seleccionado
                </p>
                <p className="text-lg font-black">
                  {seleccion.meses === 1
                    ? "Mensual"
                    : seleccion.meses === 6
                    ? "Semestral"
                    : "Anual"}{" "}
                  - {formatCurrencyMXN(seleccion.total)}
                </p>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading || !planesCalculados.length}
              className="rounded-lg bg-emerald-600 px-4 py-3 font-bold text-white disabled:opacity-60 md:col-span-2"
            >
              {loading ? "Generando y enviando..." : "Descargar cotización PDF"}
            </button>
          </form>
        </article>

        <section className="rounded-2xl border border-[var(--adamia-blue)]/20 bg-white p-6 shadow-sm">
          <div className="text-center">
            <h2 className="text-3xl font-black text-[var(--adamia-text-primary)]">
              Todo lo que incluye tu plan ADAMIA
            </h2>
            <p className="mt-2 text-sm text-[var(--adamia-text-secondary)]">
              Funcionalidades clave para operar RRHH con orden, visibilidad y
              control.
            </p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {beneficios.map((item, idx) => (
              <article
                key={item.title}
                className={`rounded-xl border p-4 ${
                  idx % 3 === 0
                    ? "border-emerald-200 bg-emerald-50/50"
                    : idx % 3 === 1
                    ? "border-sky-200 bg-sky-50/50"
                    : "border-violet-200 bg-violet-50/50"
                }`}
              >
                <div className="text-2xl">{item.icon}</div>
                <h3 className="mt-2 text-base font-black">{item.title}</h3>
                <p className="mt-1 text-sm text-[var(--adamia-text-secondary)]">
                  {item.text}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {garantias.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-[var(--adamia-blue)]/15 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm"
            >
              <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-lg font-bold text-white">
                {item.icon}
              </div>
              <h3 className="text-lg font-black">{item.title}</h3>
              <p className="mt-1 text-sm text-[var(--adamia-text-secondary)]">
                {item.text}
              </p>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-[var(--adamia-blue)]/20 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black">Preguntas frecuentes</h2>
          <div className="mt-4 grid gap-3">
            {faqs.map((faq) => (
              <article key={faq.q} className="rounded-xl bg-slate-50 p-4">
                <h3 className="font-bold">{faq.q}</h3>
                <p className="mt-1 text-sm text-[var(--adamia-text-secondary)]">
                  {faq.a}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)] p-8 text-center text-white shadow-sm">
          <h2 className="text-3xl font-black">
            ¿Listo para activar ADAMIA en tu empresa?
          </h2>
          <p className="mx-auto mt-2 max-w-3xl text-white/90">
            Recibe tu cotización en PDF, compártela internamente y avanza con
            una implementación guiada.
          </p>
          <p className="mt-4 text-sm text-white/85">
            Sitio web: <span className="font-bold">https://adamia.com.mx/</span>{" "}
            · Correo: <span className="font-bold">sistema@adamia.mx</span>
          </p>
        </section>
      </section>
      <Dialog
        open={alertaModal.open}
        onOpenChange={(open) => setAlertaModal((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle
              className={`text-2xl font-black ${
                alertaModal.variant === "success"
                  ? "text-emerald-600"
                  : alertaModal.variant === "warning"
                  ? "text-amber-600"
                  : alertaModal.variant === "error"
                  ? "text-red-600"
                  : "text-[var(--adamia-blue)]"
              }`}
            >
              {alertaModal.title}
            </DialogTitle>
            <DialogDescription className="text-sm text-[var(--adamia-text-secondary)]">
              {alertaModal.description}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() =>
                setAlertaModal((prev) => ({ ...prev, open: false }))
              }
              className="rounded-lg bg-[var(--adamia-blue)] px-4 py-2 text-sm font-bold text-white"
            >
              Entendido
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
