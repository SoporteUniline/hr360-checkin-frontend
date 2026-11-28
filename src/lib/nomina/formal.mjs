// Nómina formal (R3+R4): apoyos PUROS de las pantallas (configuración, datos de cada persona, tablas fiscales y desglose
// del recibo). El cálculo vive en el servidor (hr360-checkin-backend/docs/nomina-formal.md); aquí solo se presenta.
// Pruebas: scripts/test-nomina-formal.mjs.
import { dinero } from "./nomina.mjs";

export const CLAVES_FISCALES = Object.freeze(["isr", "imss_obrero"]);
export const esFiscal = (clave) => CLAVES_FISCALES.includes(clave);

// Por qué no se puede encender (en el orden en que hay que resolverlo). Lista vacía = se puede.
export function motivosParaNoEncender(cfg) {
  if (!cfg) return [];
  const motivos = [];
  if (!cfg.tablas?.completas) {
    const n = cfg.tablas?.pendientes?.length ?? 0;
    motivos.push(`Las tablas fiscales de ${cfg.tablas?.anio ?? "este año"} tienen ${n} valor${n === 1 ? "" : "es"} por confirmar. Un administrador de ADAMIA debe revisarlas con un contador.`);
  }
  for (const f of cfg.faltantes?.empresa?.bloquea ?? []) motivos.push(`Falta en la empresa: ${f}.`);
  return motivos;
}

// Renglones del desglose de un recibo formal (datos.fiscal), listos para pintar. Importes ya en pesos.
export function filasDesglose(f) {
  if (!f?.formal || !f.calculado) return [];
  const filas = [
    { clave: "gravado", texto: "Percepciones gravadas", valor: dinero(f.gravado) },
    { clave: "exento", texto: "Percepciones exentas", valor: dinero(f.exento) },
    { clave: "isr_tarifa", texto: `ISR según tarifa${f.tarifa?.texto ? ` (${f.tarifa.texto})` : ""}`, valor: dinero(f.isr_tarifa) },
    { clave: "subsidio", texto: "Subsidio para el empleo aplicado", valor: f.subsidio?.aplicado ? `− ${dinero(f.subsidio.aplicado)}` : dinero(0), nota: f.subsidio?.elegible ? null : "No aplica: lo gravado pasa del límite del periodo." },
    { clave: "isr", texto: "ISR retenido", valor: dinero(f.isr_retenido), fuerte: true },
    { clave: "sbc", texto: "Salario base de cotización (diario)", valor: dinero(f.sbc?.diario), nota: f.sbc?.formula ?? null },
    { clave: "dias", texto: "Días cotizados", valor: String(f.dias_cotizados ?? "—") },
    { clave: "imss", texto: "IMSS (cuota del trabajador)", valor: dinero(f.imss?.obrero), fuerte: true,
      nota: Number(f.imss?.obrero_a_cargo_patron) > 0 ? `Gana el salario mínimo: la paga el patrón (${dinero(f.imss.obrero_a_cargo_patron)}).` : null },
    { clave: "patronal", texto: "IMSS a cargo del patrón (informativo)", valor: dinero(f.imss?.patronal), nota: "Sin INFONAVIT ni impuesto sobre nómina." },
  ];
  return filas;
}

// Conceptos con su parte gravada y exenta (solo los que tienen importe).
export const conceptosGravados = (f) => (f?.conceptos ?? []).filter((c) => Number(c.importe) !== 0);

// Tablas fiscales agrupadas para la pantalla del administrador, en el orden del catálogo.
export function agruparTablas(valores = []) {
  const grupos = [];
  for (const v of valores) {
    let g = grupos.find((x) => x.grupo === v.grupo);
    if (!g) { g = { grupo: v.grupo, valores: [] }; grupos.push(g); }
    g.valores.push(v);
  }
  return grupos.map((g) => ({ ...g, pendientes: g.valores.filter((v) => v.estado !== "confirmado").length }));
}

export const ESTADO_TABLA = {
  confirmado: { texto: "Confirmado", tono: "verde" },
  por_confirmar: { texto: "Por confirmar", tono: "ambar" },
};

export const fechaLarga = (s) => {
  if (!s) return "—";
  const [a, m, d] = String(s).slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
};
export const vigencia = (v) => `${fechaLarga(v.desde)} al ${fechaLarga(v.hasta)}`;

// Totales de la nómina formal en el detalle del periodo (respuesta `fiscal` de GET /periodos/:id).
export function tarjetasFormal(fiscal) {
  if (!fiscal) return [];
  return [
    { titulo: "ISR retenido", valor: dinero(fiscal.isr), nota: Number(fiscal.subsidio) ? `después de ${dinero(fiscal.subsidio)} de subsidio` : null },
    { titulo: "IMSS de los trabajadores", valor: dinero(fiscal.imss_obrero) },
    { titulo: "IMSS a cargo del patrón", valor: dinero(fiscal.imss_patronal), nota: "informativo, sin INFONAVIT" },
  ];
}

// Valor de un campo para el formulario (null/undefined → "").
export const valorCampo = (v) => (v == null ? "" : String(v));
// Solo manda lo que cambió (el servidor valida todo otra vez).
export function cambiosDe(original = {}, borrador = {}) {
  const salida = {};
  for (const [k, v] of Object.entries(borrador)) if (valorCampo(original[k]) !== valorCampo(v)) salida[k] = v === "" ? null : v;
  return salida;
}
