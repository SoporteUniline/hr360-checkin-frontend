// «Periodicidad por confirmar» en palabras (27/11/2026, decisión del dueño, opción C; backend docs/contratos.md). Un
// contrato vigente con una periodicidad que los cálculos no entienden («quincenal» en minúsculas) se paga como MENSUAL;
// RH decide si «es por quincena (como dice)» o «era mensual». Los montos los calcula el servidor (`hoy`, `como_dice`);
// aquí solo se ponen en palabras.
import { dinero, porPeriodo } from "./detalleContrato.mjs";

const POR = { Quincenal: "quincena", Catorcenal: "catorcena", Semanal: "semana", Diario: "día", "Por hora": "hora", Mensual: "mes" };
const plata = (n) => dinero(n, { centavos: "siempre" });

/** «$4,200 al mes» o «$4,200 al mes = $980.00 a la semana» (si el periodo de pago de la ficha es otro). */
export function montoEnPalabras({ mensual, periodicidad, monto } = {}) {
  const base = `${plata(mensual)} al mes`;
  return periodicidad && periodicidad !== "Mensual" ? `${base} = ${plata(monto)} ${porPeriodo(periodicidad)}` : base;
}

/** Lo que muestra cada contrato y sus dos opciones. p: un elemento de `periodicidades` de GET /contratos/revisar-sueldos. */
export function textoPeriodicidad(p) {
  const etiqueta = p.periodicidad_guardada ? `«${p.periodicidad_guardada}»` : "sin periodicidad";
  const comoDice = p.como_dice && p.periodicidad_como_dice && p.periodicidad_como_dice !== "Mensual" ? p.periodicidad_como_dice : null;
  return {
    guardado: `${plata(p.salario_contrato)} ${etiqueta}`,
    hoy: `Se paga como mensual: ${montoEnPalabras(p.hoy)}`,
    comoDice: comoDice ? `Si es por ${POR[comoDice]} (como dice): ${montoEnPalabras(p.como_dice)}` : null,
    opciones: [
      comoDice ? { decision: "como_dice", texto: `Es por ${POR[comoDice]} (como dice)` } : null,
      { decision: "mensual", texto: p.periodicidad_como_dice === "Mensual" ? "Es mensual (confirmar)" : "Era mensual" },
    ].filter(Boolean),
  };
}

/** Explicación de la confirmación (ventana «Confirmar»). */
export function explicaDecision(p, decision) {
  const despues = decision === "como_dice" ? p.periodicidad_como_dice : "Mensual";
  const lectura = decision === "como_dice" ? montoEnPalabras(p.como_dice) : montoEnPalabras(p.hoy);
  return `El contrato ${p.folio ?? ""} queda en ${plata(p.salario_contrato)} ${despues.toLowerCase()} (${lectura}). El monto no cambia. Queda en su historial con tu nombre y la fecha.${decision === "como_dice" ? " La nómina cambia a partir de la siguiente que calcules; si la ficha no coincide, aparecerá en «Sueldo distinto en la ficha»." : ""}`;
}
