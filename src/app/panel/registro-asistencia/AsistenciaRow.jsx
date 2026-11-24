import { TableCell, TableRow } from "@/components/ui/table";
import { Clock3 } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { leerPar, suscribir } from "@/lib/asistencia/parFila.mjs";
import HistorialEmpleadoDialog from "./HistorialEmpleadoDialog";
import EtiquetaPermisoHoras from "./EtiquetaPermisoHoras";
import CeldaEstadoDia from "./CeldaEstadoDia";
import { FIJA_RELOJ, derechaEstado, derechaMotivo, fijaEstado, fijaMotivo } from "./columnasFijas";
import CeldaObservaciones from "./CeldaObservaciones";
import CeldasControlHorasExtra from "./CeldasControlHorasExtra";
import { NombreEmpleado } from "@/components/empleado/FichaEmpleado";
import { useEmpresaTimezone } from "@/context/AuthContext";
import { calcularResumenJornada, formatearMinutos } from "@/utils/asistenciaHoras";
import { minutosDescanso } from "@/lib/asistencia/jornada.mjs";
import { diaFila, durTexto, extraFila } from "@/lib/asistencia/relojDia.mjs";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { hora12 } from "@/lib/hora12.mjs";
import { herramientasHoras } from "@/lib/asistencia/horasEdicion.mjs";
import { estadoHorasExtra } from "@/lib/asistencia/horasExtra.mjs";
dayjs.extend(utc);
dayjs.extend(timezone);

// Columnas "campos extras" (mismo criterio que COLUMNAS_ASISTENCIA en
// AsistenciaTable.jsx). Se usa como fallback cuando no llega `colVisible`.
const EXTRA_COLUMN_KEYS = new Set(["codigo", "notas"]);

