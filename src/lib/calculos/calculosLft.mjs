// Presentación de los cálculos de la LFT (27/11/2026). El cálculo lo hace SIEMPRE el servidor con su motor único
// (backend: services/calculosLft.js, docs/calculos-lft.md); aquí NO se calcula ningún importe: solo se ordenan los
// conceptos, fórmulas y notas que manda el servidor para que el panel, el PDF y la calculadora pública muestren
// exactamente lo mismo. Funciones puras (se prueban en scripts/test-calculos-lft.mjs).

export const NOTA_BRUTO = "Importes brutos; el ISR y las retenciones se calculan aparte.";

// Tipos de terminación (valor = lo que se guarda en finiquitos.tipo_terminacion, el mismo de antes).
export const TIPOS_TERMINACION = [
  { valor: "Renuncia Voluntaria", etiqueta: "Renuncia voluntaria", veinte: false, ayuda: "Finiquito. Prima de antigüedad solo con 15 años o más." },
  { valor: "Despido Justificado", etiqueta: "Despido justificado (art. 47)", veinte: false, ayuda: "Finiquito + prima de antigüedad. Sin indemnización." },
  { valor: "Despido Injustificado", etiqueta: "Despido injustificado", veinte: true, ayuda: "Liquidación: finiquito + prima de antigüedad + 90 días de SDI (+ 20 días por año, opcional)." },
  { valor: "Rescisión Artículo 51", etiqueta: "Rescisión por causa del patrón (art. 51)", veinte: true, ayuda: "Liquidación: finiquito + prima de antigüedad + 90 días de SDI + 20 días por año." },
  { valor: "Fin de Contrato", etiqueta: "Terminación de contrato por tiempo u obra determinado", veinte: false, ayuda: "Finiquito. Prima de antigüedad solo con 15 años o más." },
  { valor: "Defunción", etiqueta: "Muerte o incapacidad del trabajador", veinte: false, ayuda: "Finiquito + prima de antigüedad." },
  { valor: "Mutuo Acuerdo", etiqueta: "Mutuo acuerdo", veinte: false, ayuda: "Finiquito. Prima de antigüedad solo con 15 años o más; pueden pactar una gratificación adicional." },
];

export const ZONAS_SALARIO_MINIMO = [
  { valor: "general", etiqueta: "Salario mínimo general" },
  { valor: "zlfn", etiqueta: "Zona Libre de la Frontera Norte" },
];

export const tipoTerminacion = (valor) => TIPOS_TERMINACION.find((t) => t.valor === valor) ?? null;
export const incluye20Dias = (valor) => !!tipoTerminacion(valor)?.veinte;

