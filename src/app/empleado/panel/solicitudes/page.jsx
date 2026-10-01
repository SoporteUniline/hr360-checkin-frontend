"use client";
import { PermissionDialog } from "@/components/Permission/PermissionDialog";
import { PermissionTable } from "@/components/Permission/PermissionTable";
import TablePagination from "@/components/TablePagination";
import { Button } from "@/components/ui/button";
import { usePermisosEmpleado } from "@/hooks/usePermisoPorEmpleado";
import Link from "next/link";
import { Plus } from "lucide-react";
import React, { useState, useMemo } from "react";
import useSWR from "swr";
import { useAuth } from "@/context/AuthContext";
import { fetcherWithToken } from "@/lib/fetcher";

const SolicitudesPage = () => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("crear");
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { dataUser } = useAuth();

  const idEmpresa =
    dataUser?.id_empresa ||
    dataUser?.empresas_detalle?.[0]?.id_empresa ||
    dataUser?.empresas?.[0] ||
    null;

  const { data: festivosResp } = useSWR(
    idEmpresa
      ? `/checador/holidays/${idEmpresa}?page=1&limit=5000&filter=`
      : null,
    fetcherWithToken,
  );

  const festivosSet = useMemo(() => {
    const set = new Set();

    (festivosResp?.festivos || []).forEach((festivo) => {
      if (festivo?.fecha) {
        set.add(String(festivo.fecha).slice(0, 10));
      }
    });

    return set;
  }, [festivosResp]);

  const { data, total, mutate } = usePermisosEmpleado(page, limit);

  const { data: saldoVacaciones, isLoading: cargandoSaldoVacaciones } = useSWR(
    dataUser?.tipo_usuario === "Empleado"
      ? "/checador/vacaciones/mi-saldo"
      : null,
    fetcherWithToken,
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

      {dataUser?.tipo_usuario === "Empleado" && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Vacaciones disponibles
              </p>

              {cargandoSaldoVacaciones ? (
                <p className="mt-1 text-sm text-gray-400">
                  Consultando saldo...
                </p>
              ) : saldoVacaciones ? (
                <>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-gray-900">
                      {saldoVacaciones.dias_disponibles}
                    </span>
                    <span className="text-sm text-gray-500">
                      {Number(saldoVacaciones.dias_disponibles) === 1
                        ? "día"
                        : "días"}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-gray-500">
                    De {saldoVacaciones.dias_cargados} días ·{" "}
                    {saldoVacaciones.dias_tomados} utilizados
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-gray-400">
                  No se pudo consultar el saldo de vacaciones.
                </p>
              )}
            </div>

            {saldoVacaciones && (
              <div className="flex gap-6 sm:text-right">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">
                    Asignados
                  </p>
                  <p className="mt-1 font-semibold text-gray-700">
                    {saldoVacaciones.dias_cargados}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">
                    Utilizados
                  </p>
                  <p className="mt-1 font-semibold text-gray-700">
                    {saldoVacaciones.dias_tomados}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-900">
          Mis solicitudes{" "}
          <span className="ml-2 text-sm font-normal text-gray-500">
            {total}
          </span>
        </h2>
        <Button asChild variant="outline">
          <Link href="/empleado/panel/solicitudes-equipo">
            Solicitudes de mi equipo
          </Link>
        </Button>
      </div>

      {data.length > 0 && (
        <>
          <PermissionTable
            data={data}
            setOpen={setOpen}
            setMode={setMode}
            setSelected={setSelected}
            festivosSet={festivosSet}
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

      {data.length === 0 && (
        <div className="mt-4 rounded-lg border border-dashed p-8 text-center text-gray-500">
          No tienes solicitudes registradas.
        </div>
      )}
    </>
  );
};

export default SolicitudesPage;
