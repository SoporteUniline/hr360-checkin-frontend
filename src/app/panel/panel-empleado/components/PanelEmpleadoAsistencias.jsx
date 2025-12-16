"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState, useMemo } from "react";
import { ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
      const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
      return fecha.getFullYear() + "-" + String(fecha.getMonth() + 1).padStart(2, "0") + " - " + meses[fecha.getMonth()];
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
        grupos[clave] = agruparAsistenciasMultinivel(grupos[clave], niveles, nivelActual + 1);
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
      return grupo.filter((a) => a.id_tipo_permiso !== 1 && a.id_tipo_permiso !== 3).length;
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
    return agruparAsistenciasMultinivel(asistenciasFiltradas, nivelesAgrupacion, 0);
  }, [asistenciasFiltradas, nivelesAgrupacion]);

  const limpiarFiltros = () => {
    setFiltroDesde("");
    setFiltroHasta("");
    setAgrupar1("");
    setAgrupar2("");
    setAgrupar3("");
  };

  const trabajados = asistenciasFiltradas.filter(
    (a) => a.id_tipo_permiso !== 1 && a.id_tipo_permiso !== 3
  ).length;
  const faltas = asistenciasFiltradas.filter(
    (a) => a.id_tipo_permiso === 1 || a.id_tipo_permiso === 3
  ).length;
  const retardos = asistenciasFiltradas.filter((a) => a.estado === "Retardo").length;
  const porcentaje =
    asistenciasFiltradas.length > 0
      ? Math.round((trabajados / asistenciasFiltradas.length) * 100)
      : 0;

  return (
    <div>
      <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
        ✅ Registro de Asistencias
      </h3>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
        <Card className="overflow-hidden">
          <CardContent className="p-3 sm:p-4 md:p-5 text-center min-w-0">
            <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-1 break-words overflow-hidden">
              {porcentaje}%
            </div>
            <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide break-words">
              % Asistencia
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-3 sm:p-4 md:p-5 text-center min-w-0">
            <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-1 break-words overflow-hidden">
              {trabajados}
            </div>
            <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide break-words">
              Días trabajados
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-3 sm:p-4 md:p-5 text-center min-w-0">
            <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-1 break-words overflow-hidden">
              {faltas}
            </div>
            <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide break-words">
              Faltas
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-3 sm:p-4 md:p-5 text-center min-w-0">
            <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-1 break-words overflow-hidden">
              {retardos}
            </div>
            <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide break-words">
              Retardos
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de progreso */}
      <Card className="mb-4 sm:mb-6">
        <CardContent className="p-3 sm:p-4">
          <div className="flex justify-between mb-2 text-xs sm:text-sm font-semibold">
            <span>Asistencia del período</span>
            <span>{porcentaje}%</span>
          </div>
          <div className="h-2 sm:h-2.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all"
              style={{ width: `${porcentaje}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Análisis por tipo */}
      {tiposAnalisis.length > 0 && (
        <div className="mb-4 sm:mb-6">
          <h4 className="text-xs sm:text-sm font-bold text-gray-900 mb-2 sm:mb-3">
            📊 Análisis por Tipo de Registro
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
            {tiposAnalisis.map((tipo) => {
              const esFalta = tipo.id === 1 || tipo.id === 3;
              return (
                <Card key={tipo.id} className="overflow-hidden">
                  <CardContent className="p-3 sm:p-4 text-center min-w-0">
                    <div
                      className={`text-xl sm:text-2xl font-extrabold mb-1 break-words overflow-hidden ${
                        esFalta ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {tipo.total}
                    </div>
                    <div className="text-[10px] sm:text-xs font-semibold text-gray-600 mb-1 break-words">
                      {tipo.nombre}
                    </div>
                    <div className="text-[9px] sm:text-xs text-gray-500 break-words">
                      {esFalta ? "❌ No cuenta" : "✅ Cuenta como asistencia"}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Filtros */}
      <Card className="mb-3 sm:mb-4">
        <CardContent className="p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">
                AGRUPAR 1:
              </label>
              <Select value={agrupar1 || "sin-agrupar"} onValueChange={(v) => setAgrupar1(v === "sin-agrupar" ? "" : v)}>
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
              <label className="text-xs font-bold text-gray-500 block mb-1">
                AGRUPAR 2:
              </label>
              <Select value={agrupar2 || "ninguno"} onValueChange={(v) => setAgrupar2(v === "ninguno" ? "" : v)}>
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
              <label className="text-xs font-bold text-gray-500 block mb-1">
                AGRUPAR 3:
              </label>
              <Select value={agrupar3 || "ninguno"} onValueChange={(v) => setAgrupar3(v === "ninguno" ? "" : v)}>
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
          {datosAgrupados ? (
            <RenderizarGruposAsistencias
              grupos={datosAgrupados}
              niveles={nivelesAgrupacion}
              nivelActual={0}
            />
          ) : (
            <div className="overflow-x-auto -mx-2 sm:-mx-4 md:mx-0">
              <div className="min-w-[700px] sm:min-w-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px] sm:text-xs font-bold uppercase">Fecha</TableHead>
                      <TableHead className="text-[10px] sm:text-xs font-bold uppercase">Tipo de Registro</TableHead>
                      <TableHead className="text-[10px] sm:text-xs font-bold uppercase">Entrada</TableHead>
                      <TableHead className="text-[10px] sm:text-xs font-bold uppercase">Salida</TableHead>
                      <TableHead className="text-[10px] sm:text-xs font-bold uppercase">Horas Trabajadas</TableHead>
                      <TableHead className="text-[10px] sm:text-xs font-bold uppercase">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {asistenciasFiltradas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          No hay registros en el período seleccionado
                        </TableCell>
                      </TableRow>
                    ) : (
                      asistenciasFiltradas.map((a) => {
                        const esFalta = a.id_tipo_permiso === 1 || a.id_tipo_permiso === 3;
                        const badgeClass =
                          a.estado === "Completo"
                            ? "bg-green-100 text-green-800"
                            : esFalta
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800";
                        const icono =
                          a.estado === "Completo" ? "✅" : esFalta ? "❌" : "⚠️";

                        return (
                          <TableRow key={a.id}>
                            <TableCell className="text-xs sm:text-sm">{formatearFecha(a.fecha)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] sm:text-xs">{a.tipo_permiso}</Badge>
                            </TableCell>
                            {a.hora_entrada && a.hora_salida ? (
                              <>
                                <TableCell className="text-green-600 font-bold text-xs sm:text-sm">
                                  {a.hora_entrada}
                                </TableCell>
                                <TableCell className="text-red-600 font-bold text-xs sm:text-sm">
                                  {a.hora_salida}
                                </TableCell>
                                <TableCell className="text-xs sm:text-sm">{a.horas_trabajadas}</TableCell>
                              </>
                            ) : (
                              <TableCell colSpan={3} className="text-center text-gray-500 text-xs sm:text-sm">
                                Sin registro
                              </TableCell>
                            )}
                            <TableCell>
                              <Badge className={`${badgeClass} text-[10px] sm:text-xs`}>
                                {icono} {a.estado}
                              </Badge>
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
        </CardContent>
      </Card>
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
  
  // Determinar clase CSS según el nivel
  const getHeaderClass = (nivel) => {
    if (nivel === 0) {
      return "bg-gradient-to-r from-[#37495E] to-[#2c3a4a] text-white";
    } else if (nivel === 1) {
      return "bg-gradient-to-r from-[#4a5d75] to-[#3d4f63] text-white";
    } else {
      return "bg-gradient-to-r from-[#5c708a] to-[#4e6276] text-white";
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
      return grupo.filter((a) => a.id_tipo_permiso !== 1 && a.id_tipo_permiso !== 3).length;
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
          const trabajados = contenido.filter((a) => a.id_tipo_permiso !== 1 && a.id_tipo_permiso !== 3).length;
          const faltas = contenido.filter((a) => a.id_tipo_permiso === 1 || a.id_tipo_permiso === 3).length;
          const porcentaje = contenido.length > 0 ? Math.round((trabajados / contenido.length) * 100) : 0;

          return (
            <Collapsible key={grupoId} open={estaAbierto} onOpenChange={() => toggleGrupo(grupoId)}>
              <CollapsibleTrigger className={`w-full ${getHeaderClass(nivelActual)} px-4 py-3 sm:px-5 sm:py-4 flex items-center justify-between hover:opacity-90 transition-opacity cursor-pointer`}>
                <div className="flex items-center gap-2 sm:gap-3">
                  <ChevronRight className={`h-4 w-4 transition-transform ${estaAbierto ? "rotate-90" : ""}`} />
                  <span className="font-bold text-sm sm:text-base">{clave}</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm opacity-95">
                  <span>{contenido.length} registros</span>
                  <span>•</span>
                  <span>{trabajados} trabajados</span>
                  <span>•</span>
                  <span>{faltas} faltas</span>
                  <span>•</span>
                  <span>{porcentaje}% asistencia</span>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="overflow-x-auto -mx-2 sm:-mx-4 md:mx-0">
                  <div className="min-w-[700px] sm:min-w-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-[10px] sm:text-xs font-bold uppercase">Fecha</TableHead>
                          <TableHead className="text-[10px] sm:text-xs font-bold uppercase">Tipo</TableHead>
                          <TableHead className="text-[10px] sm:text-xs font-bold uppercase">Entrada</TableHead>
                          <TableHead className="text-[10px] sm:text-xs font-bold uppercase">Salida</TableHead>
                          <TableHead className="text-[10px] sm:text-xs font-bold uppercase">Horas</TableHead>
                          <TableHead className="text-[10px] sm:text-xs font-bold uppercase">Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contenido.map((a) => {
                          const esFalta = a.id_tipo_permiso === 1 || a.id_tipo_permiso === 3;
                          const badgeClass =
                            a.estado === "Completo"
                              ? "bg-green-100 text-green-800"
                              : esFalta
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800";
                          const icono = a.estado === "Completo" ? "✅" : esFalta ? "❌" : "⚠️";

                          return (
                            <TableRow key={a.id}>
                              <TableCell className="text-xs sm:text-sm">{formatearFecha(a.fecha)}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px] sm:text-xs">{a.tipo_permiso}</Badge>
                              </TableCell>
                              {a.hora_entrada && a.hora_salida ? (
                                <>
                                  <TableCell className="text-green-600 font-bold text-xs sm:text-sm">
                                    {a.hora_entrada}
                                  </TableCell>
                                  <TableCell className="text-red-600 font-bold text-xs sm:text-sm">
                                    {a.hora_salida}
                                  </TableCell>
                                  <TableCell className="text-xs sm:text-sm">{a.horas_trabajadas}</TableCell>
                                </>
                              ) : (
                                <TableCell colSpan={3} className="text-center text-gray-500 text-xs sm:text-sm">
                                  Sin registro
                                </TableCell>
                              )}
                              <TableCell>
                                <Badge className={`${badgeClass} text-[10px] sm:text-xs`}>
                                  {icono} {a.estado}
                                </Badge>
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
          const porcentaje = todosRegistros > 0 ? Math.round((trabajados / todosRegistros) * 100) : 0;

          return (
            <Collapsible key={grupoId} open={estaAbierto} onOpenChange={() => toggleGrupo(grupoId)}>
              <CollapsibleTrigger className={`w-full ${getHeaderClass(nivelActual)} px-4 py-3 sm:px-5 sm:py-4 flex items-center justify-between hover:opacity-90 transition-opacity cursor-pointer`}>
                <div className="flex items-center gap-2 sm:gap-3">
                  <ChevronRight className={`h-4 w-4 transition-transform ${estaAbierto ? "rotate-90" : ""}`} />
                  <span className="font-bold text-sm sm:text-base">{clave}</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm opacity-95">
                  <span>{todosRegistros} registros</span>
                  <span>•</span>
                  <span>{trabajados} trabajados</span>
                  <span>•</span>
                  <span>{faltas} faltas</span>
                  <span>•</span>
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

