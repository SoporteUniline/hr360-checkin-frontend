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
import { exportToExcel } from "@/utils/exportExcelJS";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet } from "lucide-react";

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

  const handleExportExcel = async () => {
    const columns = [
      { header: "Nombre", key: "nombre", width: 25 },
      { header: "Apellido Paterno", key: "apellido_paterno", width: 20 },
      { header: "Apellido Materno", key: "apellido_materno", width: 20 },
      { header: "Puesto", key: "puesto", width: 25 },
      { header: "Departamento", key: "departamento", width: 20 },
      { header: "Sucursal", key: "sucursal", width: 20 },
      { header: "Entrada", key: "entrada", width: 22 },
      { header: "Entrada corregida", key: "entrada_corregida", width: 22 },
      { header: "Salida", key: "salida", width: 22 },
      { header: "Salida corregida", key: "salida_corregida", width: 22 },
      { header: "Estado", key: "estado", width: 15 },
    ];

    const data = registros.map((r) => ({
      nombre: r.nombre,
      apellido_paterno: r.apellido_paterno,
      apellido_materno: r.apellido_materno,
      puesto: r.puesto,
      departamento: r.departamento,
      sucursal: r.sucursal,
      entrada: r.entrada ? dayjs(r.entrada).format("DD/MM/YYYY HH:mm:ss") : "-",
      entrada_corregida: r.entrada_corregida
        ? dayjs(r.entrada_corregida).format("DD/MM/YYYY HH:mm:ss")
        : "-",
      salida: r.salida ? dayjs(r.salida).format("DD/MM/YYYY HH:mm:ss") : "-",
      salida_corregida: r.salida_corregida
        ? dayjs(r.salida_corregida).format("DD/MM/YYYY HH:mm:ss")
        : "-",
      estado: r.estado,
    }));

    await exportToExcel(data, columns, "Entradas_Salidas", {
      sheetName: "Registros",
      headerColor: "FF1E3A8A",
    });
  };

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-slate-700 shadow-md px-4 py-3 rounded-tl-md rounded-tr-md gap-3">
        <div className="flex items-center text-lg font-bold text-white">
          <h1>Registros del día</h1>
        </div>
        <div className="flex flex-col md:flex-row flex-wrap justify-end gap-3 w-full md:w-auto">
          <Button
            onClick={handleExportExcel}
            className="bg-emerald-600 hover:bg-emerald-700 shadow-lg"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Exportar Excel
          </Button>
        </div>
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
