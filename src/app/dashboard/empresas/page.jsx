"use client";

import React, { useState } from "react";
import TablaEmpresas from "./TablaEmpresas";
import Filters from "./Filters";
import useSWR, { mutate } from "swr";
import { fetcherWithToken, swr_config } from "@/lib/fetcher";
import LoadingTable from "@/components/LoadingTable";
import ErrorPage from "@/components/ErrorPage";
import NuevaEmpresa from "./NuevaEmpresa";
import DetalleEmpresa from "./DetalleEmpresa";
import TablePagination from "@/components/TablePagination";

export default function Empresas() {
  const limit = 10;
  const [page, setPage] = useState(1);
  const {
    data,
    error,
    isLoading,
    mutate: revalidate,
  } = useSWR(
    `/empresas?page=${page}&limit=${limit}`,
    fetcherWithToken,
    swr_config,
  );
  const [filter, setFilter] = React.useState({ search: "", status: "Todos" });
  const [selected, setSelected] = React.useState(null);

  const usuariosFiltrados = data?.data.filter((item) => {
    const nombreMatch = item.nombre_empresa
      ?.toLowerCase()
      ?.includes(filter.search.toLowerCase());
    const empresaMatch = item.nombre_duenio
      ?.toLowerCase()
      ?.includes(filter.search.toLowerCase());
    const estadoMatch =
      filter.status === "Todos" || item.estado === filter.status;
    return (nombreMatch || empresaMatch) && estadoMatch;
  });

  const onPageChange = async (value) => {
    setPage(value);
    await mutate(`/empresas?page=${value}&limit=${limit}`);
  };

  return (
    <div>
      {selected ? (
        <DetalleEmpresa item={selected} setSelected={setSelected} />
      ) : (
        <>
          <div className="flex gap-3">
            <Filters setFilter={setFilter} />
            <NuevaEmpresa
              limit={limit}
              page={page}
              revalidate={revalidate}
              setFilter={setFilter}
            />
          </div>
          <TableContainer
            error={error}
            isLoading={isLoading}
            data={usuariosFiltrados}
            setSelected={setSelected}
            limit={limit}
            page={page}
          />
          <TablePagination
            page={page}
            limit={limit}
            total={data?.total || 0}
            onPageChange={onPageChange}
          />
        </>
      )}
    </div>
  );
}

const TableContainer = ({
  error,
  isLoading,
  data,
  setSelected,
  limit,
  page,
}) => {
  if (isLoading) return <LoadingTable rows={10} />;
  if (error) return <ErrorPage message={error?.message} />;

  return (
    <TablaEmpresas
      data={data}
      setSelected={setSelected}
      limit={limit}
      page={page}
    />
  );
};
