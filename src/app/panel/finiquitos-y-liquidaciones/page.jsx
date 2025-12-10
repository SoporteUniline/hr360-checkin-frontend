"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
import useFiniquitosData from "@/hooks/useFiniquitosData";
import useEmpleadosActivosFiniquito from "@/hooks/useEmpleadosActivosFiniquito";
import { finiquitosApi } from "@/lib/finiquitosApi";
import styles from "./finiquitos-theme.module.css";
import { Download, Plus, Search, Trash2, Edit3, Calculator, Eye } from "lucide-react";
import FiniquitoViewDialog from "./FiniquitoViewDialog";
import dayjs from "dayjs";
import { jsPDF } from "jspdf";
import AccesosRapidos from "@/components/AccesosRapidos";

// Página de Panel para "Finiquitos y liquidaciones"
// - Relación:
//   - Navegación: `src/components/Sidebar/nav-main.jsx`
//   - API cliente: `src/lib/finiquitosApi.js`
//   - Hook datos: `src/hooks/useFiniquitosData.js`
export default function PageFiniquitosLiquidaciones() {
  const { dataUser } = useAuth();
  const idEmpresa = dataUser?.id_empresa;

  // Estado tabs
  const [tab, setTab] = useState("tabla");
  const [loading, setLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");

  // Estado buscador estilo "Contratos"
  const [search, setSearch] = useState("");
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [hoveredSuggestionIndex, setHoveredSuggestionIndex] = useState(-1);
  const [activeSearchBox, setActiveSearchBox] = useState(null);

  // Paginación
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Filtros extra
  const [estatus, setEstatus] = useState("");
  const [tipo, setTipo] = useState(""); // finiquito | liquidacion

  // Datos listados
  const { data, isLoading, mutate } = useFiniquitosData({
    idEmpresa,
    page,
    limit,
    search,
    estatus,
    tipo,
  });
  const finiquitos = data?.data || [];
  const total = data?.total || 0;

  // Sugerencias de empleados como contratos
  const empleadosSugResp = useEmpleadosActivosFiniquito({ empresa: idEmpresa, q: search, limit: 8 });
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
    setTipo("");
    setPage(1);
  };

  // ---------------- Calculadora ----------------
  const [idEmpleado, setIdEmpleado] = useState("");
  const [fechaBaja, setFechaBaja] = useState(dayjs().format("YYYY-MM-DD"));
  const [tipoCalculo, setTipoCalculo] = useState("finiquito");
  const [tipoTerminacion, setTipoTerminacion] = useState("Renuncia Voluntaria");
  const [salarioDiario, setSalarioDiario] = useState("");
  const [diasSalarioPendiente, setDiasSalarioPendiente] = useState("0");
  const [diasNoTrabajados, setDiasNoTrabajados] = useState("0");
  const [empSearch, setEmpSearch] = useState("");
  const [openEmpSug, setOpenEmpSug] = useState(false);

  const [diasVacAnteriores, setDiasVacAnteriores] = useState("0");
  const [diasVacLeyActual, setDiasVacLeyActual] = useState("12");
  const [diasVacYaGozadas, setDiasVacYaGozadas] = useState("0");
  const [primaVacacional, setPrimaVacacional] = useState("25");
  const [diasAguinaldo, setDiasAguinaldo] = useState("15");
  const [diasSalariosVencidos, setDiasSalariosVencidos] = useState("0");

  const [motivoBaja, setMotivoBaja] = useState("");

  const [panelEmpleadoVisible, setPanelEmpleadoVisible] = useState(false);
  const [panelConfigVisible, setPanelConfigVisible] = useState(false);

  const [empleadoInfo, setEmpleadoInfo] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [guardable, setGuardable] = useState(false);
  const [deleteRow, setDeleteRow] = useState(null);
  const [viewRow, setViewRow] = useState(null);

  const resetFormulario = () => {
    setIdEmpleado("");
    setFechaBaja(dayjs().format("YYYY-MM-DD"));
    setTipoCalculo("finiquito");
    setTipoTerminacion("Renuncia Voluntaria");
    setSalarioDiario("");
    setDiasSalarioPendiente("0");
    setDiasNoTrabajados("0");
    setDiasVacAnteriores("0");
    setDiasVacLeyActual("12");
    setDiasVacYaGozadas("0");
    setPrimaVacacional("25");
    setDiasAguinaldo("15");
    setDiasSalariosVencidos("0");
    setMotivoBaja("");

    setPanelEmpleadoVisible(false);
    setPanelConfigVisible(false);
    setResultado(null);
    setGuardable(false);
    setEmpSearch("");
    setOpenEmpSug(false);
  };

  const cargarEmpleadoEnFormulario = async (emp) => {
    setEmpleadoInfo(emp);
    setSalarioDiario((emp.salario_diario || 0).toFixed(2));
    setPanelEmpleadoVisible(true);
    setPanelConfigVisible(true);

    // Obtener datos de vacaciones (pendientes + ley año actual) y días no trabajados
    // - Relación: tabla `asistencias` campo `asistencia` donde = 0 o NULL
    try {
      const fechaIngreso = new Date(emp.fecha_ingreso);
      const fechaBajaDate = new Date(fechaBaja);
      const diasTrabajados = Math.floor((fechaBajaDate - fechaIngreso) / (1000 * 60 * 60 * 24));
      const añosTrabajados = diasTrabajados / 365.25;
      const añosCompletos = Math.floor(añosTrabajados);

      // Obtener días no trabajados desde la tabla asistencias
      // - Relación: endpoint `/api/checador/finiquitos/empleado/:idEmpleado/dias-no-trabajados`
      // - Cuenta registros donde asistencia = 0 o NULL en el rango de fechas
      try {
        const datosDiasNoTrab = await finiquitosApi.obtenerDiasNoTrabajados({
          idEmpleado: emp.id_empleado,
          fechaIngreso: emp.fecha_ingreso,
          fechaBaja: fechaBaja,
        });
        setDiasNoTrabajados(String(datosDiasNoTrab?.dias_no_trabajados ?? 0));
      } catch (e) {
        console.error("Error al obtener días no trabajados:", e);
        setDiasNoTrabajados("0");
      }

      // Obtener datos de vacaciones
      // - Relación: endpoint `/api/checador/finiquitos/empleado/:idEmpleado/vacaciones-datos`
      // - El cálculo proporcional de días ley se hace en el backend al calcular el finiquito
      // - Considera los días adicionales si se pasa del año (función calcularDiasDesdeUltimoAniversario)
      const datosVac = await finiquitosApi.obtenerVacacionesDatos({
        idEmpleado: emp.id_empleado,
        empresa: emp.id_empresa,
        aniosCompletos: añosCompletos,
      });
      setDiasVacAnteriores(String(datosVac?.diasPendientes ?? 0));
      // Guardar el valor base de días ley según la ley (12, 14, etc.)
      // El cálculo proporcional se hace en el backend considerando días transcurridos desde último aniversario
      setDiasVacLeyActual(String(datosVac?.diasLeyAñoActual ?? 12));
    } catch (e) {
      console.error("Error al cargar datos del empleado:", e);
      setDiasVacAnteriores("0");
      setDiasVacLeyActual("12");
      setDiasNoTrabajados("0");
    }
  };

  const onPickEmpleado = async (emp) => {
    if (!emp) return;
    setIdEmpleado(String(emp.id_empleado || emp.id));
    setEmpSearch(emp.nombre_completo || emp.nombre || "");
    setResultado(null);
    setGuardable(false);
    await cargarEmpleadoEnFormulario({
      id_empleado: emp.id_empleado || emp.id,
      nombre_completo: emp.nombre_completo || emp.nombre || "",
      fecha_ingreso: emp.fecha_ingreso,
      puesto: emp.puesto,
      departamento: emp.departamento,
      periodicidad_pago: emp.periodicidad_pago,
      salario_diario: emp.salario_diario,
      id_empresa: emp.id_empresa,
    });
    setOpenEmpSug(false);
  };

  const calcular = async () => {
    setResultado(null);
    setGuardable(false);
    setAlertMsg("");
    if (!idEmpleado || !fechaBaja) return;
    const sd = parseFloat(salarioDiario || "0");
    if (!(sd > 0)) return;

    const payload = {
      id_empleado: parseInt(idEmpleado),
      fecha_baja: fechaBaja,
      tipo_calculo: tipoCalculo,
      tipo_terminacion: tipoTerminacion,
      salario_diario_manual: sd,
      dias_salario_pendiente: parseFloat(diasSalarioPendiente || "0"),
      dias_no_trabajados: parseFloat(diasNoTrabajados || "0"),
      dias_vacaciones_años_anteriores: parseFloat(diasVacAnteriores || "0"),
      dias_vacaciones_ley_año_actual: parseFloat(diasVacLeyActual || "12"),
      dias_vacaciones_año_actual_ya_gozadas: parseFloat(diasVacYaGozadas || "0"),
      prima_vacacional_porcentaje_manual: parseFloat(primaVacacional || "25"),
      dias_aguinaldo_manual: parseFloat(diasAguinaldo || "15"),
      dias_salarios_vencidos: parseFloat(diasSalariosVencidos || "0"),
    };
    setLoading(true);
    try {
      const res = await finiquitosApi.calcular(payload);
      setResultado(res);
      setGuardable(true);
      setAlertMsg("✅ Cálculo realizado correctamente. Revisa el detalle y genera el PDF si lo requieres.");
    } finally {
      setLoading(false);
    }
  };

  const guardar = async () => {
    if (!resultado) return;
    const payload = { ...resultado, motivo_baja: motivoBaja, calculado_por: dataUser?.correo || dataUser?.email || "" };
    setLoading(true);
    try {
      const res = await finiquitosApi.guardar(payload);
      // Actualizar estado a "Pagado" inmediatamente después de crear
      try {
        const nuevoId = res?.id_finiquito || res?.id || null;
        if (nuevoId) {
          await finiquitosApi.actualizarEstado(nuevoId, "Pagado");
        }
      } catch (_) {}
      setGuardable(false);
      await mutate();
      setAlertMsg("✅ Guardado correctamente y marcado como Pagado. Puedes ver el registro en la pestaña de 'Finiquitos Guardados'.");
      setTab("tabla");
      resetFormulario();
    } finally {
      setLoading(false);
    }
  };

  const generarPDF = () => {
    if (!resultado) return;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
    const tipoDocumento = resultado.es_liquidacion ? "LIQUIDACIÓN" : "FINIQUITO";

    doc.setFillColor(55, 73, 94);
    doc.rect(0, 0, 220, 35, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.text("HR360", 20, 20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Sistema de Gestión de Capital Humano", 20, 26);
    doc.setFontSize(9);
    doc.text("Fecha: " + new Date().toLocaleDateString("es-MX"), 155, 20);

    let y = 45;
    doc.setTextColor(55, 73, 94);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("CÁLCULO DE " + tipoDocumento, 105, y, { align: "center" });
    y = 60;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(15, y, 195, y);

    y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);

    doc.text("Empleado:", 15, y);
    doc.setFont("helvetica", "bold");
    doc.text(resultado.nombre_completo, 45, y);

    y += 6;
    doc.setFont("helvetica", "normal");
    doc.text("Puesto:", 15, y);
    doc.setFont("helvetica", "bold");
    doc.text(resultado.puesto || "", 45, y);

    doc.setFont("helvetica", "normal");
    doc.text("Departamento:", 115, y);
    doc.setFont("helvetica", "bold");
    doc.text(resultado.departamento || "", 150, y);

    y += 6;
    doc.setFont("helvetica", "normal");
    doc.text("Años trabajados:", 15, y);
    doc.setFont("helvetica", "bold");
    doc.text(resultado.años_trabajados + " años", 45, y);

    doc.setFont("helvetica", "normal");
    doc.text("Salario diario:", 115, y);
    doc.setFont("helvetica", "bold");
    doc.text("$" + parseFloat(resultado.salario_diario).toLocaleString("es-MX", { minimumFractionDigits: 2 }), 150, y);

    y += 8;
    doc.setDrawColor(200, 200, 200);
    doc.line(15, y, 195, y);

    // Finiquito
    y += 12;
    doc.setTextColor(55, 73, 94);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("CONCEPTOS DE FINIQUITO", 15, y);

    const conceptos = [
      ["Salario Pendiente", `${resultado.dias_salario_pendiente} días`, "$" + Number(resultado.monto_salario_pendiente).toLocaleString("es-MX", { minimumFractionDigits: 2 })],
      ["Aguinaldo Proporcional", `${resultado.dias_aguinaldo_proporcional} días`, "$" + Number(resultado.monto_aguinaldo_proporcional).toLocaleString("es-MX", { minimumFractionDigits: 2 })],
      ["Vacaciones No Gozadas", `${resultado.dias_vacaciones_totales} días`, "$" + Number(resultado.monto_vacaciones_no_gozadas).toLocaleString("es-MX", { minimumFractionDigits: 2 })],
      ["Prima Vacacional", `${resultado.prima_vacacional_porcentaje}%`, "$" + Number(resultado.monto_prima_vacacional).toLocaleString("es-MX", { minimumFractionDigits: 2 })],
    ];
    y += 8;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    conceptos.forEach((c) => {
      doc.text(c[0], 15, y);
      doc.text(c[1], 120, y);
      doc.setFont("helvetica", "bold");
      doc.text(c[2], 185, y, { align: "right" });
      doc.setFont("helvetica", "normal");
      y += 6;
    });

    y += 3;
    doc.setDrawColor(200, 200, 200);
    doc.line(15, y, 195, y);

    y += 7;
    doc.setFont("helvetica", "bold");
    doc.text("Subtotal Finiquito:", 15, y);
    doc.setFontSize(10);
    doc.text("$" + Number(resultado.subtotal_finiquito).toLocaleString("es-MX", { minimumFractionDigits: 2 }), 185, y, { align: "right" });
    doc.setFontSize(9);

    if (resultado.es_liquidacion) {
      y += 12;
      doc.setTextColor(55, 73, 94);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("CONCEPTOS DE LIQUIDACIÓN", 15, y);
      const conceptosLiq = [
        ["Prima de Antigüedad (12d×año)", `${resultado.dias_prima_antiguedad} días`, "$" + Number(resultado.monto_prima_antiguedad).toLocaleString("es-MX", { minimumFractionDigits: 2 })],
        ["Indemnización (3m+20d×año)", `${resultado.dias_indemnizacion_total} días`, "$" + Number(resultado.monto_indemnizacion_constitucional).toLocaleString("es-MX", { minimumFractionDigits: 2 })],
        ["Salarios Vencidos", `${resultado.dias_salarios_vencidos} días`, "$" + Number(resultado.monto_salarios_vencidos).toLocaleString("es-MX", { minimumFractionDigits: 2 })],
      ];
      y += 8;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      conceptosLiq.forEach((c) => {
        doc.text(c[0], 15, y);
        doc.text(c[1], 120, y);
        doc.setFont("helvetica", "bold");
        doc.text(c[2], 185, y, { align: "right" });
        doc.setFont("helvetica", "normal");
        y += 6;
      });

      y += 3;
      doc.line(15, y, 195, y);

      y += 7;
      doc.setFont("helvetica", "bold");
      doc.text("Subtotal Liquidación:", 15, y);
      doc.setFontSize(10);
      doc.text("$" + Number(resultado.subtotal_liquidacion).toLocaleString("es-MX", { minimumFractionDigits: 2 }), 185, y, { align: "right" });
      doc.setFontSize(9);
    }

    y += 12;
    doc.setFillColor(55, 73, 94);
    doc.rect(15, y, 180, 15, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL A PAGAR", 20, y + 9);
    doc.setFontSize(16);
    doc.text("$" + Number(resultado.total_pagar).toLocaleString("es-MX", { minimumFractionDigits: 2 }) + " MXN", 185, y + 9, { align: "right" });

    const nombreArchivo =
      (resultado.es_liquidacion ? "LIQUIDACION" : "FINIQUITO") +
      "_HR360_" +
      (resultado.nombre_completo || "Empleado") +
      ".pdf";

    doc.save(nombreArchivo.replace(/\s+/g, "_"));
  };

  const editarFiniquito = async (row) => {
    try {
      const det = await finiquitosApi.detalle(row.id_finiquito || row.id);
      setTab("calculadora");
      // Montar datos en formulario
      setIdEmpleado(String(det.id_empleado));
      setFechaBaja(det.fecha_baja || dayjs().format("YYYY-MM-DD"));
      setTipoCalculo(det.es_liquidacion ? "liquidacion" : "finiquito");
      setTipoTerminacion(det.tipo_terminacion || "Renuncia Voluntaria");
      setSalarioDiario(String(det.salario_diario || ""));
      setDiasSalarioPendiente(String(det.dias_salario_pendiente || "0"));
      setDiasNoTrabajados(String(det.dias_no_trabajados || "0"));
      setDiasVacAnteriores(String(det.dias_vacaciones_años_anteriores || "0"));
      setDiasVacLeyActual(String(det.dias_vacaciones_ley_año_actual || "12"));
      setDiasVacYaGozadas(String(det.dias_vacaciones_año_actual_ya_gozadas || "0"));
      setPrimaVacacional(String(det.prima_vacacional_porcentaje || "25"));
      setDiasAguinaldo(String(det.dias_aguinaldo || "15"));
      setDiasSalariosVencidos(String(det.dias_salarios_vencidos || "0"));
      setMotivoBaja(det.motivo_baja || "");

      // Mostrar paneles
      setPanelEmpleadoVisible(true);
      setPanelConfigVisible(true);
      // Info de empleado visible
      setEmpleadoInfo({
        id_empleado: det.id_empleado,
        nombre_completo: det.nombre_completo,
        fecha_ingreso: det.fecha_ingreso,
        puesto: det.puesto,
        departamento: det.departamento,
        periodicidad_pago: det.periodicidad_pago,
        salario_diario: parseFloat(det.salario_diario || 0),
        id_empresa: det.id_empresa,
      });
      setEmpSearch(det.nombre_completo || "");
      setResultado(null);
      setGuardable(false);
    } catch (_) {}
  };

  const eliminarFiniquito = (row) => {
    setDeleteRow(row);
  };

  const confirmDelete = async () => {
    if (!deleteRow) return;
    await finiquitosApi.eliminar(deleteRow.id_finiquito || deleteRow.id);
    setDeleteRow(null);
    await mutate();
  };

  return (
    <div className={`${styles.finTheme} space-y-4`}>
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold">📄 Finiquitos y liquidaciones</h1>
        <p className="text-xs text-gray-500 mt-1">Calcula y gestiona finiquitos/liquidaciones.</p>
      </div>

      {/* Filtros superiores (estilo Contratos) */}
      <Card className="fin-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Finiquitos Guardados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
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
                  onKeyDown={(e) => {
                    if (!isSuggestionsOpen || activeSearchBox !== "filters" || sugerencias.length === 0) return;
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setHoveredSuggestionIndex((prev) => (prev + 1 >= sugerencias.length ? 0 : prev + 1));
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setHoveredSuggestionIndex((prev) => (prev - 1 < 0 ? sugerencias.length - 1 : prev - 1));
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      handleSelectEmpleadoSugerencia(sugerencias[hoveredSuggestionIndex] || sugerencias[0]);
                    } else if (e.key === "Escape") {
                      setIsSuggestionsOpen(false);
                    }
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
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Tipo</label>
              <Select value={tipo === "" ? "__all__" : tipo} onValueChange={(v) => setTipo(v === "__all__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  <SelectItem value="finiquito">Finiquito</SelectItem>
                  <SelectItem value="liquidacion">Liquidación</SelectItem>
                </SelectContent>
              </Select>
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
          <TabsTrigger value="tabla">📊 Finiquitos Guardados</TabsTrigger>
          <TabsTrigger value="calculadora">🧮 Calculadora</TabsTrigger>
        </TabsList>
        <TabsContent value="tabla" className="space-y-3 mt-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Resultados: {total}</div>
            <Button onClick={() => { resetFormulario(); setTab("calculadora"); }}>
              <Plus className="h-4 w-4 mr-2" /> Nuevo Finiquito
            </Button>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-2">ID</th>
                  <th className="text-left p-2">Empleado</th>
                  <th className="text-left p-2">Fecha Baja</th>
                  <th className="text-left p-2">Tipo</th>
                  <th className="text-left p-2">Total</th>
                  <th className="text-left p-2">Estado</th>
                  <th className="text-left p-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {(finiquitos || []).map((f) => {
                  const tipoBadge = f.es_liquidacion ? "Liquidación" : "Finiquito";
                  const tipoClass = f.es_liquidacion ? styles["tag-liquidacion"] : styles["tag-finiquito"];
                  const estClass = (f.estado || "") === "Pagado" ? styles["tag-pagado"] : styles["tag-pendiente"];
                  return (
                    <tr key={f.id_finiquito} className="border-t">
                      <td className="p-2 font-semibold">#{f.id_finiquito}</td>
                      <td className="p-2">{f.nombre_completo}</td>
                      <td className="p-2">{f.fecha_baja ? dayjs(f.fecha_baja).format("DD/MM/YYYY") : ""}</td>
                      <td className="p-2">
                        <span className={`${styles.tag} ${tipoClass}`}>{tipoBadge}</span>
                      </td>
                      <td className="p-2 font-bold">
                        ${Number(f.total_pagar || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2">
                        <span className={`${styles.tag} ${estClass}`}>{f.estado || "Pendiente"}</span>
                      </td>
                      <td className="p-2">
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" className={styles.actionView} onClick={() => setViewRow(f)}>
                            <Eye className="h-4 w-4 mr-1" /> Ver
                          </Button>
                          <Button variant="outline" size="sm" className={styles.actionEdit} onClick={() => editarFiniquito(f)}>
                            <Edit3 className="h-4 w-4 mr-1" /> Editar
                          </Button>
                          <Button variant="outline" size="sm" className={styles.actionDelete} onClick={() => eliminarFiniquito(f)}>
                            <Trash2 className="h-4 w-4 mr-1" /> Eliminar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {(!finiquitos || finiquitos.length === 0) && (
                  <tr>
                    <td className="p-6 text-center text-muted-foreground" colSpan={7}>
                      No hay finiquitos guardados
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
                <div className="animate-spin h-8 w-8 rounded-full border-2 border-slate-300 border-t-[var(--fin-primary)] mx-auto mb-3" />
                <div className="font-semibold text-sm" style={{ color: "var(--fin-primary)" }}>Procesando...</div>
              </div>
            </div>
          )}

          {/* Mensaje de éxito */}
          {!!alertMsg && (
            <div className="rounded-md p-3 border-l-4" style={{ background: "var(--fin-success-light)", borderLeftColor: "var(--fin-success)", color: "var(--fin-success)" }}>
              {alertMsg}
            </div>
          )}

          {/* Tipo cálculo */}
          <Card className="fin-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" /> Tipo de Cálculo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Empleado</label>
                  <div className="relative">
                    <Input
                      placeholder="Buscar empleado..."
                      value={empSearch}
                      onChange={(e) => {
                        setEmpSearch(e.target.value);
                        setOpenEmpSug(true);
                      }}
                      onFocus={() => setOpenEmpSug(true)}
                      onBlur={() => setTimeout(() => setOpenEmpSug(false), 120)}
                    />
                    {openEmpSug ? (
                      <div className="absolute left-0 right-0 mt-1 z-20 rounded-md border bg-white shadow max-h-64 overflow-auto">
                        {(sugerencias || [])
                          .filter((x) =>
                            (x.nombre_completo || "")
                              .toLowerCase()
                              .includes(empSearch.trim().toLowerCase())
                          )
                          .slice(0, 50)
                          .map((emp) => (
                            <div
                              key={`emp-sel-${emp.id_empleado || emp.id}`}
                              className="px-3 py-2 cursor-pointer text-sm hover:bg-slate-100"
                              onMouseDown={() => onPickEmpleado(emp)}
                            >
                              {emp.nombre_completo}
                            </div>
                          ))}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Fecha de baja</label>
                  <Input type="date" value={fechaBaja} onChange={(e) => setFechaBaja(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Tipo de cálculo</label>
                  <Select value={tipoCalculo} onValueChange={setTipoCalculo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="finiquito">Finiquito</SelectItem>
                      <SelectItem value="liquidacion">Liquidación</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Tipo de terminación</label>
                  <Select value={tipoTerminacion} onValueChange={setTipoTerminacion}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Renuncia Voluntaria">Renuncia Voluntaria</SelectItem>
                      <SelectItem value="Despido Justificado">Despido Justificado</SelectItem>
                      <SelectItem value="Despido Injustificado">Despido Injustificado</SelectItem>
                      <SelectItem value="Mutuo Acuerdo">Mutuo Acuerdo</SelectItem>
                      <SelectItem value="Fin de Contrato">Fin de Contrato</SelectItem>
                      <SelectItem value="Rescisión Artículo 51">Rescisión Artículo 51 LFT</SelectItem>
                      <SelectItem value="Defunción">Defunción</SelectItem>
                      <SelectItem value="Otros">Otros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-md bg-slate-50 p-3 text-sm">
                ℹ️ <b>Finiquito:</b> salario, aguinaldo, vacaciones, prima vacacional. <b>Liquidación:</b> agrega prima de antigüedad, indemnización y salarios vencidos.
              </div>
            </CardContent>
          </Card>

        {/* Resumen limpio de reglas */}
        <Card className="fin-card">
          <CardHeader>
            <CardTitle>🧾 Resumen de reglas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className={styles.infoWarning}>
              <div className="font-semibold mb-1">AGUINALDO</div>
              <ul className="list-disc pl-5 space-y-0.5">
                <li>Si el trabajador tiene ≥ 1 año: el periodo es del 1 de enero al 31 de diciembre.</li>
                <li>Si tiene &lt; 1 año: proporcional desde su fecha de ingreso hasta el 31 de diciembre.</li>
              </ul>
            </div>
            <div className={styles.infoSuccess}>
              <div className="font-semibold mb-1">VACACIONES</div>
              <ul className="list-disc pl-5 space-y-0.5">
                <li>Siempre se calculan con base en la fecha de ingreso individual.</li>
                <li>Cada aniversario genera un nuevo periodo vacacional (según año cumplido).</li>
                <li>No dependen del año calendario.</li>
              </ul>
            </div>
          </CardContent>
        </Card>

          {/* Información del empleado */}
          {panelEmpleadoVisible && empleadoInfo && (
            <Card className="fin-card">
              <CardHeader>
                <CardTitle>👤 Información del Empleado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="md:col-span-1 col-span-2">
                    <div className="text-xs text-muted-foreground">Empleado</div>
                    <div className="font-semibold break-words">{empleadoInfo.nombre_completo || "--"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Fecha de ingreso</div>
                    <div className="font-semibold">{empleadoInfo.fecha_ingreso ? dayjs(empleadoInfo.fecha_ingreso).format("DD/MM/YYYY") : "--"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Departamento</div>
                    <div className="font-semibold">{empleadoInfo.departamento || "--"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Periodicidad</div>
                    <div className="font-semibold">{empleadoInfo.periodicidad_pago || "--"}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Configuración de cálculo */}
          {panelConfigVisible && (
            <Card className="fin-card">
              <CardHeader>
                <CardTitle>⚙️ Configuración de Cálculo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Salario Diario</label>
                    <Input type="number" step="0.01" value={salarioDiario} onChange={(e) => setSalarioDiario(e.target.value)} />
                    <small className="text-muted-foreground">Salario diario integrado</small>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Días salario pendientes</label>
                    <Input type="number" step="0.5" value={diasSalarioPendiente} onChange={(e) => setDiasSalarioPendiente(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Días NO trabajados</label>
                    <Input type="number" step="0.5" value={diasNoTrabajados} onChange={(e) => setDiasNoTrabajados(e.target.value)} />
                    <small className="text-red-700">Estos días reducen proporcionales</small>
                  </div>
                </div>

                {/* Vacaciones */}
                <div className="rounded-md border-l-4 p-3" style={{ borderLeftColor: "#10b981", background: "#f0fdf4" }}>
                  <div className="font-semibold text-sm mb-2" style={{ color: "#166534" }}>🏖️ Vacaciones</div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase text-muted-foreground">Años anteriores (no gozadas)</label>
                      <Input type="number" step="0.5" value={diasVacAnteriores} onChange={(e) => setDiasVacAnteriores(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase text-muted-foreground">Días ley (año actual)</label>
                      <Input type="number" step="1" value={diasVacLeyActual} onChange={(e) => setDiasVacLeyActual(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase text-muted-foreground">Ya gozadas (año actual)</label>
                      <Input type="number" step="0.5" value={diasVacYaGozadas} onChange={(e) => setDiasVacYaGozadas(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase text-muted-foreground">Prima vacacional (%)</label>
                      <Input type="number" step="0.5" value={primaVacacional} onChange={(e) => setPrimaVacacional(e.target.value)} />
                    </div>
                  </div>
                  <div className={`${styles.infoSuccess} mt-3`}>
                    <div className="font-semibold">ℹ️ Cálculo automático:</div>
                    <ul className="list-disc pl-5 mt-1 space-y-0.5">
                      <li>Se carga automáticamente según años trabajados</li>
                      <li>Proporcional año actual = (Días según ley × Días efectivos) ÷ 365</li>
                      <li>A pagar año actual = Proporcional − Ya gozadas</li>
                      <li><strong>TOTAL</strong> = Años anteriores + A pagar año actual</li>
                    </ul>
                  </div>
                  <div className={`${styles.formulaBox} mt-2`}>
                    <strong>📐 FÓRMULA:</strong> Vacaciones proporcionales = (Días_ley_año_actual × Días_efectivos) ÷ 365<br />
                    A pagar = Años_anteriores + (Proporcional − Ya_gozadas)
                  </div>
                </div>

                {/* Aguinaldo */}
                <div className="rounded-md border-l-4 p-3" style={{ borderLeftColor: "#f59e0b", background: "#fffbeb" }}>
                  <div className="font-semibold text-sm mb-2" style={{ color: "#92400e" }}>🎁 Aguinaldo</div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase text-muted-foreground">Días aguinaldo completo</label>
                      <Input type="number" step="0.5" value={diasAguinaldo} onChange={(e) => setDiasAguinaldo(e.target.value)} />
                    </div>
                  </div>
                  <div className={`${styles.infoWarning} mt-3`}>
                    ℹ️ El <strong>aguinaldo proporcional</strong> se calculará automáticamente según los días efectivos trabajados en el año.
                  </div>
                  <div className={`${styles.formulaBox} mt-2`}>
                    <strong>📐 FÓRMULA:</strong> Aguinaldo proporcional = (Días_aguinaldo × Días_efectivos) ÷ 365
                  </div>
                </div>

                {/* Liquidación extra */}
                {tipoCalculo === "liquidacion" && (
                  <div className="rounded-md border-l-4 p-3" style={{ borderLeftColor: "#dc2626", background: "#fef2f2" }}>
                    <div className="font-semibold text-sm mb-2" style={{ color: "#991b1b" }}>⚖️ Conceptos de Liquidación</div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">Días salarios vencidos</label>
                        <Input type="number" step="0.5" value={diasSalariosVencidos} onChange={(e) => setDiasSalariosVencidos(e.target.value)} />
                      </div>
                    </div>
                    <div className={`${styles.infoDanger} mt-3`}>
                      ℹ️ <strong>Liquidación según LFT:</strong>
                      <ul className="list-disc pl-5 mt-1 space-y-0.5">
                        <li><strong>Prima de Antigüedad:</strong> 12 días × años trabajados (tope 2× salario mínimo)</li>
                        <li><strong>Indemnización:</strong> 3 meses + 20 días × años trabajados</li>
                        <li><strong>Salarios Vencidos:</strong> Desde despido hasta pago (Art. 48 LFT)</li>
                      </ul>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Motivo de baja</label>
                    <textarea className="border rounded-md w-full p-2 text-sm" rows={3} value={motivoBaja} onChange={(e) => setMotivoBaja(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="invisible">Acciones</label>
                    <div className="grid grid-cols-1 gap-2">
                      <Button onClick={calcular} className="bg-[var(--fin-primary)] hover:bg-[var(--fin-primary-dark)] text-white">
                        🧮 Calcular
                      </Button>
                      <Button onClick={generarPDF} disabled={!guardable} className="bg-[var(--fin-warning)] hover:bg-[#d97706] text-white">
                        📄 Generar PDF
                      </Button>
                      <Button onClick={guardar} disabled={!guardable} className="bg-[var(--fin-success)] hover:bg-[#059669] text-white">
                        💾 Guardar
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resultado */}
          {resultado && (
            <Card className="fin-card">
              <CardHeader>
                <CardTitle>📊 Resultado del Cálculo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className={styles.resultsPanel}>
                {/* Métricas superiores (4 cajas) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className={styles.metricCard}>
                    <div className={styles.metricLabel}>Empleado</div>
                    <div className={styles.metricValue}>{resultado.nombre_completo}</div>
                  </div>
                  <div className={styles.metricCard}>
                    <div className={styles.metricLabel}>Días trabajados</div>
                    <div className={styles.metricValue}>{resultado.dias_trabajados}</div>
                  </div>
                  <div className={styles.metricCard}>
                    <div className={styles.metricLabel}>Años trabajados</div>
                    <div className={styles.metricValue}>{resultado.años_trabajados}</div>
                  </div>
                  <div className={styles.metricCard}>
                    <div className={styles.metricLabel}>Salario diario</div>
                    <div className={styles.metricValue}>
                      ${Number(resultado.salario_diario).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* Bloque de descuentos */}
                {Number(resultado.dias_no_trabajados) > 0 && (
                  <div className="rounded-md p-3" style={{ background: "#fef2f2", borderLeft: "4px solid #ef4444" }}>
                    <div className="text-sm font-bold mb-2" style={{ color: "#991b1b" }}>⚠️ DESCUENTOS APLICADOS</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div className="rounded border p-2 bg-white">
                        <div className="text-xs text-muted-foreground">Días transcurridos del año</div>
                        <div className="font-semibold">{resultado.dias_transcurridos_año_bruto}</div>
                      </div>
                      <div className="rounded border p-2 bg-white">
                        <div className="text-xs text-muted-foreground">Menos días no trabajados</div>
                        <div className="font-semibold">{Number(resultado.dias_no_trabajados).toFixed(2)}</div>
                      </div>
                      <div className="rounded border p-2 bg-red-50">
                        <div className="text-xs text-muted-foreground">= Días efectivos</div>
                        <div className="font-bold">{resultado.dias_transcurridos_año_neto}</div>
                      </div>
                    </div>
                    <small className="block mt-1" style={{ color: "#991b1b" }}>
                      Los días efectivos se usan para calcular aguinaldo y vacaciones proporcionales del año actual.
                    </small>
                  </div>
                )}

                <div className={styles.sectionTitle}>Conceptos de finiquito</div>

                {/* Conceptos de finiquito con desglose */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
                  {/* Salario pendiente */}
                  <div className={styles.conceptCard}>
                    <div className={styles.conceptTitle}>Salario Pendiente</div>
                    <div className={styles.conceptAmount}>
                      ${Number(resultado.monto_salario_pendiente).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </div>
                    <div className={`${styles.conceptBox}`}>
                      <div className={styles.row}>
                        <span className={styles.rowLabel}>Días pendientes</span>
                        <span className={styles.rowValue}>{Number(resultado.dias_salario_pendiente).toFixed(2)} días</span>
                      </div>
                      <div className={styles.row}>
                        <span className={styles.rowLabel}>Salario diario</span>
                        <span className={styles.rowValue}>${Number(resultado.salario_diario).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className={`${styles.softBadgeBlue} mt-1 text-right`}>
                        = Total: ${Number(resultado.monto_salario_pendiente).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {/* Aguinaldo proporcional */}
                  <div className={styles.conceptCard}>
                    <div className={styles.conceptTitle}>Aguinaldo Proporcional</div>
                    <div className={styles.conceptAmount}>
                      ${Number(resultado.monto_aguinaldo_proporcional).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </div>
                    <div className={`${styles.conceptBox}`}>
                      <div className={styles.row}>
                        <span className={styles.rowLabel}>Días aguinaldo completo</span>
                        <span className={styles.rowValue}>{Number(resultado.dias_aguinaldo).toFixed(2)} días</span>
                      </div>
                      <div className={styles.row}>
                        <span className={styles.rowLabel}>Días efectivos</span>
                        <span className={styles.rowValue}>{resultado.dias_transcurridos_año_neto} días</span>
                      </div>
                      <div className={styles.row}>
                        <span className={styles.rowLabel}>Proporcional</span>
                        <span className={styles.rowValue}>{resultado.dias_aguinaldo_proporcional} días</span>
                      </div>
                      <div className={`${styles.softBadgeBlue} mt-1 text-right`}>
                        = Total: ${Number(resultado.monto_aguinaldo_proporcional).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <small className="text-xs text-muted-foreground block mt-1">
                      Fórmula: ({Number(resultado.dias_aguinaldo).toFixed(0)} × {resultado.dias_transcurridos_año_neto}) ÷ 365
                    </small>
                  </div>

                  {/* Vacaciones no gozadas */}
                  <div className={styles.conceptCard}>
                    <div className={styles.conceptTitle}>Vacaciones No Gozadas</div>
                    <div className={styles.conceptAmount}>
                      ${Number(resultado.monto_vacaciones_no_gozadas).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </div>
                    <div className={`${styles.conceptBox}`}>
                      <div className={styles.row}>
                        <span className={styles.rowLabel}>Años anteriores</span>
                        <span className={styles.rowValue}>{Number(resultado.dias_vacaciones_años_anteriores).toFixed(2)} días</span>
                      </div>
                      <div className={styles.row}>
                        <span className={styles.rowLabel}>Año actual según ley</span>
                        <span className={styles.rowValue}>{resultado.dias_vacaciones_ley_año_actual} días</span>
                      </div>
                      <div className={styles.row}>
                        <span className={styles.rowLabel}>Días efectivos</span>
                        <span className={styles.rowValue}>{resultado.dias_transcurridos_año_neto} días</span>
                      </div>
                      <div className={styles.row}>
                        <span className={styles.rowLabel}>Proporcional bruto</span>
                        <span className={styles.rowValue}>{resultado.dias_vacaciones_año_actual_proporcional_bruto} días</span>
                      </div>
                      <div className={styles.row}>
                        <span className={styles.rowLabel}>Menos ya gozadas</span>
                        <span className={styles.rowValue}>{resultado.dias_vacaciones_año_actual_ya_gozadas} días</span>
                      </div>
                      <div className={`${styles.softBadgeGreen} text-right`}>
                        = A pagar año actual: {resultado.dias_vacaciones_año_actual_pendientes} días
                      </div>
                      <div className={`${styles.softBadgeBlue} mt-1 text-right`}>
                        = TOTAL a pagar: {resultado.dias_vacaciones_totales} días
                      </div>
                    </div>
                  </div>

                  {/* Prima vacacional */}
                  <div className={styles.conceptCard}>
                    <div className={styles.conceptTitle}>Prima Vacacional</div>
                    <div className={styles.conceptAmount}>
                      ${Number(resultado.monto_prima_vacacional).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </div>
                    <div className={`${styles.conceptBox}`}>
                      <div className={styles.row}>
                        <span className={styles.rowLabel}>Vacaciones totales</span>
                        <span className={styles.rowValue}>{resultado.dias_vacaciones_totales} días</span>
                      </div>
                      <div className={styles.row}>
                        <span className={styles.rowLabel}>Porcentaje</span>
                        <span className={styles.rowValue}>{Number(resultado.prima_vacacional_porcentaje).toFixed(0)}%</span>
                      </div>
                      <div className={`${styles.softBadgeBlue} mt-1 text-right`}>
                        = Total: ${Number(resultado.monto_prima_vacacional).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Subtotal Finiquito */}
                <div className={styles.subtotalBar}>
                  <div className="flex items-center justify-between">
                    <div className={styles.subtotalLabel}>Subtotal Finiquito</div>
                    <div className={styles.subtotalValue}>
                      ${Number(resultado.subtotal_finiquito).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* Conceptos de liquidación */}
                {resultado.es_liquidacion && (
                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-red-700">⚖️ Conceptos de Liquidación (LFT)</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Prima de antigüedad */}
                      <div className={styles.conceptCard}>
                        <div className={styles.conceptTitle}>Prima de Antigüedad</div>
                        <div className={styles.conceptAmount}>
                          ${Number(resultado.monto_prima_antiguedad).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                        </div>
                        <div className={styles.conceptBox}>
                          <div className={styles.row}>
                            <span className={styles.rowLabel}>Años completos</span>
                            <span className={styles.rowValue}>{resultado.años_completos} años</span>
                          </div>
                          <div className={styles.row}>
                            <span className={styles.rowLabel}>12 días por año</span>
                            <span className={styles.rowValue}>12 días</span>
                          </div>
                          <div className={styles.row}>
                            <span className={styles.rowLabel}>Salario diario</span>
                            <span className={styles.rowValue}>${Number(resultado.salario_diario).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className={styles.row}>
                            <span className={styles.rowLabel}>Tope (2× mínimo)</span>
                            <span className={styles.rowValue}>${Number(resultado.tope_prima_antiguedad).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className={`${styles.softBadgeBlue} mt-1 text-right`}>
                            = Total: ${Number(resultado.monto_prima_antiguedad).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <small className="text-xs text-muted-foreground block mt-1">Art. 162 LFT - 12 días × años (tope 2× salario mínimo)</small>
                      </div>

                      {/* Indemnización constitucional */}
                      <div className={styles.conceptCard}>
                        <div className={styles.conceptTitle}>Indemnización Constitucional</div>
                        <div className={styles.conceptAmount}>
                          ${Number(resultado.monto_indemnizacion_constitucional).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                        </div>
                        <div className={styles.conceptBox}>
                          <div className={styles.row}>
                            <span className={styles.rowLabel}>3 meses de salario</span>
                            <span className={styles.rowValue}>{resultado.dias_indemnizacion_3_meses} días</span>
                          </div>
                          <div className={styles.row}>
                            <span className={styles.rowLabel}>20 días por año</span>
                            <span className={styles.rowValue}>{Number(resultado.dias_20_por_año).toFixed(0)} días</span>
                          </div>
                          <div className={`${styles.softBadgeGreen} text-right`}>
                            = Total días: {Number(resultado.dias_indemnizacion_total).toFixed(0)} días
                          </div>
                          <div className={`${styles.softBadgeBlue} mt-1 text-right`}>
                            = Total: ${Number(resultado.monto_indemnizacion_constitucional).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <small className="text-xs text-muted-foreground block mt-1">Art. 50 LFT - 3 meses + 20 días por año trabajado</small>
                      </div>

                      {/* Salarios vencidos */}
                      <div className={styles.conceptCard}>
                        <div className={styles.conceptTitle}>Salarios Vencidos</div>
                        <div className={styles.conceptAmount}>
                          ${Number(resultado.monto_salarios_vencidos).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                        </div>
                        <div className={styles.conceptBox}>
                          <div className={styles.row}>
                            <span className={styles.rowLabel}>Días vencidos</span>
                            <span className={styles.rowValue}>{Number(resultado.dias_salarios_vencidos).toFixed(2)} días</span>
                          </div>
                          <div className={styles.row}>
                            <span className={styles.rowLabel}>Salario diario</span>
                            <span className={styles.rowValue}>${Number(resultado.salario_diario).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className={`${styles.softBadgeBlue} mt-1 text-right`}>
                            = Total: ${Number(resultado.monto_salarios_vencidos).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <small className="text-xs text-muted-foreground block mt-1">Art. 48 LFT - Desde despido hasta pago</small>
                      </div>
                    </div>
                    <div className={styles.subtotalBar}>
                      <div className="flex items-center justify-between">
                        <div className={styles.subtotalLabel}>Subtotal Liquidación</div>
                        <div className={styles.subtotalValue}>
                          ${Number(resultado.subtotal_liquidacion).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TOTAL */}
                <div className={styles.totalBar}>
                  <div className="flex items-center justify-between">
                    <div className={styles.totalLabel}>TOTAL A PAGAR</div>
                    <div className={styles.totalAmount}>
                      ${Number(resultado.total_pagar).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
                    </div>
                  </div>
                </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Confirmación de eliminación estilizada (shadcn/ui) */}
      <AlertDialog open={!!deleteRow} onOpenChange={(open) => !open && setDeleteRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar finiquito?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteRow
                ? `Esta acción no se puede deshacer. Se eliminará el finiquito de ${deleteRow?.nombre_completo || ""}.`
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

      {/* Ver finiquito/liquidación */}
      <FiniquitoViewDialog
        open={!!viewRow}
        setOpen={(o) => { if (!o) setViewRow(null); }}
        id={viewRow?.id_finiquito || viewRow?.id}
      />
      
      {/* Accesos Rápidos - Componente reutilizable (al final de la página) */}
      <AccesosRapidos />
    </div>
  );
}