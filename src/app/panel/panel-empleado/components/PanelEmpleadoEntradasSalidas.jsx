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
import { Clock } from "lucide-react";
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
        const [h, m] = tiempo
          .replace("h", "")
          .replace("m", "")
          .trim()
          .split(" ");
        totalMinutos += parseInt(h || 0) * 60 + parseInt(m || 0);
      }
    }
  });

  const horasAcumuladas = `${Math.floor(totalMinutos / 60)}h ${
    totalMinutos % 60
  }m`;

  return (
    <div>
      <h3 className="mb-3 flex items-center gap-1.5 text-[12.5px] font-bold text-gray-900">
        <Clock className="h-3.5 w-3.5 text-[#2563eb]" />
        Registro de entradas y salidas
      </h3>

      {/* Mini-KPIs homologados */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <MiniKpi label="Total registros" value={registrosFiltrados.length} />
        <MiniKpi
          label="Entrada promedio"
          value={promedios.entrada_promedio || "00:00"}
        />
        <MiniKpi
          label="Salida promedio"
          value={promedios.salida_promedio || "00:00"}
        />
        <MiniKpi label="Tiempo acumulado" value={horasAcumuladas} />
      </div>

      {/* Filtros */}
      <div className="mb-3 rounded-[10px] border border-gray-200 bg-white p-3 sm:mb-4 sm:p-4">
        <div className="mb-3 grid grid-cols-1 gap-3 sm:mb-4 sm:grid-cols-3 sm:gap-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-500">
              AGRUPAR POR:
            </label>
            <Select
              value={agrupar || "sin-agrupar"}
              onValueChange={(v) => setAgrupar(v === "sin-agrupar" ? "" : v)}
            >
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
          <div className="min-w-[800px] sm:min-w-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] font-bold uppercase sm:text-xs">
                    Fecha
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase sm:text-xs">
                    Hora Entrada
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase sm:text-xs">
                    Hora Salida
                  </TableHead>
                  <TableHead className="hidden text-[10px] font-bold uppercase sm:table-cell sm:text-xs">
                    Entrada Corregida
                  </TableHead>
                  <TableHead className="hidden text-[10px] font-bold uppercase sm:table-cell sm:text-xs">
                    Salida Corregida
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase sm:text-xs">
                    Tiempo Trabajado
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase sm:text-xs">
                    Estado
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-8 text-center text-gray-500"
                    >
                      No hay registros en el período seleccionado
                    </TableCell>
                  </TableRow>
                ) : (
                  registrosFiltrados.map((r) => {
                    const tiempoTrabajado = calcularTiempoTrabajado(
                      r.hora_entrada,
                      r.hora_salida,
                    );

                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs font-semibold sm:text-sm">
                          {formatearFecha(r.fecha)}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-emerald-700 sm:text-sm">
                          {r.hora_entrada}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-red-600 sm:text-sm">
                          {r.hora_salida}
                        </TableCell>
                        <TableCell className="hidden text-xs sm:table-cell sm:text-sm">
                          {r.entrada_corregida}
                        </TableCell>
                        <TableCell className="hidden text-xs sm:table-cell sm:text-sm">
                          {r.salida_corregida}
                        </TableCell>
                        <TableCell className="text-xs font-semibold sm:text-sm">
                          {tiempoTrabajado}
                        </TableCell>
                        <TableCell>
                          <span className="inline-block rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-[10.5px] font-bold text-gray-600">
                            {r.estado}
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
      <div className="whitespace-nowrap text-lg font-extrabold tabular-nums text-gray-900">
        {value}
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
