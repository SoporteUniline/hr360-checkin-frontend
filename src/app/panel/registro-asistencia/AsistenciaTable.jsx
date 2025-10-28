// src/app/panel/registro-asistencia/AsistenciaTable.jsx
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
import { Plus, RotateCcw } from "lucide-react";

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
  // if (filtrados.length === 0) {
  //   return (
  //     <div className="text-center text-muted-foreground py-10">
  //       No hay registros para hoy o búsqueda sin resultados.
  //     </div>
  //   );
  // }

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-slate-700 shadow-md px-4 py-3 rounded-tl-md rounded-tr-md gap-3">
        <div className="flex items-center text-lg font-bold text-white">
          <h1>Registros de Asistencia</h1>
        </div>
        <div className="flex flex-col md:flex-row flex-wrap justify-end gap-3 w-full md:w-auto">
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
                <TableHead className="text-white bg-slate-700 text-center">
                  ¿Asistió?
                </TableHead>
                <TableHead className="text-white bg-slate-700 text-center">
                  ¿Goce de sueldo?
                </TableHead>
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
