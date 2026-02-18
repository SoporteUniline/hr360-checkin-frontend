"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import axios from "@/lib/axios";

// Tabla de precios tomada de la referencia entregada por negocio y presentada
// con tokens visuales ADAMIA para mantener consistencia de marca.

const fallbackPricingRanges = [
  { range: "1 - 2 empleados", min: 1, max: 2, monthly: "$580", perEmployee: "$290", annual: "$696" },
  { range: "6 - 10 empleados", min: 6, max: 10, monthly: "$1,137", perEmployee: "~$142", annual: "$1,364" },
  {
    range: "11 - 15 empleados",
    min: 11,
    max: 15,
    monthly: "$1,671",
    perEmployee: "~$128",
    annual: "$2,005",
    popular: true,
  },
  { range: "16 - 20 empleados", min: 16, max: 20, monthly: "$2,184", perEmployee: "~$120", annual: "$2,621" },
  { range: "21 - 25 empleados", min: 21, max: 25, monthly: "$2,675", perEmployee: "~$114", annual: "$3,210" },
  { range: "26 - 30 empleados", min: 26, max: 30, monthly: "$3,146", perEmployee: "~$110", annual: "$3,775" },
  { range: "31 - 35 empleados", min: 31, max: 35, monthly: "$3,597", perEmployee: "~$107", annual: "$4,316" },
  { range: "36 - 40 empleados", min: 36, max: 40, monthly: "$4,028", perEmployee: "~$105", annual: "$4,834" },
  { range: "41 - 45 empleados", min: 41, max: 45, monthly: "$4,441", perEmployee: "~$103", annual: "$5,329" },
  { range: "46 - 50 empleados", min: 46, max: 50, monthly: "$4,836", perEmployee: "~$100", annual: "$5,803" },
  { range: "51 - 70 empleados", min: 51, max: 70, monthly: "$6,634", perEmployee: "~$108", annual: "$7,961" },
  { range: "71 - 90 empleados", min: 71, max: 90, monthly: "$8,358", perEmployee: "~$104", annual: "$10,030" },
  { range: "91 - 100 empleados", min: 91, max: 100, monthly: "$9,102", perEmployee: "~$96", annual: "$10,922" },
  {
    range: "101+ empleados",
    min: 101,
    max: null,
    monthly: "$91/empleado",
    perEmployee: "$91",
    annual: "Descuento especial",
    enterprise: true,
  },
];

function formatCurrencyMXN(value) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(
    value
  );
}

function resolvePlanByEmployees(employees, pricingRanges) {
  const exactPlan = pricingRanges.find(
    (plan) => employees >= plan.min && (plan.max === null || employees <= plan.max)
  );
  if (exactPlan) return { plan: exactPlan, exact: true };

  // Si el numero cae en un hueco de rangos, mostramos el siguiente disponible.
  const nextPlan = pricingRanges.find((plan) => employees < plan.min);
  if (nextPlan) return { plan: nextPlan, exact: false };

  return { plan: pricingRanges[pricingRanges.length - 1], exact: false };
}

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;

  // Permite valores como "$1,671.00", "1671", "91/empleado"
  const normalized = value.replace(/[^\d.-]/g, "");
  if (!normalized) return null;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function getFirstValue(source, keys) {
  for (const key of keys) {
    if (source?.[key] !== undefined && source?.[key] !== null && source?.[key] !== "") {
      return source[key];
    }
  }
  return null;
}

