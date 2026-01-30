import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import AsistenciaRow from "./AsistenciaRow";
import { Button } from "@/components/ui/button";
import { Plus, RotateCcw, FileSpreadsheet } from "lucide-react";
import { exportToExcel } from "@/utils/exportExcelJS";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useAuth } from "@/context/AuthContext";

dayjs.extend(utc);
dayjs.extend(timezone);

export default function AsistenciaTable({
  filtrados,
  fecha,
  readOnly = false, // Si true, oculta acciones/botones (vista informativa)
  editingRowId,
  editingRowData,
  isSaving,
  empleados,
  tiposPermiso,
  handleEditClick,
  handleCancelEdit,
  handleFieldChange,
  handleSaveClick,
  mutateAsistencia,
  mostrarCamposExtras,
  abrirFormulario,
  onResetFilters,
}) {
  const { dataUser } = useAuth();
  const userTimezone = dataUser?.zona_horaria || "America/Mexico_City";
  const DB_TIMEZONE = "America/Mexico_City";

  const columns = [
    { header: "Nombre", key: "nombre" },
    { header: "Apellido Paterno", key: "apellido_paterno" },
    { header: "Apellido Materno", key: "apellido_materno" },
    { header: "Código", key: "nip" },
    { header: "Departamento", key: "departamento" },
    { header: "Tipo de Registro", key: "tipo_registro_nombre" },
    { header: "Fecha", key: "fecha" },
    { header: "Corrección", key: "correccion" },
    { header: "Entrada", key: "entrada" },
    { header: "Salida", key: "salida" },
    { header: "Autorizado por", key: "autorizado_por" },
    { header: "¿Asistió?", key: "asistencia" },
    { header: "¿Goce de Sueldo?", key: "goce_sueldo" },
    { header: "¿Pago Triple?", key: "pago_triple" },
    { header: "¿Es domingo?", key: "es_domingo" },
    { header: "Prima Dominical", key: "prima_dominical" },
    { header: "Es Festivo", key: "es_festivo" },
    { header: "Porcentaje Día Festivo", key: "porcentaje_dia_festivo" },
    { header: "¿Trabajó horas extra?", key: "hrs_extra" },
    { header: "Forma de pago horas extra", key: "forma_pago_extras" },
    { header: "Horas extras autorizadas por", key: "extras_autorizadas_por" },
    { header: "Horas de comida", key: "hrs_comida" },
    { header: "Observaciones", key: "notas" },
    { header: "Notas horas extra", key: "notas_hrs_extra" },
    { header: "Estado", key: "estado" },
    { header: "Estado Asistencia", key: "estadoAsistencia" },
  ];

  const exportData = filtrados.map((r) => ({
    nombre: r.nombre,
    apellido_paterno: r.apellido_paterno,
    apellido_materno: r.apellido_materno,
    nip: r.nip,
    departamento: r.departamento,
    tipo_registro_nombre: r.tipo_registro_nombre,
    fecha: r.fecha
      ? dayjs.tz(r.fecha, DB_TIMEZONE).tz(userTimezone).format("DD/MM/YYYY")
      : "-",

    correccion: r.correcion ? "Sí" : "No",
    entrada: r.entrada
      ? dayjs
          .tz(r.entrada, DB_TIMEZONE)
          .tz(userTimezone)
          .format("DD/MM/YYYY HH:mm:ss")
      : "-",

    salida: r.salida
      ? dayjs
          .tz(r.salida, DB_TIMEZONE)
          .tz(userTimezone)
          .format("DD/MM/YYYY HH:mm:ss")
      : "-",

    autorizado_por: r.autorizado_por ?? "-",
    asistencia: r.asistencia ? "Sí" : "No",
    goce_sueldo: r.goce_sueldo ? "Sí" : "No",
    pago_triple: r.pago_triple ? "Sí" : "No",
    es_domingo: r.es_domingo ? "Sí" : "No",
    prima_dominical: r.prima_dominical ?? "-",
    es_festivo: r.es_festivo ? "Sí" : "No",
    porcentaje_dia_festivo: r.porcentaje_dia_festivo ?? "-",
    hrs_extra: r.hrs_extra ? "Sí" : "No",
    forma_pago_extras: r.forma_pago_extras ?? "-",
    extras_autorizadas_por: r.extras_autorizadas_por ?? "-",
    hrs_comida: r.hrs_comida ?? "-",
    notas: r.notas ?? "-",
    notas_hrs_extra: r.notas_hrs_extra ?? "-",
    estado: r.estado ?? "-",
    estadoAsistencia: r.estadoAsistencia,
  }));

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        {!readOnly ? (
          <div className="px-6 py-4 border-b border-gray-100 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Registros de asistencia</h2>
              <p className="text-sm text-gray-500">Exporta o registra asistencias masivas.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
              <Button
                onClick={() =>
                  exportToExcel(exportData, columns, "Reporte_Asistencias", {
                    sheetName: "Asistencias",
                    headerColor: "2563EB",
                  })
                }
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Exportar Excel
              </Button>

              <Button
                onClick={abrirFormulario}
                className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-md"
              >
                <Plus className="h-4 w-4 mr-2" />
                Registrar asistencia masiva
              </Button>

              <Button
                onClick={onResetFilters}
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Limpiar
              </Button>
            </div>
          </div>
        ) : (
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Registros de asistencia</h2>
          </div>
        )}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 hover:bg-gray-50">
                <TableHead className="font-semibold text-gray-700 uppercase text-xs">Empleado</TableHead>
                {mostrarCamposExtras && (
                  <TableHead className="font-semibold text-gray-700 uppercase text-xs">Código</TableHead>
                )}
                <TableHead className="font-semibold text-gray-700 uppercase text-xs">Departamento</TableHead>
                <TableHead className="font-semibold text-gray-700 uppercase text-xs">Tipo</TableHead>
                <TableHead className="font-semibold text-gray-700 uppercase text-xs text-center">Fecha</TableHead>
                {mostrarCamposExtras && (
                  <TableHead className="font-semibold text-gray-700 uppercase text-xs text-center">Corrección</TableHead>
                )}
                <TableHead className="font-semibold text-gray-700 uppercase text-xs text-center">Entrada</TableHead>
                <TableHead className="font-semibold text-gray-700 uppercase text-xs text-center">Salida</TableHead>
                {mostrarCamposExtras && (
                  <TableHead className="font-semibold text-gray-700 uppercase text-xs text-center">Autorizado por</TableHead>
                )}
                <TableHead className="font-semibold text-gray-700 uppercase text-xs text-center">Asistió</TableHead>
                <TableHead className="font-semibold text-gray-700 uppercase text-xs text-center">Goce</TableHead>
                {mostrarCamposExtras && (
                  <>
                    <TableHead className="font-semibold text-gray-700 uppercase text-xs text-center">Pago triple</TableHead>
                    <TableHead className="font-semibold text-gray-700 uppercase text-xs text-center">Domingo</TableHead>
                    <TableHead className="font-semibold text-gray-700 uppercase text-xs text-center">Prima dom.</TableHead>
                    <TableHead className="font-semibold text-gray-700 uppercase text-xs text-center">Festivo</TableHead>
                    <TableHead className="font-semibold text-gray-700 uppercase text-xs text-center">% festivo</TableHead>
                  </>
                )}
                <TableHead className="font-semibold text-gray-700 uppercase text-xs text-center">Hrs extra</TableHead>
                {mostrarCamposExtras && (
                  <>
                    <TableHead className="font-semibold text-gray-700 uppercase text-xs text-center">Forma pago</TableHead>
                    <TableHead className="font-semibold text-gray-700 uppercase text-xs text-center">Aut. extra</TableHead>
                    <TableHead className="font-semibold text-gray-700 uppercase text-xs text-center">Hrs comida</TableHead>
                  </>
                )}
                <TableHead className="font-semibold text-gray-700 uppercase text-xs text-center">Notas</TableHead>
                {mostrarCamposExtras && (
                  <TableHead className="font-semibold text-gray-700 uppercase text-xs text-center">Notas extra</TableHead>
                )}
                <TableHead className="font-semibold text-gray-700 uppercase text-xs text-center">Estado</TableHead>
                {mostrarCamposExtras && (
                  <TableHead className="font-semibold text-gray-700 uppercase text-xs text-center">Estado asis.</TableHead>
                )}
                {!readOnly && (
                  <TableHead className="sticky right-0 bg-gray-50 z-10 text-center font-semibold text-gray-700 uppercase text-xs">
                    Acciones
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={mostrarCamposExtras ? 50 : 20}
                    className="text-center py-10 text-gray-500"
                  >
                    No hay registros para los filtros seleccionados.
                  </TableCell>
                </TableRow>
              ) : (
                filtrados.map((reg) => (
                  <AsistenciaRow
                    key={reg.id}
                    registro={reg}
                    fecha={fecha}
                    readOnly={readOnly}
                    isEditing={editingRowId === reg.id}
                    editingRowData={editingRowData}
                    isSaving={isSaving}
                    empleados={empleados}
                    tiposPermiso={tiposPermiso}
                    handleEditClick={handleEditClick}
                    handleCancelEdit={handleCancelEdit}
                    handleFieldChange={handleFieldChange}
                    handleSaveClick={handleSaveClick}
                    mutateAsistencia={mutateAsistencia}
                    mostrarCamposExtras={mostrarCamposExtras}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
