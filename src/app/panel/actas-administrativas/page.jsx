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
import AccesosRapidos from "@/components/AccesosRapidos";
import { AdministrativeDetailsModal } from "@/components/AdministrativeDetailsModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { administrativeMinutesApi } from "@/lib/administrativeMinutesApi";

const page = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filters, setFilters] = useState({
    empleado: "",
    folio: "",
    estatus: "",
  });
  const [openNewActa, setOpenNewActa] = useState(false);
  const [openEditActa, setOpenEditActa] = useState(false);
  const [actaToEdit, setActaToEdit] = useState(null);
  const [actaToView, setActaToView] = useState(null);
  const [openView, setOpenView] = useState(false);
  const [deleteRow, setDeleteRow] = useState(null);
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

  /**
   * Acciones por fila (Ver/Editar/Eliminar).
   * Relación:
   * - UI: `src/components/AdministrativeMinutesTable.jsx`
   * - PDF: `src/components/AdministrativeDetailsModal.jsx` (botón Descargar PDF)
   */
  const onViewActa = (acta) => {
    setActaToView(acta);
    setOpenView(true);
  };

  const onEditActa = (acta) => {
    setActaToEdit(acta);
    setOpenEditActa(true);
  };

  const onDeleteActa = (acta) => {
    setDeleteRow(acta);
  };

  const confirmDelete = async () => {
    if (!deleteRow) return;
    await administrativeMinutesApi.eliminar(deleteRow.id_acta, dataUser?.id_empresa);
    setDeleteRow(null);
    await mutateActas?.();
  };

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
          onView={onViewActa}
          onEdit={onEditActa}
          onDelete={onDeleteActa}
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

      {/* Modal de edición (reutiliza el mismo formulario) */}
      <NewActaModal
        open={openEditActa}
        onClose={() => {
          setOpenEditActa(false);
          setActaToEdit(null);
        }}
        empleados={empleados}
        tiposActa={tiposActa}
        refetch={mutateActas}
        dataUser={dataUser}
        mutateTiposActa={mutateTiposActa}
        mode="edit"
        actaToEdit={actaToEdit}
      />

      {/* Ver (detalle + Descargar PDF) */}
      <AdministrativeDetailsModal
        open={openView}
        onClose={() => setOpenView(false)}
        acta={actaToView}
        // Refresca el listado (SWR) cuando se cambia estatus desde el modal.
        // Relación: `src/components/AdministrativeDetailsModal.jsx` -> `onEstatusUpdated`
        onEstatusUpdated={mutateActas}
      />

      {/* Confirmación de eliminación (shadcn/ui) */}
      <AlertDialog open={!!deleteRow} onOpenChange={(open) => !open && setDeleteRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar acta administrativa?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteRow
                ? `Esta acción no se puede deshacer. Se eliminará el acta ${deleteRow?.folio || ""} del empleado ${
                    deleteRow?.nombre_empleado || ""
                  }.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white border border-[#d1d5db] text-[#374151] hover:bg-[#f9fafb]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-[#ef4444] hover:bg-[#dc2626] text-white shadow-[0_4px_12px_rgba(239,68,68,0.3)]"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Accesos Rápidos - Componente reutilizable (al final de la página) */}
      <AccesosRapidos />
    </>
  );
};

export default page;
