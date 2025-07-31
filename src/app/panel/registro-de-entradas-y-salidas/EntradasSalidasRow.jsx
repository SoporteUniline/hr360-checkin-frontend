// src/app/panel/registro-asistencia/AsistenciaRow.jsx
import dayjs from "dayjs";
import { TableCell, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export default function EntradasSalidasRow({
  registro,
  fecha,
  isEditing,
  editingRowData,
  isSaving,
  handleEditMovimientoClick,
  handleCancelMovimientoEdit,
  handleMovimientoFieldChange,
  handleSaveMovimientoClick,
}) {
  const currentData = isEditing ? editingRowData : registro;

  const formatDate = (dateTimeString) => {
    if (!dateTimeString) return "-";
    return dayjs(dateTimeString).format("DD-MM-YYYY");
  };
  const formatTime = (dateTimeString) => {
    if (!dateTimeString) return "-";
    return dayjs(dateTimeString).format("HH:mm");
  };

  const baseDateForCorrection = dayjs(registro.entrada).format("YYYY-MM-DD");

  return (
    <TableRow key={registro.id}>
      {/* Celdas para mostrar datos cuando NO se está editando */}
      {!isEditing && (
        <>
          <TableCell>{`${registro.nombre} ${registro.apellido_paterno}`}</TableCell>
          {!fecha && ( // Mostrar fecha de entrada si no hay filtro de fecha principal
            <TableCell className="text-center">
              {formatDate(registro.entrada)}
            </TableCell>
          )}
          <TableCell className="text-center">
            {formatTime(registro.entrada)}
          </TableCell>
          {!fecha && ( // Mostrar fecha de salida si no hay filtro de fecha principal
            <TableCell className="text-center">
              {formatDate(registro.salida)}
            </TableCell>
          )}
          <TableCell className="text-center">
            {formatTime(registro.salida)}
          </TableCell>
          <TableCell className="text-center">
            {registro.entrada_corregida
              ? formatTime(registro.entrada_corregida) // Usa formatTime aquí
              : "-"}
          </TableCell>
          <TableCell className="text-center">
            {registro.salida_corregida
              ? formatTime(registro.salida_corregida) // Usa formatTime aquí
              : "-"}
          </TableCell>
          <TableCell className="text-center">
            <span
              className={`px-2 py-1 rounded-full text-sm text-white ${
                registro.estado === "Abierto" ? "bg-green-600" : "bg-gray-500"
              }`}
            >
              {registro.estado}
            </span>
          </TableCell>
          <TableCell className="sticky right-0 bg-background z-10 text-center">
            <Button
              size="sm"
              onClick={() => handleEditMovimientoClick(registro)}
            >
              Editar
            </Button>
          </TableCell>
        </>
      )}

      {/* Celdas para mostrar inputs cuando SÍ se está editando */}
      {isEditing && (
        <>
          <TableCell>{`${registro.nombre} ${registro.apellido_paterno}`}</TableCell>

          {/* Oculta las columnas de fecha si el filtro está activo (o si no las quieres ver en edición) */}
          {!fecha && (
            <TableCell className="text-center">
              {currentData.entrada_corregida
                ? formatDate(currentData.entrada_corregida)
                : formatDate(currentData.entrada)}
            </TableCell>
          )}

          <TableCell className="text-center">
            {formatTime(registro.entrada)}{" "}
            {/* Siempre muestra la hora original */}
          </TableCell>

          {!fecha && (
            <TableCell className="text-center">
              {currentData.salida_corregida
                ? formatDate(currentData.salida_corregida)
                : formatDate(currentData.salida)}
            </TableCell>
          )}

          <TableCell className="text-center">
            {formatTime(registro.salida)}{" "}
            {/* Siempre muestra la hora original */}
          </TableCell>

          <TableCell className="text-center">
            <Input
              type="time"
              // Usar 'currentData.entrada_corregida' para el valor del input, si existe.
              // slice(11, 16) para obtener "HH:mm" del formato "YYYY-MM-DD HH:mm:ss"
              value={
                currentData.entrada_corregida
                  ? dayjs(currentData.entrada_corregida).format("HH:mm")
                  : ""
              }
              max={
                currentData.salida_corregida
                  ? dayjs(currentData.salida_corregida).format("HH:mm")
                  : undefined
              }
              onChange={(e) => {
                const hora = e.target.value;
                // Combina la fecha base con la hora seleccionada
                const nuevaEntradaCorregida = hora
                  ? dayjs(`${baseDateForCorrection} ${hora}`).format(
                      "YYYY-MM-DD HH:mm:ss"
                    )
                  : null;
                handleMovimientoFieldChange(
                  "entrada_corregida",
                  nuevaEntradaCorregida
                );
              }}
            />
          </TableCell>
          <TableCell className="text-center">
            <Input
              type="time"
              // Usar 'currentData.salida_corregida' para el valor del input, si existe.
              value={
                currentData.salida_corregida
                  ? dayjs(currentData.salida_corregida).format("HH:mm")
                  : ""
              }
              min={
                currentData.entrada_corregida
                  ? dayjs(currentData.entrada_corregida).format("HH:mm")
                  : undefined
              }
              onChange={(e) => {
                const hora = e.target.value;
                // Combina la fecha base con la hora seleccionada
                const nuevaSalidaCorregida = hora
                  ? dayjs(`${baseDateForCorrection} ${hora}`).format(
                      "YYYY-MM-DD HH:mm:ss"
                    )
                  : null;
                handleMovimientoFieldChange(
                  "salida_corregida",
                  nuevaSalidaCorregida
                );
              }}
            />
          </TableCell>

          <TableCell className="text-center">
            <span
              className={`px-2 py-1 rounded-full text-sm text-white ${
                currentData.estado === "Abierto"
                  ? "bg-green-600"
                  : "bg-gray-500"
              }`}
            >
              {currentData.estado}
            </span>
          </TableCell>
          <TableCell className="sticky right-0 bg-background z-10 text-center p-0">
            <div className="flex items-center justify-center gap-2 h-full px-2">
              <Button
                size="sm"
                onClick={handleSaveMovimientoClick}
                disabled={isSaving}
              >
                {isSaving ? "Guardando..." : "Guardar"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancelMovimientoEdit}
                disabled={isSaving}
              >
                Cancelar
              </Button>
            </div>
          </TableCell>
        </>
      )}
    </TableRow>
  );
}
