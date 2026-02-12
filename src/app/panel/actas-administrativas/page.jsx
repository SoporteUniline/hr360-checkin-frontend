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
import { FileText, PlusIcon, AlertTriangle } from "lucide-react";
import React, { useEffect, useState } from "react";
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
import { useSnackbar } from "notistack";

const page = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState("all");
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
  } = useAdministrativeMinutes(empresaSeleccionada, page, limit, filters);

  const limpiarFiltros = () => {
    setEmpresaSeleccionada("all");
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

    try {
      await administrativeMinutesApi.eliminar(
        deleteRow.id_acta,
        deleteRow.id_empresa,
      );

      enqueueSnackbar("Acta eliminada correctamente", {
        variant: "success",
      });

      setDeleteRow(null);
      await mutateActas?.();
    } catch (error) {
      console.error("Error al eliminar acta:", error);

      enqueueSnackbar(
        error?.response?.data?.error || "Hubo un error al eliminar el acta",
        {
          variant: "error",
        },
      );
    }
  };

  useEffect(() => {
    setPage(1);
  }, [empresaSeleccionada]);

  return (
    <>
      <div className="min-h-screen bg-[#F9FAFB] p-6 space-y-6">
        {/* Header del módulo - Diseño ADAMIA */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-3 rounded-lg">
              <FileText className="w-7 h-7 text-[#2563EB]" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Actas administrativas
              </h1>
              <p className="text-sm text-gray-600">
                Gestión de actas según Ley Federal del Trabajo
              </p>
            </div>
          </div>
          <Button
            onClick={() => setOpenNewActa(true)}
            className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-medium shadow-sm"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Nueva acta
          </Button>
        </div>

        {/* Estadísticas - Diseño ADAMIA */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total actas"
            value={stats?.totalActas ?? 0}
            borderColor="border-l-gray-800"
          />

          <StatCard
            title="Elaboradas"
            value={stats?.totalElaboradas ?? 0}
            borderColor="border-l-amber-500"
          />

          <StatCard
            title="Cerradas"
            value={stats?.totalCerradas ?? 0}
            borderColor="border-l-emerald-500"
          />

          <StatCard
            title="Graves"
            value={stats?.totalGraves ?? 0}
            borderColor="border-l-red-500"
          />
        </div>

        <AdministrativeFilters
          empresaSeleccionada={empresaSeleccionada}
          setEmpresaSeleccionada={setEmpresaSeleccionada}
          dataUser={dataUser}
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
            empresaSeleccionada={empresaSeleccionada}
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

        <AlertDialog
          open={!!deleteRow}
          onOpenChange={(open) => !open && setDeleteRow(null)}
        >
          <AlertDialogContent className="sm:max-w-[425px] p-0">
            <AlertDialogHeader className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 rounded-t-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6" />
                <AlertDialogTitle className="text-white">
                  ¿Eliminar acta administrativa?
                </AlertDialogTitle>
              </div>
            </AlertDialogHeader>
            <div className="p-6 space-y-4">
              <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-4 rounded-md">
                <AlertDialogDescription className="text-sm">
                  {deleteRow
                    ? `Esta acción no se puede deshacer. Se eliminará el acta ${
                        deleteRow?.folio || ""
                      } del empleado ${deleteRow?.nombre_empleado || ""}.`
                    : ""}
                </AlertDialogDescription>
              </div>
            </div>
            <AlertDialogFooter className="bg-gray-50 p-4 flex justify-end gap-2 rounded-b-lg">
              <AlertDialogCancel className="border-gray-300">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700 text-white shadow-sm"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Accesos Rápidos - Componente reutilizable (al final de la página) */}
        <AccesosRapidos />
      </div>
    </>
  );
};

export default page;
