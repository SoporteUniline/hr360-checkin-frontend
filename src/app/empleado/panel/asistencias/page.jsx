"use client";
import AttendanceHistory from "@/components/empleado/AttendanceHistory";
import { attendanceRows } from "@/lib/empleado/presentation.mjs";
import useEmpleadoSesion from "@/hooks/useEmpleadoSesion";
import usePanelEmpleadoDetalle from "@/hooks/usePanelEmpleadoDetalle";
import { useEmpresaTimezone } from "@/context/AuthContext";

import { DataState } from "@/components/empleado/shared";

export default function EmployeeAttendance() {
  const session = useEmpleadoSesion();
  const { datosEmpleado, error, isLoading, mutate } = usePanelEmpleadoDetalle(session.id);
  const timezone = useEmpresaTimezone(session.empresa);
  const records = datosEmpleado?.entradas_salidas?.registros;
  const rows = attendanceRows(datosEmpleado);
  return <div className="space-y-5"><div><h1 className="text-3xl font-bold tracking-tight">Mis asistencias</h1><p className="mt-1 text-sm text-slate-500">Tus entradas y salidas registradas.</p></div>
    <DataState loading={session.isLoading || isLoading} error={session.error || error || (datosEmpleado && !Array.isArray(records) ? new Error("Historial no disponible") : null)} retry={mutate}>
      <AttendanceHistory rows={rows} timezone={timezone} />
    </DataState>
  </div>;
}
