"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { fetchImageAsDataUrl, tryAddCompanyMarkToPdf } from "@/lib/pdfCompanyLogo";
import { calcDiasTotalesYHabiles } from "@/lib/permisosDias";
import styles from "./permisos-theme.module.css";
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
export default function PermisoViewDialog({ open, setOpen, item, festivosSet = new Set() }) {
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
    swr_config
  );

  /**
   * Logo precargado como DataURL para `jsPDF.addImage`.
   * - Si no hay imagen o falla, se usa fallback tipográfico (iniciales) en `tryAddCompanyMarkToPdf`.
   */
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  useEffect(() => {
    let alive = true;
    const run = async () => {
      // 1) Intentar logo de la empresa (si existe)
      const companyUrl = empresaData?.url_imagen;
      const companyDataUrl = companyUrl ? await fetchImageAsDataUrl(companyUrl) : null;

      // 2) Fallback garantizado al logo del sistema (mismo origen, existe en `public/assets/logo.png`)
      const fallbackDataUrl = companyDataUrl ? null : await fetchImageAsDataUrl("/assets/logo.png");

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
    ? formatDateDMYTime(dayjs.tz(item.fecha_actualizacion, "America/Mexico_City"))
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
   * Formatea fecha ISO (YYYY-MM-DD) para títulos/impresión (estilo humano).
   * - Relación: similar a `formatearFechaLarga` del módulo `Mapa de rutas`.
   */
  function formatearFechaLarga(fechaISO) {
    if (!fechaISO) return "-";
    try {
      const opciones = { year: "numeric", month: "long", day: "numeric" };
      return new Date(`${dayjs(fechaISO).format("YYYY-MM-DD")}T00:00:00`).toLocaleDateString("es-MX", opciones);
    } catch {
      return String(fechaISO);
    }
  }

  /**
   * Abre el PDF en un iframe oculto y dispara `print()` (mejor UX: "Imprimir" directo).
   * - Nota: si el navegador bloquea el print o el iframe, hacemos fallback a descarga.
   * - Relación: el PDF se genera con `jsPDF` (mismo enfoque que Mapa de Rutas).
   */
  function imprimirPDF(doc, nombreArchivo) {
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

      iframe.onload = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          // Si el browser no permite imprimir desde iframe, descargamos.
          doc.save(nombreArchivo);
        } finally {
          // Limpieza para evitar fugas de memoria.
          setTimeout(() => {
            try {
              URL.revokeObjectURL(url);
              iframe.remove();
            } catch {}
          }, 2000);
        }
      };

      document.body.appendChild(iframe);
    } catch (e) {
      console.error(e);
      doc.save(nombreArchivo);
    }
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
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    /**
     * Quita emojis/pictogramas del texto para evitar caracteres raros en el PDF (ej. "�" o símbolos).
     * - Relación: el campo `tipo_permiso_nombre` se muestra en UI (con emojis), pero el PDF debe ser formal y legible.
     */
    const stripEmojis = (value) => {
      try {
        return String(value || "")
          // Emojis/pictogramas (Unicode) + variación + joiners
          .replace(/\p{Extended_Pictographic}|\uFE0F|\u200D/gu, "")
          .replace(/\s+/g, " ")
          .trim();
      } catch {
        // Fallback defensivo si el runtime no soporta Unicode property escapes (muy raro en Next moderno).
        return String(value || "").replace(/\s+/g, " ").trim();
      }
    };

    const folio = `#${String(item.id).padStart(3, "0")}`;
    const empleado = item.empleado_nombre || (item.id_empleado ? `ID ${item.id_empleado}` : "—");
    const tipo = stripEmojis(item.tipo_permiso_nombre) || "—";
    const estado = item.estado || "—";
    const fechaInicioISO = item.fecha_inicio ? dayjs(item.fecha_inicio).format("YYYY-MM-DD") : "";
    const fechaFinISO = item.fecha_fin ? dayjs(item.fecha_fin).format("YYYY-MM-DD") : "";
    const fechaInicioLarga = formatearFechaLarga(fechaInicioISO);
    const fechaFinLarga = formatearFechaLarga(fechaFinISO || fechaInicioISO);

    const solicitadoLarga = item.marca_tiempo
      ? formatDateDMYTime(dayjs.tz(item.marca_tiempo, "America/Mexico_City"))
      : "—";
    const actualizadoLarga = item.fecha_actualizacion
      ? formatDateDMYTime(dayjs.tz(item.fecha_actualizacion, "America/Mexico_City"))
      : "—";

    const actualizadoPor = item.actualizado_por_nombre || (item.actualizado_por ? `ID ${item.actualizado_por}` : "—");
    const motivo = item.motivo ? String(item.motivo) : "";
    const notas = item.notas ? String(item.notas) : "";

    /**
     * Evita que se corte contenido cerca del final:
     * - Reserva una zona para firmas + footer.
     */
    const ensureSpace = (neededHeightMm) => {
      const reservedBottom = 65; // firmas + footer
      if (y + neededHeightMm > pageHeight - margin - reservedBottom) {
        doc.addPage();
        y = margin;
      }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // HEADER (caja superior estilo “documento”)
    // ─────────────────────────────────────────────────────────────────────────
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1);
    doc.rect(margin, y, contentWidth, 34, "S");

    doc.setTextColor(0, 0, 0);

    // Logo/marca de la empresa en esquina superior izquierda.
    // - Si hay imagen: se dibuja en el recuadro.
    // - Si no hay imagen: se dibujan iniciales (estilo tipográfico tipo "HR360" en Reporte de Horas).
    const companyName = empresaData?.nombre_empresa || dataUser?.empresa?.nombre_empresa || "";
    const logoBox = { x: margin + 6, y: y + 6, boxW: 26, boxH: 14 };
    const hasMark = tryAddCompanyMarkToPdf(doc, { logoDataUrl, companyName }, logoBox);
    const textX = hasMark ? logoBox.x + logoBox.boxW + 4 : margin + 6;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("PERMISO", textX, y + 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Folio: ${folio}`, textX, y + 17);
    doc.text(`Estado: ${estado}`, textX, y + 23);
    doc.text(`Tipo: ${tipo}`, textX, y + 29);

    // Resumen a la derecha
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("TOTAL DÍAS", pageWidth - margin - 6, y + 10, { align: "right" });
    doc.setFontSize(22);
    doc.text(String(totalDias || 0), pageWidth - margin - 6, y + 23, { align: "right" });

    y += 42;

    // ─────────────────────────────────────────────────────────────────────────
    // DATOS PRINCIPALES (bloque)
    // ─────────────────────────────────────────────────────────────────────────
    ensureSpace(38);
    doc.setLineWidth(0.5);
    doc.rect(margin, y, contentWidth, 38, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("DATOS DEL PERMISO", margin + 6, y + 8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Empleado: ${empleado}`, margin + 6, y + 16);
    doc.text(`Fecha inicio: ${fechaInicioLarga}`, margin + 6, y + 23);
    doc.text(`Fecha fin: ${fechaFinLarga}`, margin + 6, y + 30);

    // Días (separados para mayor claridad, como en la vista de Permisos)
    // - Relación: usa el mismo cálculo de `calcDiasTotalesYHabiles` que la tabla.
    doc.text(`Días totales: ${String(diasTotales || 0)}`, margin + 110, y + 23);
    doc.text(`Días hábiles: ${String(diasHabiles || 0)}`, margin + 110, y + 30);

    y += 46;

    // ─────────────────────────────────────────────────────────────────────────
    // DETALLES DE AUDITORÍA (tipo Mapa de rutas: "Generado", etc.)
    // ─────────────────────────────────────────────────────────────────────────
    // Altura + posiciones ajustadas para que el texto NO toque los bordes del cuadro.
    ensureSpace(32);
    doc.setLineWidth(0.5);
    doc.rect(margin, y, contentWidth, 32, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("AUDITORÍA", margin + 6, y + 8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Solicitado: ${solicitadoLarga}`, margin + 6, y + 17);
    doc.text(`Actualizado por: ${actualizadoPor}`, margin + 6, y + 24);
    doc.text(`Fecha actualización: ${actualizadoLarga}`, margin + 6, y + 30);

    y += 40;

    // ─────────────────────────────────────────────────────────────────────────
    // MOTIVO / OBSERVACIONES
    // ─────────────────────────────────────────────────────────────────────────
    const writeMultilineBox = (title, text) => {
      const safeText = text && String(text).trim() ? String(text).trim() : "—";
      const lines = doc.splitTextToSize(safeText, contentWidth - 12);
      const lineHeight = 5;
      const boxHeight = Math.min(120, 14 + lines.length * lineHeight); // evita cajas gigantes
      ensureSpace(boxHeight + 6);

      doc.setLineWidth(0.5);
      doc.rect(margin, y, contentWidth, boxHeight, "S");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(title, margin + 6, y + 8);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(lines, margin + 6, y + 15);

      y += boxHeight + 8;
    };

    writeMultilineBox("MOTIVO / OBSERVACIONES", motivo);
    writeMultilineBox("NOTA INTERNA", notas);

    // ─────────────────────────────────────────────────────────────────────────
    // FIRMAS (al final de cada página) + FOOTER con paginación
    // ─────────────────────────────────────────────────────────────────────────
    const totalPages = doc.internal.getNumberOfPages();
    const fechaGenerado = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
    const horaGenerado = new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);

      // Firmas
      const yFirmas = pageHeight - 55;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);

      doc.line(margin + 10, yFirmas, margin + 70, yFirmas);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("FIRMA DEL TRABAJADOR", margin + 40, yFirmas + 6, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(String(empleado).slice(0, 45), margin + 40, yFirmas + 11, { align: "center" });

      doc.line(pageWidth - margin - 70, yFirmas, pageWidth - margin - 10, yFirmas);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("REPRESENTANTE DE LA EMPRESA", pageWidth - margin - 40, yFirmas + 6, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      // Se conserva el mismo nombre usado en Mapa de Rutas para consistencia visual del sistema.
      doc.text("Uniline Innovacion en la Nube", pageWidth - margin - 40, yFirmas + 11, { align: "center" });

      // Footer
      doc.setLineWidth(0.3);
      doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(
        `Generado el ${fechaGenerado} a las ${horaGenerado} | Sistema HR360 | Página ${p} de ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
    }

    const nombreArchivo = `Permiso_${String(empleado || "Empleado").replace(/ /g, "_")}_${dayjs().format("YYYY-MM-DD")}_${String(item.id || "").padStart(3, "0")}.pdf`;
    return { doc, nombreArchivo };
  }

  function EstadoBadge({ estado }) {
    const base = "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold";
    if (estado === "Pendiente") return <span className={base} style={{ backgroundColor: "#fef3c7", color: "#92400e" }}>Pendiente</span>;
    if (estado === "Aprobado") return <span className={base} style={{ backgroundColor: "#d1fae5", color: "#065f46" }}>Aprobado</span>;
    if (estado === "Rechazado") return <span className={base} style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}>Rechazado</span>;
    if (estado === "Cancelado") return <span className={base} style={{ backgroundColor: "#f3f4f6", color: "#6b7280" }}>Cancelado</span>;
    return <span className={base} style={{ backgroundColor: "#f3f4f6", color: "#6b7280" }}>{estado || "—"}</span>;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Ajuste responsivo:
         - max-w-[95vw]: ocupa el 95% del ancho en móviles.
         - sm:max-w-2xl: respeta el ancho grande en pantallas mayores.
         - max-h-[85vh] overflow-y-auto: evita desbordes verticales y permite scroll.
         Relación: abierto desde `src/app/panel/permisos/page.jsx`. */}
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalles del permiso</span>
            <span className="text-sm text-muted-foreground">Folio #{String(item.id).padStart(3, "0")}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <section className="rounded-md border p-4" style={{ backgroundColor: "#f9fafb" }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Empleado</div>
                <div className="font-medium">{item.empleado_nombre || `ID ${item.id_empleado}`}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Tipo de permiso</div>
                <div className="font-medium">{item.tipo_permiso_nombre}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Fecha inicio</div>
                <div className="font-medium">{di}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Fecha fin</div>
                <div className="font-medium">{df}</div>
              </div>
              <div>
                {/* Nueva información pedida (separada en campos):
                    Relación: coincide con la tabla `src/app/panel/permisos/PermisosTable.jsx`
                    y con el documento PDF de este mismo componente. */}
                <div className="text-xs text-muted-foreground">Días totales</div>
                <div className="font-semibold">{diasTotales}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Días hábiles</div>
                <div className="font-semibold">{diasHabiles}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Estado</div>
                <div className="mt-0.5"><EstadoBadge estado={item.estado} /></div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Solicitado</div>
                <div className="font-medium">{created}</div>
              </div>
            </div>
          </section>

          <section className="rounded-md border p-4 bg-white">
            <div className="text-xs text-muted-foreground mb-1">Motivo / Observaciones</div>
            <div className="whitespace-pre-wrap">{item.motivo || "—"}</div>
          </section>

          <section className="rounded-md border p-4 bg-white">
            <div className="text-xs text-muted-foreground mb-1">Nota interna</div>
            <div className="whitespace-pre-wrap">{item.notas || "—"}</div>
            <Separator className="my-3" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Actualizado por</div>
                <div className="font-medium">
                  {item.actualizado_por_nombre || (item.actualizado_por ? `ID ${item.actualizado_por}` : "—")}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Fecha actualización</div>
                <div className="font-medium">{updated}</div>
              </div>
            </div>
          </section>

          {/* Acciones PDF:
              - "Imprimir": genera PDF y dispara print (ideal para entregar el documento en físico).
              - "Descargar PDF": guarda el archivo para adjuntarlo o imprimir después.
              Relación: ambos usan `buildPermisoPDF()` (arriba) y replican el patrón del módulo Mapa de Rutas. */}
          <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                const { doc, nombreArchivo } = buildPermisoPDF();
                doc.save(nombreArchivo);
              }}
              className="font-semibold"
            >
              📄 Descargar PDF
            </Button>
            <Button
              onClick={() => {
                const { doc, nombreArchivo } = buildPermisoPDF();
                imprimirPDF(doc, nombreArchivo);
              }}
              className="font-semibold shadow-[0_4px_12px_rgba(55,73,94,0.3)]"
            >
              🖨️ Imprimir permiso
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


