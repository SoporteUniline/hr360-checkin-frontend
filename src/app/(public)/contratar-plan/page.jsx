"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import axios from "@/lib/axios";

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
    row?.metodo ||
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
  const normalized = cleaned.includes(",") && !cleaned.includes(".") ? cleaned.replace(",", ".") : cleaned;
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

function getPriceFromPlan(row, months, employees) {
  const possible = [row?.precio_mensual, row?.precio, row?.costo_mensual, row?.monto_mensual];
  for (const value of possible) {
    const n = parseFlexibleNumber(value);
    if (Number.isFinite(n) && n > 0) return n;
  }

  // Fallback por columnas adicionales frecuentes
  const extraPossible = [row?.precio_por_mes, row?.precio_mes, row?.mensual];
  for (const value of extraPossible) {
    const n = parseFlexibleNumber(value);
    if (Number.isFinite(n) && n > 0) return n;
  }

  // Heurística flexible: cualquier columna que parezca precio/costo/monto/mensual
  for (const [key, rawValue] of Object.entries(row || {})) {
    const keyLc = key.toLowerCase();
    const looksLikePrice =
      /(precio|costo|monto|mensual|tarifa)/.test(keyLc) &&
      !/(id|descuento|porcentaje|max|min|usuarios|empleados|meses|anio|año)/.test(keyLc);
    if (!looksLikePrice) continue;
    const n = parseFlexibleNumber(rawValue);
    if (Number.isFinite(n) && n > 0) return n;
  }

  // Fallback por columnas por duración (1/6/12 meses)
  const byMonths = {
    1: [row?.precio_1_mes, row?.precio_1mes, row?.monto_1_mes, row?.mes_1],
    6: [row?.precio_6_meses, row?.precio_6meses, row?.monto_6_meses, row?.mes_6],
    12: [row?.precio_12_meses, row?.precio_12meses, row?.monto_12_meses, row?.mes_12],
  };
  for (const value of byMonths[months] || []) {
    const n = parseFlexibleNumber(value);
    if (Number.isFinite(n) && n > 0) return n;
  }

  // Fallback por precio unitario
  const unit =
    row?.precio_por_empleado ?? row?.costo_por_empleado ?? row?.precio_unitario ?? null;
  const unitNum = parseFlexibleNumber(unit);
  const employeesNum = Number(employees);
  if (Number.isFinite(unitNum) && unitNum > 0 && Number.isFinite(employeesNum) && employeesNum > 0) {
    return unitNum * employeesNum;
  }

  return null;
}

function getMaxUsersFromPlan(row) {
  const candidates = [row?.usuarios_max, row?.empleados_max, row?.max_usuarios, row?.empleados];
  for (const value of candidates) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return Number.POSITIVE_INFINITY;
}

function getPlanDescription(row) {
  return (
    row?.descripcion ||
    row?.detalle ||
    row?.beneficios ||
    row?.caracteristicas ||
    "Plan empresarial para gestion integral de talento en ADAMIA."
  );
}

function getPlanEmployeesRange(row, allPlans) {
  const currentMax = getMaxUsersFromPlan(row);
  if (!Number.isFinite(currentMax)) return "Plan sin límite definido";

  const sorted = [...allPlans].sort((a, b) => getMaxUsersFromPlan(a) - getMaxUsersFromPlan(b));
  const currentIndex = sorted.findIndex((plan) => Number(plan.id) === Number(row.id));
  if (currentIndex === -1) return `Hasta ${currentMax} empleados`;

  const prev = sorted[currentIndex - 1];
  const prevMax = prev ? getMaxUsersFromPlan(prev) : 0;
  const min = prevMax + 1;

  if (currentMax >= 99999 || currentMax === Number.POSITIVE_INFINITY) {
    return `${min}+ empleados`;
  }
  if (min === currentMax) return `${min} empleado${min > 1 ? "s" : ""}`;
  return `${min} - ${currentMax} empleados`;
}

function formatCurrencyMXN(value) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value);
}

