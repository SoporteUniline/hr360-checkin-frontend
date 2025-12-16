"use client";

import React, { useState } from "react";
import TablaUsuarios from "./TablaUsuarios";
import Filters from "./Filters";
import useSWR, { mutate } from "swr";
import { fetcherWithToken, swr_config } from "@/lib/fetcher";
import LoadingTable from "@/components/LoadingTable";
import ErrorPage from "@/components/ErrorPage";
import NuevoUsuario from "./NuevoUsuario";
import DetalleUsuario from "./DetalleUsuario";
import TablePagination from "@/components/TablePagination";

export default function Usuarios() {
  const limit = 10;
  const [page, setPage] = useState(1);
  const { data, error, isLoading } = useSWR(
    `/users/user?page=${page}&limit=${limit}`,
    fetcherWithToken,
    swr_config
  );

  const [filter, setFilter] = React.useState({ search: "", status: "Todos" });
  const [selected, setSelected] = React.useState(null);

  const handleSetFilter = (newFilter) => {
    setFilter(newFilter);
    setPage(1);
  };

  const usuariosFiltrados = React.useMemo(() => {
    if (!data?.data) return [];
    return data.data.filter((item) => {
      const nombreMatch = item.nombre
        ?.toLowerCase()
        ?.includes(filter.search.toLowerCase());
      const correoMatch = item.correo
        ?.toLowerCase()
        ?.includes(filter.search.toLowerCase());
      const estadoMatch =
        filter.status === "Todos" || item.estado === filter.status;
      return (nombreMatch || correoMatch) && estadoMatch;
    });
  }, [data?.data, filter]);

  const onPageChange = async (value) => {
    setPage(value);
    await mutate(`/users/user?page=${value}&limit=${limit}`);
  };

  return (
    <div>
      {selected ? (
        <DetalleUsuario userId={selected} setSelected={setSelected} />
      ) : (
        <>
          <div className="flex gap-3">
            <Filters setFilter={handleSetFilter} />
            <NuevoUsuario limit={limit} page={page} />
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
    <TablaUsuarios
      data={data}
      setSelected={setSelected}
      limit={limit}
      page={page}
    />
  );
};
