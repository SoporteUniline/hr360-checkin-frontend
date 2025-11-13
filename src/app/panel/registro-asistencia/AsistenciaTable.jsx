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

export default function AsistenciaTable({
  filtrados,
  fecha,
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
    fecha: r.fecha ? dayjs(r.fecha).format("DD/MM/YYYY") : "-",
    correccion: r.correcion ? "Sí" : "No",
    entrada: r.entrada ? dayjs(r.entrada).format("DD/MM/YYYY HH:mm:ss") : "-",
    salida: r.salida ? dayjs(r.salida).format("DD/MM/YYYY HH:mm:ss") : "-",
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-slate-700 shadow-md px-4 py-3 rounded-tl-md rounded-tr-md gap-3">
        <div className="flex items-center text-lg font-bold text-white">
          <h1>Registros de Asistencia</h1>
        </div>
        <div className="flex flex-col md:flex-row flex-wrap justify-end gap-3 w-full md:w-auto">
          <Button
            onClick={() =>
              exportToExcel(exportData, columns, "Reporte_Asistencias", {
                sheetName: "Asistencias",
                headerColor: "15803D",
              })
            }
            className="bg-emerald-600 hover:bg-emerald-700 shadow-lg"
          >
            <FileSpreadsheet className="w-5 h-5 mr-2" />
            Exportar Excel
          </Button>

          <Button
            onClick={abrirFormulario}
            className="bg-violet-700 shadow-lg transition-all duration-200 hover:shadow-xl hover:bg-violet-800 w-full sm:w-auto"
          >
            <Plus className="w-5 h-5 mr-2" />
            Registrar Asistencia Masiva
          </Button>

          <Button
            onClick={onResetFilters}
            variant="outline"
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <RotateCcw className="w-4 h-4" />
            Limpiar Filtros
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-white bg-slate-700 ">Empleado</TableHead>
            {mostrarCamposExtras && (
              <TableHead className="text-white bg-slate-700 ">Código</TableHead>
            )}
            <TableHead className="text-white bg-slate-700 ">
              Departamento
            </TableHead>
            <TableHead className="text-white bg-slate-700 ">
              Tipo de registro
            </TableHead>

            <TableHead className="text-white bg-slate-700 text-center">
              Fecha
            </TableHead>

            {mostrarCamposExtras && (
              <TableHead className="text-white bg-slate-700 text-center">
                Corrección
              </TableHead>
            )}

            <TableHead className="text-white bg-slate-700 text-center">
              Entrada
            </TableHead>
            <TableHead className="text-white bg-slate-700 text-center">
              Salida
            </TableHead>
            {mostrarCamposExtras && (
              <>
                <TableHead className="text-white bg-slate-700 text-center">
                  Autorizado por
                </TableHead>
              </>
            )}
            <TableHead className="text-white bg-slate-700 text-center">
              ¿Asistió?
            </TableHead>
            <TableHead className="text-white bg-slate-700 text-center">
              ¿Goce de sueldo?
            </TableHead>

            {mostrarCamposExtras && (
              <>
                <TableHead className="text-white bg-slate-700 text-center">
                  ¿Pago triple?
                </TableHead>
                <TableHead className="text-white bg-slate-700 text-center">
                  ¿Es domingo?
                </TableHead>
                <TableHead className="text-white bg-slate-700 text-center">
                  Prima dominical
                </TableHead>
                <TableHead className="text-white bg-slate-700 text-center">
                  ¿Es festivo?
                </TableHead>
                <TableHead className="text-white bg-slate-700 text-center">
                  Porcentaje día festivo
                </TableHead>
              </>
            )}

            <TableHead className="text-white bg-slate-700 text-center">
              ¿Trabajó horas extra?
            </TableHead>

            {mostrarCamposExtras && (
              <>
                <TableHead className="text-white bg-slate-700 text-center">
                  Forma de pago horas extra
                </TableHead>
                <TableHead className="text-white bg-slate-700 text-center">
                  Horas extras autorizadas por
                </TableHead>
                <TableHead className="text-white bg-slate-700 text-center">
                  Horas de comida
                </TableHead>
              </>
            )}
            <TableHead className="text-white bg-slate-700 text-center">
              Observaciones
            </TableHead>
            {mostrarCamposExtras && (
              <TableHead className="text-white bg-slate-700 text-center">
                Notas horas extra
              </TableHead>
            )}
            <TableHead className="text-white bg-slate-700 text-center">
              Estado
            </TableHead>

            {mostrarCamposExtras && (
              <TableHead className="text-white bg-slate-700 ">
                Estado asistencia
              </TableHead>
            )}
            <TableHead className="text-white bg-slate-700 sticky right-0 z-10 text-center ">
              Acciones
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtrados.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={mostrarCamposExtras ? 22 : 12} // ajusta según cuántas columnas tengas
                className="text-center py-2 text-muted-foreground"
              >
                No hay registros para hoy o búsqueda sin resultados.
              </TableCell>
            </TableRow>
          ) : (
            filtrados.map((reg) => (
              <AsistenciaRow
                key={reg.id}
                registro={reg}
                fecha={fecha}
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
    </>
  );
}
