import { TableCell, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pencil, Save, X } from "lucide-react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useAuth } from "@/context/AuthContext";

dayjs.extend(utc);
dayjs.extend(timezone);

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
  const { dataUser } = useAuth();
  const userTimezone = dataUser?.zona_horaria || "America/Mexico_City";

  const currentData = isEditing ? editingRowData : registro;

  const DB_TIMEZONE = "America/Mexico_City";

  const formatDate = (dateTimeString) => {
    if (!dateTimeString) return "-";
    return dayjs
      .tz(dateTimeString, DB_TIMEZONE)
      .tz(userTimezone)
      .format("DD-MM-YYYY");
  };

  const formatTime = (dateTimeString) => {
    if (!dateTimeString) return "-";
    return dayjs
      .tz(dateTimeString, DB_TIMEZONE)
      .tz(userTimezone)
      .format("HH:mm");
  };

  const baseDateForCorrection = dayjs
    .tz(registro.entrada, DB_TIMEZONE)
    .tz(userTimezone)
    .format("YYYY-MM-DD");

  return (
    <TableRow key={registro.id}>
      {!isEditing && (
        <>
          <TableCell>
            <p className="font-bold">{`${registro.nombre} ${registro.apellido_paterno}`}</p>
            <p className="text-xs text-gray-500">Puesto: {registro.puesto}</p>
          </TableCell>
          <TableCell>
            <p className="font-bold text-gray-500">{registro.departamento}</p>
            <p className="text-xs text-gray-500">{registro.sucursal}</p>
          </TableCell>
          {/* Mostrar siempre fecha de entrada (aunque sea un solo día) */}
          <TableCell className="text-center">{formatDate(registro.entrada)}</TableCell>
          <TableCell className="text-center text-green-500 font-bold">
            {formatTime(registro.entrada)}
          </TableCell>
          <TableCell className="text-center text-red-500 font-bold">
            {formatTime(registro.salida)}
          </TableCell>
          <TableCell className="text-center text-green-500 font-bold">
            {registro.entrada_corregida
              ? formatTime(registro.entrada_corregida)
              : "-"}
          </TableCell>
          <TableCell className="text-center text-red-500 font-bold">
            {registro.salida_corregida
              ? formatTime(registro.salida_corregida)
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
              className="bg-slate-700 hover:bg-slate-700"
            >
              <Pencil className="w-16 h-16 text-white bg-slate-700" />
            </Button>
          </TableCell>
        </>
      )}

      {isEditing && (
        <>
          <TableCell>
            <p className="font-bold">{`${registro.nombre} ${registro.apellido_paterno}`}</p>
            <p className="text-xs">Puesto: {registro.puesto}</p>
          </TableCell>
          <TableCell>
            <p className="font-bold text-gray-500">{registro.departamento}</p>
            <p className="text-xs text-gray-500">{registro.sucursal}</p>
          </TableCell>

          {/* Mostrar siempre fecha de entrada (si hay corregida, reflejarla) */}
          <TableCell className="text-center">
            {currentData.entrada_corregida
              ? formatDate(currentData.entrada_corregida)
              : formatDate(currentData.entrada)}
          </TableCell>

          <TableCell className="text-center">
            {formatTime(registro.entrada)}
          </TableCell>

          <TableCell className="text-center">
            {formatTime(registro.salida)}
          </TableCell>

          <TableCell className="text-center">
            <Input
              type="time"
              value={
                currentData.entrada_corregida
                  ? dayjs
                      .tz(currentData.entrada_corregida, DB_TIMEZONE)
                      .tz(userTimezone)
                      .format("HH:mm")
                  : ""
              }
              max={
                currentData.salida_corregida
                  ? dayjs
                      .tz(currentData.salida_corregida, DB_TIMEZONE)
                      .tz(userTimezone)
                      .format("HH:mm")
                  : undefined
              }
              onChange={(e) => {
                const hora = e.target.value;
                const nuevaEntradaCorregida = hora
                  ? dayjs
                      .tz(`${baseDateForCorrection} ${hora}`, userTimezone)
                      .tz(DB_TIMEZONE)
                      .format("YYYY-MM-DD HH:mm:ss")
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
              value={
                currentData.salida_corregida
                  ? dayjs
                      .tz(currentData.salida_corregida, DB_TIMEZONE)
                      .tz(userTimezone)
                      .format("HH:mm")
                  : ""
              }
              min={
                currentData.entrada_corregida
                  ? dayjs
                      .tz(currentData.entrada_corregida, DB_TIMEZONE)
                      .tz(userTimezone)
                      .format("HH:mm")
                  : undefined
              }
              onChange={(e) => {
                const hora = e.target.value;
                const nuevaSalidaCorregida = hora
                  ? dayjs
                      .tz(`${baseDateForCorrection} ${hora}`, userTimezone)
                      .tz(DB_TIMEZONE)
                      .format("YYYY-MM-DD HH:mm:ss")
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
                className="bg-slate-700 hover:bg-slate-700"
              >
                <Save className="w-16 h-16 text-white bg-slate-700" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancelMovimientoEdit}
                disabled={isSaving}
              >
                <X className="w-16 h-16 text-slate-700 " />
              </Button>
            </div>
          </TableCell>
        </>
      )}
    </TableRow>
  );
}