export const dinero = (valor) =>
  `$${Number(valor || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Conceptos antiguos (finiquitos guardados antes del motor LFT): solo importes, sin fórmula.
const CONCEPTOS_ANTERIORES = [
  ["salario_pendiente", "Salario pendiente", "monto_salario_pendiente", "finiquito"],
  ["aguinaldo", "Aguinaldo proporcional", "monto_aguinaldo_proporcional", "finiquito"],
  ["vacaciones", "Vacaciones pendientes", "monto_vacaciones_no_gozadas", "finiquito"],
  ["prima_vacacional", "Prima vacacional", "monto_prima_vacacional", "finiquito"],
  ["prima_antiguedad", "Prima de antigüedad", "monto_prima_antiguedad", "indemnizacion"],
  ["indemnizacion", "Indemnización", "monto_indemnizacion_constitucional", "indemnizacion"],
  ["salarios_vencidos", "Salarios vencidos", "monto_salarios_vencidos", "indemnizacion"],
];

/**
 * Resumen de un finiquito para pantalla y PDF. `det` es la respuesta de /finiquitos/calcular o /finiquitos/:id.
 * → { filas: [{ clave, concepto, formula, monto, nota, grupo, aplica }], subtotalFiniquito, subtotalIndemnizacion,
 *     total, esLiquidacion, versionAnterior, avisos, salario, notaBruto }
 */
export function resumenFiniquito(det) {
  if (!det) return null;
  const calculo = det.calculo && Array.isArray(det.calculo.conceptos) ? det.calculo : null;
  if (calculo) {
    return {
      filas: calculo.conceptos.map((c) => ({
        clave: c.clave, concepto: c.concepto, formula: c.formula, monto: Number(c.monto), nota: c.nota || null,
        grupo: c.grupo, aplica: c.aplica !== false, articulo: c.articulo || null,
      })),
      subtotalFiniquito: Number(calculo.subtotal_finiquito),
      subtotalIndemnizacion: Number(calculo.subtotal_indemnizacion),
      total: Number(calculo.total),
      esLiquidacion: !!calculo.es_liquidacion,
      tipo: calculo.tipo?.etiqueta || det.tipo_terminacion || "",
      versionAnterior: false,
      avisos: [...(calculo.avisos || [])],
      salario: {
        diario: calculo.salario?.diario, integrado: calculo.salario?.integrado, formulaSdi: calculo.salario?.formula_sdi || null,
        origen: det.salario_empleado?.texto || null,
      },
      antiguedad: calculo.antiguedad?.texto || null,
      tope: calculo.salario_minimo
        ? { monto: calculo.salario_minimo.tope_prima_antiguedad, aplicado: !!calculo.salario_minimo.tope_aplicado, explicacion: calculo.salario_minimo.explicacion, zona: calculo.salario_minimo.zona_texto, anio: calculo.salario_minimo.anio, porConfirmar: !!calculo.salario_minimo.por_confirmar }
        : null,
      notaBruto: calculo.nota || NOTA_BRUTO,
    };
  }
  const esLiq = !!Number(det.es_liquidacion) || det.es_liquidacion === true;
  const filas = CONCEPTOS_ANTERIORES
    .filter(([, , campo, grupo]) => grupo === "finiquito" || esLiq || Number(det[campo] || 0) !== 0)
    .map(([clave, concepto, campo, grupo]) => ({ clave, concepto, formula: null, monto: Number(det[campo] || 0), nota: null, grupo, aplica: true }));
  return {
    filas,
    subtotalFiniquito: Number(det.subtotal_finiquito || 0),
    subtotalIndemnizacion: Number(det.subtotal_liquidacion || 0),
    total: Number(det.total_pagar || 0),
    esLiquidacion: esLiq,
    tipo: det.tipo_terminacion || "",
    versionAnterior: true,
    avisos: [],
    salario: { diario: Number(det.salario_diario || 0), integrado: null, formulaSdi: null, origen: null },
    antiguedad: det.años_trabajados ? `${det.años_trabajados} años` : null,
    tope: null,
    notaBruto: NOTA_BRUTO,
  };
}

export const AVISO_VERSION_ANTERIOR =
  "Calculado con la versión anterior del cálculo. Se muestra tal como se guardó; si todavía es un borrador, puedes recalcularlo con las reglas vigentes de la LFT.";

/**
 * Renglones del PDF (y de la tabla del panel): [concepto, fórmula o «—», importe]. Mismo origen que la pantalla.
 */
export function renglonesPdfFiniquito(det) {
  const r = resumenFiniquito(det);
  if (!r) return { finiquito: [], indemnizacion: [], total: "", nota: NOTA_BRUTO, versionAnterior: false };
  const renglon = (f) => [f.concepto, f.aplica ? f.formula || "—" : f.nota || "No aplica", dinero(f.monto)];
  return {
    finiquito: r.filas.filter((f) => f.grupo === "finiquito").map(renglon),
    indemnizacion: r.filas.filter((f) => f.grupo !== "finiquito").map(renglon),
    subtotalFiniquito: dinero(r.subtotalFiniquito),
    subtotalIndemnizacion: dinero(r.subtotalIndemnizacion),
    total: dinero(r.total),
    nota: r.notaBruto,
    tope: r.tope?.explicacion || null,
    sdi: r.salario.formulaSdi,
    versionAnterior: r.versionAnterior,
  };
}

/** Fórmula de un aguinaldo (respuesta del servidor). Sin fórmula (registro anterior) → texto del importe. */
export const formulaAguinaldo = (ag) => ag?.formula || `${dinero(ag?.monto_aguinaldo ?? ag?.monto)} (calculado con la versión anterior)`;

/** Fecha de corte por omisión del aguinaldo anual: 31 de diciembre del año de `hoy` (YYYY-MM-DD). */
export const corteAguinaldoPorOmision = (hoy) => `${String(hoy).slice(0, 4)}-12-31`;

/** Inicio del periodo del aguinaldo para contar faltas: max(ingreso, 1 de enero del año de la fecha). */
export function inicioPeriodoAguinaldo(fechaIngreso, fecha) {
  const enero = `${String(fecha).slice(0, 4)}-01-01`;
  const ingreso = String(fechaIngreso || "").slice(0, 10);
  return ingreso && ingreso > enero ? ingreso : enero;
}

/** Cuerpo para la calculadora pública (POST /checador/calculos-lft/publico/aguinaldo). */
export function cuerpoCalculadora(form) {
  return {
    tipo_salario: form.tipoSalario,
    salario: Number(form.salario),
    fecha_ingreso: form.fechaIngreso,
    fecha_corte: form.fechaCorte,
    dias_aguinaldo: Number(form.diasAguinaldo || 15),
    dias_no_laborados: Number(form.diasNoLaborados || 0),
  };
}

export const calculadoraLista = (form) =>
  !!(form.fechaIngreso && form.fechaCorte && Number(form.salario) > 0 && Number(form.diasAguinaldo) > 0);

/**
 * Días de un periodo de vacaciones (año de servicio `anio`), con la MISMA regla del servidor al cargar periodos: el mayor
 * entre la LFT (tablaLey: [{ anios, dias }] que manda el servidor) y la regla de la empresa con el mayor número de años
 * que no pase de `anio`. → { dias, ley, empresa, aviso }
 */
export function diasVacacionesPeriodo(anio, reglasEmpresa = [], tablaLey = []) {
  const n = Number(anio);
  if (!Number.isInteger(n) || n < 1) return { dias: null, ley: null, empresa: null, aviso: "" };
  const ley = Number(tablaLey.find((t) => Number(t.anios) === n)?.dias) || null;
  const regla = [...reglasEmpresa]
    .filter((r) => Number(r.anios) <= n)
    .sort((a, b) => Number(b.anios) - Number(a.anios))[0];
  const empresa = regla ? Number(regla.total_dias ?? regla.dias) || 0 : null;
  const dias = Math.max(ley || 0, empresa || 0) || null;
  let aviso = "";
  if (ley && (empresa == null || empresa < ley)) {
    aviso = empresa == null
      ? `Sin regla de la empresa para ${n} año(s): se proponen los ${ley} días de la ley (art. 76).`
      : `La regla de la empresa da ${empresa} días, menos que la ley: se proponen los ${ley} días de la ley (art. 76).`;
  }
  return { dias, ley, empresa, aviso };
}