function transformTipoPlanesToPricingRanges(tipoPlanes = []) {
  if (!Array.isArray(tipoPlanes) || !tipoPlanes.length) return [];

  const base = tipoPlanes
    .map((plan) => {
      const min = toNumber(
        getFirstValue(plan, [
          "empleados_min",
          "usuarios_min",
          "min_usuarios",
          "minimo_empleados",
          "rango_min",
          "desde",
        ])
      );
      const max = toNumber(
        getFirstValue(plan, [
          "empleados_max",
          "usuarios_max",
          "max_usuarios",
          "maximo_empleados",
          "rango_max",
          "hasta",
        ])
      );
      const monthlyNumber = toNumber(
        getFirstValue(plan, [
          "precio_mensual",
          "precio",
          "precio_base",
          "monto_mensual",
          "costo_mensual",
        ])
      );
      const perEmployeeNumber = toNumber(
        getFirstValue(plan, ["precio_por_empleado", "costo_por_empleado", "precio_unitario"])
      );
      const annualRaw = getFirstValue(plan, ["precio_anual", "anual", "precio_12_meses", "ahorro_anual"]);
      const annualNumber = toNumber(annualRaw);
      const label =
        getFirstValue(plan, ["nombre", "plan", "descripcion"]) ||
        `Plan ${getFirstValue(plan, ["id", "id_tipo_plan"]) ?? ""}`.trim();

      return {
        raw: plan,
        min: Number.isFinite(min) ? min : null,
        max: Number.isFinite(max) && max > 0 ? max : null,
        monthlyNumber: Number.isFinite(monthlyNumber) ? monthlyNumber : null,
        perEmployeeNumber: Number.isFinite(perEmployeeNumber) ? perEmployeeNumber : null,
        annualNumber: Number.isFinite(annualNumber) ? annualNumber : null,
        label,
      };
    })
    .filter((item) => item.monthlyNumber !== null);

  if (!base.length) return [];

  const sorted = [...base].sort((a, b) => {
    const aMax = a.max ?? Number.MAX_SAFE_INTEGER;
    const bMax = b.max ?? Number.MAX_SAFE_INTEGER;
    return aMax - bMax;
  });

  return sorted.map((item, index) => {
    const inferredMin = item.min ?? (index === 0 ? 1 : (sorted[index - 1].max ?? 0) + 1);
    const monthly = formatCurrencyMXN(item.monthlyNumber);
    const perEmployeeValue =
      item.perEmployeeNumber ??
      (item.max && item.max > 0 ? Math.round(item.monthlyNumber / item.max) : item.monthlyNumber);

    return {
      id: getFirstValue(item.raw, ["id", "id_tipo_plan"]) ?? `${inferredMin}-${item.max ?? "plus"}`,
      range: item.max ? `${inferredMin} - ${item.max} empleados` : `${inferredMin}+ empleados`,
      min: inferredMin,
      max: item.max,
      monthly,
      perEmployee: `~${formatCurrencyMXN(perEmployeeValue)}`,
      annual: item.annualNumber ? formatCurrencyMXN(item.annualNumber) : "Consultar",
      enterprise: item.max === null,
      sourceName: item.label,
    };
  });
}

const includedItems = [
  "Apps moviles ilimitadas (Admin + Empleados)",
  "Reconocimiento facial + GPS anti-fraude",
  "Almacenamiento ilimitado en la nube",
  "Soporte por chat y acompanamiento inicial",
  "Actualizaciones automaticas sin costo extra",
  "Calculadoras LFT Mexico",
  "Reportes y dashboards en tiempo real",
  "Backups automaticos diarios",
  "Usuarios administrativos ilimitados",
];

const faqs = [
  {
    q: "Que pasa despues de los 7 dias gratis?",
    a: "Si decides continuar, activamos tu plan seleccionado. Si no continuas, la cuenta queda inactiva sin cargo. No solicitamos tarjeta para iniciar.",
  },
  {
    q: "Puedo cambiar de plan despues?",
    a: "Si. Puedes aumentar o reducir tu plan cuando lo necesites y se ajusta la facturacion de forma proporcional.",
  },
  {
    q: "Hay descuentos por pago anual?",
    a: "Si. Los planes de 6 meses aplican 5% de descuento y los de 12 meses aplican 10%.",
  },
  {
    q: "Hay costo de implementacion?",
    a: "No. El setup inicial no tiene costo y nuestro equipo te acompana sin cargos adicionales.",
  },
  {
    q: "Que metodos de pago aceptan?",
    a: "Transferencia bancaria, deposito y pago con tarjeta. Emitimos factura electronica.",
  },
];

