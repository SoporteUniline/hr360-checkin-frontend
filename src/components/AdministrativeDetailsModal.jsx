"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { twMerge } from "tailwind-merge";
import { CardCompact } from "./CardCompact";
import { Button } from "@/components/ui/button";
import { jsPDF } from "jspdf";
import { useAuth } from "@/context/AuthContext";
import useSWR from "swr";
import { fetcherWithToken, swr_config } from "@/lib/fetcher";
import { fetchImageAsDataUrl } from "@/lib/pdfCompanyLogo";
import { ADAMIA, gradientLine, applyAdamiaFont } from "@/lib/pdfAdamiaTheme";
import { useEffect, useState } from "react";
import { useSnackbar } from "notistack";
import { administrativeMinutesApi } from "@/lib/administrativeMinutesApi";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  AlertTriangle,
  Download,
  Loader2,
  Printer,
} from "lucide-react";

dayjs.locale("es");

export const AdministrativeDetailsModal = ({
  open,
  onClose,
  acta,
  /**
   * Callback opcional para refrescar el listado (SWR mutate) cuando se cambia el estatus.
   * Relación: `src/app/panel/actas-administrativas/page.jsx` -> `useAdministrativeMinutes().mutate`
   */
  onEstatusUpdated,
}) => {
  const { dataUser } = useAuth();
  console.log(dataUser);
  const { enqueueSnackbar } = useSnackbar();
  const idEmpresa = acta?.id_empresa;

  /**
   * Datos de empresa para marca/imagen en el PDF (formato unificado).
   * Relación: mismo patrón usado en:
   * - `src/app/panel/permisos/PermisoViewDialog.jsx`
   * - `src/app/panel/finiquitos-y-liquidaciones/FiniquitoViewDialog.jsx`
   */
  const { data: empresaData } = useSWR(
    idEmpresa ? `/empresas/${idEmpresa}` : null,
    fetcherWithToken,
    swr_config,
  );

  /**
   * Logo precargado como DataURL (con fallback a `/assets/logo.png`).
   * Relación: el logo se sube/edita en `src/app/panel/cuenta/Empresa/ImagenEmpresa.jsx`.
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

  /**
   * IMPORTANTE (React hooks):
   * - NO se debe hacer `return null` antes de hooks, porque `acta` puede cambiar de null → objeto
   *   y eso rompe el orden de hooks (error interno en React/Next).
   * - Relación: mismo comentario ya aplicado en `src/app/panel/permisos/PermisoViewDialog.jsx`.
   */
  /**
   * Estado local del estatus para reflejar el cambio instantáneamente en el UI.
   * Relación:
   * - La fuente original viene de `useAdministrativeMinutes` (listado).
   * - Al cambiar estatus usamos `administrativeMinutesApi.actualizarEstatus` y actualizamos este estado.
   */
  const [estatusLocal, setEstatusLocal] = useState(acta?.estatus);
  const [openEstatusDialog, setOpenEstatusDialog] = useState(false);
  const [estatusNuevo, setEstatusNuevo] = useState(
    String(acta?.estatus || "").toLowerCase(),
  );
  const [savingEstatus, setSavingEstatus] = useState(false);
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);

  useEffect(() => {
    // Cuando cambia el acta (por abrir otra), sincronizamos estado local.
    setEstatusLocal(acta?.estatus);
    setEstatusNuevo(String(acta?.estatus || "").toLowerCase());
  }, [acta?.id_acta, acta?.estatus]);

  // Mantener el guard clause DESPUÉS de TODOS los hooks (para no romper el orden).
  if (!acta) return null;

  const estatusOptions = [
    { value: "elaborada", label: "Elaborada" },
    { value: "notificada", label: "Notificada" },
    { value: "cerrada", label: "Cerrada" },
  ];

  const badgeClassByEstatus = (estatus) => {
    const e = String(estatus || "").toLowerCase();
    return `capitalize px-3 py-1 rounded-2xl text-xs font-semibold ${
      e === "elaborada"
        ? "bg-blue-200 text-blue-800"
        : e === "cerrada"
        ? "bg-red-200 text-red-800"
        : e === "notificada"
        ? "bg-emerald-200 text-emerald-800"
        : "bg-purple-200 text-purple-800"
    }`;
  };

  const onGuardarEstatus = async () => {
    try {
      if (!idEmpresa) {
        enqueueSnackbar("No se encontró la empresa en sesión (id_empresa).", {
          variant: "error",
        });
        return;
      }
      if (!acta?.id_acta) {
        enqueueSnackbar("No se encontró el ID del acta.", { variant: "error" });
        return;
      }

      setSavingEstatus(true);
      const resp = await administrativeMinutesApi.actualizarEstatus(
        acta.id_acta,
        {
          id_empresa: idEmpresa,
          estatus: estatusNuevo,
        },
      );

      setEstatusLocal(resp?.estatus || estatusNuevo);
      enqueueSnackbar("Estatus actualizado correctamente", {
        variant: "success",
      });
      setOpenEstatusDialog(false);

      // Refrescar listado (si el padre lo manda), para que el cambio se vea en la tabla también.
      await onEstatusUpdated?.();
    } catch (error) {
      console.error("Error al actualizar estatus del acta:", error);
      enqueueSnackbar(
        error?.response?.data?.error ||
          "Hubo un error al actualizar el estatus del acta",
        { variant: "error" },
      );
    } finally {
      setSavingEstatus(false);
    }
  };

  const formatSancion = (str) => {
    if (!str) return "";
    return str.replace(/_/g, " ").toUpperCase();
  };

  /**
   * Genera PDF con formato unificado (mismo estilo aplicado en otros módulos).
   * - Relación: lo reutilizamos para descargar e imprimir.
   */
  const buildActaPdfFormatoPermisos = async () => {
    const doc = new jsPDF("p", "mm", "a4");
    // Tipografía corporativa Adamia (Poppins con fallback a Helvetica).
    const FONT = await applyAdamiaFont(doc);
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

    const needSpace = (height) => {
      if (y + height > pageHeight - 65) {
        doc.addPage();
        y = marginLeft;
      }
    };

    // Regla horizontal fina (hairline) — lenguaje Adamia: líneas, sin cajas negras.
    const hRule = (yPos, width = contentWidth) => {
      doc.setDrawColor(...ADAMIA.hairline);
      doc.setLineWidth(0.2);
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
      hRule(y + 7, contentWidth);
      y += 12;
    };

    const fieldPair = (
      label,
      value,
      x,
      yPos,
      width = contentWidth / 2 - 4,
      { valueColor = ADAMIA.text, valueFont = "normal" } = {},
    ) => {
      doc.setFont(FONT, "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...ADAMIA.muted);
      doc.text(String(label || "").toUpperCase(), x, yPos);
      doc.setFont(FONT, valueFont);
      doc.setFontSize(10);
      doc.setTextColor(...valueColor);
      doc.text(safe(value), x, yPos + 5);
      doc.setDrawColor(...ADAMIA.hairline);
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
          "$1 ",
        );
        safeLines.push(...doc.splitTextToSize(breakableParagraph, maxTextWidth));
      }

      for (const line of safeLines) {
        needSpace(lineHeight + 2);
        doc.text(String(line || " "), marginLeft + textInsetLeft, y);
        y += lineHeight;
      }

      hRule(y + 1, contentWidth);
      y += 10;
    };

    const companyName =
      safe(empresaData?.nombre_empresa || dataUser?.empresa?.nombre_empresa) ||
      "ADAMIA Human Resources";
    const empleadoName = safe(
      `${acta.nombre_empleado || ""} ${acta.apellido_paterno_empleado || ""} ${
        acta.apellido_materno_empleado || ""
      }`,
    );
    const folio = safe(acta.folio || acta.id_acta || "—");
    const estatus = safe(acta.estatus || "—");
    const gravedad = safe(acta.gravedad_tipo || "—");
    const tipoActa = safe(acta.nombre_tipo_acta || "—");
    const fechaIncidente = acta.fecha_incidente
      ? dayjs(acta.fecha_incidente).format("DD/MM/YYYY")
      : "—";

    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, "PNG", marginLeft, y, 28, 10);
      } catch {}
    }

    doc.setFont(FONT, "bold");
    doc.setFontSize(13);
    doc.setTextColor(...ADAMIA.text);
    doc.text("Acta Administrativa", pageWidth - marginRight, y + 7, {
      align: "right",
    });
    doc.setFont(FONT, "normal");
    doc.setFontSize(8);
    doc.setTextColor(...ADAMIA.muted);
    doc.text(`Folio #${folio}`, pageWidth - marginRight, y + 13, {
      align: "right",
    });
    doc.text(
      `Fecha del incidente: ${fechaIncidente}`,
      pageWidth - marginRight,
      y + 18,
      { align: "right" },
    );

    y += 20;
    // Línea de acento degradada azul → morado (identidad Adamia).
    gradientLine(doc, marginLeft, pageWidth - marginRight, y, 0.55);
    y += 6;

    const boxWidth = 24;
    const boxGap = 8;
    const metaWidth = contentWidth - boxWidth - boxGap;
    const col = metaWidth / 3;

    doc.setFont(FONT, "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...ADAMIA.muted);
    doc.text("ESTATUS", marginLeft, y + 3);
    doc.text("TIPO", marginLeft + col, y + 3);
    doc.text("FECHA", marginLeft + col * 2, y + 3);
    doc.setFont(FONT, "bold");
    doc.setFontSize(10);
    doc.setTextColor(...ADAMIA.text);
    doc.text(estatus, marginLeft, y + 9);
    doc.text(tipoActa, marginLeft + col, y + 9);
    doc.text(fechaIncidente, marginLeft + col * 2, y + 9, { maxWidth: col - 6 });

    // Indicador de gravedad: solo hairlines, valor en azul corporativo.
    const boxX = marginLeft + metaWidth + boxGap;
    const boxY = y - 1;
    doc.setDrawColor(...ADAMIA.hairline);
    doc.setLineWidth(0.2);
    doc.rect(boxX, boxY, boxWidth, 18, "S");
    doc.setFont(FONT, "bold");
    doc.setFontSize(12);
    doc.setTextColor(...ADAMIA.blue);
    doc.text(gravedad.toUpperCase().slice(0, 5), boxX + boxWidth / 2, boxY + 10, {
      align: "center",
    });
    doc.setFont(FONT, "normal");
    doc.setFontSize(7);
    doc.setTextColor(...ADAMIA.muted);
    doc.text("GRAVEDAD", boxX + boxWidth / 2, boxY + 15, { align: "center" });

    y += 18;
    hRule(y, contentWidth);
    y += 8;

    sectionTitle("Datos del empleado");
    needSpace(20);
    fieldPair("Nombre completo", empleadoName, marginLeft, y);
    fieldPair("Empresa", companyName, marginLeft + contentWidth / 2 + 4, y);
    y += 16;
    fieldPair("Elabora", acta.nombre_quien_elabora || "—", marginLeft, y);
    fieldPair(
      "Cargo elabora",
      acta.nombre_cargo_elabora || "—",
      marginLeft + contentWidth / 2 + 4,
      y,
    );
    y += 18;

    sectionTitle("Detalle del acta");
    needSpace(20);
    const c3 = contentWidth / 3;
    fieldPair("Hora incidente", acta.hora_incidente || "—", marginLeft, y, c3 - 4);
    fieldPair("Lugar incidente", acta.lugar_incidente || "—", marginLeft + c3, y, c3 - 4);
    fieldPair("Sancion", formatSancion(acta.tipo_sancion) || "—", marginLeft + c3 * 2, y, c3 - 4);
    y += 16;
    fieldPair("Acepta hechos", acta.acepta_hechos ? "Si" : "No", marginLeft, y, c3 - 4);
    fieldPair("Reincidencia", acta.es_reincidencia ? "Si" : "No", marginLeft + c3, y, c3 - 4);
    fieldPair("Folio", `#${folio}`, marginLeft + c3 * 2, y, c3 - 4, {
      valueColor: ADAMIA.blue,
      valueFont: "bold",
    });
    y += 18;

    drawWrappedSectionText({
      sectionName: "Descripcion de los hechos",
      textValue: acta.descripcion_hechos,
      emptyFallback: "—",
    });
    drawWrappedSectionText({
      sectionName: "Testigos",
      textValue: acta.testigos,
      emptyFallback: "—",
    });
    drawWrappedSectionText({
      sectionName: "Descargo del trabajador",
      textValue: acta.descargo_trabajador,
      emptyFallback: "—",
    });

    sectionTitle("Auditoria");
    needSpace(20);
    fieldPair(
      "Fecha creacion",
      acta.fecha_creacion
        ? dayjs(acta.fecha_creacion).format("DD/MM/YYYY HH:mm")
        : "—",
      marginLeft,
      y,
    );
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
          yFirmas,
        );
        doc.setFont(FONT, "normal");
        doc.setFontSize(7);
        doc.setTextColor(...ADAMIA.muted);
        doc.text(
          "REPRESENTANTE DE LA EMPRESA",
          pageWidth - marginRight - 40,
          yFirmas + 5,
          { align: "center", charSpace: 0.5 },
        );
        doc.setFont(FONT, "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(...ADAMIA.text2);
        doc.text(companyName.slice(0, 40), pageWidth - marginRight - 40, yFirmas + 10, {
          align: "center",
        });
      }

      // Pie de página: línea degradada + marca Adamia + numeración.
      const footerLineY = pageHeight - 14;
      const footerTextY = pageHeight - 9;
      gradientLine(doc, marginLeft, pageWidth - marginRight, footerLineY, 0.35);
      doc.setFont(FONT, "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...ADAMIA.blue);
      doc.text("Adamia", marginLeft, footerTextY);
      const brandW = doc.getTextWidth("Adamia");
      doc.setFont(FONT, "normal");
      doc.setFontSize(7);
      doc.setTextColor(...ADAMIA.muted);
      doc.text(
        ` · Acta Administrativa · Generado el ${fechaGenerado} a las ${horaGenerado} · Folio #${folio}`,
        marginLeft + brandW,
        footerTextY,
      );
      doc.text(
        `Página ${p} de ${totalPages}`,
        pageWidth - marginRight,
        footerTextY,
        { align: "right" },
      );
    }

    const nombreArchivo = `ACTA_ADMINISTRATIVA_${String(
      acta.folio || "FOLIO",
    ).replace(/\s+/g, "_")}_${String(empleadoName || "Empleado").replace(
      /\s+/g,
      "_",
    )}.pdf`;
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

  const descargarPDFActaFormatoPermisos = async () => {
    const { doc, nombreArchivo } = await buildActaPdfFormatoPermisos();
    doc.save(nombreArchivo);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className={twMerge(
          "max-w-[95vw] sm:max-w-2xl md:max-w-3xl max-h-[85vh] overflow-y-auto p-0",
        )}
      >
        {/* Header - Diseño ADAMIA (patrón Contratos) */}
        <DialogHeader className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white p-6 rounded-t-lg">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6" />
            <DialogTitle className="text-white">
              📄 Acta {acta.folio || acta.id_acta}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4">
          <CardCompact
            title="📄 Información General"
            className="bg-blue-50 border-l-blue-500"
          >
            <div className="flex justify-between pb-1 border-b-1">
              <p className="text-gray-500">Empresa:</p>
              <p className="font-semibold">{acta?.nombre_empresa || "—"}</p>
            </div>

            <div className="flex justify-between pt-1 pb-2 border-b-1">
              <p className="text-gray-500">Folio:</p>
              <p className="font-semibold">{acta.folio}</p>
            </div>

            <div className="flex justify-between pt-1 pb-2 border-b-1">
              <p className="text-gray-500">Empleado:</p>
              <p className="font-semibold">
                {acta.nombre_empleado} {acta.apellido_paterno_empleado}{" "}
                {acta.apellido_materno_empleado}
              </p>
            </div>

            <div className="flex justify-between pt-1 pb-2 border-b-1">
              <p className="text-gray-500">Tipo de acta:</p>
              <p className="font-semibold">{acta.nombre_tipo_acta}</p>
            </div>

            <div className="flex justify-between pt-1 pb-2">
              <p className="text-gray-500">Gravedad:</p>
              <span
                className={twMerge(
                  "px-3 py-1 rounded-2xl text-xs font-semibold",
                  acta.gravedad_tipo === "grave"
                    ? "bg-red-200 text-red-800"
                    : "bg-yellow-100 text-yellow-800",
                )}
              >
                {acta.gravedad_tipo?.toUpperCase()}
              </span>
            </div>
          </CardCompact>

          <CardCompact
            title="📅 Detalles del Incidente"
            className="bg-green-50 border-l-green-500"
          >
            <div className="flex justify-between pb-1 border-b-1">
              <p className="text-gray-500">Fecha:</p>
              <p className="font-semibold">
                {dayjs(acta.fecha_incidente).format("DD/MM/YYYY")}
              </p>
            </div>
            <div className="flex justify-between pt-1 pb-2 border-b-1">
              <p className="text-gray-500">Hora:</p>
              <p className="font-semibold">{acta.hora_incidente}</p>
            </div>
            <div className="flex justify-between pt-1 pb-2 border-b-1">
              <p className="text-gray-500">Lugar:</p>
              <p className="font-semibold">
                {acta.lugar_incidente
                  ? acta.lugar_incidente
                  : "No especificado"}
              </p>
            </div>
            <div className="flex justify-between pt-1 pb-2">
              <p className="text-gray-500">Descripción:</p>
              <p className="font-semibold">{acta.descripcion_hechos}</p>
            </div>
          </CardCompact>

          <CardCompact
            title="⚠️ Sanción"
            className="bg-yellow-50 border-l-yellow-500"
          >
            <div className="flex justify-between pb-1 border-b-1">
              <p className="text-gray-500">Tipo:</p>
              <p className="font-semibold">
                {formatSancion(acta.tipo_sancion)}
              </p>
            </div>
            <div className="flex justify-between pt-1 pb-2">
              <p className="text-gray-500">Días de suspensión:</p>
              <p className="font-semibold">{acta.dias_suspension}</p>
            </div>
          </CardCompact>

          <CardCompact
            title="💬 Descargo del Trabajador"
            className="bg-purple-50 border-l-purple-500"
          >
            {acta.descargo_trabajador && (
              <div className="pb-3">{acta.descargo_trabajador}</div>
            )}
            <div className="flex justify-between">
              <p className="text-gray-500">Acepta los hechos:</p>
              <p className="font-semibold">
                {acta.acepta_hechos ? "✅ Sí" : "✖️ No"}
              </p>
            </div>
          </CardCompact>
          <CardCompact
            title="👤 Información Administrativa"
            className="bg-teal-50 border-l-teal-500"
          >
            <div className="flex justify-between pt-1 pb-2 border-b-1">
              <p className="text-gray-500">Elabora:</p>
              <p className="font-semibold">{acta.nombre_quien_elabora}</p>
            </div>
            <div className="flex justify-between pt-1 pb-2 border-b-1">
              <p className="text-gray-500">Estatus:</p>
              <div className="flex items-center gap-2">
                <span className={badgeClassByEstatus(estatusLocal)}>
                  {estatusLocal}
                </span>

                {/* Botón rápido: cambiar estatus sin entrar a "Editar". */}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 border-blue-200 text-[#2563EB] hover:bg-blue-50"
                  onClick={() => {
                    setEstatusNuevo(String(estatusLocal || "").toLowerCase());
                    setOpenEstatusDialog(true);
                  }}
                  disabled={savingEstatus}
                >
                  Cambiar estatus
                </Button>
              </div>
            </div>
            <div className="flex justify-between pt-2 pb-2 border-b-1">
              <p className="text-gray-500">Reincidencia:</p>
              <p className="font-semibold">
                {acta.es_reincidencia ? "⚠️ SÍ" : "🪪 NO"}
              </p>
            </div>
            <div className="flex justify-between pt-1 pb-2">
              <p className="text-gray-500">Fecha de creación:</p>
              <p className="font-semibold">
                {dayjs(acta.fecha_creacion).format("DD/MM/YYYY HH:mm")}
              </p>
            </div>
          </CardCompact>
        </div>

        {/* Footer de acciones: cerrar + descargar PDF.
            Relación: patrón igual a `PermisoViewDialog` y `FiniquitoViewDialog`. */}
        <div className="bg-gray-50 p-4 flex flex-col-reverse sm:flex-row justify-end gap-2 rounded-b-lg">
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
            onClick={() => onClose(false)}
            disabled={isPreparingPrint}
            className="w-full sm:w-auto border-gray-300"
          >
            Cerrar
          </Button>
          <Button
            onClick={descargarPDFActaFormatoPermisos}
            disabled={isPreparingPrint}
            className="w-full sm:w-auto bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Descargar PDF
          </Button>
          <Button
            onClick={async () => {
              setIsPreparingPrint(true);
              try {
                await new Promise((resolve) => setTimeout(resolve, 0));
                const { doc, nombreArchivo } =
                  await buildActaPdfFormatoPermisos();
                await imprimirPDF(doc, nombreArchivo);
              } finally {
                setIsPreparingPrint(false);
              }
            }}
            disabled={isPreparingPrint}
            className="w-full sm:w-auto bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white shadow-sm"
          >
            {isPreparingPrint ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Printer className="h-4 w-4 mr-2" />
            )}
            {isPreparingPrint ? "Preparando..." : "Imprimir acta"}
          </Button>
        </div>

        {/* Diálogo de cambio de estatus (confirmación) */}
        <AlertDialog
          open={openEstatusDialog}
          onOpenChange={setOpenEstatusDialog}
        >
          <AlertDialogContent className="sm:max-w-[425px] p-0">
            <AlertDialogHeader className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white p-6 rounded-t-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6" />
                <AlertDialogTitle className="text-white">
                  Cambiar estatus
                </AlertDialogTitle>
              </div>
            </AlertDialogHeader>

            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-800 p-4 rounded-md">
                <AlertDialogDescription className="text-sm">
                  Selecciona el nuevo estatus para el acta{" "}
                  <span className="font-semibold">{acta.folio}</span>.
                </AlertDialogDescription>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  Nuevo estatus
                </p>
                <Select value={estatusNuevo} onValueChange={setEstatusNuevo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un estatus" />
                  </SelectTrigger>
                  <SelectContent>
                    {estatusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <AlertDialogFooter className="bg-gray-50 p-4 flex justify-end gap-2 rounded-b-lg">
              <AlertDialogCancel
                className="border-gray-300"
                disabled={savingEstatus}
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={onGuardarEstatus}
                disabled={savingEstatus || !estatusNuevo}
                className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-sm"
              >
                {savingEstatus ? "Guardando..." : "Guardar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
};
