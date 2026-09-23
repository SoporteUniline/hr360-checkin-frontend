"use client";

import styles from "./finiquitos-theme.module.css";

export const money = (value) =>
  Number(value || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  });

export default function FiniquitoResumen({ data, showDetails = true }) {
  const conceptos = [
    ["Salario pendiente", "monto_salario_pendiente"],
    ["Aguinaldo proporcional", "monto_aguinaldo_proporcional"],
    ["Vacaciones pendientes", "monto_vacaciones_no_gozadas"],
    ["Prima vacacional", "monto_prima_vacacional"],
  ];
  const extras = [
    ["Prima de antigüedad", "monto_prima_antiguedad"],
    ["Indemnización", "monto_indemnizacion_constitucional"],
    ["Salarios vencidos", "monto_salarios_vencidos"],
  ];
  const detalles = [
    [
      "Salario diario",
      data?.salario_diario != null ? money(data.salario_diario) : null,
    ],
    ["Días trabajados", data?.dias_trabajados],
    ["Años trabajados", data?.años_trabajados],
    ["Días del periodo", data?.dias_transcurridos_año_bruto],
    ["Días no trabajados", data?.dias_no_trabajados],
    ["Días efectivos del periodo", data?.dias_transcurridos_año_neto],
    ["Días de salario pendientes", data?.dias_salario_pendiente],
    ["Días de aguinaldo proporcional", data?.dias_aguinaldo_proporcional],
    ["Vacaciones de años anteriores", data?.dias_vacaciones_años_anteriores],
    [
      "Vacaciones proporcionales del año",
      data?.dias_vacaciones_año_actual_proporcional_bruto,
    ],
    ["Vacaciones ya gozadas", data?.dias_vacaciones_año_actual_ya_gozadas],
    [
      "Vacaciones pendientes del año",
      data?.dias_vacaciones_año_actual_pendientes,
    ],
    ["Días de vacaciones a pagar", data?.dias_vacaciones_totales],
    [
      "Prima vacacional",
      data?.prima_vacacional_porcentaje != null
        ? `${data.prima_vacacional_porcentaje}%`
        : null,
    ],
    ...(data?.es_liquidacion
      ? [
          [
            "Tope de prima de antigüedad",
            data?.tope_prima_antiguedad != null
              ? money(data.tope_prima_antiguedad)
              : null,
          ],
          ["Días de indemnización", data?.dias_indemnizacion_total],
          ["Días de salarios vencidos", data?.dias_salarios_vencidos],
        ]
      : []),
  ].filter(([, value]) => value != null);
  const rows = (items) =>
    items.map(([label, key]) => (
      <div className={styles.amountRow} key={key}>
        <dt>{label}</dt>
        <dd>{data ? money(data[key]) : "—"}</dd>
      </div>
    ));

  return (
    <div className={styles.breakdown}>
      <dl>
        {rows(conceptos)}
        {data?.es_liquidacion && (
          <>
            <div className={styles.subtotalRow}>
              <dt>Subtotal finiquito</dt>
              <dd>{money(data.subtotal_finiquito)}</dd>
            </div>
            {rows(extras)}
            <div className={styles.subtotalRow}>
              <dt>Subtotal liquidación</dt>
              <dd>{money(data.subtotal_liquidacion)}</dd>
            </div>
          </>
        )}
      </dl>
      <div className={styles.summaryTotal}>
        <span>
          Total a pagar <small>MXN</small>
        </span>
        <strong>{data ? money(data.total_pagar) : "—"}</strong>
      </div>
      {data && showDetails && (
        <details className={styles.disclosure}>
          <summary>Ver detalle del cálculo</summary>
          <dl className={styles.detailList}>
            {detalles.map(([label, value]) => (
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
