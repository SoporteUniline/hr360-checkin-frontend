"use client";

import { useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useAuth } from "@/context/AuthContext";
import ErrorPage from "@/components/ErrorPage";
import LoadingTable from "@/components/LoadingTable";
import EntradasSalidasTable from "./EntradasSalidasTable";
import EntradasSalidasFilters from "./EntradasSalidasFilter";
import useRelojChecadorData from "@/hooks/useRelojChecador";
import useEntradaSalida from "@/hooks/useEntradaSalida"; // <-- ¡IMPORTA EL NUEVO HOOK AQUÍ!
import TablePagination from "@/components/TablePagination";

dayjs.extend(utc);
dayjs.extend(timezone);

export default function RegistroEntradasSalidas() {
  const [fecha, setFecha] = useState(
    dayjs().tz("America/Mexico_City").format("YYYY-MM-DD")
  );
  const [page, setPage] = useState(1);
  const limit = 10;
  const [filtroEmpleado, setFiltroEmpleado] = useState("");

  const { dataUser } = useAuth();

  // Hook para cargar datos (este ya lo tienes y es para la tabla de movimientos)
  const { data, error, isLoading, mutate } = useRelojChecadorData(
    dataUser?.id_empresa,
    fecha,
    null,
    page,
    limit
  );
  console.log(data);

  const registros = Array.isArray(data?.registros) ? data.registros : [];
  const totalPages = data?.totalPages || 1;
  const currentPage = data?.currentPage || 1;

  const filtrados = registros.filter((r) =>
    `${r.nombre} ${r.apellido_paterno} ${r.apellido_materno || ""}`
      .toLowerCase()
      .includes(filtroEmpleado.toLowerCase())
  );

  const onPageChange = (newPage) => {
    setPage(newPage);
  };

  const {
    editingMovimientoId,
    editingMovimientoData,
    isSavingMovimiento,
    handleEditMovimientoClick,
    handleCancelMovimientoEdit,
    handleMovimientoFieldChange,
    handleSaveMovimientoClick,
  } = useEntradaSalida(mutate);

  if (isLoading) return <LoadingTable rows={10} />;
  if (error) {
    console.error(error);
    return (
      <ErrorPage message="Error al cargar los registros de entradas y salidas" />
    );
  }

  return (
    <div>
      <EntradasSalidasFilters
        filtroEmpleado={filtroEmpleado}
        setFiltroEmpleado={setFiltroEmpleado}
        fecha={fecha}
        setFecha={setFecha}
        setPage={setPage}
      />

      <EntradasSalidasTable
        registros={filtrados}
        fecha={fecha}
        editingMovimientoId={editingMovimientoId}
        editingMovimientoData={editingMovimientoData}
        isSavingMovimiento={isSavingMovimiento}
        handleEditMovimientoClick={handleEditMovimientoClick}
        handleCancelMovimientoEdit={handleCancelMovimientoEdit}
        handleMovimientoFieldChange={handleMovimientoFieldChange}
        handleSaveMovimientoClick={handleSaveMovimientoClick}
      />

      {filtrados.length > 0 && (
        <TablePagination
          page={page}
          limit={limit}
          total={data?.total || 0}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
