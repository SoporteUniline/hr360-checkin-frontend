"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import dayjs from "dayjs";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import TablePagination from "@/components/TablePagination";
import ContratosTable from "./ContratosTable";
import ContratoDialog from "./ContratoDialog";
import ContratoViewDialog from "./ContratoViewDialog";
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
import useContratosData from "@/hooks/useContratosData";
import { contratosApi } from "@/lib/contratosApi";
import { useSnackbar } from "notistack";
import AccesosRapidos from "@/components/AccesosRapidos";

/**
 * Página de gestión de Contratos
 * - Diseño inspirado en `Vacaciones.html` y patrón del panel de permisos
 * - Relación:
 *   - Hook: `useContratosData`
 *   - API: `src/lib/contratosApi.js`
 *   - Componentes: `ContratosTable`, `ContratoDialog`, `ContratoViewDialog`
 */
export default function ContratosPage() {
  const [empresaFiltro, setEmpresaFiltro] = useState("all");
  const { dataUser } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const searchParams = useSearchParams();
  const idEmpresa = empresaFiltro === "all" ? null : Number(empresaFiltro);

  // Filtros base para query (controlados por el nuevo filtrado en encabezados)
  const [search] = useState("");
  const [tipoContrato] = useState("");
  const [estatus] = useState("");
  const [desde] = useState("");
  const [hasta] = useState("");

  // Paginación
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Modales
  const [openDialog, setOpenDialog] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [seedItem, setSeedItem] = useState(null); // para duplicación
  const [openView, setOpenView] = useState(false);
  const [viewItem, setViewItem] = useState(null);

  useEffect(() => {
    const id = searchParams.get("id");
    if (!id) return;
    contratosApi.getById(id).then((contrato) => {
      if (!contrato) return;
      setViewItem(contrato);
      setOpenView(true);
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const [deleteRow, setDeleteRow] = useState(null);
  const [filterOptionsRows, setFilterOptionsRows] = useState([]);
  const [headerFilterMeta, setHeaderFilterMeta] = useState({
    active: false,
    total: 0,
  });

  const empresaQuery = empresaFiltro === "all" ? "all" : empresaFiltro;

  const { data, isLoading, mutate } = useContratosData({
    idEmpresa: empresaQuery,
    page,
    limit,
    search,
    tipoContrato,
    estatus,
    desde,
    hasta,
  });

  console.log(data);
  const contratos = data?.data || [];
  const total = data?.total || 0;

  useEffect(() => {
    let isCancelled = false;

    const loadFilterOptionsRows = async () => {
      if (empresaQuery === undefined || empresaQuery === null) {
        if (!isCancelled) setFilterOptionsRows([]);
        return;
      }

      try {
        const pageSize = 500;
        const firstResp = await contratosApi.listar({
          empresa: empresaQuery,
          page: 1,
          limit: pageSize,
          search,
          tipo: tipoContrato,
          estatus,
          desde,
          hasta,
        });
        let allRows = Array.isArray(firstResp?.data)
          ? firstResp.data
          : firstResp?.contratos || [];
        const totalRows = Number(firstResp?.total || allRows.length);
        const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

        for (let currentPage = 2; currentPage <= totalPages; currentPage += 1) {
          const pageResp = await contratosApi.listar({
            empresa: empresaQuery,
            page: currentPage,
            limit: pageSize,
            search,
            tipo: tipoContrato,
            estatus,
            desde,
            hasta,
          });
          const rows = Array.isArray(pageResp?.data)
            ? pageResp.data
            : pageResp?.contratos || [];
          allRows = [...allRows, ...rows];
        }

        if (!isCancelled) setFilterOptionsRows(allRows);
      } catch (fetchError) {
        if (!isCancelled) setFilterOptionsRows([]);
      }
    };

    loadFilterOptionsRows();

    return () => {
      isCancelled = true;
    };
  }, [empresaQuery, search, tipoContrato, estatus, desde, hasta]);

  useEffect(() => {
    if (!headerFilterMeta.active) return;
    const totalPages = Math.max(1, Math.ceil(headerFilterMeta.total / limit));
    if (page > totalPages) setPage(1);
  }, [headerFilterMeta, page, limit]);

  // Alinear estadísticas con Apps Script (Vacaciones.html)
  const stats = useMemo(() => {
    const hoy = dayjs().startOf("day");
    let activos = 0;
    let porVencer = 0;
    let vencidos = 0;
    (contratos || []).forEach((c) => {
      const est = (c.estatus || "").toLowerCase();
      if (est === "activo") {
        activos += 1;
        if (c.fecha_fin) {
          const fin = dayjs(c.fecha_fin, ["YYYY-MM-DD", "DD/MM/YYYY"], true);
          if (fin.isValid()) {
            const diff = fin.startOf("day").diff(hoy, "day");
            if (diff < 0) vencidos += 1;
            else if (diff <= 30) porVencer += 1;
          }
        }
      }
    });
    return { total: total || contratos.length, activos, porVencer, vencidos };
  }, [contratos, total]);

  const exportarExcel = () => {
    if (!contratos || contratos.length === 0) return;
    const fmt = (d) => (d ? dayjs(d).format("YYYY-MM-DD") : "");
    const headers = [
      "Folio",
      "Empleado",
      "Puesto",
      "Tipo",
      "Fecha inicio",
      "Fecha fin",
      "Estatus",
      "Salario",
    ];
    const head = `<thead><tr>${headers
      .map((h) => `<th>${h}</th>`)
      .join("")}</tr></thead>`;
    const body = contratos
      .map((c) => {
        const cols = [
          c.folio || c.id || "",
          c.nombre_empleado || c.empleado_nombre || c.nombreEmpleado || "",
          c.puesto || "",
          c.tipo_contrato || c.tipoContrato || "",
          fmt(c.fecha_inicio || c.fechaInicio),
          fmt(c.fecha_fin || c.fechaFin),
          c.estatus || "",
          c.salario_base != null
            ? String(c.salario_base)
            : c.salarioBase != null
            ? String(c.salarioBase)
            : "",
        ];
        return `<tr>${cols
          .map(
            (x) =>
              `<td>${String(x ?? "")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")}</td>`,
          )
          .join("")}</tr>`;
      })
      .join("");
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><table>${head}<tbody>${body}</tbody></table></body></html>`;
    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contratos_${dayjs().format("YYYYMMDD_HHmm")}.xls`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleDuplicate = (row) => {
    setSeedItem(row);
    setEditItem(null);
    setOpenDialog(true);
  };

  const handleDelete = (row) => {
    setDeleteRow(row);
  };

  const confirmDelete = async () => {
    if (!deleteRow) return;
    try {
      await contratosApi.eliminar(deleteRow.id || deleteRow.id_contrato);
      enqueueSnackbar("Contrato eliminado", { variant: "success" });
      setDeleteRow(null);
      mutate();
    } catch (e) {
      enqueueSnackbar(e?.response?.data?.error || "No se pudo eliminar", {
        variant: "error",
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-6">
      <div className="flex justify-end mb-6">
        <Button
          className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-medium shadow-sm"
          onClick={() => {
            setSeedItem(null);
            setEditItem(null);
            setOpenDialog(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo contrato
        </Button>
      </div>

      {/* Estadísticas - Estilo ADAMIA */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">
                Total Contratos
              </p>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <svg
                className="w-6 h-6 text-[#2563EB]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Activos</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats.activos}
              </p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">
                Por Vencer (30d)
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {stats.porVencer}
              </p>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg">
              <svg
                className="w-6 h-6 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Vencidos</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats.vencidos}
              </p>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <ContratosTable
        items={contratos}
        filterOptionsRows={filterOptionsRows}
        loading={isLoading}
        page={page}
        limit={limit}
        onHeaderFilteringMetaChange={setHeaderFilterMeta}
        onEdit={(row) => {
          setEditItem(row);
          setSeedItem(null);
          setOpenDialog(true);
        }}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
        onView={(row) => {
          setViewItem(row);
          setOpenView(true);
        }}
      />

      {/* Paginación */}
      <TablePagination
        page={page}
        limit={limit}
        total={headerFilterMeta.active ? headerFilterMeta.total : total}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />

      {/* Modal crear/editar/duplicar */}
      <ContratoDialog
        open={openDialog}
        setOpen={setOpenDialog}
        editItem={editItem}
        seedItem={seedItem}
        onSaved={() => {
          setEditItem(null);
          setSeedItem(null);
          mutate();
        }}
        empresas={dataUser?.empresas_detalle || []}
      />

      {/* Ver detalles (no usado actualmente) */}
      <ContratoViewDialog
        open={openView}
        setOpen={setOpenView}
        item={viewItem}
      />

      {/* Confirmación de eliminación - ADAMIA */}
      <AlertDialog
        open={!!deleteRow}
        onOpenChange={(open) => !open && setDeleteRow(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-gradient-to-br from-red-500 to-red-600 p-3 rounded-lg shadow-md">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <AlertDialogTitle className="text-xl font-bold text-gray-900">
                ¿Eliminar contrato?
              </AlertDialogTitle>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
              <div className="flex items-start gap-3">
                <div className="bg-red-500 p-2 rounded-lg flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <AlertDialogDescription className="flex-1 text-sm text-red-700">
                  Esta acción no se puede deshacer. Se eliminará el contrato
                  {deleteRow?.folio
                    ? ` ${deleteRow.folio}`
                    : deleteRow?.id
                    ? ` #${deleteRow.id}`
                    : ""}
                  .
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel className="border-gray-300">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600 text-white font-medium shadow-sm"
            >
              Eliminar contrato
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Accesos Rápidos - Componente reutilizable (al final de la página) */}
      <AccesosRapidos />
    </div>
  );
}
