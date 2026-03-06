"use client";

import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { jsPDF } from "jspdf";
import useSWR from "swr";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetcherWithToken, swr_config } from "@/lib/fetcher";
import {
  fetchImageAsDataUrl,
  tryAddCompanyMarkToPdf,
} from "@/lib/pdfCompanyLogo";
import { Download, FileText, Loader2, Printer } from "lucide-react";

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Dialog de solo lectura para ver detalles del contrato.
 * - Relación: se invoca desde `src/app/panel/contratos/page.jsx`
 */
export default function ContratoViewDialog({ open, setOpen, item }) {
  const { dataUser } = useAuth();
  const idEmpresa = dataUser?.id_empresa;
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);

  const { data: empresaData } = useSWR(
    idEmpresa ? `/empresas/${idEmpresa}` : null,
    fetcherWithToken,
    swr_config,
  );

  useEffect(() => {
    let alive = true;
    const run = async () => {
      let companyDataUrl = null;
      const companyUrl = empresaData?.url_imagen;
      if (companyUrl) {
        try {
          const urlConCacheBuster = `${companyUrl}${
            companyUrl.includes("?") ? "&" : "?"
          }t=${Date.now()}`;
          companyDataUrl = await fetchImageAsDataUrl(urlConCacheBuster);
        } catch {
          companyDataUrl = null;
        }
      }

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

  function formatDMY(value) {
    if (!value) return "";
    const d = dayjs(value, ["YYYY-MM-DD", "DD/MM/YYYY", "YYYY/MM/DD"], true);
    return d.isValid() ? d.format("DD/MM/YYYY") : String(value);
  }

  function formatMoney(value, currencyCode = "MXN") {
    const number = Number(value);
    if (!Number.isFinite(number)) return value || "—";
    try {
      return new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: currencyCode || "MXN",
        minimumFractionDigits: 2,
      }).format(number);
    } catch {
      return number.toFixed(2);
    }
  }

  function safe(value) {
    return String(value || "")
      .replace(/\p{Extended_Pictographic}|\uFE0F|\u200D/gu, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function BadgeTipo({ tipo }) {
    const base =
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold";
    switch (tipo) {
      case "indefinido":
        return (
          <span
            className={base}
            style={{ backgroundColor: "#dbeafe", color: "#1e40af" }}
          >
            Indefinido
          </span>
        );
      case "temporal":
        return (
          <span
            className={base}
            style={{ backgroundColor: "#fef3c7", color: "#92400e" }}
          >
            Temporal
          </span>
        );
      case "obra_determinada":
        return (
          <span
            className={base}
            style={{ backgroundColor: "#fef3c7", color: "#92400e" }}
          >
            Obra Determinada
          </span>
        );
      case "capacitacion":
        return (
          <span
            className={base}
            style={{ backgroundColor: "#fef3c7", color: "#92400e" }}
          >
            Capacitación
          </span>
        );
      case "prueba":
        return (
          <span
            className={base}
            style={{ backgroundColor: "#fef3c7", color: "#92400e" }}
          >
            Prueba
          </span>
        );
      case "prestacion_servicios":
        return (
          <span
            className={base}
            style={{ backgroundColor: "#e9d5ff", color: "#6b21a8" }}
          >
            Prestación Servicios
          </span>
        );
      default:
        return (
          <span
            className={base}
            style={{ backgroundColor: "#f3f4f6", color: "#6b7280" }}
          >
            {tipo || "-"}
          </span>
        );
    }
  }

  function BadgeEstatus({ estatus }) {
    const base =
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold";
    const val = (estatus || "").toLowerCase();
    if (val === "activo")
      return (
        <span
          className={base}
          style={{ backgroundColor: "#d1fae5", color: "#065f46" }}
        >
          Activo
        </span>
      );
    if (val === "suspendido")
      return (
        <span
          className={base}
          style={{ backgroundColor: "#fef3c7", color: "#92400e" }}
        >
          Suspendido
        </span>
      );
    if (val === "terminado")
      return (
        <span
          className={base}
          style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}
        >
          Terminado
        </span>
      );
    if (val === "cancelado")
      return (
        <span
          className={base}
          style={{ backgroundColor: "#f3f4f6", color: "#6b7280" }}
        >
          Cancelado
        </span>
      );
    return (
      <span
        className={base}
        style={{ backgroundColor: "#f3f4f6", color: "#6b7280" }}
      >
        {estatus}
      </span>
    );
  }

  function imprimirPDF(doc, nombreArchivo) {
    return new Promise((resolve) => {
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
  }

  function buildContratoPDF() {
    const doc = new jsPDF("p", "mm", "a4");

    const pageWidth = 210;
    const pageHeight = 297;
    const marginLeft = 20;
    const marginRight = 20;
    const contentWidth = pageWidth - marginLeft - marginRight;
    const systemLabel = "ADAMIA HR360";
    let y = marginLeft;

    const empresaNombre =
      safe(
        item.empresa ||
          item.empresa_nombre ||
          empresaData?.nombre_empresa ||
          dataUser?.empresa?.nombre_empresa,
      ) || "ADAMIA Human Resources";
    const folio = safe(item.folio || item.id || "—");
    const empleado = safe(
      item.nombre_empleado || item.empleado_nombre || item.nombreEmpleado || "—",
    );
    const puesto = safe(item.puesto || "—");
    const departamento = safe(item.departamento || "—");
    const tipoContrato = safe(item.tipo_contrato || item.tipoContrato || "—");
    const estatus = safe(item.estatus || "—");
    const fechaInicio = item.fecha_inicio || item.fechaInicio;
    const fechaFin = item.fecha_fin || item.fechaFin;
    const salario = formatMoney(
      item.salario_base ?? item.salarioBase,
      item.moneda || "MXN",
    );
    const periodicidad = safe(
      item.nombre_periodicidad ||
        item.periodicidad_pago ||
        item.periodicidadPago ||
        "—",
    );
    const moneda = safe(item.moneda || "MXN");
    const jornada = safe(item.tipo_jornada || item.tipoJornada || "—");
    const horasSemanales = safe(item.horas_semanales ?? item.horasSemanales ?? "—");
    const horario = safe(item.horario || "—");
    const vacaciones = safe(item.dias_vacaciones ?? item.diasVacaciones ?? "—");
    const aguinaldo = safe(item.aguinaldo_dias ?? item.aguinaldoDias ?? "—");
    const primaVacacional = safe(
      item.prima_vacacional ?? item.primaVacacionalPorcentaje ?? "—",
    );
    const notas = safe(item.notas || "");
    const motivoTermino = safe(item.motivo_terminacion || "");
    const elaboradoPor = safe(item.nombre_elabora || "—");
    const fechaCreacion = safe(item.fecha_creacion || "—");
    const fechaTerminacion = safe(item.fecha_terminacion || "—");

    const formatDateLong = (value) => {
      if (!value) return "—";
      const d = dayjs(value).tz("America/Mexico_City");
      return d.isValid() ? d.format("DD [de] MMMM [de] YYYY") : String(value);
    };

    const fechaInicioLarga = formatDateLong(fechaInicio);
    const fechaFinLarga =
      tipoContrato === "indefinido" || !fechaFin
        ? "Sin fecha de termino"
        : formatDateLong(fechaFin);

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

    const fieldPairFlexible = (
      label,
      value,
      x,
      yPos,
      width = contentWidth / 2 - 4,
      { wrap = false } = {},
    ) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(140);
      doc.text(String(label || "").toUpperCase(), x, yPos);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(0);

      if (!wrap) {
        doc.text(safe(value), x, yPos + 5);
        doc.setDrawColor(200);
        doc.setLineWidth(0.2);
        doc.line(x, yPos + 7, x + width, yPos + 7);
        return 7;
      }

      const normalized = safe(value).replace(/(\S{24})(?=\S)/g, "$1 ");
      const lines = doc.splitTextToSize(normalized || "—", Math.max(10, width - 1));
      const lineStep = 4.6;
      lines.forEach((line, idx) => {
        doc.text(String(line || " "), x, yPos + 5 + idx * lineStep);
      });

      const lineY = yPos + 7 + Math.max(0, (lines.length - 1) * lineStep);
      doc.setDrawColor(200);
      doc.setLineWidth(0.2);
      doc.line(x, lineY, x + width, lineY);
      return lineY - yPos;
    };

    const estimateWrappedFieldHeight = (value, width) => {
      const normalized = safe(value).replace(/(\S{24})(?=\S)/g, "$1 ");
      const lines = doc.splitTextToSize(normalized || "—", Math.max(10, width - 1));
      const lineStep = 4.6;
      return 7 + Math.max(0, (lines.length - 1) * lineStep);
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
        const fragments = doc.splitTextToSize(breakableParagraph, maxTextWidth);
        safeLines.push(...fragments);
      }

      for (const line of safeLines) {
        needSpace(lineHeight + 2);
        doc.text(String(line || " "), marginLeft + textInsetLeft, y);
        y += lineHeight;
      }

      hRule(y + 1, contentWidth, 0.2);
      y += 10;
    };

    const hasLogo = tryAddCompanyMarkToPdf(
      doc,
      { logoDataUrl, companyName: empresaNombre },
      { x: marginLeft, y, boxW: 28, boxH: 10 },
    );

    if (!hasLogo && logoDataUrl) {
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
    doc.text("CONTRATO", pageWidth - marginRight, y + 7, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Folio #${folio}`, pageWidth - marginRight, y + 13, {
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
    doc.text("ESTATUS", marginLeft, y + 3);
    doc.text("TIPO", marginLeft + col, y + 3);
    doc.text("VIGENCIA", marginLeft + col * 2, y + 3);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(estatus, marginLeft, y + 9);
    doc.text(tipoContrato, marginLeft + col, y + 9);
    doc.text(
      `${fechaInicioLarga} — ${fechaFinLarga}`,
      marginLeft + col * 2,
      y + 9,
      {
        maxWidth: col - 6,
      },
    );

    const boxX = marginLeft + metaWidth + boxGap;
    const boxY = y - 1;
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(boxX, boxY, boxWidth, 18, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(String(horasSemanales || "—"), boxX + boxWidth / 2, boxY + 10, {
      align: "center",
    });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.text("HRS/SEM", boxX + boxWidth / 2, boxY + 15, { align: "center" });

    y += 18;
    hRule(y, contentWidth, 0.3);
    y += 8;

    sectionTitle("Datos del empleado");
    needSpace(20);
    fieldPair("Nombre completo", empleado, marginLeft, y);
    fieldPair("Empresa", empresaNombre, marginLeft + contentWidth / 2 + 4, y);
    y += 16;
    fieldPair("Departamento", departamento, marginLeft, y);
    fieldPair("Puesto", puesto, marginLeft + contentWidth / 2 + 4, y);
    y += 18;

    sectionTitle("Detalle del contrato");
    needSpace(20);
    const c3 = contentWidth / 3;
    fieldPair("Fecha de inicio", fechaInicioLarga, marginLeft, y, c3 - 4);
    fieldPair("Fecha de fin", fechaFinLarga, marginLeft + c3, y, c3 - 4);
    fieldPair("Tipo de contrato", tipoContrato, marginLeft + c3 * 2, y, c3 - 4);
    y += 16;
    fieldPair("Folio", `#${folio}`, marginLeft, y, c3 - 4);
    fieldPair("Estatus", estatus, marginLeft + c3, y, c3 - 4);
    fieldPair(
      "Modalidad",
      safe(item.modalidad_trabajo || "—"),
      marginLeft + c3 * 2,
      y,
      c3 - 4,
    );
    y += 18;

    sectionTitle("Condiciones laborales");
    needSpace(20);
    fieldPair("Salario base", salario, marginLeft, y, c3 - 4);
    fieldPair("Periodicidad de pago", periodicidad, marginLeft + c3, y, c3 - 4);
    fieldPair("Moneda", moneda, marginLeft + c3 * 2, y, c3 - 4);
    y += 16;
    const horarioHeightEstimate = estimateWrappedFieldHeight(horario, c3 - 4);
    const condicionesRowHeight = Math.max(18, horarioHeightEstimate + 11);
    needSpace(condicionesRowHeight);
    const horarioDrawnHeight = fieldPairFlexible(
      "Horario",
      horario,
      marginLeft + c3 * 2,
      y,
      c3 - 4,
      { wrap: true },
    );
    fieldPair("Tipo de jornada", jornada, marginLeft, y, c3 - 4);
    fieldPair("Horas semanales", horasSemanales, marginLeft + c3, y, c3 - 4);
    y += Math.max(18, horarioDrawnHeight + 11);

    if ((item.tipo_contrato || item.tipoContrato) !== "prestacion_servicios") {
      // Evita dejar el título "PRESTACIONES" solo al final de una página.
      // Reservamos espacio para encabezado + primera fila del bloque.
      needSpace(30);
      sectionTitle("Prestaciones");
      needSpace(20);
      fieldPair("Dias de vacaciones", vacaciones, marginLeft, y, c3 - 4);
      fieldPair("Aguinaldo (dias)", aguinaldo, marginLeft + c3, y, c3 - 4);
      fieldPair(
        "Prima vacacional (%)",
        primaVacacional,
        marginLeft + c3 * 2,
        y,
        c3 - 4,
      );
      y += 18;
    }

    drawWrappedSectionText({
      sectionName: "Motivo / Observaciones",
      textValue: notas,
      emptyFallback: "Sin notas adicionales.",
    });

    drawWrappedSectionText({
      sectionName: "Motivo de terminacion",
      textValue: motivoTermino,
      emptyFallback: "No aplica.",
    });

    sectionTitle("Auditoria");
    needSpace(20);
    fieldPair("Creado el", fechaCreacion, marginLeft, y);
    fieldPair(
      "Fecha de terminacion",
      fechaTerminacion,
      marginLeft + contentWidth / 2 + 4,
      y,
    );
    y += 16;
    fieldPair("Elaborado por", elaboradoPor, marginLeft, y);
    fieldPair("Sistema", systemLabel, marginLeft + contentWidth / 2 + 4, y);
    y += 18;

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
        doc.text(
          empresaNombre.slice(0, 40),
          pageWidth - marginRight - 40,
          yFirmas + 10,
          {
            align: "center",
          },
        );
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

    const nombreArchivo = `Contrato_${String(folio).replace(
      /[^a-zA-Z0-9_-]/g,
      "_",
    )}_${dayjs().format("YYYY-MM-DD")}.pdf`;
    return { doc, nombreArchivo };
  }

  if (!item) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-xl p-0 overflow-hidden">
          <DialogHeader className="p-0">
            <div className="bg-gradient-to-r from-[#2563EB] to-[#1d4ed8] p-6">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-white text-xl font-bold">
                    Detalle del contrato
                  </DialogTitle>
                  <p className="text-sm text-blue-100">Vista de solo lectura</p>
                </div>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6 text-sm text-gray-600">Sin información.</div>
        </DialogContent>
      </Dialog>
    );
  }

  const vigencia =
    item.tipo_contrato === "indefinido" || !item.fecha_fin
      ? "Sin fecha de término"
      : formatDMY(item.fecha_fin || item.fechaFin);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[85vh] overflow-y-auto p-0">
        <DialogHeader className="p-0">
          <div className="bg-gradient-to-r from-[#2563EB] to-[#1d4ed8] p-6">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-white text-xl font-bold">
                  Contrato {item.folio || item.id}
                </DialogTitle>
                <p className="text-sm text-blue-100">Detalle del contrato</p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <div className="bg-gradient-to-br from-blue-50 via-white to-blue-50 border border-blue-100 rounded-xl p-5">
            <div className="font-semibold mb-4 text-gray-900">
              Información general
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Empresa:</span>{" "}
                {item.empresa || item.empresa_nombre}
              </div>
              <div>
                <span className="text-muted-foreground">Empleado:</span>{" "}
                {item.nombre_empleado || item.empleado_nombre || item.nombreEmpleado}
              </div>
              <div>
                <span className="text-muted-foreground">Puesto:</span>{" "}
                {item.puesto || "-"}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Tipo:</span>{" "}
                <BadgeTipo tipo={item.tipo_contrato || item.tipoContrato} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Estatus:</span>{" "}
                <BadgeEstatus estatus={item.estatus || "-"} />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 via-white to-amber-50 border border-amber-100 rounded-xl p-5">
            <div className="font-semibold mb-4 text-gray-900">Vigencia</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Inicio:</span>{" "}
                {formatDMY(item.fecha_inicio || item.fechaInicio)}
              </div>
              <div>
                <span className="text-muted-foreground">Fin:</span> {vigencia}
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 via-white to-green-50 border border-green-100 rounded-xl p-5">
            <div className="font-semibold mb-4 text-gray-900">Compensación</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Salario:</span>{" "}
                {item.salario_base ?? item.salarioBase}
              </div>
              <div>
                <span className="text-muted-foreground">Periodicidad:</span>{" "}
                {item.periodicidad_pago || item.periodicidadPago}
              </div>
              <div>
                <span className="text-muted-foreground">Moneda:</span>{" "}
                {item.moneda}
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 via-white to-orange-50 border border-orange-100 rounded-xl p-5">
            <div className="font-semibold mb-4 text-gray-900">Jornada</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Tipo:</span>{" "}
                {item.tipo_jornada || item.tipoJornada}
              </div>
              <div>
                <span className="text-muted-foreground">Horas semanales:</span>{" "}
                {item.horas_semanales ?? item.horasSemanales}
              </div>
              {item.horario ? (
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground">Horario:</span>{" "}
                  {item.horario}
                </div>
              ) : null}
            </div>
          </div>

          {item.tipo_contrato !== "prestacion_servicios" ? (
            <div className="bg-gradient-to-br from-purple-50 via-white to-purple-50 border border-purple-100 rounded-xl p-5">
              <div className="font-semibold mb-4 text-gray-900">Prestaciones</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Vacaciones:</span>{" "}
                  {item.dias_vacaciones ?? item.diasVacaciones} días
                </div>
                <div>
                  <span className="text-muted-foreground">Aguinaldo:</span>{" "}
                  {item.aguinaldo_dias ?? item.aguinaldoDias} días
                </div>
                <div>
                  <span className="text-muted-foreground">Prima Vacacional:</span>{" "}
                  {(item.prima_vacacional ?? item.primaVacacionalPorcentaje) + "%"}
                </div>
                {item.prestaciones_superiores || item.prestacionesSuperiores ? (
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground">
                      Prestaciones Superiores:
                    </span>{" "}
                    {item.prestaciones_superiores || item.prestacionesSuperiores}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {item.notas ? (
            <div className="bg-gradient-to-br from-slate-50 via-white to-slate-50 border border-slate-200 rounded-xl p-5">
              <div className="font-semibold mb-4 text-gray-900">Notas</div>
              <div className="text-sm">{item.notas}</div>
            </div>
          ) : null}
        </div>

        <div className="bg-gray-50 border-t border-gray-100 p-4 flex flex-col sm:flex-row gap-2 sm:justify-end">
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
            onClick={() => {
              const { doc, nombreArchivo } = buildContratoPDF();
              doc.save(nombreArchivo);
            }}
            disabled={isPreparingPrint}
            className="border-gray-300 text-gray-700 hover:bg-gray-100 gap-2"
          >
            <Download className="h-4 w-4" />
            Descargar PDF
          </Button>

          <Button
            onClick={async () => {
              setIsPreparingPrint(true);
              try {
                await new Promise((resolve) => setTimeout(resolve, 0));
                const { doc, nombreArchivo } = buildContratoPDF();
                await imprimirPDF(doc, nombreArchivo);
              } finally {
                setIsPreparingPrint(false);
              }
            }}
            disabled={isPreparingPrint}
            className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white gap-2"
          >
            {isPreparingPrint ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Printer className="h-4 w-4" />
            )}
            {isPreparingPrint ? "Preparando..." : "Imprimir contrato"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