// Fila de Asistencias: aquí no se editan horas. El estado del día se elige en la fila cuando no hay checadas;
// todo lo que tiene horas se corrige en el reloj (icono al final o clic en la fila).
export default function AsistenciaRow({
  registro,
  fecha,
  readOnly = false,
  tiposPermiso,
  mutateAsistencia,
  mostrarCamposExtras,
  empresaActiva,
  colVisible,
  onRowClick,
  seleccion = null,
  control = null,
  onAbrirReloj = null,
}) {
  const fallbackTimezone = useEmpresaTimezone(empresaActiva);
  const userTimezone = registro.zona_horaria || fallbackTimezone;
  const DB_TIMEZONE = "America/Mexico_City";
  const isColVisible =
    typeof colVisible === "function"
      ? colVisible
      : (key) => (EXTRA_COLUMN_KEYS.has(key) ? Boolean(mostrarCamposExtras) : true);

  const resumenViejo = calcularResumenJornada(registro);
  const minutosTrabajados = registro.minutos_trabajados ?? resumenViejo.minutosTrabajados;
  const { minutosProgramados } = resumenViejo;
  const minutosComida = registro.minutos_comida ?? minutosDescanso(registro);
  const esDescanso = /descanso/i.test(registro.tipo_registro_nombre ?? "");
  const sinChecadas = !registro.entrada && !registro.salida;
  const avanceJornada = minutosTrabajados != null && minutosProgramados
    ? Math.min(100, Math.round((minutosTrabajados / minutosProgramados) * 100)) : null;
  const { salidaDiaSiguiente } = herramientasHoras(registro, userTimezone);
  const horaVer = (valor) => (valor ? hora12(dayjs.tz(valor, DB_TIMEZONE).tz(userTimezone)) : "");
  const dia = diaFila(registro);
  const especial = dia.tipo && dia.tipo !== "normal";
  const extra = extraFila(registro);
  // Respaldo mientras el servidor no mande minutos_extra*: estado de horas extra de siempre.
  const extraViejo = registro.minutos_extra == null ? estadoHorasExtra(registro, userTimezone) : null;
  const nombre = `${registro.nombre ?? ""} ${registro.apellido_paterno ?? ""}`.trim();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const abrirReloj = () => onAbrirReloj?.(registro);
  // Mientras se edita el par Estado/Motivo (aparece OK debajo del motivo), las dos celdas se alinean arriba para que los
  // dos desplegables queden en la misma línea.
  const editandoPar = Boolean(useSyncExternalStore(suscribir, () => leerPar(registro.id), () => null));

  // Clic en la fila: abre el reloj del día. En solo lectura, el historial de checadas.
  const handleRowClick = (e) => {
    if (e?.target?.closest?.("button,input,select,a,[role=combobox],[data-no-row-click]")) return;
    if (onRowClick) {
      onRowClick(registro);
      return;
    }
    if (readOnly || !onAbrirReloj) setIsModalOpen(true);
    else abrirReloj();
  };

  return (
    <>
      <TableRow
        key={registro.id}
        data-fila-asistencia={registro.id}
        onClick={handleRowClick}
        className={`group cursor-pointer border-b border-gray-100 text-[13px] tabular-nums hover:bg-gray-50 [&>td]:whitespace-nowrap [&>td]:px-3 [&>td]:py-2.5 ${
          esDescanso ? "text-slate-400" : "text-slate-700"
        } ${seleccion?.marcado ? "bg-blue-50 [&>td]:bg-blue-50" : ""}`}
      >
        {isColVisible("empleado") && (
          // Fija a la izquierda: el nombre no se pierde al desplazar la tabla.
          <TableCell className={`sticky left-0 z-[5] bg-background font-semibold shadow-[8px_0_8px_-8px_rgba(15,23,42,0.18)] group-hover:bg-gray-50 ${esDescanso ? "text-slate-500" : "text-slate-800"}`}>
            {seleccion ? (
              <input
                type="checkbox"
                aria-label={`Elegir a ${nombre}`}
                checked={seleccion.marcado}
                onChange={(e) => seleccion.alternar(e.target.checked)}
                onClick={(e) => e.stopPropagation()}
                className="mr-2.5 h-4 w-4 cursor-pointer align-middle accent-blue-600"
              />
            ) : null}
            <NombreEmpleado id={registro.id_empleado}>{registro.nombre} {registro.apellido_paterno}</NombreEmpleado>
          </TableCell>
        )}
        {empresaActiva === "all" && isColVisible("unidad") && (
          <TableCell>{registro.unidad_negocio || registro.sucursal || registro.empresa_nombre}</TableCell>
        )}
        {isColVisible("codigo") && <TableCell className="text-center">{registro.nip || "-"}</TableCell>}
        {isColVisible("departamento") && <TableCell>{registro.departamento}</TableCell>}
        {isColVisible("fecha") && (
          <TableCell className="text-center">
            {registro.fecha ? dayjs.tz(registro.fecha, DB_TIMEZONE).format("DD/MM/YYYY") : "-"}
          </TableCell>
        )}
        {isColVisible("entrada") && (
          <TableCell className="text-center">{registro.entrada ? horaVer(registro.entrada) : <span className="text-slate-300">—</span>}</TableCell>
        )}
        {isColVisible("salida") && (
          <TableCell className="text-center">
            {registro.salida ? horaVer(registro.salida) : registro.entrada ? <span className="font-semibold text-rose-700">Sin salida</span> : <span className="text-slate-300">—</span>}
            {salidaDiaSiguiente(registro) && <span className="ml-1 text-[11px] font-semibold text-blue-600">+1 día</span>}
          </TableCell>
        )}
        {isColVisible("jornada") && (
          <TableCell className="min-w-[150px]">
            {esDescanso && sinChecadas ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">Descanso</span>
            ) : sinChecadas ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">Sin checadas</span>
            ) : minutosTrabajados == null ? (
              <span className="text-slate-300">—</span>
            ) : (
              <div>
                <span className="font-semibold text-slate-900">{formatearMinutos(minutosTrabajados)}</span>
                {minutosProgramados != null && <span className="text-slate-400"> de {formatearMinutos(minutosProgramados)}</span>}
                {avanceJornada != null && (
                  <div className="mt-1 h-1 w-full rounded-full bg-slate-200" aria-hidden>
                    <div className={`h-1 rounded-full ${minutosTrabajados - minutosProgramados < -10 ? "bg-red-400" : "bg-emerald-400"}`}
                      style={{ width: `${avanceJornada}%` }} />
                  </div>
                )}
              </div>
            )}
          </TableCell>
        )}
        {isColVisible("comida") && (
          <TableCell className="text-center">{minutosComida ? durTexto(minutosComida) : <span className="text-slate-300">—</span>}</TableCell>
        )}
        {isColVisible("hrs_extra") && (
          <TableCell>
            {extra.tipo === "pendiente" && !readOnly && onAbrirReloj ? (
              <button type="button" onClick={abrirReloj}
                className="inline-flex h-8 items-center rounded-lg border border-violet-300 bg-violet-50 px-2.5 text-[12.5px] font-semibold text-violet-700 hover:bg-violet-100">
                {extra.texto}
              </button>
            ) : extra.tipo !== "nada" ? (
              <span className="font-semibold text-violet-700">{extra.texto}</span>
            ) : extraViejo && extraViejo.minutos > 0 && extraViejo.estado !== "sin" ? (
              <span className="text-violet-700">{formatearMinutos(extraViejo.minutos)}</span>
            ) : (
              <span className="text-slate-300">—</span>
            )}
          </TableCell>
        )}
        {control && <CeldasControlHorasExtra registro={registro} control={control} zona={userTimezone} />}
        {isColVisible("dia") && (
          <TableCell title="Lo marca la ley o el catálogo: no se edita aquí">
            <span className="flex flex-col gap-0.5">
              <span className={especial ? "w-fit rounded-full bg-sky-100 px-2.5 py-0.5 text-[12px] font-semibold text-sky-800" : "text-[12.5px] text-slate-500"}>{dia.nombre}</span>
              {especial && dia.pago ? <span className="text-[11.5px] text-slate-500">{dia.pago}</span> : null}
            </span>
          </TableCell>
        )}
        {isColVisible("notas") && (
          <TableCell className="max-w-[220px] text-xs">
            <CeldaObservaciones notas={registro.notas} notasHorasExtra={registro.notas_hrs_extra} />
          </TableCell>
        )}
        {isColVisible("estado_asistencia") && (
          <TableCell className={`!whitespace-normal ${fijaEstado()} z-[1] bg-white ${editandoPar ? "align-top" : ""}`} style={derechaEstado(isColVisible("reloj"), isColVisible("motivo"))}>
            {/* Estado = qué pasó; Motivo = por qué y cómo se paga. Si la columna Motivo está oculta, va todo aquí. */}
            <CeldaEstadoDia registro={registro} tiposPermiso={tiposPermiso} readOnly={readOnly || !onAbrirReloj}
              onAbrirReloj={onAbrirReloj} onGuardado={mutateAsistencia} parte={isColVisible("motivo") ? "estado" : "ambas"} />
            {registro.permiso_horas && <div className="mt-1"><EtiquetaPermisoHoras permiso={registro.permiso_horas} /></div>}
          </TableCell>
        )}
        {isColVisible("motivo") && (
          <TableCell className={`!whitespace-normal ${fijaMotivo()} z-[1] bg-white ${editandoPar ? "align-top" : ""}`} style={derechaMotivo(isColVisible("reloj"))}>
            <CeldaEstadoDia registro={registro} tiposPermiso={tiposPermiso} readOnly={readOnly || !onAbrirReloj}
              onAbrirReloj={onAbrirReloj} onGuardado={mutateAsistencia} parte={isColVisible("estado_asistencia") ? "motivo" : "ambas"} />
          </TableCell>
        )}
        {isColVisible("reloj") && (
          <TableCell className={`${FIJA_RELOJ} z-[1] bg-white text-center`}>
            {readOnly || !onAbrirReloj ? null : (
              <button type="button" onClick={abrirReloj} aria-label={`Abrir el reloj de ${nombre}`} title="Registros del reloj"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100">
                <Clock3 className="h-[18px] w-[18px]" aria-hidden />
              </button>
            )}
          </TableCell>
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
