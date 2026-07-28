/* eslint-disable react-hooks/exhaustive-deps */
"use client";

/**
 * Planeación de vacaciones.
 * - Vista dedicada: calendario del año (heatmap), detalle por mes (barras por
 *   empleado) y tabla, con KPIs de solicitados/planeados/aprobados/rechazados.
 * - Fuente de datos: solicitudes de permiso de tipo "Vacaciones"
 *   (usePermisosData con id_tipo_permiso de Vacaciones), por rango de fechas.
 * - Reusa el RangoFechasModal real (mismo de Asistencias) y filtros por unidad,
 *   departamento y empleados.
 *
 * Nota: el estado "Planeado" no existe hoy en el backend de permisos; se muestra
 * el KPI por consistencia visual y quedará en 0 hasta que se soporte.
 */

import { useMemo, useState } from "react";
import dayjs from "dayjs";
import { useAuth } from "@/context/AuthContext";
import useUnidadesNegocio from "@/hooks/useUnidadesNegocio";
import useDepartamentosData from "@/hooks/useDepartamentosData";
import useEmpleadosActivos from "@/hooks/useEmpleadosActivos";
import useTiposPermisoData from "@/hooks/useTiposPermisoData";
import usePermisosData from "@/hooks/usePermisosData";
import RangoFechasModal, {
  etiquetaDeRango,
} from "@/components/filtros/RangoFechasModal";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CalendarDays,
  CalendarRange,
  LayoutGrid,
  List,
  Loader2,
  RotateCcw,
  Users,
} from "lucide-react";

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const LETRA = ["D", "L", "M", "X", "J", "V", "S"]; // 0=Dom

