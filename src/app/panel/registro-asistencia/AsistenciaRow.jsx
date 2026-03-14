import { TableCell, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Save, X, Check, X as XIcon } from "lucide-react";
import { useMemo, useState } from "react";
import HistorialEmpleadoDialog from "./HistorialEmpleadoDialog";
import { useEmpresaTimezone } from "@/context/AuthContext";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

export default function AsistenciaRow({
  registro,
  fecha,
  readOnly = false,
  isEditing,
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
  empresaActiva,
}) {
  const fallbackTimezone = useEmpresaTimezone(empresaActiva);
  const userTimezone = registro.zona_horaria || fallbackTimezone;
  const DB_TIMEZONE = "America/Mexico_City";
  const currentData = isEditing ? editingRowData : registro;
  const areTimeInputsDisabled = !currentData.correccion;
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleRowClick = () => {
    if (!isEditing) {
      setIsModalOpen(true);
    }
  };

  console.log(tiposPermiso);

  return (
    <>
      <TableRow
        key={registro.id}
        onClick={handleRowClick}
        className={
          !isEditing
            ? "cursor-pointer hover:bg-gray-50 border-b border-gray-100"
            : "border-b border-gray-100"
        }
      >
        {isEditing && !readOnly ? (
          <>
            <TableCell className="font-bold">{`${registro.nombre} ${registro.apellido_paterno}`}</TableCell>
            {empresaActiva === "all" && (
              <TableCell className="font-bold">
                {registro.unidad_negocio || registro.sucursal || registro.empresa_nombre}
              </TableCell>
            )}
            {mostrarCamposExtras && <TableCell>{registro.nip}</TableCell>}
            <TableCell>{registro.departamento}</TableCell>
            <TableCell>
              <Select
                value={
                  currentData.id_tipo_permiso
                    ? String(currentData.id_tipo_permiso)
                    : ""
                }
                onValueChange={(val) => {
                  const seleccionado = tiposPermiso?.tiposPermiso.find(
                    (tipo) => String(tipo.id) === val,
                  );

                  handleFieldChange("id_tipo_permiso", seleccionado?.id);
                  handleFieldChange(
                    "tipo_registro_nombre",
                    seleccionado?.nombre || "",
                  );
                  handleFieldChange("correccion", 1);
                  handleFieldChange(
                    "asistencia",
                    seleccionado?.cuenta_como_asistencia,
                  );
                  handleFieldChange("goce_sueldo", seleccionado?.goce_sueldo);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  {tiposPermiso?.tiposPermiso?.map((tipo) => (
                    <SelectItem key={tipo.id} value={String(tipo.id)}>
                      {tipo.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell className="text-center">
              {dayjs
                .tz(currentData.fecha, DB_TIMEZONE)
                .tz(userTimezone)
                .format("DD/MM/YYYY")}
            </TableCell>
            {mostrarCamposExtras && (
              <TableCell className="text-center">
                <ToggleGroup
                  type="single"
                  value={currentData.correccion ? "1" : "0"}
                  onValueChange={(val) =>
                    handleFieldChange("correccion", val === "1")
                  }
                >
                  <ToggleGroupItem value="0" aria-label="No">
                    <XIcon className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="1" aria-label="Sí">
                    <Check className="h-4 w-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </TableCell>
            )}
            <TableCell className="text-center">
              <Input
                type="time"
                value={
                  currentData.entrada
                    ? dayjs
                        .tz(currentData.entrada, DB_TIMEZONE)
                        .tz(userTimezone)
                        .format("HH:mm")
                    : ""
                }
                max={
                  currentData.salida
                    ? dayjs
                        .tz(currentData.salida, DB_TIMEZONE)
                        .tz(userTimezone)
                        .format("HH:mm")
                    : undefined
                }
                onChange={(e) => {
                  const hora = e.target.value;
                  const nuevaEntrada = hora
                    ? dayjs
                        .tz(`${currentData.fecha} ${hora}`, userTimezone)
                        .tz(DB_TIMEZONE)
                        .format("YYYY-MM-DD HH:mm:ss")
                    : null;
                  handleFieldChange("entrada", nuevaEntrada);
                }}
                disabled={areTimeInputsDisabled}
              />
            </TableCell>
            <TableCell className="text-center">
              <Input
                type="time"
                value={
                  currentData.salida
                    ? dayjs
                        .tz(currentData.salida, DB_TIMEZONE)
                        .tz(userTimezone)
                        .format("HH:mm")
                    : ""
                }
                min={
                  currentData.entrada
                    ? dayjs
                        .tz(currentData.entrada, DB_TIMEZONE)
                        .tz(userTimezone)
                        .format("HH:mm")
                    : undefined
                }
                onChange={(e) => {
                  const hora = e.target.value;
                  const nuevaSalida = hora
                    ? dayjs
                        .tz(`${currentData.fecha} ${hora}`, userTimezone)
                        .tz(DB_TIMEZONE)
                        .format("YYYY-MM-DD HH:mm:ss")
                    : null;
                  handleFieldChange("salida", nuevaSalida);
                }}
                disabled={areTimeInputsDisabled}
              />
            </TableCell>
            {mostrarCamposExtras && (
              <>
                <TableCell className="text-center">
                  <Select
                    value={
                      currentData.autorizado_por
                        ? String(currentData.autorizado_por)
                        : ""
                    }
                    onValueChange={(val) =>
                      handleFieldChange("autorizado_por", val)
                    }
                    disabled={areTimeInputsDisabled}
                  >
                    <SelectTrigger className="w-45">
                      <SelectValue placeholder="Autorizado por" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      <SelectItem value="null">
                        No requiere autorización
                      </SelectItem>
                      {empleados?.map((emp) => (
                        <SelectItem
                          key={emp.id_empleado}
                          value={String(emp.id_empleado)}
                        >
                          {emp.nombre} {emp.apellido_paterno}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </>
            )}
            <TableCell className="text-center">
              <ToggleGroup
                type="single"
                value={currentData.asistencia ? "1" : "0"}
                onValueChange={(val) =>
                  handleFieldChange("asistencia", val === "1")
                }
              >
                <ToggleGroupItem value="0" aria-label="No">
                  <XIcon className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="1" aria-label="Sí">
                  <Check className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </TableCell>
            <TableCell className="text-center">
              <ToggleGroup
                type="single"
                value={currentData.goce_sueldo ? "1" : "0"}
                onValueChange={(val) =>
                  handleFieldChange("goce_sueldo", val === "1")
                }
              >
                <ToggleGroupItem value="0" aria-label="No">
                  <XIcon className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="1" aria-label="Sí">
                  <Check className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </TableCell>
            {mostrarCamposExtras && (
              <>
                <TableCell className="text-center">
                  <ToggleGroup
                    type="single"
                    value={currentData.pago_triple ? "1" : "0"}
                    onValueChange={(val) =>
                      handleFieldChange("pago_triple", val === "1")
                    }
                  >
                    <ToggleGroupItem value="0" aria-label="No">
                      <XIcon className="h-4 w-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="1" aria-label="Sí">
                      <Check className="h-4 w-4" />
                    </ToggleGroupItem>
                  </ToggleGroup>
                </TableCell>

                <TableCell className="text-center">
                  <ToggleGroup
                    type="single"
                    value={currentData.es_domingo ? "1" : "0"}
                    onValueChange={(val) =>
                      handleFieldChange("es_domingo", val === "1")
                    }
                  >
                    <ToggleGroupItem value="0" aria-label="No">
                      <XIcon className="h-4 w-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="1" aria-label="Sí">
                      <Check className="h-4 w-4" />
                    </ToggleGroupItem>
                  </ToggleGroup>
                </TableCell>
                <TableCell className="text-center">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={currentData.prima_dominical || 0}
                    onChange={(e) =>
                      handleFieldChange("prima_dominical", e.target.value)
                    }
                  />
                </TableCell>
                <TableCell className="text-center">
                  <ToggleGroup
                    type="single"
                    value={currentData.es_festivo ? "1" : "0"}
                    onValueChange={(val) =>
                      handleFieldChange("es_festivo", val === "1")
                    }
                  >
                    <ToggleGroupItem value="0" aria-label="No">
                      <XIcon className="h-4 w-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="1" aria-label="Sí">
                      <Check className="h-4 w-4" />
                    </ToggleGroupItem>
                  </ToggleGroup>
                </TableCell>
                <TableCell className="text-center">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={currentData.porcentaje_dia_festivo || 0}
                    onChange={(e) =>
                      handleFieldChange(
                        "porcentaje_dia_festivo",
                        e.target.value,
                      )
                    }
                  />
                </TableCell>
              </>
            )}
            <TableCell className="text-center">
              <ToggleGroup
                type="single"
                value={currentData.hrs_extra ? "1" : "0"}
                onValueChange={(val) =>
                  handleFieldChange("hrs_extra", val === "1")
                }
              >
                <ToggleGroupItem value="0" aria-label="No">
                  <XIcon className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="1" aria-label="Sí">
                  <Check className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </TableCell>
            {mostrarCamposExtras && (
              <>
                <TableCell className="text-center">
                  <Select
                    value={currentData.forma_pago_extras || ""}
                    onValueChange={(val) =>
                      handleFieldChange("forma_pago_extras", val)
                    }
                  >
                    <SelectTrigger className="w-45">
                      <SelectValue placeholder="Forma de pago" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      <SelectItem value="Tiempo por tiempo">
                        Tiempo por tiempo
                      </SelectItem>
                      <SelectItem value="Descuento sobre nómina">
                        Descuento sobre nómina
                      </SelectItem>
                      <SelectItem value="Pago de horas extras">
                        Pago de horas extras
                      </SelectItem>
                      <SelectItem value="Reposición de tiempo por tiempo">
                        Reposición de tiempo por tiempo
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-center">
                  <Select
                    value={
                      currentData.extras_autorizadas_por
                        ? String(currentData.extras_autorizadas_por)
                        : ""
                    }
                    onValueChange={(val) =>
                      handleFieldChange("extras_autorizadas_por", val)
                    }
                  >
                    <SelectTrigger className="w-45">
                      <SelectValue placeholder="Autorizadas por" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      {empleados?.map((emp) => (
                        <SelectItem
                          key={emp.id_empleado}
                          value={String(emp.id_empleado)}
                        >
                          {emp.nombre} {emp.apellido_paterno}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-center">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={currentData.hrs_comida || 0}
                    onChange={(e) =>
                      handleFieldChange("hrs_comida", e.target.value)
                    }
                  />
                </TableCell>
              </>
            )}
            <TableCell className="text-center">
              <Textarea
                value={currentData.notas || ""}
                onChange={(e) => handleFieldChange("notas", e.target.value)}
                className="min-w-37.5"
              />
            </TableCell>
            {mostrarCamposExtras && (
              <TableCell className="text-center">
                <Textarea
                  value={currentData.notas_hrs_extra || ""}
                  onChange={(e) =>
                    handleFieldChange("notas_hrs_extra", e.target.value)
                  }
                  className="min-w-37.5"
                />
              </TableCell>
            )}
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
            {mostrarCamposExtras && (
              <TableCell className="text-center">
                <span
                  className={`px-2 py-1 rounded-full text-sm text-white ${
                    currentData.estadoAsistencia === "Presente"
                      ? "bg-green-600"
                      : currentData.estadoAsistencia === "Ausente"
                      ? "bg-red-600"
                      : currentData.estadoAsistencia === "Tardanza"
                      ? "bg-yellow-600"
                      : currentData.estadoAsistencia === "Permiso"
                      ? "bg-blue-600"
                      : "bg-gray-500"
                  }`}
                >
                  {currentData.estadoAsistencia}
                </span>
              </TableCell>
            )}
            {!readOnly && (
              <TableCell
                className="sticky right-0 bg-background z-10 text-center p-0"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-center gap-2 h-full px-2">
                  <button
                    onClick={() => handleSaveClick(registro.id)}
                    disabled={isSaving}
                    className="p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                    title="Guardar"
                  >
                    <Save className="h-4 w-4 text-[#2563EB]" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                    title="Cancelar"
                  >
                    <X className="h-4 w-4 text-gray-700" />
                  </button>
                </div>
              </TableCell>
            )}
          </>
        ) : (
          <>
            <TableCell className="font-bold">{`${registro.nombre} ${registro.apellido_paterno}`}</TableCell>
            {empresaActiva === "all" && (
              <TableCell className="font-bold">
                {registro.unidad_negocio || registro.sucursal || registro.empresa_nombre}
              </TableCell>
            )}
            {mostrarCamposExtras && <TableCell>{registro.nip}</TableCell>}
            <TableCell>{registro.departamento}</TableCell>
            <TableCell>{registro.tipo_registro_nombre}</TableCell>
            <TableCell className="text-center">
              {registro.fecha
                ? dayjs
                    .tz(registro.fecha, "America/Mexico_City")
                    .format("DD/MM/YYYY")
                : "-"}
            </TableCell>
            {mostrarCamposExtras && (
              <TableCell className="text-center">
                {registro.correccion === 1 ? (
                  <Check className="h-4 w-4 text-green-600 inline" />
                ) : (
                  <XIcon className="h-4 w-4 text-red-600 inline" />
                )}
              </TableCell>
            )}
            <TableCell className="text-center">
              {registro.entrada
                ? dayjs
                    .tz(registro.entrada, "America/Mexico_City")
                    .tz(userTimezone)
                    .format("HH:mm:ss")
                : "-"}
            </TableCell>
            <TableCell className="text-center">
              {registro.salida
                ? dayjs
                    .tz(registro.salida, "America/Mexico_City")
                    .tz(userTimezone)
                    .format("HH:mm:ss")
                : "-"}
            </TableCell>
            {mostrarCamposExtras && (
              <TableCell className="text-center">
                {registro.nombre_autorizador
                  ? `${registro.nombre_autorizador} ${registro.apellido_paterno_autorizador} ${registro.apellido_materno_autorizador}`
                  : ""}
              </TableCell>
            )}

            <TableCell className="text-center">
              {registro.asistencia === 1 ? (
                <Check className="h-4 w-4 text-green-600 inline" />
              ) : (
                <XIcon className="h-4 w-4 text-red-600 inline" />
              )}
            </TableCell>
            <TableCell className="text-center">
              {registro.goce_sueldo === 1 ? (
                <Check className="h-4 w-4 text-green-600 inline" />
              ) : (
                <XIcon className="h-4 w-4 text-red-600 inline" />
              )}
            </TableCell>

            {mostrarCamposExtras && (
              <>
                <TableCell className="text-center">
                  {registro.pago_triple === 1 ? (
                    <Check className="h-4 w-4 text-green-600 inline" />
                  ) : (
                    <XIcon className="h-4 w-4 text-red-600 inline" />
                  )}
                </TableCell>

                <TableCell className="text-center">
                  {registro.es_domingo === 1 ? (
                    <Check className="h-4 w-4 text-green-600 inline" />
                  ) : (
                    <XIcon className="h-4 w-4 text-red-600 inline" />
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {registro.prima_dominical
                    ? `${registro.prima_dominical} %`
                    : "-"}
                </TableCell>
                <TableCell className="text-center">
                  {registro.es_festivo === 1 ? (
                    <Check className="h-4 w-4 text-green-600 inline" />
                  ) : (
                    <XIcon className="h-4 w-4 text-red-600 inline" />
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {registro.porcentaje_dia_festivo
                    ? `${registro.porcentaje_dia_festivo} %`
                    : "-"}
                </TableCell>
              </>
            )}

            <TableCell className="text-center">
              {registro.hrs_extra === 1 ? (
                <Check className="h-4 w-4 text-green-600 inline" />
              ) : (
                <XIcon className="h-4 w-4 text-red-600 inline" />
              )}
            </TableCell>
            {mostrarCamposExtras && (
              <>
                <TableCell className="text-center">
                  {registro.forma_pago_extras
                    ? registro.forma_pago_extras
                    : "-"}
                </TableCell>
                <TableCell className="text-center">
                  {registro.nombre_extra_autorizador
                    ? `${registro.nombre_extra_autorizador} ${registro.apellido_paterno_extra_autorizador} ${registro.apellido_materno_extra_autorizador}`
                    : ""}
                </TableCell>
                <TableCell className="text-center">
                  {registro.hrs_comida ? registro.hrs_comida : "-"}
                </TableCell>
              </>
            )}
            <TableCell className="text-center">
              {registro.notas ? registro.notas : "-"}
            </TableCell>
            {mostrarCamposExtras && (
              <TableCell className="text-center">
                {registro.notas_hrs_extra ? registro.notas_hrs_extra : "-"}
              </TableCell>
            )}
            <TableCell className="text-center">
              <span
                className={`px-2 py-1 rounded-full text-sm text-white ${
                  registro.estado === "Abierto" ? "bg-green-600" : "bg-gray-500"
                }`}
              >
                {registro.estado}
              </span>
            </TableCell>
            {mostrarCamposExtras && (
              <TableCell className="text-center">
                <span
                  className={`px-2 py-1 rounded-full text-sm text-white ${
                    registro.estadoAsistencia === "Presente"
                      ? "bg-green-600"
                      : registro.estadoAsistencia === "Ausente"
                      ? "bg-red-600"
                      : registro.estadoAsistencia === "Tardanza"
                      ? "bg-yellow-600"
                      : registro.estadoAsistencia === "Permiso"
                      ? "bg-blue-600"
                      : "bg-gray-500"
                  }`}
                >
                  {registro.estadoAsistencia}
                </span>
              </TableCell>
            )}
            {!readOnly && (
              <TableCell
                className="sticky right-0 bg-background z-10 text-center"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => handleEditClick(registro)}
                  className="p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  title="Editar"
                >
                  <Pencil className="h-4 w-4 text-[#2563EB]" />
                </button>
              </TableCell>
            )}
          </>
        )}
      </TableRow>

      <HistorialEmpleadoDialog
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        empleado={registro}
        fecha={fecha}
        mutateAsistencia={mutateAsistencia}
      />
    </>
  );
}
