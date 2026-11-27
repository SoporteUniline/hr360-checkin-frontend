// Formulario del contrato (27/11/2026, INC-CONTRATO-EDITAR-001): reglas PURAS que comparten la página de editar
// (/panel/contratos/[id]/editar) y la de alta (/panel/contratos/nuevo: nuevo, duplicar y «Crear contrato con este
// sueldo» desde la ficha). Antes vivían dentro de ContratoDialog.jsx.
//
// Por qué existe (el incidente): el diálogo viejo llenaba los campos de lista comparando el texto EXACTO del valor
// guardado con sus opciones; un contrato con «Quincenal», «Diurna» o «Presencial» (como los escriben el convenio, la
// renovación, «Revisar sueldos» o la ficha) se veía con esos campos EN BLANCO, y un horario guardado con otro formato
// se sustituía por 09:00–18:00 / comida 14:00–15:00 al guardar. Aquí:
//   1. Los valores guardados se muestran tal cual (sin importar mayúsculas) y, si no están en la lista, como «guardado».
//   2. Al editar solo se manda lo que la persona cambió (`cambiosDeEdicion`); el servidor conserva el resto.
//   3. El sueldo no se edita aquí: se cambia con «Cambiar sueldo (convenio)» para que quede su historial.
// Uso en pruebas: node --test scripts/test-formulario-contrato.mjs
import { TIPOS_OPCIONES, PERIODICIDADES } from "./detalleContrato.mjs";

export { TIPOS_OPCIONES, PERIODICIDADES };

export const JORNADAS = [
  { value: "diurna", label: "Diurna (entre 6:00 y 20:00)" },
  { value: "nocturna", label: "Nocturna (entre 20:00 y 6:00)" },
  { value: "mixta", label: "Mixta" },
  { value: "reducida", label: "Reducida" },
];
export const MODALIDADES = [
  { value: "presencial", label: "Presencial" },
  { value: "remoto", label: "Remoto" },
  { value: "hibrido", label: "Híbrido" },
];
export const MONEDAS = [
  { value: "MXN", label: "Pesos mexicanos (MXN)" },
  { value: "USD", label: "Dólares (USD)" },
];

/** Las pestañas, en orden. `campos`: los que viven en cada una (para marcar dónde hay errores). */
export const PESTANAS = [
  { clave: "persona", texto: "Persona y puesto", campos: ["id_empresa", "id_empleado", "puesto", "departamento", "jefe_inmediato_id", "lugar_trabajo", "modalidad_trabajo"] },
  { clave: "sueldo", texto: "Sueldo", campos: ["salario_base", "periodicidad_pago", "moneda"] },
  { clave: "jornada", texto: "Jornada", campos: ["tipo_jornada", "horas_semanales", "hora_entrada", "hora_salida", "hora_comida_inicio", "hora_comida_fin"] },
  { clave: "prestaciones", texto: "Prestaciones", campos: ["dias_vacaciones", "aguinaldo_dias", "prima_vacacional", "prestaciones_superiores"] },
  { clave: "documento", texto: "Documento", campos: ["tipo_contrato", "fecha_inicio", "fecha_fin", "notas"] },
];
export const pestanaDe = (campo) => PESTANAS.find((p) => p.campos.includes(campo))?.clave ?? "persona";

const TIPOS_SIN_FIN = new Set(["indefinido", "prestacion_servicios"]);
const texto = (v) => (v == null ? "" : String(v));
const fecha10 = (v) => (/^\d{4}-\d{2}-\d{2}/.test(texto(v)) ? texto(v).slice(0, 10) : "");

/**
 * El valor guardado expresado como opción de la lista, sin importar mayúsculas («Diurna» → «diurna»). Si no está en la
 * lista se devuelve tal cual (la pantalla lo agrega como opción «guardado» para que nunca se vea en blanco).
 */
export function opcionDe(valor, opciones) {
  const v = texto(valor).trim();
  if (!v) return "";
  const encontrada = opciones.find((o) => (typeof o === "string" ? o : o.value).toLowerCase() === v.toLowerCase());
  return encontrada ? (typeof encontrada === "string" ? encontrada : encontrada.value) : v;
}
/** ¿El valor está en la lista? (para mostrar la opción «guardado»). */
export const estaEnLista = (valor, opciones) => !valor || opciones.some((o) => (typeof o === "string" ? o : o.value) === valor);

/** Un tipo de contrato que exige fecha de término (la misma regla que el servidor). */
export const pideFechaFin = (tipo) => Boolean(tipo) && !TIPOS_SIN_FIN.has(texto(tipo).toLowerCase());

const hora = (h) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(texto(h).trim());
  return m && Number(m[1]) < 24 && Number(m[2]) < 60 ? `${m[1].padStart(2, "0")}:${m[2]}` : "";
};

