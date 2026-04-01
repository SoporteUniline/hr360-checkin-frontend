"use client";
import { PermissionDialog } from "@/components/Permission/PermissionDialog";
import { PermissionTable } from "@/components/Permission/PermissionTable";
import TablePagination from "@/components/TablePagination";
import { Button } from "@/components/ui/button";
import { usePermisosEmpleado } from "@/hooks/usePermisoPorEmpleado";
import { Plus } from "lucide-react";
import React, { useEffect, useState } from "react";
import { exportToExcel } from "@/utils/exportExcelJS";
import { useAuth } from "@/context/AuthContext";

const SolicitudesPage = () => {
  const { dataUser } = useAuth();
  console.log(dataUser);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("crear");
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { data, total, error, isLoading, mutate } = usePermisosEmpleado(
    page,
    limit,
  );

  return (
    <>
      <div className="w-full flex justify-center sm:justify-end gap-2">
        <Button
              className="w-full sm:w-auto bg-[#2563EB] hover:bg-[#1d4ed8] text-white"
          onClick={() => {
            setMode("crear");
            setSelected(null);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" /> Solicitar Permiso
        </Button>
      </div>

      <PermissionDialog
        open={open}
        setOpen={setOpen}
        mutate={mutate}
        mode={mode}
        selected={selected}
      />

      <PermissionTable
        data={data}
        setOpen={setOpen}
        setMode={setMode}
        setSelected={setSelected}
      />

      <TablePagination
        page={page}
        limit={limit}
        total={total}
        onPageChange={(newPage) => setPage(newPage)}
        onLimitChange={(newLimit) => setLimit(newLimit)}
      />
    </>
  );
};

export default SolicitudesPage;
