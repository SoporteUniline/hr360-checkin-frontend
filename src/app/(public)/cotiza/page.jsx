"use client";

import "@/components/landing/home/landing-home.css";
import "./cotiza.css";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AceptoLegal from "@/components/legal/AceptoLegal";
import { DOCS_AVISO, registrarAceptacion } from "@/lib/legal/aceptacion";
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

  const [aceptaAviso, setAceptaAviso] = useState(false);

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
    if (!aceptaAviso) {
      return "Para continuar, acepta el Aviso de privacidad.";
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

    // Constancia de que aceptó el aviso de privacidad (no detiene la cotización si falla).
    registrarAceptacion({ contexto: "cotizar", documentos: DOCS_AVISO, nombre: form.nombre, correo: form.correo, telefono: fullPhone });

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

  const nombrePlan = (meses) => (meses === 1 ? "Mensual" : meses === 6 ? "Semestral" : "Anual");
  const campo =
    "h-11 w-full rounded-xl border border-[#c9cde0] bg-white px-3 text-[15px] text-[#0b1033] outline-none transition focus:border-[#2c56e8] focus:ring-2 focus:ring-[#2c56e8]/20";

  // Diseño del 21/11/2026: mismo estilo que el inicio (bloques de color sólido, lado a lado). La lógica no cambió.
  return (
    <main className="lh cz">
      <section className="cz-hero">
        <div className="wrap cz-hero-grid">
          <div className="cz-hero-txt">
            <span className="eyebrow">Cotizar</span>
            <h1>Tu precio en segundos.</h1>
            <p className="lead">
              Elige cuántas personas tiene tu empresa, compara planes y recibe tu cotización en PDF.
            </p>
          </div>
          <div className="cz-contador">
            <label htmlFor="cz-empleados">¿Cuántas personas trabajan en tu empresa?</label>
            <div className="cz-stepper">
              <button type="button" onClick={() => handleEmployees(-5)} aria-label="Quitar 5 personas">
                −
              </button>
              <input
                id="cz-empleados"
                type="number"
                min={1}
                value={empleados}
                onChange={(event) => setEmpleados(Math.max(1, Number(event.target.value || 1)))}
              />
              <button type="button" onClick={() => handleEmployees(5)} aria-label="Agregar 5 personas">
                +
              </button>
            </div>
            <small>Ajusta de 5 en 5 o escribe el número exacto.</small>
          </div>
        </div>
      </section>

      <section className="wrap cz-planes" aria-label="Planes">
        {planesCalculados.map((plan) => {
          const active = plan.meses === planSeleccionado;
          const planName = nombrePlan(plan.meses);
          return (
            <article key={plan.meses} className={`cz-plan${active ? " on" : ""}`}>
              <header>
                <h2>{planName}</h2>
                {plan.descuentoPorcentaje ? <span>{plan.descuentoPorcentaje}% de descuento</span> : <span>Sin plazo forzoso</span>}
              </header>
              <p className="cz-precio">
                {formatCurrencyMXN(plan.precioPorMes)}
                <small> al mes</small>
              </p>
              <p className="cz-detalle">
                {formatCurrencyMXN(plan.precioPorMes / plan.empleados)} por persona · Total {formatCurrencyMXN(plan.total)}
              </p>
              <button type="button" onClick={() => setPlanSeleccionado(plan.meses)} aria-pressed={active} className="btn">
                {active ? "Plan elegido" : `Elegir ${planName}`}
              </button>
            </article>
          );
        })}
      </section>

      <section className="cz-form-banda">
        <div className="wrap cz-form-grid">
          <div className="cz-form-txt">
            <span className="eyebrow">Tu cotización</span>
            <h2>Recíbela en PDF.</h2>
            <p>Verificamos tu WhatsApp para enviarte la cotización y darte seguimiento. Tiene vigencia de 30 días.</p>
            {seleccion ? (
              <div className="cz-resumen">
                <small>Resumen</small>
                <b>
                  {nombrePlan(seleccion.meses)} · {formatCurrencyMXN(seleccion.total)}
                </b>
                <span>{empleados} personas</span>
              </div>
            ) : null}
          </div>
          <form onSubmit={handleSubmit} className="cz-form">
            <label>
              Nombre completo
              <input type="text" autoComplete="name" value={form.nombre} onChange={(event) => updateField("nombre", event.target.value)} className={campo} />
            </label>
            <label>
              Empresa
              <input type="text" autoComplete="organization" value={form.empresa} onChange={(event) => updateField("empresa", event.target.value)} className={campo} />
            </label>
            <label className="ancho">
              WhatsApp
              <span className="flex items-center gap-2">
                <select value={form.codigo_pais} onChange={(event) => updateField("codigo_pais", event.target.value)} className={`${campo} !w-28`} aria-label="Código de país">
                  {COUNTRY_CODES.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.code}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  autoComplete="tel-national"
                  inputMode="numeric"
                  value={form.telefono}
                  onChange={(event) => updateField("telefono", event.target.value.replace(/\D/g, "").slice(0, 15))}
                  className={campo}
                />
              </span>
            </label>
            <label className="ancho">
              Correo electrónico
              <input type="email" autoComplete="email" value={form.correo} onChange={(event) => updateField("correo", event.target.value)} className={campo} />
            </label>
            <div className="cz-otp ancho">
              <p>
                Número: <strong>{fullPhone || "—"}</strong>
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={sendOtpByWhatsApp} disabled={otpSending || otpCountdown > 0} className="btn btn-line">
                  {otpSending
                    ? "Enviando…"
                    : otpCountdown > 0
                      ? `Reenviar en ${otpCountdown} s`
                      : otpSent
                        ? "Reenviar código por WhatsApp"
                        : "Enviar código por WhatsApp"}
                </button>
                <span className={`cz-estado${otpVerified ? " ok" : ""}`}>{otpVerified ? "Número verificado" : "Pendiente de verificar"}</span>
              </div>
              {otpSent ? (
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot key={i} index={i} className="h-11 w-10 text-base" />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                  <button type="button" onClick={verifyOtp} disabled={otpVerifying || otpCode.length !== 6} className="btn btn-primary">
                    {otpVerifying ? "Validando…" : "Validar código"}
                  </button>
                </div>
              ) : null}
              {otpMessage ? <p className="cz-msg" role="status">{otpMessage}</p> : null}
            </div>
            <label className="ancho">
              Tipo de contratación
              <select value={form.tipoContratacion} onChange={(event) => updateField("tipoContratacion", event.target.value)} className={campo}>
                <option value="Normal">Normal</option>
                <option value="Prueba">Prueba</option>
              </select>
            </label>
            <AceptoLegal id="cz-acepto" className="ancho" checked={aceptaAviso} onChange={setAceptaAviso} />
            <button type="submit" disabled={loading || !planesCalculados.length} className="btn btn-primary ancho">
              {loading ? "Generando y enviando…" : "Descargar cotización en PDF"}
            </button>
          </form>
        </div>
      </section>

      <section className="wrap cz-incluye">
        <span className="eyebrow">Incluido en todos los planes</span>
        <h2>Todo lo que incluye tu plan.</h2>
        <div className="cz-incluye-grid">
          {beneficios.map((item) => (
            <article key={item.title}>
              <span aria-hidden="true">{item.icon}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="cz-garantias">
        <div className="wrap cz-garantias-grid">
          {garantias.map((item) => (
            <article key={item.title}>
              <span aria-hidden="true">{item.icon}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="wrap cz-faq">
        <h2>Preguntas frecuentes</h2>
        {faqs.map((faq) => (
          <details key={faq.q}>
            <summary>{faq.q}</summary>
            <p>{faq.a}</p>
          </details>
        ))}
      </section>

      <section className="cz-final">
        <div className="wrap">
          <h2>¿Listo para empezar?</h2>
          <p>Contrata en línea o pide una demostración con tu información.</p>
          <div className="ctas">
            <Link className="btn btn-primary" href="/contratar-plan">Contratar ahora</Link>
            <Link className="btn btn-claro" href="/contacto">Solicitar demo</Link>
          </div>
        </div>
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