/**
 * «Entrada: 08:00 | Salida: 16:00 | Comida: 12:00 - 12:30» → horas. `reconocido` solo si tiene ese formato (el que
 * escribe ADAMIA); cualquier otro texto se conserva y se muestra tal cual.
 */
export function partirHorario(horario) {
  const h = texto(horario).trim();
  const vacio = { reconocido: false, original: h, hora_entrada: "", hora_salida: "", hora_comida_inicio: "", hora_comida_fin: "" };
  const m = /^Entrada:\s*(\d{1,2}:\d{2})\s*\|\s*Salida:\s*(\d{1,2}:\d{2})(?:\s*\|\s*Comida:\s*(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2}))?\s*$/i.exec(h);
  if (!m) return vacio;
  const r = { reconocido: true, original: h, hora_entrada: hora(m[1]), hora_salida: hora(m[2]), hora_comida_inicio: hora(m[3]), hora_comida_fin: hora(m[4]) };
  return r.hora_entrada && r.hora_salida ? r : vacio;
}

/** Las horas del formulario → el texto que guarda el contrato (sin comida si no se capturó). */
export function armarHorario(f) {
  if (!f.hora_entrada || !f.hora_salida) return null;
  const comida = f.hora_comida_inicio && f.hora_comida_fin ? ` | Comida: ${f.hora_comida_inicio} - ${f.hora_comida_fin}` : "";
  return `Entrada: ${f.hora_entrada} | Salida: ${f.hora_salida}${comida}`;
}

/** Formulario vacío (contrato nuevo). Los mínimos de ley: aguinaldo 15 días, prima vacacional 25 %. */
export function formularioVacio() {
  return {
    id_empresa: "", id_empleado: "", tipo_contrato: "", fecha_inicio: "", fecha_fin: "", salario_base: "", periodicidad_pago: "", moneda: "MXN",
    tipo_jornada: "diurna", horas_semanales: "40", hora_entrada: "09:00", hora_salida: "18:00", hora_comida_inicio: "14:00", hora_comida_fin: "15:00",
    horario_original: "", horario_reconocido: true, puesto: "", departamento: "", modalidad_trabajo: "presencial", dias_vacaciones: "",
    aguinaldo_dias: "15", prima_vacacional: "25", prestaciones_superiores: "", notas: "", estatus: "activo", jefe_inmediato_id: "", lugar_trabajo: "",
  };
}

/** Los datos de un contrato (GET /contratos/:id/detalle o una fila de la lista) en el formulario, SIN perder nada. */
export function formularioDesdeContrato(c = {}) {
  const h = partirHorario(c.horario);
  const num = (v) => (v == null || v === "" ? "" : String(Number(v)));
  return {
    id_empresa: texto(c.id_empresa), id_empleado: texto(c.id_empleado),
    tipo_contrato: opcionDe(c.tipo_contrato, TIPOS_OPCIONES), fecha_inicio: fecha10(c.fecha_inicio), fecha_fin: fecha10(c.fecha_fin),
    salario_base: num(c.salario_base), periodicidad_pago: texto(c.periodicidad_pago), moneda: texto(c.moneda) || "MXN",
    tipo_jornada: opcionDe(c.tipo_jornada, JORNADAS), horas_semanales: num(c.horas_semanales),
    hora_entrada: h.hora_entrada, hora_salida: h.hora_salida, hora_comida_inicio: h.hora_comida_inicio, hora_comida_fin: h.hora_comida_fin,
    horario_original: h.original, horario_reconocido: h.reconocido || !h.original,
    puesto: texto(c.puesto), departamento: texto(c.departamento), modalidad_trabajo: opcionDe(c.modalidad_trabajo, MODALIDADES),
    dias_vacaciones: num(c.dias_vacaciones), aguinaldo_dias: num(c.aguinaldo_dias), prima_vacacional: num(c.prima_vacacional ?? c.prima_vacacional_porcentaje),
    prestaciones_superiores: texto(c.prestaciones_superiores), notas: texto(c.notas), estatus: texto(c.estatus) || "activo",
    jefe_inmediato_id: c.jefe_inmediato_id ? texto(c.jefe_inmediato_id) : "", lugar_trabajo: texto(c.lugar_trabajo),
  };
}

