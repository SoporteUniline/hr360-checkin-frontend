"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Download,
  Plus,
  Trash2,
  Calculator,
  Eye,
  AlertTriangle,
  Pencil,
  Save,
  Loader2,
  Printer,
} from "lucide-react";
import FiniquitoViewDialog from "./FiniquitoViewDialog";
import dayjs from "dayjs";
import { jsPDF } from "jspdf";
import AccesosRapidos from "@/components/AccesosRapidos";
import useSWR from "swr";
import { fetcherWithToken, swr_config } from "@/lib/fetcher";
import { fetchImageAsDataUrl } from "@/lib/pdfCompanyLogo";
import HeaderMultiFilter from "../registro-asistencia/HeaderMultiFilter";
import ActiveFilterChips from "../registro-asistencia/ActiveFilterChips";
import { Combobox } from "@/components/Combobox";
import useUnidadesNegocio from "@/hooks/useUnidadesNegocio";

// Página de Panel para "Finiquitos y liquidaciones"
// - Relación:
//   - Navegación: `src/components/Sidebar/nav-main.jsx`
//   - API cliente: `src/lib/finiquitosApi.js`
//   - Hook datos: `src/hooks/useFiniquitosData.js`
export default function PageFiniquitosLiquidaciones() {
  const { dataUser } = useAuth();
  const { options: unidadOptions, byId: unidadById } = useUnidadesNegocio();

  const empresaFiltro = "all";
  const [unidadCalculo, setUnidadCalculo] = useState("");

  const mostrarEmpresa = empresaFiltro !== "all";

  // Para la tabla
  const idEmpresaFiltro =
    empresaFiltro === "all" ? null : Number(empresaFiltro);

  // Para el cálculo
  const idEmpresaCalculo = unidadCalculo
    ? Number(unidadById?.[String(unidadCalculo)]?.id_empresa)
    : null;

  /**
   * Datos de empresa para logo/marca del PDF (formato unificado).
   * - Relación: `src/app/panel/cuenta/Empresa/ImagenEmpresa.jsx`.
   */
  const { data: empresaData } = useSWR(
    idEmpresaCalculo ? `/empresas/${idEmpresaCalculo}` : null,
    fetcherWithToken,
    swr_config,
  );

  /**
   * Logo precargado como DataURL.
   * - Fallback a `/assets/logo.png` para que siempre se vea una marca en el header.
   */
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  useEffect(() => {
    let alive = true;
    const run = async () => {
      const companyUrl = empresaData?.url_imagen;
      const companyDataUrl = companyUrl
        ? await fetchImageAsDataUrl(companyUrl)
        : null;
      const fallbackDataUrl = companyDataUrl
        ? null
        : await fetchImageAsDataUrl("/assets/logo.png");
      if (alive) setLogoDataUrl(companyDataUrl || fallbackDataUrl || null);
    };
    run();
    return () => {
      alive = false;
    };
  }, [empresaData?.url_imagen]);

  // Estado tabs
  const [tab, setTab] = useState("tabla");
  const [loading, setLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");

  // Paginación
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filterOptionsRows, setFilterOptionsRows] = useState([]);
  const [headerFilterMeta, setHeaderFilterMeta] = useState({
    active: false,
    total: 0,
  });
  const [idSeleccionado, setIdSeleccionado] = useState([]);
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState([]);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState([]);
  const [tipoSeleccionado, setTipoSeleccionado] = useState([]);
  const [estadoSeleccionado, setEstadoSeleccionado] = useState([]);

  // Datos listados
  const { data, isLoading, mutate } = useFiniquitosData({
    idEmpresa: idEmpresaFiltro,
    page,
    limit,
    search: "",
    estatus: "",
    tipo: "",
  });

  const finiquitos = data?.data || [];
  const total = data?.total || 0;

  const sourceRows = useMemo(
    () =>
      Array.isArray(filterOptionsRows) && filterOptionsRows.length > 0
        ? filterOptionsRows
        : finiquitos,
    [filterOptionsRows, finiquitos],
  );
  const uniqueOptions = (values) =>
    [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const idOptions = useMemo(
    () => uniqueOptions(sourceRows.map((f) => String(f.id_finiquito || ""))),
    [sourceRows],
  );
  const empresaOptions = useMemo(
    () =>
      uniqueOptions(
        sourceRows.map(
          (f) => f.unidad_negocio || f.nombre_sucursal || f.nombre_empresa,
        ),
      ),
    [sourceRows],
  );
  const empleadoOptions = useMemo(
    () => uniqueOptions(sourceRows.map((f) => f.nombre_completo)),
    [sourceRows],
  );
  const tipoOptions = useMemo(
    () =>
      uniqueOptions(
        sourceRows.map((f) => (f.es_liquidacion ? "Liquidación" : "Finiquito")),
      ),
    [sourceRows],
  );
  const estadoOptions = useMemo(
    () => uniqueOptions(sourceRows.map((f) => f.estado || "Pendiente")),
    [sourceRows],
  );
  const filteredRowsAll = useMemo(
    () =>
      sourceRows.filter((f) => {
        const idValue = String(f.id_finiquito || "");
        const empresaValue =
          f.unidad_negocio || f.nombre_sucursal || f.nombre_empresa;
        const empleadoValue = f.nombre_completo;
        const tipoValue = f.es_liquidacion ? "Liquidación" : "Finiquito";
        const estadoValue = f.estado || "Pendiente";
        const passId = idSeleccionado.length === 0 || idSeleccionado.includes(idValue);
        const passEmpresa =
          empresaSeleccionada.length === 0 ||
          empresaSeleccionada.includes(empresaValue);
        const passEmpleado =
          empleadoSeleccionado.length === 0 ||
          empleadoSeleccionado.includes(empleadoValue);
        const passTipo =
          tipoSeleccionado.length === 0 || tipoSeleccionado.includes(tipoValue);
        const passEstado =
          estadoSeleccionado.length === 0 ||
          estadoSeleccionado.includes(estadoValue);
        return passId && passEmpresa && passEmpleado && passTipo && passEstado;
      }),
    [
      sourceRows,
      idSeleccionado,
      empresaSeleccionada,
      empleadoSeleccionado,
      tipoSeleccionado,
      estadoSeleccionado,
    ],
  );
  const hasActiveHeaderFilters =
    idSeleccionado.length > 0 ||
    empresaSeleccionada.length > 0 ||
    empleadoSeleccionado.length > 0 ||
    tipoSeleccionado.length > 0 ||
    estadoSeleccionado.length > 0;
  const displayedRows = useMemo(() => {
    if (!hasActiveHeaderFilters) return finiquitos;
    const offset = (page - 1) * limit;
    return filteredRowsAll.slice(offset, offset + limit);
  }, [hasActiveHeaderFilters, finiquitos, page, limit, filteredRowsAll]);
  const clearAllHeaderFilters = () => {
    setIdSeleccionado([]);
    setEmpresaSeleccionada([]);
    setEmpleadoSeleccionado([]);
    setTipoSeleccionado([]);
    setEstadoSeleccionado([]);
  };

  useEffect(() => {
    let isCancelled = false;
    const loadFilterOptionsRows = async () => {
      try {
        const pageSize = 500;
        const firstResp = await finiquitosApi.listar({
          empresa: idEmpresaFiltro ?? "all",
          page: 1,
          limit: pageSize,
          search: "",
          estatus: "",
          tipo: "",
        });
        let allRows = Array.isArray(firstResp?.data) ? firstResp.data : [];
        const totalRows = Number(firstResp?.total || allRows.length);
        const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
        for (let currentPage = 2; currentPage <= totalPages; currentPage += 1) {
          const pageResp = await finiquitosApi.listar({
            empresa: idEmpresaFiltro ?? "all",
            page: currentPage,
            limit: pageSize,
            search: "",
            estatus: "",
            tipo: "",
          });
          const rows = Array.isArray(pageResp?.data) ? pageResp.data : [];
          allRows = [...allRows, ...rows];
        }
        if (!isCancelled) setFilterOptionsRows(allRows);
      } catch (_) {
        if (!isCancelled) setFilterOptionsRows([]);
      }
    };
    loadFilterOptionsRows();
    return () => {
      isCancelled = true;
    };
  }, [idEmpresaFiltro]);

  useEffect(() => {
    setHeaderFilterMeta({
      active: hasActiveHeaderFilters,
      total: filteredRowsAll.length,
    });
  }, [hasActiveHeaderFilters, filteredRowsAll.length]);

  useEffect(() => {
    if (!headerFilterMeta.active) return;
    const totalPages = Math.max(1, Math.ceil(headerFilterMeta.total / limit));
    if (page > totalPages) setPage(1);
  }, [headerFilterMeta, page, limit]);

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
  const [editingFiniquitoId, setEditingFiniquitoId] = useState(null);
  const [isPreparingPrintCalc, setIsPreparingPrintCalc] = useState(false);
  const [deleteRow, setDeleteRow] = useState(null);
  const [viewRow, setViewRow] = useState(null);

  // Sugerencias de empleados como contratos
  const empleadosSugResp = useEmpleadosActivosFiniquito({
    empresa: idEmpresaCalculo,
    q: empSearch,
    limit: 8,
  });

  const sugerencias = useMemo(
    () => empleadosSugResp?.data || [],
    [empleadosSugResp?.data],
  );

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
    setEditingFiniquitoId(null);
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
      const diasTrabajados = Math.floor(
        (fechaBajaDate - fechaIngreso) / (1000 * 60 * 60 * 24),
      );
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
    setEditingFiniquitoId(null);
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
    if (!idEmpresaCalculo) {
      setAlertMsg("Selecciona una unidad de negocio para el cálculo");
      return;
    }

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
      dias_vacaciones_año_actual_ya_gozadas: parseFloat(
        diasVacYaGozadas || "0",
      ),
      prima_vacacional_porcentaje_manual: parseFloat(primaVacacional || "25"),
      dias_aguinaldo_manual: parseFloat(diasAguinaldo || "15"),
      dias_salarios_vencidos: parseFloat(diasSalariosVencidos || "0"),
    };
    setLoading(true);
    try {
      const res = await finiquitosApi.calcular(payload);
      setResultado(res);
      setGuardable(true);
      setAlertMsg(
        "✅ Cálculo realizado correctamente. Revisa el detalle y genera el PDF si lo requieres.",
      );
    } finally {
      setLoading(false);
    }
  };

  const guardar = async () => {
    if (!idEmpresaCalculo) {
      setAlertMsg("Selecciona una unidad de negocio para el cálculo");
      return;
    }

    if (!resultado) return;
    const payload = {
      ...resultado,
      id_empleado: parseInt(idEmpleado || resultado.id_empleado || 0),
      id_empresa: parseInt(idEmpresaCalculo || resultado.id_empresa || 0),
      fecha_baja: fechaBaja,
      tipo_terminacion: tipoTerminacion,
      es_liquidacion: tipoCalculo === "liquidacion",
      salario_diario: parseFloat(salarioDiario || resultado.salario_diario || 0),
      dias_salario_pendiente: parseFloat(
        diasSalarioPendiente || resultado.dias_salario_pendiente || 0,
      ),
      dias_no_trabajados: parseFloat(
        diasNoTrabajados || resultado.dias_no_trabajados || 0,
      ),
      dias_vacaciones_años_anteriores: parseFloat(
        diasVacAnteriores || resultado.dias_vacaciones_años_anteriores || 0,
      ),
      dias_vacaciones_ley_año_actual: parseFloat(
        diasVacLeyActual || resultado.dias_vacaciones_ley_año_actual || 12,
      ),
      dias_vacaciones_año_actual_ya_gozadas: parseFloat(
        diasVacYaGozadas || resultado.dias_vacaciones_año_actual_ya_gozadas || 0,
      ),
      prima_vacacional_porcentaje: parseFloat(
        primaVacacional || resultado.prima_vacacional_porcentaje || 25,
      ),
      dias_aguinaldo: parseFloat(diasAguinaldo || resultado.dias_aguinaldo || 15),
      dias_salarios_vencidos: parseFloat(
        diasSalariosVencidos || resultado.dias_salarios_vencidos || 0,
      ),
      motivo_baja: motivoBaja,
      calculado_por: dataUser?.correo || dataUser?.email || "",
    };
    setLoading(true);
    try {
      if (editingFiniquitoId) {
        await finiquitosApi.actualizar(editingFiniquitoId, payload);
      } else {
        const res = await finiquitosApi.guardar(payload);
        // Actualizar estado a "Pagado" inmediatamente después de crear
        try {
          const nuevoId = res?.id_finiquito || res?.id || null;
          if (nuevoId) {
            await finiquitosApi.actualizarEstado(nuevoId, "Pagado");
          }
        } catch (_) {}
        setAlertMsg(
          "✅ Guardado correctamente y marcado como Pagado. Puedes ver el registro en la pestaña de 'Finiquitos Guardados'.",
        );
      }
      setGuardable(false);
      await mutate();
      if (editingFiniquitoId) {
        setAlertMsg("✅ Cambios guardados correctamente.");
      }
      setTab("tabla");
      resetFormulario();
    } finally {
      setLoading(false);
    }
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
      setDiasVacYaGozadas(
        String(det.dias_vacaciones_año_actual_ya_gozadas || "0"),
      );
      setPrimaVacacional(String(det.prima_vacacional_porcentaje || "25"));
      setDiasAguinaldo(String(det.dias_aguinaldo || "15"));
      setDiasSalariosVencidos(String(det.dias_salarios_vencidos || "0"));
      setMotivoBaja(det.motivo_baja || "");
      const unidadByEmpresa = unidadOptions.find(
        (unidad) => Number(unidad.id_empresa) === Number(det.id_empresa),
      );
      setUnidadCalculo(unidadByEmpresa ? unidadByEmpresa.value : "");
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
      // Mantener resultado y habilitar guardado inmediato en edición.
      setResultado(det);
      setGuardable(true);
      setEditingFiniquitoId(det.id_finiquito || row.id || null);
    } catch (_) {}
  };

  const eliminarFiniquito = (row) => {
    setDeleteRow(row);
  };

  /**
   * PDF unificado (formato nuevo) para Finiquito/Liquidación (Calculadora).
   * - Relación:
   *   - Botón "📄 Generar PDF" en el formulario de cálculo.
   *   - Mantiene el PDF anterior como referencia (no se elimina).
   */
  const buildPdfFormatoNuevo = () => {
    if (!idEmpresaCalculo) {
      setAlertMsg("Selecciona una empresa para el cálculo");
      return null;
    }

    if (!resultado) return null;

    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = 210;
    const pageHeight = 297;
    const marginLeft = 20;
    const marginRight = 20;
    const contentWidth = pageWidth - marginLeft - marginRight;
    const systemLabel = "ADAMIA HR360";
    let y = marginLeft;

    const safe = (value) =>
      String(value || "")
        .replace(/\p{Extended_Pictographic}|\uFE0F|\u200D/gu, "")
        .replace(/\s+/g, " ")
        .trim();
    const money = (value) =>
      `$${Number(value || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const needSpace = (height) => {
      if (y + height > pageHeight - 65) {
        doc.addPage();
        y = marginLeft;
      }
    };
    const hRule = (yPos, width = contentWidth, lineWidth = 0.3) => {
      doc.setDrawColor(0);
      doc.setLineWidth(lineWidth);
      doc.line(marginLeft, yPos, marginLeft + width, yPos);
    };
    const sectionTitle = (text) => {
      needSpace(12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(0);
      doc.text(String(text || "").toUpperCase(), marginLeft, y + 5);
      hRule(y + 7, contentWidth, 0.5);
      y += 12;
    };
    const fieldPair = (label, value, x, yPos, width = contentWidth / 2 - 4) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(140);
      doc.text(String(label || "").toUpperCase(), x, yPos);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.text(safe(value), x, yPos + 5);
      doc.setDrawColor(200);
      doc.setLineWidth(0.2);
      doc.line(x, yPos + 7, x + width, yPos + 7);
    };
    const drawWrappedSectionText = ({ sectionName, textValue, emptyFallback }) => {
      sectionTitle(sectionName);
      const textInsetLeft = 2;
      const textInsetRight = 8;
      const lineHeight = 6;
      const maxTextWidth = contentWidth - textInsetLeft - textInsetRight;
      const sourceText = String(textValue || emptyFallback)
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\u00A0/g, " ");
      const safeLines = [];
      const paragraphs = sourceText.split("\n");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(textValue ? 0 : 160);
      for (const paragraph of paragraphs) {
        const cleanedParagraph = paragraph.trim();
        if (!cleanedParagraph) {
          safeLines.push("");
          continue;
        }
        const breakableParagraph = cleanedParagraph.replace(
          /(\S{24})(?=\S)/g,
          "$1 ",
        );
        safeLines.push(...doc.splitTextToSize(breakableParagraph, maxTextWidth));
      }
      for (const line of safeLines) {
        needSpace(lineHeight + 2);
        doc.text(String(line || " "), marginLeft + textInsetLeft, y);
        y += lineHeight;
      }
      hRule(y + 1, contentWidth, 0.2);
      y += 10;
    };
    const drawAmountRows = (title, rows) => {
      sectionTitle(title);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      rows.forEach(([label, amount]) => {
        needSpace(8);
        doc.setTextColor(70);
        doc.text(safe(label), marginLeft, y);
        doc.setTextColor(0);
        doc.setFont("helvetica", "bold");
        doc.text(safe(amount), pageWidth - marginRight, y, { align: "right" });
        doc.setFont("helvetica", "normal");
        doc.setDrawColor(220);
        doc.setLineWidth(0.2);
        doc.line(marginLeft, y + 2, pageWidth - marginRight, y + 2);
        y += 7;
      });
      y += 4;
    };

    const companyName =
      safe(empresaData?.nombre_empresa || dataUser?.empresa?.nombre_empresa) ||
      "ADAMIA Human Resources";
    const tipoDocumento = resultado.es_liquidacion ? "LIQUIDACION" : "FINIQUITO";
    const folio = String(resultado.id_finiquito || resultado.id || "").padStart(3, "0");
    const fechaBaja = resultado.fecha_baja
      ? dayjs(resultado.fecha_baja).format("DD/MM/YYYY")
      : "—";
    const empleadoName = safe(resultado.nombre_completo || "—");
    const totalPagar = money(resultado.total_pagar);

    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, "PNG", marginLeft, y, 28, 10);
      } catch {}
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text("HUMAN RESOURCES CLOUD PLATFORM", marginLeft, y + 13);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(0);
    doc.text(tipoDocumento, pageWidth - marginRight, y + 7, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Folio #${folio}`, pageWidth - marginRight, y + 13, { align: "right" });

    y += 20;
    hRule(y, contentWidth, 0.8);
    y += 6;

    const boxWidth = 24;
    const boxGap = 8;
    const metaWidth = contentWidth - boxWidth - boxGap;
    const col = metaWidth / 3;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(140);
    doc.text("TIPO", marginLeft, y + 3);
    doc.text("EMPLEADO", marginLeft + col, y + 3);
    doc.text("FECHA BAJA", marginLeft + col * 2, y + 3);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(tipoDocumento, marginLeft, y + 9);
    doc.text(empleadoName, marginLeft + col, y + 9, { maxWidth: col - 6 });
    doc.text(fechaBaja, marginLeft + col * 2, y + 9, { maxWidth: col - 6 });

    const boxX = marginLeft + metaWidth + boxGap;
    const boxY = y - 1;
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(boxX, boxY, boxWidth, 18, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(totalPagar.replace("$", ""), boxX + boxWidth / 2, boxY + 9, {
      align: "center",
      maxWidth: boxWidth - 2,
    });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.text("TOTAL", boxX + boxWidth / 2, boxY + 15, { align: "center" });

    y += 18;
    hRule(y, contentWidth, 0.3);
    y += 8;

    sectionTitle("Datos del empleado");
    needSpace(20);
    fieldPair("Nombre completo", empleadoName, marginLeft, y);
    fieldPair("Puesto", resultado.puesto || "—", marginLeft + contentWidth / 2 + 4, y);
    y += 16;
    fieldPair("Departamento", resultado.departamento || "—", marginLeft, y);
    fieldPair(
      "Fecha ingreso",
      resultado.fecha_ingreso ? dayjs(resultado.fecha_ingreso).format("DD/MM/YYYY") : "—",
      marginLeft + contentWidth / 2 + 4,
      y,
    );
    y += 16;
    fieldPair("Anios trabajados", `${resultado.años_trabajados || 0}`, marginLeft, y);
    fieldPair(
      "Salario diario",
      money(resultado.salario_diario),
      marginLeft + contentWidth / 2 + 4,
      y,
    );
    y += 18;

    drawAmountRows("Conceptos de finiquito", [
      ["Salario pendiente", money(resultado.monto_salario_pendiente)],
      ["Aguinaldo proporcional", money(resultado.monto_aguinaldo_proporcional)],
      ["Vacaciones no gozadas", money(resultado.monto_vacaciones_no_gozadas)],
      ["Prima vacacional", money(resultado.monto_prima_vacacional)],
      ["Subtotal finiquito", money(resultado.subtotal_finiquito)],
    ]);

    if (resultado.es_liquidacion) {
      drawAmountRows("Conceptos de liquidacion", [
        ["Prima antiguedad", money(resultado.monto_prima_antiguedad)],
        [
          "Indemnizacion constitucional",
          money(resultado.monto_indemnizacion_constitucional),
        ],
        ["Salarios vencidos", money(resultado.monto_salarios_vencidos)],
        ["Subtotal liquidacion", money(resultado.subtotal_liquidacion)],
      ]);
    }

    drawWrappedSectionText({
      sectionName: "Motivo de baja",
      textValue: motivoBaja || resultado.motivo_baja,
      emptyFallback: "—",
    });

    const totalPages = doc.internal.getNumberOfPages();
    const fechaGenerado = new Date().toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const horaGenerado = new Date().toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    });

    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      if (p === totalPages) {
        const yFirmas = pageHeight - 50;
        doc.setDrawColor(0);
        doc.setLineWidth(0.4);
        doc.line(marginLeft + 5, yFirmas, marginLeft + 75, yFirmas);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(0);
        doc.text("FIRMA DEL TRABAJADOR", marginLeft + 40, yFirmas + 5, {
          align: "center",
        });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(100);
        doc.text(empleadoName.slice(0, 40), marginLeft + 40, yFirmas + 10, {
          align: "center",
        });

        doc.line(
          pageWidth - marginRight - 75,
          yFirmas,
          pageWidth - marginRight - 5,
          yFirmas,
        );
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(0);
        doc.text(
          "REPRESENTANTE DE LA EMPRESA",
          pageWidth - marginRight - 40,
          yFirmas + 5,
          { align: "center" },
        );
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(100);
        doc.text(companyName.slice(0, 40), pageWidth - marginRight - 40, yFirmas + 10, {
          align: "center",
        });
      }
      doc.setDrawColor(180);
      doc.setLineWidth(0.2);
      doc.line(marginLeft, pageHeight - 14, pageWidth - marginRight, pageHeight - 14);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(160);
      doc.text(
        `Generado el ${fechaGenerado} a las ${horaGenerado} · ${systemLabel} · Folio #${folio} · Página ${p} de ${totalPages}`,
        pageWidth / 2,
        pageHeight - 9,
        { align: "center" },
      );
    }

    const nombreArchivo = `${
      resultado.es_liquidacion ? "LIQUIDACION" : "FINIQUITO"
    }_${String(resultado.nombre_completo || "Empleado").replace(
      /\s+/g,
      "_",
    )}.pdf`;
    return { doc, nombreArchivo };
  };

  const generarPDFFormatoNuevo = () => {
    const built = buildPdfFormatoNuevo();
    if (!built) return;
    built.doc.save(built.nombreArchivo);
  };

  const imprimirPDF = (doc, nombreArchivo) =>
    new Promise((resolve) => {
      try {
        const blob = doc.output("blob");
        const url = URL.createObjectURL(blob);
        const iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "0";
        iframe.src = url;

        let finished = false;
        let fallbackTimer = null;
        let mediaPollTimer = null;
        const MIN_PREPARING_MS = 4000;
        const preparingStartedAt = Date.now();
        let parentBlurred = false;
        let didEnterPrintMode = false;
        const mediaQuery =
          typeof window !== "undefined" && window.matchMedia
            ? window.matchMedia("print")
            : null;

        const finish = () => {
          if (finished) return;
          const elapsed = Date.now() - preparingStartedAt;
          const remaining = Math.max(0, MIN_PREPARING_MS - elapsed);
          setTimeout(() => {
            if (finished) return;
            finished = true;
            try {
              window.removeEventListener("blur", onParentBlur);
              window.removeEventListener("focus", onParentFocus);
              window.removeEventListener("afterprint", onAfterPrint);
              if (mediaQuery?.removeEventListener) {
                mediaQuery.removeEventListener("change", onMediaPrintChange);
              } else if (mediaQuery?.removeListener) {
                mediaQuery.removeListener(onMediaPrintChange);
              }
            } catch {}
            if (fallbackTimer) clearTimeout(fallbackTimer);
            if (mediaPollTimer) clearInterval(mediaPollTimer);
            resolve();
            setTimeout(() => {
              try {
                URL.revokeObjectURL(url);
                iframe.remove();
              } catch {}
            }, 2000);
          }, remaining);
        };

        const onAfterPrint = () => finish();
        const onParentBlur = () => {
          parentBlurred = true;
        };
        const onParentFocus = () => {
          if (parentBlurred) finish();
        };
        const onMediaPrintChange = (event) => {
          const isPrinting = !!event?.matches;
          if (isPrinting) {
            didEnterPrintMode = true;
            return;
          }
          if (didEnterPrintMode) finish();
        };

        iframe.onload = () => {
          try {
            window.addEventListener("afterprint", onAfterPrint);
            window.addEventListener("blur", onParentBlur);
            window.addEventListener("focus", onParentFocus);
            if (mediaQuery?.addEventListener) {
              mediaQuery.addEventListener("change", onMediaPrintChange);
            } else if (mediaQuery?.addListener) {
              mediaQuery.addListener(onMediaPrintChange);
            }
            if (iframe.contentWindow) {
              iframe.contentWindow.onafterprint = () => finish();
            }
            iframe.contentWindow?.focus();
            setTimeout(() => {
              iframe.contentWindow?.print();
            }, 80);

            mediaPollTimer = setInterval(() => {
              const hasFocus =
                typeof document !== "undefined" &&
                typeof document.hasFocus === "function"
                  ? document.hasFocus()
                  : true;
              if (parentBlurred && hasFocus) {
                finish();
                return;
              }
              if (!mediaQuery) return;
              if (mediaQuery.matches) {
                didEnterPrintMode = true;
              } else if (didEnterPrintMode) {
                finish();
              }
            }, 400);

            fallbackTimer = setTimeout(() => {
              finish();
            }, 25000);
          } catch {
            doc.save(nombreArchivo);
            finish();
          }
        };

        document.body.appendChild(iframe);
      } catch (e) {
        console.error(e);
        doc.save(nombreArchivo);
        resolve();
      }
    });


  const confirmDelete = async () => {
    if (!deleteRow) return;
    await finiquitosApi.eliminar(deleteRow.id_finiquito || deleteRow.id);
    setDeleteRow(null);
    await mutate();
  };

  return (
    <div className={`${styles.finTheme} space-y-6`}>
      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-2 bg-gray-100 rounded-lg p-1">
          <TabsTrigger
            value="tabla"
            className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-[#2563EB] data-[state=active]:shadow-sm data-[state=active]:font-semibold rounded-md transition-all"
          >
            <Eye className="h-4 w-4" /> Guardados
          </TabsTrigger>
          <TabsTrigger
            value="calculadora"
            className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-[#2563EB] data-[state=active]:shadow-sm data-[state=active]:font-semibold rounded-md transition-all"
          >
            <Calculator className="h-4 w-4" /> Calculadora
          </TabsTrigger>
        </TabsList>
        <TabsContent value="tabla" className="space-y-3 mt-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Resultados: {total}
            </div>
            <Button
              onClick={() => {
                resetFormulario();
                setTab("calculadora");
              }}
              className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-sm"
            >
              <Plus className="h-4 w-4 mr-2" /> Nuevo Finiquito
            </Button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
           
            <ActiveFilterChips
              groups={[
                {
                  category: "ID",
                  values: idSeleccionado,
                  options: idOptions,
                  onChange: setIdSeleccionado,
                },
                {
                  category: "Unidad de negocio",
                  values: empresaSeleccionada,
                  options: empresaOptions,
                  onChange: setEmpresaSeleccionada,
                },
                {
                  category: "Empleado",
                  values: empleadoSeleccionado,
                  options: empleadoOptions,
                  onChange: setEmpleadoSeleccionado,
                },
                {
                  category: "Tipo",
                  values: tipoSeleccionado,
                  options: tipoOptions,
                  onChange: setTipoSeleccionado,
                },
                {
                  category: "Estado",
                  values: estadoSeleccionado,
                  options: estadoOptions,
                  onChange: setEstadoSeleccionado,
                },
              ]}
              onClearAll={clearAllHeaderFilters}
            />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase text-gray-700">
                      <HeaderMultiFilter
                        selected={idSeleccionado}
                        onChange={setIdSeleccionado}
                        options={idOptions}
                        placeholder="ID"
                      />
                    </th>
                    {!mostrarEmpresa && (
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase text-gray-700">
                        <HeaderMultiFilter
                          selected={empresaSeleccionada}
                          onChange={setEmpresaSeleccionada}
                          options={empresaOptions}
                          placeholder="Unidad de negocio"
                        />
                      </th>
                    )}
                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase text-gray-700">
                      <HeaderMultiFilter
                        selected={empleadoSeleccionado}
                        onChange={setEmpleadoSeleccionado}
                        options={empleadoOptions}
                        placeholder="Empleado"
                      />
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase text-gray-700">
                      Fecha baja
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase text-gray-700">
                      <HeaderMultiFilter
                        selected={tipoSeleccionado}
                        onChange={setTipoSeleccionado}
                        options={tipoOptions}
                        placeholder="Tipo"
                      />
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase text-gray-700">
                      Total
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase text-gray-700">
                      <HeaderMultiFilter
                        selected={estadoSeleccionado}
                        onChange={setEstadoSeleccionado}
                        options={estadoOptions}
                        placeholder="Estado"
                      />
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase text-gray-700">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(displayedRows || []).map((f) => {
                    const tipoBadge = f.es_liquidacion
                      ? "Liquidación"
                      : "Finiquito";
                    const tipoClass = f.es_liquidacion
                      ? styles["tag-liquidacion"]
                      : styles["tag-finiquito"];
                    const estClass =
                      (f.estado || "") === "Pagado"
                        ? styles["tag-pagado"]
                        : styles["tag-pendiente"];
                    return (
                      <tr
                        key={f.id_finiquito}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="px-3 py-2 font-semibold">
                          #{f.id_finiquito}
                        </td>
                        {!mostrarEmpresa && (
                          <td className="px-3 py-2">{f.nombre_empresa || "-"}</td>
                        )}
                        <td className="px-3 py-2">{f.nombre_completo}</td>
                        <td className="px-3 py-2">
                          {f.fecha_baja
                            ? dayjs(f.fecha_baja).format("DD/MM/YYYY")
                            : ""}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`${styles.tag} ${tipoClass}`}>
                            {tipoBadge}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-bold">
                          $
                          {Number(f.total_pagar || 0).toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`${styles.tag} ${estClass}`}>
                            {f.estado || "Pendiente"}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => editarFiniquito(f)}
                              className="p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4 text-[#2563EB]" />
                            </button>
                            <button
                              onClick={() => setViewRow(f)}
                              className="p-2 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                              title="Ver"
                            >
                              <Eye className="h-4 w-4 text-green-600" />
                            </button>
                            <button
                              onClick={() => eliminarFiniquito(f)}
                              className="p-2 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {(!displayedRows || displayedRows.length === 0) && (
                    <tr>
                      <td className="p-6 text-center text-gray-500" colSpan={8}>
                        No hay finiquitos guardados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <TablePagination
            page={page}
            limit={limit}
            total={headerFilterMeta.active ? headerFilterMeta.total : total}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </TabsContent>

        <TabsContent value="calculadora" className="space-y-4 mt-3">
          {/* Loader */}
          {loading && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
              <div className="bg-white rounded-xl p-6 text-center">
                <div className="animate-spin h-8 w-8 rounded-full border-2 border-slate-300 border-t-[var(--fin-primary)] mx-auto mb-3" />
                <div
                  className="font-semibold text-sm"
                  style={{ color: "var(--fin-primary)" }}
                >
                  Procesando...
                </div>
              </div>
            </div>
          )}

          {/* Mensaje de éxito */}
          {!!alertMsg && (
            <div
              className="rounded-md p-3 border-l-4"
              style={{
                background: "var(--fin-success-light)",
                borderLeftColor: "var(--fin-success)",
                color: "var(--fin-success)",
              }}
            >
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
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Unidad de negocio
                  </label>

                  <Combobox
                    options={unidadOptions}
                    value={unidadCalculo}
                    onChange={(value) => {
                      setUnidadCalculo(value);
                      setEmpSearch("");
                      setIdEmpleado("");
                      setEmpleadoInfo(null);
                      setResultado(null);
                      setGuardable(false);
                    }}
                    placeholder="Selecciona unidad para cálculo"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Empleado
                  </label>
                  <div className="relative">
                    <Input
                      placeholder={
                        unidadCalculo
                          ? "Buscar empleado..."
                          : "Selecciona primero una unidad"
                      }
                      value={empSearch}
                      disabled={!unidadCalculo}
                      onChange={(e) => {
                        setEmpSearch(e.target.value);
                        setOpenEmpSug(true);
                      }}
                      onFocus={() => {
                        if (!unidadCalculo) return;
                        setOpenEmpSug(true);
                      }}
                    />

                    {openEmpSug ? (
                      <div className="absolute left-0 right-0 mt-1 z-20 rounded-md border bg-white shadow max-h-64 overflow-auto">
                        {(sugerencias || [])
                          .filter((x) =>
                            (x.nombre_completo || "")
                              .toLowerCase()
                              .includes(empSearch.trim().toLowerCase()),
                          )
                          .slice(0, 50)
                          .map((emp) => (
                            <div
                              key={`emp-sel-${emp.id_empleado || emp.id}`}
                              className="px-3 py-2 cursor-pointer text-sm hover:bg-blue-50"
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
                  <label className="text-sm font-medium text-gray-700">
                    Fecha de baja
                  </label>
                  <Input
                    type="date"
                    value={fechaBaja}
                    onChange={(e) => setFechaBaja(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Tipo de cálculo
                  </label>
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
                  <label className="text-sm font-medium text-gray-700">
                    Tipo de terminación
                  </label>
                  <Select
                    value={tipoTerminacion}
                    onValueChange={setTipoTerminacion}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Renuncia Voluntaria">
                        Renuncia Voluntaria
                      </SelectItem>
                      <SelectItem value="Despido Justificado">
                        Despido Justificado
                      </SelectItem>
                      <SelectItem value="Despido Injustificado">
                        Despido Injustificado
                      </SelectItem>
                      <SelectItem value="Mutuo Acuerdo">
                        Mutuo Acuerdo
                      </SelectItem>
                      <SelectItem value="Fin de Contrato">
                        Fin de Contrato
                      </SelectItem>
                      <SelectItem value="Rescisión Artículo 51">
                        Rescisión Artículo 51 LFT
                      </SelectItem>
                      <SelectItem value="Defunción">Defunción</SelectItem>
                      <SelectItem value="Otros">Otros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-md bg-slate-50 p-3 text-sm">
                ℹ️ <b>Finiquito:</b> salario, aguinaldo, vacaciones, prima
                vacacional. <b>Liquidación:</b> agrega prima de antigüedad,
                indemnización y salarios vencidos.
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
                  <li>
                    Si el trabajador tiene ≥ 1 año: el periodo es del 1 de enero
                    al 31 de diciembre.
                  </li>
                  <li>
                    Si tiene &lt; 1 año: proporcional desde su fecha de ingreso
                    hasta el 31 de diciembre.
                  </li>
                </ul>
              </div>
              <div className={styles.infoSuccess}>
                <div className="font-semibold mb-1">VACACIONES</div>
                <ul className="list-disc pl-5 space-y-0.5">
                  <li>
                    Siempre se calculan con base en la fecha de ingreso
                    individual.
                  </li>
                  <li>
                    Cada aniversario genera un nuevo periodo vacacional (según
                    año cumplido).
                  </li>
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
                    <div className="text-xs text-muted-foreground">
                      Empleado
                    </div>
                    <div className="font-semibold break-words">
                      {empleadoInfo.nombre_completo || "--"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">
                      Fecha de ingreso
                    </div>
                    <div className="font-semibold">
                      {empleadoInfo.fecha_ingreso
                        ? dayjs(empleadoInfo.fecha_ingreso).format("DD/MM/YYYY")
                        : "--"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">
                      Departamento
                    </div>
                    <div className="font-semibold">
                      {empleadoInfo.departamento || "--"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">
                      Periodicidad
                    </div>
                    <div className="font-semibold">
                      {empleadoInfo.periodicidad_pago || "--"}
                    </div>
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
                    <label className="text-sm font-medium text-gray-700">
                      Salario diario
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={salarioDiario}
                      onChange={(e) => setSalarioDiario(e.target.value)}
                    />
                    <small className="text-muted-foreground">
                      Salario diario integrado
                    </small>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">
                      Días salario pendientes
                    </label>
                    <Input
                      type="number"
                      step="0.5"
                      value={diasSalarioPendiente}
                      onChange={(e) => setDiasSalarioPendiente(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">
                      Días no trabajados
                    </label>
                    <Input
                      type="number"
                      step="0.5"
                      value={diasNoTrabajados}
                      onChange={(e) => setDiasNoTrabajados(e.target.value)}
                    />
                    <small className="text-red-700">
                      Estos días reducen proporcionales
                    </small>
                  </div>
                </div>

                {/* Vacaciones */}
                <div
                  className="rounded-md border-l-4 p-3"
                  style={{ borderLeftColor: "#10b981", background: "#f0fdf4" }}
                >
                  <div
                    className="font-semibold text-sm mb-2"
                    style={{ color: "#166534" }}
                  >
                    🏖️ Vacaciones
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">
                        Años anteriores (no gozadas)
                      </label>
                      <Input
                        type="number"
                        step="0.5"
                        value={diasVacAnteriores}
                        onChange={(e) => setDiasVacAnteriores(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">
                        Días ley (año actual)
                      </label>
                      <Input
                        type="number"
                        step="1"
                        value={diasVacLeyActual}
                        onChange={(e) => setDiasVacLeyActual(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">
                        Ya gozadas (año actual)
                      </label>
                      <Input
                        type="number"
                        step="0.5"
                        value={diasVacYaGozadas}
                        onChange={(e) => setDiasVacYaGozadas(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">
                        Prima vacacional (%)
                      </label>
                      <Input
                        type="number"
                        step="0.5"
                        value={primaVacacional}
                        onChange={(e) => setPrimaVacacional(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className={`${styles.infoSuccess} mt-3`}>
                    <div className="font-semibold">ℹ️ Cálculo automático:</div>
                    <ul className="list-disc pl-5 mt-1 space-y-0.5">
                      <li>Se carga automáticamente según años trabajados</li>
                      <li>
                        Proporcional año actual = (Días según ley × Días
                        efectivos) ÷ 365
                      </li>
                      <li>A pagar año actual = Proporcional − Ya gozadas</li>
                      <li>
                        <strong>TOTAL</strong> = Años anteriores + A pagar año
                        actual
                      </li>
                    </ul>
                  </div>
                  <div className={`${styles.formulaBox} mt-2`}>
                    <strong>📐 FÓRMULA:</strong> Vacaciones proporcionales =
                    (Días_ley_año_actual × Días_efectivos) ÷ 365
                    <br />A pagar = Años_anteriores + (Proporcional −
                    Ya_gozadas)
                  </div>
                </div>

                {/* Aguinaldo */}
                <div className="rounded-md border-l-4 border-yellow-500 bg-yellow-50 p-3">
                  <div className="font-semibold text-sm mb-2 text-yellow-800">
                    Aguinaldo
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">
                        Días aguinaldo completo
                      </label>
                      <Input
                        type="number"
                        step="0.5"
                        value={diasAguinaldo}
                        onChange={(e) => setDiasAguinaldo(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className={`${styles.infoWarning} mt-3`}>
                    ℹ️ El <strong>aguinaldo proporcional</strong> se calculará
                    automáticamente según los días efectivos trabajados en el
                    año.
                  </div>
                  <div className={`${styles.formulaBox} mt-2`}>
                    <strong>📐 FÓRMULA:</strong> Aguinaldo proporcional =
                    (Días_aguinaldo × Días_efectivos) ÷ 365
                  </div>
                </div>

                {/* Liquidación extra */}
                {tipoCalculo === "liquidacion" && (
                  <div className="rounded-md border-l-4 border-red-500 bg-red-50 p-3">
                    <div className="font-semibold text-sm mb-2 text-red-800">
                      Conceptos de liquidación
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">
                          Días salarios vencidos
                        </label>
                        <Input
                          type="number"
                          step="0.5"
                          value={diasSalariosVencidos}
                          onChange={(e) =>
                            setDiasSalariosVencidos(e.target.value)
                          }
                        />
                      </div>
                    </div>
                    <div className={`${styles.infoDanger} mt-3`}>
                      ℹ️ <strong>Liquidación según LFT:</strong>
                      <ul className="list-disc pl-5 mt-1 space-y-0.5">
                        <li>
                          <strong>Prima de Antigüedad:</strong> 12 días × años
                          trabajados (tope 2× salario mínimo)
                        </li>
                        <li>
                          <strong>Indemnización:</strong> 3 meses + 20 días ×
                          años trabajados
                        </li>
                        <li>
                          <strong>Salarios Vencidos:</strong> Desde despido
                          hasta pago (Art. 48 LFT)
                        </li>
                      </ul>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-sm font-medium text-gray-700">
                      Motivo de baja
                    </label>
                    <textarea
                      className="w-full rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
                      rows={3}
                      value={motivoBaja}
                      onChange={(e) => setMotivoBaja(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="invisible">Acciones</label>
                    <div className="grid grid-cols-1 gap-2">
                      <Button
                        onClick={calcular}
                        className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-sm"
                      >
                        <Calculator className="h-4 w-4 mr-2" /> Calcular
                      </Button>
                      <Button
                        onClick={generarPDFFormatoNuevo}
                        disabled={!guardable || isPreparingPrintCalc}
                        variant="outline"
                        className="border-gray-300 disabled:opacity-50"
                      >
                        <Download className="h-4 w-4 mr-2" /> Descargar PDF
                      </Button>
                      <Button
                        onClick={async () => {
                          setIsPreparingPrintCalc(true);
                          try {
                            await new Promise((resolve) => setTimeout(resolve, 0));
                            const built = buildPdfFormatoNuevo();
                            if (!built) return;
                            await imprimirPDF(built.doc, built.nombreArchivo);
                          } finally {
                            setIsPreparingPrintCalc(false);
                          }
                        }}
                        disabled={!guardable || isPreparingPrintCalc}
                        variant="outline"
                        className="border-gray-300 disabled:opacity-50"
                      >
                        {isPreparingPrintCalc ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Printer className="h-4 w-4 mr-2" />
                        )}
                        {isPreparingPrintCalc ? "Preparando..." : "Imprimir PDF"}
                      </Button>
                      <Button
                        onClick={guardar}
                        disabled={!guardable || isPreparingPrintCalc}
                        className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-sm disabled:opacity-50"
                      >
                        <Save className="h-4 w-4 mr-2" />{" "}
                        {editingFiniquitoId ? "Guardar cambios" : "Guardar"}
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
                      <div className={styles.metricValue}>
                        {resultado.nombre_completo}
                      </div>
                    </div>
                    <div className={styles.metricCard}>
                      <div className={styles.metricLabel}>Días trabajados</div>
                      <div className={styles.metricValue}>
                        {resultado.dias_trabajados}
                      </div>
                    </div>
                    <div className={styles.metricCard}>
                      <div className={styles.metricLabel}>Años trabajados</div>
                      <div className={styles.metricValue}>
                        {resultado.años_trabajados}
                      </div>
                    </div>
                    <div className={styles.metricCard}>
                      <div className={styles.metricLabel}>Salario diario</div>
                      <div className={styles.metricValue}>
                        $
                        {Number(resultado.salario_diario).toLocaleString(
                          "es-MX",
                          { minimumFractionDigits: 2 },
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bloque de descuentos */}
                  {Number(resultado.dias_no_trabajados) > 0 && (
                    <div
                      className="rounded-md p-3"
                      style={{
                        background: "#fef2f2",
                        borderLeft: "4px solid #ef4444",
                      }}
                    >
                      <div
                        className="text-sm font-bold mb-2"
                        style={{ color: "#991b1b" }}
                      >
                        ⚠️ DESCUENTOS APLICADOS
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div className="rounded border p-2 bg-white">
                          <div className="text-xs text-muted-foreground">
                            Días transcurridos del año
                          </div>
                          <div className="font-semibold">
                            {resultado.dias_transcurridos_año_bruto}
                          </div>
                        </div>
                        <div className="rounded border p-2 bg-white">
                          <div className="text-xs text-muted-foreground">
                            Menos días no trabajados
                          </div>
                          <div className="font-semibold">
                            {Number(resultado.dias_no_trabajados).toFixed(2)}
                          </div>
                        </div>
                        <div className="rounded border p-2 bg-red-50">
                          <div className="text-xs text-muted-foreground">
                            = Días efectivos
                          </div>
                          <div className="font-bold">
                            {resultado.dias_transcurridos_año_neto}
                          </div>
                        </div>
                      </div>
                      <small
                        className="block mt-1"
                        style={{ color: "#991b1b" }}
                      >
                        Los días efectivos se usan para calcular aguinaldo y
                        vacaciones proporcionales del año actual.
                      </small>
                    </div>
                  )}

                  <div className={styles.sectionTitle}>
                    Conceptos de finiquito
                  </div>

                  {/* Conceptos de finiquito con desglose */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
                    {/* Salario pendiente */}
                    <div className={styles.conceptCard}>
                      <div className={styles.conceptTitle}>
                        Salario Pendiente
                      </div>
                      <div className={styles.conceptAmount}>
                        $
                        {Number(
                          resultado.monto_salario_pendiente,
                        ).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </div>
                      <div className={`${styles.conceptBox}`}>
                        <div className={styles.row}>
                          <span className={styles.rowLabel}>
                            Días pendientes
                          </span>
                          <span className={styles.rowValue}>
                            {Number(resultado.dias_salario_pendiente).toFixed(
                              2,
                            )}{" "}
                            días
                          </span>
                        </div>
                        <div className={styles.row}>
                          <span className={styles.rowLabel}>
                            Salario diario
                          </span>
                          <span className={styles.rowValue}>
                            $
                            {Number(resultado.salario_diario).toLocaleString(
                              "es-MX",
                              { minimumFractionDigits: 2 },
                            )}
                          </span>
                        </div>
                        <div
                          className={`${styles.softBadgeBlue} mt-1 text-right`}
                        >
                          = Total: $
                          {Number(
                            resultado.monto_salario_pendiente,
                          ).toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Aguinaldo proporcional */}
                    <div className={styles.conceptCard}>
                      <div className={styles.conceptTitle}>
                        Aguinaldo Proporcional
                      </div>
                      <div className={styles.conceptAmount}>
                        $
                        {Number(
                          resultado.monto_aguinaldo_proporcional,
                        ).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </div>
                      <div className={`${styles.conceptBox}`}>
                        <div className={styles.row}>
                          <span className={styles.rowLabel}>
                            Días aguinaldo completo
                          </span>
                          <span className={styles.rowValue}>
                            {Number(resultado.dias_aguinaldo).toFixed(2)} días
                          </span>
                        </div>
                        <div className={styles.row}>
                          <span className={styles.rowLabel}>
                            Días efectivos
                          </span>
                          <span className={styles.rowValue}>
                            {resultado.dias_transcurridos_año_neto} días
                          </span>
                        </div>
                        <div className={styles.row}>
                          <span className={styles.rowLabel}>Proporcional</span>
                          <span className={styles.rowValue}>
                            {resultado.dias_aguinaldo_proporcional} días
                          </span>
                        </div>
                        <div
                          className={`${styles.softBadgeBlue} mt-1 text-right`}
                        >
                          = Total: $
                          {Number(
                            resultado.monto_aguinaldo_proporcional,
                          ).toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                      </div>
                      <small className="text-xs text-muted-foreground block mt-1">
                        Fórmula: ({Number(resultado.dias_aguinaldo).toFixed(0)}{" "}
                        × {resultado.dias_transcurridos_año_neto}) ÷ 365
                      </small>
                    </div>

                    {/* Vacaciones no gozadas */}
                    <div className={styles.conceptCard}>
                      <div className={styles.conceptTitle}>
                        Vacaciones No Gozadas
                      </div>
                      <div className={styles.conceptAmount}>
                        $
                        {Number(
                          resultado.monto_vacaciones_no_gozadas,
                        ).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </div>
                      <div className={`${styles.conceptBox}`}>
                        <div className={styles.row}>
                          <span className={styles.rowLabel}>
                            Años anteriores
                          </span>
                          <span className={styles.rowValue}>
                            {Number(
                              resultado.dias_vacaciones_años_anteriores,
                            ).toFixed(2)}{" "}
                            días
                          </span>
                        </div>
                        <div className={styles.row}>
                          <span className={styles.rowLabel}>
                            Año actual según ley
                          </span>
                          <span className={styles.rowValue}>
                            {resultado.dias_vacaciones_ley_año_actual} días
                          </span>
                        </div>
                        <div className={styles.row}>
                          <span className={styles.rowLabel}>
                            Días efectivos
                          </span>
                          <span className={styles.rowValue}>
                            {resultado.dias_transcurridos_año_neto} días
                          </span>
                        </div>
                        <div className={styles.row}>
                          <span className={styles.rowLabel}>
                            Proporcional bruto
                          </span>
                          <span className={styles.rowValue}>
                            {
                              resultado.dias_vacaciones_año_actual_proporcional_bruto
                            }{" "}
                            días
                          </span>
                        </div>
                        <div className={styles.row}>
                          <span className={styles.rowLabel}>
                            Menos ya gozadas
                          </span>
                          <span className={styles.rowValue}>
                            {resultado.dias_vacaciones_año_actual_ya_gozadas}{" "}
                            días
                          </span>
                        </div>
                        <div className={`${styles.softBadgeGreen} text-right`}>
                          = A pagar año actual:{" "}
                          {resultado.dias_vacaciones_año_actual_pendientes} días
                        </div>
                        <div
                          className={`${styles.softBadgeBlue} mt-1 text-right`}
                        >
                          = TOTAL a pagar: {resultado.dias_vacaciones_totales}{" "}
                          días
                        </div>
                      </div>
                    </div>

                    {/* Prima vacacional */}
                    <div className={styles.conceptCard}>
                      <div className={styles.conceptTitle}>
                        Prima Vacacional
                      </div>
                      <div className={styles.conceptAmount}>
                        $
                        {Number(
                          resultado.monto_prima_vacacional,
                        ).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </div>
                      <div className={`${styles.conceptBox}`}>
                        <div className={styles.row}>
                          <span className={styles.rowLabel}>
                            Vacaciones totales
                          </span>
                          <span className={styles.rowValue}>
                            {resultado.dias_vacaciones_totales} días
                          </span>
                        </div>
                        <div className={styles.row}>
                          <span className={styles.rowLabel}>Porcentaje</span>
                          <span className={styles.rowValue}>
                            {Number(
                              resultado.prima_vacacional_porcentaje,
                            ).toFixed(0)}
                            %
                          </span>
                        </div>
                        <div
                          className={`${styles.softBadgeBlue} mt-1 text-right`}
                        >
                          = Total: $
                          {Number(
                            resultado.monto_prima_vacacional,
                          ).toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Subtotal Finiquito */}
                  <div className={styles.subtotalBar}>
                    <div className="flex items-center justify-between">
                      <div className={styles.subtotalLabel}>
                        Subtotal Finiquito
                      </div>
                      <div className={styles.subtotalValue}>
                        $
                        {Number(resultado.subtotal_finiquito).toLocaleString(
                          "es-MX",
                          { minimumFractionDigits: 2 },
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Conceptos de liquidación */}
                  {resultado.es_liquidacion && (
                    <div className="space-y-3">
                      <div className="text-sm font-semibold text-red-700">
                        ⚖️ Conceptos de Liquidación (LFT)
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Prima de antigüedad */}
                        <div className={styles.conceptCard}>
                          <div className={styles.conceptTitle}>
                            Prima de Antigüedad
                          </div>
                          <div className={styles.conceptAmount}>
                            $
                            {Number(
                              resultado.monto_prima_antiguedad,
                            ).toLocaleString("es-MX", {
                              minimumFractionDigits: 2,
                            })}
                          </div>
                          <div className={styles.conceptBox}>
                            <div className={styles.row}>
                              <span className={styles.rowLabel}>
                                Años completos
                              </span>
                              <span className={styles.rowValue}>
                                {resultado.años_completos} años
                              </span>
                            </div>
                            <div className={styles.row}>
                              <span className={styles.rowLabel}>
                                12 días por año
                              </span>
                              <span className={styles.rowValue}>12 días</span>
                            </div>
                            <div className={styles.row}>
                              <span className={styles.rowLabel}>
                                Salario diario
                              </span>
                              <span className={styles.rowValue}>
                                $
                                {Number(
                                  resultado.salario_diario,
                                ).toLocaleString("es-MX", {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                            <div className={styles.row}>
                              <span className={styles.rowLabel}>
                                Tope (2× mínimo)
                              </span>
                              <span className={styles.rowValue}>
                                $
                                {Number(
                                  resultado.tope_prima_antiguedad,
                                ).toLocaleString("es-MX", {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                            <div
                              className={`${styles.softBadgeBlue} mt-1 text-right`}
                            >
                              = Total: $
                              {Number(
                                resultado.monto_prima_antiguedad,
                              ).toLocaleString("es-MX", {
                                minimumFractionDigits: 2,
                              })}
                            </div>
                          </div>
                          <small className="text-xs text-muted-foreground block mt-1">
                            Art. 162 LFT - 12 días × años (tope 2× salario
                            mínimo)
                          </small>
                        </div>

                        {/* Indemnización constitucional */}
                        <div className={styles.conceptCard}>
                          <div className={styles.conceptTitle}>
                            Indemnización Constitucional
                          </div>
                          <div className={styles.conceptAmount}>
                            $
                            {Number(
                              resultado.monto_indemnizacion_constitucional,
                            ).toLocaleString("es-MX", {
                              minimumFractionDigits: 2,
                            })}
                          </div>
                          <div className={styles.conceptBox}>
                            <div className={styles.row}>
                              <span className={styles.rowLabel}>
                                3 meses de salario
                              </span>
                              <span className={styles.rowValue}>
                                {resultado.dias_indemnizacion_3_meses} días
                              </span>
                            </div>
                            <div className={styles.row}>
                              <span className={styles.rowLabel}>
                                20 días por año
                              </span>
                              <span className={styles.rowValue}>
                                {Number(resultado.dias_20_por_año).toFixed(0)}{" "}
                                días
                              </span>
                            </div>
                            <div
                              className={`${styles.softBadgeGreen} text-right`}
                            >
                              = Total días:{" "}
                              {Number(
                                resultado.dias_indemnizacion_total,
                              ).toFixed(0)}{" "}
                              días
                            </div>
                            <div
                              className={`${styles.softBadgeBlue} mt-1 text-right`}
                            >
                              = Total: $
                              {Number(
                                resultado.monto_indemnizacion_constitucional,
                              ).toLocaleString("es-MX", {
                                minimumFractionDigits: 2,
                              })}
                            </div>
                          </div>
                          <small className="text-xs text-muted-foreground block mt-1">
                            Art. 50 LFT - 3 meses + 20 días por año trabajado
                          </small>
                        </div>

                        {/* Salarios vencidos */}
                        <div className={styles.conceptCard}>
                          <div className={styles.conceptTitle}>
                            Salarios Vencidos
                          </div>
                          <div className={styles.conceptAmount}>
                            $
                            {Number(
                              resultado.monto_salarios_vencidos,
                            ).toLocaleString("es-MX", {
                              minimumFractionDigits: 2,
                            })}
                          </div>
                          <div className={styles.conceptBox}>
                            <div className={styles.row}>
                              <span className={styles.rowLabel}>
                                Días vencidos
                              </span>
                              <span className={styles.rowValue}>
                                {Number(
                                  resultado.dias_salarios_vencidos,
                                ).toFixed(2)}{" "}
                                días
                              </span>
                            </div>
                            <div className={styles.row}>
                              <span className={styles.rowLabel}>
                                Salario diario
                              </span>
                              <span className={styles.rowValue}>
                                $
                                {Number(
                                  resultado.salario_diario,
                                ).toLocaleString("es-MX", {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                            <div
                              className={`${styles.softBadgeBlue} mt-1 text-right`}
                            >
                              = Total: $
                              {Number(
                                resultado.monto_salarios_vencidos,
                              ).toLocaleString("es-MX", {
                                minimumFractionDigits: 2,
                              })}
                            </div>
                          </div>
                          <small className="text-xs text-muted-foreground block mt-1">
                            Art. 48 LFT - Desde despido hasta pago
                          </small>
                        </div>
                      </div>
                      <div className={styles.subtotalBar}>
                        <div className="flex items-center justify-between">
                          <div className={styles.subtotalLabel}>
                            Subtotal Liquidación
                          </div>
                          <div className={styles.subtotalValue}>
                            $
                            {Number(
                              resultado.subtotal_liquidacion,
                            ).toLocaleString("es-MX", {
                              minimumFractionDigits: 2,
                            })}
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
                        $
                        {Number(resultado.total_pagar).toLocaleString("es-MX", {
                          minimumFractionDigits: 2,
                        })}{" "}
                        MXN
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
      <AlertDialog
        open={!!deleteRow}
        onOpenChange={(open) => !open && setDeleteRow(null)}
      >
        <AlertDialogContent className="sm:max-w-[425px] p-0">
          <AlertDialogHeader className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 rounded-t-lg">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6" />
              <AlertDialogTitle className="text-white">
                ¿Eliminar finiquito?
              </AlertDialogTitle>
            </div>
          </AlertDialogHeader>
          <div className="p-6 space-y-4">
            <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-4 rounded-md">
              <AlertDialogDescription className="text-sm">
                {deleteRow
                  ? `Esta acción no se puede deshacer. Se eliminará el finiquito de ${
                      deleteRow?.nombre_completo || ""
                    }.`
                  : ""}
              </AlertDialogDescription>
            </div>
          </div>
          <AlertDialogFooter className="bg-gray-50 p-4 flex justify-end gap-2 rounded-b-lg">
            <AlertDialogCancel className="border-gray-300">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white shadow-sm"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Ver finiquito/liquidación */}
      <FiniquitoViewDialog
        open={!!viewRow}
        setOpen={(o) => {
          if (!o) setViewRow(null);
        }}
        id={viewRow?.id_finiquito || viewRow?.id}
      />

      {/* Accesos Rápidos - Componente reutilizable (al final de la página) */}
      <AccesosRapidos />
    </div>
  );
}
