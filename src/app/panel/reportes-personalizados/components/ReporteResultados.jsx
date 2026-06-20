// ReporteResultados.jsx
// Muestra los resultados de un reporte personalizado ejecutado.
// Incluye KPIs, badges de filtros activos, tabla paginada con agrupación
// y una sección HTML oculta para captura con html2canvas → jsPDF.
// Relacionado con: ReporteCard.jsx, pdfReportePersonalizado.js, useReportePersonalizado.js

"use client";

import { useMemo, useState, useEffect, useRef, forwardRef, useImperativeHandle, Fragment } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  BarChart3,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useSnackbar } from "notistack";
import { agruparFilas } from "@/hooks/useReportePersonalizado";
import { exportReportePersonalizadoPDF } from "@/lib/pdfReportePersonalizado";
import { fetchImageAsDataUrl } from "@/lib/pdfCompanyLogo";
import { fetcherWithToken } from "@/lib/fetcher";

const FILAS_POR_PAGINA = 25;

// ─────────────────────────────────────────────────────────────────────────────
// Badge de estado con colores semánticos
// ─────────────────────────────────────────────────────────────────────────────

function EstadoBadge({ value }) {
  if (!value || value === "—") return <span className="text-gray-400 text-xs">—</span>;
  const v = String(value).toLowerCase();
  let cls = "border-gray-200 bg-gray-50 text-gray-700";
  if (v === "presente") cls = "border-green-200 bg-green-50 text-green-700";
  else if (v === "ausente") cls = "border-red-200 bg-red-50 text-red-700";
  else if (v === "tardanza") cls = "border-yellow-200 bg-yellow-50 text-yellow-700";
  else if (v === "cerrado") cls = "border-blue-200 bg-blue-50 text-blue-700";
  else if (v === "abierto") cls = "border-orange-200 bg-orange-50 text-orange-700";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-semibold ${cls}`}>
      {value}
    </span>
  );
}

function CeldaValor({ colKey, value }) {
  const estadoKeys = ["estadoAsistencia", "estado"];
  if (estadoKeys.includes(colKey)) return <EstadoBadge value={value} />;
  if (!value || value === "—") return <span className="text-gray-400 text-xs">—</span>;
  return <span className="text-sm">{value}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sección HTML oculta para captura PDF
// ─────────────────────────────────────────────────────────────────────────────

const SeccionPDF = forwardRef(function SeccionPDF(
  { plantilla, filtros, agrupacion, grupos, empresa, logoDataUrl, pdfContainerWidth = 794 },
  ref,
) {
  const tipoLabel = plantilla.fuente === "asistencia" ? "Asistencia" : "Reloj Checador";
  const hoy = new Date().toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const totalRegistros = grupos.reduce((acc, g) => acc + g.filas.length, 0);
  const columnas = plantilla.columnas || [];

  return (
    <div
      ref={ref}
      data-pdf-root="true"
      style={{
        position: "fixed",
        top: "-99999px",
        left: "-99999px",
        width: `${pdfContainerWidth}px`,
        background: "#ffffff",
        padding: "32px 32px 24px 32px",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      }}
      aria-hidden="true"
    >
      {/* Topbar */}
      <div className="pdf-topbar">
        {/* Logo de la empresa o fallback textual si no hay imagen disponible */}
        {logoDataUrl ? (
          <img
            src={logoDataUrl}
            alt="Logo empresa"
            style={{ height: "32px", maxWidth: "130px", objectFit: "contain" }}
          />
        ) : (
          <div className="brand">HR360</div>
        )}
        <div className="right">
          <div className="title">{plantilla.nombre}</div>
          <div className="subtitle">
            {filtros.fechaInicio} — {filtros.fechaFin}
          </div>
        </div>
      </div>
      <div className="pdf-hr" />

      {/* Meta + KPIs */}
      <div className="pdf-meta-grid">
        <div className="pdf-meta-box">
          <div className="box-title">Información del reporte</div>
          <div className="row"><span className="label">Fuente</span><span className="value">{tipoLabel}</span></div>
          <div className="row"><span className="label">Empresa</span><span className="value">{empresa || "Todas"}</span></div>
          <div className="row"><span className="label">Desde</span><span className="value">{filtros.fechaInicio || "—"}</span></div>
          <div className="row"><span className="label">Hasta</span><span className="value">{filtros.fechaFin || "—"}</span></div>
          {filtros.empleado && <div className="row"><span className="label">Empleado</span><span className="value">{filtros.empleado}</span></div>}
          {filtros.departamento && <div className="row"><span className="label">Departamento</span><span className="value">{filtros.departamento}</span></div>}
          <div className="row"><span className="label">Generado</span><span className="value">{hoy}</span></div>
        </div>
        <div>
          <div className="pdf-meta-box" style={{ marginBottom: "8px" }}>
            <div className="box-title">Resumen</div>
          </div>
          <div className="pdf-kpi-grid">
            <div className="pdf-kpi-item"><div className="k-label">Registros</div><div className="k-value">{totalRegistros}</div></div>
            <div className="pdf-kpi-item"><div className="k-label">Grupos</div><div className="k-value">{grupos.length === 1 && !grupos[0].label ? "—" : grupos.length}</div></div>
            <div className="pdf-kpi-item"><div className="k-label">Columnas</div><div className="k-value">{columnas.length}</div></div>
          </div>
        </div>
      </div>

      {/* Tablas por grupo */}
      {grupos.map((grupo, gi) => (
        <div key={grupo.key ?? gi}>
          {grupo.label && (
            <div className="pdf-section-title">{grupo.label}</div>
          )}
          <table style={{ marginBottom: "12px" }}>
            <thead>
              <tr>{columnas.map((col) => <th key={col.key}>{col.label}</th>)}</tr>
            </thead>
            <tbody>
              {grupo.filas.map((fila, ri) => (
                <tr key={ri}>
                  {columnas.map((col) => <td key={col.key}>{fila[col.key] ?? "—"}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          {grupo.label && (
            <div style={{ fontSize: "8pt", color: "#6b7280", marginBottom: "10px", textAlign: "right" }}>
              Subtotal: {grupo.filas.length} registro{grupo.filas.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      ))}

      {/* Firmas */}
      <div className="pdf-signatures">
        <div className="slot"><div className="line" /><div className="label">Firma del responsable</div></div>
        <div className="slot"><div className="line" /><div className="label">Autorizado por</div></div>
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────

const ReporteResultados = forwardRef(function ReporteResultados({
  plantilla,
  filtros,
  agrupacion,
  datos,
  loading,
  error,
}, ref) {
  const [pagina, setPagina] = useState(1);
  const [exportandoPDF, setExportandoPDF] = useState(false);
  const [exportandoExcel, setExportandoExcel] = useState(false);
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const pdfRef = useRef(null);
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  // Precarga el logo de la empresa seleccionada (o el logo de la plataforma como fallback)
  // para incrustarlo en el encabezado del PDF capturado por html2canvas
  useEffect(() => {
    let alive = true;
    const run = async () => {
      let logoUrl = null;
      if (filtros?.empresa && filtros.empresa !== "all") {
        try {
          const resp = await fetcherWithToken(`/empresas/${filtros.empresa}`);
          logoUrl = resp?.url_imagen || null;
        } catch {
          logoUrl = null;
        }
      }
      const dataUrl = logoUrl
        ? await fetchImageAsDataUrl(logoUrl)
        : await fetchImageAsDataUrl("/assets/logo.png");
      if (alive) setLogoDataUrl(dataUrl || null);
    };
    run();
    return () => { alive = false; };
  }, [filtros?.empresa]);

  const columnas = plantilla?.columnas || [];
  const tipoLabel = plantilla?.fuente === "asistencia" ? "Asistencia" : "Reloj Checador";

  // Grupos de todas las filas
  const gruposTodos = useMemo(
    () => agruparFilas(datos || [], agrupacion),
    [datos, agrupacion],
  );

  const filasTodas = useMemo(
    () => gruposTodos.flatMap((g) => g.filas),
    [gruposTodos],
  );

  const totalPaginas = Math.max(1, Math.ceil(filasTodas.length / FILAS_POR_PAGINA));

  const gruposPaginados = useMemo(() => {
    const inicio = (pagina - 1) * FILAS_POR_PAGINA;
    const fin = inicio + FILAS_POR_PAGINA;
    let conteo = 0;
    const result = [];
    for (const grupo of gruposTodos) {
      const filasGrupo = [];
      for (const fila of grupo.filas) {
        if (conteo >= inicio && conteo < fin) filasGrupo.push(fila);
        conteo++;
      }
      if (filasGrupo.length > 0) result.push({ ...grupo, filas: filasGrupo });
    }
    return result;
  }, [gruposTodos, pagina]);

  // Empresa para el PDF — usa el nombre legible en lugar del ID numérico
  const empresaLabel = useMemo(() => {
    if (!filtros?.empresa || filtros.empresa === "all") return "Todas las empresas";
    return filtros.empresaNombre || String(filtros.empresa);
  }, [filtros]);

  // Badges de filtros activos
  const filtrosActivos = useMemo(() => {
    if (!filtros) return [];
    const badges = [];
    if (filtros.fechaInicio) badges.push(`Desde: ${filtros.fechaInicio}`);
    if (filtros.fechaFin) badges.push(`Hasta: ${filtros.fechaFin}`);
    if (filtros.empresa && filtros.empresa !== "all") badges.push(`Empresa: ${filtros.empresa}`);
    if (filtros.empleado) badges.push(`Empleado: ${filtros.empleado}`);
    if (filtros.departamento) badges.push(`Depto.: ${filtros.departamento}`);
    if (filtros.estadoAsistencia?.length) {
      const est = Array.isArray(filtros.estadoAsistencia)
        ? filtros.estadoAsistencia.join(", ")
        : filtros.estadoAsistencia;
      badges.push(`Estado: ${est}`);
    }
    if (filtros.estadoMovimiento?.length) {
      const est = Array.isArray(filtros.estadoMovimiento)
        ? filtros.estadoMovimiento.join(", ")
        : filtros.estadoMovimiento;
      badges.push(`Estado mov.: ${est}`);
    }
    return badges;
  }, [filtros]);

  // > 8 columnas → landscape automático; > 15 columnas → aviso de Excel
  const COLS_LANDSCAPE_THRESHOLD = 8;
  const COLS_WARNING_THRESHOLD = 15;

  const handleExportPDF = async () => {
    const numCols = columnas.length;
    const useLandscape = numCols > COLS_LANDSCAPE_THRESHOLD;

    if (numCols > COLS_WARNING_THRESHOLD) {
      enqueueSnackbar(
        `El reporte tiene ${numCols} columnas. Para mejor legibilidad considera exportar a Excel.`,
        { variant: "warning", autoHideDuration: 6000 },
      );
    }

    const snackKey = enqueueSnackbar(
      "Preparando PDF, esto puede tomar unos segundos...",
      { variant: "info", persist: true },
    );
    await exportReportePersonalizadoPDF({
      containerRef: pdfRef,
      tipoReporte: plantilla.fuente,
      filtros: filtros || {},
      landscape: useLandscape,
      onStart: () => setExportandoPDF(true),
      onEnd: (err) => {
        setExportandoPDF(false);
        closeSnackbar(snackKey);
        if (err) enqueueSnackbar("Error al generar el PDF.", { variant: "error" });
      },
    });
  };

  const handleExportExcel = async () => {
    setExportandoExcel(true);
    try {
      const { exportToExcel } = await import("@/utils/exportExcelJS");
      const excelColumns = columnas.map((col) => ({ header: col.label, key: col.key }));
      const excelRows = filasTodas.map((fila) => {
        const row = {};
        columnas.forEach((col) => { row[col.key] = fila[col.key] ?? "—"; });
        return row;
      });
      const nombre = `reporte_${plantilla.fuente}_${filtros?.fechaInicio || ""}_${filtros?.fechaFin || ""}`;
      await exportToExcel(excelRows, excelColumns, nombre, {
        sheetName: tipoLabel,
        headerColor: "FF2563EB",
      });
    } catch (e) {
      console.error("[ReporteResultados] exportExcel:", e);
    } finally {
      setExportandoExcel(false);
    }
  };

  // Expone funciones de exportación al componente padre vía ref
  useImperativeHandle(ref, () => ({
    exportPDF: handleExportPDF,
    exportExcel: handleExportExcel,
  }));

  // ── Estado de carga ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
        <p className="text-sm text-gray-500">Generando reporte...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <AlertCircle className="h-8 w-8 text-red-400" />
        <p className="text-sm text-gray-700 font-medium">{error}</p>
      </div>
    );
  }

  if (!datos || datos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <BarChart3 className="h-10 w-10 text-gray-300" />
        <p className="text-sm text-gray-500">
          No se encontraron registros con los filtros aplicados.
        </p>
        <p className="text-xs text-gray-400">Ajusta el rango de fechas o los filtros y ejecuta nuevamente.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      {/* Sección PDF invisible para captura */}
      <SeccionPDF
        ref={pdfRef}
        plantilla={plantilla}
        filtros={filtros || {}}
        agrupacion={agrupacion}
        grupos={gruposTodos}
        empresa={empresaLabel}
        logoDataUrl={logoDataUrl}
        pdfContainerWidth={columnas.length > 8 ? 1123 : 794}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total registros", value: filasTodas.length },
          { label: "Grupos", value: gruposTodos[0]?.label ? gruposTodos.length : "—" },
          { label: "Columnas", value: columnas.length },
          { label: "Páginas est.", value: Math.ceil(filasTodas.length / 40) || 1 },
        ].map((kpi) => (
          <Card key={kpi.label} className="shadow-none border-gray-200">
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{kpi.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros activos + acciones de exportar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5 items-center">
          {filtrosActivos.length > 0 && (
            <>
              <Filter className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
              {filtrosActivos.map((f) => (
                <Badge key={f} variant="secondary" className="text-xs font-normal">
                  {f}
                </Badge>
              ))}
            </>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={exportandoExcel}
            className="border-green-300 text-green-700 hover:bg-green-50"
          >
            {exportandoExcel ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
            Excel
          </Button>
          <Button
            size="sm"
            onClick={handleExportPDF}
            disabled={exportandoPDF}
            className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white"
          >
            {exportandoPDF ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
            PDF
          </Button>
        </div>
      </div>

      {/* Tabla de resultados */}
      <Card className="shadow-sm border-gray-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-600 font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-500" />
            {plantilla.nombre}
            <span className="font-normal text-gray-400 text-xs ml-1">
              ({(pagina - 1) * FILAS_POR_PAGINA + 1}–
              {Math.min(pagina * FILAS_POR_PAGINA, filasTodas.length)} de {filasTodas.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto rounded-b-xl">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-800 hover:bg-gray-800">
                  {columnas.map((col) => (
                    <TableHead
                      key={col.key}
                      className="text-white font-bold text-xs whitespace-nowrap px-3 py-2.5"
                    >
                      {col.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {gruposPaginados.map((grupo, gi) => (
                  <Fragment key={grupo.key ?? `grupo-${gi}`}>
                    {grupo.label && (
                      <TableRow className="bg-blue-50 hover:bg-blue-50">
                        <TableCell
                          colSpan={columnas.length}
                          className="py-2 px-3 text-xs font-bold text-blue-700 border-l-4 border-blue-400"
                        >
                          {grupo.label}
                          <span className="ml-2 font-normal text-blue-500">
                            ({grupo.filas.length} registro{grupo.filas.length !== 1 ? "s" : ""})
                          </span>
                        </TableCell>
                      </TableRow>
                    )}
                    {grupo.filas.map((fila, ri) => (
                      <TableRow
                        key={`${gi}-${ri}`}
                        className={ri % 2 === 0 ? "bg-white" : "bg-gray-50/60"}
                      >
                        {columnas.map((col) => (
                          <TableCell key={col.key} className="px-3 py-2 text-sm whitespace-nowrap">
                            <CeldaValor colKey={col.key} value={fila[col.key]} />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            disabled={pagina === 1}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-600">
            Página <span className="font-bold">{pagina}</span> de {totalPaginas}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            disabled={pagina === totalPaginas}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
});

export default ReporteResultados;
