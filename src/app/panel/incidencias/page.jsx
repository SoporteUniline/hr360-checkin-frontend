"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";\nimport "dayjs/locale/es";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Download,
  ExternalLink,
  FileWarning,
  Loader2,
  RotateCcw,
  Save,
  Search,
  Users,
} from "lucide-react";
import { useSnackbar } from "notistack";

import axios from "@/lib/axios";
import { fetcherWithToken } from "@/lib/fetcher";
import { useAuth, useEmpresaTimezone } from "@/context/AuthContext";
import useUnidadesNegocio from "@/hooks/useUnidadesNegocio";
import { calcularResumenJornada } from "@/utils/asistenciaHoras";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/Combobox";

dayjs.extend(utc);
dayjs.extend(timezone);

const DB_TIMEZONE = "America/Mexico_City";
const PAGE_SIZE = 500;

function periodoQuincenaActual() {
  const hoy = dayjs().tz(DB_TIMEZONE);
  const inicio =
    hoy.date() <= 15 ? hoy.startOf("month") : hoy.date(16).startOf("day");
  const fin =
    hoy.date() <= 15 ? hoy.date(15).endOf("day") : hoy.endOf("month");
  return {
    desde: inicio.format("YYYY-MM-DD"),
    hasta: fin.format("YYYY-MM-DD"),
  };
}