const ESTADO_MAP = {
  Aprobado: "apr",
  Pendiente: "sol",
  Planeado: "plan",
  Rechazado: "rej",
};
const CELDA = {
  apr: { label: "Aprobado", bar: "bg-emerald-600", soft: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500" },
  plan: { label: "Planeado", bar: "bg-violet-600", soft: "bg-violet-100 text-violet-800", dot: "bg-violet-500" },
  sol: { label: "Solicitado", bar: "bg-amber-500", soft: "bg-amber-100 text-amber-900", dot: "bg-amber-500" },
  rej: { label: "Rechazado", bar: "bg-rose-600", soft: "bg-rose-100 text-rose-800 line-through", dot: "bg-rose-500" },
};
const PRECEDENCIA = { apr: 4, plan: 3, sol: 2, rej: 1 };
const esVacaciones = (n) => String(n || "").toLowerCase().includes("vacacion");

export default function PlaneacionVacacionesPage() {
  const { dataUser } = useAuth();
  const { options: unidadOptions = [], byId: unidadById = {} } =
    useUnidadesNegocio();

  const [unidadActiva, setUnidadActiva] = useState("all");
  const empresaActiva =
    unidadActiva === "all"
      ? String(dataUser?.empresas_detalle?.[0]?.id_empresa || dataUser?.id_empresa || "all")
      : String(unidadById[unidadActiva]?.id_empresa || "all");
  const idEmpresa = empresaActiva && empresaActiva !== "all" ? empresaActiva : null;

  const { departamentos } = useDepartamentosData(idEmpresa);
  const { data: empleadosResp } = useEmpleadosActivos(idEmpresa, 1, 1000);
  const empleados = empleadosResp?.data || empleadosResp || [];
  const { data: tipos } = useTiposPermisoData();
  const tipoVacacionesId = useMemo(() => {
    const arr = Array.isArray(tipos) ? tipos : tipos?.data || [];
    const t = arr.find((x) => esVacaciones(x?.nombre));
    return t?.id_tipo_permiso ?? t?.id ?? "";
  }, [tipos]);

  // Rango: por defecto el año en curso completo.
  const hoy = dayjs();
  const [rango, setRango] = useState({
    inicio: hoy.startOf("year").format("YYYY-MM-DD"),
    fin: hoy.endOf("year").format("YYYY-MM-DD"),
    etiqueta: `Año ${hoy.year()}`,
  });
  const [rangoOpen, setRangoOpen] = useState(false);

  const [depto, setDepto] = useState("todos");
  const [empsSel, setEmpsSel] = useState(() => new Set());
  const [vista, setVista] = useState("anio");
  const [mesSel, setMesSel] = useState(hoy.month());

  const anioBase = dayjs(rango.inicio).year();

  const { data: permisosResp, isLoading } = usePermisosData({
    idEmpresa,
    page: 1,
    limit: 1000,
    empleado: "",
    idEmpleado: "",
    idTipoPermiso: tipoVacacionesId || "",
    estado: "",
    desde: rango.inicio,
    hasta: rango.fin,
    excludeCancelados: true,
  });

  const registros = useMemo(() => {
    const arr = permisosResp?.data || [];
    return arr.filter((p) => {
      if (!esVacaciones(p.tipo_permiso_nombre || p.tipo)) return false;
      if (depto !== "todos" && p.departamento !== depto) return false;
      if (empsSel.size > 0) {
        const id = p.id_empleado ?? p.empleado_nombre;
        if (!empsSel.has(String(id))) return false;
      }
      return true;
    });
  }, [permisosResp, depto, empsSel]);

  const tipoDe = (p) => ESTADO_MAP[p.estado] || "sol";

  const kpis = useMemo(() => {
    const c = { sol: 0, plan: 0, apr: 0, rej: 0 };
    registros.forEach((p) => { c[tipoDe(p)] += 1; });
    return c;
  }, [registros]);

  // Conteo de personas por día para el heatmap del año (apr + plan + sol).
  const cargaPorMesDia = useMemo(() => {
    const mapa = {}; // mapa[mes][dia] = {n, pend}
    registros.forEach((p) => {
      const t = tipoDe(p);
      if (t === "rej") return;
      let d = dayjs(p.fecha_inicio).startOf("day");
      const fin = dayjs(p.fecha_fin || p.fecha_inicio).startOf("day");
      let guard = 0;
      while ((d.isBefore(fin) || d.isSame(fin, "day")) && guard < 400) {
        if (d.year() === anioBase) {
          const m = d.month(), dia = d.date();
          mapa[m] = mapa[m] || {};
          mapa[m][dia] = mapa[m][dia] || { n: 0, pend: false };
          mapa[m][dia].n += 1;
          if (t === "sol") mapa[m][dia].pend = true;
        }
        d = d.add(1, "day");
        guard += 1;
      }
    });
    return mapa;
  }, [registros, anioBase]);

  const aprobadosMes = (m) =>
    registros.filter(
      (p) => tipoDe(p) === "apr" && dayjs(p.fecha_inicio).year() === anioBase &&
        dayjs(p.fecha_inicio).month() === m,
    ).length;

  const heatCls = (n) => {
    if (!n) return "bg-gray-100 text-gray-400";
    if (n >= 5) return "bg-blue-600 text-white";
    if (n >= 3) return "bg-blue-400 text-white";
    if (n >= 2) return "bg-blue-200 text-blue-900";
    return "bg-blue-100 text-blue-800";
  };

  const nombreEmp = (p) =>
    p.empleado_nombre ||
    [p.nombre, p.apellido_paterno, p.apellido_materno].filter(Boolean).join(" ") ||
    "Empleado";

  const limpiar = () => {
    setUnidadActiva("all");
    setDepto("todos");
    setEmpsSel(new Set());
    setRango({
      inicio: hoy.startOf("year").format("YYYY-MM-DD"),
      fin: hoy.endOf("year").format("YYYY-MM-DD"),
      etiqueta: `Año ${hoy.year()}`,
    });
  };

  const toggleEmp = (id) => {
    setEmpsSel((prev) => {
      const n = new Set(prev);
      const k = String(id);
      if (n.has(k)) n.delete(k); else n.add(k);
      return n;
    });
  };

  return (
    <div className="space-y-5">
      {/* Encabezado con degradado */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand to-brand-accent px-6 py-5 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 backdrop-blur">
              <CalendarRange className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">Planeación de vacaciones</h1>
              <p className="text-[12.5px] text-white/80">
                Solicitados, planeados, aprobados y rechazados a lo largo del año
              </p>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { k: "sol", n: kpis.sol, l: "Solicitados", c: "#fbbf24" },
            { k: "plan", n: kpis.plan, l: "Planeados", c: "#c4b5fd" },
            { k: "apr", n: kpis.apr, l: "Aprobados", c: "#6ee7b7" },
            { k: "rej", n: kpis.rej, l: "Rechazados", c: "#fb7185" },
          ].map((x) => (
            <div key={x.k} className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur">
              <div className="text-3xl font-extrabold tabular-nums leading-none">{x.n}</div>
              <div className="mt-2 flex items-center gap-2 text-[12.5px] font-semibold">
                <span className="h-2.5 w-2.5 rounded" style={{ background: x.c }} />
                {x.l}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-2.5 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
        <Button
          variant="outline"
          onClick={() => setRangoOpen(true)}
          className="h-[42px] rounded-xl border-gray-200 font-semibold text-gray-700"
        >
          <CalendarDays className="mr-2 h-4 w-4" />
          {rango.etiqueta}
        </Button>

        <Select value={unidadActiva} onValueChange={setUnidadActiva}>
          <SelectTrigger className="h-[42px] w-[200px] rounded-xl border-gray-200 text-[13px] font-medium">
            <SelectValue placeholder="Unidad de negocio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las unidades</SelectItem>
            {unidadOptions.map((u) => (
              <SelectItem key={String(u.value ?? u.id)} value={String(u.value ?? u.id)}>
                {u.label ?? u.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={depto} onValueChange={setDepto}>
          <SelectTrigger className="h-[42px] w-[190px] rounded-xl border-gray-200 text-[13px] font-medium">
            <SelectValue placeholder="Departamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los departamentos</SelectItem>
            {departamentos.map((d) => (
              <SelectItem key={String(d.id_departamento ?? d.id ?? d.nombre)} value={String(d.nombre)}>
                {d.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-[42px] rounded-xl border-gray-200 font-medium text-gray-700">
              <Users className="mr-2 h-4 w-4" />
              {empsSel.size === 0 ? "Todos los empleados" : `${empsSel.size} empleado(s)`}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-[300px] w-64 overflow-auto">
            <DropdownMenuLabel>Empleados</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {empleados.map((e) => {
              const id = String(e.id_empleado ?? e.id);
              const nom = [e.nombre, e.apellido_paterno, e.apellido_materno].filter(Boolean).join(" ") || e.nombre_completo || id;
              return (
                <DropdownMenuCheckboxItem
                  key={id}
                  checked={empsSel.has(id)}
                  onCheckedChange={() => toggleEmp(id)}
                  onSelect={(ev) => ev.preventDefault()}
                >
                  {nom}
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" onClick={limpiar} className="h-[42px] rounded-xl font-semibold text-gray-500 hover:text-gray-900">
          <RotateCcw className="mr-1.5 h-4 w-4" /> Limpiar
        </Button>

        <div className="flex-1" />

        {/* Toggle de vista */}
        <div className="inline-flex overflow-hidden rounded-xl border border-gray-200">
          {[
            { v: "anio", i: LayoutGrid, t: "Año" },
            { v: "mes", i: CalendarDays, t: "Mes" },
            { v: "tabla", i: List, t: "Tabla" },
          ].map((x) => {
            const Ico = x.i;
            const on = vista === x.v;
            return (
              <button
                key={x.v}
                onClick={() => setVista(x.v)}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 text-[13px] font-semibold transition-colors ${
                  on ? "bg-[#2563EB] text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Ico className="h-4 w-4" /> {x.t}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-gray-100 bg-white py-16 text-gray-500 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin" /> Cargando vacaciones…
        </div>
      ) : (
        <>
          {vista === "anio" && (
            <VistaAnio
              anio={anioBase}
              cargaPorMesDia={cargaPorMesDia}
              aprobadosMes={aprobadosMes}
              heatCls={heatCls}
              onMes={(m) => { setMesSel(m); setVista("mes"); }}
            />
          )}
          {vista === "mes" && (
            <VistaMes
              anio={anioBase}
              mes={mesSel}
              setMes={setMesSel}
              registros={registros}
              tipoDe={tipoDe}
              nombreEmp={nombreEmp}
            />
          )}
          {vista === "tabla" && (
            <VistaTabla registros={registros} tipoDe={tipoDe} nombreEmp={nombreEmp} />
          )}
        </>
      )}

      <RangoFechasModal
        open={rangoOpen}
        onOpenChange={setRangoOpen}
        fechaInicio={rango.inicio}
        fechaFin={rango.fin}
        onAplicar={({ inicio, fin, etiqueta }) =>
          setRango({ inicio, fin, etiqueta: etiqueta || etiquetaDeRango(inicio, fin) })
        }
      />
    </div>
  );
}

/* ============ Vista Año (12 mini-calendarios heatmap) ============ */
function VistaAnio({ anio, cargaPorMesDia, aprobadosMes, heatCls, onMes }) {
  const DOW = ["L", "M", "X", "J", "V", "S", "D"];
  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 12 }, (_, m) => {
        const primer = dayjs(new Date(anio, m, 1));
        const di = primer.daysInMonth();
        const offset = (primer.day() + 6) % 7; // 0=Lun
        const carga = cargaPorMesDia[m] || {};
        return (
          <button
            key={m}
            onClick={() => onMes(m)}
            className="rounded-2xl border border-gray-100 bg-white p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#2563EB] hover:shadow-md"
          >
            <div className="text-sm font-extrabold capitalize">{MESES[m]}</div>
            <div className="mb-2.5 text-[11px] text-gray-400">
              <b className="text-emerald-600 tabular-nums">{aprobadosMes(m)}</b> aprobados
            </div>
            <div className="mb-1 grid grid-cols-7 gap-[3px]">
              {DOW.map((w, i) => (
                <span key={i} className="text-center text-[9px] font-bold text-gray-400">{w}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-[3px]">
              {Array.from({ length: offset }, (_, i) => <i key={`b${i}`} />)}
              {Array.from({ length: di }, (_, i) => i + 1).map((d) => {
                const o = carga[d];
                return (
                  <span
                    key={d}
                    title={`${d} ${MESES[m]}${o ? ` · ${o.n} pers.` : ""}`}
                    className={`relative grid aspect-square place-items-center rounded-[5px] text-[9.5px] font-semibold tabular-nums ${heatCls(o?.n || 0)}`}
                  >
                    {d}
                    {o?.pend && <span className="absolute right-[2px] top-[2px] h-1 w-1 rounded-full bg-amber-500" />}
                  </span>
                );
              })}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ============ Vista Mes (barras por empleado) ============ */
function VistaMes({ anio, mes, setMes, registros, tipoDe, nombreEmp }) {
  const di = dayjs(new Date(anio, mes, 1)).daysInMonth();
  const dias = Array.from({ length: di }, (_, i) => i + 1);

  const empleados = useMemo(() => {
    const mapa = new Map();
    registros.forEach((p) => {
      const key = String(p.id_empleado ?? nombreEmp(p));
      const ini = dayjs(p.fecha_inicio).startOf("day");
      const fin = dayjs(p.fecha_fin || p.fecha_inicio).startOf("day");
      const s = ini.year() < anio || ini.month() < mes || (ini.year() === anio && ini.month() === mes) ? ini : ini;
      // Recorte al mes visible
      const primerDia = dayjs(new Date(anio, mes, 1));
      const ultimoDia = dayjs(new Date(anio, mes, di));
      const desde = ini.isBefore(primerDia) ? primerDia : ini;
      const hasta = fin.isAfter(ultimoDia) ? ultimoDia : fin;
      if (hasta.isBefore(primerDia) || desde.isAfter(ultimoDia)) return;
      if (!mapa.has(key)) mapa.set(key, { key, nombre: nombreEmp(p), dias: {} });
      const emp = mapa.get(key);
      let d = desde;
      let guard = 0;
      while ((d.isBefore(hasta) || d.isSame(hasta, "day")) && guard < 40) {
        const t = tipoDe(p);
        const dd = d.date();
        if (!emp.dias[dd] || PRECEDENCIA[t] > PRECEDENCIA[emp.dias[dd]]) emp.dias[dd] = t;
        d = d.add(1, "day"); guard += 1;
      }
    });
    return Array.from(mapa.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [registros, anio, mes, di]);

  const plan = (dmap) => {
    const cells = [];
    let i = 1;
    while (i <= di) {
      const t = dmap[i];
      if (t) {
        let span = 0;
        while (i + span <= di && dmap[i + span] === t) span += 1;
        cells.push({ tipo: "bar", span, t, start: i });
        i += span;
      } else {
        cells.push({ tipo: "empty", d: i });
        i += 1;
      }
    }
    return cells;
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setMes((mes + 11) % 12)} className="rounded-lg border-gray-200">‹</Button>
          <div className="min-w-[150px] text-center text-base font-extrabold capitalize">{MESES[mes]} {anio}</div>
          <Button variant="outline" size="sm" onClick={() => setMes((mes + 1) % 12)} className="rounded-lg border-gray-200">›</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11.5px] text-gray-500">
          <Leyenda t="apr" /><Leyenda t="plan" /><Leyenda t="sol" />
        </div>
      </div>
      <div className="max-h-[62vh] overflow-auto">
        {empleados.length === 0 ? (
          <div className="py-14 text-center text-gray-400">Sin vacaciones en este mes para los filtros.</div>
        ) : (
          <table className="w-max min-w-full border-collapse text-[11px]">
            <thead className="sticky top-0 z-10 bg-[#1f2937] text-white">
              <tr>
                <th className="sticky left-0 z-20 w-[190px] min-w-[190px] bg-[#1f2937] px-3 py-1.5 text-left font-semibold">Empleado</th>
                {dias.map((d) => {
                  const wd = new Date(anio, mes, d).getDay();
                  const we = wd === 0 || wd === 6;
                  return (
                    <th key={d} className="w-9 min-w-9 px-0.5 py-1 text-center font-semibold">
                      <div>{d}</div>
                      <div className={`text-[9px] font-normal ${we ? "text-amber-300" : "opacity-70"}`}>{LETRA[wd]}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {empleados.map((emp, ri) => (
                <tr key={emp.key} className={ri % 2 ? "bg-gray-50/60" : "bg-white"}>
                  <td className="sticky left-0 z-10 w-[190px] min-w-[190px] max-w-[190px] truncate bg-inherit px-3 py-1 font-medium text-gray-900" title={emp.nombre}>
                    {emp.nombre}
                  </td>
                  {plan(emp.dias).map((cell, ci) =>
                    cell.tipo === "bar" ? (
                      <td key={ci} colSpan={cell.span} className="px-0.5 py-1">
                        <div className={`flex h-5 items-center justify-center truncate rounded px-1 text-[9px] font-bold text-white ${CELDA[cell.t].bar}`}>
                          {cell.span > 2 ? CELDA[cell.t].label : ""}
                        </div>
                      </td>
                    ) : (
                      (() => {
                        const wd = new Date(anio, mes, cell.d).getDay();
                        const we = wd === 0 || wd === 6;
                        return <td key={ci} className={`w-9 min-w-9 border-b border-gray-100 px-0.5 py-1 ${we ? "bg-slate-50" : ""}`} />;
                      })()
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ============ Vista Tabla ============ */
function VistaTabla({ registros, tipoDe, nombreEmp }) {
  const ord = [...registros].sort((a, b) => dayjs(a.fecha_inicio).valueOf() - dayjs(b.fecha_inicio).valueOf());
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-[#1f2937] text-white">
              {["Empleado", "Unidad", "Departamento", "Del", "Al", "Días", "Estado"].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ord.length === 0 ? (
              <tr><td colSpan={7} className="py-12 text-center text-gray-400">Sin solicitudes de vacaciones para los filtros.</td></tr>
            ) : (
              ord.map((p, i) => {
                const t = tipoDe(p);
                const ini = dayjs(p.fecha_inicio);
                const fin = dayjs(p.fecha_fin || p.fecha_inicio);
                const dias = Math.max(1, fin.diff(ini, "day") + 1);
                return (
                  <tr key={i} className="border-b border-gray-100 hover:bg-blue-50/40">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{nombreEmp(p)}</td>
                    <td className="px-4 py-2.5 text-gray-600">{p.unidad_negocio || p.sucursal || "—"}</td>
                    <td className="px-4 py-2.5 text-gray-600">{p.departamento || "—"}</td>
                    <td className="px-4 py-2.5">{ini.format("DD/MM/YYYY")}</td>
                    <td className="px-4 py-2.5">{fin.format("DD/MM/YYYY")}</td>
                    <td className="px-4 py-2.5 text-center tabular-nums">{dias}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-bold ${CELDA[t].soft}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${CELDA[t].dot}`} />
                        {CELDA[t].label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Leyenda({ t }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded ${CELDA[t].bar}`} />
      {CELDA[t].label}
    </span>
  );
}
