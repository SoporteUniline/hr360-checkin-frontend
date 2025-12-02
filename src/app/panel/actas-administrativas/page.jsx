"use client";

import AdministrativeFilters from "@/components/AdministrativeFilters";
import AdministrativeTable from "@/components/AdministrativeMinutesTable";
import NewActaModal from "@/components/NewActaModal";
import StatCard from "@/components/StatCard";
import TablePagination from "@/components/TablePagination";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useAdministrativeMinutes } from "@/hooks/useAdministrativeMinutes";
import useEmpleadosActivosData from "@/hooks/useEmpleadosActivos";
import useTiposActa from "@/hooks/useTiposActa";
import { PlusIcon } from "lucide-react";
import React, { useState } from "react";

const page = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filters, setFilters] = useState({
    empleado: "",
    folio: "",
    estatus: "",
  });
  const [openNewActa, setOpenNewActa] = useState(false);
  const [empleado, setEmpleado] = useState("");
  const [folio, setFolio] = useState("");
  const [estatus, setEstatus] = useState("");

  const { dataUser } = useAuth();
  const {
    data,
    mutate: mutateActas,
    total,
    stats,
    isLoading,
  } = useAdministrativeMinutes(dataUser?.id_empresa, page, limit, filters);

  const limpiarFiltros = () => {
    setEmpleado("");
    setFolio("");
    setEstatus("");

    setFilters({
      empleado: "",
      folio: "",
      estatus: "",
    });
  };

  const {
    data: empleados,
    error,
    isLoading: loadingEmpleados,
    mutate: mutateEmpleados,
  } = useEmpleadosActivosData(dataUser?.id_empresa);

  const {
    data: tiposActa,
    isLoading: loadingTipos,
    mutate: mutateTiposActa,
  } = useTiposActa(dataUser?.id_empresa, 1, 100, "");

  return (
    <>
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold">📋 Actas administrativas</h1>{" "}
          <p className="text-xs text-gray-500 mt-1">
            Gestión de actas según Ley Federal del Trabajo
          </p>
        </div>
        <Button
          onClick={() => setOpenNewActa(true)}
          className="bg-slate-700 hover:bg-slate-800"
        >
          <PlusIcon />
          Nueva acta
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        <StatCard
          title="TOTAL ACTAS"
          value={stats?.totalActas ?? 0}
          borderColor="border-l-gray-800"
        />

        <StatCard
          title="ELABORADAS"
          value={stats?.totalElaboradas ?? 0}
          borderColor="border-l-amber-500"
        />

        <StatCard
          title="CERRADAS"
          value={stats?.totalCerradas ?? 0}
          borderColor="border-l-emerald-500"
        />

        <StatCard
          title="GRAVES"
          value={stats?.totalGraves ?? 0}
          borderColor="border-l-red-500"
        />
      </div>

      <AdministrativeFilters
        onChange={setFilters}
        empleado={empleado}
        setEmpleado={setEmpleado}
        folio={folio}
        setFolio={setFolio}
        estatus={estatus}
        setEstatus={setEstatus}
        empleados={empleados}
      />

      <div className="mt-5">
        <AdministrativeTable
          actas={data}
          page={page}
          limit={limit}
          limpiarFiltros={limpiarFiltros}
        />
      </div>

      <TablePagination
        page={page}
        limit={limit}
        total={total}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />

      <NewActaModal
        open={openNewActa}
        onClose={() => setOpenNewActa(false)}
        empleados={empleados}
        tiposActa={tiposActa}
        refetch={mutateActas}
        dataUser={dataUser}
        mutateTiposActa={mutateTiposActa}
      />
    </>
  );
};

export default page;
