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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Empleado</TableHead>
          <TableHead>Tipo de registro</TableHead>
          {!fecha && <TableHead className="text-center">Fecha</TableHead>}
          <TableHead className="text-center">Corrección</TableHead>
          <TableHead className="text-center">Entrada</TableHead>
          <TableHead className="text-center">Salida</TableHead>
          <TableHead className="text-center">Autorizado por</TableHead>
          <TableHead className="text-center">¿Asistió?</TableHead>
          <TableHead className="text-center">¿Goce de sueldo?</TableHead>
          <TableHead className="text-center">¿Pago triple?</TableHead>

          <TableHead className="text-center">¿Es domingo?</TableHead>
          <TableHead className="text-center">Prima dominical</TableHead>
          <TableHead className="text-center">¿Es festivo?</TableHead>
          <TableHead className="text-center">Porcentaje día festivo</TableHead>
          <TableHead className="text-center">¿Trabajó horas extra?</TableHead>
          <TableHead className="text-center">
            Forma de pago horas extra
          </TableHead>
          <TableHead className="text-center">
            Horas extras autorizadas por
          </TableHead>
          <TableHead className="text-center">Horas de comida</TableHead>
          <TableHead className="text-center">Notas</TableHead>
          <TableHead className="text-center">Notas horas extra</TableHead>
          <TableHead className="text-center">Estado</TableHead>
          <TableHead className="sticky right-0 bg-background z-10 text-center">
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
  );
}
