"use client";

import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import styles from "./contratos-theme.module.css";
import HeaderMultiFilter from "@/components/tabla/HeaderMultiFilter";
import ActiveFilterChips from "@/components/tabla/ActiveFilterChips";
import { EstadoBadge } from "@/lib/estados";

function formatDMY(value) {
  if (!value) return "";
  const d = dayjs(value, ["YYYY-MM-DD", "DD/MM/YYYY", "YYYY/MM/DD"], true);
  return d.isValid() ? d.format("DD/MM/YYYY") : String(value);
}

function diasRestantes(fechaFin) {
  if (!fechaFin) return null;
  const fin = dayjs(fechaFin, ["YYYY-MM-DD", "DD/MM/YYYY"], true);
  if (!fin.isValid()) return null;
  const diff = fin.startOf("day").diff(dayjs().startOf("day"), "day");
  return diff;
}

function alertaVigencia(fechaFin) {
  const d = diasRestantes(fechaFin);
  if (d === null)
    return (
      <span className="text-xs text-muted-foreground">
        Sin fecha de término
      </span>
    );
  if (d < 0)
    return (
      <span
        className={`px-2 py-0.5 rounded text-xs font-semibold ${styles.hrPulse2s}`}
        style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}
      >
        VENCIDO
      </span>
    );
  if (d === 0)
    return (
      <span
        className={`px-2 py-0.5 rounded text-xs font-semibold ${styles.hrPulse2s}`}
        style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}
      >
        VENCE HOY
      </span>
    );
  if (d <= 7)
    return (
      <span
        className={`px-2 py-0.5 rounded text-xs font-semibold ${styles.hrPulse2s}`}
        style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}
      >
        {d} días
      </span>
    );
  if (d <= 15)
    return (
      <span
        className="px-2 py-0.5 rounded text-xs font-semibold"
        style={{ backgroundColor: "#fed7aa", color: "#9a3412" }}
      >
        {d} días
      </span>
    );
  if (d <= 30)
    return (
      <span
        className="px-2 py-0.5 rounded text-xs font-semibold"
        style={{ backgroundColor: "#fef3c7", color: "#78350f" }}
      >
        {d} días
      </span>
    );
  return <span className="text-xs text-muted-foreground">{d} días</span>;
}

function badgeTipo(tipo) {
  const base =
    "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold";
  switch (tipo) {
    case "indefinido":
      return (
        <span
          className={base}
          style={{ backgroundColor: "#dbeafe", color: "#1e40af" }}
        >
          Indefinido
        </span>
      );
    case "temporal":
      return (
        <span
          className={base}
          style={{ backgroundColor: "#fef3c7", color: "#92400e" }}
        >
          Temporal
        </span>
      );
    case "obra_determinada":
      return (
        <span
          className={base}
          style={{ backgroundColor: "#fef3c7", color: "#92400e" }}
        >
          Obra Determinada
        </span>
      );
    case "capacitacion":
      return (
        <span
          className={base}
          style={{ backgroundColor: "#fef3c7", color: "#92400e" }}
        >
          Capacitación
        </span>
      );
    case "prueba":
      return (
        <span
          className={base}
          style={{ backgroundColor: "#fef3c7", color: "#92400e" }}
        >
          Prueba
        </span>
      );
    case "prestacion_servicios":
      return (
        <span
          className={base}
          style={{ backgroundColor: "#e9d5ff", color: "#6b21a8" }}
        >
          Prestación Servicios
        </span>
      );
    default:
      return (
        <span
          className={base}
          style={{ backgroundColor: "#f3f4f6", color: "#6b7280" }}
        >
          {tipo || "-"}
        </span>
      );
  }
}

function badgeEstatus(estatus) {
  return <EstadoBadge estado={estatus} />;
}

/**
 * Tabla de Contratos.
 * - Con badges de tipo/estatus y alerta de vigencia (similar a Vacaciones.html)
 */
