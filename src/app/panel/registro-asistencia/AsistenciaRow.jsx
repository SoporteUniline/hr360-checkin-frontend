import { TableCell, TableRow } from "@/components/ui/table";
import { Check, X as XIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import HistorialEmpleadoDialog from "./HistorialEmpleadoDialog";
import CeldaEditado, { crearFormateadorCambios } from "./CeldaEditado";
import { avisoCalendario, correccionesCalendario } from "@/lib/asistencia/calendario.mjs";
import { estadoHorasExtra } from "@/lib/asistencia/horasExtra.mjs";
import CeldaHorasExtra, { CeldaAutorizarExtra } from "./CeldaHorasExtra";
import EtiquetaPermisoHoras from "./EtiquetaPermisoHoras";
import BotonAgregarComida from "./BotonAgregarComida";
import CeldaObservaciones from "./CeldaObservaciones";
import CeldasControlHorasExtra from "./CeldasControlHorasExtra";
import PanelEditarAsistencia from "./PanelEditarAsistencia";
import { useEmpresaTimezone } from "@/context/AuthContext";
import { calcularResumenJornada, formatearMinutos } from "@/utils/asistenciaHoras";
import { minutosDescanso, salidaEsDiaSiguiente, sinSalidaAComer } from "@/lib/asistencia/jornada.mjs";
import { sumarDias } from "@/lib/fechaHora.mjs";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { hora12 } from "@/lib/hora12.mjs";
dayjs.extend(utc);
dayjs.extend(timezone);

// Columnas "campos extras" (mismo criterio que COLUMNAS_ASISTENCIA en
// AsistenciaTable.jsx). Se usa como fallback cuando no llega `colVisible`.
const EXTRA_COLUMN_KEYS = new Set([
  "codigo",
  "autorizado_por",
  "pago_triple",
  "domingo",
  "prima_dominical",
  "festivo",
  "porcentaje_festivo",
  "forma_pago",
  "hrs_comida",
]);

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
  handleRestoreOriginal,
  mutateAsistencia,
  mostrarCamposExtras,
  empresaActiva,
  colVisible,
  onRowClick,
  indiceFestivos = null,
  horasExtra = null,
  seleccion = null,
  control = null,
  handleActualizarBase,
}) {
  const fallbackTimezone = useEmpresaTimezone(empresaActiva);
  const userTimezone = registro.zona_horaria || fallbackTimezone;
  const DB_TIMEZONE = "America/Mexico_City";
  const currentData = isEditing ? editingRowData : registro;
  const isColVisible =
    typeof colVisible === "function"
      ? colVisible
      : (key) =>
          EXTRA_COLUMN_KEYS.has(key) ? Boolean(mostrarCamposExtras) : true;

  const { minutosTrabajados, minutosProgramados, minutosDiferencia } = calcularResumenJornada(registro);
  const esDescanso = /descanso/i.test(registro.tipo_registro_nombre ?? "");
  const noMarcoComida = sinSalidaAComer(registro);
  const descansoTomado = minutosDescanso(registro);
  const sinChecadas = !registro.entrada && !registro.salida;
  const avanceJornada =
    minutosTrabajados != null && minutosProgramados
      ? Math.min(100, Math.round((minutosTrabajados / minutosProgramados) * 100))
      : null;
  const infoExtra = estadoHorasExtra(registro, userTimezone);
  // Balance del día: solo el número con signo; ±10 min se considera en horario (gris).
  const diferenciaTexto = formatearMinutos(minutosDiferencia, { signo: true });
  const estiloBalance =
    minutosDiferencia == null || Math.abs(minutosDiferencia) <= 10
      ? "bg-slate-100 text-slate-500"
      : minutosDiferencia < 0
      ? "bg-red-50 text-red-600"
      : "bg-emerald-50 text-emerald-700";

  // Captura de horas: la fecha base es la del registro; si la salida es menor o igual
  // a la entrada (turno nocturno 22:00 → 05:00), la salida se guarda al día siguiente.
  const fechaBase = String(currentData.fecha ?? "").slice(0, 10);
  const horaLocal = (valor) =>
    valor ? dayjs.tz(valor, DB_TIMEZONE).tz(userTimezone).format("HH:mm") : "";
  // Tramos del reloj para el detalle de la jornada (09:00–11:00 · 11:30–14:00).
  // Para mostrar (12 h); horaLocal (HH:mm) se queda para los campos de captura.
  const horaVer = (valor) => (valor ? hora12(dayjs.tz(valor, DB_TIMEZONE).tz(userTimezone)) : "");
  const detalleTramos = Array.isArray(registro.tramos_checadas) && registro.tramos_checadas.length > 1
    ? registro.tramos_checadas.map((t) => `${horaVer(t.entrada)}–${horaVer(t.salida)}`).join(" · ")
    : null;
  const fechaLocal = (valor) =>
    valor ? dayjs.tz(valor, DB_TIMEZONE).tz(userTimezone).format("YYYY-MM-DD") : "";
  const aBaseDeDatos = (fecha, hora) =>
    dayjs.tz(`${fecha} ${hora}`, userTimezone).tz(DB_TIMEZONE).format("YYYY-MM-DD HH:mm:ss");
  const salidaParaHoras = (horaEntrada, horaSalida) =>
    aBaseDeDatos(
      horaEntrada && salidaEsDiaSiguiente(horaEntrada, horaSalida) ? sumarDias(fechaBase, 1) : fechaBase,
      horaSalida,
    );
  const mismaMarca = (a, b) =>
    Boolean(a && b) &&
    dayjs.tz(a, DB_TIMEZONE).format("YYYY-MM-DD HH:mm") === dayjs.tz(b, DB_TIMEZONE).format("YYYY-MM-DD HH:mm");
  const salidaDiaSiguiente = (r) =>
    Boolean(r.salida && r.entrada) && fechaLocal(r.salida) > fechaLocal(r.entrada);

  // Domingo y festivo: los define la fecha y el catálogo de Festivos (no se capturan a mano).
  const avisos = avisoCalendario(registro, indiceFestivos);
  const avisoDe = (campo) => avisos.find((a) => a.campo === campo)?.texto;
  const correccionesFecha = useMemo(
    () => (isEditing ? correccionesCalendario(registro, indiceFestivos) : {}),
    [isEditing, registro, indiceFestivos],
  );
  useEffect(() => {
    // Al entrar a editar se corrigen domingo/festivo; quedan en "Qué cambió" al guardar.
    Object.entries(correccionesFecha).forEach(([campo, valor]) => handleFieldChange(campo, valor));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [correccionesFecha]);
  const si = (v) => Boolean(Number(v));
  const Marca = ({ valor, aviso, fuente }) => (
    <span className="inline-flex items-center gap-1" title={aviso || fuente}>
      {si(valor) ? (
        <Check aria-label="Sí" className="inline h-4 w-4 text-green-600" />
      ) : (
        <XIcon aria-label="No" className="inline h-4 w-4 text-red-600" />
      )}
      {aviso && <span aria-label={aviso} className="text-xs text-amber-600">⚠</span>}
    </span>
  );
  const nombreAutorizador = (prefijo) =>
    [registro[`nombre${prefijo}`], registro[`apellido_paterno${prefijo}`], registro[`apellido_materno${prefijo}`]]
      .filter(Boolean)
      .join(" ");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Clic en la fila: abre el panel con las checadas del reloj y la edición juntas
  // (pedido del 19/11/2026: sin botón «Editar»). En solo lectura, solo las checadas.
  const handleRowClick = (e) => {
    if (isEditing) return;
    // No disparar desde elementos interactivos dentro de la fila.
    if (e?.target?.closest?.("button,input,select,a,[role=combobox],[data-no-row-click]")) return;
    if (onRowClick) {
      onRowClick(registro);
      return;
    }
    if (readOnly) setIsModalOpen(true);
    else handleEditClick(registro);
  };
  // Si los datos de la fila se recargan con el panel abierto (p. ej. tras corregir una checada),
  // el panel toma los valores nuevos sin perder lo que se esté editando.
  useEffect(() => {
    if (isEditing) handleActualizarBase?.(registro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registro]);

  return (
    <>
      <TableRow
        key={registro.id}
        onClick={handleRowClick}
        className={
          // Mismo tamaño y números alineados en todas las columnas.
          `group border-b border-gray-100 text-[13px] tabular-nums [&>td]:whitespace-nowrap [&>td]:px-3 [&>td]:py-2.5 ${
            esDescanso ? "text-slate-400" : "text-slate-700"
          } ${!isEditing ? "cursor-pointer hover:bg-gray-50" : "bg-blue-50/40"} ${seleccion?.marcado ? "bg-blue-50 [&>td]:bg-blue-50" : ""}`
        }
      >
        <>
            {isColVisible("empleado") && (
              // Fija a la izquierda: el nombre no se pierde al desplazar la tabla.
              <TableCell className={`sticky left-0 z-[5] bg-background font-semibold shadow-[8px_0_8px_-8px_rgba(15,23,42,0.18)] group-hover:bg-gray-50 ${esDescanso ? "text-slate-500" : "text-slate-800"}`}>
                {seleccion ? (
                  <input
                    type="checkbox"
                    aria-label={`Elegir a ${registro.nombre ?? ""} ${registro.apellido_paterno ?? ""}`.trim()}
                    checked={seleccion.marcado}
                    onChange={(e) => seleccion.alternar(e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                    className="mr-2.5 h-4 w-4 cursor-pointer align-middle accent-blue-600"
                  />
                ) : null}
                {registro.nombre} {registro.apellido_paterno}
              </TableCell>
            )}
            {empresaActiva === "all" && isColVisible("unidad") && (
              <TableCell>
                {registro.unidad_negocio ||
                  registro.sucursal ||
                  registro.empresa_nombre}
              </TableCell>
            )}
            {isColVisible("codigo") && <TableCell className="text-center">{registro.nip || "-"}</TableCell>}
            {isColVisible("departamento") && (
              <TableCell>{registro.departamento}</TableCell>
            )}
            {isColVisible("tipo") && (
              <TableCell>{registro.tipo_registro_nombre}</TableCell>
            )}
            {isColVisible("fecha") && (
              <TableCell className="text-center">
                {registro.fecha
                  ? dayjs
                      .tz(registro.fecha, "America/Mexico_City")
                      .format("DD/MM/YYYY")
                  : "-"}
              </TableCell>
            )}
            {isColVisible("correccion") && (
              <TableCell className="text-center">
                <CeldaEditado
                  registro={registro}
                  formatear={crearFormateadorCambios({ tiposPermiso, empleados, zona: userTimezone })}
                  onVerChecadas={() => (readOnly ? setIsModalOpen(true) : handleEditClick(registro))}
                />
              </TableCell>
            )}
            {isColVisible("entrada") && (
              <TableCell className="text-center">
                {registro.entrada ? horaVer(registro.entrada) : "-"}
              </TableCell>
            )}
            {isColVisible("salida") && (
              <TableCell className="text-center">
                {registro.salida ? horaVer(registro.salida) : "-"}
                {salidaDiaSiguiente(registro) && (
                  <span className="ml-1 text-[11px] font-semibold text-blue-600">+1 día</span>
                )}
                {infoExtra.estado === "no_autorizada" && infoExtra.salidaReloj && infoExtra.salidaReloj !== registro.salida && (
                  <span className="block text-[11px] text-slate-400 line-through" title="Checada real del reloj (se conserva)">
                    {horaVer(infoExtra.salidaReloj)} reloj
                  </span>
                )}
              </TableCell>
            )}

            {isColVisible("jornada") && (
              <TableCell className="min-w-[150px]">
                {esDescanso && sinChecadas ? (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">Descanso</span>
                ) : sinChecadas ? (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">Sin checadas</span>
                ) : (
                  <div title={detalleTramos ? `Tramos: ${detalleTramos} · descanso ${formatearMinutos(descansoTomado)}` : undefined}>
                    <span className={esDescanso ? "" : "font-semibold text-slate-900"}>{formatearMinutos(minutosTrabajados)}</span>
                    {minutosProgramados != null && (
                      <span className="text-slate-400"> de {formatearMinutos(minutosProgramados)}</span>
                    )}
                    {avanceJornada != null && (
                      <div className="mt-1 h-1 w-full rounded-full bg-slate-200" aria-hidden>
                        <div
                          className={`h-1 rounded-full ${minutosDiferencia < -10 ? "bg-red-400" : "bg-emerald-400"}`}
                          style={{ width: `${avanceJornada}%` }}
                        />
                      </div>
                    )}
                    {noMarcoComida && (
                      <div>
                        <BotonAgregarComida
                          registro={registro}
                          aBaseDeDatos={aBaseDeDatos}
                          fechaBase={fechaBase}
                          readOnly={readOnly}
                          onGuardado={mutateAsistencia}
                        />
                      </div>
                    )}
                    {detalleTramos && (
                      <span className="mt-1 block text-[11px] text-slate-400">Descanso {formatearMinutos(descansoTomado)}</span>
                    )}
                  </div>
                )}
              </TableCell>
            )}

            {isColVisible("hrs_diferencia") && (
              <TableCell className="text-center">
                {minutosDiferencia == null ? (
                  <span className="text-slate-300">—</span>
                ) : (
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${estiloBalance}`}>{diferenciaTexto}</span>
                )}
              </TableCell>
            )}
            {isColVisible("autorizado_por") && (
              <TableCell className="text-center text-xs">
                {nombreAutorizador("_autorizador") || nombreAutorizador("_extra_autorizador") ? (
                  <div className="flex flex-col gap-0.5">
                    {nombreAutorizador("_autorizador") && <span>{nombreAutorizador("_autorizador")}</span>}
                    {nombreAutorizador("_extra_autorizador") && (
                      <span className="text-slate-500">Extras: {nombreAutorizador("_extra_autorizador")}</span>
                    )}
                  </div>
                ) : (
                  "-"
                )}
              </TableCell>
            )}

            {isColVisible("asistio") && (
              <TableCell className="text-center">
                <Marca valor={registro.asistencia} />
              </TableCell>
            )}
            {isColVisible("goce") && (
              <TableCell className="text-center">
                <Marca valor={registro.goce_sueldo} />
              </TableCell>
            )}

            {isColVisible("pago_triple") && (
              <TableCell className="text-center">
                <Marca valor={registro.pago_triple} />
              </TableCell>
            )}

            {isColVisible("domingo") && (
              <TableCell className="text-center">
                <Marca valor={registro.es_domingo} aviso={avisoDe("es_domingo")} fuente="Según la fecha del registro" />
              </TableCell>
            )}
            {isColVisible("prima_dominical") && (
              <TableCell className="text-center">
                {registro.prima_dominical
                  ? `${registro.prima_dominical} %`
                  : "-"}
              </TableCell>
            )}
            {isColVisible("festivo") && (
              <TableCell className="text-center">
                <Marca valor={registro.es_festivo} aviso={avisoDe("es_festivo")} fuente="Según el catálogo de Festivos" />
              </TableCell>
            )}
            {isColVisible("porcentaje_festivo") && (
              <TableCell className="text-center">
                {registro.porcentaje_dia_festivo
                  ? `${registro.porcentaje_dia_festivo} %`
                  : "-"}
              </TableCell>
            )}

            {isColVisible("hrs_extra") && (
              <TableCell>
                <CeldaHorasExtra
                  registro={registro}
                  info={infoExtra}
                  readOnly={readOnly || !horasExtra}
                />
              </TableCell>
            )}
            {/* «¿Autorizar?» se muestra junto con «Horas extra» (misma opción en Columnas). */}
            {isColVisible("hrs_extra") && (
              <TableCell>
                <CeldaAutorizarExtra
                  registro={registro}
                  info={infoExtra}
                  autorizador={nombreAutorizador("_extra_autorizador")}
                  readOnly={readOnly || !horasExtra}
                  guardando={horasExtra?.guardando}
                  onAutorizar={(opciones) => horasExtra?.autorizar(registro, opciones)}
                  onNoAutorizar={() => horasExtra?.noAutorizar(registro)}
                  onQuitar={() => horasExtra?.quitar(registro)}
                />
              </TableCell>
            )}
            {control && <CeldasControlHorasExtra registro={registro} control={control} zona={userTimezone} />}
            {isColVisible("forma_pago") && (
              <TableCell className="text-center">
                {registro.forma_pago_extras ? registro.forma_pago_extras : "-"}
              </TableCell>
            )}
            {isColVisible("hrs_comida") && (
              <TableCell className="text-center">
                {descansoTomado != null ? formatearMinutos(descansoTomado) : registro.hrs_comida ? `${registro.hrs_comida} h` : "-"}
              </TableCell>
            )}
            {isColVisible("notas") && (
              <TableCell className="max-w-[220px] text-center text-xs">
                <CeldaObservaciones notas={registro.notas} notasHorasExtra={registro.notas_hrs_extra} />
              </TableCell>
            )}
            {isColVisible("estado_asistencia") && (
              <TableCell className="text-center">
                {/* Punto de color + palabra completa (antes la etiqueta en mayúsculas se cortaba). */}
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                  <span
                    aria-hidden
                    className={`h-2 w-2 rounded-full ${
                      {
                        Presente: "bg-emerald-500",
                        Ausente: "bg-rose-500",
                        Tardanza: "bg-amber-500",
                        Permiso: "bg-blue-500",
                        Vacaciones: "bg-violet-500",
                      }[registro.estadoAsistencia] ?? "bg-slate-400"
                    }`}
                  />
                  {registro.estadoAsistencia || "—"}
                </span>
                {registro.permiso_horas && <div className="mt-1"><EtiquetaPermisoHoras permiso={registro.permiso_horas} /></div>}
              </TableCell>
            )}
        </>
      </TableRow>

      {isEditing && !readOnly && (
        <PanelEditarAsistencia
          abierto
          registro={registro}
          datos={editingRowData}
          zona={userTimezone}
          horas={{ horaLocal, aBaseDeDatos, salidaParaHoras, mismaMarca, salidaDiaSiguiente, fechaBase }}
          empleados={empleados}
          tiposPermiso={tiposPermiso}
          avisoDe={avisoDe}
          isSaving={isSaving}
          handleFieldChange={handleFieldChange}
          handleSaveClick={handleSaveClick}
          handleCancelEdit={handleCancelEdit}
          handleRestoreOriginal={handleRestoreOriginal}
          mutateAsistencia={mutateAsistencia}
        />
      )}

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
