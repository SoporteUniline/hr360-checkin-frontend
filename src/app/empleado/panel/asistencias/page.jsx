"use client";
import { useState } from "react";
import useEmpleadoSesion from "@/hooks/useEmpleadoSesion";
import usePanelEmpleadoDetalle from "@/hooks/usePanelEmpleadoDetalle";
import { useEmpresaTimezone } from "@/context/AuthContext";
import AttendanceCard from "@/components/empleado/AttendanceCard";
import { DataState } from "@/components/empleado/shared";

export default function EmployeeAttendance() {
  const session = useEmpleadoSesion();
  const { datosEmpleado, error, isLoading, mutate } = usePanelEmpleadoDetalle(session.id);
  const timezone = useEmpresaTimezone(session.empresa);
  const [month, setMonth] = useState("");
  const [visible, setVisible] = useState(20);
  const records = datosEmpleado?.entradas_salidas?.registros;
  const rows = (Array.isArray(records) ? records : []).filter(row => !month || String(row.fecha).startsWith(month)).sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  return <div className="space-y-5"><div><h1 className="text-3xl font-bold tracking-tight">Mis asistencias</h1><p className="mt-1 text-sm text-slate-500">Tus entradas y salidas registradas.</p></div>
    <label className="block text-sm font-medium">Filtrar por mes<input aria-label="Filtrar por mes" type="month" value={month} onChange={e => { setMonth(e.target.value); setVisible(20); }} className="mt-2 block min-h-12 w-full min-w-0 rounded-xl border bg-white px-3 text-base" /></label>
    {month && <button onClick={() => { setMonth(""); setVisible(20); }} className="min-h-11 text-sm font-semibold text-blue-700">Mostrar todos los registros</button>}
    <DataState loading={session.isLoading || isLoading} error={session.error || error || (datosEmpleado && !Array.isArray(records) ? new Error("Historial no disponible") : null)} retry={mutate}>
      {rows.length ? <div className="space-y-3">{rows.slice(0, visible).map((row, i) => <AttendanceCard key={row.id || `${row.fecha}-${i}`} row={row} timezone={timezone} />)}{visible < rows.length && <button className="min-h-12 w-full rounded-xl border bg-white font-semibold text-blue-700" onClick={() => setVisible(n => n + 20)}>Ver más registros</button>}</div> : <p className="rounded-2xl border border-dashed p-6 text-center text-slate-500">No hay registros disponibles para este período.</p>}
    </DataState>
  </div>;
}
