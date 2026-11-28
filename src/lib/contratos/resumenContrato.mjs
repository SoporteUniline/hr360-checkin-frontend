// Resumen del formulario del contrato (28/11/2026, mockup v3 aprobado: panel «Resumen» a la derecha). Reglas PURAS:
// ponen en palabras lo que ya está capturado o lo que ya calculó el servidor; NO calculan sueldos. Las usa
// src/app/panel/contratos/formulario/FormularioContrato.jsx y se prueban en scripts/test-formulario-contrato.mjs.
//   - Editar: el sueldo al mes, por periodo y diario son los del servidor (sueldoDesglose, la misma conversión que la
//     nómina; es lo que muestra la tarjeta «Sueldo» del contrato).
//   - Nuevo: solo se sabe lo que se escribió (el sueldo de cada periodo). El mensual y el diario los calcula la nómina al
//     guardar; aquí no se adivinan (si el pago es mensual, el sueldo escrito ya es el mensual).
import { dinero, fechaCorta, sueldoDesglose } from "./detalleContrato.mjs";
import { JORNADAS, PESTANAS, pestanaDe } from "./formularioContrato.mjs";

/** Nombre corto de cada dato, para las pastillas «Falta». */
export const ETIQUETA_CAMPO = {
  id_empresa: "Empresa", id_empleado: "Persona", puesto: "Puesto", departamento: "Área", jefe_inmediato_id: "Jefe inmediato",
  lugar_trabajo: "Lugar de trabajo", modalidad_trabajo: "Modalidad", salario_base: "Sueldo", periodicidad_pago: "Cada cuándo se paga",
  moneda: "Moneda", tipo_jornada: "Tipo de jornada", horas_semanales: "Horas a la semana", hora_entrada: "Horario",
  hora_salida: "Horario", hora_comida_inicio: "Horario de comida", hora_comida_fin: "Horario de comida", dias_vacaciones: "Vacaciones",
  aguinaldo_dias: "Aguinaldo", prima_vacacional: "Prima vacacional", prestaciones_superiores: "Otras prestaciones",
  tipo_contrato: "Tipo de contrato", fecha_inicio: "Fecha de inicio", fecha_fin: "Fecha de término", notas: "Causa u obra",
};

/** Cómo se llama cada pago en el resumen («Por quincena»). */
const POR = { Mensual: "Al mes", Quincenal: "Por quincena", Catorcenal: "Por catorcena", Semanal: "Por semana", Diario: "Por día", "Por hora": "Por hora" };
export const etiquetaPago = (periodicidad) => POR[periodicidad] ?? "Por periodo";

/**
 * Errores de validarFormulario → textos de las pastillas «Falta», sin repetir y en el orden de los pasos.
 * [{ campo: "fecha_inicio" }, { campo: "id_empleado" }] → ["Persona", "Fecha de inicio"]
 */
export function faltanTextos(errores = []) {
  const orden = (campo) => PESTANAS.findIndex((p) => p.clave === pestanaDe(campo)) * 100 + PESTANAS.find((p) => p.clave === pestanaDe(campo)).campos.indexOf(campo);
  return [...new Set([...errores].sort((a, b) => orden(a.campo) - orden(b.campo)).map((e) => ETIQUETA_CAMPO[e.campo] ?? e.campo))];
}

/** Cuántos datos faltan o hay que corregir en cada paso: { persona: 1, documento: 2 }. */
export function faltanPorPaso(errores = []) {
  const cuenta = {};
  for (const e of errores) cuenta[pestanaDe(e.campo)] = (cuenta[pestanaDe(e.campo)] ?? 0) + 1;
  return cuenta;
}

/**
 * Las tres cifras del sueldo para el resumen. → { filas: [{ clave, etiqueta, valor, destacado }], nota }
 *   editar:  sueldoServidor = data.sueldo del detalle (salario_mensual, pago, salario_diario).
 *   nuevo:   form.salario_base en form.periodicidad_pago.
 */
export function resumenSueldo({ form = {}, sueldoServidor = null, editar = false } = {}) {
  if (editar) {
    const { pago, mensual, diario } = sueldoDesglose(sueldoServidor);
    const filas = [
      mensual != null ? { clave: "mensual", etiqueta: "Al mes", valor: dinero(mensual, { centavos: "siempre" }), destacado: !pago || pago.periodicidad === "Mensual" } : null,
      pago && pago.periodicidad !== "Mensual" ? { clave: "periodo", etiqueta: etiquetaPago(pago.periodicidad), valor: dinero(pago.monto, { centavos: "siempre" }), destacado: true } : null,
      diario != null ? { clave: "diario", etiqueta: "Diario", valor: dinero(diario, { centavos: "siempre" }) } : null,
    ].filter(Boolean);
    return { filas, nota: filas.length ? null : "Sin sueldo registrado." };
  }
  const monto = Number(form.salario_base);
  if (!(monto > 0) || !form.periodicidad_pago) return { filas: [], nota: null };
  const valor = dinero(monto, { centavos: "siempre" });
  if (form.periodicidad_pago === "Mensual") {
    return { filas: [{ clave: "mensual", etiqueta: "Al mes", valor, destacado: true }], nota: "El sueldo diario lo calcula la nómina al guardar." };
  }
  return {
    filas: [{ clave: "periodo", etiqueta: etiquetaPago(form.periodicidad_pago), valor, destacado: true }],
    nota: "El sueldo al mes y el diario los calcula la nómina al guardar.",
  };
}

/** «Diurna · 48 h a la semana · 09:00 a 18:00» (lo que se capturó). Vacío si no hay nada. */
export function jornadaTexto(form = {}) {
  const tipo = JORNADAS.find((j) => j.value === form.tipo_jornada)?.label.split(" (")[0] ?? form.tipo_jornada ?? "";
  const horas = String(form.horas_semanales ?? "").trim() ? `${form.horas_semanales} h a la semana` : "";
  const horario = form.hora_entrada && form.hora_salida ? `${form.hora_entrada} a ${form.hora_salida}` : form.horario_reconocido === false ? form.horario_original : "";
  return [tipo, horas, horario].filter(Boolean).join(" · ");
}

/**
 * Filas del panel «Resumen» del contrato: persona, puesto y área, sueldo (al mes, por periodo y diario), jornada e
 * inicio. → { filas, nota }. Las filas sin dato salen con valor "" y el panel no las muestra.
 */
export function resumenContrato({ form = {}, nombrePersona = "", sueldoServidor = null, editar = false } = {}) {
  const sueldo = resumenSueldo({ form, sueldoServidor, editar });
  return {
    filas: [
      { clave: "persona", etiqueta: "Persona", valor: nombrePersona || "" },
      { clave: "puesto", etiqueta: "Puesto", valor: [form.puesto, form.departamento].map((x) => String(x ?? "").trim()).filter(Boolean).join(" · ") },
      ...sueldo.filas,
      { clave: "jornada", etiqueta: "Jornada", valor: jornadaTexto(form) },
      { clave: "inicio", etiqueta: "Inicia el", valor: fechaCorta(form.fecha_inicio) },
    ],
    nota: sueldo.nota,
  };
}
