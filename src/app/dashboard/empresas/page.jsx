"use client";

import React, { useMemo, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import {
  Building2,
  Wallet,
  FileWarning,
  Ban,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import TablaEmpresas from "./TablaEmpresas";
import Filters from "./Filters";
import axios from "@/lib/axios";
import LoadingTable from "@/components/LoadingTable";
import NuevaEmpresa from "./NuevaEmpresa";
import DetalleEmpresa from "./DetalleEmpresa";
import { Button } from "@/components/ui/button";
import { fetchCompanySummary, money, numberOrNull } from "./empresaResumen";
import styles from "./empresas.module.css";
import {
  COMPANY_DIRECTORY_KEY,
  loadCompanyDirectory,
  indexCompanies,
  searchCompanies,
} from "./directorioEmpresas";

const EMPTY_ROWS = [];
const fetchDirectory = () =>
  loadCompanyDirectory(async (url) => {
    const response = await axios.get(url, { timeout: 15000 });
    return response.data;
  });

export default function Empresas() {
  const [limit, setLimit] = useState(10);
  const [order, setOrder] = useState("asc");
  const [page, setPage] = useState(1);
  const { mutate } = useSWRConfig();
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: revalidate,
  } = useSWR(COMPANY_DIRECTORY_KEY, fetchDirectory, {
    shouldRetryOnError: false,
    dedupingInterval: 15000,
    focusThrottleInterval: 60000,
  });
  const financial = useSWR(
    "/stripe/dashboard-financiero",
    fetchCompanySummary,
    { shouldRetryOnError: false, focusThrottleInterval: 60000 }
  );
  const [filter, updateFilter] = useState({ search: "", status: "Todos" });
  const setFilter = (value) => {
    updateFilter(value);
    setPage(1);
  };
  const [selected, setSelected] = useState(null);
  const [initialTab, setInitialTab] = useState("datos");
  const [refreshing, setRefreshing] = useState(false);
  const rows = data?.data ?? EMPTY_ROWS;
  const index = useMemo(() => indexCompanies(rows), [rows]);
  const filteredRows = useMemo(
    () => searchCompanies(index, filter, order),
    [index, filter, order]
  );
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / limit));
  const currentPage = Math.min(page, totalPages);
  const visibleRows = filteredRows.slice(
    (currentPage - 1) * limit,
    currentPage * limit
  );
  const hasFilters = Boolean(filter.search.trim()) || filter.status !== "Todos";
  const clearFilters = () => setFilter({ search: "", status: "Todos" });
  const resumen = financial.data?.resumen;

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.allSettled([
        revalidate(),
        financial.mutate(),
        ...visibleRows.flatMap((item) => [
          mutate(`/empresas/${item.id_empresa}/suscripcion`),
          mutate(`/empresas/${item.id_empresa}/resumen-financiero`),
        ]),
      ]);
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
                disabled={refreshing || isValidating}
                aria-label="Actualizar empresas y saldos"
              >
                <RefreshCw
                  size={16}
                  className={refreshing ? "animate-spin" : ""}
                />
                <span className="hidden sm:inline">Actualizar</span>
              </Button>
              <NuevaEmpresa setFilter={setFilter} />
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
          <section
            className={styles.tablePanel}
            aria-label="Listado de empresas"
          >
            <div className={styles.toolbar}>
              <Filters
                filter={filter}
                setFilter={setFilter}
                order={order}
                setOrder={(value) => {
                  setOrder(value);
                  setPage(1);
                }}
              />
            </div>
            {error && (
              <div className={styles.error} role="alert">
                {data
                  ? "No se pudo actualizar el directorio. Mostramos la última consulta completa."
                  : "No se pudo cargar el directorio completo. Reintenta para buscar en todas las empresas."}
                <button
                  disabled={isValidating}
                  onClick={() => revalidate().catch(() => {})}
                >
                  Reintentar empresas
                </button>
              </div>
            )}
            <div className={styles.resultsBar}>
              <p role="status" aria-live="polite" aria-atomic="true">
                {!data ? (
                  isLoading || isValidating ? (
                    "Cargando todas las empresas…"
                  ) : (
                    "Directorio no disponible"
                  )
                ) : (
                  <>
                    <strong>
                      {filteredRows.length.toLocaleString("es-MX")}
                    </strong>
                    {hasFilters
                      ? ` de ${rows.length.toLocaleString("es-MX")} empresas`
                      : " empresas"}
                    {isValidating
                      ? " · Actualizando…"
                      : " · En todo el directorio"}
                  </>
                )}
              </p>
              {hasFilters && (
                <button className={styles.resetFilters} onClick={clearFilters}>
                  Limpiar filtros
                </button>
              )}
            </div>
            {!data && (isLoading || isValidating) ? (
              <LoadingTable rows={5} />
            ) : data ? (
              <TablaEmpresas
                data={visibleRows}
                setSelected={selectCompany}
                hasFilters={hasFilters}
                clearFilters={clearFilters}
              />
            ) : null}
            {data && (
              <DirectoryPagination
                page={currentPage}
                limit={limit}
                total={filteredRows.length}
                onPageChange={setPage}
                onLimitChange={(value) => {
                  setLimit(value);
                  setPage(1);
                }}
              />
            )}
            <p className={styles.footer}>
              La vigencia es la fecha administrativa registrada. Consulta
              «Acceso» para ver si la empresa está activa. Los saldos
              corresponden a la cobranza registrada.
            </p>
          </section>
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

function DirectoryPagination({
  page,
  limit,
  total,
  onPageChange,
  onLimitChange,
}) {
  const pages = Math.max(1, Math.ceil(total / limit));
  const from = total ? (page - 1) * limit + 1 : 0;
  const to = Math.min(page * limit, total);
  return (
    <div className={styles.pagination}>
      <span>
        {from}–{to} de {total} empresas
      </span>
      <div className={styles.pageControls}>
        <label>
          Por página
          <select
            aria-label="Por página"
            value={limit}
            onChange={(event) => onLimitChange(Number(event.target.value))}
          >
            {[10, 25, 50].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <nav aria-label="Páginas de empresas">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Primera página"
            disabled={page === 1}
            onClick={() => onPageChange(1)}
          >
            <ChevronsLeft size={16} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Página anterior"
            disabled={page === 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft size={16} />
          </Button>
          <span>
            Página {page} de {pages}
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Página siguiente"
            disabled={page === pages}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight size={16} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Última página"
            disabled={page === pages}
            onClick={() => onPageChange(pages)}
          >
            <ChevronsRight size={16} />
          </Button>
        </nav>
      </div>
    </div>
  );
}
