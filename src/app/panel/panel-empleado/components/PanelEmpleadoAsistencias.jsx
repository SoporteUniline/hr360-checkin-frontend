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

// Pills de estado homologadas (Adamia)
const PILL_SUCCESS = "border border-emerald-100 bg-emerald-50 text-emerald-700";
const PILL_WARNING = "border border-amber-100 bg-amber-50 text-amber-700";
const PILL_DANGER = "border border-red-100 bg-red-50 text-red-700";
const PILL_NEUTRAL = "border border-gray-200 bg-gray-50 text-gray-600";
const PILL_BASE =
  "inline-block rounded-full px-2.5 py-0.5 text-[10.5px] font-bold";

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
      <h3 className="mb-3 flex items-center gap-1.5 text-[12.5px] font-bold text-gray-900">
        <CalendarCheck2 className="h-3.5 w-3.5 text-[#2563eb]" />
        Registro de asistencias
      </h3>

      {/* Mini-KPIs homologados */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <MiniKpi label="% Asistencia" value={`${porcentaje}%`} />
        <MiniKpi label="Días trabajados" value={trabajados} />
        <MiniKpi label="Faltas" value={faltas} />
        <MiniKpi label="Retardos" value={retardos} />
      </div>

      {/* Barra de progreso */}
      <div className="mb-4 rounded-[10px] border border-gray-200 bg-white p-3 sm:p-4">
        <div className="mb-2 flex justify-between text-xs font-semibold sm:text-sm">
          <span>Asistencia del período</span>
          <span className="tabular-nums">{porcentaje}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#2563eb] to-[#7c3aed] transition-all"
            style={{ width: `${porcentaje}%` }}
          />
        </div>
      </div>

      {/* Análisis por tipo */}
      {tiposAnalisis.length > 0 && (
        <div className="mb-4 sm:mb-6">
          <h4 className="mb-2 flex items-center gap-1.5 text-[12.5px] font-bold text-gray-900 sm:mb-3">
            <BarChart3 className="h-3.5 w-3.5 text-[#2563eb]" />
            Análisis por tipo de registro
          </h4>
          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
            {tiposAnalisis.map((tipo) => {
              const esFalta = tipo.id === 1 || tipo.id === 3;
              return (
                <div
                  key={tipo.id}
                  className="min-w-0 rounded-[10px] border border-gray-200 bg-white p-3"
                >
                  <div className="truncate text-[10.5px] font-semibold uppercase tracking-wide text-gray-500">
                    {tipo.nombre}
                  </div>
                  <div className="mb-1.5 text-lg font-extrabold tabular-nums text-gray-900">
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

      {/* Filtros */}
      <div className="mb-3 rounded-[10px] border border-gray-200 bg-white p-3 sm:mb-4 sm:p-4">
        <div className="mb-3 grid grid-cols-1 gap-3 sm:mb-4 sm:grid-cols-2 sm:gap-4 lg:grid-cols-5">
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-500">
              AGRUPAR 1:
            </label>
            <Select
              value={agrupar1 || "sin-agrupar"}
              onValueChange={(v) => setAgrupar1(v === "sin-agrupar" ? "" : v)}
            >
              <SelectTrigger>
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
            <label className="mb-1 block text-xs font-bold text-gray-500">
              AGRUPAR 2:
            </label>
            <Select
              value={agrupar2 || "ninguno"}
              onValueChange={(v) => setAgrupar2(v === "ninguno" ? "" : v)}
            >
              <SelectTrigger>
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
            <label className="mb-1 block text-xs font-bold text-gray-500">
              AGRUPAR 3:
            </label>
            <Select
              value={agrupar3 || "ninguno"}
              onValueChange={(v) => setAgrupar3(v === "ninguno" ? "" : v)}
            >
              <SelectTrigger>
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
      <div className="overflow-hidden rounded-[10px] border border-gray-200 bg-white">
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
                    <TableHead className="text-[10px] font-bold uppercase sm:text-xs">
                      Fecha
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase sm:text-xs">
                      Tipo de Registro
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase sm:text-xs">
                      Entrada
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase sm:text-xs">
                      Salida
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase sm:text-xs">
                      Horas Trabajadas
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase sm:text-xs">
                      Estado
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {asistenciasFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-8 text-center text-gray-500"
                      >
                        No hay registros en el período seleccionado
                      </TableCell>
                    </TableRow>
                  ) : (
                    asistenciasFiltradas.map((a) => {
                      const esFalta =
                        a.id_tipo_permiso === 1 || a.id_tipo_permiso === 3;

                      return (
                        <TableRow key={a.id}>
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
                              <TableCell className="text-xs font-semibold text-red-600 sm:text-sm">
                                {a.hora_salida}
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm">
                                {a.horas_trabajadas}
                              </TableCell>
                            </>
                          ) : (
                            <TableCell
                              colSpan={3}
                              className="text-center text-xs text-gray-500 sm:text-sm"
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

  // Header por nivel: fondos grises hairline (sin gradientes slate)
  const getHeaderClass = (nivel) => {
    if (nivel === 0) {
      return "bg-gray-50 text-gray-800";
    } else if (nivel === 1) {
      return "bg-gray-50/60 text-gray-700";
    } else {
      return "bg-white text-gray-600";
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
                )} flex cursor-pointer items-center justify-between border-b border-gray-200 px-4 py-2.5 transition-colors hover:bg-gray-100`}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <ChevronRight
                    className={`h-4 w-4 transition-transform ${
                      estaAbierto ? "rotate-90" : ""
                    }`}
                  />
                  <span className="text-[12.5px] font-bold">{clave}</span>
                </div>
                <div className="flex items-center gap-2 text-[10.5px] text-gray-500 sm:gap-4">
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
                          <TableHead className="text-[10px] font-bold uppercase sm:text-xs">
                            Fecha
                          </TableHead>
                          <TableHead className="text-[10px] font-bold uppercase sm:text-xs">
                            Tipo
                          </TableHead>
                          <TableHead className="text-[10px] font-bold uppercase sm:text-xs">
                            Entrada
                          </TableHead>
                          <TableHead className="text-[10px] font-bold uppercase sm:text-xs">
                            Salida
                          </TableHead>
                          <TableHead className="text-[10px] font-bold uppercase sm:text-xs">
                            Horas
                          </TableHead>
                          <TableHead className="text-[10px] font-bold uppercase sm:text-xs">
                            Estado
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contenido.map((a) => {
                          const esFalta =
                            a.id_tipo_permiso === 1 || a.id_tipo_permiso === 3;

                          return (
                            <TableRow key={a.id}>
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
                                  <TableCell className="text-xs font-semibold text-red-600 sm:text-sm">
                                    {a.hora_salida}
                                  </TableCell>
                                  <TableCell className="text-xs sm:text-sm">
                                    {a.horas_trabajadas}
                                  </TableCell>
                                </>
                              ) : (
                                <TableCell
                                  colSpan={3}
                                  className="text-center text-xs text-gray-500 sm:text-sm"
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
                )} flex cursor-pointer items-center justify-between border-b border-gray-200 px-4 py-2.5 transition-colors hover:bg-gray-100`}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <ChevronRight
                    className={`h-4 w-4 transition-transform ${
                      estaAbierto ? "rotate-90" : ""
                    }`}
                  />
                  <span className="text-[12.5px] font-bold">{clave}</span>
                </div>
                <div className="flex items-center gap-2 text-[10.5px] text-gray-500 sm:gap-4">
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
