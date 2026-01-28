"use client";

import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Download, Plus, Search } from "lucide-react";
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
import useEmpleadosData from "@/hooks/useEmpleadosData";
import styles from "./contratos-theme.module.css";
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
  const { dataUser } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const idEmpresa = dataUser?.id_empresa;

  // Filtros
  const [search, setSearch] = useState(""); // folio/empleado
  const [tipoContrato, setTipoContrato] = useState("");
  const [estatus, setEstatus] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  // Paginación
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Modales
  const [openDialog, setOpenDialog] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [seedItem, setSeedItem] = useState(null); // para duplicación
  const [openView, setOpenView] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);

  // Sugerencias tipo módulo Permisos
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [hoveredSuggestionIndex, setHoveredSuggestionIndex] = useState(-1);
  const [activeSearchBox, setActiveSearchBox] = useState(null); // 'filters' | 'toolbar' | null
  const empleadosSugResp = useEmpleadosData(idEmpresa, 1, 8, search, "", "", "");
  const sugerencias = useMemo(() => {
    const list = empleadosSugResp?.data?.data || [];
    return list.map((e) => ({
      id_empleado: e.id_empleado,
      nombre_completo: [e.nombre, e.apellido_paterno, e.apellido_materno].filter(Boolean).join(" "),
    }));
  }, [empleadosSugResp?.data]);

  const handleSelectEmpleado = (emp) => {
    if (!emp) return;
    setSearch(emp.nombre_completo || "");
    setIsSuggestionsOpen(false);
    setPage(1);
  };

  const { data, isLoading, mutate } = useContratosData({
    idEmpresa,
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

  const limpiarFiltros = () => {
    setSearch("");
    setTipoContrato("");
    setEstatus("");
    setDesde("");
    setHasta("");
    setPage(1);
  };

  const exportarExcel = () => {
    if (!contratos || contratos.length === 0) return;
    const fmt = (d) => (d ? dayjs(d).format("YYYY-MM-DD") : "");
    const headers = ["Folio", "Empleado", "Puesto", "Tipo", "Fecha inicio", "Fecha fin", "Estatus", "Salario"];
    const head = `<thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>`;
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
          c.salario_base != null ? String(c.salario_base) : c.salarioBase != null ? String(c.salarioBase) : "",
        ];
        return `<tr>${cols.map((x) => `<td>${String(x ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>`).join("")}</tr>`;
      })
      .join("");
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><table>${head}<tbody>${body}</tbody></table></body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
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
      enqueueSnackbar(e?.response?.data?.error || "No se pudo eliminar", { variant: "error" });
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-6">
      {/* Header del módulo - Estilo ADAMIA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-50 p-3 rounded-lg">
            <svg className="w-7 h-7 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Contratos</h1>
            <p className="text-sm text-gray-600">Gestiona los contratos de tus empleados</p>
          </div>
        </div>
        <Button
          className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-medium shadow-sm"
          onClick={() => { setSeedItem(null); setEditItem(null); setOpenDialog(true); }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo contrato
        </Button>
      </div>

      {/* Filtros - Estilo ADAMIA */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtros de búsqueda</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Buscar</label>
              <div className="relative">
                <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  className="pl-9"
                  placeholder="Folio o empleado..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setIsSuggestionsOpen(true);
                    setHoveredSuggestionIndex(0);
                    setActiveSearchBox("filters");
                  }}
                  onFocus={() => {
                    setActiveSearchBox("filters");
                    setIsSuggestionsOpen(!!search);
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      setIsSuggestionsOpen(false);
                      setActiveSearchBox(null);
                    }, 120);
                  }}
                  onKeyDown={(e) => {
                    if (!isSuggestionsOpen || activeSearchBox !== "filters" || sugerencias.length === 0) return;
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setHoveredSuggestionIndex((prev) => (prev + 1 >= sugerencias.length ? 0 : prev + 1));
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setHoveredSuggestionIndex((prev) => (prev - 1 < 0 ? sugerencias.length - 1 : prev - 1));
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      handleSelectEmpleado(sugerencias[hoveredSuggestionIndex] || sugerencias[0]);
                    } else if (e.key === "Escape") {
                      setIsSuggestionsOpen(false);
                    }
                  }}
                />
                {isSuggestionsOpen && activeSearchBox === "filters" && sugerencias.length > 0 ? (
                  <div className="absolute left-0 right-0 mt-1 z-20 rounded-md border bg-white shadow">
                    <ul className="max-h-64 overflow-auto">
                      {sugerencias.map((emp, idx) => (
                        <li
                          key={emp.id_empleado}
                          onMouseDown={() => handleSelectEmpleado(emp)}
                          onMouseEnter={() => setHoveredSuggestionIndex(idx)}
                          className={`px-3 py-2 cursor-pointer text-sm ${idx === hoveredSuggestionIndex ? "bg-slate-100" : ""}`}
                        >
                          {emp.nombre_completo}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Tipo</label>
              <Select value={tipoContrato === "" ? "__all__" : tipoContrato} onValueChange={(v) => setTipoContrato(v === "__all__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  <SelectItem value="indefinido">Indefinido</SelectItem>
                  <SelectItem value="temporal">Temporal</SelectItem>
                  <SelectItem value="obra_determinada">Obra Determinada</SelectItem>
                  <SelectItem value="capacitacion">Capacitación Inicial</SelectItem>
                  <SelectItem value="prueba">Periodo de Prueba</SelectItem>
                  <SelectItem value="prestacion_servicios">Prestación de Servicios</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Estatus</label>
              <Select value={estatus === "" ? "__all__" : estatus} onValueChange={(v) => setEstatus(v === "__all__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="suspendido">Suspendido</SelectItem>
                  <SelectItem value="terminado">Terminado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Desde</label>
              <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Hasta</label>
              <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={limpiarFiltros}
              className="border-gray-300"
            >
              Limpiar filtros
            </Button>
            <Button
              onClick={() => mutate()}
              className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-medium shadow-sm"
            >
              Aplicar filtros
            </Button>
          </div>
        </div>
      </div>

      {/* Estadísticas - Estilo ADAMIA */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Contratos</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <svg className="w-6 h-6 text-[#2563EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Activos</p>
              <p className="text-3xl font-bold text-gray-900">{stats.activos}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Por Vencer (30d)</p>
              <p className="text-3xl font-bold text-gray-900">{stats.porVencer}</p>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Vencidos</p>
              <p className="text-3xl font-bold text-gray-900">{stats.vencidos}</p>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de búsqueda rápida */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="relative w-full">
          <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            className="pl-9"
            placeholder="Buscar por folio o empleado..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setIsSuggestionsOpen(true);
              setHoveredSuggestionIndex(0);
              setActiveSearchBox("toolbar");
            }}
            onFocus={() => {
              setActiveSearchBox("toolbar");
              setIsSuggestionsOpen(!!search);
            }}
            onBlur={() => {
              setTimeout(() => {
                setIsSuggestionsOpen(false);
                setActiveSearchBox(null);
              }, 120);
            }}
            onKeyDown={(e) => {
              if (!isSuggestionsOpen || activeSearchBox !== "toolbar" || sugerencias.length === 0) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHoveredSuggestionIndex((prev) => (prev + 1 >= sugerencias.length ? 0 : prev + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHoveredSuggestionIndex((prev) => (prev - 1 < 0 ? sugerencias.length - 1 : prev - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                handleSelectEmpleado(sugerencias[hoveredSuggestionIndex] || sugerencias[0]);
              } else if (e.key === "Escape") {
                setIsSuggestionsOpen(false);
              }
            }}
          />
          {isSuggestionsOpen && activeSearchBox === "toolbar" && sugerencias.length > 0 ? (
            <div className="absolute left-0 right-0 mt-1 z-20 rounded-md border bg-white shadow-lg">
              <ul className="max-h-64 overflow-auto">
                {sugerencias.map((emp, idx) => (
                  <li
                    key={emp.id_empleado}
                    onMouseDown={() => handleSelectEmpleado(emp)}
                    onMouseEnter={() => setHoveredSuggestionIndex(idx)}
                    className={`px-3 py-2 cursor-pointer text-sm ${idx === hoveredSuggestionIndex ? "bg-blue-50" : ""}`}
                  >
                    {emp.nombre_completo}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      {/* Tabla */}
      <ContratosTable
        items={contratos}
        loading={isLoading}
        onEdit={(row) => { setEditItem(row); setSeedItem(null); setOpenDialog(true); }}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
        onView={(row) => { setViewItem(row); setOpenView(true); }}
      />

      {/* Paginación */}
      <TablePagination page={page} limit={limit} total={total} onPageChange={setPage} onLimitChange={setLimit} />

      {/* Modal crear/editar/duplicar */}
      <ContratoDialog
        open={openDialog}
        setOpen={setOpenDialog}
        editItem={editItem}
        seedItem={seedItem}
        idEmpresa={idEmpresa}
        onSaved={() => { setEditItem(null); setSeedItem(null); mutate(); }}
      />

      {/* Ver detalles (no usado actualmente) */}
      <ContratoViewDialog open={openView} setOpen={setOpenView} item={viewItem} />

      {/* Confirmación de eliminación - ADAMIA */}
      <AlertDialog open={!!deleteRow} onOpenChange={(open) => !open && setDeleteRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-gradient-to-br from-red-500 to-red-600 p-3 rounded-lg shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <AlertDialogTitle className="text-xl font-bold text-gray-900">
                ¿Eliminar contrato?
              </AlertDialogTitle>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
              <div className="flex items-start gap-3">
                <div className="bg-red-500 p-2 rounded-lg flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <AlertDialogDescription className="flex-1 text-sm text-red-700">
                  Esta acción no se puede deshacer. Se eliminará el contrato
                  {deleteRow?.folio ? ` ${deleteRow.folio}` : deleteRow?.id ? ` #${deleteRow.id}` : ""}.
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


