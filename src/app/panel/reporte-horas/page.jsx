"use client";

// Reporte de Horas Trabajadas (adaptado a HR360)
// - Backend: /api/checador/reportes/horas (redlab_back)
// - Empleados: /api/checador/empleados?empresa=ID
// - Puestos: /api/checador/empleados/puestos?empresa=ID
// Relacionado con: redlab_back/modules/attendance/controllers/reporteHorasController.js

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Icon } from "@iconify/react";
import { useSnackbar } from "notistack";
import { useAuth } from "@/context/AuthContext";
import axios from "@/lib/axios";
import Cookies from "js-cookie";
import styles from "../vacaciones/vacaciones-theme.module.css";
import AccesosRapidos from "@/components/AccesosRapidos";

function fmtDate(d) {
  const dd = new Date(d);
  const y = dd.getUTCFullYear();
  const m = String(dd.getUTCMonth() + 1).padStart(2, "0");
  const day = String(dd.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function humanDate(isoDate) {
  const d = new Date(isoDate + "T00:00:00Z");
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
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
  // Paleta HR360
  let style = { backgroundColor: "#dbeafe", color: "#1e40af", borderColor: "#93c5fd" }; // info
  if (v === "presente" || v === "completo" || v === "cerrado") style = { backgroundColor: "#d1fae5", color: "#065f46", borderColor: "#86efac" };
  else if (v === "ausente") style = { backgroundColor: "#fee2e2", color: "#991b1b", borderColor: "#fca5a5" };
  else if (v === "tarde") style = { backgroundColor: "#fef3c7", color: "#92400e", borderColor: "#fde68a" };
  const label = v === "cerrado" ? "Completo" : (value || "—");
  return <span className="inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-semibold" style={style}>{label}</span>;
}

function MotivoPill({ value }) {
  if (!value) return <span className="text-zinc-500">—</span>;
  // Info azul HR360
  const style = { backgroundColor: "#dbeafe", color: "#1e40af", borderColor: "#93c5fd" };
  return <span className="inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-semibold" style={style}>{value}</span>;
}

export default function ReporteHorasPage() {
  const today = useMemo(() => fmtDate(new Date()), []);
  const monthStart = useMemo(() => {
    const d = new Date();
    d.setUTCDate(1);
    return fmtDate(d);
  }, []);

  const { dataUser } = useAuth();
  const empresaId = dataUser?.id_empresa || null;
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
    if (!empresaId) return;
    (async () => {
      try {
        const auth = { headers: { Authorization: `Bearer ${Cookies.get("token") || ""}` } };
        const [eRes, pRes] = await Promise.all([
          axios.get(`/checador/empleados?empresa=${empresaId}&page=1&limit=1000`, auth),
          axios.get(`/checador/empleados/puestos?empresa=${empresaId}`, auth),
        ]);

        const emps = Array.isArray(eRes.data?.data) ? eRes.data.data : [];
        const empleadosMapped = emps.map((e) => ({
          id_empleado: e.id_empleado,
          nombre_empleado: [e.nombre, e.apellido_paterno, e.apellido_materno].filter(Boolean).join(" "),
          nombre_empresa: dataUser?.empresa?.nombre_empresa || "",
          puesto: e.puesto || null,
        }));
        setEmpleados(empleadosMapped);
        if (empleadosMapped.length && !empleadoId) setEmpleadoId(String(empleadosMapped[0].id_empleado));

        const puestos = Array.isArray(pRes.data) ? pRes.data : [];
        const nombres = [...new Set(puestos.map((p) => p.nombre_puesto).filter(Boolean))];
        setCargos(nombres);
      } catch (err) {
        enqueueSnackbar("No se pudieron cargar empleados o puestos", { variant: "error" });
      }
    })();
  }, [empresaId]);

  const empleadosFiltrados = useMemo(() => {
    if (!cargo) return empleados;
    return empleados.filter((e) => (e.puesto || "").toLowerCase() === cargo.toLowerCase());
  }, [empleados, cargo]);

  const dialogResultados = useMemo(() => {
    const q = searchEmpleado.trim().toLowerCase();
    if (!q) return empleadosFiltrados;
    return empleadosFiltrados.filter((e) => {
      const nombre = String(e.nombre_empleado || "").toLowerCase();
      const empresa = String(e.nombre_empresa || "").toLowerCase();
      return nombre.includes(q) || empresa.includes(q);
    });
  }, [empleadosFiltrados, searchEmpleado]);

  function openSelectorWithBuffer() {
    setTempEmpleadoIds(empleadoIds);
    setSearchEmpleado("");
    setOpenSelector(true);
  }
  function toggleTemp(id) {
    const sid = String(id);
    setTempEmpleadoIds((prev) => (prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid]));
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
    if (!empresaId) {
      enqueueSnackbar("Empresa no identificada", { variant: "warning" });
      return;
    }
    setLoading(true);
    try {
      let ids = [];
      if (multi) {
        ids = empleadoIds.length ? empleadoIds : empleadosFiltrados.map((e) => String(e.id_empleado));
      } else {
        if (!empleadoId) return; ids = [String(empleadoId)];
      }
      const auth = { headers: { Authorization: `Bearer ${Cookies.get("token") || ""}` } };
      const requests = ids.map((id) => axios.get(`/checador/reportes/horas`, { params: { empleadoId: id, fechaInicio, fechaFin }, ...auth }));
      const results = await Promise.all(requests);
      const okReports = results.map((r) => r.data).filter((d) => d?.ok).map((d) => d.data);
      setReportes(okReports);
      if (okReports.length === 0) enqueueSnackbar("Sin datos en el periodo", { variant: "info" });
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
        const rows = r.dias.map((d) => {
          const e = d.entrada ? new Date(d.entrada).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) : "-";
          const s = d.salida ? new Date(d.salida).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) : "-";
          const estado = (d.estado || '').toLowerCase();
          let badge = 'badge-info';
          if (estado === 'presente') badge = 'badge-success';
          else if (estado === 'ausente') badge = 'badge-danger';
          else if (estado === 'tarde') badge = 'badge-warning';
          return `
            <tr>
              <td>${humanDate(d.fecha)}</td>
              <td style="text-align:center">${e}</td>
              <td style="text-align:center">${s}</td>
              <td style="text-align:center">${d.horasHM}</td>
              <td style="text-align:center"><span class="badge ${badge}">${d.estado || ''}</span></td>
              <td>${d.motivo || ''}</td>
              <td>${d.notas || ''}</td>
            </tr>
            ${Array.isArray(d.movimientos) && d.movimientos.length > 1 ? `
              <tr>
                <td colspan="7" class="details">
                  ${d.movimientos.map((m, idx) => {
                    const ee = m.entrada ? new Date(m.entrada).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '-';
                    const ss = m.salida ? new Date(m.salida).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '-';
                    return `Registro ${idx+1}:  Entrada: ${ee} | Salida: ${ss} | Horas: ${m.horasHM}`;
                  }).join('\n')}
                </td>
              </tr>
            ` : ''}
          `;
        }).join('');
        return `
          <div class="card">
            <div class="topbar">
              <div class="title">Reporte de Horas Trabajadas</div>
              <div class="subtitle">Generado el ${new Date().toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'})}</div>
            </div>
            <div class="sep"></div>
            <div class="meta-card">
              <div class="head">Información del Empleado</div>
              <table class="meta-table">
                <tr>
                  <td><span class="k">Empleado:</span> <span class="v">${r.empleado?.nombre_empleado || ''}</span></td>
                  <td><span class="k">Empresa:</span> <span class="v">${r.empleado?.nombre_empresa || ''}</span></td>
                  <td><span class="k">Periodo:</span> <span class="v">${humanDate(r.periodo.inicio)} al ${humanDate(r.periodo.fin)}</span></td>
                  <td><span class="k">Días trabajados:</span> <span class="v">${r.resumen.diasTrabajados}</span></td>
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
                  <td><div class="h">Total Horas</div><div class="v">${r.resumen.totalHoras}</div><div class="s">en el periodo</div></td>
                  <td><div class="h">Días Trabajados</div><div class="v">${r.resumen.diasTrabajados}</div><div class="s">días únicos</div></td>
                  <td><div class="h">Promedio Diario</div><div class="v">${r.resumen.promedioHoras}</div><div class="s">horas/día</div></td>
                </tr>
              </table>
            </div>
          </div>`;
      };
      const body = reportes.map((r, i) => `${renderReport(r)}${i < reportes.length - 1 ? '<div class="pb"></div>' : ''}`).join("");
      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${baseCSS}</style></head><body>${body}</body></html>`;
      const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      let xlsName = "reporte_horas_multiples.xls";
      if (reportes.length === 1) {
        const emp = (reportes[0]?.empleado?.nombre_empleado || "empleado").replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, " ").trim();
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
            const spanCell = next && next.querySelector && next.querySelector("td[colspan]");
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
      const margin = 12;
      const imgWidth = pageWidth - margin * 2;

      // Altura reservada en la parte inferior de cada página para el pie de página
      // (línea separadora + leyenda + numeración). También se usa para que el
      // contenido de la imagen no "pegue" contra el pie ni lo tape.
      const footerReserved = 42; // pt
      const usablePageHeight = pageHeight - margin * 2 - footerReserved;
      const blocks = Array.from(reportRef.current.querySelectorAll('[data-report-block="true"]'));

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
          const links = Array.from(doc.querySelectorAll('link[rel="stylesheet"], style'));
          links.forEach((l) => l.parentNode && l.parentNode.removeChild(l));

          // 3) Reinyectar CSS mínimo seguro para PDF
          const safeStyle = doc.createElement('style');
          safeStyle.textContent = `
            *{box-sizing:border-box}
            @page { size: A4; margin: 0 }
            body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,"Helvetica Neue";font-size:14pt;color:#111827;background:#ffffff;margin:0;padding:0}
            .pdf-card{border:1px solid #e5e7eb;border-radius:8px;margin:18px 0;overflow:hidden}
            .pdf-header{background:#f3f4f6;padding:16px 20px}
            .pdf-header h2{margin:0;font-size:18pt;font-weight:700}
            .pdf-header .date{font-size:10pt;color:#6b7280;float:right}
            .pdf-divider{height:1px;background:#e5e7eb}
            .pdf-meta{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:14px;padding:16px 20px;border-bottom:1px solid #e5e7eb}
            .pdf-meta > div > .label{font-size:10pt;color:#6b7280}
            .pdf-meta > div > .value{font-size:12pt;font-weight:600}
            table{width:100%;border-collapse:collapse}
            thead th{background:#1f2937;color:#ffffff;font-weight:700;border:1px solid #1f2937;padding:10px 12px;text-align:center;font-size:11pt}
            tbody td{border:1px solid #e5e7eb;padding:12px;font-size:11pt;line-height:1.45}
            tbody tr:nth-child(odd){background:#fafafa}
            .pdf-summary{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;padding:16px 20px;border-top:1px solid #e5e7eb;background:#f9fafb}
            .pdf-summary-card{border:1px solid #e5e7eb;border-radius:8px;background:#f8fafc;margin-top:10px}
            .pdf-summary > div{text-align:center}
            .pdf-summary > div > div:first-child{font-size:10pt;color:#6b7280}
            .pdf-summary > div > div:nth-child(2){font-size:22pt;font-weight:700;color:#0f172a}
            .pdf-summary > div > div:last-child{font-size:10pt;color:#6b7280}
            .pdf-badge{display:inline-block;padding:4px 12px;border-radius:9999px;font-weight:700;font-size:10pt;border:1px solid transparent}
            .pdf-badge--success{background:#DCFCE7;color:#166534;border-color:#86EFAC}
            .pdf-badge--danger{background:#FEE2E2;color:#991B1B;border-color:#FCA5A5}
            .pdf-badge--warning{background:#FEF9C3;color:#92400E;border-color:#FDE68A}
            .pdf-badge--info{background:#DBEAFE;color:#1E3A8A;border-color:#93C5FD}
            .pdf-topbar{display:flex;align-items:center;justify-content:space-between;padding:14px 4px}
            .pdf-topbar .brand{font-weight:800;font-size:16pt;color:#1f2937;letter-spacing:.5px}
            .pdf-topbar .right{line-height:1.2;text-align:right}
            .pdf-topbar .title{font-weight:700;font-size:16pt;color:#0f172a}
            .pdf-topbar .subtitle{font-size:10pt;color:#64748b}
            .pdf-topbar img{height:26px;width:auto}
            .pdf-topbar > div:first-child{display:flex;align-items:center;gap:8px}
            .pdf-hr{height:2px;background:#1f2937;margin:8px 0 14px 0}
            .pdf-meta-card{border:1px solid #e5e7eb;border-radius:8px;background:#f8fafc;margin:0 14px 14px 14px;overflow:hidden}
            .pdf-meta-card .head{background:#eef2f7;color:#111827;font-weight:700;font-size:10pt;padding:10px 12px;border-bottom:1px solid #e5e7eb}
            .pdf-meta-card .body{padding:0}
            .pdf-details{font-family:ui-monospace,Menlo,Consolas,monospace;color:#475569;font-size:9pt;white-space:pre-wrap}
            .pdf-signatures{display:grid;grid-template-columns:1fr 1fr;gap:40px;padding:20px;margin-top:10px}
            .pdf-signatures .slot{display:flex;flex-direction:column;align-items:center;gap:10px}
            .pdf-signatures .line{height:2px;background:#0f172a;width:65%}
            .pdf-signatures .label{font-size:9pt;color:#6b7280}
          `;
          doc.head.appendChild(safeStyle);

          // 4) Mapear estructura de reporte a clases PDF y forzar badges
          const props = ['color','backgroundColor','borderColor','borderTopColor','borderRightColor','borderBottomColor','borderLeftColor','outlineColor','fill','stroke'];
          const SAFE = { color:'#111827', backgroundColor:'#ffffff', borderColor:'#e5e7eb', outlineColor:'#e5e7eb', fill:'#111827', stroke:'#111827' };
          const hasModern = (v) => v && (v.includes('oklch(') || v.includes('lab(') || v.startsWith('color(') || v.includes('color-mix('));
          const win = doc.defaultView || window;

          const clonedBlocks = Array.from(doc.querySelectorAll('[data-report-block="true"]'));
          for (const block of clonedBlocks) {
            // asegurar ancho A4 (~794px @96dpi) para texto a escala 1:1
            block.style.width = '794px';
            block.style.margin = '0 auto';
            block.classList.add('pdf-card');
            // 4.1) Tomar el topbar de PREVIEW y transformarlo a PDF (sin duplicados)
            const previewTopbar = block.querySelector('[data-pdf-topbar="true"]');
            if (previewTopbar) {
              previewTopbar.className = 'pdf-topbar';
              const hrPreview = previewTopbar.nextElementSibling;
              if (hrPreview && String(hrPreview.className || '').includes('bg-slate-800')) {
                hrPreview.parentNode.removeChild(hrPreview);
              }
              // añadir línea separadora como en la previsualización
              const hr = doc.createElement('div'); hr.className='pdf-hr';
              previewTopbar.parentNode.insertBefore(hr, previewTopbar.nextSibling);
            }
            // 4.2) Ajustar la sección de metadatos existente y quitar el encabezado interior si existe
            const sections = block.querySelectorAll('section');
  if (sections[0]) {
    // envolver en tarjeta con encabezado azulado igual a preview
    const metaCard = doc.createElement('div');
    metaCard.className = 'pdf-meta-card';
    const head = doc.createElement('div'); head.className = 'head'; head.textContent = 'Información del Empleado';
    const body = doc.createElement('div'); body.className = 'body';
    const insertAfter = block.querySelector('.pdf-hr')?.nextSibling || block.firstChild;
    block.insertBefore(metaCard, insertAfter);
    sections[0].classList.add('pdf-meta');
    body.appendChild(sections[0]);
    metaCard.appendChild(head); metaCard.appendChild(body);

    const items = sections[0].querySelectorAll(':scope > div');
    for (const it of items) {
      const label = it.firstElementChild; const value = it.lastElementChild;
      if (label) label.className = 'label';
      if (value) value.className = 'value';
    }
  }
  if (sections[2]) {
    const summaryCard = doc.createElement('div');
    summaryCard.className = 'pdf-summary-card';
    block.insertBefore(summaryCard, sections[2]);
    sections[2].classList.add('pdf-summary');
    summaryCard.appendChild(sections[2]);
  }

          const bodyRows = block.querySelectorAll('table tbody tr');
          for (const tr of bodyRows) {
            const tds = tr.children; if (!tds || tds.length === 0) continue;
            if (tds.length >= 5) {
              const tdEstado = tds[4];
              const text = (tdEstado.textContent || '').trim();
              const low = text.toLowerCase();
              let cls = 'pdf-badge--info';
              if (low === 'presente' || low === 'cerrado' || low === 'completo') cls = 'pdf-badge--success';
              else if (low === 'ausente') cls = 'pdf-badge--danger';
              else if (low === 'tarde') cls = 'pdf-badge--warning';
              else if (low === 'permiso' || low === 'vacaciones') cls = 'pdf-badge--info';
              tdEstado.style.textAlign = 'center';
              const shown = (low === 'cerrado') ? 'Completo' : (text || '');
              tdEstado.innerHTML = `<span class="pdf-badge ${cls}">${shown}</span>`;
            } else {
              // Fila de detalle (colSpan), forzar salto de línea conservado
              const t = tds[0];
              const content = (t.textContent || '').trim();
              if (content.startsWith('Registro')) {
                t.classList.add('pdf-details');
              }
            }
          }
            // Firmas
            const signatures = doc.createElement('div');
            signatures.className = 'pdf-signatures';
            signatures.innerHTML = `
              <div class="slot"><div class="line"></div><div class="label">FIRMA DEL EMPLEADO</div></div>
              <div class="slot"><div class="line"></div><div class="label">FIRMA DE AUTORIZACIÓN</div></div>
            `;
            block.appendChild(signatures);

            // 4.3) Calcular y guardar puntos de corte seguros para este bloque
            // en el DOM CLONADO (el mismo que usa html2canvas). Esto elimina
            // pequeñas diferencias de altura entre el DOM original y el clonado.
            const pdfId = block.getAttribute('data-pdf-block-id');
            if (pdfId) {
              const { domBreaks, totalHeight } = computeSafeBreaks(block);
              if (domBreaks && domBreaks.length > 1) {
                safeBreakMap[pdfId] = { domBreaks, totalHeight };
              }
            }
          }

          // 5) Reemplazar colores modernos en estilos computados
          for (const el of Array.from(doc.body.querySelectorAll('*'))) {
            try {
              const cs = win.getComputedStyle(el);
              for (const p of props) {
                const v = cs[p];
                if (hasModern(v)) {
                  const fallback = SAFE[p] || '#111827';
                  el.style[p] = fallback;
                }
              }
              for (const attr of ['fill','stroke','color']) {
                const av = el.getAttribute && el.getAttribute(attr);
                if (hasModern(av)) {
                  el.setAttribute(attr, SAFE[attr] || '#111827');
                }
              }
            } catch (_) {}
          }
          doc.body.style.backgroundColor = '#ffffff';
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
            const currentHeight = Math.min(sliceHeight, canvasHeight - position);
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
              currentHeight
            );

            const part = slice.toDataURL("image/png");
            if (!isFirst) pdf.addPage();
            pdf.addImage(part, "PNG", margin, margin, imgWidth, (currentHeight * imgWidth) / canvas.width);

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
          while (breakIndex < safeBreaks.length && safeBreaks[breakIndex] <= maxBottom) {
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
            currentHeight
          );

          const part = slice.toDataURL("image/png");
          if (!isFirst) pdf.addPage();
          pdf.addImage(part, "PNG", margin, margin, imgWidth, (currentHeight * imgWidth) / canvas.width);

          isFirst = false;
          pageTop = pageBottom;
        }
      }

      // Pie de página: numeración de páginas con un diseño limpio.
      // Se dibuja una línea sutil y el texto:
      // "HR360 · Reporte de Horas" a la izquierda y "Página X de N" a la derecha.
      const totalPages = pdf.getNumberOfPages();
      if (totalPages > 0) {
        // Área reservada para el pie de página; usamos la misma altura que
        // `footerReserved` para garantizar que haya un colchón visual entre
        // la tabla y la línea/leyenda.
        const footerAreaTop = pageHeight - footerReserved;

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(107, 114, 128); // gris medio
        pdf.setDrawColor(209, 213, 219); // gris claro para la línea
        pdf.setLineWidth(0.5);

        for (let page = 1; page <= totalPages; page++) {
          pdf.setPage(page);
          const lineY = footerAreaTop + 8; // un poco por encima del texto
          const textY = footerAreaTop + 22; // centrado verticalmente en el área reservada

          // Línea horizontal de separación
          pdf.line(margin, lineY, pageWidth - margin, lineY);

          // Texto izquierdo
          const leftText = "HR360 · Reporte de Horas";
          pdf.text(leftText, margin, textY);

          // Texto derecho con numeración X de N
          const rightText = `Página ${page} de ${totalPages}`;
          const textWidth = pdf.getTextWidth(rightText);
          pdf.text(rightText, pageWidth - margin - textWidth, textY);
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

  return (
    <div className={`${styles.vacacionesTheme} min-h-dvh bg-zinc-50 py-10`}>
      <div className="mx-auto w-full max-w-6xl px-4">
        <Card>
          <CardHeader className="flex flex-col gap-1">
            <div className="text-sm text-muted-foreground">Genera reportes por empleado y periodo</div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm text-muted-foreground">Cargo</label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                >
                  <option value="">Todos los cargos</option>
                  {cargos.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className={`flex flex-col gap-2`}>
                <label className="text-sm text-muted-foreground">Empleado{multi ? "(s)" : ""}</label>
                {!multi ? (
                  <select
                    className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    value={empleadoId}
                    onChange={(e) => setEmpleadoId(e.target.value)}
                  >
                    {empleadosFiltrados.map((e) => (
                      <option key={e.id_empleado} value={e.id_empleado}>
                        {e.nombre_empleado} - {e.nombre_empresa}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Button type="button" variant="secondary" onClick={openSelectorWithBuffer} className="w-full justify-between">
                      <span className="truncate pr-2" title={empleadoIds.length > 0 ? `Seleccionar empleados (${empleadoIds.length} seleccionados)` : "Seleccionar empleados"}>
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
                        onChange={(e) => setEmpleadoIds(Array.from(e.target.selectedOptions).map((o) => o.value))}
                      >
                        {empleadosFiltrados.map((e) => (
                          <option key={e.id_empleado} value={e.id_empleado}>
                            {e.nombre_empleado} - {e.nombre_empresa}
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
                        <span key={`sel-${e.id_empleado}`} className="inline-flex items-center gap-1 rounded-full bg-zinc-100 border border-zinc-200 px-2 py-0.5 text-xs" title={`${e.nombre_empleado} - ${e.nombre_empresa}`}>
                          {e.nombre_empleado}
                          <button type="button" className="ml-1 text-zinc-500 hover:text-zinc-700" onClick={() => setEmpleadoIds((ids) => ids.filter((id) => id !== String(e.id_empleado)))} aria-label={`Quitar ${e.nombre_empleado}`}>
                            <Icon icon="lucide:x" className="size-3.5" />
                          </button>
                        </span>
                      ))}
                    <button type="button" className="text-xs text-zinc-600 underline decoration-dotted underline-offset-2" onClick={() => setEmpleadoIds([])}>
                      Quitar todos
                    </button>
                  </div>
                ) : null}
                <label className="inline-flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <input type="checkbox" checked={multi} onChange={(e) => setMulti(e.target.checked)} />
                  Seleccionar múltiples (si no eliges ninguno, se tomarán todos del cargo)
                </label>

                {multi ? (
                  <Dialog open={openSelector} onOpenChange={setOpenSelector}>
                    <DialogContent className={`${styles.vacacionesTheme} sm:max-w-2xl`}>
                      <DialogHeader>
                        <DialogTitle>Seleccionar empleados</DialogTitle>
                        <DialogDescription>Busca por nombre o empresa, marca múltiples empleados y aplica la selección.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">Buscar</label>
                        <Input placeholder="Escribe para filtrar por nombre o empresa..." value={searchEmpleado} onChange={(e) => setSearchEmpleado(e.target.value)} />
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <div className="text-muted-foreground">{tempEmpleadoIds.length} seleccionados de {dialogResultados.length} resultados</div>
                        <div className="flex items-center gap-2">
                          <Button type="button" variant="ghost" onClick={selectAllDialog} disabled={dialogResultados.length === 0}>Seleccionar todos</Button>
                          <Button type="button" variant="ghost" onClick={clearDialogSelection} disabled={tempEmpleadoIds.length === 0}>Limpiar</Button>
                        </div>
                      </div>
                      <div className="max-h-[380px] overflow-auto rounded-md border">
                        {dialogResultados.length === 0 ? (
                          <div className="p-4 text-sm text-muted-foreground">No hay resultados.</div>
                        ) : (
                          <ul className="divide-y">
                            {dialogResultados.map((e) => {
                              const id = String(e.id_empleado);
                              const checked = tempEmpleadoIds.includes(id);
                              return (
                                <li key={`dlg-${id}`} className="flex items-center gap-3 p-3">
                                  <input type="checkbox" className="size-4" checked={checked} onChange={() => toggleTemp(id)} aria-label={`Seleccionar ${e.nombre_empleado}`} />
                                  <div className="min-w-0">
                                    <div className="truncate font-medium">{e.nombre_empleado}</div>
                                    <div className="truncate text-xs text-muted-foreground">{e.nombre_empresa}</div>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpenSelector(false)} className="bg-white border-[#d1d5db] text-[#374151] hover:bg-[#f9fafb]">Cancelar</Button>
                        <Button type="button" onClick={() => { setEmpleadoIds(tempEmpleadoIds); setOpenSelector(false); }} className="bg-[#37495E] hover:bg-[#2c3a4a] text-white shadow-[0_4px_12px_rgba(55,73,94,0.3)]">Aplicar selección</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm text-muted-foreground">Fecha inicio</label>
                <Input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm text-muted-foreground">Fecha fin</label>
                <Input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
              </div>
              <div className="flex items-end md:col-span-2">
                <Button onClick={handleGenerar} disabled={loading || (!multi && !empleadoId)} className="w-full bg-[#37495E] hover:bg-[#2c3a4a] text-white shadow-[0_4px_12px_rgba(55,73,94,0.3)]">
                  {loading ? "Generando…" : "Generar Reporte"}
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button variant="outline" onClick={handleImprimir} className="gap-2 border-[#d1d5db] text-[#374151] hover:bg-[#f9fafb]">
                <Icon icon="lucide:printer" className="size-4" /> Imprimir
              </Button>
              <Button
                variant="default"
                onClick={handleExcel}
                className="gap-2 bg-[#27ae60] hover:bg-[#229954] text-white shadow-[0_2px_8px_rgba(39,174,96,0.3)]"
                disabled={!reportes || reportes.length === 0 || exporting !== null}
              >
                <Icon icon="lucide:file-spreadsheet" className="size-4" /> Exportar Excel
              </Button>
              <Button variant="destructive" onClick={handleGuardarPDF} className="gap-2 bg-[#ef4444] hover:bg-[#dc2626] text-white shadow-[0_4px_12px_rgba(239,68,68,0.3)]" disabled={!reportes || reportes.length === 0 || exporting !== null}>
                <Icon icon="lucide:file-down" className="size-4" /> Guardar PDF
              </Button>
            </div>

            <div ref={reportRef} className="bg-white rounded-lg border shadow-sm p-6 print:p-0">
              {!reportes || reportes.length === 0 ? (
                <div className="text-center text-muted-foreground py-16">Genera un reporte para visualizar aquí.</div>
              ) : (
                <div className="space-y-10">
                  {reportes.map((reporte, idx) => (
                    <div key={idx} className="space-y-6" data-report-block="true">
                      {/* Top bar */}
                      <div className="flex items-center justify-between px-1" data-pdf-topbar="true">
                        <div className="flex items-center gap-2">
                          <img src="/assets/logo.png" alt="HR360" className="h-6 w-auto select-none" />
                        </div>
                        <div className="text-right leading-tight">
                          <div className="font-semibold">Reporte de Horas Trabajadas</div>
                          <div className="text-xs text-muted-foreground">Generado el {new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}</div>
                        </div>
                      </div>
                      <div className="h-0.5 my-2" style={{ backgroundColor: "#2c3e50" }} />
                      {/* Información del Empleado */}
                      <div className="rounded-md border bg-slate-50">
                        
                        <section className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4">
                        <div>
                          <div className="text-xs text-muted-foreground">Empleado</div>
                          <div className="font-medium">{reporte.empleado?.nombre_empleado}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Empresa</div>
                          <div className="font-medium">{reporte.empleado?.nombre_empresa}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Periodo</div>
                          <div className="font-medium">{humanDate(reporte.periodo.inicio)} al {humanDate(reporte.periodo.fin)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Días trabajados</div>
                          <div className="font-medium">{reporte.resumen.diasTrabajados}</div>
                        </div>
                        </section>
                      </div>
                      <section className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          <thead className="sticky top-0 z-10">
                            <tr className="text-white" style={{ backgroundColor: "#2c3e50" }}>
                              <th className="p-2 border">Fecha</th>
                              <th className="p-2 border">Entrada</th>
                              <th className="p-2 border">Salida</th>
                              <th className="p-2 border">Horas</th>
                              <th className="p-2 border">Estado</th>
                              <th className="p-2 border">Motivo</th>
                              <th className="p-2 border">Notas</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reporte.dias.map((d) => (
                              <Fragment key={`day-${d.fecha}`}>
                                <tr className="odd:bg-zinc-50/40 hover:bg-zinc-50">
                                  <td className="p-2 border whitespace-nowrap align-top">{humanDate(d.fecha)}</td>
                                  <td className="p-2 border text-center align-top">{d.entrada ? new Date(d.entrada).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) : "-"}</td>
                                  <td className="p-2 border text-center align-top">{d.salida ? new Date(d.salida).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) : "-"}</td>
                                  <td className="p-2 border text-center align-top">{d.horasHM}</td>
                                  <td className="p-2 border text-center align-top"><EstadoPill value={d.estado} /></td>
                                  <td className="p-2 border align-top"><MotivoPill value={d.motivo} /></td>
                                  <td className="p-2 border align-top">{d.notas ? (<span className="inline-flex items-center gap-1 text-zinc-700"><Icon icon="lucide:sticky-note" className="size-3.5 text-amber-600" /> {d.notas}</span>) : (<span className="text-zinc-500">—</span>)}</td>
                                </tr>
                                {Array.isArray(d.movimientos) && d.movimientos.length > 1 ? (
                                  <tr className="bg-white/50">
                                    <td colSpan={7} className="p-2 pl-6 border-t text-xs text-zinc-600 font-mono whitespace-pre-wrap">
                                      {d.movimientos.map((m, idx) => {
                                        const e = m.entrada ? new Date(m.entrada).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) : "-";
                                        const s = m.salida ? new Date(m.salida).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) : "-";
                                        return `Registro ${idx + 1}:  Entrada: ${e}  |  Salida: ${s}  |  Horas: ${m.horasHM}`;
                                      }).join("\n")}
                                    </td>
                                  </tr>
                                ) : null}
                              </Fragment>
                            ))}
                          </tbody>
                        </table>
                      </section>
                      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-md border p-4 bg-zinc-50/60">
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">Total Horas</div>
                          <div className="text-3xl font-semibold">{reporte.resumen.totalHoras}</div>
                          <div className="text-xs text-muted-foreground">en el periodo</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">Días Trabajados</div>
                          <div className="text-3xl font-semibold">{reporte.resumen.diasTrabajados}</div>
                          <div className="text-xs text-muted-foreground">días únicos</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">Promedio Diario</div>
                          <div className="text-3xl font-semibold">{reporte.resumen.promedioHoras}</div>
                          <div className="text-xs text-muted-foreground">horas/día</div>
                        </div>
                      </section>
                      {/* Firmas */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 px-10 mt-4">
                        <div className="flex flex-col items-center gap-2">
                          <div className="h-0.5 bg-slate-900 w-2/3" />
                          
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <div className="h-0.5 bg-slate-900 w-2/3" />
                          
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      {exporting && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/40 backdrop-blur-sm">
          <div className="rounded-xl bg-white shadow-xl p-6 w-[340px] text-center space-y-3 border">
            <div className="mx-auto size-10 rounded-full border-4 border-zinc-200 border-t-zinc-800 animate-spin" />
            <div className="text-sm font-medium text-zinc-700">{exporting === 'pdf' ? 'Generando PDF…' : 'Generando Excel…'}</div>
            <div className="text-xs text-zinc-500">Esto puede tardar unos segundos. No cierres esta ventana.</div>
          </div>
        </div>
      )}
      
      {/* Accesos Rápidos - Componente reutilizable (al final de la página) */}
      <AccesosRapidos />
    </div>
  );
}


