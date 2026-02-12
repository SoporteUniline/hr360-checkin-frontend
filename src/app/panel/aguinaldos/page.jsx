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
import useAguinaldosData from "@/hooks/useAguinaldosData";
import useEmpleadosActivosAguinaldo from "@/hooks/useEmpleadosActivosAguinaldo";
import { aguinaldosApi } from "@/lib/aguinaldosApi";
import {
  AlertTriangle,
  Calculator,
  Download,
  Eye,
  Filter,
  Gift,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import dayjs from "dayjs";
import { jsPDF } from "jspdf";
import AguinaldoViewDialog from "./AguinaldoViewDialog";
import CambiarEstadoDialog from "./CambiarEstadoDialog";
import styles from "./aguinaldos-theme.module.css";
import AccesosRapidos from "@/components/AccesosRapidos";
import useSWR from "swr";
import { fetcherWithToken, swr_config } from "@/lib/fetcher";
import { fetchImageAsDataUrl } from "@/lib/pdfCompanyLogo";
import {
  createPdfContext,
  drawHeaderBox,
  drawKeyValueBox,
  drawMultilineBox,
  drawSignaturesAndFooter,
  drawRightValueRowsBox,
  ensureSpace,
  fmtMoneyMXN,
} from "@/lib/pdfUnifiedLayout";
import { Combobox } from "@/components/Combobox";

export default function PageAguinaldos() {
  const { dataUser } = useAuth();

  const [empresaFiltro, setEmpresaFiltro] = useState("all");
  const [empresaCalculo, setEmpresaCalculo] = useState("");

  const mostrarEmpresa = empresaFiltro !== "all";

  // Para la tabla
  const idEmpresaFiltro =
    empresaFiltro === "all" ? "all" : Number(empresaFiltro);

  // Para el cálculo
  const idEmpresaCalculo = empresaCalculo ? Number(empresaCalculo) : null;

  /**
   * Datos de empresa para marca/imagen en PDFs.
   * - Relación: el logo se administra en `src/app/panel/cuenta/Empresa/ImagenEmpresa.jsx`.
   */
  const { data: empresaData } = useSWR(
    idEmpresaCalculo ? `/empresas/${idEmpresaCalculo}` : null,
    fetcherWithToken,
    swr_config,
  );

  /**
   * Logo precargado para PDFs (DataURL).
   * - Se usa en el header del formato unificado (Permisos/Mapa de Rutas).
   * - Fallback garantizado a `/assets/logo.png`.
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
    idEmpresa: idEmpresaFiltro,
    page,
    limit,
    search,
    estatus,
    año_fiscal: añoFiscal,
  });
  const calculos = data?.data || [];
  const total = data?.total || 0;

  const handleSelectEmpleadoSugerencia = (emp) => {
    if (!emp) return;
    setSearch(emp.nombre_completo || "");
    setIsSuggestionsOpen(false);
    setPage(1);
  };

  const limpiarFiltros = () => {
    setEmpresaFiltro("all");
    setSearch("");
    setEstatus("");
    setAñoFiscal("");
    setPage(1);
  };

  // ---------------- Calculadora Masiva ----------------
  const [fechaCorte, setFechaCorte] = useState(dayjs().format("YYYY-MM-DD"));
  const [añoFiscalCalculo, setAñoFiscalCalculo] = useState(
    dayjs().year().toString(),
  );
  const [observaciones, setObservaciones] = useState("");
  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState([]);
  const [empleadosCargados, setEmpleadosCargados] = useState([]);
  const [busquedaEmpleados, setBusquedaEmpleados] = useState("");
  const [selectAll, setSelectAll] = useState(false);
  const [resultadoCalculo, setResultadoCalculo] = useState(null);
  const [guardable, setGuardable] = useState(false);
  const [estadosIndividuales, setEstadosIndividuales] = useState({}); // { id_empleado: "Pendiente" }
  const [deleteRow, setDeleteRow] = useState(null);
  const [viewRow, setViewRow] = useState(null);
  const [estadoDialogOpen, setEstadoDialogOpen] = useState(false);
  const [calculoParaCambiarEstado, setCalculoParaCambiarEstado] =
    useState(null);

  // Sugerencias de empleados
  const empleadosSugResp = useEmpleadosActivosAguinaldo({
    empresa: empresaFiltro === "all" ? "all" : Number(empresaFiltro),
    q: search,
    limit: 8,
  });

  const sugerencias = useMemo(
    () => empleadosSugResp?.data || [],
    [empleadosSugResp?.data],
  );

  const resetFormulario = () => {
    setFechaCorte(dayjs().format("YYYY-MM-DD"));
    setAñoFiscalCalculo(dayjs().year().toString());
    setObservaciones("");
    setEmpleadosSeleccionados([]);
    setEmpleadosCargados([]);
    setSelectAll(false);
    setResultadoCalculo(null);
    setGuardable(false);
    setEstadosIndividuales({});
  };

  // Cargar empleados cuando se abre el tab de calculadora
  useEffect(() => {
    if (tab === "calculadora" && idEmpresaCalculo) {
      cargarEmpleados();
    }
  }, [tab, idEmpresaCalculo]);

  // Actualizar automáticamente el año fiscal cuando cambia la fecha de corte
  // - Relación: si se selecciona una fecha de otro año, el año fiscal debe cambiar automáticamente
  // - Siempre sincroniza el año fiscal con el año de la fecha de corte seleccionada
  useEffect(() => {
    if (fechaCorte) {
      const añoFechaCorte = dayjs(fechaCorte).year();
      const añoFiscalActual = parseInt(añoFiscalCalculo) || añoFechaCorte;

      // Siempre actualizar el año fiscal para que coincida con el año de la fecha de corte
      // Esto asegura que si seleccionas una fecha de 2024, el año fiscal cambie a 2024 automáticamente
      if (añoFechaCorte !== añoFiscalActual) {
        setAñoFiscalCalculo(añoFechaCorte.toString());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaCorte]);

  // Cargar automáticamente días no trabajados cuando cambian fecha de corte, año fiscal o empleados seleccionados
  // - Relación: similar a finiquitos, consulta automáticamente desde la tabla asistencias
  // - Se ejecuta automáticamente sin necesidad de botón manual
  // - Se ejecuta con un delay para asegurar que el estado se haya actualizado completamente
  useEffect(() => {
    if (
      fechaCorte &&
      añoFiscalCalculo &&
      empleadosSeleccionados.length > 0 &&
      tab === "calculadora"
    ) {
      // Cargar automáticamente después de un delay para asegurar que el estado se haya actualizado
      const timer = setTimeout(() => {
        cargarDiasNoTrabajadosAutomaticamente();
      }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaCorte, añoFiscalCalculo, empleadosSeleccionados.length]);

  const cargarEmpleados = async () => {
    try {
      const resp = await aguinaldosApi.empleadosActivos({
        empresa: idEmpresaCalculo,
        q: "",
        limit: 1000,
      });
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
      empleadosSeleccionados.some((sel) => sel.id === emp.id),
    );
    setSelectAll(todosSeleccionados);
  }, [empleadosFiltrados, empleadosSeleccionados]);

  const toggleSelectAll = async () => {
    const nuevoEstado = !selectAll;
    setSelectAll(nuevoEstado);
    if (nuevoEstado) {
      // Seleccionar solo los empleados filtrados (visibles) y cargar automáticamente sus días no trabajados
      const idsFiltrados = new Set(empleadosFiltrados.map((e) => e.id));
      const empleadosExistentes = empleadosSeleccionados.filter(
        (e) => !idsFiltrados.has(e.id),
      );

      // Cargar días no trabajados para los nuevos empleados seleccionados
      const nuevosEmpleados = await Promise.all(
        empleadosFiltrados.map(async (emp) => {
          const existente = empleadosSeleccionados.find((e) => e.id === emp.id);
          if (existente) {
            return existente;
          }

          // Cargar automáticamente días no trabajados si hay fecha de corte y año fiscal
          const nuevoEmpleado = { ...emp };
          if (fechaCorte && añoFiscalCalculo) {
            try {
              const datosDiasNoTrab =
                await aguinaldosApi.obtenerDiasNoTrabajados({
                  idEmpleado: emp.id,
                  fechaIngreso: emp.fecha_ingreso,
                  fechaCorte: fechaCorte,
                  añoFiscal: añoFiscalCalculo,
                });
              nuevoEmpleado.dias_no_trabajados = parseFloat(
                datosDiasNoTrab?.dias_no_trabajados || 0,
              );
            } catch (error) {
              console.error(
                `Error al obtener días no trabajados para empleado ${emp.id}:`,
                error,
              );
              nuevoEmpleado.dias_no_trabajados = 0;
            }
          } else {
            nuevoEmpleado.dias_no_trabajados = 0;
          }
          return nuevoEmpleado;
        }),
      );

      setEmpleadosSeleccionados([...empleadosExistentes, ...nuevosEmpleados]);
    } else {
      // Deseleccionar solo los empleados filtrados (visibles)
      const idsFiltrados = new Set(empleadosFiltrados.map((e) => e.id));
      setEmpleadosSeleccionados(
        empleadosSeleccionados.filter((e) => !idsFiltrados.has(e.id)),
      );
    }
  };

  const toggleEmpleado = async (emp) => {
    const existe = empleadosSeleccionados.find((e) => e.id === emp.id);
    if (existe) {
      setEmpleadosSeleccionados(
        empleadosSeleccionados.filter((e) => e.id !== emp.id),
      );
    } else {
      // Al agregar un empleado, cargar automáticamente sus días no trabajados
      const nuevoEmpleado = { ...emp };
      if (fechaCorte && añoFiscalCalculo) {
        try {
          const datosDiasNoTrab = await aguinaldosApi.obtenerDiasNoTrabajados({
            idEmpleado: emp.id,
            fechaIngreso: emp.fecha_ingreso,
            fechaCorte: fechaCorte,
            añoFiscal: añoFiscalCalculo,
          });
          nuevoEmpleado.dias_no_trabajados = parseFloat(
            datosDiasNoTrab?.dias_no_trabajados || 0,
          );
        } catch (error) {
          console.error(
            `Error al obtener días no trabajados para empleado ${emp.id}:`,
            error,
          );
          nuevoEmpleado.dias_no_trabajados = 0;
        }
      } else {
        nuevoEmpleado.dias_no_trabajados = 0;
      }
      setEmpleadosSeleccionados([...empleadosSeleccionados, nuevoEmpleado]);
    }
  };

  const actualizarSalario = (id, valor) => {
    setEmpleadosSeleccionados(
      empleadosSeleccionados.map((e) =>
        e.id === id ? { ...e, salario_diario: parseFloat(valor) || 0 } : e,
      ),
    );
  };

  const actualizarDiasAguinaldo = (id, valor) => {
    setEmpleadosSeleccionados(
      empleadosSeleccionados.map((e) =>
        e.id === id ? { ...e, dias_aguinaldo: parseFloat(valor) || 15 } : e,
      ),
    );
  };

  const actualizarDiasNoTrabajados = (id, valor) => {
    setEmpleadosSeleccionados(
      empleadosSeleccionados.map((e) =>
        e.id === id ? { ...e, dias_no_trabajados: parseFloat(valor) || 0 } : e,
      ),
    );
  };

  // Función para cargar automáticamente los días no trabajados desde la base de datos
  // - Relación: consulta la tabla `asistencias` para contar días donde asistencia = 0 o NULL
  // - Similar a finiquitos pero adaptado para aguinaldos (usa año fiscal y fecha de corte)
  // - Se ejecuta automáticamente sin mostrar mensajes ni loading para no interrumpir al usuario
  const cargarDiasNoTrabajadosAutomaticamente = async () => {
    // Usar los valores actuales del estado para asegurar que se usen los más recientes
    const fechaCorteActual = fechaCorte;
    const añoFiscalActual = añoFiscalCalculo;
    const empleadosActuales = empleadosSeleccionados;

    if (
      !fechaCorteActual ||
      !añoFiscalActual ||
      empleadosActuales.length === 0
    ) {
      return;
    }

    try {
      const empleadosActualizados = await Promise.all(
        empleadosActuales.map(async (emp) => {
          try {
            // Buscar el empleado en la lista cargada para obtener fecha_ingreso
            const empleadoCompleto =
              empleadosCargados.find((e) => e.id === emp.id) || emp;
            const datosDiasNoTrab = await aguinaldosApi.obtenerDiasNoTrabajados(
              {
                idEmpleado: emp.id,
                fechaIngreso: empleadoCompleto.fecha_ingreso,
                fechaCorte: fechaCorteActual,
                añoFiscal: añoFiscalActual,
              },
            );
            return {
              ...emp,
              dias_no_trabajados: parseFloat(
                datosDiasNoTrab?.dias_no_trabajados || 0,
              ),
            };
          } catch (error) {
            console.error(
              `Error al obtener días no trabajados para empleado ${emp.id}:`,
              error,
            );
            // Si hay error, mantener el valor actual
            return emp;
          }
        }),
      );
      setEmpleadosSeleccionados(empleadosActualizados);
    } catch (error) {
      console.error("Error al cargar días no trabajados:", error);
    }
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
        if (
          fechaIngreso.isAfter(fechaFinAñoFiscal) ||
          fechaIngreso.isAfter(fechaCorteDate)
        ) {
          empleadosExcluidos.push(
            e.nombre_completo || e.nombre || `Empleado ${e.id}`,
          );
        } else {
          empleadosValidos.push(e);
        }
      });

      if (empleadosValidos.length === 0) {
        setAlertMsg(
          `⚠️ Ninguno de los empleados seleccionados trabajó durante el año fiscal ${añoFiscalNum}. Verifica las fechas de ingreso.`,
        );
        setLoading(false);
        return;
      }

      if (empleadosExcluidos.length > 0) {
        setAlertMsg(
          `ℹ️ ${
            empleadosExcluidos.length
          } empleado(s) fueron excluidos porque no trabajaron durante el año fiscal ${añoFiscalNum}: ${empleadosExcluidos.join(
            ", ",
          )}`,
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
      // Inicializar estados individuales como "Pendiente" por defecto
      const estadosIniciales = {};
      res.resultados.forEach((emp) => {
        estadosIniciales[emp.id_empleado] = "Pendiente";
      });
      setEstadosIndividuales(estadosIniciales);
      if (empleadosExcluidos.length === 0) {
        setAlertMsg(
          "✅ Cálculo realizado correctamente. Revisa el detalle y genera el PDF si lo requieres.",
        );
      } else {
        setAlertMsg(
          `✅ Cálculo realizado para ${res.total_empleados} empleado(s). ${empleadosExcluidos.length} empleado(s) fueron excluidos por no trabajar durante el año fiscal ${añoFiscalNum}.`,
        );
      }
    } catch (error) {
      setAlertMsg(
        "❌ Error al calcular: " + (error?.message || "Error desconocido"),
      );
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

      // Agregar estados individuales a los resultados antes de guardar
      const resultadosConEstados = resultadoCalculo.resultados.map((emp) => ({
        ...emp,
        estado: estadosIndividuales[emp.id_empleado] || "Pendiente",
      }));

      const payloadConCalculadoPor = {
        ...resultadoCalculo,
        resultados: resultadosConEstados,
        calculado_por: calculadoPor,
      };

      const res = await aguinaldosApi.guardar(payloadConCalculadoPor);

      // Si se guardó correctamente y hay id_aguinaldo en la respuesta, actualizar estados individuales
      // Nota: El backend guarda los estados individuales, pero si necesitamos actualizarlos después,
      // podemos hacerlo aquí. Por ahora, el backend ya los guarda con el estado correcto.

      setGuardable(false);
      await mutate();
      setAlertMsg(
        "✅ Cálculo guardado exitosamente. Puedes verlo en la pestaña de 'Cálculos Guardados'.",
      );
      setTab("tabla");
      resetFormulario();
    } catch (error) {
      setAlertMsg(
        "❌ Error al guardar: " + (error?.message || "Error desconocido"),
      );
    } finally {
      setLoading(false);
    }
  };

  // Función para generar PDF individual de un empleado
  // - Relación: genera un PDF solo con la información del empleado específico
  // - Importante: cada empleado recibe solo su información, no la de otros
  const generarPDFIndividual = (emp) => {
    if (!emp || !resultadoCalculo) return;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "letter",
    });
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
    doc.text(
      "Fecha: " + new Date().toLocaleDateString("es-MX"),
      margenDer,
      20,
      { align: "right" },
    );

    y = 45;
    doc.setTextColor(55, 73, 94);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("RECIBO DE AGUINALDO " + resultadoCalculo.año_fiscal, 105, y, {
      align: "center",
    });

    y += 10;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(
      "Fecha de Corte: " +
        dayjs(resultadoCalculo.fecha_corte).format("DD/MM/YYYY"),
      margenIzq,
      y,
    );

    y += 10;
    // Sección: INFORMACIÓN DEL EMPLEADO
    // Dibujar rectángulo con fondo para el título de la sección
    doc.setFillColor(55, 73, 94);
    doc.rect(margenIzq, y, margenDer - margenIzq, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("INFORMACIÓN DEL EMPLEADO", margenIzq + 2, y + 5);
    y += 12; // Espacio después del rectángulo (aumentado para mejor separación)

    // Información del empleado
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.text("Nombre: " + emp.nombre_completo, margenIzq, y);
    y += 5;
    doc.text("Puesto: " + (emp.puesto || "N/A"), margenIzq, y);
    y += 6;
    doc.text("Departamento: " + (emp.departamento || "N/A"), margenIzq, y);
    y += 6;
    doc.text(
      "Fecha de Ingreso: " + dayjs(emp.fecha_ingreso).format("DD/MM/YYYY"),
      margenIzq,
      y,
    );
    y += 6;
    doc.text(
      "Años Trabajados: " +
        parseFloat(emp.años_trabajados).toFixed(2) +
        " años",
      margenIzq,
      y,
    );
    y += 10; // Espacio antes de la siguiente sección

    // Sección: DETALLE DEL CÁLCULO
    // Dibujar rectángulo con fondo para el título de la sección
    doc.setFillColor(55, 73, 94);
    doc.rect(margenIzq, y, margenDer - margenIzq, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("DETALLE DEL CÁLCULO", margenIzq + 2, y + 5);
    y += 12; // Espacio después del rectángulo (aumentado para mejor separación)

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.text(
      "Salario Diario: $" +
        parseFloat(emp.salario_diario).toLocaleString("es-MX", {
          minimumFractionDigits: 2,
        }),
      margenIzq,
      y,
    );
    y += 6;
    doc.text(
      "Días Aguinaldo (Ley): " +
        parseFloat(emp.dias_aguinaldo_ley).toFixed(2) +
        " días",
      margenIzq,
      y,
    );
    y += 6;
    doc.text(
      "Días Aguinaldo Calculado: " +
        parseFloat(emp.dias_aguinaldo_calculado).toFixed(2) +
        " días",
      margenIzq,
      y,
    );
    y += 6;
    doc.text(
      "Tipo: " + (emp.es_proporcional ? "Proporcional" : "Completo"),
      margenIzq,
      y,
    );
    y += 6;
    if (parseFloat(emp.dias_no_trabajados) > 0) {
      doc.text(
        "Días No Trabajados: " +
          parseFloat(emp.dias_no_trabajados).toFixed(2) +
          " días",
        margenIzq,
        y,
      );
      y += 6;
    }
    doc.text(
      "Días Trabajados: " +
        parseFloat(emp.dias_trabajados).toFixed(2) +
        " días",
      margenIzq,
      y,
    );
    y += 10; // Espacio antes del total

    // Total
    doc.setFillColor(55, 73, 94);
    doc.rect(margenIzq, y, margenDer - margenIzq, 12, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL A PAGAR", margenIzq + 2, y + 7);
    doc.setFontSize(16);
    doc.text(
      "$" +
        parseFloat(emp.monto_aguinaldo).toLocaleString("es-MX", {
          minimumFractionDigits: 2,
        }) +
        " MXN",
      margenDer - 2,
      y + 7,
      { align: "right" },
    );

    const nombreArchivo =
      "Aguinaldo_" +
      resultadoCalculo.año_fiscal +
      "_" +
      (emp.nombre_completo || "Empleado").replace(/\s+/g, "_") +
      ".pdf";
    doc.save(nombreArchivo);
  };

  /**
   * PDF unificado (formato nuevo) - Recibo individual (Calculadora).
   * - Relación:
   *   - Botón "📄 PDF" por empleado en la tabla del cálculo (tab calculadora).
   *   - Formato consistente con Permisos/Mapa de Rutas (A4 + cajas + footer).
   * - Nota: NO se elimina `generarPDFIndividual` anterior.
   */
  const generarPDFIndividualFormatoNuevo = (emp) => {
    if (!emp || !resultadoCalculo) return;

    const doc = new jsPDF("p", "mm", "a4");
    const ctx = createPdfContext({ doc });
    const companyName =
      empresaData?.nombre_empresa || dataUser?.empresa?.nombre_empresa || "";
    const empleado = emp.nombre_completo || "Empleado";
    const total = fmtMoneyMXN(emp.monto_aguinaldo);

    drawHeaderBox(ctx, {
      title: "Recibo de Aguinaldo",
      linesLeft: [
        `Empleado: ${empleado}`,
        `Año fiscal: ${resultadoCalculo.año_fiscal || "—"}`,
        `Fecha corte: ${dayjs(resultadoCalculo.fecha_corte).format(
          "DD/MM/YYYY",
        )}`,
      ],
      kpiLabel: "Total a pagar",
      kpiValue: String(total).replace(" MXN", ""),
      companyName,
      logoDataUrl,
    });

    drawKeyValueBox(ctx, {
      title: "Información del empleado",
      rows: [
        ["Puesto", emp.puesto || "N/A"],
        ["Departamento", emp.departamento || "N/A"],
        [
          "Fecha ingreso",
          emp.fecha_ingreso
            ? dayjs(emp.fecha_ingreso).format("DD/MM/YYYY")
            : "—",
        ],
        ["Años trabajados", Number(emp.años_trabajados || 0).toFixed(2)],
      ],
    });

    // Detalle del cálculo: valores alineados a la derecha para evitar encimados en labels largos.
    drawRightValueRowsBox(ctx, {
      title: "Detalle del cálculo",
      rows: [
        [
          "Salario diario",
          `$${Number(emp.salario_diario || 0).toLocaleString("es-MX", {
            minimumFractionDigits: 2,
          })}`,
        ],
        [
          "Días aguinaldo (Ley)",
          Number(emp.dias_aguinaldo_ley || 0).toFixed(2),
        ],
        [
          "Días aguinaldo calculado",
          Number(emp.dias_aguinaldo_calculado || 0).toFixed(2),
        ],
        ["Tipo", emp.es_proporcional ? "Proporcional" : "Completo"],
        ["Días trabajados", Number(emp.dias_trabajados || 0).toFixed(2)],
      ],
    });

    drawMultilineBox(ctx, {
      title: "Observaciones",
      text: resultadoCalculo.observaciones || "—",
    });

    drawSignaturesAndFooter(doc, {
      empleadoName: empleado,
      empresaLabel: companyName || "Uniline Innovacion en la Nube",
      footerLeft: "Sistema HR360",
    });

    const nombreArchivo = `Aguinaldo_${
      resultadoCalculo.año_fiscal || "NA"
    }_${String(empleado).replace(/\s+/g, "_")}.pdf`;
    doc.save(nombreArchivo);
  };

  const generarPDFMasivo = () => {
    if (!resultadoCalculo) return;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "letter",
    });
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
    doc.text(
      "Fecha: " + new Date().toLocaleDateString("es-MX"),
      margenDer,
      20,
      { align: "right" },
    );

    y = 45;
    doc.setTextColor(55, 73, 94);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("NÓMINA DE AGUINALDOS " + resultadoCalculo.año_fiscal, 105, y, {
      align: "center",
    });

    y += 10;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(
      "Fecha de Corte: " +
        dayjs(resultadoCalculo.fecha_corte).format("DD/MM/YYYY"),
      margenIzq,
      y,
    );
    doc.text(
      "Total Empleados: " + resultadoCalculo.total_empleados,
      margenDer,
      y,
      { align: "right" },
    );

    y += 8;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1);
    doc.rect(margenIzq, y, margenDer - margenIzq, 10);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL GENERAL A PAGAR:", margenIzq + 2, y + 6.5);
    doc.setFontSize(14);
    doc.text(
      "$" +
        parseFloat(resultadoCalculo.total_general).toLocaleString("es-MX", {
          minimumFractionDigits: 2,
        }) +
        " MXN",
      margenDer - 2,
      y + 6.5,
      { align: "right" },
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
      doc.text(
        dayjs(emp.fecha_ingreso).format("DD/MM/YYYY"),
        margenIzq + 75,
        y,
      );
      doc.text(parseFloat(emp.años_trabajados).toFixed(2), margenIzq + 95, y);
      doc.text(
        "$" +
          parseFloat(emp.salario_diario).toLocaleString("es-MX", {
            minimumFractionDigits: 2,
          }),
        margenIzq + 105,
        y,
      );
      doc.text(
        parseFloat(emp.dias_aguinaldo_calculado).toFixed(2),
        margenIzq + 125,
        y,
      );
      doc.text(emp.es_proporcional ? "Prop." : "Comp.", margenIzq + 135, y);
      doc.setFont("helvetica", "bold");
      doc.text(
        "$" +
          parseFloat(emp.monto_aguinaldo).toLocaleString("es-MX", {
            minimumFractionDigits: 2,
          }),
        margenDer - 2,
        y,
        { align: "right" },
      );
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

    const nombreArchivo =
      "Nomina_Aguinaldos_" + resultadoCalculo.año_fiscal + ".pdf";
    doc.save(nombreArchivo);
  };

  /**
   * PDF unificado (formato nuevo) - Nómina masiva (Calculadora).
   * - Relación:
   *   - Botón "📄 Generar PDF Completo" en tab calculadora.
   * - Nota: NO se elimina `generarPDFMasivo` anterior.
   */
  const generarPDFMasivoFormatoNuevo = () => {
    if (!resultadoCalculo) return;

    const doc = new jsPDF("p", "mm", "a4");
    const ctx = createPdfContext({ doc });

    const companyName =
      empresaData?.nombre_empresa || dataUser?.empresa?.nombre_empresa || "";
    const totalGeneral = fmtMoneyMXN(resultadoCalculo.total_general);
    const resultados = resultadoCalculo.resultados || [];
    const completos = resultados.filter((x) => !x.es_proporcional).length;
    const proporcionales = resultados.filter((x) => !!x.es_proporcional).length;

    drawHeaderBox(ctx, {
      title: "Nómina de Aguinaldos",
      linesLeft: [
        `Año fiscal: ${resultadoCalculo.año_fiscal || "—"}`,
        `Fecha corte: ${dayjs(resultadoCalculo.fecha_corte).format(
          "DD/MM/YYYY",
        )}`,
        `Total empleados: ${
          resultadoCalculo.total_empleados ?? resultados.length
        }`,
      ],
      kpiLabel: "Total general",
      kpiValue: String(totalGeneral).replace(" MXN", ""),
      companyName,
      logoDataUrl,
    });

    drawKeyValueBox(ctx, {
      title: "Resumen",
      rows: [
        ["Completos", completos],
        ["Proporcionales", proporcionales],
        [
          "Generado",
          new Date().toLocaleString("es-MX", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }),
        ],
      ],
    });

    // Tabla multi-página
    const { doc: d, margin, contentWidth, pageHeight } = ctx;
    const cols = [
      { key: "nombre", title: "Empleado", w: 62 },
      { key: "puesto", title: "Puesto", w: 36 },
      { key: "ingreso", title: "Ingreso", w: 22 },
      { key: "dias", title: "Días", w: 16 },
      { key: "tipo", title: "Tipo", w: 18 },
      { key: "monto", title: "Monto", w: 28 },
    ];
    const sumW = cols.reduce((a, c) => a + c.w, 0);
    if (sumW !== contentWidth) cols[0].w += contentWidth - sumW;

    const headerH = 8;
    const rowH = 7;
    const drawTableHeader = () => {
      d.setLineWidth(0.8);
      d.rect(margin, ctx.y, contentWidth, headerH, "S");
      d.setFont("helvetica", "bold");
      d.setFontSize(9);
      let x = margin;
      cols.forEach((c) => {
        d.text(c.title, x + 2, ctx.y + 5.5);
        x += c.w;
        d.line(x, ctx.y, x, ctx.y + headerH);
      });
      ctx.y += headerH;
    };
    const drawRow = (r) => {
      d.setLineWidth(0.3);
      d.rect(margin, ctx.y, contentWidth, rowH, "S");
      d.setFont("helvetica", "normal");
      d.setFontSize(8.5);
      let x = margin;
      const v = {
        nombre: String(r.nombre_completo || "").slice(0, 40),
        puesto: String(r.puesto || "N/A").slice(0, 22),
        ingreso: r.fecha_ingreso
          ? dayjs(r.fecha_ingreso).format("DD/MM/YYYY")
          : "—",
        dias: Number(r.dias_aguinaldo_calculado || 0).toFixed(2),
        tipo: r.es_proporcional ? "Prop." : "Comp.",
        monto: `$${Number(r.monto_aguinaldo || 0).toLocaleString("es-MX", {
          minimumFractionDigits: 2,
        })}`,
      };
      cols.forEach((c, ci) => {
        const text = v[c.key];
        if (c.key === "monto") {
          d.setFont("helvetica", "bold");
          d.text(text, x + c.w - 2, ctx.y + 5, { align: "right" });
          d.setFont("helvetica", "normal");
        } else {
          d.text(text, x + 2, ctx.y + 5);
        }
        x += c.w;
        if (ci < cols.length - 1) d.line(x, ctx.y, x, ctx.y + rowH);
      });
      ctx.y += rowH;
    };

    drawTableHeader();
    resultados.forEach((r) => {
      ensureSpace(ctx, rowH + 4);
      drawRow(r);
      if (ctx.y > pageHeight - ctx.margin - 70) {
        d.addPage();
        ctx.y = ctx.margin;
        drawTableHeader();
      }
    });

    drawSignaturesAndFooter(d, {
      empleadoName: "",
      empresaLabel: companyName || "Uniline Innovacion en la Nube",
      footerLeft: "Sistema HR360",
    });

    const nombreArchivo = `Nomina_Aguinaldos_${
      resultadoCalculo.año_fiscal || "NA"
    }.pdf`;
    d.save(nombreArchivo.replace(/\s+/g, "_"));
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
      await aguinaldosApi.actualizarEstado(
        calculoParaCambiarEstado.id_calculo,
        nuevoEstado,
      );
      await mutate();
      setAlertMsg("✅ Estado actualizado exitosamente");
      setEstadoDialogOpen(false);
      setCalculoParaCambiarEstado(null);
    } catch (error) {
      setAlertMsg(
        "❌ Error al actualizar estado: " +
          (error?.message || "Error desconocido"),
      );
    }
  };

  return (
    <div className={`${styles.aguTheme} space-y-6`}>
      {/* Header - Diseño ADAMIA */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <div className="bg-[#2563EB] p-2.5 rounded-lg">
            <Gift className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Aguinaldos</h1>
            <p className="text-sm text-gray-600">
              Calcula y gestiona aguinaldos según la Ley Federal del Trabajo.
            </p>
          </div>
        </div>
      </div>

      {/* Filtros superiores */}
      <Card className="agu-card border-indigo-100 bg-indigo-50">
        <CardHeader>
          <CardTitle className="text-base font-bold text-indigo-700 flex items-center gap-2">
            <Filter className="h-4 w-4" /> Filtros de búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Empresa
              </label>
              <div className="relative">
                <Combobox
                  options={[
                    { value: "all", label: "Todas las empresas" },
                    ...(dataUser?.empresas_detalle || []).map((e) => ({
                      value: String(e.id_empresa),
                      label: e.nombre,
                    })),
                  ]}
                  value={empresaFiltro}
                  onChange={(value) => {
                    setEmpresaFiltro(value);
                    setSearch("");
                    setEstatus("");
                    setAñoFiscal("");
                    setPage(1);
                  }}
                  placeholder="Empresa"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Buscar
              </label>
              <div className="relative">
                <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  className="pl-9"
                  placeholder="Empleado, puesto o ID..."
                  value={search}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSearch(value);
                    setIsSuggestionsOpen(value.length > 0);
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
                {isSuggestionsOpen &&
                activeSearchBox === "filters" &&
                sugerencias.length > 0 ? (
                  <div className="absolute left-0 right-0 mt-1 z-20 rounded-md border bg-white shadow">
                    <ul className="max-h-64 overflow-auto">
                      {sugerencias.map((emp, idx) => (
                        <li
                          key={emp.id_empleado}
                          onMouseDown={() =>
                            handleSelectEmpleadoSugerencia(emp)
                          }
                          onMouseEnter={() => setHoveredSuggestionIndex(idx)}
                          className={`px-3 py-2 cursor-pointer text-sm ${
                            idx === hoveredSuggestionIndex ? "bg-blue-50" : ""
                          }`}
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
              <label className="text-sm font-medium text-gray-700">
                Estado
              </label>
              <Select
                value={estatus === "" ? "__all__" : estatus}
                onValueChange={(v) => setEstatus(v === "__all__" ? "" : v)}
              >
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
              <label className="text-sm font-medium text-gray-700">
                Año fiscal
              </label>
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
              onClick={limpiarFiltros}
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              <RotateCcw className="h-4 w-4 mr-2" /> Limpiar
            </Button>
            <Button
              onClick={() => mutate()}
              className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-sm"
            >
              <Search className="h-4 w-4 mr-2" /> Buscar
            </Button>
          </div>
        </CardContent>
      </Card>

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
              <Plus className="h-4 w-4 mr-2" /> Nuevo Cálculo
            </Button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                Lista de cálculos
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase text-gray-700">
                      ID
                    </th>
                    {!mostrarEmpresa && (
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase text-gray-700">
                        Empresa
                      </th>
                    )}
                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase text-gray-700">
                      Año
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase text-gray-700">
                      Fecha cálculo
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase text-gray-700">
                      Fecha corte
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase text-gray-700">
                      Empleados
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase text-gray-700">
                      Total
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase text-gray-700">
                      Estado
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-semibold uppercase text-gray-700">
                      Acciones
                    </th>
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
                      <tr
                        key={calc.id_calculo}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="px-3 py-2 font-semibold">
                          #{calc.id_calculo}
                        </td>
                        {!mostrarEmpresa && (
                          <td className="px-3 py-2">{calc?.nombre_empresa}</td>
                        )}
                        <td className="px-3 py-2">{calc.año_fiscal}</td>
                        <td className="px-3 py-2">
                          {dayjs(calc.fecha_calculo).format("DD/MM/YYYY")}
                        </td>
                        <td className="px-3 py-2">
                          {dayjs(calc.fecha_corte).format("DD/MM/YYYY")}
                        </td>
                        <td className="px-3 py-2">
                          {calc.total_empleados} empleados
                        </td>
                        <td className="px-3 py-2 font-bold">
                          $
                          {Number(calc.total_general || 0).toLocaleString(
                            "es-MX",
                            { minimumFractionDigits: 2 },
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`${styles.tag} ${
                              styles[
                                "tag-" +
                                  (calc.estado?.toLowerCase() || "pendiente")
                              ]
                            }`}
                          >
                            {calc.estado || "Pendiente"}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            {/* Orden estándar ADAMIA: Editar (azul) -> Ver (verde) -> Eliminar (rojo) */}
                            <button
                              onClick={() => abrirDialogEstado(calc)}
                              className="p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4 text-[#2563EB]" />
                            </button>
                            <button
                              onClick={() => setViewRow(calc)}
                              className="p-2 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                              title="Ver"
                            >
                              <Eye className="h-4 w-4 text-green-600" />
                            </button>
                            <button
                              onClick={() => eliminarCalculo(calc)}
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
                  {(!calculos || calculos.length === 0) && (
                    <tr>
                      <td className="p-6 text-center text-gray-500" colSpan={8}>
                        No hay cálculos de aguinaldos guardados
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
            total={total}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </TabsContent>

        <TabsContent value="calculadora" className="space-y-4 mt-3">
          {/* Loader */}
          {loading && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
              <div className="bg-white rounded-xl p-6 text-center">
                <div className="animate-spin h-8 w-8 rounded-full border-2 border-slate-300 border-t-[var(--agu-primary)] mx-auto mb-3" />
                <div
                  className="font-semibold text-sm"
                  style={{ color: "var(--agu-primary)" }}
                >
                  Procesando...
                </div>
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Empresa
                  </label>

                  <Combobox
                    options={(dataUser?.empresas_detalle || []).map((e) => ({
                      value: String(e.id_empresa),
                      label: e.nombre,
                    }))}
                    value={empresaCalculo}
                    onChange={(value) => {
                      setEmpresaCalculo(value);
                      setFechaCorte(dayjs().format("YYYY-MM-DD"));
                      setAñoFiscalCalculo(dayjs().year().toString());
                      setObservaciones("");
                    }}
                    placeholder="Selecciona empresa para cálculo"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Fecha de corte *
                  </label>
                  <Input
                    type="date"
                    value={fechaCorte}
                    onChange={async (e) => {
                      const nuevaFecha = e.target.value;
                      setFechaCorte(nuevaFecha);
                      // Actualizar inmediatamente el año fiscal basado en la nueva fecha
                      if (nuevaFecha) {
                        const añoNuevaFecha = dayjs(nuevaFecha).year();
                        setAñoFiscalCalculo(añoNuevaFecha.toString());

                        // Cargar automáticamente los días no trabajados después de actualizar la fecha y año fiscal
                        // Esperar un momento para que el estado se actualice
                        setTimeout(() => {
                          if (empleadosSeleccionados.length > 0) {
                            cargarDiasNoTrabajadosAutomaticamente();
                          }
                        }, 100);
                      }
                    }}
                  />
                  <small className="text-muted-foreground">
                    Fecha hasta la cual se calculará el aguinaldo (el año fiscal
                    se actualiza automáticamente)
                  </small>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Año fiscal *
                  </label>
                  <Input
                    type="number"
                    min="2020"
                    max="2030"
                    value={añoFiscalCalculo}
                    onChange={(e) => setAñoFiscalCalculo(e.target.value)}
                    placeholder="2025"
                    readOnly
                    className="bg-gray-50 cursor-not-allowed"
                  />
                  <small className="text-muted-foreground">
                    Año fiscal del aguinaldo (se actualiza automáticamente según
                    la fecha de corte)
                  </small>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Observaciones
                  </label>
                  <Input
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Ej: Aguinaldo 2025 - Pago anticipado diciembre"
                  />
                </div>
              </div>

              <div className={styles.infoInfo}>
                <strong>INFORMACIÓN LEGAL:</strong> Según el Artículo 87 de la
                LFT, el aguinaldo mínimo es de 15 días de salario por año
                trabajado. Si el empleado laboró menos de un año, se calcula
                proporcional.
              </div>
              <div className="rounded-md border-l-4 border-red-500 bg-red-50 p-3">
                <div className="text-sm font-semibold mb-1 text-red-800">
                  Días no trabajados
                </div>
                <div className="text-xs text-red-800">
                  Los días no trabajados se consultan{" "}
                  <strong>automáticamente</strong> desde la tabla{" "}
                  <code>asistencias</code> (donde <code>asistencia = 0</code> o{" "}
                  <code>NULL</code>) en el rango del año fiscal hasta la fecha
                  de corte seleccionada. Estos días{" "}
                  <strong>reducen el cálculo proporcional</strong> de aguinaldo.
                  <br />
                  <strong>Fórmula:</strong> Días trabajados netos = Días
                  trabajados brutos - Días no trabajados
                  <br />
                  <strong>Nota:</strong> Los valores se actualizan
                  automáticamente al cambiar la fecha de corte, el año fiscal o
                  al seleccionar empleados.
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selección de empleados */}
          {empleadosCargados.length > 0 && (
            <Card className="agu-card">
              <CardHeader>
                <CardTitle>Selección de empleados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Buscador de empleados */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Buscar empleado
                  </label>
                  <div className="relative">
                    <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      className="pl-9"
                      placeholder="Buscar por nombre, puesto o departamento..."
                      value={busquedaEmpleados}
                      onChange={(e) => setBusquedaEmpleados(e.target.value)}
                    />
                  </div>
                  {busquedaEmpleados && (
                    <div className="text-xs text-muted-foreground">
                      Mostrando {empleadosFiltrados.length} de{" "}
                      {empleadosCargados.length} empleados
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={toggleSelectAll}
                      className="w-4 h-4"
                    />
                    <strong>Seleccionar / Deseleccionar Todos</strong>
                  </label>
                  <span className="font-semibold text-blue-600">
                    {empleadosSeleccionados.length} empleados seleccionados
                  </span>
                </div>

                <div className="overflow-x-auto rounded-md border border-gray-200 max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left p-2 w-12">
                          <input
                            type="checkbox"
                            checked={selectAll}
                            onChange={toggleSelectAll}
                            className="w-4 h-4"
                          />
                        </th>
                        <th className="text-left p-2">Empleado</th>
                        <th className="text-left p-2">Puesto</th>
                        <th className="text-left p-2">F. ingreso</th>
                        <th className="text-left p-2">Salario diario</th>
                        <th className="text-left p-2">Días aguinaldo</th>
                        <th className="text-left p-2">
                          Días NO Trabajados
                          <small className="block text-xs font-normal text-red-600">
                            (Reducen proporcionales)
                          </small>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {empleadosFiltrados.map((emp) => {
                        const seleccionado = empleadosSeleccionados.find(
                          (e) => e.id === emp.id,
                        );
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
                            <td className="p-2">
                              {emp.puesto || "Sin puesto"}
                            </td>
                            <td className="p-2">
                              {dayjs(emp.fecha_ingreso).format("DD/MM/YYYY")}
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                step="0.01"
                                className="w-24 h-8 text-xs"
                                value={
                                  empData.salario_diario ||
                                  emp.salario_diario ||
                                  0
                                }
                                onChange={(e) => {
                                  if (seleccionado) {
                                    actualizarSalario(emp.id, e.target.value);
                                  } else {
                                    toggleEmpleado({
                                      ...emp,
                                      salario_diario:
                                        parseFloat(e.target.value) || 0,
                                    });
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
                                value={
                                  empData.dias_aguinaldo ||
                                  emp.aguinaldo_dias ||
                                  15
                                }
                                onChange={(e) => {
                                  if (seleccionado) {
                                    actualizarDiasAguinaldo(
                                      emp.id,
                                      e.target.value,
                                    );
                                  } else {
                                    toggleEmpleado({
                                      ...emp,
                                      dias_aguinaldo:
                                        parseFloat(e.target.value) || 15,
                                    });
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
                                    actualizarDiasNoTrabajados(
                                      emp.id,
                                      e.target.value,
                                    );
                                  } else {
                                    toggleEmpleado({
                                      ...emp,
                                      dias_no_trabajados:
                                        parseFloat(e.target.value) || 0,
                                    });
                                  }
                                }}
                                title="Días donde asistencia = 0 o NULL en el rango del año fiscal. Estos días reducen el cálculo proporcional de aguinaldo."
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
                    disabled={empleadosSeleccionados.length === 0}
                    className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-sm disabled:opacity-50"
                  >
                    <Calculator className="h-4 w-4 mr-2" /> Calcular
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resultados */}
          {resultadoCalculo && (
            <Card className="agu-card">
              <CardHeader>
                <CardTitle>Resultados del cálculo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Estadísticas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className={styles.metricCard}>
                    <div className={styles.metricLabel}>Total Empleados</div>
                    <div className={styles.metricValue}>
                      {resultadoCalculo.total_empleados}
                    </div>
                  </div>
                  <div className={styles.metricCard}>
                    <div className={styles.metricLabel}>
                      Aguinaldos Completos
                    </div>
                    <div
                      className={styles.metricValue}
                      style={{ color: "var(--agu-success-dark)" }}
                    >
                      {
                        resultadoCalculo.resultados.filter(
                          (r) => !r.es_proporcional,
                        ).length
                      }
                    </div>
                  </div>
                  <div className={styles.metricCard}>
                    <div className={styles.metricLabel}>
                      Aguinaldos Proporcionales
                    </div>
                    <div
                      className={styles.metricValue}
                      style={{ color: "var(--agu-warning-dark)" }}
                    >
                      {
                        resultadoCalculo.resultados.filter(
                          (r) => r.es_proporcional,
                        ).length
                      }
                    </div>
                  </div>
                </div>

                {/* Total General */}
                <div className={styles.totalBar + " text-center"}>
                  <div className={styles.totalLabel}>Total general a pagar</div>
                  <div
                    className={styles.totalAmount}
                    style={{ fontSize: "32px" }}
                  >
                    $
                    {parseFloat(resultadoCalculo.total_general).toLocaleString(
                      "es-MX",
                      { minimumFractionDigits: 2 },
                    )}{" "}
                    MXN
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
                        <th className="text-left p-2">Estado</th>
                        <th className="text-left p-2">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultadoCalculo.resultados.map((emp, idx) => {
                        const estadoActual =
                          estadosIndividuales[emp.id_empleado] || "Pendiente";
                        return (
                          <tr key={idx} className="border-t">
                            <td className="p-2">
                              <strong>{emp.nombre_completo}</strong>
                            </td>
                            <td className="p-2">
                              {emp.puesto || "Sin puesto"}
                            </td>
                            <td className="p-2">
                              {dayjs(emp.fecha_ingreso).format("DD/MM/YYYY")}
                            </td>
                            <td className="p-2">
                              {parseFloat(emp.años_trabajados).toFixed(2)} años
                            </td>
                            <td className="p-2 text-center">
                              {parseFloat(emp.dias_no_trabajados) > 0 ? (
                                <span
                                  className={`${styles.tag} ${styles["tag-pendiente"]}`}
                                >
                                  {parseFloat(emp.dias_no_trabajados).toFixed(
                                    1,
                                  )}
                                </span>
                              ) : (
                                <span
                                  className={`${styles.tag} ${styles["tag-pagado"]}`}
                                >
                                  0
                                </span>
                              )}
                            </td>
                            <td className="p-2">
                              $
                              {parseFloat(emp.salario_diario).toLocaleString(
                                "es-MX",
                                { minimumFractionDigits: 2 },
                              )}
                            </td>
                            <td className="p-2">
                              {parseFloat(emp.dias_aguinaldo_calculado).toFixed(
                                2,
                              )}{" "}
                              días
                            </td>
                            <td className="p-2">
                              {emp.es_proporcional ? (
                                <span
                                  className={`${styles.tag} ${styles["tag-pendiente"]}`}
                                >
                                  Proporcional
                                </span>
                              ) : (
                                <span
                                  className={`${styles.tag} ${styles["tag-pagado"]}`}
                                >
                                  Completo
                                </span>
                              )}
                            </td>
                            <td className="p-2 font-bold">
                              $
                              {parseFloat(emp.monto_aguinaldo).toLocaleString(
                                "es-MX",
                                { minimumFractionDigits: 2 },
                              )}
                            </td>
                            <td className="p-2">
                              <Select
                                value={estadoActual}
                                onValueChange={(nuevoEstado) => {
                                  setEstadosIndividuales((prev) => ({
                                    ...prev,
                                    [emp.id_empleado]: nuevoEstado,
                                  }));
                                }}
                              >
                                <SelectTrigger className="h-8 text-xs w-28">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Pendiente">
                                    Pendiente
                                  </SelectItem>
                                  <SelectItem value="Pagado">Pagado</SelectItem>
                                  <SelectItem value="Cancelado">
                                    Cancelado
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  generarPDFIndividualFormatoNuevo(emp)
                                }
                                className="text-xs border-gray-300"
                              >
                                <Download className="h-4 w-4 mr-2" /> PDF
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Botones de acción */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button
                    onClick={generarPDFMasivoFormatoNuevo}
                    disabled={!guardable}
                    variant="outline"
                    className="border-gray-300 disabled:opacity-50"
                  >
                    <Download className="h-4 w-4 mr-2" /> Descargar PDF
                  </Button>
                  <Button
                    onClick={guardarCalculo}
                    disabled={!guardable}
                    className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-sm disabled:opacity-50"
                  >
                    <Save className="h-4 w-4 mr-2" /> Guardar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Confirmación de eliminación */}
      <AlertDialog
        open={!!deleteRow}
        onOpenChange={(open) => !open && setDeleteRow(null)}
      >
        <AlertDialogContent className="sm:max-w-[425px] p-0">
          <AlertDialogHeader className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 rounded-t-lg">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6" />
              <AlertDialogTitle className="text-white">
                ¿Eliminar cálculo?
              </AlertDialogTitle>
            </div>
          </AlertDialogHeader>
          <div className="p-6 space-y-4">
            <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-4 rounded-md">
              <AlertDialogDescription className="text-sm">
                {deleteRow
                  ? `Esta acción no se puede deshacer. Se eliminará el cálculo #${
                      deleteRow?.id_calculo || ""
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

      {/* Ver detalle de cálculo */}
      <AguinaldoViewDialog
        open={!!viewRow}
        setOpen={(o) => {
          if (!o) setViewRow(null);
        }}
        id={viewRow?.id_calculo || viewRow?.id}
        onEstadoActualizado={() => {
          // Recargar los datos cuando se actualiza un estado individual
          mutate();
        }}
      />

      {/* Dialog para cambiar estado */}
      <CambiarEstadoDialog
        open={estadoDialogOpen}
        setOpen={setEstadoDialogOpen}
        estadoActual={calculoParaCambiarEstado?.estado || "Pendiente"}
        onConfirm={cambiarEstado}
      />

      {/* Accesos Rápidos - Componente reutilizable (al final de la página) */}
      <AccesosRapidos />
    </div>
  );
}
