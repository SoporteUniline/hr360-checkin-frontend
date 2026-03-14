"use client";

// Reporte de Horas Trabajadas (adaptado a Adamia)
// - Backend: /api/checador/reportes/horas (redlab_back)
// - Empleados: /api/checador/empleados?empresa=ID
// - Puestos: /api/checador/empleados/puestos?empresa=ID
// Relacionado con: redlab_back/modules/attendance/controllers/reporteHorasController.js

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import useUnidadesNegocio from "@/hooks/useUnidadesNegocio";
import AccesosRapidos from "@/components/AccesosRapidos";
import {
  BarChart3,
  Filter,
  FileDown,
  FileSpreadsheet,
  Search,
} from "lucide-react";

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
            `/checador/empleados?empresa=${empresaActiva}&page=1&limit=1000`,
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
    const empleadosUnidad = unidadNombreActiva
      ? empleados.filter(
          (e) =>
            String(e.unidad_negocio || "").toLowerCase() === unidadNombreActiva,
        )
      : empleados;
    if (!cargo) return empleadosUnidad;
    return empleadosUnidad.filter(
      (e) => (e.puesto || "").toLowerCase() === cargo.toLowerCase(),
    );
  }, [empleados, cargo, unidadNombreActiva]);

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
    if (!reportRef.current || !reportes || reportes.length === 0) return;

    // Función local: calcula puntos de corte verticales "seguros" dentro de un bloque de reporte
    // para que cada página del PDF termine al final de una fila completa (y su fila de detalle),
    // evitando que la información se parta en dos hojas. Se relaciona directamente con la tabla
    // renderizada en este mismo archivo `page.jsx` dentro del panel de reporte de horas.
    const computeSafeBreaks = (blockEl) => {
      const rect = blockEl.getBoundingClientRect();
      const containerTop = rect.top;
      const totalHeight = rect.height || 1;

      // Siempre arrancamos en 0 (parte superior del bloque)
      const domBreaks = [0];

      // Localizamos el cuerpo de la tabla principal del reporte
      const tbody = blockEl.querySelector("table tbody");
      if (tbody) {
        const rows = Array.from(tbody.querySelectorAll("tr"));

        // Recorremos las filas agrupando:
        // - Fila principal del día
        // - Fila de detalle (colspan) si existe
        // Así garantizamos que ambas queden en la misma página del PDF.
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (!row) continue;

          let rowRect = row.getBoundingClientRect();
          let bottom = rowRect.bottom - containerTop;

          // Si la siguiente fila es de detalle (colspan), la unimos al mismo bloque
          if (i + 1 < rows.length) {
            const next = rows[i + 1];
            const spanCell =
              next && next.querySelector && next.querySelector("td[colspan]");
            if (spanCell) {
              const nextRect = next.getBoundingClientRect();
              bottom = nextRect.bottom - containerTop;
              i += 1; // ya incluimos la fila de detalle
            }
          }

          const last = domBreaks[domBreaks.length - 1];
          // Evitamos puntos demasiado cercanos por pequeños redondeos de layout
          if (bottom > last + 4) {
            domBreaks.push(bottom);
          }
        }
      }

      // Aseguramos que el último punto de corte llegue hasta el final del bloque
      const last = domBreaks[domBreaks.length - 1];
      if (last < totalHeight) {
        domBreaks.push(totalHeight);
      }

      return { domBreaks, totalHeight };
    };

    try {
      setExporting("pdf");
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      // Márgenes de 2.5cm para impresión perfecta (2.5cm * 28.35 pt/cm = 70.875 pt ≈ 71 pt)
      const marginTop = 71; // 2.5cm margen superior
      const marginBottom = 71; // 2.5cm margen inferior
      const marginLeft = 71; // 2.5cm margen izquierdo
      const marginRight = 71; // 2.5cm margen derecho (simétrico)
      const imgWidth = pageWidth - marginLeft - marginRight;

      // Altura reservada en la parte inferior de cada página para el pie de página
      // (línea separadora + leyenda + numeración). También se usa para que el
      // contenido de la imagen no "pegue" contra el pie ni lo tape.
      const footerReserved = 42; // pt
      const usablePageHeight =
        pageHeight - marginTop - marginBottom - footerReserved;
      const blocks = Array.from(
        reportRef.current.querySelectorAll('[data-report-block="true"]'),
      );

      // Mapa compartido entre `onclone` y el bucle principal para
      // guardar los puntos de corte seguros de cada bloque clonado.
      const safeBreakMap = {};

      // A cada bloque (o al contenedor general, en su defecto) le
      // asignamos un identificador estable que se copia al DOM clonado.
      const allBlocks = blocks.length ? blocks : [reportRef.current];
      allBlocks.forEach((el, index) => {
        if (!el.getAttribute("data-pdf-block-id")) {
          el.setAttribute("data-pdf-block-id", String(index + 1));
        }
      });

      const captureOptions = {
        scale: 3,
        backgroundColor: "#ffffff",
        useCORS: true,
        onclone: (doc) => {
          // 1) Inyectar paleta segura
          const style = doc.createElement("style");
          style.textContent = `
            :root{
              --background:#ffffff;--foreground:#111827;--border:#e5e7eb;--muted:#f3f4f6;--muted-foreground:#6b7280;
              --primary:#111827;--primary-foreground:#ffffff;--secondary:#f3f4f6;--secondary-foreground:#111827;
              --accent:#f3f4f6;--accent-foreground:#111827;--ring:#3b82f6
            }
          `;
          doc.head.appendChild(style);

          // 2) Eliminar hojas de estilo externas y embebidas con colores modernos
          const links = Array.from(
            doc.querySelectorAll('link[rel="stylesheet"], style'),
          );
          links.forEach((l) => l.parentNode && l.parentNode.removeChild(l));

          // 3) Reinyectar CSS mínimo seguro para PDF
          const safeStyle = doc.createElement("style");
          safeStyle.textContent = `
            *{box-sizing:border-box}
            @page { size: A4; margin: 0 }
            body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,"Helvetica Neue";font-size:10.5pt;color:#111827;background:#ffffff;margin:0;padding:0}
            .pdf-header-grid{display:grid;grid-template-columns:2fr 1fr;gap:24px;margin:0 0 16px 0;align-items:start}
            .pdf-card{border:none;border-radius:0;margin:14px 0;overflow:visible;background:transparent}
            .pdf-header{background:transparent;padding:0}
            .pdf-header h2{margin:0;font-size:13pt;font-weight:700}
            .pdf-header .date{font-size:8.5pt;color:#6b7280;float:right}
            .pdf-divider{height:1px;background:#d1d5db}
            .pdf-meta{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:0;padding:0;border-left:1px solid #d1d5db;border-bottom:none;background:transparent}
            .pdf-meta > div{border-right:1px solid #d1d5db;padding:0 12px}
            .pdf-meta > div:last-child{border-right:none}
            .pdf-meta > div > .label{font-size:7.5pt;color:#6b7280;text-transform:uppercase;font-weight:600;margin-bottom:4px;letter-spacing:0.5px}
            .pdf-meta > div > .value{font-size:10pt;font-weight:700;color:#111827;line-height:1.4}
            table{width:100%;border-collapse:collapse}
            thead th{background:#1f2937;color:#ffffff;font-weight:700;border:1px solid #1f2937;padding:8px 10px;text-align:center;font-size:9pt}
            tbody td{border:1px solid #e5e7eb;padding:8px 10px;font-size:9pt;line-height:1.35}
            tbody tr:nth-child(odd){background:#fafafa}
            .pdf-summary{display:grid;grid-template-columns:1fr 1fr 1fr;gap:0;padding:0;border:1px solid #d1d5db;border-radius:2px;background:#f3f4f6;width:100%;overflow:hidden}
            .pdf-summary-card{border:none;border-radius:0;background:transparent;padding:0;min-width:280px;max-width:100%}
            .pdf-summary > div{text-align:center;padding:12px 8px;border-right:1px solid #d1d5db;background:#f3f4f6}
            .pdf-summary > div:last-child{border-right:none}
            .pdf-summary > div > div:first-child{font-size:7pt;color:#6b7280;text-transform:uppercase;font-weight:600;margin-bottom:6px;letter-spacing:0.5px;display:block !important;visibility:visible !important;opacity:1 !important}
            .pdf-summary > div > div:nth-child(2){font-size:16pt;font-weight:700;color:#111827;line-height:1.2;margin-bottom:0;display:block !important;visibility:visible !important;opacity:1 !important}
            .pdf-summary > div > div:last-child{display:none}
            .pdf-summary > div > div{display:block !important;visibility:visible !important}
            .pdf-badge{display:inline-block;padding:2px 8px;border-radius:4px;font-weight:600;font-size:8.5pt;border:1px solid #e5e7eb;background:#f9fafb;color:#111827}
            .pdf-topbar{display:flex;align-items:flex-start;justify-content:space-between;padding:0 0 12px 0;margin-bottom:12px}
            .pdf-topbar .brand{font-weight:800;font-size:20pt;color:#111827;letter-spacing:0;line-height:1}
            .pdf-topbar .right{line-height:1.3;text-align:right}
            .pdf-topbar .title{font-weight:600;font-size:11pt;color:#111827;margin-bottom:2px}
            .pdf-topbar .subtitle{font-size:9pt;color:#6b7280}
            .pdf-topbar img{display:none}
            .pdf-topbar > div:first-child{display:block}
            .pdf-hr{height:1px;background:#d1d5db;margin:0 0 16px 0;width:100%}
            .pdf-meta-card{border:none;border-radius:0;background:transparent;padding:0;flex:1;min-width:0}
            .pdf-meta-card .head{display:none}
            .pdf-meta-card .body{padding:0}
            .pdf-details{font-family:ui-monospace,Menlo,Consolas,monospace;color:#475569;font-size:8.5pt;white-space:pre-wrap !important;line-height:1.6}
            .pdf-signatures{display:flex;justify-content:space-between;gap:40px;padding:24px 0;margin-top:20px;border-top:1px solid #e5e7eb}
            .pdf-signatures .slot{display:flex;flex-direction:column;align-items:center;gap:8px;flex:1;max-width:45%}
            .pdf-signatures .line{height:1px;background:#111827;width:100%;max-width:200px}
            .pdf-signatures .label{font-size:8pt;color:#6b7280;text-transform:uppercase;font-weight:600;letter-spacing:0.5px}
          `;
          doc.head.appendChild(safeStyle);

          // 4) Mapear estructura de reporte a clases PDF y forzar badges
          const props = [
            "color",
            "backgroundColor",
            "borderColor",
            "borderTopColor",
            "borderRightColor",
            "borderBottomColor",
            "borderLeftColor",
            "outlineColor",
            "fill",
            "stroke",
          ];
          const SAFE = {
            color: "#111827",
            backgroundColor: "#ffffff",
            borderColor: "#e5e7eb",
            outlineColor: "#e5e7eb",
            fill: "#111827",
            stroke: "#111827",
          };
          const hasModern = (v) =>
            v &&
            (v.includes("oklch(") ||
              v.includes("lab(") ||
              v.startsWith("color(") ||
              v.includes("color-mix("));
          const win = doc.defaultView || window;

          const clonedBlocks = Array.from(
            doc.querySelectorAll('[data-report-block="true"]'),
          );
          for (const block of clonedBlocks) {
            // asegurar ancho A4 (~794px @96dpi) para texto a escala 1:1
            block.style.width = "794px";
            block.style.margin = "0 auto";
            block.classList.add("pdf-card");
            // 4.1) Tomar el topbar de PREVIEW y transformarlo a PDF (sin duplicados)
            const previewTopbar = block.querySelector(
              '[data-pdf-topbar="true"]',
            );
            if (previewTopbar) {
              previewTopbar.className = "pdf-topbar";
              // Asegurar que Adamia tenga el estilo correcto (grande, negrita, sin texto adicional)
              const brandDiv = previewTopbar.querySelector("div:first-child");
              if (brandDiv) {
                brandDiv.className = "brand";
                const brandText = brandDiv.querySelector("div:first-child");
                if (brandText && brandText.textContent.includes("Adamia")) {
                  brandText.style.fontWeight = "800";
                  brandText.style.fontSize = "20pt";
                  brandText.style.color = "#111827";
                  brandText.style.lineHeight = "1";
                  // Eliminar "Recursos Humanos" si existe
                  const subText = brandDiv.querySelector("div:last-child");
                  if (subText && subText.textContent.includes("Recursos")) {
                    subText.parentNode.removeChild(subText);
                  }
                }
              }
              // Asegurar que el título y fecha tengan el estilo correcto
              const rightDiv = previewTopbar.querySelector("div:last-child");
              if (rightDiv) {
                rightDiv.className = "right";
                const titleDiv = rightDiv.querySelector("div:first-child");
                const dateDiv = rightDiv.querySelector("div:last-child");
                if (titleDiv) {
                  titleDiv.style.fontWeight = "600";
                  titleDiv.style.fontSize = "11pt";
                  titleDiv.style.color = "#111827";
                  titleDiv.style.marginBottom = "2px";
                }
                if (dateDiv) {
                  dateDiv.style.fontSize = "9pt";
                  dateDiv.style.color = "#6b7280";
                }
              }
              // Eliminar línea separadora antigua si existe
              const hrPreview = previewTopbar.nextElementSibling;
              if (
                hrPreview &&
                (String(hrPreview.className || "").includes("bg-") ||
                  String(hrPreview.className || "").includes("h-px"))
              ) {
                hrPreview.parentNode.removeChild(hrPreview);
              }
              // Añadir línea separadora limpia y delgada
              const hr = doc.createElement("div");
              hr.className = "pdf-hr";
              previewTopbar.parentNode.insertBefore(
                hr,
                previewTopbar.nextSibling,
              );
            }
            // 4.2) Ajustar la sección de metadatos existente y quitar el encabezado interior si existe
            const metaAttr = block.querySelector('[data-meta-section="true"]');
            const summaryAttr = block.querySelector(
              '[data-summary-section="true"]',
            );
            if (metaAttr && summaryAttr) {
              // Nuevo layout: grid de encabezado (meta izquierda, resumen derecha)
              const grid = doc.createElement("div");
              grid.className = "pdf-header-grid";
              // meta
              const metaCard = doc.createElement("div");
              metaCard.className = "pdf-meta-card";
              const body = doc.createElement("div");
              body.className = "body";
              metaAttr.classList.add("pdf-meta");
              // Aplicar bordes y padding a cada columna
              const items = metaAttr.querySelectorAll(":scope > div");
              items.forEach((it, index) => {
                it.style.borderRight =
                  index < items.length - 1 ? "1px solid #d1d5db" : "none";
                it.style.padding = "0 12px";
                const label = it.firstElementChild;
                const value = it.lastElementChild;
                if (label) {
                  label.className = "label";
                  label.style.fontSize = "7.5pt";
                  label.style.color = "#6b7280";
                  label.style.textTransform = "uppercase";
                  label.style.fontWeight = "600";
                  label.style.marginBottom = "4px";
                  label.style.letterSpacing = "0.5px";
                }
                if (value) {
                  value.className = "value";
                  value.style.fontSize = "10pt";
                  value.style.fontWeight = "700";
                  value.style.color = "#111827";
                  value.style.lineHeight = "1.4";
                }
              });
              // Aplicar borde izquierdo al contenedor
              metaAttr.style.borderLeft = "1px solid #d1d5db";
              metaAttr.style.padding = "0";
              metaAttr.style.background = "transparent";
              body.appendChild(metaAttr);
              metaCard.appendChild(body);
              // summary
              const summaryCard = doc.createElement("div");
              summaryCard.className = "pdf-summary-card";
              summaryAttr.classList.add("pdf-summary");
              // Asegurar que los elementos del summary tengan los estilos correctos (fondo gris claro)
              summaryAttr.style.border = "1px solid #d1d5db";
              summaryAttr.style.borderRadius = "2px";
              summaryAttr.style.background = "#f3f4f6";
              summaryAttr.style.overflow = "hidden";
              const summaryDivs = summaryAttr.querySelectorAll(":scope > div");
              summaryDivs.forEach((div, index) => {
                div.style.textAlign = "center";
                div.style.padding = "12px 8px";
                div.style.borderRight =
                  index < summaryDivs.length - 1 ? "1px solid #d1d5db" : "none";
                div.style.background = "#f3f4f6";
                // Buscar elementos por atributo data para mayor precisión
                const label = div.querySelector('[data-summary-label="true"]');
                const value = div.querySelector('[data-summary-value="true"]');
                // Si no se encuentran por atributo, buscar por contenido
                const children = Array.from(div.children);
                const labelFallback =
                  label ||
                  children.find((el) => {
                    const text = (el.textContent || "").trim();
                    return (
                      text === "Total Horas" ||
                      text === "Días" ||
                      text === "Promedio"
                    );
                  });
                const valueFallback =
                  value ||
                  children.find((el) => {
                    const text = (el.textContent || "").trim();
                    return (
                      text &&
                      (text.match(/^\d+$/) || text.match(/^\d+:\d+$/)) &&
                      !text.includes("Total") &&
                      !text.includes("Días") &&
                      !text.includes("Promedio")
                    );
                  });
                if (labelFallback) {
                  labelFallback.style.fontSize = "7pt";
                  labelFallback.style.color = "#6b7280";
                  labelFallback.style.textTransform = "uppercase";
                  labelFallback.style.fontWeight = "600";
                  labelFallback.style.marginBottom = "6px";
                  labelFallback.style.letterSpacing = "0.5px";
                  labelFallback.style.display = "block";
                  labelFallback.style.visibility = "visible";
                  labelFallback.style.opacity = "1";
                }
                if (valueFallback) {
                  valueFallback.style.fontSize = "16pt";
                  valueFallback.style.fontWeight = "700";
                  valueFallback.style.color = "#111827";
                  valueFallback.style.lineHeight = "1.2";
                  valueFallback.style.marginBottom = "0";
                  valueFallback.style.display = "block";
                  valueFallback.style.visibility = "visible";
                  valueFallback.style.opacity = "1";
                  // Asegurar que el contenido de texto esté presente
                  if (
                    !valueFallback.textContent ||
                    valueFallback.textContent.trim() === ""
                  ) {
                    // Intentar obtener el valor del atributo o del texto original
                    const originalText =
                      valueFallback.getAttribute("data-original-value") || "";
                    if (originalText) {
                      valueFallback.textContent = originalText;
                    }
                  }
                }
                // Ocultar cualquier subtítulo adicional
                children.forEach((child) => {
                  const text = (child.textContent || "").trim();
                  if (
                    text.includes("en el periodo") ||
                    text.includes("días trabajados") ||
                    text.includes("horas/día")
                  ) {
                    child.style.display = "none";
                  }
                });
              });
              summaryCard.appendChild(summaryAttr);
              // insertar debajo de la barra superior
              const insertAfter =
                block.querySelector(".pdf-hr")?.nextSibling || block.firstChild;
              block.insertBefore(grid, insertAfter);
              grid.appendChild(metaCard);
              grid.appendChild(summaryCard);
            } else {
              // Compatibilidad con estructura anterior por índices
              const sections = block.querySelectorAll("section");
              if (sections[0]) {
                const metaCard = doc.createElement("div");
                metaCard.className = "pdf-meta-card";
                const head = doc.createElement("div");
                head.className = "head";
                head.textContent = "Información del Empleado";
                const body = doc.createElement("div");
                body.className = "body";
                const insertAfter =
                  block.querySelector(".pdf-hr")?.nextSibling ||
                  block.firstChild;
                block.insertBefore(metaCard, insertAfter);
                sections[0].classList.add("pdf-meta");
                body.appendChild(sections[0]);
                metaCard.appendChild(head);
                metaCard.appendChild(body);
                const items = sections[0].querySelectorAll(":scope > div");
                for (const it of items) {
                  const label = it.firstElementChild;
                  const value = it.lastElementChild;
                  if (label) label.className = "label";
                  if (value) value.className = "value";
                }
              }
              // Resumen inferior eliminado: el totalizado ya está arriba
            }

            const bodyRows = block.querySelectorAll("table tbody tr");
            for (const tr of bodyRows) {
              const tds = tr.children;
              if (!tds || tds.length === 0) continue;
              if (tds.length >= 6) {
                // Columna ESTADO (índice 4): sin color, solo texto
                const tdEstado = tds[4];
                const textEstado = (tdEstado.textContent || "").trim();
                const lowEstado = textEstado.toLowerCase();
                const shownEstado =
                  lowEstado === "cerrado" ? "Completo" : textEstado || "";
                tdEstado.style.textAlign = "center";
                tdEstado.style.backgroundColor = "#f9fafb";
                tdEstado.style.color = "#111827";
                tdEstado.style.border = "1px solid #e5e7eb";
                tdEstado.style.padding = "4px 8px";
                tdEstado.style.borderRadius = "4px";
                tdEstado.innerHTML = shownEstado;

                // Columna MOTIVO (índice 5): sin color ni emojis, solo texto limpio
                const tdMotivo = tds[5];
                const textMotivo = (tdMotivo.textContent || "").trim();
                // Eliminar emojis del motivo
                const cleanMotivo = textMotivo
                  .replace(/[\u{1F300}-\u{1F9FF}]/gu, "")
                  .replace(/[\u{2600}-\u{26FF}]/gu, "")
                  .replace(/[\u{2700}-\u{27BF}]/gu, "")
                  .trim();
                tdMotivo.style.backgroundColor = "#f9fafb";
                tdMotivo.style.color = "#111827";
                tdMotivo.style.border = "1px solid #e5e7eb";
                tdMotivo.style.padding = "4px 8px";
                tdMotivo.style.borderRadius = "4px";
                tdMotivo.innerHTML = cleanMotivo || "—";
              } else {
                // Fila de detalle (colSpan), forzar salto de línea conservado
                const t = tds[0];
                const content = (t.textContent || "").trim();
                const parentRow = tr;
                // Detectar si es una fila de detalle (contiene "Entrada:" o tiene atributo data-detail-row)
                if (
                  content.includes("Entrada:") ||
                  parentRow.hasAttribute("data-detail-row") ||
                  content.startsWith("Registro") ||
                  content.startsWith("ENTRADAS")
                ) {
                  t.classList.add("pdf-details");
                  // Asegurar que los saltos de línea se preserven con estilos inline
                  t.style.whiteSpace = "pre-wrap";
                  t.style.lineHeight = "1.6";
                  t.style.fontFamily =
                    "ui-monospace, Menlo, Consolas, monospace";
                  t.style.color = "#475569";
                  t.style.fontSize = "8.5pt";
                  // Si hay un div interno con el contenido, asegurar que también preserve los saltos
                  const innerDiv = t.querySelector("div");
                  if (innerDiv) {
                    innerDiv.style.whiteSpace = "pre-wrap";
                    innerDiv.style.lineHeight = "1.6";
                    // Asegurar que los <br> se preserven
                    const brs = innerDiv.querySelectorAll("br");
                    brs.forEach((br) => {
                      br.style.display = "block";
                      br.style.content = "";
                      br.style.marginBottom = "2px";
                    });
                  }
                  // Si el contenido tiene <br> tags, asegurarse de que se rendericen correctamente
                  if (t.innerHTML && t.innerHTML.includes("<br")) {
                    // Los <br> ya están presentes, solo asegurar estilos
                    t.style.whiteSpace = "normal";
                    const allBr = t.querySelectorAll("br");
                    allBr.forEach((br) => {
                      br.style.display = "block";
                      br.style.height = "1em";
                    });
                  }
                }
              }
            }
            // Eliminar firmas del preview si existen (para evitar duplicación)
            const existingSignatures = Array.from(
              block.querySelectorAll("div"),
            ).find((el) => {
              const text = el.textContent || "";
              return (
                text.includes("FIRMA DEL EMPLEADO") ||
                text.includes("FIRMA DE AUTORIZACIÓN")
              );
            });
            if (existingSignatures) {
              // Buscar el contenedor padre que tiene las firmas
              let signatureContainer = existingSignatures.closest(".grid");
              if (!signatureContainer) {
                signatureContainer = existingSignatures.parentElement;
              }
              if (
                signatureContainer &&
                signatureContainer.textContent.includes("FIRMA")
              ) {
                signatureContainer.parentNode?.removeChild(signatureContainer);
              }
            }
            // Agregar firmas solo una vez al final del bloque
            const signatures = doc.createElement("div");
            signatures.className = "pdf-signatures";
            signatures.innerHTML = `
              <div class="slot"><div class="line"></div><div class="label">FIRMA DEL EMPLEADO</div></div>
              <div class="slot"><div class="line"></div><div class="label">FIRMA DE AUTORIZACIÓN</div></div>
            `;
            block.appendChild(signatures);

            // 4.3) Calcular y guardar puntos de corte seguros para este bloque
            // en el DOM CLONADO (el mismo que usa html2canvas). Esto elimina
            // pequeñas diferencias de altura entre el DOM original y el clonado.
            const pdfId = block.getAttribute("data-pdf-block-id");
            if (pdfId) {
              const { domBreaks, totalHeight } = computeSafeBreaks(block);
              if (domBreaks && domBreaks.length > 1) {
                safeBreakMap[pdfId] = { domBreaks, totalHeight };
              }
            }
          }

          // 5) Reemplazar colores modernos en estilos computados
          for (const el of Array.from(doc.body.querySelectorAll("*"))) {
            try {
              const cs = win.getComputedStyle(el);
              for (const p of props) {
                const v = cs[p];
                if (hasModern(v)) {
                  const fallback = SAFE[p] || "#111827";
                  el.style[p] = fallback;
                }
              }
              for (const attr of ["fill", "stroke", "color"]) {
                const av = el.getAttribute && el.getAttribute(attr);
                if (hasModern(av)) {
                  el.setAttribute(attr, SAFE[attr] || "#111827");
                }
              }
            } catch (_) {}
          }
          doc.body.style.backgroundColor = "#ffffff";
        },
      };

      let isFirst = true;
      const iterableBlocks = blocks.length ? blocks : [reportRef.current];
      for (const el of iterableBlocks) {
        // Renderizamos el bloque a canvas; `onclone` ya calculó los cortes seguros
        // y los dejó guardados en `safeBreakMap` para el id correspondiente.
        const canvas = await html2canvas(el, captureOptions);

        const canvasHeight = canvas.height;
        const sliceHeight = (canvas.width * usablePageHeight) / imgWidth;

        const pdfId = el.getAttribute("data-pdf-block-id") || "";
        const info = pdfId ? safeBreakMap[pdfId] : null;

        // Si por cualquier motivo no tenemos puntos de corte calculados,
        // hacemos un fallback al comportamiento clásico de cortes uniformes.
        if (!info || !info.domBreaks || info.domBreaks.length < 2) {
          let position = 0;
          while (position < canvasHeight) {
            const currentHeight = Math.min(
              sliceHeight,
              canvasHeight - position,
            );
            const slice = document.createElement("canvas");
            slice.width = canvas.width;
            slice.height = currentHeight;
            const ctx = slice.getContext("2d");
            if (!ctx) break;

            ctx.drawImage(
              canvas,
              0,
              position,
              canvas.width,
              currentHeight,
              0,
              0,
              canvas.width,
              currentHeight,
            );

            const part = slice.toDataURL("image/png");
            if (!isFirst) pdf.addPage();
            pdf.addImage(
              part,
              "PNG",
              marginLeft,
              marginTop,
              imgWidth,
              (currentHeight * imgWidth) / canvas.width,
            );

            isFirst = false;
            position += currentHeight;
          }
          continue;
        }

        const { domBreaks, totalHeight } = info;
        const scaleY = canvasHeight / (totalHeight || 1);
        const safeBreaks = domBreaks.map((v) => Math.round(v * scaleY));

        let pageTop = 0;
        let breakIndex = 1; // domBreaks[0] === 0 representa el inicio

        // Rebanamos el canvas respetando los puntos seguros de corte
        while (pageTop < canvasHeight) {
          const maxBottom = pageTop + sliceHeight;
          let pageBottom = canvasHeight;

          // Elegimos el último punto seguro que entre en la página actual
          while (
            breakIndex < safeBreaks.length &&
            safeBreaks[breakIndex] <= maxBottom
          ) {
            pageBottom = safeBreaks[breakIndex];
            breakIndex++;
          }

          // Si por alguna razón no hay punto seguro, cortamos en el límite de página
          if (pageBottom <= pageTop) {
            pageBottom = Math.min(maxBottom, canvasHeight);
            if (pageBottom <= pageTop) break;
          }

          const currentHeight = pageBottom - pageTop;
          const slice = document.createElement("canvas");
          slice.width = canvas.width;
          slice.height = currentHeight;
          const ctx = slice.getContext("2d");
          if (!ctx) break;

          ctx.drawImage(
            canvas,
            0,
            pageTop,
            canvas.width,
            currentHeight,
            0,
            0,
            canvas.width,
            currentHeight,
          );

          const part = slice.toDataURL("image/png");
          if (!isFirst) pdf.addPage();
          pdf.addImage(
            part,
            "PNG",
            marginLeft,
            marginTop,
            imgWidth,
            (currentHeight * imgWidth) / canvas.width,
          );

          isFirst = false;
          pageTop = pageBottom;
        }
      }

      // Pie de página: numeración de páginas con un diseño limpio.
      // Se dibuja una línea sutil y el texto:
      // "Adamia · Reporte de Horas" a la izquierda y "Página X de N" a la derecha.
      const totalPages = pdf.getNumberOfPages();
      if (totalPages > 0) {
        // Área reservada para el pie de página; respetando el margen inferior de 2.5cm
        const footerAreaTop = pageHeight - marginBottom - footerReserved;

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(107, 114, 128); // gris medio
        pdf.setDrawColor(209, 213, 219); // gris claro para la línea
        pdf.setLineWidth(0.5);

        for (let page = 1; page <= totalPages; page++) {
          pdf.setPage(page);
          const lineY = footerAreaTop + 8; // un poco por encima del texto
          const textY = footerAreaTop + 22; // centrado verticalmente en el área reservada

          // Línea horizontal de separación (respetando márgenes izquierdo y derecho)
          pdf.line(marginLeft, lineY, pageWidth - marginRight, lineY);

          // Texto izquierdo (respetando margen izquierdo)
          const leftText = "Adamia · Reporte de Horas";
          pdf.text(leftText, marginLeft, textY);

          // Texto derecho con numeración X de N (respetando margen derecho)
          const rightText = `Página ${page} de ${totalPages}`;
          const textWidth = pdf.getTextWidth(rightText);
          pdf.text(rightText, pageWidth - marginRight - textWidth, textY);
        }
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
      {/* Header ADAMIA */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <div className="bg-[#2563EB] p-2.5 rounded-lg">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              Reporte de horas
            </h1>
            <p className="text-sm text-gray-600">
              Genera reportes por empleado y periodo.
            </p>
          </div>
        </div>
      </div>

      <Card className="border-blue-100 bg-blue-50">
       
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-sm text-muted-foreground">
                Unidad de negocio
              </label>
              <Combobox
                options={[
                  { value: "all", label: "Todas las unidades de negocio" },
                  ...unidadOptions,
                ]}
                value={unidadActiva}
                onChange={(value) => {
                  setUnidadActiva(value || "all");
                  setCargo("");
                  setEmpleadoId("");
                  setEmpleadoIds([]);
                }}
                placeholder="Seleccionar unidad de negocio"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Cargo</label>
              <select
                className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                value={cargo}
                onChange={(e) => {
                  setCargo(e.target.value);
                  setEmpleadoId(""); // Limpiamos para forzar la actualización
                }}
              >
                <option value="">Todos los cargos</option>
                {cargos.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className={`flex flex-col gap-2`}>
              <label className="text-sm font-medium text-gray-700">
                Empleado{multi ? "(s)" : ""}
              </label>
              {!multi ? (
                <select
                  className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  value={empleadoId}
                  onChange={(e) => setEmpleadoId(e.target.value)}
                >
                  {empleadosFiltrados.map((e) => (
                    <option key={e.id_empleado} value={e.id_empleado}>
                      {e.nombre_empleado} - {e.unidad_negocio || e.nombre_empresa}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={openSelectorWithBuffer}
                    className="w-full justify-between border-gray-300 text-gray-700 hover:bg-gray-100"
                  >
                    <span
                      className="truncate pr-2"
                      title={
                        empleadoIds.length > 0
                          ? `Seleccionar empleados (${empleadoIds.length} seleccionados)`
                          : "Seleccionar empleados"
                      }
                    >
                      {empleadoIds.length > 0
                        ? `Seleccionar empleados (${empleadoIds.length} seleccionados)`
                        : "Seleccionar empleados"}
                    </span>
                    <span className="text-xs text-muted-foreground">Abrir</span>
                  </Button>
                  <div className="hidden">
                    <select
                      multiple
                      className="min-h-9 h-24 w-full rounded-md border border-input bg-white px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      value={empleadoIds}
                      onChange={(e) =>
                        setEmpleadoIds(
                          Array.from(e.target.selectedOptions).map(
                            (o) => o.value,
                          ),
                        )
                      }
                    >
                      {empleadosFiltrados.map((e) => (
                        <option key={e.id_empleado} value={e.id_empleado}>
                        {e.nombre_empleado} - {e.unidad_negocio || e.nombre_empresa}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              {multi && empleadoIds.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {empleados
                    .filter((e) => empleadoIds.includes(String(e.id_empleado)))
                    .map((e) => (
                      <span
                        key={`sel-${e.id_empleado}`}
                        className="inline-flex items-center gap-1 rounded-full bg-zinc-100 border border-zinc-200 px-2 py-0.5 text-xs"
                          title={`${e.nombre_empleado} - ${e.unidad_negocio || e.nombre_empresa}`}
                      >
                        {e.nombre_empleado}
                        <button
                          type="button"
                          className="ml-1 text-zinc-500 hover:text-zinc-700"
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
                    className="text-xs text-zinc-600 underline decoration-dotted underline-offset-2"
                    onClick={() => setEmpleadoIds([])}
                  >
                    Quitar todos
                  </button>
                </div>
              ) : null}
              <label className="inline-flex items-center gap-2 text-xs text-gray-600 mt-1">
                <input
                  type="checkbox"
                  checked={multi}
                  onChange={(e) => setMulti(e.target.checked)}
                />
                Seleccionar múltiples (si no eliges ninguno, se tomarán todos
                del cargo)
              </label>

              {multi ? (
                <Dialog open={openSelector} onOpenChange={setOpenSelector}>
                  <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
                    <DialogHeader className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white p-6">
                      <DialogTitle className="text-white text-lg font-semibold">
                        Seleccionar empleados
                      </DialogTitle>
                      <DialogDescription className="text-white/90 text-sm">
                        Busca por nombre, empresa o unidad, marca múltiples empleados y
                        aplica la selección.
                      </DialogDescription>
                    </DialogHeader>

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
                            className="border-gray-300 text-gray-700 hover:bg-gray-100"
                          >
                            Seleccionar todos
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={clearDialogSelection}
                            disabled={tempEmpleadoIds.length === 0}
                            className="border-gray-300 text-gray-700 hover:bg-gray-100"
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
                        className="border-gray-300 text-gray-700 hover:bg-gray-100"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          setEmpleadoIds(tempEmpleadoIds);
                          setOpenSelector(false);
                        }}
                        className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-sm"
                      >
                        Aplicar selección
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">
                Fecha inicio
              </label>
              <Input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">
                Fecha fin
              </label>
              <Input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>
            <div className="flex items-end md:col-span-2">
              <Button
                onClick={handleGenerar}
                disabled={loading || (!multi && !empleadoId)}
                className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-md"
              >
                {loading ? "Generando…" : "Generar reporte"}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              onClick={handleExcel}
              variant="outline"
              className="gap-2 border-gray-300 text-gray-700 hover:bg-gray-100"
              disabled={
                !reportes || reportes.length === 0 || exporting !== null
              }
            >
              <FileSpreadsheet className="h-4 w-4" /> Exportar Excel
            </Button>
            <Button
              onClick={handleGuardarPDF}
              className="gap-2 bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-md"
              disabled={
                !reportes || reportes.length === 0 || exporting !== null
              }
            >
              <FileDown className="h-4 w-4" /> Guardar PDF
            </Button>
          </div>

          <div
            ref={reportRef}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 print:p-0"
          >
            {!reportes || reportes.length === 0 ? (
              <div className="text-center text-muted-foreground py-16">
                Genera un reporte para visualizar aquí.
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
                                primeraEntrada =
                                  entradasValidas[0].toISOString();
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
                                      ? new Date(
                                          ultimaSalida,
                                        ).toLocaleTimeString("es-MX", {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })
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
                                            .filter(
                                              (m) => m.entrada && m.salida,
                                            ) // Solo movimientos completos
                                            .map((m, idx) => {
                                              const entrada = m.entrada
                                                ? new Date(
                                                    m.entrada,
                                                  ).toLocaleTimeString(
                                                    "es-MX",
                                                    {
                                                      hour: "2-digit",
                                                      minute: "2-digit",
                                                    },
                                                  )
                                                : "-";
                                              const salida = m.salida
                                                ? new Date(
                                                    m.salida,
                                                  ).toLocaleTimeString(
                                                    "es-MX",
                                                    {
                                                      hour: "2-digit",
                                                      minute: "2-digit",
                                                    },
                                                  )
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
        </CardContent>
      </Card>
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
