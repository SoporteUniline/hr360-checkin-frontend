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
import {
  createPdfContext,
  drawHeaderBox,
  drawKeyValueBox,
  drawMultilineBox,
  drawSignaturesAndFooter,
  drawRightValueRowsBox,
  fmtMoneyMXN,
} from "@/lib/pdfUnifiedLayout";
import { Download, FileText } from "lucide-react";

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
  const descargarPDFFormatoNuevo = () => {
    if (!det) return;

    const doc = new jsPDF("p", "mm", "a4");
    const ctx = createPdfContext({ doc });

    const companyName =
      empresaData?.nombre_empresa || dataUser?.empresa?.nombre_empresa || "";
    const tipoDocumento = det.es_liquidacion ? "Liquidación" : "Finiquito";
    const total = fmtMoneyMXN(det.total_pagar);
    const folio = det.id_finiquito || det.id || id || "";

    drawHeaderBox(ctx, {
      title: tipoDocumento,
      linesLeft: [
        `Folio: #${String(folio).toString().padStart(3, "0")}`,
        `Empleado: ${det.nombre_completo || "—"}`,
        `Fecha baja: ${
          det.fecha_baja ? dayjs(det.fecha_baja).format("DD/MM/YYYY") : "—"
        }`,
      ],
      kpiLabel: "Total a pagar",
      kpiValue: String(total).replace(" MXN", ""),
      companyName,
      logoDataUrl,
    });

    drawKeyValueBox(ctx, {
      title: "Datos del empleado",
      rows: [
        ["Puesto", det.puesto || "—"],
        ["Departamento", det.departamento || "—"],
        [
          "Fecha ingreso",
          det.fecha_ingreso
            ? dayjs(det.fecha_ingreso).format("DD/MM/YYYY")
            : "—",
        ],
        ["Años trabajados", `${det.años_trabajados || 0}`],
        [
          "Salario diario",
          `$${Number(det.salario_diario || 0).toLocaleString("es-MX", {
            minimumFractionDigits: 2,
          })}`,
        ],
        ["Días trabajados", `${det.dias_trabajados || 0}`],
      ],
    });

    // Conceptos: valor a la derecha para evitar encimados en labels largos.
    drawRightValueRowsBox(ctx, {
      title: "Conceptos de finiquito",
      rows: [
        ["Salario pendiente", fmtMoneyMXN(det.monto_salario_pendiente)],
        [
          "Aguinaldo proporcional",
          fmtMoneyMXN(det.monto_aguinaldo_proporcional),
        ],
        ["Vacaciones no gozadas", fmtMoneyMXN(det.monto_vacaciones_no_gozadas)],
        ["Prima vacacional", fmtMoneyMXN(det.monto_prima_vacacional)],
        ["Subtotal finiquito", fmtMoneyMXN(det.subtotal_finiquito)],
      ],
    });

    if (det.es_liquidacion) {
      drawRightValueRowsBox(ctx, {
        title: "Conceptos de liquidación",
        rows: [
          ["Prima antigüedad", fmtMoneyMXN(det.monto_prima_antiguedad)],
          [
            "Indemnización constitucional",
            fmtMoneyMXN(det.monto_indemnizacion_constitucional),
          ],
          ["Salarios vencidos", fmtMoneyMXN(det.monto_salarios_vencidos)],
          ["Subtotal liquidación", fmtMoneyMXN(det.subtotal_liquidacion)],
        ],
      });
    }

    drawMultilineBox(ctx, {
      title: "Motivo de baja",
      text: det.motivo_baja || "—",
    });

    drawSignaturesAndFooter(doc, {
      empleadoName: det.nombre_completo || "",
      empresaLabel: companyName || "Uniline Innovacion en la Nube",
      footerLeft: "Sistema Adamia",
      // En finiquitos: firmas solo en la última página.
      signaturesOn: "last",
    });

    const nombreArchivo = `${
      det.es_liquidacion ? "LIQUIDACION" : "FINIQUITO"
    }_${String(det.nombre_completo || "Empleado").replace(/\s+/g, "_")}.pdf`;
    doc.save(nombreArchivo);
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
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="w-full sm:w-auto border-gray-300"
          >
            Cerrar
          </Button>
          <Button
            onClick={descargarPDFFormatoNuevo}
            disabled={!det}
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
