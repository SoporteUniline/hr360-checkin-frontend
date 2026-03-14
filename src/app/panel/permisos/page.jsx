"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import dayjs from "dayjs";
import useSWR from "swr";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  CalendarDays,
  Table as TableIcon,
  ChevronLeft,
  ChevronRight,
  CalendarCheck2,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Plus,
  RotateCcw,
  XCircle,
} from "lucide-react";
import usePermisosData from "@/hooks/usePermisosData";
import useTiposPermisoData from "@/hooks/useTiposPermisoData";
import useUnidadesNegocio from "@/hooks/useUnidadesNegocio";
import TablePagination from "@/components/TablePagination";
import StatCard from "@/components/StatCard";
import PermisosTable from "./PermisosTable";
import PermisoDialog from "./PermisoDialog";
import PermisoDeleteDialog from "./PermisoDeleteDialog";
import PermisoViewDialog from "./PermisoViewDialog";
import styles from "./permisos-theme.module.css";
import { fetcherWithToken } from "@/lib/fetcher";
import { Combobox } from "@/components/Combobox";
import AccesosRapidos from "@/components/AccesosRapidos";

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

  // Lógica Multiempresa replicada
  const [unidadActiva, setUnidadActiva] = useState("all");
  const { options: unidadOptions, byId: unidadById } = useUnidadesNegocio();
  const idEmpresa =
    unidadActiva === "all"
      ? "all"
      : String(unidadById[unidadActiva]?.id_empresa || "all");
  const empleado = "";
  const idTipoPermiso = "";
  const estado = "";
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  useEffect(() => {
    if (dataUser?.empresas_detalle?.length > 0 && !unidadActiva) {
      setUnidadActiva("all");
    }
  }, [dataUser, unidadActiva]);

  const [filterOptionsRows, setFilterOptionsRows] = useState([]);
  const [headerFilterMeta, setHeaderFilterMeta] = useState({
    active: false,
    total: 0,
  });
  const [cachedData, setCachedData] = useState(null);

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
    empleado: "",
    idEmpleado: "",
    idTipoPermiso: "",
    estado: "",
    desde,
    hasta,
    // Por defecto NO mostramos cancelados en "Todos".
    // Si el usuario elige estado="Cancelado", se muestran (y este flag se ignora en backend).
    excludeCancelados: true,
  });

  useEffect(() => {
    if (data) setCachedData(data);
  }, [data]);

  const effectiveData = data || cachedData;
  const registros = effectiveData?.data || [];
  const total = effectiveData?.total || 0;
  const estadisticas = effectiveData?.estadisticas || {
    total: 0,
    pendientes: 0,
    aprobados: 0,
    rechazados: 0,
    cancelados: 0,
  };

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total, limit],
  );

  // Cargar festivos de la empresa para conteo de días laborables (domingos y festivos no cuentan)
  // - Endpoint reutilizado del módulo de Festivos: /checador/holidays/:id_empresa
  const { data: festivosResp } = useSWR(
    idEmpresa
      ? `/checador/holidays/${idEmpresa}?page=1&limit=5000&filter=`
      : null,
    fetcherWithToken,
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

  useEffect(() => {
    let isCancelled = false;

    const loadFilterOptionsRows = async () => {
      if (!idEmpresa) {
        if (!isCancelled) setFilterOptionsRows([]);
        return;
      }

      try {
        const pageSize = 500;
        const firstParams = new URLSearchParams({
          empresa: String(idEmpresa),
          page: "1",
          limit: String(pageSize),
          exclude_cancelados: "1",
        });
        if (desde) firstParams.set("desde", desde);
        if (hasta) firstParams.set("hasta", hasta);
        const firstData = await fetcherWithToken(
          `/checador/solicitudes-permiso?${firstParams.toString()}`,
        );

        let allRows = Array.isArray(firstData?.data) ? firstData.data : [];
        const totalRows = Number(firstData?.total || allRows.length);
        const totalPagesAll = Math.max(1, Math.ceil(totalRows / pageSize));

        for (let currentPage = 2; currentPage <= totalPagesAll; currentPage += 1) {
          const pageParams = new URLSearchParams(firstParams);
          pageParams.set("page", String(currentPage));
          const pageData = await fetcherWithToken(
            `/checador/solicitudes-permiso?${pageParams.toString()}`,
          );
          if (Array.isArray(pageData?.data)) {
            allRows = [...allRows, ...pageData.data];
          }
        }

        if (!isCancelled) setFilterOptionsRows(allRows);
      } catch (_) {
        if (!isCancelled) setFilterOptionsRows([]);
      }
    };

    loadFilterOptionsRows();

    return () => {
      isCancelled = true;
    };
  }, [idEmpresa, desde, hasta]);

  useEffect(() => {
    if (!headerFilterMeta.active) return;
    const totalPagesMeta = Math.max(1, Math.ceil(headerFilterMeta.total / limit));
    if (page > totalPagesMeta) setPage(1);
  }, [headerFilterMeta, page, limit]);

  const exportarExcel = () => {
    if (!registros || registros.length === 0) return;
    const fmt = (d) => (d ? dayjs(d).format("YYYY-MM-DD") : "");
    const fileDate = (d) =>
      d ? dayjs(d).format("YYYYMMDD") : dayjs().format("YYYYMMDD");
    const isVacaciones = (nombre) =>
      String(nombre || "")
        .toLowerCase()
        .includes("vacacion");
    const countDiasLaborales = (desdeIso, hastaIso) => {
      // Cuenta días hábiles: excluye domingos (0) y fechas contenidas en festivosSet
      if (!desdeIso) return 0;
      const start = dayjs(desdeIso);
      const end = hastaIso ? dayjs(hastaIso) : start;
      let c = 0;
      for (
        let d = start.startOf("day");
        d.isBefore(end.endOf("day")) || d.isSame(end, "day");
        d = d.add(1, "day")
      ) {
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
      [
        "Tipo permiso",
        idTipoPermiso
          ? tiposPermiso.find((t) => String(t.id) === String(idTipoPermiso))
              ?.nombre || idTipoPermiso
          : "Todos",
      ],
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
                `<tr><td class="k">${p[0]}</td><td class="v">${String(p[1])
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")}</td></tr>`,
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
      "Días totales",
      "Días hábiles",
      "Estado",
      "Solicitado",
      "Actualizado por",
      "Fecha actualización",
      "Motivo",
      "Notas",
    ];

    const head = `<thead><tr>${headers
      .map((h) => `<th>${h}</th>`)
      .join("")}</tr></thead>`;

    const body = registros
      .map((r) => {
        const di = dayjs(r.fecha_inicio);
        const df = r.fecha_fin ? dayjs(r.fecha_fin) : di;
        const diasNaturales = Math.max(1, df.diff(di, "day") + 1);
        const diasHabiles = isVacaciones(r.tipo_permiso_nombre)
          ? countDiasLaborales(r.fecha_inicio, r.fecha_fin)
          : diasNaturales; // para permisos no-vacaciones, se conserva el valor histórico en "Días"
        const diasTotales = diasNaturales;
        const dias = diasHabiles;
        const cols = [
          String(r.id).padStart(3, "0"),
          r.empleado_nombre || "",
          r.tipo_permiso_nombre || "",
          fmt(r.fecha_inicio),
          fmt(r.fecha_fin),
          String(dias),
          String(diasTotales),
          String(diasHabiles),
          r.estado || "",
          fmt(r.marca_tiempo),
          r.actualizado_por_nombre ||
            (r.actualizado_por ? `ID ${r.actualizado_por}` : ""),
          fmt(r.fecha_actualizacion),
          r.motivo ? String(r.motivo).replace(/\n/g, " ").slice(0, 500) : "",
          r.notas ? String(r.notas).replace(/\n/g, " ").slice(0, 500) : "",
        ];
        return `<tr>${cols
          .map(
            (c) =>
              `<td>${String(c)
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")}</td>`,
          )
          .join("")}</tr>`;
      })
      .join("");

    const table = `<table>${head}<tbody>${body}</tbody></table>`;

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${baseCSS}</style></head><body>
      <div class="card">
        <div class="topbar">
          <div class="title">Reporte de Permisos</div>
          <div class="subtitle">Exportado ${dayjs().format(
            "YYYY-MM-DD HH:mm",
          )}</div>
        </div>
        <div class="sep"></div>
        ${meta}
        <div style="margin:0 14px 14px 14px">${table}</div>
      </div>
    </body></html>`;

    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
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
  const desdeMes = useMemo(
    () => mesActual.startOf("month").format("YYYY-MM-DD"),
    [mesActual],
  );
  const hastaMes = useMemo(
    () => mesActual.endOf("month").format("YYYY-MM-DD"),
    [mesActual],
  );
  // Rango efectivo del calendario: si el usuario puso fechas en filtros, se respetan;
  // si no, se usa el mes visible.
  const rangoDesde = useMemo(
    () => (desde ? dayjs(desde).format("YYYY-MM-DD") : desdeMes),
    [desde, desdeMes],
  );
  const rangoHasta = useMemo(
    () => (hasta ? dayjs(hasta).format("YYYY-MM-DD") : hastaMes),
    [hasta, hastaMes],
  );
  const {
    data: calendarioResp,
    isLoading: calendarioLoading,
    mutate: mutateCalendario,
  } = usePermisosData({
    idEmpresa,
    page: 1,
    limit: 1000,
    // Usar los mismos filtros que la tabla para mostrar exactamente lo mismo
      empleado: "",
    idEmpleado: "",
      idTipoPermiso: "",
      estado: "",
    desde: rangoDesde,
    hasta: rangoHasta,
      excludeCancelados: true,
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
    const empKey = (r) =>
      String(r.id_empleado ?? r.empleado_nombre ?? r.empleado ?? "NA");
    const empName = (r) =>
      String(r.empleado_nombre ?? r.empleado ?? "Empleado");

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
    if (t.includes("vacacion"))
      return {
        bg: "bg-emerald-100",
        text: "text-emerald-800",
        ring: "ring-emerald-400",
      };
    if (t.includes("médic") || t.includes("medic") || t.includes("enfermed"))
      return {
        bg: "bg-blue-100",
        text: "text-blue-800",
        ring: "ring-blue-400",
      };
    if (t.includes("personal"))
      return {
        bg: "bg-amber-100",
        text: "text-amber-800",
        ring: "ring-amber-400",
      };
    return { bg: "bg-rose-100", text: "text-rose-800", ring: "ring-rose-400" };
  };

  return (
    <div className={`${styles.permisosTheme} space-y-6`}>
      {/* Header ADAMIA */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <div className="bg-[#2563EB] p-2.5 rounded-lg">
            <CalendarCheck2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Permisos</h1>
            <p className="text-sm text-gray-600">
              Gestión de solicitudes, estados y calendario mensual.
            </p>
          </div>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      {/* En móvil se compacta el espacio vertical y tipografías para no ocupar demasiada altura. */}
      <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total permisos"
          value={estadisticas.total}
          icon={ClipboardList}
        />
        <StatCard
          title="Pendientes"
          value={estadisticas.pendientes}
          icon={Clock3}
        />
        <StatCard
          title="Aprobados"
          value={estadisticas.aprobados}
          icon={CheckCircle2}
        />
        <StatCard
          title="Rechazados"
          value={estadisticas.rechazados}
          icon={XCircle}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Unidad de negocio
            </label>
            <Combobox
              options={[
                { value: "all", label: "Todas las unidades de negocio" },
                ...unidadOptions,
              ]}
              value={unidadActiva}
              onChange={(value) => {
                setUnidadActiva(value || "all");
                setPage(1);
              }}
              placeholder="Seleccionar unidad de negocio"
              emptyText="No hay unidades disponibles."
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Desde</label>
            <Input
              type="date"
              value={desde}
              onChange={(event) => {
                setDesde(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Hasta</label>
            <Input
              type="date"
              value={hasta}
              onChange={(event) => {
                setHasta(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="flex justify-start lg:justify-end">
            <Button
              onClick={() => {
                setDesde("");
                setHasta("");
                setPage(1);
              }}
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
          </div>
        </div>
      </div>

      {/* Selector de vista encima de la tabla/calendario */}
      <div className="flex items-center justify-start">
        <div className="inline-flex rounded-lg border border-blue-100 p-1 bg-blue-50">
          <Button
            variant={vista === "tabla" ? "default" : "ghost"}
            className={`gap-2 ${
              vista === "tabla"
                ? "bg-white text-[#2563EB] shadow-sm"
                : "text-gray-600 hover:bg-white/60"
            }`}
            onClick={() => setVista("tabla")}
          >
            <TableIcon className="h-4 w-4" /> Tabla
          </Button>
          <Button
            variant={vista === "calendario" ? "default" : "ghost"}
            className={`gap-2 ${
              vista === "calendario"
                ? "bg-white text-[#2563EB] shadow-sm"
                : "text-gray-600 hover:bg-white/60"
            }`}
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
            filterOptionsRows={filterOptionsRows}
            page={page}
            limit={limit}
            onHeaderFilteringMetaChange={setHeaderFilterMeta}
            loading={isLoading}
            festivosSet={festivosSet}
            onCreate={() => {
              setEditItem(null);
              setOpenDialog(true);
            }}
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
            onDelete={(row) => {
              setDeleteId(row?.id ?? null);
              setOpenDelete(true);
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
        </>
      ) : null}

      {/* Vista: Calendario mensual (inspirado en Vacaciones.html) */}
      {vista === "calendario" ? (
        <Card className="border-gray-100 overflow-hidden">
          <CardHeader className="border-b border-gray-100 bg-white">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-[#2563EB]" />
                Calendario mensual
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMesActual((m) => m.subtract(1, "month"))}
                  className="gap-1 border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </Button>
                <div className="min-w-[180px] text-center font-bold capitalize">
                  {nombreMes}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setMesActual((m) => m.add(1, "month"));
                    if (scrollCalendarioRef.current) {
                      scrollCalendarioRef.current.scrollLeft = 0;
                    }
                  }}
                  className="gap-1 border-gray-300 text-gray-700 hover:bg-gray-100"
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
                    <th className="sticky left-0 z-20 bg-gray-50 text-gray-700 text-left px-3 py-2 min-w-[200px] border-r border-gray-200 text-xs font-semibold uppercase">
                      Empleado
                    </th>
                    {Array.from({ length: diasEnMes }, (_, i) => i + 1).map(
                      (dia) => {
                        const fecha = mesActual.date(dia);
                        const esHoy = fecha.isSame(dayjs(), "day");
                        const esFinde = [0, 6].includes(fecha.day());
                        return (
                          <th
                            key={`h-${dia}`}
                            className={`px-2 py-2 text-center border-r border-gray-200 bg-gray-50 ${
                              esHoy ? "ring-2 ring-[#2563EB]" : ""
                            }`}
                          >
                            <div
                              className={`text-xs font-bold ${
                                esHoy ? "text-[#2563EB]" : "text-gray-800"
                              }`}
                            >
                              {dia}
                            </div>
                            <div
                              className={`text-[10px] opacity-85 ${
                                esFinde ? "text-amber-700" : "text-gray-500"
                              }`}
                            >
                              {diasSemana[fecha.day()]}
                            </div>
                          </th>
                        );
                      },
                    )}
                  </tr>
                </thead>
                <tbody>
                  {/* Filas por empleado */}
                  {calendarioLoading && (
                    <tr>
                      <td
                        colSpan={1 + diasEnMes}
                        className="text-center py-6 text-muted-foreground"
                      >
                        Cargando calendario...
                      </td>
                    </tr>
                  )}
                  {!calendarioLoading && empleadosCalendario.length === 0 && (
                    <tr>
                      <td
                        colSpan={1 + diasEnMes}
                        className="text-center py-10 text-muted-foreground"
                      >
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
                          {Array.from(
                            { length: diasEnMes },
                            (_, i) => i + 1,
                          ).map((dia) => {
                            const permiso =
                              mapaPermisosCalendario?.[empKey]?.[dia];
                            const fecha = mesActual.date(dia);
                            const esHoy = fecha.isSame(dayjs(), "day");
                            const esFinde = [0, 6].includes(fecha.day());
                            const esDomingo = fecha.day() === 0;
                            const fechaStr = fecha.format("YYYY-MM-DD");
                            const esFestivo = festivosSet?.has(fechaStr);
                            const nombreFestivo = esFestivo
                              ? festivosMap.get(fechaStr)
                              : null;
                            if (permiso) {
                              const c = colorDeTipo(
                                permiso.tipo_permiso_nombre ||
                                  permiso.tipo ||
                                  "",
                              );
                              const text = String(
                                permiso.tipo_permiso_nombre || "",
                              ).slice(0, 8);
                              return (
                                <td
                                  key={`c-${empKey}-${dia}`}
                                  className={`px-1 py-1 min-w-[44px] max-w-[44px] text-center border-b border-slate-200 border-r ${
                                    esHoy
                                      ? "ring-inset ring-2 ring-[#2563EB]"
                                      : ""
                                  }`}
                                >
                                  <button
                                    type="button"
                                    className={`w-full ${c.bg} ${c.text} text-[10px] font-bold rounded-sm px-1 py-1 hover:ring-2 ${c.ring} transition`}
                                    title={`${
                                      permiso.tipo_permiso_nombre || ""
                                    }${
                                      permiso.motivo
                                        ? ": " + permiso.motivo
                                        : ""
                                    }`}
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
        festivosSet={festivosSet}
        onSaved={() => {
          setEditItem(null);
          mutate();
          mutateCalendario && mutateCalendario();
        }}
      />

      {/* Confirmación de eliminación */}
      <PermisoDeleteDialog
        open={openDelete}
        setOpen={setOpenDelete}
        deleteId={deleteId}
        onDeleted={() => {
          setDeleteId(null);
          mutate();
          mutateCalendario && mutateCalendario();
        }}
      />

      {/* Ver detalles */}
      <PermisoViewDialog
        open={openView}
        setOpen={setOpenView}
        item={viewItem}
        festivosSet={festivosSet}
      />

      {/* Accesos Rápidos - Componente reutilizable (al final de la página) */}
      <AccesosRapidos />
    </div>
  );
}
