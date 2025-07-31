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
import EntradasSalidasRow from "./EntradasSalidasRow"; // Importa el componente de fila

export default function EntradasSalidasTable({
  registros,
  fecha,
  editingMovimientoId,
  editingMovimientoData,
  isSavingMovimiento,
  handleEditMovimientoClick,
  handleCancelMovimientoEdit,
  handleMovimientoFieldChange,
  handleSaveMovimientoClick,
}) {
  if (registros.length === 0) {
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
          {!fecha ? (
            <TableHead className="text-center">Fecha de entrada</TableHead>
          ) : null}
          <TableHead className="text-center">Hora de entrada</TableHead>
          {!fecha ? (
            <TableHead className="text-center">Fecha de salida</TableHead>
          ) : null}
          <TableHead className="text-center">Hora de salida</TableHead>
          <TableHead className="text-center">Entrada corregida</TableHead>
          <TableHead className="text-center">Salida corregida</TableHead>
          <TableHead className="text-center">Estado</TableHead>
          <TableHead className="sticky right-0 bg-background z-10 text-center">
            Acciones
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {registros.map((reg) => (
          <EntradasSalidasRow
            key={reg.id}
            registro={reg}
            fecha={fecha}
            isEditing={editingMovimientoId === reg.id}
            editingRowData={editingMovimientoData}
            isSaving={isSavingMovimiento}
            handleEditMovimientoClick={handleEditMovimientoClick}
            handleCancelMovimientoEdit={handleCancelMovimientoEdit}
            handleMovimientoFieldChange={handleMovimientoFieldChange}
            handleSaveMovimientoClick={handleSaveMovimientoClick}
          />
        ))}
      </TableBody>
    </Table>
  );
}
