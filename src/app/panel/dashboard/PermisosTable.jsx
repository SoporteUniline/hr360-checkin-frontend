"use client";

// Tabla de permisos con filtros (Activos / Terminados / Todos)
// - Recibe `rows` desde el server: estructura generada por
//   `redlab_back/modules/attendance/controllers/dashboardController.js`
// - Usa Button de shadcn/ui y pills con <span> estilizado en lugar de Badge

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatDateDMY } from "@/lib/formatDate";
import { calcDiasTotalesYHabiles } from "@/lib/permisosDias";

function Pill({ color = "zinc", children }) {
  const map = {
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    sky: "border-sky-200 bg-sky-50 text-sky-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    indigo: "border-indigo-200 bg-indigo-50 text-indigo-900",
    zinc: "border-zinc-200 bg-zinc-50 text-zinc-700",
  };
  const cls = map[color] || map.zinc;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${cls}`}
    >
      {children}
    </span>
  );
}

/**
 * Tabla de permisos del Dashboard.
 *
 * Relación:
 * - Se usa en `src/app/panel/dashboard/page.jsx` (Server Component) y por eso
 *   recibe los festivos como arreglo serializable (`festivosYmd`), no como Set.
 * - El cálculo de días se centraliza en `src/lib/permisosDias.js` (misma regla que Permisos).
 */
export default function PermisosTable({ rows = [], festivosYmd = [] }) {
  const [filter, setFilter] = useState("activos"); // activos | terminados | todos

  // Convertir a Set en el cliente para consulta O(1).
  // - Importante: un `Set` no cruza el límite Server→Client, por eso llega como array.
  const festivosSet = useMemo(() => new Set(festivosYmd || []), [festivosYmd]);

  function classify(row) {
    const label = String(row?.status?.label || "").toLowerCase();
    const isTerminado = label.startsWith("terminado");
    return isTerminado ? "terminados" : "activos";
  }

  const filtered = useMemo(() => {
    if (filter === "todos") return rows;
    return rows.filter((r) => classify(r) === filter);
  }, [rows, filter]);

  const activosCount = useMemo(
    () => rows.filter((r) => classify(r) === "activos").length,
    [rows]
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant={filter === "activos" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("activos")}
          >
            Activos
          </Button>
          <Button
            variant={filter === "terminados" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("terminados")}
          >
            Terminados
          </Button>
          <Button
            variant={filter === "todos" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("todos")}
          >
            Todos
          </Button>
        </div>
        <Pill color="amber">
          {filter === "activos" ? activosCount : filtered.length}{" "}
          {filter === "terminados" ? "terminados" : "registros"}
        </Pill>
      </div>

      {filtered.length === 0 ? (
        <div className="text-sm text-zinc-500">
          No hay permisos para el filtro seleccionado.
        </div>
      ) : (
        <div className="overflow-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-600">
              <tr>
                <th className="p-3 text-left">Empleado</th>
                <th className="p-3 text-left">Empresa</th>
                <th className="p-3 text-left">Tipo</th>
                <th className="p-3 text-left">Estado</th>
                <th className="p-3 text-left">Inicio</th>
                <th className="p-3 text-left">Regresa</th>
                <th className="p-3 text-center">Días</th>
                <th className="p-3 text-center">Días totales</th>
                <th className="p-3 text-center">Días hábiles</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((p, idx) => {
                /**
                 * Cálculo de días del permiso en Dashboard:
                 * - `inicio` y `fin` vienen del backend (rango inclusivo real del permiso).
                 * - `regresa` es `fin + 1` (solo informativo en UI).
                 * Relación: ver `dashboardController.js` donde se construye `permisosRangos`.
                 */
                const { diasTotales, diasHabiles } = calcDiasTotalesYHabiles({
                  fechaInicio: p.inicio,
                  fechaFin: p.fin,
                  festivosSet,
                });

                return (
                <tr key={`perm-${idx}`} className="bg-white">
                  <td className="p-3 whitespace-pre-line font-medium text-zinc-800">
                    {p.nombre_empleado}
                  </td>
                  <td className="p-3 text-zinc-600">{p.nombre_empresa}</td>
                  <td className="p-3">
                    <Pill color="amber">{p.tipo}</Pill>
                  </td>
                  <td className="p-3">
                    <Pill color="sky">{p.status?.label || ""}</Pill>
                  </td>
                  <td className="p-3 text-zinc-700">
                    {formatDateDMY(p.inicio)}
                  </td>
                  <td className="p-3 text-emerald-700 font-medium">
                    {formatDateDMY(p.regresa)}
                  </td>
                  <td className="p-3 text-center font-semibold">{p.dias}</td>
                  <td className="p-3 text-center font-semibold">{diasTotales}</td>
                  <td className="p-3 text-center font-semibold">{diasHabiles}</td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
