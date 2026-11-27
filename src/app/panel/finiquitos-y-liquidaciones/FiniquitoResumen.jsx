"use client";

import styles from "./finiquitos-theme.module.css";
import {
  AVISO_VERSION_ANTERIOR,
  resumenFiniquito,
} from "@/lib/calculos/calculosLft.mjs";

export const money = (value) =>
  Number(value || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  });

// (27/11/2026) Conceptos, fórmulas y notas tal como los calculó el servidor (motor LFT). El PDF usa la misma fuente
// (renglonesPdfFiniquito), así que pantalla y documento muestran lo mismo. Un finiquito guardado con la versión
// anterior se muestra con sus importes guardados y el aviso.
export default function FiniquitoResumen({ data, showDetails = true }) {
  const r = resumenFiniquito(data);
  const finiquito = r ? r.filas.filter((f) => f.grupo === "finiquito") : [];
  const extras = r ? r.filas.filter((f) => f.grupo !== "finiquito") : [];

  const rows = (items) =>
    items.map((f) => (
      <div
        className={`${styles.amountRow} ${f.aplica ? "" : styles.conceptOff}`}
        key={f.clave}
        data-concepto={f.clave}
      >
        <dt>
          {f.concepto}
          {f.formula && f.aplica && (
            <span className={styles.conceptFormula}>{f.formula}</span>
          )}
          {f.nota && (showDetails || !f.aplica) && (
            <span className={styles.conceptNote}>{f.nota}</span>
          )}
        </dt>
        <dd>{money(f.monto)}</dd>
      </div>
    ));

  if (!r) {
    return (
      <div className={styles.breakdown}>
        <div className={styles.summaryTotal}>
          <span>
            Total a pagar <small>MXN bruto</small>
          </span>
          <strong>—</strong>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.breakdown}>
      {r.versionAnterior && (
        <p role="note" className={styles.versionNotice}>
          {AVISO_VERSION_ANTERIOR}
        </p>
      )}
      <dl>
        {rows(finiquito)}
        {extras.length > 0 && (
          <>
            <div className={styles.subtotalRow}>
              <dt>Subtotal finiquito</dt>
              <dd>{money(r.subtotalFiniquito)}</dd>
            </div>
            {rows(extras)}
            <div className={styles.subtotalRow}>
              <dt>
                {r.esLiquidacion
                  ? "Subtotal indemnización"
                  : "Subtotal adicional"}
              </dt>
              <dd>{money(r.subtotalIndemnizacion)}</dd>
            </div>
          </>
        )}
      </dl>
      <div className={styles.summaryTotal}>
        <span>
          Total a pagar <small>MXN bruto</small>
        </span>
        <strong data-total>{money(r.total)}</strong>
      </div>
      <p className={styles.grossNote}>{r.notaBruto}</p>
      {r.avisos.map((a) => (
        <p key={a} role="note" className={styles.warnNotice}>
          {a}
        </p>
      ))}
      {showDetails && !r.versionAnterior && (
        <details className={styles.disclosure}>
          <summary>Ver detalle del cálculo</summary>
          <dl className={styles.detailList}>
            {[
              ["Tipo de terminación", r.tipo],
              ["Salario diario", r.salario.diario != null ? money(r.salario.diario) : null],
              ["De dónde sale el salario", r.salario.origen],
              ["Antigüedad", r.antiguedad],
              ["Salario diario integrado (SDI)", r.salario.formulaSdi],
              [
                "Tope de la prima de antigüedad",
                r.tope
                  ? `${money(r.tope.monto)} (2 × salario mínimo ${r.tope.zona} ${r.tope.anio}${r.tope.porConfirmar ? ", cifra por confirmar contra el DOF" : ""})`
                  : null,
              ],
              ["¿Por qué este tope?", r.tope?.explicacion],
            ]
              .filter(([, v]) => v)
              .map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
          </dl>
        </details>
      )}
    </div>
  );
}
