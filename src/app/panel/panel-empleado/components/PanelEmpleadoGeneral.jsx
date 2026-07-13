"use client";

import { User, Briefcase, Phone, MapPin } from "lucide-react";

/**
 * Componente para mostrar la información general del empleado
 * Relacionado con: src/app/panel/panel-empleado/page.jsx
 */
export default function PanelEmpleadoGeneral({ datosEmpleado }) {
  if (!datosEmpleado) return null;

  const emp = datosEmpleado.informacion_general;
  const stats = datosEmpleado.asistencias?.estadisticas || {};
  const resPermisos = datosEmpleado.permisos?.resumen || {};
  const resContratos = datosEmpleado.contratos?.resumen || {};
  const vacaciones = datosEmpleado.vacaciones?.balance || {};

  return (
    <div>
      {/* Mini-KPIs homologados */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <MiniKpi
          label="Asistencia"
          value={`${stats.porcentaje_asistencia || 0}%`}
        />
        <MiniKpi label="Permisos tomados" value={resPermisos.total || 0} />
        <MiniKpi label="Días vacaciones" value={vacaciones.dias_tomados || 0} />
        <MiniKpi label="Contratos activos" value={resContratos.activos || 0} />
      </div>

      {/* Información detallada */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
        <SeccionCard icono={User} titulo="Información personal">
          <InfoRow label="Nombre Completo" value={emp?.nombre_completo} />
          <InfoRow
            label="Fecha de Nacimiento"
            value={formatearFecha(emp?.fecha_nacimiento)}
          />
          <InfoRow label="CURP" value={emp?.curp} />
          <InfoRow label="RFC" value={emp?.rfc} />
          <InfoRow label="NSS" value={emp?.nss} />
        </SeccionCard>

        <SeccionCard icono={Briefcase} titulo="Información laboral">
          <InfoRow label="Puesto" value={emp?.puesto} />
          <InfoRow label="Departamento" value={emp?.departamento} />
          <InfoRow label="Empresa" value={emp?.empresa} />
          <InfoRow
            label="Fecha de Ingreso"
            value={formatearFecha(emp?.fecha_ingreso)}
          />
          <InfoRow label="Antigüedad" value={emp?.antiguedad} />
        </SeccionCard>

        <SeccionCard icono={Phone} titulo="Contacto">
          <InfoRow label="Email Corporativo" value={emp?.email_corporativo} />
          <InfoRow label="Email Personal" value={emp?.email_personal} />
          <InfoRow label="Teléfono" value={emp?.telefono} />
          <InfoRow label="Extensión" value={emp?.extension} />
        </SeccionCard>

        <SeccionCard icono={MapPin} titulo="Dirección">
          <InfoRow label="Calle" value={emp?.direccion?.calle} />
          <InfoRow label="Colonia" value={emp?.direccion?.colonia} />
          <InfoRow label="Ciudad" value={emp?.direccion?.ciudad} />
          <InfoRow label="Estado" value={emp?.direccion?.estado} />
          <InfoRow label="CP" value={emp?.direccion?.codigo_postal} />
        </SeccionCard>
      </div>
    </div>
  );
}

function MiniKpi({ label, value }) {
  return (
    <div className="min-w-0 rounded-[10px] border border-gray-200 bg-white p-3">
      <div className="truncate text-[10.5px] font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="text-lg font-extrabold tabular-nums text-gray-900">
        {value}
      </div>
    </div>
  );
}

function SeccionCard({ icono: Icono, titulo, children }) {
  return (
    <div className="rounded-[10px] border border-gray-200 bg-white p-4">
      <h4 className="mb-3 flex items-center gap-1.5 text-[12.5px] font-bold text-gray-900">
        <Icono className="h-3.5 w-3.5 text-[#2563eb]" />
        {titulo}
      </h4>
      <div className="space-y-2 sm:space-y-3">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col gap-1 border-b border-gray-100 py-1.5 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-0 sm:py-2">
      <span className="text-xs text-gray-600 sm:text-sm">{label}:</span>
      <span className="break-words text-right text-xs font-semibold text-gray-900 sm:break-all sm:text-left sm:text-sm">
        {value || "N/A"}
      </span>
    </div>
  );
}

function formatearFecha(fechaISO) {
  if (!fechaISO || fechaISO === "N/A") return "N/A";

  try {
    const fecha = new Date(fechaISO + "T00:00:00");
    const dia = String(fecha.getDate()).padStart(2, "0");
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const anio = fecha.getFullYear();
    return `${dia}/${mes}/${anio}`;
  } catch (e) {
    return fechaISO;
  }
}
