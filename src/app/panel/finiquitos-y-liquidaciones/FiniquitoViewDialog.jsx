"use client";

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
import { finiquitosApi } from "@/lib/finiquitosApi";
import styles from "./finiquitos-theme.module.css";
import { jsPDF } from "jspdf";
import dayjs from "dayjs";
import { useAuth } from "@/context/AuthContext";
import useSWR from "swr";
import { fetcherWithToken, swr_config } from "@/lib/fetcher";
import { fetchImageAsDataUrl } from "@/lib/pdfCompanyLogo";
import { Download, FileText, Loader2, Printer } from "lucide-react";

export default function FiniquitoViewDialog({ open, setOpen, id }) {
  const { dataUser } = useAuth();
  const idEmpresa = dataUser?.id_empresa;

  /**
   * Datos de empresa para marca/imagen en el PDF (formato unificado).
   * - Relación: `src/app/panel/cuenta/Empresa/ImagenEmpresa.jsx`.
   */
  const { data: empresaData } = useSWR(
    idEmpresa ? `/empresas/${idEmpresa}` : null,
    fetcherWithToken,
    swr_config,
  );

  /**
   * Logo precargado como DataURL (con fallback a `/assets/logo.png`).
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

  const [det, setDet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!open || !id) return;
      setLoading(true);
      try {
        const data = await finiquitosApi.detalle(id);
        if (active) setDet(data);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [open, id]);

  /**
   * PDF unificado (formato nuevo) - Detalle de Finiquito/Liquidación (desde modal Ver).
   * - Relación:
   *   - Botón "📄 Descargar PDF" en el footer de este diálogo.
   *   - El contenido proviene de `det` (endpoint `finiquitosApi.detalle`).
   */
  const buildPdfFormatoNuevo = () => {
    if (!det) return;

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
      `$${Number(value || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
    const tipoDocumento = det.es_liquidacion ? "LIQUIDACION" : "FINIQUITO";
    const folio = String(det.id_finiquito || det.id || id || "").padStart(3, "0");
    const fechaBaja = det.fecha_baja ? dayjs(det.fecha_baja).format("DD/MM/YYYY") : "—";
    const empleadoName = safe(det.nombre_completo || "—");
    const totalPagar = money(det.total_pagar);

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
    doc.text(tipoDocumento, pageWidth - marginRight, y + 7, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Folio #${folio}`, pageWidth - marginRight, y + 13, { align: "right" });

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
    doc.text("FECHA BAJA", marginLeft + col * 2, y + 3);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(tipoDocumento, marginLeft, y + 9);
    doc.text(empleadoName, marginLeft + col, y + 9, { maxWidth: col - 6 });
    doc.text(fechaBaja, marginLeft + col * 2, y + 9, { maxWidth: col - 6 });

    const boxX = marginLeft + metaWidth + boxGap;
    const boxY = y - 1;
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(boxX, boxY, boxWidth, 18, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(totalPagar.replace("$", ""), boxX + boxWidth / 2, boxY + 9, {
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
    fieldPair("Nombre completo", empleadoName, marginLeft, y);
    fieldPair("Puesto", det.puesto || "—", marginLeft + contentWidth / 2 + 4, y);
    y += 16;
    fieldPair("Departamento", det.departamento || "—", marginLeft, y);
    fieldPair(
      "Fecha ingreso",
      det.fecha_ingreso ? dayjs(det.fecha_ingreso).format("DD/MM/YYYY") : "—",
      marginLeft + contentWidth / 2 + 4,
      y,
    );
    y += 16;
    fieldPair("Anios trabajados", `${det.años_trabajados || 0}`, marginLeft, y);
    fieldPair(
      "Salario diario",
      money(det.salario_diario),
      marginLeft + contentWidth / 2 + 4,
      y,
    );
    y += 18;

    drawAmountRows("Conceptos de finiquito", [
      ["Salario pendiente", money(det.monto_salario_pendiente)],
      ["Aguinaldo proporcional", money(det.monto_aguinaldo_proporcional)],
      ["Vacaciones no gozadas", money(det.monto_vacaciones_no_gozadas)],
      ["Prima vacacional", money(det.monto_prima_vacacional)],
      ["Subtotal finiquito", money(det.subtotal_finiquito)],
    ]);

    if (det.es_liquidacion) {
      drawAmountRows("Conceptos de liquidacion", [
        ["Prima antiguedad", money(det.monto_prima_antiguedad)],
        [
          "Indemnizacion constitucional",
          money(det.monto_indemnizacion_constitucional),
        ],
        ["Salarios vencidos", money(det.monto_salarios_vencidos)],
        ["Subtotal liquidacion", money(det.subtotal_liquidacion)],
      ]);
    }

    drawWrappedSectionText({
      sectionName: "Motivo de baja",
      textValue: det.motivo_baja,
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
        doc.text(empleadoName.slice(0, 40), marginLeft + 40, yFirmas + 10, {
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
        `Generado el ${fechaGenerado} a las ${horaGenerado} · ${systemLabel} · Folio #${folio} · Página ${p} de ${totalPages}`,
        pageWidth / 2,
        pageHeight - 9,
        { align: "center" },
      );
    }

    const nombreArchivo = `${
      det.es_liquidacion ? "LIQUIDACION" : "FINIQUITO"
    }_${String(det.nombre_completo || "Empleado").replace(/\s+/g, "_")}.pdf`;
    return { doc, nombreArchivo };
  };

  const imprimirPDF = (doc, nombreArchivo) =>
    new Promise((resolve) => {
      try {
        const blob = doc.output("blob");
        const url = URL.createObjectURL(blob);
        const iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "0";
        iframe.src = url;

        let finished = false;
        let fallbackTimer = null;
        let mediaPollTimer = null;
        const MIN_PREPARING_MS = 4000;
        const preparingStartedAt = Date.now();
        let parentBlurred = false;
        let didEnterPrintMode = false;
        const mediaQuery =
          typeof window !== "undefined" && window.matchMedia
            ? window.matchMedia("print")
            : null;

        const finish = () => {
          if (finished) return;
          const elapsed = Date.now() - preparingStartedAt;
          const remaining = Math.max(0, MIN_PREPARING_MS - elapsed);
          setTimeout(() => {
            if (finished) return;
            finished = true;
            try {
              window.removeEventListener("blur", onParentBlur);
              window.removeEventListener("focus", onParentFocus);
              window.removeEventListener("afterprint", onAfterPrint);
              if (mediaQuery?.removeEventListener) {
                mediaQuery.removeEventListener("change", onMediaPrintChange);
              } else if (mediaQuery?.removeListener) {
                mediaQuery.removeListener(onMediaPrintChange);
              }
            } catch {}
            if (fallbackTimer) clearTimeout(fallbackTimer);
            if (mediaPollTimer) clearInterval(mediaPollTimer);
            resolve();
            setTimeout(() => {
              try {
                URL.revokeObjectURL(url);
                iframe.remove();
              } catch {}
            }, 2000);
          }, remaining);
        };

        const onAfterPrint = () => finish();
        const onParentBlur = () => {
          parentBlurred = true;
        };
        const onParentFocus = () => {
          if (parentBlurred) finish();
        };
        const onMediaPrintChange = (event) => {
          const isPrinting = !!event?.matches;
          if (isPrinting) {
            didEnterPrintMode = true;
            return;
          }
          if (didEnterPrintMode) finish();
        };

        iframe.onload = () => {
          try {
            window.addEventListener("afterprint", onAfterPrint);
            window.addEventListener("blur", onParentBlur);
            window.addEventListener("focus", onParentFocus);
            if (mediaQuery?.addEventListener) {
              mediaQuery.addEventListener("change", onMediaPrintChange);
            } else if (mediaQuery?.addListener) {
              mediaQuery.addListener(onMediaPrintChange);
            }
            if (iframe.contentWindow) {
              iframe.contentWindow.onafterprint = () => finish();
            }
            iframe.contentWindow?.focus();
            setTimeout(() => {
              iframe.contentWindow?.print();
            }, 80);

            mediaPollTimer = setInterval(() => {
              const hasFocus =
                typeof document !== "undefined" &&
                typeof document.hasFocus === "function"
                  ? document.hasFocus()
                  : true;
              if (parentBlurred && hasFocus) {
                finish();
                return;
              }
              if (!mediaQuery) return;
              if (mediaQuery.matches) {
                didEnterPrintMode = true;
              } else if (didEnterPrintMode) {
                finish();
              }
            }, 400);

            fallbackTimer = setTimeout(() => {
              finish();
            }, 25000);
          } catch {
            doc.save(nombreArchivo);
            finish();
          }
        };

        document.body.appendChild(iframe);
      } catch (e) {
        console.error(e);
        doc.save(nombreArchivo);
        resolve();
      }
    });

  const descargarPDFFormatoNuevo = () => {
    const built = buildPdfFormatoNuevo();
    if (!built) return;
    built.doc.save(built.nombreArchivo);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl md:max-w-4xl xl:max-w-5xl max-h-[85vh] overflow-y-auto p-0">
        <DialogHeader className="p-0">
          <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white p-6">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-white text-xl font-bold truncate">
                  {det?.es_liquidacion
                    ? "Detalle de liquidación"
                    : "Detalle de finiquito"}
                </DialogTitle>
                <DialogDescription className="text-sm text-indigo-100 truncate">
                  {det?.nombre_completo
                    ? `Empleado: ${det.nombre_completo}`
                    : ""}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4">
          {loading ? (
            <div className="py-6 text-sm text-muted-foreground">
              Cargando...
            </div>
          ) : det ? (
            <div className="space-y-4 text-sm">
              <div className={styles.resultsPanel}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className={styles.metricCard}>
                    <div className={styles.metricLabel}>Empleado</div>
                    <div className={`${styles.metricValue} break-words`}>
                      {det.nombre_completo}
                    </div>
                  </div>
                  <div className={styles.metricCard}>
                    <div className={styles.metricLabel}>Días trabajados</div>
                    <div className={styles.metricValue}>
                      {det.dias_trabajados}
                    </div>
                  </div>
                  <div className={styles.metricCard}>
                    <div className={styles.metricLabel}>Años trabajados</div>
                    <div className={styles.metricValue}>
                      {det.años_trabajados}
                    </div>
                  </div>
                  <div className={styles.metricCard}>
                    <div className={styles.metricLabel}>Salario diario</div>
                    <div className={styles.metricValue}>
                      $
                      {Number(det.salario_diario).toLocaleString("es-MX", {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                </div>

                <div className={styles.sectionTitle}>
                  Conceptos de finiquito
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
                  <div className={styles.conceptCard}>
                    <div className={styles.conceptTitle}>Salario Pendiente</div>
                    <div className={styles.conceptAmount}>
                      $
                      {Number(det.monto_salario_pendiente).toLocaleString(
                        "es-MX",
                        { minimumFractionDigits: 2 },
                      )}
                    </div>
                    <div className={styles.conceptBox}>
                      <div className={styles.row}>
                        <span className={styles.rowLabel}>Días</span>
                        <span className={styles.rowValue}>
                          {Number(det.dias_salario_pendiente).toFixed(2)} días
                        </span>
                      </div>
                      <div className={styles.row}>
                        <span className={styles.rowLabel}>Salario diario</span>
                        <span className={styles.rowValue}>
                          $
                          {Number(det.salario_diario).toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.conceptCard}>
                    <div className={styles.conceptTitle}>
                      Aguinaldo Proporcional
                    </div>
                    <div className={styles.conceptAmount}>
                      $
                      {Number(det.monto_aguinaldo_proporcional).toLocaleString(
                        "es-MX",
                        { minimumFractionDigits: 2 },
                      )}
                    </div>
                    <div className={styles.conceptBox}>
                      <div className={styles.row}>
                        <span className={styles.rowLabel}>Proporcional</span>
                        <span className={styles.rowValue}>
                          {det.dias_aguinaldo_proporcional} días
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.conceptCard}>
                    <div className={styles.conceptTitle}>
                      Vacaciones No Gozadas
                    </div>
                    <div className={styles.conceptAmount}>
                      $
                      {Number(det.monto_vacaciones_no_gozadas).toLocaleString(
                        "es-MX",
                        { minimumFractionDigits: 2 },
                      )}
                    </div>
                    <div className={styles.conceptBox}>
                      <div className={styles.row}>
                        <span className={styles.rowLabel}>Totales</span>
                        <span className={styles.rowValue}>
                          {det.dias_vacaciones_totales} días
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.conceptCard}>
                    <div className={styles.conceptTitle}>Prima Vacacional</div>
                    <div className={styles.conceptAmount}>
                      $
                      {Number(det.monto_prima_vacacional).toLocaleString(
                        "es-MX",
                        { minimumFractionDigits: 2 },
                      )}
                    </div>
                    <div className={styles.conceptBox}>
                      <div className={styles.row}>
                        <span className={styles.rowLabel}>Porcentaje</span>
                        <span className={styles.rowValue}>
                          {Number(det.prima_vacacional_porcentaje).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.subtotalBar}>
                  <div className="flex items-center justify-between">
                    <div className={styles.subtotalLabel}>
                      Subtotal Finiquito
                    </div>
                    <div className={styles.subtotalValue}>
                      $
                      {Number(det.subtotal_finiquito).toLocaleString("es-MX", {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                </div>

                {det.es_liquidacion ? (
                  <div className="space-y-3 mt-3">
                    <div className="text-sm font-semibold text-red-700">
                      ⚖️ Conceptos de Liquidación
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className={styles.conceptCard}>
                        <div className={styles.conceptTitle}>
                          Prima de Antigüedad
                        </div>
                        <div className={styles.conceptAmount}>
                          $
                          {Number(det.monto_prima_antiguedad).toLocaleString(
                            "es-MX",
                            { minimumFractionDigits: 2 },
                          )}
                        </div>
                      </div>
                      <div className={styles.conceptCard}>
                        <div className={styles.conceptTitle}>
                          Indemnización Constitucional
                        </div>
                        <div className={styles.conceptAmount}>
                          $
                          {Number(
                            det.monto_indemnizacion_constitucional,
                          ).toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                      </div>
                      <div className={styles.conceptCard}>
                        <div className={styles.conceptTitle}>
                          Salarios Vencidos
                        </div>
                        <div className={styles.conceptAmount}>
                          $
                          {Number(det.monto_salarios_vencidos).toLocaleString(
                            "es-MX",
                            { minimumFractionDigits: 2 },
                          )}
                        </div>
                      </div>
                    </div>
                    <div className={styles.subtotalBar}>
                      <div className="flex items-center justify-between">
                        <div className={styles.subtotalLabel}>
                          Subtotal Liquidación
                        </div>
                        <div className={styles.subtotalValue}>
                          $
                          {Number(det.subtotal_liquidacion).toLocaleString(
                            "es-MX",
                            { minimumFractionDigits: 2 },
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className={styles.totalBar + " mt-3"}>
                  <div className="flex items-center justify-between">
                    <div className={styles.totalLabel}>TOTAL A PAGAR</div>
                    <div className={styles.totalAmount}>
                      $
                      {Number(det.total_pagar).toLocaleString("es-MX", {
                        minimumFractionDigits: 2,
                      })}{" "}
                      MXN
                    </div>
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

        {/* Footer con acciones (similar al patrón de Aguinaldos/Permisos): cerrar + descargar PDF */}
        <DialogFooter className="bg-gray-50 p-4 flex flex-col-reverse sm:flex-row justify-end gap-2 rounded-b-lg">
          {isPreparingPrint ? (
            <div className="text-sm text-blue-700 flex items-center gap-2 sm:mr-auto">
              <Loader2 className="h-4 w-4 animate-spin" />
              Preparando impresión...
            </div>
          ) : (
            <div className="sm:mr-auto" />
          )}
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPreparingPrint}
            className="w-full sm:w-auto border-gray-300"
          >
            Cerrar
          </Button>
          <Button
            onClick={descargarPDFFormatoNuevo}
            disabled={!det || isPreparingPrint}
            className="w-full sm:w-auto bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-sm disabled:opacity-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Descargar PDF
          </Button>
          <Button
            onClick={async () => {
              setIsPreparingPrint(true);
              try {
                await new Promise((resolve) => setTimeout(resolve, 0));
                const built = buildPdfFormatoNuevo();
                if (!built) return;
                await imprimirPDF(built.doc, built.nombreArchivo);
              } finally {
                setIsPreparingPrint(false);
              }
            }}
            disabled={!det || isPreparingPrint}
            className="w-full sm:w-auto bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white shadow-sm disabled:opacity-50"
          >
            {isPreparingPrint ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Printer className="h-4 w-4 mr-2" />
            )}
            {isPreparingPrint ? "Preparando..." : "Imprimir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
