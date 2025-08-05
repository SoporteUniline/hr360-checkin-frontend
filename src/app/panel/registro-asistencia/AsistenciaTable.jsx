// src/app/panel/registro-asistencia/AsistenciaTable.jsx
import dayjs from "dayjs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import AsistenciaRow from "./AsistenciaRow"; // Importa el componente de fila
import { twMerge } from "tailwind-merge";

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
}) {
  if (filtrados.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-10">
        No hay registros para hoy o búsqueda sin resultados.
      </div>
    );
  }

  return (
    <>
      <div className="bg-slate-700 shadow-md px-4 py-3 rounded-tl-md rounded-tr-md">
        <h2 className="text-lg font-bold bg-slate-700 text-white">
          Registros de Asistencia
        </h2>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-white bg-slate-700 ">Empleado</TableHead>
            <TableHead className="text-white bg-slate-700 ">
              Departamento
            </TableHead>
            <TableHead className="text-white bg-slate-700 ">
              Tipo de registro
            </TableHead>
            <TableHead className="text-white bg-slate-700 ">
              Estado asistencia
            </TableHead>
            {!fecha && (
              <TableHead className="text-white bg-slate-700 text-center">
                Fecha
              </TableHead>
            )}
            <TableHead className="text-white bg-slate-700 text-center">
              Corrección
            </TableHead>
            <TableHead className="text-white bg-slate-700 text-center">
              Entrada
            </TableHead>
            <TableHead className="text-white bg-slate-700 text-center">
              Salida
            </TableHead>
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
            <TableHead className="text-white bg-slate-700 text-center">
              ¿Trabajó horas extra?
            </TableHead>
            <TableHead className="text-white bg-slate-700 text-center">
              Forma de pago horas extra
            </TableHead>
            <TableHead className="text-white bg-slate-700 text-center">
              Horas extras autorizadas por
            </TableHead>
            <TableHead className="text-white bg-slate-700 text-center">
              Horas de comida
            </TableHead>
            <TableHead className="text-white bg-slate-700 text-center">
              Notas
            </TableHead>
            <TableHead className="text-white bg-slate-700 text-center">
              Notas horas extra
            </TableHead>
            <TableHead className="text-white bg-slate-700 text-center">
              Estado
            </TableHead>
            <TableHead className="text-white bg-slate-700 sticky right-0 z-10 text-center ">
              Acciones
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtrados.map((reg) => (
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
            />
          ))}
        </TableBody>
      </Table>
    </>
  );
}
