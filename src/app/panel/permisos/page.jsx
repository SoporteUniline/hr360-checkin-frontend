"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import dayjs from "dayjs";
import useSWR from "swr";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, Search, CalendarDays, Table as TableIcon, ChevronLeft, ChevronRight } from "lucide-react";
import usePermisosData from "@/hooks/usePermisosData";
import useEmpleadosData from "@/hooks/useEmpleadosData";
import useTiposPermisoData from "@/hooks/useTiposPermisoData";
import TablePagination from "@/components/TablePagination";
import PermisosTable from "./PermisosTable";
import PermisoDialog from "./PermisoDialog";
import PermisoDeleteDialog from "./PermisoDeleteDialog";
import PermisoViewDialog from "./PermisoViewDialog";
import styles from "./permisos-theme.module.css";
import { fetcherWithToken } from "@/lib/fetcher";

/**
 * Página de gestión de Permisos (solicitudes_permiso)
 * - Replica el diseño de diego.html usando Tailwind + shadcn/ui
 * - Relación:
 *   - Hooks: `usePermisosData`, `useTiposPermisoData`
 *   - API: `src/lib/permisosApi.js`
 *   - Componentes: `PermisosTable`, `PermisoDialog`
 */
export default function PermisosPage() {
  const { dataUser } = useAuth();
  const idEmpresa = dataUser?.id_empresa;

  // Filtros
  const [empleado, setEmpleado] = useState("");
  const [idTipoPermiso, setIdTipoPermiso] = useState("");
  const [estado, setEstado] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  // const [search, setSearch] = useState(""); // texto libre eliminado

  // Paginación
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Modal de alta/edición
  const [openDialog, setOpenDialog] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [openView, setOpenView] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [openDelete, setOpenDelete] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Vista principal: 'tabla' | 'calendario'
  // - Inspirado en Vacaciones.html (dos pestañas para alternar vista)
  // - Se conserva la tabla existente; se agrega la vista de calendario mensual.
  const [vista, setVista] = useState("tabla");

  // Estado de mes actual para calendario (relación directa con el hook de datos del calendario)
  const [mesActual, setMesActual] = useState(dayjs()); // mes visible en calendario

  const { data: tiposPermisoResp } = useTiposPermisoData();
  // Adaptar a la respuesta real del endpoint: { total, tiposPermiso: [...] }
  const tiposPermiso = Array.isArray(tiposPermisoResp)
    ? tiposPermisoResp
    : tiposPermisoResp?.tiposPermiso || [];

  const { data, isLoading, mutate } = usePermisosData({
    idEmpresa,
    page,
    limit,
    empleado,
    idEmpleado: "", // futuro: podríamos usar un selector de empleados por ID
    idTipoPermiso: idTipoPermiso || "",
    estado,
    desde,
    hasta,
    // search eliminado
  });

  const registros = data?.data || [];
  const total = data?.total || 0;
  const estadisticas = data?.estadisticas || {
    total: 0,
    pendientes: 0,
    aprobados: 0,
    rechazados: 0,
    cancelados: 0,
  };

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  // Cargar festivos de la empresa para conteo de días laborables (domingos y festivos no cuentan)
  // - Endpoint reutilizado del módulo de Festivos: /checador/holidays/:id_empresa
  const { data: festivosResp } = useSWR(
    idEmpresa ? `/checador/holidays/${idEmpresa}?page=1&limit=5000&filter=` : null,
    fetcherWithToken
  );
  const festivosSet = useMemo(() => {
    const list = festivosResp?.festivos || [];
    const set = new Set();
    list.forEach((f) => {
      if (f?.fecha) {
        try {
          set.add(dayjs(f.fecha).format("YYYY-MM-DD"));
        } catch {}
      }
    });
    return set;
  }, [festivosResp]);
  // Mapa fecha -> nombre festivo para rotular celdas
  const festivosMap = useMemo(() => {
    const list = festivosResp?.festivos || [];
    const map = new Map();
    list.forEach((f) => {
      if (f?.fecha) {
        const key = dayjs(f.fecha).format("YYYY-MM-DD");
        map.set(key, f.descripcion || "Festivo");
      }
    });
    return map;
  }, [festivosResp]);

  // Buscador con sugerencias (como en Vacaciones)
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [hoveredSuggestionIndex, setHoveredSuggestionIndex] = useState(-1);
  const [activeSearchBox, setActiveSearchBox] = useState(null); // 'filters' | 'toolbar' | null

  // Cargar sugerencias de empleados desde catálogo de empleados (limit 8)
  const empleadosSugResp = useEmpleadosData(idEmpresa, 1, 8, empleado, "", "", "");
  const sugerencias = useMemo(() => {
    const list = empleadosSugResp?.data?.data || [];
    return list.map((e) => ({
      id_empleado: e.id_empleado,
      nombre_completo: [e.nombre, e.apellido_paterno, e.apellido_materno].filter(Boolean).join(" "),
    }));
  }, [empleadosSugResp?.data]);

  const handleSelectEmpleado = (emp) => {
    if (!emp) return;
    setEmpleado(emp.nombre_completo || "");
    setIsSuggestionsOpen(false);
    setPage(1);
  };

  const limpiarFiltros = () => {
    setEmpleado("");
    setIdTipoPermiso("");
    setEstado("");
    setDesde("");
    setHasta("");
    setPage(1);
  };

  const exportarExcel = () => {
    if (!registros || registros.length === 0) return;
    const fmt = (d) => (d ? dayjs(d).format("YYYY-MM-DD") : "");
    const fileDate = (d) => (d ? dayjs(d).format("YYYYMMDD") : dayjs().format("YYYYMMDD"));
    const isVacaciones = (nombre) => String(nombre || "").toLowerCase().includes("vacacion");
    const countDiasLaborales = (desdeIso, hastaIso) => {
      // Cuenta días hábiles: excluye domingos (0) y fechas contenidas en festivosSet
      if (!desdeIso) return 0;
      const start = dayjs(desdeIso);
      const end = hastaIso ? dayjs(hastaIso) : start;
      let c = 0;
      for (let d = start.startOf("day"); d.isBefore(end.endOf("day")) || d.isSame(end, "day"); d = d.add(1, "day")) {
        const esDomingo = d.day() === 0;
        const esFestivo = festivosSet?.has(d.format("YYYY-MM-DD"));
        if (!esDomingo && !esFestivo) c++;
      }
      return Math.max(1, c);
    };

    const baseCSS = `
      *{box-sizing:border-box}
      body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Helvetica Neue;color:#111827;font-size:14px;margin:0;background:#ffffff}
      .card{border:1px solid #e5e7eb;border-radius:10px;margin:18px 0;overflow:hidden}
      .topbar{display:block;padding:14px 18px;text-align:right}
      .topbar .title{font-weight:700;font-size:16px;color:#0f172a}
      .topbar .subtitle{font-size:12px;color:#64748b;margin-top:2px}
      .sep{height:2px;background:#1f2937;margin:8px 0 14px 0}
      .meta-card{border:1px solid #e5e7eb;border-radius:8px;background:#f8fafc;margin:0 14px 14px 14px;overflow:hidden}
      .meta-card .head{background:#eef2f7;color:#111827;font-weight:700;font-size:12px;padding:10px 12px;border-bottom:1px solid #e5e7eb}
      .meta-table{width:100%;border-collapse:collapse}
      .meta-table td{padding:10px 12px;vertical-align:top}
      .meta-table .k{font-size:12px;color:#6b7280;font-weight:600;padding-right:6px;white-space:nowrap}
      .meta-table .v{font-size:14px;font-weight:600}
      table{width:100%;border-collapse:collapse}
      thead th{background:#1f2937;color:#ffffff;font-weight:700;border:1px solid #1f2937;padding:10px;text-align:center}
      tbody td{border:1px solid #e5e7eb;padding:10px;font-size:13px}
      tbody tr:nth-child(odd){background:#fafafa}
      .details{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,Liberation Mono,monospace;color:#4b5563;font-size:12px;white-space:pre-wrap}
    `;

    const filtros = [
      ["Empresa ID", idEmpresa || "-"],
      ["Empleado contiene", empleado || "—"],
      ["Tipo permiso", idTipoPermiso ? (tiposPermiso.find((t) => String(t.id) === String(idTipoPermiso))?.nombre || idTipoPermiso) : "Todos"],
      ["Estado", estado || "Todos"],
      ["Desde", desde || "—"],
      ["Hasta", hasta || "—"],
      ["Generado", dayjs().format("YYYY-MM-DD HH:mm")],
    ];

    const meta = `
      <div class="meta-card">
        <div class="head">Filtros de exportación</div>
        <table class="meta-table">
          ${filtros
            .map(
              (p) =>
                `<tr><td class="k">${p[0]}</td><td class="v">${String(p[1]).replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td></tr>`
            )
            .join("")}
        </table>
      </div>
    `;

    const headers = [
      "Folio",
      "Empleado",
      "Tipo",
      "Fecha inicio",
      "Fecha fin",
      "Días",
      "Estado",
      "Solicitado",
      "Actualizado por",
      "Fecha actualización",
      "Motivo",
      "Notas",
    ];

    const head = `<thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>`;

    const body = registros
      .map((r) => {
        const di = dayjs(r.fecha_inicio);
        const df = r.fecha_fin ? dayjs(r.fecha_fin) : di;
        const diasNaturales = Math.max(1, df.diff(di, "day") + 1);
        const dias = isVacaciones(r.tipo_permiso_nombre)
          ? countDiasLaborales(r.fecha_inicio, r.fecha_fin)
          : diasNaturales;
        const cols = [
          String(r.id).padStart(3, "0"),
          r.empleado_nombre || "",
          r.tipo_permiso_nombre || "",
          fmt(r.fecha_inicio),
          fmt(r.fecha_fin),
          String(dias),
          r.estado || "",
          fmt(r.marca_tiempo),
          r.actualizado_por_nombre || (r.actualizado_por ? `ID ${r.actualizado_por}` : ""),
          fmt(r.fecha_actualizacion),
          r.motivo ? String(r.motivo).replace(/\n/g, " ").slice(0, 500) : "",
          r.notas ? String(r.notas).replace(/\n/g, " ").slice(0, 500) : "",
        ];
        return `<tr>${cols.map((c) => `<td>${String(c).replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>`).join("")}</tr>`;
      })
      .join("");

    const table = `<table>${head}<tbody>${body}</tbody></table>`;

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${baseCSS}</style></head><body>
      <div class="card">
        <div class="topbar">
          <div class="title">Reporte de Permisos</div>
          <div class="subtitle">Exportado ${dayjs().format("YYYY-MM-DD HH:mm")}</div>
        </div>
        <div class="sep"></div>
        ${meta}
        <div style="margin:0 14px 14px 14px">${table}</div>
      </div>
    </body></html>`;

    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const baseName =
      desde && hasta
        ? `permisos_${fileDate(desde)}_al_${fileDate(hasta)}`
        : `permisos_${dayjs().format("YYYYMMDD_HHmm")}`;
    a.download = `${baseName}.xls`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // ---------------------------
  // Datos para Calendario mensual
  // ---------------------------
  // NOTA: Para el calendario necesitamos un conjunto más amplio del mes.
  // Se reusa `usePermisosData` con un límite alto y fechas del mes visible.
  const desdeMes = useMemo(() => mesActual.startOf("month").format("YYYY-MM-DD"), [mesActual]);
  const hastaMes = useMemo(() => mesActual.endOf("month").format("YYYY-MM-DD"), [mesActual]);
  // Rango efectivo del calendario: si el usuario puso fechas en filtros, se respetan;
  // si no, se usa el mes visible.
  const rangoDesde = useMemo(
    () => (desde ? dayjs(desde).format("YYYY-MM-DD") : desdeMes),
    [desde, desdeMes]
  );
  const rangoHasta = useMemo(
    () => (hasta ? dayjs(hasta).format("YYYY-MM-DD") : hastaMes),
    [hasta, hastaMes]
  );
  const { data: calendarioResp, isLoading: calendarioLoading, mutate: mutateCalendario } = usePermisosData({
    idEmpresa,
    page: 1,
    limit: 1000,
    // Usar los mismos filtros que la tabla para mostrar exactamente lo mismo
    empleado: empleado || "",
    idEmpleado: "",
    idTipoPermiso: idTipoPermiso || "",
    estado: estado || "",
    desde: rangoDesde,
    hasta: rangoHasta,
  });
  const registrosCalendario = calendarioResp?.data || [];

  // Construcción del grid del calendario a partir de `registrosCalendario`
  // Estructura:
  // - empleados: lista única de empleados
  // - mapaPermisos[employeeKey][day] = permiso
  const diasEnMes = useMemo(() => mesActual.daysInMonth(), [mesActual]);
  const nombreMes = useMemo(() => mesActual.format("MMMM YYYY"), [mesActual]);
  const diasSemana = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  // Ref del contenedor horizontal del calendario para resetear scroll
  const scrollCalendarioRef = useRef(null);

  const { empleadosCalendario, mapaPermisosCalendario } = useMemo(() => {
    // Clave de empleado: se intenta usar id_empleado; si no viene, se usa el nombre (mantener consistencia)
    const empKey = (r) => String(r.id_empleado ?? r.empleado_nombre ?? r.empleado ?? "NA");
    const empName = (r) => String(r.empleado_nombre ?? r.empleado ?? "Empleado");

    const empleadosMap = new Map();
    const mapa = {};

    registrosCalendario.forEach((p) => {
      const key = empKey(p);
      if (!empleadosMap.has(key)) empleadosMap.set(key, empName(p));
      if (!mapa[key]) mapa[key] = {};

      // Intersección de rango de permiso con el mes visible
      const inicio = dayjs(p.fecha_inicio);
      const fin = p.fecha_fin ? dayjs(p.fecha_fin) : inicio;
      const isVacaciones = String(p.tipo_permiso_nombre || p.tipo || "")
        .toLowerCase()
        .includes("vacacion");
      for (
        let d = inicio.startOf("day");
        d.isBefore(fin.endOf("day")) || d.isSame(fin, "day");
        d = d.add(1, "day")
      ) {
        if (d.month() === mesActual.month() && d.year() === mesActual.year()) {
          const dia = d.date();
          // Para Vacaciones: solo marcar días laborables (excluir domingo y festivos)
          const esDomingo = d.day() === 0;
          const esFestivo = festivosSet?.has(d.format("YYYY-MM-DD"));
          if (isVacaciones) {
            if (esDomingo || esFestivo) {
              continue; // no marcar como vacaciones este día
            }
          }
          // Guardamos el permiso (último gana si se solapa)
          mapa[key][dia] = p;
        }
      }
    });

    const empleados = Array.from(empleadosMap.entries()); // [ [key, nombre], ... ]
    return { empleadosCalendario: empleados, mapaPermisosCalendario: mapa };
  }, [registrosCalendario, mesActual, festivosSet]);

  // Utilidad de color por tipo
  const colorDeTipo = (tipoNombre) => {
    const t = String(tipoNombre || "").toLowerCase();
    if (t.includes("vacacion")) return { bg: "bg-emerald-100", text: "text-emerald-800", ring: "ring-emerald-400" };
    if (t.includes("médic") || t.includes("medic") || t.includes("enfermed")) return { bg: "bg-blue-100", text: "text-blue-800", ring: "ring-blue-400" };
    if (t.includes("personal")) return { bg: "bg-amber-100", text: "text-amber-800", ring: "ring-amber-400" };
    return { bg: "bg-rose-100", text: "text-rose-800", ring: "ring-rose-400" };
  };

  return (
    <div className={`${styles.permisosTheme} space-y-6`}>
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>🔍</span>
            Filtros de Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Empleado</label>
              <div className="relative">
                <Input
                  placeholder="Nombre del empleado"
                  value={empleado}
                  onChange={(e) => {
                    setEmpleado(e.target.value);
                    setIsSuggestionsOpen(true);
                    setHoveredSuggestionIndex(0);
                    setActiveSearchBox("filters");
                  }}
                  onFocus={() => {
                    setActiveSearchBox("filters");
                    setIsSuggestionsOpen(!!empleado);
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
              <label className="text-xs font-semibold uppercase text-muted-foreground">Tipo de Permiso</label>
              <Select
                value={idTipoPermiso === "" ? "__all__" : idTipoPermiso}
                onValueChange={(v) => setIdTipoPermiso(v === "__all__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent className="max-h-64 overflow-y-auto" position="popper" align="start">
                  <SelectItem value="__all__">Todos</SelectItem>
                  {Array.isArray(tiposPermiso) &&
                    tiposPermiso.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.nombre}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Estado</label>
              <Select
                value={estado === "" ? "__all__" : estado}
                onValueChange={(v) => setEstado(v === "__all__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  <SelectItem value="Pendiente">Pendiente</SelectItem>
                  <SelectItem value="Aprobado">Aprobado</SelectItem>
                  <SelectItem value="Rechazado">Rechazado</SelectItem>
                  <SelectItem value="Cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Fecha Desde</label>
              <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Fecha Hasta</label>
              <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
            </div>
            {/* Filtro de texto libre eliminado por requerimiento */}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={limpiarFiltros}
              className="bg-[#e74c3c] hover:bg-[#c0392b] text-white shadow-[0_2px_8px_rgba(231,76,60,0.3)]"
            >
              🔄 Limpiar
            </Button>
            <Button
              onClick={() => mutate()}
              className="shadow-[0_4px_12px_rgba(55,73,94,0.3)] transition-all hover:-translate-y-0.5"
            >
              🔍 Buscar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas rápidas */}
      {/* En móvil se compacta el espacio vertical y tipografías para no ocupar demasiada altura. */}
      <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 py-3 sm:py-6" style={{ borderLeftColor: "#3498db" }}>
          <CardHeader className="pb-1 sm:pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase">Total Permisos</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl sm:text-3xl font-extrabold">{estadisticas.total}</div>
            <div className="text-xl sm:text-2xl">📋</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 py-3 sm:py-6" style={{ borderLeftColor: "#f59e0b" }}>
          <CardHeader className="pb-1 sm:pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase">Pendientes</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl sm:text-3xl font-extrabold">{estadisticas.pendientes}</div>
            <div className="text-xl sm:text-2xl">⏳</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 py-3 sm:py-6" style={{ borderLeftColor: "#27ae60" }}>
          <CardHeader className="pb-1 sm:pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase">Aprobados</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl sm:text-3xl font-extrabold">{estadisticas.aprobados}</div>
            <div className="text-xl sm:text-2xl">✅</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 py-3 sm:py-6" style={{ borderLeftColor: "#e74c3c" }}>
          <CardHeader className="pb-1 sm:pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase">Rechazados</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl sm:text-3xl font-extrabold">{estadisticas.rechazados}</div>
            <div className="text-xl sm:text-2xl">❌</div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            className="pl-9"
            placeholder="Buscar empleado..."
            value={empleado}
            onChange={(e) => {
              setEmpleado(e.target.value);
              setIsSuggestionsOpen(true);
              setHoveredSuggestionIndex(0);
              setActiveSearchBox("toolbar");
            }}
            onFocus={() => {
              setActiveSearchBox("toolbar");
              setIsSuggestionsOpen(!!empleado);
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
          {isSuggestionsOpen && activeSearchBox === "toolbar" && sugerencias.length > 0 ? (
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
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setEditItem(null);
              setOpenDialog(true);
            }}
            className="shadow-[0_4px_12px_rgba(55,73,94,0.3)] transition-all hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4 mr-2" /> Nuevo Permiso
          </Button>
        </div>
      </div>

      <Separator />

      {/* Selector de vista encima de la tabla/calendario */}
      <div className="flex items-center justify-start">
        <div className="inline-flex rounded-md border p-1 bg-white">
          <Button
            variant={vista === "tabla" ? "default" : "ghost"}
            className={`gap-2 ${vista === "tabla" ? "" : "text-muted-foreground"}`}
            onClick={() => setVista("tabla")}
          >
            <TableIcon className="h-4 w-4" /> Tabla
          </Button>
          <Button
            variant={vista === "calendario" ? "default" : "ghost"}
            className={`gap-2 ${vista === "calendario" ? "" : "text-muted-foreground"}`}
            onClick={() => setVista("calendario")}
          >
            <CalendarDays className="h-4 w-4" /> Calendario
          </Button>
        </div>
      </div>

      {/* Vista: Tabla */}
      {vista === "tabla" ? (
        <>
          {/* Tabla */}
          <PermisosTable
            items={registros}
            loading={isLoading}
            festivosSet={festivosSet}
            onEdit={(row) => {
              setEditItem(row);
              setOpenDialog(true);
            }}
            onChanged={() => {
              mutate();
              mutateCalendario && mutateCalendario();
            }}
            onView={(row) => {
              setViewItem(row);
              setOpenView(true);
            }}
          />
          {/* Paginación */}
          <TablePagination
            page={page}
            limit={limit}
            total={total}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </>
      ) : null}

      {/* Vista: Calendario mensual (inspirado en Vacaciones.html) */}
      {vista === "calendario" ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Calendario
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setMesActual((m) => m.subtract(1, "month"))}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </Button>
                <div className="min-w-[180px] text-center font-bold capitalize">
                  {nombreMes}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setMesActual((m) => m.add(1, "month"));
                    if (scrollCalendarioRef.current) {
                      scrollCalendarioRef.current.scrollLeft = 0;
                    }
                  }}
                  className="gap-1"
                >
                  Siguiente <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Encabezado de días */}
            <div className="w-full overflow-x-auto" ref={scrollCalendarioRef}>
              <table className="min-w-full border-collapse">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-20 text-white text-left px-3 py-2 min-w-[200px] border-r border-white/20" style={{ backgroundColor: "#2c3e50" }}>
                      Empleado
                    </th>
                    {Array.from({ length: diasEnMes }, (_, i) => i + 1).map((dia) => {
                      const fecha = mesActual.date(dia);
                      const esHoy = fecha.isSame(dayjs(), "day");
                      const esFinde = [0, 6].includes(fecha.day());
                      return (
                        <th
                          key={`h-${dia}`}
                          className={`px-2 py-2 text-center text-white border-r border-white/10 ${
                            esHoy ? "ring-2 ring-emerald-400" : ""
                          }`}
                          style={{ backgroundColor: "#2c3e50" }}
                        >
                          <div className={`text-xs font-bold ${esHoy ? "text-emerald-300" : ""}`}>{dia}</div>
                          <div className={`text-[10px] opacity-85 ${esFinde ? "text-amber-300" : "text-white/80"}`}>
                            {diasSemana[fecha.day()]}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {/* Filas por empleado */}
                  {calendarioLoading && (
                    <tr>
                      <td colSpan={1 + diasEnMes} className="text-center py-6 text-muted-foreground">
                        Cargando calendario...
                      </td>
                    </tr>
                  )}
                  {!calendarioLoading && empleadosCalendario.length === 0 && (
                    <tr>
                      <td colSpan={1 + diasEnMes} className="text-center py-10 text-muted-foreground">
                        No hay permisos aprobados en este mes
                      </td>
                    </tr>
                  )}
                  {!calendarioLoading &&
                    empleadosCalendario.map(([empKey, empNombre], idx) => {
                      const bg = idx % 2 === 0 ? "bg-white" : "bg-slate-50";
                      return (
                        <tr key={`row-${empKey}`} className={bg}>
                          <td className="sticky left-0 z-10 font-semibold px-3 py-2 border-r border-slate-200 bg-inherit">
                            {empNombre}
                          </td>
                          {Array.from({ length: diasEnMes }, (_, i) => i + 1).map((dia) => {
                            const permiso = mapaPermisosCalendario?.[empKey]?.[dia];
                            const fecha = mesActual.date(dia);
                            const esHoy = fecha.isSame(dayjs(), "day");
                            const esFinde = [0, 6].includes(fecha.day());
                            const esDomingo = fecha.day() === 0;
                            const fechaStr = fecha.format("YYYY-MM-DD");
                            const esFestivo = festivosSet?.has(fechaStr);
                            const nombreFestivo = esFestivo ? festivosMap.get(fechaStr) : null;
                            if (permiso) {
                              const c = colorDeTipo(permiso.tipo_permiso_nombre || permiso.tipo || "");
                              const text = String(permiso.tipo_permiso_nombre || "").slice(0, 8);
                              return (
                                <td
                                  key={`c-${empKey}-${dia}`}
                                  className={`px-1 py-1 min-w-[44px] max-w-[44px] text-center border-b border-slate-200 border-r ${esHoy ? "ring-inset ring-2 ring-emerald-400" : ""}`}
                                >
                                  <button
                                    type="button"
                                    className={`w-full ${c.bg} ${c.text} text-[10px] font-bold rounded-sm px-1 py-1 hover:ring-2 ${c.ring} transition`}
                                    title={`${permiso.tipo_permiso_nombre || ""}${permiso.motivo ? ": " + permiso.motivo : ""}`}
                                    onClick={() => {
                                      setViewItem(permiso);
                                      setOpenView(true);
                                    }}
                                  >
                                    {text}
                                  </button>
                                </td>
                              );
                            }
                            return (
                              <td
                                key={`e-${empKey}-${dia}`}
                                className={`px-1 py-3 min-w-[44px] max-w-[44px] border-b border-slate-200 border-r ${
                                  esHoy
                                    ? "bg-emerald-50"
                                    : esFestivo
                                    ? "bg-rose-50"
                                    : esFinde
                                    ? "bg-slate-50"
                                    : ""
                                }`}
                              >
                                {/* Etiquetas informativas para domingos/festivos */}
                                {esFestivo ? (
                                  <div
                                    className="text-[9px] leading-3 font-semibold text-rose-700 truncate"
                                    title={nombreFestivo || "Festivo"}
                                  >
                                    {nombreFestivo || "Festivo"}
                                  </div>
                                ) : esDomingo ? (
                                  <div
                                    className="text-[9px] leading-3 font-medium text-slate-600 truncate"
                                    title="Domingo"
                                  >
                                    Domingo
                                  </div>
                                ) : null}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Leyenda de colores */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-sm bg-emerald-100 ring-1 ring-emerald-400" />
                <span>Vacaciones</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-sm bg-blue-100 ring-1 ring-blue-400" />
                <span>Baja médica</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-sm bg-amber-100 ring-1 ring-amber-400" />
                <span>Permiso personal</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-sm bg-rose-100 ring-1 ring-rose-400" />
                <span>Otros</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Modal crear/editar */}
      <PermisoDialog
        open={openDialog}
        setOpen={setOpenDialog}
        editItem={editItem}
        idEmpresa={idEmpresa}
        tiposPermiso={tiposPermiso}
        onSaved={() => {
          setEditItem(null);
          mutate();
          mutateCalendario && mutateCalendario();
        }}
      />

      {/* Confirmación de eliminación removida por política */}

      {/* Ver detalles */}
      <PermisoViewDialog
        open={openView}
        setOpen={setOpenView}
        item={viewItem}
        festivosSet={festivosSet}
      />
    </div>
  );
}


