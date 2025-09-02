import dayjs from "dayjs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import EntradasSalidasRow from "./EntradasSalidasRow";

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
    <>
      <div className="bg-slate-700 shadow-md px-4 py-3 rounded-tl-md rounded-tr-md">
        <h2 className="text-lg font-bold bg-slate-700 text-white">
          Registros del día
        </h2>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-white bg-slate-700 ">Empleado</TableHead>
            <TableHead className="text-white bg-slate-700 ">
              Departamento / Sucursal
            </TableHead>
            {!fecha ? (
              <TableHead className="text-white bg-slate-700 text-center">
                Fecha de entrada
              </TableHead>
            ) : null}
            <TableHead className="text-white bg-slate-700 text-center">
              Hora de entrada
            </TableHead>
            {!fecha ? (
              <TableHead className="text-white bg-slate-700 text-center">
                Fecha de salida
              </TableHead>
            ) : null}
            <TableHead className="text-white bg-slate-700 text-center">
              Hora de salida
            </TableHead>
            <TableHead className="text-white bg-slate-700 text-center">
              Entrada corregida
            </TableHead>
            <TableHead className="text-white bg-slate-700 text-center">
              Salida corregida
            </TableHead>
            <TableHead className="text-white bg-slate-700 text-center">
              Estado
            </TableHead>
            <TableHead className="text-white bg-slate-700 sticky right-0  z-10 text-center">
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
    </>
  );
}