export default function CotizaPage() {
  const [dbPlans, setDbPlans] = useState([]);
  const [dbPlansLoaded, setDbPlansLoaded] = useState(false);
  const [employeesInput, setEmployeesInput] = useState("");
  const [calculated, setCalculated] = useState(null);
  const [error, setError] = useState("");
  const pricingRanges = useMemo(() => {
    const transformed = transformTipoPlanesToPricingRanges(dbPlans);
    return transformed.length ? transformed : fallbackPricingRanges;
  }, [dbPlans]);

  useEffect(() => {
    let isMounted = true;

    const fetchTipoPlanes = async () => {
      try {
        const response = await axios.get("/checador/tipo-planes");
        if (!isMounted) return;
        setDbPlans(response?.data?.tipo_planes ?? []);
      } catch (fetchError) {
        console.error("No se pudieron cargar los planes desde Tipo_Planes:", fetchError);
      } finally {
        if (isMounted) setDbPlansLoaded(true);
      }
    };

    fetchTipoPlanes();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCalculate = (event) => {
    event.preventDefault();
    const employees = Number.parseInt(employeesInput, 10);

    if (!Number.isInteger(employees) || employees < 1) {
      setCalculated(null);
      setError("Ingresa un numero de empleados valido (mayor a 0).");
      return;
    }

    setError("");
    const result = resolvePlanByEmployees(employees, pricingRanges);

    if (result.plan.enterprise) {
      const monthlyEstimate = employees * 91;
      setCalculated({
        ...result,
        employees,
        monthlyEstimate,
        monthlyEstimateText: formatCurrencyMXN(monthlyEstimate),
      });
      return;
    }

    setCalculated({ ...result, employees });
  };

  return (
    <main className="bg-[var(--adamia-bg-light)] text-[var(--adamia-text-primary)]">
      {/* Hero principal de precios */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)] py-20 text-white">
        <div className="absolute -left-20 top-6 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative mx-auto w-full max-w-7xl px-6 text-center">
          <span className="inline-flex rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-bold">
            PRECIOS TRANSPARENTES
          </span>
          <h1 className="mt-6 text-4xl font-black leading-tight md:text-6xl">
            Planes diseñados para
            <br />
            empresas de todos los tamaños
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-lg text-white/90 md:text-xl">
            Sin costos ocultos, sin sorpresas y con todas las funcionalidades desde el primer dia.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-semibold">
            <span>7 dias de prueba gratis</span>
            <span className="h-1 w-1 rounded-full bg-white/70" />
            <span>Sin tarjeta de credito</span>
          </div>
        </div>
      </section>

      <section className="px-6 py-16 md:py-20">
        <div className="mx-auto w-full max-w-4xl rounded-3xl border border-[var(--adamia-blue)]/25 bg-white p-8 shadow-xl md:p-10">
          <div className="text-center">
            <h2 className="text-3xl font-black">Calcula tu inversion mensual</h2>
            <p className="mt-2 text-[var(--adamia-text-secondary)]">
              Ingresa el numero de colaboradores y te mostramos el rango ideal.
            </p>
          </div>
          <form className="mx-auto mt-7 max-w-lg" onSubmit={handleCalculate}>
            <label htmlFor="employees" className="mb-3 block text-center text-sm font-bold">
              Cuantos empleados tienes?
            </label>
            <input
              id="employees"
              type="number"
              min={1}
              placeholder="25"
              value={employeesInput}
              onChange={(event) => setEmployeesInput(event.target.value)}
              className="w-full rounded-2xl border-2 border-[var(--adamia-blue)]/35 px-6 py-5 text-center text-4xl font-black outline-none ring-[var(--adamia-blue)]/30 transition focus:ring-4"
            />
            <div className="mt-5 text-center">
              <button
                type="submit"
                className="inline-flex rounded-xl bg-gradient-to-r from-[var(--adamia-blue)] to-[var(--adamia-purple)] px-8 py-3 font-bold text-white transition hover:opacity-90"
              >
                Calcular
              </button>
            </div>

            {error ? <p className="mt-4 text-center text-sm font-semibold text-red-600">{error}</p> : null}

            {calculated ? (
              <div className="mt-6 rounded-2xl border border-[var(--adamia-blue)]/20 bg-[var(--adamia-bg-light)] p-6 text-center">
                <p className="text-sm font-semibold text-[var(--adamia-text-secondary)]">
                  {calculated.exact
                    ? `Plan sugerido para ${calculated.employees} empleados`
                    : `Cotizacion aproximada para ${calculated.employees} empleados`}
                </p>
                <h3 className="mt-2 text-2xl font-black text-[var(--adamia-blue)]">{calculated.plan.range}</h3>
                {"sourceName" in calculated.plan && calculated.plan.sourceName ? (
                  <p className="mt-1 text-xs text-[var(--adamia-text-secondary)]">
                    Tipo de plan: {calculated.plan.sourceName}
                  </p>
                ) : null}
                <p className="mt-3 text-sm text-[var(--adamia-text-secondary)]">Precio mensual estimado</p>
                <p className="mt-1 text-4xl font-black text-[var(--adamia-purple)]">
                  {calculated.plan.enterprise ? calculated.monthlyEstimateText : calculated.plan.monthly}
                </p>
                <p className="mt-2 text-sm text-[var(--adamia-text-secondary)]">
                  Precio por empleado: {calculated.plan.perEmployee}
                </p>
                {!calculated.exact ? (
                  <p className="mt-3 text-xs font-medium text-amber-700">
                    Este monto usa el siguiente rango disponible para darte una referencia rapida.
                  </p>
                ) : null}
                <Link
                  href="/contratar-plan"
                  className="mt-5 inline-flex rounded-xl bg-gradient-to-r from-[var(--adamia-blue)] to-[var(--adamia-purple)] px-7 py-3 text-sm font-black text-white transition hover:opacity-90"
                >
                  Ir a contratar plan →
                </Link>
              </div>
            ) : null}
          </form>
          <p className="mt-4 text-center text-xs text-[var(--adamia-text-secondary)]">
            {dbPlansLoaded && dbPlans.length
              ? ""
              : "Mostrando precios de referencia mientras se obtiene Tipo_Planes."}
          </p>
        </div>
      </section>

      {/* Seccion ancla para el submenu "Cotiza -> Precios" */}
      <section id="precios" className="px-6 pb-16">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-8 text-center">
            <span className="inline-flex rounded-full bg-[var(--adamia-blue)]/10 px-4 py-2 text-xs font-bold text-[var(--adamia-blue)]">
              TODOS NUESTROS PLANES
            </span>
            <h2 className="mt-4 text-4xl font-black">Elige el plan perfecto para tu empresa</h2>
            <p className="mt-2 text-[var(--adamia-text-secondary)]">
              Todos los planes incluyen las mismas funcionalidades, sin restricciones.
            </p>
          </div>

          <div className="overflow-hidden rounded-3xl border border-[var(--adamia-blue)]/15 bg-white shadow-lg">
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full">
                <thead className="bg-gradient-to-r from-[var(--adamia-blue)] to-[var(--adamia-purple)] text-white">
                  <tr>
                    <th className="px-5 py-4 text-left text-sm font-bold">Rango de empleados</th>
                    <th className="px-5 py-4 text-center text-sm font-bold">Precio mensual</th>
                    <th className="px-5 py-4 text-center text-sm font-bold">Precio por empleado</th>
                    <th className="px-5 py-4 text-center text-sm font-bold">Ahorro anual (-10%)</th>
                    <th className="px-5 py-4 text-center text-sm font-bold">Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {pricingRanges.map((row) => (
                    <tr
                      key={row.range}
                      className={`border-b border-slate-100 ${row.popular ? "bg-[var(--adamia-blue)]/5" : "bg-white"}`}
                    >
                      <td className="px-5 py-4 text-sm font-bold">
                        <div className="flex items-center gap-2">
                          <span>{row.range}</span>
                          {row.popular ? (
                            <span className="rounded-full bg-orange-500 px-2 py-1 text-[10px] font-black text-white">
                              POPULAR
                            </span>
                          ) : null}
                          {row.enterprise ? (
                            <span className="rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-black text-white">
                              EMPRESARIAL
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center text-2xl font-black text-[var(--adamia-blue)]">
                        {row.monthly}
                      </td>
                      <td className="px-5 py-4 text-center text-sm text-[var(--adamia-text-secondary)]">
                        {row.perEmployee}
                      </td>
                      <td className="px-5 py-4 text-center text-sm font-bold text-emerald-600">
                        {row.annual}
                      </td>
                      <td className="px-5 py-4 text-center">
                        {row.enterprise ? (
                          <a
                            href="mailto:soporte@adamia.mx"
                            className="inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white"
                          >
                            Contactar
                          </a>
                        ) : (
                          <Link
                            href="/contratar-plan"
                            className="inline-flex rounded-lg bg-[var(--adamia-blue)] px-4 py-2 text-xs font-bold text-white"
                          >
                            Contratar
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Beneficios incluidos en todos los planes */}
      <section className="px-6 pb-16">
        <div className="mx-auto w-full max-w-7xl rounded-3xl border border-[var(--adamia-blue)]/10 bg-white p-8 md:p-10">
          <h2 className="text-center text-3xl font-black md:text-4xl">Cada plan incluye</h2>
          <p className="mt-2 text-center text-[var(--adamia-text-secondary)]">
            Sin costos ocultos y con soporte para crecer contigo.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {includedItems.map((item) => (
              <article
                key={item}
                className="rounded-xl border border-[var(--adamia-blue)]/10 bg-[var(--adamia-bg-light)] p-4"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-1 inline-block h-2.5 w-2.5 rounded-full bg-[var(--adamia-blue)]" />
                  <p className="text-sm font-medium">{item}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-16">
        <div className="mx-auto w-full max-w-4xl rounded-3xl border border-[var(--adamia-blue)]/10 bg-white p-8 md:p-10">
          <h2 className="text-center text-3xl font-black">Preguntas frecuentes sobre precios</h2>
          <div className="mt-7 space-y-4">
            {faqs.map((faq) => (
              <article key={faq.q} className="rounded-2xl bg-[var(--adamia-bg-light)] p-5">
                <h3 className="font-bold">{faq.q}</h3>
                <p className="mt-2 text-sm text-[var(--adamia-text-secondary)]">{faq.a}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)] px-6 py-20 text-white">
        <div className="mx-auto w-full max-w-5xl text-center">
          <h2 className="text-4xl font-black md:text-5xl">Comienza tu prueba gratuita hoy</h2>
          <p className="mx-auto mt-4 max-w-3xl text-white/90">
            Sin tarjeta de credito, sin compromiso y con setup rapido.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/contratar-plan"
              className="inline-flex rounded-xl bg-white px-8 py-3 text-sm font-black text-[var(--adamia-blue)]"
            >
              Comenzar prueba gratis →
            </Link>
            <Link
              href="/quienes-somos"
              className="inline-flex rounded-xl border border-white/40 bg-white/10 px-8 py-3 text-sm font-black text-white"
            >
              Hablar con ventas
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