function nombreCompleto(r) {
  return [r?.nombre, r?.apellido_paterno, r?.apellido_materno]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function estadoNormalizado(r) {
  return String(r?.estadoAsistencia || r?.estado || "")
    .trim()
    .toLowerCase();
}

function esVerdadero(v) {
  return (
    v === true ||
    v === 1 ||
    v === "1" ||
    String(v ?? "").trim().toLowerCase() === "true"
  );
}

function fechaRegistro(r) {
  if (!r?.fecha) return "";
  return dayjs.tz(r.fecha, DB_TIMEZONE).format("YYYY-MM-DD");
}

function horaLocal(value, tz) {
  if (!value) return "";
  const d = dayjs.tz(value, DB_TIMEZONE);
  return d.isValid() ? d.tz(tz).format("HH:mm") : "";
}

function aFechaDb(fecha, hora, tz) {
  if (!fecha || !hora) return null;
  const d = dayjs.tz(`${fecha} ${hora}`, tz);
  if (!d.isValid()) return null;
  return d.tz(DB_TIMEZONE).format("YYYY-MM-DD HH:mm:ss");
}

function etiquetaPeriodo(desde, hasta) {
  if (!desde || !hasta) return "Seleccionar periodo";
  const a = dayjs(desde);
  const b = dayjs(hasta);
  if (!a.isValid() || !b.isValid()) return "Seleccionar periodo";
  if (a.isSame(b, "month")) {
    return `${a.format("DD")} – ${b.format("DD")} ${b
      .locale("es")
      .format("MMM YYYY")}`;
  }
  return `${a.format("DD/MM/YY")} – ${b.format("DD/MM/YY")}`;
}

function incidenciasDeRegistro(r, fallbackTimezone) {
  const estado = estadoNormalizado(r);
  const tz = r?.zona_horaria || fallbackTimezone || DB_TIMEZONE;
  const incidencias = [];

  if (estado.includes("ausente") || estado.includes("falta")) {
    incidencias.push({
      tipo: "Falta",
      severidad: "alta",
      detalle: "Sin asistencia válida para el día",
      accion: "asistencia",
    });
  }

  if (estado.includes("tardanza") || estado.includes("retardo")) {
    incidencias.push({
      tipo: "Retardo",
      severidad: "media",
      detalle: "Entrada posterior al horario programado",
      accion: "corregir",
    });
  }

  if (r?.entrada && !r?.salida) {
    incidencias.push({
      tipo: "Sin salida",
      severidad: "alta",
      detalle: "Existe entrada pero falta la salida",
      accion: "corregir",
    });
  }

  if (!r?.entrada && r?.salida) {
    incidencias.push({
      tipo: "Sin entrada",
      severidad: "alta",
      detalle: "Existe salida pero falta la entrada",
      accion: "corregir",
    });
  }

  const resumen = calcularResumenJornada(r, tz);
  if (
    Number(resumen?.diferencia || 0) > 0.01 &&
    !esVerdadero(r?.hrs_extra)
  ) {
    incidencias.push({
      tipo: "H. extra",
      severidad: "media",
      detalle: `${Number(resumen.diferencia).toFixed(2)} h sin autorizar`,
      accion: "extra",
      horasExtra: Number(resumen.diferencia),
    });
  }

  if (
    estado.includes("vacacion") &&
    Boolean(r?.entrada || r?.salida)
  ) {
    incidencias.push({
      tipo: "Conflicto",
      severidad: "alta",
      detalle: "Tiene vacaciones y también una checada registrada",
      accion: "asistencia",
    });
  }

  return incidencias;
}

function estiloIncidencia(tipo) {
  switch (tipo) {
    case "Falta":
    case "Sin salida":
    case "Sin entrada":
      return "bg-rose-50 text-rose-700 border-rose-100";
    case "Retardo":
      return "bg-orange-50 text-orange-700 border-orange-100";
    case "H. extra":
      return "bg-blue-50 text-blue-700 border-blue-100";
    default:
      return "bg-violet-50 text-violet-700 border-violet-100";
  }
}

function limpiarPayload(registro) {
  const data = { ...registro };
  [
    "apellido_materno",
    "apellido_paterno",
    "created_at",
    "foto_perfil",
    "nombre",
    "tipo_registro_clave",
    "tipo_registro_nombre",
    "tipo_registro",
    "updated_at",
    "nombre_autorizador",
    "apellido_paterno_autorizador",
    "apellido_materno_autorizador",
    "nombre_extra_autorizador",
    "apellido_paterno_extra_autorizador",
    "apellido_materno_extra_autorizador",
  ].forEach((field) => delete data[field]);

  data.id_tipo_permiso = data.id_tipo_permiso
    ? Number(data.id_tipo_permiso)
    : null;
  data.autorizado_por = data.autorizado_por
    ? Number(data.autorizado_por)
    : null;
  data.extras_autorizadas_por = data.extras_autorizadas_por
    ? Number(data.extras_autorizadas_por)
    : null;
  data.hrs_comida = Number(data.hrs_comida || 0);
  data.porcentaje_dia_festivo = Number(data.porcentaje_dia_festivo || 0);
  data.prima_dominical = Number(data.prima_dominical || 0);

  data.asistencia = esVerdadero(data.asistencia) ? 1 : 0;
  data.goce_sueldo = esVerdadero(data.goce_sueldo) ? 1 : 0;
  data.pago_triple = esVerdadero(data.pago_triple) ? 1 : 0;
  data.correccion = esVerdadero(data.correccion) ? 1 : 0;
  data.es_domingo = esVerdadero(data.es_domingo) ? 1 : 0;
  data.es_festivo = esVerdadero(data.es_festivo) ? 1 : 0;
  data.hrs_extra = esVerdadero(data.hrs_extra) ? 1 : 0;

  return data;
}

export default function CentroIncidenciasPage() {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const { dataUser } = useAuth();
  const { options: unidadOptions, byId: unidadById } = useUnidadesNegocio();

  const inicial = useMemo(() => periodoQuincenaActual(), []);
  const [desde, setDesde] = useState(inicial.desde);
  const [hasta, setHasta] = useState(inicial.hasta);
  const [periodoOpen, setPeriodoOpen] = useState(false);
  const [unidadActiva, setUnidadActiva] = useState("all");
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("all");
  const [expandido, setExpandido] = useState(null);
  const [seleccionados, setSeleccionados] = useState(new Set());
  const [guardandoId, setGuardandoId] = useState(null);
  const [autorizandoMasivo, setAutorizandoMasivo] = useState(false);
  const [drafts, setDrafts] = useState({});

  const idEmpresa =
    unidadActiva === "all"
      ? "all"
      : String(unidadById?.[unidadActiva]?.id_empresa || "all");
  const fallbackTimezone = useEmpresaTimezone(idEmpresa);

  const cargar = useCallback(async () => {
    if (!dataUser) return;
    setCargando(true);
    setError("");
    try {
      const base = new URLSearchParams({
        empresa: String(idEmpresa || "all"),
        fechaInicio: desde,
        fechaFin: hasta,
        limit: String(PAGE_SIZE),
      });

      const firstParams = new URLSearchParams(base);
      firstParams.set("page", "1");
      const first = await fetcherWithToken(
        `/checador/asistencias?${firstParams.toString()}`,
      );

      let all = Array.isArray(first?.registros) ? first.registros : [];
      const totalPages = Number(first?.totalPages || 1);

      for (let page = 2; page <= totalPages; page += 1) {
        const params = new URLSearchParams(base);
        params.set("page", String(page));
        const next = await fetcherWithToken(
          `/checador/asistencias?${params.toString()}`,
        );
        if (Array.isArray(next?.registros)) {
          all = [...all, ...next.registros];
        }
      }

      setRegistros(all);
    } catch (e) {
      console.error("Error cargando centro de incidencias:", e);
      setRegistros([]);
      setError(
        e?.response?.data?.error ||
          e?.message ||
          "No se pudieron cargar las incidencias.",
      );
    } finally {
      setCargando(false);
    }
  }, [dataUser, idEmpresa, desde, hasta]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    setSeleccionados(new Set());
    setExpandido(null);
  }, [desde, hasta, unidadActiva]);

  const empleados = useMemo(() => {
    const mapa = new Map();

    registros.forEach((r) => {
      const nombre = nombreCompleto(r) || "Empleado";
      const key = String(
        r?.id_empleado ?? r?.nip ?? `${nombre}-${r?.id_empresa ?? ""}`,
      );

      if (!mapa.has(key)) {
        mapa.set(key, {
          key,
          idEmpleado: r?.id_empleado ?? null,
          nombre,
          departamento: r?.departamento || "Sin departamento",
          unidad:
            r?.unidad_negocio ||
            r?.sucursal ||
            r?.empresa_nombre ||
            "Sin unidad",
          registros: [],
        });
      }
      mapa.get(key).registros.push(r);
    });

    return Array.from(mapa.values())
      .map((emp) => {
        const dias = new Set();
        const vacaciones = new Set();
        const permisos = new Set();
        const festivos = new Set();
        let faltas = 0;
        let retardos = 0;
        let horasExtra = 0;
        const incidencias = [];

        emp.registros.forEach((r) => {
          const fecha = fechaRegistro(r);
          if (fecha) dias.add(fecha);
          const estado = estadoNormalizado(r);
          if (estado.includes("vacacion") && fecha) vacaciones.add(fecha);
          if (
            (estado.includes("permiso") ||
              estado.includes("justific") ||
              estado.includes("incapacidad")) &&
            fecha
          ) {
            permisos.add(fecha);
          }
          if (esVerdadero(r?.es_festivo) && fecha) festivos.add(fecha);
          if (estado.includes("ausente") || estado.includes("falta")) faltas += 1;
          if (estado.includes("tardanza") || estado.includes("retardo"))
            retardos += 1;

          const tz = r?.zona_horaria || fallbackTimezone;
          const resumen = calcularResumenJornada(r, tz);
          if (Number(resumen?.diferencia || 0) > 0) {
            horasExtra += Number(resumen.diferencia || 0);
          }

          incidenciasDeRegistro(r, fallbackTimezone).forEach((inc, index) => {
            incidencias.push({
              ...inc,
              key: `${r.id || fecha || emp.key}-${inc.tipo}-${index}`,
              registro: r,
              fecha,
              tz,
            });
          });
        });

        const critica = incidencias.some((i) => i.severidad === "alta");
        const estado =
          incidencias.length === 0 ? "ready" : critica ? "pending" : "review";

        return {
          ...emp,
          dias: dias.size,
          faltas,
          retardos,
          horasExtra: Number(horasExtra.toFixed(2)),
          vacaciones: vacaciones.size,
          permisos: permisos.size,
          festivos: festivos.size,
          incidencias,
          estado,
        };
      })
      .sort((a, b) =>
        a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
      );
  }, [registros, fallbackTimezone]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return empleados.filter((emp) => {
      const matchQ =
        !q ||
        emp.nombre.toLowerCase().includes(q) ||
        emp.departamento.toLowerCase().includes(q) ||
        emp.unidad.toLowerCase().includes(q);

      if (!matchQ) return false;
      if (filtro === "review") return emp.estado !== "ready";
      if (filtro === "faults") return emp.faltas > 0;
      if (filtro === "late") return emp.retardos > 0;
      if (filtro === "extra") return emp.horasExtra > 0;
      if (filtro === "vac") return emp.vacaciones > 0;
      if (filtro === "perm") return emp.permisos > 0;
      if (filtro === "holiday") return emp.festivos > 0;
      if (filtro === "ready") return emp.estado === "ready";
      return true;
    });
  }, [empleados, busqueda, filtro]);

  const totalIncidencias = useMemo(
    () => empleados.reduce((acc, emp) => acc + emp.incidencias.length, 0),
    [empleados],
  );
  const porRevisar = useMemo(
    () => empleados.filter((emp) => emp.estado !== "ready").length,
    [empleados],
  );
  const listos = empleados.length - porRevisar;

  const setDraft = (registro, campo, valor, tz) => {
    const id = String(registro.id);
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        entrada:
          prev[id]?.entrada ?? horaLocal(registro.entrada, tz || fallbackTimezone),
        salida:
          prev[id]?.salida ?? horaLocal(registro.salida, tz || fallbackTimezone),
        notas: prev[id]?.notas ?? registro.notas ?? "",
        [campo]: valor,
      },
    }));
  };

  const draftDe = (registro, tz) => {
    const id = String(registro.id);
    return (
      drafts[id] || {
        entrada: horaLocal(registro.entrada, tz || fallbackTimezone),
        salida: horaLocal(registro.salida, tz || fallbackTimezone),
        notas: registro.notas || "",
      }
    );
  };

  const guardarCorreccion = async (registro, tz, patch = {}) => {
    if (!registro?.id) return;
    setGuardandoId(registro.id);
    try {
      const draft = draftDe(registro, tz);
      const fecha = fechaRegistro(registro);
      const payload = limpiarPayload({
        ...registro,
        ...patch,
        entrada:
          patch.entrada !== undefined
            ? patch.entrada
            : aFechaDb(fecha, draft.entrada, tz || fallbackTimezone),
        salida:
          patch.salida !== undefined
            ? patch.salida
            : aFechaDb(fecha, draft.salida, tz || fallbackTimezone),
        notas: patch.notas !== undefined ? patch.notas : draft.notas,
        correccion: 1,
      });

      await axios.put(`/checador/asistencias/${registro.id}`, payload);
      enqueueSnackbar("Registro actualizado correctamente.", {
        variant: "success",
      });
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[String(registro.id)];
        return next;
      });
      await cargar();
    } catch (e) {
      console.error("Error guardando incidencia:", e);
      enqueueSnackbar(
        e?.response?.data?.message ||
          e?.response?.data?.error ||
          "No se pudo actualizar el registro.",
        { variant: "error" },
      );
    } finally {
      setGuardandoId(null);
    }
  };

  const autorizarExtra = async (inc) => {
    await guardarCorreccion(inc.registro, inc.tz, { hrs_extra: 1 });
  };

  const abrirAsistencia = (inc) => {
    const params = new URLSearchParams();
    if (inc?.fecha) params.set("fecha", inc.fecha);
    const nombre = nombreCompleto(inc?.registro);
    if (nombre) params.set("empleado", nombre);
    router.push(`/panel/registro-asistencia?${params.toString()}`);
  };

  const toggleSeleccion = (key) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleTodos = () => {
    setSeleccionados((prev) => {
      const todos = visibles.every((emp) => prev.has(emp.key));
      if (todos) return new Set();
      return new Set(visibles.map((emp) => emp.key));
    });
  };

  const autorizarHorasExtraSeleccionados = async () => {
    const targets = empleados
      .filter((emp) => seleccionados.has(emp.key))
      .flatMap((emp) =>
        emp.incidencias.filter((inc) => inc.tipo === "H. extra"),
      );

    if (!targets.length) {
      enqueueSnackbar("Los empleados seleccionados no tienen horas extra pendientes.", {
        variant: "info",
      });
      return;
    }

    setAutorizandoMasivo(true);
    try {
      for (const inc of targets) {
        const payload = limpiarPayload({
          ...inc.registro,
          hrs_extra: 1,
          correccion: 1,
        });
        await axios.put(
          `/checador/asistencias/${inc.registro.id}`,
          payload,
        );
      }
      enqueueSnackbar(
        `${targets.length} registro(s) de horas extra autorizados.`,
        { variant: "success" },
      );
      setSeleccionados(new Set());
      await cargar();
    } catch (e) {
      console.error("Error autorizando horas extra:", e);
      enqueueSnackbar(
        e?.response?.data?.message ||
          e?.response?.data?.error ||
          "No se pudieron autorizar todas las horas extra.",
        { variant: "error" },
      );
      await cargar();
    } finally {
      setAutorizandoMasivo(false);
    }
  };

  const exportarExcel = async () => {
    const fuente =
      seleccionados.size > 0
        ? empleados.filter((emp) => seleccionados.has(emp.key))
        : visibles;

    if (!fuente.length) return;

    try {
      const ExcelJS = (await import("exceljs")).default;
      const { saveAs } = await import("file-saver");
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Centro de incidencias");
      ws.columns = [
        { header: "Empleado", key: "empleado", width: 32 },
        { header: "Días", key: "dias", width: 10 },
        { header: "Faltas", key: "faltas", width: 10 },
        { header: "Retardos", key: "retardos", width: 11 },
        { header: "H. extra", key: "extra", width: 12 },
        { header: "Vacaciones", key: "vacaciones", width: 12 },
        { header: "Permisos", key: "permisos", width: 11 },
        { header: "Festivos", key: "festivos", width: 10 },
        { header: "Incidencias", key: "incidencias", width: 13 },
        { header: "Estado", key: "estado", width: 13 },
      ];

      ws.getRow(1).font = { bold: true };
      fuente.forEach((emp) =>
        ws.addRow({
          empleado: emp.nombre,
          dias: emp.dias,
          faltas: emp.faltas,
          retardos: emp.retardos,
          extra: emp.horasExtra,
          vacaciones: emp.vacaciones,
          permisos: emp.permisos,
          festivos: emp.festivos,
          incidencias: emp.incidencias.length,
          estado:
            emp.estado === "ready"
              ? "Listo"
              : emp.estado === "pending"
                ? "Pendiente"
                : "Revisar",
        }),
      );

      const buffer = await wb.xlsx.writeBuffer();
      saveAs(
        new Blob([buffer]),
        `incidencias_${desde}_a_${hasta}.xlsx`,
      );
    } catch (e) {
      console.error(e);
      enqueueSnackbar("No se pudo exportar el archivo.", { variant: "error" });
    }
  };

  const aplicarPreset = (preset) => {
    const hoy = dayjs().tz(DB_TIMEZONE);
    if (preset === "q1") {
      setDesde(hoy.startOf("month").format("YYYY-MM-DD"));
      setHasta(hoy.date(15).format("YYYY-MM-DD"));
    } else if (preset === "q2") {
      setDesde(hoy.date(16).format("YYYY-MM-DD"));
      setHasta(hoy.endOf("month").format("YYYY-MM-DD"));
    } else if (preset === "month") {
      setDesde(hoy.startOf("month").format("YYYY-MM-DD"));
      setHasta(hoy.endOf("month").format("YYYY-MM-DD"));
    } else if (preset === "7d") {
      setDesde(hoy.subtract(6, "day").format("YYYY-MM-DD"));
      setHasta(hoy.format("YYYY-MM-DD"));
    }
    setPeriodoOpen(false);
  };

  const limpiar = () => {
    const p = periodoQuincenaActual();
    setDesde(p.desde);
    setHasta(p.hasta);
    setUnidadActiva("all");
    setBusqueda("");
    setFiltro("all");
    setSeleccionados(new Set());
    setExpandido(null);
  };

  const filtros = [
    ["all", "Todos"],
    ["review", "Revisar"],
    ["faults", "Faltas"],
    ["late", "Retardos"],
    ["extra", "H. extra"],
    ["vac", "Vacaciones"],
    ["perm", "Permisos"],
    ["holiday", "Festivos"],
    ["ready", "Listos"],
  ];

  const todasSeleccionadas =
    visibles.length > 0 && visibles.every((emp) => seleccionados.has(emp.key));

  return (
    <div className="space-y-5">
      <section>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-400">
              <span>Control de tiempo</span>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-blue-600">Centro de incidencias</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
              Centro de incidencias
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Revisa, corrige y resuelve incidencias antes de preparar la prenómina.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPeriodoOpen((v) => !v)}
                className="h-11 rounded-xl border-slate-200 bg-white px-4 font-semibold text-slate-700"
              >
                <CalendarDays className="mr-2 h-4 w-4" />
                {etiquetaPeriodo(desde, hasta)}
                <ChevronDown className="ml-2 h-4 w-4 text-slate-400" />
              </Button>

              {periodoOpen && (
                <div className="absolute right-0 top-12 z-50 w-[310px] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={() => aplicarPreset("q1")}>
                      1ª quincena
                    </Button>
                    <Button variant="outline" onClick={() => aplicarPreset("q2")}>
                      2ª quincena
                    </Button>
                    <Button variant="outline" onClick={() => aplicarPreset("month")}>
                      Este mes
                    </Button>
                    <Button variant="outline" onClick={() => aplicarPreset("7d")}>
                      Últimos 7 días
                    </Button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <label className="text-xs font-semibold text-slate-500">
                      Desde
                      <Input
                        type="date"
                        value={desde}
                        onChange={(e) => setDesde(e.target.value)}
                        className="mt-1"
                      />
                    </label>
                    <label className="text-xs font-semibold text-slate-500">
                      Hasta
                      <Input
                        type="date"
                        value={hasta}
                        min={desde}
                        onChange={(e) => setHasta(e.target.value)}
                        className="mt-1"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            <Button
              type="button"
              disabled={totalIncidencias > 0 || cargando}
              onClick={() =>
                enqueueSnackbar("Periodo listo para preparar prenómina.", {
                  variant: "success",
                })
              }
              className="h-11 rounded-xl bg-gradient-to-br from-brand to-brand-accent px-5 font-bold text-white shadow-sm disabled:opacity-45"
              title={
                totalIncidencias > 0
                  ? `Hay ${totalIncidencias} incidencia(s) pendientes`
                  : "Periodo listo"
              }
            >
              Preparar prenómina
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <div className="text-xs font-semibold text-slate-500">Empleados</div>
              <div className="text-2xl font-extrabold text-slate-950">
                {empleados.length}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <div className="text-xs font-semibold text-slate-500">
                Incidencias totales
              </div>
              <div className="text-2xl font-extrabold text-slate-950">
                {totalIncidencias}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <Clock3 className="h-5 w-5" />
            </span>
            <div>
              <div className="text-xs font-semibold text-slate-500">Por revisar</div>
              <div className="text-2xl font-extrabold text-orange-600">
                {porRevisar}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div>
              <div className="text-xs font-semibold text-slate-500">
                Listos para prenómina
              </div>
              <div className="text-2xl font-extrabold text-emerald-700">
                {listos}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4">
          <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {filtros.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setFiltro(key);
                    setExpandido(null);
                  }}
                  className={
                    filtro === key
                      ? "min-h-10 rounded-xl bg-gradient-to-br from-brand to-brand-accent px-3 text-xs font-bold text-white shadow-sm"
                      : "min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:border-blue-200 hover:text-blue-600"
                  }
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              {unidadOptions.length > 1 && (
                <div className="min-w-[220px] [&_button]:h-11 [&_button]:w-full [&_button]:rounded-xl [&_button]:border-slate-200">
                  <Combobox
                    options={[
                      { value: "all", label: "Todas las unidades" },
                      ...unidadOptions,
                    ]}
                    value={unidadActiva}
                    onChange={(value) => setUnidadActiva(value || "all")}
                    placeholder="Unidad de negocio"
                  />
                </div>
              )}

              <label className="relative block min-w-[240px]">
                <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <Input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar empleado..."
                  className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-9 text-sm focus:bg-white"
                />
              </label>

              <Button
                variant="outline"
                onClick={limpiar}
                className="h-11 rounded-xl border-slate-200"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Limpiar
              </Button>
            </div>
          </div>
        </div>

        {seleccionados.size > 0 && (
          <div className="flex flex-col gap-3 border-b border-blue-100 bg-gradient-to-r from-blue-50/80 to-violet-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-bold text-slate-800">
              {seleccionados.size} empleado
              {seleccionados.size === 1 ? "" : "s"} seleccionado
              {seleccionados.size === 1 ? "" : "s"}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={autorizandoMasivo}
                onClick={autorizarHorasExtraSeleccionados}
                className="h-10 rounded-lg border-blue-200 bg-white text-blue-700"
              >
                {autorizandoMasivo ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Clock3 className="mr-2 h-4 w-4" />
                )}
                Autorizar H. extra
              </Button>
              <Button
                variant="outline"
                onClick={exportarExcel}
                className="h-10 rounded-lg border-slate-200 bg-white"
              >
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
              <Button
                variant="outline"
                onClick={() => setSeleccionados(new Set())}
                className="h-10 rounded-lg border-slate-200 bg-white"
              >
                Cancelar selección
              </Button>
            </div>
          </div>
        )}

        {error ? (
          <div className="m-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
            {error}
          </div>
        ) : cargando ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm font-medium text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            Analizando incidencias del periodo…
          </div>
        ) : visibles.length === 0 ? (
          <div className="py-20 text-center">
            <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-500" />
            <div className="mt-3 font-bold text-slate-800">
              No hay registros para este filtro
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Cambia los filtros o selecciona otro periodo.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] border-collapse text-sm">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-[0.05em] text-slate-500">
                  <th className="w-11 px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={todasSeleccionadas}
                      onChange={toggleTodos}
                      className="h-4 w-4 accent-blue-600"
                      aria-label="Seleccionar todos"
                    />
                  </th>
                  <th className="min-w-[220px] px-3 py-3 text-left">Empleado</th>
                  <th className="px-2 py-3 text-center">Días</th>
                  <th className="px-2 py-3 text-center">Faltas</th>
                  <th className="px-2 py-3 text-center">Retardos</th>
                  <th className="px-2 py-3 text-center">H. extra</th>
                  <th className="px-2 py-3 text-center">Vacaciones</th>
                  <th className="px-2 py-3 text-center">Permisos</th>
                  <th className="px-2 py-3 text-center">Festivos</th>
                  <th className="px-2 py-3 text-center">Incidencias</th>
                  <th className="min-w-[120px] px-3 py-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((emp) => {
                  const open = expandido === emp.key;
                  return (
                    <Fragment key={emp.key}>
                      <tr
                        key={emp.key}
                        className={
                          open
                            ? "border-b border-blue-100 bg-gradient-to-r from-blue-50/35 to-violet-50/35"
                            : "border-b border-slate-100 transition hover:bg-slate-50/70"
                        }
                      >
                        <td className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={seleccionados.has(emp.key)}
                            onChange={() => toggleSeleccion(emp.key)}
                            className="h-4 w-4 accent-blue-600"
                            aria-label={`Seleccionar ${emp.nombre}`}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            onClick={() => setExpandido(open ? null : emp.key)}
                            className="flex min-h-10 w-full items-center gap-3 text-left"
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-violet-100 text-xs font-extrabold text-blue-700">
                              {emp.nombre
                                .split(" ")
                                .map((x) => x[0])
                                .filter(Boolean)
                                .slice(0, 2)
                                .join("")
                                .toUpperCase()}
                            </span>
                            <span className="min-w-0">
                              <span className="block font-bold text-slate-900">
                                {emp.nombre}
                              </span>
                              <span className="block truncate text-xs text-slate-400">
                                {emp.departamento}
                                {emp.unidad ? ` · ${emp.unidad}` : ""}
                              </span>
                            </span>
                            {open ? (
                              <ChevronDown className="ml-auto h-4 w-4 text-blue-600" />
                            ) : (
                              <ChevronRight className="ml-auto h-4 w-4 text-slate-400" />
                            )}
                          </button>
                        </td>
                        <td className="px-2 py-3 text-center font-bold text-slate-700">
                          {emp.dias}
                        </td>
                        <td className={`px-2 py-3 text-center font-bold ${emp.faltas ? "text-rose-600" : "text-slate-500"}`}>
                          {emp.faltas}
                        </td>
                        <td className={`px-2 py-3 text-center font-bold ${emp.retardos ? "text-orange-600" : "text-slate-500"}`}>
                          {emp.retardos}
                        </td>
                        <td className={`px-2 py-3 text-center font-bold ${emp.horasExtra ? "text-blue-600" : "text-slate-500"}`}>
                          {emp.horasExtra ? `${emp.horasExtra} h` : "0 h"}
                        </td>
                        <td className="px-2 py-3 text-center font-semibold text-slate-600">
                          {emp.vacaciones}
                        </td>
                        <td className="px-2 py-3 text-center font-semibold text-slate-600">
                          {emp.permisos}
                        </td>
                        <td className="px-2 py-3 text-center font-semibold text-slate-600">
                          {emp.festivos}
                        </td>
                        <td className="px-2 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => setExpandido(open ? null : emp.key)}
                            className={`min-h-10 min-w-10 rounded-lg font-extrabold ${emp.incidencias.length ? "text-violet-700 hover:bg-violet-50" : "text-slate-400"}`}
                          >
                            {emp.incidencias.length}
                          </button>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => setExpandido(open ? null : emp.key)}
                            className={
                              emp.estado === "ready"
                                ? "min-h-9 rounded-full bg-emerald-50 px-3 text-xs font-extrabold text-emerald-700"
                                : emp.estado === "pending"
                                  ? "min-h-9 rounded-full bg-rose-50 px-3 text-xs font-extrabold text-rose-700"
                                  : "min-h-9 rounded-full bg-orange-50 px-3 text-xs font-extrabold text-orange-700"
                            }
                          >
                            {emp.estado === "ready"
                              ? "Listo"
                              : emp.estado === "pending"
                                ? "Pendiente"
                                : "Revisar"}
                          </button>
                        </td>
                      </tr>

                      {open && (
                        <tr key={`${emp.key}-detalle`}>
                          <td
                            colSpan={11}
                            className="border-b border-slate-200 bg-slate-50/75 p-0"
                          >
                            <div className="border-l-4 border-blue-600 p-4">
                              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <div className="font-extrabold text-slate-900">
                                    Incidencias de {emp.nombre}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    Corrige horarios directamente. Los cambios se guardan en Asistencias y quedan marcados como corrección.
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  className="h-10 rounded-lg border-slate-200 bg-white"
                                  onClick={() => {
                                    const primera = emp.incidencias[0];
                                    if (primera) abrirAsistencia(primera);
                                  }}
                                  disabled={!emp.incidencias.length}
                                >
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  Abrir en Asistencias
                                </Button>
                              </div>

                              {emp.incidencias.length === 0 ? (
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-semibold text-emerald-800">
                                  Este empleado no tiene incidencias pendientes en el periodo.
                                </div>
                              ) : (
                                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                                  {emp.incidencias.map((inc) => {
                                    const registro = inc.registro;
                                    const draft = draftDe(registro, inc.tz);
                                    const fecha = inc.fecha
                                      ? dayjs(inc.fecha).format("DD MMM YYYY")
                                      : "-";
                                    return (
                                      <div
                                        key={inc.key}
                                        className="grid gap-3 border-b border-slate-100 p-3 last:border-0 xl:grid-cols-[105px_130px_1fr_auto] xl:items-center"
                                      >
                                        <div>
                                          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                            Fecha
                                          </div>
                                          <div className="mt-1 font-bold text-slate-800">
                                            {fecha}
                                          </div>
                                        </div>

                                        <div>
                                          <span
                                            className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${estiloIncidencia(inc.tipo)}`}
                                          >
                                            {inc.tipo}
                                          </span>
                                        </div>

                                        <div className="grid gap-2 sm:grid-cols-4">
                                          <label className="text-[11px] font-semibold text-slate-500">
                                            Horario
                                            <div className="mt-1 flex h-10 items-center rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm font-bold text-slate-700">
                                              {registro.hora_entrada_programada || "—"}
                                              <span className="mx-1 text-slate-300">–</span>
                                              {registro.hora_salida_programada || "—"}
                                            </div>
                                          </label>
                                          <label className="text-[11px] font-semibold text-slate-500">
                                            Entrada
                                            <Input
                                              type="time"
                                              value={draft.entrada}
                                              onChange={(e) =>
                                                setDraft(
                                                  registro,
                                                  "entrada",
                                                  e.target.value,
                                                  inc.tz,
                                                )
                                              }
                                              className="mt-1 h-10 rounded-lg border-slate-200 bg-white text-sm font-bold"
                                            />
                                          </label>
                                          <label className="text-[11px] font-semibold text-slate-500">
                                            Salida
                                            <Input
                                              type="time"
                                              value={draft.salida}
                                              onChange={(e) =>
                                                setDraft(
                                                  registro,
                                                  "salida",
                                                  e.target.value,
                                                  inc.tz,
                                                )
                                              }
                                              className="mt-1 h-10 rounded-lg border-slate-200 bg-white text-sm font-bold"
                                            />
                                          </label>
                                          <label className="text-[11px] font-semibold text-slate-500">
                                            Nota
                                            <Input
                                              value={draft.notas}
                                              onChange={(e) =>
                                                setDraft(
                                                  registro,
                                                  "notas",
                                                  e.target.value,
                                                  inc.tz,
                                                )
                                              }
                                              placeholder={inc.detalle}
                                              className="mt-1 h-10 rounded-lg border-slate-200 bg-white text-sm"
                                            />
                                          </label>
                                        </div>

                                        <div className="flex flex-wrap gap-2 xl:justify-end">
                                          {inc.tipo === "H. extra" && (
                                            <Button
                                              type="button"
                                              variant="outline"
                                              disabled={guardandoId === registro.id}
                                              onClick={() => autorizarExtra(inc)}
                                              className="h-10 rounded-lg border-blue-200 bg-white text-blue-700"
                                            >
                                              <Clock3 className="mr-1.5 h-4 w-4" />
                                              Autorizar
                                            </Button>
                                          )}
                                          {inc.accion === "corregir" && (
                                            <Button
                                              type="button"
                                              disabled={guardandoId === registro.id}
                                              onClick={() =>
                                                guardarCorreccion(registro, inc.tz)
                                              }
                                              className="h-10 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                                            >
                                              {guardandoId === registro.id ? (
                                                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                              ) : (
                                                <Save className="mr-1.5 h-4 w-4" />
                                              )}
                                              Guardar
                                            </Button>
                                          )}
                                          <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => abrirAsistencia(inc)}
                                            className="h-10 rounded-lg border-slate-200 bg-white"
                                          >
                                            <ExternalLink className="mr-1.5 h-4 w-4" />
                                            Revisar
                                          </Button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!cargando && !error && visibles.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Mostrando {visibles.length} de {empleados.length} empleados
            </span>
            <button
              type="button"
              onClick={exportarExcel}
              className="inline-flex min-h-9 items-center font-bold text-blue-600 hover:text-blue-700"
            >
              <Download className="mr-1.5 h-4 w-4" />
              Exportar vista a Excel
            </button>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <FileWarning className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="font-bold text-slate-800">
              Cómo determina ADAMIA una incidencia
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Actualmente se detectan faltas, retardos, entradas o salidas incompletas,
              horas extra aún no autorizadas y checadas que coinciden con vacaciones.
              Permisos, vacaciones y festivos se muestran como contexto del periodo, no
              como incidencia por sí solos.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
