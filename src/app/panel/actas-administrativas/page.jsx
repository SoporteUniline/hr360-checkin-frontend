"use client";

import AdministrativeTable from "@/components/AdministrativeMinutesTable";
import StatCard from "@/components/StatCard";
import TablePagination from "@/components/TablePagination";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useAdministrativeMinutes } from "@/hooks/useAdministrativeMinutes";
import { PlusIcon } from "lucide-react";
import React, { useState } from "react";

const page = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { dataUser } = useAuth();
  const { data, total, stats, isLoading } = useAdministrativeMinutes(
    dataUser?.id_empresa,
    page,
    limit
  );
  return (
    <>
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold">📋 Actas administrativas</h1>{" "}
          <p className="text-xs text-gray-500 mt-1">
            Gestión de actas según Ley Federal del Trabajo
          </p>
        </div>
        <Button>
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
          value={stats?.elaboradas ?? 0}
          borderColor="border-l-amber-500"
        />

        <StatCard
          title="CERRADAS"
          value={stats?.cerradas ?? 0}
          borderColor="border-l-emerald-500"
        />

        <StatCard
          title="GRAVES"
          value={stats?.graves ?? 0}
          borderColor="border-l-red-500"
        />
      </div>

      <div className="mt-5">
        <AdministrativeTable actas={data} page={page} limit={limit} />
      </div>

      <TablePagination
        page={page}
        limit={limit}
        total={total}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />
    </>
  );
};

export default page;
