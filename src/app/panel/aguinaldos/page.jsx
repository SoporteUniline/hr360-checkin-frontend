"use client";

/**
 * Página de Panel para "Aguinaldos"
 * - Relación:
 *   - Navegación: `src/components/Sidebar/nav-main.jsx`
 *   - API cliente: `src/lib/aguinaldosApi.js`
 *   - Hook datos: `src/hooks/useAguinaldosData.js`
 *   - Hook empleados: `src/hooks/useEmpleadosActivosAguinaldo.js`
 */

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import TablePagination from "@/components/TablePagination";
import useAguinaldosData from "@/hooks/useAguinaldosData";
import useEmpleadosActivosAguinaldo from "@/hooks/useEmpleadosActivosAguinaldo";
import { aguinaldosApi } from "@/lib/aguinaldosApi";
import { Download, Plus, Search, Trash2, Eye, Calculator } from "lucide-react";
import dayjs from "dayjs";
import { jsPDF } from "jspdf";
import AguinaldoViewDialog from "./AguinaldoViewDialog";
import CambiarEstadoDialog from "./CambiarEstadoDialog";
import styles from "./aguinaldos-theme.module.css";

export default function PageAguinaldos() {
  const { dataUser } = useAuth();
  const idEmpresa = dataUser?.id_empresa;

  // Estado tabs
  const [tab, setTab] = useState("tabla");
  const [loading, setLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");

  // Estado buscador
  const [search, setSearch] = useState("");
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [hoveredSuggestionIndex, setHoveredSuggestionIndex] = useState(-1);
  const [activeSearchBox, setActiveSearchBox] = useState(null);

  // Paginación
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Filtros extra
  const [estatus, setEstatus] = useState("");
  const [añoFiscal, setAñoFiscal] = useState("");

  // Datos listados
  const { data, isLoading, mutate } = useAguinaldosData({
    idEmpresa,
    page,
    limit,
    search,
    estatus,
    año_fiscal: añoFiscal,
  });
  const calculos = data?.data || [];
  const total = data?.total || 0;

  // Sugerencias de empleados
  const empleadosSugResp = useEmpleadosActivosAguinaldo({ empresa: idEmpresa, q: search, limit: 8 });
  const sugerencias = useMemo(() => empleadosSugResp?.data || [], [empleadosSugResp?.data]);

  const handleSelectEmpleadoSugerencia = (emp) => {
    if (!emp) return;
    setSearch(emp.nombre_completo || "");
    setIsSuggestionsOpen(false);
    setPage(1);
  };

  const limpiarFiltros = () => {
    setSearch("");
    setEstatus("");
    setAñoFiscal("");
    setPage(1);
  };

  // ---------------- Calculadora Masiva ----------------
  const [fechaCorte, setFechaCorte] = useState(dayjs().format("YYYY-MM-DD"));
  const [añoFiscalCalculo, setAñoFiscalCalculo] = useState(dayjs().year().toString());
  const [observaciones, setObservaciones] = useState("");
  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState([]);
  const [empleadosCargados, setEmpleadosCargados] = useState([]);
  const [busquedaEmpleados, setBusquedaEmpleados] = useState("");
  const [selectAll, setSelectAll] = useState(false);
  const [resultadoCalculo, setResultadoCalculo] = useState(null);
  const [guardable, setGuardable] = useState(false);
  const [deleteRow, setDeleteRow] = useState(null);
  const [viewRow, setViewRow] = useState(null);
  const [estadoDialogOpen, setEstadoDialogOpen] = useState(false);
  const [calculoParaCambiarEstado, setCalculoParaCambiarEstado] = useState(null);

  const resetFormulario = () => {
    setFechaCorte(dayjs().format("YYYY-MM-DD"));
    setAñoFiscalCalculo(dayjs().year().toString());
    setObservaciones("");
    setEmpleadosSeleccionados([]);
    setEmpleadosCargados([]);
    setSelectAll(false);
    setResultadoCalculo(null);
    setGuardable(false);
  };

  // Cargar empleados cuando se abre el tab de calculadora
  useEffect(() => {
    if (tab === "calculadora" && idEmpresa) {
      cargarEmpleados();
    }
  }, [tab, idEmpresa]);

  const cargarEmpleados = async () => {
    try {
      const resp = await aguinaldosApi.empleadosActivos({ empresa: idEmpresa, q: "", limit: 1000 });
      setEmpleadosCargados(resp?.data || []);
    } catch (error) {
      console.error("Error al cargar empleados:", error);
    }
  };

  // Filtrar empleados según búsqueda
  const empleadosFiltrados = useMemo(() => {
    return empleadosCargados.filter((emp) => {
      if (!busquedaEmpleados.trim()) return true;
      const busqueda = busquedaEmpleados.toLowerCase();
      return (
        emp.nombre_completo?.toLowerCase().includes(busqueda) ||
        emp.puesto?.toLowerCase().includes(busqueda) ||
        emp.departamento?.toLowerCase().includes(busqueda)
      );
    });
  }, [empleadosCargados, busquedaEmpleados]);

  // Actualizar selectAll cuando cambian los empleados filtrados o seleccionados
  useEffect(() => {
    if (empleadosFiltrados.length === 0) {
      setSelectAll(false);
      return;
    }
    const todosSeleccionados = empleadosFiltrados.every((emp) =>
      empleadosSeleccionados.some((sel) => sel.id === emp.id)
    );
    setSelectAll(todosSeleccionados);
  }, [empleadosFiltrados, empleadosSeleccionados]);

  const toggleSelectAll = () => {
    const nuevoEstado = !selectAll;
    setSelectAll(nuevoEstado);
    if (nuevoEstado) {
      // Seleccionar solo los empleados filtrados (visibles)
      const idsFiltrados = new Set(empleadosFiltrados.map((e) => e.id));
      const nuevosSeleccionados = [
        ...empleadosSeleccionados.filter((e) => !idsFiltrados.has(e.id)), // Mantener los que no están en la lista filtrada
        ...empleadosFiltrados.map((emp) => {
          const existente = empleadosSeleccionados.find((e) => e.id === emp.id);
          return existente || emp;
        }),
      ];
      setEmpleadosSeleccionados(nuevosSeleccionados);
    } else {
      // Deseleccionar solo los empleados filtrados (visibles)
      const idsFiltrados = new Set(empleadosFiltrados.map((e) => e.id));
      setEmpleadosSeleccionados(empleadosSeleccionados.filter((e) => !idsFiltrados.has(e.id)));
    }
  };

  const toggleEmpleado = (emp) => {
    const existe = empleadosSeleccionados.find((e) => e.id === emp.id);
    if (existe) {
      setEmpleadosSeleccionados(empleadosSeleccionados.filter((e) => e.id !== emp.id));
    } else {
      setEmpleadosSeleccionados([...empleadosSeleccionados, emp]);
    }
  };

  const actualizarSalario = (id, valor) => {
    setEmpleadosSeleccionados(
      empleadosSeleccionados.map((e) => (e.id === id ? { ...e, salario_diario: parseFloat(valor) || 0 } : e))
    );
  };

  const actualizarDiasAguinaldo = (id, valor) => {
    setEmpleadosSeleccionados(
      empleadosSeleccionados.map((e) => (e.id === id ? { ...e, dias_aguinaldo: parseFloat(valor) || 15 } : e))
    );
  };

  const actualizarDiasNoTrabajados = (id, valor) => {
    setEmpleadosSeleccionados(
      empleadosSeleccionados.map((e) => (e.id === id ? { ...e, dias_no_trabajados: parseFloat(valor) || 0 } : e))
    );
  };

  const calcularAguinaldos = async () => {
    if (empleadosSeleccionados.length === 0) {
      setAlertMsg("⚠️ Debes seleccionar al menos un empleado");
      return;
    }

    if (!fechaCorte) {
      setAlertMsg("⚠️ Debes especificar la fecha de corte");
      return;
    }

    if (!añoFiscalCalculo) {
      setAlertMsg("⚠️ Debes especificar el año fiscal");
      return;
    }

    setLoading(true);
    setAlertMsg("");

    try {
      const añoFiscalNum = parseInt(añoFiscalCalculo);
      const fechaFinAñoFiscal = dayjs(`${añoFiscalNum}-12-31`).endOf("day");
      const fechaCorteDate = dayjs(fechaCorte);

      // Validar que los empleados seleccionados hayan trabajado durante el año fiscal
      const empleadosValidos = [];
      const empleadosExcluidos = [];

      empleadosSeleccionados.forEach((e) => {
        const fechaIngreso = dayjs(e.fecha_ingreso);
        // Si ingresó después del final del año fiscal o después de la fecha de corte, no aplica
        if (fechaIngreso.isAfter(fechaFinAñoFiscal) || fechaIngreso.isAfter(fechaCorteDate)) {
          empleadosExcluidos.push(e.nombre_completo || e.nombre || `Empleado ${e.id}`);
        } else {
          empleadosValidos.push(e);
        }
      });

      if (empleadosValidos.length === 0) {
        setAlertMsg(
          `⚠️ Ninguno de los empleados seleccionados trabajó durante el año fiscal ${añoFiscalNum}. Verifica las fechas de ingreso.`
        );
        setLoading(false);
        return;
      }

      if (empleadosExcluidos.length > 0) {
        setAlertMsg(
          `ℹ️ ${empleadosExcluidos.length} empleado(s) fueron excluidos porque no trabajaron durante el año fiscal ${añoFiscalNum}: ${empleadosExcluidos.join(", ")}`
        );
      }

      const payload = {
        empleados_ids: empleadosValidos.map((e) => ({
          id_empleado: e.id,
          salario_diario: e.salario_diario || e.salario_diario || 0,
          dias_aguinaldo: e.dias_aguinaldo || e.aguinaldo_dias || 15,
          dias_no_trabajados: e.dias_no_trabajados || 0,
        })),
        fecha_corte: fechaCorte,
        año_fiscal: añoFiscalNum,
        observaciones: observaciones,
      };

      const res = await aguinaldosApi.calcular(payload);
      setResultadoCalculo(res);
      setGuardable(true);
      if (empleadosExcluidos.length === 0) {
        setAlertMsg("✅ Cálculo realizado correctamente. Revisa el detalle y genera el PDF si lo requieres.");
      } else {
        setAlertMsg(
          `✅ Cálculo realizado para ${res.total_empleados} empleado(s). ${empleadosExcluidos.length} empleado(s) fueron excluidos por no trabajar durante el año fiscal ${añoFiscalNum}.`
        );
      }
    } catch (error) {
      setAlertMsg("❌ Error al calcular: " + (error?.message || "Error desconocido"));
    } finally {
      setLoading(false);
    }
  };

  const guardarCalculo = async () => {
    if (!resultadoCalculo) return;

    setLoading(true);
    try {
      // Obtener el correo del usuario logueado para guardarlo como calculado_por
      const calculadoPor = dataUser?.correo || dataUser?.email || "Sistema";
      
      const payloadConCalculadoPor = {
        ...resultadoCalculo,
        calculado_por: calculadoPor,
      };

      const res = await aguinaldosApi.guardar(payloadConCalculadoPor);
      setGuardable(false);
      await mutate();
      setAlertMsg("✅ Cálculo guardado exitosamente. Puedes verlo en la pestaña de 'Cálculos Guardados'.");
      setTab("tabla");
      resetFormulario();
    } catch (error) {
      setAlertMsg("❌ Error al guardar: " + (error?.message || "Error desconocido"));
    } finally {
      setLoading(false);
    }
  };

  const generarPDFMasivo = () => {
    if (!resultadoCalculo) return;

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
    const margenIzq = 15;
    const margenDer = 195;
    let y = 10;

    // Header
    doc.setFillColor(55, 73, 94);
    doc.rect(0, 0, 220, 35, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.text("HR360", margenIzq, 20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Sistema de Gestión de Capital Humano", margenIzq, 26);
    doc.setFontSize(9);
    doc.text("Fecha: " + new Date().toLocaleDateString("es-MX"), margenDer, 20, { align: "right" });

    y = 45;
    doc.setTextColor(55, 73, 94);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("NÓMINA DE AGUINALDOS " + resultadoCalculo.año_fiscal, 105, y, { align: "center" });

    y += 10;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Fecha de Corte: " + dayjs(resultadoCalculo.fecha_corte).format("DD/MM/YYYY"), margenIzq, y);
    doc.text("Total Empleados: " + resultadoCalculo.total_empleados, margenDer, y, { align: "right" });

    y += 8;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1);
    doc.rect(margenIzq, y, margenDer - margenIzq, 10);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL GENERAL A PAGAR:", margenIzq + 2, y + 6.5);
    doc.setFontSize(14);
    doc.text(
      "$" + parseFloat(resultadoCalculo.total_general).toLocaleString("es-MX", { minimumFractionDigits: 2 }) + " MXN",
      margenDer - 2,
      y + 6.5,
      { align: "right" }
    );

    y += 14;

    // Tabla de empleados (mejorado, sin línea innecesaria)
    y += 12;
    doc.setTextColor(55, 73, 94);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("DETALLE POR EMPLEADO", margenIzq, y);

    y += 8;
    // Encabezado de tabla con fondo azul
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.setFillColor(55, 73, 94);
    doc.rect(margenIzq, y - 4, margenDer - margenIzq, 6, "F");
    
    // Encabezados de tabla
    doc.text("#", margenIzq + 2, y);
    doc.text("Empleado", margenIzq + 8, y);
    doc.text("Puesto", margenIzq + 50, y);
    doc.text("F. Ingreso", margenIzq + 75, y);
    doc.text("Años", margenIzq + 95, y);
    doc.text("Salario", margenIzq + 105, y);
    doc.text("Días", margenIzq + 125, y);
    doc.text("Tipo", margenIzq + 135, y);
    doc.text("Monto", margenDer - 2, y, { align: "right" });

    y += 4;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(margenIzq, y, margenDer, y);
    y += 3;

    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);

    resultadoCalculo.resultados.forEach((emp, idx) => {
      if (y > 270) {
        // Nueva página si es necesario
        doc.addPage();
        y = 20;
      }

      doc.text((idx + 1).toString(), margenIzq + 2, y);
      doc.text(emp.nombre_completo.substring(0, 25), margenIzq + 8, y);
      doc.text((emp.puesto || "N/A").substring(0, 15), margenIzq + 50, y);
      doc.text(dayjs(emp.fecha_ingreso).format("DD/MM/YYYY"), margenIzq + 75, y);
      doc.text(parseFloat(emp.años_trabajados).toFixed(2), margenIzq + 95, y);
      doc.text("$" + parseFloat(emp.salario_diario).toLocaleString("es-MX", { minimumFractionDigits: 2 }), margenIzq + 105, y);
      doc.text(parseFloat(emp.dias_aguinaldo_calculado).toFixed(2), margenIzq + 125, y);
      doc.text(emp.es_proporcional ? "Prop." : "Comp.", margenIzq + 135, y);
      doc.setFont("helvetica", "bold");
      doc.text("$" + parseFloat(emp.monto_aguinaldo).toLocaleString("es-MX", { minimumFractionDigits: 2 }), margenDer - 2, y, { align: "right" });
      doc.setFont("helvetica", "normal");

      y += 5;
      // Línea separadora más sutil entre filas
      if (idx < resultadoCalculo.resultados.length - 1) {
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.3);
        doc.line(margenIzq, y, margenDer, y);
        y += 2;
      }
    });

    const nombreArchivo = "Nomina_Aguinaldos_" + resultadoCalculo.año_fiscal + ".pdf";
    doc.save(nombreArchivo);
  };

  const eliminarCalculo = (row) => {
    setDeleteRow(row);
  };

  const confirmDelete = async () => {
    if (!deleteRow) return;
    await aguinaldosApi.eliminar(deleteRow.id_calculo || deleteRow.id);
    setDeleteRow(null);
    await mutate();
  };

  const abrirDialogEstado = (calc) => {
    setCalculoParaCambiarEstado(calc);
    setEstadoDialogOpen(true);
  };

  const cambiarEstado = async (nuevoEstado) => {
    if (!calculoParaCambiarEstado) return;

    try {
      await aguinaldosApi.actualizarEstado(calculoParaCambiarEstado.id_calculo, nuevoEstado);
      await mutate();
      setAlertMsg("✅ Estado actualizado exitosamente");
      setEstadoDialogOpen(false);
      setCalculoParaCambiarEstado(null);
    } catch (error) {
      setAlertMsg("❌ Error al actualizar estado: " + (error?.message || "Error desconocido"));
    }
  };

  return (
    <div className={`${styles.aguTheme} space-y-4`}>
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold">🎁 Aguinaldos</h1>
        <p className="text-xs text-gray-500 mt-1">Calcula y gestiona aguinaldos según la Ley Federal del Trabajo</p>
      </div>

      {/* Filtros superiores */}
      <Card className="agu-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Cálculos de Aguinaldos Guardados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Buscar</label>
              <div className="relative">
                <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  className="pl-9"
                  placeholder="Empleado, puesto o ID..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setIsSuggestionsOpen(true);
                    setHoveredSuggestionIndex(0);
                    setActiveSearchBox("filters");
                  }}
                  onFocus={() => {
                    setActiveSearchBox("filters");
                    setIsSuggestionsOpen(!!search);
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      setIsSuggestionsOpen(false);
                      setActiveSearchBox(null);
                    }, 120);
                  }}
                />
                {isSuggestionsOpen && activeSearchBox === "filters" && sugerencias.length > 0 ? (
                  <div className="absolute left-0 right-0 mt-1 z-20 rounded-md border bg-white shadow">
                    <ul className="max-h-64 overflow-auto">
                      {sugerencias.map((emp, idx) => (
                        <li
                          key={emp.id_empleado}
                          onMouseDown={() => handleSelectEmpleadoSugerencia(emp)}
                          onMouseEnter={() => setHoveredSuggestionIndex(idx)}
                          className={`px-3 py-2 cursor-pointer text-sm ${idx === hoveredSuggestionIndex ? "bg-slate-100" : ""}`}
                        >
                          {emp.nombre_completo}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Estatus</label>
              <Select value={estatus === "" ? "__all__" : estatus} onValueChange={(v) => setEstatus(v === "__all__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  <SelectItem value="Pendiente">Pendiente</SelectItem>
                  <SelectItem value="Pagado">Pagado</SelectItem>
                  <SelectItem value="Cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Año Fiscal</label>
              <Input
                type="number"
                placeholder="Ej: 2025"
                value={añoFiscal}
                onChange={(e) => setAñoFiscal(e.target.value)}
                min="2020"
                max="2030"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={limpiarFiltros}
              className="bg-[#e74c3c] hover:bg-[#c0392b] text-white shadow-[0_2px_8px_rgba(231,76,60,0.3)]"
            >
              🔄 Limpiar
            </Button>
            <Button onClick={() => mutate()} className="shadow-[0_4px_12px_rgba(55,73,94,0.3)] transition-all hover:-translate-y-0.5">
              🔍 Buscar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="tabla">📊 Cálculos Guardados</TabsTrigger>
          <TabsTrigger value="calculadora">🧮 Calculadora</TabsTrigger>
        </TabsList>
        <TabsContent value="tabla" className="space-y-3 mt-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Resultados: {total}</div>
            <Button
              onClick={() => {
                resetFormulario();
                setTab("calculadora");
              }}
            >
              <Plus className="h-4 w-4 mr-2" /> Nuevo Cálculo
            </Button>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-2">ID</th>
                  <th className="text-left p-2">Año Fiscal</th>
                  <th className="text-left p-2">Fecha Cálculo</th>
                  <th className="text-left p-2">Fecha Corte</th>
                  <th className="text-left p-2">Empleados</th>
                  <th className="text-left p-2">Total</th>
                  <th className="text-left p-2">Estado</th>
                  <th className="text-left p-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {(calculos || []).map((calc) => {
                  const estClass =
                    calc.estado === "Pagado"
                      ? "bg-green-100 text-green-800"
                      : calc.estado === "Cancelado"
                      ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-800";
                  return (
                    <tr key={calc.id_calculo} className="border-t">
                      <td className="p-2 font-semibold">#{calc.id_calculo}</td>
                      <td className="p-2">{calc.año_fiscal}</td>
                      <td className="p-2">{dayjs(calc.fecha_calculo).format("DD/MM/YYYY")}</td>
                      <td className="p-2">{dayjs(calc.fecha_corte).format("DD/MM/YYYY")}</td>
                      <td className="p-2">{calc.total_empleados} empleados</td>
                      <td className="p-2 font-bold">
                        ${Number(calc.total_general || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2">
                        <span className={`${styles.tag} ${styles["tag-" + (calc.estado?.toLowerCase() || "pendiente")]}`}>
                          {calc.estado || "Pendiente"}
                        </span>
                      </td>
                      <td className="p-2">
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className={styles.actionView}
                            onClick={() => setViewRow(calc)}
                          >
                            <Eye className="h-4 w-4 mr-1" /> Ver
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className={styles.actionEstado}
                            onClick={() => abrirDialogEstado(calc)}
                          >
                            ✏️ Estado
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className={styles.actionDelete}
                            onClick={() => eliminarCalculo(calc)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" /> Eliminar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {(!calculos || calculos.length === 0) && (
                  <tr>
                    <td className="p-6 text-center text-muted-foreground" colSpan={8}>
                      No hay cálculos de aguinaldos guardados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <TablePagination page={page} limit={limit} total={total} onPageChange={setPage} onLimitChange={setLimit} />
        </TabsContent>

        <TabsContent value="calculadora" className="space-y-4 mt-3">
          {/* Loader */}
          {loading && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
              <div className="bg-white rounded-xl p-6 text-center">
                <div className="animate-spin h-8 w-8 rounded-full border-2 border-slate-300 border-t-[var(--agu-primary)] mx-auto mb-3" />
                <div className="font-semibold text-sm" style={{ color: "var(--agu-primary)" }}>Procesando...</div>
              </div>
            </div>
          )}

          {/* Mensaje de éxito */}
          {!!alertMsg && (
            <div
              className={
                alertMsg.includes("✅")
                  ? styles.infoSuccess
                  : alertMsg.includes("⚠️")
                  ? styles.infoWarning
                  : styles.infoDanger
              }
            >
              {alertMsg}
            </div>
          )}

          {/* Configuración */}
          <Card className="agu-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" /> Configuración del Cálculo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Fecha de Corte *</label>
                  <Input type="date" value={fechaCorte} onChange={(e) => setFechaCorte(e.target.value)} />
                  <small className="text-muted-foreground">Fecha hasta la cual se calculará el aguinaldo</small>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Año Fiscal *</label>
                  <Input
                    type="number"
                    min="2020"
                    max="2030"
                    value={añoFiscalCalculo}
                    onChange={(e) => setAñoFiscalCalculo(e.target.value)}
                    placeholder="2025"
                  />
                  <small className="text-muted-foreground">Año fiscal del aguinaldo</small>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Observaciones</label>
                  <Input
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Ej: Aguinaldo 2025 - Pago anticipado diciembre"
                  />
                </div>
              </div>

              <div className={styles.infoInfo}>
                <strong>📋 INFORMACIÓN LEGAL:</strong> Según el Artículo 87 de la LFT, el aguinaldo mínimo es de 15 días de salario por año
                trabajado. Si el empleado laboró menos de un año, se calcula proporcional.
              </div>
            </CardContent>
          </Card>

          {/* Selección de empleados */}
          {empleadosCargados.length > 0 && (
            <Card className="agu-card">
              <CardHeader>
                <CardTitle>👥 Selección de Empleados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Buscador de empleados */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">🔍 Buscar Empleado</label>
                  <div className="relative">
                    <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      className="pl-9"
                      placeholder="Buscar por nombre, puesto o departamento..."
                      value={busquedaEmpleados}
                      onChange={(e) => setBusquedaEmpleados(e.target.value)}
                    />
                  </div>
                  {busquedaEmpleados && (
                    <div className="text-xs text-muted-foreground">
                      Mostrando {empleadosFiltrados.length} de {empleadosCargados.length} empleados
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-md border-2 border-dashed">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} className="w-4 h-4" />
                    <strong>Seleccionar / Deseleccionar Todos</strong>
                  </label>
                  <span className="font-semibold text-blue-600">{empleadosSeleccionados.length} empleados seleccionados</span>
                </div>

                <div className="overflow-x-auto rounded-md border max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="text-left p-2 w-12">
                          <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} className="w-4 h-4" />
                        </th>
                        <th className="text-left p-2">Empleado</th>
                        <th className="text-left p-2">Puesto</th>
                        <th className="text-left p-2">F. Ingreso</th>
                        <th className="text-left p-2">Salario Diario</th>
                        <th className="text-left p-2">Días Aguinaldo</th>
                        <th className="text-left p-2">Días NO Trabajados</th>
                      </tr>
                    </thead>
                    <tbody>
                      {empleadosFiltrados.map((emp) => {
                        const seleccionado = empleadosSeleccionados.find((e) => e.id === emp.id);
                        const empData = seleccionado || emp;
                        return (
                          <tr key={emp.id} className="border-t">
                            <td className="p-2">
                              <input
                                type="checkbox"
                                checked={!!seleccionado}
                                onChange={() => toggleEmpleado(emp)}
                                className="w-4 h-4"
                              />
                            </td>
                            <td className="p-2">
                              <strong>{emp.nombre_completo}</strong>
                            </td>
                            <td className="p-2">{emp.puesto || "Sin puesto"}</td>
                            <td className="p-2">{dayjs(emp.fecha_ingreso).format("DD/MM/YYYY")}</td>
                            <td className="p-2">
                              <Input
                                type="number"
                                step="0.01"
                                className="w-24 h-8 text-xs"
                                value={empData.salario_diario || emp.salario_diario || 0}
                                onChange={(e) => {
                                  if (seleccionado) {
                                    actualizarSalario(emp.id, e.target.value);
                                  } else {
                                    toggleEmpleado({ ...emp, salario_diario: parseFloat(e.target.value) || 0 });
                                  }
                                }}
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                step="1"
                                min="15"
                                className="w-20 h-8 text-xs"
                                value={empData.dias_aguinaldo || emp.aguinaldo_dias || 15}
                                onChange={(e) => {
                                  if (seleccionado) {
                                    actualizarDiasAguinaldo(emp.id, e.target.value);
                                  } else {
                                    toggleEmpleado({ ...emp, dias_aguinaldo: parseFloat(e.target.value) || 15 });
                                  }
                                }}
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                step="0.5"
                                min="0"
                                className="w-20 h-8 text-xs"
                                value={empData.dias_no_trabajados || 0}
                                onChange={(e) => {
                                  if (seleccionado) {
                                    actualizarDiasNoTrabajados(emp.id, e.target.value);
                                  } else {
                                    toggleEmpleado({ ...emp, dias_no_trabajados: parseFloat(e.target.value) || 0 });
                                  }
                                }}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={calcularAguinaldos}
                    className="bg-[var(--agu-primary)] hover:bg-[var(--agu-primary-dark)] text-white shadow-[0_4px_12px_rgba(55,73,94,0.3)] transition-all hover:-translate-y-0.5"
                  >
                    🧮 Calcular Aguinaldos Seleccionados
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resultados */}
          {resultadoCalculo && (
            <Card className="agu-card">
              <CardHeader>
                <CardTitle>📊 Resultados del Cálculo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Estadísticas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className={styles.metricCard}>
                    <div className={styles.metricLabel}>Total Empleados</div>
                    <div className={styles.metricValue}>{resultadoCalculo.total_empleados}</div>
                  </div>
                  <div className={styles.metricCard}>
                    <div className={styles.metricLabel}>Aguinaldos Completos</div>
                    <div className={styles.metricValue} style={{ color: "var(--agu-success-dark)" }}>
                      {resultadoCalculo.resultados.filter((r) => !r.es_proporcional).length}
                    </div>
                  </div>
                  <div className={styles.metricCard}>
                    <div className={styles.metricLabel}>Aguinaldos Proporcionales</div>
                    <div className={styles.metricValue} style={{ color: "var(--agu-warning-dark)" }}>
                      {resultadoCalculo.resultados.filter((r) => r.es_proporcional).length}
                    </div>
                  </div>
                </div>

                {/* Total General */}
                <div className={styles.totalBar + " text-center"}>
                  <div className={styles.totalLabel}>💰 Total General a Pagar</div>
                  <div className={styles.totalAmount} style={{ fontSize: "32px" }}>
                    ${parseFloat(resultadoCalculo.total_general).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
                  </div>
                </div>

                {/* Tabla de resultados */}
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left p-2">Empleado</th>
                        <th className="text-left p-2">Puesto</th>
                        <th className="text-left p-2">F. Ingreso</th>
                        <th className="text-left p-2">Años</th>
                        <th className="text-left p-2">Faltas</th>
                        <th className="text-left p-2">Salario</th>
                        <th className="text-left p-2">Días Aguin.</th>
                        <th className="text-left p-2">Tipo</th>
                        <th className="text-left p-2">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultadoCalculo.resultados.map((emp, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="p-2">
                            <strong>{emp.nombre_completo}</strong>
                          </td>
                          <td className="p-2">{emp.puesto || "Sin puesto"}</td>
                          <td className="p-2">{dayjs(emp.fecha_ingreso).format("DD/MM/YYYY")}</td>
                          <td className="p-2">{parseFloat(emp.años_trabajados).toFixed(2)} años</td>
                          <td className="p-2 text-center">
                            {parseFloat(emp.dias_no_trabajados) > 0 ? (
                              <span className={`${styles.tag} ${styles["tag-pendiente"]}`}>
                                {parseFloat(emp.dias_no_trabajados).toFixed(1)}
                              </span>
                            ) : (
                              <span className={`${styles.tag} ${styles["tag-pagado"]}`}>0</span>
                            )}
                          </td>
                          <td className="p-2">${parseFloat(emp.salario_diario).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                          <td className="p-2">{parseFloat(emp.dias_aguinaldo_calculado).toFixed(2)} días</td>
                          <td className="p-2">
                            {emp.es_proporcional ? (
                              <span className={`${styles.tag} ${styles["tag-pendiente"]}`}>Proporcional</span>
                            ) : (
                              <span className={`${styles.tag} ${styles["tag-pagado"]}`}>Completo</span>
                            )}
                          </td>
                          <td className="p-2 font-bold">
                            ${parseFloat(emp.monto_aguinaldo).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Botones de acción */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button
                    onClick={generarPDFMasivo}
                    disabled={!guardable}
                    className="bg-[var(--agu-warning)] hover:bg-[#d97706] text-white shadow-[0_4px_12px_rgba(245,158,11,0.3)] transition-all hover:-translate-y-0.5"
                  >
                    📄 Generar PDF Completo
                  </Button>
                  <Button
                    onClick={guardarCalculo}
                    disabled={!guardable}
                    className="bg-[var(--agu-success)] hover:bg-[#059669] text-white shadow-[0_4px_12px_rgba(16,185,129,0.3)] transition-all hover:-translate-y-0.5"
                  >
                    💾 Guardar en BD
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Confirmación de eliminación */}
      <AlertDialog open={!!deleteRow} onOpenChange={(open) => !open && setDeleteRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cálculo?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteRow
                ? `Esta acción no se puede deshacer. Se eliminará el cálculo #${deleteRow?.id_calculo || ""}.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white border border-[#d1d5db] text-[#374151] hover:bg-[#f9fafb]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-[#ef4444] hover:bg-[#dc2626] text-white shadow-[0_4px_12px_rgba(239,68,68,0.3)]"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Ver detalle de cálculo */}
      <AguinaldoViewDialog
        open={!!viewRow}
        setOpen={(o) => {
          if (!o) setViewRow(null);
        }}
        id={viewRow?.id_calculo || viewRow?.id}
      />

      {/* Dialog para cambiar estado */}
      <CambiarEstadoDialog
        open={estadoDialogOpen}
        setOpen={setEstadoDialogOpen}
        estadoActual={calculoParaCambiarEstado?.estado || "Pendiente"}
        onConfirm={cambiarEstado}
      />
    </div>
  );
}