const sumarDia = (f) => {
  const d = new Date(`${f}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

/**
 * Duplicar (renovación desde la lista): las mismas condiciones; inicia el día siguiente al fin del anterior (o mañana);
 * el tipo y la fecha de fin se eligen de nuevo. La periodicidad solo se copia si es una que los cálculos reconocen
 * («Quincenal»…): una guardada en minúsculas («quincenal») los cálculos la leen como MENSUAL, y copiarla como
 * «Quincenal» cambiaría lo que se paga; se deja para que RH la elija viendo el aviso (`periodicidadOrigen`).
 */
export function formularioParaDuplicar(seed = {}, { hoy }) {
  const f = formularioDesdeContrato(seed);
  const fin = fecha10(seed.fecha_fin);
  const conocida = PERIODICIDADES.includes(texto(seed.periodicidad_pago));
  return {
    ...f, tipo_contrato: "", fecha_inicio: fin ? sumarDia(fin) : sumarDia(hoy), fecha_fin: "", estatus: "activo",
    periodicidad_pago: conocida ? f.periodicidad_pago : "", periodicidadOrigen: conocida ? null : texto(seed.periodicidad_pago) || null,
    dias_vacaciones: "", horario_original: f.horario_reconocido ? "" : f.horario_original,
  };
}

/** «Crear contrato con este sueldo» desde la ficha: persona, empresa y el sueldo de la ficha en su periodo de pago. */
export function formularioDesdeFicha(inicial = {}) {
  return {
    ...formularioVacio(), id_empresa: texto(inicial.id_empresa), id_empleado: texto(inicial.id_empleado), salario_base: texto(inicial.salario_base),
    periodicidad_pago: opcionDe(inicial.periodicidad_pago, PERIODICIDADES),
  };
}

/**
 * Revisión antes de guardar. → [{ campo, mensaje }] (vacío = bien). modo: "nuevo" | "editar" (al editar el sueldo y
 * la persona no se tocan). vacacionesLey: días que pide la ley (art. 76) a la fecha de inicio, si ya se conocen.
 * original (al editar): los mínimos de ley solo se revisan en lo que se cambió, para no impedir corregir otro dato de
 * un contrato de antes.
 */
export function validarFormulario(f, { modo = "nuevo", vacacionesLey = null, original = null } = {}) {
  const errores = [];
  const err = (campo, mensaje) => errores.push({ campo, mensaje });
  const tocado = (campo) => !original || texto(original[campo]) !== texto(f[campo]) || texto(original.tipo_contrato) !== texto(f.tipo_contrato);
  if (modo === "nuevo") {
    if (!f.id_empresa) err("id_empresa", "Elige la empresa.");
    if (!f.id_empleado) err("id_empleado", "Elige a la persona.");
    if (!(Number(f.salario_base) > 0)) err("salario_base", "Escribe el sueldo.");
    if (!f.periodicidad_pago) err("periodicidad_pago", "Elige cada cuándo se le paga.");
    if (!f.moneda) err("moneda", "Elige la moneda.");
  }
  if (!f.tipo_contrato) err("tipo_contrato", "Elige el tipo de contrato.");
  if (!f.fecha_inicio) err("fecha_inicio", "Escribe la fecha de inicio.");
  if (pideFechaFin(f.tipo_contrato) && !f.fecha_fin) err("fecha_fin", "Este tipo de contrato necesita fecha de término.");
  if (f.fecha_inicio && f.fecha_fin && f.fecha_fin < f.fecha_inicio) err("fecha_fin", "La fecha de término no puede ser antes del inicio.");
  const horas = Number(f.horas_semanales);
  if (f.horas_semanales !== "" && (!(horas > 0) || horas > 168)) err("horas_semanales", "Escribe las horas a la semana (por ejemplo, 48).");
  const tocoHorario = f.hora_entrada || f.hora_salida || f.hora_comida_inicio || f.hora_comida_fin;
  if (tocoHorario && (!f.hora_entrada || !f.hora_salida)) err("hora_entrada", "Escribe la hora de entrada y la de salida.");
  if (Boolean(f.hora_comida_inicio) !== Boolean(f.hora_comida_fin)) err("hora_comida_inicio", "Escribe el inicio y el fin de la comida, o deja los dos vacíos.");
  if (f.tipo_contrato !== "prestacion_servicios") {
    if (tocado("dias_vacaciones") && f.dias_vacaciones !== "" && vacacionesLey && Number(f.dias_vacaciones) < vacacionesLey) {
      err("dias_vacaciones", `La ley pide al menos ${vacacionesLey} días de vacaciones; puedes dar más, no menos.`);
    }
    if (tocado("aguinaldo_dias") && f.aguinaldo_dias !== "" && Number(f.aguinaldo_dias) < 15) err("aguinaldo_dias", "El aguinaldo es de al menos 15 días (art. 87).");
    if (tocado("prima_vacacional") && f.prima_vacacional !== "" && Number(f.prima_vacacional) < 25) err("prima_vacacional", "La prima vacacional es de al menos 25 % (art. 80).");
  }
  return errores;
}

const numero = (v) => (v === "" || v == null ? null : Number(v));
const nulo = (v) => (texto(v).trim() ? texto(v).trim() : null);

/** Alta (nuevo, duplicar o desde la ficha) → cuerpo de POST /contratos. */
export function cuerpoDeAlta(f, { duplicaDe = null, elaboradoPor = null } = {}) {
  return {
    id_empresa: Number(f.id_empresa), id_empleado: Number(f.id_empleado), tipo_contrato: f.tipo_contrato, fecha_inicio: f.fecha_inicio,
    fecha_fin: pideFechaFin(f.tipo_contrato) || f.fecha_fin ? f.fecha_fin || null : null,
    salario_base: Number(f.salario_base), periodicidad_pago: f.periodicidad_pago, moneda: f.moneda, tipo_jornada: f.tipo_jornada,
    horas_semanales: numero(f.horas_semanales), horario: armarHorario(f) ?? nulo(f.horario_original), puesto: nulo(f.puesto), departamento: nulo(f.departamento),
    // Sin días capturados el servidor propone los de la ley (art. 76) según la antigüedad.
    dias_vacaciones: numero(f.dias_vacaciones), aguinaldo_dias: numero(f.aguinaldo_dias) ?? 15, prima_vacacional: numero(f.prima_vacacional) ?? 25,
    prestaciones_superiores: nulo(f.prestaciones_superiores), lugar_trabajo: nulo(f.lugar_trabajo), modalidad_trabajo: f.modalidad_trabajo,
    elaborado_por_id: elaboradoPor || null, notas: nulo(f.notas), estatus: f.estatus || "activo",
    jefe_inmediato_id: f.jefe_inmediato_id ? Number(f.jefe_inmediato_id) : null,
    es_renovacion: duplicaDe ? 1 : 0, contrato_anterior_id: duplicaDe ? Number(duplicaDe) || null : null,
  };
}

// Campos que se editan aquí y cómo van al servidor. El sueldo (salario_base, periodicidad_pago, moneda), la persona y la
// empresa NO: el sueldo se cambia con convenio y otra persona es otro contrato.
const EDITABLES = {
  tipo_contrato: (v) => v, fecha_inicio: (v) => v, fecha_fin: (v) => v || null, puesto: nulo, departamento: nulo, lugar_trabajo: nulo,
  modalidad_trabajo: (v) => v, tipo_jornada: (v) => v, horas_semanales: numero, dias_vacaciones: numero, aguinaldo_dias: numero,
  prima_vacacional: numero, prestaciones_superiores: nulo, notas: nulo, jefe_inmediato_id: (v) => (v ? Number(v) : null),
};
const HORAS = ["hora_entrada", "hora_salida", "hora_comida_inicio", "hora_comida_fin"];

/**
 * Edición → cuerpo de PUT /contratos/:id con SOLO lo que cambió (el servidor conserva lo demás). El horario solo va si
 * se tocó alguna hora. Si el tipo nuevo ya no pide fecha de término, se manda también la fecha (vacía).
 */
export function cambiosDeEdicion(original, actual) {
  const cuerpo = {};
  for (const [campo, convertir] of Object.entries(EDITABLES)) {
    if (texto(original[campo]) !== texto(actual[campo])) cuerpo[campo] = convertir(actual[campo]);
  }
  if (HORAS.some((h) => texto(original[h]) !== texto(actual[h]))) cuerpo.horario = armarHorario(actual);
  if ("tipo_contrato" in cuerpo && !pideFechaFin(actual.tipo_contrato) && !("fecha_fin" in cuerpo) && actual.fecha_fin) cuerpo.fecha_fin = actual.fecha_fin;
  return cuerpo;
}

/** ¿Hay algo sin guardar? (para el aviso al salir). */
export const hayCambios = (original, actual) => Object.keys({ ...original, ...actual }).some((k) => texto(original?.[k]) !== texto(actual?.[k]));

/**
 * Qué se puede editar según el estado del contrato (las mismas reglas del servidor, docs/contratos.md):
 *   - mandado a firmar o firmado (texto congelado): nada; su texto ya no cambia → convenio (sueldo) o renovar.
 *   - terminado o cancelado: nada; queda en el historial tal como estaba.
 *   - vigente o suspendido: todo menos el sueldo (convenio) y la persona.
 * → { editable, motivo }
 */
export function queSePuedeEditar(c = {}) {
  const firmado = Number(c.firmado_empleado) === 1 || Number(c.firmado_empresa) === 1 || c.firmado_empleado === true || c.firmado_empresa === true;
  if (c.congelado || firmado) {
    return { editable: false, motivo: "Este contrato ya se mandó a firmar o está firmado: su texto quedó fijo y no se puede editar. Para cambiar el sueldo usa «Cambiar sueldo (convenio)»; para otras condiciones, «Renovar» desde el contrato." };
  }
  if (["terminado", "cancelado"].includes(texto(c.estatus).toLowerCase())) {
    return { editable: false, motivo: "Este contrato ya terminó: queda en el historial tal como estaba. Si la persona sigue trabajando, crea un contrato nuevo." };
  }
  return { editable: true, motivo: null };
}
