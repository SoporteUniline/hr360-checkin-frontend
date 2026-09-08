import { TableCell, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Pencil, Save, X } from "lucide-react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useEmpresaTimezone } from "@/context/AuthContext";

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
  empresaActiva,
  colVisible,
  onRowClick,
}) {
  const fallbackTimezone = useEmpresaTimezone(empresaActiva);
  const userTimezone = registro.zona_horaria || fallbackTimezone;

  const currentData = isEditing ? editingRowData : registro;

  const DB_TIMEZONE = "America/Mexico_City";

  const isColVisible = (key) => (colVisible ? colVisible(key) : true);

  const calcularHorasRegistro = (data) => {
    const entradaFinal = data.entrada_corregida || data.entrada;
    const salidaFinal = data.salida_corregida || data.salida;

    if (!entradaFinal || !salidaFinal) return null;

    const entrada = dayjs.tz(entradaFinal, DB_TIMEZONE).tz(userTimezone);
    const salida = dayjs.tz(salidaFinal, DB_TIMEZONE).tz(userTimezone);

    return Number((salida.diff(entrada, "minute") / 60).toFixed(2));
  };

  const horasRegistro = calcularHorasRegistro(currentData);

  const formatDate = (dateTimeString) => {
    if (!dateTimeString) return "-";
    return dayjs
      .tz(dateTimeString, DB_TIMEZONE)
      .tz(userTimezone)
      .format("DD/MM/YYYY");
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

  const handleRowClick = (e) => {
    if (isEditing || !onRowClick) return;
    // No disparar desde elementos interactivos dentro de la fila
    if (
      e?.target?.closest?.(
        "button,input,select,a,[role=combobox],[data-no-row-click]",
      )
    ) {
      return;
    }
    onRowClick(registro);
  };

  return (
    <TableRow
      key={registro.id}
      onClick={handleRowClick}
      className={
        !isEditing && onRowClick
          ? "cursor-pointer border-b border-slate-100 hover:bg-slate-50/60"
          : "border-b border-slate-100 hover:bg-slate-50/60"
      }
    >
      {!isEditing && (
        <>
          {isColVisible("empleado") && (
            <TableCell>
              <p className="font-semibold text-slate-800">{`${registro.nombre} ${registro.apellido_paterno}`}</p>
              <p className="text-xs text-slate-500">Puesto: {registro.puesto}</p>
            </TableCell>
          )}
          {empresaActiva === "all" && isColVisible("unidad") && (
            <TableCell className="font-semibold text-slate-600">
              {registro.unidad_negocio ||
                registro.sucursal ||
                registro.nombre_empresa}
            </TableCell>
          )}
          {isColVisible("departamento") && (
            <TableCell>
              <p className="font-semibold text-slate-700">
                {registro.departamento}
              </p>
              <p className="text-xs text-slate-500">{registro.sucursal}</p>
            </TableCell>
          )}
          {/* Mostrar siempre fecha de entrada (aunque sea un solo día) */}
          {isColVisible("fecha_entrada") && (
            <TableCell className="text-center">
              {formatDate(registro.entrada)}
            </TableCell>
          )}
          {isColVisible("hora_entrada") && (
            <TableCell className="text-center text-green-600 font-semibold">
              {formatTime(registro.entrada)}
            </TableCell>
          )}
          {isColVisible("hora_salida") && (
            <TableCell className="text-center text-red-600 font-semibold">
              {formatTime(registro.salida)}
            </TableCell>
          )}
          {isColVisible("entrada_corregida") && (
            <TableCell className="text-center text-green-600 font-semibold">
              {registro.entrada_corregida
                ? formatTime(registro.entrada_corregida)
                : "-"}
            </TableCell>
          )}
          {isColVisible("salida_corregida") && (
            <TableCell className="text-center text-red-600 font-semibold">
              {registro.salida_corregida
                ? formatTime(registro.salida_corregida)
                : "-"}
            </TableCell>
          )}
          {isColVisible("hrs_registro") && (
            <TableCell className="text-center font-semibold">
              {horasRegistro !== null ? horasRegistro : "-"}
            </TableCell>
          )}
          {isColVisible("estado") && (
            <TableCell className="text-center">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                  registro.estado === "Abierto"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-gray-100 text-slate-700"
                }`}
              >
                {registro.estado}
              </span>
            </TableCell>
          )}
          <TableCell className="sticky right-0 z-10 bg-white text-center">
            <button
              onClick={() => handleEditMovimientoClick(registro)}
              className="p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              title="Editar"
            >
              <Pencil className="h-4 w-4 text-[#2563EB]" />
            </button>
          </TableCell>
        </>
      )}

      {isEditing && (
        <>
          {isColVisible("empleado") && (
            <TableCell>
              <p className="font-semibold text-slate-800">{`${registro.nombre} ${registro.apellido_paterno}`}</p>
              <p className="text-xs">Puesto: {registro.puesto}</p>
            </TableCell>
          )}
          {empresaActiva === "all" && isColVisible("unidad") && (
            <TableCell className="font-semibold text-slate-600">
              {registro.unidad_negocio ||
                registro.sucursal ||
                registro.nombre_empresa}
            </TableCell>
          )}
          {isColVisible("departamento") && (
            <TableCell>
              <p className="font-semibold text-slate-700">
                {registro.departamento}
              </p>
              <p className="text-xs text-slate-500">{registro.sucursal}</p>
            </TableCell>
          )}

          {/* Mostrar siempre fecha de entrada (si hay corregida, reflejarla) */}
          {isColVisible("fecha_entrada") && (
            <TableCell className="text-center">
              {currentData.entrada_corregida
                ? formatDate(currentData.entrada_corregida)
                : formatDate(currentData.entrada)}
            </TableCell>
          )}

          {isColVisible("hora_entrada") && (
            <TableCell className="text-center text-green-600 font-semibold">
              {formatTime(registro.entrada)}
            </TableCell>
          )}
          {isColVisible("hora_salida") && (
            <TableCell className="text-center text-red-600 font-semibold">
              {formatTime(registro.salida)}
            </TableCell>
          )}

          {isColVisible("entrada_corregida") && (
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
                    nuevaEntradaCorregida,
                  );
                }}
              />
            </TableCell>
          )}
          {isColVisible("salida_corregida") && (
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
                    nuevaSalidaCorregida,
                  );
                }}
              />
            </TableCell>
          )}

          {isColVisible("hrs_registro") && (
            <TableCell className="text-center font-semibold">
              {horasRegistro !== null ? horasRegistro : "-"}
            </TableCell>
          )}

          {isColVisible("estado") && (
            <TableCell className="text-center">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                  currentData.estado === "Abierto"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-gray-100 text-slate-700"
                }`}
              >
                {currentData.estado}
              </span>
            </TableCell>
          )}
          <TableCell className="sticky right-0 z-10 bg-white p-0 text-center">
            <div className="flex items-center justify-center gap-2 h-full px-2">
              <button
                onClick={handleSaveMovimientoClick}
                disabled={isSaving}
                className="p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                title="Guardar"
              >
                <Save className="h-4 w-4 text-[#2563EB]" />
              </button>
              <button
                onClick={handleCancelMovimientoEdit}
                disabled={isSaving}
                className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                title="Cancelar"
              >
                <X className="h-4 w-4 text-slate-700" />
              </button>
            </div>
          </TableCell>
        </>
      )}
    </TableRow>
  );
}
