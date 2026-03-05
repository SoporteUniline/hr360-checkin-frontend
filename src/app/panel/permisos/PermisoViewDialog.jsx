"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import useSWR from "swr";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { formatDateDMY, formatDateDMYTime } from "@/lib/formatDate";
import { jsPDF } from "jspdf";
import { fetcherWithToken, swr_config } from "@/lib/fetcher";
import {
  fetchImageAsDataUrl,
  tryAddCompanyMarkToPdf,
} from "@/lib/pdfCompanyLogo";
import { calcDiasTotalesYHabiles } from "@/lib/permisosDias";
import styles from "./permisos-theme.module.css";
import { CalendarDays, Download, Loader2, Printer } from "lucide-react";
dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Dialogo de vista de detalles para una solicitud de permiso.
 * Muestra todos los campos relevantes, incluyendo notas internas y quién aprobó/rechazó.
 *
 * PDF/Impresión:
 * - Se agrega generación de PDF con `jsPDF` para poder imprimir el documento del permiso.
 * - Relación directa (patrón ya usado en el proyecto): `src/app/panel/mapa-de-rutas/page.jsx` -> función `exportarAPDF`.
 */
export default function PermisoViewDialog({
  open,
  setOpen,
  item,
  festivosSet = new Set(),
}) {
  const { dataUser } = useAuth();
  const idEmpresa = dataUser?.id_empresa;

  /**
   * Datos de empresa (nombre + url_imagen).
   * - Relación: el logo se sube/edita en `src/app/panel/cuenta/Empresa/ImagenEmpresa.jsx`.
   * - Usamos el mismo endpoint ya utilizado en Cuenta/Empresa: `/empresas/:id`.
   */
  const { data: empresaData } = useSWR(
    idEmpresa ? `/empresas/${idEmpresa}` : null,
    fetcherWithToken,
    swr_config,
  );

  /**
   * Logo precargado como DataURL para `jsPDF.addImage`.
   * - Si no hay imagen o falla, se usa fallback tipográfico (iniciales) en `tryAddCompanyMarkToPdf`.
   */
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);
  useEffect(() => {
    let alive = true;
    const run = async () => {
      let companyDataUrl = null;

      const companyUrl = empresaData?.url_imagen;
      if (companyUrl) {
        try {
          // Añadimos ?t=timestamp para evitar el caché del navegador
          const urlConCacheBuster = `${companyUrl}${
            companyUrl.includes("?") ? "&" : "?"
          }t=${Date.now()}`;
          companyDataUrl = await fetchImageAsDataUrl(urlConCacheBuster);
        } catch (error) {
          console.warn("Error cargando logo:", error);
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

  /**
   * IMPORTANTE (React hooks):
   * - NO se debe hacer `return null` antes de hooks, porque `item` puede cambiar de null → objeto
   *   y eso rompe el orden de hooks.
   */
  if (!item) return null;

  const di = item.fecha_inicio ? formatDateDMY(item.fecha_inicio) : "-";
  const df = item.fecha_fin ? formatDateDMY(item.fecha_fin) : "-";
  const created = item.marca_tiempo
    ? formatDateDMYTime(dayjs.tz(item.marca_tiempo, "America/Mexico_City"))
    : "-";
  const updated = item.fecha_actualizacion
    ? formatDateDMYTime(
        dayjs.tz(item.fecha_actualizacion, "America/Mexico_City"),
      )
    : "-";
  // Cálculo del total de días del permiso.
  // Relación: este valor se muestra en este mismo modal; las fechas provienen
  // de la API de `solicitudes_permiso` preparada en `solicitudPermisoModel.js`.
  const startDate = item.fecha_inicio ? dayjs(item.fecha_inicio) : null;
  // Si no hay fecha_fin, se considera un solo día (inicio == fin)
  const endDate = item.fecha_fin ? dayjs(item.fecha_fin) : startDate;
  const isVacaciones = String(item.tipo_permiso_nombre || "")
    .toLowerCase()
    .includes("vacacion");

  /**
   * Días del permiso:
   * - Totales: naturales (rango inclusivo).
   * - Hábiles: excluye domingos + festivos (consistencia del módulo).
   * Relación:
   * - Tabla: `src/app/panel/permisos/PermisosTable.jsx` (mismas reglas).
   * - Util: `src/lib/permisosDias.js` (fuente única de verdad).
   */
  const { diasTotales, diasHabiles } = calcDiasTotalesYHabiles({
    fechaInicio: item.fecha_inicio,
    fechaFin: item.fecha_fin,
    festivosSet,
  });

  // Valor histórico mostrado como "Total de días" en la UI actual:
  // - Para Vacaciones se muestra "hábiles", para el resto se muestra "totales" (naturales).
  const totalDias = isVacaciones ? diasHabiles : diasTotales;

  /**
   * Abre el PDF en un iframe oculto y dispara `print()` (mejor UX: "Imprimir" directo).
   * - Nota: si el navegador bloquea el print o el iframe, hacemos fallback a descarga.
   * - Relación: el PDF se genera con `jsPDF` (mismo enfoque que Mapa de Rutas).
   */
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

        const onAfterPrint = () => {
          finish();
        };

        const onParentBlur = () => {
          parentBlurred = true;
        };

        const onParentFocus = () => {
          // Cierra el estado cuando el usuario regresa de la ventana de impresión.
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
              iframe.contentWindow.onafterprint = () => {
                // Señal principal: se cierra cuando el navegador reporta evento de impresión.
                finish();
              };
            }
            iframe.contentWindow?.focus();
            setTimeout(() => {
              iframe.contentWindow?.print();
            }, 80);

            // Polling defensivo para navegadores que no emiten eventos de print.
            mediaPollTimer = setInterval(() => {
              const hasFocus =
                typeof document !== "undefined" && typeof document.hasFocus === "function"
                  ? document.hasFocus()
                  : true;

              // Si el diálogo de impresión abrió y cerró, normalmente recuperamos foco aquí
              // aunque el navegador no emita evento `focus`.
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

            // Respaldo final para no dejar bloqueado el UI indefinidamente.
            fallbackTimer = setTimeout(() => {
              finish();
            }, 25000);
          } catch {
            // Si el browser no permite imprimir desde iframe, descargamos.
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

  /**
   * Genera el PDF del permiso (A4) con un formato claro para impresión.
   * - Incluye: encabezado, datos del permiso, motivo/notas, firmas y footer con paginación.
   * - Relación:
   *   - Se invoca desde este mismo diálogo (botones "Imprimir" y "Descargar PDF").
   *   - Los datos provienen de la misma `item` que ya renderiza el modal (API de permisos).
   */
  function buildPermisoPDF() {
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

    const formatDateLong = (isoDate) => {
      if (!isoDate) return "—";
      const d = dayjs(isoDate).tz("America/Mexico_City");
      return d.isValid() ? d.format("DD [de] MMMM [de] YYYY") : String(isoDate);
    };

    const formatDateTime = (value) => {
      if (!value) return "—";
      const d = dayjs(value).tz("America/Mexico_City");
      return d.isValid() ? d.format("DD/MM/YYYY HH:mm") : String(value);
    };

    // Deja espacio para firmas + footer en la última página y hace salto cuando sea necesario.
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

    const folio = `#${String(item.id || "").padStart(3, "0")}`;
    const empleado = safe(
      item.empleado_nombre || (item.id_empleado ? `ID ${item.id_empleado}` : "—"),
    );
    const noEmpleado = safe(item.no_empleado || item.id_empleado || "—");
    const departamento = safe(item.departamento || "—");
    const puesto = safe(item.puesto || "—");
    const tipo = safe(item.tipo_permiso_nombre || "—");
    const estado = safe(item.estado || "—");
    const motivo = safe(item.motivo || "");
    const notas = safe(item.notas || "");
    const actualizadoPor = safe(
      item.actualizado_por_nombre ||
        (item.actualizado_por ? `ID ${item.actualizado_por}` : "—"),
    );

    const fechaInicioISO = item.fecha_inicio
      ? dayjs(item.fecha_inicio).format("YYYY-MM-DD")
      : "";
    const fechaFinISO = item.fecha_fin
      ? dayjs(item.fecha_fin).format("YYYY-MM-DD")
      : "";

    const fechaInicioLarga = formatDateLong(fechaInicioISO);
    const fechaFinLarga = formatDateLong(fechaFinISO || fechaInicioISO);
    const solicitadoLarga = formatDateTime(item.marca_tiempo);
    const actualizadoLarga = formatDateTime(item.fecha_actualizacion);

    const empresaNombre =
      safe(empresaData?.nombre_empresa || dataUser?.empresa?.nombre_empresa) ||
      "ADAMIA Human Resources";

    const hasLogo = tryAddCompanyMarkToPdf(
      doc,
      { logoDataUrl, companyName: empresaNombre },
      { x: marginLeft, y, boxW: 28, boxH: 10 },
    );

    if (!hasLogo && logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, "PNG", marginLeft, y, 28, 10);
      } catch {
        // Ignoramos errores de imagen para no bloquear la generación del PDF.
      }
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text("HUMAN RESOURCES CLOUD PLATFORM", marginLeft, y + 13);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(0);
    doc.text("PERMISO", pageWidth - marginRight, y + 7, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Folio ${folio}`, pageWidth - marginRight, y + 13, {
      align: "right",
    });

    y += 20;

    hRule(y, contentWidth, 0.8);
    y += 6;

    // Reservamos una columna fija para la caja de días para evitar que se monte sobre el periodo.
    const daysBoxWidth = 24;
    const daysBoxGap = 8;
    const metaWidth = contentWidth - daysBoxWidth - daysBoxGap;
    const col = metaWidth / 3;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(140);
    doc.text("ESTADO", marginLeft, y + 3);
    doc.text("TIPO", marginLeft + col, y + 3);
    doc.text("PERIODO", marginLeft + col * 2, y + 3);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(estado, marginLeft, y + 9);
    doc.text(tipo, marginLeft + col, y + 9);
    doc.text(`${fechaInicioLarga} — ${fechaFinLarga}`, marginLeft + col * 2, y + 9, {
      maxWidth: col - 6,
    });

    const boxX = marginLeft + metaWidth + daysBoxGap;
    const boxY = y - 1;
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(boxX, boxY, daysBoxWidth, 18, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(String(totalDias || 0), boxX + daysBoxWidth / 2, boxY + 10, {
      align: "center",
    });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.text("DIAS", boxX + daysBoxWidth / 2, boxY + 15, { align: "center" });

    y += 18;
    hRule(y, contentWidth, 0.3);
    y += 8;

    sectionTitle("Datos del empleado");
    needSpace(20);
    fieldPair("Nombre completo", empleado, marginLeft, y);
    fieldPair("No. Empleado", noEmpleado, marginLeft + contentWidth / 2 + 4, y);
    y += 16;
    fieldPair("Departamento", departamento, marginLeft, y);
    fieldPair("Puesto", puesto, marginLeft + contentWidth / 2 + 4, y);
    y += 18;

    sectionTitle("Detalle del permiso");
    needSpace(20);
    const c3 = contentWidth / 3;
    fieldPair("Fecha de inicio", fechaInicioLarga, marginLeft, y, c3 - 4);
    fieldPair("Fecha de fin", fechaFinLarga, marginLeft + c3, y, c3 - 4);
    fieldPair("Tipo de permiso", tipo, marginLeft + c3 * 2, y, c3 - 4);
    y += 16;
    fieldPair("Dias totales", String(diasTotales || 0), marginLeft, y, c3 - 4);
    fieldPair("Dias habiles", String(diasHabiles || 0), marginLeft + c3, y, c3 - 4);
    fieldPair("Dias naturales", String(totalDias || 0), marginLeft + c3 * 2, y, c3 - 4);
    y += 18;

    const drawWrappedSectionText = ({ sectionName, textValue, emptyFallback }) => {
      sectionTitle(sectionName);

      const textInsetLeft = 2;
      const textInsetRight = 8; // margen derecho mayor para evitar cualquier desborde visual
      const lineHeight = 6;
      const maxTextWidth = contentWidth - textInsetLeft - textInsetRight;
      const sourceText = String(textValue || emptyFallback)
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\u00A0/g, " "); // normaliza non-breaking spaces

      // Separamos por párrafos para controlar nosotros el wrapping y evitar doble render.
      const safeLines = [];
      const paragraphs = sourceText.split("\n");

      // IMPORTANTE: el wrapping se calcula con la misma fuente/tamaño que se usa al dibujar.
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(textValue ? 0 : 160);

      for (const paragraph of paragraphs) {
        const cleanedParagraph = paragraph.trim();
        if (!cleanedParagraph) {
          safeLines.push("");
          continue;
        }
        // Si viene una palabra extremadamente larga, forzamos cortes suaves para no romper márgenes.
        const breakableParagraph = cleanedParagraph.replace(
          /(\S{24})(?=\S)/g,
          "$1 ",
        );
        const fragments = doc.splitTextToSize(breakableParagraph, maxTextWidth);
        safeLines.push(...fragments);
      }

      for (const line of safeLines) {
        // Si no cabe una línea más (considerando firma/footer), saltamos de página.
        needSpace(lineHeight + 2);
        doc.text(String(line || " "), marginLeft + textInsetLeft, y);
        y += lineHeight;
      }

      hRule(y + 1, contentWidth, 0.2);
      y += 10;
    };

    drawWrappedSectionText({
      sectionName: "Motivo / Observaciones",
      textValue: motivo,
      emptyFallback: "—",
    });

    drawWrappedSectionText({
      sectionName: "Nota interna",
      textValue: notas,
      emptyFallback: "Sin notas adicionales.",
    });

    sectionTitle("Auditoria");
    needSpace(20);
    fieldPair("Solicitado el", solicitadoLarga, marginLeft, y);
    fieldPair(
      "Ultima actualizacion",
      actualizadoLarga,
      marginLeft + contentWidth / 2 + 4,
      y,
    );
    y += 16;
    fieldPair("Actualizado por", actualizadoPor, marginLeft, y);
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
        `Generado el ${fechaGenerado} a las ${horaGenerado} · ${systemLabel} · Folio ${folio} · Pagina ${p} de ${totalPages}`,
        pageWidth / 2,
        pageHeight - 9,
        { align: "center" },
      );
    }

    const nombreArchivo = `Permiso_${empleado.replace(/ /g, "_")}_${dayjs().format(
      "YYYY-MM-DD",
    )}_${String(item.id || "").padStart(3, "0")}.pdf`;
    return { doc, nombreArchivo };
  }

  function EstadoBadge({ estado }) {
    const base =
      "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold";
    if (estado === "Pendiente")
      return (
        <span className={`${base} bg-amber-100 text-amber-900`}>Pendiente</span>
      );
    if (estado === "Aprobado")
      return (
        <span className={`${base} bg-emerald-100 text-emerald-900`}>
          Aprobado
        </span>
      );
    if (estado === "Rechazado")
      return (
        <span className={`${base} bg-red-100 text-red-900`}>Rechazado</span>
      );
    if (estado === "Cancelado")
      return (
        <span className={`${base} bg-zinc-200 text-zinc-700`}>Cancelado</span>
      );
    return (
      <span className={`${base} bg-zinc-200 text-zinc-700`}>
        {estado || "—"}
      </span>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Ajuste responsivo:
         - max-w-[95vw]: ocupa el 95% del ancho en móviles.
         - sm:max-w-2xl: respeta el ancho grande en pantallas mayores.
         - max-h-[85vh] overflow-y-auto: evita desbordes verticales y permite scroll.
         Relación: abierto desde `src/app/panel/permisos/page.jsx`. */}
      <DialogContent className="p-0 overflow-hidden max-w-[95vw] sm:max-w-2xl">
        <DialogHeader className="p-5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
          <DialogTitle className="flex items-center justify-between gap-3 text-base font-bold">
            <span className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-lg bg-white/15">
                <CalendarDays className="size-5 text-white" />
              </span>
              Detalles del permiso
            </span>
            <span className="text-sm text-white/80">
              Folio #{String(item.id).padStart(3, "0")}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div
          className={`${styles.permisosTheme} max-h-[70vh] overflow-y-auto p-5 space-y-4`}
        >
          <section className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600">Empleado</div>
                <div className="text-sm font-semibold text-gray-900">
                  {item.empleado_nombre || `ID ${item.id_empleado}`}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Tipo de permiso</div>
                <div className="text-sm font-semibold text-gray-900">
                  {item.tipo_permiso_nombre}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Fecha inicio</div>
                <div className="text-sm font-semibold text-gray-900">{di}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Fecha fin</div>
                <div className="text-sm font-semibold text-gray-900">{df}</div>
              </div>
              <div>
                {/* Nueva información pedida (separada en campos):
                    Relación: coincide con la tabla `src/app/panel/permisos/PermisosTable.jsx`
                    y con el documento PDF de este mismo componente. */}
                <div className="text-sm text-gray-600">Días totales</div>
                <div className="text-sm font-bold text-gray-900">
                  {diasTotales}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Días hábiles</div>
                <div className="text-sm font-bold text-gray-900">
                  {diasHabiles}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Estado</div>
                <div className="mt-0.5">
                  <EstadoBadge estado={item.estado} />
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Solicitado</div>
                <div className="text-sm font-semibold text-gray-900">
                  {created}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-gray-100 p-4 bg-white">
            <div className="text-sm text-gray-600 mb-1">
              Motivo / Observaciones
            </div>
            <div className="text-sm whitespace-pre-wrap text-gray-900">
              {item.motivo || "—"}
            </div>
          </section>

          <section className="rounded-lg border border-gray-100 p-4 bg-white">
            <div className="text-sm text-gray-600 mb-1">Nota interna</div>
            <div className="text-sm whitespace-pre-wrap text-gray-900">
              {item.notas || "—"}
            </div>
            <Separator className="my-3" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600">Actualizado por</div>
                <div className="text-sm font-semibold text-gray-900">
                  {item.actualizado_por_nombre ||
                    (item.actualizado_por ? `ID ${item.actualizado_por}` : "—")}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Fecha actualización</div>
                <div className="text-sm font-semibold text-gray-900">
                  {updated}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Acciones PDF */}
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
              const { doc, nombreArchivo } = buildPermisoPDF();
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
                // Permite que React pinte el mensaje antes de iniciar la generación pesada del PDF.
                await new Promise((resolve) => setTimeout(resolve, 0));
                const { doc, nombreArchivo } = buildPermisoPDF();
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
            {isPreparingPrint ? "Preparando..." : "Imprimir permiso"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
