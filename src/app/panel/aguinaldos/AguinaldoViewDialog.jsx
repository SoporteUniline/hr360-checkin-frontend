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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { aguinaldosApi } from "@/lib/aguinaldosApi";
import dayjs from "dayjs";
import { jsPDF } from "jspdf";
import { useAuth } from "@/context/AuthContext";
import useSWR from "swr";
import { fetcherWithToken, swr_config } from "@/lib/fetcher";
import { fetchImageAsDataUrl } from "@/lib/pdfCompanyLogo";
import { Download, FileText } from "lucide-react";

export default function AguinaldoViewDialog({
  open,
  setOpen,
  id,
  onEstadoActualizado,
}) {
  const { dataUser } = useAuth();
  const idEmpresa = dataUser?.id_empresa;

  /**
   * Datos de empresa para logo/marca en el PDF (misma ruta usada en otros módulos).
   * - Relación: el logo se gestiona en `src/app/panel/cuenta/Empresa/ImagenEmpresa.jsx`.
   */
  const { data: empresaData } = useSWR(
    idEmpresa ? `/empresas/${idEmpresa}` : null,
    fetcherWithToken,
    swr_config,
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
      `$${Number(value || 0).toLocaleString("es-MX", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    const hRule = (yPos, width = contentWidth, lineWidth = 0.3) => {
      doc.setDrawColor(0);
      doc.setLineWidth(lineWidth);
      doc.line(marginLeft, yPos, marginLeft + width, yPos);
    };
    const sectionTitle = (text) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(0);
      doc.text(String(text || "").toUpperCase(), marginLeft, y + 5);
      hRule(y + 7, contentWidth, 0.5);
      y += 12;
    };

    const companyName =
      safe(empresaData?.nombre_empresa || dataUser?.empresa?.nombre_empresa) ||
      "ADAMIA Human Resources";
    const totalGeneral = money(maestro.total_general);
    const anioFiscal = safe(maestro.año_fiscal || "—");
    const fechaCorte = maestro.fecha_corte
      ? dayjs(maestro.fecha_corte).format("DD/MM/YYYY")
      : "—";

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
    doc.text("AGUINALDOS", pageWidth - marginRight, y + 7, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Anio fiscal ${anioFiscal}`, pageWidth - marginRight, y + 13, {
      align: "right",
    });

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
    doc.text("EMPLEADOS", marginLeft, y + 3);
    doc.text("FECHA CORTE", marginLeft + col, y + 3);
    doc.text("PROPORCIONALES", marginLeft + col * 2, y + 3);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(String(maestro.total_empleados ?? aguinaldos.length), marginLeft, y + 9);
    doc.text(fechaCorte, marginLeft + col, y + 9);
    doc.text(String(proporcionales), marginLeft + col * 2, y + 9);

    const boxX = marginLeft + metaWidth + boxGap;
    const boxY = y - 1;
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(boxX, boxY, boxWidth, 18, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(totalGeneral.replace("$", ""), boxX + boxWidth / 2, boxY + 9, {
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

    sectionTitle("Resumen");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Completos: ${completos}`, marginLeft, y);
    doc.text(`Proporcionales: ${proporcionales}`, marginLeft + 55, y);
    doc.text(`Total: ${maestro.total_empleados ?? aguinaldos.length}`, marginLeft + 110, y);
    y += 10;
    hRule(y, contentWidth, 0.2);
    y += 8;

    sectionTitle("Detalle por empleado");
    const cols = [
      { key: "nombre", title: "Empleado", w: 58 },
      { key: "puesto", title: "Puesto", w: 32 },
      { key: "ingreso", title: "Ingreso", w: 22 },
      { key: "dias", title: "Dias", w: 14 },
      { key: "tipo", title: "Tipo", w: 18 },
      { key: "monto", title: "Monto", w: 26 },
    ];
    const totalW = cols.reduce((a, c) => a + c.w, 0);
    if (totalW !== contentWidth) cols[0].w += contentWidth - totalW;
    const headerH = 8;
    const rowH = 7;
    const drawTableHeader = () => {
      doc.setLineWidth(0.8);
      doc.rect(marginLeft, y, contentWidth, headerH, "S");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      let x = marginLeft;
      cols.forEach((c) => {
        doc.text(c.title, x + 2, y + 5.5);
        x += c.w;
        doc.line(x, y, x, y + headerH);
      });
      y += headerH;
    };
    const drawRow = (r) => {
      doc.setLineWidth(0.25);
      doc.rect(marginLeft, y, contentWidth, rowH, "S");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      let x = marginLeft;
      const v = {
        nombre: safe(r.nombre_completo || "—").slice(0, 38),
        puesto: safe(r.puesto || "N/A").slice(0, 20),
        ingreso: r.fecha_ingreso ? dayjs(r.fecha_ingreso).format("DD/MM/YYYY") : "—",
        dias: Number(r.dias_aguinaldo_calculado || 0).toFixed(2),
        tipo: r.es_proporcional ? "Prop." : "Comp.",
        monto: money(r.monto_aguinaldo),
      };
      cols.forEach((c, idx) => {
        if (c.key === "monto") {
          doc.setFont("helvetica", "bold");
          doc.text(v[c.key], x + c.w - 2, y + 5, { align: "right" });
          doc.setFont("helvetica", "normal");
        } else {
          doc.text(v[c.key], x + 2, y + 5);
        }
        x += c.w;
        if (idx < cols.length - 1) doc.line(x, y, x, y + rowH);
      });
      y += rowH;
    };

    drawTableHeader();
    (aguinaldos || []).forEach((r) => {
      if (y + rowH > pageHeight - 65) {
        doc.addPage();
        y = marginLeft;
        drawTableHeader();
      }
      drawRow(r);
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
        doc.text("RESPONSABLE DE NOMINA", marginLeft + 40, yFirmas + 5, {
          align: "center",
        });
        doc.line(
          pageWidth - marginRight - 75,
          yFirmas,
          pageWidth - marginRight - 5,
          yFirmas,
        );
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
        `Generado el ${fechaGenerado} a las ${horaGenerado} · ${systemLabel} · Anio ${anioFiscal} · Página ${p} de ${totalPages}`,
        pageWidth / 2,
        pageHeight - 9,
        { align: "center" },
      );
    }

    const nombreArchivo = `Nomina_Aguinaldos_${
      maestro.año_fiscal || "NA"
    }_${String(maestro.id_calculo || "").padStart(3, "0")}.pdf`;
    doc.save(nombreArchivo.replace(/\s+/g, "_"));
  };

  /**
   * PDF unificado (formato nuevo) - Recibo individual.
   * - Relación: se usa desde la tabla (botón por empleado) dentro de este diálogo.
   */
  const generarPDFIndividualFormatoNuevo = (ag) => {
    if (!ag || !detalle) return;

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
      `$${Number(value || 0).toLocaleString("es-MX", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
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
    const empleado = safe(ag.nombre_completo || "Empleado");
    const total = money(ag.monto_aguinaldo);
    const anioFiscal = safe(maestro.año_fiscal || "—");
    const fechaCorte = maestro.fecha_corte
      ? dayjs(maestro.fecha_corte).format("DD/MM/YYYY")
      : "—";

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
    doc.text("AGUINALDO", pageWidth - marginRight, y + 7, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Anio fiscal ${anioFiscal}`, pageWidth - marginRight, y + 13, {
      align: "right",
    });

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
    doc.text("FECHA CORTE", marginLeft + col * 2, y + 3);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(ag.es_proporcional ? "PROPORCIONAL" : "COMPLETO", marginLeft, y + 9);
    doc.text(empleado, marginLeft + col, y + 9, { maxWidth: col - 6 });
    doc.text(fechaCorte, marginLeft + col * 2, y + 9, { maxWidth: col - 6 });

    const boxX = marginLeft + metaWidth + boxGap;
    const boxY = y - 1;
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(boxX, boxY, boxWidth, 18, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(total.replace("$", ""), boxX + boxWidth / 2, boxY + 9, {
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
    fieldPair("Nombre completo", empleado, marginLeft, y);
    fieldPair("Puesto", ag.puesto || "N/A", marginLeft + contentWidth / 2 + 4, y);
    y += 16;
    fieldPair("Departamento", ag.departamento || "N/A", marginLeft, y);
    fieldPair(
      "Fecha ingreso",
      ag.fecha_ingreso ? dayjs(ag.fecha_ingreso).format("DD/MM/YYYY") : "—",
      marginLeft + contentWidth / 2 + 4,
      y,
    );
    y += 16;
    fieldPair(
      "Anios trabajados",
      Number(ag.años_trabajados || 0).toFixed(2),
      marginLeft,
      y,
    );
    fieldPair(
      "Dias trabajados",
      Number(ag.dias_trabajados || 0).toFixed(2),
      marginLeft + contentWidth / 2 + 4,
      y,
    );
    y += 18;

    drawAmountRows("Detalle del calculo", [
      ["Salario diario", money(ag.salario_diario)],
      ["Dias aguinaldo (ley)", Number(ag.dias_aguinaldo_ley || 0).toFixed(2)],
      ["Dias aguinaldo calculado", Number(ag.dias_aguinaldo_calculado || 0).toFixed(2)],
      ["Tipo", ag.es_proporcional ? "Proporcional" : "Completo"],
      ["Monto aguinaldo", money(ag.monto_aguinaldo)],
    ]);

    drawWrappedSectionText({
      sectionName: "Observaciones",
      textValue: maestro.observaciones || "",
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
        doc.text(empleado.slice(0, 40), marginLeft + 40, yFirmas + 10, {
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
        `Generado el ${fechaGenerado} a las ${horaGenerado} · ${systemLabel} · Anio ${anioFiscal} · Página ${p} de ${totalPages}`,
        pageWidth / 2,
        pageHeight - 9,
        { align: "center" },
      );
    }

    const nombreArchivo = `Aguinaldo_${maestro.año_fiscal || "NA"}_${String(
      empleado,
    ).replace(/\s+/g, "_")}.pdf`;
    doc.save(nombreArchivo);
  };

  const generarPDF = () => {
    if (!detalle) return;

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
    doc.text("Adamia", margenIzq, 20);
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
    doc.text("NÓMINA DE AGUINALDOS " + maestro.año_fiscal, 105, y, {
      align: "center",
    });

    y += 10;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(
      "Fecha de Corte: " + dayjs(maestro.fecha_corte).format("DD/MM/YYYY"),
      margenIzq,
      y,
    );
    doc.text("Total Empleados: " + maestro.total_empleados, margenDer, y, {
      align: "right",
    });

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
        parseFloat(maestro.total_general).toLocaleString("es-MX", {
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

    aguinaldos.forEach((emp, idx) => {
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
      if (idx < aguinaldos.length - 1) {
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.3);
        doc.line(margenIzq, y, margenDer, y);
        y += 2;
      }
    });

    const nombreArchivo =
      "Nomina_Aguinaldos_" +
      maestro.año_fiscal +
      "_" +
      maestro.id_calculo +
      ".pdf";
    doc.save(nombreArchivo);
  };

  // Función para generar PDF individual de un empleado
  // - Relación: genera un PDF solo con la información del empleado específico
  // - Importante: cada empleado recibe solo su información, no la de otros
  const generarPDFIndividual = (ag) => {
    if (!ag || !detalle) return;

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
    doc.text("Adamia", margenIzq, 20);
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
    doc.text("RECIBO DE AGUINALDO " + maestro.año_fiscal, 105, y, {
      align: "center",
    });

    y += 10;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.text(
      "Fecha de Corte: " + dayjs(maestro.fecha_corte).format("DD/MM/YYYY"),
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
    doc.text("Nombre: " + ag.nombre_completo, margenIzq, y);
    y += 6;
    doc.text("Puesto: " + (ag.puesto || "N/A"), margenIzq, y);
    y += 6;
    doc.text("Departamento: " + (ag.departamento || "N/A"), margenIzq, y);
    y += 6;
    doc.text(
      "Fecha de Ingreso: " + dayjs(ag.fecha_ingreso).format("DD/MM/YYYY"),
      margenIzq,
      y,
    );
    y += 6;
    doc.text(
      "Años Trabajados: " + parseFloat(ag.años_trabajados).toFixed(2) + " años",
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
        parseFloat(ag.salario_diario).toLocaleString("es-MX", {
          minimumFractionDigits: 2,
        }),
      margenIzq,
      y,
    );
    y += 6;
    doc.text(
      "Días Aguinaldo (Ley): " +
        parseFloat(ag.dias_aguinaldo_ley).toFixed(2) +
        " días",
      margenIzq,
      y,
    );
    y += 6;
    doc.text(
      "Días Aguinaldo Calculado: " +
        parseFloat(ag.dias_aguinaldo_calculado).toFixed(2) +
        " días",
      margenIzq,
      y,
    );
    y += 6;
    doc.text(
      "Tipo: " + (ag.es_proporcional ? "Proporcional" : "Completo"),
      margenIzq,
      y,
    );
    y += 6;
    if (parseFloat(ag.dias_no_trabajados) > 0) {
      doc.text(
        "Días No Trabajados: " +
          parseFloat(ag.dias_no_trabajados).toFixed(2) +
          " días",
        margenIzq,
        y,
      );
      y += 6;
    }
    doc.text(
      "Días Trabajados: " + parseFloat(ag.dias_trabajados).toFixed(2) + " días",
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
        parseFloat(ag.monto_aguinaldo).toLocaleString("es-MX", {
          minimumFractionDigits: 2,
        }) +
        " MXN",
      margenDer - 2,
      y + 7,
      { align: "right" },
    );

    const nombreArchivo =
      "Aguinaldo_" +
      maestro.año_fiscal +
      "_" +
      (ag.nombre_completo || "Empleado").replace(/\s+/g, "_") +
      ".pdf";
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
            ag.id_aguinaldo === idAguinaldo
              ? { ...ag, estado: nuevoEstado }
              : ag,
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
                  Nómina de aguinaldos #
                  {String(maestro.id_calculo || "").padStart(3, "0")}
                </DialogTitle>
                <DialogDescription className="text-sm text-indigo-100 truncate">
                  Año fiscal: {maestro.año_fiscal} · Fecha corte:{" "}
                  {dayjs(maestro.fecha_corte).format("DD/MM/YYYY")}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="py-6 text-sm text-muted-foreground">
              Cargando...
            </div>
          ) : detalle ? (
            <div className="space-y-4 text-sm">
              {/* Estadísticas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                <div className="bg-white border border-[#e5e7eb] rounded-lg p-3 sm:p-4 shadow-[0_2px_10px_rgba(17,24,39,0.04)]">
                  <div className="text-[10px] sm:text-xs text-[#6b7280] font-semibold uppercase tracking-wider">
                    Total Empleados
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-[#37495E] mt-1">
                    {maestro.total_empleados}
                  </div>
                </div>
                <div className="bg-white border border-[#e5e7eb] rounded-lg p-3 sm:p-4 shadow-[0_2px_10px_rgba(17,24,39,0.04)]">
                  <div className="text-[10px] sm:text-xs text-[#6b7280] font-semibold uppercase tracking-wider">
                    Aguinaldos Completos
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-[#065f46] mt-1">
                    {completos}
                  </div>
                </div>
                <div className="bg-white border border-[#e5e7eb] rounded-lg p-3 sm:p-4 shadow-[0_2px_10px_rgba(17,24,39,0.04)] sm:col-span-2 md:col-span-1">
                  <div className="text-[10px] sm:text-xs text-[#6b7280] font-semibold uppercase tracking-wider">
                    Aguinaldos Proporcionales
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-[#92400e] mt-1">
                    {proporcionales}
                  </div>
                </div>
              </div>

              {/* Total General */}
              <div className="bg-gradient-to-r from-[#2563EB] to-[#1d4ed8] text-white p-4 sm:p-6 rounded-xl text-center shadow-sm">
                <div className="text-xs sm:text-sm uppercase tracking-wider mb-2 opacity-90 font-bold">
                  Total general a pagar
                </div>
                <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold break-words">
                  $
                  {parseFloat(maestro.total_general).toLocaleString("es-MX", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  MXN
                </div>
              </div>

              {/* Información del cálculo */}
              <div className="bg-[#f8fafc] p-3 sm:p-4 rounded-lg border border-[#e5e7eb]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                  <div>
                    <span className="font-semibold">Año Fiscal:</span>{" "}
                    {maestro.año_fiscal}
                  </div>
                  <div>
                    <span className="font-semibold">Fecha de Corte:</span>{" "}
                    {dayjs(maestro.fecha_corte).format("DD/MM/YYYY")}
                  </div>
                  <div>
                    <span className="font-semibold">Fecha de Cálculo:</span>{" "}
                    {dayjs(maestro.fecha_calculo).format("DD/MM/YYYY HH:mm")}
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
                      <span className="font-semibold">Observaciones:</span>{" "}
                      {maestro.observaciones}
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <span className="font-semibold">Calculado por:</span>{" "}
                    {maestro.calculado_por?.split("@")[0] || "N/A"}
                  </div>
                </div>
              </div>

              {/* Tabla de aguinaldos */}
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-2">
                  Detalle por empleado
                </h4>
                <div className="overflow-x-auto rounded-md border border-gray-200">
                  <div className="min-w-full inline-block">
                    <table className="w-full text-[10px] sm:text-xs md:text-sm min-w-[800px]">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-1.5 sm:p-2 whitespace-nowrap">
                            Empleado
                          </th>
                          <th className="text-left p-1.5 sm:p-2 whitespace-nowrap">
                            Puesto
                          </th>
                          <th className="text-left p-1.5 sm:p-2 whitespace-nowrap">
                            F. Ingreso
                          </th>
                          <th className="text-left p-1.5 sm:p-2 whitespace-nowrap">
                            Años
                          </th>
                          <th className="text-left p-1.5 sm:p-2 whitespace-nowrap">
                            Salario
                          </th>
                          <th className="text-left p-1.5 sm:p-2 whitespace-nowrap">
                            Días
                          </th>
                          <th className="text-left p-1.5 sm:p-2 whitespace-nowrap">
                            Tipo
                          </th>
                          <th className="text-left p-1.5 sm:p-2 whitespace-nowrap">
                            Monto
                          </th>
                          <th className="text-left p-1.5 sm:p-2 whitespace-nowrap">
                            Estado
                          </th>
                          <th className="text-left p-1.5 sm:p-2 whitespace-nowrap">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {aguinaldos.map((ag) => (
                          <tr key={ag.id_aguinaldo} className="border-t">
                            <td className="p-1.5 sm:p-2">
                              <strong className="break-words">
                                {ag.nombre_completo}
                              </strong>
                            </td>
                            <td className="p-1.5 sm:p-2 whitespace-nowrap">
                              {ag.puesto || "Sin puesto"}
                            </td>
                            <td className="p-1.5 sm:p-2 whitespace-nowrap">
                              {dayjs(ag.fecha_ingreso).format("DD/MM/YYYY")}
                            </td>
                            <td className="p-1.5 sm:p-2 whitespace-nowrap">
                              {parseFloat(ag.años_trabajados).toFixed(2)} años
                            </td>
                            <td className="p-1.5 sm:p-2 whitespace-nowrap">
                              $
                              {parseFloat(ag.salario_diario).toLocaleString(
                                "es-MX",
                                { minimumFractionDigits: 2 },
                              )}
                            </td>
                            <td className="p-1.5 sm:p-2 whitespace-nowrap">
                              {parseFloat(ag.dias_aguinaldo_calculado).toFixed(
                                2,
                              )}
                            </td>
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
                              $
                              {parseFloat(ag.monto_aguinaldo).toLocaleString(
                                "es-MX",
                                { minimumFractionDigits: 2 },
                              )}
                            </td>
                            <td className="p-1.5 sm:p-2 whitespace-nowrap">
                              <Select
                                value={ag.estado || "Pendiente"}
                                onValueChange={(nuevoEstado) => {
                                  actualizarEstadoIndividual(
                                    ag.id_aguinaldo,
                                    nuevoEstado,
                                  );
                                }}
                                disabled={actualizandoEstados[ag.id_aguinaldo]}
                              >
                                <SelectTrigger className="h-7 sm:h-8 text-[9px] sm:text-xs w-20 sm:w-24">
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
                            <td className="p-1.5 sm:p-2 whitespace-nowrap">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  generarPDFIndividualFormatoNuevo(ag)
                                }
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
            <div className="py-6 text-sm text-muted-foreground">
              Sin información.
            </div>
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
