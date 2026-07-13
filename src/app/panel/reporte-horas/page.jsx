"use client";

// Reporte de Horas Trabajadas (adaptado a Adamia)
// - Backend: /api/checador/reportes/horas (redlab_back)
// - Empleados: /api/checador/empleados?empresa=ID
// - Puestos: /api/checador/empleados/puestos?empresa=ID
// Relacionado con: redlab_back/modules/attendance/controllers/reporteHorasController.js

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icon } from "@iconify/react";
import { useSnackbar } from "notistack";
import { useAuth } from "@/context/AuthContext";
import axios from "@/lib/axios";
import Cookies from "js-cookie";
import { Combobox } from "@/components/Combobox";
import {
  FiltrosGrid,
  CampoFiltro,
  SelectorBoton,
} from "@/components/filtros/CampoFiltro";
import RangoFechasModal from "@/components/filtros/RangoFechasModal";
import useUnidadesNegocio from "@/hooks/useUnidadesNegocio";
import AccesosRapidos from "@/components/AccesosRapidos";
import { fetchImageAsDataUrl } from "@/lib/pdfCompanyLogo";
import { BarChart3, FileDown, FileSpreadsheet, Search } from "lucide-react";

function fmtDate(d) {
  const dd = new Date(d);
  const y = dd.getUTCFullYear();
  const m = String(dd.getUTCMonth() + 1).padStart(2, "0");
  const day = String(dd.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function humanDate(isoDate) {
  const d = new Date(isoDate + "T00:00:00Z");
  return d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

function fileDate(isoDate) {
  // Devuelve DD_MM_YYYY para nombre de archivo
  const d = new Date(isoDate + "T00:00:00Z");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yy = d.getUTCFullYear();
  return `${dd}_${mm}_${yy}`;
}

function EstadoPill({ value }) {
  const v = String(value || "").toLowerCase();
  // Sin colores: solo texto en escala de grises (diseño limpio para PDF y preview)
  const label = v === "cerrado" ? "Completo" : value || "—";
  return (
    <span className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-gray-50 px-2 py-0.5 text-xs font-semibold text-gray-700">
      {label}
    </span>
  );
}

function MotivoPill({ value }) {
  if (!value) return <span className="text-zinc-500">—</span>;
  // Sin colores ni emojis: solo texto limpio (diseño para PDF y preview)
  // Eliminar emojis si existen en el valor
  const cleanValue = String(value)
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, "")
    .replace(/[\u{2600}-\u{26FF}]/gu, "")
    .replace(/[\u{2700}-\u{27BF}]/gu, "")
    .trim();
  return (
    <span className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-gray-50 px-2 py-0.5 text-xs font-semibold text-gray-700">
      {cleanValue || "—"}
    </span>
  );
}

export default function ReporteHorasPage() {
  const today = useMemo(() => fmtDate(new Date()), []);
  const monthStart = useMemo(() => {
    const d = new Date();
    d.setUTCDate(1);
    return fmtDate(d);
  }, []);

  const { dataUser } = useAuth();
  const [unidadActiva, setUnidadActiva] = useState("all");
  const { options: unidadOptions, byId: unidadById } = useUnidadesNegocio();
  const empresaActiva =
    unidadActiva === "all"
      ? "all"
      : String(unidadById[unidadActiva]?.id_empresa || "all");
  const unidadNombreActiva =
    unidadActiva === "all"
      ? ""
      : String(unidadById[unidadActiva]?.label || "").toLowerCase();
  const { enqueueSnackbar } = useSnackbar();

  const [empleados, setEmpleados] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [cargo, setCargo] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [empleadoId, setEmpleadoId] = useState("");
  const [empleadoIds, setEmpleadoIds] = useState([]);
  const [multi, setMulti] = useState(false);
  const [fechaInicio, setFechaInicio] = useState(monthStart);
  const [fechaFin, setFechaFin] = useState(today);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(null); // 'excel' | 'pdf' | null
  const [reportes, setReportes] = useState(null);
  const reportRef = useRef(null);

  // Dialogo de selección múltiple
  const [openSelector, setOpenSelector] = useState(false);
  const [searchEmpleado, setSearchEmpleado] = useState("");
  const [tempEmpleadoIds, setTempEmpleadoIds] = useState([]);

  // Rediseño homologado de filtros: modal de rango de fechas.
  // Las fechas iniciales (inicio de mes → hoy) corresponden a "Este mes".
  const [rangoOpen, setRangoOpen] = useState(false);
  const [rangoEtiqueta, setRangoEtiqueta] = useState("Este mes");

  // Selector de empleados unificado (siempre el diálogo múltiple):
  // `multi` se fija en true al montar para que handleGenerar tome la ruta
  // "ids seleccionados o todos los del filtro" sin tocar la lógica de datos.
  useEffect(() => {
    setMulti(true);
  }, []);

  // Cargar empleados y puestos por empresa
  useEffect(() => {
    if (!dataUser) return;
    (async () => {
      try {
        setLoading(true);
        const auth = {
          headers: { Authorization: `Bearer ${Cookies.get("token") || ""}` },
        };

        const [eRes, pRes] = await Promise.all([
          axios.get(
            `/checador/empleados?empresa=${empresaActiva}&page=1&limit=1000&estado=Activo`,
            auth,
          ),
          axios.get(
            `/checador/empleados/puestos?empresa=${empresaActiva}`,
            auth,
          ),
        ]);

        const emps = Array.isArray(eRes.data?.data) ? eRes.data.data : [];
        const empleadosMapped = emps.map((e) => ({
          id_empleado: e.id_empleado,
          nombre_empleado: [e.nombre, e.apellido_paterno, e.apellido_materno]
            .filter(Boolean)
            .join(" "),
          nombre_empresa: e.nombre_empresa || "N/A",
          unidad_negocio: e.unidad_negocio || e.sucursal || "",
          puesto: e.puesto || null,
          periodo_pago: e.periodo_pago || "",
        }));

        setEmpleados(empleadosMapped);

        if (empleadosMapped.length > 0) {
          setEmpleadoId(String(empleadosMapped[0].id_empleado));
        } else {
          setEmpleadoId("");
        }

        const puestos = Array.isArray(pRes.data) ? pRes.data : [];
        const nombres = [
          ...new Set(puestos.map((p) => p.nombre_puesto).filter(Boolean)),
        ];
        setCargos(nombres);
      } catch (err) {
        console.error("Error cargando datos:", err);
        enqueueSnackbar("No se pudieron cargar empleados o puestos", {
          variant: "error",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [empresaActiva, dataUser]);

  const empleadosFiltrados = useMemo(() => {
    let result = unidadNombreActiva
      ? empleados.filter(
          (e) =>
            String(e.unidad_negocio || "").toLowerCase() === unidadNombreActiva,
        )
      : empleados;
    if (cargo)
      result = result.filter(
        (e) => (e.puesto || "").toLowerCase() === cargo.toLowerCase(),
      );
    if (periodo)
      result = result.filter(
        (e) => (e.periodo_pago || "").toLowerCase() === periodo.toLowerCase(),
      );
    return result;
  }, [empleados, cargo, periodo, unidadNombreActiva]);

  const dialogResultados = useMemo(() => {
    const q = searchEmpleado.trim().toLowerCase();
    if (!q) return empleadosFiltrados;
    return empleadosFiltrados.filter((e) => {
      const nombre = String(e.nombre_empleado || "").toLowerCase();
      const empresa = String(e.nombre_empresa || "").toLowerCase();
      const unidad = String(e.unidad_negocio || "").toLowerCase();
      return nombre.includes(q) || empresa.includes(q) || unidad.includes(q);
    });
  }, [empleadosFiltrados, searchEmpleado]);

  // Texto del botón "Empleado(s)" en la fila de filtros.
  const empleadoSeleccionValor = useMemo(() => {
    if (empleadoIds.length === 0) return "";
    if (empleadoIds.length === 1) {
      const emp = empleados.find(
        (e) => String(e.id_empleado) === String(empleadoIds[0]),
      );
      return emp?.nombre_empleado || "1 empleado";
    }
    return `${empleadoIds.length} empleados`;
  }, [empleadoIds, empleados]);

  function openSelectorWithBuffer() {
    setTempEmpleadoIds(empleadoIds);
    setSearchEmpleado("");
    setOpenSelector(true);
  }
  function toggleTemp(id) {
    const sid = String(id);
    setTempEmpleadoIds((prev) =>
      prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid],
    );
  }
  function selectAllDialog() {
    const all = dialogResultados.map((e) => String(e.id_empleado));
    setTempEmpleadoIds(all);
  }
  function clearDialogSelection() {
    setTempEmpleadoIds([]);
  }

  async function handleGenerar() {
    if (!fechaInicio || !fechaFin) return;
    setLoading(true);
    try {
      let ids = [];
      if (multi) {
        ids = empleadoIds.length
          ? empleadoIds
          : empleadosFiltrados.map((e) => String(e.id_empleado));
      } else {
        if (!empleadoId) return;
        ids = [String(empleadoId)];
      }
      const auth = {
        headers: { Authorization: `Bearer ${Cookies.get("token") || ""}` },
      };
      const requests = ids.map((id) =>
        axios.get(`/checador/reportes/horas`, {
          params: {
            empleadoId: id,
            fechaInicio,
            fechaFin,
          },
          ...auth,
        }),
      );
      const results = await Promise.all(requests);
      const okReports = results
        .map((r) => r.data)
        .filter((d) => d?.ok)
        .map((d) => d.data);
      setReportes(okReports);
      if (okReports.length === 0)
        enqueueSnackbar("Sin datos en el periodo", { variant: "info" });
    } catch (err) {
      enqueueSnackbar("No se pudo generar el reporte", { variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  function handleImprimir() {
    window.print();
  }

  async function handleExcel() {
    if (!reportes || reportes.length === 0) return;
    try {
      setExporting("excel");
      const baseCSS = `
        *{box-sizing:border-box}
        body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Helvetica Neue;color:#111827;font-size:14px;margin:0;background:#ffffff}
        .card{border:1px solid #e5e7eb;border-radius:10px;margin:18px 0;overflow:hidden}
        .topbar{display:block;padding:14px 18px;text-align:right}
        .topbar .title{font-weight:700;font-size:16px;color:#0f172a}
        .topbar .subtitle{font-size:12px;color:#64748b;margin-top:2px}
        .sep{height:2px;background:#1f2937;margin:8px 0 14px 0}
        .meta-card{border:1px solid #e5e7eb;border-radius:8px;background:#f8fafc;margin:0 14px 14px 14px;overflow:hidden}
        .meta-card .head{background:#eef2f7;color:#111827;font-weight:700;font-size:12px;padding:10px 12px;border-bottom:1px solid #e5e7eb}
        .meta-table{width:100%;border-collapse:collapse}
        .meta-table td{padding:10px 12px;vertical-align:top}
        .meta-table .k{font-size:12px;color:#6b7280;font-weight:600;padding-right:6px;white-space:nowrap}
        .meta-table .v{font-size:14px;font-weight:600}
        table{width:100%;border-collapse:collapse}
        thead th{background:#1f2937;color:#ffffff;font-weight:700;border:1px solid #1f2937;padding:10px;text-align:center}
        tbody td{border:1px solid #e5e7eb;padding:10px;font-size:13px}
        tbody tr:nth-child(odd){background:#fafafa}
        .details{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,Liberation Mono,monospace;color:#4b5563;font-size:12px;white-space:pre-wrap}
        .summary-card{border:1px solid #e5e7eb;border-radius:8px;background:#f8fafc;margin:12px 14px 0 14px}
        .summary-table{width:100%;border-collapse:collapse}
        .summary-table td{text-align:center;padding:14px}
        .summary-table .h{font-size:12px;color:#6b7280}
        .summary-table .v{font-size:22px;font-weight:700;color:#0f172a}
        .summary-table .s{font-size:12px;color:#6b7280}
        .badge{display:inline-block;padding:3px 10px;border-radius:9999px;font-weight:700;font-size:11px;border:1px solid transparent}
        .badge-success{background:#DCFCE7;color:#166534;border-color:#86EFAC}
        .badge-danger{background:#FEE2E2;color:#991B1B;border-color:#FCA5A5}
        .badge-warning{background:#FEF9C3;color:#92400E;border-color:#FDE68A}
        .badge-info{background:#DBEAFE;color:#1E3A8A;border-color:#93C5FD}
        .pb{page-break-after:always}
      `;
      const renderReport = (r) => {
        const rows = r.dias
          .map((d) => {
            // Calcular primera entrada y última salida cuando hay múltiples movimientos
            let primeraEntrada = d.entrada;
            let ultimaSalida = d.salida;
            let totalHorasTrabajadas = d.horasHM;

            if (Array.isArray(d.movimientos) && d.movimientos.length > 0) {
              // Obtener primera entrada de todos los movimientos
              const entradasValidas = d.movimientos
                .map((m) => m.entrada)
                .filter(Boolean)
                .map((e) => new Date(e))
                .sort((a, b) => a - b);
              if (entradasValidas.length > 0) {
                primeraEntrada = entradasValidas[0].toISOString();
              }

              // Obtener última salida de todos los movimientos
              const salidasValidas = d.movimientos
                .map((m) => m.salida)
                .filter(Boolean)
                .map((s) => new Date(s))
                .sort((a, b) => b - a);
              if (salidasValidas.length > 0) {
                ultimaSalida = salidasValidas[0].toISOString();
              }

              // Sumar todas las horas trabajadas de cada movimiento
              const totalMinutos = d.movimientos.reduce((acc, m) => {
                if (m.horasHM) {
                  const [horas, minutos] = m.horasHM.split(":").map(Number);
                  return acc + horas * 60 + minutos;
                }
                return acc;
              }, 0);
              const horas = Math.floor(totalMinutos / 60);
              const minutos = totalMinutos % 60;
              totalHorasTrabajadas = `${horas}:${String(minutos).padStart(
                2,
                "0",
              )}`;
            }

            const e = primeraEntrada
              ? new Date(primeraEntrada).toLocaleTimeString("es-MX", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "-";
            const s = ultimaSalida
              ? new Date(ultimaSalida).toLocaleTimeString("es-MX", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "-";
            const estado = (d.estado || "").toLowerCase();
            let badge = "badge-info";
            if (estado === "presente") badge = "badge-success";
            else if (estado === "ausente") badge = "badge-danger";
            else if (estado === "tarde") badge = "badge-warning";
            return `
            <tr>
              <td>${humanDate(d.fecha)}</td>
              <td style="text-align:center">${e}</td>
              <td style="text-align:center">${s}</td>
              <td style="text-align:center">${totalHorasTrabajadas}</td>
              <td style="text-align:center"><span class="badge ${badge}">${
                d.estado || ""
              }</span></td>
              <td>${d.motivo || ""}</td>
              <td>${d.notas || ""}</td>
            </tr>
            ${
              Array.isArray(d.movimientos) && d.movimientos.length > 1
                ? `
              <tr>
                <td colspan="7" class="details">
                  ${d.movimientos
                    .filter((m) => m.entrada && m.salida)
                    .map((m) => {
                      const ee = m.entrada
                        ? new Date(m.entrada).toLocaleTimeString("es-MX", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-";
                      const ss = m.salida
                        ? new Date(m.salida).toLocaleTimeString("es-MX", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-";
                      const horas = m.horasHM || "0:00";
                      return `Entrada: ${ee}  |  Salida: ${ss}  |  Horas: ${horas}`;
                    })
                    .join("\n")}
                </td>
              </tr>
            `
                : ""
            }
          `;
          })
          .join("");
        return `
          <div class="card">
            <div class="topbar">
              <div class="title">Reporte de Horas Trabajadas</div>
              <div class="subtitle">Generado el ${new Date().toLocaleDateString(
                "es-MX",
                { day: "numeric", month: "long", year: "numeric" },
              )}</div>
            </div>
            <div class="sep"></div>
            <div class="meta-card">
              <div class="head">Información del Empleado</div>
              <table class="meta-table">
                <tr>
                  <td><span class="k">Empleado:</span> <span class="v">${
                    r.empleado?.nombre_empleado || ""
                  }</span></td>
                  <td><span class="k">Empresa:</span> <span class="v">${
                    r.empleado?.nombre_empresa || ""
                  }</span></td>
                  <td><span class="k">Periodo:</span> <span class="v">${humanDate(
                    r.periodo.inicio,
                  )} al ${humanDate(r.periodo.fin)}</span></td>
                  <td><span class="k">Días trabajados:</span> <span class="v">${
                    r.resumen.diasTrabajados
                  }</span></td>
                </tr>
              </table>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Entrada</th>
                  <th>Salida</th>
                  <th>Horas</th>
                  <th>Estado</th>
                  <th>Motivo</th>
                  <th>Notas</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
            <div class="summary-card">
              <table class="summary-table">
                <tr>
                  <td><div class="h">Total Horas</div><div class="v">${
                    r.resumen.totalHoras
                  }</div><div class="s">en el periodo</div></td>
                  <td><div class="h">Días Trabajados</div><div class="v">${
                    r.resumen.diasTrabajados
                  }</div><div class="s">días únicos</div></td>
                  <td><div class="h">Promedio Diario</div><div class="v">${
                    r.resumen.promedioHoras
                  }</div><div class="s">horas/día</div></td>
                  <td><div class="h">Horas Extra</div><div class="v">${
                    r.resumen.horasExtrasLaboradas || "0:00"
                  }</div><div class="s">autorizadas</div></td>
                </tr>
              </table>
            </div>
          </div>`;
      };
      const body = reportes
        .map(
          (r, i) =>
            `${renderReport(r)}${
              i < reportes.length - 1 ? '<div class="pb"></div>' : ""
            }`,
        )
        .join("");
      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${baseCSS}</style></head><body>${body}</body></html>`;
      const blob = new Blob([html], {
        type: "application/vnd.ms-excel;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      let xlsName = "reporte_horas_multiples.xls";
      if (reportes.length === 1) {
        const emp = (reportes[0]?.empleado?.nombre_empleado || "empleado")
          .replace(/[\\/:*?"<>|]/g, "")
          .replace(/\s+/g, " ")
          .trim();
        const fi = fileDate(fechaInicio);
        const ff = fileDate(fechaFin);
        xlsName = `${emp}_${fi}_al_${ff}.xls`;
      } else {
        const fi = fileDate(fechaInicio);
        const ff = fileDate(fechaFin);
        xlsName = `reporte_horas_${fi}_al_${ff}.xls`;
      }
      a.download = xlsName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      enqueueSnackbar("Excel exportado", { variant: "success" });
    } catch (err) {
      enqueueSnackbar("No se pudo exportar a Excel", { variant: "error" });
    } finally {
      setExporting(null);
    }
  }

  async function handleGuardarPDF() {
    if (!reportes || reportes.length === 0) return;

    try {
      setExporting("pdf");
      // PDF nativo (texto + vectores) con jsPDF y jspdf-autotable.
      // Diseño corporativo Adamia: sin rellenos de color, solo líneas de acento
      // con el degradado azul → morado de la marca, logotipo real y tipografía
      // Poppins (public/fonts). Si logo o fuentes no cargan, hay fallback.
      const { jsPDF } = await import("jspdf");
      const autoTableModule = await import("jspdf-autotable");
      const autoTable = autoTableModule.autoTable || autoTableModule.default;

      // Colorimetría oficial ADAMIA (ver variables --adamia-* en globals.css)
      const BLUE = [37, 99, 235]; // --adamia-blue #2563eb
      const PURPLE = [124, 58, 237]; // --adamia-purple #7c3aed
      const TEXT = [31, 41, 55]; // --adamia-text-primary #1f2937
      const TEXT2 = [75, 85, 99]; // --adamia-text-secondary #4b5563
      const MUTED = [107, 114, 128]; // #6b7280
      const HAIRLINE = [229, 231, 235]; // #e5e7eb

      const lerp = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

      const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });

      // Tipografía Poppins embebida (misma familia del landing). Se descarga
      // de /public/fonts en el mismo origen; si falla se usa Helvetica.
      const loadFontB64 = async (url) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return null;
          const blob = await res.blob();
          return await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const s = String(reader.result || "");
              const i = s.indexOf(",");
              resolve(i >= 0 ? s.slice(i + 1) : null);
            };
            reader.readAsDataURL(blob);
          });
        } catch {
          return null;
        }
      };
      const [fontReg, fontSemi] = await Promise.all([
        loadFontB64("/fonts/Poppins-Regular.ttf"),
        loadFontB64("/fonts/Poppins-SemiBold.ttf"),
      ]);
      let FONT = "helvetica";
      if (fontReg && fontSemi) {
        pdf.addFileToVFS("Poppins-Regular.ttf", fontReg);
        pdf.addFont("Poppins-Regular.ttf", "Poppins", "normal");
        pdf.addFileToVFS("Poppins-SemiBold.ttf", fontSemi);
        pdf.addFont("Poppins-SemiBold.ttf", "Poppins", "bold");
        FONT = "Poppins";
      }

      // Logotipo oficial (mismo asset del sitio); proporción 2160x1000.
      const logoDataUrl = await fetchImageAsDataUrl("/assets/adamia.png");
      const LOGO_RATIO = 2160 / 1000;

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const marginX = 48;
      const marginTop = 46;
      const footerReserved = 46;
      const contentBottom = pageHeight - footerReserved;
      const contentW = pageWidth - marginX * 2;

      const fechaGeneracion = new Date().toLocaleDateString("es-MX", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      const stripEmojis = (value) =>
        String(value || "")
          .replace(/[\u{1F300}-\u{1F9FF}]/gu, "")
          .replace(/[\u{2600}-\u{26FF}]/gu, "")
          .replace(/[\u{2700}-\u{27BF}]/gu, "")
          .trim();

      const fmtHora = (iso) =>
        iso
          ? new Date(iso).toLocaleTimeString("es-MX", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "-";

      // Línea degradada azul → morado (identidad Adamia), por segmentos.
      const gradientLine = (x1, x2, y, width) => {
        const steps = 48;
        const seg = (x2 - x1) / steps;
        pdf.setLineWidth(width);
        for (let i = 0; i < steps; i++) {
          pdf.setDrawColor(...lerp(BLUE, PURPLE, i / (steps - 1)));
          pdf.line(x1 + i * seg, y, x1 + (i + 1) * seg + 0.4, y);
        }
      };

      // Encabezado: logotipo + título y fecha, bajo una línea degradada.
      const drawHeader = () => {
        if (logoDataUrl) {
          const logoH = 40;
          pdf.addImage(
            logoDataUrl,
            "PNG",
            marginX - 8,
            marginTop - 13,
            logoH * LOGO_RATIO,
            logoH,
          );
        } else {
          pdf.setFont(FONT, "bold");
          pdf.setFontSize(18);
          pdf.setTextColor(...BLUE);
          pdf.text("Adamia", marginX, marginTop + 8);
        }

        pdf.setFont(FONT, "bold");
        pdf.setFontSize(11);
        pdf.setTextColor(...TEXT);
        pdf.text(
          "Reporte de Horas Trabajadas",
          pageWidth - marginX,
          marginTop + 2,
          { align: "right" },
        );
        pdf.setFont(FONT, "normal");
        pdf.setFontSize(7.5);
        pdf.setTextColor(...MUTED);
        pdf.text(
          `Generado el ${fechaGeneracion}`,
          pageWidth - marginX,
          marginTop + 14,
          { align: "right" },
        );

        gradientLine(marginX, pageWidth - marginX, marginTop + 28, 1.6);
        return marginTop + 50;
      };

      // Información del empleado: columnas con barra de acento vertical que
      // transita del azul al morado. Sin cajas ni rellenos.
      const drawMeta = (r, y) => {
        const cols = [
          {
            label: "Empleado",
            value: r.empleado?.nombre_empleado || "—",
            w: 0.3,
          },
          {
            label: "Empresa",
            value: r.empleado?.nombre_empresa || "—",
            w: 0.28,
          },
          {
            label: "Periodo",
            value: `${humanDate(r.periodo.inicio)} al ${humanDate(
              r.periodo.fin,
            )}`,
            w: 0.27,
          },
          {
            label: "Días laborados",
            value: String(r.resumen?.diasTrabajados ?? 0),
            w: 0.15,
          },
        ];
        let x = marginX;
        cols.forEach((c, i) => {
          const w = contentW * c.w;
          const accent = lerp(BLUE, PURPLE, i / (cols.length - 1));
          pdf.setDrawColor(...accent);
          pdf.setLineWidth(1.6);
          pdf.line(x + 0.8, y, x + 0.8, y + 34);

          pdf.setFont(FONT, "normal");
          pdf.setFontSize(6.3);
          pdf.setTextColor(...MUTED);
          pdf.text(c.label.toUpperCase(), x + 9, y + 8, { charSpace: 0.6 });
          pdf.setFont(FONT, "bold");
          pdf.setFontSize(9);
          pdf.setTextColor(...TEXT);
          const lines = pdf
            .splitTextToSize(String(c.value), w - 14)
            .slice(0, 2);
          pdf.text(lines.length ? lines : ["—"], x + 9, y + 21, {
            lineHeightFactor: 1.25,
          });
          x += w;
        });
        return y + 56;
      };

      // Resumen del periodo: cifras en color entre dos líneas finas.
      const drawSummary = (r, y) => {
        const items = [
          {
            label: "Total Horas",
            value: r.resumen?.totalHoras || "0:00",
            sub: "en el periodo",
          },
          {
            label: "Días Trabajados",
            value: String(r.resumen?.diasTrabajados ?? 0),
            sub: "días únicos",
          },
          {
            label: "Promedio Diario",
            value: r.resumen?.promedioHoras || "0:00",
            sub: "horas / día",
          },
          {
            label: "Horas Extra",
            value: r.resumen?.horasExtrasLaboradas || "0:00",
            sub: "autorizadas",
          },
        ];
        const boxH = 52;
        const boxW = contentW / 4;
        pdf.setDrawColor(...HAIRLINE);
        pdf.setLineWidth(0.6);
        pdf.line(marginX, y, pageWidth - marginX, y);
        pdf.line(marginX, y + boxH, pageWidth - marginX, y + boxH);

        items.forEach((it, i) => {
          const x = marginX + i * boxW;
          if (i > 0) {
            pdf.setDrawColor(...HAIRLINE);
            pdf.setLineWidth(0.6);
            pdf.line(x, y + 9, x, y + boxH - 9);
          }
          const cx = x + boxW / 2;
          const accent = lerp(BLUE, PURPLE, i / (items.length - 1));
          pdf.setFont(FONT, "normal");
          pdf.setFontSize(6.3);
          pdf.setTextColor(...MUTED);
          pdf.text(it.label.toUpperCase(), cx, y + 14, {
            align: "center",
            charSpace: 0.6,
          });
          pdf.setFont(FONT, "bold");
          pdf.setFontSize(15);
          pdf.setTextColor(...accent);
          pdf.text(String(it.value), cx, y + 33, { align: "center" });
          pdf.setFont(FONT, "normal");
          pdf.setFontSize(6.3);
          pdf.setTextColor(...TEXT2);
          pdf.text(it.sub, cx, y + 44, { align: "center" });
        });
        return y + boxH + 20;
      };

      // Filas de la tabla: una por día, más una fila de detalle cuando el día
      // tiene múltiples movimientos (misma consolidación que la vista previa).
      const buildRows = (r) => {
        const rows = [];
        r.dias.forEach((d) => {
          let primeraEntrada = d.entrada;
          let ultimaSalida = d.salida;
          let totalHorasTrabajadas = d.horasHM;

          if (Array.isArray(d.movimientos) && d.movimientos.length > 0) {
            const entradasValidas = d.movimientos
              .map((m) => m.entrada)
              .filter(Boolean)
              .map((e) => new Date(e))
              .sort((a, b) => a - b);
            if (entradasValidas.length > 0) {
              primeraEntrada = entradasValidas[0].toISOString();
            }

            const salidasValidas = d.movimientos
              .map((m) => m.salida)
              .filter(Boolean)
              .map((s) => new Date(s))
              .sort((a, b) => b - a);
            if (salidasValidas.length > 0) {
              ultimaSalida = salidasValidas[0].toISOString();
            }

            const totalMinutos = d.movimientos.reduce((acc, m) => {
              if (m.horasHM) {
                const [horas, minutos] = m.horasHM.split(":").map(Number);
                return acc + horas * 60 + minutos;
              }
              return acc;
            }, 0);
            const horas = Math.floor(totalMinutos / 60);
            const minutos = totalMinutos % 60;
            totalHorasTrabajadas = `${horas}:${String(minutos).padStart(2, "0")}`;
          }

          const estadoRaw = String(d.estado || "").trim();
          const estado =
            estadoRaw.toLowerCase() === "cerrado"
              ? "Completo"
              : estadoRaw || "—";

          rows.push([
            humanDate(d.fecha),
            fmtHora(primeraEntrada),
            fmtHora(ultimaSalida),
            totalHorasTrabajadas || "0:00",
            estado,
            stripEmojis(d.motivo) || "—",
            String(d.notas || "—"),
          ]);

          if (Array.isArray(d.movimientos) && d.movimientos.length > 1) {
            const detalle = d.movimientos
              .filter((m) => m.entrada && m.salida)
              .map(
                (m) =>
                  `Entrada ${fmtHora(m.entrada)}    Salida ${fmtHora(
                    m.salida,
                  )}    ${m.horasHM || "0:00"} hrs`,
              )
              .join("\n");
            if (detalle) {
              rows.push([
                {
                  content: detalle,
                  colSpan: 7,
                  styles: {
                    font: FONT,
                    fontStyle: "normal",
                    fontSize: 6.8,
                    textColor: MUTED,
                    cellPadding: { top: 4, bottom: 5, left: 16, right: 6 },
                    lineWidth: { bottom: 0.6 },
                    lineColor: HAIRLINE,
                  },
                },
              ]);
            }
          }
        });
        return rows;
      };

      const drawSignatures = (y) => {
        const slotW = contentW / 2;
        const lineW = 170;
        const centers = [marginX + slotW / 2, marginX + slotW + slotW / 2];
        const labels = ["Firma del empleado", "Firma de autorización"];
        centers.forEach((cx, i) => {
          pdf.setDrawColor(...TEXT2);
          pdf.setLineWidth(0.8);
          pdf.line(cx - lineW / 2, y, cx + lineW / 2, y);
          pdf.setFont(FONT, "normal");
          pdf.setFontSize(7);
          pdf.setTextColor(...MUTED);
          pdf.text(labels[i].toUpperCase(), cx, y + 12, {
            align: "center",
            charSpace: 0.6,
          });
        });
      };

      reportes.forEach((r, idx) => {
        if (idx > 0) pdf.addPage();
        let y = drawHeader();
        y = drawMeta(r, y);
        y = drawSummary(r, y);

        autoTable(pdf, {
          startY: y,
          margin: {
            left: marginX,
            right: marginX,
            top: marginTop,
            bottom: footerReserved + 8,
          },
          head: [
            [
              "Fecha",
              "Entrada",
              "Salida",
              "Horas",
              "Estado",
              "Motivo",
              "Notas",
            ],
          ],
          body: buildRows(r),
          theme: "plain",
          styles: {
            font: FONT,
            fontStyle: "normal",
            fontSize: 7.5,
            textColor: TEXT,
            cellPadding: { top: 6, bottom: 6, left: 6, right: 6 },
            lineColor: HAIRLINE,
            lineWidth: { bottom: 0.6 },
            valign: "middle",
          },
          headStyles: {
            font: FONT,
            fontStyle: "bold",
            fontSize: 6.8,
            textColor: TEXT,
            halign: "center",
            lineColor: BLUE,
            lineWidth: { bottom: 1.4 },
            cellPadding: { top: 5, bottom: 7, left: 6, right: 6 },
          },
          columnStyles: {
            0: { cellWidth: 62 },
            1: { cellWidth: 60, halign: "center" },
            2: { cellWidth: 60, halign: "center" },
            3: { cellWidth: 42, halign: "center" },
            4: { cellWidth: 56, halign: "center" },
            5: { cellWidth: 80 },
          },
          didParseCell: (data) => {
            if (data.section === "head") {
              data.cell.text = data.cell.text.map((t) => t.toUpperCase());
            }
          },
        });

        let afterY = pdf.lastAutoTable?.finalY || y;
        // Firmas al final del reporte del empleado; si no caben, pasan a otra página.
        if (afterY + 92 > contentBottom) {
          pdf.addPage();
          afterY = marginTop;
        }
        drawSignatures(afterY + 56);
      });

      // Pie de página en todas las hojas: línea degradada, marca y numeración.
      const totalPages = pdf.getNumberOfPages();
      for (let page = 1; page <= totalPages; page++) {
        pdf.setPage(page);
        const lineY = pageHeight - footerReserved + 6;
        const textY = lineY + 14;
        gradientLine(marginX, pageWidth - marginX, lineY, 0.8);
        pdf.setFont(FONT, "bold");
        pdf.setFontSize(7.5);
        pdf.setTextColor(...BLUE);
        pdf.text("Adamia", marginX, textY);
        const brandW = pdf.getTextWidth("Adamia");
        pdf.setFont(FONT, "normal");
        pdf.setTextColor(...MUTED);
        pdf.text("  ·  Reporte de Horas", marginX + brandW, textY);
        pdf.text(
          `Página ${page} de ${totalPages}`,
          pageWidth - marginX,
          textY,
          {
            align: "right",
          },
        );
      }

      const r0 = reportes[0];
      let filename = "reporte_horas_multiples.pdf";
      if (reportes.length === 1) {
        const emp = (r0?.empleado?.nombre_empleado || "empleado")
          .replace(/[\\/:*?"<>|]/g, "")
          .replace(/\s+/g, " ")
          .trim();
        const fi = fileDate(fechaInicio);
        const ff = fileDate(fechaFin);
        filename = `${emp}_${fi}_al_${ff}.pdf`;
      } else {
        const fi = fileDate(fechaInicio);
        const ff = fileDate(fechaFin);
        filename = `reporte_horas_${fi}_al_${ff}.pdf`;
      }
      pdf.save(filename);
      enqueueSnackbar("PDF guardado", { variant: "success" });
    } catch (err) {
      console.error("PDF error:", err);
      enqueueSnackbar("No se pudo generar el PDF", { variant: "error" });
    } finally {
      setExporting(null);
    }
  }

  useEffect(() => {
    if (!multi && empleadosFiltrados.length > 0) {
      const esValido = empleadosFiltrados.some(
        (e) => String(e.id_empleado) === empleadoId,
      );

      if (!esValido) {
        setEmpleadoId(String(empleadosFiltrados[0].id_empleado));
      }
    } else if (!multi && empleadosFiltrados.length === 0) {
      setEmpleadoId("");
    }
  }, [cargo, empleadosFiltrados, multi]);

  return (
    <div className="space-y-6">
      {/* Encabezado compacto con la tipografía del landing */}
      <div>
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#2563eb] to-[#7c3aed] shadow-[0_8px_18px_rgba(37,99,235,0.3)]">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-gray-900">
              Reporte de horas
            </h1>
            <p className="text-[12.5px] text-gray-500">
              Genera reportes por empleado y periodo.
            </p>
          </div>
        </div>
        <div className="mt-3 h-[2.5px] rounded bg-gradient-to-r from-[#2563eb] to-[#7c3aed]" />
      </div>

      {/* Fila de filtros homologada */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <FiltrosGrid columnas={6}>
          <CampoFiltro etiqueta="Unidad de negocio">
            <div className="[&_button]:h-[38px] [&_button]:w-full [&_button]:rounded-md [&_button]:border-gray-200 [&_button]:text-[13px] [&_button]:font-medium">
              <Combobox
                options={[
                  { value: "all", label: "Todas las unidades de negocio" },
                  ...unidadOptions,
                ]}
                value={unidadActiva}
                onChange={(value) => {
                  setUnidadActiva(value || "all");
                  setCargo("");
                  setPeriodo("");
                  setEmpleadoId("");
                  setEmpleadoIds([]);
                }}
                placeholder="Seleccionar unidad de negocio"
              />
            </div>
          </CampoFiltro>

          <CampoFiltro etiqueta="Cargo">
            <select
              className="h-[38px] w-full rounded-md border border-gray-200 bg-white px-3 text-[13px] font-medium text-gray-900 focus-visible:border-blue-300 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-blue-500/15"
              value={cargo}
              onChange={(e) => {
                setCargo(e.target.value);
                setEmpleadoId("");
              }}
            >
              <option value="">Todos los cargos</option>
              {cargos.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </CampoFiltro>

          <CampoFiltro etiqueta="Periodo de pago">
            <select
              className="h-[38px] w-full rounded-md border border-gray-200 bg-white px-3 text-[13px] font-medium text-gray-900 focus-visible:border-blue-300 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-blue-500/15"
              value={periodo}
              onChange={(e) => {
                setPeriodo(e.target.value);
                setEmpleadoId("");
                setEmpleadoIds([]);
              }}
            >
              <option value="">Todos los periodos</option>
              <option value="Semanal">Semanal</option>
              <option value="Catorcenal">Catorcenal</option>
              <option value="Quincenal">Quincenal</option>
              <option value="Mensual">Mensual</option>
              <option value="Diario">Diario</option>
              <option value="Por hora">Por hora</option>
            </select>
          </CampoFiltro>

          <CampoFiltro etiqueta="Empleado(s)">
            <SelectorBoton
              valor={empleadoSeleccionValor}
              placeholder="Todos los del filtro"
              activo={empleadoIds.length > 0}
              onClick={openSelectorWithBuffer}
              disabled={loading || empleadosFiltrados.length === 0}
            />
          </CampoFiltro>

          <CampoFiltro etiqueta="Rango de fechas">
            <SelectorBoton
              valor={rangoEtiqueta}
              activo
              onClick={() => setRangoOpen(true)}
            />
          </CampoFiltro>

          <CampoFiltro>
            <Button
              onClick={handleGenerar}
              disabled={loading}
              className="h-[38px] w-full rounded-md bg-gradient-to-br from-[#2563eb] to-[#4f46e5] font-bold text-white shadow-[0_8px_20px_rgba(37,99,235,0.32)] hover:opacity-95"
            >
              {loading ? "Generando…" : "Generar reporte"}
            </Button>
          </CampoFiltro>
        </FiltrosGrid>

        {empleadoIds.length > 1 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {empleados
              .filter((e) => empleadoIds.includes(String(e.id_empleado)))
              .map((e) => (
                <span
                  key={`sel-${e.id_empleado}`}
                  className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50/60 px-2.5 py-0.5 text-xs font-medium text-gray-700"
                  title={`${e.nombre_empleado} - ${
                    e.unidad_negocio || e.nombre_empresa
                  }`}
                >
                  {e.nombre_empleado}
                  <button
                    type="button"
                    className="ml-1 text-blue-500 hover:text-blue-700"
                    onClick={() =>
                      setEmpleadoIds((ids) =>
                        ids.filter((id) => id !== String(e.id_empleado)),
                      )
                    }
                    aria-label={`Quitar ${e.nombre_empleado}`}
                  >
                    <Icon icon="lucide:x" className="size-3.5" />
                  </button>
                </span>
              ))}
            <button
              type="button"
              className="text-xs text-gray-500 underline decoration-dotted underline-offset-2"
              onClick={() => setEmpleadoIds([])}
            >
              Quitar todos
            </button>
          </div>
        ) : null}
      </div>

      {/* Resultado y exportación */}
      <div className="space-y-3">
        {reportes && reportes.length > 0 ? (
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              onClick={handleExcel}
              variant="outline"
              className="h-9 gap-2 rounded-md border-gray-200 font-semibold text-gray-700 hover:bg-gray-50"
              disabled={exporting !== null}
            >
              <FileSpreadsheet className="h-4 w-4" /> Exportar Excel
            </Button>
            <Button
              onClick={handleGuardarPDF}
              className="h-9 gap-2 rounded-md bg-gradient-to-br from-[#2563eb] to-[#4f46e5] font-bold text-white shadow-[0_8px_20px_rgba(37,99,235,0.32)] hover:opacity-95"
              disabled={exporting !== null}
            >
              <FileDown className="h-4 w-4" /> Guardar PDF
            </Button>
          </div>
        ) : null}

        <div
          ref={reportRef}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 print:p-0"
        >
          {!reportes || reportes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="grid h-[52px] w-[52px] place-items-center rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-violet-50">
                <BarChart3 className="h-6 w-6 text-[#2563eb]" />
              </div>
              <div className="mt-3 text-sm font-bold text-gray-900">
                Aún no hay reporte
              </div>
              <p className="mt-1 text-[12.5px] text-gray-500">
                Configura los filtros y pulsa “Generar reporte” para ver la
                vista previa aquí.
              </p>
            </div>
          ) : (
            <div className="space-y-10">
              {reportes.map((reporte, idx) => (
                <div key={idx} className="space-y-6" data-report-block="true">
                  {/* Top bar - Diseño limpio como imagen de referencia */}
                  <div
                    className="flex items-start justify-between mb-3"
                    data-pdf-topbar="true"
                  >
                    <div className="text-2xl font-bold text-gray-900 leading-none">
                      Adamia
                    </div>
                    <div className="text-right leading-tight">
                      <div className="font-semibold text-sm text-gray-900">
                        Reporte de Horas Trabajadas
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5">
                        {new Date().toLocaleDateString("es-MX", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                  </div>
                  {/* Línea separadora delgada */}
                  <div className="h-px bg-gray-300 mb-4" />
                  {/* Encabezado con meta a la izquierda y resumen a la derecha - SIN tarjetas, diseño limpio */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-4">
                    {/* Meta del empleado: diseño limpio sin tarjeta, con separadores verticales */}
                    <div className="lg:col-span-8">
                      <section
                        data-meta-section="true"
                        className="grid grid-cols-4 gap-0 border-l border-gray-300"
                      >
                        <div className="px-3 border-r border-gray-300">
                          <div className="text-[9px] text-gray-500 uppercase font-semibold mb-1 tracking-wide">
                            Empleado
                          </div>
                          <div className="text-sm font-bold text-gray-900 leading-tight">
                            {reporte.empleado?.nombre_empleado}
                          </div>
                        </div>
                        <div className="px-3 border-r border-gray-300">
                          <div className="text-[9px] text-gray-500 uppercase font-semibold mb-1 tracking-wide">
                            Empresa
                          </div>
                          <div className="text-sm font-bold text-gray-900 leading-tight">
                            {reporte.empleado?.nombre_empresa}
                          </div>
                        </div>
                        <div className="px-3 border-r border-gray-300">
                          <div className="text-[9px] text-gray-500 uppercase font-semibold mb-1 tracking-wide">
                            Periodo
                          </div>
                          <div className="text-sm font-bold text-gray-900 leading-tight">
                            {humanDate(reporte.periodo.inicio)} —{" "}
                            {humanDate(reporte.periodo.fin)}
                          </div>
                        </div>
                        <div className="px-3">
                          <div className="text-[9px] text-gray-500 uppercase font-semibold mb-1 tracking-wide">
                            Días Laborados
                          </div>
                          <div className="text-sm font-bold text-gray-900 leading-tight">
                            {reporte.resumen.diasTrabajados}
                          </div>
                        </div>
                      </section>
                    </div>
                    {/* Resumen superior: 3 cajas con fondo gris claro como en imagen de referencia */}
                    <div className="lg:col-span-4">
                      <section
                        data-summary-section="true"
                        className="grid grid-cols-4 gap-0 border border-gray-300 rounded-sm overflow-hidden bg-gray-50"
                        aria-label="Resumen del periodo"
                      >
                        <div className="text-center px-2 py-3 border-r border-gray-300 bg-gray-50">
                          <div
                            className="text-[8px] text-gray-600 uppercase font-semibold mb-1.5 tracking-wide"
                            data-summary-label="true"
                          >
                            Total Horas
                          </div>
                          <div
                            className="text-xl font-bold leading-none text-gray-900 mb-1"
                            data-summary-value="true"
                          >
                            {reporte.resumen?.totalHoras || "0:00"}
                          </div>
                        </div>
                        <div className="text-center px-2 py-3 border-r border-gray-300 bg-gray-50">
                          <div
                            className="text-[8px] text-gray-600 uppercase font-semibold mb-1.5 tracking-wide"
                            data-summary-label="true"
                          >
                            Días
                          </div>
                          <div
                            className="text-xl font-bold leading-none text-gray-900 mb-1"
                            data-summary-value="true"
                          >
                            {reporte.resumen?.diasTrabajados || "0"}
                          </div>
                        </div>
                        <div className="text-center px-2 py-3 bg-gray-50">
                          <div
                            className="text-[8px] text-gray-600 uppercase font-semibold mb-1.5 tracking-wide"
                            data-summary-label="true"
                          >
                            Promedio
                          </div>
                          <div
                            className="text-xl font-bold leading-none text-gray-900 mb-1"
                            data-summary-value="true"
                          >
                            {reporte.resumen?.promedioHoras || "0:00"}
                          </div>
                        </div>
                        <div className="text-center px-2 py-3 border-l border-gray-300 bg-gray-50">
                          <div
                            className="text-[8px] text-gray-600 uppercase font-semibold mb-1.5 tracking-wide"
                            data-summary-label="true"
                          >
                            Horas Extra
                          </div>
                          <div
                            className="text-xl font-bold leading-none text-gray-900 mb-1"
                            data-summary-value="true"
                          >
                            {reporte.resumen?.horasExtrasLaboradas || "0:00"}
                          </div>
                        </div>
                      </section>
                    </div>
                  </div>
                  <section className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-gray-50">
                          <th className="p-2 border text-xs uppercase font-semibold text-gray-700">
                            Fecha
                          </th>
                          <th className="p-2 border text-xs uppercase font-semibold text-gray-700">
                            Entrada
                          </th>
                          <th className="p-2 border text-xs uppercase font-semibold text-gray-700">
                            Salida
                          </th>
                          <th className="p-2 border text-xs uppercase font-semibold text-gray-700">
                            Horas
                          </th>
                          <th className="p-2 border text-xs uppercase font-semibold text-gray-700">
                            Estado
                          </th>
                          <th className="p-2 border text-xs uppercase font-semibold text-gray-700">
                            Motivo
                          </th>
                          <th className="p-2 border text-xs uppercase font-semibold text-gray-700">
                            Notas
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {reporte.dias.map((d) => {
                          // Calcular primera entrada y última salida cuando hay múltiples movimientos
                          let primeraEntrada = d.entrada;
                          let ultimaSalida = d.salida;
                          let totalHorasTrabajadas = d.horasHM;

                          if (
                            Array.isArray(d.movimientos) &&
                            d.movimientos.length > 0
                          ) {
                            // Obtener primera entrada de todos los movimientos
                            const entradasValidas = d.movimientos
                              .map((m) => m.entrada)
                              .filter(Boolean)
                              .map((e) => new Date(e))
                              .sort((a, b) => a - b);
                            if (entradasValidas.length > 0) {
                              primeraEntrada = entradasValidas[0].toISOString();
                            }

                            // Obtener última salida de todos los movimientos
                            const salidasValidas = d.movimientos
                              .map((m) => m.salida)
                              .filter(Boolean)
                              .map((s) => new Date(s))
                              .sort((a, b) => b - a);
                            if (salidasValidas.length > 0) {
                              ultimaSalida = salidasValidas[0].toISOString();
                            }

                            // Sumar todas las horas trabajadas de cada movimiento
                            // Convertir cada horasHM a minutos, sumar y convertir de vuelta a formato HH:MM
                            const totalMinutos = d.movimientos.reduce(
                              (acc, m) => {
                                if (m.horasHM) {
                                  const [horas, minutos] = m.horasHM
                                    .split(":")
                                    .map(Number);
                                  return acc + horas * 60 + minutos;
                                }
                                return acc;
                              },
                              0,
                            );
                            const horas = Math.floor(totalMinutos / 60);
                            const minutos = totalMinutos % 60;
                            totalHorasTrabajadas = `${horas}:${String(
                              minutos,
                            ).padStart(2, "0")}`;
                          }

                          return (
                            <Fragment key={`day-${d.fecha}`}>
                              <tr className="odd:bg-zinc-50/40 hover:bg-zinc-50">
                                <td className="p-2 border whitespace-nowrap align-top">
                                  {humanDate(d.fecha)}
                                </td>
                                <td className="p-2 border text-center align-top">
                                  {primeraEntrada
                                    ? new Date(
                                        primeraEntrada,
                                      ).toLocaleTimeString("es-MX", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                    : "-"}
                                </td>
                                <td className="p-2 border text-center align-top">
                                  {ultimaSalida
                                    ? new Date(ultimaSalida).toLocaleTimeString(
                                        "es-MX",
                                        {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        },
                                      )
                                    : "-"}
                                </td>
                                <td className="p-2 border text-center align-top">
                                  {totalHorasTrabajadas}
                                </td>
                                <td className="p-2 border text-center align-top">
                                  <EstadoPill value={d.estado} />
                                </td>
                                <td className="p-2 border align-top">
                                  <MotivoPill value={d.motivo} />
                                </td>
                                <td className="p-2 border align-top">
                                  {d.notas ? (
                                    <span className="inline-flex items-center gap-1 text-zinc-700">
                                      <Icon
                                        icon="lucide:sticky-note"
                                        className="size-3.5 text-amber-600"
                                      />{" "}
                                      {d.notas}
                                    </span>
                                  ) : (
                                    <span className="text-zinc-500">—</span>
                                  )}
                                </td>
                              </tr>
                              {Array.isArray(d.movimientos) &&
                              d.movimientos.length > 1 ? (
                                <tr
                                  className="bg-white/50"
                                  data-detail-row="true"
                                >
                                  <td
                                    colSpan={7}
                                    className="p-2 pl-6 border-t text-xs text-zinc-600 font-mono"
                                  >
                                    <div
                                      style={{
                                        whiteSpace: "pre-wrap",
                                        lineHeight: "1.6",
                                      }}
                                    >
                                      {
                                        // Formato detallado: cada par entrada-salida con sus horas trabajadas
                                        // Cada segmento en una línea separada usando <br> para mejor compatibilidad con PDF
                                        d.movimientos
                                          .filter((m) => m.entrada && m.salida) // Solo movimientos completos
                                          .map((m, idx) => {
                                            const entrada = m.entrada
                                              ? new Date(
                                                  m.entrada,
                                                ).toLocaleTimeString("es-MX", {
                                                  hour: "2-digit",
                                                  minute: "2-digit",
                                                })
                                              : "-";
                                            const salida = m.salida
                                              ? new Date(
                                                  m.salida,
                                                ).toLocaleTimeString("es-MX", {
                                                  hour: "2-digit",
                                                  minute: "2-digit",
                                                })
                                              : "-";
                                            const horas = m.horasHM || "0:00";
                                            return (
                                              <Fragment key={`mov-${idx}`}>
                                                {idx > 0 && <br />}
                                                {`Entrada: ${entrada}  |  Salida: ${salida}  |  Horas: ${horas}`}
                                              </Fragment>
                                            );
                                          })
                                      }
                                    </div>
                                  </td>
                                </tr>
                              ) : null}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </section>
                  {/* Firmas (con etiquetas visibles en preview) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 px-10 mt-4">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-0.5 bg-slate-900 w-1/2" />
                      <div className="text-[10px] text-zinc-500">
                        FIRMA DEL EMPLEADO
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-0.5 bg-slate-900 w-1/2" />
                      <div className="text-[10px] text-zinc-500">
                        FIRMA DE AUTORIZACIÓN
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Diálogo unificado de selección de empleados */}
      <Dialog open={openSelector} onOpenChange={setOpenSelector}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden gap-0">
          <DialogHeader className="px-6 pt-5 pb-4">
            <DialogTitle className="text-base font-extrabold tracking-tight text-gray-900">
              Seleccionar empleados
            </DialogTitle>
            <DialogDescription className="text-[12.5px] text-gray-500">
              Busca por nombre, empresa o unidad, marca múltiples empleados y
              aplica la selección. Si no eliges ninguno, se tomarán todos los
              del filtro.
            </DialogDescription>
          </DialogHeader>
          <div className="h-[2.5px] bg-gradient-to-r from-[#2563eb] to-[#7c3aed]" />

          <div className="p-6 space-y-4 text-sm">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Buscar
              </label>
              <div className="relative">
                <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  className="pl-9"
                  placeholder="Escribe para filtrar por nombre, empresa o unidad..."
                  value={searchEmpleado}
                  onChange={(e) => setSearchEmpleado(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm text-gray-600">
                {tempEmpleadoIds.length} seleccionados de{" "}
                {dialogResultados.length} resultados
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={selectAllDialog}
                  disabled={dialogResultados.length === 0}
                  className="rounded-md border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  Seleccionar todos
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearDialogSelection}
                  disabled={tempEmpleadoIds.length === 0}
                  className="rounded-md border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  Limpiar
                </Button>
              </div>
            </div>

            <div className="max-h-[380px] overflow-auto rounded-md border border-gray-200 bg-white">
              {dialogResultados.length === 0 ? (
                <div className="p-4 text-sm text-gray-500">
                  No hay resultados.
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {dialogResultados.map((e) => {
                    const id = String(e.id_empleado);
                    const checked = tempEmpleadoIds.includes(id);
                    return (
                      <li
                        key={`dlg-${id}`}
                        className="flex items-center gap-3 p-3"
                      >
                        <input
                          type="checkbox"
                          className="size-4 accent-[#2563EB]"
                          checked={checked}
                          onChange={() => toggleTemp(id)}
                          aria-label={`Seleccionar ${e.nombre_empleado}`}
                        />
                        <div className="min-w-0">
                          <div className="truncate font-medium text-gray-900">
                            {e.nombre_empleado}
                          </div>
                          <div className="truncate text-xs text-gray-500">
                            {e.unidad_negocio || e.nombre_empresa}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <DialogFooter className="bg-gray-50 p-4 flex justify-end gap-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpenSelector(false)}
              className="rounded-md border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                setEmpleadoIds(tempEmpleadoIds);
                setOpenSelector(false);
              }}
              className="rounded-md bg-gradient-to-br from-[#2563eb] to-[#4f46e5] font-bold text-white shadow-[0_8px_20px_rgba(37,99,235,0.32)] hover:opacity-95"
            >
              Aplicar selección
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de rango de fechas homologado */}
      <RangoFechasModal
        open={rangoOpen}
        onOpenChange={setRangoOpen}
        fechaInicio={fechaInicio}
        fechaFin={fechaFin}
        onAplicar={({ inicio, fin, etiqueta }) => {
          setFechaInicio(inicio);
          setFechaFin(fin);
          setRangoEtiqueta(etiqueta);
        }}
      />

      {exporting && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/40 backdrop-blur-sm">
          <div className="rounded-xl bg-white shadow-xl p-6 w-[340px] text-center space-y-3 border">
            <div className="mx-auto size-10 rounded-full border-4 border-gray-200 border-t-[#2563EB] animate-spin" />
            <div className="text-sm font-medium text-gray-700">
              {exporting === "pdf" ? "Generando PDF…" : "Generando Excel…"}
            </div>
            <div className="text-xs text-gray-500">
              Esto puede tardar unos segundos. No cierres esta ventana.
            </div>
          </div>
        </div>
      )}

      {/* Accesos Rápidos - Componente reutilizable (al final de la página) */}
      <AccesosRapidos />
    </div>
  );
}
