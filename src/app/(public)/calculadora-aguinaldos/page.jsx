"use client";

import { useEffect, useState } from "react";
import { calculosLftApi } from "@/lib/calculosLftApi";
import {
  NOTA_BRUTO,
  calculadoraLista,
  cuerpoCalculadora,
} from "@/lib/calculos/calculosLft.mjs";

function toMoney(value) {
  return Number(value || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const fechaCorta = (iso) => (iso ? iso.split("-").reverse().join("/") : "");

const FORM_INICIAL = {
  tipoSalario: "diario",
  salario: "",
  fechaIngreso: "",
  fechaCorte: "",
  diasAguinaldo: "15",
  diasNoLaborados: "0",
};

const ETIQUETA_SALARIO = {
  diario: "Salario diario (MXN)",
  semanal: "Salario semanal (MXN)",
  quincenal: "Salario quincenal (MXN)",
  mensual: "Salario mensual (MXN)",
};

// (27/11/2026) La calculadora pública ya no hace cuentas en el navegador: el servidor calcula con el MISMO motor de la
// LFT que usan el panel de Aguinaldos, el finiquito y sus PDF (mensual ÷ 30, días inclusive, 366 en bisiesto).
export default function CalculadoraAguinaldosPage() {
  const [form, setForm] = useState(FORM_INICIAL);
  const [estado, setEstado] = useState({ cargando: false, calculo: null, error: "" });

  const setField = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  useEffect(() => {
    if (!calculadoraLista(form)) {
      setEstado({ cargando: false, calculo: null, error: "" });
      return undefined;
    }
    if (form.fechaIngreso > form.fechaCorte) {
      setEstado({ cargando: false, calculo: null, error: "La fecha de ingreso no puede ser mayor a la fecha de corte." });
      return undefined;
    }
    const control = new AbortController();
    const espera = setTimeout(async () => {
      setEstado((e) => ({ ...e, cargando: true, error: "" }));
      try {
        const calculo = await calculosLftApi.aguinaldoPublico(cuerpoCalculadora(form), { signal: control.signal });
        setEstado({ cargando: false, calculo, error: "" });
      } catch (error) {
        if (control.signal.aborted) return;
        setEstado({
          cargando: false,
          calculo: null,
          error: error?.response?.data?.error || "No se pudo calcular en este momento. Inténtalo de nuevo.",
        });
      }
    }, 350);
    return () => {
      clearTimeout(espera);
      control.abort();
    };
  }, [form]);

  const calculo = estado.calculo;
  const clearForm = () => setForm(FORM_INICIAL);

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
            Herramienta pública y gratuita: captura los datos y obtén el
            aguinaldo con la misma regla de la Ley Federal del Trabajo que usa
            ADAMIA en su panel.
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
                <option value="semanal">Salario semanal (÷ 7)</option>
                <option value="quincenal">Salario quincenal (÷ 15)</option>
                <option value="mensual">Salario mensual (÷ 30)</option>
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold">{ETIQUETA_SALARIO[form.tipoSalario]}</span>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                aria-label={ETIQUETA_SALARIO[form.tipoSalario]}
                value={form.salario}
                onChange={setField("salario")}
                placeholder={form.tipoSalario === "mensual" ? "Ej. 12000" : "Ej. 400"}
                className="h-11 rounded-xl border border-[var(--adamia-blue)]/20 px-3 outline-none focus:border-[var(--adamia-blue)]"
              />
            </label>

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

            {estado.error ? (
              <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                {estado.error}
              </p>
            ) : !calculo ? (
              <p className="mt-3 text-sm text-[var(--adamia-text-secondary)]" aria-live="polite">
                {estado.cargando ? "Calculando…" : "Captura los datos para ver el cálculo."}
              </p>
            ) : (
              <div className="mt-4 space-y-3" aria-live="polite">
                <ResultRow label="Salario diario usado" value={calculo.salario_diario_texto || toMoney(calculo.salario_diario)} />
                <ResultRow
                  label="Periodo"
                  value={`${fechaCorta(calculo.periodo_desde)} al ${fechaCorta(calculo.periodo_hasta)}`}
                />
                <ResultRow label="Días del periodo" value={String(calculo.dias_periodo)} />
                <ResultRow label="Días trabajados" value={`${calculo.dias_trabajados} de ${calculo.dias_anio}`} />
                <ResultRow
                  label="Días de aguinaldo proporcionales"
                  value={Number(calculo.dias_proporcionales).toFixed(4)}
                />

                <div className="mt-4 rounded-2xl bg-gradient-to-br from-[var(--adamia-blue)] to-[var(--adamia-purple)] p-4 text-white">
                  <p className="text-sm text-white/90">Monto estimado de aguinaldo (bruto)</p>
                  <p className="mt-1 text-3xl font-black" data-total>{toMoney(calculo.monto)}</p>
                  <p className="mt-2 text-xs text-white/90" data-formula>{calculo.formula}</p>
                </div>
                <p className="text-xs text-[var(--adamia-text-secondary)]">{NOTA_BRUTO}</p>
                {(calculo.avisos || []).map((a) => (
                  <p key={a} className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">{a}</p>
                ))}
              </div>
            )}
          </article>

          <article className="rounded-3xl border border-[var(--adamia-blue)]/15 bg-white p-6 text-sm text-[var(--adamia-text-secondary)] shadow-sm">
            <p className="font-semibold text-[var(--adamia-text-primary)]">Fórmula usada (art. 87 LFT)</p>
            <p className="mt-2">
              Aguinaldo = Días de aguinaldo × (Días trabajados ÷ Días del año) × Salario diario
            </p>
            <p className="mt-2">
              Días trabajados: del 1 de enero (o de la fecha de ingreso, si es
              posterior) a la fecha de corte, contando los dos días, menos los
              días no laborados. El año tiene 365 días (366 si es bisiesto). Si
              trabajó el año completo, recibe todos sus días de aguinaldo
              (mínimo 15).
            </p>
            <p className="mt-2">
              Salario diario: mensual ÷ 30, quincenal ÷ 15, semanal ÷ 7.
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
