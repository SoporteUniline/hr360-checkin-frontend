"use client";

import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchCompanySummary, getValidity } from "./empresaResumen";
import styles from "./empresas.module.css";

export const COMPANY_VIEWS = [
  {
    value: "Todos",
    label: "Todas",
    description: "Todas tus empresas en un solo lugar.",
  },
  {
    value: "Activo",
    label: "Activas",
    description: "Empresas con acceso activo.",
  },
  {
    value: "Por vencer",
    label: "Por vencer",
    description:
      "Vigencia administrativa que vence hoy o en los próximos 7 días.",
  },
  {
    value: "Vencida",
    label: "Vencidas",
    description:
      "Vigencia administrativa anterior a hoy. El acceso se indica por separado.",
  },
  {
    value: "Suspendido",
    label: "Suspendidas",
    description: "Empresas con acceso suspendido.",
  },
  {
    value: "Inactivo",
    label: "Inactivas",
    description: "Empresas con acceso inactivo.",
  },
  {
    value: "Nuevo",
    label: "Nuevas",
    description: "Empresas pendientes de aceptación.",
  },
  {
    value: "Rechazado",
    label: "Rechazadas",
    description: "Solicitudes de empresa rechazadas.",
  },
];
export const isDateView = (view) => view === "Vencida" || view === "Por vencer";
export function matchesView(company, view, entry) {
  if (view === "Todos") return true;
  if (!isDateView(view)) return company.estado === view;
  if (!entry || entry.pending || entry.error) return false;
  const validity = getValidity(entry.data?.data);
  return Boolean(
    validity &&
      (view === "Vencida"
        ? validity.days < 0
        : validity.days >= 0 && validity.days <= 7)
  );
}

export function useCompanyValidity() {
  const [entries, setEntries] = useState({});
  const report = useCallback((id, value) => {
    setEntries((current) => {
      const previous = current[id];
      if (
        previous?.data === value.data &&
        previous?.error === value.error &&
        previous?.pending === value.pending
      )
        return current;
      return { ...current, [id]: value };
    });
  }, []);
  return { entries, report };
}

// Share each existing subscription cache entry with the table and detail screens.
// This reads dates for every company; no financial balances are prefetched here.
export function ValidityObserver({ companyId, report }) {
  const { data, error, isLoading } = useSWR(
    `/empresas/${companyId}/suscripcion`,
    fetchCompanySummary,
    {
      shouldRetryOnError: false,
      dedupingInterval: 15000,
      revalidateOnFocus: false,
    }
  );
  useEffect(() => {
    report(companyId, {
      data,
      error,
      pending: isLoading || (data === undefined && !error),
    });
  }, [companyId, data, error, isLoading, report]);
  return null;
}

export default function VistasEmpresas({ companies, entries, loading }) {
  const pending = companies.filter(
    (company) =>
      !entries[company.id_empresa] || entries[company.id_empresa].pending
  ).length;
  const errors = companies.filter(
    (company) => entries[company.id_empresa]?.error
  ).length;
  return (
    <div className={styles.viewScroll}>
      <TabsList className={styles.viewTabs} aria-label="Vistas de empresas">
        {COMPANY_VIEWS.map(({ value, label }) => {
          const count = companies.filter((company) =>
            matchesView(company, value, entries[company.id_empresa])
          ).length;
          return (
            <TabsTrigger key={value} value={value} className={styles.viewTab}>
              {label}
              <span
                aria-label={
                  isDateView(value) && pending
                    ? "Consultando vigencias"
                    : `${count} empresas${
                        isDateView(value) && errors ? ", conteo incompleto" : ""
                      }`
                }
              >
                {loading || (isDateView(value) && pending)
                  ? "…"
                  : `${count}${isDateView(value) && errors ? "+" : ""}`}
              </span>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </div>
  );
}
