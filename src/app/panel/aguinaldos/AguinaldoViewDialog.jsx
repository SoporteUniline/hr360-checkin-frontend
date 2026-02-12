"use client";

/**
 * Componente Dialog para ver el detalle completo de un cálculo de aguinaldo
 * - Relación: usado en `src/app/panel/aguinaldos/page.jsx`
 * - API: `src/lib/aguinaldosApi.js`
 */

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { aguinaldosApi } from "@/lib/aguinaldosApi";
import dayjs from "dayjs";
import { jsPDF } from "jspdf";
import { useAuth } from "@/context/AuthContext";
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
import { Download, FileText } from "lucide-react";

export default function AguinaldoViewDialog({ open, setOpen, id, onEstadoActualizado }) {
  const { dataUser } = useAuth();
  const idEmpresa = dataUser?.id_empresa;

  /**
   * Datos de empresa para logo/marca en el PDF (misma ruta usada en otros módulos).
   * - Relación: el logo se gestiona en `src/app/panel/cuenta/Empresa/ImagenEmpresa.jsx`.
   */
  const { data: empresaData } = useSWR(
    idEmpresa ? `/empresas/${idEmpresa}` : null,
    fetcherWithToken,
    swr_config
  );

  /**
   * Logo precargado como DataURL para `jsPDF.addImage` dentro del layout unificado.
   * - Fallback garantizado al logo local `/assets/logo.png`.
   */
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  useEffect(() => {
    let alive = true;
    const run = async () => {
      const companyUrl = empresaData?.url_imagen;
      const companyDataUrl = companyUrl ? await fetchImageAsDataUrl(companyUrl) : null;
      const fallbackDataUrl = companyDataUrl ? null : await fetchImageAsDataUrl("/assets/logo.png");
      if (alive) setLogoDataUrl(companyDataUrl || fallbackDataUrl || null);
    };
    run();
    return () => {
      alive = false;
    };
  }, [empresaData?.url_imagen]);

  const [detalle, setDetalle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actualizandoEstados, setActualizandoEstados] = useState({}); // { id_aguinaldo: true }

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!open || !id) return;
      setLoading(true);
      try {
        const data = await aguinaldosApi.detalle(id);
        if (active) setDetalle(data);
      } catch (error) {
        console.error("Error al cargar detalle:", error);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [open, id]);

  if (!detalle) return null;

  const maestro = detalle.maestro;
  const aguinaldos = detalle.aguinaldos || [];

  let completos = 0;
  let proporcionales = 0;

  aguinaldos.forEach((ag) => {
    if (ag.es_proporcional) {
      proporcionales++;
    } else {
      completos++;
    }
  });

  /**
   * PDF unificado (formato nuevo) - Nómina de Aguinaldos (masivo).
   * - Relación:
   *   - Reemplaza visualmente el estilo anterior con el mismo formato de Permisos/Mapa de Rutas.
   *   - Se dispara desde el botón del footer de este diálogo ("Descargar PDF").
   * - Nota: NO se elimina `generarPDF` anterior; se mantiene como referencia.
   */
  const generarPDFFormatoNuevo = () => {
    if (!detalle) return;

    const doc = new jsPDF("p", "mm", "a4");
    const ctx = createPdfContext({ doc });

    const companyName = empresaData?.nombre_empresa || dataUser?.empresa?.nombre_empresa || "";
    const totalGeneral = fmtMoneyMXN(maestro.total_general);

    drawHeaderBox(ctx, {
      title: "Nómina de Aguinaldos",
      linesLeft: [
        `Cálculo: #${String(maestro.id_calculo || "").padStart(3, "0")}`,
        `Año fiscal: ${maestro.año_fiscal || "—"}`,
        `Fecha corte: ${dayjs(maestro.fecha_corte).format("DD/MM/YYYY")}`,
      ],
      kpiLabel: "Total general",
      kpiValue: String(totalGeneral).replace(" MXN", ""),
      companyName,
      logoDataUrl,
    });

    drawKeyValueBox(ctx, {
      title: "Resumen",
      rows: [
        ["Total empleados", maestro.total_empleados ?? "—"],
        ["Completos", completos],
        ["Proporcionales", proporcionales],
        ["Generado", new Date().toLocaleString("es-MX", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })],
      ],
    });

    // Tabla (multi-página) con estilo simple y claro
    const { margin, contentWidth, pageHeight, pageWidth } = ctx;
    const cols = [
      { key: "nombre", title: "Empleado", w: 62 },
      { key: "puesto", title: "Puesto", w: 36 },
      { key: "ingreso", title: "Ingreso", w: 22 },
      { key: "dias", title: "Días", w: 16 },
      { key: "tipo", title: "Tipo", w: 18 },
      { key: "monto", title: "Monto", w: 28 },
    ];
    // Ajuste por si cambia el margen: asegurar que suma exacta
    const sumW = cols.reduce((a, c) => a + c.w, 0);
    if (sumW !== contentWidth) {
      // Distribuir diferencia al primer campo (Empleado) para evitar desbordes
      cols[0].w += contentWidth - sumW;
    }

    const headerH = 8;
    const rowH = 7;
    const drawTableHeader = () => {
      doc.setLineWidth(0.8);
      doc.rect(margin, ctx.y, contentWidth, headerH, "S");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      let x = margin;
      cols.forEach((c) => {
        doc.text(c.title, x + 2, ctx.y + 5.5);
        x += c.w;
        doc.line(x, ctx.y, x, ctx.y + headerH);
      });
      ctx.y += headerH;
    };

    const drawRow = (r, idx) => {
      doc.setLineWidth(0.3);
      doc.rect(margin, ctx.y, contentWidth, rowH, "S");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      let x = margin;
      const v = {
        nombre: String(r.nombre_completo || "").slice(0, 40),
        puesto: String(r.puesto || "N/A").slice(0, 22),
        ingreso: r.fecha_ingreso ? dayjs(r.fecha_ingreso).format("DD/MM/YYYY") : "—",
        dias: Number(r.dias_aguinaldo_calculado || 0).toFixed(2),
        tipo: r.es_proporcional ? "Prop." : "Comp.",
        monto: `$${Number(r.monto_aguinaldo || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
      };
      cols.forEach((c, ci) => {
        const text = v[c.key];
        if (c.key === "monto") {
          doc.setFont("helvetica", "bold");
          doc.text(text, x + c.w - 2, ctx.y + 5, { align: "right" });
          doc.setFont("helvetica", "normal");
        } else {
          doc.text(text, x + 2, ctx.y + 5);
        }
        x += c.w;
        if (ci < cols.length - 1) doc.line(x, ctx.y, x, ctx.y + rowH);
      });
      ctx.y += rowH;
    };

    // Título sección + header tabla
    drawKeyValueBox(ctx, {
      title: "Detalle por empleado",
      rows: [
        ["Nota", "El monto mostrado corresponde al aguinaldo calculado para cada empleado."],
      ],
    });
    drawTableHeader();

    (aguinaldos || []).forEach((r, idx) => {
      // Reservar firmas/footer
      ensureSpace(ctx, rowH + 4);
      drawRow(r, idx);
      // Saltar encabezado si se crea nueva página
      if (ctx.y > pageHeight - ctx.margin - 70) {
        doc.addPage();
        ctx.y = ctx.margin;
        drawTableHeader();
      }
    });

    drawSignaturesAndFooter(doc, {
      empleadoName: "", // nómina: no es de un solo empleado
      empresaLabel: companyName || "Uniline Innovacion en la Nube",
      footerLeft: "Sistema HR360",
    });

    const nombreArchivo = `Nomina_Aguinaldos_${maestro.año_fiscal || "NA"}_${String(maestro.id_calculo || "").padStart(3, "0")}.pdf`;
    doc.save(nombreArchivo.replace(/\s+/g, "_"));
  };

  /**
   * PDF unificado (formato nuevo) - Recibo individual.
   * - Relación: se usa desde la tabla (botón por empleado) dentro de este diálogo.
   */
  const generarPDFIndividualFormatoNuevo = (ag) => {
    if (!ag || !detalle) return;

    const doc = new jsPDF("p", "mm", "a4");
    const ctx = createPdfContext({ doc });

    const companyName = empresaData?.nombre_empresa || dataUser?.empresa?.nombre_empresa || "";
    const empleado = ag.nombre_completo || "Empleado";
    const total = fmtMoneyMXN(ag.monto_aguinaldo);

    drawHeaderBox(ctx, {
      title: "Recibo de Aguinaldo",
      linesLeft: [
        `Empleado: ${empleado}`,
        `Año fiscal: ${maestro.año_fiscal || "—"}`,
        `Fecha corte: ${dayjs(maestro.fecha_corte).format("DD/MM/YYYY")}`,
      ],
      kpiLabel: "Total a pagar",
      kpiValue: String(total).replace(" MXN", ""),
      companyName,
      logoDataUrl,
    });

    drawKeyValueBox(ctx, {
      title: "Información del empleado",
      rows: [
        ["Puesto", ag.puesto || "N/A"],
        ["Departamento", ag.departamento || "N/A"],
        ["Fecha ingreso", ag.fecha_ingreso ? dayjs(ag.fecha_ingreso).format("DD/MM/YYYY") : "—"],
        ["Años trabajados", Number(ag.años_trabajados || 0).toFixed(2)],
      ],
    });

    // Detalle del cálculo: valores alineados a la derecha para evitar que labels largos se encimen.
    drawRightValueRowsBox(ctx, {
      title: "Detalle del cálculo",
      rows: [
        ["Salario diario", `$${Number(ag.salario_diario || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`],
        ["Días aguinaldo (Ley)", Number(ag.dias_aguinaldo_ley || 0).toFixed(2)],
        ["Días aguinaldo calculado", Number(ag.dias_aguinaldo_calculado || 0).toFixed(2)],
        ["Tipo", ag.es_proporcional ? "Proporcional" : "Completo"],
      ],
    });

    drawMultilineBox(ctx, {
      title: "Observaciones",
      text: maestro.observaciones || "—",
    });

    drawSignaturesAndFooter(doc, {
      empleadoName: empleado,
      empresaLabel: companyName || "Uniline Innovacion en la Nube",
      footerLeft: "Sistema HR360",
    });

    const nombreArchivo = `Aguinaldo_${maestro.año_fiscal || "NA"}_${String(empleado).replace(/\s+/g, "_")}.pdf`;
    doc.save(nombreArchivo);
  };

  const generarPDF = () => {
    if (!detalle) return;

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
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
    doc.text("Fecha: " + new Date().toLocaleDateString("es-MX"), margenDer, 20, { align: "right" });

    y = 45;
    doc.setTextColor(55, 73, 94);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("NÓMINA DE AGUINALDOS " + maestro.año_fiscal, 105, y, { align: "center" });

    y += 10;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Fecha de Corte: " + dayjs(maestro.fecha_corte).format("DD/MM/YYYY"), margenIzq, y);
    doc.text("Total Empleados: " + maestro.total_empleados, margenDer, y, { align: "right" });

    y += 8;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1);
    doc.rect(margenIzq, y, margenDer - margenIzq, 10);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL GENERAL A PAGAR:", margenIzq + 2, y + 6.5);
    doc.setFontSize(14);
    doc.text(
      "$" + parseFloat(maestro.total_general).toLocaleString("es-MX", { minimumFractionDigits: 2 }) + " MXN",
      margenDer - 2,
      y + 6.5,
      { align: "right" }
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

    aguinaldos.forEach((emp, idx) => {
      if (y > 270) {
        // Nueva página si es necesario
        doc.addPage();
        y = 20;
      }

      doc.text((idx + 1).toString(), margenIzq + 2, y);
      doc.text(emp.nombre_completo.substring(0, 25), margenIzq + 8, y);
      doc.text((emp.puesto || "N/A").substring(0, 15), margenIzq + 50, y);
      doc.text(dayjs(emp.fecha_ingreso).format("DD/MM/YYYY"), margenIzq + 75, y);
      doc.text(parseFloat(emp.años_trabajados).toFixed(2), margenIzq + 95, y);
      doc.text("$" + parseFloat(emp.salario_diario).toLocaleString("es-MX", { minimumFractionDigits: 2 }), margenIzq + 105, y);
      doc.text(parseFloat(emp.dias_aguinaldo_calculado).toFixed(2), margenIzq + 125, y);
      doc.text(emp.es_proporcional ? "Prop." : "Comp.", margenIzq + 135, y);
      doc.setFont("helvetica", "bold");
      doc.text("$" + parseFloat(emp.monto_aguinaldo).toLocaleString("es-MX", { minimumFractionDigits: 2 }), margenDer - 2, y, { align: "right" });
      doc.setFont("helvetica", "normal");

      y += 5;
      // Línea separadora más sutil entre filas
      if (idx < aguinaldos.length - 1) {
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.3);
        doc.line(margenIzq, y, margenDer, y);
        y += 2;
      }
    });

    const nombreArchivo = "Nomina_Aguinaldos_" + maestro.año_fiscal + "_" + maestro.id_calculo + ".pdf";
    doc.save(nombreArchivo);
  };

  // Función para generar PDF individual de un empleado
  // - Relación: genera un PDF solo con la información del empleado específico
  // - Importante: cada empleado recibe solo su información, no la de otros
  const generarPDFIndividual = (ag) => {
    if (!ag || !detalle) return;

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
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
    doc.text("Fecha: " + new Date().toLocaleDateString("es-MX"), margenDer, 20, { align: "right" });

    y = 45;
    doc.setTextColor(55, 73, 94);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("RECIBO DE AGUINALDO " + maestro.año_fiscal, 105, y, { align: "center" });

    y += 10;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.text("Fecha de Corte: " + dayjs(maestro.fecha_corte).format("DD/MM/YYYY"), margenIzq, y);

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
    doc.text("Nombre: " + ag.nombre_completo, margenIzq, y);
    y += 6;
    doc.text("Puesto: " + (ag.puesto || "N/A"), margenIzq, y);
    y += 6;
    doc.text("Departamento: " + (ag.departamento || "N/A"), margenIzq, y);
    y += 6;
    doc.text("Fecha de Ingreso: " + dayjs(ag.fecha_ingreso).format("DD/MM/YYYY"), margenIzq, y);
    y += 6;
    doc.text("Años Trabajados: " + parseFloat(ag.años_trabajados).toFixed(2) + " años", margenIzq, y);
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
    doc.text("Salario Diario: $" + parseFloat(ag.salario_diario).toLocaleString("es-MX", { minimumFractionDigits: 2 }), margenIzq, y);
    y += 6;
    doc.text("Días Aguinaldo (Ley): " + parseFloat(ag.dias_aguinaldo_ley).toFixed(2) + " días", margenIzq, y);
    y += 6;
    doc.text("Días Aguinaldo Calculado: " + parseFloat(ag.dias_aguinaldo_calculado).toFixed(2) + " días", margenIzq, y);
    y += 6;
    doc.text("Tipo: " + (ag.es_proporcional ? "Proporcional" : "Completo"), margenIzq, y);
    y += 6;
    if (parseFloat(ag.dias_no_trabajados) > 0) {
      doc.text("Días No Trabajados: " + parseFloat(ag.dias_no_trabajados).toFixed(2) + " días", margenIzq, y);
      y += 6;
    }
    doc.text("Días Trabajados: " + parseFloat(ag.dias_trabajados).toFixed(2) + " días", margenIzq, y);
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
      "$" + parseFloat(ag.monto_aguinaldo).toLocaleString("es-MX", { minimumFractionDigits: 2 }) + " MXN",
      margenDer - 2,
      y + 7,
      { align: "right" }
    );

    const nombreArchivo = "Aguinaldo_" + maestro.año_fiscal + "_" + (ag.nombre_completo || "Empleado").replace(/\s+/g, "_") + ".pdf";
    doc.save(nombreArchivo);
  };

  // Función para actualizar el estado individual de un aguinaldo
  // - Relación: actualiza el estado de un empleado específico sin afectar a los demás
  const actualizarEstadoIndividual = async (idAguinaldo, nuevoEstado) => {
    if (!idAguinaldo || !nuevoEstado) return;

    setActualizandoEstados((prev) => ({ ...prev, [idAguinaldo]: true }));
    try {
      await aguinaldosApi.actualizarEstadoIndividual(idAguinaldo, nuevoEstado);
      
      // Actualizar el estado en el detalle local
      setDetalle((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          aguinaldos: prev.aguinaldos.map((ag) =>
            ag.id_aguinaldo === idAguinaldo ? { ...ag, estado: nuevoEstado } : ag
          ),
        };
      });

      // Notificar al componente padre si hay callback
      if (onEstadoActualizado) {
        onEstadoActualizado();
      }
    } catch (error) {
      console.error("Error al actualizar estado individual:", error);
      alert("Error al actualizar el estado. Por favor, intenta de nuevo.");
    } finally {
      setActualizandoEstados((prev) => {
        const nuevo = { ...prev };
        delete nuevo[idAguinaldo];
        return nuevo;
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Modal responsivo:
         - max-w-[95vw]: ocupa el 95% del ancho en móviles
         - sm:max-w-lg: pantallas pequeñas
         - md:max-w-2xl: pantallas medianas
         - lg:max-w-4xl: pantallas grandes
         - xl:max-w-5xl: pantallas extra grandes
         - max-h-[85vh]: altura máxima con scroll interno
         Relación: usado en `src/app/panel/aguinaldos/page.jsx` */}
      <DialogContent className="max-w-[95vw] sm:max-w-2xl md:max-w-4xl xl:max-w-5xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        {/* Header - patrón Contratos */}
        <DialogHeader className="p-0 flex-shrink-0">
          <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white p-6">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-white text-xl font-bold truncate">
                  Nómina de aguinaldos #{String(maestro.id_calculo || "").padStart(3, "0")}
                </DialogTitle>
                <DialogDescription className="text-sm text-indigo-100 truncate">
                  Año fiscal: {maestro.año_fiscal} · Fecha corte: {dayjs(maestro.fecha_corte).format("DD/MM/YYYY")}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="py-6 text-sm text-muted-foreground">Cargando...</div>
          ) : detalle ? (
            <div className="space-y-4 text-sm">
              {/* Estadísticas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                <div className="bg-white border border-[#e5e7eb] rounded-lg p-3 sm:p-4 shadow-[0_2px_10px_rgba(17,24,39,0.04)]">
                  <div className="text-[10px] sm:text-xs text-[#6b7280] font-semibold uppercase tracking-wider">Total Empleados</div>
                  <div className="text-xl sm:text-2xl font-bold text-[#37495E] mt-1">{maestro.total_empleados}</div>
                </div>
                <div className="bg-white border border-[#e5e7eb] rounded-lg p-3 sm:p-4 shadow-[0_2px_10px_rgba(17,24,39,0.04)]">
                  <div className="text-[10px] sm:text-xs text-[#6b7280] font-semibold uppercase tracking-wider">Aguinaldos Completos</div>
                  <div className="text-xl sm:text-2xl font-bold text-[#065f46] mt-1">{completos}</div>
                </div>
                <div className="bg-white border border-[#e5e7eb] rounded-lg p-3 sm:p-4 shadow-[0_2px_10px_rgba(17,24,39,0.04)] sm:col-span-2 md:col-span-1">
                  <div className="text-[10px] sm:text-xs text-[#6b7280] font-semibold uppercase tracking-wider">Aguinaldos Proporcionales</div>
                  <div className="text-xl sm:text-2xl font-bold text-[#92400e] mt-1">{proporcionales}</div>
                </div>
              </div>

              {/* Total General */}
              <div className="bg-gradient-to-r from-[#2563EB] to-[#1d4ed8] text-white p-4 sm:p-6 rounded-xl text-center shadow-sm">
                <div className="text-xs sm:text-sm uppercase tracking-wider mb-2 opacity-90 font-bold">Total general a pagar</div>
                <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold break-words">
                  ${parseFloat(maestro.total_general).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
                </div>
              </div>

              {/* Información del cálculo */}
              <div className="bg-[#f8fafc] p-3 sm:p-4 rounded-lg border border-[#e5e7eb]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                  <div>
                    <span className="font-semibold">Año Fiscal:</span> {maestro.año_fiscal}
                  </div>
                  <div>
                    <span className="font-semibold">Fecha de Corte:</span> {dayjs(maestro.fecha_corte).format("DD/MM/YYYY")}
                  </div>
                  <div>
                    <span className="font-semibold">Fecha de Cálculo:</span> {dayjs(maestro.fecha_calculo).format("DD/MM/YYYY HH:mm")}
                  </div>
                  <div>
                    <span className="font-semibold">Estado:</span>{" "}
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                        maestro.estado === "Pagado"
                          ? "bg-[#d1fae5] text-[#065f46]"
                          : maestro.estado === "Cancelado"
                          ? "bg-[#fee2e2] text-[#991b1b]"
                          : "bg-[#fef3c7] text-[#92400e]"
                      }`}
                    >
                      {maestro.estado}
                    </span>
                  </div>
                  {maestro.observaciones && (
                    <div className="md:col-span-2">
                      <span className="font-semibold">Observaciones:</span> {maestro.observaciones}
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <span className="font-semibold">Calculado por:</span> {maestro.calculado_por?.split("@")[0] || "N/A"}
                  </div>
                </div>
              </div>

              {/* Tabla de aguinaldos */}
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-2">Detalle por empleado</h4>
                <div className="overflow-x-auto rounded-md border border-gray-200">
                  <div className="min-w-full inline-block">
                    <table className="w-full text-[10px] sm:text-xs md:text-sm min-w-[800px]">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-1.5 sm:p-2 whitespace-nowrap">Empleado</th>
                          <th className="text-left p-1.5 sm:p-2 whitespace-nowrap">Puesto</th>
                          <th className="text-left p-1.5 sm:p-2 whitespace-nowrap">F. Ingreso</th>
                          <th className="text-left p-1.5 sm:p-2 whitespace-nowrap">Años</th>
                          <th className="text-left p-1.5 sm:p-2 whitespace-nowrap">Salario</th>
                          <th className="text-left p-1.5 sm:p-2 whitespace-nowrap">Días</th>
                          <th className="text-left p-1.5 sm:p-2 whitespace-nowrap">Tipo</th>
                          <th className="text-left p-1.5 sm:p-2 whitespace-nowrap">Monto</th>
                          <th className="text-left p-1.5 sm:p-2 whitespace-nowrap">Estado</th>
                          <th className="text-left p-1.5 sm:p-2 whitespace-nowrap">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aguinaldos.map((ag) => (
                          <tr key={ag.id_aguinaldo} className="border-t">
                            <td className="p-1.5 sm:p-2">
                              <strong className="break-words">{ag.nombre_completo}</strong>
                            </td>
                            <td className="p-1.5 sm:p-2 whitespace-nowrap">{ag.puesto || "Sin puesto"}</td>
                            <td className="p-1.5 sm:p-2 whitespace-nowrap">{dayjs(ag.fecha_ingreso).format("DD/MM/YYYY")}</td>
                            <td className="p-1.5 sm:p-2 whitespace-nowrap">{parseFloat(ag.años_trabajados).toFixed(2)} años</td>
                            <td className="p-1.5 sm:p-2 whitespace-nowrap">${parseFloat(ag.salario_diario).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                            <td className="p-1.5 sm:p-2 whitespace-nowrap">{parseFloat(ag.dias_aguinaldo_calculado).toFixed(2)}</td>
                            <td className="p-1.5 sm:p-2 whitespace-nowrap">
                              {ag.es_proporcional ? (
                                <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-xs font-bold uppercase bg-[#fef3c7] text-[#92400e]">
                                  Prop.
                                </span>
                              ) : (
                                <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-xs font-bold uppercase bg-[#d1fae5] text-[#065f46]">
                                  Comp.
                                </span>
                              )}
                            </td>
                            <td className="p-1.5 sm:p-2 font-bold whitespace-nowrap">
                              ${parseFloat(ag.monto_aguinaldo).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-1.5 sm:p-2 whitespace-nowrap">
                              <Select
                                value={ag.estado || "Pendiente"}
                                onValueChange={(nuevoEstado) => {
                                  actualizarEstadoIndividual(ag.id_aguinaldo, nuevoEstado);
                                }}
                                disabled={actualizandoEstados[ag.id_aguinaldo]}
                              >
                                <SelectTrigger className="h-7 sm:h-8 text-[9px] sm:text-xs w-20 sm:w-24">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Pendiente">Pendiente</SelectItem>
                                  <SelectItem value="Pagado">Pagado</SelectItem>
                                  <SelectItem value="Cancelado">Cancelado</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-1.5 sm:p-2 whitespace-nowrap">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => generarPDFIndividualFormatoNuevo(ag)}
                                className="text-[9px] sm:text-xs h-7 sm:h-8 px-2 border-gray-300"
                                title="Generar PDF individual para este empleado"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                PDF
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-sm text-muted-foreground">Sin información.</div>
          )}
        </div>

        {/* Footer con botones - Responsivo */}
        <DialogFooter className="bg-gray-50 p-4 flex flex-col-reverse sm:flex-row justify-end gap-2 flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="w-full sm:w-auto border-gray-300"
          >
            Cerrar
          </Button>
          <Button
            onClick={generarPDFFormatoNuevo}
            disabled={!detalle}
            className="w-full sm:w-auto bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-sm disabled:opacity-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Descargar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

