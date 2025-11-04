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

function EstadoPill({ value }) {
  const v = String(value || "").toLowerCase();
  let cls = "bg-blue-100 text-blue-900 border-blue-300";
  if (v === "presente") cls = "bg-green-100 text-green-900 border-green-300";
  else if (v === "ausente") cls = "bg-red-100 text-red-900 border-red-300";
  else if (v === "tarde") cls = "bg-yellow-100 text-yellow-900 border-yellow-300";
  return (
    <span className={`inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-semibold ${cls}`}>{value || "—"}</span>
  );
}

function MotivoPill({ value }) {
  if (!value) return <span className="text-zinc-500">—</span>;
  return <span className="inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-semibold bg-blue-50 text-blue-900 border-blue-200">{value}</span>;
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
      const baseCSS = `*{box-sizing:border-box}body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Helvetica Neue;color:#111827;font-size:14px;margin:0;background:#ffffff}.card{border:1px solid #e5e7eb;border-radius:10px;margin:18px 0;overflow:hidden}.header{display:flex;align-items:center;justify-content:space-between;background:#f3f4f6;padding:14px 18px}.brand{display:flex;align-items:center;gap:10px}.brand .logo{width:28px;height:28px;border-radius:8px;background:#111827;color:#ffffff;display:grid;place-items:center;font-weight:800;font-size:11px}.brand .meta{line-height:1}.brand .meta .top{font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.04em}.brand .meta .name{font-weight:600}.title{font-weight:700;font-size:18px}.date{font-size:11px;color:#6b7280}.divider{height:1px;background:#e5e7eb}.meta-table{width:100%;border-collapse:collapse;border-top:0;border-bottom:1px solid #e5e7eb}.meta-table td{border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;padding:10px 12px;vertical-align:top}.meta-table td:first-child{border-left:0}.meta-table td:last-child{border-right:0}.label{font-size:11px;color:#6b7280}.value{font-size:13px;font-weight:600}table{width:100%;border-collapse:collapse}thead th{background:#e5e7eb;color:#111827;font-weight:700;border:1px solid #e5e7eb;padding:10px;text-align:center}tbody td{border:1px solid #e5e7eb;padding:10px;font-size:13px}tbody tr:nth-child(odd){background:#fafafa}.details{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,Liberation Mono,monospace;color:#4b5563;font-size:12px;white-space:pre-wrap}.summary-table{width:100%;border-collapse:separate;border-spacing:12px 0;background:#f9fafb;border-top:1px solid #e5e7eb;padding:14px 6px}.summary-table td{width:33%;text-align:center;padding:12px;border:1px solid #e5e7eb;border-radius:8px;background:#ffffff}.summary-table .h{font-size:11px;color:#6b7280}.summary-table .v{font-size:22px;font-weight:700}.badge{display:inline-block;padding:3px 10px;border-radius:9999px;font-weight:700;font-size:11px;border:1px solid transparent}.badge-success{background:#DCFCE7;color:#166534;border-color:#86EFAC}.badge-danger{background:#FEE2E2;color:#991B1B;border-color:#FCA5A5}.badge-warning{background:#FEF9C3;color:#92400E;border-color:#FDE68A}.badge-info{background:#DBEAFE;color:#1E3A8A;border-color:#93C5FD}.pb{page-break-after:always}`;
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
            <div class="header">
              <div class="brand">
                <div class="logo">HR</div>
                <div class="meta"><div class="top">Recursos Humanos</div><div class="name">HR360</div></div>
              </div>
              <div class="title">Reporte de Horas Trabajadas</div>
              <div class="date">Generado el ${new Date().toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'})}</div>
            </div>
            <div class="divider"></div>
            <table class="meta-table">
              <tr>
                <td><div class="label">Empleado</div><div class="value">${r.empleado?.nombre_empleado || ''}</div></td>
                <td><div class="label">Empresa</div><div class="value">${r.empleado?.nombre_empresa || ''}</div></td>
                <td><div class="label">Periodo</div><div class="value">${humanDate(r.periodo.inicio)} al ${humanDate(r.periodo.fin)}</div></td>
                <td><div class="label">Días trabajados</div><div class="value">${r.resumen.diasTrabajados}</div></td>
              </tr>
            </table>
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
            <table class="summary-table">
              <tr>
                <td><div class="h">Total Horas</div><div class="v">${r.resumen.totalHoras}</div></td>
                <td><div class="h">Días Trabajados</div><div class="v">${r.resumen.diasTrabajados}</div></td>
                <td><div class="h">Promedio Diario</div><div class="v">${r.resumen.promedioHoras}</div></td>
              </tr>
            </table>
          </div>`;
      };
      const body = reportes.map((r, i) => `${renderReport(r)}${i < reportes.length - 1 ? '<div class="pb"></div>' : ''}`).join("");
      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${baseCSS}</style></head><body>${body}</body></html>`;
      const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = reportes.length === 1 ? `reporte_horas_${reportes[0].empleado?.id_empleado || "empleado"}.xls` : "reporte_horas_multiples.xls";
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
    try {
      setExporting("pdf");
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 12;
      const imgWidth = pageWidth - margin * 2;
      const blocks = Array.from(reportRef.current.querySelectorAll('[data-report-block="true"]'));
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
            body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,"Helvetica Neue";font-size:16px;color:#111827;background:#ffffff;margin:0;padding:0}
            .pdf-card{border:1px solid #e5e7eb;border-radius:8px;margin:18px 0;overflow:hidden}
            .pdf-header{background:#f3f4f6;padding:16px 20px}
            .pdf-header h2{margin:0;font-size:22px;font-weight:700}
            .pdf-header .date{font-size:13px;color:#6b7280;float:right}
            .pdf-divider{height:1px;background:#e5e7eb}
            .pdf-meta{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:14px;padding:16px 20px;border-bottom:1px solid #e5e7eb}
            .pdf-meta > div > .label{font-size:13px;color:#6b7280}
            .pdf-meta > div > .value{font-size:15px;font-weight:600}
            table{width:100%;border-collapse:collapse}
            thead th{background:#e5e7eb;color:#111827;font-weight:700;border:1px solid #e5e7eb;padding:12px;text-align:center;font-size:15px}
            tbody td{border:1px solid #e5e7eb;padding:12px;font-size:15px;line-height:1.45}
            tbody tr:nth-child(odd){background:#fafafa}
            .pdf-summary{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;padding:16px 20px;border-top:1px solid #e5e7eb;background:#f9fafb}
            .pdf-summary .tile{text-align:center}
            .pdf-summary .h{font-size:13px;color:#6b7280}
            .pdf-summary .v{font-size:26px;font-weight:700}
            .pdf-badge{display:inline-block;padding:4px 12px;border-radius:9999px;font-weight:700;font-size:13px;border:1px solid transparent}
            .pdf-badge--success{background:#DCFCE7;color:#166534;border-color:#86EFAC}
            .pdf-badge--danger{background:#FEE2E2;color:#991B1B;border-color:#FCA5A5}
            .pdf-badge--warning{background:#FEF9C3;color:#92400E;border-color:#FDE68A}
            .pdf-badge--info{background:#DBEAFE;color:#1E3A8A;border-color:#93C5FD}
          `;
          doc.head.appendChild(safeStyle);

          // 4) Mapear estructura de reporte a clases PDF y forzar badges
          const props = ['color','backgroundColor','borderColor','borderTopColor','borderRightColor','borderBottomColor','borderLeftColor','outlineColor','fill','stroke'];
          const SAFE = { color:'#111827', backgroundColor:'#ffffff', borderColor:'#e5e7eb', outlineColor:'#e5e7eb', fill:'#111827', stroke:'#111827' };
          const hasModern = (v) => v && (v.includes('oklch(') || v.includes('lab(') || v.startsWith('color(') || v.includes('color-mix('));
          const win = doc.defaultView || window;

          const blocks = Array.from(doc.querySelectorAll('[data-report-block="true"]'));
          for (const block of blocks) {
            block.classList.add('pdf-card');
            const header = block.querySelector('header');
            if (header) {
              header.classList.add('pdf-header');
              const title = header.querySelector('h2');
              if (title) title.outerHTML = `<h2>${title.textContent || ''}</h2>`;
              const date = header.querySelector('span');
              if (date) date.classList.add('date');
              const divider = header.querySelector('div');
              if (divider) divider.className = 'pdf-divider';
            }
            const sections = block.querySelectorAll('section');
            if (sections[0]) {
              sections[0].classList.add('pdf-meta');
              const items = sections[0].querySelectorAll(':scope > div');
              for (const it of items) {
                const label = it.firstElementChild; const value = it.lastElementChild;
                if (label) label.className = 'label';
                if (value) value.className = 'value';
              }
            }
            if (sections[2]) sections[2].classList.add('pdf-summary');

            const bodyRows = block.querySelectorAll('table tbody tr');
            for (const tr of bodyRows) {
              const tds = tr.children; if (!tds || tds.length < 5) continue;
              const tdEstado = tds[4];
              const text = (tdEstado.textContent || '').trim();
              const low = text.toLowerCase();
              let cls = 'pdf-badge--info';
              if (low === 'presente') cls = 'pdf-badge--success';
              else if (low === 'ausente') cls = 'pdf-badge--danger';
              else if (low === 'tarde') cls = 'pdf-badge--warning';
              else if (low === 'permiso' || low === 'vacaciones') cls = 'pdf-badge--info';
              tdEstado.style.textAlign = 'center';
              tdEstado.innerHTML = `<span class="pdf-badge ${cls}">${text}</span>`;
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
      for (const el of blocks.length ? blocks : [reportRef.current]) {
        const canvas = await html2canvas(el, captureOptions);
        const sliceHeight = (canvas.width * (pageHeight - margin * 2)) / imgWidth;
        let position = 0;
        while (position < canvas.height) {
          const slice = document.createElement("canvas");
          slice.width = canvas.width;
          slice.height = Math.min(sliceHeight, canvas.height - position);
          const ctx = slice.getContext("2d");
          ctx.drawImage(canvas, 0, position, canvas.width, slice.height, 0, 0, canvas.width, slice.height);
          const part = slice.toDataURL("image/png");
          if (!isFirst) pdf.addPage();
          pdf.addImage(part, "PNG", margin, margin, imgWidth, (slice.height * imgWidth) / canvas.width);
          position += slice.height;
          isFirst = false;
        }
      }
      const r0 = reportes[0];
      const filename = reportes.length === 1 ? `reporte_horas_${r0?.empleado?.id_empleado || "empleado"}.pdf` : `reporte_horas_multiples.pdf`;
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
    <div className="min-h-dvh bg-zinc-50 py-10">
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
                    <DialogContent className="sm:max-w-2xl">
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
                        <Button type="button" variant="secondary" onClick={() => setOpenSelector(false)}>Cancelar</Button>
                        <Button type="button" onClick={() => { setEmpleadoIds(tempEmpleadoIds); setOpenSelector(false); }}>Aplicar selección</Button>
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
                <Button onClick={handleGenerar} disabled={loading || (!multi && !empleadoId)} className="w-full">
                  {loading ? "Generando…" : "Generar Reporte"}
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button variant="outline" onClick={handleImprimir} className="gap-2">
                <Icon icon="lucide:printer" className="size-4" /> Imprimir
              </Button>
              <Button variant="default" onClick={handleExcel} className="gap-2" disabled={!reportes || reportes.length === 0 || exporting !== null}>
                <Icon icon="lucide:file-spreadsheet" className="size-4" /> Exportar Excel
              </Button>
              <Button variant="destructive" onClick={handleGuardarPDF} className="gap-2" disabled={!reportes || reportes.length === 0 || exporting !== null}>
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
                      <header className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <h2 className="text-xl font-semibold">Reporte de Horas Trabajadas</h2>
                          <span className="text-xs text-muted-foreground">Generado el {new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}</span>
                        </div>
                        <div className="h-px bg-zinc-200" />
                      </header>
                      <section className="grid grid-cols-1 md:grid-cols-4 gap-4 rounded-md border p-4">
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
                      <section className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          <thead className="sticky top-0 z-10">
                            <tr className="bg-zinc-100 text-zinc-700">
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
    </div>
  );
}


