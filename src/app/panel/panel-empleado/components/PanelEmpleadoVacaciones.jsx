"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useMemo } from "react";
import { Plane, CalendarDays, BarChart3, List } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Componente para mostrar las vacaciones del empleado
 * Relacionado con: src/app/panel/panel-empleado/page.jsx
 */
export default function PanelEmpleadoVacaciones({ datosEmpleado }) {
  if (!datosEmpleado) return null;

  const balance = datosEmpleado.vacaciones?.balance || {};
  const historial = datosEmpleado.vacaciones?.historial || [];

  const [filtroDesde, setFiltroDesde] = useState("");
  const [filtroHasta, setFiltroHasta] = useState("");
  const [agrupar, setAgrupar] = useState("");
  const [orden, setOrden] = useState("desc");
  const [vista, setVista] = useState("calendario"); // 'calendario' o 'tabla'
  const [mesSeleccionado, setMesSeleccionado] = useState(null);

  const vacacionesFiltradas = useMemo(() => {
    let filtradas = historial.filter((v) => {
      if (filtroDesde && v.fecha_inicio < filtroDesde) return false;
      if (filtroHasta && v.fecha_inicio > filtroHasta) return false;
      return true;
    });

    // Ordenar
    filtradas.sort((a, b) => {
      if (orden === "desc") {
        return b.fecha_inicio.localeCompare(a.fecha_inicio);
      } else {
        return a.fecha_inicio.localeCompare(b.fecha_inicio);
      }
    });

    return filtradas;
  }, [historial, filtroDesde, filtroHasta, orden]);

  const limpiarFiltros = () => {
    setFiltroDesde("");
    setFiltroHasta("");
    setAgrupar("");
    setOrden("desc");
  };

  return (
    <div>
      <h3 className="mb-3 flex items-center gap-1.5 text-[12.5px] font-bold text-gray-900">
        <Plane className="h-3.5 w-3.5 text-[#2563eb]" />
        Balance de vacaciones
      </h3>

      {/* Mini-KPIs homologados */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <MiniKpi label="Días totales" value={balance.dias_totales || 0} />
        <MiniKpi label="Días tomados" value={balance.dias_tomados || 0} />
        <MiniKpi
          label="Días disponibles"
          value={balance.dias_disponibles || 0}
        />
        <MiniKpi label="Días pendientes" value={balance.dias_pendientes || 0} />
      </div>

      {/* Barra de progreso */}
      <div className="mb-6 rounded-[10px] border border-gray-200 bg-white p-4">
        <div className="mb-2 flex justify-between text-sm font-semibold">
          <span>Vacaciones utilizadas</span>
          <span className="tabular-nums">
            {balance.dias_tomados || 0} / {balance.dias_totales || 0} días (
            {balance.porcentaje_usado || 0}%)
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#2563eb] to-[#7c3aed] transition-all"
            style={{ width: `${balance.porcentaje_usado || 0}%` }}
          />
        </div>
      </div>

      {/* Selector de vista */}
      <div className="mb-4 flex items-center justify-between sm:mb-6">
        <h4 className="flex items-center gap-1.5 text-[12.5px] font-bold text-gray-900">
          <CalendarDays className="h-3.5 w-3.5 text-[#2563eb]" />
          Historial de vacaciones
        </h4>
        <div className="flex gap-2">
          <Button
            onClick={() => setVista("calendario")}
            variant={vista === "calendario" ? "default" : "outline"}
            size="sm"
            className="text-xs"
          >
            <CalendarDays className="mr-1 h-3.5 w-3.5" />
            Calendario
          </Button>
          <Button
            onClick={() => setVista("tabla")}
            variant={vista === "tabla" ? "default" : "outline"}
            size="sm"
            className="text-xs"
          >
            <List className="mr-1 h-3.5 w-3.5" />
            Tabla
          </Button>
        </div>
      </div>

      {/* Vista Calendario */}
      {vista === "calendario" && (
        <VistaCalendarioVacaciones
          historial={historial}
          mesSeleccionado={mesSeleccionado}
          setMesSeleccionado={setMesSeleccionado}
        />
      )}

      {/* Vista Tabla */}
      {vista === "tabla" && (
        <>
          {/* Filtros */}
          <div className="mb-3 rounded-[10px] border border-gray-200 bg-white p-3 sm:mb-4 sm:p-4">
            <div className="mb-3 grid grid-cols-1 gap-3 sm:mb-4 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-500">
                  AGRUPAR POR:
                </label>
                <Select
                  value={agrupar || "sin-agrupar"}
                  onValueChange={(v) =>
                    setAgrupar(v === "sin-agrupar" ? "" : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin agrupar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sin-agrupar">Sin agrupar</SelectItem>
                    <SelectItem value="mes-anio">Mes-Año</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-500">
                  ORDENAR:
                </label>
                <Select value={orden} onValueChange={setOrden}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Más reciente primero</SelectItem>
                    <SelectItem value="asc">Más antiguo primero</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-500">
                  DESDE:
                </label>
                <Input
                  type="date"
                  value={filtroDesde}
                  onChange={(e) => setFiltroDesde(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-500">
                  HASTA:
                </label>
                <Input
                  type="date"
                  value={filtroHasta}
                  onChange={(e) => setFiltroHasta(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={limpiarFiltros} variant="outline" size="sm">
              Limpiar Filtros
            </Button>
          </div>

          {/* Tabla */}
          <div className="rounded-[10px] border border-gray-200 bg-white">
            <div className="-mx-2 overflow-x-auto sm:-mx-4 md:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px] font-bold uppercase sm:text-xs">
                      Fecha
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase sm:text-xs">
                      Día
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase sm:text-xs">
                      Estado
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vacacionesFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="py-8 text-center text-gray-500"
                      >
                        No hay vacaciones en el período seleccionado
                      </TableCell>
                    </TableRow>
                  ) : (
                    vacacionesFiltradas.map((v) => {
                      const fecha = new Date(v.fecha_inicio + "T00:00:00");
                      const dias = [
                        "Domingo",
                        "Lunes",
                        "Martes",
                        "Miércoles",
                        "Jueves",
                        "Viernes",
                        "Sábado",
                      ];
                      const diaSemana = dias[fecha.getDay()];

                      return (
                        <TableRow key={v.id}>
                          <TableCell className="text-xs font-semibold sm:text-sm">
                            {formatearFecha(v.fecha_inicio)}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            {diaSemana}
                          </TableCell>
                          <TableCell>
                            <span className="inline-block rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-0.5 text-[10.5px] font-bold text-emerald-700">
                              {v.estado}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}

      {/* Información adicional */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-[10px] border border-gray-200 bg-white p-4">
          <h5 className="mb-3 flex items-center gap-1.5 text-[12.5px] font-bold text-gray-900">
            <BarChart3 className="h-3.5 w-3.5 text-[#2563eb]" />
            Desglose de vacaciones
          </h5>
          <div className="space-y-2 text-sm">
            <InfoRow label="Período actual" value={balance.periodo || "N/A"} />
            <InfoRow
              label="Días correspondientes"
              value={`${balance.dias_totales || 0} días`}
            />
            <InfoRow
              label="Días tomados"
              value={`${balance.dias_tomados || 0} días`}
            />
            <InfoRow
              label="Días restantes"
              value={`${balance.dias_disponibles || 0} días`}
            />
            <InfoRow
              label="Prima vacacional"
              value={`${balance.prima_vacacional || 0}%`}
            />
          </div>
        </div>
        <div className="rounded-[10px] border border-gray-200 bg-white p-4">
          <h5 className="mb-3 flex items-center gap-1.5 text-[12.5px] font-bold text-gray-900">
            <CalendarDays className="h-3.5 w-3.5 text-[#2563eb]" />
            Próximo período
          </h5>
          <div className="space-y-2 text-sm">
            <InfoRow
              label="Inicio del período"
              value={formatearFecha(balance.fecha_inicio_periodo)}
            />
            <InfoRow
              label="Días a recibir"
              value={`${(balance.dias_totales || 0) + 2} días`}
            />
            <InfoRow
              label="Antigüedad"
              value={`${balance.anios_antiguedad || 0} años`}
            />
            <InfoRow
              label="Prima vacacional"
              value={`${balance.prima_vacacional || 0}%`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniKpi({ label, value }) {
  return (
    <div className="min-w-0 rounded-[10px] border border-gray-200 bg-white p-3">
      <div className="truncate text-[10.5px] font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="text-lg font-extrabold tabular-nums text-gray-900">
        {value}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between border-b border-gray-100 py-1 last:border-0">
      <span className="text-gray-600">{label}:</span>
      <span className="font-semibold text-gray-900">{value || "N/A"}</span>
    </div>
  );
}

// Componente para la vista de calendario de vacaciones
function VistaCalendarioVacaciones({
  historial,
  mesSeleccionado,
  setMesSeleccionado,
}) {
  // Obtener días de vacaciones como Set
  const diasVacaciones = useMemo(() => {
    const set = new Set();
    historial.forEach((v) => {
      set.add(v.fecha_inicio);
    });
    return set;
  }, [historial]);

  // Obtener meses con vacaciones
  const mesesConVacaciones = useMemo(() => {
    const meses = Array.from(
      new Set(historial.map((v) => v.fecha_inicio.substring(0, 7))),
    ).sort();
    return meses;
  }, [historial]);

  // Determinar mes seleccionado inicialmente
  const mesActual = useMemo(() => {
    if (mesSeleccionado) return mesSeleccionado;
    return mesesConVacaciones.length > 0
      ? mesesConVacaciones[mesesConVacaciones.length - 1]
      : new Date().toISOString().substring(0, 7);
  }, [mesSeleccionado, mesesConVacaciones]);

  // Generar lista de todos los meses entre el primero y el último con vacaciones
  const todosLosMeses = useMemo(() => {
    if (mesesConVacaciones.length === 0) return [];

    const primerMes = mesesConVacaciones[0];
    const ultimoMes = mesesConVacaciones[mesesConVacaciones.length - 1];

    const [anioInicio, mesInicio] = primerMes.split("-").map(Number);
    const [anioFin, mesFin] = ultimoMes.split("-").map(Number);

    const meses = [];
    let anio = anioInicio;
    let mes = mesInicio;

    while (anio < anioFin || (anio === anioFin && mes <= mesFin)) {
      meses.push(`${anio}-${String(mes).padStart(2, "0")}`);
      mes++;
      if (mes > 12) {
        mes = 1;
        anio++;
      }
    }

    return meses;
  }, [mesesConVacaciones]);

  if (historial.length === 0) {
    return (
      <div className="rounded-[10px] border border-gray-200 bg-white p-6 text-center">
        <p className="text-gray-500">
          No hay vacaciones registradas para mostrar en el calendario.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Calendarios pequeños */}
      {todosLosMeses.length > 0 && (
        <div className="rounded-[10px] border border-gray-200 bg-white p-2 sm:p-3 md:p-4 lg:p-5">
          {/* Grid responsivo que se adapta mejor cuando el sidebar está abierto */}
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5 md:gap-3 lg:gap-4 xl:grid-cols-3 2xl:grid-cols-4">
            {todosLosMeses.map((mesAnio) => (
              <CalendarioPequeno
                key={mesAnio}
                mesAnio={mesAnio}
                diasVacaciones={diasVacaciones}
                esSeleccionado={mesAnio === mesActual}
                onClick={() => setMesSeleccionado(mesAnio)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Componente para el calendario grande
function CalendarioGrande({ mesAnio, diasVacaciones }) {
  const [anio, mes] = mesAnio.split("-").map(Number);
  const nombresMeses = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  const primerDia = new Date(anio, mes - 1, 1);
  const ultimoDia = new Date(anio, mes, 0);
  const diasEnMes = ultimoDia.getDate();
  const primerDiaSemana = primerDia.getDay();

  const hoy = new Date().toISOString().split("T")[0];

  return (
    <div className="w-full overflow-x-auto">
      <h3 className="mb-3 text-center text-lg font-bold text-gray-900 sm:mb-4">
        {nombresMeses[mes - 1]} {anio}
      </h3>

      {/* Contenedor con ancho mínimo para mantener proporciones */}
      <div className="min-w-[280px] sm:min-w-[320px] md:min-w-0">
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 md:gap-2">
          {/* Días de la semana */}
          {["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"].map((dia) => (
            <div
              key={dia}
              className="py-1.5 text-center text-[9px] font-extrabold uppercase tracking-wide text-gray-600 sm:py-2 sm:text-[10px] md:text-xs"
            >
              {dia}
            </div>
          ))}

          {/* Espacios vacíos antes del primer día */}
          {Array.from({ length: primerDiaSemana }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square"></div>
          ))}

          {/* Días del mes */}
          {Array.from({ length: diasEnMes }).map((_, i) => {
            const dia = i + 1;
            const fechaStr = `${anio}-${String(mes).padStart(2, "0")}-${String(
              dia,
            ).padStart(2, "0")}`;
            const esVacacion = diasVacaciones.has(fechaStr);
            const esHoy = fechaStr === hoy;

            return (
              <div
                key={dia}
                className={`
                  flex aspect-square items-center justify-center rounded-md text-[10px] font-semibold transition-colors sm:text-xs md:text-sm
                  ${
                    esVacacion
                      ? "bg-gradient-to-br from-[#2563eb] to-[#7c3aed] text-white"
                      : esHoy
                        ? "border border-blue-300 bg-blue-50 font-bold text-blue-700"
                        : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }
                `}
              >
                {dia}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Componente para calendarios pequeños
function CalendarioPequeno({
  mesAnio,
  diasVacaciones,
  esSeleccionado,
  onClick,
}) {
  const [anio, mes] = mesAnio.split("-").map(Number);
  const nombresMeses = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];

  const primerDia = new Date(anio, mes - 1, 1);
  const ultimoDia = new Date(anio, mes, 0);
  const diasEnMes = ultimoDia.getDate();
  const primerDiaSemana = primerDia.getDay();

  return (
    <div
      onClick={onClick}
      className="w-full rounded-[10px] border border-gray-200 bg-white p-2 transition-colors hover:border-gray-300 sm:p-2.5 md:p-3 lg:p-4"
    >
      <div className="mb-2 text-center text-xs font-bold text-gray-900 sm:mb-2.5 sm:text-sm md:mb-3">
        {nombresMeses[mes - 1]} {anio}
      </div>
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {/* Espacios vacíos antes del primer día */}
        {Array.from({ length: primerDiaSemana }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="aspect-square min-h-[14px] sm:min-h-[16px] md:min-h-[18px] lg:min-h-[20px]"
          ></div>
        ))}

        {/* Días del mes */}
        {Array.from({ length: diasEnMes }).map((_, i) => {
          const dia = i + 1;
          const fechaStr = `${anio}-${String(mes).padStart(2, "0")}-${String(
            dia,
          ).padStart(2, "0")}`;
          const esVacacion = diasVacaciones.has(fechaStr);

          return (
            <div
              key={dia}
              className={`
                flex aspect-square min-h-[14px] items-center justify-center rounded-sm text-[8px] font-semibold leading-none sm:min-h-[16px] sm:text-[9px] md:min-h-[18px] md:text-[10px] lg:min-h-[20px] lg:text-[11px]
                ${
                  esVacacion
                    ? "bg-gradient-to-br from-[#2563eb] to-[#7c3aed] text-white"
                    : "text-gray-500"
                }
              `}
            >
              {dia}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatearFecha(fechaISO) {
  if (!fechaISO || fechaISO === "N/A") return "N/A";

  try {
    const fecha = new Date(fechaISO + "T00:00:00");
    const dia = String(fecha.getDate()).padStart(2, "0");
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const anio = fecha.getFullYear();
    return `${dia}/${mes}/${anio}`;
  } catch (e) {
    return fechaISO;
  }
}
