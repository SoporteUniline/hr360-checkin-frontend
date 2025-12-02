/* eslint-disable react-hooks/exhaustive-deps */
"use client";

/**
 * Página: Panel de Vacaciones
 * - Replica la UI/UX esencial de Vacaciones.html en Next.js + shadcn/ui
 * - Conecta con backend: /api/checador/vacaciones/...
 * - Respeta el manejo por empresa: toma id_empresa desde AuthContext
 *
 * Relacionado con:
 * - Sidebar: src/components/Sidebar/nav-main.jsx (botón "Panel Vacaciones")
 * - Backend: redlab_back/modules/attendance/controllers/vacacionesController.js
 *            redlab_back/modules/attendance/routes/vacacionesRoutes.js
 */

import { Fragment, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TablePagination from "@/components/TablePagination";

function numberFormat(n) {
  try {
    return new Intl.NumberFormat("es-MX").format(n ?? 0);
  } catch {
    return String(n ?? 0);
  }
}

export default function VacacionesPage() {
  // Empresa actual (todo se maneja por empresa)
  const { dataUser } = useAuth();
  const idEmpresa = dataUser?.id_empresa;

  // Estado de datos
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState([]); // [{ id_empleado, nombre_completo, empresa, departamento, dias_* }]

  // Filtros (cliente)
  const [filterEmpleado, setFilterEmpleado] = useState("");
  const [filterDepartamento, setFilterDepartamento] = useState("");
  const [filterEstado, setFilterEstado] = useState(""); // "" | "con" | "sin"

  // Paginación (cliente)
  // - Controla el pie de página (paginador y "Mostrar N")
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const pageSizeOptions = [10, 25, 50, 100];

  // Buscador con sugerencias (typeahead)
  // - Lista de empleados coincidentes para seleccionar rápidamente
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [hoveredSuggestionIndex, setHoveredSuggestionIndex] = useState(-1);

  // Diálogos de detalle
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [detalleData, setDetalleData] = useState(null); // Respuesta del backend para cargados/tomados

  // Desplegable por fila (nuevo estilo)
  // - Controla qué empleado está expandido y qué pestaña se muestra (cargados|tomados)
  // - Cachea las respuestas por empleado para evitar refetch innecesario
  const [expandedRow, setExpandedRow] = useState(null);
  const [expandedTab, setExpandedTab] = useState("cargados");
  const [rowLoading, setRowLoading] = useState(false);
  const [cacheCargados, setCacheCargados] = useState({});
  const [cacheTomados, setCacheTomados] = useState({});

  // Cargar reporte principal
  useEffect(() => {
    const fetchData = async () => {
      if (!idEmpresa) return;
      setLoading(true);
      setError(null);
      try {
        const url = `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/vacaciones/reporte`;
        const res = await axios.get(url, {
          params: {
            // Acepta ambos nombres por consistencia con otras rutas
            empresa: idEmpresa,
            id_empresa: idEmpresa,
          },
        });
        setData(res.data || []);
      } catch (err) {
        setError("Error al cargar datos de vacaciones");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [idEmpresa]);

  // Listas derivadas (departamentos únicos)
  const departamentos = useMemo(() => {
    const set = new Set(
      (data || [])
        .map((d) => d?.departamento)
        .filter((x) => x && x !== "Sin departamento")
    );
    return Array.from(set).sort();
  }, [data]);

  // Filtrado cliente
  const datosFiltrados = useMemo(() => {
    let arr = data || [];

    if (filterEmpleado) {
      const v = filterEmpleado.toLowerCase();
      arr = arr.filter((d) => d?.nombre_completo?.toLowerCase().includes(v));
    }
    if (filterDepartamento) {
      arr = arr.filter((d) => d?.departamento === filterDepartamento);
    }
    if (filterEstado === "con") {
      arr = arr.filter((d) => (d?.dias_cargados ?? 0) > 0);
    } else if (filterEstado === "sin") {
      arr = arr.filter((d) => (d?.dias_cargados ?? 0) === 0);
    }
    return arr;
  }, [data, filterEmpleado, filterDepartamento, filterEstado]);

  // Sugerencias del buscador (máx 8 resultados)
  const sugerencias = useMemo(() => {
    if (!filterEmpleado) return [];
    const v = filterEmpleado.toLowerCase();
    return (data || [])
      .filter((d) => d?.nombre_completo?.toLowerCase().includes(v))
      .slice(0, 8);
  }, [filterEmpleado, data]);

  // Paginación derivada y recortes
  const totalRegistros = datosFiltrados.length;
  const totalPaginas = Math.max(1, Math.ceil(totalRegistros / rowsPerPage));
  const datosPagina = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return datosFiltrados.slice(start, end);
  }, [datosFiltrados, currentPage, rowsPerPage]);

  // Asegura que al cambiar filtros o tamaño de página, volvamos a página 1
  useEffect(() => {
    setCurrentPage(1);
  }, [filterEmpleado, filterDepartamento, filterEstado, rowsPerPage]);

  // Si el total de páginas cambia y la actual queda fuera de rango, la ajustamos
  useEffect(() => {
    if (currentPage > totalPaginas) {
      setCurrentPage(totalPaginas);
    }
  }, [totalPaginas]);

  // Selección desde sugerencias
  const handleSelectEmpleado = (emp) => {
    if (!emp) return;
    setFilterEmpleado(emp?.nombre_completo || "");
    setIsSuggestionsOpen(false);
    setCurrentPage(1);
  };

  // Cerrar el desplegable al cambiar filtros/paginación para evitar estados inconsistentes
  useEffect(() => {
    setExpandedRow(null);
  }, [
    filterEmpleado,
    filterDepartamento,
    filterEstado,
    currentPage,
    rowsPerPage,
  ]);

  // KPIs
  const kpis = useMemo(() => {
    const total = datosFiltrados.length;
    const conV = datosFiltrados.filter(
      (d) => (d?.dias_cargados ?? 0) > 0
    ).length;
    const sinV = total - conV;
    const totalDias = datosFiltrados.reduce(
      (acc, d) => acc + (d?.dias_disponibles ?? 0),
      0
    );
    return { total, conV, sinV, totalDias };
  }, [datosFiltrados]);

  // Helpers para nuevo panel desplegable
  const toggleExpand = async (idEmpleado, tab = "cargados") => {
    // Si ya está abierto y clickean la misma pestaña, colapsa
    if (expandedRow === idEmpleado && expandedTab === tab) {
      setExpandedRow(null);
      return;
    }
    setExpandedRow(idEmpleado);
    setExpandedTab(tab);
    // Carga perezosa
    await ensureRowDetalle(tab, idEmpleado);
  };

  const ensureRowDetalle = async (tipo, idEmpleado) => {
    const cache =
      tipo === "cargados"
        ? cacheCargados?.[idEmpleado]
        : cacheTomados?.[idEmpleado];
    if (cache || !idEmpresa) return;
    setRowLoading(true);
    try {
      const url = `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/vacaciones/${tipo}/${idEmpleado}`;
      const res = await axios.get(url, {
        params: { empresa: idEmpresa, id_empresa: idEmpresa },
      });
      if (tipo === "cargados") {
        setCacheCargados((prev) => ({ ...prev, [idEmpleado]: res.data }));
      } else {
        setCacheTomados((prev) => ({ ...prev, [idEmpleado]: res.data }));
      }
    } catch {
      if (tipo === "cargados") {
        setCacheCargados((prev) => ({ ...prev, [idEmpleado]: null }));
      } else {
        setCacheTomados((prev) => ({ ...prev, [idEmpleado]: null }));
      }
    } finally {
      setRowLoading(false);
    }
  };

  useEffect(() => {
    if (expandedRow && idEmpresa) {
      // Asegura que al cambiar de pestaña se carguen datos si faltan
      ensureRowDetalle(expandedTab, expandedRow);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedTab, expandedRow, idEmpresa]);

  // Click sobre la fila: si está abierta, plegar SIEMPRE; si está cerrada, abrir con "cargados"
  const handleRowClick = async (idEmpleado) => {
    if (expandedRow === idEmpleado) {
      setExpandedRow(null);
      return;
    }
    setExpandedRow(idEmpleado);
    setExpandedTab("cargados");
    await ensureRowDetalle("cargados", idEmpleado);
  };

  const mesesCortos = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];
  const rangoVacaciones = (vacaciones = []) => {
    if (!vacaciones.length) return "-";
    const fechas = vacaciones
      .map((v) => new Date(`${v.fecha}T00:00:00`))
      .sort((a, b) => a - b);
    const a = fechas[0];
    const b = fechas[fechas.length - 1];
    if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()) {
      return `${mesesCortos[a.getMonth()]} ${a.getFullYear()}`;
    }
    return `${mesesCortos[a.getMonth()]} - ${
      mesesCortos[b.getMonth()]
    } ${b.getFullYear()}`;
  };
  const mesesLargos = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  const diasSemana = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];
  const formatSpanishDate = (iso) => {
    const d = new Date(`${iso}T00:00:00`);
    return { day: d.getDate(), weekday: diasSemana[d.getDay()] };
  };
  const groupVacacionesByYearMonth = (vacaciones = []) => {
    const map = {};
    vacaciones.forEach((v) => {
      const date = new Date(`${v.fecha}T00:00:00`);
      const year = date.getFullYear();
      const month = date.getMonth();
      const key = `${year}-${month}`;
      if (!map[key]) map[key] = { year, month, vacaciones: [] };
      map[key].vacaciones.push({ ...v, _date: date });
    });
    const groups = Object.values(map);
    groups.forEach((g) => g.vacaciones.sort((a, b) => b._date - a._date));
    groups.sort((a, b) => b.year - a.year || b.month - a.month);
    return groups;
  };

  // Acciones de detalle (cargados/tomados)
  const abrirDetalleCargados = async (idEmpleado) => {
    setDialogOpen(true);
    setDialogTitle("Días Cargados");
    await cargarDetalle("cargados", idEmpleado);
  };
  const abrirDetalleTomados = async (idEmpleado) => {
    setDialogOpen(true);
    setDialogTitle("Días Tomados");
    await cargarDetalle("tomados", idEmpleado);
  };
  const cargarDetalle = async (tipo, idEmpleado) => {
    setDetalleLoading(true);
    setDetalleData(null);
    try {
      const url = `${process.env.NEXT_PUBLIC_RUTA_BACKEND}/checador/vacaciones/${tipo}/${idEmpleado}`;
      const res = await axios.get(url, {
        params: {
          empresa: idEmpresa,
          id_empresa: idEmpresa,
        },
      });
      setDetalleData(res.data);
    } catch {
      setDetalleData(null);
    } finally {
      setDetalleLoading(false);
    }
  };

  const limpiarFiltros = () => {
    setFilterEmpleado("");
    setFilterDepartamento("");
    setFilterEstado("");
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">
            📊 Reporte de Vacaciones
          </h1>
          <p className="text-sm text-muted-foreground">
            Control de días de vacaciones por empleado
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4 border-l-4" style={{ borderLeftColor: "#3498db" }}>
          <div className="text-[11px] uppercase font-semibold text-slate-500">
            Total Empleados
          </div>
          <div className="text-2xl font-extrabold">
            {numberFormat(kpis.total)}
          </div>
        </Card>
        <Card className="p-4 border-l-4" style={{ borderLeftColor: "#27ae60" }}>
          <div className="text-[11px] uppercase font-semibold text-slate-500">
            Con Vacaciones
          </div>
          <div className="text-2xl font-extrabold">
            {numberFormat(kpis.conV)}
          </div>
        </Card>
        <Card className="p-4 border-l-4" style={{ borderLeftColor: "#e74c3c" }}>
          <div className="text-[11px] uppercase font-semibold text-slate-500">
            Sin Vacaciones
          </div>
          <div className="text-2xl font-extrabold">
            {numberFormat(kpis.sinV)}
          </div>
        </Card>
        <Card className="p-4 border-l-4" style={{ borderLeftColor: "#9b59b6" }}>
          <div className="text-[11px] uppercase font-semibold text-slate-500">
            Total Días Disponibles
          </div>
          <div className="text-2xl font-extrabold">
            {numberFormat(kpis.totalDias)}
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            {/* Campo de búsqueda con sugerencias (typeahead) */}
            <input
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="🔍 Buscar empleado..."
              value={filterEmpleado}
              onChange={(e) => {
                setFilterEmpleado(e.target.value);
                setIsSuggestionsOpen(true);
                setHoveredSuggestionIndex(0);
              }}
              onFocus={() => setIsSuggestionsOpen(!!filterEmpleado)}
              onBlur={() => {
                // Delay para permitir onMouseDown de las opciones
                setTimeout(() => setIsSuggestionsOpen(false), 120);
              }}
              onKeyDown={(e) => {
                if (!isSuggestionsOpen || sugerencias.length === 0) return;
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setHoveredSuggestionIndex((prev) =>
                    prev + 1 >= sugerencias.length ? 0 : prev + 1
                  );
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHoveredSuggestionIndex((prev) =>
                    prev - 1 < 0 ? sugerencias.length - 1 : prev - 1
                  );
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  handleSelectEmpleado(
                    sugerencias[hoveredSuggestionIndex] || sugerencias[0]
                  );
                } else if (e.key === "Escape") {
                  setIsSuggestionsOpen(false);
                }
              }}
            />
            {/* Lista de sugerencias */}
            {isSuggestionsOpen && sugerencias.length > 0 ? (
              <div className="absolute left-0 right-0 mt-1 z-20 rounded-md border bg-white shadow">
                <ul className="max-h-64 overflow-auto">
                  {sugerencias.map((emp, idx) => (
                    <li
                      key={emp.id_empleado}
                      onMouseDown={() => handleSelectEmpleado(emp)}
                      onMouseEnter={() => setHoveredSuggestionIndex(idx)}
                      className={`px-3 py-2 cursor-pointer text-sm ${
                        idx === hoveredSuggestionIndex ? "bg-slate-100" : ""
                      }`}
                    >
                      {emp.nombre_completo}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          <select
            className="w-full border rounded-md px-3 py-2 text-sm"
            value={filterDepartamento}
            onChange={(e) => setFilterDepartamento(e.target.value)}
          >
            <option value="">📁 Todos los departamentos</option>
            {departamentos.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            className="w-full border rounded-md px-3 py-2 text-sm"
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
          >
            <option value="">📊 Todos los estados</option>
            <option value="con">✅ Con vacaciones</option>
            <option value="sin">❌ Sin vacaciones</option>
          </select>
          <div className="flex md:justify-end">
            <Button variant="destructive" onClick={limpiarFiltros}>
              🗑️ Limpiar filtros
            </Button>
          </div>
        </div>
      </Card>

      {/* Contenido */}
      <Card className="p-0">
        {loading ? (
          <div className="text-center text-slate-400 py-16">
            Cargando datos...
          </div>
        ) : error ? (
          <div className="text-center text-red-500 py-16">{error}</div>
        ) : datosFiltrados.length === 0 ? (
          <div className="text-center text-slate-400 py-16">
            No se encontraron resultados
          </div>
        ) : (
          <>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead className="text-center">Días Cargados</TableHead>
                    <TableHead className="text-center">Días Tomados</TableHead>
                    <TableHead className="text-center">
                      Días Disponibles
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {datosPagina.map((emp) => {
                    const dDisp = emp?.dias_disponibles ?? 0;
                    const badgeVariant =
                      dDisp === 0
                        ? "destructive"
                        : dDisp < 5
                        ? "secondary"
                        : "default";
                    return (
                      <Fragment key={emp.id_empleado}>
                        <TableRow
                          key={emp.id_empleado}
                          className="cursor-pointer hover:bg-slate-50"
                          onClick={() => handleRowClick(emp.id_empleado)}
                        >
                          <TableCell className="font-semibold">
                            <span
                              className={`mr-2 inline-block transition-transform ${
                                expandedRow === emp.id_empleado
                                  ? "rotate-90"
                                  : ""
                              }`}
                            >
                              ▶
                            </span>
                            {emp.nombre_completo}
                          </TableCell>
                          <TableCell>{emp.departamento}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">
                              {numberFormat(emp.dias_cargados)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">
                              {numberFormat(emp.dias_tomados)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={badgeVariant}>
                              {numberFormat(dDisp)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                        {expandedRow === emp.id_empleado ? (
                          <TableRow>
                            <TableCell colSpan={5} className="p-0 bg-slate-50">
                              <div className="border-t p-3">
                                {/* Tabs tipo botones */}
                                <div className="inline-flex rounded-md bg-slate-100 p-1 mb-3">
                                  <button
                                    className={`px-3 py-1.5 text-sm font-semibold rounded ${
                                      expandedTab === "cargados"
                                        ? "bg-white shadow"
                                        : "text-slate-600"
                                    }`}
                                    onClick={() => setExpandedTab("cargados")}
                                  >
                                    📅 Días Cargados
                                  </button>
                                  <button
                                    className={`px-3 py-1.5 text-sm font-semibold rounded ${
                                      expandedTab === "tomados"
                                        ? "bg-white shadow"
                                        : "text-slate-600"
                                    }`}
                                    onClick={() => setExpandedTab("tomados")}
                                  >
                                    🏖️ Días Tomados
                                  </button>
                                </div>

                                {/* Resumen del empleado */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                                  <Card className="p-3">
                                    <div className="text-[11px] uppercase text-slate-500">
                                      Días Cargados
                                    </div>
                                    <div className="text-xl font-extrabold">
                                      {numberFormat(emp.dias_cargados)}
                                    </div>
                                  </Card>
                                  <Card className="p-3">
                                    <div className="text-[11px] uppercase text-slate-500">
                                      Días Tomados
                                    </div>
                                    <div className="text-xl font-extrabold">
                                      {numberFormat(emp.dias_tomados)}
                                    </div>
                                  </Card>
                                  <Card className="p-3">
                                    <div className="text-[11px] uppercase text-slate-500">
                                      Disponibles
                                    </div>
                                    <div
                                      className={`text-xl font-extrabold ${
                                        dDisp === 0
                                          ? "text-red-600"
                                          : dDisp < 5
                                          ? "text-amber-600"
                                          : "text-emerald-600"
                                      }`}
                                    >
                                      {numberFormat(dDisp)}
                                    </div>
                                  </Card>
                                </div>

                                {/* Contenido */}
                                <div className="bg-white rounded-md border">
                                  {rowLoading ? (
                                    <div className="text-center text-slate-400 py-10">
                                      Cargando...
                                    </div>
                                  ) : expandedTab === "cargados" ? (
                                    <div className="overflow-auto">
                                      {(
                                        cacheCargados[emp.id_empleado]
                                          ?.periodos ?? []
                                      ).length === 0 ? (
                                        <div className="text-center text-slate-400 py-8">
                                          No tiene periodos registrados
                                        </div>
                                      ) : (
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead>Año</TableHead>
                                              <TableHead className="text-center">
                                                Días
                                              </TableHead>
                                              <TableHead>Inicio</TableHead>
                                              <TableHead>Fin</TableHead>
                                              <TableHead className="text-center">
                                                Estado
                                              </TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {(
                                              cacheCargados[emp.id_empleado]
                                                ?.periodos ?? []
                                            ).map((p) => {
                                              const activa =
                                                p?.estado === "Activa";
                                              return (
                                                <TableRow
                                                  key={`${p.id}-${p.anios}`}
                                                >
                                                  <TableCell className="font-semibold">
                                                    Año {p?.anios}
                                                  </TableCell>
                                                  <TableCell className="text-center">
                                                    <Badge variant="outline">
                                                      {numberFormat(p?.dias)}{" "}
                                                      días
                                                    </Badge>
                                                  </TableCell>
                                                  <TableCell>
                                                    📆 {p?.fecha_inicio}
                                                  </TableCell>
                                                  <TableCell>
                                                    📆 {p?.fecha_fin}
                                                  </TableCell>
                                                  <TableCell className="text-center">
                                                    <Badge
                                                      variant={
                                                        activa
                                                          ? "default"
                                                          : "secondary"
                                                      }
                                                    >
                                                      {p?.estado}
                                                    </Badge>
                                                  </TableCell>
                                                </TableRow>
                                              );
                                            })}
                                          </TableBody>
                                        </Table>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="p-3">
                                      {/* Métricas simples */}
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                                        <Card className="p-3">
                                          <div className="text-[11px] uppercase text-slate-500">
                                            Total Días
                                          </div>
                                          <div className="text-2xl font-extrabold">
                                            {numberFormat(
                                              cacheTomados[emp.id_empleado]
                                                ?.total ??
                                                cacheTomados[emp.id_empleado]
                                                  ?.vacaciones?.length ??
                                                0
                                            )}
                                          </div>
                                        </Card>
                                        <Card className="p-3">
                                          <div className="text-[11px] uppercase text-slate-500">
                                            Período
                                          </div>
                                          <div className="text-base font-semibold">
                                            {rangoVacaciones(
                                              cacheTomados[emp.id_empleado]
                                                ?.vacaciones ?? []
                                            )}
                                          </div>
                                        </Card>
                                      </div>

                                      {/* Grid de días tomados (estilo ejemplo HTML) */}
                                      {(() => {
                                        const vacaciones =
                                          cacheTomados[emp.id_empleado]
                                            ?.vacaciones ?? [];
                                        if (vacaciones.length === 0) {
                                          return (
                                            <div className="text-center text-slate-400 py-8">
                                              No ha tomado vacaciones
                                            </div>
                                          );
                                        }
                                        const grupos =
                                          groupVacacionesByYearMonth(
                                            vacaciones
                                          );
                                        return (
                                          <div className="flex flex-col gap-5">
                                            {grupos.map((g) => (
                                              <div
                                                key={`${g.year}-${g.month}`}
                                                className="pl-4 border-l-4 border-slate-300"
                                              >
                                                <div className="mb-3">
                                                  <div className="text-lg font-extrabold text-slate-700">
                                                    {g.year}
                                                  </div>
                                                  <div className="text-sm font-semibold text-slate-500">
                                                    {mesesLargos[g.month]}
                                                  </div>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                  {g.vacaciones.map((v) => {
                                                    const f = formatSpanishDate(
                                                      v.fecha
                                                    );
                                                    return (
                                                      <div
                                                        key={v.id}
                                                        className="flex items-center gap-3 rounded-md border bg-white p-3 shadow-sm transition hover:shadow-md"
                                                      >
                                                        <div className="w-12 h-12 rounded-md bg-slate-800 text-white flex items-center justify-center font-extrabold text-xl">
                                                          {f.day}
                                                        </div>
                                                        <div className="min-w-0">
                                                          <div className="mb-1">
                                                            <span className="inline-block text-[11px] font-bold text-white bg-emerald-600 rounded-full px-2 py-0.5">
                                                              {f.weekday.toUpperCase()}
                                                            </span>
                                                          </div>
                                                          <div className="text-xs text-slate-600 truncate">
                                                            {v.notas ||
                                                              "Sin notas"}
                                                          </div>
                                                        </div>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {/* Pie de página: usa el mismo paginador que la página de Permisos */}
            {true ? (
              <TablePagination
                page={currentPage}
                limit={rowsPerPage}
                total={totalRegistros}
                onPageChange={setCurrentPage}
                onLimitChange={setRowsPerPage}
              />
            ) : (
              // Bloque legado (se conserva por compatibilidad, no se renderiza)
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between border-t px-3 py-3 text-sm">
                <div className="text-slate-600">
                  Página <span className="font-semibold">{currentPage}</span> de{" "}
                  <span className="font-semibold">{totalPaginas}</span> —{" "}
                  <span className="font-semibold">
                    {numberFormat(totalRegistros)}
                  </span>{" "}
                  registros
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600">Mostrar:</span>
                    <select
                      className="border rounded-md px-2 py-1 text-sm"
                      value={rowsPerPage}
                      onChange={(e) => setRowsPerPage(Number(e.target.value))}
                    >
                      {pageSizeOptions.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      ◀ Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPaginas}
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPaginas, p + 1))
                      }
                    >
                      Siguiente ▶
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Diálogo de detalles */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          {detalleLoading ? (
            <div className="text-center text-slate-400 py-10">Cargando...</div>
          ) : !detalleData ? (
            <div className="text-center text-slate-400 py-10">Sin datos</div>
          ) : dialogTitle.includes("Cargados") ? (
            <div className="space-y-4">
              <Card className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                  <div>
                    <div className="text-[11px] uppercase text-slate-500">
                      Nombre
                    </div>
                    <div className="font-semibold">
                      {detalleData?.empleado?.nombre_completo}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase text-slate-500">
                      Empresa
                    </div>
                    <div className="font-semibold">
                      {detalleData?.empleado?.empresa}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase text-slate-500">
                      Departamento
                    </div>
                    <div className="font-semibold">
                      {detalleData?.empleado?.departamento}
                    </div>
                  </div>
                </div>
              </Card>
              <div className="space-y-2">
                {(detalleData?.periodos ?? []).length === 0 ? (
                  <div className="text-center text-slate-400 py-6">
                    No tiene periodos registrados
                  </div>
                ) : (
                  (detalleData?.periodos ?? []).map((p) => {
                    const activa = p?.estado === "Activa";
                    return (
                      <Card key={p.id} className="p-4">
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-semibold">Año {p?.anios}</div>
                          <div className="text-xl font-extrabold text-emerald-600">
                            {numberFormat(p?.dias)} días
                          </div>
                        </div>
                        <div className="text-sm text-slate-500 mb-2">
                          📆 {p?.fecha_inicio} → {p?.fecha_fin}
                        </div>
                        <Badge variant={activa ? "default" : "secondary"}>
                          {p?.estado}
                        </Badge>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Card className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                  <div>
                    <div className="text-[11px] uppercase text-slate-500">
                      Nombre
                    </div>
                    <div className="font-semibold">
                      {detalleData?.empleado?.nombre_completo}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase text-slate-500">
                      Empresa
                    </div>
                    <div className="font-semibold">
                      {detalleData?.empleado?.empresa}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase text-slate-500">
                      Total días tomados
                    </div>
                    <div className="font-extrabold text-red-600">
                      {numberFormat(detalleData?.total)} días
                    </div>
                  </div>
                </div>
              </Card>
              <Card className="p-0 overflow-hidden">
                <div className="max-h-[400px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Notas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(detalleData?.vacaciones ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center">
                            No ha tomado vacaciones
                          </TableCell>
                        </TableRow>
                      ) : (
                        (detalleData?.vacaciones ?? []).map((v) => (
                          <TableRow key={v.id}>
                            <TableCell className="font-semibold">
                              {v.fecha}
                            </TableCell>
                            <TableCell className="text-sm text-slate-500">
                              {v.notas || "-"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
