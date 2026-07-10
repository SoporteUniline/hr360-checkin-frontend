"use client";

import { useEffect, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Pencil, LogIn, LogOut, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, useEmpresaTimezone } from "@/context/AuthContext";
import useAsistenciaActions from "@/hooks/useAsistenciaActions";
import useTiposPermisoData from "@/hooks/useTiposPermisoData";
import useEmpleadosData from "@/hooks/useEmpleadosData";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const DB_TZ = "America/Mexico_City";

const MESES_CORTO = [
  "ENE",
  "FEB",
  "MAR",
  "ABR",
  "MAY",
  "JUN",
  "JUL",
  "AGO",
  "SEP",
  "OCT",
  "NOV",
  "DIC",
];
const DIAS_ES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

const AVATAR_COLORS = [
  "#F97316",
  "#3B82F6",
  "#10B981",
  "#8B5CF6",
  "#EF4444",
  "#F59E0B",
  "#EC4899",
  "#14B8A6",
];

function getAvatarColor(str = "") {
  let hash = 0;
  for (let i = 0; i < str.length; i++)
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(nombre = "", apellido = "") {
  return `${nombre[0] || ""}${apellido[0] || ""}`.toUpperCase();
}

function calcHours(entrada, salida) {
  if (!entrada) return null;
  const start = dayjs.tz(entrada, DB_TZ);
  const end = salida ? dayjs.tz(salida, DB_TZ) : dayjs();
  const mins = end.diff(start, "minute");
  if (mins <= 0) return null;
  return `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, "0")}`;
}

const ESTADO_STYLES = {
  Presente: {
    dot: "bg-green-500",
    badge: "text-green-700 bg-green-50 border border-green-200",
  },
  Tardanza: {
    dot: "bg-amber-500",
    badge: "text-amber-700 bg-amber-50 border border-amber-200",
  },
  Ausente: {
    dot: "bg-red-500",
    badge: "text-red-700 bg-red-50 border border-red-200",
  },
  Pendiente: {
    dot: "bg-slate-400",
    badge: "text-slate-600 bg-slate-100 border border-slate-200",
  },
};

function ToggleRow({ label, sublabel, checked, onChange, disabled }) {
  return (
    <div className="flex items-center justify-between py-3.5 px-4 border-b border-gray-100 last:border-b-0">
      <div>
        <p
          className={cn(
            "text-sm font-medium",
            disabled ? "text-gray-400" : "text-gray-900",
          )}
        >
          {label}
        </p>
        {sublabel && <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>}
      </div>
      <Switch
        checked={!!checked}
        onCheckedChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}

export default function MobileEmpleadoDetalle({
  open,
  onOpenChange,
  registro,
  currentIndex = 0,
  totalCount = 0,
  mutateAsistencia,
}) {
  const { dataUser } = useAuth();
  const tz = useEmpresaTimezone(dataUser?.id_empresa);

  const { data: tiposPermisoData } = useTiposPermisoData();
  const tiposPermiso = tiposPermisoData?.tiposPermiso ?? [];

  const { data: empleadosData } = useEmpleadosData(dataUser?.id_empresa);
  const empleados = empleadosData?.data ?? [];

  // Local copy of registro for optimistic updates after save
  const [localRegistro, setLocalRegistro] = useState(registro);

  const {
    editingRowId,
    editingRowData,
    isSaving,
    handleEditClick,
    handleCancelEdit,
    handleFieldChange,
    handleSaveClick,
  } = useAsistenciaActions(mutateAsistencia, (saved) => {
    if (saved) {
      setLocalRegistro((prev) => ({ ...prev, ...saved }));
    }
  });

  const isEditing = localRegistro && editingRowId === localRegistro.id;
  const currentData = isEditing ? editingRowData : localRegistro;

  useEffect(() => {
    if (registro) {
      setLocalRegistro(registro);
    }
  }, [registro]);

  // Cancel edit when the drawer closes
  useEffect(() => {
    if (!open && isEditing) handleCancelEdit();
  }, [open]);

  if (!registro) return null;

  const display = localRegistro ?? registro;

  const nombreCompleto = [
    display.nombre,
    display.apellido_paterno,
    display.apellido_materno,
  ]
    .filter(Boolean)
    .join(" ");

  const initials = getInitials(display.nombre, display.apellido_paterno);
  const empresa =
    display.unidad_negocio || display.sucursal || display.empresa_nombre || "";

  // View mode — display helpers
  const entradaFmt = display.entrada
    ? dayjs.tz(display.entrada, DB_TZ).tz(tz).format("HH:mm")
    : null;
  const salidaFmt = display.salida
    ? dayjs.tz(display.salida, DB_TZ).tz(tz).format("HH:mm")
    : null;
  const horasTrabajadas = calcHours(display.entrada, display.salida);

  const estadoAsistenciaLocal = (() => {
    if (display.asistencia !== 1) return "Ausente";

    if (display.entrada && display.hora_entrada_programada) {
      const [h, m, s] = display.hora_entrada_programada.split(":").map(Number);

      const zonaEmpresa = display.zona_horaria || tz;

      const entradaReal = dayjs.tz(display.entrada, DB_TZ).tz(zonaEmpresa);

      const horaProgramada = dayjs
        .tz(display.fecha, zonaEmpresa)
        .hour(h)
        .minute(m)
        .second(s || 0);

      if (entradaReal.isAfter(horaProgramada)) {
        return "Tardanza";
      }
    }

    return "Presente";
  })();

  const estadoInfo =
    ESTADO_STYLES[estadoAsistenciaLocal] || ESTADO_STYLES.Pendiente;
  const fechaObj = display.fecha ? dayjs.tz(display.fecha, DB_TZ) : null;
  const diaNumero = fechaObj ? fechaObj.date() : "--";
  const mesCorto = fechaObj ? MESES_CORTO[fechaObj.month()] : "";
  const diaNombre = fechaObj ? DIAS_ES[fechaObj.day()] : "";
  const esHoy = display.fecha === dayjs().tz(DB_TZ).format("YYYY-MM-DD");

  // Edit mode — time input helpers
  const fechaBase = currentData?.fecha
    ? dayjs.tz(currentData.fecha, DB_TZ).tz(tz).format("YYYY-MM-DD")
    : dayjs().format("YYYY-MM-DD");

  const entradaEditFmt = currentData?.entrada
    ? dayjs.tz(currentData.entrada, DB_TZ).tz(tz).format("HH:mm")
    : "";
  const salidaEditFmt = currentData?.salida
    ? dayjs.tz(currentData.salida, DB_TZ).tz(tz).format("HH:mm")
    : "";

  const onEntradaChange = (hora) => {
    if (!hora) {
      handleFieldChange("entrada", null);
      handleFieldChange("correccion", 0); // 🔥 CLAVE
      return;
    }

    handleFieldChange(
      "entrada",
      dayjs
        .tz(`${fechaBase} ${hora}`, tz)
        .tz(DB_TZ)
        .format("YYYY-MM-DD HH:mm:ss"),
    );
  };

  const onSalidaChange = (hora) => {
    if (!currentData?.entrada) {
      handleFieldChange("salida", null);
      return;
    }

    handleFieldChange(
      "salida",
      hora
        ? dayjs
            .tz(`${fechaBase} ${hora}`, tz)
            .tz(DB_TZ)
            .format("YYYY-MM-DD HH:mm:ss")
        : null,
    );
  };

  const areTimesDisabled = !currentData?.correccion;
  const requiereHorario = Number(currentData?.id_tipo_permiso) === 14;

  const isInvalid =
    currentData?.correccion && requiereHorario && !currentData?.entrada;

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
      <DrawerContent className="h-[95dvh] mt-0 flex flex-col bg-white p-0 rounded-t-3xl overflow-hidden">
        <DrawerTitle className="sr-only">Detalle de empleado</DrawerTitle>
        <DrawerDescription className="sr-only">
          {nombreCompleto}
        </DrawerDescription>

        {/* ── Header ── */}
        <div className="bg-white pt-5 pb-6 px-5 shrink-0 border-b border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => {
                if (isEditing) handleCancelEdit();
                else onOpenChange(false);
              }}
              className="w-11 h-11 flex items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm active:bg-gray-50"
            >
              {isEditing ? (
                <X className="w-5 h-5" />
              ) : (
                <ArrowLeft className="w-5 h-5" />
              )}
            </button>

            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              {isEditing
                ? "Editando"
                : `Empleado · ${currentIndex + 1}/${totalCount}`}
            </span>

            {!isEditing ? (
              <button
                onClick={() => handleEditClick(localRegistro)}
                className="w-11 h-11 flex items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm active:bg-gray-50"
              >
                <Pencil className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-11" />
            )}
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#2563eb] to-[#7c3aed] flex items-center justify-center text-xl font-bold text-white mb-3 shrink-0 shadow-[0_8px_20px_rgba(37,99,235,0.32)]">
              {initials}
            </div>
            <h2 className="text-gray-900 text-xl font-extrabold tracking-tight leading-tight">
              {nombreCompleto}
            </h2>
            <div className="mt-2 h-0.5 w-10 rounded-full bg-gradient-to-r from-[#2563eb] to-[#7c3aed]" />
            <p className="text-gray-500 text-sm mt-2">
              {display.departamento}
              {empresa ? ` · ${empresa}` : ""}
              {display.nip ? ` · #${display.nip}` : ""}
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-3">
              <span className="bg-gray-50 border border-gray-200 text-gray-600 text-xs font-medium px-3 py-1 rounded-full">
                {display.tipo_registro_nombre || "Turno regular"}
              </span>
              <span className="bg-gray-50 border border-gray-200 text-gray-600 text-xs font-medium px-3 py-1 rounded-full">
                Goce: {display.goce_sueldo ? "Sí" : "No"}
              </span>
            </div>
          </div>
        </div>

        {/* ── Edit mode body ── */}
        {isEditing ? (
          <>
            <div className="flex-1 overflow-y-auto bg-gray-50">
              <div className="p-4 space-y-4">
                {/* Tipo de registro */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">
                    Tipo de registro
                  </p>
                  <Select
                    value={
                      currentData.id_tipo_permiso
                        ? String(currentData.id_tipo_permiso)
                        : ""
                    }
                    onValueChange={(val) => {
                      const sel = tiposPermiso.find(
                        (t) => String(t.id) === val,
                      );
                      handleFieldChange("id_tipo_permiso", sel?.id);
                      handleFieldChange(
                        "tipo_registro_nombre",
                        sel?.nombre || "",
                      );
                      handleFieldChange("correccion", 1);
                      handleFieldChange(
                        "asistencia",
                        sel?.cuenta_como_asistencia,
                      );
                      handleFieldChange("goce_sueldo", sel?.goce_sueldo);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar tipo..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      {tiposPermiso.map((tipo) => (
                        <SelectItem key={tipo.id} value={String(tipo.id)}>
                          {tipo.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Corrección */}
                <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
                  <ToggleRow
                    label="Corrección manual"
                    sublabel="Habilita la edición de horarios"
                    checked={!!currentData.correccion}
                    onChange={(val) => {
                      handleFieldChange("correccion", val ? 1 : 0);
                    }}
                  />
                </div>

                {/* Horarios */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">
                    Horarios
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">
                        Entrada
                      </p>
                      <Input
                        type="time"
                        value={entradaEditFmt}
                        max={salidaEditFmt || undefined}
                        disabled={areTimesDisabled}
                        onChange={(e) => onEntradaChange(e.target.value)}
                        className={cn(areTimesDisabled && "opacity-50")}
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">
                        Salida
                      </p>
                      <Input
                        type="time"
                        value={salidaEditFmt}
                        min={entradaEditFmt || undefined}
                        disabled={areTimesDisabled}
                        onChange={(e) => onSalidaChange(e.target.value)}
                        className={cn(areTimesDisabled && "opacity-50")}
                      />
                    </div>
                  </div>
                  {!areTimesDisabled && requiereHorario && !entradaEditFmt && (
                    <p className="text-xs text-red-500 mt-1">
                      Debes ingresar la hora de entrada
                    </p>
                  )}
                  {areTimesDisabled && (
                    <p className="text-xs text-gray-400 mt-1.5">
                      Activa "Corrección manual" para editar horarios
                    </p>
                  )}
                </div>

                {/* Estado toggles */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">
                    Estado
                  </p>
                  <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
                    <ToggleRow
                      label="Asistió"
                      checked={currentData.asistencia}
                      onChange={(val) => handleFieldChange("asistencia", val)}
                    />
                    <ToggleRow
                      label="Goce de sueldo"
                      checked={currentData.goce_sueldo}
                      onChange={(val) => handleFieldChange("goce_sueldo", val)}
                    />
                    <ToggleRow
                      label="Horas extra"
                      checked={currentData.hrs_extra}
                      onChange={(val) => handleFieldChange("hrs_extra", val)}
                    />
                  </div>
                </div>

                {/* Autorizado por */}
                {empleados.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">
                      Autorizado por
                    </p>
                    <Select
                      value={
                        currentData.autorizado_por
                          ? String(currentData.autorizado_por)
                          : "sin-autorizar"
                      }
                      onValueChange={(val) =>
                        handleFieldChange(
                          "autorizado_por",
                          val === "sin-autorizar" ? null : val,
                        )
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sin autorización" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto">
                        <SelectItem value="sin-autorizar">
                          Sin autorización
                        </SelectItem>
                        {empleados.map((emp) => (
                          <SelectItem
                            key={emp.id_empleado}
                            value={String(emp.id_empleado)}
                          >
                            {emp.nombre} {emp.apellido_paterno}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Notas */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">
                    Notas
                  </p>
                  <Textarea
                    value={currentData.notas || ""}
                    onChange={(e) => handleFieldChange("notas", e.target.value)}
                    placeholder="Observaciones..."
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="h-4" />
              </div>
            </div>

            {/* Edit footer */}
            <div className="shrink-0 bg-white border-t border-gray-100 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex gap-3">
              <button
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="flex-1 min-h-[48px] py-3 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-semibold shadow-sm active:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveClick}
                disabled={isSaving || isInvalid}
                className="flex-1 min-h-[48px] py-3 rounded-xl bg-gradient-to-br from-[#2563eb] to-[#4f46e5] text-white text-sm font-semibold shadow-[0_8px_20px_rgba(37,99,235,0.32)] flex items-center justify-center gap-2 active:opacity-90 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </>
        ) : (
          /* ── View mode body ── */
          <div className="flex-1 overflow-y-auto bg-gray-50">
            {/* Today's record card */}
            <div className="m-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-center min-w-11 rounded-xl border border-gray-100 bg-white shadow-sm p-2">
                    <div className="text-lg font-extrabold leading-none tabular-nums bg-gradient-to-br from-[#2563eb] to-[#7c3aed] bg-clip-text text-transparent">
                      {diaNumero}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-1">
                      {mesCorto}
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">
                      {diaNombre}
                      {esHoy && (
                        <span className="text-gray-400 font-normal">
                          {" "}
                          · Hoy
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {!display.salida
                        ? "Registro en curso"
                        : "Registro completo"}
                    </div>
                  </div>
                </div>
                <span
                  className={cn(
                    "text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5 shrink-0",
                    estadoInfo.badge,
                  )}
                >
                  <span
                    className={cn("w-1.5 h-1.5 rounded-full", estadoInfo.dot)}
                  />
                  {estadoAsistenciaLocal || "Pendiente"}
                </span>
              </div>

              {/* Entry / Exit */}
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex-1 rounded-xl p-3 min-w-0 bg-white",
                    entradaFmt
                      ? "border border-gray-100 shadow-sm"
                      : "border-2 border-dashed border-gray-200",
                  )}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full",
                        entradaFmt ? "bg-[#2563eb]" : "bg-gray-200",
                      )}
                    />
                    <LogIn
                      className={cn(
                        "w-4 h-4",
                        entradaFmt ? "text-[#2563eb]" : "text-gray-300",
                      )}
                    />
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    Entrada
                  </div>
                  <div
                    className={cn(
                      "text-xl font-extrabold mt-0.5 tracking-tight tabular-nums",
                      entradaFmt ? "text-gray-900" : "text-gray-300",
                    )}
                  >
                    {entradaFmt ? entradaFmt.replace(":", " : ") : "— : —"}
                  </div>
                </div>

                <div className="w-6 h-0.5 rounded-full bg-gradient-to-r from-[#2563eb] to-[#7c3aed] shrink-0" />

                <div
                  className={cn(
                    "flex-1 rounded-xl p-3 min-w-0 bg-white",
                    salidaFmt
                      ? "border border-gray-100 shadow-sm"
                      : "border-2 border-dashed border-gray-200",
                  )}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full",
                        salidaFmt ? "bg-[#7c3aed]" : "bg-gray-200",
                      )}
                    />
                    <LogOut
                      className={cn(
                        "w-4 h-4",
                        salidaFmt ? "text-[#7c3aed]" : "text-gray-300",
                      )}
                    />
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    Salida
                  </div>
                  <div
                    className={cn(
                      "text-xl font-extrabold mt-0.5 tracking-tight tabular-nums",
                      salidaFmt ? "text-gray-900" : "text-gray-300",
                    )}
                  >
                    {salidaFmt ? salidaFmt.replace(":", " : ") : "— : —"}
                  </div>
                  {!salidaFmt && (
                    <div className="text-[10px] text-gray-400 mt-1">
                      Programada 17:00
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="flex mt-4 pt-4 border-t border-gray-100 text-center">
                <div className="flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    Horas
                  </div>
                  <div className="text-base font-extrabold mt-0.5 tabular-nums bg-gradient-to-br from-[#2563eb] to-[#7c3aed] bg-clip-text text-transparent">
                    {horasTrabajadas || "—"}
                  </div>
                </div>
                <div className="flex-1 border-x border-gray-100">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    H. Extra
                  </div>
                  <div className="text-base font-extrabold text-gray-900 mt-0.5 tabular-nums">
                    {display.hrs_extra ? "Sí" : "0:00"}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    Goce
                  </div>
                  <div className="text-base font-extrabold text-gray-900 mt-0.5">
                    {display.goce_sueldo ? "Sí" : "No"}
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {display.notas && (
              <div className="mx-4 mb-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">
                  Notas
                </p>
                <p className="text-sm text-gray-700">{display.notas}</p>
              </div>
            )}

            {/* Extra info */}
            <div className="mx-4 mb-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">
                Información del registro
              </p>
              <div className="space-y-2">
                {[
                  { label: "Tipo", value: display.tipo_registro_nombre },
                  { label: "Departamento", value: display.departamento },
                  {
                    label: "Corrección",
                    value: display.correccion ? "Sí" : "No",
                  },
                  { label: "Estado", value: display.estado },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex justify-between items-center text-sm py-0.5"
                  >
                    <span className="text-gray-500">{label}</span>
                    <span className="font-semibold text-gray-900">
                      {value || "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-6" />
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
