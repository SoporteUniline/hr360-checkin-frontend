"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "@/lib/axios";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
      const min = toNumber(getFirst(row, ["usuarios_min", "empleados_min", "min", "rango_min"]));
      const max = toNumber(getFirst(row, ["usuarios_max", "empleados_max", "max", "rango_max"]));
      const precioBase = toNumber(
        getFirst(row, [
          "precio_base",
          "precio_mensual",
          "precio_por_mes",
          "precio_mes",
          "precio",
          "monto_mensual",
          "costo_mensual",
        ])
      );
      return {
        id: Number(id),
        min: Number.isFinite(min) ? min : null,
        max: Number.isFinite(max) ? max : null,
        precioBase: Number.isFinite(precioBase) ? precioBase : null,
      };
    })
    .filter((item) => Number.isInteger(item.id) && item.id > 0 && item.precioBase !== null)
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
    const descuento = toNumber(getFirst(row, ["descuento_porcentaje", "descuento"]));
    if ([1, 6, 12].includes(meses) && Number.isFinite(descuento)) {
      result[meses] = descuento;
    }
  });
  return result;
}

function calcularCotizacionLocal({ empleados, meses, planes, descuentos }) {
  const empleadosNum = Math.max(1, Number(empleados || 1));
  const mesesNum = Number(meses);
  const empleadosLookup = empleadosNum > 58 ? 58 : empleadosNum;

  let planBase = planes.find(
    (plan) =>
      empleadosLookup >= (plan.min ?? 1) &&
      (plan.max === null || plan.max === undefined || empleadosLookup <= plan.max)
  );
  if (!planBase) {
    planBase = planes[planes.length - 1];
  }

  let precioMensual = planBase?.precioBase ?? 0;
  if (empleadosNum > 58) {
    precioMensual = (planBase?.precioBase ?? 0) * empleadosNum;
  }

  const descuento = descuentos[mesesNum] ?? 0;
  const subtotal = precioMensual * mesesNum;
  const descuentoAplicado = subtotal * (descuento / 100);
  const total = subtotal - descuentoAplicado;

  return {
    tipoPlanId: planBase?.id ?? null,
    empleados: empleadosNum,
    meses: mesesNum,
    precioMensual,
    precioPorMes: total / mesesNum,
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
    { icon: "🔒", title: "Datos seguros", text: "Infraestructura robusta y respaldo continuo." },
    { icon: "💬", title: "Soporte cercano", text: "Acompañamiento en implementación y operación." },
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
  const [alertaModal, setAlertaModal] = useState({ open: false, title: "", description: "", variant: "info" });
  const [planSeleccionado, setPlanSeleccionado] = useState(6);
  const [form, setForm] = useState({
    nombre: "",
    empresa: "",
    telefono: "",
    correo: "",
    tipoContratacion: "Normal",
  });

  useEffect(() => {
    let isMounted = true;
    const loadCatalogos = async () => {
      try {
        const response = await axios.get("/checador/contrataciones/catalogos");
        if (!isMounted) return;
        setPlanes(transformTipoPlanes(response?.data?.tipo_planes ?? []));
        setDescuentos(transformDescuentos(response?.data?.planes_duracion ?? []));
      } catch (error) {
        console.error("No se pudo cargar catalogo de cotiza:", error);
      }
    };
    loadCatalogos();
    return () => {
      isMounted = false;
    };
  }, []);

  const planesCalculados = useMemo(() => {
    if (!planes.length) return [];
    return [1, 6, 12].map((meses) =>
      calcularCotizacionLocal({
        empleados,
        meses,
        planes,
        descuentos,
      })
    );
  }, [descuentos, empleados, planes]);

  const seleccion = useMemo(
    () => planesCalculados.find((plan) => plan.meses === planSeleccionado) ?? null,
    [planSeleccionado, planesCalculados]
  );

  const handleEmployees = (delta) => {
    const next = Math.max(1, Math.min(9999, empleados + delta));
    const rounded = delta > 0 ? Math.ceil(next / 5) * 5 : Math.floor(next / 5) * 5 || 1;
    setEmpleados(Math.max(1, rounded));
  };

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const showAlert = ({ title, description, variant = "info" }) => {
    setAlertaModal({
      open: true,
      title,
      description,
      variant,
    });
  };

  const validate = () => {
    if (!form.nombre.trim() || !form.empresa.trim() || !form.telefono.trim() || !form.correo.trim()) {
      return "Todos los campos son obligatorios.";
    }
    if (!/^\d{10}$/.test(form.telefono.trim())) {
      return "El teléfono debe tener 10 dígitos.";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo.trim())) {
      return "El correo no es válido.";
    }
    if (!seleccion) {
      return "Primero selecciona un plan.";
    }
    return "";
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
      const planNombre = seleccion.meses === 1 ? "Mensual" : seleccion.meses === 6 ? "Semestral" : "Anual";
      const planSeleccionadoData = planes.find((plan) => plan.id === seleccion.tipoPlanId) ?? null;
      const rangoEmpleados =
        planSeleccionadoData && (planSeleccionadoData.min !== null || planSeleccionadoData.max !== null)
          ? `${planSeleccionadoData.min ?? 1} - ${planSeleccionadoData.max ?? "en adelante"} empleados`
          : null;
      const fecha = new Date().toLocaleDateString("es-MX", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      // Paleta ADAMIA para PDF (indigo/purpura + acento cian)
      const colorPrimary = [43, 63, 156];
      const colorSecondary = [109, 40, 217];
      const colorAccent = [6, 182, 212];
      const colorMuted = [71, 85, 105];
      const colorSurface = [238, 242, 255];
      const pageWidth = 216;
      const left = 14;
      const right = 202;

      const drawInfoCard = (x, y, w, h, label, value) => {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(x, y, w, h, 2, 2, "FD");
        doc.setTextColor(...colorMuted);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text(label.toUpperCase(), x + 4, y + 5);
        doc.setTextColor(17, 24, 39);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(String(value), x + 4, y + 12);
      };

      // Header
      doc.setFillColor(...colorPrimary);
      doc.rect(0, 0, pageWidth, 36, "F");
      doc.setFillColor(...colorSecondary);
      doc.rect(0, 32, pageWidth, 4, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("ADAMIA", left, 15);
      doc.setFontSize(12);
      doc.text("Tu cotización personalizada", left, 23);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Generada el ${fecha}`, right, 15, { align: "right" });
      doc.text(`Plan ${planNombre} - ${seleccion.meses} ${seleccion.meses === 1 ? "mes" : "meses"}`, right, 22, {
        align: "right",
      });

      // Saludo + cliente
      doc.setTextColor(...colorPrimary);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(`Hola ${form.nombre},`, left, 48);
      doc.setTextColor(...colorMuted);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Gracias por cotizar ADAMIA. Esta es la propuesta para tu empresa:", left, 55);
      doc.setTextColor(...colorPrimary);
      doc.setFont("helvetica", "bold");
      doc.text(form.empresa, left, 61);

      // Caja principal de plan
      doc.setFillColor(...colorSurface);
      doc.setDrawColor(165, 180, 252);
      doc.roundedRect(left, 66, 188, 50, 3, 3, "FD");
      doc.setTextColor(...colorPrimary);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(`Plan ${planNombre}`, left + 5, 75);
      if (seleccion.descuentoPorcentaje > 0) {
        doc.setFillColor(...colorAccent);
        doc.roundedRect(left + 144, 69.5, 39, 7, 2, 2, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.text(`${seleccion.descuentoPorcentaje}% DESCUENTO`, left + 163.5, 74.3, { align: "center" });
      }

      // Tres cuadros informativos para evitar redundancia entre "precio mensual" e "inversión".
      drawInfoCard(left + 5, 84, 56, 20, "Empleados", formatCompact(seleccion.empleados));
      drawInfoCard(left + 66, 84, 56, 20, "Duración", `${seleccion.meses} ${seleccion.meses === 1 ? "mes" : "meses"}`);
      drawInfoCard(left + 127, 84, 56, 20, "Precio mensual", formatCurrencyMXN(seleccion.precioPorMes));

      // Total destacado
      doc.setFillColor(...colorSecondary);
      doc.roundedRect(left, 121, 188, 18, 3, 3, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("TOTAL COTIZADO", left + 5, 129);
      doc.setFontSize(18);
      doc.text(formatCurrencyMXN(seleccion.total), right - 4, 132, { align: "right" });

      // Beneficios incluidos
      doc.setFillColor(...colorSurface);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(left, 146, 188, 52, 3, 3, "FD");
      doc.setFillColor(...colorAccent);
      doc.roundedRect(left + 4, 149, 64, 7, 2, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("BENEFICIOS", left + 36, 153.8, { align: "center" });
      doc.setTextColor(17, 24, 39);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Incluye en tu plan ADAMIA", left + 5, 160);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...colorMuted);
      const beneficios = [
        "Control de asistencias y turnos",
        "Vacaciones, permisos y justificantes",
        "Contratos digitales y expedientes",
        "Reportes y panel de indicadores",
        "Portal de empleados y notificaciones",
        "Soporte y acompañamiento de implementación",
      ];
      beneficios.forEach((item, idx) => {
        const y = 168 + (idx % 3) * 8;
        const x = idx < 3 ? left + 6 : left + 98;
        doc.text(`- ${item}`, x, y);
      });

      // CTA contacto
      doc.setFillColor(...colorPrimary);
      doc.roundedRect(left, 202, 188, 22, 3, 3, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("¿Listo para comenzar?", left + 5, 211);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("WhatsApp: +52 317 388 7959 | Correo: soporte@adamia.mx", left + 5, 218);

      // Footer
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8);
      doc.text("Cotización informativa sujeta a validación comercial y técnica.", left, 268);
      doc.text("Vigencia de la cotización: 30 días naturales desde su emisión.", left, 272);
      doc.text("www.adamia.mx | soporte@adamia.mx | +52 317 388 7959", left, 276);
      doc.text(`ADAMIA by Uniline - ${new Date().getFullYear()}`, right, 276, { align: "right" });

      const fileName = `Cotizacion_ADAMIA_${form.empresa.replace(/\s+/g, "_")}_${planNombre}.pdf`;
      const pdfDataUri = doc.output("datauristring");
      const pdfBase64 = (pdfDataUri.split(",")[1] || "").trim();
      doc.save(fileName);
      try {
        await axios.post("/checador/contrataciones/cotizacion", {
          nombre_cliente: form.nombre.trim(),
          correo: form.correo.trim(),
          telefono: form.telefono.trim(),
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
        });
        showAlert({
          title: "Cotización lista",
          description:
            "Tu cotización se descargó localmente y también fue enviada al correo capturado en el formulario.",
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
        <h1 className="text-4xl font-black md:text-5xl">Cotiza tu plan ADAMIA</h1>
        <p className="mx-auto mt-3 max-w-3xl text-white/90">
          Calcula tu plan y descarga tu PDF de cotización en segundos.
        </p>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 md:px-6">
        <article className="rounded-2xl border border-[var(--adamia-blue)]/20 bg-white p-5 shadow-sm">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div>
              <h2 className="text-xl font-black">¿Cuántos empleados tiene tu empresa?</h2>
              <p className="text-sm text-[var(--adamia-text-secondary)]">Ajusta en incrementos de 5.</p>
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
                onChange={(event) => setEmpleados(Math.max(1, Number(event.target.value || 1)))}
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
            const planName = plan.meses === 1 ? "Mensual" : plan.meses === 6 ? "Semestral" : "Anual";
            return (
              <div
                key={plan.meses}
                className={`rounded-2xl border-2 p-5 shadow-sm transition ${active ? "border-[var(--adamia-blue)] bg-[var(--adamia-blue)]/5" : "border-slate-200 bg-white"
                  }`}
              >
                <h3 className="text-2xl font-black">{planName}</h3>
                <p className="mt-1 text-xs font-semibold uppercase text-[var(--adamia-text-secondary)]">
                  {plan.descuentoPorcentaje}% de descuento
                </p>
                <p className="mt-4 text-sm text-[var(--adamia-text-secondary)]">Precio por mes</p>
                <p className="text-3xl font-black text-[var(--adamia-blue)]">{formatCurrencyMXN(plan.precioPorMes)}</p>
                <p className="mt-1 text-sm text-[var(--adamia-text-secondary)]">
                  Total: <strong>{formatCurrencyMXN(plan.total)}</strong>
                </p>
                <p className="mt-1 text-xs text-[var(--adamia-text-secondary)]">
                  {formatCurrencyMXN(plan.precioPorMes / plan.empleados)} por empleado
                </p>
                <button
                  type="button"
                  onClick={() => setPlanSeleccionado(plan.meses)}
                  className={`mt-4 w-full rounded-lg px-4 py-2 text-sm font-bold ${active
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
          <h2 className="text-xl font-black">Completa tus datos para cotización PDF</h2>
          <form onSubmit={handleSubmit} className="mt-4 grid gap-4 md:grid-cols-2">
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
            <input
              type="tel"
              placeholder="Teléfono (10 dígitos)"
              value={form.telefono}
              onChange={(event) => updateField("telefono", event.target.value.replace(/\D/g, "").slice(0, 10))}
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
            <input
              type="email"
              placeholder="Correo electrónico"
              value={form.correo}
              onChange={(event) => updateField("correo", event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
            <select
              value={form.tipoContratacion}
              onChange={(event) => updateField("tipoContratacion", event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 md:col-span-2"
            >
              <option value="Normal">Tipo de contratación: Normal</option>
              <option value="Prueba">Tipo de contratación: Prueba</option>
            </select>

            {seleccion ? (
              <div className="rounded-xl bg-[var(--adamia-blue)] px-4 py-3 text-white md:col-span-2">
                <p className="text-xs uppercase text-white/80">Resumen seleccionado</p>
                <p className="text-lg font-black">
                  {seleccion.meses === 1 ? "Mensual" : seleccion.meses === 6 ? "Semestral" : "Anual"} -{" "}
                  {formatCurrencyMXN(seleccion.total)}
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
            <h2 className="text-3xl font-black text-[var(--adamia-text-primary)]">Todo lo que incluye tu plan ADAMIA</h2>
            <p className="mt-2 text-sm text-[var(--adamia-text-secondary)]">
              Funcionalidades clave para operar RRHH con orden, visibilidad y control.
            </p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {beneficios.map((item, idx) => (
              <article
                key={item.title}
                className={`rounded-xl border p-4 ${idx % 3 === 0
                    ? "border-emerald-200 bg-emerald-50/50"
                    : idx % 3 === 1
                      ? "border-sky-200 bg-sky-50/50"
                      : "border-violet-200 bg-violet-50/50"
                  }`}
              >
                <div className="text-2xl">{item.icon}</div>
                <h3 className="mt-2 text-base font-black">{item.title}</h3>
                <p className="mt-1 text-sm text-[var(--adamia-text-secondary)]">{item.text}</p>
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
              <p className="mt-1 text-sm text-[var(--adamia-text-secondary)]">{item.text}</p>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-[var(--adamia-blue)]/20 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black">Preguntas frecuentes</h2>
          <div className="mt-4 grid gap-3">
            {faqs.map((faq) => (
              <article key={faq.q} className="rounded-xl bg-slate-50 p-4">
                <h3 className="font-bold">{faq.q}</h3>
                <p className="mt-1 text-sm text-[var(--adamia-text-secondary)]">{faq.a}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)] p-8 text-center text-white shadow-sm">
          <h2 className="text-3xl font-black">¿Listo para activar ADAMIA en tu empresa?</h2>
          <p className="mx-auto mt-2 max-w-3xl text-white/90">
            Recibe tu cotización en PDF, compártela internamente y avanza con una implementación guiada.
          </p>
          <p className="mt-4 text-sm text-white/85">
            Sitio web: <span className="font-bold">www.adamia.mx</span> · Correo: <span className="font-bold">soporte@adamia.mx</span>
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
              className={`text-2xl font-black ${alertaModal.variant === "success"
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
              onClick={() => setAlertaModal((prev) => ({ ...prev, open: false }))}
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
