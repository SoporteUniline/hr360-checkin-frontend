"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import dayjs from "dayjs";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileSignature,
  FileText,
  FileSpreadsheet,
  Plus,
} from "lucide-react";
import EncabezadoPagina from "@/components/tabla/EncabezadoPagina";
import { Combobox } from "@/components/Combobox";
import StatCard from "@/components/StatCard";
import TablePagination from "@/components/TablePagination";
import ContratosTable from "./ContratosTable";
import CambiarEstatusContrato from "./CambiarEstatusContrato";
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
 *   - Componentes: `ContratosTable`; el detalle vive en `[id]/DetalleContrato.jsx`; alta, duplicar y editar, en sus páginas
 *     (`nuevo/`, `[id]/editar/`, con `formulario/FormularioContrato.jsx`)
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
  const [openEstatus, setOpenEstatus] = useState(false);
  const [estatusRow, setEstatusRow] = useState(null);
  const router = useRouter();

  // (27/11/2026) Enlaces de antes (?id=, campana de avisos, búsqueda): ahora abren la vista de detalle.
  // ?nuevo=<empleado>&empresa=&sueldo=&periodicidad= (enlaces de antes desde la ficha): ahora el alta es una página.
  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      router.replace(`/panel/contratos/${encodeURIComponent(id)}`);
      return;
    }
    const nuevo = searchParams.get("nuevo");
    if (nuevo) {
      const q = new URLSearchParams({ empleado: nuevo });
      for (const k of ["empresa", "sueldo", "periodicidad"]) if (searchParams.get(k)) q.set(k, searchParams.get(k));
      router.replace(`/panel/contratos/nuevo?${q}`);
    }
  }, [searchParams, router]);
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

  const contratos = data?.data || [];
  const total = data?.total || 0;
  const estadisticas = data?.estadisticas;

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

  // Estadísticas del universo completo: se prefieren las del servidor (`estadisticas`); el cálculo local es
  // fallback e IMPRECISO porque solo ve la página actual.
  const stats = useMemo(() => {
    const s = estadisticas;
    if (s && (s.total || s.activos || s.porVencer || s.vencidos)) {
      return {
        total: s.total ?? total ?? 0,
        activos: s.activos ?? 0,
        porVencer: s.porVencer ?? s.por_vencer ?? 0,
        vencidos: s.vencidos ?? 0,
      };
    }
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
  }, [contratos, total, estadisticas]);

  const exportarExcel = () => {
    // Exporta el universo completo cargado para la empresa (filterOptionsRows),
    // no solo la página visible. Cae a la página actual si aún no cargó.
    const filas =
      filterOptionsRows && filterOptionsRows.length > 0
        ? filterOptionsRows
        : contratos;
    if (!filas || filas.length === 0) {
      enqueueSnackbar("No hay contratos para exportar", { variant: "info" });
      return;
    }
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
    const body = filas
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

  // (27/11/2026) Duplicar, nuevo y editar ya no son ventanas: van a su página con pestañas.
  const handleDuplicate = (row) => router.push(`/panel/contratos/nuevo?duplicar=${encodeURIComponent(row.id || row.id_contrato)}`);

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

  const empresas = dataUser?.empresas_detalle || [];
  const empresaOptions = [
    { value: "all", label: "Todas las empresas" },
    ...empresas.map((e) => ({ value: String(e.id_empresa), label: e.nombre })),
  ];

  return (
    <div className="space-y-5">
      {/* Encabezado compacto homologado Adamia */}
      <EncabezadoPagina
        icono={FileSignature}
        titulo="Contratos"
        subtitulo="Gestión de contratos laborales: vigencias, vencimientos y estatus."
        acciones={
          <>
            {empresas.length > 1 && (
              <div className="w-48">
                <Combobox
                  name="empresa-contratos"
                  options={empresaOptions}
                  value={empresaFiltro}
                  onChange={(val) => {
                    setEmpresaFiltro(val || "all");
                    setPage(1);
                  }}
                  placeholder="Empresa"
                />
              </div>
            )}
            <Button asChild variant="outline" className="font-semibold">
              <Link href="/panel/contratos/revisar-sueldos">Revisar sueldos</Link>
            </Button>
            <Button
              variant="outline"
              className="font-semibold"
              onClick={exportarExcel}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button
              className="bg-brand font-semibold text-white shadow-sm hover:opacity-95"
              onClick={() => router.push("/panel/contratos/nuevo")}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo contrato
            </Button>
          </>
        }
      />

      {/* Estadísticas - Estilo ADAMIA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total contratos"
          value={stats.total}
          icon={FileText}
          accent="blue"
        />
        <StatCard
          title="Activos"
          value={stats.activos}
          icon={CheckCircle2}
          accent="emerald"
        />
        <StatCard
          title="Por vencer (30d)"
          value={stats.porVencer}
          icon={Clock}
          accent="amber"
        />
        <StatCard
          title="Vencidos"
          value={stats.vencidos}
          icon={AlertCircle}
          accent="red"
        />
      </div>

      {/* Tabla */}
      <ContratosTable
        items={contratos}
        filterOptionsRows={filterOptionsRows}
        loading={isLoading}
        page={page}
        limit={limit}
        onHeaderFilteringMetaChange={setHeaderFilterMeta}
        onEdit={(row) => router.push(`/panel/contratos/${encodeURIComponent(row.id || row.id_contrato)}/editar`)}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
        onCambiarEstatus={(row) => {
          setEstatusRow(row);
          setOpenEstatus(true);
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



      {/* Cambiar estatus (Activo / Suspendido / Terminado / Cancelado) */}
      <CambiarEstatusContrato
        open={openEstatus}
        setOpen={setOpenEstatus}
        contrato={estatusRow}
        onSaved={mutate}
      />

      {/* Confirmación de eliminación - ADAMIA */}
      <AlertDialog
        open={!!deleteRow}
        onOpenChange={(open) => !open && setDeleteRow(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-red-600 p-3 rounded-lg shadow-md">
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
