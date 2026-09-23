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
import { firmaDigitalAdminApi } from "@/lib/firmaDigitalApi";
import styles from "./finiquitos-theme.module.css";
import FiniquitoResumen, { money } from "./FiniquitoResumen";
import { jsPDF } from "jspdf";
import dayjs from "dayjs";
import { useAuth } from "@/context/AuthContext";
import useSWR from "swr";
import { fetcherWithToken, swr_config } from "@/lib/fetcher";
import { fetchImageAsDataUrl } from "@/lib/pdfCompanyLogo";
import { ADAMIA, gradientLine, applyAdamiaFont } from "@/lib/pdfAdamiaTheme";
import {
  Check,
  Copy,
  Download,
  FileSignature,
  RefreshCw,
  Loader2,
  Printer,
} from "lucide-react";

// Keep newly created links while this page is open, even when the status endpoint
// omits the URL. Match the request ID to avoid reusing a replaced or expired link.
const signatureLinks = new Map();

function signatureLink(source) {
  const raw =
    source?.url_firma_completa ||
    source?.url_firma ||
    source?.url ||
    (source?.token ? `/firmar/${encodeURIComponent(source.token)}` : null);
  if (!raw) return null;
  try {
    const url = new URL(raw, window.location.origin);
    return ["https:", "http:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export default function FiniquitoViewDialog({
  open,
  setOpen,
  id,
  justSaved = false,
  onUpdated,
}) {
  const { dataUser } = useAuth();
  const [det, setDet] = useState(null);
  // Use the saved record's company, including when viewing another business unit.
  const idEmpresa = det?.id_empresa;
  const [loadError, setLoadError] = useState("");
  const [reloadDetail, setReloadDetail] = useState(0);
  const [refreshFirma, setRefreshFirma] = useState(0);
  const [estadoConsultado, setEstadoConsultado] = useState(false);
  const [errorConsulta, setErrorConsulta] = useState("");
  const [confirmPayment, setConfirmPayment] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  /**
   * Datos de empresa para marca/imagen en el PDF (formato unificado).
   * - Relación: `src/app/panel/cuenta/Empresa/ImagenEmpresa.jsx`.
   */
  const { data: empresaData } = useSWR(
    idEmpresa ? `/empresas/${idEmpresa}` : null,
    fetcherWithToken,
    swr_config
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

  const [loading, setLoading] = useState(true);
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);
  const [solicitandoFirma, setSolicitandoFirma] = useState(false);
  const [solicitudFirma, setSolicitudFirma] = useState(null);
  const [estadoFirma, setEstadoFirma] = useState(null);
  const [consultandoFirma, setConsultandoFirma] = useState(false);
  const [abriendoDocumentoFirmado, setAbriendoDocumentoFirmado] =
    useState(false);
  const [errorFirma, setErrorFirma] = useState("");
  const [enlaceCopiado, setEnlaceCopiado] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!open || !id) return;

      setDet(null);
      setLoadError("");
      setEstadoConsultado(false);
      setSolicitudFirma(null);
      setEstadoFirma(null);
      setErrorFirma("");
      setEnlaceCopiado(false);
      setLoading(true);

      try {
        const data = await finiquitosApi.detalle(id);
        if (active) setDet(data);
      } catch (error) {
        if (active)
          setLoadError(
            error?.response?.data?.error ||
              "No se pudo cargar el finiquito. Inténtalo de nuevo."
          );
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [open, id, reloadDetail]);

  /**
   * PDF unificado (formato nuevo) - Detalle de Finiquito/Liquidación (desde modal Ver).
   * - Relación:
   *   - Botón "📄 Descargar PDF" en el footer de este diálogo.
   *   - El contenido proviene de `det` (endpoint `finiquitosApi.detalle`).
   */
  const buildPdfFormatoNuevo = async () => {
    if (!det) return;

    const doc = new jsPDF({
      orientation: "p",
      unit: "mm",
      format: "a4",
      compress: true,
    });
    // Tipografía corporativa Adamia (Poppins con fallback Helvetica).
    const FONT = await applyAdamiaFont(doc);
    const pageWidth = 210;
    const pageHeight = 297;
    const marginLeft = 20;
    const marginRight = 20;
    const contentWidth = pageWidth - marginLeft - marginRight;
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
    const hRule = (yPos, width = contentWidth, lineWidth = 0.2) => {
      doc.setDrawColor(...ADAMIA.hairline);
      doc.setLineWidth(lineWidth);
      doc.line(marginLeft, yPos, marginLeft + width, yPos);
    };
    const sectionTitle = (text) => {
      needSpace(12);
      doc.setFont(FONT, "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...ADAMIA.muted);
      doc.text(String(text || "").toUpperCase(), marginLeft, y + 5, {
        charSpace: 0.5,
      });
      hRule(y + 7, contentWidth, 0.2);
      y += 12;
    };
    const fieldPair = (label, value, x, yPos, width = contentWidth / 2 - 4) => {
      doc.setFont(FONT, "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...ADAMIA.muted);
      doc.text(String(label || "").toUpperCase(), x, yPos);
      doc.setFont(FONT, "normal");
      doc.setFontSize(10);
      doc.setTextColor(...ADAMIA.text);
      doc.text(safe(value), x, yPos + 5);
      doc.setDrawColor(...ADAMIA.hairline);
      doc.setLineWidth(0.2);
      doc.line(x, yPos + 7, x + width, yPos + 7);
    };
    const drawWrappedSectionText = ({
      sectionName,
      textValue,
      emptyFallback,
    }) => {
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
      doc.setFont(FONT, "normal");
      doc.setFontSize(10);
      doc.setTextColor(...(textValue ? ADAMIA.text : ADAMIA.muted));
      for (const paragraph of paragraphs) {
        const cleanedParagraph = paragraph.trim();
        if (!cleanedParagraph) {
          safeLines.push("");
          continue;
        }
        const breakableParagraph = cleanedParagraph.replace(
          /(\S{24})(?=\S)/g,
          "$1 "
        );
        safeLines.push(
          ...doc.splitTextToSize(breakableParagraph, maxTextWidth)
        );
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
      doc.setFont(FONT, "normal");
      doc.setFontSize(10);
      rows.forEach(([label, amount]) => {
        needSpace(8);
        doc.setTextColor(...ADAMIA.text2);
        doc.text(safe(label), marginLeft, y);
        doc.setTextColor(...ADAMIA.text);
        doc.setFont(FONT, "bold");
        doc.text(safe(amount), pageWidth - marginRight, y, { align: "right" });
        doc.setFont(FONT, "normal");
        doc.setDrawColor(...ADAMIA.hairline);
        doc.setLineWidth(0.2);
        doc.line(marginLeft, y + 2, pageWidth - marginRight, y + 2);
        y += 7;
      });
      y += 4;
    };

    const companyName =
      safe(
        empresaData?.nombre_empresa ||
          det?.nombre_empresa ||
          (Number(dataUser?.id_empresa) === Number(idEmpresa)
            ? dataUser?.empresa?.nombre_empresa
            : "")
      ) || "ADAMIA Human Resources";
    const tipoDocumento = det.es_liquidacion ? "LIQUIDACION" : "FINIQUITO";
    const folio = String(det.id_finiquito || det.id || id || "").padStart(
      3,
      "0"
    );
    const fechaBaja = det.fecha_baja
      ? dayjs(det.fecha_baja).format("DD/MM/YYYY")
      : "—";
    const empleadoName = safe(det.nombre_completo || "—");
    const totalPagar = money(det.total_pagar);

    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, "PNG", marginLeft, y, 28, 10);
      } catch {}
    }
    doc.setFont(FONT, "bold");
    doc.setFontSize(13);
    doc.setTextColor(...ADAMIA.text);
    doc.text(tipoDocumento, pageWidth - marginRight, y + 6, { align: "right" });
    doc.setFont(FONT, "normal");
    doc.setFontSize(8);
    doc.setTextColor(...ADAMIA.muted);
    doc.text(`Folio #${folio}`, pageWidth - marginRight, y + 11, {
      align: "right",
    });
    doc.text(dayjs().format("DD/MM/YYYY"), pageWidth - marginRight, y + 15.5, {
      align: "right",
    });

    y += 20;
    gradientLine(doc, marginLeft, pageWidth - marginRight, y, 0.55);
    y += 6;

    const boxWidth = 24;
    const boxGap = 8;
    const metaWidth = contentWidth - boxWidth - boxGap;
    const col = metaWidth / 3;
    doc.setFont(FONT, "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...ADAMIA.muted);
    doc.text("TIPO", marginLeft, y + 3);
    doc.text("EMPLEADO", marginLeft + col, y + 3);
    doc.text("FECHA BAJA", marginLeft + col * 2, y + 3);
    doc.setFont(FONT, "bold");
    doc.setFontSize(10);
    doc.setTextColor(...ADAMIA.text);
    doc.text(tipoDocumento, marginLeft, y + 9);
    doc.text(empleadoName, marginLeft + col, y + 9, { maxWidth: col - 6 });
    doc.text(fechaBaja, marginLeft + col * 2, y + 9, { maxWidth: col - 6 });

    doc.setFont(FONT, "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...ADAMIA.muted);
    doc.text("TOTAL", pageWidth - marginRight, y + 3, {
      align: "right",
      charSpace: 0.5,
    });
    doc.setFont(FONT, "bold");
    doc.setFontSize(12);
    doc.setTextColor(...ADAMIA.blue);
    doc.text(totalPagar, pageWidth - marginRight, y + 9, { align: "right" });

    y += 18;
    hRule(y, contentWidth, 0.2);
    y += 8;

    sectionTitle("Datos del empleado");
    needSpace(20);
    fieldPair("Nombre completo", empleadoName, marginLeft, y);
    fieldPair(
      "Puesto",
      det.puesto || "—",
      marginLeft + contentWidth / 2 + 4,
      y
    );
    y += 16;
    fieldPair("Departamento", det.departamento || "—", marginLeft, y);
    fieldPair(
      "Fecha ingreso",
      det.fecha_ingreso ? dayjs(det.fecha_ingreso).format("DD/MM/YYYY") : "—",
      marginLeft + contentWidth / 2 + 4,
      y
    );
    y += 16;
    fieldPair("Anios trabajados", `${det.años_trabajados || 0}`, marginLeft, y);
    fieldPair(
      "Salario diario",
      money(det.salario_diario),
      marginLeft + contentWidth / 2 + 4,
      y
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
        doc.setDrawColor(...ADAMIA.text2);
        doc.setLineWidth(0.3);
        doc.line(marginLeft + 5, yFirmas, marginLeft + 75, yFirmas);
        doc.setFont(FONT, "normal");
        doc.setFontSize(7);
        doc.setTextColor(...ADAMIA.muted);
        doc.text("FIRMA DEL TRABAJADOR", marginLeft + 40, yFirmas + 5, {
          align: "center",
          charSpace: 0.5,
        });
        doc.setFont(FONT, "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(...ADAMIA.text2);
        doc.text(empleadoName.slice(0, 40), marginLeft + 40, yFirmas + 10, {
          align: "center",
        });

        doc.setDrawColor(...ADAMIA.text2);
        doc.setLineWidth(0.3);
        doc.line(
          pageWidth - marginRight - 75,
          yFirmas,
          pageWidth - marginRight - 5,
          yFirmas
        );
        doc.setFont(FONT, "normal");
        doc.setFontSize(7);
        doc.setTextColor(...ADAMIA.muted);
        doc.text(
          "REPRESENTANTE DE LA EMPRESA",
          pageWidth - marginRight - 40,
          yFirmas + 5,
          { align: "center", charSpace: 0.5 }
        );
        doc.setFont(FONT, "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(...ADAMIA.text2);
        doc.text(
          companyName.slice(0, 40),
          pageWidth - marginRight - 40,
          yFirmas + 10,
          {
            align: "center",
          }
        );
      }
      const lineY = pageHeight - 14;
      const footerTextY = pageHeight - 9;
      gradientLine(doc, marginLeft, pageWidth - marginRight, lineY, 0.35);
      doc.setFont(FONT, "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...ADAMIA.blue);
      doc.text("Adamia", marginLeft, footerTextY);
      const brandW = doc.getTextWidth("Adamia");
      doc.setFont(FONT, "normal");
      doc.setTextColor(...ADAMIA.muted);
      doc.text(
        " · Finiquitos y Liquidaciones",
        marginLeft + brandW,
        footerTextY
      );
      doc.setFontSize(6.5);
      doc.text(
        `Generado el ${fechaGenerado} a las ${horaGenerado} · Folio #${folio}`,
        pageWidth / 2 + 12,
        footerTextY,
        { align: "center" }
      );
      doc.setFontSize(7.5);
      doc.text(
        `Página ${p} de ${totalPages}`,
        pageWidth - marginRight,
        footerTextY,
        {
          align: "right",
        }
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

  const descargarPDFFormatoNuevo = async () => {
    const built = await buildPdfFormatoNuevo();
    if (!built) return;
    built.doc.save(built.nombreArchivo);
  };

  useEffect(() => {
    let active = true;
    let inFlight = false;
    const consultar = async () => {
      if (!open || !id || !idEmpresa || !det?.id_empleado || inFlight) return;
      inFlight = true;
      setConsultandoFirma(true);
      try {
        const respuesta = await firmaDigitalAdminApi.obtenerEstadoDocumento({
          idEmpresa,
          tipoDocumento: "FINIQUITO",
          referenciaId: id,
        });
        if (!active) return;
        const solicitud = respuesta?.solicitud || null;
        setEstadoFirma(solicitud);
        const cacheKey = `${idEmpresa}:${id}`;
        const requestId = solicitud?.id || solicitud?.id_solicitud;
        const cached = signatureLinks.get(cacheKey);
        const isPending = ["pendiente", "abierto"].includes(solicitud?.estatus);
        const link =
          signatureLink(solicitud) ||
          signatureLink(respuesta) ||
          (requestId && String(cached?.id) === String(requestId)
            ? cached.url
            : null);
        if (isPending && link && requestId)
          signatureLinks.set(cacheKey, { id: requestId, url: link });
        if (!isPending) signatureLinks.delete(cacheKey);
        setSolicitudFirma(
          isPending && link ? { ...solicitud, url_firma_completa: link } : null
        );
        setEstadoConsultado(true);
        setErrorConsulta("");
      } catch (error) {
        if (active)
          setErrorConsulta(
            error?.response?.data?.error ||
              "No se pudo actualizar el estado de la firma."
          );
      } finally {
        inFlight = false;
        if (active) setConsultandoFirma(false);
      }
    };
    consultar();
    const refreshVisible = () => {
      if (!document.hidden) consultar();
    };
    const timer = setInterval(refreshVisible, 15000);
    window.addEventListener("focus", refreshVisible);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", refreshVisible);
    };
  }, [open, id, idEmpresa, det?.id_empleado, refreshFirma]);

  const marcarPagado = async () => {
    if (savingPayment || !det) return;
    setSavingPayment(true);
    setPaymentError("");
    try {
      await finiquitosApi.actualizarEstado(id, "Pagado");
      setDet((current) => ({ ...current, estado: "Pagado" }));
      setConfirmPayment(false);
      onUpdated?.();
    } catch (error) {
      setPaymentError(
        error?.response?.data?.error ||
          "No se pudo actualizar el estado del pago."
      );
    } finally {
      setSavingPayment(false);
    }
  };

  const abrirDocumentoFirmado = async () => {
    if (!(estadoFirma?.id || estadoFirma?.id_solicitud) || !idEmpresa) return;

    setAbriendoDocumentoFirmado(true);
    setErrorFirma("");

    try {
      const respuesta = await firmaDigitalAdminApi.obtenerDocumentoFirmado({
        idSolicitud: estadoFirma.id || estadoFirma.id_solicitud,
        idEmpresa,
      });

      if (!respuesta?.documento_url) {
        throw new Error("No se recibió el acceso al documento firmado.");
      }

      window.open(respuesta.documento_url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setErrorFirma(
        error?.response?.data?.error ||
          error?.message ||
          "No fue posible abrir el documento firmado."
      );
    } finally {
      setAbriendoDocumentoFirmado(false);
    }
  };

  const solicitarFirma = async () => {
    if (
      !det ||
      !idEmpresa ||
      !det.id_empleado ||
      !id ||
      solicitandoFirma ||
      !estadoConsultado ||
      errorConsulta
    )
      return;

    setSolicitandoFirma(true);
    setErrorFirma("");
    setSolicitudFirma(null);
    setEnlaceCopiado(false);

    try {
      const built = await buildPdfFormatoNuevo();

      if (!built) {
        throw new Error("No fue posible generar el PDF del finiquito.");
      }

      const documento = built.doc.output("blob");

      const solicitud = await firmaDigitalAdminApi.crearSolicitud({
        idEmpresa,
        idEmpleado: det.id_empleado,
        tipoDocumento: "FINIQUITO",
        referenciaId: id,
        documento,
        nombreArchivo: built.nombreArchivo,
        expiracionHoras: 72,
      });

      const created = solicitud?.solicitud || solicitud;
      const urlFirma = signatureLink(created) || signatureLink(solicitud);
      setSolicitudFirma({ ...created, url_firma_completa: urlFirma });
      const requestId = created.id_solicitud || created.id;
      if (urlFirma && requestId)
        signatureLinks.set(`${idEmpresa}:${id}`, {
          id: requestId,
          url: urlFirma,
        });
      setEstadoFirma({
        ...created,
        id: created.id_solicitud || created.id,
        tipo_documento: "FINIQUITO",
        referencia_id: id,
        nombre_documento: built.nombreArchivo,
        nombre_firmante: created.firmante?.nombre || det.nombre_completo,
        estatus: created.estatus || "pendiente",
      });
    } catch (error) {
      setErrorFirma(
        error?.response?.data?.error ||
          error?.message ||
          "No fue posible crear la solicitud de firma."
      );
    } finally {
      setSolicitandoFirma(false);
    }
  };

  const copiarEnlaceFirma = async () => {
    if (!solicitudFirma?.url_firma_completa) return;

    try {
      await navigator.clipboard.writeText(solicitudFirma.url_firma_completa);
      setEnlaceCopiado(true);

      setTimeout(() => {
        setEnlaceCopiado(false);
      }, 2000);
    } catch {
      setErrorFirma("No fue posible copiar el enlace.");
    }
  };

  const signed = estadoFirma?.estatus === "firmado";
  const pending = ["pendiente", "abierto"].includes(estadoFirma?.estatus);
  const paid = det?.estado?.toLowerCase() === "pagado";
  const expired = ["expirado", "vencido"].includes(estadoFirma?.estatus);
  const busy = solicitandoFirma || savingPayment || isPreparingPrint;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!busy) setOpen(next);
      }}
    >
      <DialogContent
        className={`${styles.detailDialog} p-0 gap-0 w-[calc(100%-2rem)] sm:max-w-[1040px] max-h-[92dvh] overflow-y-auto`}
      >
        <DialogHeader className={styles.dialogHeading}>
          <div className={styles.eyebrow}>
            {det?.es_liquidacion ? "Liquidación" : "Finiquito"}{" "}
            <span>#{id}</span>
          </div>
          <DialogTitle className="text-xl font-semibold text-slate-900 leading-tight">
            {det?.nombre_completo || "Detalle del finiquito"}
          </DialogTitle>
          <DialogDescription>
            {justSaved
              ? "Guardado correctamente. Continúa con la firma del documento."
              : "Consulta el documento, su firma y el estado del pago."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className={styles.dialogLoading} role="status">
            <Loader2 className="animate-spin" /> Cargando finiquito…
          </div>
        ) : loadError || !det ? (
          <div className="p-6">
            <p role="alert" className={styles.errorNotice}>
              {loadError || "No se encontró el finiquito."}
            </p>
            <Button
              variant="outline"
              className="mt-3"
              onClick={() => setReloadDetail((v) => v + 1)}
            >
              Reintentar
            </Button>
          </div>
        ) : (
          <div className={styles.dialogGrid}>
            <section
              className={styles.documentColumn}
              aria-label="Documento guardado"
            >
              <div className={styles.documentMeta}>
                <div>
                  <span>Fecha de baja</span>
                  <strong>
                    {det.fecha_baja
                      ? dayjs(det.fecha_baja).format("DD/MM/YYYY")
                      : "—"}
                  </strong>
                </div>
                <div>
                  <span>Terminación</span>
                  <strong>{det.tipo_terminacion || "—"}</strong>
                </div>
              </div>
              <h3 className={styles.smallHeading}>Desglose del documento</h3>
              <FiniquitoResumen data={det} />
              {det.motivo_baja && (
                <details className={styles.disclosure}>
                  <summary>Motivo de baja</summary>
                  <p className={styles.reasonText}>{det.motivo_baja}</p>
                </details>
              )}
              <div className={styles.documentActions}>
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      await descargarPDFFormatoNuevo();
                    } catch {
                      setErrorFirma(
                        "No se pudo generar el PDF. Inténtalo de nuevo."
                      );
                    }
                  }}
                  disabled={busy}
                >
                  <Download size={16} /> Descargar PDF
                </Button>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={async () => {
                    setIsPreparingPrint(true);
                    try {
                      const built = await buildPdfFormatoNuevo();
                      if (built)
                        await imprimirPDF(built.doc, built.nombreArchivo);
                    } catch {
                      setErrorFirma("No se pudo preparar la impresión.");
                    } finally {
                      setIsPreparingPrint(false);
                    }
                  }}
                >
                  {isPreparingPrint ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Printer size={16} />
                  )}
                  {isPreparingPrint ? "Preparando…" : "Imprimir"}
                </Button>
              </div>
              {signed && (
                <p className={styles.helpText}>
                  Estas opciones generan el documento original. La versión con
                  firma está en «Ver PDF firmado».
                </p>
              )}
            </section>

            <aside className={styles.signatureColumn} aria-label="Firma y pago">
              <section className={styles.signaturePanel}>
                <div className={styles.signatureIcon}>
                  {signed ? <Check size={22} /> : <FileSignature size={22} />}
                </div>
                <div className={styles.summaryHeading}>
                  <h3>Firma del documento</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Actualizar estado de firma"
                    title="Actualizar estado de firma"
                    disabled={consultandoFirma || solicitandoFirma}
                    onClick={() => setRefreshFirma((v) => v + 1)}
                  >
                    <RefreshCw
                      size={16}
                      className={consultandoFirma ? "animate-spin" : ""}
                    />
                  </Button>
                </div>
                {!estadoConsultado ? (
                  <p className={styles.helpText}>
                    {errorConsulta
                      ? "Estado de firma sin confirmar."
                      : "Consultando estado de firma…"}
                  </p>
                ) : signed ? (
                  <>
                    <span className={styles.successBadge}>
                      Documento firmado
                    </span>
                    <p className={styles.signatureDescription}>
                      {estadoFirma.nombre_firmante || det.nombre_completo}{" "}
                      completó la firma
                      {estadoFirma.signed_at
                        ? ` el ${dayjs(estadoFirma.signed_at).format(
                            "DD/MM/YYYY HH:mm"
                          )}`
                        : ""}
                      .
                    </p>
                    <Button
                      className={styles.primaryButton}
                      onClick={abrirDocumentoFirmado}
                      disabled={
                        abriendoDocumentoFirmado ||
                        !(estadoFirma.id || estadoFirma.id_solicitud)
                      }
                    >
                      {abriendoDocumentoFirmado ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Download size={16} />
                      )}
                      {abriendoDocumentoFirmado
                        ? "Abriendo…"
                        : "Ver PDF firmado"}
                    </Button>
                  </>
                ) : pending ? (
                  <>
                    <span className={styles.pendingBadge}>
                      {estadoFirma.estatus === "abierto"
                        ? "Enlace abierto · por firmar"
                        : "Pendiente de firma"}
                    </span>
                    <p className={styles.signatureDescription}>
                      Comparte el enlace con{" "}
                      {estadoFirma.nombre_firmante || det.nombre_completo} para
                      revisar y firmar el documento.
                    </p>
                    {solicitudFirma?.url_firma_completa ? (
                      <div className={styles.linkActions}>
                        <label className={styles.field}>
                          <span>Enlace de firma</span>
                          <input
                            readOnly
                            value={solicitudFirma.url_firma_completa}
                            onFocus={(event) => event.target.select()}
                          />
                        </label>
                        <Button
                          className={styles.primaryButton}
                          onClick={copiarEnlaceFirma}
                        >
                          {enlaceCopiado ? (
                            <Check size={16} />
                          ) : (
                            <Copy size={16} />
                          )}
                          {enlaceCopiado
                            ? "Enlace copiado"
                            : "Copiar enlace de firma"}
                        </Button>
                        <a
                          className={styles.textLink}
                          href={solicitudFirma.url_firma_completa}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Abrir página de firma
                        </a>
                      </div>
                    ) : (
                      <p className={styles.helpText}>
                        La solicitud está vigente. El enlace no está disponible
                        en esta consulta; utiliza el enlace compartido al
                        crearla.
                      </p>
                    )}
                    {estadoFirma.expires_at && (
                      <p className={styles.helpText}>
                        Vence:{" "}
                        {dayjs(estadoFirma.expires_at).format(
                          "DD/MM/YYYY HH:mm"
                        )}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <span className={styles.neutralBadge}>
                      {expired ? "Enlace vencido" : "Sin solicitud de firma"}
                    </span>
                    <p className={styles.signatureDescription}>
                      {expired
                        ? "Genera un nuevo enlace para que el empleado pueda firmar."
                        : "El documento está listo. Genera el enlace para que el empleado active su cámara, lo revise y firme."}
                    </p>
                    <Button
                      className={styles.primaryButton}
                      onClick={solicitarFirma}
                      disabled={
                        !idEmpresa ||
                        !det.id_empleado ||
                        solicitandoFirma ||
                        consultandoFirma ||
                        !!errorConsulta ||
                        isPreparingPrint
                      }
                    >
                      {solicitandoFirma ? (
                        <Loader2 size={17} className="animate-spin" />
                      ) : (
                        <FileSignature size={17} />
                      )}
                      {solicitandoFirma
                        ? "Generando enlace…"
                        : expired
                        ? "Generar nuevo enlace"
                        : "Solicitar firma"}
                    </Button>
                    <p className={styles.nextStep}>
                      El enlace tiene una vigencia de 72 horas.
                    </p>
                  </>
                )}
                {!idEmpresa && (
                  <p className={styles.errorNotice}>
                    El registro no incluye la empresa. No es posible solicitar
                    la firma.
                  </p>
                )}
                {errorConsulta && (
                  <div role="alert" className={styles.errorNotice}>
                    {errorConsulta}
                    <button
                      className={styles.retryLink}
                      onClick={() => setRefreshFirma((v) => v + 1)}
                      disabled={consultandoFirma}
                    >
                      Reintentar consulta
                    </button>
                  </div>
                )}
                {errorFirma && (
                  <p role="alert" className={styles.errorNotice}>
                    {errorFirma}
                  </p>
                )}
              </section>

              <section
                className={styles.paymentPanel}
                aria-label="Estado del pago"
              >
                <div className={styles.summaryHeading}>
                  <h3>Estado del pago</h3>
                  <span
                    className={paid ? styles.successBadge : styles.neutralBadge}
                  >
                    {det.estado || "Pendiente"}
                  </span>
                </div>
                <p className={styles.helpText}>
                  {paid
                    ? "El pago está registrado."
                    : "Registra el pago cuando se haya realizado."}
                </p>
                {!paid &&
                  (confirmPayment ? (
                    <div className={styles.paymentConfirmation}>
                      <p>
                        ¿Confirmas que se realizó el pago de{" "}
                        <strong>{money(det.total_pagar)}</strong>?
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={marcarPagado}
                          disabled={savingPayment}
                        >
                          {savingPayment ? "Guardando…" : "Confirmar pago"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={savingPayment}
                          onClick={() => setConfirmPayment(false)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => setConfirmPayment(true)}
                    >
                      Marcar como pagado
                    </Button>
                  ))}
                {paymentError && (
                  <p role="alert" className={styles.errorNotice}>
                    {paymentError}
                  </p>
                )}
              </section>
            </aside>
          </div>
        )}
        <DialogFooter className={styles.dialogFooter}>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setOpen(false)}
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
