"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { finiquitosApi } from "@/lib/finiquitosApi";
import styles from "./finiquitos-theme.module.css";

export default function FiniquitoViewDialog({ open, setOpen, id }) {
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            {det?.es_liquidacion ? "Detalle de Liquidación" : "Detalle de Finiquito"}
          </DialogTitle>
          <DialogDescription>
            {det?.nombre_completo ? `Empleado: ${det.nombre_completo}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[80vh] overflow-y-auto pr-1 md:pr-0">
          {loading ? (
            <div className="py-6 text-sm text-muted-foreground">Cargando...</div>
          ) : det ? (
            <div className="space-y-4 text-sm">
              <div className={styles.resultsPanel}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className={styles.metricCard}>
                    <div className={styles.metricLabel}>Empleado</div>
                    <div className={`${styles.metricValue} break-words`}>{det.nombre_completo}</div>
                  </div>
                  <div className={styles.metricCard}>
                    <div className={styles.metricLabel}>Días trabajados</div>
                    <div className={styles.metricValue}>{det.dias_trabajados}</div>
                  </div>
                  <div className={styles.metricCard}>
                    <div className={styles.metricLabel}>Años trabajados</div>
                    <div className={styles.metricValue}>{det.años_trabajados}</div>
                  </div>
                  <div className={styles.metricCard}>
                    <div className={styles.metricLabel}>Salario diario</div>
                    <div className={styles.metricValue}>
                      ${Number(det.salario_diario).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div className={styles.sectionTitle}>Conceptos de finiquito</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
                  <div className={styles.conceptCard}>
                    <div className={styles.conceptTitle}>Salario Pendiente</div>
                    <div className={styles.conceptAmount}>
                      ${Number(det.monto_salario_pendiente).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </div>
                    <div className={styles.conceptBox}>
                      <div className={styles.row}>
                        <span className={styles.rowLabel}>Días</span>
                        <span className={styles.rowValue}>{Number(det.dias_salario_pendiente).toFixed(2)} días</span>
                      </div>
                      <div className={styles.row}>
                        <span className={styles.rowLabel}>Salario diario</span>
                        <span className={styles.rowValue}>${Number(det.salario_diario).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.conceptCard}>
                    <div className={styles.conceptTitle}>Aguinaldo Proporcional</div>
                    <div className={styles.conceptAmount}>
                      ${Number(det.monto_aguinaldo_proporcional).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </div>
                    <div className={styles.conceptBox}>
                      <div className={styles.row}>
                        <span className={styles.rowLabel}>Proporcional</span>
                        <span className={styles.rowValue}>{det.dias_aguinaldo_proporcional} días</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.conceptCard}>
                    <div className={styles.conceptTitle}>Vacaciones No Gozadas</div>
                    <div className={styles.conceptAmount}>
                      ${Number(det.monto_vacaciones_no_gozadas).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </div>
                    <div className={styles.conceptBox}>
                      <div className={styles.row}>
                        <span className={styles.rowLabel}>Totales</span>
                        <span className={styles.rowValue}>{det.dias_vacaciones_totales} días</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.conceptCard}>
                    <div className={styles.conceptTitle}>Prima Vacacional</div>
                    <div className={styles.conceptAmount}>
                      ${Number(det.monto_prima_vacacional).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </div>
                    <div className={styles.conceptBox}>
                      <div className={styles.row}>
                        <span className={styles.rowLabel}>Porcentaje</span>
                        <span className={styles.rowValue}>{Number(det.prima_vacacional_porcentaje).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.subtotalBar}>
                  <div className="flex items-center justify-between">
                    <div className={styles.subtotalLabel}>Subtotal Finiquito</div>
                    <div className={styles.subtotalValue}>
                      ${Number(det.subtotal_finiquito).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {det.es_liquidacion ? (
                  <div className="space-y-3 mt-3">
                    <div className="text-sm font-semibold text-red-700">⚖️ Conceptos de Liquidación</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className={styles.conceptCard}>
                        <div className={styles.conceptTitle}>Prima de Antigüedad</div>
                        <div className={styles.conceptAmount}>
                          ${Number(det.monto_prima_antiguedad).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className={styles.conceptCard}>
                        <div className={styles.conceptTitle}>Indemnización Constitucional</div>
                        <div className={styles.conceptAmount}>
                          ${Number(det.monto_indemnizacion_constitucional).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className={styles.conceptCard}>
                        <div className={styles.conceptTitle}>Salarios Vencidos</div>
                        <div className={styles.conceptAmount}>
                          ${Number(det.monto_salarios_vencidos).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                    <div className={styles.subtotalBar}>
                      <div className="flex items-center justify-between">
                        <div className={styles.subtotalLabel}>Subtotal Liquidación</div>
                        <div className={styles.subtotalValue}>
                          ${Number(det.subtotal_liquidacion).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className={styles.totalBar + " mt-3"}>
                  <div className="flex items-center justify-between">
                    <div className={styles.totalLabel}>TOTAL A PAGAR</div>
                    <div className={styles.totalAmount}>
                      ${Number(det.total_pagar).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-sm text-muted-foreground">Sin información.</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


