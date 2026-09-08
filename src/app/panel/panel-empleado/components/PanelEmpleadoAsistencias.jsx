"use client";

import MiniKpi from "./MiniKpi";
import { formatearFechaCorta as formatearFecha } from "@/lib/formatDate";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState, useMemo } from "react";
import { ChevronRight, CalendarCheck2, BarChart3 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";


const PILL_SUCCESS = "border border-emerald-100 bg-emerald-50 text-emerald-700";
const PILL_WARNING = "border border-amber-100 bg-amber-50 text-amber-700";
const PILL_DANGER = "border border-red-100 bg-rose-50 text-rose-700";
const PILL_NEUTRAL = "border border-slate-200 bg-slate-50 text-slate-600";
const PILL_BASE =
  "inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide";

function pillEstadoAsistencia(estado, esFalta) {
  if (estado === "Completo") return PILL_SUCCESS;
  if (esFalta) return PILL_DANGER;
  return PILL_WARNING;
}

/**
 * Componente para mostrar las asistencias del empleado
 * Relacionado con: src/app/panel/panel-empleado/page.jsx
 */
export default function PanelEmpleadoAsistencias({ datosEmpleado }) {
  if (!datosEmpleado) return null;

  const stats = datosEmpleado.asistencias?.estadisticas || {};
  const asistencias = datosEmpleado.asistencias?.historial || [];
  const tiposAnalisis = datosEmpleado.asistencias?.tipos_analisis || [];

  const [filtroDesde, setFiltroDesde] = useState("");
  const [filtroHasta, setFiltroHasta] = useState("");
  const [agrupar1, setAgrupar1] = useState("");
  const [agrupar2, setAgrupar2] = useState("");
  const [agrupar3, setAgrupar3] = useState("");

  const asistenciasFiltradas = useMemo(() => {
    return asistencias.filter((a) => {
      if (filtroDesde && a.fecha < filtroDesde) return false;
      if (filtroHasta && a.fecha > filtroHasta) return false;
      return true;
    });
  }, [asistencias, filtroDesde, filtroHasta]);

  // Función para obtener la clave de agrupación según el criterio
  const obtenerClaveAgrupacion = (registro, criterio) => {
    const fecha = new Date(registro.fecha + "T00:00:00");

    if (criterio === "anio") {
      return fecha.getFullYear().toString();
    } else if (criterio === "mes") {
      const meses = [
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
      return (
        fecha.getFullYear() +
        "-" +
        String(fecha.getMonth() + 1).padStart(2, "0") +
        " - " +
        meses[fecha.getMonth()]
      );
    } else if (criterio === "tipo") {
      return registro.tipo_permiso;
    }

    return "Sin clasificar";
  };

  // Función para agrupar asistencias multinivel
  const agruparAsistenciasMultinivel = (registros, niveles, nivelActual) => {
    if (nivelActual >= niveles.length) {
      return registros;
    }

    const criterio = niveles[nivelActual];
    const grupos = {};

    registros.forEach((r) => {
      const clave = obtenerClaveAgrupacion(r, criterio);

      if (!grupos[clave]) {
        grupos[clave] = [];
      }
      grupos[clave].push(r);
    });

    if (nivelActual + 1 < niveles.length) {
      Object.keys(grupos).forEach((clave) => {
        grupos[clave] = agruparAsistenciasMultinivel(
          grupos[clave],
          niveles,
          nivelActual + 1,
        );
      });
    }

    return grupos;
  };

  // Función para contar registros en un grupo
  const contarRegistrosGrupo = (grupo) => {
    if (Array.isArray(grupo)) {
      return grupo.length;
    }

    let total = 0;
    Object.keys(grupo).forEach((clave) => {
      total += contarRegistrosGrupo(grupo[clave]);
    });

    return total;
  };

  // Función para contar trabajados en un grupo
  const contarTrabajados = (grupo) => {
    if (Array.isArray(grupo)) {
      return grupo.filter(
        (a) => a.id_tipo_permiso !== 1 && a.id_tipo_permiso !== 3,
      ).length;
    }

    let total = 0;
    Object.keys(grupo).forEach((clave) => {
      total += contarTrabajados(grupo[clave]);
    });

    return total;
  };

  // Obtener niveles de agrupación activos
  const nivelesAgrupacion = useMemo(() => {
    return [agrupar1, agrupar2, agrupar3].filter((n) => n !== "");
  }, [agrupar1, agrupar2, agrupar3]);

  // Agrupar datos si hay niveles de agrupación
  const datosAgrupados = useMemo(() => {
    if (nivelesAgrupacion.length === 0) {
      return null;
    }
    return agruparAsistenciasMultinivel(
      asistenciasFiltradas,
      nivelesAgrupacion,
      0,
    );
  }, [asistenciasFiltradas, nivelesAgrupacion]);

  const limpiarFiltros = () => {
    setFiltroDesde("");
    setFiltroHasta("");
    setAgrupar1("");
    setAgrupar2("");
    setAgrupar3("");
  };

  const trabajados = asistenciasFiltradas.filter(
    (a) => a.id_tipo_permiso !== 1 && a.id_tipo_permiso !== 3,
  ).length;
  const faltas = asistenciasFiltradas.filter(
    (a) => a.id_tipo_permiso === 1 || a.id_tipo_permiso === 3,
  ).length;
  const retardos = asistenciasFiltradas.filter(
    (a) => a.estado === "Retardo",
  ).length;
  const porcentaje =
    asistenciasFiltradas.length > 0
      ? Math.round((trabajados / asistenciasFiltradas.length) * 100)
      : 0;

  return (
    <div>
      <h3 className="mb-3 flex items-center gap-1.5 text-[12.5px] font-bold text-slate-900">
        <CalendarCheck2 className="h-3.5 w-3.5 text-brand" />
        Registro de asistencias
      </h3>


      <div className="mb-4 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <MiniKpi label="% Asistencia" value={`${porcentaje}%`} />
        <MiniKpi label="Días trabajados" value={trabajados} />
        <MiniKpi label="Faltas" value={faltas} />
        <MiniKpi label="Retardos" value={retardos} />
      </div>

      {/* Barra de progreso */}
      <div className="mb-4 rounded-[10px] border border-slate-200 bg-white p-3 sm:p-4">
        <div className="mb-2 flex justify-between text-xs font-semibold sm:text-sm">
          <span>Asistencia del período</span>
          <span className="tabular-nums">{porcentaje}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand to-brand-accent transition-all"
            style={{ width: `${porcentaje}%` }}
          />
        </div>
      </div>

      {/* Análisis por tipo */}
      {tiposAnalisis.length > 0 && (
        <div className="mb-4 sm:mb-6">
          <h4 className="mb-2 flex items-center gap-1.5 text-[12.5px] font-bold text-slate-900 sm:mb-3">
            <BarChart3 className="h-3.5 w-3.5 text-brand" />
            Análisis por tipo de registro
          </h4>
          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
            {tiposAnalisis.map((tipo) => {
              const esFalta = tipo.id === 1 || tipo.id === 3;
              return (
                <div
                  key={tipo.id}
                  className="min-w-0 rounded-[10px] border border-slate-200 bg-white p-3"
                >
                  <div className="truncate text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">
                    {tipo.nombre === "🌴 Vacaciones"
                      ? "🌴 Registros de vacaciones"
                      : tipo.nombre}
                  </div>
                  <div className="mb-1.5 text-lg font-extrabold tabular-nums text-slate-900">
                    {tipo.total}
                  </div>
                  <span
                    className={`${PILL_BASE} ${
                      esFalta ? PILL_DANGER : PILL_SUCCESS
                    }`}
                  >
                    {esFalta ? "No cuenta" : "Cuenta como asistencia"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}


      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/40 px-4 py-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                Agrupar 1
              </label>
              <Select
                value={agrupar1 || "sin-agrupar"}
                onValueChange={(v) => setAgrupar1(v === "sin-agrupar" ? "" : v)}
              >
                <SelectTrigger className="h-9 rounded-xl border-slate-200 bg-white text-sm shadow-none">
                  <SelectValue placeholder="Sin agrupar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sin-agrupar">Sin agrupar</SelectItem>
                  <SelectItem value="anio">Año</SelectItem>
                  <SelectItem value="mes">Mes</SelectItem>
                  <SelectItem value="tipo">Tipo de Registro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                Agrupar 2
              </label>
              <Select
                value={agrupar2 || "ninguno"}
                onValueChange={(v) => setAgrupar2(v === "ninguno" ? "" : v)}
              >
                <SelectTrigger className="h-9 rounded-xl border-slate-200 bg-white text-sm shadow-none">
                  <SelectValue placeholder="Ninguno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ninguno">Ninguno</SelectItem>
                  <SelectItem value="anio">Año</SelectItem>
                  <SelectItem value="mes">Mes</SelectItem>
                  <SelectItem value="tipo">Tipo de Registro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                Agrupar 3
              </label>
              <Select
                value={agrupar3 || "ninguno"}
                onValueChange={(v) => setAgrupar3(v === "ninguno" ? "" : v)}
              >
                <SelectTrigger className="h-9 rounded-xl border-slate-200 bg-white text-sm shadow-none">
                  <SelectValue placeholder="Ninguno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ninguno">Ninguno</SelectItem>
                  <SelectItem value="anio">Año</SelectItem>
                  <SelectItem value="mes">Mes</SelectItem>
                  <SelectItem value="tipo">Tipo de Registro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                Desde
              </label>
              <Input
                type="date"
                value={filtroDesde}
                onChange={(e) => setFiltroDesde(e.target.value)}
                className="h-9 rounded-xl border-slate-200 bg-white text-sm shadow-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                Hasta
              </label>
              <Input
                type="date"
                value={filtroHasta}
                onChange={(e) => setFiltroHasta(e.target.value)}
                className="h-9 rounded-xl border-slate-200 bg-white text-sm shadow-none"
              />
            </div>

            <div className="flex items-end">
              <Button
                onClick={limpiarFiltros}
                variant="outline"
                size="sm"
                className="h-9 w-full rounded-xl border-slate-200 bg-white px-4 font-semibold text-slate-600 shadow-none hover:bg-slate-50"
              >
                Limpiar
              </Button>
            </div>
          </div>
        </div>
        {datosAgrupados ? (
          <RenderizarGruposAsistencias
            grupos={datosAgrupados}
            niveles={nivelesAgrupacion}
            nivelActual={0}
          />
        ) : (
          <div className="-mx-2 overflow-x-auto sm:-mx-4 md:mx-0">
            <div className="min-w-[700px] sm:min-w-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                      Fecha
                    </TableHead>
                    <TableHead className="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                      Tipo de Registro
                    </TableHead>
                    <TableHead className="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                      Entrada
                    </TableHead>
                    <TableHead className="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                      Salida
                    </TableHead>
                    <TableHead className="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                      Horas Trabajadas
                    </TableHead>
                    <TableHead className="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                      Estado
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {asistenciasFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-8 text-center text-slate-500"
                      >
                        No hay registros en el período seleccionado
                      </TableCell>
                    </TableRow>
                  ) : (
                    asistenciasFiltradas.map((a) => {
                      const esFalta =
                        a.id_tipo_permiso === 1 || a.id_tipo_permiso === 3;

                      return (
                        <TableRow key={a.id} className="transition-colors hover:bg-slate-50/70">
                          <TableCell className="text-xs sm:text-sm">
                            {formatearFecha(a.fecha)}
                          </TableCell>
                          <TableCell>
                            <span className={`${PILL_BASE} ${PILL_NEUTRAL}`}>
                              {a.tipo_permiso}
                            </span>
                          </TableCell>
                          {a.hora_entrada && a.hora_salida ? (
                            <>
                              <TableCell className="text-xs font-semibold text-emerald-700 sm:text-sm">
                                {a.hora_entrada}
                              </TableCell>
                              <TableCell className="text-xs font-semibold text-rose-600 sm:text-sm">
                                {a.hora_salida}
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm">
                                {a.horas_trabajadas}
                              </TableCell>
                            </>
                          ) : (
                            <TableCell
                              colSpan={3}
                              className="text-center text-xs text-slate-500 sm:text-sm"
                            >
                              Sin registro
                            </TableCell>
                          )}
                          <TableCell>
                            <span
                              className={`${PILL_BASE} ${pillEstadoAsistencia(
                                a.estado,
                                esFalta,
                              )}`}
                            >
                              {a.estado}
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
        )}
      </div>
    </div>
  );
}

// Componente para renderizar grupos de asistencias con headers colapsables
function RenderizarGruposAsistencias({ grupos, niveles, nivelActual }) {
  const [gruposAbiertos, setGruposAbiertos] = useState({});

  const toggleGrupo = (clave) => {
    setGruposAbiertos((prev) => ({
      ...prev,
      [clave]: !prev[clave],
    }));
  };

  const claves = Object.keys(grupos).sort();


  const getHeaderClass = (nivel) => {
    if (nivel === 0) {
      return "bg-slate-50 text-slate-800";
    } else if (nivel === 1) {
      return "bg-slate-50/60 text-slate-700";
    } else {
      return "bg-white text-slate-600";
    }
  };

  const contarRegistrosGrupo = (grupo) => {
    if (Array.isArray(grupo)) {
      return grupo.length;
    }
    let total = 0;
    Object.keys(grupo).forEach((clave) => {
      total += contarRegistrosGrupo(grupo[clave]);
    });
    return total;
  };

  const contarTrabajados = (grupo) => {
    if (Array.isArray(grupo)) {
      return grupo.filter(
        (a) => a.id_tipo_permiso !== 1 && a.id_tipo_permiso !== 3,
      ).length;
    }
    let total = 0;
    Object.keys(grupo).forEach((clave) => {
      total += contarTrabajados(grupo[clave]);
    });
    return total;
  };

  return (
    <div>
      {claves.map((clave) => {
        const contenido = grupos[clave];
        const grupoId = `grupo-${nivelActual}-${clave}`;
        const estaAbierto = gruposAbiertos[grupoId] ?? false;

        if (Array.isArray(contenido)) {
          // Es un array, renderizar tabla
          const trabajados = contenido.filter(
            (a) => a.id_tipo_permiso !== 1 && a.id_tipo_permiso !== 3,
          ).length;
          const faltas = contenido.filter(
            (a) => a.id_tipo_permiso === 1 || a.id_tipo_permiso === 3,
          ).length;
          const porcentaje =
            contenido.length > 0
              ? Math.round((trabajados / contenido.length) * 100)
              : 0;

          return (
            <Collapsible
              key={grupoId}
              open={estaAbierto}
              onOpenChange={() => toggleGrupo(grupoId)}
            >
              <CollapsibleTrigger
                className={`w-full ${getHeaderClass(
                  nivelActual,
                )} flex cursor-pointer items-center justify-between border-b border-slate-100 px-4 py-2.5 transition-colors hover:bg-slate-100`}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <ChevronRight
                    className={`h-4 w-4 transition-transform ${
                      estaAbierto ? "rotate-90" : ""
                    }`}
                  />
                  <span className="text-[12px] font-semibold text-slate-700">{clave}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-medium text-slate-400 sm:gap-4">
                  <span>{contenido.length} registros</span>
                  <span>·</span>
                  <span>{trabajados} trabajados</span>
                  <span>·</span>
                  <span>{faltas} faltas</span>
                  <span>·</span>
                  <span>{porcentaje}% asistencia</span>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="-mx-2 overflow-x-auto sm:-mx-4 md:mx-0">
                  <div className="min-w-[700px] sm:min-w-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                            Fecha
                          </TableHead>
                          <TableHead className="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                            Tipo
                          </TableHead>
                          <TableHead className="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                            Entrada
                          </TableHead>
                          <TableHead className="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                            Salida
                          </TableHead>
                          <TableHead className="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                            Horas
                          </TableHead>
                          <TableHead className="bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                            Estado
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contenido.map((a) => {
                          const esFalta =
                            a.id_tipo_permiso === 1 || a.id_tipo_permiso === 3;

                          return (
                            <TableRow key={a.id} className="transition-colors hover:bg-slate-50/70">
                              <TableCell className="text-xs sm:text-sm">
                                {formatearFecha(a.fecha)}
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`${PILL_BASE} ${PILL_NEUTRAL}`}
                                >
                                  {a.tipo_permiso}
                                </span>
                              </TableCell>
                              {a.hora_entrada && a.hora_salida ? (
                                <>
                                  <TableCell className="text-xs font-semibold text-emerald-700 sm:text-sm">
                                    {a.hora_entrada}
                                  </TableCell>
                                  <TableCell className="text-xs font-semibold text-rose-600 sm:text-sm">
                                    {a.hora_salida}
                                  </TableCell>
                                  <TableCell className="text-xs sm:text-sm">
                                    {a.horas_trabajadas}
                                  </TableCell>
                                </>
                              ) : (
                                <TableCell
                                  colSpan={3}
                                  className="text-center text-xs text-slate-500 sm:text-sm"
                                >
                                  Sin registro
                                </TableCell>
                              )}
                              <TableCell>
                                <span
                                  className={`${PILL_BASE} ${pillEstadoAsistencia(
                                    a.estado,
                                    esFalta,
                                  )}`}
                                >
                                  {a.estado}
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        } else {
          // Es un objeto, renderizar subgrupos
          const todosRegistros = contarRegistrosGrupo(contenido);
          const trabajados = contarTrabajados(contenido);
          const faltas = todosRegistros - trabajados;
          const porcentaje =
            todosRegistros > 0
              ? Math.round((trabajados / todosRegistros) * 100)
              : 0;

          return (
            <Collapsible
              key={grupoId}
              open={estaAbierto}
              onOpenChange={() => toggleGrupo(grupoId)}
            >
              <CollapsibleTrigger
                className={`w-full ${getHeaderClass(
                  nivelActual,
                )} flex cursor-pointer items-center justify-between border-b border-slate-100 px-4 py-2.5 transition-colors hover:bg-slate-100`}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <ChevronRight
                    className={`h-4 w-4 transition-transform ${
                      estaAbierto ? "rotate-90" : ""
                    }`}
                  />
                  <span className="text-[12px] font-semibold text-slate-700">{clave}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-medium text-slate-400 sm:gap-4">
                  <span>{todosRegistros} registros</span>
                  <span>·</span>
                  <span>{trabajados} trabajados</span>
                  <span>·</span>
                  <span>{faltas} faltas</span>
                  <span>·</span>
                  <span>{porcentaje}% asistencia</span>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <RenderizarGruposAsistencias
                  grupos={contenido}
                  niveles={niveles}
                  nivelActual={nivelActual + 1}
                />
              </CollapsibleContent>
            </Collapsible>
          );
        }
      })}
    </div>
  );
}
