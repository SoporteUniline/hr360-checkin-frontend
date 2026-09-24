"use client";

import React, { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { Building2, Wallet, FileWarning, Ban, RefreshCw } from "lucide-react";
import TablaEmpresas from "./TablaEmpresas";
import Filters from "./Filters";
import { fetcherWithToken, swr_config } from "@/lib/fetcher";
import LoadingTable from "@/components/LoadingTable";
import NuevaEmpresa from "./NuevaEmpresa";
import DetalleEmpresa from "./DetalleEmpresa";
import TablePagination from "@/components/TablePagination";
import { Button } from "@/components/ui/button";
import { fetchCompanySummary, money, numberOrNull } from "./empresaResumen";
import styles from "./empresas.module.css";

export default function Empresas() {
  const limit = 10;
  const [page, setPage] = useState(1);
  const { mutate } = useSWRConfig();
  const {
    data,
    error,
    isLoading,
    mutate: revalidate,
  } = useSWR(
    `/empresas?page=${page}&limit=${limit}`,
    fetcherWithToken,
    swr_config
  );
  const financial = useSWR(
    "/stripe/dashboard-financiero",
    fetchCompanySummary,
    { shouldRetryOnError: false, focusThrottleInterval: 60000 }
  );
  const [filter, setFilter] = useState({ search: "", status: "Todos" });
  const [selected, setSelected] = useState(null);
  const [initialTab, setInitialTab] = useState("datos");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const rows = data?.data || [];
  const filteredRows = rows.filter((item) => {
    const search = filter.search.trim().toLocaleLowerCase("es");
    const match = [item.nombre_empresa, item.nombre_duenio].some((value) =>
      String(value || "")
        .toLocaleLowerCase("es")
        .includes(search)
    );
    return (
      match && (filter.status === "Todos" || item.estado === filter.status)
    );
  });
  const resumen = financial.data?.resumen;

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshError(false);
    try {
      const results = await Promise.allSettled([
        revalidate(),
        financial.mutate(),
        ...filteredRows.flatMap((item) => [
          mutate(`/empresas/${item.id_empresa}/suscripcion`),
          mutate(`/empresas/${item.id_empresa}/resumen-financiero`),
        ]),
      ]);
      setRefreshError(results.some((result) => result.status === "rejected"));
    } finally {
      setRefreshing(false);
    }
  };
  const selectCompany = (item, tab = "datos") => {
    setInitialTab(tab);
    setSelected(item);
    if (!item) refresh();
  };
  const financialMetric = (value, asMoney = false) => {
    if (financial.error) return "No disponible";
    if (financial.isLoading) return "…";
    const parsed = numberOrNull(value);
    return parsed === null
      ? "Sin dato"
      : asMoney
      ? money(parsed)
      : parsed.toLocaleString("es-MX");
  };

  return (
    <div className={styles.page}>
      {selected ? (
        <DetalleEmpresa
          key={selected.id_empresa}
          item={selected}
          setSelected={selectCompany}
          initialTab={initialTab}
        />
      ) : (
        <>
          <div className={styles.heading}>
            <div className={styles.titleGroup}>
              <span className={styles.titleIcon}>
                <Building2 size={22} />
              </span>
              <div>
                <h1>Empresas</h1>
                <p>Personal, cobranza y vigencia en una sola vista.</p>
              </div>
            </div>
            <div className={styles.headingActions}>
              <Button
                variant="outline"
                onClick={refresh}
                disabled={refreshing}
                aria-label="Actualizar empresas y saldos"
              >
                <RefreshCw
                  size={16}
                  className={refreshing ? "animate-spin" : ""}
                />
                <span className="hidden sm:inline">Actualizar</span>
              </Button>
              <NuevaEmpresa limit={limit} page={page} setFilter={setFilter} />
            </div>
          </div>
          <div
            className={styles.metrics}
            aria-label="Resumen general de todas las empresas"
          >
            <Metric
              label="Empresas registradas"
              value={
                isLoading
                  ? "…"
                  : error
                  ? "No disponible"
                  : numberOrNull(data?.total)?.toLocaleString("es-MX") ??
                    "Sin dato"
              }
              note="Todas las empresas"
              icon={Building2}
            />
            <Metric
              label="Saldo pendiente total"
              value={financialMetric(resumen?.saldo_pendiente, true)}
              note="Cobranza general · MXN"
              icon={Wallet}
              featured
            />
            <Metric
              label="Facturas vencidas"
              value={financialMetric(resumen?.facturas_vencidas)}
              note="Todas las empresas"
              icon={FileWarning}
            />
            <Metric
              label="Empresas suspendidas"
              value={financialMetric(resumen?.empresas_suspendidas)}
              note="Resumen financiero general"
              icon={Ban}
            />
          </div>
          {financial.error && (
            <div className={styles.error} role="alert">
              No se pudo cargar el resumen financiero general.
              <button onClick={() => financial.mutate().catch(() => {})}>
                Reintentar resumen
              </button>
            </div>
          )}
          {refreshError && (
            <div className={styles.error} role="alert">
              Algunos datos no se pudieron actualizar. Usa «Reintentar consulta»
              en la empresa correspondiente.
            </div>
          )}
          <section
            className={styles.tablePanel}
            aria-label="Listado de empresas"
          >
            <div className={styles.toolbar}>
              <Filters filter={filter} setFilter={setFilter} />
            </div>
            {isLoading ? (
              <LoadingTable rows={10} />
            ) : error ? (
              <div className={styles.error} role="alert">
                No se pudieron cargar las empresas.
                <button onClick={() => revalidate().catch(() => {})}>
                  Reintentar empresas
                </button>
              </div>
            ) : (
              <TablaEmpresas
                data={filteredRows}
                setSelected={selectCompany}
                limit={limit}
                page={page}
              />
            )}
            <p className={styles.footer}>
              La vigencia es la fecha administrativa registrada. Consulta
              «Acceso» para ver si la empresa está activa. Los saldos
              corresponden a la cobranza registrada.
            </p>
          </section>
          {!error && (
            <TablePagination
              page={page}
              limit={limit}
              total={data?.total || 0}
              onPageChange={(value) => {
                setPage(value);
                setFilter({ search: "", status: "Todos" });
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

function Metric({ label, value, note, icon: Icon, featured }) {
  return (
    <div className={`${styles.metric} ${featured ? styles.metricDebt : ""}`}>
      <div className={styles.metricLabel}>
        <span>{label}</span>
        <Icon size={17} />
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}
