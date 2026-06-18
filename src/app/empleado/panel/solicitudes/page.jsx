"use client";
import { PermissionDialog } from "@/components/Permission/PermissionDialog";
import { PermissionTable } from "@/components/Permission/PermissionTable";
import TablePagination from "@/components/TablePagination";
import { Button } from "@/components/ui/button";
import {
  usePermisosEmpleado,
  usePermisosPorAutorizar,
} from "@/hooks/usePermisoPorEmpleado";
import { Plus } from "lucide-react";
import React, { useState, useEffect } from "react";

const SolicitudesPage = () => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("crear");
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pageAutorizar, setPageAutorizar] = useState(1);
  const [limitAutorizar, setLimitAutorizar] = useState(10);
  const [tab, setTab] = useState("mis");

  const { data, total, mutate } = usePermisosEmpleado(page, limit);

  const {
    data: dataAutorizar,
    total: totalAutorizar,
    mutate: mutateAutorizar,
  } = usePermisosPorAutorizar(pageAutorizar, limitAutorizar);

  useEffect(() => {
    if (tab === "autorizar" && totalAutorizar === 0) {
      setTab("mis");
    }
  }, [tab, totalAutorizar]);

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

      <div className="mt-6 flex flex-wrap gap-2">
        <Button
          type="button"
          variant={tab === "mis" ? "default" : "outline"}
          className={
            tab === "mis"
              ? "bg-[#2563EB] text-white hover:bg-[#1d4ed8]"
              : "bg-white"
          }
          onClick={() => setTab("mis")}
        >
          Mis solicitudes
          <span
            className={
              tab === "mis"
                ? "ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs"
                : "ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
            }
          >
            {total}
          </span>
        </Button>

        {totalAutorizar > 0 && (
          <Button
            type="button"
            variant={tab === "autorizar" ? "default" : "outline"}
            className={
              tab === "autorizar"
                ? "bg-[#2563EB] text-white hover:bg-[#1d4ed8]"
                : "bg-white"
            }
            onClick={() => setTab("autorizar")}
          >
            Por autorizar
            <span
              className={
                tab === "autorizar"
                  ? "ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs"
                  : "ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
              }
            >
              {totalAutorizar}
            </span>
          </Button>
        )}
      </div>

      {tab === "mis" && data.length > 0 && (
        <>
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
      )}

      {tab === "autorizar" && totalAutorizar > 0 && (
        <>
          <PermissionTable
            data={dataAutorizar}
            setOpen={setOpen}
            setMode={setMode}
            setSelected={setSelected}
            modoAutorizar
            mutate={() => {
              mutateAutorizar?.();
              mutate?.();
            }}
          />

          <TablePagination
            page={pageAutorizar}
            limit={limitAutorizar}
            total={totalAutorizar}
            onPageChange={(newPage) => setPageAutorizar(newPage)}
            onLimitChange={(newLimit) => setLimitAutorizar(newLimit)}
          />
        </>
      )}

      {tab === "mis" && data.length === 0 && (
        <div className="mt-4 rounded-lg border border-dashed p-8 text-center text-gray-500">
          No tienes solicitudes registradas.
        </div>
      )}
    </>
  );
};

export default SolicitudesPage;
