"use client";

import { useEffect, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { ArrowLeft, Clock3, LogIn, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, useEmpresaTimezone } from "@/context/AuthContext";
import useTiposPermisoData from "@/hooks/useTiposPermisoData";
import useEmpleadosData from "@/hooks/useEmpleadosData";
import { formatearMinutos, minutosTrabajados } from "@/lib/asistencia/jornada.mjs";
import { extraFila } from "@/lib/asistencia/relojDia.mjs";
import RelojDiaDialog from "./RelojDiaDialog";
import CeldaEstadoDia from "./CeldaEstadoDia";
import { cambiosRegistro } from "@/lib/asistencia/cambios.mjs";
import { crearFormateadorCambios } from "./CeldaEditado";
import { quienCuando } from "@/lib/asistencia/historial.mjs";
import { estadoHorasExtra } from "@/lib/asistencia/horasExtra.mjs";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { hora12 } from "@/lib/hora12.mjs";

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


function getInitials(nombre = "", apellido = "") {
  return `${nombre[0] || ""}${apellido[0] || ""}`.toUpperCase();
}

// Con salida: mismo cálculo que la tabla (minutos exactos, nocturno, comida no pagada).
// Sin salida (jornada en curso): tiempo transcurrido hasta ahora.
function calcHours(registro) {
  if (!registro?.entrada) return null;
  if (registro.salida) {
    const minutos = minutosTrabajados(registro);
    return minutos == null ? null : formatearMinutos(minutos);
  }
  const mins = dayjs().diff(dayjs.tz(registro.entrada, DB_TZ), "minute");
  return mins > 0 ? formatearMinutos(mins) : null;
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

export default function MobileEmpleadoDetalle({
  open,
  onOpenChange,
  registro,
  currentIndex = 0,
  totalCount = 0,
  mutateAsistencia,
  // Empresa de la pantalla (la misma que pide la lista): comparte la consulta de empleados en vez de pedir otra.
  idEmpresa,
}) {
  const { dataUser } = useAuth();
  const tz = useEmpresaTimezone(dataUser?.id_empresa);

  const { data: tiposPermisoData } = useTiposPermisoData();

  const { data: empleadosData } = useEmpleadosData(idEmpresa !== undefined ? idEmpresa : dataUser?.id_empresa);
  const empleados = empleadosData?.data ?? [];

  // Local copy of registro for optimistic updates after save
  const [localRegistro, setLocalRegistro] = useState(registro);
  // El reloj del día (hoja a pantalla completa): la única forma de corregir horas, igual que en escritorio.
  const [relojAbierto, setRelojAbierto] = useState(false);

  useEffect(() => {
    if (registro) {
      setLocalRegistro(registro);
    }
  }, [registro]);

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
    ? hora12(dayjs.tz(display.entrada, DB_TZ).tz(tz))
    : null;
  const salidaFmt = display.salida
    ? hora12(dayjs.tz(display.salida, DB_TZ).tz(tz))
    : null;
  const horasTrabajadas = calcHours(display);
  const zonaRegistro = display.zona_horaria || tz;
  const infoExtra = estadoHorasExtra(display, zonaRegistro);
  const salidaProgramadaFmt = display.hora_salida_programada
    ? String(display.hora_salida_programada).slice(0, 5)
    : null;
  const cambiosDisplay = cambiosRegistro(
    display,
    crearFormateadorCambios({ tiposPermiso: tiposPermisoData, empleados, zona: tz }),
  );

  const estadoAsistenciaLocal = (() => {
    if (!Number(display.asistencia)) return "Ausente";

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

  return (
    <>
    {relojAbierto ? (
      <RelojDiaDialog registro={typeof relojAbierto === "string" ? { ...display, _tipoParcial: relojAbierto } : display} onCerrar={() => setRelojAbierto(false)}
        onGuardado={async (asistencia) => { if (asistencia) setLocalRegistro((prev) => ({ ...prev, ...asistencia })); await mutateAsistencia?.(); }} />
    ) : null}
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
              type="button"
              aria-label="Volver"
              onClick={() => onOpenChange(false)}
              className="w-11 h-11 flex items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm active:bg-gray-50"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              {`Empleado · ${currentIndex + 1}/${totalCount}`}
            </span>

            <button
              type="button"
              aria-label="Abrir el reloj del día"
              onClick={() => { setRelojAbierto(true); onOpenChange?.(false); }}
              className="w-11 h-11 flex items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-blue-700 shadow-sm active:bg-blue-100"
            >
              <Clock3 className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-xl bg-brand flex items-center justify-center text-xl font-bold text-white mb-3 shrink-0 shadow-[0_8px_20px_rgba(37,99,235,0.32)]">
              {initials}
            </div>
            <h2 className="text-gray-900 text-xl font-extrabold tracking-tight leading-tight">
              {nombreCompleto}
            </h2>
            <div className="mt-2 h-0.5 w-10 rounded-full bg-brand" />
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
                Goce: {Number(display.goce_sueldo) ? "Sí" : "No"}
              </span>
            </div>
          </div>
        </div>

        {/* ── Cuerpo (sin modo edición: las horas se corrigen en el reloj) ── */}
          <div className="flex-1 overflow-y-auto bg-gray-50">
            {/* Today's record card */}
            <div className="m-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-center min-w-11 rounded-xl border border-gray-100 bg-white shadow-sm p-2">
                    <div className="text-lg font-extrabold leading-none tabular-nums text-brand ">
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
                        entradaFmt ? "bg-brand" : "bg-gray-200",
                      )}
                    />
                    <LogIn
                      className={cn(
                        "w-4 h-4",
                        entradaFmt ? "text-brand" : "text-gray-300",
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

                <div className="w-6 h-0.5 rounded-full bg-brand shrink-0" />

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
                        salidaFmt ? "bg-brand-accent" : "bg-gray-200",
                      )}
                    />
                    <LogOut
                      className={cn(
                        "w-4 h-4",
                        salidaFmt ? "text-brand-accent" : "text-gray-300",
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
                  {infoExtra.estado === "no_autorizada" && infoExtra.salidaReloj && infoExtra.salidaReloj !== display.salida && (
                    <div className="text-[11px] text-gray-400 line-through mt-1" title="Checada real del reloj (se conserva)">
                      {hora12(dayjs.tz(infoExtra.salidaReloj, DB_TZ).tz(zonaRegistro))} reloj
                    </div>
                  )}
                  {!salidaFmt && salidaProgramadaFmt && (
                    <div className="text-[10px] text-gray-400 mt-1">
                      Programada {salidaProgramadaFmt}
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
                  <div className="text-base font-extrabold mt-0.5 tabular-nums text-brand ">
                    {horasTrabajadas || "—"}
                  </div>
                </div>
                <div className="flex-1 border-x border-gray-100">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    H. Extra
                  </div>
                  <div className="text-base font-extrabold text-gray-900 mt-0.5 tabular-nums">
                    {infoExtra.minutos > 0 && infoExtra.estado !== "sin" ? formatearMinutos(infoExtra.minutos) : "—"}
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

            {/* Estado del día (sin checadas) y horas extra por autorizar: lo mismo que la fila de escritorio. */}
            <div className="mx-4 mb-3 flex flex-col gap-2.5 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm" data-estado-movil>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Estado del día</p>
              <CeldaEstadoDia registro={display} tiposPermiso={tiposPermisoData} movil
                onAbrirReloj={(r) => { setRelojAbierto(r?._tipoParcial ? String(r._tipoParcial) : true); onOpenChange?.(false); }}
                onGuardado={async (asistencia) => { if (asistencia) setLocalRegistro((prev) => ({ ...prev, ...asistencia })); await mutateAsistencia?.(); }} />
              {extraFila(display).tipo === "pendiente" ? (
                <button type="button" onClick={() => { setRelojAbierto(true); onOpenChange?.(false); }}
                  className="flex min-h-11 w-full items-center justify-center rounded-xl border border-violet-300 bg-violet-50 px-4 text-sm font-semibold text-violet-700">
                  {extraFila(display).texto}: autorizar en el reloj
                </button>
              ) : null}
              <button type="button" onClick={() => { setRelojAbierto(true); onOpenChange?.(false); }}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-800">
                <Clock3 className="h-4 w-4" aria-hidden />Abrir el reloj del día
              </button>
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
                    label: "Editado",
                    value: Number(display.correccion) ? "Sí" : "No",
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
              {cambiosDisplay.length > 0 && (
                <div className="mt-3 border-t border-gray-100 pt-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 mb-2">
                    Qué cambió
                  </p>
                  <ul className="space-y-2">
                    {cambiosDisplay.map((c) => (
                      <li key={c.campo} className="text-sm">
                        <span className="text-gray-500">{c.etiqueta}: </span>
                        <span className="text-gray-400 line-through">{c.antes}</span>
                        <span className="mx-1 text-gray-400">→</span>
                        <span className="font-semibold text-gray-900">{c.despues}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[11px] text-gray-500">
                    Quién y cuándo: {display.ultimo_cambio ? quienCuando(display.ultimo_cambio) : "anterior al historial (no se sabe quién)."}
                  </p>
                </div>
              )}
            </div>

            <div className="h-6" />
          </div>
      </DrawerContent>
    </Drawer>
    </>
  );
}
