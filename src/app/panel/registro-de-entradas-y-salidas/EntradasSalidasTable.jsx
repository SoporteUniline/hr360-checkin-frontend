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
import { FileSpreadsheet, RotateCcw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

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
  onResetFilters,
  empresaActiva,
}) {
  const { dataUser } = useAuth();
  const userTimezone = dataUser?.zona_horaria || "America/Mexico_City";

  const handleExportExcel = async () => {
    const columns = [
      { header: "Nombre", key: "nombre", width: 25 },
      { header: "Apellido Paterno", key: "apellido_paterno", width: 20 },
      { header: "Apellido Materno", key: "apellido_materno", width: 20 },
      { header: "Empresa", key: "nombre_empresa", width: 20 },
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
      nombre_empresa: r.nombre_empresa,
      puesto: r.puesto,
      departamento: r.departamento,
      sucursal: r.sucursal,
      entrada: r.entrada
        ? dayjs
            .tz(r.entrada, "America/Mexico_City")
            .tz(userTimezone)
            .format("DD/MM/YYYY HH:mm:ss")
        : "-",
      entrada_corregida: r.entrada_corregida
        ? dayjs
            .tz(r.entrada_corregida, "America/Mexico_City")
            .tz(userTimezone)
            .format("DD/MM/YYYY HH:mm:ss")
        : "-",
      salida: r.salida
        ? dayjs
            .tz(r.salida, "America/Mexico_City")
            .tz(userTimezone)
            .format("DD/MM/YYYY HH:mm:ss")
        : "-",
      salida_corregida: r.salida_corregida
        ? dayjs
            .tz(r.salida_corregida, "America/Mexico_City")
            .tz(userTimezone)
            .format("DD/MM/YYYY HH:mm:ss")
        : "-",
      estado: r.estado,
    }));

    await exportToExcel(data, columns, "Entradas_Salidas", {
      sheetName: "Registros",
      headerColor: "2563EB",
    });
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            {/* Si viene `fecha` estamos en modo single-day (desde === hasta). Si no, es rango. */}
            <h2 className="text-lg font-semibold text-gray-900">
              {fecha ? "Registros del día" : "Registros del período"}
            </h2>
            <p className="text-sm text-gray-500">
              Consulta y corrige entradas/salidas.
            </p>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleExportExcel}
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Exportar Excel
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 hover:bg-gray-50">
                <TableHead className="font-semibold text-gray-700 uppercase text-xs">
                  Empleado
                </TableHead>
                {empresaActiva === "all" && (
                  <TableHead className="font-semibold text-gray-700 uppercase text-xs">
                    Empresa
                  </TableHead>
                )}
                <TableHead className="font-semibold text-gray-700 uppercase text-xs">
                  Departamento / Sucursal
                </TableHead>
                {/* IMPORTANTE (UX): aunque filtremos 1 solo día (desde===hasta), siempre mostramos la fecha */}
                <TableHead className="font-semibold text-gray-700 uppercase text-xs text-center">
                  Fecha de entrada
                </TableHead>
                <TableHead className="font-semibold text-gray-700 uppercase text-xs text-center">
                  Hora entrada
                </TableHead>
                <TableHead className="font-semibold text-gray-700 uppercase text-xs text-center">
                  Hora salida
                </TableHead>
                <TableHead className="font-semibold text-gray-700 uppercase text-xs text-center">
                  Entrada corregida
                </TableHead>
                <TableHead className="font-semibold text-gray-700 uppercase text-xs text-center">
                  Salida corregida
                </TableHead>
                <TableHead className="font-semibold text-gray-700 uppercase text-xs text-center">
                  Estado
                </TableHead>
                <TableHead className="sticky right-0 bg-gray-50 z-10 text-center font-semibold text-gray-700 uppercase text-xs">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registros.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={(empresaActiva = "all" ? 10 : 9)}
                    className="text-center py-10 text-gray-500"
                  >
                    No hay registros para los filtros seleccionados.
                  </TableCell>
                </TableRow>
              ) : (
                registros.map((reg) => (
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
                    empresaActiva={empresaActiva}
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
