"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
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
  Plus,
  Trash2,
  Calculator,
  Eye,
  AlertTriangle,
  Pencil,
} from "lucide-react";
import FiniquitoViewDialog from "./FiniquitoViewDialog";
import FiniquitoPreparation from "./FiniquitoPreparation";
import dayjs from "dayjs";
import AccesosRapidos from "@/components/AccesosRapidos";
import HeaderMultiFilter from "@/components/tabla/HeaderMultiFilter";
import ActiveFilterChips from "@/components/tabla/ActiveFilterChips";
import useUnidadesNegocio from "@/hooks/useUnidadesNegocio";
import EncabezadoPagina from "@/components/tabla/EncabezadoPagina";
import { useSearchParams } from "next/navigation";

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

  // Estado tabs
  const [tab, setTab] = useState("tabla");
  const [loading, setLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");
  const [alertError, setAlertError] = useState(false);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);

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

  const finiquitos = useMemo(() => data?.data || [], [data?.data]);
  const total = data?.total || 0;

  const sourceRows = useMemo(
    () =>
      Array.isArray(filterOptionsRows) && filterOptionsRows.length > 0
        ? filterOptionsRows
        : finiquitos,
    [filterOptionsRows, finiquitos]
  );
  const uniqueOptions = (values) =>
    [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const idOptions = useMemo(
    () => uniqueOptions(sourceRows.map((f) => String(f.id_finiquito || ""))),
    [sourceRows]
  );
  const empresaOptions = useMemo(
    () =>
      uniqueOptions(
        sourceRows.map(
          (f) => f.unidad_negocio || f.nombre_sucursal || f.nombre_empresa
        )
      ),
    [sourceRows]
  );
  const empleadoOptions = useMemo(
    () => uniqueOptions(sourceRows.map((f) => f.nombre_completo)),
    [sourceRows]
  );
  const tipoOptions = useMemo(
    () =>
      uniqueOptions(
        sourceRows.map((f) => (f.es_liquidacion ? "Liquidación" : "Finiquito"))
      ),
    [sourceRows]
  );
  const estadoOptions = useMemo(
    () => uniqueOptions(sourceRows.map((f) => f.estado || "Pendiente")),
    [sourceRows]
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
        const passId =
          idSeleccionado.length === 0 || idSeleccionado.includes(idValue);
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
    ]
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
  }, [idEmpresaFiltro, refreshVersion]);

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

  const searchParams = useSearchParams();

  const empleadoBajaId = searchParams.get("empleado");
  const empresaBajaId = searchParams.get("empresa");
  const origen = searchParams.get("origen");
  const motivoBajaParam = searchParams.get("motivo");

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

  const [empleadoInfo, setEmpleadoInfo] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [guardable, setGuardable] = useState(false);
  const [editingFiniquitoId, setEditingFiniquitoId] = useState(null);
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
    [empleadosSugResp?.data]
  );

  const precargaBajaProcesadaRef = useRef(false);

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

    setResultado(null);
    setGuardable(false);
    setEditingFiniquitoId(null);
    setEmpSearch("");
    setEmpleadoInfo(null);
    setOpenEmpSug(false);
  };

  const cargarEmpleadoEnFormulario = useCallback(
    async (emp) => {
      setEmpleadoInfo(emp);
      setSalarioDiario(Number(emp.salario_diario || 0).toFixed(2));

      // Obtener datos de vacaciones (pendientes + ley año actual) y días no trabajados
      // - Relación: tabla `asistencias` campo `asistencia` donde = 0 o NULL
      try {
        const fechaIngreso = new Date(emp.fecha_ingreso);
        const fechaBajaDate = new Date(fechaBaja);
        const diasTrabajados = Math.floor(
          (fechaBajaDate - fechaIngreso) / (1000 * 60 * 60 * 24)
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
    },
    [fechaBaja]
  );

  const onPickEmpleado = useCallback(
    async (emp) => {
      if (!emp || employeeLoading) return;
      setEmployeeLoading(true);
      setOpenEmpSug(false);
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
      setEmployeeLoading(false);
    },
    [employeeLoading, cargarEmpleadoEnFormulario]
  );

  useEffect(() => {
    if (origen !== "baja") return;
    if (!empresaBajaId) return;
    if (!unidadOptions?.length) return;
    if (unidadCalculo) return;

    const unidadEmpleado = unidadOptions.find(
      (unidad) => Number(unidad.id_empresa) === Number(empresaBajaId)
    );

    if (unidadEmpleado) {
      setUnidadCalculo(unidadEmpleado.value);
    }
  }, [origen, empresaBajaId, unidadOptions, unidadCalculo]);

  useEffect(() => {
    if (origen !== "baja") return;
    if (!empleadoBajaId) return;
    if (!idEmpresaCalculo) return;
    if (precargaBajaProcesadaRef.current) return;

    const precargarEmpleadoBaja = async () => {
      try {
        const resp = await finiquitosApi.empleadosActivos({
          empresa: idEmpresaCalculo,
          idEmpleado: empleadoBajaId,
          limit: 1,
        });

        const empleado = resp?.data?.[0];

        if (!empleado) {
          console.warn(
            "No se encontró el empleado para precargar finiquito:",
            empleadoBajaId
          );
          return;
        }

        precargaBajaProcesadaRef.current = true;

        // Ir directamente a la calculadora
        setTab("calculadora");

        // Es finiquito por defecto
        setTipoCalculo("finiquito");

        // Precargar el motivo escrito durante la baja
        if (motivoBajaParam) {
          setMotivoBaja(motivoBajaParam);
        }

        // Precargar empleado + salario + vacaciones + días no trabajados
        await onPickEmpleado(empleado);
      } catch (error) {
        console.error("Error precargando empleado para finiquito:", error);
      }
    };

    precargarEmpleadoBaja();
  }, [
    origen,
    empleadoBajaId,
    motivoBajaParam,
    idEmpresaCalculo,
    onPickEmpleado,
  ]);
  const formValues = {
    unidadCalculo,
    idEmpleado,
    fechaBaja,
    tipoCalculo,
    tipoTerminacion,
    salarioDiario,
    diasSalarioPendiente,
    diasNoTrabajados,
    diasVacAnteriores,
    diasVacLeyActual,
    diasVacYaGozadas,
    primaVacacional,
    diasAguinaldo,
    diasSalariosVencidos,
    motivoBaja,
  };
  const changeField = (name, value) => {
    const setters = {
      fechaBaja: setFechaBaja,
      tipoCalculo: setTipoCalculo,
      tipoTerminacion: setTipoTerminacion,
      salarioDiario: setSalarioDiario,
      diasSalarioPendiente: setDiasSalarioPendiente,
      diasNoTrabajados: setDiasNoTrabajados,
      diasVacAnteriores: setDiasVacAnteriores,
      diasVacLeyActual: setDiasVacLeyActual,
      diasVacYaGozadas: setDiasVacYaGozadas,
      primaVacacional: setPrimaVacacional,
      diasAguinaldo: setDiasAguinaldo,
      diasSalariosVencidos: setDiasSalariosVencidos,
      motivoBaja: setMotivoBaja,
    };
    setters[name]?.(value);
    if (name !== "motivoBaja") setGuardable(false);
    setAlertMsg("");
  };
  const refreshList = () => {
    setRefreshVersion((value) => value + 1);
    mutate().catch(() => {
      setAlertError(true);
      setAlertMsg(
        "El registro se guardó, pero no se pudo actualizar la lista. Recarga la página para consultarlo."
      );
    });
  };
  const calcular = async () => {
    if (loading || employeeLoading) return;
    setAlertError(true);
    if (!idEmpresaCalculo) {
      setAlertMsg("Selecciona una unidad de negocio para el cálculo");
      return;
    }

    setResultado(null);
    setGuardable(false);
    setAlertMsg("");
    if (!idEmpleado || !fechaBaja) {
      setAlertMsg("Selecciona un empleado y una fecha de baja.");
      return;
    }
    const sd = Number(salarioDiario);
    if (!Number.isFinite(sd) || sd <= 0) {
      setAlertMsg("Captura un salario diario mayor que cero.");
      return;
    }
    if (
      empleadoInfo?.fecha_ingreso &&
      dayjs(fechaBaja).isBefore(dayjs(empleadoInfo.fecha_ingreso), "day")
    ) {
      setAlertMsg(
        `La fecha de baja no puede ser anterior a la fecha de ingreso (${dayjs(
          empleadoInfo.fecha_ingreso
        ).format("DD/MM/YYYY")}).`
      );
      return;
    }
    const days = [
      diasSalarioPendiente,
      diasNoTrabajados,
      diasVacAnteriores,
      diasVacLeyActual,
      diasVacYaGozadas,
      primaVacacional,
      diasAguinaldo,
      diasSalariosVencidos,
    ];
    if (
      days.some((value) => !Number.isFinite(Number(value)) || Number(value) < 0)
    ) {
      setAlertMsg(
        "Los días y porcentajes deben ser números iguales o mayores que cero."
      );
      return;
    }

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
        diasVacYaGozadas || "0"
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
      setAlertError(false);
      setAlertMsg("");
    } catch (error) {
      setAlertMsg(
        error?.response?.data?.error ||
          "No se pudo calcular. Revisa los datos e inténtalo de nuevo."
      );
    } finally {
      setLoading(false);
    }
  };

  const guardar = async () => {
    if (loading || employeeLoading || !guardable) return;
    setAlertError(true);
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
      salario_diario: parseFloat(
        salarioDiario || resultado.salario_diario || 0
      ),
      dias_salario_pendiente: parseFloat(
        diasSalarioPendiente || resultado.dias_salario_pendiente || 0
      ),
      dias_no_trabajados: parseFloat(
        diasNoTrabajados || resultado.dias_no_trabajados || 0
      ),
      dias_vacaciones_años_anteriores: parseFloat(
        diasVacAnteriores || resultado.dias_vacaciones_años_anteriores || 0
      ),
      dias_vacaciones_ley_año_actual: parseFloat(
        diasVacLeyActual || resultado.dias_vacaciones_ley_año_actual || 12
      ),
      dias_vacaciones_año_actual_ya_gozadas: parseFloat(
        diasVacYaGozadas || resultado.dias_vacaciones_año_actual_ya_gozadas || 0
      ),
      prima_vacacional_porcentaje: parseFloat(
        primaVacacional || resultado.prima_vacacional_porcentaje || 25
      ),
      dias_aguinaldo: parseFloat(
        diasAguinaldo || resultado.dias_aguinaldo || 15
      ),
      dias_salarios_vencidos: parseFloat(
        diasSalariosVencidos || resultado.dias_salarios_vencidos || 0
      ),
      motivo_baja: motivoBaja,
      calculado_por: dataUser?.correo || dataUser?.email || "",
    };
    setLoading(true);
    try {
      const response = editingFiniquitoId
        ? await finiquitosApi.actualizar(editingFiniquitoId, payload)
        : await finiquitosApi.guardar(payload);
      const savedId =
        editingFiniquitoId ||
        response?.id_finiquito ||
        response?.id ||
        response?.data?.id_finiquito ||
        response?.data?.id;
      // Open the exact saved record immediately; list revalidation runs separately.
      setGuardable(false);
      setTab("tabla");
      resetFormulario();
      setAlertError(!savedId);
      setAlertMsg(
        savedId
          ? "Finiquito guardado. Continúa con la firma desde el detalle."
          : "El registro se guardó, pero no se recibió su folio. Ábrelo desde la lista para continuar con la firma."
      );
      if (savedId) setViewRow({ id_finiquito: savedId, justSaved: true });
      refreshList();
    } catch (error) {
      setAlertMsg(
        error?.response?.data?.error ||
          "No se pudo guardar. Tus datos siguen disponibles; inténtalo de nuevo."
      );
    } finally {
      setLoading(false);
    }
  };

  const editarFiniquito = async (row) => {
    setAlertMsg("");
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
        String(det.dias_vacaciones_año_actual_ya_gozadas || "0")
      );
      setPrimaVacacional(String(det.prima_vacacional_porcentaje || "25"));
      setDiasAguinaldo(String(det.dias_aguinaldo || "15"));
      setDiasSalariosVencidos(String(det.dias_salarios_vencidos || "0"));
      setMotivoBaja(det.motivo_baja || "");
      const unidadByEmpresa = unidadOptions.find(
        (unidad) => Number(unidad.id_empresa) === Number(det.id_empresa)
      );
      setUnidadCalculo(unidadByEmpresa ? unidadByEmpresa.value : "");
      // Mostrar paneles

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
      setEditingFiniquitoId(
        det.id_finiquito || row.id_finiquito || row.id || null
      );
    } catch (_) {
      setAlertError(true);
      setAlertMsg(
        "No se pudo abrir el finiquito para editarlo. Inténtalo de nuevo."
      );
    }
  };

  const eliminarFiniquito = (row) => {
    setDeleteRow(row);
  };

  const confirmDelete = async () => {
    if (!deleteRow) return;
    await finiquitosApi.eliminar(deleteRow.id_finiquito || deleteRow.id);
    setDeleteRow(null);
    refreshList();
  };

  return (
    <div className={`${styles.finTheme} space-y-6`}>
      {/* Encabezado compacto homologado (Adamia) */}
      {tab === "tabla" && (
        <div>
          <EncabezadoPagina
            icono={Calculator}
            titulo="Finiquitos y liquidaciones"
            subtitulo="Calcula, guarda y consulta finiquitos y liquidaciones."
          />
        </div>
      )}

      {!!alertMsg && (
        <div
          role={alertError ? "alert" : "status"}
          className={alertError ? styles.errorNotice : styles.successNotice}
        >
          {alertMsg}
        </div>
      )}
      {tab === "tabla" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Resultados: {total}
            </div>
            <Button
              onClick={() => {
                resetFormulario();
                setAlertMsg("");
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
                  category: "Estado de pago",
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
                        placeholder="Estado de pago"
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
                          <td className="px-3 py-2">
                            {f.nombre_empresa || "-"}
                          </td>
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
        </div>
      )}
      {tab === "calculadora" && (
        <FiniquitoPreparation
          values={formValues}
          onChange={changeField}
          unidadOptions={unidadOptions}
          onUnidadChange={(value) => {
            resetFormulario();
            setUnidadCalculo(value);
            setAlertMsg("");
          }}
          empSearch={empSearch}
          onSearch={(value) => {
            setEmpSearch(value);
            setOpenEmpSug(true);
            setIdEmpleado("");
            setEmpleadoInfo(null);
            setGuardable(false);
            setResultado(null);
          }}
          openSuggestions={openEmpSug}
          onOpenSuggestions={setOpenEmpSug}
          suggestions={sugerencias}
          suggestionsLoading={empleadosSugResp?.isLoading}
          onPickEmpleado={onPickEmpleado}
          empleado={empleadoInfo}
          resultado={resultado}
          guardable={guardable}
          loading={loading}
          employeeLoading={employeeLoading}
          editingId={editingFiniquitoId}
          onBack={() => {
            setTab("tabla");
            setAlertMsg("");
          }}
          onCalculate={calcular}
          onSave={guardar}
        />
      )}

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
      {viewRow && (
        <FiniquitoViewDialog
          key={viewRow.id_finiquito || viewRow.id}
          justSaved={viewRow.justSaved}
          onUpdated={refreshList}
          open={!!viewRow}
          setOpen={(o) => {
            if (!o) setViewRow(null);
          }}
          id={viewRow?.id_finiquito || viewRow?.id}
        />
      )}

      {/* Accesos Rápidos - Componente reutilizable (al final de la página) */}
      <AccesosRapidos />
    </div>
  );
}
