"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
      <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
        📊 Resumen General
      </h3>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
        <Card className="overflow-hidden">
          <CardContent className="p-3 sm:p-4 md:p-5 text-center min-w-0">
            <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-1 break-words overflow-hidden">
              {stats.porcentaje_asistencia || 0}%
            </div>
            <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide break-words">
              Asistencia
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-3 sm:p-4 md:p-5 text-center min-w-0">
            <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-1 break-words overflow-hidden">
              {resPermisos.total || 0}
            </div>
            <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide break-words">
              Permisos tomados
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-3 sm:p-4 md:p-5 text-center min-w-0">
            <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-1 break-words overflow-hidden">
              {vacaciones.dias_tomados || 0}
            </div>
            <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide break-words">
              Días vacaciones
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-3 sm:p-4 md:p-5 text-center min-w-0">
            <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-1 break-words overflow-hidden">
              {resContratos.activos || 0}
            </div>
            <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide break-words">
              Contratos activos
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Información detallada */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="p-3 sm:p-4 md:p-6 pb-2 sm:pb-3">
            <CardTitle className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide">
              👤 Información Personal
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0 space-y-2 sm:space-y-3">
            <InfoRow label="Nombre Completo" value={emp?.nombre_completo} />
            <InfoRow label="Fecha de Nacimiento" value={formatearFecha(emp?.fecha_nacimiento)} />
            <InfoRow label="CURP" value={emp?.curp} />
            <InfoRow label="RFC" value={emp?.rfc} />
            <InfoRow label="NSS" value={emp?.nss} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3 sm:p-4 md:p-6 pb-2 sm:pb-3">
            <CardTitle className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide">
              💼 Información Laboral
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0 space-y-2 sm:space-y-3">
            <InfoRow label="Puesto" value={emp?.puesto} />
            <InfoRow label="Departamento" value={emp?.departamento} />
            <InfoRow label="Empresa" value={emp?.empresa} />
            <InfoRow label="Fecha de Ingreso" value={formatearFecha(emp?.fecha_ingreso)} />
            <InfoRow label="Antigüedad" value={emp?.antiguedad} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3 sm:p-4 md:p-6 pb-2 sm:pb-3">
            <CardTitle className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide">
              📞 Contacto
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0 space-y-2 sm:space-y-3">
            <InfoRow label="Email Corporativo" value={emp?.email_corporativo} />
            <InfoRow label="Email Personal" value={emp?.email_personal} />
            <InfoRow label="Teléfono" value={emp?.telefono} />
            <InfoRow label="Extensión" value={emp?.extension} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3 sm:p-4 md:p-6 pb-2 sm:pb-3">
            <CardTitle className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide">
              📍 Dirección
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0 space-y-2 sm:space-y-3">
            <InfoRow label="Calle" value={emp?.direccion?.calle} />
            <InfoRow label="Colonia" value={emp?.direccion?.colonia} />
            <InfoRow label="Ciudad" value={emp?.direccion?.ciudad} />
            <InfoRow label="Estado" value={emp?.direccion?.estado} />
            <InfoRow label="CP" value={emp?.direccion?.codigo_postal} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-1.5 sm:py-2 border-b border-gray-100 last:border-0 gap-1 sm:gap-0">
      <span className="text-xs sm:text-sm text-gray-600">{label}:</span>
      <span className="text-xs sm:text-sm font-semibold text-gray-900 break-words sm:break-all text-right sm:text-left">{value || "N/A"}</span>
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