export default function ContratosTable({
  items = [],
  filterOptionsRows = [],
  loading,
  onEdit,
  onDelete,
  onDuplicate,
  onCambiarEstatus,
  page = 1,
  limit = 10,
  onHeaderFilteringMetaChange,
}) {
  const [folioSeleccionado, setFolioSeleccionado] = useState([]);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState([]);
  const [puestoSeleccionado, setPuestoSeleccionado] = useState([]);
  const [tipoSeleccionado, setTipoSeleccionado] = useState([]);
  const [estatusSeleccionado, setEstatusSeleccionado] = useState([]);

  const sourceRows = useMemo(
    () => (Array.isArray(filterOptionsRows) && filterOptionsRows.length > 0 ? filterOptionsRows : items),
    [filterOptionsRows, items],
  );

  const uniqueOptions = (values) =>
    [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));

  const getEmpleado = (c) =>
    c.nombre_empleado || c.empleado_nombre || c.nombreEmpleado || "";
  const getFolio = (c) => String(c.folio || c.id || "");

  const folioOptions = useMemo(
    () => uniqueOptions(sourceRows.map((c) => getFolio(c))),
    [sourceRows],
  );
  const empleadoOptions = useMemo(
    () => uniqueOptions(sourceRows.map((c) => getEmpleado(c))),
    [sourceRows],
  );
  const puestoOptions = useMemo(
    () => uniqueOptions(sourceRows.map((c) => c.puesto)),
    [sourceRows],
  );
  const tipoOptions = useMemo(
    () => uniqueOptions(sourceRows.map((c) => c.tipo_contrato || c.tipoContrato)),
    [sourceRows],
  );
  const estatusOptions = useMemo(
    () => uniqueOptions(sourceRows.map((c) => c.estatus)),
    [sourceRows],
  );

  const filteredRowsAll = useMemo(
    () =>
      sourceRows.filter((c) => {
        const passFolio =
          folioSeleccionado.length === 0 ||
          folioSeleccionado.includes(getFolio(c));
        const passEmpleado =
          empleadoSeleccionado.length === 0 ||
          empleadoSeleccionado.includes(getEmpleado(c));
        const passPuesto =
          puestoSeleccionado.length === 0 || puestoSeleccionado.includes(c.puesto);
        const passTipo =
          tipoSeleccionado.length === 0 ||
          tipoSeleccionado.includes(c.tipo_contrato || c.tipoContrato);
        const passEstatus =
          estatusSeleccionado.length === 0 ||
          estatusSeleccionado.includes(c.estatus);
        return passFolio && passEmpleado && passPuesto && passTipo && passEstatus;
      }),
    [
      sourceRows,
      folioSeleccionado,
      empleadoSeleccionado,
      puestoSeleccionado,
      tipoSeleccionado,
      estatusSeleccionado,
    ],
  );

  const hasActiveHeaderFilters =
    folioSeleccionado.length > 0 ||
    empleadoSeleccionado.length > 0 ||
    puestoSeleccionado.length > 0 ||
    tipoSeleccionado.length > 0 ||
    estatusSeleccionado.length > 0;

  const displayedRows = useMemo(() => {
    if (!hasActiveHeaderFilters) return items;
    const offset = (page - 1) * limit;
    return filteredRowsAll.slice(offset, offset + limit);
  }, [hasActiveHeaderFilters, items, page, limit, filteredRowsAll]);

  useEffect(() => {
    onHeaderFilteringMetaChange?.({
      active: hasActiveHeaderFilters,
      total: filteredRowsAll.length,
    });
  }, [hasActiveHeaderFilters, filteredRowsAll.length, onHeaderFilteringMetaChange]);

  const clearAllHeaderFilters = () => {
    setFolioSeleccionado([]);
    setEmpleadoSeleccionado([]);
    setPuestoSeleccionado([]);
    setTipoSeleccionado([]);
    setEstatusSeleccionado([]);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10">
        <div className="text-center text-gray-500">Cargando contratos…</div>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10">
        <div className="text-center text-gray-500">
          No hay contratos registrados
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
      
      <ActiveFilterChips
        groups={[
          {
            category: "Folio",
            values: folioSeleccionado,
            options: folioOptions,
            onChange: setFolioSeleccionado,
          },
          {
            category: "Empleado",
            values: empleadoSeleccionado,
            options: empleadoOptions,
            onChange: setEmpleadoSeleccionado,
          },
          {
            category: "Puesto",
            values: puestoSeleccionado,
            options: puestoOptions,
            onChange: setPuestoSeleccionado,
          },
          {
            category: "Tipo",
            values: tipoSeleccionado,
            options: tipoOptions,
            onChange: setTipoSeleccionado,
          },
          {
            category: "Estatus",
            values: estatusSeleccionado,
            options: estatusOptions,
            onChange: setEstatusSeleccionado,
          },
        ]}
        onClearAll={clearAllHeaderFilters}
      />
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50 border-b">
            <tr className="text-left text-xs uppercase font-semibold text-gray-700">
              <th className="px-3 py-2">
                <HeaderMultiFilter
                  selected={folioSeleccionado}
                  onChange={setFolioSeleccionado}
                  options={folioOptions}
                  placeholder="Folio"
                />
              </th>
              <th className="px-3 py-2">
                <HeaderMultiFilter
                  selected={empleadoSeleccionado}
                  onChange={setEmpleadoSeleccionado}
                  options={empleadoOptions}
                  placeholder="Empleado"
                />
              </th>
              <th className="px-3 py-2">
                <HeaderMultiFilter
                  selected={puestoSeleccionado}
                  onChange={setPuestoSeleccionado}
                  options={puestoOptions}
                  placeholder="Puesto"
                />
              </th>
              <th className="px-3 py-2">
                <HeaderMultiFilter
                  selected={tipoSeleccionado}
                  onChange={setTipoSeleccionado}
                  options={tipoOptions}
                  placeholder="Tipo"
                />
              </th>
              <th className="px-3 py-2">Inicio</th>
              <th className="px-3 py-2">Vigencia</th>
              <th className="px-3 py-2">
                <HeaderMultiFilter
                  selected={estatusSeleccionado}
                  onChange={setEstatusSeleccionado}
                  options={estatusOptions}
                  placeholder="Estatus"
                />
              </th>
              <th className="px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {displayedRows.map((c) => {
              const vigenciaNodo =
                c.tipo_contrato === "indefinido" || !c.fecha_fin ? (
                  <span className="text-xs text-muted-foreground">
                    Sin fecha de término
                  </span>
                ) : (
                  <div className="flex flex-col gap-1">
                    <span>{formatDMY(c.fecha_fin)}</span>
                    {alertaVigencia(c.fecha_fin)}
                  </div>
                );
              return (
                <tr
                  key={`ctr-${c.id || c.folio}`}
                  className="border-b hover:bg-slate-50"
                >
                  {/* (27/11/2026) La fila abre la vista de detalle (/panel/contratos/[id]); el resto de acciones, en el menú. */}
                  <td className="px-3 py-3 font-semibold">
                    <Link href={`/panel/contratos/${c.id || c.id_contrato}`} className="inline-flex min-h-12 items-center text-[#1E40C4] underline-offset-2 hover:underline" data-abrir-contrato={c.id || c.id_contrato}>
                      {c.folio || c.id}
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    <Link href={`/panel/contratos/${c.id || c.id_contrato}`} className="font-semibold text-gray-900 hover:underline">
                      {c.nombre_empleado ||
                        c.empleado_nombre ||
                        c.nombreEmpleado}
                    </Link>
                    <div className="text-sm text-gray-600">
                      {c.empresa || c.empresa_nombre}
                    </div>
                  </td>
                  <td className="px-3 py-3">{c.puesto}</td>
                  <td className="px-3 py-3">
                    {badgeTipo(c.tipo_contrato || c.tipoContrato)}
                  </td>
                  <td className="px-3 py-3">
                    {formatDMY(c.fecha_inicio || c.fechaInicio)}
                  </td>
                  <td className="px-3 py-3">{vigenciaNodo}</td>
                  <td className="px-3 py-3">{badgeEstatus(c.estatus)}</td>
                  <td className="px-3 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-800 hover:bg-gray-50" aria-label={`Más acciones del contrato ${c.folio || c.id}`}>
                          <MoreHorizontal className="h-4 w-4" aria-hidden="true" /> Más
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-52">
                        <DropdownMenuItem asChild className="min-h-11 text-[15px]"><Link href={`/panel/contratos/${c.id || c.id_contrato}`}>Ver contrato</Link></DropdownMenuItem>
                        <DropdownMenuItem className="min-h-11 text-[15px]" onSelect={() => onEdit?.(c)}>Editar datos</DropdownMenuItem>
                        <DropdownMenuItem className="min-h-11 text-[15px]" onSelect={() => onCambiarEstatus?.(c)}>Cambiar estatus</DropdownMenuItem>
                        <DropdownMenuItem className="min-h-11 text-[15px]" onSelect={() => onDuplicate?.(c)}>Renovar (duplicar)</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="min-h-11 text-[15px] text-red-700" onSelect={() => onDelete?.(c)}>Eliminar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
            {displayedRows.length === 0 && (
              <tr>
                <td className="px-3 py-8 text-center text-gray-500" colSpan={8}>
                  No hay contratos para los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