export default function ContratarPlanPage() {
  const [catalogos, setCatalogos] = useState({ tipo_planes: [], metodos_pago: [] });
  const [loadingCatalogos, setLoadingCatalogos] = useState(true);
  const [errorCatalogos, setErrorCatalogos] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [stripeLink, setStripeLink] = useState("");

  const [form, setForm] = useState({
    nombre_cliente: "",
    correo: "",
    telefono: "",
    direccion_cliente: "",
    rfc: "",
    empleados: "",
    tipo_plan_id: "",
    meses_contratados: "1",
    metodo_pago_id: "",
    notas: "",
    demo: "No",
  });

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
        });
      } catch (error) {
        if (!mounted) return;
        setErrorCatalogos("No fue posible cargar los catálogos. Intenta nuevamente.");
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
    if (!Number.isFinite(employees) || employees < 1 || !catalogos.tipo_planes.length) return;

    const sorted = [...catalogos.tipo_planes].sort(
      (a, b) => getMaxUsersFromPlan(a) - getMaxUsersFromPlan(b)
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
      catalogos.tipo_planes.find((plan) => Number(getPlanId(plan)) === Number(form.tipo_plan_id)) ||
      null,
    [catalogos.tipo_planes, form.tipo_plan_id]
  );

  const estimado = useMemo(() => {
    const months = Number(form.meses_contratados);
    const employees = Number(form.empleados);
    const monthly = getPriceFromPlan(selectedPlan, months, employees);
    if (!monthly || ![1, 6, 12].includes(months)) return null;
    const descuento = months === 6 ? 5 : months === 12 ? 10 : 0;
    const subtotal = monthly * months;
    const total = subtotal - subtotal * (descuento / 100);
    return { monthly, subtotal, descuento, total };
  }, [selectedPlan, form.meses_contratados, form.empleados]);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");
    setSubmitSuccess("");
    setStripeLink("");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
    const phoneRegex = /^\+?[0-9\s\-()]{10,20}$/;
    const rfcRegex = /^([A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3})$/i;

    if (!form.nombre_cliente || !form.correo || !form.telefono) {
      setSubmitError("Completa nombre, correo y teléfono.");
      return;
    }
    if (!emailRegex.test(form.correo.trim())) {
      setSubmitError("El correo no tiene un formato válido.");
      return;
    }
    if (!phoneRegex.test(form.telefono.trim())) {
      setSubmitError("El teléfono no tiene un formato válido.");
      return;
    }
    if (form.rfc && !rfcRegex.test(form.rfc.trim().toUpperCase())) {
      setSubmitError("El RFC no tiene un formato válido.");
      return;
    }
    if (!form.empleados || Number(form.empleados) < 1) {
      setSubmitError("Ingresa un número de empleados válido.");
      return;
    }
    if (!form.tipo_plan_id) {
      setSubmitError("Selecciona un tipo de plan.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...form,
        empleados: Number(form.empleados),
        tipo_plan_id: Number(form.tipo_plan_id),
        meses_contratados: Number(form.meses_contratados),
        metodo_pago_id: form.metodo_pago_id ? Number(form.metodo_pago_id) : null,
        precio_por_mes: estimado?.monthly ?? null,
      };

      const response = await axios.post("/checador/contrataciones/publica", payload);
      setSubmitSuccess(
        `¡Listo! Tu contratación fue registrada con folio ${response?.data?.data?.contrato_id ?? ""}.`
      );
      if (response?.data?.data?.enlace_pago_stripe) {
        setStripeLink(response.data.data.enlace_pago_stripe);
      }
      setForm((prev) => ({
        ...prev,
        notas: "",
      }));
    } catch (error) {
      setSubmitError(error?.response?.data?.message || "No fue posible registrar la contratación.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="bg-[var(--adamia-bg-light)] text-[var(--adamia-text-primary)]">
      <section className="bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)] px-6 py-20 text-white">
        <div className="mx-auto w-full max-w-7xl text-center">
          <span className="inline-flex rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-bold">
            CONTRATAR PLAN
          </span>
          <h1 className="mt-5 text-4xl font-black md:text-6xl">
            Activa ADAMIA para tu empresa
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-lg text-white/90">
            Completa este formulario y registramos tu contratación en minutos.
          </p>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <form
            onSubmit={onSubmit}
            className="rounded-3xl border border-[var(--adamia-blue)]/15 bg-white p-6 shadow-sm md:p-8"
          >
            <h2 className="text-2xl font-black">Datos de contratación</h2>
            <p className="mt-2 text-sm text-[var(--adamia-text-secondary)]">
              Esta información se guarda en la tabla <strong>Contrataciones</strong>.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Input name="nombre_cliente" label="Nombre del cliente" value={form.nombre_cliente} onChange={onChange} />
              <Input name="correo" label="Correo" type="email" value={form.correo} onChange={onChange} />
              <Input name="telefono" label="Teléfono" value={form.telefono} onChange={onChange} />
              <Input name="rfc" label="RFC" value={form.rfc} onChange={onChange} />
              <Input
                name="empleados"
                label="Empleados"
                type="number"
                min={1}
                value={form.empleados}
                onChange={onChange}
              />
              <Select
                name="meses_contratados"
                label="Meses contratados"
                value={form.meses_contratados}
                onChange={onChange}
                options={[
                  { value: "1", label: "1 mes" },
                  { value: "6", label: "6 meses (5% descuento)" },
                  { value: "12", label: "12 meses (10% descuento)" },
                ]}
              />
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold">Plan</label>
                <select
                  name="tipo_plan_id"
                  value={form.tipo_plan_id}
                  onChange={onChange}
                  className="w-full rounded-xl border border-[var(--adamia-blue)]/20 bg-white px-4 py-3 outline-none ring-[var(--adamia-blue)]/30 focus:ring-2"
                  disabled={loadingCatalogos}
                >
                  <option value="">Selecciona un plan</option>
                  {catalogos.tipo_planes.map((plan) => {
                    const planId = getPlanId(plan);
                    const planLabel = getLabelFromRow(plan, `Plan ${planId ?? "-"}`);
                    const price = getPriceFromPlan(plan, Number(form.meses_contratados), Number(form.empleados));
                    return (
                      <option key={planId ?? `${planLabel}-plan`} value={planId ?? ""}>
                        {planLabel} {price ? `- ${formatCurrencyMXN(price)}/mes` : ""}
                      </option>
                    );
                  })}
                </select>
                {selectedPlan ? (
                  <div className="mt-3 rounded-xl border border-[var(--adamia-blue)]/15 bg-[var(--adamia-bg-light)] p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-[var(--adamia-blue)]">
                      Rango del plan seleccionado
                    </p>
                    <p className="mt-1 text-sm text-[var(--adamia-text-secondary)]">
                      {getPlanEmployeesRange(selectedPlan, catalogos.tipo_planes)}
                    </p>
                    <p className="mt-2 text-xs text-[var(--adamia-text-secondary)]">
                      {getPlanDescription(selectedPlan)}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold">Método de pago</label>
                <select
                  name="metodo_pago_id"
                  value={form.metodo_pago_id}
                  onChange={onChange}
                  className="w-full rounded-xl border border-[var(--adamia-blue)]/20 bg-white px-4 py-3 outline-none ring-[var(--adamia-blue)]/30 focus:ring-2"
                  disabled={loadingCatalogos}
                >
                  <option value="">Selecciona un método (opcional)</option>
                  {catalogos.metodos_pago.map((item) => (
                    <option key={item.id} value={item.id}>
                      {getLabelFromRow(item, `Método ${item.id}`)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <Input
                  name="direccion_cliente"
                  label="Dirección"
                  value={form.direccion_cliente}
                  onChange={onChange}
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold">Notas</label>
                <textarea
                  name="notas"
                  value={form.notas}
                  onChange={onChange}
                  rows={4}
                  className="w-full rounded-xl border border-[var(--adamia-blue)]/20 bg-white px-4 py-3 outline-none ring-[var(--adamia-blue)]/30 focus:ring-2"
                  placeholder="Comentarios adicionales para ventas o facturación"
                />
              </div>
            </div>

            {submitError ? <p className="mt-4 text-sm font-semibold text-red-600">{submitError}</p> : null}
            {submitSuccess ? <p className="mt-4 text-sm font-semibold text-emerald-700">{submitSuccess}</p> : null}
            {stripeLink ? (
              <a
                href={stripeLink}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white"
              >
                Ir a pagar con Stripe →
              </a>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={submitting || loadingCatalogos}
                className="inline-flex rounded-xl bg-gradient-to-r from-[var(--adamia-blue)] to-[var(--adamia-purple)] px-6 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? "Guardando..." : "Guardar contratación"}
              </button>
              <a
                href="https://wa.me/523171035768?text=Hola,%20quiero%20contratar%20ADAMIA"
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-xl border border-[var(--adamia-blue)]/25 bg-white px-6 py-3 text-sm font-bold text-[var(--adamia-blue)]"
              >
                Hablar por WhatsApp
              </a>
            </div>
          </form>

          <aside className="space-y-6">
            <article className="rounded-3xl border border-[var(--adamia-blue)]/15 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-black">¿Necesitas ayuda?</h3>
              <p className="mt-2 text-sm text-[var(--adamia-text-secondary)]">
                Nuestro equipo puede apoyarte para definir plan, implementación y activación inicial.
              </p>
              <div className="mt-4">
                <Link
                  href="/cotiza"
                  className="text-sm font-bold text-[var(--adamia-blue)] hover:underline"
                >
                  Ver tabla de precios →
                </Link>
              </div>
            </article>

            <article className="rounded-3xl border-2 border-[var(--adamia-blue)]/30 bg-gradient-to-r from-white via-[var(--adamia-bg-light)] to-white p-6 shadow-xl">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-black md:text-2xl">Resumen estimado</h3>
                <span className="rounded-full bg-[var(--adamia-blue)]/10 px-3 py-1 text-xs font-bold text-[var(--adamia-blue)]">
                  Cotización en tiempo real
                </span>
              </div>
              {estimado ? (
                <div className="mt-3 space-y-2 text-sm">
                  <Row label="Precio mensual" value={formatCurrencyMXN(estimado.monthly)} />
                  <Row label="Subtotal" value={formatCurrencyMXN(estimado.subtotal)} />
                  <Row label="Descuento" value={`${estimado.descuento}%`} />
                  <Row label="Total a pagar" value={formatCurrencyMXN(estimado.total)} highlight />
                </div>
              ) : (
                <p className="mt-2 rounded-lg border border-dashed border-[var(--adamia-blue)]/35 bg-white px-3 py-2 text-sm font-medium text-[var(--adamia-text-secondary)]">
                  Completa <strong>empleados</strong> y <strong>meses contratados</strong> para ver el total.
                </p>
              )}
            </article>

            <article className="rounded-3xl border border-[var(--adamia-blue)]/15 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-black">Beneficios del software</h3>
              <p className="mt-2 text-sm text-[var(--adamia-text-secondary)]">
                Todo lo que incluye ADAMIA para mejorar control, cumplimiento y productividad.
              </p>
              <div className="mt-4 space-y-2">
                {[
                  "Reloj checador con reconocimiento facial + GPS anti-fraude",
                  "Dashboard en tiempo real con indicadores de asistencia y operación",
                  "Gestión de contratos, vigencias y alertas automáticas",
                  "Control de permisos, vacaciones y reportes listos para nómina",
                  "Notificaciones inteligentes por correo, WhatsApp y push",
                  "Plataforma web empresarial con soporte y actualizaciones continuas",
                ].map((benefit) => (
                  <div
                    key={benefit}
                    className="flex items-start gap-3 rounded-lg bg-[var(--adamia-bg-light)] px-3 py-2"
                  >
                    <span className="mt-1 inline-block h-2.5 w-2.5 rounded-full bg-[var(--adamia-blue)]" />
                    <p className="text-sm text-[var(--adamia-text-secondary)]">{benefit}</p>
                  </div>
                ))}
              </div>
            </article>

            {errorCatalogos ? (
              <article className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {errorCatalogos}
              </article>
            ) : null}
          </aside>
        </div>
      </section>
    </main>
  );
}

function Input({ label, ...props }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold">{label}</label>
      <input
        {...props}
        className="w-full rounded-xl border border-[var(--adamia-blue)]/20 bg-white px-4 py-3 outline-none ring-[var(--adamia-blue)]/30 focus:ring-2"
      />
    </div>
  );
}

function Select({ label, options, ...props }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold">{label}</label>
      <select
        {...props}
        className="w-full rounded-xl border border-[var(--adamia-blue)]/20 bg-white px-4 py-3 outline-none ring-[var(--adamia-blue)]/30 focus:ring-2"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Row({ label, value, highlight = false }) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg px-3 py-2 ${
        highlight
          ? "border border-[var(--adamia-blue)]/25 bg-[var(--adamia-blue)]/10"
          : "bg-white border border-slate-200"
      }`}
    >
      <span className="text-[var(--adamia-text-secondary)]">{label}</span>
      <span className={highlight ? "text-lg font-black text-[var(--adamia-blue)]" : "font-bold"}>{value}</span>
    </div>
  );
}
