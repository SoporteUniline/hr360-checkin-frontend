"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
      <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
        🏖️ Balance de Vacaciones
      </h3>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
        <Card className="overflow-hidden">
          <CardContent className="p-3 sm:p-4 md:p-5 text-center min-w-0">
            <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-1 break-words overflow-hidden">
              {balance.dias_totales || 0}
            </div>
            <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide break-words">
              Días totales
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-3 sm:p-4 md:p-5 text-center min-w-0">
            <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-1 break-words overflow-hidden">
              {balance.dias_tomados || 0}
            </div>
            <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide break-words">
              Días tomados
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-3 sm:p-4 md:p-5 text-center min-w-0">
            <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-1 break-words overflow-hidden">
              {balance.dias_disponibles || 0}
            </div>
            <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide break-words">
              Días disponibles
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-3 sm:p-4 md:p-5 text-center min-w-0">
            <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-1 break-words overflow-hidden">
              {balance.dias_pendientes || 0}
            </div>
            <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide break-words">
              Días pendientes
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de progreso */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex justify-between mb-2 text-sm font-semibold">
            <span>Vacaciones utilizadas</span>
            <span>
              <strong>
                {balance.dias_tomados || 0} / {balance.dias_totales || 0} días (
                {balance.porcentaje_usado || 0}%)
              </strong>
            </span>
          </div>
          <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all"
              style={{ width: `${balance.porcentaje_usado || 0}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Selector de vista */}
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <h4 className="text-xs sm:text-sm font-bold text-gray-900">
          📅 Historial de Vacaciones
        </h4>
        <div className="flex gap-2">
          <Button
            onClick={() => setVista("calendario")}
            variant={vista === "calendario" ? "default" : "outline"}
            size="sm"
            className="text-xs sm:text-sm"
          >
            📅 Vista Calendario
          </Button>
          <Button
            onClick={() => setVista("tabla")}
            variant={vista === "tabla" ? "default" : "outline"}
            size="sm"
            className="text-xs sm:text-sm"
          >
            📋 Vista Tabla
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
          <Card className="mb-3 sm:mb-4">
            <CardContent className="p-3 sm:p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">
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
                  <label className="text-xs font-bold text-gray-500 block mb-1">
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
                  <label className="text-xs font-bold text-gray-500 block mb-1">
                    DESDE:
                  </label>
                  <Input
                    type="date"
                    value={filtroDesde}
                    onChange={(e) => setFiltroDesde(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">
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
            </CardContent>
          </Card>

          {/* Tabla */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto -mx-2 sm:-mx-4 md:mx-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px] sm:text-xs font-bold uppercase">
                        Fecha
                      </TableHead>
                      <TableHead className="text-[10px] sm:text-xs font-bold uppercase">
                        Día
                      </TableHead>
                      <TableHead className="text-[10px] sm:text-xs font-bold uppercase">
                        Estado
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vacacionesFiltradas.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-center py-8 text-gray-500"
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
                            <TableCell className="font-semibold text-xs sm:text-sm">
                              {formatearFecha(v.fecha_inicio)}
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm">
                              {diaSemana}
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-800 text-[10px] sm:text-xs">
                                ✅ {v.estado}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Información adicional */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <Card>
          <CardContent className="p-4">
            <h5 className="text-xs font-bold text-gray-500 uppercase mb-3">
              📊 Desglose de Vacaciones
            </h5>
            <div className="space-y-2 text-sm">
              <InfoRow
                label="Período actual"
                value={balance.periodo || "N/A"}
              />
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
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <h5 className="text-xs font-bold text-gray-500 uppercase mb-3">
              📅 Próximo Período
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between py-1 border-b border-gray-100 last:border-0">
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
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">
            No hay vacaciones registradas para mostrar en el calendario.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Calendario grande */}
      {/* <Card>
        <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6">
          <CalendarioGrande mesAnio={mesActual} diasVacaciones={diasVacaciones} />
        </CardContent>
      </Card> */}

      {/* Calendarios pequeños */}
      {todosLosMeses.length > 0 && (
        <Card>
          <CardContent className="p-2 sm:p-3 md:p-4 lg:p-5">
            {/* <h5 className="text-[10px] sm:text-xs md:text-sm font-bold text-gray-500 uppercase tracking-wide mb-2 sm:mb-3 md:mb-4">
              Selecciona un mes:
            </h5> */}
            {/* Grid responsivo que se adapta mejor cuando el sidebar está abierto */}
            {/* Preferimos 2 columnas en pantallas grandes cuando el sidebar está abierto para mejor visualización */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2 sm:gap-2.5 md:gap-3 lg:gap-4">
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
          </CardContent>
        </Card>
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
      <h3 className="text-center text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-3 sm:mb-4 md:mb-5 lg:mb-6">
        {nombresMeses[mes - 1]} {anio}
      </h3>

      {/* Contenedor con ancho mínimo para mantener proporciones */}
      <div className="min-w-[280px] sm:min-w-[320px] md:min-w-0">
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 md:gap-2 lg:gap-2.5">
          {/* Días de la semana */}
          {["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"].map((dia) => (
            <div
              key={dia}
              className="text-center text-[9px] sm:text-[10px] md:text-xs lg:text-sm font-extrabold text-gray-600 uppercase tracking-wide py-1.5 sm:py-2 md:py-2.5 lg:py-3"
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
                  aspect-square flex items-center justify-center rounded-md sm:rounded-lg text-[10px] sm:text-xs md:text-sm lg:text-base xl:text-lg font-semibold transition-all
                  ${
                    esVacacion
                      ? "bg-gradient-to-br from-green-500 to-green-600 text-white shadow-md sm:shadow-lg border-2 border-green-600 hover:shadow-xl hover:scale-105"
                      : esHoy
                      ? "bg-blue-100 text-blue-700 border-2 border-blue-400 font-bold"
                      : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
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
      className={`
        bg-white p-2 sm:p-2.5 md:p-3 lg:p-4 rounded-lg transition-all duration-200 w-full
        ${"border border-gray-200 hover:border-gray-300 hover:shadow-sm"}
      `}
    >
      <div className="text-center text-xs sm:text-sm md:text-base font-bold text-gray-900 mb-2 sm:mb-2.5 md:mb-3">
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
                aspect-square min-h-[14px] sm:min-h-[16px] md:min-h-[18px] lg:min-h-[20px] flex items-center justify-center text-[8px] sm:text-[9px] md:text-[10px] lg:text-[11px] rounded-sm font-semibold leading-none
                ${
                  esVacacion
                    ? "bg-green-500 text-white shadow-sm"
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
