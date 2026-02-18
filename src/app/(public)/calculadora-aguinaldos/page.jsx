"use client";

import { useMemo, useState } from "react";

function toMoney(value) {
  return Number(value || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function startOfYear(dateStr) {
  const d = new Date(dateStr);
  return new Date(d.getFullYear(), 0, 1);
}

function diffDaysInclusive(from, to) {
  const msPerDay = 1000 * 60 * 60 * 24;
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.floor((b - a) / msPerDay) + 1;
}

export default function CalculadoraAguinaldosPage() {
  const [form, setForm] = useState({
    tipoSalario: "diario",
    salarioDiario: "",
    salarioMensual: "",
    fechaIngreso: "",
    fechaCorte: "",
    diasAguinaldo: "15",
    diasNoLaborados: "0",
  });

  const setField = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const calculo = useMemo(() => {
    const fechaCorte = form.fechaCorte ? new Date(form.fechaCorte) : null;
    const fechaIngreso = form.fechaIngreso ? new Date(form.fechaIngreso) : null;
    const diasAguinaldo = Number(form.diasAguinaldo || 0);
    const diasNoLaborados = Number(form.diasNoLaborados || 0);

    if (!fechaCorte || !fechaIngreso || Number.isNaN(diasAguinaldo)) {
      return null;
    }
    if (fechaIngreso > fechaCorte) {
      return { error: "La fecha de ingreso no puede ser mayor a la fecha de corte." };
    }
    if (diasAguinaldo <= 0) {
      return { error: "Los días de aguinaldo deben ser mayores a 0." };
    }
    if (diasNoLaborados < 0) {
      return { error: "Los días no laborados no pueden ser negativos." };
    }

    const salarioDiario =
      form.tipoSalario === "diario"
        ? Number(form.salarioDiario || 0)
        : Number(form.salarioMensual || 0) / 30;

    if (!Number.isFinite(salarioDiario) || salarioDiario <= 0) {
      return { error: "Captura un salario válido (diario o mensual)." };
    }

    const inicioFiscal = startOfYear(form.fechaCorte);
    const inicioCalculo = fechaIngreso > inicioFiscal ? fechaIngreso : inicioFiscal;
    const diasPeriodo = diffDaysInclusive(inicioCalculo, fechaCorte);
    const diasEfectivos = Math.max(0, diasPeriodo - diasNoLaborados);

    const diasAguinaldoProporcional = (diasAguinaldo * diasEfectivos) / 365;
    const monto = diasAguinaldoProporcional * salarioDiario;

    return {
      salarioDiario,
      inicioFiscal,
      inicioCalculo,
      diasPeriodo,
      diasEfectivos,
      diasAguinaldoProporcional,
      monto,
    };
  }, [form]);

  const clearForm = () => {
    setForm({
      tipoSalario: "diario",
      salarioDiario: "",
      salarioMensual: "",
      fechaIngreso: "",
      fechaCorte: "",
      diasAguinaldo: "15",
      diasNoLaborados: "0",
    });
  };

  return (
    <main className="bg-[var(--adamia-bg-light)] py-12 text-[var(--adamia-text-primary)]">
      <section className="mx-auto grid w-full max-w-7xl gap-8 px-6 lg:grid-cols-[1.3fr_1fr]">
        <article className="rounded-3xl border border-[var(--adamia-blue)]/20 bg-white p-6 shadow-sm md:p-8">
          <div className="inline-flex rounded-full bg-[var(--adamia-blue)]/10 px-4 py-2 text-sm font-bold text-[var(--adamia-blue)]">
            🧮 CALCULADORA DE AGUINALDOS
          </div>
          <h1 className="mt-4 text-3xl font-black md:text-4xl">
            Calcula aguinaldo proporcional
          </h1>
          <p className="mt-2 text-[var(--adamia-text-secondary)]">
            Herramienta pública sin empleados ni backend. Captura los datos y
            obtén un estimado inmediato.
          </p>

          <form className="mt-8 grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-semibold">Tipo de salario</span>
              <select
                value={form.tipoSalario}
                onChange={setField("tipoSalario")}
                className="h-11 rounded-xl border border-[var(--adamia-blue)]/20 bg-white px-3 outline-none focus:border-[var(--adamia-blue)]"
              >
                <option value="diario">Salario diario</option>
                <option value="mensual">Salario mensual</option>
              </select>
            </label>

            {form.tipoSalario === "diario" ? (
              <label className="grid gap-2">
                <span className="text-sm font-semibold">Salario diario (MXN)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.salarioDiario}
                  onChange={setField("salarioDiario")}
                  placeholder="Ej. 400"
                  className="h-11 rounded-xl border border-[var(--adamia-blue)]/20 px-3 outline-none focus:border-[var(--adamia-blue)]"
                />
              </label>
            ) : (
              <label className="grid gap-2">
                <span className="text-sm font-semibold">Salario mensual (MXN)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.salarioMensual}
                  onChange={setField("salarioMensual")}
                  placeholder="Ej. 12000"
                  className="h-11 rounded-xl border border-[var(--adamia-blue)]/20 px-3 outline-none focus:border-[var(--adamia-blue)]"
                />
              </label>
            )}

            <label className="grid gap-2">
              <span className="text-sm font-semibold">Fecha de ingreso</span>
              <input
                type="date"
                value={form.fechaIngreso}
                onChange={setField("fechaIngreso")}
                className="h-11 rounded-xl border border-[var(--adamia-blue)]/20 px-3 outline-none focus:border-[var(--adamia-blue)]"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold">Fecha de corte</span>
              <input
                type="date"
                value={form.fechaCorte}
                onChange={setField("fechaCorte")}
                className="h-11 rounded-xl border border-[var(--adamia-blue)]/20 px-3 outline-none focus:border-[var(--adamia-blue)]"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold">Días de aguinaldo</span>
              <input
                type="number"
                min="1"
                step="0.01"
                value={form.diasAguinaldo}
                onChange={setField("diasAguinaldo")}
                className="h-11 rounded-xl border border-[var(--adamia-blue)]/20 px-3 outline-none focus:border-[var(--adamia-blue)]"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold">
                Días no laborados en el periodo
              </span>
              <input
                type="number"
                min="0"
                step="1"
                value={form.diasNoLaborados}
                onChange={setField("diasNoLaborados")}
                className="h-11 rounded-xl border border-[var(--adamia-blue)]/20 px-3 outline-none focus:border-[var(--adamia-blue)]"
              />
            </label>

            <div className="md:col-span-2 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={clearForm}
                className="rounded-xl border border-[var(--adamia-blue)]/25 px-5 py-2.5 font-semibold text-[var(--adamia-blue)] hover:bg-[var(--adamia-blue)]/5"
              >
                Limpiar
              </button>
            </div>
          </form>
        </article>

        <aside className="space-y-4">
          <article className="rounded-3xl border border-[var(--adamia-blue)]/20 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">Resultado estimado</h2>

            {!calculo ? (
              <p className="mt-3 text-sm text-[var(--adamia-text-secondary)]">
                Captura los datos para ver el cálculo.
              </p>
            ) : calculo.error ? (
              <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                {calculo.error}
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                <ResultRow label="Salario diario usado" value={toMoney(calculo.salarioDiario)} />
                <ResultRow
                  label="Inicio de cálculo"
                  value={calculo.inicioCalculo.toLocaleDateString("es-MX")}
                />
                <ResultRow label="Días del periodo" value={String(calculo.diasPeriodo)} />
                <ResultRow label="Días efectivos" value={String(calculo.diasEfectivos)} />
                <ResultRow
                  label="Días de aguinaldo proporcionales"
                  value={Number(calculo.diasAguinaldoProporcional).toFixed(2)}
                />

                <div className="mt-4 rounded-2xl bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)] p-4 text-white">
                  <p className="text-sm text-white/90">Monto estimado de aguinaldo</p>
                  <p className="mt-1 text-3xl font-black">{toMoney(calculo.monto)}</p>
                </div>
              </div>
            )}
          </article>

          <article className="rounded-3xl border border-[var(--adamia-blue)]/15 bg-white p-6 text-sm text-[var(--adamia-text-secondary)] shadow-sm">
            <p className="font-semibold text-[var(--adamia-text-primary)]">Fórmula usada</p>
            <p className="mt-2">
              Días aguinaldo proporcionales = (Días de aguinaldo × Días efectivos) ÷ 365
            </p>
            <p className="mt-2">
              Monto = Días aguinaldo proporcionales × Salario diario
            </p>
            <p className="mt-3">
              Esta herramienta es informativa y no sustituye asesoría contable o
              legal.
            </p>
          </article>
        </aside>
      </section>
    </main>
  );
}

function ResultRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--adamia-blue)]/10 px-3 py-2">
      <span className="text-sm text-[var(--adamia-text-secondary)]">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
