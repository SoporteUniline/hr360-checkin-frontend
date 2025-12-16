"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
 * Componente para mostrar las entradas y salidas del empleado
 * Relacionado con: src/app/panel/panel-empleado/page.jsx
 */
export default function PanelEmpleadoEntradasSalidas({ datosEmpleado }) {
  if (!datosEmpleado) return null;

  const promedios = datosEmpleado.entradas_salidas?.promedios || {};
  const registros = datosEmpleado.entradas_salidas?.registros || [];

  const [filtroDesde, setFiltroDesde] = useState("");
  const [filtroHasta, setFiltroHasta] = useState("");
  const [agrupar, setAgrupar] = useState("");

  const registrosFiltrados = useMemo(() => {
    return registros.filter((r) => {
      if (filtroDesde && r.fecha < filtroDesde) return false;
      if (filtroHasta && r.fecha > filtroHasta) return false;
      return true;
    });
  }, [registros, filtroDesde, filtroHasta]);

  const limpiarFiltros = () => {
    setFiltroDesde("");
    setFiltroHasta("");
    setAgrupar("");
  };

  // Calcular tiempo trabajado
  const calcularTiempoTrabajado = (entrada, salida) => {
    if (entrada === "-" || salida === "-") return "-";
    
    try {
      const [he, me] = entrada.split(":");
      const [hs, ms] = salida.split(":");
      const minEntrada = parseInt(he) * 60 + parseInt(me);
      const minSalida = parseInt(hs) * 60 + parseInt(ms);
      const diff = minSalida - minEntrada;
      
      const h = Math.floor(diff / 60);
      const m = diff % 60;
      return `${h}h ${m}m`;
    } catch (e) {
      return "-";
    }
  };

  // Calcular totales
  let totalMinutos = 0;
  registrosFiltrados.forEach((r) => {
    if (r.hora_entrada !== "-" && r.hora_salida !== "-") {
      const tiempo = calcularTiempoTrabajado(r.hora_entrada, r.hora_salida);
      if (tiempo !== "-") {
        const [h, m] = tiempo.replace("h", "").replace("m", "").trim().split(" ");
        totalMinutos += parseInt(h || 0) * 60 + parseInt(m || 0);
      }
    }
  });

  const horasAcumuladas = `${Math.floor(totalMinutos / 60)}h ${totalMinutos % 60}m`;

  return (
    <div>
      <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
        🕐 Registro de Entradas y Salidas
      </h3>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
        <Card className="overflow-hidden">
          <CardContent className="p-3 sm:p-4 md:p-5 text-center min-w-0">
            <div className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-900 mb-1 break-words overflow-hidden">
              {registrosFiltrados.length}
            </div>
            <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide break-words">
              Total registros
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-3 sm:p-4 md:p-5 text-center min-w-0">
            <div className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-900 mb-1 break-words overflow-hidden whitespace-nowrap">
              {promedios.entrada_promedio || "00:00"}
            </div>
            <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide break-words">
              Entrada promedio
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-3 sm:p-4 md:p-5 text-center min-w-0">
            <div className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-900 mb-1 break-words overflow-hidden whitespace-nowrap">
              {promedios.salida_promedio || "00:00"}
            </div>
            <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide break-words">
              Salida promedio
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-3 sm:p-4 md:p-5 text-center min-w-0">
            <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-extrabold text-gray-900 mb-1 break-words overflow-hidden leading-tight">
              {horasAcumuladas}
            </div>
            <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wide break-words">
              Tiempo acumulado
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="mb-3 sm:mb-4">
        <CardContent className="p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">
                AGRUPAR POR:
              </label>
              <Select value={agrupar || "sin-agrupar"} onValueChange={(v) => setAgrupar(v === "sin-agrupar" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin agrupar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sin-agrupar">Sin agrupar</SelectItem>
                  <SelectItem value="anio">Año</SelectItem>
                  <SelectItem value="mes">Mes</SelectItem>
                  <SelectItem value="anio-mes">Año + Mes</SelectItem>
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
            <div className="min-w-[800px] sm:min-w-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px] sm:text-xs font-bold uppercase">Fecha</TableHead>
                    <TableHead className="text-[10px] sm:text-xs font-bold uppercase">Hora Entrada</TableHead>
                    <TableHead className="text-[10px] sm:text-xs font-bold uppercase">Hora Salida</TableHead>
                    <TableHead className="text-[10px] sm:text-xs font-bold uppercase hidden sm:table-cell">Entrada Corregida</TableHead>
                    <TableHead className="text-[10px] sm:text-xs font-bold uppercase hidden sm:table-cell">Salida Corregida</TableHead>
                    <TableHead className="text-[10px] sm:text-xs font-bold uppercase">Tiempo Trabajado</TableHead>
                    <TableHead className="text-[10px] sm:text-xs font-bold uppercase">Estado</TableHead>
                  </TableRow>
                </TableHeader>
            <TableBody>
              {registrosFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No hay registros en el período seleccionado
                  </TableCell>
                </TableRow>
              ) : (
                registrosFiltrados.map((r) => {
                  const tiempoTrabajado = calcularTiempoTrabajado(
                    r.hora_entrada,
                    r.hora_salida
                  );

                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-semibold text-xs sm:text-sm">
                        {formatearFecha(r.fecha)}
                      </TableCell>
                      <TableCell className="text-green-600 font-bold text-xs sm:text-sm">
                        {r.hora_entrada}
                      </TableCell>
                      <TableCell className="text-red-600 font-bold text-xs sm:text-sm">
                        {r.hora_salida}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs sm:text-sm">{r.entrada_corregida}</TableCell>
                      <TableCell className="hidden sm:table-cell text-xs sm:text-sm">{r.salida_corregida}</TableCell>
                      <TableCell className="font-semibold text-xs sm:text-sm">{tiempoTrabajado}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] sm:text-xs">{r.estado}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
            </div>
          </div>
        </CardContent>
      </Card>
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

